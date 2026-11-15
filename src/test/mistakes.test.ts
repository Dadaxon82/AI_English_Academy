import { describe, expect, it } from 'vitest'
import { findExercise, getBundle } from '../content'
import { REMIX_PREFIX, baseExerciseId, remixExercise } from '../content/remix'
import type { Exercise } from '../content/types'
import { checkAnswer } from '../lib/check'
import { buildMistakeLesson, modeCount, unresolvedMistakes } from '../lib/mistakes'
import type { AttemptRecord } from '../lib/types'

const b = getBundle('A1')
const all: Exercise[] = [...b.grammar.flatMap((g) => g.exercises), ...b.reading.flatMap((r) => r.exercises), ...b.tests.flatMap((t) => t.exercises)]

let n = 0
function att(exerciseId: string, correct: boolean, at: number, given = ''): AttemptRecord {
  return { id: `a${n++}`, exerciseId, skill: 'grammar', level: 'A1', correct, partial: correct ? 1 : 0, difficulty: 1, secondsSpent: 5, source: 'practice', answerGiven: given, at }
}

describe('Tuzatilmagan xatolar', () => {
  const [e1, e2, e3] = all
  it('oxirgi urinişi xato bölganlar qoladi; töğri yeçilgani çiqadi', () => {
    const list = unresolvedMistakes(
      [att(e1!.id, false, 1), att(e1!.id, true, 2), att(e2!.id, false, 3), att(e2!.id, false, 4), att(e3!.id, true, 5)],
      findExercise,
    )
    expect(list.map((m) => m.exercise.id)).toEqual([e2!.id])
    expect(list[0]!.wrongCount).toBe(2)
  })
  it('remix töğri yeçilsa — asl maşq ham tuzatilgan hisoblanadi', () => {
    const list = unresolvedMistakes([att(e1!.id, false, 1), att(`${REMIX_PREFIX}${e1!.id}`, true, 2)], findExercise)
    expect(list).toEqual([])
  })
  it('topilmaydigan (eski) maşq taşlab yuboriladi', () => {
    expect(unresolvedMistakes([att('yo-q-id', false, 1)], findExercise)).toEqual([])
  })
})

describe('Öyin usullari', () => {
  const attempts = all.slice(0, 20).flatMap((e, i) => (i % 3 === 0 ? [att(e.id, false, i), att(e.id, false, i + 0.5)] : [att(e.id, false, i)]))
  const list = unresolvedMistakes(attempts, findExercise)
  it('fix — 10 tagaça, eng yangisi birinçi', () => {
    const steps = buildMistakeLesson('fix', list)
    expect(steps.length).toBe(10)
    expect(modeCount('fix', list)).toBe(10)
  })
  it('hard — faqat 2+ marta xato qilinganlar', () => {
    const steps = buildMistakeLesson('hard', list)
    expect(steps.length).toBe(modeCount('hard', list))
    for (const s of steps) if (s.type === 'exercise') expect(list.find((m) => m.exercise.id === s.exercise.id)!.wrongCount).toBeGreaterThanOrEqual(2)
  })
  it('timed — 15 tagaça, takrorsiz', () => {
    const steps = buildMistakeLesson('timed', list, () => 0.3)
    expect(steps.length).toBe(Math.min(15, list.length))
    expect(new Set(steps.map((s) => (s.type === 'exercise' ? s.exercise.id : ''))).size).toBe(steps.length)
  })
})

describe('Boşqa körinişda (remix)', () => {
  it('har remix yeçiladi va id’dan tiklanadi', () => {
    let count = 0
    for (const ex of all) {
      const r = remixExercise(ex)
      if (!r) continue
      count++
      expect(r.kind).not.toBe(ex.kind)
      expect(baseExerciseId(r.id)).toBe(ex.id)
      expect(findExercise(r.id)?.kind, r.id).toBe(r.kind)
      let ans: unknown
      if (r.kind === 'dropdown-cloze' || r.kind === 'gap-fill') ans = r.answers
      else if (r.kind === 'short-answer') ans = [r.accepted[0]]
      else if (r.kind === 'word-order') ans = r.answer
      expect(checkAnswer(r, ans).correct, r.id).toBe(true)
      if (r.kind === 'dropdown-cloze') r.answers.forEach((a, i) => expect(r.choices[i]).toContain(a))
      if (r.kind === 'word-order') expect(r.bank.join(' ')).not.toBe(r.answer.join(' '))
    }
    expect(count).toBeGreaterThan(30)
  })
  it('gap-fill → röyxat: öquvçining öz xato javobi variantlar içida', () => {
    const gf = all.find((e) => e.kind === 'gap-fill')!
    if (gf.kind !== 'gap-fill') throw new Error()
    const wrong = gf.answers.map(() => 'xyzwrong').join(' / ')
    const r = remixExercise(gf, wrong)
    expect(r?.kind).toBe('dropdown-cloze')
    if (r?.kind === 'dropdown-cloze') expect(r.choices[0]).toContain('xyzwrong')
  })
})
