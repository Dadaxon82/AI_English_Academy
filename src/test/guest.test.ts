import { describe, expect, it } from 'vitest'
import { guestDayIds, isGuestAllowedPath } from '../lib/guest'

describe('mehmon rejimi (faqat A1.1)', () => {
  it('A1.1 kunlari — A1 ning 1–4-kunlari', () => {
    expect([...guestDayIds()].sort()).toEqual(['a1-day-01', 'a1-day-02', 'a1-day-03', 'a1-day-04'])
  })

  it('asosiy sahifalar ochiq', () => {
    for (const p of ['/', '/dashboard', '/path', '/sections', '/settings', '/onboarding', '/login', '/dashboard/']) {
      expect(isGuestAllowedPath(p)).toBe(true)
    }
  })

  it('A1.1 darslari ochiq, boshqa bölim darslari yopiq', () => {
    expect(isGuestAllowedPath('/lesson/a1-day-01/vocabulary')).toBe(true)
    expect(isGuestAllowedPath('/lesson/a1-day-04/grammar')).toBe(true)
    expect(isGuestAllowedPath('/lesson/a1-day-05/vocabulary')).toBe(false)
    expect(isGuestAllowedPath('/lesson/a2-day-01/vocabulary')).toBe(false)
  })

  it('qolgan sahifalar yopiq', () => {
    for (const p of ['/vocabulary', '/grammar', '/mock-exam', '/progress', '/errors', '/quick', '/shorts', '/admin', '/nomalum']) {
      expect(isGuestAllowedPath(p)).toBe(false)
    }
  })
})
