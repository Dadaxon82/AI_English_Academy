/**
 * Sinxronlash: mahalliy ma'lumot ⇄ Supabase.
 *
 * Qoidalar:
 *  - Internet yo'qligini aniq ko'rsatish (buni ilova UI'da ko'rsatadi).
 *  - Navbat xavfsiz boshqariladi: xato bo'lsa qayta urinishlar sanaladi,
 *    ma'lumot yo'qolmaydi.
 *  - RLS: foydalanuvchi FAQAT o'z qatorini yozadi/o'qiydi (anon bilan).
 *    Shuning uchun barcha so'rovlarda user_id = sessionUserId.
 *  - Bitta "sinxronizatsiya" butun navbatni yuboradi; serverda borligi
 *    ma'lum (izi o'zgarmagan) yozuvlar qayta navbatga qo'yilmaydi.
 */

import { getSupabase, supabaseConfigured } from './supabase'
import { enqueueMany, dedupeKey, loadQueue, loadSynced, saveSynced, updateQueue, type QueueItem } from './storage'
import { CEFR_LEVELS, CORE_SKILLS, SKILLS, type CefrLevel, type CoreSkill, type Skill } from '../content/types'
import { leagueWeek, normalizeGame } from './game'
import { LEAGUE_BOARD_SIZE, leagueById } from './gameConfig'
import type { RemoteSnapshot } from './merge'
import { START_EASE, type SrsState } from './srs'
import type {
  AppData,
  AttemptRecord,
  AttemptSource,
  DayActivity,
  GameState,
  MockExamAttempt,
  SpeakingAnalysis,
  SpeakingSession,
  UserSettings,
  WritingAnalysis,
  WritingSubmission,
} from './types'
import { clampDailyMinutes, nearestXpGoal } from './types'

export type NetState = 'online' | 'offline' | 'unknown'

export function networkStatus(): NetState {
  if (typeof navigator === 'undefined') return 'unknown'
  return navigator.onLine ? 'online' : 'offline'
}

