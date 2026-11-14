import { describe, expect, it } from 'vitest'
import { buildDayTasks, computeAllocation, daysUntil, nextDayId, skillLabelUz } from '../lib/planning'
import { DEFAULT_ALLOCATION } from '../lib/types'
import { DEFAULT_SETTINGS } from '../lib/types'
import type { SkillEvidence } from '../lib/skillScoring'
import type { Skill } from '../content/types'

/** Chorshanba — oyning kuniga bog‘liq siljish ta'sir qilmasligi uchun. */
const WED = new Date(2026, 10, 4) // 2026-11-04, chorshanba

const ev = (skill: SkillEvidence['skill'], score: number, n = 6): SkillEvidence => ({
  skill,
  score,
  evidenceCount: n,
  confidence: 0.8,
  lastAt: Date.now(),
})

describe('Kunlik reja (90 daqiqa) va moslaşuv', () => {
  it('boşlanğiç taqsimot: Vocab 10 / Grammar 15 / Reading 15 / Listening 15 / Writing 20 / Speaking 15', () => {
    const a = computeAllocation({ ...DEFAULT_SETTINGS, examDate: null }, [], WED)
    expect(a.minutes).toEqual({
      vocabulary: 10,
      grammar: 15,
      reading: 15,
      listening: 15,
      writing: 20,
      speaking: 15,
    })
    expect(a.total).toBe(90)
  })

  it('yiğindi har doim dailyMinutes ga teng (30 / 90 / 180)', () => {
    for (const m of [30, 47, 90, 120, 180]) {
      const a = computeAllocation({ ...DEFAULT_SETTINGS, dailyMinutes: m, examDate: null }, [], WED)
      expect(a.total).toBe(m)
      expect(Object.values(a.minutes).reduce((x, y) => x + y, 0)).toBe(m)
    }
  })

  it('zaif könikma köproq vaqt oladi', () => {
    const before = computeAllocation({ ...DEFAULT_SETTINGS, examDate: null }, [], WED)
    const after = computeAllocation(
      { ...DEFAULT_SETTINGS, examDate: null },
      [ev('listening', 40), ev('speaking', 45)],
      WED,
    )
    expect(after.minutes.listening).toBeGreaterThan(before.minutes.listening)
    expect(after.minutes.speaking).toBeGreaterThan(before.minutes.speaking)
    expect(after.total).toBe(90)
    expect(after.reasonUz.some((r) => r.includes('Zaif'))).toBe(true)
  })

  it('zaif könikma işonçsiz bölsa (confidence past) reja özgarmaydi', () => {
    const base = computeAllocation({ ...DEFAULT_SETTINGS, examDate: null }, [], WED)
    const shaky = computeAllocation(
      { ...DEFAULT_SETTINGS, examDate: null },
      [{ skill: 'listening', score: 20, evidenceCount: 1, confidence: 0.2, lastAt: Date.now() }],
      WED,
    )
    expect(shaky.minutes).toEqual(base.minutes)
  })

  it('imtihon yaqin bölsa Writing/Reading kuçayadi', () => {
    const exam = new Date(WED.getTime() + 10 * 86_400_000).toISOString().slice(0, 10)
    const a = computeAllocation({ ...DEFAULT_SETTINGS, examDate: exam }, [], WED)
    expect(a.minutes.writing).toBe(25)
    expect(a.minutes.reading).toBe(20)
    expect(a.total).toBe(90)
    expect(a.reasonUz.some((r) => r.includes('Imtihonga'))).toBe(true)
  })

  it('imtihon sanasi: 30 kunlik oyna çegarasi aniq va kun hisobi pagesanasi bilan bir xil', () => {
    // Kun hisobi endi `daysUntil` orqali (yarim tun oralig'i) — sahifalarda
    // ko'rsatiladigan "N kun qoldi" soni taqsimot sababi bilan kelishmay
    // qolishi mumkin emas edi.
    const late = new Date(2026, 10, 4, 23, 30)
    const exam = '2026-12-05' // 31 kun — oyna chegarasi
    const left = daysUntil(exam, late)
    expect(left).toBe(31)
    const a = computeAllocation({ ...DEFAULT_SETTINGS, examDate: exam }, [], late)
    // 31 kun → oyna tashqarisida: kuchaytirish YO‘Q, lekin sabab ham yo‘q
    expect(a.reasonUz.some((r) => r.includes('Imtihonga'))).toBe(false)
    // 30 kun ichida kirsa — ikkala hisob ham rozi
    const near = '2026-12-04'
    expect(daysUntil(near, late)).toBe(30)
    const b = computeAllocation({ ...DEFAULT_SETTINGS, examDate: near }, [], late)
    expect(b.reasonUz.some((r) => r.includes('Imtihonga'))).toBe(true)
  })

  it('kunlik minutlar manfiy yoki juda katta bölsa çegaralanadi', () => {
    expect(computeAllocation({ ...DEFAULT_SETTINGS, dailyMinutes: -10, examDate: null }, [], WED).total).toBe(30)
    expect(computeAllocation({ ...DEFAULT_SETTINGS, dailyMinutes: 1000, examDate: null }, [], WED).total).toBe(240)
  })
})

