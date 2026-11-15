/**
 * Funksiyalardan foydalanish o'lchovi (faqat qurilmada).
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import UsageCard from '../components/UsageCard'
import { USAGE_MAX, bumpUsage, clearUsage, completionPct, parseUsage, trackUsage } from '../lib/usage'

describe('usage — sof funksiyalar', () => {
  it('boşlangan/yakunlangan; yakunlangan boşlangandan oşmaydi', () => {
    let s = bumpUsage({}, 'quick', 'started', 10)
    s = bumpUsage(s, 'quick', 'started', 20)
    s = bumpUsage(s, 'quick', 'finished', 30)
    expect(s.quick).toEqual({ started: 2, finished: 1, lastAt: 30 })
    expect(completionPct(s.quick)).toBe(50)
    expect(bumpUsage({}, 'dialogue', 'finished', 1).dialogue).toEqual({ started: 1, finished: 1, lastAt: 1 })
    expect(completionPct(undefined)).toBeNull()
  })
  it('buzilgan saqlov xavfsiz öqiladi: noma’lum kalit va notöğri son taşlanadi', () => {
    expect(parseUsage('{bu json emas')).toEqual({})
    expect(parseUsage(JSON.stringify({ hack: { started: 5 }, quick: { started: -3, finished: 'x', lastAt: 1e30 } }))).toEqual({
      quick: { started: 0, finished: 0, lastAt: USAGE_MAX },
    })
    expect(parseUsage(JSON.stringify({ review: { started: 2, finished: 9, lastAt: 5 } })).review).toEqual({ started: 2, finished: 2, lastAt: 5 })
  })
})

describe('UsageCard', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })
  it('hodisalar darhol körinadi, foiz hisoblanadi, tozalaş işlaydi', () => {
    render(<UsageCard />)
    expect(screen.getByTestId('usage-quick').textContent).toContain('—')
    act(() => {
      trackUsage('quick', 'started', 1)
      trackUsage('quick', 'started', 2)
      trackUsage('quick', 'finished', 3)
    })
    const row = screen.getByTestId('usage-quick')
    expect(row.textContent).toMatch(/2\s*1\s*50%/)
    fireEvent.click(screen.getByRole('button', { name: 'Tozalaş' }))
    expect(screen.getByTestId('usage-quick').textContent).toContain('—')
    act(() => clearUsage())
  })
})
