/**
 * Vaqt hisobi (kundalik sekundlar) — "0/90 daq" ziddiyati va ikki marta
 * sanash regressiyalariga qarshi testlar. Reducer toza funksiya, shuning
 * uchun komponentlarsiz tekshiriladi.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { reducer } from '../lib/reducer'
import { emptyData, todayKey, type AppData } from '../lib/types'
import type { Skill } from '../content/types'

function baseState(uid: string): AppData {
  return emptyData(uid)
}

function todaysSeconds(s: AppData): number {
  return s.activity[todayKey()]?.seconds ?? 0
}

function todaysSkillSeconds(s: AppData, skill: Skill): number {
  return s.activity[todayKey()]?.skills[skill] ?? 0
}

describe('Kundalik vaqt hisobi', () => {
  it('taymer yurmasa maşqda sarflangan vaqt kundalik hisobga qöşiladi', () => {
    let s = baseState('u1')
    s = reducer(s, {
      type: 'attempt',
      record: {
        id: 'a1', exerciseId: 'e1', skill: 'reading', level: 'A1', correct: true, partial: 1,
        difficulty: 1, secondsSpent: 40, source: 'practice', answerGiven: 'x', at: Date.now(),
      },
    })
    expect(todaysSeconds(s)).toBe(40)
    expect(todaysSkillSeconds(s, 'reading')).toBe(40)
  })

  it('taymer yurganda attempt vaqti IKKI marta sanalmaydi', () => {
    let s = baseState('u1')
    s = reducer(s, { type: 'timer-start', sessionId: 'p1', skill: 'reading' })
    s = reducer(s, {
      type: 'attempt',
      record: {
        id: 'a1', exerciseId: 'e1', skill: 'reading', level: 'A1', correct: true, partial: 1,
        difficulty: 1, secondsSpent: 40, source: 'practice', answerGiven: 'x', at: Date.now(),
      },
    })
    expect(todaysSeconds(s)).toBe(0) // devor-soat hisobiga qoldiriladi
    expect(todaysSkillSeconds(s, 'reading')).toBe(0) // skills ham shu qoidaga bo'ysunadi
  })

  it('boşqa sessiyaga ötişda oldingi vaqt yöqolmaydi', () => {
    let s = baseState('u1')
    s = reducer(s, { type: 'timer-start', sessionId: 'read-1', skill: 'reading' })
    s = reducer(s, { type: 'timer-start', sessionId: 'write-1', skill: 'writing' })
    // reading sessiyasi yig‘gan sekundlar (0 ga yaqin, lekin struktura tekshiriladi)
    expect(s.timer.sessionId).toBe('write-1')
    expect(s.timer.skill).toBe('writing')
  })

  it('stop → same session restart: bir xil sekundlar ikki marta yozilmaydi', () => {
    let s = baseState('u1')
    s = reducer(s, { type: 'timer-start', sessionId: 'p1', skill: 'reading' })
    // sun'iy: elapsedSec'ni qo'lda qo'yib, stop qilamiz
    s = { ...s, timer: { ...s.timer, elapsedSec: 120 } }
    s = reducer(s, { type: 'timer-stop' })
    expect(todaysSeconds(s)).toBe(120)
    expect(s.timer.elapsedSec).toBe(0) // hisobga yozilgandan keyin nollanadi

    // Xuddi shu sessiyani qayta ochish — eski 120 sekund qayta sanalmasin
    s = reducer(s, { type: 'timer-start', sessionId: 'p1', skill: 'reading' })
    s = { ...s, timer: { ...s.timer, elapsedSec: 30 } }
    s = reducer(s, { type: 'timer-stop' })
    expect(todaysSeconds(s)).toBe(150)
  })

  it('pause → “Davom etiş” (same session) — sekundlar yöqolmaydi, takrorlanmaydi', () => {
    let s = baseState('u1')
    s = reducer(s, { type: 'timer-start', sessionId: 'p1', skill: 'reading' })
    s = reducer(s, { type: 'timer-pause' })
    s = { ...s, timer: { ...s.timer, elapsedSec: 60 } }
    // Dashboard "Davom etish" shu sessiya bilan qayta start beradi
    s = reducer(s, { type: 'timer-start', sessionId: 'p1', skill: 'reading' })
    expect(s.timer.startedAt).not.toBeNull()
    expect(s.timer.elapsedSec).toBe(60) // hisob saqlanadi, kundalikka yozilmaydi
    expect(todaysSeconds(s)).toBe(0) // yozilmagan — start'da yozilmadi
    s = reducer(s, { type: 'timer-stop' })
    expect(todaysSeconds(s)).toBe(60) // bir marta
  })
})

describe('Vaqt hisobi — sessiya/könikma atributsiyasi va çegaralar', () => {
  it('boşqa sessiya taymeri yurarida boşqa könikma attempt sekundlari YÖQOLMAYDI', () => {
    let s = baseState('u1')
    s = reducer(s, { type: 'timer-start', sessionId: 'write-1', skill: 'writing' })
    s = reducer(s, {
      type: 'attempt',
      record: {
        id: 'g1', exerciseId: 'e9', skill: 'grammar', level: 'A1', correct: true, partial: 1,
        difficulty: 1, secondsSpent: 300, source: 'practice', answerGiven: 'x', at: Date.now(),
      },
    })
    // Yozish taymeri yurayapti — lekin grammatika mashqi o‘z vaqtini olib keladi.
    expect(todaysSkillSeconds(s, 'grammar')).toBe(300)
    expect(todaysSeconds(s)).toBe(300)
  })

  it('sessiya bir xil, könikma özgarsa — hisoblangan vaqt eski könikmaga yoziladi', () => {
    let s = baseState('u1')
    s = reducer(s, { type: 'timer-start', sessionId: 'a1-day-01', skill: 'vocabulary' })
    s = { ...s, timer: { ...s.timer, elapsedSec: 600 } } // 10 daq lug‘atda o‘qildi
    s = reducer(s, { type: 'timer-start', sessionId: 'a1-day-01', skill: 'grammar' })
    expect(todaysSkillSeconds(s, 'vocabulary')).toBe(600)
    expect(todaysSkillSeconds(s, 'grammar')).toBe(0)
    expect(todaysSeconds(s)).toBe(600)
    expect(s.timer.skill).toBe('grammar')
    expect(s.timer.elapsedSec).toBe(0) // yozilgandan keyin nollandi
    s = reducer(s, { type: 'timer-stop' })
    expect(todaysSeconds(s)).toBe(600) // ikki marta sanalmadi
  })

  describe('soat haqiqatan yurganda', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    // ESKI BUG: yuqoridagi test soatni surmagani uchun yurgan vaqt 0 edi va
    // ikki marta sanash ko'rinmasdi. Haqiqiy holatda 2-kun: "Kunni boshlash"
    // (lug'at) → 10 daqiqadan keyin "Testni boshlash" (grammatika) → 5 daqiqa.
    it('bir sessiyada könikma almaşsa yurgan vaqt IKKI marta yozilmaydi', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 10, 3, 9, 0, 0))
      let s = baseState('u1')
      s = reducer(s, { type: 'timer-start', sessionId: 'a1-day-02', skill: 'vocabulary' })
      vi.advanceTimersByTime(600_000)
      s = reducer(s, { type: 'timer-start', sessionId: 'a1-day-02', skill: 'grammar' })
      expect(s.timer.elapsedSec).toBe(0)
      vi.advanceTimersByTime(300_000)
      s = reducer(s, { type: 'timer-stop' })
      expect(todaysSkillSeconds(s, 'vocabulary')).toBe(600)
      expect(todaysSkillSeconds(s, 'grammar')).toBe(300)
      expect(todaysSeconds(s)).toBe(900)
    })

    it('boşqa sessiyaga ötganda ham real vaqt bir marta yoziladi', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 10, 3, 9, 0, 0))
      let s = baseState('u1')
      s = reducer(s, { type: 'timer-start', sessionId: 'a1-r1', skill: 'reading' })
      vi.advanceTimersByTime(600_000)
      s = reducer(s, { type: 'timer-start', sessionId: 'a1-w1', skill: 'writing' })
      vi.advanceTimersByTime(300_000)
      s = reducer(s, { type: 'timer-stop' })
      expect(todaysSkillSeconds(s, 'reading')).toBe(600)
      expect(todaysSkillSeconds(s, 'writing')).toBe(300)
      expect(todaysSeconds(s)).toBe(900)
    })
  })

  it('stop’dan keyin soxta “Taymer pauzada” holati qolmaydi (sessionId null)', () => {
    let s = baseState('u1')
    s = reducer(s, { type: 'timer-start', sessionId: 'read-1', skill: 'reading' })
    s = reducer(s, { type: 'timer-stop' })
    expect(s.timer.startedAt).toBeNull()
    expect(s.timer.sessionId).toBeNull()
  })

  it('böş taymerda ham stop banner holatini yasamaydi', () => {
    const s = reducer(baseState('u1'), { type: 'timer-stop' })
    expect(s.timer.sessionId).toBeNull()
    expect(todaysSeconds(s)).toBe(0)
  })
})

describe('Mock imtihon vaqti kundalik hisobga yoziladi', () => {
  it('bölimlarda sarflangan vaqt könikmalar böyiça qöşiladi', () => {
    let s = baseState('u1')
    s = reducer(s, {
      type: 'mock-time',
      entries: [
        { skill: 'reading', seconds: 1200 },
        { skill: 'listening', seconds: 600 },
      ],
    })
    expect(todaysSkillSeconds(s, 'reading')).toBe(1200)
    expect(todaysSkillSeconds(s, 'listening')).toBe(600)
    expect(todaysSeconds(s)).toBe(1800)
  })

  it('manfiy vaqt qöşilmaydi; 3 soatdan köpi qisqartiriladi', () => {
    const s = reducer(baseState('u1'), {
      type: 'mock-time',
      entries: [
        { skill: 'writing', seconds: -60 }, // manfiy → 0
        { skill: 'speaking', seconds: 25 * 3600 }, // 25 soat → 3 soat
      ],
    })
    expect(todaysSkillSeconds(s, 'writing')).toBe(0)
    expect(todaysSkillSeconds(s, 'speaking')).toBe(3 * 3600)
    expect(todaysSeconds(s)).toBe(3 * 3600)
  })

  it('vaqt yozilsa ham attempt SANALMAYDI — dalil skillEvidence‘da ikki marta sanalmasin', () => {
    const s = reducer(baseState('u1'), {
      type: 'mock-time',
      entries: [{ skill: 'reading', seconds: 10 }],
    })
    expect(s.attempts.length).toBe(0)
    expect(s.activity[todayKey()]?.attempts ?? 0).toBe(0)
  })
})