/** AppData'ni DB yozuvlariga aylantirish (table, op, payload). */
export function toQueueItems(data: AppData): Omit<QueueItem, 'id' | 'tries'>[] {
  const uid = data.userId
  const items: Omit<QueueItem, 'id' | 'tries'>[] = []

  // Diqqat: PostgREST ustun nomlarini SNAKE_case kutadi. `...data.settings`
  // (camelCase) yuborilsa so'rov "column not found" bilan qaytadi va navbat
  // hech qachon tozalanmaydi — shuning uchun maydonlar bittalab aylantiriladi.
  items.push({
    table: 'user_settings',
    op: 'upsert',
    at: Date.now(),
    payload: {
      user_id: uid,
      // DB CHECK (30..240) bilan bir xil chegara: eski keshdagi 15–25 daqiqa
      // qiymati yozuvni abadiy rad ettirardi.
      daily_minutes: clampDailyMinutes(data.settings.dailyMinutes),
      current_level: data.settings.currentLevel,
      target_level: data.settings.targetLevel,
      exam_date: data.settings.examDate,
      allocation: data.settings.allocation,
      theme: data.settings.theme,
      ai_enabled: data.settings.aiEnabled,
      // Harakat (animatsiya) holati — `motion_enabled` ustuni
      // `supabase/migrations/0003_motion.sql`da qo'shilgan. Bu maydon
      // yuborilmasa boshqa qurilmada (mobil ilovada) yoqilgan/o'chirilgan
      // holat yo'qolardi — ikki tomonlama sinxron shart.
      motion_enabled: data.settings.motionEnabled,
      // O'yin qatlami sozlamalari — `supabase/migrations/0004_weekly_xp.sql`da
      // qo'shilgan ustunlar. `xp_goal_xp` FAQAT bosqich qiymati (DB CHECK ham
      // shuni tekshiradi), `hearts_enabled` — yuraklar tizimi.
      xp_goal_xp: nearestXpGoal(data.settings.xpGoalXp),
      hearts_enabled: data.settings.heartsEnabled,
    },
  })

  // O'quv yo'li (tugatilgan kunlar, test ballari), XP va diagnostika serverda
  // boshqa joyda saqlanmaydi — `plan` jsonb ustuniga yoziladi, aks holda
  // boshqa qurilmada yoki qayta kirganda yo'qolardi. Shuning uchun diagnostika
  // topshirilmagan bo'lsa ham yuboriladi.
  items.push({
    table: 'learning_plans',
    op: 'upsert',
    at: Date.now(),
    payload: {
      // PK default UUID bo'lgani uchun payload'da id bo'lmasa upsert har
      // safar yangi qator qo'shardi. Foydalanuvchiga bitta faol reja —
      // id'ni foydalanuvchi id'si bilan bir xil qilamiz (deterministik).
      id: uid,
      user_id: uid,
      current_level: data.settings.currentLevel,
      target_level: data.settings.targetLevel,
      diagnostic_level: data.diagnostic?.level ?? null,
      // `plan` — qurilmalar orasidagi yagona holat tashuvchisi:
      //   path/xp/diagnostic/onboardedAt (eski) + game (o'yin qatlami) +
      //   badges (yutuq nishonlari). `game.league` SAQLANMAYDI — liga jadvali
      //   `weekly_xp`dan o'qiladi (qator katta bo'lib, har yozuvda ko'chib
      //   yurmasin).
      plan: {
        path: data.path,
        xp: data.xp,
        diagnostic: data.diagnostic,
        onboardedAt: data.onboardedAt,
        badges: data.badges,
        game: { ...data.game, league: null },
      },
    },
  })

  // ---- Haftalik XP qatori (liga) — `0004_weekly_xp.sql` ----
  // Son `weeklyXp()`dan: urinishlardan aniq hisoblanadi, shuning uchun ikkala
  // mijoz BIR XIL son yuboradi (XP byusti va dars bonuslari KIRMAYDI — ular
  // qurilmaga bog'liq, liga jadvaliga aralashmaydi).
  {
    const wk = leagueWeek(data)
    items.push({
      table: 'weekly_xp',
      op: 'upsert',
      at: Date.now(),
      payload: {
        user_id: uid,
        week_start: wk.weekStart,
        xp: wk.xp,
        league_id: wk.leagueId,
        display_name: (data.profileName || '').slice(0, 60),
      },
    })
  }

  for (const a of data.attempts.slice(-500)) {
    items.push({
      table: 'exercise_attempts',
      op: 'upsert',
      at: a.at,
      payload: {
        id: a.id,
        user_id: uid,
        exercise_id: a.exerciseId,
        skill: a.skill,
        level: a.level,
        correct: a.correct,
        partial_score: a.partial,
        difficulty: a.difficulty,
        seconds_spent: a.secondsSpent,
        source: a.source,
        answer_text: a.answerGiven.slice(0, 2000),
        created_at: new Date(a.at).toISOString(),
      },
    })
  }

  for (const v of Object.entries(data.srs)) {
    items.push({
      table: 'user_vocabulary',
      op: 'upsert',
      at: Date.now(),
      payload: {
        user_id: uid,
        vocabulary_id: v[0],
        learned_at: v[1].learnedAt ? new Date(v[1].learnedAt).toISOString() : null,
        due_at: new Date(v[1].dueAt).toISOString(),
        interval_days: v[1].intervalDays,
        ease: v[1].ease,
        reps: v[1].reps,
        lapses: v[1].lapses,
        // Oxirgi takror vaqti — boshqa qurilmadagi holat bilan solishtirishda kerak.
        updated_at: new Date(v[1].lastReviewedAt ?? v[1].dueAt).toISOString(),
      },
    })
  }

  for (const [date, act] of Object.entries(data.activity)) {
    items.push({
      table: 'daily_activity',
      op: 'upsert',
      at: Date.now(),
      payload: {
        user_id: uid,
        day: date,
        seconds: act.seconds,
        attempts: act.attempts,
        correct: act.correct,
        new_words: act.newWords,
        reviewed_words: act.reviewedWords,
        skills: act.skills,
      },
    })
  }

  for (const w of data.writing.slice(-100)) pushWriting(items, uid, w)
  for (const s of data.speaking.slice(-100)) pushSpeaking(items, uid, s)
  for (const m of data.mockAttempts.slice(-20)) pushMock(items, uid, m)

  return items
}

const pushWriting = (items: Omit<QueueItem, 'id' | 'tries'>[], uid: string, w: WritingSubmission) =>
  items.push({
    table: 'writing_submissions',
    op: 'upsert',
    at: w.createdAt,
    payload: {
      id: w.id,
      user_id: uid,
      task_id: w.taskId,
      text: w.text.slice(0, 20_000),
      word_count: w.wordCount,
      seconds_spent: w.secondsSpent,
      analysis: w.analysis,
      supersedes_id: w.supersedesId,
      created_at: new Date(w.createdAt).toISOString(),
    },
  })

const pushSpeaking = (items: Omit<QueueItem, 'id' | 'tries'>[], uid: string, s: SpeakingSession) =>
  items.push({
    table: 'speaking_sessions',
    op: 'upsert',
    at: s.createdAt,
    payload: {
      id: s.id,
      user_id: uid,
      task_id: s.taskId,
      duration_sec: s.durationSec,
      // Ovoz fayli rozilikisiz serverga yuborilmaydi:
      audio_stored: false,
      transcript: s.transcript,
      transcription_engine: s.transcriptionEngine,
      analysis: s.analysis,
      text_answer: s.textAnswer,
      created_at: new Date(s.createdAt).toISOString(),
    },
  })

