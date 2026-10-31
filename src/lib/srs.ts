/**
 * Spaced repetition (SM-2 asosida soddalashtirilgan).
 *
 * Qoidalar:
 *  - "Bilaman" / "Qayta mashq qilish" tugmalari shu hisobga asoslanadi.
 *  - Takrorlangan so'z statistikada IKKI marta hisoblanmaydi — `reps` bu
 *    takrorlashlar soni, `learned` esa bir marta o'rnatiladi.
 */

export type SrsGrade = 'again' | 'hard' | 'good' | 'easy'

export interface SrsState {
  /** So'z birinchi marta o'zlashtirilgan vaqt (null = hali o'zlashtirilmagan) */
  learnedAt: number | null
  /** Keyingi takrorlash vaqti */
  dueAt: number
  /** Interval kunlarda (SM-2 `interval`) */
  intervalDays: number
  /** Qiyinlik omili (SM-2 ease factor), 1.3..3.0 */
  ease: number
  /** Jami takrorlashlar — hisobga bir marta olinadi */
  reps: number
  /** Ketma-ket xato qilishlar */
  lapses: number
  lastReviewedAt: number | null
}

export const MIN_EASE = 1.3
export const START_EASE = 2.5
const DAY_MS = 24 * 60 * 60 * 1000

export function initialSrsState(now: number = Date.now()): SrsState {
  return {
    learnedAt: null,
    dueAt: now,
    intervalDays: 0,
    ease: START_EASE,
    reps: 0,
    lapses: 0,
    lastReviewedAt: null,
  }
}

/** SM-2 quality: 0..5. Bizning 4 gradamiz shu yerga moslashtiriladi. */
function toQuality(grade: SrsGrade): number {
  switch (grade) {
    case 'again':
      return 1
    case 'hard':
      return 3
    case 'good':
      return 4
    case 'easy':
      return 5
  }
}

export function review(state: SrsState, grade: SrsGrade, now: number = Date.now()): SrsState {
  const q = toQuality(grade)
  const ease = Math.max(MIN_EASE, state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  if (q < 3) {
    // Xato: interval boshlanadi, lekin `learnedAt` tozalanmaydi — so'z
    // "o'zlashtirilgan" ro'yxatida qoladi, faqat qayta takrorlashga tushadi.
    return {
      ...state,
      ease,
      intervalDays: 0,
      dueAt: now + 10 * 60 * 1000, // 10 daqiqadan keyin qayta
      reps: state.reps + 1,
      lapses: state.lapses + 1,
      lastReviewedAt: now,
      learnedAt: state.learnedAt,
    }
  }

  const intervalDays =
    state.reps === 0 ? (grade === 'easy' ? 3 : 1) : Math.max(1, Math.round(state.intervalDays * ease))

  return {
    // `learnedAt` birinchi marta o'rnatiladi va keyin o'zgarmaydi.
    learnedAt: state.learnedAt ?? now,
    dueAt: now + intervalDays * DAY_MS,
    intervalDays,
    ease,
    reps: state.reps + 1,
    lapses: state.lapses,
    lastReviewedAt: now,
  }
}

export function isDue(state: SrsState, now: number = Date.now()): boolean {
  return state.dueAt <= now
}

/** Statistikada sanash: har bir so'z BIR marta hisoblanadi. */
export function countLearned(states: readonly SrsState[]): number {
  return states.filter((s) => s.learnedAt !== null).length
}

export function countDue(states: readonly SrsState[], now: number = Date.now()): number {
  return states.filter((s) => isDue(s, now)).length
}

/** Xato qilingan so'zlar ustuvor takrorlanadi. */
export function sortForReview<T>(entries: readonly { state: SrsState; item: T }[]): T[] {
  return [...entries]
    .sort((a, b) => {
      const aLapse = a.state.lapses > 0 ? 0 : 1
      const bLapse = b.state.lapses > 0 ? 0 : 1
      if (aLapse !== bLapse) return aLapse - bLapse
      return a.state.dueAt - b.state.dueAt
    })
    .map((e) => e.item)
}
