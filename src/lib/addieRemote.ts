/**
 * ADDIE — server qatlami (`supabase/migrations/0010_addie.sql`).
 *
 *  - `saveProgressSnapshot` — kunlik o'zlashtirish surati (`user_progress`, kuniga 1 qator, upsert).
 *  - `saveAdaptivePlan` — moslashuvchan reja (`adaptive_plans`), faqat o'zgarganda.
 *  - `saveChatLog` — suhbatdosh suhbati (`ai_chat_logs`).
 *  - Guruh mashg'ulotlari: `listGroupSessions`, `createGroupSession`, `joinGroupSession`,
 *    `leaveGroupSession`, `cancelGroupSession`.
 *
 * Hammasi IXTIYORIY: server ulanmagan yoki mehmon rejimi bo'lsa ilova lokal
 * ishlashda davom etadi; har xato o'quvchiga tushunarli SABAB bilan qaytadi
 * (soxta "saqlandi" yo'q).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CefrLevel } from '../content/types'
import type { AdaptivePlan } from './adaptive'
import type { ErrorCategory, SkillMastery, VelocityReport } from './evaluation'
import { getSupabase, supabaseConfigured } from './supabase'

export type RemoteResult<T> = { ok: true; data: T } | { ok: false; reasonUz: string }

export function addieErrorUz(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string }
  const msg = (e.message ?? '').toLowerCase()
<<<<<<< HEAD
  if (msg.includes('session_full')) return 'Bu maşğulotda böş joy qolmagan.'
  if (msg.includes('session_started')) return 'Maşğulot allaqaçon boşlangan — qöşiliş yopiq.'
  if (msg.includes('session_not_found')) return 'Maşğulot topilmadi yoki bekor qilingan.'
  if (msg.includes('group_daily_limit')) return 'Bugun 5 ta maşğulot yaratildi — bu kunlik çegara.'
=======
  if (msg.includes('session_full')) return 'Bu mashğulotda böş joy qolmagan.'
  if (msg.includes('session_started')) return 'Mashğulot allaqaçon boşlangan — qöşiliş yopiq.'
  if (msg.includes('session_not_found')) return 'Mashğulot topilmadi yoki bekor qilingan.'
  if (msg.includes('group_daily_limit')) return 'Bugun 5 ta mashğulot yaratildi — bu kunlik çegara.'
>>>>>>> 42bb0df5de39fb26b49bc030cbd09cb231ef75d7
  if (msg.includes('account_blocked')) return 'Hisobingiz vaqtinça bloklangan.'
  if (e.code === 'PGRST205' || e.code === '42P01' || e.code === 'PGRST202' || msg.includes('schema cache'))
    return 'Serverda kerakli jadvallar hali yöq: `supabase/migrations/0010_addie.sql` migratsiyasini qöllang.'
  if (e.code === '23514') return 'Ma’lumot çegaradan taşqarida (matn uzunligi, vaqt yoki siğim).'
  if (e.code === '42501' || msg.includes('row-level security')) return 'Bu amalga ruxsat yöq.'
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Internet aloqasi yöq. Ulanişni tekşirib, qayta urinib köring.'
  return 'Server xatosi. Birozdan keyin qayta urinib köring.'
}

type Ready = { ok: true; client: SupabaseClient; userId: string } | { ok: false; reasonUz: string }

async function ready(): Promise<Ready> {
  if (!supabaseConfigured) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan — bu imkoniyat faqat server bilan işlaydi.' }
  const client = await getSupabase()
  if (!client) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan.' }
  try {
    const { data, error } = await client.auth.getSession()
    if (error) return { ok: false, reasonUz: addieErrorUz(error) }
    const userId = data.session?.user?.id
    if (!userId) return { ok: false, reasonUz: 'Buning uçun hisobingizga kiring (mehmon rejimida ma’lumot serverga yuborilmaydi).' }
    return { ok: true, client, userId }
  } catch (err) {
    return { ok: false, reasonUz: addieErrorUz(err) }
  }
}

async function run<T>(fn: (c: SupabaseClient, uid: string) => Promise<RemoteResult<T>>): Promise<RemoteResult<T>> {
  const r = await ready()
  if (!r.ok) return r
  try {
    return await fn(r.client, r.userId)
  } catch (err) {
    return { ok: false, reasonUz: addieErrorUz(err) }
  }
}

/* ------------------------------ progress / reja ------------------------------ */

