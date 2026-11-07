/**
 * O'yin qatlamining MANTIĞI testlari — `src/lib/game.ts`.
 *
 * Duolingo'dan OLINGAN mexanika (yuraklar, questlar, kunlik maqsad, yutuqlar,
 * do'kon, garov, liga) bizning iqtisodiyotimiz bilan sinovdan o'tadi. Testdagi
 * har bir shart `gameConfig` sonlariga bog'langan: son o'zgartirilsa test ham
 * yangilanadi — shu orqali sonlar ixtir emasligi nazorat qilinadi.
 *
 * Mobil tomonda shu qoidalar Kotlin'da yozilgan: `domain/GameLogicTest.kt`.
 */

import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  BET_COST_GEMS,
  CHEST_GEM_REWARD,
  CHEST_MIN_ACTIVE_DAYS,
  GOAL_GEM_REWARD,
  HEARTS_COST_WRONG,
  HEARTS_MAX,
  HEART_COMBO_STREAK,
  HEART_GATE_MIN,
  HEART_PRACTICE_REVIEWS,
  HEART_REFILL_MINUTES,
  LESSON_BONUS_XP,
  LEAGUE_BOARD_SIZE,
  LEAGUE_PRIZE_GEMS,
  MAX_FREEZES,
  QUESTS_PER_DAY,
  QUEST_POOL,
  SHOP,
  XP_BOOST_MINUTES,
  XP_BOOST_MULT,
  XP_GOAL_TIERS,
} from '../lib/gameConfig'
import {
  afterAttempt,
  afterReview,
  applyFreezes,
  boostActive,
  buy,
  goalView,
  heartsBlocked,
  heartsView,
  leagueWeek,
  lessonComplete,
  levelFor,
  normalizeGame,
  placeBet,
  promotedLeague,
  questProgressOf,
  questsForDay,
  rankOf,
  refillHearts,
  settle,
  settleBet,
  streakWithFreezes,
  weeklyXp,
  xpGain,
} from '../lib/game'
import { emptyData, nearestXpGoal, type AppData, type AttemptRecord, type DayActivity, type GameState } from '../lib/types'
import { xpForAttempt } from '../lib/skillScoring'

const MIN = 60_000
const DAY_MS = 86_400_000
const T0 = Date.UTC(2026, 10, 7, 12, 0, 0) // 2026-11-07 (shanba) 12:00 UTC
const DAY = '2026-11-07'
const WEEK = '2026-11-02' // shu haftaning poneshanbasi
const UID = 'men'

/** Faol kun yozuvi (zanjir measured: sekund ≥ 60 yoki urinish > 0). */
function act(date: string): DayActivity {
  return { date, seconds: 120, attempts: 1, correct: 1, newWords: 0, reviewedWords: 0, skills: {} }
}

/** Test holati — aniq soat bilan (vaqtga bog'liq tasodifiylik bo'lmasin). */
function fresh(over: Partial<GameState> = {}): AppData {
  const d = emptyData(UID)
  d.game = { ...d.game, heartsAt: T0, ...over }
  d.game.today = { day: DAY, xp: 0, attempts: 0, reviews: 0, perfectLessons: 0, ...(over.today ?? {}) }
  d.game.questsDay = DAY
  return d
}

/* --------------------------------- Yuraklar --------------------------------- */

