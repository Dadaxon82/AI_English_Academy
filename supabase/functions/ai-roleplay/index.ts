/**
 * Supabase Edge Function: `ai-roleplay` — AI suhbatdosh (rol o'yini).
 *
 * O'quvchi stsenariy (kafe, vokzal, shifokor …) bo'yicha gaplashadi; model
 * hamsuhbat rolida keyingi replikani, o'quvchining oxirgi replikasidagi
 * xatolarni va foydali so'zlarni JSON bilan qaytaradi.
 *
 * Xavfsizlik va limit `ai-feedback` bilan BIR XIL:
 *  - faqat hisobga kirgan foydalanuvchi (Authorization: Bearer <JWT>);
 *  - kalit faqat serverda (`AI_API_KEY`), model `AI_MODEL` (standart
 *    `claude-opus-5-5`), `AI_DAILY_LIMIT` (umumiy kunlik hisob, `ai_usage`);
 *  - har replika = 1 so'rov limitdan.
 *
 * Joylash: `supabase functions deploy ai-roleplay` (sekretlar ai-feedback
 * bilan umumiy). Model javob bermasa / rad etsa / sxemaga mos kelmasa — 502,
 * mijoz oldindan yozilgan ssenariyga o'tadi va buni ochiq aytadi.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { dailyLimit } from '../_shared/feedback.ts'
import { ROLEPLAY_SCHEMA, ROLEPLAY_SYSTEM_PROMPT, parseRoleplayRequest, parseRoleplayTurn, roleplayPrompt } from '../_shared/roleplay.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'method', reasonUz: 'Faqat POST.' })

  const provider = Deno.env.get('AI_PROVIDER') ?? 'anthropic'
  const apiKey = Deno.env.get('AI_API_KEY')
  if (provider !== 'anthropic') return json(501, { error: 'provider', reasonUz: `AI_PROVIDER="${provider}" qo‘llab-quvvatlanmaydi.` })
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
    return json(400, { error: 'bad_json', reasonUz: 'JSON o‘qilmadi.' })
  }
  const parsed = parseRoleplayRequest(body)
  if (!parsed.ok) return json(400, { error: 'bad_request', reasonUz: parsed.reasonUz })

  // --- kunlik limit (atomik, ai-feedback bilan umumiy) ---
  const limit = dailyLimit(Deno.env.get('AI_DAILY_LIMIT'))
  const admin = createClient(url, service)
  const { data: allowed, error: limErr } = await admin.rpc('ai_usage_take', { p_user: userData.user.id, p_limit: limit })
  if (limErr) return json(500, { error: 'limit', reasonUz: 'Limitni tekshirib bo‘lmadi.' })
  if (allowed !== true) return json(429, { error: 'limit', reasonUz: `Bugungi AI limiti (${limit} ta) tugadi — oldindan yozilgan suhbat davom etadi.` })

  // --- model ---
  const client = new Anthropic({ apiKey })
  try {
    const msg = await client.beta.messages.create({
      model: Deno.env.get('AI_MODEL') ?? 'claude-opus-5-5',
      // Qisqa replika + bir nechta tuzatish; past effort — suhbatda kutish kam bo'lsin.
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ROLEPLAY_SCHEMA } },
      system: ROLEPLAY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: roleplayPrompt(parsed.req) }],
    } as never)
    const m = msg as unknown as { stop_reason: string; model: string; content: { type: string; text?: string }[] }
    if (m.stop_reason === 'refusal') return json(502, { error: 'refusal', reasonUz: 'Model bu replikaga javob bermadi.' })
    if (m.stop_reason === 'max_tokens') return json(502, { error: 'truncated', reasonUz: 'Model javobi chala qoldi.' })
    const text = m.content.find((b) => b.type === 'text')?.text ?? ''
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return json(502, { error: 'bad_output', reasonUz: 'Model javobi JSON emas.' })
    }
    const turn = parseRoleplayTurn(raw)
    if (!turn) return json(502, { error: 'bad_output', reasonUz: 'Model javobi sxemaga mos emas.' })
    return json(200, { model: m.model, turn })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json(503, { error: 'busy', reasonUz: 'AI xizmati band — keyinroq.' })
    if (e instanceof Anthropic.AuthenticationError) return json(503, { error: 'not_configured', reasonUz: 'AI kaliti yaroqsiz.' })
    if (e instanceof Anthropic.APIError) return json(502, { error: 'upstream', reasonUz: `AI xizmati xatosi (${e.status}).` })
    return json(502, { error: 'upstream', reasonUz: 'AI xizmatiga ulanib bo‘lmadi.' })
  }
})