const pushMock = (items: Omit<QueueItem, 'id' | 'tries'>[], uid: string, m: MockExamAttempt) =>
  items.push({
    table: 'mock_exam_attempts',
    op: 'upsert',
    at: m.completedAt,
    payload: {
      id: m.id,
      user_id: uid,
      exam_id: m.examId,
      sections: m.sections,
      total_score: m.totalScore,
      speaking_advisory: m.speakingAdvisory,
      completed_at: new Date(m.completedAt).toISOString(),
    },
  })

/* ------------------------- yuborilganlar izi ------------------------- */

/** Tez, kriptografik bo'lmagan 53-bit xesh (cyrb53) — faqat o'zgarishni aniqlash uchun. */
function hashString(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/** Yozuvning barqaror kaliti (jadval + tabiiy kalit). */
export function fingerprintKey(table: string, payload: unknown): string | null {
  const k = dedupeKey(table, payload)
  return k === null ? null : `${table}|${k}`
}

export function fingerprint(payload: unknown): string {
  return hashString(JSON.stringify(payload))
}

/* ------------------------------ yuborish ------------------------------ */

export interface SyncResult {
  ok: boolean
  attempted: number
  done: number
  /** Vaqtinchalik xato — navbatda qoldi, keyingi sinxronda qayta uriladi */
  failed: number
  /** Server qabul qilmadi (ma'lumot/cheklov/ruxsat xatosi) — qayta urinish foydasiz */
  rejected: number
  reasonUz: string | null
}

/** Bitta so'rovdagi qatorlar chegarasi (PostgREST bulk upsert). */
const BULK_ROWS = 100
const BULK_CHARS = 250_000

/**
 * Qayta urinishdan foyda yo'q xatolar: ma'lumot (22…), cheklov (23…),
 * huquq/sxema (42…) va so'rov (PGRST1…/PGRST2…) xatolari. 23503 (FK)
 * bundan mustasno — bog'liq qator keyin yozilsa o'tishi mumkin.
 */
function isPermanent(code: string | undefined): boolean {
  if (!code || code === '23503') return false
  return /^(22|23|42)/.test(code) || /^PGRST[12]/.test(code)
}

/** Tarmoq (kodsiz) yoki sessiya/JWT (PGRST3…) xatosi — qolgan so'rovlar ham yiqiladi, to'xtaymiz. */
function stopsRun(code: string | undefined): boolean {
  return !code || /^PGRST3/.test(code)
}

/** Yozuvlarni jadval bo'yicha guruhlab, bulk so'rovlarga bo'lish (jadval ichidagi tartib saqlanadi). */
function chunkForBulk(items: readonly QueueItem[]): QueueItem[][] {
  const groups = new Map<string, QueueItem[]>()
  for (const it of items) {
    const g = `${it.op}|${it.table}`
    const list = groups.get(g)
    if (list) list.push(it)
    else groups.set(g, [it])
  }
  const out: QueueItem[][] = []
  for (const list of groups.values()) {
    let cur: QueueItem[] = []
    let chars = 0
    for (const it of list) {
      const size = JSON.stringify(it.payload).length
      if (cur.length > 0 && (cur.length >= BULK_ROWS || chars + size > BULK_CHARS)) {
        out.push(cur)
        cur = []
        chars = 0
      }
      cur.push(it)
      chars += size
    }
    if (cur.length) out.push(cur)
  }
  return out
}

/**
 * Navbatni serverga yuborish.
 *
 * ESKI BUG: har chaqiruv faqat navbat boshidagi 80 ta yozuvni olardi, tugma esa
 * oldin butun ma'lumotni qayta navbatga qo'yib, tartibni tiklardi — natijada
 * har safar O'SHA 80 ta yuborilib, qolganlari (lug'at, kunlik faollik, yozish,
 * mock…) serverga hech qachon yetmasdi. Endi butun navbat bo'shatiladi.
 */
export async function syncNow(userId: string, opts: { maxItems?: number } = {}): Promise<SyncResult> {
  const empty = { attempted: 0, done: 0, failed: 0, rejected: 0 }
  if (!supabaseConfigured) {
    return { ok: false, ...empty, reasonUz: 'Supabase sozlanmagan — ma’lumotlar qurilmada saqlanmoqda.' }
  }
  if (networkStatus() === 'offline') {
    return { ok: false, ...empty, reasonUz: 'Internet yo‘q. Navbat saqlandi, ulanish qaytganda yuboriladi.' }
  }
  const sb = getSupabase()
  if (!sb) return { ok: false, ...empty, reasonUz: 'Supabase mijoziga ulanib bo‘lmadi.' }

  const { data: sess, error: authErr } = await sb.auth.getSession()
  if (authErr || !sess.session) {
    return { ok: false, ...empty, reasonUz: 'Tizimga kirilmagan — sinxronlash to‘xtatildi.' }
  }

  const queue = await loadQueue(userId)
  const batch = queue.slice(0, opts.maxItems ?? queue.length)
  const synced = await loadSynced(userId)
  let done = 0
  let rejected = 0
  let stopped = false
  const failures: QueueItem[] = []

  const markDone = (item: QueueItem) => {
    done++
    const k = fingerprintKey(item.table, item.payload)
    if (k) synced[k] = fingerprint(item.payload)
  }
  const fail = (item: QueueItem, code: string | undefined) => {
    if (stopsRun(code)) stopped = true
    if (isPermanent(code)) rejected++
    else failures.push({ ...item, tries: item.tries + 1 })
  }
  const sendOne = async (item: QueueItem) => {
    // Tarmoq/sessiya yiqilgan bo'lsa urinib o'tirmaymiz — keyingi sinxronda.
    if (stopped) {
      failures.push({ ...item, tries: item.tries + 1 })
      return
    }
    try {
      const table = sb.from(item.table)
      const { error } =
        item.op === 'delete'
          ? await table.delete().eq('user_id', userId).eq('id', (item.payload as { id?: string })?.id)
          : await table.upsert(item.payload as Record<string, unknown>)
      if (error) fail(item, error.code)
      else markDone(item)
    } catch (err) {
      fail(item, (err as { code?: string }).code)
    }
  }

  for (const chunk of chunkForBulk(batch)) {
    if (stopped || chunk.length === 1 || chunk[0]!.op === 'delete') {
      for (const it of chunk) await sendOne(it)
      continue
    }
    let code: string | undefined
    let ok = false
    try {
      const { error } = await sb
        .from(chunk[0]!.table)
        .upsert(chunk.map((it) => it.payload as Record<string, unknown>), { defaultToNull: false })
      ok = !error
      code = error?.code
    } catch (err) {
      code = (err as { code?: string }).code
    }
    if (ok) {
      chunk.forEach(markDone)
    } else if (stopsRun(code)) {
      // Tarmoq yoki sessiya xatosi: bu va qolgan bo'laklar keyingi sinxronda.
      stopped = true
      for (const it of chunk) failures.push({ ...it, tries: it.tries + 1 })
    } else {
      // Bo'lakda bitta yaroqsiz qator butun so'rovni yiqitadi — qatorlarni
      // alohida yuborib, faqat aybdorini ajratamiz.
      for (const it of chunk) await sendOne(it)
    }
  }

  await saveSynced(userId, synced)
  // Muvaffaqiyatsizlar navbatning oxiriga qo'yiladi (tartib saqlanadi).
  await updateQueue(userId, [...queue.slice(batch.length), ...failures])

  const failed = failures.length
  const reasons: string[] = []
  if (failed) reasons.push(`${failed} ta yozuv yuborilmadi — keyingi sinxronda qayta uriladi.`)
  if (rejected) reasons.push(`${rejected} ta yozuvni server qabul qilmadi (ma’lumot yoki ruxsat xatosi).`)
  return { ok: failed === 0 && rejected === 0, attempted: batch.length, done, failed, rejected, reasonUz: reasons.length ? reasons.join(' ') : null }
}

/**
 * Butun holatni navbatga qo'yish — lekin serverda allaqachon AYNAN shu
 * ko'rinishda bor yozuvlar (izi mos) qayta qo'yilmaydi.
 */
export async function queueAllData(data: AppData): Promise<number> {
  const all = toQueueItems(data)
  const synced = await loadSynced(data.userId)
  const pending = all.filter((it) => {
    const k = fingerprintKey(it.table, it.payload)
    return k === null || synced[k] !== fingerprint(it.payload)
  })
  // Endi holatda yo'q yozuvlar izini tozalaymiz (masalan 500 tadan eski urinishlar).
  const live = new Set(all.map((it) => fingerprintKey(it.table, it.payload)))
  const kept = Object.entries(synced).filter(([k]) => live.has(k))
  if (kept.length !== Object.keys(synced).length) await saveSynced(data.userId, Object.fromEntries(kept))
  const stamp = Date.now()
  await enqueueMany(
    data.userId,
    pending.map((it, i) => ({ ...it, id: `${it.table}:${stamp}:${i}` })),
  )
  return pending.length
}

/* ------------------------------ o'chirish ------------------------------ */

/** Foydalanuvchining shaxsiy jadvallari ("Barcha ma'lumotni o'chirish" shularni tozalaydi). */
const PERSONAL_TABLES = [
  'exercise_attempts',
  'user_vocabulary',
  'daily_activity',
  'writing_submissions',
  'speaking_sessions',
  'mock_exam_attempts',
  'learning_plans',
  'user_settings',
  'weekly_xp',
] as const

/**
 * Serverdagi barcha shaxsiy yozuvlarni o'chirish (RLS: faqat o'z qatorlari).
 * `profiles` qatori qoldiriladi — u hisobning o'zi (auth bilan bog'langan).
 *
 * ESKI KAMCHILIK: "Barcha ma'lumotni o'chirish" faqat qurilmani tozalardi;
 * endi hisobga kirganda progress serverdan tiklangani uchun serverdagi
 * yozuvlar qolsa, o'chirilgan ma'lumot keyingi kirishda qaytib kelardi.
 */
export async function deleteRemoteData(userId: string): Promise<{ ok: boolean; reasonUz: string | null }> {
  if (!supabaseConfigured) return { ok: true, reasonUz: null }
  if (networkStatus() === 'offline') return { ok: false, reasonUz: 'Internet yo‘q — serverdagi ma’lumot o‘chirilmadi.' }
  const sb = getSupabase()
  if (!sb) return { ok: false, reasonUz: 'Supabase mijoziga ulanib bo‘lmadi.' }
  const { data: sess, error: authErr } = await sb.auth.getSession()
  if (authErr || !sess.session || sess.session.user.id !== userId) {
    return { ok: false, reasonUz: 'Tizimga kirilmagan — serverdagi ma’lumot o‘chirilmadi.' }
  }
  for (const table of PERSONAL_TABLES) {
    try {
      const { error } = await sb.from(table).delete().eq('user_id', userId)
      if (error) return { ok: false, reasonUz: 'Serverdagi ma’lumotni o‘chirib bo‘lmadi. Keyinroq qayta urinib ko‘ring.' }
    } catch {
      return { ok: false, reasonUz: 'Serverdagi ma’lumotni o‘chirib bo‘lmadi. Internetni tekshiring.' }
    }
  }
  return { ok: true, reasonUz: null }
}

/* ------------------------------- o'qish ------------------------------- */

type Row = Record<string, unknown>

export interface RemoteRows {
  settings: Row | null
  plan: Row | null
  attempts: Row[]
  vocabulary: Row[]
  activity: Row[]
  writing: Row[]
  speaking: Row[]
  mocks: Row[]
  /** `profiles` qatori — liga uchun ko'rsatish nomi (o'z qatorimiz, RLS). */
  profile?: Row | null
  /** Liga tablasidagi qatorlar (o'sha hafta + o'sha liga — barcha a'zolar). */
  leagueRows?: Row[]
  /** O'z `weekly_xp` qatorlarimiz (so'nggi haftalar) — liga snapshoti uchun. */
  ownWeekly?: Row[]
}

/** `weekly_xp` qatorini o'qib, liga tablasi qatoriga aylantiradi. */
function leagueRowFromRow(r: Row): { userId: string; name: string; xp: number } | null {
  const userId = str(r.user_id)
  if (!userId) return null
  return { userId, name: str(r.display_name) ?? '', xp: Math.max(0, Math.floor(num(r.xp))) }
}

const isObj = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}
const time = (v: unknown): number | null => {
  const s = str(v)
  if (!s) return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}
