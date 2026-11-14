/**
 * Kontent inspektore — talabnomadagi raqamlar (7 kun, 90 daqiqa, no-dupe ID)
 * kod o'zgarsa buzilmasligini avtomatik tekshiradi.
 */
import { describe, expect, it } from 'vitest'
import { DAILY_PLAN_TOTAL, a1, getBundle, normalizeDayMinutes } from '../content'
import type { CefrLevel, LevelBundle } from '../content'

const LEVELS: CefrLevel[] = ['A1']

/** Xom (normalizatsiyagacha) kunlar — nisbatni solishtirish uchun. */
function getBundleRaw(level: CefrLevel): LevelBundle {
  return level === 'A1' ? a1 : getBundle(level)
}

describe('Kontent — kunlar va 90 daqiqalik reja', () => {
  for (const level of LEVELS) {
    const bundle = getBundle(level)

    it(`${level}: kamida 7 kun mavjud`, () => {
      expect(bundle.days.length).toBeGreaterThanOrEqual(7)
    })

    it(`${level}: har kun bo'limlari yig'indisi ANIQ ${DAILY_PLAN_TOTAL} daqiqa`, () => {
      for (const day of bundle.days) {
        const sum = day.sections.reduce((a, s) => a + s.minutes, 0)
        expect(sum, `${day.id} yig'indisi ${sum} ≠ ${DAILY_PLAN_TOTAL}`).toBe(DAILY_PLAN_TOTAL)
        for (const s of day.sections) expect(s.minutes, `${day.id}/${s.skill} manfiy yoki nol`).toBeGreaterThan(0)
      }
    })

    it(`${level}: nisbat saqlangan — kattaroq bo'lim kichigidan kam emas`, () => {
      // Normalizatsiya tartibni buzmasligi kerak: qaysi bo'lim oldin ko'proq
      // vaqt olgan bo'lsa, keyin ham kam olmagan bo'lsin.
      const raw = getBundleRaw(level).days
      for (let d = 0; d < bundle.days.length; d++) {
        const before = raw[d].sections.map((s) => s.minutes)
        const after = bundle.days[d].sections.map((s) => s.minutes)
        for (let i = 0; i < before.length; i++)
          for (let j = 0; j < before.length; j++)
            if (before[i] > before[j])
              expect(after[i], `${bundle.days[d].id}: ${bundle.days[d].sections[i].skill} ≥ ${bundle.days[d].sections[j].skill} bo'lishi kerak edi`).toBeGreaterThanOrEqual(after[j])
      }
    })
  }

  it('normalizeDayMinutes yig\'indini saqlaydi va tartibni buzmaydi', () => {
    const day = {
      id: 'x', level: 'A1' as const, dayNumber: 1, titleUz: '', goalUz: '',
      sections: [
        { skill: 'vocabulary' as const, minutes: 15, itemIds: [], titleUz: '' },
        { skill: 'grammar' as const, minutes: 25, itemIds: [], titleUz: '' },
        { skill: 'reading' as const, minutes: 20, itemIds: [], titleUz: '' },
        { skill: 'listening' as const, minutes: 20, itemIds: [], titleUz: '' },
        { skill: 'writing' as const, minutes: 20, itemIds: [], titleUz: '' },
        { skill: 'speaking' as const, minutes: 20, itemIds: [], titleUz: '' },
      ],
    }
    const out = normalizeDayMinutes(day, 90)
    expect(out.sections.reduce((a, s) => a + s.minutes, 0)).toBe(90)
    // Nisbat saqlanadi: grammar eng ko'p, vocab eng oz bo'lib qoladi
    const by = Object.fromEntries(out.sections.map((s) => [s.skill, s.minutes]))
    expect(by.grammar).toBe(Math.max(...Object.values(by)))
    expect(by.vocabulary).toBe(Math.min(...Object.values(by)))
  })

  it('IDlar takrorlanmagan (barcha kontent turlari bo\'yicha)', () => {
    for (const level of LEVELS) {
      const b = getBundle(level)
      const seen = new Set<string>()
      const groups: [string, { id: string }[]][] = [
        ['days', b.days],
        ['vocab', b.vocab],
        ['grammar', b.grammar],
        ['reading', b.reading],
        ['listening', b.listening],
        ['writing', b.writing],
        ['speaking', b.speaking],
        ['tests', b.tests],
      ]
      for (const [name, arr] of groups) {
        for (const item of arr) {
          expect(seen.has(item.id), `${name}: takroriy ID ${item.id}`).toBe(false)
          seen.add(item.id)
        }
      }
      // Mashqlar ham o'z ichida no-dupe
      const exSeen = new Set<string>()
      for (const g of b.grammar) for (const e of g.exercises) { expect(exSeen.has(e.id), `ex dupe ${e.id}`).toBe(false); exSeen.add(e.id) }
      for (const r of b.reading) for (const e of r.exercises) { if (!exSeen.has(e.id)) exSeen.add(e.id); }
    }
  })

  it('kun ID formati bitta xil (a1-day-NN) va store’dagi standartga mos', () => {
    for (const level of LEVELS) {
      for (const day of getBundle(level).days) {
        expect(day.id, `${day.id} formati noto'g'ri`).toMatch(/^(a1|a2|b1|b2|c1)-day-\d\d$/)
      }
    }
    // emptyData() standarti birinchi kunga mos kelishi shart
    // (aksi holda joriy kun topilmaydi)
    const first = getBundle('A1').days[0]
    expect(first.id).toBe('a1-day-01')
  })
})
