/**
 * Server bilan sinxronlash — soxta (in-memory) Supabase bilan.
 *
 * ESKI BUG'lar:
 *  1) har "sinxronizatsiya" faqat navbat boshidagi 80 ta yozuvni yuborardi va
 *     tugma navbat tartibini qayta tiklagani uchun qolganlari HECH QACHON
 *     serverga yetmasdi;
 *  2) serverdan hech narsa o'qilmasdi — qayta kirganda progress noldan edi.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/supabase')>()
  const fake = await import('./fakeSupabase')
  return { ...real, supabaseConfigured: true, getSupabase: () => fake.client }
})

import { server } from './fakeSupabase'
import { deleteRemoteData, pullRemote, queueAllData, syncNow, toQueueItems } from '../lib/sync'
import { loadQueue } from '../lib/storage'
import { mergeRemote } from '../lib/merge'
import { analyzeSpeaking, analyzeWriting } from '../lib/analyze'
import { a1 } from '../content'
import { emptyData, type AppData } from '../lib/types'

const UID = 'u-test'

function withAttempts(base: AppData, n: number): AppData {
  const attempts = Array.from({ length: n }, (_, i) => ({
    id: `att-${i + 1}`,
    exerciseId: 'a1-ex-g1-01',
    skill: 'grammar' as const,
    level: 'A1' as const,
    correct: i % 3 !== 0,
    partial: i % 3 !== 0 ? 1 : 0,
    difficulty: 1,
    secondsSpent: 10,
    source: 'practice' as const,
    answerGiven: 'am',
    at: Date.UTC(2026, 10, 1, 9, 0, i),
  }))
  return { ...base, attempts }
}

/** Ilovaning barcha qismlari to'ldirilgan holat — server orqali qaytishi kerak. */
function richData(uid: string): AppData {
  const base = withAttempts(emptyData(uid), 3)
  const task = a1.writing[0]!
  const writingText = 'Hello! My name is Aziz. I am a student. I like my school because my teacher is kind.'
  const transcript = 'I go to school every day and I learn English words. I can read. I like it because it is fun.'
  return {
    ...base,
    settings: { ...base.settings, dailyMinutes: 120, examDate: '2026-12-01', theme: 'dark', aiEnabled: false, motionEnabled: false, targetLevel: 'B2' },
    srs: {
      'a1-v1-hello': { learnedAt: Date.UTC(2026, 10, 1), dueAt: Date.UTC(2026, 10, 4), intervalDays: 3, ease: 2.6, reps: 2, lapses: 0, lastReviewedAt: Date.UTC(2026, 10, 1, 12) },
      'gl-orchard': { learnedAt: null, dueAt: Date.UTC(2026, 10, 1, 12, 10), intervalDays: 0, ease: 2.18, reps: 1, lapses: 1, lastReviewedAt: Date.UTC(2026, 10, 1, 12) },
    },
    activity: {
      '2026-11-01': { date: '2026-11-01', seconds: 1500, attempts: 3, correct: 2, newWords: 1, reviewedWords: 1, skills: { grammar: 900, reading: 600 } },
      '2026-11-02': { date: '2026-11-02', seconds: 300, attempts: 0, correct: 0, newWords: 0, reviewedWords: 0, skills: { writing: 300 } },
    },
    writing: [
      { id: 'wr-1', taskId: task.id, text: writingText, wordCount: 18, secondsSpent: 240, analysis: analyzeWriting(writingText, task), supersedesId: null, createdAt: Date.UTC(2026, 10, 2, 10) },
    ],
    speaking: [
      { id: 'sp-1', taskId: 'a1-s1-01', audioBlobStored: false, durationSec: 40, transcript, transcriptionEngine: 'browser-speech', analysis: analyzeSpeaking(transcript, 40, { minSeconds: 30, targetSeconds: 60 }), textAnswer: null, createdAt: Date.UTC(2026, 10, 2, 11) },
    ],
    mockAttempts: [
      {
        id: 'mx-1',
        examId: 'a1-mock-exam',
        sections: [
          { sectionId: 'a1-mock-reading', skill: 'reading', answered: 4, total: 4, score: 75, startedAt: Date.UTC(2026, 10, 2, 12), finishedAt: Date.UTC(2026, 10, 2, 12, 10), secondsUsed: 600, exerciseResults: { 'a1-mock-r-01': { correct: true, given: 'True' } } },
        ],
        totalScore: 75,
        speakingAdvisory: 'maşq',
        completedAt: Date.UTC(2026, 10, 2, 13),
      },
    ],
    xp: 150,
    path: { completedDays: ['a1-day-01'], passedTests: { 'a1-test-day-01': 80 }, currentDayId: 'a1-day-02' },
    diagnostic: { at: Date.UTC(2026, 10, 1, 8), level: 'A1', labelUz: 'Diagnostika natijasi: A1.', confidence: 0.6 },
    onboardedAt: Date.UTC(2026, 10, 1, 8, 5),
  }
}

