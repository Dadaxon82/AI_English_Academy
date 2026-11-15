/**
 * O'yin qatlamining BITTA son manbasi (Duolingo uslubidagi mexanika — lekin
 * bizning iqtisodiyotimiz va BIZNING bosh qahramonimiz bilan).
 *
 * HALOLLIK QOIDASI: bu yerdagi har bir son — manbada tekshirilgan DUOLINGO
 * FAKTI yoki BIZNING qarorimiz. Qaysi biri qaysi — izohda yozilgan. Sonlar
 * `src/test/game-config.test.ts` da sanab chiqiladi va mobil tomon
 * (`mobile/.../res/raw/game_manifest.json` + `domain/GameConfig.kt`) BILAN
 * BIR XIL bo'lishi shart (test tenglikni solishtiradi).
 *
 * ASOSIY MANBALAR (2026-11-07 tekshirildi):
 *  - hearts (5 ta, har xato = 1 ta): https://www.duolingo.com/help/what-is-a-streak
 *    va https://practicetestgeeks.com/duolingo/duolingo-earn-hearts/
 *  - "practice to earn hearts" — bitta takrorlash darsni = 1 yurak:
 *    https://lingoly.io/beat-heart-system-duolingo/
 *  - yurak tiklanish oralig'i MANBALARNING ÖZI ZID: 1 soat / 4 soat / 5 soat
 *    (yuqoridagi ikki manba) va Duolingo'ning rasmiy energiya maqolasida
 *    "taxminan bir kun" (https://blog.duolingo.com/duolingo-energy/).
 *    Aniq rasmiy interval TOPILMADI — shuning uchun bizniki (30 daqiqa)
 *    ochiqcha "bizning qarorimiz" deb belgilangan.
 *  - do'kon narxlari (streak freeze 200 gem, yurak tiklash 350/450 gem):
 *    https://lingoly.io/duolingo-streak-freeze/ ,
 *    https://happilyevertravels.com/duolingo-gems-lingots/
 *  - kuniga 3 quest, chestda 4–15 gem: https://cherishstudy.com/duolingo-daily-quests/
 *  - ligalar (10 ta, har birida 30 kishi, yakunda haftalik XP):
 *    https://www.duolingo.com/help/leaderboards-and-league
 *  - achievement darajalari jadvali: https://duolingoguides.com/duolingo-rewards/
 *  - XP byust: 2× va 15 daqiqa: https://lingoly.io/duolingo-xp-boost/
 *  - Duolingo'ning o'zi ham Energy tizimiga o'tgani (eski hearts o'rniga):
 *    https://en.wikipedia.org/wiki/Duolingo
 */

/* ------------------------------ Yuraklar ------------------------------ */

/** Bir paytda bo'lishi mumkin bo'lgan yuraklar (Duolingo: 5 — manbada tasdiqlangan). */
export const HEARTS_MAX = 5

/** Bita xato javob nechta yurak oladi (Duolingo: aynan 1, xato og'irligiga qaramaydi). */
export const HEARTS_COST_WRONG = 1

/**
 * Yurak tiklanish oralig'i (daqiqa). Yuqorida aytilganidek manbalar zid
 * (1/4/5 soat) — 30 daqiqa BIZNING qarorimiz: o'quvchi kuni tugamasligi uchun.
 */
export const HEART_REFILL_MINUTES = 30

/**
 * "Takrorlash darsi" nechta so'z takrorlashdan iborat — shuncha takror
 * tugaganda BITTA yurak qaytadi (Duolingo: "practice to earn hearts", bitta
 * practice darsi = 1 yurak; practice raundi ≈10–15 savol deyilgan —
 * https://practicetestgeeks.com/duolingo/duolingo-earn-hearts/).
 * Bizning lug'at takrorlashimizga mos son (10–15 oralig'i) — 8.
 */
export const HEART_PRACTICE_REVIEWS = 8

