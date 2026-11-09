/**
 * «5 daqiqa» tezkor sessiya — sof qoidalar va zanjir (streak) bilan bog'liqligi.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBundle } from '../content'
import type { VocabularyItem } from '../content/types'
import { activeDayKeys, streakWithFreezes } from '../lib/gameCore'
import {
  QUICK_MAX_DUE,
  QUICK_NEW_WORDS,
  QUICK_SESSION_SEC,
  SWIPE_MIN_PX,
  buildQuickDeck,
  quickRemaining,
  quickSessionId,
  swipeGrade,
} from '../lib/quickSession'
import { reducer } from '../lib/reducer'
import { initialSrsState, review, type SrsState } from '../lib/srs'
import { emptyData, todayKey } from '../lib/types'

const T0 = Date.UTC(2026, 10, 9, 9, 0, 0)
const DAY = 86_400_000
const pool: VocabularyItem[] = getBundle('A1').vocab

/** So'zni "o'rganilgan, muddati `dueAt`" holatiga keltirish. */
function learned(dueAt: number, lapses = 0): SrsState {
  return { ...review(initialSrsState(T0 - 5 * DAY), 'good', T0 - 5 * DAY), dueAt, lapses }
}

describe('buildQuickDeck — kartalar tartibi', () => {
  it('avval muddati kelgan takrorlar (xato qilinganlar birinchi), keyin bitta mavzudan yangi so‘zlar', () => {
    const [a, b, c] = pool
    const srs: Record<string, SrsState> = {
      [a!.id]: learned(T0 - 1000),
      [b!.id]: learned(T0 - 500, 2), // xato qilingan — birinchi
      [c!.id]: learned(T0 + DAY), // muddati kelmagan — kirmaydi
    }
    const deck = buildQuickDeck(pool, srs, T0)
    expect(deck.cards.slice(0, 2).map((x) => x.item.id)).toEqual([b!.id, a!.id])
    expect(deck.dueCount).toBe(2)
    expect(deck.cards.some((x) => x.item.id === c!.id)).toBe(false)
    const fresh = deck.cards.filter((x) => x.isNew)
    expect(fresh.length).toBe(QUICK_NEW_WORDS)
    expect(deck.newCount).toBe(QUICK_NEW_WORDS)
    // Yangi so'zlar BITTA mavzudan va SRS'da yozuvi yo'q.
    expect(new Set(fresh.map((x) => x.item.topic)).size).toBe(1)
    expect(fresh[0]!.item.topic).toBe(deck.newTopic)
    expect(fresh.every((x) => srs[x.item.id] === undefined)).toBe(true)
  })

  it('takrorlar soni chegaralanadi', () => {
    const srs = Object.fromEntries(pool.map((v) => [v.id, learned(T0 - 1)]))
    const deck = buildQuickDeck(pool, srs, T0)
    expect(deck.dueCount).toBe(Math.min(QUICK_MAX_DUE, pool.length))
    expect(deck.newCount).toBe(0)
    expect(deck.newTopic).toBeNull()
  })

  it('hammasi o‘rganilgan va muddati kelmagan bo‘lsa — bo‘sh (soxta karta yo‘q)', () => {
    const srs = Object.fromEntries(pool.map((v) => [v.id, learned(T0 + DAY)]))
    const deck = buildQuickDeck(pool, srs, T0)
    expect(deck.cards).toEqual([])
  })

  it('havuzda takrorlangan so‘z bitta karta bo‘ladi', () => {
    const one = pool[0]!
    const deck = buildQuickDeck([one, one], {}, T0)
    expect(deck.cards.length).toBe(1)
  })
})

describe('swipeGrade / quickRemaining', () => {
  it('o‘ngga — Bilaman, chapga — Yana, yetarli masofa bo‘lmasa — hech narsa', () => {
    expect(swipeGrade(SWIPE_MIN_PX, 200)).toBe('good')
    expect(swipeGrade(-SWIPE_MIN_PX, 200)).toBe('again')
    expect(swipeGrade(SWIPE_MIN_PX - 1, 200)).toBeNull()
    // Keng kartada chegara enining 25% i.
    expect(swipeGrade(100, 600)).toBeNull()
    expect(swipeGrade(150, 600)).toBe('good')
    expect(swipeGrade(Number.NaN, 200)).toBeNull()
  })

  it('qolgan vaqt manfiy bo‘lmaydi', () => {
    expect(quickRemaining(0)).toBe(QUICK_SESSION_SEC)
    expect(quickRemaining(120.9)).toBe(QUICK_SESSION_SEC - 120)
    expect(quickRemaining(QUICK_SESSION_SEC + 50)).toBe(0)
  })
})

describe('5 daqiqalik sessiya kunlik faollikka yoziladi va zanjirni saqlaydi', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 9, 9, 0, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('taymer → 5 daqiqa → to‘xtatish: bugun faol kun, zanjir ≥ 1', () => {
    const today = todayKey()
    let s = emptyData('u-quick')
    s = reducer(s, { type: 'timer-start', sessionId: quickSessionId(today), skill: 'vocabulary' })
    vi.setSystemTime(new Date(2026, 10, 9, 9, 5, 0))
    s = reducer(s, { type: 'timer-stop' })
    expect(s.activity[today]?.seconds).toBe(QUICK_SESSION_SEC)
    expect(s.activity[today]?.skills.vocabulary).toBe(QUICK_SESSION_SEC)
    expect(activeDayKeys(s)).toContain(today)
    expect(streakWithFreezes(s, today)).toBeGreaterThanOrEqual(1)
    // Kunlik reja sozlamasi o'zgarmaydi.
    expect(s.settings.dailyMinutes).toBe(90)
  })

  it('sessiya kaliti kunga bog‘liq', () => {
    expect(quickSessionId('2026-11-09')).toBe('quick-2026-11-09')
  })
})

describe('buildQuickDeck — yangi so‘zlar havuzi', () => {
  it('newPool berilsa yangi so‘zlar faqat undan olinadi, takrorlar esa butun havuzdan', () => {
    const main = pool.slice(0, 20)
    const extra = pool.slice(20, 40).map((v) => ({ ...v, id: `g-${v.id}`, topic: 'matndan olingan' }))
    const savedExtra = extra[0]!
    const srs: Record<string, SrsState> = { [savedExtra.id]: learned(T0 - 1) }
    const deck = buildQuickDeck([...main, ...extra], srs, T0, { newPool: main })
    expect(deck.cards[0]!.item.id).toBe(savedExtra.id)
    const fresh = deck.cards.filter((x) => x.isNew)
    expect(fresh.length).toBeGreaterThan(0)
    expect(fresh.every((x) => main.some((m) => m.id === x.item.id))).toBe(true)
  })
})
