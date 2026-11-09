import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nowMs, secondsSince, useNow } from '../lib/clock'

describe('clock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('nowMs — joriy vaqt', () => {
    expect(nowMs()).toBe(Date.parse('2026-01-01T00:00:00Z'))
  })

  it('secondsSince — yaxlitlangan soniyalar va minimal chegara', () => {
    const start = nowMs()
    vi.advanceTimersByTime(2_400)
    expect(secondsSince(start)).toBe(2)
    expect(secondsSince(nowMs(), 1)).toBe(1)
  })

  it('useNow — intervalda yangilanadi', () => {
    const { result } = renderHook(() => useNow(1_000))
    const first = result.current
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current - first).toBe(1_000)
  })
})