/**
 * Ketma-ket nechta to'g'ri javob uchun bitta yurak qaytariladi.
 * Duolingo'ning HEARTS tizimida bundqa qoida yo'q; bu Energy (batareya)
 * tizimidagi "5 ta ketma-ket to'g'ri javob = +1 unit" qoidasidan OLINGAN
 * (https://duolingoguides.com/duolingo-energy-system/). Bizda 5 → 1 yurak.
 */
export const HEART_COMBO_STREAK = 5

/**
 * Yurak JARIMA QILINMAYDIGAN manbalar (`AttemptSource`). Foydalanuvchi
 * tanlovi (2026-11-07): sinov/sanovlarda yurak ketmaydi — o'quvchi o'z
 * darajasini bilib olishi uchun. Amaliy mashq (`practice`) esa yurak oladi.
 * Duolingo'da ham imtihon/sanov turlari uchun yurak talab qilinmaydi.
 */
export const HEART_FREE_SOURCES = ['mock_exam', 'diagnostic', 'section_test'] as const

/** Yurak tizimi yoqilganda xatosiz davom etish uchun minimal yurak (klonda: 0 = darvoza). */
export const HEART_GATE_MIN = 1

/* --------------------------- XP va kunlik maqsad --------------------------- */

/**
 * Duolingo'ning 5 bosqichi (manba: https://lingoly.io/change-duolingo-daily-goals/):
 * Basic 1 XP, Casual 10 XP, Regular 20 XP, Serious 30 XP, Intense 50 XP.
 *
 * BIZNING XP MASSHTABIMIZ BOSHQA: bizda bitta mashq `6 + 2×qiyinlik` XP beradi
 * (10 mashqli dars ≈ 100 XP), Duolingo'da dars = 10 XP. Shuning uchun har bir
 * bosqich ≈ 10 marta kattalashtirilgan — bosqichLAR soni va tartibi Duolingo'dek.
 */
export interface XpGoalTier {
  id: string
  titleUz: string
  xp: number
}

export const XP_GOAL_TIERS: XpGoalTier[] = [
  { id: 'basic', titleUz: 'Boşlanğiç', xp: 50 },
  { id: 'casual', titleUz: 'Oddiy', xp: 100 },
  { id: 'regular', titleUz: 'Muntazam', xp: 200 },
  { id: 'serious', titleUz: 'Jiddiy', xp: 300 },
  { id: 'intense', titleUz: 'Faol', xp: 500 },
]

/** Standart bosqich — Duolingo'da "Regular" (20 XP), bizda 200 XP. */
export const XP_GOAL_DEFAULT_ID = 'regular'

export function xpGoalFor(tierId: string): number {
  const found = XP_GOAL_TIERS.find((t) => t.id === tierId)
  return found ? found.xp : XP_GOAL_TIERS[2]!.xp
}

/**
 * XP byust: 2× va 15 daqiqa (Duolingo'da aynan shu — manbada tasdiqlangan).
 * Duolingo 2026'da byustni GEM BILAN SOTMAYDI (quests/chests orqali yutiladi);
 * bizda sotiladi — bu BIZNING farqimiz, narxi quyidagi SHOP' da.
 */
export const XP_BOOST_MINUTES = 15
export const XP_BOOST_MULT = 2

/** Dars (mashq bloki) yakunidagi bonus XP. */
export const LESSON_BONUS_XP = 10
/** Xatosiz (barcha javob to'g'ri) dars bonusi — BIZNING qarorimiz. */
export const PERFECT_LESSON_BONUS_XP = 10
/** Kamida shuncha mashq bo'lgan dars "dars" hisoblanadi (bonus uchun). */
export const LESSON_MIN_EXERCISES = 3

/* --------------------------- Kundalik questlar --------------------------- */

/** Kuniga 3 quest (Duolingo: 3 ta, 24 soatda yangilanadi — manbada tasdiqlangan). */
export const QUESTS_PER_DAY = 3

