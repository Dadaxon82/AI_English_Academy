/** O'yin qatlami — yutuqlar, kunlik maqsad, do'kon, liga, birlashtiruvchi `settle`, normalizatsiya. */
import { ACHIEVEMENTS, BET_COST_GEMS, BET_DAYS, BET_STREAK_DAYS, BET_WIN_GEMS, FREEZE_GEM_COST, FREEZE_MILESTONES, GOAL_GEM_REWARD, HEARTS_MAX, LEAGUES, LEAGUE_BOARD_SIZE, LEAGUE_PRIZE_GEMS, MAX_FREEZES, SHOP, XP_BOOST_MINUTES, XP_BOOST_MULT, clampNumber, leagueById, leagueFor, type AchievementSpec, type LeagueId, type QuestKind, type ShopItemId } from './gameConfig'
import { xpForAttempt } from './skillScoring'
import type { AppData, GameState, LeagueSnapshot } from './types'
import { emptyGame, todayKey } from './types'
import { DAY_MS, MINUTE_MS, applyFreezes, boostActive, ensureFreshDay, refillHearts, settleChest, settleQuests, streakWithFreezes, weekStartOf } from './gameCore'

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
  { id: 'refill', titleUz: 'Yuraklarni töldiriş', price: SHOP.refill, noteUz: `Barça yuraklar darhol ${HEARTS_MAX} tagaça qaytadi.` },
  { id: 'heart', titleUz: 'Bitta yurak', price: SHOP.heart, noteUz: 'Bitta yurak qöşiladi (keyingi xatoga bardoş).' },
  { id: 'freeze', titleUz: 'Streak qalqoni', price: SHOP.freeze, noteUz: `1 kun uzilişni saqlaydi. Omborda eng köp ${MAX_FREEZES} ta.` },
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
    return { data, ok: false, reasonUz: `Yuraklar allaqaçon töla (${HEARTS_MAX}).` }
  }
  if (item === 'freeze' && g.freezes >= MAX_FREEZES) {
    return { data, ok: false, reasonUz: `Omborda allaqaçon ${MAX_FREEZES} ta qalqon bor.` }
  }
  if (item === 'xpBoost' && boostActive(g, now)) {
    return { data, ok: false, reasonUz: 'Byust allaqaçon faol.' }
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
  if (g.bet) return { data, ok: false, reasonUz: 'Garov allaqaçon oçiq.' }
  if (g.gems < BET_COST_GEMS) return { data, ok: false, reasonUz: `Garov uçun ${BET_COST_GEMS} gem kerak.` }
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