describe('Yuraklar (Duolingo: 5 ta, 1 xato = 1 yurak)', () => {
  it('boshlanishda yuraklar tola — darvoza yopiq emas', () => {
    const d = fresh()
    expect(d.game.hearts).toBe(HEARTS_MAX)
    expect(heartsBlocked(d.game, d, T0)).toBe(false)
    expect(heartsView(d, T0).count).toBe(HEARTS_MAX)
    expect(heartsView(d, T0).blocked).toBe(false)
  })

  it(`bitta xato ${HEARTS_COST_WRONG} ta yurak oladi, to‘g‘ri javob olmaydi`, () => {
    let g = fresh().game
    g = afterAttempt(g, false, 'practice', 1, T0)
    expect(g.hearts).toBe(HEARTS_MAX - HEARTS_COST_WRONG)
    g = afterAttempt(g, true, 'practice', 1, T0 + MIN)
    expect(g.hearts).toBe(HEARTS_MAX - HEARTS_COST_WRONG)
  })

  it(`${HEARTS_MAX} xato yurakni 0 ga tushiradi va darvoza yopiladi`, () => {
    let g = fresh().game
    for (let i = 0; i < HEARTS_MAX * HEARTS_COST_WRONG; i++) g = afterAttempt(g, false, 'practice', 1, T0)
    expect(g.hearts).toBe(0)
    const d = fresh()
    expect(heartsBlocked(g, d, T0)).toBe(true)
    expect(g.hearts < HEART_GATE_MIN).toBe(true)
  })

  it("yuraklar sozlamadan O'CHIRILSA darvoza ishlamaydi, jarima ham yo'q", () => {
    const off: AppData = { ...fresh({ hearts: 0 }), settings: { ...emptyData(UID).settings, heartsEnabled: false } }
    expect(heartsBlocked(off.game, off, T0)).toBe(false)
    expect(heartsView(off, T0).enabled).toBe(false)
    const g = afterAttempt(off.game, false, 'practice', 1, T0)
    expect(g.hearts).toBe(0)
  })

  it(`har ${HEART_REFILL_MINUTES} daqiqada bitta yurak qaytadi (interval — biznik: manbalar zid)`, () => {
    let g = fresh({ hearts: 0 }).game
    g = refillHearts(g, T0 + (HEART_REFILL_MINUTES - 1) * MIN)
    expect(g.hearts).toBe(0) // hali bir daqiqa erta
    g = refillHearts(g, T0 + HEART_REFILL_MINUTES * MIN)
    expect(g.hearts).toBe(1)
    // `heartsAt` har berilgan yurakka suriladi: 92 daqiqadan keyin yana 2 ta
    // (30+30=60 daqiqa yetadi, 92-60=32 < 30 → uchinchisi hali emas).
    g = refillHearts(g, T0 + (HEART_REFILL_MINUTES * 3 + 2) * MIN)
    expect(g.hearts).toBe(3)
    g = refillHearts(g, T0 + 1000 * MIN)
    expect(g.hearts).toBe(HEARTS_MAX)
  })

  it('yuraklar tola bo‘lsa `refillHearts` holatni UMUMAN o‘zgartirmaydi (keraksiz saqlash yo‘q)', () => {
    const g = fresh({ hearts: HEARTS_MAX }).game
    expect(refillHearts(g, T0 + 10_000 * MIN)).toBe(g)
  })

  it(`ketma-ket ${HEART_COMBO_STREAK} to‘g‘ri javob bitta yurak qaytaradi (Duolingo Energy qoidasi)`, () => {
    let g = fresh({ hearts: 2 }).game
    for (let i = 0; i < HEART_COMBO_STREAK - 1; i++) g = afterAttempt(g, true, 'practice', 1, T0)
    expect(g.hearts).toBe(2)
    g = afterAttempt(g, true, 'practice', 1, T0)
    expect(g.combo).toBe(HEART_COMBO_STREAK)
    expect(g.hearts).toBe(3)
    g = afterAttempt(g, false, 'practice', 1, T0 + MIN)
    expect(g.combo).toBe(0)
  })

  it(`yurak tugaganda ${HEART_PRACTICE_REVIEWS} ta SRS takrori bitta yurak qaytaradi`, () => {
    let g = fresh({ hearts: 0 }).game
    for (let i = 0; i < HEART_PRACTICE_REVIEWS - 1; i++) g = afterReview(g, true, T0 + i * MIN)
    expect(g.hearts).toBe(0)
    expect(g.practiceReviews).toBe(HEART_PRACTICE_REVIEWS - 1)
    g = afterReview(g, true, T0 + (HEART_PRACTICE_REVIEWS - 1) * MIN)
    expect(g.hearts).toBe(1)
    expect(g.practiceReviews).toBe(0)
  })

  it('yangi so‘z takror sanalmaydi — faqat o‘zlashtirilgan so‘zning takrori hisobga olinadi', () => {
    const g = afterReview(fresh({ hearts: 0 }).game, false, T0)
    expect(g.practiceReviews).toBe(0)
    expect(g.today.reviews).toBe(0)
  })

  it("sinov, sanov va bo‘lim testlarida yurak jarimasi YO'Q (foydalanuvchi tanlovi)", () => {
    for (const src of ['mock_exam', 'diagnostic', 'section_test'] as const) {
      const g = afterAttempt(fresh().game, false, src, 1, T0)
      expect(g.hearts, `${src} yurak olmasligi kerak edi`).toBe(HEARTS_MAX)
    }
    expect(afterAttempt(fresh().game, false, 'practice', 1, T0).hearts).toBe(HEARTS_MAX - HEARTS_COST_WRONG)
  })

  it('darvoza ekranni takror soni bilan halol xabardor qiladi', () => {
    const v = heartsView(fresh({ hearts: 0 }), T0)
    expect(v.blocked).toBe(true)
    expect(v.practiceNeeded).toBe(HEART_PRACTICE_REVIEWS)
  })
})

/* ------------------------------- XP va byust ------------------------------- */