/** Bitta quest mukofoti (gem). Duolingo chestida 4–15 gem — o'rtasi. */
export const QUEST_GEM_REWARD = 10

/** Kunlik maqsadga yetganda beriladigan gem (BIZNING qarorimiz). */
export const GOAL_GEM_REWARD = 10

/** Haftalik sandiq (faollik sharti bilan) — BIZNING qarorimiz. */
export const CHEST_GEM_REWARD = 50
export const CHEST_MIN_ACTIVE_DAYS = 4

export type QuestKind =
  | 'xp'
  | 'attempts'
  | 'reviews'
  | 'perfect_lesson'
  | 'minutes'
  | 'listening'
  | 'speaking'

export interface QuestSpec {
  id: string
  kind: QuestKind
  target: number
  /** Izoh — o'zbekcha, ekranda ko'rsatiladi. */
  titleUz: string
}

/**
 * Kunlik questlar hovuzi. Kun sayin TANLANADI (kun tartibiga qarab, quyidagi
 * `questsForDay`), shuning uchun bugun nima so'ralishi oldindan aniq va ikkala
 * qurilmada BIR XIL. Duolingo'dagi amaliy turlar nusxa: "Earn 10/30/50 XP",
 * "Complete 4 lessons", "Review 5/10 mistakes", "Score 90% in 2 lessons",
 * "Spend 15 minutes learning" (https://cherishstudy.com/duolingo-daily-quests/).
 * XP sonlari bizning masshtabimizga mos (×10).
 */
export const QUEST_POOL: QuestSpec[] = [
  { id: 'q-xp-100', kind: 'xp', target: 100, titleUz: '100 XP yiğiring' },
  { id: 'q-att-10', kind: 'attempts', target: 10, titleUz: '10 maşq bajaring' },
  { id: 'q-rev-8', kind: 'reviews', target: 8, titleUz: '8 ta sözni takrorlang' },
  { id: 'q-perf-1', kind: 'perfect_lesson', target: 1, titleUz: 'Bitta darsni xatosiz tugating' },
  { id: 'q-min-900', kind: 'minutes', target: 900, titleUz: '15 daqiqa şuğullaning' },
  { id: 'q-lis-180', kind: 'listening', target: 180, titleUz: 'Tinglaşga 3 daqiqa sarflang' },
  { id: 'q-spk-120', kind: 'speaking', target: 120, titleUz: 'Gapirişga 2 daqiqa sarflang' },
  { id: 'q-xp-300', kind: 'xp', target: 300, titleUz: '300 XP yiğiring' },
  { id: 'q-att-20', kind: 'attempts', target: 20, titleUz: '20 maşq bajaring' },
  { id: 'q-rev-15', kind: 'reviews', target: 15, titleUz: '15 ta sözni takrorlang' },
]

/* --------------------------- Yutuqlar (achievements) --------------------------- */

export type AchievementMetric =
  | 'xp_total'
  | 'streak_days'
  | 'lessons_perfect'
  | 'words_learned'
  | 'attempts_total'
  | 'minutes_total'

export interface AchievementSpec {
  id: string
  metric: AchievementMetric
  /** Darajalar — ketma-ket sonlar (masalan [50, 150, 500]). */
  levels: number[]
  titleUz: string
  /** Birinchi ochilganda bir marta beriladigan gem. */
  gemReward: number
}

/**
 * Darajalar Duolingo jadvalidan (https://duolingoguides.com/duolingo-rewards/):
 *   - streak (Wildfire): 3, 7, 14, 30, 60, 90, 120, 180, 270, 365 kun;
 *   - so'zlar (Word Collector): 50 → 2000 (10 daraja);
 *   - xatosiz darslar (Flawless Finisher): 1, 5, 10, 25, 100;
 *   - XP (XP Olympian): 100 … 30 000 — BIZDA ×10 (yuqoridagi XP masshtabi).
 * Bizda har bir yutuqda 4–6 daraja: o'quvchi ilgariy oladigan oralikda
 * qoldirilgan (10 darajaning oxirlari bir necha yillik).
 * Gem mukofoti ~25 (Duolingo: yangi achievement ≈ 25 gem — manbada aytilgan).
 */
