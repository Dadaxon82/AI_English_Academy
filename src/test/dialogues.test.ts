/**
 * Real hayot suhbatlari — kontent auditi, mashqqa aylanishi va dars tuzilmasi.
 */
import { describe, expect, it } from 'vitest'
import { findExercise } from '../content'
import {
  DIALOGUES,
  allDialogueExercises,
  dialogueExercise,
  dialogueExerciseId,
  dialoguesFor,
  filledLine,
  findDialogueExercise,
  gapLineIndexes,
} from '../content/dialogues'
import { checkAnswer } from '../lib/check'
import { dialogueLesson, dialogueProgress } from '../lib/lessons'
import { unresolvedMistakes } from '../lib/mistakes'
import type { AttemptRecord } from '../lib/types'

describe('Suhbatlar — kontent auditi', () => {
  it('A1 va A2: har kunga bittadan (1..7), id’lar takrorlanmaydi', () => {
    for (const level of ['A1', 'A2'] as const) {
      expect(dialoguesFor(level).map((d) => d.dayNumber)).toEqual([1, 2, 3, 4, 5, 6, 7])
    }
    expect(new Set(DIALOGUES.map((d) => d.id)).size).toBe(DIALOGUES.length)
  })

  for (const d of DIALOGUES) {
    it(`${d.id}: 3 ta bo‘shliq, javob variantlarda bir marta, tarjima va izoh bor`, () => {
      expect(d.situationUz.trim()).not.toBe('')
      expect(d.roles.a.trim()).not.toBe('')
      expect(d.roles.b.trim()).not.toBe('')
      expect(d.lines.length).toBeGreaterThanOrEqual(6)
      expect(gapLineIndexes(d)).toHaveLength(3)
      for (const l of d.lines) {
        expect(l.uz.trim(), l.en).not.toBe('')
        const blanks = l.en.split('___').length - 1
        if (!l.gap) {
          expect(blanks, l.en).toBe(0)
          continue
        }
        // Bo'shliq faqat o'quvchining replikasida.
        expect(l.speaker).toBe('b')
        expect(blanks, l.en).toBe(1)
        expect(l.gap.options.filter((o) => o === l.gap!.answer), l.en).toHaveLength(1)
        expect(new Set(l.gap.options).size).toBe(l.gap.options.length)
        expect(l.gap.options.length).toBeGreaterThanOrEqual(3)
        expect(l.gap.whyUz.trim()).not.toBe('')
        expect(filledLine(l)).not.toContain('___')
      }
      expect(d.note.pointsUz.length).toBeGreaterThan(0)
      expect(d.note.examples.length).toBeGreaterThan(0)
    })
  }

  it('to‘g‘ri javob o‘rni bir xil emas (hammasi 1-variant emas)', () => {
    const positions = new Set(allDialogueExercises().map((e) => e.answerIndex))
    expect(positions.size).toBeGreaterThan(1)
  })
})

describe('Suhbat → mashq', () => {
  const d = DIALOGUES[0]!
  const i = gapLineIndexes(d)[0]!

  it('id’dan qayta tiklanadi (Xatolar daftari uchun) va to‘g‘ri javob tekshiriladi', () => {
    const ex = dialogueExercise(d, i)!
    expect(ex.id).toBe(dialogueExerciseId(d, i))
    expect(findDialogueExercise(ex.id)).toEqual(ex)
    expect(findExercise(ex.id)).toEqual(ex)
    expect(checkAnswer(ex, ex.answerIndex).correct).toBe(true)
    expect(checkAnswer(ex, (ex.answerIndex + 1) % ex.options.length).correct).toBe(false)
    expect(ex.question).toContain('___')
    expect(ex.question.startsWith(`${d.roles.b}:`)).toBe(true)
  })

  it('noma’lum id — undefined (soxta mashq yasalmaydi)', () => {
    expect(findExercise('dlg-yoq-suhbat-1')).toBeUndefined()
    expect(findExercise(`dlg-${d.id}-0`)).toBeUndefined() // 0-qator bo'shliqsiz
  })

  it('xato javob Xatolar daftariga tushadi', () => {
    const ex = dialogueExercise(d, i)!
    const a: AttemptRecord = {
      id: 'x', exerciseId: ex.id, skill: ex.skill, level: 'A1', correct: false, partial: 0, difficulty: 1,
      secondsSpent: 4, source: 'practice', answerGiven: '0', at: 1,
    }
    expect(unresolvedMistakes([a], findExercise).map((m) => m.exercise.id)).toEqual([ex.id])
  })

  it('dars: o‘qish → 3 bo‘shliq (suhbat qayta ochiladi) → «Nega shunday?»', () => {
    const steps = dialogueLesson(d)
    expect(steps.map((s) => s.type)).toEqual(['info', 'exercise', 'exercise', 'exercise', 'info'])
    expect(steps.filter((s) => s.type === 'exercise').every((s) => s.type === 'exercise' && s.context === 'passage')).toBe(true)
    const last = steps[steps.length - 1]!
    expect(last.type === 'info' && last.info).toBe('rule')
  })

  it('holat urinishlardan: har bo‘shliqning OXIRGI urinishi', () => {
    const ids = gapLineIndexes(d).map((k) => dialogueExerciseId(d, k))
    const mk = (exerciseId: string, correct: boolean, at: number): AttemptRecord => ({
      id: `${exerciseId}${at}`, exerciseId, skill: 'grammar', level: 'A1', correct, partial: 0, difficulty: 1,
      secondsSpent: 1, source: 'practice', answerGiven: '', at,
    })
    expect(dialogueProgress(d, [])).toEqual({ correct: 0, tried: 0, total: 3 })
    const atts = [mk(ids[0]!, false, 1), mk(ids[0]!, true, 2), mk(ids[1]!, true, 3), mk(ids[1]!, false, 4), mk('boshqa', true, 5)]
    expect(dialogueProgress(d, atts)).toEqual({ correct: 1, tried: 2, total: 3 })
  })
})
