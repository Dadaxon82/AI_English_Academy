/**
 * AI fikr-mulohazasi — mijoz qatlami.
 *
 * Halollik qoidasi: interfeysda "AI" so'zi FAQAT haqiqiy AI javobi kelganda
 * chiqadi. Tahlil har doim avval QOIDAVIY dvigatel bilan darhol beriladi
 * (`analyze.ts`); AI javobi kelsa o'sha yozuvning tahlili `engine: 'ai'` bilan
 * almashtiriladi. Har qanday xato (tarmoq, limit, kalit yo'q, model rad
 * etdi, sxemaga mos emas) — qoidaviy tahlil qoladi.
 *
 * Serverdagi qism: `supabase/functions/ai-feedback` (kalit faqat serverda).
 * Umumiy sxema/tekshiruv: `supabase/functions/_shared/feedback.ts`.
 */
import {
  parseSpeakingFeedback,
  parseWritingFeedback,
  type FeedbackRequest,
  type SpeakingFeedback,
  type WritingFeedback,
} from '../../supabase/functions/_shared/feedback'
import { getSupabase, supabaseConfigured } from './supabase'
import type { SpeakingAnalysis, WritingAnalysis } from './types'

/**
 * AI ishlatiladimi: foydalanuvchi bayrog'i + internet + funksiya joylangan
 * (`VITE_AI_ENABLED=true`) + Supabase sozlangan (funksiya JWT talab qiladi).
 */
export function aiRuntimeEnabled(userFlag: boolean, online: boolean, backend: boolean = supabaseConfigured): boolean {
  return userFlag && online && backend && import.meta.env.VITE_AI_ENABLED === 'true'
}

export const AI_TIMEOUT_MS = 25_000

export type AiResult<T> = { ok: true; feedback: T; model: string } | { ok: false; reasonUz: string }

export interface AiDeps {
  fetch: typeof fetch
  /** Joriy sessiya JWT (yo'q bo'lsa null). */
  getToken: () => Promise<string | null>
  functionsUrl: string
  anonKey: string
}

async function defaultToken(): Promise<string | null> {
  const sb = await getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session?.access_token ?? null
}

function defaultDeps(): AiDeps {
  const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').trim().replace(/\/$/, '')
  return {
    fetch: (...a) => fetch(...a),
    getToken: defaultToken,
    functionsUrl: `${url}/functions/v1`,
    anonKey: ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim(),
  }
}

/** Edge funksiyani chaqirish (JWT bilan, vaqt chegarasi bilan). Xato — o'zbekcha sabab. */
export async function callAiFunction(
  name: string,
  payload: unknown,
  deps: AiDeps = defaultDeps(),
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; reasonUz: string }> {
  const token = await deps.getToken()
  if (!token) return { ok: false, reasonUz: 'AI tahlili uchun hisobga kiring.' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS)
  try {
    const res = await deps.fetch(`${deps.functionsUrl}/${name}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, apikey: deps.anonKey },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    let body: Record<string, unknown> = {}
    try {
      body = (await res.json()) as Record<string, unknown>
    } catch {
      /* bo'sh/JSON emas */
    }
    if (!res.ok) {
      const why = typeof body.reasonUz === 'string' ? body.reasonUz : `AI xizmati javob bermadi (${res.status}).`
      return { ok: false, reasonUz: why }
    }
    return { ok: true, body }
  } catch {
    return { ok: false, reasonUz: ctrl.signal.aborted ? 'AI xizmati vaqtida javob bermadi.' : 'AI xizmatiga ulanib bo‘lmadi.' }
  } finally {
    clearTimeout(timer)
  }
}

export async function requestWritingFeedback(req: Omit<FeedbackRequest, 'kind'>, deps: AiDeps = defaultDeps()): Promise<AiResult<WritingFeedback>> {
  const r = await callAiFunction('ai-feedback', { ...req, kind: 'writing' } satisfies FeedbackRequest, deps)
  if (!r.ok) return r
  const fb = parseWritingFeedback(r.body.feedback)
  if (!fb) return { ok: false, reasonUz: 'AI javobi sxemaga mos emas.' }
  return { ok: true, feedback: fb, model: typeof r.body.model === 'string' ? r.body.model : '' }
}

export async function requestSpeakingFeedback(req: Omit<FeedbackRequest, 'kind'>, deps: AiDeps = defaultDeps()): Promise<AiResult<SpeakingFeedback>> {
  const r = await callAiFunction('ai-feedback', { ...req, kind: 'speaking' } satisfies FeedbackRequest, deps)
  if (!r.ok) return r
  const fb = parseSpeakingFeedback(r.body.feedback)
  if (!fb) return { ok: false, reasonUz: 'AI javobi sxemaga mos emas.' }
  return { ok: true, feedback: fb, model: typeof r.body.model === 'string' ? r.body.model : '' }
}

/** AI javobi → `WritingAnalysis` (so'z soni qurilmada sanaladi). */
export function writingAnalysisFromAi(fb: WritingFeedback, wordCount: number): WritingAnalysis {
  return {
    engine: 'ai',
    criteriaScores: { ...fb.criteria },
    errors: fb.errors,
    strengthsUz: fb.strengthsUz,
    weaknessesUz: fb.weaknessesUz,
    suggestionsUz: fb.suggestionsUz,
    wordCount,
  }
}

/**
 * AI javobi → `SpeakingAnalysis`. AI faqat transkriptni ko'radi: lug'at va
 * grammatika AI'dan, ravonlik/uzunlik/tezlik esa qurilmadagi o'lchovdan
 * (qoidaviy tahlil) olinadi.
 */
export function speakingAnalysisFromAi(fb: SpeakingFeedback, measured: SpeakingAnalysis): SpeakingAnalysis {
  return {
    ...measured,
    engine: 'ai',
    lexis: fb.lexis,
    grammar: fb.grammar,
    notesUz: fb.notesUz.length ? fb.notesUz : measured.notesUz,
    disclaimerUz:
      'Lug‘at va grammatika — AI bahosi (transkript asosida); ravonlik va uzunlik qurilmada o‘lchandi. Mashq bahosi, rasmiy imtihon natijasi emas.',
  }
}
