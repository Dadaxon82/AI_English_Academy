import { describe, expect, it } from 'vitest'
import { isPristine, mergeRemote, type RemoteSnapshot } from '../lib/merge'
import { initialSrsState } from '../lib/srs'
import { emptyData, type AppData, type AttemptRecord, type DayActivity } from '../lib/types'

const UID = 'u1'

const snap = (p: Partial<RemoteSnapshot> = {}): RemoteSnapshot => ({
  settings: null,
  plan: null,
  attempts: [],
  srs: {},
  activity: {},
  writing: [],
  speaking: [],
  mockAttempts: [],
  ...p,
})

const attempt = (id: string, at: number): AttemptRecord => ({
  id,
  exerciseId: 'a1-ex-g1-01',
  skill: 'grammar',
  level: 'A1',
  correct: true,
  partial: 1,
  difficulty: 1,
  secondsSpent: 5,
  source: 'practice',
  answerGiven: 'am',
  at,
})

const day = (date: string, seconds: number, skills: DayActivity['skills']): DayActivity => ({
  date,
  seconds,
  attempts: 1,
  correct: 1,
  newWords: 0,
  reviewedWords: 0,
  skills,
})

const used = (): AppData => ({ ...emptyData(UID), attempts: [attempt('a-local', 1000)] })

describe('mergeRemote — server va qurilma holatini birlaştiriş', () => {
  it('urinişlar id böyiça birlaşadi; ikki marta birlaştiriş heç narsani ikkilamaydi', () => {
    const remote = snap({ attempts: [attempt('a-remote', 500), attempt('a-local', 1000)] })
    const once = mergeRemote(used(), remote)
    const twice = mergeRemote(once, remote)
    expect(once.attempts.map((a) => a.id)).toEqual(['a-remote', 'a-local'])
    expect(twice.attempts).toEqual(once.attempts)
  })

  it('SRS: köproq takrorlangan holat ustun', () => {
    const local = { ...used(), srs: { w: { ...initialSrsState(0), reps: 1 } } }
    const remote = snap({ srs: { w: { ...initialSrsState(0), reps: 4, intervalDays: 9 } } })
    expect(mergeRemote(local, remote).srs.w?.reps).toBe(4)
    const newerLocal = { ...used(), srs: { w: { ...initialSrsState(0), reps: 5 } } }
    expect(mergeRemote(newerLocal, remote).srs.w?.reps).toBe(5)
  })

  it('kunlik faollik: maydonlar maksimumi (bir kun ikki marta öqilsa vaqt ikkilanmaydi)', () => {
    const local = { ...used(), activity: { '2026-11-01': day('2026-11-01', 600, { grammar: 600 }) } }
    const remote = snap({ activity: { '2026-11-01': day('2026-11-01', 900, { grammar: 300, reading: 600 }) } })
    const merged = mergeRemote(mergeRemote(local, remote), remote)
    expect(merged.activity['2026-11-01']?.seconds).toBe(900)
    expect(merged.activity['2026-11-01']?.skills).toEqual({ grammar: 600, reading: 600 })
  })

  it('sozlamalar: böş qurilmada serverdagisi olinadi, işlatilgan qurilmada özinikida qoladi', () => {
    const remote = snap({ settings: { dailyMinutes: 150, theme: 'dark' } })
    const fresh = emptyData(UID)
    expect(isPristine(fresh)).toBe(true)
    expect(mergeRemote(fresh, remote).settings.dailyMinutes).toBe(150)
    expect(mergeRemote(used(), remote).settings.dailyMinutes).toBe(90)
  })

  it('öquv yöli: tugatilgan kunlar birlaşadi, test ballari maksimumi, joriy kun qayta hisoblanadi', () => {
    const local = { ...used(), path: { completedDays: ['a1-day-01'], passedTests: { t1: 60 }, currentDayId: 'a1-day-02' } }
    const remote = snap({
      plan: { path: { completedDays: ['a1-day-01', 'a1-day-02'], passedTests: { t1: 90, t2: 75 }, currentDayId: 'a1-day-03' }, xp: 40 },
    })
    const merged = mergeRemote({ ...local, xp: 100 }, remote)
    expect(merged.path.completedDays).toEqual(['a1-day-01', 'a1-day-02'])
    expect(merged.path.passedTests).toEqual({ t1: 90, t2: 75 })
    expect(merged.path.currentDayId).toBe('a1-day-03')
    expect(merged.xp).toBe(100)
  })

  it('diagnostika: yangiroği ustun', () => {
    const older = { at: 1, level: 'A1' as const, labelUz: 'eski', confidence: 0.4 }
    const newer = { at: 2, level: 'A2' as const, labelUz: 'yangi', confidence: 0.6 }
    expect(mergeRemote({ ...used(), diagnostic: older }, snap({ plan: { diagnostic: newer } })).diagnostic).toEqual(newer)
    expect(mergeRemote({ ...used(), diagnostic: newer }, snap({ plan: { diagnostic: older } })).diagnostic).toEqual(newer)
  })

  it('onboarding: istalgan qurilmada yakunlangan bölsa yetarli (eng birinçisi saqlanadi)', () => {
    expect(mergeRemote(used(), snap({ plan: { onboardedAt: 50 } })).onboardedAt).toBe(50)
    expect(mergeRemote({ ...used(), onboardedAt: 40 }, snap({ plan: { onboardedAt: 50 } })).onboardedAt).toBe(40)
    expect(mergeRemote({ ...used(), onboardedAt: 40 }, snap()).onboardedAt).toBe(40)
    // Onboarding'dan o'tgan qurilma "bo'sh" hisoblanmaydi — sozlamalari server bilan bosilmaydi.
    expect(isPristine({ ...emptyData(UID), onboardedAt: 1 })).toBe(false)
  })

  it('serverda heç narsa bölmasa qurilmadagi holat özgarmaydi', () => {
    const local = { ...used(), xp: 12, activity: { '2026-11-01': day('2026-11-01', 60, { grammar: 60 }) } }
    const merged = mergeRemote(local, snap())
    expect(merged.attempts).toEqual(local.attempts)
    expect(merged.activity).toEqual(local.activity)
    expect(merged.xp).toBe(12)
    expect(merged.settings).toEqual(local.settings)
  })
})
