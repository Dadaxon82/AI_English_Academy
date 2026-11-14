import { describe, expect, it } from 'vitest'
import { currentElapsed, formatDuration, idleTimer, pauseTimer, planProgress, startTimer, stopTimer } from '../lib/timer'

describe('Taymer — sahifa yangilansa ham yo‘qolmaydi', () => {
  const T0 = 1_000_000_000_000

  it('startTimer → elapsed o‘sadi, startedAt saqlanadi', () => {
    const t = startTimer(idleTimer, 'session-a', 'reading', T0)
    expect(t.startedAt).toBe(T0)
    expect(currentElapsed(t, T0 + 45_000)).toBe(45)
  })

  it('pauseTimer → elapsed hisoblanadi va startedAt null bo‘ladi', () => {
    let t = startTimer(idleTimer, 'session-a', 'reading', T0)
    t = pauseTimer(t, T0 + 30_000)
    expect(t.startedAt).toBeNull()
    expect(t.elapsedSec).toBe(30)
    expect(currentElapsed(t, T0 + 120_000)).toBe(30)
  })

  it('Davom etish: pauzadan keyin hisob ustiga qo‘shiladi', () => {
    let t = startTimer(idleTimer, 's', 'reading', T0)
    t = pauseTimer(t, T0 + 30_000)
    t = startTimer(t, 's', 'reading', T0 + 60_000)
    expect(currentElapsed(t, T0 + 80_000)).toBe(50)
  })

  it('stopTimer → hisob yig‘iladi, startedAt null bo‘ladi', () => {
    let t = startTimer(idleTimer, 's', 'writing', T0)
    t = stopTimer(t, 's', 'writing', T0 + 90_000)
    expect(t.startedAt).toBeNull()
    expect(t.elapsedSec).toBe(90)
    expect(t.skill).toBe('writing')
  })

  it('serializatsiya/deserializatsiya (localStorage restore) — vaqt saqlanadi', () => {
    const t = startTimer(idleTimer, 's', 'listening', T0)
    const roundTrip = JSON.parse(JSON.stringify(t)) as typeof t
    expect(currentElapsed(roundTrip, T0 + 20_000)).toBe(20)
  })

  it('formatDuration', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(75)).toBe('01:15')
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('planProgress 90 daqiqalik rejada', () => {
    const p = planProgress(45 * 60, 90)
    expect(p.ratio).toBeCloseTo(0.5)
    expect(p.leftMin).toBe(45)
    expect(p.doneMin).toBe(45)
  })
})

describe('Taymer — uyqu/oraliq vaqt va soat siljishi chegaralari', () => {
  const T0 = 1_700_000_000_000

  it('uzluk 3 soatdan oshsa kundalik hisob shu chegarada to‘xtaydi', () => {
    const t = startTimer(idleTimer, 's', 'writing', T0)
    const after25h = currentElapsed(t, T0 + 25 * 3_600_000)
    expect(after25h).toBe(3 * 3600)
  })

  it('tizim soati orqaga siljisa manfiy sekund bo‘lmaydi', () => {
    const t = startTimer(idleTimer, 's', 'reading', T0)
    expect(currentElapsed(t, T0 - 10_000)).toBe(0)
    expect(currentElapsed(pauseTimer(t, T0 - 10_000), T0)).toBe(0)
  })

  it('stopTimer sessiyani tozalaydi — „pauzada“ belgisi yolg‘on bo‘lmasin', () => {
    let t = startTimer(idleTimer, 's', 'writing', T0)
    t = stopTimer(t, 's', 'writing', T0 + 90_000)
    expect(t.sessionId).toBeNull()
    expect(t.startedAt).toBeNull()
    expect(t.elapsedSec).toBe(90)
  })

  it('bir xil sessiyada ko‘nikma o‘zgarsa hisob yig‘iladi va skill yangilanadi', () => {
    let t = startTimer(idleTimer, 'day-1', 'vocabulary', T0)
    t = startTimer(t, 'day-1', 'grammar', T0 + 60_000)
    expect(t.skill).toBe('grammar')
    expect(t.startedAt).toBe(T0 + 60_000)
    expect(currentElapsed(t, T0 + 60_000)).toBe(60)
  })

  it('xuddi shu sessiya + skill: „Davom etish“ holat tiqilinch qayta start beradi', () => {
    let t = startTimer(idleTimer, 's', 'reading', T0)
    t = pauseTimer(t, T0 + 30_000)
    const again = startTimer(t, 's', 'reading', T0 + 40_000)
    expect(again.startedAt).toBe(T0 + 40_000) // davom etadi
    expect(again.elapsedSec).toBe(30) // hisob saqlanadi
    expect(currentElapsed(again, T0 + 50_000)).toBe(40)
  })
})
