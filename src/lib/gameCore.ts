/** O'yin qatlami — asos: vaqt, yuraklar, kun hisoblari, XP/byust/combo, questlar, bonuslar, sandiq, streak. */
import { CHEST_GEM_REWARD, CHEST_MIN_ACTIVE_DAYS, FREEZE_SEARCH_DAYS, HEARTS_COST_WRONG, HEARTS_MAX, HEART_COMBO_STREAK, HEART_FREE_SOURCES, HEART_GATE_MIN, HEART_PRACTICE_REVIEWS, HEART_REFILL_MINUTES, LESSON_BONUS_XP, LESSON_MIN_EXERCISES, PERFECT_LESSON_BONUS_XP, QUESTS_PER_DAY, QUEST_GEM_REWARD, QUEST_POOL, XP_BOOST_MULT, type QuestSpec } from './gameConfig'
import { streakFor, xpForAttempt } from './skillScoring'
import type { AppData, DayActivity, GameState, TodayCounters } from './types'
import { todayKey } from './types'

export const MINUTE_MS = 60_000
export const DAY_MS = 86_400_000

/* ---------------------------- Sana yordamchilari ---------------------------- */

/** `day` (YYYY-MM-DD) dan `n` kun keyin/oldingi sana (UTC — siljish yo'q). */
export function shiftDay(day: string, n: number): string {
  const d = new Date(day + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Hafta boshi — PONESHANBA. Liga haftasi shu yerda boshlanadi (Duolingo
 *  ligasi ham hafta yakunida — yakshanba keasi — yig'iladi). */
export function weekStartOf(day: string): string {
  const d = new Date(day + 'T00:00:00Z')
  const wd = (d.getUTCDay() + 6) % 7 // poneshanba = 0
  return shiftDay(day, -wd)
}

/* ------------------------------- Yuraklar ------------------------------- */

/** Yuraklar tizimi bu foydalanuvchi uchun yoniqmi (sozlamadan o'chiriladi). */
export function heartsEnabled(data: AppData): boolean {
  return data.settings.heartsEnabled
}

/** Sinov/sanovlarda yurak ishlatilmaydi (ro'yxat `gameConfig` da). */
export function heartFreeSource(source: string): boolean {
  return (HEART_FREE_SOURCES as readonly string[]).includes(source)
}

/**
 * Vaqt o'tishi bilan qaytarilgan yuraklar. `heartsAt` — oxirgi o'zgarish payti:
 * oradan N × `HEART_REFILL_MINUTES` o'tsa N yurak qo'shiladi (chegara
 * `HEARTS_MAX`). Yangi `heartsAt` shunda siljitiladi — qolgan qism keyingi
 * tiklanishga yozib qo'yiladi.
 */
export function refillHearts(g: GameState, now: number): GameState {
  // Yuraklar to'la — `heartsAt`ga TEKILMAYMIZ. Aks holda har `settle()` chaqiruvi
  // holatni o'zgartirib, keraksiz saqlash (save) siklini qo'zg'atardi.
  if (g.hearts >= HEARTS_MAX) return g
  const due = Math.floor((now - g.heartsAt) / (HEART_REFILL_MINUTES * MINUTE_MS))
  if (due <= 0) return g
  const gained = Math.min(HEARTS_MAX - g.hearts, due)
  if (gained <= 0) return g
  return {
    ...g,
    hearts: g.hearts + gained,
    heartsAt: g.heartsAt + gained * HEART_REFILL_MINUTES * MINUTE_MS,
    practiceReviews: g.hearts + gained >= HEARTS_MAX ? 0 : g.practiceReviews,
  }
}

/** Keyingi yurakgacha qolgan daqiqalar (to'la bo'lsa 0). */
export function heartMinutesLeft(g: GameState, now: number): number {
  if (g.hearts >= HEARTS_MAX) return 0
  const leftMs = HEART_REFILL_MINUTES * MINUTE_MS - (now - g.heartsAt)
  return Math.max(0, Math.ceil(leftMs / MINUTE_MS))
}

/**
 * "Takrorlash darsi" darvozasi: yuraklar tugaganda o'quvchi SRS takrorlashi
 * orqali yurak qaytaradi (Duolingo: "practice to earn hearts", bitta practice
 * darsi = 1 yurak). Bizda bitta dars = `HEART_PRACTICE_REVIEWS` ta takror.
 */
export function practiceHeartsNeeded(g: GameState): number {
  return Math.max(0, HEART_PRACTICE_REVIEWS - g.practiceReviews)
}

/**
 * SRS takrorlashidan keyingi holat.
 *
 *  - `reviewed` — haqiqiy TAKRORLASH (so'z avval o'zlashtirilgan). Yangi so'z
 *    birinchi marta o'rganganida takror sanalmaydi (`activity.reviewedWords`
 *    dagi mavjud qoida bilan bir xil).
 *  - Yuraklar tugagan bo'lsa (0) har bir takror "takrorlash darsi" hisobiga
 *    yoziladi; `HEART_PRACTICE_REVIEWS` ta yetganda BITTA yurak qaytadi
 *    (Duolingo: "practice to earn hearts").
 * Qayta takrorlanadigan hisob `today.reviews` da (quest mezoni).
 */
export function afterReview(g: GameState, reviewed: boolean, now: number): GameState {
  let next = refillHearts(g, now)
  if (reviewed) next = bumpToday(next, { reviews: 1 })
  else return next
  if (next.hearts >= 1) return next
  const acc = next.practiceReviews + 1
  if (acc < HEART_PRACTICE_REVIEWS) return { ...next, practiceReviews: acc }
  return {
    ...next,
    practiceReviews: acc - HEART_PRACTICE_REVIEWS,
    hearts: Math.min(HEARTS_MAX, next.hearts + 1),
    heartsAt: now,
  }
}

/** Yuraklar holati (ekran uchun) — sonlar `AppData`dan, ixtir yo'q. */
export interface HeartsView {
  enabled: boolean
  count: number
  max: number
  /** Keyingi yurakgacha daqiqa (to'la bo'lsa 0). */
  minutesLeft: number
  /** Hozir dars qilib bo'lmaydi (darvoza). */
  blocked: boolean
  /** Darvoza ochilishi uchun qolgan takrorlar (yurak bor bo'lsa 0). */
  practiceNeeded: number
  /** Byust faolmi (2× XP). */
  boostActive: boolean
  boostMinutesLeft: number
}

export function heartsView(data: AppData, now = Date.now()): HeartsView {
  const g = data.game
  const enabled = heartsEnabled(data)
  const live = refillHearts(g, now)
  const blocked = enabled && live.hearts < HEART_GATE_MIN
  return {
    enabled,
    count: live.hearts,
    max: HEARTS_MAX,
    minutesLeft: heartMinutesLeft(live, now),
    blocked,
    practiceNeeded: blocked ? practiceHeartsNeeded(live) : 0,
    boostActive: boostActive(live, now),
    boostMinutesLeft: boostMinutesLeft(live, now),
  }
}

/* --------------------- Kun yangilanishi va kundalik hisoblar --------------------- */

/** Kun o'zgarsa kundalik hisoblar va questlar qayta boshlanadi. */
export function ensureFreshDay(g: GameState, day: string): GameState {
  if (g.today.day === day && g.questsDay === day) return g
  const reset: TodayCounters = { day, xp: 0, attempts: 0, reviews: 0, perfectLessons: 0 }
  return {
    ...g,
    today: reset,
    questsDay: day,
    // Kechagi bajarilgan questlar sanog'i `questsTotal` da saqlanib qoladi,
    // bugungi "bajarildi" belgilari tozalanadi (yangi kunga yangi questlar).
    questsDone: [],
    combo: 0,
  }
}

/** Bugungi hisobga biror natija qo'shish (menfiy qo'shilmaydi). */
export function bumpToday(g: GameState, part: Partial<Omit<TodayCounters, 'day'>>): GameState {
  const t = g.today
  return {
    ...g,
    today: {
      day: t.day,
      xp: t.xp + Math.max(0, part.xp ?? 0),
      attempts: t.attempts + Math.max(0, part.attempts ?? 0),
      reviews: t.reviews + Math.max(0, part.reviews ?? 0),
      perfectLessons: t.perfectLessons + Math.max(0, part.perfectLessons ?? 0),
    },
  }
}

/* --------------------------- XP, byust, combo --------------------------- */

/** Byust yurayaptimi? */
export function boostActive(g: GameState, now: number): boolean {
  return g.boostUntil > now
}

/** Byustga qolgan daqiqalar. */
export function boostMinutesLeft(g: GameState, now: number): number {
  return boostActive(g, now) ? Math.max(0, Math.ceil((g.boostUntil - now) / MINUTE_MS)) : 0
}

/** Bir mashq uchun BERILADIGAN XP (byust bilan). Asos son `xpForAttempt` dan. */
export function xpGain(g: GameState, correct: boolean, difficulty: number, now: number): number {
  const base = xpForAttempt(correct, difficulty, true)
  const mult = boostActive(g, now) ? XP_BOOST_MULT : 1
  return base * mult
}

/**
 * Mashq natijasidan keyingi holat: yurak, combo, kundalik hisob.
 * `source` muof saifalardan bo'lsa (mock/diagnostic/bo'lim testi) yurak
 * JARIMA QILINMAYDI — foydalanuvchi tanlovi.
 */
export function afterAttempt(g: GameState, correct: boolean, source: string, xp: number, now: number): GameState {
  const base = bumpToday(refillHearts(g, now), { attempts: 1, xp })
  const combo = correct ? base.combo + 1 : 0
  let next: GameState = { ...base, combo }
  const free = heartFreeSource(source)
  if (correct) {
    // Duolingo'ning Energy tizimidan: ketma-ket to'g'ri javob resurs qaytaradi.
    if (!free && combo > 0 && combo % HEART_COMBO_STREAK === 0 && next.hearts < HEARTS_MAX) {
      next = { ...next, hearts: Math.min(HEARTS_MAX, next.hearts + 1), heartsAt: now }
    }
  } else if (!free) {
    next = {
      ...next,
      hearts: Math.max(0, next.hearts - HEARTS_COST_WRONG),
      // Tiklanish hisobi xatodan boshlanadi (Duolingo'da ham xatodan keyin
      // kutish boshqa boshlanadi — manba: hearts maqolalari).
      heartsAt: now,
    }
  }
  return next
}

/** O'quvchi hozir dars boshlay oladimi (yurak darvozasi)? */
export function heartsBlocked(g: GameState, data: AppData, now: number): boolean {
  return heartsEnabled(data) && refillHearts(g, now).hearts < HEART_GATE_MIN
}

/* --------------------------- Kundalik questlar --------------------------- */

/**
 * Kun kalitining FNV-1 hashi. `Math.imul` — 32 BITLI ko'paytirish: oddiy `*`
 * 2^53 dan oshganda kasr (double) bo'lib aniqlik YO'QOTADI va bitta kunning
 * questlari vebda bir xil, mobil Kotlin'da boshqacha bo'lib qolishi mumkin edi.
 * Kotlin tomonda `Int` ko'paytirish (two's complement) shu natijani beradi.
 */
export function dayHash(s: string): number {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/**
 * Bugungi 3 quest — KUN KALITIGA qarab tanlanadi (tasodifiy emas: ikkala
 * qurilmada va qayta yuklanganda BIR XIL). Duolingo'da ham kuniga 3 ta.
 */
export function questsForDay(day: string): QuestSpec[] {
  const pool = [...QUEST_POOL]
  let i = dayHash(day)
  const out: QuestSpec[] = []
  for (let k = 0; k < Math.min(QUESTS_PER_DAY, pool.length); k++) {
    // Yana 32 bitli ko'paytirish (`Math.imul`) — yuqoridagi `dayHash` izohiga
    // qarang: aks holda qator natijasi tildan tilga farq qiladi.
    i = (Math.imul(i, 1103515245) + 12345) & 0x7fffffff
    const j = i % pool.length
    out.push(pool.splice(j, 1)[0]!)
  }
  return out
}

export interface QuestProgress {
  quest: QuestSpec
  value: number
  target: number
  done: boolean
  claimed: boolean
}

/**
 * Quest bajarilishi — `AppData` dagi haqiqiy hisobdan. `kind` lar:
 *  - xp / attempts / reviews / perfect_lesson → `game.today`;
 *  - minutes / listening / speaking → `activity[day]` sekundlari.
 * Sun'iy sanov YO'Q: hech qaysi quest "o'z hisobini" yuritmaydi.
 */
export function questProgressOf(
  quest: QuestSpec,
  today: TodayCounters,
  activity: DayActivity | undefined,
  claimedIds: readonly string[],
): QuestProgress {
  const skills = activity?.skills ?? {}
  const value =
    quest.kind === 'xp'
      ? today.xp
      : quest.kind === 'attempts'
        ? today.attempts
        : quest.kind === 'reviews'
          ? today.reviews
          : quest.kind === 'perfect_lesson'
            ? today.perfectLessons
            : quest.kind === 'minutes'
              ? (activity?.seconds ?? 0)
              : quest.kind === 'listening'
                ? (skills.listening ?? 0)
                : (skills.speaking ?? 0)
  return { quest, value, target: quest.target, done: value >= quest.target, claimed: claimedIds.includes(quest.id) }
}

/** Bugungi questlar holati (gem berish — `settleQuests`). */
export function questView(data: AppData): QuestProgress[] {
  const day = data.game.today.day
  return questsForDay(day).map((q) => questProgressOf(q, data.game.today, data.activity[day], data.game.questsDone.map((x) => x.id)))
}

/**
 * Bajarilgan questlarga gem berish (bir marta). Qayta chaqirilsa takror
 * berilmaydi — `questsDone` da id saqlanadi.
 */
export function settleQuests(data: AppData, now = Date.now()): AppData {
  const g = data.game
  const day = g.today.day
  const list = questsForDay(day)
  const claimed = g.questsDone.map((x) => x.id)
  let gems = g.gems
  let total = g.questsTotal
  const added: { id: string; at: number }[] = []
  for (const q of list) {
    if (claimed.includes(q.id)) continue
    const p = questProgressOf(q, g.today, data.activity[day], claimed)
    if (!p.done) continue
    added.push({ id: q.id, at: now })
    claimed.push(q.id)
    gems += QUEST_GEM_REWARD
    total += 1
  }
  if (added.length === 0) return data
  return { ...data, game: { ...g, gems, questsDone: [...g.questsDone, ...added], questsTotal: total } }
}

/* ------------------------ Dars yakunidagi bonuslar ------------------------ */

/**
 * Dars (mashq bloki) yakunlandi: bonus XP va, agar HAMMA javob to'g'ri bo'lsa,
 * "xatosiz dars" hisobi. `exercises` soni `LESSON_MIN_EXERCISES` dan kam bo'lsa
 * bonus berilmaydi (1 savollik blokkarga bonus berish iqtisodiyotni buzadi).
 */
export function lessonComplete(data: AppData, exercises: number, mistakes: number, at = Date.now()): AppData {
  const counts = exercises >= LESSON_MIN_EXERCISES
  const perfect = counts && mistakes === 0
  const bonus = counts ? LESSON_BONUS_XP + (perfect ? PERFECT_LESSON_BONUS_XP : 0) : 0
  const g0 = bonus > 0 ? bumpToday(data.game, { xp: bonus }) : data.game
  const withBonus: AppData = { ...data, xp: data.xp + bonus, game: g0 }
  if (!perfect) return withBonus
  const g1: GameState = { ...withBonus.game, perfectLessonsTotal: withBonus.game.perfectLessonsTotal + 1 }
  void at
  return { ...withBonus, game: bumpToday(g1, { perfectLessons: 1 }) }
}

/* ------------------------------ Haftalik sandiq ------------------------------ */

/** Shu haftada faol bo'lgan kunlar soni ( sekund ≥ 60 yoki urinish > 0 ). */
export function activeDaysInWeek(data: AppData, weekStart: string): number {
  let n = 0
  for (let i = 0; i < 7; i++) {
    const a = data.activity[shiftDay(weekStart, i)]
    if (a && (a.seconds >= 60 || a.attempts > 0)) n += 1
  }
  return n
}

/** Haftalik sandiq: kamida `CHEST_MIN_ACTIVE_DAYS` faol kun → gem (bir marta). */
export function settleChest(data: AppData, now = Date.now()): AppData {
  void now
  const g = data.game
  const week = weekStartOf(g.today.day)
  if (g.chestsWeeks.includes(week)) return data
  if (activeDaysInWeek(data, week) < CHEST_MIN_ACTIVE_DAYS) return data
  return { ...data, game: { ...g, gems: g.gems + CHEST_GEM_REWARD, chestsWeeks: [...g.chestsWeeks, week] } }
}

/* ------------------------------ Streak va qalqonlar ------------------------------ */

/** Faol kunlar ro'yxati (zanjir uchun): sekund ≥ 60 yoki urinish > 0. */
export function activeDayKeys(data: AppData): string[] {
  return Object.values(data.activity)
    .filter((a) => a.seconds >= 60 || a.attempts > 0)
    .map((a) => a.date)
}

/**
 * Zanjir — qalqon (freeze) kunlari HISOBGA OLINIB hisoblanadi. Duolingo'da
 * 1 freeze = 1 o'tkazib yuborilgan kun; bu yerda `frozenDays` dagi sanalar
 * "faol" deb qo'shiladi, shuning uchun qoplangan kun zanjirni uzmaydi.
 */
export function streakWithFreezes(data: AppData, today = todayKey()): number {
  const days = [...activeDayKeys(data), ...data.game.frozenDays]
  return streakFor([...new Set(days)], today)
}

/**
 * Uzilgan kunga qalqon qo'yish. Duolingo qoidasi: BITTA freeze BITTA o'tkazib
 * yuborilgan kunni qoplaydi va u avtomatik ishlatiladi. Bu funksiya shunga mos
 * ravishda chaqiruvda ENG KO'PI BITTA kunni qoplaydi — uzilish uzun bo'lsa
 * keyingi `settle()` (daqiqada bir) navbatdagi kunni ham qoplaydi.
 *
 * Ikki shart (2026-11-07 qayta ko'rib chiqildi):
 *  1. Qoplanadigan kun zanjirning DAMIGA qo'shni bo'lishi kerkin — ya'ni
 *     bugundan orthga butun kunlar ketma-ketligidan keyin kelgan birinchi
 *     bo'sh kun. Aks holda qalqon "bo'shga" ketadi.
 *  2. Uzilishdan ORTDA ham faol (yoki qoplangan) kun bo'lishi kerak — shunda
 *     zanjir haqiqatan UZILGAN hisoblanadi. Yangi o'quvchida tarix yo'q,
 *     shuning uchun unga birorta qalqon SARFLANMAYDI (eski kod sarflardi).
 *     Izlash oynasi — `FREEZE_SEARCH_DAYS`; uzilish kecha emas, bir necha kun
 *     oldin ham boshlangan bo'lishi mumkin. ESKI XATO: oyna `MAX_FREEZES`
 *     (ombordagi son) edi — chuqurroq uzilish umuman KO'RMAS qolardi.
 */
export function applyFreezes(data: AppData, today = todayKey()): AppData {
  const g = data.game
  if (g.freezes <= 0) return data
  const active = new Set(activeDayKeys(data))
  const frozen = new Set(g.frozenDays)
  const covered = (d: string) => active.has(d) || frozen.has(d)

  let gap = ''
  let gapBack = 0
  for (let back = 1; back <= FREEZE_SEARCH_DAYS; back++) {
    const d = shiftDay(today, -back)
    if (covered(d)) continue
    gap = d
    gapBack = back // zanjir dami shu yerda tugadi
    break
  }
  if (gap === '') return data // butun — qalqon kerak emas

  // Uzilishdan ortda faol (yoki qoplangan) kun bormi? Yo'q bo'lsa zanjir
  // uzilmagan hisoblanadi — qalqon sarflanmaydi.
  let anchored = false
  for (let back = gapBack + 1; back <= FREEZE_SEARCH_DAYS + 1; back++) {
    if (covered(shiftDay(today, -back))) {
      anchored = true
      break
    }
  }
  if (!anchored) return data

  return { ...data, game: { ...g, freezes: g.freezes - 1, frozenDays: [...g.frozenDays, gap] } }
}
