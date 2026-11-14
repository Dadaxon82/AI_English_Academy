/**
 * Supabase Edge Function: `ai-feedback` — yozma ish / nutq transkripti
 * uchun CEFR bahosi (JSON).
 *
 * Xavfsizlik:
 *  - Faqat hisobga kirgan foydalanuvchi (Authorization: Bearer <JWT>).
 *  - Provayder kaliti FAQAT serverda: `AI_API_KEY` (brauzerga hech qachon
 *    yuborilmaydi). `AI_PROVIDER` (hozircha faqat `anthropic`), `AI_MODEL`
 *    (standart `claude-opus-5-5`), `AI_DAILY_LIMIT` (standart 20).
 *  - Kunlik limit `ai_usage` jadvalida, atomik `ai_usage_take()` bilan
 *    (migratsiya 0005) — jadval RLS bilan yopiq, faqat service role yozadi.
 *
 * Joylash:
 *   supabase secrets set AI_PROVIDER=anthropic AI_API_KEY=... AI_DAILY_LIMIT=20
 *   supabase functions deploy ai-feedback
 * So'ng veb build'da `VITE_AI_ENABLED=true`.
 *
 * Model javob bermasa / rad etsa / sxemaga mos kelmasa — 502 qaytadi va mijoz
 * qoidaviy dvigatelga o'tadi (natija "qoidaviy" deb ochiq yoziladi).
 */
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import {
  SPEAKING_SCHEMA,
  SYSTEM_PROMPT,
  WRITING_SCHEMA,
  dailyLimit,
  parseFeedbackRequest,
  parseSpeakingFeedback,
  parseWritingFeedback,
  userPrompt,
} from '../_shared/feedback.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function maxTokens(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 500 && n <= 16000 ? n : 4000
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'method', reasonUz: 'Faqat POST.' })

  const provider = Deno.env.get('AI_PROVIDER') ?? 'anthropic'
  const apiKey = Deno.env.get('AI_API_KEY') ?? Deno.env.get('ANTHROPIC_API_KEY')
  if (provider !== 'anthropic') return json(501, { error: 'provider', reasonUz: `AI_PROVIDER="${provider}" qöllab-quvvatlanmaydi.` })
  if (!apiKey) return json(503, { error: 'not_configured', reasonUz: 'AI kaliti serverda sozlanmagan.' })

  // --- foydalanuvchi ---
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'auth', reasonUz: 'Hisobga kiring.' })
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return json(401, { error: 'auth', reasonUz: 'Sessiya yaroqsiz — qayta kiring.' })

  // --- so'rov ---
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_json', reasonUz: 'JSON öqilmadi.' })
  }
  const parsed = parseFeedbackRequest(body)
  if (!parsed.ok) return json(400, { error: 'bad_request', reasonUz: parsed.reasonUz })
  const fr = parsed.req

  // --- kunlik limit (atomik) ---
  const limit = dailyLimit(Deno.env.get('AI_DAILY_LIMIT'))
  const admin = createClient(url, service)
  const { data: allowed, error: limErr } = await admin.rpc('ai_usage_take', { p_user: userData.user.id, p_limit: limit })
  if (limErr) return json(500, { error: 'limit', reasonUz: 'Limitni tekşirib bölmadi.' })
  if (allowed !== true) return json(429, { error: 'limit', reasonUz: `Bugungi AI limiti (${limit} ta) tugadi — qoidaviy tahlil işlatiladi.` })

  // --- model ---
  const client = new Anthropic({ apiKey })
  try {
    const msg = await client.beta.messages.create({
      model: Deno.env.get('AI_MODEL') ?? 'claude-opus-5-5',
      max_tokens: maxTokens(Deno.env.get('AI_MAX_TOKENS')),
      // Xavfsizlik klassifikatori rad etsa — server o'zi zaxira modelda qayta urinadi.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: fr.kind === 'writing' ? WRITING_SCHEMA : SPEAKING_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt(fr) }],
    } as never)
    const m = msg as unknown as { stop_reason: string; model: string; content: { type: string; text?: string }[] }
    if (m.stop_reason === 'refusal') return json(502, { error: 'refusal', reasonUz: 'Model baholaşdan boş tortdi.' })
    if (m.stop_reason === 'max_tokens') return json(502, { error: 'truncated', reasonUz: 'Model javobi çala qoldi.' })
    const text = m.content.find((b) => b.type === 'text')?.text ?? ''
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return json(502, { error: 'bad_output', reasonUz: 'Model javobi JSON emas.' })
    }
    const feedback = fr.kind === 'writing' ? parseWritingFeedback(raw) : parseSpeakingFeedback(raw)
    if (!feedback) return json(502, { error: 'bad_output', reasonUz: 'Model javobi sxemaga mos emas.' })
    return json(200, { kind: fr.kind, model: m.model, feedback })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json(503, { error: 'busy', reasonUz: 'AI xizmati band — keyinroq.' })
    if (e instanceof Anthropic.AuthenticationError) return json(503, { error: 'not_configured', reasonUz: 'AI kaliti yaroqsiz.' })
    if (e instanceof Anthropic.APIError) return json(502, { error: 'upstream', reasonUz: `AI xizmati xatosi (${e.status}).` })
    return json(502, { error: 'upstream', reasonUz: 'AI xizmatiga ulanib bölmadi.' })
  }
})
