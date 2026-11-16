/**
 * ADDIE — ANALYSIS + DESIGN: shaxsiy moslashuvchan reja (Adaptive Path Engine).
 *
 * Kirish — o'quvchining HAQIQIY ma'lumoti: urinishlar, xato toifalari,
 * takrorlanadigan so'zlar, yozish/gapirish tarixi, o'quv yo'li holati.
 * Chiqish:
 *  - zaif ko'nikmalar (dalili yetarli bo'lganlari);
 *  - diqqat markazidagi xato mavzulari (`evaluation.ts::errorCategories`);
 *  - maqsadli qiyinlik 1..5 (oxirgi natijalarga qarab ko'tariladi/tushadi);
 *  - bugungi tavsiyalar — har biri SABABI bilan, ustuvorlik tartibida;
 *  - moslashuvchan mashq: zaif mavzular bo'yicha HALI YECHILMAGAN yangi
 *    mashqlar, qiyinligi maqsadga eng yaqin (`buildAdaptiveDrill`).
 *
 * Sof funksiyalar — testlar `src/test/adaptive.test.ts`.
 */
import { baseExerciseId } from '../content/remix'
import type { CefrLevel, Exercise, Skill } from '../content/types'
import { errorCategories, skillMastery, topicOf, type ErrorCategory, type SkillMastery } from './evaluation'
import { skillLabelUz } from './planning'
import type { AttemptRecord } from './types'

const DAY_MS = 86_400_000

/** Zaif ko'nikma chegarasi (%) va kerakli minimal dalil. */
export const WEAK_ACCURACY = 70
export const WEAK_MIN_ATTEMPTS = 5
/** Qiyinlik moslashuvi: oxirgi N urinish; shu aniqlikdan yuqori — ko'tariladi, pastida — tushadi. */
export const DIFFICULTY_WINDOW = 20
export const RAISE_AT = 85
export const LOWER_AT = 60

export interface AdaptiveAction {
  id: 'mistakes' | 'focus' | 'weak-skill' | 'review-words' | 'next-lesson' | 'writing' | 'speaking' | 'level-exam'
  titleUz: string
  reasonUz: string
  /** Ilova ichidagi manzil. */
  to: string
}

export interface AdaptivePlan {
  level: CefrLevel
  targetDifficulty: number
  difficultyReasonUz: string
  weakSkills: SkillMastery[]
  focus: ErrorCategory[]
  actions: AdaptiveAction[]
}

const SKILL_ROUTE: Record<Skill, string> = {
  vocabulary: '/vocabulary',
  grammar: '/grammar',
  reading: '/reading',
  listening: '/listening',
  writing: '/writing',
  speaking: '/speaking',
}

/** Maqsadli qiyinlik: oxirgi urinishlar aniqligi va ularning o'rtacha qiyinligi asosida. */
export function targetDifficulty(attempts: readonly AttemptRecord[]): { value: number; reasonUz: string } {
  const xs = attempts.slice(-DIFFICULTY_WINDOW)
  if (xs.length < 5) return { value: 1, reasonUz: 'Natijalar hali kam — eng oson darajadan boşlaymiz.' }
  const acc = Math.round((xs.filter((a) => a.correct).length / xs.length) * 100)
  const avg = xs.reduce((s, a) => s + (Number.isFinite(a.difficulty) ? a.difficulty : 1), 0) / xs.length
  const base = Math.max(1, Math.min(5, Math.round(avg)))
  if (acc >= RAISE_AT && base < 5) return { value: base + 1, reasonUz: `Oxirgi ${xs.length} ta javobda ${acc}% töğri — qiyinlik oşirildi.` }
  if (acc < LOWER_AT && base > 1) return { value: base - 1, reasonUz: `Oxirgi ${xs.length} ta javobda ${acc}% töğri — qiyinlik pasaytirildi.` }
  return { value: base, reasonUz: `Oxirgi ${xs.length} ta javobda ${acc}% töğri — qiyinlik şu darajada qoladi.` }
}

export interface AdaptiveInput {
  level: CefrLevel
  attempts: readonly AttemptRecord[]
  find: (id: string) => Exercise | undefined
  /** Takrorlash muddati kelgan so'zlar soni. */
  dueWords: number
  /** O'quv yo'lidagi keyingi kun (bo'lsa). */
  nextDay: { dayNumber: number; titleUz: string } | null
  lastWritingAt: number | null
  lastSpeakingAt: number | null
  /** Joriy darajaning 7 kuni tugagan, daraja imtihoni hali topshirilmagan. */
  levelExamReady: boolean
  now?: number
}