const isLevel = (v: unknown): v is CefrLevel => typeof v === 'string' && (CEFR_LEVELS as readonly string[]).includes(v)
const isSkill = (v: unknown): v is Skill => typeof v === 'string' && (SKILLS as readonly string[]).includes(v)
const isCoreSkill = (v: unknown): v is CoreSkill => typeof v === 'string' && (CORE_SKILLS as readonly string[]).includes(v)
const isSource = (v: unknown): v is AttemptSource =>
  v === 'practice' || v === 'section_test' || v === 'mock_exam' || v === 'diagnostic'

function numRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!isObj(v)) return out
  for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && Number.isFinite(x)) out[k] = x
  return out
}

function settingsFromRow(r: Row | null): Partial<UserSettings> | null {
  if (!r) return null
  const out: Partial<UserSettings> = {}
  if (r.daily_minutes !== null && r.daily_minutes !== undefined) out.dailyMinutes = clampDailyMinutes(num(r.daily_minutes, 90))
  if (isLevel(r.current_level)) out.currentLevel = r.current_level
  if (isLevel(r.target_level)) out.targetLevel = r.target_level
  out.examDate = str(r.exam_date)
  const alloc = numRecord(r.allocation)
  if (SKILLS.every((s) => alloc[s] !== undefined)) out.allocation = alloc as UserSettings['allocation']
  if (r.theme === 'light' || r.theme === 'dark' || r.theme === 'system') out.theme = r.theme
  if (typeof r.ai_enabled === 'boolean') out.aiEnabled = r.ai_enabled
  // `motion_enabled` ustuni bo'lmasa (migratsiya hali bajarilmagan baza) lokal
  // qiymat saqlanadi — hech narsa ixtir qilinmaydi.
  if (typeof r.motion_enabled === 'boolean') out.motionEnabled = r.motion_enabled
  // O'yin sozlamalari (`0004_weekly_xp.sql`). `xp_goal_xp` eng yaqin bosqichga
  // qaytariladi: DB bosqichlarini CHECK ham tekshiradi, lekin eski/ boshqa
  // bazadan kelgan son lokal qoidani buzmasligi kerak.
  if (typeof r.xp_goal_xp === 'number' && Number.isFinite(r.xp_goal_xp)) out.xpGoalXp = nearestXpGoal(r.xp_goal_xp)
  if (typeof r.hearts_enabled === 'boolean') out.heartsEnabled = r.hearts_enabled
  return out
}