describe('XP va 2× byust (Duolingo: 2× / 15 daqiqa)', () => {
  it('byust bo‘lmasa XP asos son `xpForAttempt` ga teng', () => {
    expect(xpGain(fresh().game, true, 3, T0)).toBe(xpForAttempt(true, 3, true))
  })

  it(`byust ${XP_BOOST_MINUTES} daqiqa XP ni ${XP_BOOST_MULT}× qiladi`, () => {
    const g = { ...fresh().game, boostUntil: T0 + XP_BOOST_MINUTES * MIN }
    const base = xpForAttempt(true, 3, true)
    expect(xpGain(g, true, 3, T0)).toBe(base * XP_BOOST_MULT)
    const after = T0 + (XP_BOOST_MINUTES + 1) * MIN
    expect(boostActive(g, after)).toBe(false)
    expect(xpGain(g, true, 3, after)).toBe(base)
  })

  it('dars bonusi faqat yetarli mashqdan keyin beriladi; xatosiz darsda ikki bonus', () => {
    expect(lessonComplete(fresh(), 2, 0, T0).xp).toBe(0)
    expect(lessonComplete(fresh(), 5, 1, T0).xp).toBe(LESSON_BONUS_XP)
    const perfect = lessonComplete(fresh(), 5, 0, T0)
    expect(perfect.xp).toBe(LESSON_BONUS_XP * 2)
    expect(perfect.game.perfectLessonsTotal).toBe(1)
    expect(perfect.game.today.perfectLessons).toBe(1)
  })
})

/* ------------------------------- Kundalik questlar ------------------------------ */

describe('Kundalik questlar (Duolingo: kuniga 3 ta)', () => {
  it('kun kaliti BIR XIL quest beradi — qayta hisoblaganda ham, takrorsiz', () => {
    for (const d of ['2026-01-01', '2026-11-07', '2027-01-01', '2000-02-29']) {
      const a = questsForDay(d)
      expect(a.map((q) => q.id)).toEqual(questsForDay(d).map((q) => q.id))
      expect(a.length).toBe(QUESTS_PER_DAY)
      expect(new Set(a.map((q) => q.id)).size).toBe(QUESTS_PER_DAY)
      for (const q of a) expect(QUEST_POOL.some((p) => p.id === q.id)).toBe(true)
    }
  })

  it('kun sayin questlar ALMASHINADI (bir xil ro‘yxat qotib qolmaydi)', () => {
    const sets = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map((d) =>
      questsForDay(d)
        .map((q) => q.id)
        .join(','),
    )
    expect(new Set(sets).size).toBeGreaterThan(1)
  })

  it("quest bajarilishi `AppData` hisobidan keladi — sun'iy sanov yo‘q", () => {
    const d = fresh()
    const q = questsForDay(DAY)[0]!
    expect(questProgressOf(q, d.game.today, d.activity[DAY], []).done).toBe(false)
    const xpQuest = QUEST_POOL.find((x) => x.id === 'q-xp-100')!
    const p = questProgressOf(xpQuest, { ...d.game.today, xp: 100 }, act(DAY), [])
    expect(p.value).toBe(100)
    expect(p.target).toBe(100)
    expect(p.done).toBe(true)
    // Daqiqa quest `activity[].seconds` dan, tinglash/gapirish `skills` dan.
    const minQuest = QUEST_POOL.find((x) => x.kind === 'minutes')!
    expect(questProgressOf(minQuest, d.game.today, { ...act(DAY), seconds: 900 }, []).done).toBe(true)
    const lisQuest = QUEST_POOL.find((x) => x.kind === 'listening')!
    expect(questProgressOf(lisQuest, d.game.today, { ...act(DAY), skills: { listening: 179 } }, []).done).toBe(false)
    expect(questProgressOf(lisQuest, d.game.today, { ...act(DAY), skills: { listening: 180 } }, []).done).toBe(true)
  })

  it('bajarilgan questga gem BIR MARTA beriladi', () => {
    const d = {
      ...fresh(),
      activity: { [DAY]: { ...act(DAY), seconds: 100_000, skills: { listening: 10_000, speaking: 10_000 } } },
    }
    d.game.today = { day: DAY, xp: 100_000, attempts: 10_000, reviews: 10_000, perfectLessons: 10 }
    const s1 = settle(d, T0, DAY)
    expect(s1.game.questsDone.length).toBe(QUESTS_PER_DAY)
    expect(s1.game.questsTotal).toBe(QUESTS_PER_DAY)
    const s2 = settle(s1, T0 + MIN, DAY)
    expect(s2.game.questsDone.length).toBe(QUESTS_PER_DAY)
    expect(s2.game.gems).toBe(s1.game.gems) // takroriy gem yo'q
  })
})

/* ---------------------------- Kunlik maqsad va sandiq ---------------------------- */

