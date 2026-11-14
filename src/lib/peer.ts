/**
 * HAMJAMIYAT TEKSHIRUVI — mijoz qatlami (g'oya: Busuu; qoidalar bizniki).
 *
 * Server qismi: `supabase/migrations/0006_peer_review.sql` (RLS, `peer_claim`
 * tayinlovi, moderatsiya). Bu modul faqat shu jadvallar bilan gaplashadi va
 * har xatoni o'quvchiga tushunarli SABAB bilan qaytaradi (`reasonUz`).
 *
 * Qoidalar:
 *  - Faqat hisobga kirgan foydalanuvchi (mehmon rejimida — sabab aytiladi).
 *  - Audio HECH QACHON yuborilmaydi: gapirishdan faqat matn (transkript yoki
 *    matnli javob), o'quvchi roziligi bilan.
 *  - Chegaralar SQL'dagi CHECK'lar bilan bir xil (`PEER_LIMITS`) — mijoz
 *    oldindan tekshiradi, server baribir o'zi ham tekshiradi.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CefrLevel } from '../content/types'
import { getSupabase, supabaseConfigured } from './supabase'

export type PeerKind = 'writing' | 'speaking'
export type PeerReportReason = 'offensive' | 'spam' | 'personal' | 'other'

export const PEER_REPORT_REASONS: { id: PeerReportReason; labelUz: string }[] = [
  { id: 'offensive', labelUz: 'Haqoratli yoki qöpol' },
  { id: 'spam', labelUz: 'Mavzuga aloqasiz / spam' },
  { id: 'personal', labelUz: 'Şaxsiy ma’lumot bor' },
  { id: 'other', labelUz: 'Boşqa sabab' },
]

/** `0006_peer_review.sql` dagi CHECK va triggerlar bilan BIR XIL. */
export const PEER_LIMITS = {
  bodyMax: 4000,
  promptMax: 1000,
  commentMin: 10,
  commentMax: 1000,
  dailySubmissions: 5,
  reviewsPerSubmission: 2,
} as const

export interface PeerSubmission {
  id: string
  kind: PeerKind
  task_id: string
  level: CefrLevel
  prompt: string
  body: string
  status: 'open' | 'hidden'
  created_at: string
}

export interface PeerReview {
  id: string
  submission_id: string
  score: number
  comment: string
  created_at: string
}

export type PeerResult<T> = { ok: true; data: T } | { ok: false; reasonUz: string }

/* ------------------------------ tekshiruvlar ------------------------------ */

export function validateSubmissionBody(body: string): string | null {
  const t = body.trim()
  if (t.length === 0) return 'Böş javobni yuborib bölmaydi.'
  if (t.length > PEER_LIMITS.bodyMax) return `Matn juda uzun (${t.length} belgi, köpi bilan ${PEER_LIMITS.bodyMax}).`
  return null
}

export function validateReview(score: number, comment: string): string | null {
  if (!Number.isInteger(score) || score < 1 || score > 5) return 'Bahoni 1 dan 5 gaça tanlang.'
  const n = comment.trim().length
  if (n < PEER_LIMITS.commentMin) return `Izoh kamida ${PEER_LIMITS.commentMin} belgi bölsin — nimasi yaxşi va nimani tuzatiş kerakligini yozing.`
  if (n > PEER_LIMITS.commentMax) return `Izoh juda uzun (köpi bilan ${PEER_LIMITS.commentMax} belgi).`
  return null
}

/** Server/tarmoq xatosi → o'quvchiga tushunarli sabab (SQL yoki token sizib chiqmaydi). */
export function peerErrorUz(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string }
  const msg = (e.message ?? '').toLowerCase()
  if (msg.includes('peer_daily_limit')) return `Bugun ${PEER_LIMITS.dailySubmissions} ta javob yuborildi — bu kunlik çegara. Ertaga yana yuborişingiz mumkin.`
  if (e.code === 'PGRST205' || e.code === '42P01' || e.code === 'PGRST202' || msg.includes('schema cache'))
    return 'Serverda hamjamiyat jadvallari hali yöq: `supabase/migrations/0006_peer_review.sql` migratsiyasini qöllang.'
  if (e.code === '23505') return 'Bu amal allaqaçon bajarilgan (bir javobga bitta izoh / bitta şikoyat).'
  if (e.code === '23514') return 'Matn uzunligi yoki baho çegaradan taşqarida.'
  if (e.code === '42501' || msg.includes('row-level security')) return 'Bu amalga ruxsat yöq (javob sizga tayinlanmagan yoki yaşirilgan).'
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Internet aloqasi yöq. Ulanişni tekşirib, qayta urinib köring.'
  return 'Server xatosi. Birozdan keyin qayta urinib köring.'
}

/* ------------------------------ ulanish ------------------------------ */

type Ready = { ok: true; client: SupabaseClient; userId: string } | { ok: false; reasonUz: string }