export function buildAdaptivePlan(input: AdaptiveInput): AdaptivePlan {
  const now = input.now ?? Date.now()
  const cats = errorCategories(input.attempts, input.find, now)
  const focus = cats.slice(0, 3)
  const weakSkills = skillMastery(input.attempts)
    .filter((m) => m.accuracy !== null && m.count >= WEAK_MIN_ATTEMPTS && m.accuracy < WEAK_ACCURACY)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
  const diff = targetDifficulty(input.attempts)
  const openMistakes = cats.reduce((s, c) => s + c.open, 0)

  const actions: AdaptiveAction[] = []
  if (input.levelExamReady) {
    actions.push({
      id: 'level-exam',
      titleUz: `${input.level} daraja imtihoni`,
      reasonUz: `${input.level} ning 7 kuni yakunlangan — darajani imtihon bilan tasdiqlang.`,
      to: '/progress#level-exam',
    })
  }
  if (focus.length > 0) {
    const top = focus[0]!
    actions.push({
      id: 'focus',
      titleUz: `Moslaşuvçan maşq: “${top.topic}”`,
      reasonUz: `${skillLabelUz(top.skill)} böyiça “${top.topic}” mavzusida ${top.open} ta hal qilinmagan xato bor.`,
      to: '/progress#adaptive',
    })
  }
  if (openMistakes >= 3) {
    actions.push({ id: 'mistakes', titleUz: 'Xatolar ustida iş', reasonUz: `${openMistakes} ta mashq hali töğri yeçilmagan.`, to: '/errors' })
  }
  const weakest = weakSkills[0]
  if (weakest) {
    actions.push({
      id: 'weak-skill',
      titleUz: `${skillLabelUz(weakest.skill)} maşqi`,
      reasonUz: `Oxirgi ${weakest.count} ta javobda aniqlik ${weakest.accuracy}% — boşqa könikmalardan past.`,
      to: SKILL_ROUTE[weakest.skill],
    })
  }
  if (input.dueWords > 0) {
    actions.push({ id: 'review-words', titleUz: 'Sözlarni takrorlaş', reasonUz: `${input.dueWords} ta söz takrorlaş vaqtiga yetgan.`, to: '/vocabulary' })
  }
  if (input.nextDay) {
    actions.push({
      id: 'next-lesson',
      titleUz: `${input.nextDay.dayNumber}-kun: ${input.nextDay.titleUz}`,
      reasonUz: 'Öquv yölidagi navbatdagi dars.',
      to: '/path',
    })
  }
  const stale = (t: number | null) => t === null || now - t > 7 * DAY_MS
  if (stale(input.lastWritingAt)) {
    actions.push({ id: 'writing', titleUz: 'Yoziş topşiriği', reasonUz: input.lastWritingAt === null ? 'Hali birorta yozma iş topşirilmagan.' : 'Oxirgi yozma iş bir haftadan oldin bölgan.', to: '/writing' })
  }
  if (stale(input.lastSpeakingAt)) {
    actions.push({ id: 'speaking', titleUz: 'Gapiriş maşqi', reasonUz: input.lastSpeakingAt === null ? 'Hali gapiriş maşqi bajarilmagan.' : 'Oxirgi gapiriş maşqi bir haftadan oldin bölgan.', to: '/speaking' })
  }

  return {
    level: input.level,
    targetDifficulty: diff.value,
    difficultyReasonUz: diff.reasonUz,
    weakSkills,
    focus,
    actions: actions.slice(0, 5),
  }
}

/**
 * Moslashuvchan mashq: diqqat mavzulari (bo'lmasa zaif ko'nikmalar) bo'yicha
 * hali TO'G'RI YECHILMAGAN mashqlar; qiyinligi maqsadga eng yaqinlari birinchi.
 * Matnga bog'liq (passageId) mashqlar olinmaydi — mashq o'z-o'zidan tushunarli bo'lsin.
 */
export function buildAdaptiveDrill(
  pool: readonly Exercise[],
  plan: Pick<AdaptivePlan, 'focus' | 'weakSkills' | 'targetDifficulty'>,
  attempts: readonly AttemptRecord[],
  max = 8,
): Exercise[] {
  const solved = new Set(attempts.filter((a) => a.correct).map((a) => baseExerciseId(a.exerciseId)))
  const focusIds = new Set(plan.focus.flatMap((c) => c.exerciseIds))
  const topics = new Set(plan.focus.map((c) => `${c.skill}:${c.topic}`))
  const weak = new Set(plan.weakSkills.map((w) => w.skill))
  const usable = pool.filter((e) => !('passageId' in e && e.passageId) && !solved.has(e.id) && !focusIds.has(e.id))
  const byTopic = usable.filter((e) => topics.has(`${e.skill}:${topicOf(e)}`))
  const bySkill = usable.filter((e) => weak.has(e.skill) && !byTopic.includes(e))
  const near = (xs: Exercise[]) => [...xs].sort((a, b) => Math.abs(a.difficulty - plan.targetDifficulty) - Math.abs(b.difficulty - plan.targetDifficulty) || a.id.localeCompare(b.id))
  return [...near(byTopic), ...near(bySkill)].slice(0, max)
}
