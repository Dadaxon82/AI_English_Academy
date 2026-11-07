/**
 * O'yin qatlami SONLARINING BIR XILLIGI — veb (`src/lib/gameConfig.ts`) va
 * mobil (`mobile/app/src/main/res/raw/game_manifest.json`).
 *
 * Nega bu test: o'yin iqtisodiyoti (yuraklar, gemlar, questlar, ligalar) foydalanuvchi
 * telefon va brauzerda BIR XIL bo'lishi kerak. Sonlar Tillarga tarqalsa, brauzerda
 * 50 gemlik narsa telefonda 100 gem bo'lib qoladi — foydalanuvchi buni "xato" deb
 * biladi. Shuning uchun qoida: sonlar BITTA joyda, mobil manifest esa nusxa.
 *
 * Test ikkala tomondagi manifestdagi har bir SONNI solishtiradi (`motion.test.ts`
 * uslubida). Mobil tomonda shu qoidalarning Kotlin nusxasi:
 * `mobile/app/src/test/java/.../data/GameManifestTest.kt`.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_COUNT,
  BET_COST_GEMS,
  BET_DAYS,
  BET_STREAK_DAYS,
  BET_WIN_GEMS,
  CHEST_GEM_REWARD,
  CHEST_MIN_ACTIVE_DAYS,
  FREEZE_GEM_COST,
  FREEZE_MILESTONES,
  GAME_DATA_VERSION,
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
  STREAK_MILESTONES,
  XP_BOOST_MINUTES,
  XP_BOOST_MULT,
  XP_GOAL_DEFAULT_ID,
  XP_GOAL_TIERS,
  clampNumber,
  leagueById,
  leagueFor,
  xpGoalFor,
} from '../lib/gameConfig'

const ROOT = process.cwd()
const mobileManifest = path.join(ROOT, 'mobile/app/src/main/res/raw/game_manifest.json')

function manifest(): Record<string, unknown> {
  return JSON.parse(readFileSync(mobileManifest, 'utf8')) as Record<string, unknown>
}

describe('O‘yin sonlari — veb ↔ mobil manifest BIR XIL', () => {
  it('mobil manifest mavjud va izoh bilan (_comment)', () => {
    const raw = manifest()
    expect(typeof raw._comment).toBe('string')
    expect((raw._comment as string).length, 'manifestda izoh bo‘lishi kerak').toBeGreaterThan(50)
  })

  it('yuraklar, byust va dars bonuslari teng', () => {
    const m = manifest()
    expect(m.heartsMax).toBe(HEARTS_MAX)
    expect(m.heartsCostWrong).toBe(HEARTS_COST_WRONG)
    expect(m.heartRefillMinutes).toBe(HEART_REFILL_MINUTES)
    expect(m.heartPracticeReviews).toBe(HEART_PRACTICE_REVIEWS)
    expect(m.heartComboStreak).toBe(HEART_COMBO_STREAK)
    expect(m.heartGateMin).toBe(HEART_GATE_MIN)
    expect(m.xpBoostMinutes).toBe(XP_BOOST_MINUTES)
    expect(m.xpBoostMult).toBe(XP_BOOST_MULT)
    expect(m.lessonBonusXp).toBe(LESSON_BONUS_XP)
    expect(m.perfectLessonBonusXp).toBe(PERFECT_LESSON_BONUS_XP)
    expect(m.lessonMinExercises).toBe(LESSON_MIN_EXERCISES)
  })

  it('yurak jarimasi bo‘lmagan manbalar ikkala tomonda BIR XIL', () => {
    // `section_test` 2026-11-07 qo'shildi — bo'lim testi ham yurak olmaydi.
    expect(manifest().heartFreeSources).toEqual([...HEART_FREE_SOURCES])
  })

  it('XP maqsad bosqichlari (sonlar va tartib) teng', () => {
    const m = manifest()
    const tiers = m.xpGoalTiers as { id: string; titleUz: string; xp: number }[]
    expect(tiers.map((t) => t.id)).toEqual(XP_GOAL_TIERS.map((t) => t.id))
    expect(tiers.map((t) => t.xp)).toEqual(XP_GOAL_TIERS.map((t) => t.xp))
    expect(tiers.map((t) => t.titleUz)).toEqual(XP_GOAL_TIERS.map((t) => t.titleUz))
    expect(m.xpGoalDefaultId).toBe(XP_GOAL_DEFAULT_ID)
    expect(xpGoalFor(XP_GOAL_DEFAULT_ID as string)).toBe(200)
  })

  it('questlar hovuzi — id, tur, maqsad VA SARLAVHA teng (tartib BILAN)', () => {
    const m = manifest()
    const pool = m.questPool as { id: string; kind: string; target: number; titleUz: string }[]
    expect(pool.map((q) => [q.id, q.kind, q.target])).toEqual(QUEST_POOL.map((q) => [q.id, q.kind, q.target]))
    // Mobil `parseGameManifest` har qatorda `titleUz` TALAB qiladi (yo'qsa butun
    // manifest `null` bo'ladi), shuning uchun sarlavhalar ham solishtiriladi.
    // 2026-11-08: manifestda sarlavha yo'qligi aynan shu testda ushlanmagan edi.
    expect(pool.map((q) => q.titleUz)).toEqual(QUEST_POOL.map((q) => q.titleUz))
    expect(m.questsPerDay).toBe(QUESTS_PER_DAY)
    expect(m.questGemReward).toBe(QUEST_GEM_REWARD)
    expect(m.goalGemReward).toBe(GOAL_GEM_REWARD)
    expect(m.chestGemReward).toBe(CHEST_GEM_REWARD)
    expect(m.chestMinActiveDays).toBe(CHEST_MIN_ACTIVE_DAYS)
  })

  it('yutuqlar jadvali — id, mezoni, darajalar, gem VA SARLAVHA teng', () => {
    const m = manifest()
    const ach = m.achievements as { id: string; metric: string; levels: number[]; gem: number; titleUz: string }[]
    expect(ach.map((a) => [a.id, a.metric, a.levels.join(','), a.gem])).toEqual(
      ACHIEVEMENTS.map((a) => [a.id, a.metric, a.levels.join(','), a.gemReward]),
    )
    // Yuqidagidek: mobil parser `titleUz` bo'lmasa manifestni butunlay rad etadi.
    expect(ach.map((a) => a.titleUz)).toEqual(ACHIEVEMENTS.map((a) => a.titleUz))
    expect(m.achievementCount).toBe(ACHIEVEMENT_COUNT)
  })

  it('streak himoyasi va garov sonlari teng', () => {
    const m = manifest()
    expect(m.freezeGemCost).toBe(FREEZE_GEM_COST)
    expect(m.maxFreezes).toBe(MAX_FREEZES)
    expect(m.streakMilestones).toEqual([...STREAK_MILESTONES])
    expect(m.freezeMilestones).toEqual(Object.fromEntries(Object.entries(FREEZE_MILESTONES).map(([k, v]) => [k, v])))
    expect(m.betCostGems).toBe(BET_COST_GEMS)
    expect(m.betWinGems).toBe(BET_WIN_GEMS)
    expect(m.betStreakDays).toBe(BET_STREAK_DAYS)
    expect(m.betDays).toBe(BET_DAYS)
  })

  it('do‘kon narxlari teng (Duolingo narxlari — manba bilan belgilangan)', () => {
    const m = manifest()
    const shop = m.shop as Record<string, unknown>
    expect(shop.heart).toBe(SHOP.heart)
    expect(shop.refill).toBe(SHOP.refill)
    expect(shop.freeze).toBe(SHOP.freeze)
    expect(shop.xpBoost).toBe(SHOP.xpBoost)
  })

  it('ligalar — 10 ta, tartibi va promoteTop Duolingo jadvali bilan teng', () => {
    const m = manifest()
    const leagues = m.leagues as { id: string; titleUz: string; minXp: number; promoteTop: number }[]
    expect(leagues.map((l) => l.id)).toEqual([
      'bronze',
      'silver',
      'gold',
      'sapphire',
      'ruby',
      'emerald',
      'amethyst',
      'pearl',
      'obsidian',
      'diamond',
    ])
    expect(leagues.map((l) => [l.id, l.titleUz, l.minXp, l.promoteTop])).toEqual(
      LEAGUES.map((l) => [l.id, l.titleUz, l.minXp, l.promoteTop]),
    )
    expect(m.leagueBoardSize).toBe(LEAGUE_BOARD_SIZE)
    expect(m.leaguePrizeGems).toEqual([...LEAGUE_PRIZE_GEMS])
  })

  it('har bir sonning MANBASI manifestda ochiq yozilgan (ixtirga qarshi)', () => {
    // Har bir `*Source` maydoni majburiy — "biznik" yoki manba URL'i.
    const m = manifest()
    for (const key of ['heartRefillMinutes', 'heartPracticeReviews', 'heartComboStreak', 'heartFreeSources', 'heartGateMin', 'xpBoost', 'lessonBonusXp', 'perfectLessonBonusXp', 'lessonMinExercises', 'questsPerDay', 'questGemReward', 'goalGemReward', 'chestGemReward', 'chestMinActiveDays', 'achievementCount', 'freezeGemCost', 'maxFreezes', 'streakMilestones', 'freezeMilestones', 'bet', 'leagues', 'leaguePrize', 'gameDataVersion']) {
      const src = m[`${key}Source`]
      expect(typeof src, `manifestda ${key}Source bo‘lishi kerak`).toBe('string')
      expect((src as string).length).toBeGreaterThan(3)
    }
    // XP bosqichlarida ham har bir satrda `src` bor.
    for (const t of m.xpGoalTiers as { src?: string }[]) expect(typeof t.src).toBe('string')
    for (const q of m.questPool as { src?: string }[]) expect(typeof q.src).toBe('string')
    for (const a of m.achievements as { src?: string }[]) expect(typeof a.src).toBe('string')
  })

  it('manifestda son ixtir qilinmagan — veb tomonda ham izoh bor', () => {
    // `gameConfig.ts` matnida ikkita asosiy manba domenlari sanalgan: ular
    // o'chirib yuborilsa test signal beradi (manba izohi yo'qoladi).
    const src = readFileSync(path.join(ROOT, 'src/lib/gameConfig.ts'), 'utf8')
    for (const host of ['duolingo.com', 'lingoly.io', 'cherishstudy.com', 'duolingoguides.com']) {
      expect(src.includes(host), `gameConfig.ts da ${host} manbasi qolmagan`).toBe(true)
    }
    expect(src.includes('BIZNING qarorimiz'), 'biznik sonlar ochiq belgilanishi kerak').toBe(true)
  })

  it('manifest versiyasi veb GAME_DATA_VERSION bilan bir xil', () => {
    const m = manifest()
    expect(m.gameDataVersion).toBe(GAME_DATA_VERSION)
    expect(m.version).toBe(GAME_DATA_VERSION)
  })
})

describe('Son yordamchilari (chegara va liga jadvali)', () => {
  it('clampNumber — chegaraga keltiradi, NaN eng pastga', () => {
    expect(clampNumber(12, 0, 5)).toBe(5)
    expect(clampNumber(-3, 0, 5)).toBe(0)
    expect(clampNumber(Number.NaN, 0, 5)).toBe(0)
    expect(clampNumber(3, 0, 5)).toBe(3)
    expect(clampNumber(Number.POSITIVE_INFINITY, 0, 5)).toBe(0)
  })

  it('leagueFor — chegaralar bo‘yicha siljiydi, Diamond dan yuqori YO‘Q', () => {
    expect(leagueFor(0).id).toBe('bronze')
    expect(leagueFor(99).id).toBe('bronze')
    expect(leagueFor(100).id).toBe('silver')
    expect(leagueFor(4000).id).toBe('diamond')
    expect(leagueFor(999_999).id).toBe('diamond')
  })

  it('leagueById — nomaʼlum id eng pastgidan ochiq boshlanadi (ixtir yo‘q)', () => {
    expect(leagueById('gold').id).toBe('gold')
    expect(leagueById('platina').id).toBe('bronze')
  })

  it('xpGoalFor — nomaʼlum bosqich standartga qaytadi', () => {
    expect(xpGoalFor('serious')).toBe(300)
    expect(xpGoalFor('juda-jiddiy')).toBe(200)
  })
})