beforeEach(() => {
  localStorage.clear()
  server.reset(UID)
})

describe('syncNow — bitta sinxron butun navbatni yuboradi', () => {
  it('202 ta yozuv bir marta bosişda serverga yetadi va navbat böşaydi (eski: faqat 80 ta)', async () => {
    const data = withAttempts(emptyData(UID), 200)
    const total = toQueueItems(data).length
    expect(await queueAllData(data)).toBe(total)
    const res = await syncNow(UID)
    expect(res).toMatchObject({ ok: true, done: total, failed: 0, rejected: 0 })
    expect(await loadQueue(UID)).toHaveLength(0)
    expect(server.rows('exercise_attempts')).toHaveLength(200)
    // Jadval bo'yicha bulk so'rovlar: sozlamalar + reja + 2 × 100 urinish
    // + haftalik XP (liga — 0004 migration, 2026-11-07)
    expect(server.calls.filter((c) => c.op === 'upsert')).toHaveLength(5)
  })

  it('serverda bor yozuvlar qayta yuborilmaydi — faqat özgargani', async () => {
    const data = withAttempts(emptyData(UID), 120)
    await queueAllData(data)
    await syncNow(UID)
    expect(await queueAllData(data)).toBe(0)
    const changed = { ...data, settings: { ...data.settings, dailyMinutes: 120 } }
    expect(await queueAllData(changed)).toBe(1)
    expect((await syncNow(UID)).done).toBe(1)
    expect(server.rows('user_settings')[0]?.daily_minutes).toBe(120)
  })

  it('bitta yaroqsiz qator butun bölakni yiqitmaydi — faqat özi rad etiladi', async () => {
    server.failRow = (table, r) => (table === 'exercise_attempts' && r.id === 'att-7' ? '23514' : null)
    const data = withAttempts(emptyData(UID), 30)
    const total = toQueueItems(data).length
    await queueAllData(data)
    const res = await syncNow(UID)
    expect(res).toMatchObject({ ok: false, done: total - 1, rejected: 1, failed: 0 })
    expect(res.reasonUz).toContain('qabul qilmadi')
    expect(server.rows('exercise_attempts')).toHaveLength(29)
  })

  it('tarmoq uzilsa yozuvlar navbatda qoladi va ortiqça sörov yuborilmaydi', async () => {
    server.network = true
    const data = withAttempts(emptyData(UID), 150)
    const total = toQueueItems(data).length
    await queueAllData(data)
    const res = await syncNow(UID)
    expect(res).toMatchObject({ ok: false, done: 0, failed: total })
    expect(await loadQueue(UID)).toHaveLength(total)
    expect(server.calls).toHaveLength(1)

    server.network = false
    expect(await syncNow(UID)).toMatchObject({ ok: true, done: total })
    expect(await loadQueue(UID)).toHaveLength(0)
  })
})

describe('pullRemote — serverdagi progress qayta tiklanadi', () => {
  it('serverga yozilgan holat böş qurilmada töliq qaytadi', async () => {
    const rich = richData(UID)
    await queueAllData(rich)
    expect((await syncNow(UID)).ok).toBe(true)

    const pulled = await pullRemote(UID)
    expect(pulled.ok).toBe(true)
    const restored = mergeRemote(emptyData(UID), pulled.snapshot!)
    expect(restored.settings).toEqual(rich.settings)
    expect(restored.attempts).toEqual(rich.attempts)
    expect(restored.srs).toEqual(rich.srs)
    expect(restored.activity).toEqual(rich.activity)
    expect(restored.writing).toEqual(rich.writing)
    expect(restored.speaking).toEqual(rich.speaking)
    expect(restored.mockAttempts).toEqual(rich.mockAttempts)
    expect(restored.path).toEqual(rich.path)
    expect(restored.xp).toBe(rich.xp)
    expect(restored.diagnostic).toEqual(rich.diagnostic)
    expect(restored.onboardedAt).toBe(rich.onboardedAt)
  })

  it('boşqa foydalanuvçining sessiyasi bilan öqilmaydi', async () => {
    server.reset('someone-else')
    const res = await pullRemote(UID)
    expect(res.ok).toBe(false)
    expect(res.snapshot).toBeNull()
    expect(server.calls).toHaveLength(0)
  })

  it('tarmoq xatosida snapshot qaytmaydi (yarim ma’lumot birlaştirilmaydi)', async () => {
    server.network = true
    const res = await pullRemote(UID)
    expect(res).toMatchObject({ ok: false, snapshot: null })
  })
})

