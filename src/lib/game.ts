/**
 * O'yin qatlamining mantig'i — SOF funksiqlar (React'ga bog'liq emas).
 *
 * Barcha sonlar `gameConfig.ts` dan olinadi; mobil tomonda shu funksiqlarning
 * Kotlin nusxasi bor (`domain/GameLogic.kt`) va `src/test/game-config.test.ts`
 * ikkala tarafning JADVAL sonlarini solishtiradi.
 *
 * Halollik qoidasi: bu fayl hech qachon son "ixtiro" qilmaydi — har bir
 * o'zgarish `AppData` dagi mavjud hisoblamalardan (attempts, activity, srs)
 * yoki `gameConfig` dagi e'lon qilingan qiymatdan kelib chiqadi.
 */

import {
  ACHIEVEMENTS,
  BET_COST_GEMS,
  BET_DAYS,
  BET_STREAK_DAYS,
  BET_WIN_GEMS,
  CHEST_GEM_REWARD,
  CHEST_MIN_ACTIVE_DAYS,
  FREEZE_GEM_COST,
  FREEZE_MILESTONES,
  FREEZE_SEARCH_DAYS,
  GOAL_GEM_REWARD,
  HEARTS_COST_WRONG,
  HEARTS_MAX,
  HEART_COMBO_STREAK,
  HEART_FREE_SOURCES,
  HEART_GATE_MIN,
  HEART_PRACTICE_REVIEWS,
  HEART_REFILL_MINUTES,
  LESSON_BONUS_XP,
  LESSON_MIN_EXERCISES,
  LEAGUES,
  LEAGUE_BOARD_SIZE,
  LEAGUE_PRIZE_GEMS,
  MAX_FREEZES,
  PERFECT_LESSON_BONUS_XP,
  QUESTS_PER_DAY,
  QUEST_GEM_REWARD,
  QUEST_POOL,
  SHOP,
  XP_BOOST_MINUTES,
  XP_BOOST_MULT,
  clampNumber,
  leagueById,
  leagueFor,
  type AchievementSpec,
  type LeagueId,
  type QuestKind,
  type QuestSpec,
  type ShopItemId,
} from './gameConfig'
import { streakFor, xpForAttempt } from './skillScoring'
import type { AppData, DayActivity, GameState, LeagueSnapshot, TodayCounters } from './types'
import { emptyGame, todayKey } from './types'

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

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
function dayHash(s: string): number {
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
function activeDaysInWeek(data: AppData, weekStart: string): number {
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

/* ------------------------------ Yutuqlar ------------------------------ */

export interface AchievementView {
  spec: AchievementSpec
  level: number
  value: number
  /** Keyingi darajagacha son (eng yuqori bo'lsa null). */
  nextTarget: number | null
  /** 0..1 — joriy bosqich ichidagi progress. */
  ratio: number
}

/** Yutuq mezonining JORIY qiymati — hammasi `AppData` dan hisoblanadi. */
export function achievementValue(data: AppData, metric: AchievementSpec['metric'], streakDays: number): number {
  switch (metric) {
    case 'xp_total':
      return data.xp
    case 'streak_days':
      return streakDays
    case 'lessons_perfect':
      return data.game.perfectLessonsTotal
    case 'words_learned':
      return Object.values(data.srs).filter((s) => s.learnedAt !== null).length
    case 'attempts_total':
      return data.attempts.length
    case 'minutes_total':
      return Object.values(data.activity).reduce((a, b) => a + Math.floor(b.seconds / 60), 0)
  }
}

export function levelFor(spec: AchievementSpec, value: number): number {
  let lvl = 0
  for (const t of spec.levels) if (value >= t) lvl += 1
  return lvl
}

export function achievementViews(data: AppData, streakDays: number): AchievementView[] {
  return ACHIEVEMENTS.map((spec) => {
    const value = achievementValue(data, spec.metric, streakDays)
    const level = levelFor(spec, value)
    const nextTarget = level < spec.levels.length ? spec.levels[level]! : null
    const prev = level > 0 ? spec.levels[level - 1]! : 0
    const ratio = nextTarget === null ? 1 : nextTarget === prev ? 1 : Math.min(1, Math.max(0, (value - prev) / (nextTarget - prev)))
    return { spec, level, value, nextTarget, ratio }
  })
}

/**
 * Yangi ochilgan yutuq darajalari: nishon (`badges` — bu ro'yxat endi HAQIQIY
 * to'ldiriladi), gem va streak bosqichlarida qalqon beriladi.
 * `achievementLevels` da nechinchi daraja berilgan saqlanadi — qayta
 * hisoblansa ham takror sovg'a yo'q.
 */
export function settleAchievements(data: AppData, streakDays: number, now = Date.now()): AppData {
  const g = data.game
  let gems = g.gems
  let freezes = g.freezes
  const levels = { ...g.achievementLevels }
  const newBadges: { id: string; titleUz: string; at: number }[] = []
  for (const spec of ACHIEVEMENTS) {
    const value = achievementValue(data, spec.metric, streakDays)
    const reached = levelFor(spec, value)
    const given = levels[spec.id] ?? 0
    for (let lvl = given + 1; lvl <= reached; lvl++) {
      newBadges.push({ id: `${spec.id}-${lvl}`, titleUz: `${spec.titleUz} — ${lvl}-daraja`, at: now })
      gems += spec.gemReward
      if (spec.metric === 'streak_days') {
        const days = spec.levels[lvl - 1]!
        freezes = Math.min(MAX_FREEZES, freezes + (FREEZE_MILESTONES[days] ?? 0))
      }
    }
    if (reached > given) levels[spec.id] = reached
  }
  if (newBadges.length === 0) return data
  return {
    ...data,
    badges: [...data.badges, ...newBadges],
    game: { ...g, gems, freezes, achievementLevels: levels },
  }
}

/* ------------------------------ Kunlik maqsad ------------------------------ */

export interface GoalView {
  target: number
  value: number
  reached: boolean
  ratio: number
  left: number
}

export function goalView(data: AppData): GoalView {
  const target = Math.round(data.settings.xpGoalXp)
  const value = data.game.today.xp
  return { target, value, reached: value >= target, ratio: target <= 0 ? 0 : Math.min(1, value / target), left: Math.max(0, target - value) }
}

/** Kunlik maqsadga BIRINCHI MARTA yetish — gem (kuniga bir marta). */
export function settleGoal(data: AppData, now = Date.now()): AppData {
  void now
  const g = data.game
  if (g.goalRewardedDay === g.today.day) return data
  if (!goalView(data).reached) return data
  return { ...data, game: { ...g, gems: g.gems + GOAL_GEM_REWARD, goalRewardedDay: g.today.day } }
}

/* ------------------------------ Do'kon (gem) ------------------------------ */

export interface BuyOutcome {
  data: AppData
  ok: boolean
  reasonUz: string | null
}

/** Do'kon ro'yxati — narxlar `SHOP` da (mobil tomonda bir xil jadval). */
export const SHOP_ITEMS: { id: ShopItemId; titleUz: string; price: number; noteUz: string }[] = [
  { id: 'refill', titleUz: 'Yuraklarni to‘ldirish', price: SHOP.refill, noteUz: `Barcha yuraklar darhol ${HEARTS_MAX} tagacha qaytadi.` },
  { id: 'heart', titleUz: 'Bitta yurak', price: SHOP.heart, noteUz: 'Bitta yurak qo‘shiladi (keyingi xatoga bardosh).' },
  { id: 'freeze', titleUz: 'Streak qalqoni', price: SHOP.freeze, noteUz: `1 kun uzilishni saqlaydi. Omborda eng ko‘p ${MAX_FREEZES} ta.` },
  {
    id: 'xpBoost',
    titleUz: '2× XP byusti',
    price: SHOP.xpBoost,
    noteUz: `${XP_BOOST_MINUTES} daqiqa davomida har javob ${XP_BOOST_MULT}× XP oladi.`,
  },
]

export function priceOf(item: ShopItemId): number {
  return SHOP[item]
}

/** Xarid. Gem yetmasa yuti buyum chegarasida bo'lsa SABABI ochiq qaytadi. */
export function buy(data: AppData, item: ShopItemId, now = Date.now()): BuyOutcome {
  const g = data.game
  const price = priceOf(item)
  if (g.gems < price) {
    return { data, ok: false, reasonUz: `Gem yetmadi: ${price} kerak, sizda ${g.gems}.` }
  }
  if ((item === 'heart' || item === 'refill') && g.hearts >= HEARTS_MAX) {
    return { data, ok: false, reasonUz: `Yuraklar allaqachon to‘la (${HEARTS_MAX}).` }
  }
  if (item === 'freeze' && g.freezes >= MAX_FREEZES) {
    return { data, ok: false, reasonUz: `Omborda allaqachon ${MAX_FREEZES} ta qalqon bor.` }
  }
  if (item === 'xpBoost' && boostActive(g, now)) {
    return { data, ok: false, reasonUz: 'Byust allaqachon faol.' }
  }
  const base = { ...g, gems: g.gems - price }
  const next: GameState =
    item === 'heart' ? { ...base, hearts: Math.min(HEARTS_MAX, g.hearts + 1) } : item === 'refill'
        ? { ...base, hearts: HEARTS_MAX, heartsAt: now, practiceReviews: 0 }
        // `heart`da `heartsAt`ga TEKILMAYMIZ: sotib olingan yurak tiklanish
        // taymerini QAYTA BOSHLAMAYDI — aks holda xarid foydasi bilan birga
        // kutayotgan yurak ham kechikardi.
        : item === 'freeze'
          ? { ...base, freezes: g.freezes + 1 }
          : { ...base, boostUntil: now + XP_BOOST_MINUTES * MINUTE_MS }
  return { data: { ...data, game: next }, ok: true, reasonUz: null }
}

/** "Double or Nothing" garovi (narxlar/kunlar `gameConfig` da — Duolingo 50→100). */
export function placeBet(data: AppData, streakDays: number): BuyOutcome {
  const g = data.game
  if (g.bet) return { data, ok: false, reasonUz: 'Garov allaqachon ochiq.' }
  if (g.gems < BET_COST_GEMS) return { data, ok: false, reasonUz: `Garov uchun ${BET_COST_GEMS} gem kerak.` }
  return {
    data: { ...data, game: { ...g, gems: g.gems - BET_COST_GEMS, bet: { startDay: g.today.day, streakAtStart: streakDays, gems: BET_COST_GEMS } } },
    ok: true,
    reasonUz: null,
  }
}

/**
 * Garovni yakunlash: garov ochilgan kundan `BET_DAYS` kun o'tgan bo'lsa va
 * zanjir `BET_STREAK_DAYS` ga o'sgan bo'lsa gem qaytadi (g'alaba). Shart
 * bajarilmasa gem yo'qolgan hisoblanadi — garovning mohiyati shu.
 */
export function settleBet(data: AppData, streakDays: number): AppData {
  const g = data.game
  const bet = g.bet
  if (!bet) return data
  const daysGone = Math.floor((Date.parse(g.today.day + 'T00:00:00Z') - Date.parse(bet.startDay + 'T00:00:00Z')) / DAY_MS)
  if (daysGone < BET_DAYS) return data
  const won = streakDays >= bet.streakAtStart + BET_STREAK_DAYS
  return { ...data, game: { ...g, bet: null, gems: g.gems + (won ? BET_WIN_GEMS : 0) } }
}

/* ------------------------------ Haftalik XP va liga ------------------------------ */

/**
 * Liga haftasidagi XP: [`weekStart`, `weekStart`+7) oralig'idagi mashq
 * XP'larining yig'indisi. HALOL IZOH: byust va dars bonuslari bu yig'indiga
 * KIRMAYDI — ular `game.today.xp` da alohida yuriladi va qurilmadan qurilmaga
 * farq qilishi mumkin; liga jadvaliga faqat urinishlardan aniq hisoblanadigan
 * qism yuboriladi (ikki qurilma bir xil son yuborishi uchun).
 */
export function weeklyXp(data: AppData, weekStart: string): number {
  const from = Date.parse(weekStart + 'T00:00:00Z')
  const to = from + 7 * DAY_MS
  let sum = 0
  for (const a of data.attempts) {
    if (a.at < from || a.at >= to) continue
    sum += xpForAttempt(a.correct, a.difficulty, true)
  }
  return sum
}

/**
 * O'tgan hafta snapshotiga qarab KEYINGI hafta ligasi.
 *
 * Duolingo qoidasi (manba: https://lingoly.io/duolingo-leagues-in-order/):
 * hafta yakunida tablaning yuqori qatoridagilar yuqoriga ko'tariladi
 * (`promoteTop`: bronze 20, silver 15, gold 10, keyingi 5 tasi 7, obsidian 5,
 * diamond — ko'tarilish yo'q). **Pasaytirish** qoidasi manbalarda TOPILMADI,
 * shuning uchun bu yerda ham yo'q — ixtir qilinmagan.
 *
 * O'rin aniq bo'lmasa (jadvalda biz yo'q edik yoki hafta hali yakunlanmagan)
 * liga O'ZGARMAYDI.
 */
export function promotedLeague(snap: LeagueSnapshot, userId: string): LeagueId {
  const cur = leagueById(snap.leagueId)
  const rank = snap.rank > 0 ? snap.rank : rankOf(snap.entries, userId)
  if (cur.promoteTop <= 0 || rank < 1 || rank > cur.promoteTop) return cur.id
  const idx = LEAGUES.findIndex((l) => l.id === cur.id)
  return LEAGUES[Math.min(LEAGUES.length - 1, idx + 1)]!.id
}

/**
 * Joriy liga haftasi va undagi XP.
 *
 * Liga HAFTA DAVOMIDA BARQAROR: XP o'sib, chegara bosgani uchun o'rtada liga
 * almashtirmaymiz (Duolingo'da ham hafta oxirigacha shu tabloda qolasiz).
 *  - snapshot shu haftaga tegishli bo'lsa — O'SHA liga;
 *  - snapshot oldingi haftaga tegishli bo'lsa — ko'tarilish qoidasi;
 *  - snapshot bo'lmasa (birinchi marta) — XP chegarasiga qarab (`minXp`).
 */
export function leagueWeek(data: AppData, today = todayKey()): { weekStart: string; xp: number; leagueId: LeagueId } {
  const weekStart = weekStartOf(today)
  const xp = weeklyXp(data, weekStart)
  const snap = data.game.league
  if (snap && snap.weekStart === weekStart) return { weekStart, xp, leagueId: leagueById(snap.leagueId).id }
  if (snap && snap.weekStart < weekStart) return { weekStart, xp, leagueId: promotedLeague(snap, data.userId) }
  return { weekStart, xp, leagueId: leagueFor(xp).id }
}

/**
 * Tablodagi o'rin (1 dan). Bizning qatorimiz bo'lmasa 0 — ya'ni hali
 * yuborilmagan; son IXTIR QILINMAYDI.
 */
export function rankOf(board: readonly { userId: string; xp: number }[], userId: string): number {
  const sorted = [...board].sort((a, b) => b.xp - a.xp)
  const i = sorted.findIndex((r) => r.userId === userId)
  return i === -1 ? 0 : i + 1
}

/**
 * Liga sovg'asi: hafta YAKUNLANGAN snapshot uchun bir marta (top-3).
 *
 * `today` — qabul qilinadi, devol qayta O'QILMAYDI: qo'shni `settle()`
 * qadamlari bilan BIR XIL kun hisoblansin uchun. Avval funksiya sanani o'zi
 * qayta olardi (`weekStartOf(todayKey())`), ya'ni `settle()` bitta kun deb
 * belgilagan holatda «hafta hali davom etmoqda» qarori boshqa kunga qarab
 * o'zgarardi — kun o'tgan payt sinov ham, haqiqiy oqib ham boshqacha
 * ishlar edi (2026-11-09 kuni aynan shu sababli sinov yiqildi).
 */
export function settleLeaguePrize(data: AppData, today = todayKey()): AppData {
  const g = data.game
  const snap = g.league
  if (!snap || snap.prizeClaimed) return data
  if (snap.weekStart === weekStartOf(today)) return data // hafta hali davom etmoqda
  const rank = rankOf(snap.entries, data.userId)
  if (rank < 1 || rank > LEAGUE_PRIZE_GEMS.length) return { ...data, game: { ...g, league: { ...snap, prizeClaimed: true } } }
  const gems = LEAGUE_PRIZE_GEMS[rank - 1] ?? 0
  return { ...data, game: { ...g, gems: g.gems + gems, league: { ...snap, prizeClaimed: true } } }
}

/* ------------------------------ Birlashtiruvchi nuqta ------------------------------ */

/**
 * Har qanday o'zgarishdan keyin chaqiriladigan "yig'uvchi": kunni
 * yangilaydi, yuraklarni vaqt bo'yicha tiklaydi, quest/maqsad/sandiq/qalqon/
 * yutuq/garov/liga sovg'alarini beradi. Qayta-qaeta chaqirilsa HAM natija
 * O'WGARMAYDI (idempotent) — har bir sovg'a marta belgilanadi.
 */
export function settle(data: AppData, now = Date.now(), today = todayKey()): AppData {
  // Hech narsa o'zgarmasa SAYO BILAN BIR XIL obyek qaytamiz — chaqiruvchi
  // (store) shu orqali qayta render va saqlashni OLDINI OLADI.
  const fresh = ensureFreshDay(refillHearts(data.game, now), today)
  let d: AppData = fresh === data.game ? data : { ...data, game: fresh }
  d = settleQuests(d, now)
  d = settleGoal(d, now)
  d = settleChest(d, now)
  d = applyFreezes(d, today)
  d = settleAchievements(d, streakWithFreezes(d, today), now)
  d = settleBet(d, streakWithFreezes(d, today))
  d = settleLeaguePrize(d, today)
  return d
}

/* ------------------------------ Saqlanganma normalizatsiyasi ------------------------------ */

/**
 * Eski/ buzilgan saqlanganmadan o'yin holatini xavfsiz holatga keltirish:
 * yetishmovchi maydonlar standart, sonlar chegara ichida. `migrate()` va
 * `mergeRemote()` shu funksiya orqali o'tadi — ilova qulamaydi.
 */
export function normalizeGame(raw: Partial<GameState> | undefined, day = todayKey()): GameState {
  const base = emptyGame(day)
  if (!raw) return base
  const next: GameState = {
    ...base,
    ...raw,
    // `day` SATR bo'lishi shart: son kelsa sana hisobi buziladi, shuning uchun
    // buzoq qiymat bugungi sanaga qaytariladi (mobil `normalizeGameJson` ham
    // shu qoidani qiladi — ikki tomon bir xil natija berishi kerak).
    today: {
      ...base.today,
      ...(raw.today ?? {}),
      day: typeof raw.today?.day === 'string' && raw.today.day !== '' ? raw.today.day : day,
    },
    // Bo'sh satr (= maydon yo'q) HICH QAYSI ro'yxatda qolmaydi: mobil tomon
    // `isNotBlank` / `jStrList` bilan ularni tashlab yuboradi, shuning uchun
    // ikkala mijoz bir xil holatni saqlashi uchu bu yerda ham tashlanadi.
    questsDone: Array.isArray(raw.questsDone)
      ? raw.questsDone.filter((q) => q && typeof q.id === 'string' && q.id !== '')
      : [],
    frozenDays: Array.isArray(raw.frozenDays) ? raw.frozenDays.filter((d) => typeof d === 'string' && d !== '') : [],
    chestsWeeks: Array.isArray(raw.chestsWeeks) ? raw.chestsWeeks.filter((w) => typeof w === 'string' && w !== '') : [],
    // Quest ro'yxati bugungi sana bilan bog'langan — sana yo'q/buziq bo'lsa
    // HOZIRGI kunga qaytariladi (mobil `normalizeGame` ham shu qoidani qiladi).
    questsDay: typeof raw.questsDay === 'string' && raw.questsDay !== '' ? raw.questsDay : day,
    // Sonlar butun va manfiy emas deb o'qiladi — mobil `jIntRecord` ham
    // (`9.7 → 9`, `"2" → 2`) shu qoidani qiladi: ikkala mijoz bir xil
    // «berilgan daraja» sonini saqlashi kerak.
    achievementLevels:
      raw.achievementLevels && typeof raw.achievementLevels === 'object'
        ? Object.fromEntries(
            Object.entries(raw.achievementLevels).map(([k, v]) => [k, Math.max(0, Math.floor(Number(v) || 0))]),
          )
        : {},
    league: raw.league ?? null,
  }
  next.hearts = clampNumber(next.hearts, 0, HEARTS_MAX)
  next.gems = Math.max(0, Math.floor(clampNumber(next.gems, 0, 1_000_000_000)))
  next.freezes = Math.round(clampNumber(next.freezes, 0, MAX_FREEZES))
  next.practiceReviews = Math.max(0, Math.floor(next.practiceReviews))
  next.combo = Math.max(0, Math.floor(next.combo))
  next.perfectLessonsTotal = Math.max(0, Math.floor(next.perfectLessonsTotal))
  next.questsTotal = Math.max(0, Math.floor(next.questsTotal))
  // `heartsAt` 0 yoki yo‘q — maydon UMUMAN YO‘Q degani (`emptyGame` har doim
  // hozirgi vaqtni qo‘yadi). 0 qolsa tiklanish hisobi «mangu vaqt o‘tgan»
  // bo‘lib, yuraklar darhol to‘lib qolardi (mobil `normalizeGame` ham shu
  // qoidani qiladi — ikki tomon bir xil bo‘lishi shart).
  next.heartsAt = Number.isFinite(next.heartsAt) && next.heartsAt > 0 ? next.heartsAt : Date.now()
  next.boostUntil = Number.isFinite(next.boostUntil) ? next.boostUntil : 0
  next.goalRewardedDay = typeof next.goalRewardedDay === 'string' ? next.goalRewardedDay : ''
  if (next.league) {
    const l = next.league
    next.league = {
      // Bo'sh satr ham «yo‘q» hisoblanadi — mobil `clampGame` `ifBlank` bilan
      // shu qoidani qiladi (ikkki tomon bir xil natija berishi shart).
      weekStart: typeof l.weekStart === 'string' && l.weekStart !== '' ? l.weekStart : weekStartOf(day),
      leagueId: leagueById(String(l.leagueId ?? 'bronze')).id,
      rank: Math.max(0, Math.floor(Number(l.rank) || 0)),
      boardSize: Math.max(1, Math.floor(Number(l.boardSize) || LEAGUE_BOARD_SIZE)),
      at: Number.isFinite(l.at) ? l.at : Date.now(),
      entries: Array.isArray(l.entries)
        ? l.entries
            .filter((e) => e && typeof e === 'object' && typeof (e as { userId?: unknown }).userId === 'string')
            .map((e) => ({ userId: String(e.userId), name: String(e.name ?? ''), xp: Math.max(0, Math.floor(Number(e.xp) || 0)) }))
            .slice(0, LEAGUE_BOARD_SIZE)
        : [],
      prizeClaimed: l.prizeClaimed === true,
    }
  }
  if (next.bet) {
    const b = next.bet
    // Bo'sh `startDay` — garov yo'q degani (mobil `normalizeGame` `isNotBlank`
    // bilan, JSON tomoni `jBet` esa `null` qaytaradi — uchtasi bir xil).
    next.bet =
      typeof b.startDay === 'string' && b.startDay !== ''
        ? {
            startDay: b.startDay,
            streakAtStart: Math.max(0, Math.floor(Number(b.streakAtStart) || 0)),
            gems: Math.max(0, Math.floor(Number(b.gems) || BET_COST_GEMS)),
          }
        : null
  }
  return next
}

/** Quest turlari — test tekshiradi (mobil tomonda ham shu ro'yxat). */
export const QUEST_KINDS: readonly QuestKind[] = ['xp', 'attempts', 'reviews', 'perfect_lesson', 'minutes', 'listening', 'speaking']

export { FREEZE_GEM_COST, HEARTS_MAX, LEAGUE_BOARD_SIZE, MAX_FREEZES }
export type { LeagueId, QuestKind }
