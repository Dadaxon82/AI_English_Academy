/**
 * Yangi tinglab bajariladigan mashqlar — Duolingo skrinshotlariga mos 4 tur:
 * «Что вы услышали?» (listening-select), «Введите пропущенное слово»
 * (listening-fill), «Послушайте и заполните пропуск» (listening-choice),
 * «Повторите это предложение вслух» (vocabRepeatExercise — mavjud 'speak'
 * qadam mexanizmi orqali). HAQIQIY A1 lug'at ma'lumotlari ustida tekshiriladi
 * — son ixtiro qilinmaydi, faqat mavjud `VocabularyItem`lardan hisoblanadi.
 */
import { describe, expect, it } from 'vitest'
import {
  findExercise,
  getBundle,
  vocabListenChoiceExercise,
  vocabListenFillExercise,
  vocabListenSelectExercise,
  vocabRepeatExercise,
} from '../content'
import { checkAnswer } from '../lib/check'

const pool = getBundle('A1').vocab

describe('vocabListenSelectExercise — «Что вы услышали?»', () => {
  it("javob so'zi va chalg'ituvchilar bank ichida, aralash tartibda", () => {
    const v = pool[0]!
    const distractors = pool.slice(1, 3)
    const ex = vocabListenSelectExercise(v, distractors)
    expect(ex.bank).toHaveLength(3)
    expect(new Set(ex.bank)).toEqual(new Set([v.word, ...distractors.map((d) => d.word)]))
    expect(ex.answer).toEqual([v.word])
  })

  it('findExercise id orqali aynan şu mashqni qayta tiklaydi', () => {
    const v = pool[0]!
    const distractors = pool.slice(1, 3)
    const ex = vocabListenSelectExercise(v, distractors)
    expect(findExercise(ex.id)).toEqual(ex)
  })

  it("to'g'ri so'z tanlansa checkAnswer correct=true qaytaradi", () => {
    const v = pool[0]!
    const ex = vocabListenSelectExercise(v, pool.slice(1, 3))
    expect(checkAnswer(ex, ex.answer).correct).toBe(true)
  })
})

describe("vocabListenFillExercise — «Введите пропущенное слово»", () => {
  it("so'z exampleEn ichida topilsa bo'shliqqa aylantiradi", () => {
    const v = pool.find((x) => new RegExp(`\\b${x.word}\\b`, 'i').test(x.exampleEn))!
    const ex = vocabListenFillExercise(v)
    expect(ex).toBeDefined()
    expect(ex!.text).toContain('___')
    expect(ex!.text).not.toMatch(new RegExp(`\\b${v.word}\\b`, 'i'))
    expect(ex!.answer).toBe(v.word)
    expect(checkAnswer(ex!, [v.word]).correct).toBe(true)
  })

  it("so'z exampleEn ichida topilmasa undefined qaytaradi (ixtiro qilinmaydi)", () => {
    const fake = { ...pool[0]!, word: 'xyznotfound', exampleEn: 'This sentence has none of that.' }
    expect(vocabListenFillExercise(fake)).toBeUndefined()
  })

  it('findExercise id orqali qayta tiklaydi', () => {
    const v = pool.find((x) => new RegExp(`\\b${x.word}\\b`, 'i').test(x.exampleEn))!
    const ex = vocabListenFillExercise(v)!
    expect(findExercise(ex.id)).toEqual(ex)
  })
})

describe('vocabListenChoiceExercise — «Послушайте и заполните пропуск»', () => {
  it("2 audio variant (to'g'risi + chalg'ituvchi), answerIndex töğri so'zga mos", () => {
    const v = pool.find((x) => new RegExp(`\\b${x.word}\\b`, 'i').test(x.exampleEn))!
    const distractor = pool.find((x) => x.id !== v.id)!
    const ex = vocabListenChoiceExercise(v, distractor)
    expect(ex).toBeDefined()
    expect(ex!.options).toHaveLength(2)
    expect(ex!.options[ex!.answerIndex]).toBe(v.word)
    expect(checkAnswer(ex!, ex!.answerIndex).correct).toBe(true)
  })

  it("chalg'ituvchi berilmasa undefined qaytaradi", () => {
    const v = pool.find((x) => new RegExp(`\\b${x.word}\\b`, 'i').test(x.exampleEn))!
    expect(vocabListenChoiceExercise(v, undefined)).toBeUndefined()
  })

  it('findExercise id orqali (vocab~distractor) qayta tiklaydi', () => {
    const v = pool.find((x) => new RegExp(`\\b${x.word}\\b`, 'i').test(x.exampleEn))!
    const distractor = pool.find((x) => x.id !== v.id)!
    const ex = vocabListenChoiceExercise(v, distractor)!
    expect(findExercise(ex.id)).toEqual(ex)
  })
})

describe("vocabRepeatExercise — «Повторите это предложение вслух»", () => {
  it("exampleEn mantiqiy uzunlikda bo'lsa word-order fallback yasaydi", () => {
    const v = pool.find((x) => x.exampleEn.trim().split(/\s+/).length >= 2 && x.exampleEn.trim().split(/\s+/).length <= 12)!
    const ex = vocabRepeatExercise(v)
    expect(ex).toBeDefined()
    expect(ex!.kind).toBe('word-order')
    expect(ex!.answer.join(' ')).toBe(v.exampleEn.trim().split(/\s+/).join(' '))
    expect(checkAnswer(ex!, ex!.answer).correct).toBe(true)
  })

  it('findExercise id orqali qayta tiklaydi', () => {
    const v = pool.find((x) => x.exampleEn.trim().split(/\s+/).length >= 2 && x.exampleEn.trim().split(/\s+/).length <= 12)!
    const ex = vocabRepeatExercise(v)!
    expect(findExercise(ex.id)).toEqual(ex)
  })
})