export const ACHIEVEMENTS: AchievementSpec[] = [
  { id: 'a-wildfire', metric: 'streak_days', levels: [3, 7, 14, 30, 90, 365], titleUz: 'Ketma-ketlik', gemReward: 25 },
  { id: 'a-scholar', metric: 'xp_total', levels: [1000, 5000, 10000, 25000, 100000], titleUz: 'Ta’limgon', gemReward: 25 },
  { id: 'a-linguist', metric: 'words_learned', levels: [50, 100, 250, 500, 2000], titleUz: 'Luğatçi', gemReward: 25 },
  { id: 'a-sharp', metric: 'lessons_perfect', levels: [1, 5, 10, 25, 100], titleUz: 'Aniq otiş', gemReward: 25 },
  { id: 'a-practise', metric: 'attempts_total', levels: [100, 500, 2000, 5000], titleUz: 'Maşqparvar', gemReward: 25 },
  { id: 'a-dedicated', metric: 'minutes_total', levels: [60, 300, 900, 1800], titleUz: 'Sadoqatli', gemReward: 25 },
]

/** Yutuqlar soni — testda sanaladi (yangi yutuq qo'shilsa test yangilanadi). */
export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length

/* --------------------------- Streak himoyasi --------------------------- */

/**
 * Streak freeze (Duolingo: 200 gem, oldindan sotib olinadi, 1 ta = 1 o'tkazib
 * yuborilgan kun, BIR VAQTDa 2 tasi saqlanadi — manbada tasdiqlangan).
 * Duolingo'da "Shield" degan tizim MANBADA TOPILMADI — bizda ham faqat freeze.
 */
export const FREEZE_GEM_COST = 200
export const MAX_FREEZES = 2

/**
 * Qalqon qayergacha izlanadi (kun). Bu ombordagi son (`MAX_FREEZES`) EMAS:
 * uzilish kecha emas, bir necha kun oldin ham bo'lishi mumkin. Duolingo'da
 * freeze avtomatik ishlatiladi, qayergacha izlanishi aniq aytilmagan —
 * 14 kun BIZNING qarorimiz (oyiga bir marta uzilishni qoplashga yetadi).
 */
export const FREEZE_SEARCH_DAYS = 14

/**
 * Streak bosqichlarida qo'shimcha freeze beriladi (Duolingo'ning Streak
 * Society mukofotlarida "+3 streak freeze" deyilgan —
 * https://lingoly.io/duolingo-streak-society/). Qaysi bosqichda necha —
 * BIZNING qarorimiz.
 */
export const STREAK_MILESTONES = [7, 30, 90, 365] as const
export const FREEZE_MILESTONES: Record<number, number> = { 7: 1, 30: 1, 90: 2, 365: 2 }

/**
 * "Double or Nothing" garovi (Duolingo: 50 gem tikiladi, 7 kun streak bo'lsa
 * 100 gem qaytadi — https://happilyevertravels.com/duolingo-gems-lingots/).
 */
export const BET_COST_GEMS = 50
export const BET_WIN_GEMS = 100
export const BET_STREAK_DAYS = 7
export const BET_DAYS = 7

/* --------------------------- Do'kon narxlari --------------------------- */
/* Duolingo narxlari SAQLANGAN (manba yuqorida), faqat bitta yurak narxi va
   XP byust narxi bizniki (Duolingo byustni sotmaydi, bitta yurakni alohida
   sotmaydi). */