describe('Kunlik maqsad (Duolingo 5 bosqichi ×10 masshtabda) va haftalik sandiq', () => {
  it('maqsad Faqat eʼlon qilingan bosqichlardan biriga tekiladi', () => {
    expect(XP_GOAL_TIERS.map((t) => t.xp)).toEqual([50, 100, 200, 300, 500])
    for (const [raw, want] of [
      [137, 100],
      [160, 200],
      [7, 50],
      [12_000, 500],
      [Number.NaN, 200],
    ] as [number, number][]) {
      expect(nearestXpGoal(raw)).toBe(want)
    }
    const d = fresh()
    d.settings.xpGoalXp = nearestXpGoal(137)
    expect(goalView(d).target).toBe(100)
  })

  it('maqsadga yetish gemi KUNIGA BIR MARTA beriladi', () => {
    const d = fresh()
    d.game.today = { day: DAY, xp: 100_000, attempts: 0, reviews: 0, perfectLessons: 0 }
    const s1 = settle(d, T0, DAY)
    expect(s1.game.goalRewardedDay).toBe(DAY)
    expect(s1.game.gems).toBeGreaterThanOrEqual(GOAL_GEM_REWARD)
    const s2 = settle(s1, T0 + MIN, DAY)
    expect(s2.game.gems).toBe(s1.game.gems)
  })

  it(`haftalik sandiq ${CHEST_MIN_ACTIVE_DAYS} faol kunda ochiladi va takrorlanmaydi`, () => {
    const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].slice(0, CHEST_MIN_ACTIVE_DAYS)
    const d = fresh()
    for (const k of days) d.activity[k] = act(k)
    const s1 = settle(d, T0, DAY)
    expect(s1.game.chestsWeeks).toEqual([WEEK])
    expect(s1.game.gems).toBeGreaterThanOrEqual(CHEST_GEM_REWARD)
    const s2 = settle(s1, T0 + MIN, DAY)
    expect(s2.game.chestsWeeks).toEqual([WEEK])
    const poor = fresh()
    poor.activity[WEEK] = act(WEEK)
    expect(settle(poor, T0, DAY).game.chestsWeeks).toEqual([])
  })
})

/* ------------------------------ Streak va qalqon ----------------------------- */

describe('Streak va streak freeze (Duolingo: 200 gem, omborda eng ko‘p 2 ta)', () => {
  it('qalqon uzilgan kunni qoplaydi — zanjir uzilmaydi', () => {
    const d = fresh()
    d.activity[DAY] = act(DAY)
    d.activity['2026-11-06'] = act('2026-11-06')
    d.activity['2026-11-04'] = act('2026-11-04')
    expect(streakWithFreezes(d, DAY)).toBe(2) // 11-07, 11-06 — keyin 11-05 yo'q
    const after = applyFreezes({ ...d, game: { ...d.game, freezes: 1 } }, DAY)
    expect(after.game.freezes).toBe(0)
    expect(after.game.frozenDays).toEqual(['2026-11-05'])
    expect(streakWithFreezes(after, DAY)).toBe(4)
  })

  it('ketma-ketlik uzilmagan bo‘lsa qalqon SARFLANMAYDI', () => {
    const d = fresh()
    d.activity[DAY] = act(DAY)
    d.activity['2026-11-06'] = act('2026-11-06')
    const after = applyFreezes({ ...d, game: { ...d.game, freezes: MAX_FREEZES } }, DAY)
    expect(after.game.freezes).toBe(MAX_FREEZES)
    expect(after.game.frozenDays).toEqual([])
  })

  it('yangi o‘quvchida tarix yo‘q — qalqon bo‘shga sarflanmaydi', () => {
    // Bugun boshlangan o'quvchi uchun "kecha uzilgan" degan tushuncha yo'q:
    // uzilishdan ortda faol kun bo'lishi shart.
    const d = fresh()
    d.activity[DAY] = act(DAY)
    const after = applyFreezes({ ...d, game: { ...d.game, freezes: MAX_FREEZES } }, DAY)
    expect(after.game.freezes).toBe(MAX_FREEZES)
    expect(after.game.frozenDays).toEqual([])
  })

  it('uzilish bir necha kun oldin boshlansa ham qalqon uni topadi (2026-11-07 tuzatildi)', () => {
    // ESKI XATO: izlash oynasi ombordagi son (`MAX_FREEZES`) edi — uzilish
    // 3-kundan ortiqroq bo'lsa qalqon uni ko'rmaskandi.
    const d = fresh()
    d.activity[DAY] = act(DAY)
    d.activity['2026-11-06'] = act('2026-11-06')
    d.activity['2026-10-30'] = act('2026-10-30') // uzilish shu kundan keyin boshlangan
    // Duolingo qoidasi: BITTA chaqiruvda BITTA qalqon sarflanadi (u avtomatik
    // va bosqichma-bosqich ishlatiladi) — keyingi chaqiruv keyingisini qoplaydi.
    const s1 = applyFreezes({ ...d, game: { ...d.game, freezes: MAX_FREEZES } }, DAY)
    expect(s1.game.frozenDays).toEqual(['2026-11-05'])
    expect(s1.game.freezes).toBe(MAX_FREEZES - 1)
    const s2 = applyFreezes(s1, DAY)
    expect(s2.game.frozenDays).toEqual(['2026-11-05', '2026-11-04'])
    expect(s2.game.freezes).toBe(0)
    // Ombor tugagach ortdagisi qoplanmaydi.
    expect(applyFreezes(s2, DAY).game.frozenDays.length).toBe(2)
  })

  it('omborda MAX_FREEZES dan ko‘p qalqon bo‘lmaydi', () => {
    const res = buy(fresh({ freezes: MAX_FREEZES, gems: 1000 }), 'freeze', T0)
    expect(res.ok).toBe(false)
    expect(res.reasonUz).toContain(String(MAX_FREEZES))
  })
})