function planFromRow(r: Row | null): RemoteSnapshot['plan'] {
  if (!r || !isObj(r.plan)) return null
  const p = r.plan
  const out: NonNullable<RemoteSnapshot['plan']> = {}
  if (isObj(p.path) && Array.isArray(p.path.completedDays)) {
    out.path = {
      completedDays: p.path.completedDays.filter((d): d is string => typeof d === 'string'),
      passedTests: numRecord(p.path.passedTests),
      currentDayId: str(p.path.currentDayId) ?? 'a1-day-01',
    }
  }
  if (typeof p.xp === 'number' && Number.isFinite(p.xp)) out.xp = p.xp
  if (typeof p.onboardedAt === 'number' && Number.isFinite(p.onboardedAt)) out.onboardedAt = p.onboardedAt
  if (isObj(p.diagnostic) && typeof p.diagnostic.at === 'number') {
    const d = p.diagnostic
    out.diagnostic = {
      at: d.at as number,
      level: isLevel(d.level) ? d.level : null,
      labelUz: str(d.labelUz) ?? '',
      confidence: num(d.confidence),
    }
  }
  // Nishonlar (yutuqlar) — `id` bo'yicha birlashma `mergeRemote`da bo'ladi.
  if (Array.isArray(p.badges)) {
    out.badges = p.badges
      .filter((b): b is Row => isObj(b) && typeof b.id === 'string')
      .map((b) => ({ id: String(b.id), titleUz: str(b.titleUz) ?? '', at: num(b.at) }))
  }
  // O'yin qatlami — `normalizeGame` har bir sonni chegaralaydi (serverdagi
  // jsonb tashqi ma'lumot: ishonchli holatga keltirilmasa `game.ts`ning
  // hisoblashlari buziladi).
  if (isObj(p.game)) out.game = normalizeGame(p.game as Partial<GameState>)
  return out
}

