import { describe, expect, it } from 'vitest'
import { countLearned, initialSrsState, isDue, review } from '../lib/srs'

const T0 = Date.UTC(2026, 0, 1, 12, 0, 0)
const DAY = 86_400_000

describe('SRS (SM-2)', () => {
  it('learnedAt birinchi muvaffaqiyatli bahoda O‘RNATILADI va keyin o‘zgarmaydi', () => {
    let s = initialSrsState(T0)
    s = review(s, 'good', T0)
    const first = s.learnedAt
    expect(first).toBe(T0)
    s = review(s, 'good', T0 + DAY)
    s = review(s, 'again', T0 + 2 * DAY)
    s = review(s, 'easy', T0 + 3 * DAY)
    expect(s.learnedAt).toBe(first) // takrorlar learnedAt ni o‘zgartirmaydi
  })

  it('xato learnedAt ni o‘chirmaydi, lekin intervalni qaytaradi', () => {
    let s = review(initialSrsState(T0), 'good', T0)
    s = review(s, 'again', T0 + DAY)
    expect(s.learnedAt).toBe(T0)
    expect(s.intervalDays).toBe(0)
    expect(s.dueAt).toBe(T0 + DAY + 10 * 60 * 1000)
    expect(isDue(s, T0 + DAY + 11 * 60 * 1000)).toBe(true)
  })

  it('interval ease bilan o‘sadi', () => {
    let s = review(initialSrsState(T0), 'good', T0)
    expect(s.intervalDays).toBe(1)
    const prev = s.intervalDays
    s = review(s, 'good', T0 + DAY)
    expect(s.intervalDays).toBeGreaterThan(prev)
  })

  it('bir necha marta takrorlangan so‘z ham BIR dona hisoblanadi', () => {
    // Store`da srs — `vocabId -> state` xaritasi, shuning uchun bitta so‘z
    // uchun bitta holat saqlanadi; qancha reps bo‘lishidan qat’i nazar,
    // hisob bitta.
    let a = review(initialSrsState(T0), 'good', T0)
    a = review(a, 'good', T0 + DAY)
    a = review(a, 'again', T0 + 2 * DAY)
    a = review(a, 'easy', T0 + 3 * DAY)
    expect(a.reps).toBe(4)
    expect(countLearned([a])).toBe(1)
  })

  it('again → ease pasаdi, lekin minimal chegaradan tushmaydi', () => {
    let s = initialSrsState(T0)
    for (let i = 0; i < 10; i++) s = review(s, 'again', T0 + i * DAY)
    expect(s.ease).toBeGreaterThanOrEqual(1.3)
    expect(s.lapses).toBe(10)
  })
})
