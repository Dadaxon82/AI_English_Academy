/**
 * ADDIE — EVALUATION: formativ va summativ tahlil (sof funksiyalar).
 *
 *  - Xato toifalari (formativ): har noto'g'ri urinish mashqning birinchi
 *    tegi (`tags[0]`, masalan "a an", "plural") yoki turi bo'yicha guruhlanadi.
 *    Keyinroq TO'G'RI yechilgan mashq hisobdan chiqadi (`unresolvedMistakes`
 *    qoidasi bilan bir xil) — faqat hali hal qilinmagan muammolar ko'rsatiladi.
 *  - O'zlashtirish: har ko'nikma bo'yicha oxirgi urinishlar aniqligi.
 *  - O'qish tezligi: faol kunlar, kuniga mashqlar, daqiqalar, aniqlik
 *    tendensiyasi (oxirgi 7 kun va undan oldingi 7 kun).
 *
 * Hech bir son o'ylab topilmaydi: dalil yetarli bo'lmasa `null` / `none`.
 */
import { baseExerciseId } from '../content/remix'
import type { Exercise, Skill } from '../content/types'
import type { AttemptRecord, DayActivity } from './types'

const DAY_MS = 86_400_000

export interface ErrorCategory {
  /** `skill:teg` — barqaror kalit. */
  key: string
  skill: Skill
  /** Teg yoki mashq turi (inglizcha, masalan "a an", "present perfect"). */
  topic: string
  /** Hal qilinmagan mashqlar soni shu toifada. */
  open: number
  /** Shu toifadagi barcha noto'g'ri urinishlar (oyna ichida). */
  wrong: number
  lastAt: number
  /** Toifadagi hal qilinmagan mashqlar (asl ID). */
  exerciseIds: string[]
}

/** Mashqning toifa mavzusi: birinchi teg, bo'lmasa mashq turi. */
export function topicOf(ex: Exercise): string {
  const t = ex.tags?.find((x) => x.trim().length > 0)
  return (t ?? ex.kind).trim().toLowerCase()
}

/**
 * Xato toifalari — eng muhimi birinchi (hal qilinmaganlar soni, keyin yangiligi).
 * `windowDays` — qancha kun orqaga qaraladi (standart 60).
 */
export function errorCategories(
  attempts: readonly AttemptRecord[],
  find: (id: string) => Exercise | undefined,
  now: number = Date.now(),
  windowDays = 60,
): ErrorCategory[] {
  const since = now - windowDays * DAY_MS
  // Har asl mashqning OXIRGI urinishi — hal qilinganmi.
  const last = new Map<string, AttemptRecord>()
  for (const a of attempts) {
    const id = baseExerciseId(a.exerciseId)
    const prev = last.get(id)
    if (!prev || a.at >= prev.at) last.set(id, a)
  }
  const cats = new Map<string, ErrorCategory>()
  for (const a of attempts) {
    if (a.correct || a.at < since) continue
    const id = baseExerciseId(a.exerciseId)
    const ex = find(id) ?? find(a.exerciseId)
    if (!ex) continue
    const topic = topicOf(ex)
    const key = `${ex.skill}:${topic}`
    const c = cats.get(key) ?? { key, skill: ex.skill, topic, open: 0, wrong: 0, lastAt: 0, exerciseIds: [] }
    c.wrong += 1
    c.lastAt = Math.max(c.lastAt, a.at)
    const resolved = last.get(id)?.correct === true
    if (!resolved && !c.exerciseIds.includes(id)) {
      c.exerciseIds.push(id)
      c.open += 1
    }
    cats.set(key, c)
  }
  return [...cats.values()].filter((c) => c.open > 0).sort((a, b) => b.open - a.open || b.wrong - a.wrong || b.lastAt - a.lastAt)
}

export interface SkillMastery {
  skill: Skill
  /** Oxirgi `sample` ta urinish aniqligi (0..100); dalil yo'q bo'lsa null. */
  accuracy: number | null
  count: number
}

const ALL_SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking']

