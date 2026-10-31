import { describe, expect, it } from 'vitest'
import { checkAnswer, normalize } from '../lib/check'
import type { Exercise } from '../content/types'

const base = {
  id: 'x-1',
  level: 'A1' as const,
  skill: 'grammar' as const,
  difficulty: 2,
  explanationUz: 'Izoh.',
}

describe('checkAnswer — 6 mashq turi', () => {
  const mc: Exercise = {
    ...base,
    kind: 'multiple-choice',
    instructionUz: 'To‘g‘ri variantni tanlang.',
    question: 'She ___ to school every day.',
    options: ['go', 'goes', 'going'],
    answerIndex: 1,
  }
  it('multiple-choice: indeks bo‘yicha tekshiradi', () => {
    const r = checkAnswer(mc, 1)
    expect(r.correct).toBe(true)
    expect(r.given).toBe('goes')
    const bad = checkAnswer(mc, 0)
    expect(bad.correct).toBe(false)
  })

  const tf: Exercise = {
    ...base,
    kind: 'true-false-notgiven',
    instructionUz: 'True / False / Not Given.',
    statement: 'Tom works on Sundays.',
    answer: 'notgiven',
    evidence: 'Tom works from Monday to Saturday.',
  }
  it('tfng: evidence izohga qo‘shiladi', () => {
    const r = checkAnswer(tf, 'notgiven')
    expect(r.correct).toBe(true)
    expect(r.whyUz).toContain('Tom works from Monday to Saturday.')
    expect(checkAnswer(tf, 'true').correct).toBe(false)
  })

  const match: Exercise = {
    ...base,
    kind: 'matching',
    instructionUz: 'Juftlashtiring.',
    pairs: [
      { left: 'apple', right: 'olma' },
      { left: 'bread', right: 'non' },
    ],
  }
  it('matching: qisman hisob (partial) beriladi', () => {
    const r = checkAnswer(match, { apple: 'olma', bread: 'suv' })
    expect(r.correct).toBe(false)
    expect(r.partial).toBeCloseTo(0.5)
    expect(r.whyUz).toContain('1/2')
  })

  const gap: Exercise = {
    ...base,
    kind: 'gap-fill',
    instructionUz: 'Bo‘sh joyni to‘ldiring.',
    text: 'I ___ a student and she ___ a teacher.',
    answers: ['am', 'is'],
    acceptAlternatives: [[], ['is']],
  }
  it('gap-fill: alternativ javoblar qabul qilinadi', () => {
    expect(checkAnswer(gap, ['am', 'is']).correct).toBe(true)
    const part = checkAnswer(gap, ['am', 'are'])
    expect(part.correct).toBe(false)
    expect(part.partial).toBeCloseTo(0.5)
  })

  const wo: Exercise = {
    ...base,
    kind: 'word-order',
    instructionUz: 'So‘zlarni tartib bilan tizing.',
    bank: ['a', 'doctor', 'She', 'is'],
    answer: ['She', 'is', 'a', 'doctor'],
    noteUz: 'Eslatma.',
  }
  it('word-order: normallashtirilgan taqqoslash', () => {
    expect(checkAnswer(wo, ['she', 'IS', 'a', 'doctor.']).correct).toBe(true)
    const bad = checkAnswer(wo, ['is', 'she', 'a', 'doctor'])
    expect(bad.correct).toBe(false)
    expect(bad.whyUz).toContain('1-o‘rin')
  })

  const tr: Exercise = {
    ...base,
    kind: 'translation',
    instructionUz: 'Tarjima qiling.',
    source: 'Kitob',
    sourceLang: 'uz',
    accepted: ['book'],
  }
  it('translation: registr va belgilardan qat’iy emas', () => {
    expect(checkAnswer(tr, 'Book').correct).toBe(true)
    expect(checkAnswer(tr, 'pen').correct).toBe(false)
  })
})

describe('normalize', () => {
  it('apostrof va diacritic belgilarni bir xillashtiradi', () => {
    expect(normalize('Don’t TELL')).toBe("don't tell")
    expect(normalize(' café ')).toBe('cafe')
  })
})