/* ---------------------------------- Yutuqlar --------------------------------- */

describe('Yutuqlar (darajali — Duolingo achievement jadvallari)', () => {
  it("yutuq darajasi chegaralar bo‘yicha o'sadi", () => {
    const spec = ACHIEVEMENTS.find((a) => a.id === 'a-wildfire')!
    expect(levelFor(spec, 0)).toBe(0)
    expect(levelFor(spec, spec.levels[0]!)).toBe(1)
    expect(levelFor(spec, spec.levels[spec.levels.length - 1]!)).toBe(spec.levels.length)
  })

  it("yangi ochilgan yutuq nishon (`badges`) + gem beradi va takrorlanmaydi", () => {
    const spec = ACHIEVEMENTS.find((a) => a.metric === 'xp_total')!
    const d = fresh()
    d.xp = spec.levels[0]!
    const s1 = settle(d, T0, DAY)
    expect(s1.badges.some((b) => b.id === `${spec.id}-1`)).toBe(true)
    expect(s1.game.gems).toBeGreaterThanOrEqual(spec.gemReward)
    const s2 = settle(s1, T0 + MIN, DAY)
    expect(s2.badges.filter((b) => b.id === `${spec.id}-1`).length).toBe(1)
    expect(s2.game.gems).toBe(s1.game.gems)
  })

  it('streak bosqichida qalqon beriladi (ombor chegarasi bilan)', () => {
    const d = fresh()
    for (let i = 0; i < 7; i++) {
      const k = new Date(Date.UTC(2026, 10, 7 - i)).toISOString().slice(0, 10)
      d.activity[k] = act(k)
    }
    const s = settle(d, T0, DAY)
    expect(streakWithFreezes(s, DAY)).toBe(7)
    expect(s.badges.some((b) => b.id === 'a-wildfire-1')).toBe(true)
    expect(s.game.freezes).toBeGreaterThan(0)
    expect(s.game.freezes).toBeLessThanOrEqual(MAX_FREEZES)
  })

  it("bo‘sh holatda `badges` bo‘sh qoladi — nishon ixtir qilinmaydi", () => {
    expect(settle(fresh(), T0, DAY).badges).toEqual([])
  })
})

/* ----------------------------------- Do'kon ---------------------------------- */

describe("Do'kon (Duolingo narxlari saqlangan, qolganlari biznik)", () => {
  it('narxlar `gameConfig.SHOP` da eʼlon qilinganidek', () => {
    expect(SHOP.refill).toBe(350)
    expect(SHOP.freeze).toBe(200)
    expect(SHOP.heart).toBe(70)
  })

  it('gem yetmasa xarid SABABI bilan rad etiladi va holat o‘zgarmaydi', () => {
    const d = fresh()
    const res = buy(d, 'refill', T0)
    expect(res.ok).toBe(false)
    expect(res.reasonUz).toContain(String(SHOP.refill))
    expect(res.data).toBe(d)
  })

  it('yuraklar to‘la bo‘lsa yurak sotib bo‘lmaydi', () => {
    const res = buy(fresh({ hearts: HEARTS_MAX, gems: 1000 }), 'heart', T0)
    expect(res.ok).toBe(false)
    expect(res.reasonUz).toContain(String(HEARTS_MAX))
  })

  it('bitta yurak xaridi tiklanish taymerini QAYTA BOSHLAMAYDI', () => {
    const res = buy(fresh({ hearts: 2, gems: 1000, heartsAt: T0 }), 'heart', T0 + 5 * MIN)
    expect(res.ok).toBe(true)
    expect(res.data.game.hearts).toBe(3)
    expect(res.data.game.heartsAt, 'taymer qayta boshlanmasligi kerak').toBe(T0)
  })

  it('yuraklarni to‘ldirish gemni oladi, yuraklarni to‘laydi va taymerni yangilaydi', () => {
    const res = buy(fresh({ hearts: 1, gems: 1000, heartsAt: T0 }), 'refill', T0 + 5 * MIN)
    expect(res.ok).toBe(true)
    expect(res.data.game.hearts).toBe(HEARTS_MAX)
    expect(res.data.game.gems).toBe(1000 - SHOP.refill)
    expect(res.data.game.heartsAt).toBe(T0 + 5 * MIN)
  })

  it('byust faol bo‘lsa ikkinchisi sotilmaydi; sotilganda tugash payti yoziladi', () => {
    const activeBuy = buy(fresh({ gems: 1000, boostUntil: T0 + XP_BOOST_MINUTES * MIN }), 'xpBoost', T0)
    expect(activeBuy.ok).toBe(false)
    const ok = buy(fresh({ gems: 1000 }), 'xpBoost', T0)
    expect(ok.ok).toBe(true)
    expect(ok.data.game.boostUntil).toBe(T0 + XP_BOOST_MINUTES * MIN)
  })
})