/** Har ko'nikma bo'yicha o'zlashtirish (oxirgi `sample` ta urinish; qisman javob ham hisobga olinadi). */
export function skillMastery(attempts: readonly AttemptRecord[], sample = 40): SkillMastery[] {
  return ALL_SKILLS.map((skill) => {
    const xs = attempts.filter((a) => a.skill === skill).slice(-sample)
    if (xs.length === 0) return { skill, accuracy: null, count: 0 }
    const pts = xs.reduce((s, a) => s + (a.correct ? 1 : Math.max(0, Math.min(1, a.partial))), 0)
    return { skill, accuracy: Math.round((pts / xs.length) * 100), count: xs.length }
  })
}

export interface VelocityReport {
  /** Oxirgi 7 / 28 kunda faol bo'lgan kunlar. */
  activeDays7: number
  activeDays28: number
  /** Oxirgi 7 kundagi mashqlar va o'rtacha kunlik daqiqa (faol kunlar bo'yicha). */
  attempts7: number
  minutesPerActiveDay7: number | null
  /** Aniqlik (%) — oxirgi 7 kun va undan oldingi 7 kun; urinish bo'lmasa null. */
  accuracy7: number | null
  accuracyPrev7: number | null
  trend: 'up' | 'down' | 'flat' | 'none'
  /** Yakunlangan kunlar va haftasiga o'rtacha (birinchi urinishdan beri). */
  completedDays: number
  daysPerWeek: number | null
  /** Joriy darajaning qolgan kunlarini shu sur'atda tugatish uchun taxminiy hafta (sur'at yo'q bo'lsa null). */
  weeksToFinishLevel: number | null
}

function accuracyOf(xs: readonly AttemptRecord[]): number | null {
  if (xs.length === 0) return null
  return Math.round((xs.filter((a) => a.correct).length / xs.length) * 100)
}

export function velocityReport(input: {
  attempts: readonly AttemptRecord[]
  activity: Readonly<Record<string, DayActivity>>
  completedDays: readonly string[]
  /** Joriy darajada hali tugallanmagan kunlar soni. */
  levelDaysLeft: number
  now?: number
}): VelocityReport {
  const now = input.now ?? Date.now()
  const days = Object.values(input.activity)
  const dayTime = (d: DayActivity) => new Date(`${d.date}T12:00:00`).getTime()
  const inLast = (n: number) => days.filter((d) => d.seconds > 0 && now - dayTime(d) < n * DAY_MS)
  const act7 = inLast(7)
  const a7 = input.attempts.filter((a) => now - a.at < 7 * DAY_MS)
  const aPrev = input.attempts.filter((a) => now - a.at >= 7 * DAY_MS && now - a.at < 14 * DAY_MS)
  const acc7 = accuracyOf(a7)
  const accPrev = accuracyOf(aPrev)
  const trend: VelocityReport['trend'] =
    acc7 === null || accPrev === null ? 'none' : acc7 - accPrev >= 5 ? 'up' : accPrev - acc7 >= 5 ? 'down' : 'flat'
  const first = input.attempts.reduce((m, a) => Math.min(m, a.at), Number.POSITIVE_INFINITY)
  const weeks = Number.isFinite(first) ? Math.max(1, (now - first) / (7 * DAY_MS)) : null
  const completed = input.completedDays.length
  const perWeek = weeks !== null && completed > 0 ? Math.round((completed / weeks) * 10) / 10 : null
  return {
    activeDays7: act7.length,
    activeDays28: inLast(28).length,
    attempts7: a7.length,
    minutesPerActiveDay7: act7.length ? Math.round(act7.reduce((s, d) => s + d.seconds, 0) / 60 / act7.length) : null,
    accuracy7: acc7,
    accuracyPrev7: accPrev,
    trend,
    completedDays: completed,
    daysPerWeek: perWeek,
    weeksToFinishLevel: perWeek && perWeek > 0 ? Math.ceil(input.levelDaysLeft / perWeek) : null,
  }
}
