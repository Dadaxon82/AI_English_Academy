import { describe, expect, it } from 'vitest'
import { getBundle } from '../content'
import { reducer } from '../lib/store'
import {
  JUMP_ITEMS_PER_DAY,
  JUMP_PASS_SCORE,
  SECTION_PLAN,
  buildSections,
  jumpKey,
  jumpTestExercises,
  skippedDaysFor,
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
  it('yangi foydalanuvchi: A1.1 joriy, A1.2 qulflangan, qolganlari bo‘sh', () => {
    const cards = buildSections(emptyData('u'))
    expect(cards.map((c) => c.status)).toEqual(['current', 'locked', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    expect(cards[0]!.daysDone).toBe(0)
    expect(cards[1]!.canJump).toBe(true)
    expect(cards[2]!.canJump).toBe(false)
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
