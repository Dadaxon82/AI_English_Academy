import { CEFR_LEVELS } from '../content/types'
import { describe, expect, it } from 'vitest'
import { getBundle } from '../content'
import { reducer } from '../lib/reducer'
import {
  JUMP_ITEMS_PER_DAY,
  JUMP_PASS_SCORE,
  SECTION_PLAN,
  buildSections,
  currentSectionInfo,
  jumpKey,
  jumpTestExercises,
  skippedDaysFor,
  pathLevel,
} from '../lib/sections'
import { emptyData } from '../lib/types'

const a1Days = getBundle('A1').days
const a0Days = getBundle('A0').days
const byId = (cards: ReturnType<typeof buildSections>, id: string) => cards.find((c) => c.id === id)!

describe('Bölimlar rejasi', () => {
  it('har CEFR darajasi 2 bölim: A0.1 … C1.2', () => {
    expect(SECTION_PLAN.map((s) => `${s.level}.${s.part}`)).toEqual([
      'A0.1', 'A0.2', 'A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B2.1', 'B2.2', 'C1.1', 'C1.2',
    ])
  })

  it.each(['A0', 'A1'] as const)('%s kunlari bölimlarga töliq va takrorsiz taqsimlangan', (lvl) => {
    const nums = SECTION_PLAN.filter((s) => s.level === lvl).flatMap((s) => s.dayNumbers)
    expect([...nums].sort((a, b) => a - b)).toEqual(getBundle(lvl).days.map((d) => d.dayNumber))
  })
})

describe('buildSections — holatlar', () => {
  it('yangi foydalanuvçi (A1): A0 ixtiyoriy, A1.1 joriy, qolganlari qulflangan', () => {
    const cards = buildSections(emptyData('u'))
    const expected = SECTION_PLAN.map((p) =>
      p.dayNumbers.length === 0 ? 'empty' : p.level === 'A0' ? 'optional' : p.id === 'a1-1' ? 'current' : 'locked',
    )
    expect(cards.map((c) => c.status)).toEqual(expected)
    expect(byId(cards, 'a1-1').daysDone).toBe(0)
    expect(byId(cards, 'a1-2').canJump).toBe(true)
    expect(byId(cards, 'a2-1').canJump).toBe(true)
    // Ixtiyoriy (darajadan past) bo'limga sakrash tugmasi chiqmaydi
    expect(byId(cards, 'a0-1').canJump).toBe(false)
  })

  it('noldan boşlagan (A0) öquvçi: A0.1 joriy, A1.1 qulflangan', () => {
    const d = emptyData('u')
    d.settings.currentLevel = 'A0'
    const cards = buildSections(d)
    expect(byId(cards, 'a0-1').status).toBe('current')
    expect(byId(cards, 'a1-1').status).toBe('locked')
    expect(currentSectionInfo(d)!.section.label).toBe('A0.1')
    expect(pathLevel(d)).toBe('A0')
  })

  it('A0 tugasa: A0 bölimlari yakunlangan, A1.1 joriy', () => {
    const d = emptyData('u')
    d.settings.currentLevel = 'A0'
    d.path.completedDays = a0Days.map((x) => x.id)
    const cards = buildSections(d)
    expect(byId(cards, 'a0-1').status).toBe('done')
    expect(byId(cards, 'a0-2').status).toBe('done')
    expect(byId(cards, 'a1-1').status).toBe('current')
    expect(pathLevel(d)).toBe('A1')
  })

  it('namuna ibora kontentdan olinadi (ixtiro emas)', () => {
    const card = byId(buildSections(emptyData('u')), 'a1-1')
    const vocab = getBundle('A1').vocab
    expect(card.sample).not.toBeNull()
    expect(vocab.some((v) => v.exampleEn === card.sample!.en)).toBe(true)
  })

  it('A1.1 kunlari tugasa — A1.1 yakunlangan, A1.2 joriy', () => {
    const d = emptyData('u')
    d.path.completedDays = a1Days.filter((x) => x.dayNumber <= 4).map((x) => x.id)
    const cards = buildSections(d)
    expect(byId(cards, 'a1-1').status).toBe('done')
    expect(byId(cards, 'a1-2').status).toBe('current')
  })
})