/* ------------------- baza ESKI sxemada (2026-11-08 holati) -------------------
 * `scripts/check_supabase_schema.py` jonli bazada o'lchadi: `0003_motion.sql` va
 * `0004_weekly_xp.sql` qo'llanmagan edi — `weekly_xp` → 404 PGRST205,
 * `user_settings.motion_enabled / xp_goal_xp / hearts_enabled` → yo'q ustun.
 * Bu testlar xuddi shu javoblarni soxtalashtiradi (`server.missingColumns` /
 * `server.missingTables`) va talab qiladi: ma'lumot yetib boradi, sabab ochiq
 * aytiladi, migratsiyadan keyin hamma o'zi tuzatiladi.
 */
describe('syncNow — baza eski sxemada (0003 / 0004 migratsiyalari qöllanmagan)', () => {
  it('sozlamalar eski bazaga ham yoziladi: rad etilgan ustunlar tuşiriladi, sabab oçiq', async () => {
    server.missingColumns = { user_settings: ['motion_enabled', 'xp_goal_xp', 'hearts_enabled'] }
    const data = withAttempts(emptyData(UID), 1)
    const total = toQueueItems(data).length
    await queueAllData(data)
    const res = await syncNow(UID)
    // Yozuv RAD ETILMADI — yetib bordi, faqat 3 ustun tushib qoldi.
    expect(res).toMatchObject({ ok: true, done: total, failed: 0, rejected: 0 })
    const row = server.rows('user_settings')[0]!
    expect(row.daily_minutes).toBe(data.settings.dailyMinutes)
    for (const col of ['motion_enabled', 'xp_goal_xp', 'hearts_enabled']) expect(row, col).not.toHaveProperty(col)
    // Sabab konkret aytiladi — migratsiya fayli va ustun nomlari.
    expect(res.reasonUz).toContain('0003_motion.sql')
    expect(res.reasonUz).toContain('0004_weekly_xp.sql')
    expect(res.reasonUz).toContain('motion_enabled')
    expect(res.reasonUz).toContain('SQL Editor')
  })

  it('migratsiya qöllanilsa tuşirilgan ustunlar özi qayta yuboriladi (iz — yuborilgan qator böyiça)', async () => {
    server.missingColumns = { user_settings: ['motion_enabled', 'xp_goal_xp', 'hearts_enabled'] }
    const data = withAttempts(emptyData(UID), 1)
    await queueAllData(data)
    await syncNow(UID)
    // Iz HAQIQIY yuborilgan (qisqartirilgan) qator bo'yicha — shuning uchun
    // holat o'zgarmasa ham qator qayta navbatga tushadi.
    expect(await queueAllData(data)).toBe(1)
    server.missingColumns = {} // migratsiya bajarildi
    expect(await syncNow(UID)).toMatchObject({ ok: true, done: 1, failed: 0 })
    const row = server.rows('user_settings')[0]!
    expect(row).toHaveProperty('motion_enabled', data.settings.motionEnabled)
    expect(row).toHaveProperty('xp_goal_xp')
    expect(row).toHaveProperty('hearts_enabled', data.settings.heartsEnabled)
  })

  it('weekly_xp jadvali bölmasa yozuv navbatda qoladi va migratsiyadan keyin özi yetib boradi', async () => {
    server.missingTables = ['weekly_xp']
    const data = withAttempts(emptyData(UID), 1)
    const total = toQueueItems(data).length
    await queueAllData(data)
    const res = await syncNow(UID)
    expect(res).toMatchObject({ ok: false, done: total - 1, failed: 1, rejected: 0 })
    expect(res.reasonUz).toContain('weekly_xp')
    expect(res.reasonUz).toContain('0004_weekly_xp.sql')
    // Qator NAVBATDA — izi yozilmagani uchun keyingi sinxron uni qayta yuboradi.
    expect((await loadQueue(UID)).map((x) => x.table)).toEqual(['weekly_xp'])
    // Boshqa yozuvlar (sozlamalar, reja, urinish) to'liq yetdi.
    expect(await loadQueue(UID)).toHaveLength(1)
    expect(server.rows('weekly_xp')).toHaveLength(0)

    server.missingTables = [] // migratsiya bajarildi
    const again = await syncNow(UID)
    expect(again).toMatchObject({ ok: true, done: 1, failed: 0 })
    expect(await loadQueue(UID)).toHaveLength(0)
    expect(server.rows('weekly_xp')).toHaveLength(1)
  })

  it('boşqa jadvaldagi nomlanmagan ustun xatosi yozuvni jimgina yöqotmaydi (rad etiladi)', async () => {
    // PostgREST matni BIZNI ustunni aytmaydi → mijoz hech narsani tushirmaydi,
    // yozuv rad etilgan deb ochiq sanaladi (silqitib yuborish YO'Q).
    server.failRow = (table) =>
      table === 'user_settings'
        ? { code: 'PGRST204', message: "Could not find the 'quantum_mode' column of 'public.user_settings' in the schema cache" }
        : null
    const data = withAttempts(emptyData(UID), 1)
    await queueAllData(data)
    const res = await syncNow(UID)
    expect(res).toMatchObject({ ok: false, rejected: 1, failed: 0 })
    expect(res.reasonUz).toContain('qabul qilmadi')
    expect(res.reasonUz).not.toContain('migratsiya')
    expect(server.rows('user_settings')).toHaveLength(0)
  })
})

