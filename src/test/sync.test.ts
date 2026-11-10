import { beforeEach, describe, expect, it } from 'vitest'
import { dedupeKey, enqueue, enqueueMany, loadQueue, migrate, updateQueue } from '../lib/storage'
import { toQueueItems } from '../lib/sync'
import { emptyData, todayKey } from '../lib/types'

const UID = 'u-1'

describe('Sinxronlaş payload — PostgREST ustun nomlari (snake_case)', () => {
  const data = {
    ...emptyData(UID),
    settings: {
      ...emptyData(UID).settings,
      dailyMinutes: 120,
      examDate: '2026-12-01',
      theme: 'dark' as const,
      aiEnabled: false,
      motionEnabled: false,
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
    // Harakat holati ham yuboriladi (`0003_motion.sql` ustuni) — aksi holda
    // telefondagi "harakat o'chirilgan" tanlovi brauzerga yetmasdi.
    expect(p.motion_enabled).toBe(false)
    // Eski bug: `...data.settings` camelCase maydonlarni olib kelardi
    for (const camel of ['dailyMinutes', 'currentLevel', 'targetLevel', 'aiEnabled', 'examDate', 'motionEnabled']) {
      expect(p).not.toHaveProperty(camel)
    }
  })

  it('harakat standart holati ham yuboriladi (yoqilgan → true)', () => {
    const p = toQueueItems(emptyData(UID))
      .find((i) => i.table === 'user_settings')!
      .payload as Record<string, unknown>
    expect(p.motion_enabled).toBe(true)
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

  it('barça personal jadvallarda user_id bor (RLS with check)', () => {
    for (const it of items) {
      const p = it.payload as Record<string, unknown>
      expect(p.user_id, `${it.table} user_id’i yöq`).toBe(UID)
    }
  })

  it('öquv yöli va XP diagnostikasiz ham `plan` ustunida yuboriladi', () => {
    const d = {
      ...emptyData(UID),
      xp: 42,
      path: { completedDays: ['a1-day-01'], passedTests: { 'a1-test-day-01': 80 }, currentDayId: 'a1-day-02' },
    }
    const p = toQueueItems(d).find((i) => i.table === 'learning_plans')?.payload as Record<string, unknown>
    expect(p).toBeTruthy()
    expect(p.diagnostic_level).toBeNull()
    // O'yin qatlami (2026-11-07): plan ichida `badges` va `game` ham yuboriladi.
    // `game.league` ataylab null — liga tablosi (`weekly_xp`) alohida o'qiladi.
    // O'z-o'zini baholash (2026-11-08): `selfAssessment` ham plan ichida.
    expect(p.plan).toEqual({
      path: d.path,
      xp: 42,
      diagnostic: null,
      onboardedAt: null,
      badges: d.badges,
      selfAssessment: {},
      game: { ...d.game, league: null },
    })
  })
})

describe('migrate — onboarding belgisi (`onboardedAt`) eski keşda', () => {
  it('diagnostikasi yoki maşq tarixi bor foydalanuvçi onboardinğdan ötgan hisoblanadi', () => {
    const base = emptyData(UID)
    const legacy = (extra: Record<string, unknown>) => {
      const raw: Record<string, unknown> = { ...base, ...extra }
      delete raw.onboardedAt
      return migrate(raw as unknown as typeof base)
    }
    expect(legacy({}).onboardedAt).toBeNull()
    expect(legacy({ diagnostic: { at: 5, level: 'A1', labelUz: 'A1', confidence: 0.5 } }).onboardedAt).toBe(5)
    const attempt = { id: 'a', exerciseId: 'e', skill: 'grammar', level: 'A1', correct: true, partial: 1, difficulty: 1, secondsSpent: 1, source: 'practice', answerGiven: 'x', at: 7 }
    expect(legacy({ attempts: [attempt] }).onboardedAt).toBe(7)
  })
})

describe('Kunlik daqiqa çegarasi (DB CHECK: 30..240)', () => {
  it('eski keşdagi 15 daqiqa migratsiyada 30 ga keltiriladi', () => {
    const raw = { ...emptyData(UID), settings: { ...emptyData(UID).settings, dailyMinutes: 15 } }
    expect(migrate(raw).settings.dailyMinutes).toBe(30)
  })

  it('serverga 30 dan kam qiymat yuborilmaydi (aks holda yozuv abadiy rad etilardi)', () => {
    const d = { ...emptyData(UID), settings: { ...emptyData(UID).settings, dailyMinutes: 20 } }
    const p = toQueueItems(d).find((i) => i.table === 'user_settings')!.payload as Record<string, unknown>
    expect(p.daily_minutes).toBe(30)
  })
})

describe('Navbat deduplikati (sinxron tugmasi navbatni şişirmasin)', () => {
  beforeEach(async () => {
    await updateQueue(UID, [])
  })

  it('payload.id bölgan jadval takrorlansa — bitta yozuv qoladi', async () => {
    const item = { id: 'q1', table: 'exercise_attempts', op: 'upsert' as const, at: 1, payload: { id: 'att-1' } }
    await enqueue(UID, item)
    await enqueue(UID, { ...item, id: 'q2', at: 2 })
    const q = await loadQueue(UID)
    expect(q).toHaveLength(1)
    expect((q[0].payload as { id: string }).id).toBe('att-1')
  })

  it('payload.id BÖLMAGan jadvallar ham deduplikatlanadi (eski bug: çeksiz ösardi)', async () => {
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

  it('har xil tabiiy kalit — alohida yozuv bölib qoladi', () => {
    expect(dedupeKey('user_vocabulary', { vocabulary_id: 'a' })).not.toBe(dedupeKey('user_vocabulary', { vocabulary_id: 'b' }))
    expect(dedupeKey('daily_activity', { day: '2026-01-01' })).not.toBe(dedupeKey('daily_activity', { day: '2026-01-02' }))
    expect(dedupeKey('user_settings', {})).toBe('uk:user')
  })

  it('enqueueMany: bitta yozişda qöşadi, kalit takrorlansa oxirgisi qoladi', async () => {
    await enqueue(UID, { id: 'old', table: 'exercise_attempts', op: 'upsert', at: 0, payload: { id: 'att-2', v: 0 } })
    await enqueueMany(UID, [
      { id: 'a', table: 'exercise_attempts', op: 'upsert', at: 1, payload: { id: 'att-1', v: 1 } },
      { id: 'b', table: 'exercise_attempts', op: 'upsert', at: 2, payload: { id: 'att-2', v: 2 } },
      { id: 'c', table: 'exercise_attempts', op: 'upsert', at: 3, payload: { id: 'att-1', v: 3 } },
    ])
    const q = await loadQueue(UID)
    expect(q.map((x) => x.payload)).toEqual([
      { id: 'att-1', v: 3 },
      { id: 'att-2', v: 2 },
    ])
  })

  it('butun AppData 5 marta navbatga qöyilsa ham navbat ösmaydi', async () => {
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
