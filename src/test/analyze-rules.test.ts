/**
 * Qoidaviy tahlil dvigatelining regressiyalari.
 *
 * Ikkita asosiy xato tekshiriladi:
 *  1) to'g'ri A1 matniga soxta "agreement" xatolari chiqmasligi
 *     ("I go to school" — birinchi shaxs, fe'l o'zgarmaydi);
 *  2) `mustInclude` naqshlari matning boshida/oxirida turmasa ham
 *     topilishi (eski holatda `^ ... $` ancheri tufayli 12 ta naqsh
 *     buzilardi va task_achievement asossiz jarimaga borardi).
 */
import { describe, expect, it } from 'vitest'
import { analyzeSpeaking, analyzeWriting } from '../lib/analyze'
import { a1 } from '../content'
import type { WritingTask } from '../content/types'

const cleanA1 =
  'I am twelve years old. I go to school every day and I like my teacher. ' +
  'My family has five people and we eat dinner together. We are happy.'

const stubTask: WritingTask = {
  id: 't-stub',
  level: 'A1',
  genre: 'paragraph',
  promptEn: 'About your family.',
  instructionUz: 'Oilangiz haqida yozing.',
  minWords: 25,
  maxWords: 80,
  minutes: 10,
  criteria: ['task_achievement', 'coherence', 'lexical_resource', 'grammatical_range', 'accuracy'],
  mustInclude: [{ pattern: 'my family', whyUz: 'Oilangizni titlang.' }],
}

describe('analyzeWriting — to‘g‘ri matn jazolanmasin', () => {
  it('toza A1 matnida soxta kelishuv (agreement) xatosi chiqmaydi', () => {
    const a = analyzeWriting(cleanA1, stubTask)
    const agreement = a.errors.filter((e) => e.kind === 'agreement')
    expect(agreement, `topildi: ${JSON.stringify(agreement.map((e) => e.correction))}`).toEqual([])
    expect(a.criteriaScores.accuracy).toBe(5)
  })

  it('haqiqiy kelishuv xatosi esa topiladi („he go“)', () => {
    const a = analyzeWriting(cleanA1 + ' He go to the market.', stubTask)
    const agreement = a.errors.filter((e) => e.kind === 'agreement')
    expect(agreement).toHaveLength(1)
    expect(agreement[0]!.correction).toBe('He goes')
  })
})

describe('analyzeWriting — mustInclude qidiruvi', () => {
  it('naqsh matn o‘rtasida bo‘lsa ham topiladi', () => {
    const text = 'Yesterday my family and friends went out last weekend because it was sunny. ' + cleanA1
    const a = analyzeWriting(text, {
      ...stubTask,
      mustInclude: [{ pattern: 'my family weekend', whyUz: 'Oilangiz haqida.' }],
    })
    const contentErrors = a.errors.filter((e) => e.kind === 'content')
    expect(contentErrors).toEqual([])
    expect(a.criteriaScores.task_achievement).toBeGreaterThanOrEqual(4)
  })

  it('loyihadagi barcha yozish topshiriqlarida ko‘p so‘zli naqshlar topiladi (model javob)', () => {
    const bad: string[] = []
    for (const task of a1.writing) {
      if (!task.modelAnswerEn) continue
      const a = analyzeWriting(task.modelAnswerEn, task)
      const missed = a.errors.filter((e) => e.kind === 'content')
      if (missed.length) bad.push(`${task.id}: ${missed.map((m) => m.correction).join(', ')}`)
    }
    expect(bad, `Model javobda topilmagan mustInclude:\n${bad.join('\n')}`).toEqual([])
  })
})

describe('analyzeSpeaking — baho va izoh bir-biriga zid bo‘lmasin', () => {
  const task = { minSeconds: 30, targetSeconds: 60 }

  it('juda sekin gapirish (wpm < 60) „ravon“ deb 5 ball olmaydi', () => {
    // 20 sekundda 20 so‘z → 60 wpm emas, ~? hisoblab tekshiramiz.
    const transcript = 'I like my cat. My cat is small. I feed my cat. I love my cat.'
    const a = analyzeSpeaking(transcript, 25, task)
    expect(a.wpm).toBeLessThan(60)
    expect(a.fluency).toBeLessThanOrEqual(2)
    expect(a.notesUz.some((n) => n.includes('sekin'))).toBe(true)
  })

  it('me‘yordagi tezlik (100 wpm) yuqori ravonlik oladi', () => {
    const transcript = Array(12).fill('I go to school every day and I learn English words').join('. ')
    const a = analyzeSpeaking(transcript, 60, task)
    expect(a.wpm).toBeGreaterThan(90)
    expect(a.wpm).toBeLessThanOrEqual(190)
    expect(a.fluency).toBe(5)
  })
})