export const SHOP = {
  /** Bitta yurak narxi (BIZNING qarorimiz: 350/5 ≈ 70). */
  heart: 70,
  /** Yuraklarni darhol to'ldirish (Duolingo do'koni: 350 gem). */
  refill: 350,
  /** Streak freeze (Duolingo: 200 gem). */
  freeze: FREEZE_GEM_COST,
  /** 2× XP byust, 15 daqiqa (bizda sotiladi; Duolingo'da yutiladi). */
  xpBoost: 100,
} as const

export type ShopItemId = keyof typeof SHOP

/* ------------------------------ Ligalar ------------------------------ */

/**
 * Duolingo'da 10 liga (manbada tasdiqlangan tartib): Bronze, Silver, Gold,
 * Sapphire, Ruby, Emerald, Amethyst, Pearl, Obsidian, Diamond.
 * `promoteTop` — ligadan yuqoriga chiqish uchun kirish o'rni (manba:
 * https://lingoly.io/duolingo-leagues-in-order/): Bronze top 20, Silver top 15,
 * Gold top 10, keyingi 5 tasi top 7, Obsidian top 5, Diamond — ko'tarilish yo'q.
 * `minXp` — LIGAGA BIRINCHI MARTA kirish chegarasi: Duolingo'da foydalanuvchi
 * yangi ligada tasodifiy guruhga tushadi (minimal XP sharti manbada aytilmagan),
 * bizda esa real jadval bilan ishlaydigan aniqlik uchun belgilangan — BIZNING
 * qarorimiz.
 */
export const LEAGUES = [
  { id: 'bronze', titleUz: 'Bronza', minXp: 0, promoteTop: 20 },
  { id: 'silver', titleUz: 'Kumuş', minXp: 100, promoteTop: 15 },
  { id: 'gold', titleUz: 'Oltin', minXp: 250, promoteTop: 10 },
  { id: 'sapphire', titleUz: 'Sapfir', minXp: 450, promoteTop: 7 },
  { id: 'ruby', titleUz: 'Rubin', minXp: 700, promoteTop: 7 },
  { id: 'emerald', titleUz: 'Zumrad', minXp: 1000, promoteTop: 7 },
  { id: 'amethyst', titleUz: 'Ametist', minXp: 1500, promoteTop: 7 },
  { id: 'pearl', titleUz: 'Marvarid', minXp: 2200, promoteTop: 7 },
  { id: 'obsidian', titleUz: 'Obsidian', minXp: 3000, promoteTop: 5 },
  { id: 'diamond', titleUz: 'Olmos', minXp: 4000, promoteTop: 0 },
] as const

export type LeagueId = (typeof LEAGUES)[number]['id']

/**
 * Haftalik tabloda nechta o'yinchi ko'rsatiladi. Duolingo: har ligada 30 kishi
 * (manbada tasdiqlangan). Bizda real foydalanuvchilar kam bo'lishi mumkin —
 * ro'yxat 30 dan kam bo'lsa EKRANDA OCHIQ aytiladi (maxaluviy hisob emas).
 */
export const LEAGUE_BOARD_SIZE = 30

/** Liga yakunida top-3 ga beriladigan gem (Duolingo: "top 3 earns gems";
 *  aniq sonlar manbada yo'q — BIZNING qarorimiz). */
export const LEAGUE_PRIZE_GEMS: readonly number[] = [100, 50, 30]

/* ----------------------------- Umumiy ----------------------------- */

export const GAME_DATA_VERSION = 1

export function clampNumber(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

export function leagueFor(xpWeekly: number): (typeof LEAGUES)[number] {
  let cur: (typeof LEAGUES)[number] = LEAGUES[0]!
  for (const l of LEAGUES) if (xpWeekly >= l.minXp) cur = l
  return cur
}

/** `id` bo'yicha ligaga topadi (noma'lum bo'lsa eng pastgi). */
export function leagueById(id: string): (typeof LEAGUES)[number] {
  return LEAGUES.find((l) => l.id === id) ?? LEAGUES[0]!
}
