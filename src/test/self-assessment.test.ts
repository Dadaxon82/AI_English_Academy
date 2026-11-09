import { describe, expect, it } from 'vitest'
import { CAN_DO, canDoFor } from '../content/canDo'
import { CEFR_LEVELS } from '../content/types'
import { mergeSelfAssessment } from '../lib/merge'
import { reducer } from '../lib/reducer'
import { rowsToSnapshot, toQueueItems } from '../lib/sync'
import { emptyData } from '../lib/types'

describe('CEFR da’volari', () => {
  it('har daraja uchun 6 ta da’vo — har ko‘nikmadan bittadan, id noyob', () => {
    for (const l of CEFR_LEVELS) {
      const items = canDoFor(l)
      expect(items.length, l).toBe(6)
      expect(new Set(items.map((s) => s.skill)).size, l).toBe(6)
    }
    expect(new Set(CAN_DO.map((s) => s.id)).size).toBe(CAN_DO.length)
  })
})

describe('O‘z-o‘zini baholash — reducer', () => {
  it('1–5 baho saqlanadi va daraja/XP o‘zgarmaydi', () => {
    const s0 = emptyData('u')
    const s1 = reducer(s0, { type: 'self-assess', id: 'cd-a1-speak', score: 4, at: 100 })
    expect(s1.selfAssessment['cd-a1-speak']).toEqual({ score: 4, at: 100 })
    expect(s1.settings.currentLevel).toBe(s0.settings.currentLevel)
    expect(s1.xp).toBe(s0.xp)
  })
  it('chegaradan tashqari baho rad etiladi', () => {
    const s0 = emptyData('u')
    for (const score of [0, 6, 2.5]) expect(reducer(s0, { type: 'self-assess', id: 'x', score, at: 1 })).toBe(s0)
  })
})

describe('O‘z-o‘zini baholash — sinxron', () => {
  it('birlashtirishda har da’vo bo‘yicha eng keyingi baho qoladi', () => {
    const merged = mergeSelfAssessment({ a: { score: 2, at: 10 }, b: { score: 5, at: 50 } }, { a: { score: 4, at: 20 }, b: { score: 1, at: 30 }, c: { score: 3, at: 5 } })
    expect(merged).toEqual({ a: { score: 4, at: 20 }, b: { score: 5, at: 50 }, c: { score: 3, at: 5 } })
  })
  it('serverga plan.selfAssessment bilan yuboriladi', () => {
    const d = { ...emptyData('u'), selfAssessment: { 'cd-a1-read': { score: 3, at: 7 } } }
    const plan = toQueueItems(d).find((q) => q.table === 'learning_plans')
    expect(JSON.stringify(plan)).toContain('cd-a1-read')
  })
  it('serverdan o‘qishda yaroqsiz baholar tashlab yuboriladi', () => {
    const snap = rowsToSnapshot({
      settings: null,
      plan: { plan: { selfAssessment: { ok: { score: 5, at: 1 }, bad: { score: 9, at: 1 }, worse: { score: 2 }, junk: 'x' } } },
      attempts: [],
      vocabulary: [],
      activity: [],
      writing: [],
      speaking: [],
      mocks: [],
    })
    expect(snap.plan?.selfAssessment).toEqual({ ok: { score: 5, at: 1 } })
  })
})