describe('pullRemote — eski bazada liga öqilmasa ham progress qaytadi', () => {
  it('weekly_xp yöq bölsa ham ok: true — liga snapşoti eski holatida qoladi', async () => {
    const rich = { ...richData(UID), profileName: 'Aziz' }
    await queueAllData(rich)
    expect((await syncNow(UID)).ok).toBe(true)
    server.missingTables = ['weekly_xp']
    const res = await pullRemote(UID)
    expect(res.ok).toBe(true)
    const fresh = mergeRemote(emptyData(UID), res.snapshot!)
    expect(fresh.attempts).toEqual(rich.attempts)
    expect(fresh.settings).toEqual(rich.settings)
    // Liga: o‘qib bo‘lmadi → snapshotda yo‘q, son ixtir QILINMAYDI.
    expect(res.snapshot?.league).toBeNull()
    // Eski qurilmaning ligasi (oldin o‘qilgan) aralashmaydi va yo‘qolmaydi.
    const withLeague = {
      ...rich,
      game: { ...rich.game, league: { weekStart: '2026-11-02', leagueId: 'bronze', rank: 4, boardSize: 2, at: Date.UTC(2026, 10, 4), entries: [{ userId: 'a', name: 'A', xp: 10 }], prizeClaimed: true } },
    }
    expect(mergeRemote(withLeague, res.snapshot!).game.league).toEqual(withLeague.game.league)
  })

  it('profiles qatori bölmasa ham öqiş yiqilmaydi (ism ixtir qilinmaydi)', async () => {
    await queueAllData(richData(UID))
    await syncNow(UID)
    server.missingTables = ['profiles']
    const res = await pullRemote(UID)
    expect(res.ok).toBe(true)
    expect(res.snapshot?.profileName).toBe('')
  })
})

describe('deleteRemoteData — serverdagi şaxsiy yozuvlar öçiriladi', () => {
  it('barça şaxsiy jadvallar tozalanadi, boşqa foydalanuvçiniki qoladi', async () => {
    await queueAllData(richData(UID))
    await syncNow(UID)
    server.tables.get('exercise_attempts')?.set('other', { id: 'other', user_id: 'someone-else' })
    expect(server.rows('writing_submissions')).toHaveLength(1)

    expect(await deleteRemoteData(UID)).toEqual({ ok: true, reasonUz: null })
    for (const t of ['exercise_attempts', 'user_vocabulary', 'daily_activity', 'writing_submissions', 'speaking_sessions', 'mock_exam_attempts', 'learning_plans', 'user_settings']) {
      expect(server.rows(t).filter((r) => r.user_id === UID), t).toHaveLength(0)
    }
    expect(server.rows('exercise_attempts')).toEqual([{ id: 'other', user_id: 'someone-else' }])
    // Keyingi kirishda tiklanadigan narsa qolmaydi
    const pulled = await pullRemote(UID)
    expect(pulled.snapshot?.attempts).toEqual([])
  })

  it('weekly_xp jadvali bazada bölmasa ham öçiriş bajariladi (eski: tugma butunlay işlamasdi)', async () => {
    // ESKI BUG: `weekly_xp` yo'q bazada DELETE 404 PGRST205 berardi va
    // "Barcha ma'lumotni o'chirish" AMALNI TO'XTATARDI — foydalanuvchi
    // ma'lumotini o'chira olmasdi. Jadval yo'q bo'lsa o'chiriladigan yozuv
    // ham yo'q: o'tkazib yuboriladi, sababi halol aytiladi.
    await queueAllData(richData(UID))
    await syncNow(UID)
    expect(server.rows('writing_submissions')).toHaveLength(1)
    server.missingTables = ['weekly_xp']
    const res = await deleteRemoteData(UID)
    expect(res.ok).toBe(true)
    expect(res.reasonUz).toContain('0004_weekly_xp.sql')
    expect(res.reasonUz).toContain('öçirildi')
    for (const t of ['exercise_attempts', 'user_settings', 'writing_submissions']) {
      expect(server.rows(t).filter((r) => r.user_id === UID), t).toHaveLength(0)
    }
  })

  it('tarmoq xatosida ok: false — çaqiruvçi qurilmadagi ma’lumotni öçirmasligi uçun', async () => {
    server.network = true
    const res = await deleteRemoteData(UID)
    expect(res.ok).toBe(false)
    expect(res.reasonUz).toBeTruthy()
  })
})