function attemptFromRow(r: Row): AttemptRecord | null {
  const id = str(r.id)
  const exerciseId = str(r.exercise_id)
  const at = time(r.created_at)
  if (!id || !exerciseId || at === null || !isSkill(r.skill) || !isLevel(r.level) || !isSource(r.source)) return null
  return {
    id,
    exerciseId,
    skill: r.skill,
    level: r.level,
    correct: r.correct === true,
    partial: num(r.partial_score),
    difficulty: num(r.difficulty, 1),
    secondsSpent: num(r.seconds_spent),
    source: r.source,
    answerGiven: str(r.answer_text) ?? '',
    at,
  }
}

function srsFromRow(r: Row): [string, SrsState] | null {
  const id = str(r.vocabulary_id)
  const dueAt = time(r.due_at)
  if (!id || dueAt === null) return null
  return [
    id,
    {
      learnedAt: time(r.learned_at),
      dueAt,
      intervalDays: num(r.interval_days),
      ease: num(r.ease, START_EASE),
      reps: num(r.reps),
      lapses: num(r.lapses),
      lastReviewedAt: time(r.updated_at),
    },
  ]
}

function activityFromRow(r: Row): DayActivity | null {
  const day = str(r.day)
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const skills: DayActivity['skills'] = {}
  for (const [k, v] of Object.entries(numRecord(r.skills))) if (isSkill(k)) skills[k] = v
  return {
    date: day,
    seconds: num(r.seconds),
    attempts: num(r.attempts),
    correct: num(r.correct),
    newWords: num(r.new_words),
    reviewedWords: num(r.reviewed_words),
    skills,
  }
}

function writingAnalysis(v: unknown): WritingAnalysis | null {
  if (!isObj(v) || !isObj(v.criteriaScores)) return null
  if (![v.errors, v.strengthsUz, v.weaknessesUz, v.suggestionsUz].every(Array.isArray)) return null
  return v as unknown as WritingAnalysis
}

function speakingAnalysis(v: unknown): SpeakingAnalysis | null {
  if (!isObj(v) || !Array.isArray(v.notesUz)) return null
  if (![v.fluency, v.lexis, v.grammar, v.length].every((x) => typeof x === 'number')) return null
  return v as unknown as SpeakingAnalysis
}

