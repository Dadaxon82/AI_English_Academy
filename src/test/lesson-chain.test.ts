/**
 * Darslar ketma-ketligi (zanjir) testlari — mobildagi
 * `mobile/app/src/test/java/.../domain/LessonChainTest.kt` bilan BIR XIL
 * qoidalar tekshiriladi (ikki tomonlama sinxron: telefon va brauzerda bir
 * xil tartib chiqishi shart).
 */

import { describe, expect, it } from 'vitest'
import {
  buildChain,
  buildDayChains,
  ChainState,
  chainExerciseBudget,
  exerciseIdsForSection,
  lessonSequence,
  MIN_KIND_GAP,
  REINFORCE_EVERY,
  sequenceAudit,
  stepState,
  TEST_STEP,
} from '../lib/lessonChain'
import type { DailyPlanDay, DaySection, Exercise, SectionTest } from '../content/types'

const KINDS = ['multiple-choice', 'gap-fill', 'word-order', 'matching', 'translation'] as const

function day(over: Partial<DailyPlanDay> = {}): DailyPlanDay {
  return {
    id: 'a1-day-01',
    level: 'A1',
    dayNumber: 1,
    titleUz: 'Salomlashuv',
    goalUz: 'Tanishuv',
    sections: [
      { skill: 'vocabulary', minutes: 10, itemIds: ['w1', 'w2'], titleUz: 'Lug‘at' },
      { skill: 'grammar', minutes: 15, itemIds: ['g1'], titleUz: 'Grammatika' },
      { skill: 'reading', minutes: 15, itemIds: ['r1'], titleUz: "O'qish" },
      { skill: 'listening', minutes: 15, itemIds: ['l1'], titleUz: 'Tinglash' },
      { skill: 'writing', minutes: 20, itemIds: ['wr1'], titleUz: 'Yozish' },
      { skill: 'speaking', minutes: 15, itemIds: ['sp1'], titleUz: 'Gapirish' },
    ],
    ...over,
  }
}

/** `n` ta mashq idsi; turlar aylanib beriladi (`knownKind` shu jadvalni o'qiydi). */
function idsWithKinds(n: number, cycle: number = KINDS.length): { ids: string[]; kind: (id: string) => string } {
  const ids = Array.from({ length: n }, (_, i) => `ex-${i}`)
  const k = new Map(ids.map((id, i) => [id, KINDS[i % cycle]]))
  return { ids, kind: (id) => k.get(id) ?? '' }
}

describe('lessonSequence — DULO tur almashinuvi (matematika darsidan o‘lchangan qoida)', () => {
  it('bir xil tur qo‘shni kelmaydi (bizning talabimiz: MIN_KIND_GAP)', () => {
    const { ids, kind } = idsWithKinds(15, 10)
    // `reinforce=false` — mustahkamlash AYNAN shu mashqni qayta qo'yadi,
    // shuning uchun u "bir xil tur qo'shni" hisobiga kiradi. Mobildagi
    // `LessonChainTest.sameKindNeverAdjacent` ham shu holda
    // tekshiriladi.
    const out = lessonSequence(ids, kind, false)
    const audit = sequenceAudit(out, kind)
    expect(audit.sameNeighbours).toBe(0)
    expect(audit.minGap).toBeGreaterThanOrEqual(MIN_KIND_GAP)
  })

  it('turni bilinmagan mashq cheklovga kirmaydi — tartib saqlanadi', () => {
    const ids = ['a', 'b', 'c']
    const out = lessonSequence(ids, () => undefined)
    expect(out).toEqual(ids)
  })

  /**
   * DULO `math_lesson.json`da 15 mashq / 10 tur: ba'zi turlar 2 marta uchraydi.
   * Bizning rotatsiyamiz ham ularni imkon boricha ajratadi.
   */
  it('takrorlanuvchi turlar imkon boricha ajratiladi (DULO 15 turli darsidagi kabi)', () => {
    const ids = ['m1', 'd1', 'd2', 'f1', 't1', 'e1', 'e2', 'n1', 'b1', 's1', 'w1', 'p1', 'p2', 'p3', 'q1']
    const k = new Map<string, string>([
      ['m1', 'mathMatch'],
      ['d1', 'mathDecimalFill'],
      ['d2', 'mathDecimalFill'],
      ['f1', 'mathFractionFill'],
      ['t1', 'mathTypeFill'],
      ['e1', 'mathEstimateNumberLine'],
      ['e2', 'mathEstimateNumberLine'],
      ['n1', 'mathIntegerNumberLineFill'],
      ['b1', 'mathExpressionBuild'],
      ['s1', 'mathMultiSelect'],
      ['w1', 'mathWordProblemTokenDrag'],
      ['p1', 'mathProductSelect'],
      ['p2', 'mathProductSelect'],
      ['p3', 'mathProductSelect'],
      ['q1', 'mathWordProblem'],
    ])
    const out = lessonSequence(ids, (id) => k.get(id) ?? '', false)
    expect(out).toHaveLength(ids.length)
    expect(new Set(out).size).toBe(ids.length) // hech biri yo'qolmagan
    expect(out[0]).toBe('m1') // chiqish tartibida birinchi — birinchi nomzod
    // 3 ta `productSelect` qo'shni bo'lmaydi: eng qisqa masofa 2 ga teng yoki katta
    const gap = sequenceAudit(out, (id) => k.get(id) ?? '')
    expect(gap.sameNeighbours).toBe(0)
    expect(gap.minGap).toBeGreaterThanOrEqual(MIN_KIND_GAP)
  })

  it('bitta turli poolda hamma mashq saqlanadi (DULO “chess” darsi kabi — cheklov majburiy emas)', () => {
    const ids = ['x1', 'x2', 'x3', 'x4']
    const out = lessonSequence(ids, () => 'matching')
    expect(out).toHaveLength(ids.length)
    expect(new Set(out).size).toBe(ids.length)
  })

  it('bo‘sh ro‘yxat — bo‘sh javob (son ixtir qilinmaydi)', () => {
    expect(lessonSequence([], () => 'gap-fill')).toEqual([])
  })
})