/** Hamjamiyat ishlay oladimi: server sozlanganmi va foydalanuvchi kirganmi. */
export async function peerReady(): Promise<Ready> {
  if (!supabaseConfigured) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan — hamjamiyat tekşiruvi faqat server bilan işlaydi.' }
  const client = await getSupabase()
  if (!client) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan.' }
  try {
    const { data, error } = await client.auth.getSession()
    if (error) return { ok: false, reasonUz: peerErrorUz(error) }
    const userId = data.session?.user?.id
    if (!userId) return { ok: false, reasonUz: 'Hamjamiyat tekşiruvi uçun hisobingizga kiring (mehmon rejimida javoblar boşqalarga yuborilmaydi).' }
    return { ok: true, client, userId }
  } catch (err) {
    return { ok: false, reasonUz: peerErrorUz(err) }
  }
}

async function run<T>(fn: (c: SupabaseClient, uid: string) => Promise<PeerResult<T>>): Promise<PeerResult<T>> {
  const r = await peerReady()
  if (!r.ok) return r
  try {
    return await fn(r.client, r.userId)
  } catch (err) {
    return { ok: false, reasonUz: peerErrorUz(err) }
  }
}

/* ------------------------------ amallar ------------------------------ */

export function submitForPeerReview(input: {
  kind: PeerKind
  taskId: string
  level: CefrLevel
  prompt: string
  body: string
}): Promise<PeerResult<PeerSubmission>> {
  const bad = validateSubmissionBody(input.body)
  if (bad) return Promise.resolve({ ok: false, reasonUz: bad })
  return run(async (c) => {
    const { data, error } = await c
      .from('peer_submissions')
      .insert({
        kind: input.kind,
        task_id: input.taskId.slice(0, 120),
        level: input.level,
        prompt: input.prompt.slice(0, PEER_LIMITS.promptMax),
        body: input.body.trim(),
      })
      .select()
      .single()
    if (error) return { ok: false, reasonUz: peerErrorUz(error) }
    return { ok: true, data: data as PeerSubmission }
  })
}

/** O'z javoblarim va ularga kelgan (yashirilmagan) izohlar — eng yangisi birinchi. */
export function myPeerSubmissions(): Promise<PeerResult<{ submission: PeerSubmission; reviews: PeerReview[] }[]>> {
  return run(async (c, uid) => {
    const subs = await c.from('peer_submissions').select('*').eq('author_id', uid).order('created_at', { ascending: false }).limit(30)
    if (subs.error) return { ok: false, reasonUz: peerErrorUz(subs.error) }
    const list = (subs.data ?? []) as PeerSubmission[]
    if (list.length === 0) return { ok: true, data: [] }
    const revs = await c
      .from('peer_reviews')
      .select('id, submission_id, score, comment, created_at')
      .in(
        'submission_id',
        list.map((s) => s.id),
      )
    if (revs.error) return { ok: false, reasonUz: peerErrorUz(revs.error) }
    const reviews = (revs.data ?? []) as PeerReview[]
    return { ok: true, data: list.map((s) => ({ submission: s, reviews: reviews.filter((r) => r.submission_id === s.id) })) }
  })
}

/** Tekshirish uchun bitta javob olish (server tayinlaydi). `null` — hozircha yo'q. */
export function claimPeerSubmission(kind?: PeerKind): Promise<PeerResult<PeerSubmission | null>> {
  return run(async (c) => {
    const { data, error } = await c.rpc('peer_claim', { p_kind: kind ?? null })
    if (error) return { ok: false, reasonUz: peerErrorUz(error) }
    const rows = (data ?? []) as PeerSubmission[]
    return { ok: true, data: rows[0] ?? null }
  })
}

export function submitPeerReview(submissionId: string, score: number, comment: string): Promise<PeerResult<true>> {
  const bad = validateReview(score, comment)
  if (bad) return Promise.resolve({ ok: false, reasonUz: bad })
  return run(async (c) => {
    const { error } = await c.from('peer_reviews').insert({ submission_id: submissionId, score, comment: comment.trim() })
    if (error) return { ok: false, reasonUz: peerErrorUz(error) }
    return { ok: true, data: true }
  })
}

export function reportPeer(target: { submissionId: string } | { reviewId: string }, reason: PeerReportReason): Promise<PeerResult<true>> {
  return run(async (c) => {
    const row: { reason: PeerReportReason; submission_id?: string; review_id?: string } =
      'submissionId' in target ? { submission_id: target.submissionId, reason } : { review_id: target.reviewId, reason }
    const { error } = await c.from('peer_reports').insert(row)
    if (error) return { ok: false, reasonUz: peerErrorUz(error) }
    return { ok: true, data: true }
  })
}

export function deletePeerSubmission(id: string): Promise<PeerResult<true>> {
  return run(async (c) => {
    const { error } = await c.from('peer_submissions').delete().eq('id', id)
    if (error) return { ok: false, reasonUz: peerErrorUz(error) }
    return { ok: true, data: true }
  })
}