function writingFromRow(r: Row): WritingSubmission | null {
  const id = str(r.id)
  const taskId = str(r.task_id)
  const text = str(r.text)
  const at = time(r.created_at)
  if (!id || !taskId || text === null || at === null) return null
  return {
    id,
    taskId,
    text,
    wordCount: num(r.word_count),
    secondsSpent: num(r.seconds_spent),
    analysis: writingAnalysis(r.analysis),
    supersedesId: str(r.supersedes_id),
    createdAt: at,
  }
}

function speakingFromRow(r: Row): SpeakingSession | null {
  const id = str(r.id)
  const taskId = str(r.task_id)
  const at = time(r.created_at)
  if (!id || !taskId || at === null) return null
  const engine = r.transcription_engine === 'browser-speech' || r.transcription_engine === 'ai' ? r.transcription_engine : 'none'
  return {
    id,
    taskId,
    // Audio serverga hech qachon yuborilmaydi — bu qurilmada ham yo'q.
    audioBlobStored: false,
    durationSec: num(r.duration_sec),
    transcript: str(r.transcript),
    transcriptionEngine: engine,
    analysis: speakingAnalysis(r.analysis),
    textAnswer: str(r.text_answer),
    createdAt: at,
  }
}

function mockFromRow(r: Row): MockExamAttempt | null {
  const id = str(r.id)
  const examId = str(r.exam_id)
  const at = time(r.completed_at)
  if (!id || !examId || at === null || !Array.isArray(r.sections)) return null
  const sections = r.sections.filter(
    (s): s is MockExamAttempt['sections'][number] =>
      isObj(s) && typeof s.sectionId === 'string' && isCoreSkill(s.skill) && isObj(s.exerciseResults),
  )
  return {
    id,
    examId,
    sections,
    totalScore: r.total_score === null || r.total_score === undefined ? null : num(r.total_score),
    speakingAdvisory: str(r.speaking_advisory) ?? '',
    completedAt: at,
  }
}

const compact = <T,>(rows: readonly Row[], fn: (r: Row) => T | null): T[] =>
  rows.map(fn).filter((x): x is T => x !== null)

/** DB qatorlarini ilova tiplariga aylantirish (yaroqsiz qatorlar tashlab yuboriladi). */
export function rowsToSnapshot(rows: RemoteRows): RemoteSnapshot {
  const srs: Record<string, SrsState> = {}
  for (const [id, st] of compact(rows.vocabulary, srsFromRow)) srs[id] = st
  const activity: Record<string, DayActivity> = {}
  for (const a of compact(rows.activity, activityFromRow)) activity[a.date] = a
  const byTime = <T,>(list: T[], at: (x: T) => number) => list.sort((a, b) => at(a) - at(b))
  return {
    settings: settingsFromRow(rows.settings),
    plan: planFromRow(rows.plan),
    attempts: byTime(compact(rows.attempts, attemptFromRow), (a) => a.at),
    srs,
    activity,
    writing: byTime(compact(rows.writing, writingFromRow), (w) => w.createdAt),
    speaking: byTime(compact(rows.speaking, speakingFromRow), (s) => s.createdAt),
    mockAttempts: byTime(compact(rows.mocks, mockFromRow), (m) => m.completedAt),
    // Liga: o'sha haftadagi o'sha ligamız qatorlari (barcha a'zolar — RLSdagi
    // "read league mates" siyosati). Bo'sh bo'lsa `null` — eski snapshot
    // saqlanadi, son ixtir qilinmaydi.
    league: buildLeagueRead(rows),
    profileName: str(rows.profile?.display_name)?.slice(0, 60) ?? '',
  }
}

/**
 * O'qilgan qatorlardan liga tablasi. Biz hali bu haftani yubormagan bo'lsak
 * (`ownWeekly` bo'sh) — o'z ligamiz aniq EMAS, tablani o'qishning ma'nosi
 * yo'q: `null` qaytadi va eski snapshot saqlanadi (son ixtir qilinmaydi).
 */
function buildLeagueRead(rows: RemoteRows): RemoteSnapshot['league'] {
  const ownRows = (rows.ownWeekly ?? []).filter((r) => str(r.week_start) && str(r.league_id))
  if (ownRows.length === 0) return null
  const board = (rows.leagueRows ?? [])
    .map(leagueRowFromRow)
    .filter((x): x is { userId: string; name: string; xp: number } => x !== null)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, LEAGUE_BOARD_SIZE)
  if (board.length === 0) return null
  const latest = ownRows.reduce((a, b) => (String(b.week_start) > String(a.week_start) ? b : a))
  return {
    weekStart: String(latest.week_start),
    leagueId: leagueById(String(latest.league_id)).id,
    entries: board,
  }
}