describe('lessonSequence — mustahkamlash (check.ts qoidasi bilan birga ishlaydi)', () => {
  it('reinforce=true da qayta takrorlanadigan mashq qo‘shiladi, yangi id emas', () => {
    const { ids, kind } = idsWithKinds(13)
    const out = lessonSequence(ids, kind, true)
    expect(out.length).toBe(ids.length + Math.floor(13 / REINFORCE_EVERY))
    for (const id of out) expect(ids).toContain(id)
  })

  it('qisqa ro‘yxat shishmaydi (test havzasi kengaymaydi)', () => {
    const { ids, kind } = idsWithKinds(5)
    expect(lessonSequence(ids, kind, true)).toHaveLength(5)
  })

  it('test uchun reinforce=false — savollar takrorlanmaydi', () => {
    const { ids, kind } = idsWithKinds(13)
    const out = lessonSequence(ids, kind, false)
    expect(out).toHaveLength(13)
    expect(new Set(out).size).toBe(13)
  })
})

describe('buildChain — kun ichidagi bo‘limlar tartibi', () => {
  it('bo‘limlar ko‘rinadigan tartibda, test oxirida', () => {
    const t: SectionTest = {
      id: 'a1-test-01',
      level: 'A1',
      section: 'vocabulary',
      titleUz: 'Kun testi',
      passScore: 70,
      exercises: [{ id: 'q1' } as never],
    }
    const chain = buildChain(day({ sectionTest: t }), {
      vocabulary: ['vocab-quiz-w1', 'vocab-quiz-w2'],
      grammar: ['g1-x1'],
      reading: ['r1-x1'],
      listening: ['l1-x1'],
    })
    expect(chain.steps.map((s) => s.skill)).toEqual([
      'vocabulary',
      'grammar',
      'reading',
      'listening',
      'writing',
      'speaking',
      TEST_STEP,
    ])
    expect(chain.steps[chain.steps.length - 1].isTest).toBe(true)
    // `SectionTest`da daqiqa maydoni YO'Q — son ixtir qilinmaydi.
    expect(chain.steps[chain.steps.length - 1].minutes).toBe(0)
    expect(chain.steps.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('mashqi bo‘lmagan bo‘lim zanjirga kirmaydi, yozish/gapirish qoladi', () => {
    const chain = buildChain(day({ sections: [{ skill: 'grammar', minutes: 15, itemIds: ['g1'], titleUz: 'Grammatika' }, { skill: 'writing', minutes: 20, itemIds: ['wr1'], titleUz: 'Yozish' }] }), {})
    expect(chain.steps.map((s) => s.skill)).toEqual(['writing'])
  })

  it('kun qulfi: tugatilgan → done, joriy → current, boshqasi → locked', () => {
    const chains = buildDayChains(
      [day({ id: 'd1', dayNumber: 1 }), day({ id: 'd2', dayNumber: 2 }), day({ id: 'd3', dayNumber: 3 })],
      {},
      ['d1'],
      'd2',
    )
    expect(chains.map((c) => c.state)).toEqual([ChainState.DONE, ChainState.CURRENT, ChainState.LOCKED])
    expect(stepState(chains[2])).toBe(ChainState.LOCKED)
  })
})

describe('Zanjir byudjeti va audit (halollik)', () => {
  it('A1 kontenti uchun kataklar soni bo‘laklash chegarasidan oshmaydi', () => {
    // O'lchangan kontent hajmi: a1.json — 7 kun, 49 bo'lim/test, 133 element.
    const days: DailyPlanDay[] = Array.from({ length: 7 }, (_, i) => day({ id: `d${i}`, dayNumber: i + 1 }))
    const chains = buildDayChains(days, {}, [], 'd0')
    const budget = chainExerciseBudget(chains.length, chains[0].steps.length)
    expect(chains.reduce((a, c) => a + c.steps.length, 0)).toBeLessThanOrEqual(budget)
  })

  it('sequenceAudit — sonlar kontentdan hisoblanadi (31.1% DULO ko‘rsatkichi bizda 0)', () => {
    expect(sequenceAudit(['a', 'b'], () => undefined)).toEqual({ steps: 2, sameNeighbours: 0, minGap: 0 })
    const a = sequenceAudit(['a', 'b'], () => 'gap-fill')
    expect(a.sameNeighbours).toBe(1)
    expect(a.minGap).toBe(1)
  })
})

describe('exerciseIdsForSection — mobil `exerciseIdsFor` bilan bir xil', () => {
  it('lug‘at bo‘limi test savoli id lariga aylanadi', () => {
    const sec: DaySection = { skill: 'vocabulary', minutes: 10, itemIds: ['w1', 'w2'], titleUz: 'Lug‘at' }
    const out = exerciseIdsForSection(sec, {
      vocabQuizIds: (ids) => ids.map((id) => `vocab-quiz-${id}`),
      grammarExercises: () => [],
      readingExercises: () => [],
      listeningExercises: () => [],
      findExercise: () => undefined,
    })
    expect(out).toEqual(['vocab-quiz-w1', 'vocab-quiz-w2'])
  })

  it('grammatika/reading/listening — element ichidagi mashqlar olinadi', () => {
    const lookup = {
      vocabQuizIds: (ids: readonly string[]) => ids.slice(),
      grammarExercises: (id: string) => (id === 'g1' ? [{ id: 'g1-a' } as Exercise, { id: 'g1-b' } as Exercise] : []),
      readingExercises: (id: string) => (id === 'r1' ? [{ id: 'r1-a' } as Exercise] : []),
      listeningExercises: () => [] as Exercise[],
      findExercise: () => undefined,
    }
    const grammar: DaySection = { skill: 'grammar', minutes: 15, itemIds: ['g1'], titleUz: '' }
    const reading: DaySection = { skill: 'reading', minutes: 15, itemIds: ['r1'], titleUz: '' }
    expect(exerciseIdsForSection(grammar, lookup)).toEqual(['g1-a', 'g1-b'])
    expect(exerciseIdsForSection(reading, lookup)).toEqual(['r1-a'])
  })

  it('yozish/gapirish — mashq ro‘yxati bo‘sh (topshiriq baholanadi)', () => {
    const lookup = {
      vocabQuizIds: (ids: readonly string[]) => ids.slice(),
      grammarExercises: () => [] as Exercise[],
      readingExercises: () => [] as Exercise[],
      listeningExercises: () => [] as Exercise[],
      findExercise: () => undefined,
    }
    const writing: DaySection = { skill: 'writing', minutes: 20, itemIds: ['wr1'], titleUz: '' }
    const speaking: DaySection = { skill: 'speaking', minutes: 15, itemIds: ['sp1'], titleUz: '' }
    expect(exerciseIdsForSection(writing, lookup)).toEqual([])
    expect(exerciseIdsForSection(speaking, lookup)).toEqual([])
  })
})