/* --------------------------- Garov (Double or Nothing) --------------------------- */

describe('Garov — Duolingo: 50 gem tikiladi, 7 kun streak bo‘lsa 100 gem', () => {
  it('garov gemni oladi va takror ochilmaydi', () => {
    const res = placeBet(fresh({ gems: 500 }), 1)
    expect(res.ok).toBe(true)
    expect(res.data.game.gems).toBe(500 - BET_COST_GEMS)
    expect(res.data.game.bet?.startDay).toBe(DAY)
    expect(placeBet(res.data, 1).ok).toBe(false)
  })

  it('7 kun o‘tib zanjir o‘sgan bo‘lsa gem qaytadi; o‘smasa yo‘qoladi', () => {
    // `settleBet` bevosita tekshiriladi — `settle()` dagi quest/yutuq gemlari
    // bu yerda hisobga shovqin qo'shadi (ular sinfning yuqorisida alohida tekshirilgan).
    const bet = placeBet(fresh({ gems: 500 }), 1).data
    const at = (today: string): AppData => ({
      ...bet,
      game: { ...bet.game, today: { day: today, xp: 0, attempts: 0, reviews: 0, perfectLessons: 0 }, questsDay: today },
    })
    const won = settleBet(at('2026-11-16'), 8)
    expect(won.game.bet).toBeNull()
    expect(won.game.gems).toBe(500 - BET_COST_GEMS + 100)
    const lost = settleBet(at('2026-11-16'), 1)
    expect(lost.game.bet).toBeNull()
    // Shart bajarilmadi — tikilgan gem QAYTMAYDI (garovning mohiyati shu).
    expect(lost.game.gems).toBe(500 - BET_COST_GEMS)
    // Muddati yetmagan bo'lsa garov OCHIQ qoladi (keyingi tekshiruvda yopiladi).
    const early = settleBet(at('2026-11-11'), 8)
    expect(early.game.bet?.startDay).toBe(DAY)
    expect(early.game.gems).toBe(500 - BET_COST_GEMS)
  })
})

/* ------------------------------------ Liga ----------------------------------- */

