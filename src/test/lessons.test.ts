import { describe, expect, it } from 'vitest'
import { findExercise, getBundle } from '../content'
import type { Exercise } from '../content/types'
import { checkAnswer } from '../lib/check'
import {
  SPEECH_PASS,
  grammarLesson,
  listeningLesson,
  readingLesson,
  speakingLesson,
  speechMatch,
  writingLesson,
  type LessonStep,
} from '../lib/lessons'

const b = getBundle('A1')

/** To'g'ri javob (tekshiruvchi kutgan shaklda). */
function rightAnswer(ex: Exercise): unknown {
  switch (ex.kind) {
    case 'multiple-choice':
      return ex.answerIndex
    case 'true-false-notgiven':
      return ex.answer
    case 'gap-fill':
      return ex.answers
    case 'matching':
      return Object.fromEntries(ex.pairs.map((p) => [p.left, p.right]))
    case 'word-order':
      return ex.answer
    case 'translation':
      return [ex.accepted[0]]
    case 'multi-select':
      return ex.answerIndexes
    case 'dropdown-cloze':
      return ex.answers
    case 'sequence':
      return ex.items
    case 'categorize':
      return Object.fromEntries(ex.sortItems.map((it) => [it.text, it.category]))
    case 'short-answer':
      return [ex.accepted[0]]
  }
}

function checkSteps(steps: LessonStep[]) {
  for (const s of steps) {
    if (s.type === 'info') continue
    const ex = s.type === 'exercise' ? s.exercise : s.fallback
    expect(checkAnswer(ex, rightAnswer(ex)).correct, ex.id).toBe(true)
    expect(findExercise(ex.id), `findExercise(${ex.id})`).toBeDefined()
  }
}

describe('Bo‘lim darslari — barcha A1 kontentidan quriladi va yechiladi', () => {
  it('Grammatika: qoida kartasi + mashqlar + misol gaplar', () => {
    for (const t of b.grammar) {
      const steps = grammarLesson(t)
      expect(steps[0]).toMatchObject({ type: 'info', info: 'rule' })
      expect(steps.filter((s) => s.type === 'exercise').length).toBe(t.exercises.length + Math.min(2, t.examples.length))
      checkSteps(steps)
    }
  })

  it('O‘qish: avval matn, savollarda matn konteksti', () => {
    for (const p of b.reading) {
      const steps = readingLesson(p)
      expect(steps[0]).toMatchObject({ type: 'info', info: 'passage' })
      expect(steps.slice(1).every((s) => s.type === 'exercise' && s.context === 'passage')).toBe(true)
      checkSteps(steps)
    }
  })

  it('Tinglash: avval audio, savollarda audio konteksti', () => {
    for (const t of b.listening) {
      const steps = listeningLesson(t)
      expect(steps[0]).toMatchObject({ type: 'info', info: 'audio' })
      checkSteps(steps)
    }
  })

  it('Yozish: namuna gaplar plitkalarda, oxirida yozishga chaqiriq', () => {
    for (const t of b.writing) {
      const steps = writingLesson(t)
      expect(steps.at(-1)).toMatchObject({ type: 'info', info: 'write-cta' })
      checkSteps(steps)
    }
    expect(b.writing.some((t) => writingLesson(t).length > 1), 'kamida bitta yozish darsida plitkali gap bo‘lishi kerak').toBe(true)
  })

  it('Gapirish: takrorlash qadamlari (mikrofonsiz — plitkalar), oxirida javobga chaqiriq', () => {
    for (const t of b.speaking) {
      const steps = speakingLesson(t)
      expect(steps.at(-1)).toMatchObject({ type: 'info', info: 'speak-cta' })
      expect(steps.some((s) => s.type === 'speak')).toBe(true)
      checkSteps(steps)
    }
  })
})

describe('Talaffuz bahosi', () => {
  it('to‘liq gap — 1, yarmi — 0.5, bo‘sh — 0', () => {
    expect(speechMatch('What is your name?', 'what is your name')).toBe(1)
    expect(speechMatch('I like green apples', 'I like')).toBe(0.5)
    expect(speechMatch('Hello there', '')).toBe(0)
  })
  it('chegara 70% — bitta so‘z tushib qolsa ham uzun gap o‘tadi', () => {
    expect(speechMatch('Where do you usually go on Sunday', 'where do you go on sunday')).toBeGreaterThanOrEqual(SPEECH_PASS)
  })
})
