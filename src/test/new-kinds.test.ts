import { describe, expect, it } from 'vitest'
import type { Exercise } from '../content/types'
import { checkAnswer } from '../lib/check'

const base = { level: 'A1' as const, skill: 'grammar' as const, explanationUz: 'izoh', difficulty: 1, instructionUz: 't' }

const ms: Exercise = { ...base, id: 'ms', kind: 'multi-select', question: 'Which are fruits?', options: ['apple', 'bread', 'banana', 'milk'], answerIndexes: [0, 2] }
const dc: Exercise = { ...base, id: 'dc', kind: 'dropdown-cloze', text: 'She ___ a student. They ___ friends.', choices: [['am', 'is', 'are'], ['am', 'is', 'are']], answers: ['is', 'are'] }
const sq: Exercise = { ...base, id: 'sq', kind: 'sequence', items: ['Hello!', 'Hi, how are you?', 'Fine, thanks.'], itemsShuffled: ['Fine, thanks.', 'Hello!', 'Hi, how are you?'] }
const ct: Exercise = { ...base, id: 'ct', kind: 'categorize', categories: ['Countable', 'Uncountable'], sortItems: [{ text: 'apple', category: 0 }, { text: 'milk', category: 1 }, { text: 'egg', category: 0 }] }
const sa: Exercise = { ...base, id: 'sa', kind: 'short-answer', question: 'How old is Samir?', accepted: ['eleven', '11'] }

describe('Bir nechta javob', () => {
  it('aniq to‘plam — to‘g‘ri (tartib ahamiyatsiz)', () => {
    expect(checkAnswer(ms, [2, 0]).correct).toBe(true)
  })
  it('bittasi yetishmasa — qisman 0.5', () => {
    const r = checkAnswer(ms, [0])
    expect(r.correct).toBe(false)
    expect(r.partial).toBe(0.5)
    expect(r.whyUz).toContain('banana')
  })
  it('ortiqcha tanlov ballni kamaytiradi va noto‘g‘ri', () => {
    const r = checkAnswer(ms, [0, 1, 2])
    expect(r.correct).toBe(false)
    expect(r.partial).toBe(0.5)
    expect(r.whyUz).toContain('ortiqcha')
  })
  it('hammasini belgilash — to‘g‘ri emas, ball 0', () => {
    expect(checkAnswer(ms, [0, 1, 2, 3]).partial).toBe(0)
  })
  it('bo‘sh javob — noto‘g‘ri', () => {
    expect(checkAnswer(ms, []).correct).toBe(false)
  })
})

describe('Ro‘yxatdan tanlash', () => {
  it('har bo‘shliq to‘g‘ri — to‘g‘ri', () => expect(checkAnswer(dc, ['is', 'are']).correct).toBe(true))
  it('bittasi xato — qisman, sababi aytiladi', () => {
    const r = checkAnswer(dc, ['are', 'are'])
    expect(r.partial).toBe(0.5)
    expect(r.whyUz).toContain('1-bo‘shliq')
  })
})

describe('Ketma-ketlik', () => {
  it('to‘g‘ri tartib', () => expect(checkAnswer(sq, sq.kind === 'sequence' ? sq.items : []).correct).toBe(true))
  it('noto‘g‘ri tartib — o‘z joyidagilar ulushi', () => {
    const r = checkAnswer(sq, ['Hello!', 'Fine, thanks.', 'Hi, how are you?'])
    expect(r.correct).toBe(false)
    expect(r.partial).toBeCloseTo(1 / 3)
    expect(r.whyUz).toContain('2-o‘rinda')
  })
  it('to‘liq bo‘lmagan javob — noto‘g‘ri', () => expect(checkAnswer(sq, ['Hello!']).correct).toBe(false))
})

describe('Saralash', () => {
  it('hammasi to‘g‘ri guruhda', () => expect(checkAnswer(ct, { apple: 0, milk: 1, egg: 0 }).correct).toBe(true))
  it('bittasi xato — 2/3', () => {
    const r = checkAnswer(ct, { apple: 0, milk: 0, egg: 0 })
    expect(r.correct).toBe(false)
    expect(r.partial).toBeCloseTo(2 / 3)
    expect(r.whyUz).toContain('milk')
  })
})

describe('Qisqa javob', () => {
  it('registr va tinish belgilariga bardoshli', () => {
    expect(checkAnswer(sa, ['Eleven.']).correct).toBe(true)
    expect(checkAnswer(sa, '11').correct).toBe(true)
  })
  it('noto‘g‘ri va bo‘sh', () => {
    expect(checkAnswer(sa, ['twelve']).correct).toBe(false)
    expect(checkAnswer(sa, ['']).correct).toBe(false)
  })
})
