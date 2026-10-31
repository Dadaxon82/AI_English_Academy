import { beforeEach, describe, expect, it } from 'vitest'
import { dedupeKey, enqueue, loadQueue, updateQueue } from '../lib/storage'
import { toQueueItems } from '../lib/sync'
import { emptyData, todayKey } from '../lib/types'

const UID = 'u-1'

describe('Sinxronlash payload — PostgREST ustun nomlari (snake_case)', () => {
  const data = {
    ...emptyData(UID),
    settings: {
      ...emptyData(UID).settings,
      dailyMinutes: 120,
      examDate: '2026-12-01',
      theme: 'dark' as const,
      aiEnabled: false,
    },
    diagnostic: { at: Date.UTC(2026, 0, 5), level: 'A2' as const, labelUz: 'A2', confidence: 0.8 },
  }
  const items = toQueueItems(data)
  const byTable = (t: string) => items.filter((i) => i.table === t)

  it('user_settings payload’ida camelCase ustun qalmaydi (PGRST204 xatosi)', () => {
    const p = byTable('user_settings')[0]?.payload as Record<string, unknown>
    expect(p).toBeTruthy()
    expect(p.daily_minutes).toBe(120)
    expect(p.current_level).toBe('A1')
    expect(p.target_level).toBe('C1')
    expect(p.theme).toBe('dark')
    expect(p.ai_enabled).toBe(false)
    expect(p.exam_date).toBe('2026-12-01')
    // Eski bug: `...data.settings` camelCase maydonlarni olib kelardi
    for (const camel of ['dailyMinutes', 'currentLevel', 'targetLevel', 'aiEnabled', 'examDate']) {
      expect(p).not.toHaveProperty(camel)
    }
  })

  it('exercise_attempts qiyinlik (difficulty) maydonini yuboradi', () => {
    const withAttempt = {
      ...data,
      attempts: [
        {
          id: 'att-1',
          exerciseId: 'a1-ex-g1-01',
          skill: 'grammar' as const,
          level: 'A1' as const,
          correct: true,
          partial: 1,
          difficulty: 3,
          secondsSpent: 12,
          source: 'practice' as const,
          answerGiven: 'x',
          at: Date.UTC(2026, 0, 6),
        },
      ],
    }
    const p = toQueueItems(withAttempt)
      .filter((i) => i.table === 'exercise_attempts')[0]
      .payload as Record<string, unknown>
    expect(p.difficulty).toBe(3)
    expect(p.partial_score).toBe(1)
    expect(p.created_at).toBe(new Date(Date.UTC(2026, 0, 6)).toISOString())
  })

  it('learning_plans upsert’ida PK (id) bor — aks holda har sinxronda yangi qator', () => {
    const p = byTable('learning_plans')[0]?.payload as Record<string, unknown>
    expect(p).toBeTruthy()
    expect(typeof p.id).toBe('string')
    expect(p.id).toBe(UID)
  })

  it('barcha personal jadvallarda user_id bor (RLS with check)', () => {
    for (const it of items) {
      const p = it.payload as Record<string, unknown>
      expect(p.user_id, `${it.table} user_id’i yo‘q`).toBe(UID)
    }
  })
})

describe('Navbat deduplikati (sinxron tugmasi navbatni shishirmasin)', () => {
  beforeEach(async () => {
    await updateQueue(UID, [])
  })

  it('payload.id bo‘lgan jadval takrorlansa — bitta yozuv qoladi', async () => {
    const item = { id: 'q1', table: 'exercise_attempts', op: 'upsert' as const, at: 1, payload: { id: 'att-1' } }
    await enqueue(UID, item)
    await enqueue(UID, { ...item, id: 'q2', at: 2 })
    const q = await loadQueue(UID)
    expect(q).toHaveLength(1)
    expect((q[0].payload as { id: string }).id).toBe('att-1')
  })

  it('payload.id BO‘LMAGan jadvallar ham deduplikatlanadi (eski bug: cheksiz o‘sardi)', async () => {
    const rows = [
      { table: 'user_settings', payload: { user_id: UID, daily_minutes: 90 } },
      { table: 'user_vocabulary', payload: { user_id: UID, vocabulary_id: 'a1-v1-hello' } },
      { table: 'daily_activity', payload: { user_id: UID, day: todayKey() } },
    ] as const
    for (let i = 0; i < 4; i++)
      for (const r of rows) await enqueue(UID, { id: `q${i}-${r.table}`, table: r.table, op: 'upsert', at: i, payload: r.payload })
    const q = await loadQueue(UID)
    expect(q).toHaveLength(3)
  })

  it('har xil tabiiy kalit — alohida yozuv bo‘lib qoladi', () => {
    expect(dedupeKey('user_vocabulary', { vocabulary_id: 'a' })).not.toBe(dedupeKey('user_vocabulary', { vocabulary_id: 'b' }))
    expect(dedupeKey('daily_activity', { day: '2026-01-01' })).not.toBe(dedupeKey('daily_activity', { day: '2026-01-02' }))
    expect(dedupeKey('user_settings', {})).toBe('uk:user')
  })

  it('butun AppData 5 marta navbatga qo‘yilsa ham navbat o‘smaydi', async () => {
    const data = {
      ...emptyData(UID),
      diagnostic: { at: Date.UTC(2026, 0, 5), level: 'A1' as const, labelUz: 'A1', confidence: 0.5 },
      srs: { 'a1-v1-hello': { learnedAt: Date.UTC(2026, 0, 5), lastReviewedAt: Date.UTC(2026, 0, 5), dueAt: Date.UTC(2026, 0, 7), intervalDays: 1, ease: 2.5, reps: 1, lapses: 0 } },
      activity: { [todayKey()]: { date: todayKey(), seconds: 60, attempts: 1, correct: 1, newWords: 1, reviewedWords: 0, skills: { grammar: 60 } } },
    }
    const first = toQueueItems(data)
    for (const it of first) await enqueue(UID, { ...it, id: `${it.table}:${Math.random()}` })
    const afterOne = (await loadQueue(UID)).length
    for (let round = 0; round < 4; round++) {
      for (const it of toQueueItems(data)) await enqueue(UID, { ...it, id: `${it.table}:${Math.random()}` })
    }
    expect((await loadQueue(UID)).length).toBe(afterOne)
  })
})