describe('Liga haftasi (Duolingo: 10 liga, har birida 30 kishi, promoteTop jadvali)', () => {
  function attempt(at: number, correct: boolean, difficulty = 3): AttemptRecord {
    return {
      id: `a${at}`,
      exerciseId: 'e',
      skill: 'reading',
      level: 'A1',
      correct,
      partial: correct ? 1 : 0,
      difficulty,
      secondsSpent: 10,
      source: 'practice',
      answerGiven: 'x',
      at,
    }
  }

  it('hafta boshi PONESHANBA; XP faqat o‘sha haftadagi urinishlardan hisoblanadi', () => {
    const d = fresh()
    d.attempts = [attempt(Date.UTC(2026, 10, 3), true), attempt(Date.UTC(2026, 10, 1), true), attempt(Date.UTC(2026, 10, 9), false)]
    expect(weeklyXp(d, WEEK)).toBe(xpForAttempt(true, 3, true))
    expect(leagueWeek(d, DAY).weekStart).toBe(WEEK)
  })

  it('liga snapshoti bo‘lmasa XP chegarasiga qarab tanlanadi', () => {
    const d = fresh()
    d.attempts = Array.from({ length: 20 }, (_, i) => attempt(Date.UTC(2026, 10, 3, 0, i), true))
    const w = leagueWeek(d, DAY)
    expect(w.xp).toBe(20 * xpForAttempt(true, 3, true))
    expect(['silver', 'gold']).toContain(w.leagueId)
  })

  it('liga HAFTA DAVOMIDA BARQAROR — XP chegarasi o‘rtada sakratmaydi', () => {
    const d = fresh()
    d.attempts = Array.from({ length: 60 }, (_, i) => attempt(Date.UTC(2026, 10, 3, 0, i), true))
    d.game.league = { weekStart: WEEK, leagueId: 'bronze', rank: 25, boardSize: LEAGUE_BOARD_SIZE, at: T0, entries: [], prizeClaimed: false }
    expect(leagueWeek(d, DAY).leagueId).toBe('bronze')
  })

  it("oldingi hafta snapshotiga qarab faqat YUQORIGA ko‘tiladi (promoteTop)", () => {
    const snap = { weekStart: '2026-10-26', leagueId: 'bronze', rank: 3, boardSize: LEAGUE_BOARD_SIZE, at: T0, entries: [], prizeClaimed: true }
    expect(promotedLeague(snap as never, UID)).toBe('silver')
    // Pasaytirish qoidasi MANBALARNING HICH BIRIDA yo'q — ixtir qilinmagan.
    expect(promotedLeague({ ...snap, rank: LEAGUE_BOARD_SIZE } as never, UID)).toBe('bronze')
    expect(promotedLeague({ ...snap, leagueId: 'diamond', rank: 1 } as never, UID)).toBe('diamond')
  })

  it("o‘rin tablodan aniq hisoblanadi; biz jadvalda bo‘lmasak 0 (son ixtir yo‘q)", () => {
    const board = [
      { userId: 'a', name: 'A', xp: 300 },
      { userId: UID, name: 'Biz', xp: 200 },
      { userId: 'b', name: 'B', xp: 100 },
    ]
    expect(rankOf(board, UID)).toBe(2)
    expect(rankOf(board, 'yok')).toBe(0)
  })

  it('hafta yakunida top-3 gem oladi; biz jadvalda bo‘lmasak gem yo‘q va bir marta', () => {
    const lastWeek = {
      weekStart: '2026-10-26',
      leagueId: 'gold',
      rank: 0,
      boardSize: LEAGUE_BOARD_SIZE,
      at: T0,
      entries: [
        { userId: 'a', name: 'A', xp: 600 },
        { userId: UID, name: 'Biz', xp: 500 },
      ],
      prizeClaimed: false,
    }
    const d = fresh()
    d.game.league = lastWeek
    const s = settle(d, T0 + 8 * DAY_MS, '2026-11-10')
    expect(s.game.gems).toBe(LEAGUE_PRIZE_GEMS[1])
    expect(s.game.league?.prizeClaimed).toBe(true)
    expect(settle(s, T0 + 9 * DAY_MS, '2026-11-11').game.gems).toBe(LEAGUE_PRIZE_GEMS[1])

    const absent = fresh()
    absent.game.league = { ...lastWeek, entries: [{ userId: 'b', name: 'B', xp: 10 }] }
    const e = settle(absent, T0 + 8 * DAY_MS, '2026-11-10')
    expect(e.game.gems).toBe(0)
    expect(e.game.league?.prizeClaimed).toBe(true)
  })

  it("davom etayotgan haftaga sovg‘a BERILMAYDI (halollik)", () => {
    const d = fresh()
    d.game.league = { weekStart: WEEK, leagueId: 'gold', rank: 1, boardSize: LEAGUE_BOARD_SIZE, at: T0, entries: [{ userId: UID, name: 'Biz', xp: 900 }], prizeClaimed: false }
    const s = settle(d, T0, DAY)
    expect(s.game.gems).toBe(0)
    expect(s.game.league?.prizeClaimed).toBe(false)
  })
})

/* --------------------------- `settle()` — idempotentlik -------------------------- */

describe('`settle()` — qayta-qaeta chaqirilsa ham sovg‘a takrorlanmaydi', () => {
  it('hech narsa o‘zgarmasa SAYO bilan BIR XIL obyekt qaytadi (qayta render yo‘q)', () => {
    const d = fresh()
    expect(settle(d, T0, DAY)).toBe(d)
  })

  it('bir nechta sovg‘a bo‘lsa ham ikkinchi chaqiruv HECH NARSA qo‘shmaydi', () => {
    const spec = ACHIEVEMENTS.find((a) => a.metric === 'xp_total')!
    const d = fresh()
    d.xp = spec.levels[0]!
    d.game.today = { day: DAY, xp: 100_000, attempts: 10_000, reviews: 10_000, perfectLessons: 10 }
    for (const k of [WEEK, '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', DAY]) d.activity[k] = act(k)
    const s1 = settle(d, T0, DAY)
    const s2 = settle(s1, T0 + MIN, DAY)
    expect(s2.badges).toEqual(s1.badges)
    expect(s2.game.gems).toBe(s1.game.gems)
    expect(s2.game.questsDone).toEqual(s1.game.questsDone)
    expect(s2.game.chestsWeeks).toEqual(s1.game.chestsWeeks)
  })

  it('kun o‘zgarsa kundalik hisoblar va quest belgilari qayta boshlanadi', () => {
    const d = fresh()
    d.game.today = { day: DAY, xp: 500, attempts: 5, reviews: 5, perfectLessons: 1 }
    d.game.questsDone = [{ id: 'q-x-1', at: T0 }]
    d.game.questsTotal = 1
    const s = settle(d, T0 + DAY_MS, '2026-11-08')
    expect(s.game.today.day).toBe('2026-11-08')
    expect(s.game.today.xp).toBe(0)
    expect(s.game.questsDone).toEqual([])
    expect(s.game.questsTotal).toBe(1) // kechagi sanog'ı saqlanadi
  })
})

/* ------------------------- `normalizeGame` — buzilgan saqlanganma ------------------------ */

