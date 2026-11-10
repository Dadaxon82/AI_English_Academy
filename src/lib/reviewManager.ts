/**
 * TAKRORLASH MENEJERI — tuzatilmagan xatolar va muddati kelgan so'zlar
 * BITTA navbatda (g'oya: Babbel «Review Manager»; mexanika bizniki).
 *
 * Qoidalar (sof funksiyalar, testlar `src/test/review-manager.test.ts`):
 *  - Manbalar: `unresolvedMistakes()` (oxirgi urinishi noto'g'ri mashqlar) va
 *    SRS bo'yicha muddati kelgan so'zlar.
 *  - BIR XATO IKKI MARTA SANALMAYDI: so'z bilan bog'liq xato (`vocab-quiz-`,
 *    `vocab-pic-`, `vocab-sent-…`) va o'sha so'zning SRS takrori bitta qadam
 *    bo'ladi — xato mashqi beriladi, javob esa SRS bahosiga ham yoziladi.
 *  - Tartib: xato va so'z navbatma-navbat (bir turdagi ketma-ket uzun zanjir
 *    bo'lmasin), xatolar eng yangisidan, so'zlar SRS tartibida
 *    (`sortForReview` — xato qilinganlar birinchi).
 *  - Ko'pi bilan [REVIEW_MAX] qadam.
 */

import { VOCAB_PIC_PREFIX, VOCAB_QUIZ_PREFIX, VOCAB_SENT_PREFIX } from '../content'
import type { Exercise, VocabularyItem } from '../content/types'
import type { LessonStep } from './lessons'
import type { Mistake } from './mistakes'
import { isDue, sortForReview, type SrsState } from './srs'

/** Bitta sessiyadagi eng ko'p qadam. */
export const REVIEW_MAX = 12

/** Mashq id'si so'z bilan bog'liq bo'lsa — o'sha so'z id'si, aks holda null. */
export function vocabIdOfExercise(id: string): string | null {
  if (id.startsWith(VOCAB_QUIZ_PREFIX)) return id.slice(VOCAB_QUIZ_PREFIX.length) || null
  if (id.startsWith(VOCAB_PIC_PREFIX)) return id.slice(VOCAB_PIC_PREFIX.length) || null
  if (id.startsWith(VOCAB_SENT_PREFIX)) {
    const rest = id.slice(VOCAB_SENT_PREFIX.length)
    return /^(en|uz)-/.test(rest) ? rest.slice(3) || null : null
  }
  return null
}

export interface ReviewPlan {
  steps: LessonStep[]
  /** Navbatdagi xatolar soni (so'z bilan birlashganlari ham shu yerda). */
  mistakes: number
  /** Faqat SRS'dan kelgan so'zlar soni (xato bilan birlashmaganlar). */
  words: number
}

/**
 * Navbatni tuzadi. `makeWordExercise` — muddati kelgan so'z uchun mashq
 * (sahifa variantlarni havuzdan yasaydi; test soxta funksiya beradi).
 */
export function buildReviewPlan(
  mistakes: readonly Mistake[],
  srs: Readonly<Record<string, SrsState>>,
  vocab: readonly VocabularyItem[],
  now: number,
  makeWordExercise: (v: VocabularyItem) => Exercise,
  max: number = REVIEW_MAX,
): ReviewPlan {
  const mistakeSteps: LessonStep[] = []
  const coveredWords = new Set<string>()
  const vocabById = new Map(vocab.map((v) => [v.id, v]))
  mistakes.forEach((m, i) => {
    const vid = vocabIdOfExercise(m.exercise.id)
    if (vid) coveredWords.add(vid)
    // Lug'at savoli id'dan tiklanganda faqat to'g'ri javobni oladi (variant yo'q) —
    // shu so'z uchun to'liq variantli savol qayta yasaladi (id o'zgarmaydi).
    const word = vid && m.exercise.id.startsWith(VOCAB_QUIZ_PREFIX) ? vocabById.get(vid) : undefined
    mistakeSteps.push({
      type: 'exercise',
      id: `review:${m.exercise.id}#${i}`,
      exercise: word ? makeWordExercise(word) : m.exercise,
      badge: m.wrongCount >= 2 ? `${m.wrongCount} marta xato qilingan` : 'Xatoni tuzatamiz',
      badgeTone: 'fix',
      vocabIds: vid ? [vid] : undefined,
    })
  })

  const seen = new Set<string>()
  const dueWords = sortForReview(
    vocab.flatMap((v) => {
      if (seen.has(v.id) || coveredWords.has(v.id)) return []
      seen.add(v.id)
      const st = srs[v.id]
      return st && isDue(st, now) ? [{ state: st, item: v }] : []
    }),
  )
  const wordSteps: LessonStep[] = dueWords.map((v, i) => ({
    type: 'exercise',
    id: `review:word:${v.id}#${i}`,
    exercise: makeWordExercise(v),
    badge: 'Söz takrori',
    badgeTone: 'new',
    vocabIds: [v.id],
  }))

  // Navbatma-navbat: xato, so'z, xato, so'z… (biri tugasa qolgani ketma-ket).
  const steps: LessonStep[] = []
  let mi = 0
  let wi = 0
  while (steps.length < Math.max(0, max) && (mi < mistakeSteps.length || wi < wordSteps.length)) {
    const takeMistake = mi < mistakeSteps.length && (wi >= wordSteps.length || steps.length % 2 === 0)
    steps.push(takeMistake ? mistakeSteps[mi++]! : wordSteps[wi++]!)
  }
  return { steps, mistakes: mi, words: wi }
}