/** Barqaror qisqa iz (o'zgarish bo'lmasa qayta yuborilmaydi). */
export function fingerprintOf(value: unknown): string {
  const s = JSON.stringify(value)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

const memo = new Map<string, string>()
function changed(key: string, value: unknown): boolean {
  const fp = fingerprintOf(value)
  let prev = memo.get(key)
  try {
    prev = prev ?? localStorage.getItem(key) ?? undefined
  } catch {
    /* saqlash yopiq — xotiradagisi yetadi */
  }
  if (prev === fp) return false
  memo.set(key, fp)
  try {
    localStorage.setItem(key, fp)
  } catch {
    /* e'tiborsiz */
  }
  return true
}

export interface ProgressSnapshot {
  level: CefrLevel
  mastery: readonly SkillMastery[]
  velocity: VelocityReport
  categories: readonly ErrorCategory[]
  completedDays: number
}

export function snapshotRow(s: ProgressSnapshot, day: string) {
  return {
    day,
    level: s.level,
    skills: Object.fromEntries(s.mastery.map((m) => [m.skill, { accuracy: m.accuracy, count: m.count }])),
    velocity: s.velocity,
    error_categories: s.categories.slice(0, 10).map((c) => ({ key: c.key, open: c.open, wrong: c.wrong })),
    completed_days: s.completedDays,
  }
}

/** Kunlik surat — o'zgarmagan bo'lsa yuborilmaydi. */
export function saveProgressSnapshot(s: ProgressSnapshot, day: string): Promise<RemoteResult<'saved' | 'unchanged'>> {
  const row = snapshotRow(s, day)
  if (!changed(`aea:addie:progress:${day}`, row)) return Promise.resolve({ ok: true, data: 'unchanged' })
  return run(async (c, uid) => {
    const { error } = await c.from('user_progress').upsert({ ...row, user_id: uid, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' })
    if (error) {
      memo.delete(`aea:addie:progress:${day}`)
      return { ok: false, reasonUz: addieErrorUz(error) }
    }
    return { ok: true, data: 'saved' }
  })
}

/** Reja tarixi — tavsiyalar o'zgarganda bitta yangi qator. */
export function saveAdaptivePlan(plan: AdaptivePlan): Promise<RemoteResult<'saved' | 'unchanged'>> {
  const body = {
    weakSkills: plan.weakSkills,
    focus: plan.focus.map((c) => ({ key: c.key, open: c.open })),
    actions: plan.actions.map((a) => ({ id: a.id, to: a.to })),
    difficultyReasonUz: plan.difficultyReasonUz,
  }
  if (!changed('aea:addie:plan', { level: plan.level, d: plan.targetDifficulty, body })) return Promise.resolve({ ok: true, data: 'unchanged' })
  return run(async (c) => {
    const { error } = await c.from('adaptive_plans').insert({ level: plan.level, target_difficulty: plan.targetDifficulty, plan: body })
    if (error) {
      memo.delete('aea:addie:plan')
      return { ok: false, reasonUz: addieErrorUz(error) }
    }
    return { ok: true, data: 'saved' }
  })
}

/* ------------------------------ suhbat yozuvi ------------------------------ */

export interface ChatLogInput {
  dialogueId: string
  level: CefrLevel
  engine: 'ai' | 'script'
  lines: readonly { speaker: 'partner' | 'learner'; text: string }[]
  corrections?: readonly { excerpt: string; correction: string; whyUz?: string }[]
}

export function saveChatLog(input: ChatLogInput): Promise<RemoteResult<true>> {
  const lines = input.lines
    .filter((l) => l.text.trim())
    .slice(-60)
    .map((l) => ({ speaker: l.speaker, text: l.text.trim().slice(0, 600) }))
  if (lines.length === 0) return Promise.resolve({ ok: false, reasonUz: 'Suhbat böş — saqlanadigan narsa yöq.' })
  return run(async (c) => {
    const { error } = await c.from('ai_chat_logs').insert({
      dialogue_id: input.dialogueId.slice(0, 120),
      level: input.level,
      engine: input.engine,
      lines,
      corrections: (input.corrections ?? []).slice(0, 60),
    })
    if (error) return { ok: false, reasonUz: addieErrorUz(error) }
    return { ok: true, data: true }
  })
}

/* ------------------------------ guruh mashg'ulotlari ------------------------------ */

export type GroupKind = 'study' | 'challenge' | 'mentor'

export const GROUP_KIND_UZ: Record<GroupKind, string> = {
  study: 'Birgalikda öqiş',
  challenge: 'Guruh musobaqasi',
<<<<<<< HEAD
  mentor: 'Ustoz bilan maşğulot',
=======
  mentor: 'Ustoz bilan mashğulot',
>>>>>>> 42bb0df5de39fb26b49bc030cbd09cb231ef75d7
}

export interface GroupSession {
  id: string
  host_id: string
  kind: GroupKind
  level: CefrLevel
  title: string
  topic: string
  starts_at: string
  duration_min: number
  capacity: number
  status: 'scheduled' | 'cancelled'
  /** Mijozda to'ldiriladi. */
  members?: number
  joined?: boolean
}

export function validateGroupInput(input: { title: string; topic: string; startsAt: Date; capacity: number; durationMin: number }, now = new Date()): string | null {
  const t = input.title.trim()
  if (t.length < 3 || t.length > 120) return 'Sarlavha 3–120 belgi bölsin.'
  if (input.topic.length > 500) return 'Mavzu 500 belgidan oşmasin.'
  if (!(input.startsAt.getTime() > now.getTime())) return 'Boşlaniş vaqti kelajakda bölsin.'
  if (input.capacity < 2 || input.capacity > 30) return 'Siğim 2–30 kişi.'
  if (input.durationMin < 10 || input.durationMin > 180) return 'Davomiylik 10–180 daqiqa.'
  return null
}

/** Yaqin 30 kundagi rejalashtirilgan mashg'ulotlar (+ a'zolar soni va men qo'shilganmi). */
export function listGroupSessions(level?: CefrLevel): Promise<RemoteResult<GroupSession[]>> {
  return run(async (c, uid) => {
    let q = c
      .from('group_sessions')
      .select('*')
      .eq('status', 'scheduled')
      .gt('starts_at', new Date().toISOString())
      .lt('starts_at', new Date(Date.now() + 30 * 86_400_000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(30)
    if (level) q = q.eq('level', level)
    const { data, error } = await q
    if (error) return { ok: false, reasonUz: addieErrorUz(error) }
    const list = (data ?? []) as GroupSession[]
    const mine = await c.from('group_members').select('session_id').eq('user_id', uid)
    if (mine.error) return { ok: false, reasonUz: addieErrorUz(mine.error) }
    const joined = new Set((mine.data ?? []).map((r: { session_id: string }) => r.session_id))
    const counts = await Promise.all(list.map((s) => c.rpc('group_member_count', { p_session: s.id })))
    return {
      ok: true,
      data: list.map((s, i) => ({ ...s, members: typeof counts[i]?.data === 'number' ? (counts[i]!.data as number) : undefined, joined: joined.has(s.id) })),
    }
  })
}

export function createGroupSession(input: {
  kind: GroupKind
  level: CefrLevel
  title: string
  topic: string
  startsAt: Date
  durationMin: number
  capacity: number
}): Promise<RemoteResult<GroupSession>> {
  const bad = validateGroupInput(input)
  if (bad) return Promise.resolve({ ok: false, reasonUz: bad })
  return run(async (c) => {
    const { data, error } = await c
      .from('group_sessions')
      .insert({
        kind: input.kind,
        level: input.level,
        title: input.title.trim(),
        topic: input.topic.trim(),
        starts_at: input.startsAt.toISOString(),
        duration_min: Math.round(input.durationMin),
        capacity: Math.round(input.capacity),
      })
      .select()
      .single()
    if (error) return { ok: false, reasonUz: addieErrorUz(error) }
    const s = data as GroupSession
    // Tashkilotchi o'z mashg'ulotiga avtomatik qo'shiladi.
    const j = await c.rpc('group_join', { p_session: s.id })
    if (j.error) return { ok: false, reasonUz: addieErrorUz(j.error) }
    return { ok: true, data: { ...s, members: 1, joined: true } }
  })
}

export function joinGroupSession(id: string): Promise<RemoteResult<true>> {
  return run(async (c) => {
    const { error } = await c.rpc('group_join', { p_session: id })
    if (error) return { ok: false, reasonUz: addieErrorUz(error) }
    return { ok: true, data: true }
  })
}

export function leaveGroupSession(id: string): Promise<RemoteResult<true>> {
  return run(async (c, uid) => {
    const { error } = await c.from('group_members').delete().eq('session_id', id).eq('user_id', uid)
    if (error) return { ok: false, reasonUz: addieErrorUz(error) }
    return { ok: true, data: true }
  })
}

export function cancelGroupSession(id: string): Promise<RemoteResult<true>> {
  return run(async (c, uid) => {
    const { error } = await c.from('group_sessions').update({ status: 'cancelled' }).eq('id', id).eq('host_id', uid)
    if (error) return { ok: false, reasonUz: addieErrorUz(error) }
    return { ok: true, data: true }
  })
}
