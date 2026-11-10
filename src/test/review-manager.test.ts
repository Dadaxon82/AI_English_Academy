/**
 * Takrorlash menejeri — xatolar + muddati kelgan so'zlar bitta navbatda.
 */
import { describe, expect, it } from 'vitest'
import { getBundle, vocabQuizExercise } from '../content'
import type { Exercise } from '../content/types'
import type { Mistake } from '../lib/mistakes'
import { REVIEW_MAX, buildReviewPlan, vocabIdOfExercise } from '../lib/reviewManager'
import { initialSrsState, review, type SrsState } from '../lib/srs'

const b = getBundle('A1')
const vocab = b.vocab
const grammarEx: Exercise[] = b.grammar.flatMap((g) => g.exercises)
const T0 = Date.UTC(2026, 10, 9, 9)
const DAY = 86_400_000

function due(lapses = 0, at = T0 - 1): SrsState {
  return { ...review(initialSrsState(T0 - 5 * DAY), 'good', T0 - 5 * DAY), dueAt: at, lapses }
}
function mistake(ex: Exercise, wrongCount = 1, lastAt = T0): Mistake {
  return { exercise: ex, wrongCount, lastAt, lastGiven: '' }
}
const word = (v: (typeof vocab)[number]) => vocabQuizExercise(v)

describe('vocabIdOfExercise', () => {
  it('so‘z mashqlaridan so‘z id’sini oladi, boshqalarda null', () => {
    expect(vocabIdOfExercise('vocab-quiz-a1-v-hello')).toBe('a1-v-hello')
    expect(vocabIdOfExercise('vocab-pic-a1-v-hello')).toBe('a1-v-hello')
    expect(vocabIdOfExercise('vocab-sent-en-a1-v-hello')).toBe('a1-v-hello')
    expect(vocabIdOfExercise('vocab-sent-uz-a1-v-hello')).toBe('a1-v-hello')
    expect(vocabIdOfExercise('a1-g1-ex1')).toBeNull()
    expect(vocabIdOfExercise('dlg-a1-d5-cafe-1')).toBeNull()
  })
})

describe('buildReviewPlan', () => {
  it('xato va so‘z navbatma-navbat; so‘zlar SRS tartibida (xato qilingan birinchi)', () => {
    const [v1, v2] = vocab
    const srs = { [v1!.id]: due(0, T0 - 100), [v2!.id]: due(2, T0 - 10) }
    const plan = buildReviewPlan([mistake(grammarEx[0]!), mistake(grammarEx[1]!)], srs, vocab, T0, word)
    expect(plan.steps.map((s) => (s.type === 'exercise' ? s.exercise.id : ''))).toEqual([
      grammarEx[0]!.id,
      `vocab-quiz-${v2!.id}`,
      grammarEx[1]!.id,
      `vocab-quiz-${v1!.id}`,
    ])
    expect(plan.mistakes).toBe(2)
    expect(plan.words).toBe(2)
    // So'z qadamlari SRS bahosi uchun so'z id'sini olib yuradi.
    const s1 = plan.steps[1]!
    expect(s1.type === 'exercise' && s1.vocabIds).toEqual([v2!.id])
  })

  it('BIR XATO IKKI MARTA SANALMAYDI: so‘z xatosi va o‘sha so‘zning takrori — bitta qadam', () => {
    const v = vocab[0]!
    const plan = buildReviewPlan([mistake(vocabQuizExercise(v))], { [v.id]: due() }, vocab, T0, word)
    expect(plan.steps).toHaveLength(1)
    expect(plan.mistakes).toBe(1)
    expect(plan.words).toBe(0)
    const s = plan.steps[0]!
    expect(s.type === 'exercise' && s.vocabIds).toEqual([v.id])
    // Id'dan tiklangan savolda variant yo'q edi — to'liq savol qayta yasaladi (id o'sha).
    const full = buildReviewPlan([mistake(vocabQuizExercise(v))], {}, vocab, T0, (x) => vocabQuizExercise(x, ['a', x.translationUz, 'b']))
    const f = full.steps[0]!
    expect(f.type === 'exercise' && f.exercise.id).toBe(`vocab-quiz-${v.id}`)
    expect(f.type === 'exercise' && f.exercise.kind === 'multiple-choice' && f.exercise.options).toHaveLength(3)
  })

  it('muddati kelmagan so‘z va SRS’da yo‘q so‘z kirmaydi; havuzdagi takror bitta', () => {
    const [v1, v2] = vocab
    const plan = buildReviewPlan([], { [v1!.id]: due(0, T0 + DAY) }, [v1!, v2!, v2!], T0, word)
    expect(plan.steps).toEqual([])
  })

  it('ko‘pi bilan REVIEW_MAX qadam; biri tugasa qolgani ketma-ket', () => {
    const many = grammarEx.slice(0, 20).map((e) => mistake(e))
    expect(buildReviewPlan(many, {}, vocab, T0, word).steps).toHaveLength(REVIEW_MAX)
    const srs = Object.fromEntries(vocab.slice(0, 3).map((v) => [v.id, due()]))
    const plan = buildReviewPlan([], srs, vocab, T0, word)
    expect(plan.steps).toHaveLength(3)
    expect(plan.steps.every((s) => s.type === 'exercise' && s.badge === 'So‘z takrori')).toBe(true)
  })

  it('bo‘sh holat — bo‘sh navbat', () => {
    expect(buildReviewPlan([], {}, vocab, T0, word)).toEqual({ steps: [], mistakes: 0, words: 0 })
  })
})