describe('Eski/buzilgan saqlanganmadan o‘yin holatini xavfsizlashtirish', () => {
  it('sonlar chegaraga keltiriladi, yetishmayan maydonlar standart bo‘ladi', () => {
    const g = normalizeGame({ hearts: 99, gems: -5, freezes: 12, combo: 4.7, version: 99 }, DAY) as GameState
    expect(g.hearts).toBe(HEARTS_MAX)
    expect(g.gems).toBe(0)
    expect(g.freezes).toBeLessThanOrEqual(MAX_FREEZES)
    expect(g.combo).toBe(4)
    expect(g.heartsAt).toBeGreaterThan(0)
    expect(g.version).toBe(99) // versiya o'zi tekshirilmaydi — migrate uni biladi
  })

  it("buzilgan liga snapshoti tashlab yuborilmaydi — tuzatiladi", () => {
    // Maydonlar ATUNDAN TASHQARI ko'rinishda — `normalizeGame` tashqi (eski)
    // saqlanganmani himoya qiladi: son o'rniga boshqa tur kelsa tuzatadi.
    const buziq = { league: { weekStart: 5, leagueId: 'platina', entries: [{ userId: 'a' }, null] } } as unknown as Partial<GameState>
    const g = normalizeGame(buziq, DAY)
    expect(g.league?.leagueId).toBe('bronze')
    expect(g.league?.entries).toEqual([{ userId: 'a', name: '', xp: 0 }])
    expect(g.league?.boardSize).toBe(LEAGUE_BOARD_SIZE)
    expect(g.league?.weekStart).toBe(WEEK)
  })

  it("bo‘sh/yo‘q saqlanganma to‘liq standart holatni beradi", () => {
    const g = normalizeGame(undefined, DAY)
    expect(g.hearts).toBe(HEARTS_MAX)
    expect(g.today.day).toBe(DAY)
    expect(g.league).toBeNull()
    expect(g.goalRewardedDay).toBe('')
  })

  it("ro'yxatlardagi bo'sh qiymatlar tashlanadi — mobil bilan BIR XIL", () => {
    // Mobil tomon `isNotBlank` / `jStrList` bilan bo'sh satrlarni tashlaydi,
    // shuning uchun veb ham tashlashi shart: ikkala mijoz BIR XIL holatda
    // davom etmasa, sinxronizatsiyadan keyin yana buzilgan ko'rinish chiqadi.
    const g = normalizeGame(
      {
        questsDone: [{ id: 'q-xp-100', at: 1 }, { id: '' }, null],
        frozenDays: ['2026-11-05', '', 7],
        chestsWeeks: [WEEK, ''],
        questsDay: '',
        today: { day: 20261107 },
      } as unknown as Partial<GameState>,
      DAY,
    )
    expect(g.questsDone).toEqual([{ id: 'q-xp-100', at: 1 }])
    expect(g.frozenDays).toEqual(['2026-11-05'])
    expect(g.chestsWeeks).toEqual([WEEK])
    expect(g.questsDay, "quest ro'yxati sanasi tiklanadi").toBe(DAY)
    expect(g.today.day, 'sana son bo‘lsa bugungi kunga qaytadi').toBe(DAY)
  })

  it('heartsAt=0 tiklanish taymerini buzib yubormasin', () => {
    // `emptyGame` har doim hozirgi vaqtni qo'yadi — 0 maydon UMUMAN YO'qligini
    // bildiradi. 0 qolsa «mangu vaqt o'tgan» hisoblanib yuraklar darhol
    // to'lar edi (mobil `normalizeGame` ham shu qoidani qiladi).
    const g = normalizeGame({ hearts: 2, heartsAt: 0 }, DAY)
    expect(g.heartsAt).toBeGreaterThan(0)
    expect(refillHearts(g, g.heartsAt + (HEART_REFILL_MINUTES - 1) * MIN).hearts).toBe(2)
  })

  it('buzilgan yutuq darajalari sonaga keltiriladi, garov tuzatiladi', () => {
    // Mobil `jIntRecord` (`9.7 → 9`, `"2" → 2`) va `clampGame` (garov `gems`
    // bo'sh bo'lsa narx) shu qoidalarni qiladi — veb ham bir xil bo'lishi shart.
    const g = normalizeGame(
      {
        achievementLevels: { 'a-wildfire': 9.7, 'a-scholar': '2', 'a-sharp': -4, 'a-x': 'xabar' },
        bet: { startDay: DAY, streakAtStart: -3, gems: 0 },
      } as unknown as Partial<GameState>,
      DAY,
    )
    expect(g.achievementLevels).toEqual({ 'a-wildfire': 9, 'a-scholar': 2, 'a-sharp': 0, 'a-x': 0 })
    expect(g.bet).toEqual({ startDay: DAY, streakAtStart: 0, gems: BET_COST_GEMS })

    // Bo'sh `startDay` — garov YO'Q degani (mobil `jBet` `null` qaytaradi).
    const noBet = normalizeGame({ bet: { startDay: '', streakAtStart: 4, gems: 50 } } as unknown as Partial<GameState>, DAY)
    expect(noBet.bet).toBeNull()
  })
})