describe('Sakraş testi', () => {
  it('savollar ötkazib yuboriladigan har kundan JUMP_ITEMS_PER_DAY tadan', () => {
    const d = emptyData('u')
    const skipped = skippedDaysFor('a1-2', d)
    expect(skipped.map((x) => x.dayNumber)).toEqual([1, 2, 3, 4])
    const ex = jumpTestExercises('a1-2', d)
    expect(ex.length).toBe(skipped.reduce((n, day) => n + Math.min(JUMP_ITEMS_PER_DAY, day.sectionTest?.exercises.length ?? 0), 0))
    expect(ex.length).toBeGreaterThan(0)
  })

  it('ötilsa: oldingi kunlar oçiladi, joriy kun A1.2 boşiga ötadi, daraja özgarmaydi', () => {
    const before = emptyData('u')
    const after = reducer(before, { type: 'section-jump', sectionId: 'a1-2', score: JUMP_PASS_SCORE })
    expect(after.path.completedDays).toEqual(a1Days.filter((x) => x.dayNumber <= 4).map((x) => x.id))
    expect(after.path.currentDayId).toBe(a1Days.find((x) => x.dayNumber === 5)!.id)
    expect(after.path.passedTests[jumpKey('a1-2')]).toBe(JUMP_PASS_SCORE)
    expect(after.settings.currentLevel).toBe(before.settings.currentLevel)
    expect(byId(buildSections(after), 'a1-2').status).toBe('current')
    // A1 o'quvchisining sakrashi A0 kunlarini "bajarildi" qilmaydi
    expect(after.path.completedDays.some((id) => id.startsWith('a0-'))).toBe(false)
  })

  it('ötilmasa: kunlar özgarmaydi, faqat eng yaxşi natija yoziladi', () => {
    let s = emptyData('u')
    s = reducer(s, { type: 'section-jump', sectionId: 'a1-2', score: 60 })
    s = reducer(s, { type: 'section-jump', sectionId: 'a1-2', score: 40 })
    expect(s.path.completedDays).toEqual([])
    expect(s.path.currentDayId).toBe('a1-day-01')
    expect(s.path.passedTests[jumpKey('a1-2')]).toBe(60)
  })

  it('noma’lum bölim e’tiborsiz qoldiriladi', () => {
    const s = emptyData('u')
    expect(reducer(s, { type: 'section-jump', sectionId: 'zz-9', score: 100 })).toBe(s)
  })
})

describe('currentSectionInfo — banner', () => {
  it('yangi foydalanuvçi: A1.1, 1-kun', () => {
    const info = currentSectionInfo(emptyData('u'))!
    expect(info.section.label).toBe('A1.1')
    expect(info.unitNumber).toBe(1)
    expect(info.day.dayNumber).toBe(1)
  })

  it('A1.2 ga sakragandan keyin: A1.2, 1-kun (5-kun)', () => {
    const s = reducer(emptyData('u'), { type: 'section-jump', sectionId: 'a1-2', score: 100 })
    const info = currentSectionInfo(s)!
    expect(info.section.label).toBe('A1.2')
    expect(info.unitNumber).toBe(1)
    expect(info.day.dayNumber).toBe(5)
  })

  it('A1 tugasa: A2.1 ning 1-kuni joriy', () => {
    const d = emptyData('u')
    d.path.completedDays = a1Days.map((x) => x.id)
    const info = currentSectionInfo(d)!
    expect(info.section.label).toBe('A2.1')
    expect(info.day.dayNumber).toBe(1)
  })

  it('hamma kun tugasa: oxirgi bölimning oxirgi kuni', () => {
    const d = emptyData('u')
    d.path.completedDays = CEFR_LEVELS.flatMap((l) => getBundle(l).days).map((x) => x.id)
    const info = currentSectionInfo(d)!
    const last = [...SECTION_PLAN].reverse().find((p) => p.dayNumbers.length > 0)!
    expect(info.section.label).toBe(`${last.level}.${last.part}`)
    expect(info.day.dayNumber).toBe(7)
  })
})

describe('pathLevel — öquv yöli darajasi', () => {
  it('yangi foydalanuvçi: A1', () => {
    expect(pathLevel(emptyData('u'))).toBe('A1')
  })
  it('A1 kunlari tugasa: A2, lekin baholangan daraja A1 qoladi', () => {
    const d = emptyData('u')
    d.path.completedDays = getBundle('A1').days.map((x) => x.id)
    expect(pathLevel(d)).toBe('A2')
    expect(d.settings.currentLevel).toBe('A1')
  })
  it('A2 dan boşlagan öquvçiga A1.1 körsatilmaydi', () => {
    const d = emptyData('u')
    d.settings.currentLevel = 'A2'
    expect(pathLevel(d)).toBe('A2')
    expect(currentSectionInfo(d)!.section.label).toBe('A2.1')
  })
  it('kontentsiz (yoki eng yuqori) daraja baholangan bo‘lsa — o‘sha daraja qaytadi', () => {
    // Kontenti hali yo'q daraja bo'lsa — o'sha (yo'l «reja yo'q» deydi); hammasi tayyor bo'lsa — C1.
    const level = CEFR_LEVELS.find((l) => getBundle(l).days.length === 0) ?? 'C1'
    const d = emptyData('u')
    d.settings.currentLevel = level
    expect(pathLevel(d)).toBe(level)
  })
})
