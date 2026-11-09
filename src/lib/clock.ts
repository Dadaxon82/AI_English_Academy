/**
 * Vaqt manbai. React render'i SOF bo'lishi kerak — `Date.now()` render
 * ichida o'qilmaydi:
 *  - render'da kerak bo'lsa: `useNow(interval)` — holat, intervalda yangilanadi
 *    (vaqtga bog'liq yozuvlar — "keyingi takror", "muddati o'tgan" — o'zi yangilanadi);
 *  - hodisa ishlovchisi / effect ichida: `nowMs()` va `secondsSince()`.
 */
import { useEffect, useState } from 'react'

export function nowMs(): number {
  return Date.now()
}

/** Boshlanish vaqtidan beri o'tgan butun soniyalar (kamida `min`). */
export function secondsSince(startMs: number, min = 0): number {
  return Math.max(min, Math.round((Date.now() - startMs) / 1000))
}

/** Joriy vaqt (ms) — `intervalMs` da bir yangilanadigan holat. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(nowMs)
  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(iv)
  }, [intervalMs])
  return now
}
