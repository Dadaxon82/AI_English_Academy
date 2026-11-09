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

describe('Bo‘limlar rejasi', () => {
  it('har CEFR darajasi 2 bo‘lim: A1.1 … C1.2', () => {
    expect(SECTION_PLAN.map((s) => `${s.level}.${s.part}`)).toEqual([
      'A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B2.1', 'B2.2', 'C1.1', 'C1.2',
    ])
  })

  it('A1 kunlari bo‘limlarga to‘liq va takrorsiz taqsimlangan', () => {
    const nums = SECTION_PLAN.filter((s) => s.level === 'A1').flatMap((s) => s.dayNumbers)
    expect([...nums].sort((a, b) => a - b)).toEqual(a1Days.map((d) => d.dayNumber))
  })
})

describe('buildSections — holatlar', () => {
  it('yangi foydalanuvchi: A1.1 joriy, A1.2 va A2 qulflangan, kontentsizlari bo‘sh', () => {
    const cards = buildSections(emptyData('u'))
    expect(cards.map((c) => c.status)).toEqual(['current', 'locked', 'locked', 'locked', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    expect(cards[0]!.daysDone).toBe(0)
    expect(cards[1]!.canJump).toBe(true)
    expect(cards[2]!.canJump).toBe(true)
    // Kontenti yo'q bo'limga sakrash tugmasi chiqmaydi (soxta tugma yo'q)
    expect(cards[4]!.canJump).toBe(false)
  })

  it('namuna ibora kontentdan olinadi (ixtiro emas)', () => {
    const card = buildSections(emptyData('u'))[0]!
    const vocab = getBundle('A1').vocab
    expect(card.sample).not.toBeNull()
    expect(vocab.some((v) => v.exampleEn === card.sample!.en)).toBe(true)
  })

  it('A1.1 kunlari tugasa — A1.1 yakunlangan, A1.2 joriy', () => {
    const d = emptyData('u')
    d.path.completedDays = a1Days.filter((x) => x.dayNumber <= 4).map((x) => x.id)
    const cards = buildSections(d)
    expect(cards[0]!.status).toBe('done')
    expect(cards[1]!.status).toBe('current')
  })
})

describe('Sakrash testi', () => {
  it('savollar o‘tkazib yuboriladigan har kundan JUMP_ITEMS_PER_DAY tadan', () => {
    const d = emptyData('u')
    const skipped = skippedDaysFor('a1-2', d)
    expect(skipped.map((x) => x.dayNumber)).toEqual([1, 2, 3, 4])
    const ex = jumpTestExercises('a1-2', d)
    expect(ex.length).toBe(skipped.reduce((n, day) => n + Math.min(JUMP_ITEMS_PER_DAY, day.sectionTest?.exercises.length ?? 0), 0))
    expect(ex.length).toBeGreaterThan(0)
  })

  it('o‘tilsa: oldingi kunlar ochiladi, joriy kun A1.2 boshiga o‘tadi, daraja o‘zgarmaydi', () => {
    const before = emptyData('u')
    const after = reducer(before, { type: 'section-jump', sectionId: 'a1-2', score: JUMP_PASS_SCORE })
    expect(after.path.completedDays).toEqual(a1Days.filter((x) => x.dayNumber <= 4).map((x) => x.id))
    expect(after.path.currentDayId).toBe(a1Days.find((x) => x.dayNumber === 5)!.id)
    expect(after.path.passedTests[jumpKey('a1-2')]).toBe(JUMP_PASS_SCORE)
    expect(after.settings.currentLevel).toBe(before.settings.currentLevel)
    expect(buildSections(after)[1]!.status).toBe('current')
  })

  it('o‘tilmasa: kunlar o‘zgarmaydi, faqat eng yaxshi natija yoziladi', () => {
    let s = emptyData('u')
    s = reducer(s, { type: 'section-jump', sectionId: 'a1-2', score: 60 })
    s = reducer(s, { type: 'section-jump', sectionId: 'a1-2', score: 40 })
    expect(s.path.completedDays).toEqual([])
    expect(s.path.currentDayId).toBe('a1-day-01')
    expect(s.path.passedTests[jumpKey('a1-2')]).toBe(60)
  })

  it('noma’lum bo‘lim e’tiborsiz qoldiriladi', () => {
    const s = emptyData('u')
    expect(reducer(s, { type: 'section-jump', sectionId: 'zz-9', score: 100 })).toBe(s)
  })
})

describe('currentSectionInfo — banner', () => {
  it('yangi foydalanuvchi: A1.1, 1-kun', () => {
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

  it('hamma kun tugasa: oxirgi bo‘limning oxirgi kuni', () => {
    const d = emptyData('u')
    d.path.completedDays = [...a1Days, ...getBundle('A2').days].map((x) => x.id)
    const info = currentSectionInfo(d)!
    expect(info.section.label).toBe('A2.2')
    expect(info.day.dayNumber).toBe(7)
  })
})

describe('pathLevel — o‘quv yo‘li darajasi', () => {
  it('yangi foydalanuvchi: A1', () => {
    expect(pathLevel(emptyData('u'))).toBe('A1')
  })
  it('A1 kunlari tugasa: A2, lekin baholangan daraja A1 qoladi', () => {
    const d = emptyData('u')
    d.path.completedDays = getBundle('A1').days.map((x) => x.id)
    expect(pathLevel(d)).toBe('A2')
    expect(d.settings.currentLevel).toBe('A1')
  })
  it('A2 dan boshlagan o‘quvchiga A1.1 ko‘rsatilmaydi', () => {
    const d = emptyData('u')
    d.settings.currentLevel = 'A2'
    expect(pathLevel(d)).toBe('A2')
    expect(currentSectionInfo(d)!.section.label).toBe('A2.1')
  })
  it('kontenti yo‘q daraja (B1) baholangan bo‘lsa — B1 qaytadi (yo‘l “reja yo‘q” deydi)', () => {
    const d = emptyData('u')
    d.settings.currentLevel = 'B1'
    expect(pathLevel(d)).toBe('B1')
  })
})
