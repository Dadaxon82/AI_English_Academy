/**
 * Video shortlar — kontent qoidalari (`src/content/shorts.ts`).
 */
import { describe, expect, it } from 'vitest'
import { DIALOGUES, filledLine } from '../content/dialogues'
import { findExercise } from '../content'
import {
  SHORT_MAX_WORDS,
  allShortExercises,
  allShorts,
  findShort,
  lessonShortExercises,
  shortExercise,
  shortExercisesOf,
} from '../content/shorts'

describe('shortlar', () => {
  it('har suhbat replikasidan short (uzunlar bundan mustasno), matn to‘liq — bo‘shliqsiz', () => {
    const shorts = allShorts()
    expect(shorts.length).toBeGreaterThanOrEqual(60)
    for (const s of shorts) {
      expect(s.en).not.toContain('___')
      expect(s.en.split(/\s+/).length).toBeLessThanOrEqual(SHORT_MAX_WORDS)
      expect(s.uz.trim()).not.toBe('')
      const d = DIALOGUES.find((x) => x.id === s.dialogueId)!
      expect(s.en).toBe(filledLine(d.lines[s.lineIndex]!))
      expect(findShort(s.id)).toEqual(s)
    }
    expect(new Set(shorts.map((s) => s.id)).size).toBe(shorts.length)
  })

  it('mashq: 4 ta variant, takrorsiz, to‘g‘ri javob bitta va id dan qayta tiklanadi', () => {
    for (const ex of allShortExercises()) {
      expect(ex.options).toHaveLength(4)
      expect(new Set(ex.options.map((o) => o.toLowerCase())).size).toBe(4)
      expect(ex.answerIndex).toBeGreaterThanOrEqual(0)
      expect(ex.shortId).toBeTruthy()
      expect(findExercise(ex.id)).toEqual(ex)
    }
  })

  it('variantlar tartibi barqaror (bir id — bir xil tartib)', () => {
    const s = allShorts('A1')[3]!
    expect(shortExercise(s, 'm')).toEqual(shortExercise(s, 'm'))
    expect(shortExercise(s, 'l').options).toEqual(shortExercise(s, 'l').options)
  })

  it('ma’no — o‘zbekcha variantlar, eşitiş — inglizcha; savol matni javobni oshkor qilmaydi', () => {
    const s = allShorts('A2')[0]!
    const m = shortExercise(s, 'm')
    const l = shortExercise(s, 'l')
    expect(m.options[m.answerIndex]).toBe(s.uz)
    expect(l.options[l.answerIndex]).toBe(s.en)
    expect(m.question).not.toContain(s.en)
    expect(l.question).not.toContain(s.en)
    expect(l.skill).toBe('listening')
  })

  it('suhbat darsidagi shortlar faqat suhbatdoşning replikalaridan (böşliq javobi oşkor bölmaydi)', () => {
    for (const d of DIALOGUES) {
      const ex = lessonShortExercises(d)
      expect(ex.length).toBeGreaterThanOrEqual(1)
      for (const e of ex) {
        const s = findShort(e.shortId!)!
        expect(s.learnerSpeaks).toBe(false)
      }
    }
  })

  it('suhbat playlisti: eşitiş va ma’no navbatma-navbat', () => {
    const ex = shortExercisesOf(DIALOGUES[0]!)
    expect(ex[0]!.id.endsWith('-l')).toBe(true)
    expect(ex[1]!.id.endsWith('-m')).toBe(true)
  })

  it('noto‘g‘ri id — undefined', () => {
    expect(findExercise('short-yoq-1-m')).toBeUndefined()
    expect(findExercise('short-a1-d1-first-class-99-m')).toBeUndefined()
    expect(findExercise('short-a1-d1-first-class-0-x')).toBeUndefined()
  })
})