export interface PullResult {
  ok: boolean
  snapshot: RemoteSnapshot | null
  reasonUz: string | null
}

/** Foydalanuvchining serverdagi ma'lumotini o'qish (RLS: faqat o'z qatorlari). */
export async function pullRemote(userId: string): Promise<PullResult> {
  if (!supabaseConfigured) return { ok: false, snapshot: null, reasonUz: 'Supabase sozlanmagan.' }
  if (networkStatus() === 'offline') return { ok: false, snapshot: null, reasonUz: 'Internet yo‘q.' }
  const sb = getSupabase()
  if (!sb) return { ok: false, snapshot: null, reasonUz: 'Supabase mijoziga ulanib bo‘lmadi.' }
  const { data: sess, error: authErr } = await sb.auth.getSession()
  // Boshqa foydalanuvchining sessiyasi bilan o'qilgan ma'lumot bu holatga aralashmasin.
  if (authErr || !sess.session || sess.session.user.id !== userId) {
    return { ok: false, snapshot: null, reasonUz: 'Tizimga kirilmagan.' }
  }
  const failRead: PullResult = { ok: false, snapshot: null, reasonUz: 'Serverdagi ma’lumotni o‘qib bo‘lmadi.' }
  try {
    const own = (table: string) => sb.from(table).select('*').eq('user_id', userId)
    const [settings, plan, attempts, vocabulary, activity, writing, speaking, mocks, profile, ownWeekly] = await Promise.all([
      own('user_settings').maybeSingle(),
      own('learning_plans').order('updated_at', { ascending: false }).limit(1),
      own('exercise_attempts').order('created_at', { ascending: false }).limit(500),
      own('user_vocabulary'),
      own('daily_activity').order('day', { ascending: false }).limit(400),
      own('writing_submissions').order('created_at', { ascending: false }).limit(100),
      own('speaking_sessions').order('created_at', { ascending: false }).limit(100),
      own('mock_exam_attempts').order('completed_at', { ascending: false }).limit(20),
      // Profil nomi — liga tablasida o'z ismimiz ko'rinishi uchun (RLS: o'z qatori).
      sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
      // O'z haftalik XP qatorlarimiz — qaysi hafta/lichamizni shundan bilamiz.
      own('weekly_xp').order('week_start', { ascending: false }).limit(2),
    ])
    if ([settings, plan, attempts, vocabulary, activity, writing, speaking, mocks].some((r) => r.error)) return failRead
    const list = (v: unknown): Row[] => (Array.isArray(v) ? v.filter(isObj) : [])
    const ownWeeklyRows = list(ownWeekly.data)
    // Liga tablasini o'qish IKKINCHI QADAM: hafta va liga id'si yuqoridagi
    // o'qishdan keladi (boshqa qurilmada yuborilgan hafta ham shu yerda).
    // So'rov xato bo'lsa — `leagueRows` bo'sh qoladi: snapshotning eski qiymati
    // saqlanadi,.son ixtir QILINMAYDI (hisobda "ko'rsatilgan holat" ko'rinadi).
    let leagueRows: Row[] = []
    if (ownWeeklyRows.length > 0 && !ownWeekly.error) {
      const latest = ownWeeklyRows.reduce((a, b) => (String(b.week_start) > String(a.week_start) ? b : a))
      if (typeof latest.week_start === 'string' && typeof latest.league_id === 'string') {
        const board = await sb
          .from('weekly_xp')
          .select('*')
          .eq('week_start', latest.week_start)
          .eq('league_id', latest.league_id)
          .order('xp', { ascending: false })
          .limit(LEAGUE_BOARD_SIZE)
        leagueRows = board.error ? [] : list(board.data)
      }
    }
    return {
      ok: true,
      reasonUz: null,
      snapshot: rowsToSnapshot({
        settings: isObj(settings.data) ? settings.data : null,
        plan: list(plan.data)[0] ?? null,
        attempts: list(attempts.data),
        vocabulary: list(vocabulary.data),
        activity: list(activity.data),
        writing: list(writing.data),
        speaking: list(speaking.data),
        mocks: list(mocks.data),
        profile: isObj(profile.data) ? profile.data : null,
        leagueRows,
        ownWeekly: ownWeeklyRows,
      }),
    }
  } catch {
    return failRead
  }
}

/**
 * Profil nomi — snapshotdan. `mergeRemote` bu maydonni birlashtirmaydi (u
 * faqat serverdan o'qiladi, qurilmada o'zgartirilmaydi), shuning uchun
 * alohida funksiya: bo'sh satr bo'lsa lokal qiymat saqlanadi.
 */
export function profileNameFromSnapshot(snap: RemoteSnapshot): string {
  return snap.profileName ?? ''
}