describe('Kun vazifalari va öquv yöli', () => {
  const day = {
    id: 'a1-day-1',
    sections: [
      { skill: 'vocabulary' as const, minutes: 15, itemIds: ['a1-v1-1'], titleUz: 'Yangi sözlar' },
      { skill: 'grammar' as const, minutes: 25, itemIds: ['a1-ex-g1-01'], titleUz: 'to be' },
    ],
  }

  it('buildDayTasks 6 könikma röyxatini qaytaradi va bajarilgan belgilaydi', () => {
    const alloc = computeAllocation({ ...DEFAULT_SETTINGS, examDate: null }, [], WED)
    const tasks = buildDayTasks(day, alloc, { grammar: 'a1-day-1' })
    expect(tasks).toHaveLength(6)
    expect(tasks.find((t) => t.skill === 'grammar')?.done).toBe(true)
    expect(tasks.find((t) => t.skill === 'reading')?.done).toBe(false)
    expect(tasks.find((t) => t.skill === 'reading')?.minutes).toBe(alloc.minutes.reading)
    expect(tasks.find((t) => t.skill === 'grammar')?.titleUz).toBe('to be')
  })

  it('nextDayId tugamagan kunni topadi', () => {
    const days = [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }]
    expect(nextDayId('A1', days, [])).toBe('d1')
    expect(nextDayId('A1', days, ['d1', 'd2'])).toBe('d3')
    expect(nextDayId('A1', days, ['d1', 'd2', 'd3'])).toBe('d3')
  })

  it('daysUntil', () => {
    expect(daysUntil(null)).toBeNull()
    const soon = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
    const left = daysUntil(soon)
    expect(left).not.toBeNull()
    expect(left! as number).toBeGreaterThanOrEqual(4)
    expect(left! as number).toBeLessThanOrEqual(6)
  })

  it('skillLabelUz özbekça nom beradi', () => {
    expect(skillLabelUz('vocabulary')).toBe('Luğat')
    expect(skillLabelUz('speaking')).toBe('Gapiriş')
  })
})

describe('computeAllocation — interfeys xabari haqiqiy özgarişni aks ettiradi', () => {
  it('donor yetarli bölmasa (+5/-5 bölmasa) „kuçaytirildi“ xabari çiqmaydi', () => {
    // Minimal 30 daq → har ko‘nikma 5 daqiqa, donor 5→0 ga tusholmaydi.
    const a = computeAllocation({ ...DEFAULT_SETTINGS, dailyMinutes: 30, examDate: null }, [ev('listening', 40), ev('speaking', 40)], WED)
    const changed = Object.entries(a.minutes).some(([s, m]) => m > DEFAULT_ALLOCATION[s as Skill])
    const claims = a.reasonUz.some((r) => r.includes('kuçaytirildi'))
    expect(claims).toBe(changed)
  })

  it('90 daqiqalik rejada zaif könikma haqiqatan oşadi va xabar çiqadi', () => {
    const a = computeAllocation({ ...DEFAULT_SETTINGS, dailyMinutes: 90, examDate: null }, [ev('listening', 40)], WED)
    expect(a.minutes.listening).toBeGreaterThan(15)
    expect(a.reasonUz.some((r) => r.includes('listening'))).toBe(true)
  })
})
