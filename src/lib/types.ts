/** Ilovaning mijoz tomonidagi holat tiplari (DB javoblari emas). */

import type { CefrLevel, CoreSkill, Skill } from '../content/types'
import { GAME_DATA_VERSION, HEARTS_MAX, XP_GOAL_TIERS } from './gameConfig'
import type { SrsState } from './srs'
import type { TimerState } from './timer'

export interface UserSettings {
  /** Kundalik reja daqiqalari (boshlang'ich: 90) */
  dailyMinutes: number
  /**
   * Kunlik XP maqsadi (quiz bosqichi). `XP_GOAL_TIERS` dagi qiymatlardan biri
   * — ro'yxat tashqarisidagi son kelsa `migrate()` eng yaqin bosqichga
   * qaytaradi. Daqiqa rejasi (`dailyMinutes`) bilan IKKITA alohida maqsad:
   * birinchi vaqtni, ikkinchisi faollik bahosini (XP) olchaydi.
   */
  xpGoalXp: number
  /**
   * Yuraklar tizimi yoqilganmi. Standart YOQILGAN — 5 dan keyin o'qish
   * to'xtamaydi, lekin xatolar yurak oladi va 0 da "takrorlash darsi" darvozasi
   * qoyiladi (Duolingo mexanikasi). O'chirilsa hech qanday jarima yo'q.
   */
  heartsEnabled: boolean
  currentLevel: CefrLevel
  targetLevel: CefrLevel
  examDate: string | null // YYYY-MM-DD
  /** Kunlik taqsimot — moslashuvchan, zaif ko'nikmalarga qarab o'zgaradi */
  allocation: Record<Skill, number>
  theme: 'light' | 'dark' | 'system'
  /** AI xizmati ulanganmi (sozlamadan ham o'chiriladi) */
  aiEnabled: boolean
  /**
   * Harakat (animatsiya) yoqilganmi. Standart YOQILGAN.
   *
   * Bu maydon `0003_motion.sql`dag `motion_enabled` ustuniga yoziladi — mobil
   * ilova bilan BITTА sinxron qilinadi (telefonning o'z sozlamasi emas,
   * hisobning sozlamasi). Brauzer `prefers-reduced-motion: reduce` so'rovi
   * alohida hurmat qilinadi (`src/index.css`), bu maydon esa qo'shimcha
   * "o'chirish" tugmasi.
   */
  motionEnabled: boolean
}

export const DEFAULT_ALLOCATION: Record<Skill, number> = {
  vocabulary: 10,
  grammar: 15,
  reading: 15,
  listening: 15,
  writing: 20,
  speaking: 15,
}

export const DEFAULT_SETTINGS: UserSettings = {
  dailyMinutes: 90,
  xpGoalXp: XP_GOAL_TIERS[2]!.xp,
  heartsEnabled: true,
  currentLevel: 'A1',
  targetLevel: 'C1',
  examDate: null,
  allocation: { ...DEFAULT_ALLOCATION },
  theme: 'system',
  aiEnabled: true,
  motionEnabled: true,
}

/**
 * Kunlik reja chegarasi — DB'dagi `daily_minutes between 30 and 240` CHECK
 * bilan bir xil. 6 ko'nikma × minimal 5 daqiqa = 30, undan pastga tushmaydi.
 * ESKI BUG: onboarding 15–25 daqiqaga ruxsat berardi — bunday sozlama
 * serverga hech qachon yozilmas, navbatda abadiy "xato" bo'lib qolardi.
 */
export const MIN_DAILY_MINUTES = 30
export const MAX_DAILY_MINUTES = 240

export function clampDailyMinutes(m: number): number {
  if (!Number.isFinite(m)) return DEFAULT_SETTINGS.dailyMinutes
  return Math.max(MIN_DAILY_MINUTES, Math.min(MAX_DAILY_MINUTES, Math.round(m)))
}

/**
 * Kunlik XP maqsadini `XP_GOAL_TIERS` dagi ENG YAQIN bosqichga qaytaradi.
 * Son ixtir qilinmaydi — ro'yxatdagilardan biri qaytadi (bo'sh/buziq kelsa
 * standart bosqich).
 */
export function nearestXpGoal(xp: number): number {
  if (!Number.isFinite(xp)) return DEFAULT_SETTINGS.xpGoalXp
  let best = XP_GOAL_TIERS[2]!.xp
  let bestDiff = Number.POSITIVE_INFINITY
  for (const t of XP_GOAL_TIERS) {
    const d = Math.abs(t.xp - xp)
    if (d < bestDiff) {
      bestDiff = d
      best = t.xp
    }
  }
  return best
}

export type AttemptSource = 'practice' | 'section_test' | 'mock_exam' | 'diagnostic'

export interface AttemptRecord {
  id: string
  exerciseId: string
  skill: Skill
  level: CefrLevel
  correct: boolean
  partial: number
  difficulty: number
  secondsSpent: number
  source: AttemptSource
  answerGiven: string
  at: number
}

export interface WritingSubmission {
  id: string
  taskId: string
  text: string
  wordCount: number
  /** Yozishga sarflangan sekund (taymerdan) */
  secondsSpent: number
  /** rule-based va AI tahlili bitta strukturada */
  analysis: WritingAnalysis | null
  /** Qayta yozish versiyalari shu ustuma orqali bog'lanadi */
  supersedesId: string | null
  createdAt: number
}

export interface WritingAnalysis {
  engine: 'rule-based' | 'ai'
  criteriaScores: Record<CoreCriterionKey, number> // 0..5
  errors: { excerpt: string; kind: string; correction: string; whyUz: string }[]
  strengthsUz: string[]
  weaknessesUz: string[]
  suggestionsUz: string[]
  wordCount: number
}

export type CoreCriterionKey =
  | 'task_achievement'
  | 'coherence'
  | 'lexical_resource'
  | 'grammatical_range'
  | 'accuracy'

export interface SpeakingSession {
  id: string
  taskId: string
  /** Audio faqat foydalanuvchi roziligi bilan saqlanadi (serverga yuborilmaydi) */
  audioBlobStored: boolean
  durationSec: number
  transcript: string | null
  transcriptionEngine: 'browser-speech' | 'ai' | 'none'
  analysis: SpeakingAnalysis | null
  textAnswer: string | null
  createdAt: number
}

export interface SpeakingAnalysis {
  engine: 'rule-based' | 'ai'
  /**
   * 'text' — matnli muqobil javob (mikrofon/transkripsiya ishlamaganda):
   * ravonlik o'lchanmaydi (`fluency`/`wpm` = 0) va bahoga kirmaydi.
   * Yo'q bo'lsa — ovozli javob (eski yozuvlar ham shunday).
   */
  mode?: 'audio' | 'text'
  fluency: number // 0..5, pauza/tezlik asosida
  lexis: number
  grammar: number
  length: number
  wordCount: number
  wpm: number
  notesUz: string[]
  disclaimerUz: string
}

export interface MockExamAttempt {
  id: string
  examId: string
  /** Bo'lim idsi -> javoblar va natija */
  sections: {
    sectionId: string
    skill: CoreSkill
    answered: number
    total: number
    score: number | null
    startedAt: number
    finishedAt: number
    /** Bo'lim haqiqatan ochiq turgan sekundlar (eski yozuvlarda yo'q) */
    secondsUsed?: number
    exerciseResults: Record<string, { correct: boolean; given: string }>
  }[]
  totalScore: number | null
  /** Speaking bahosi rasmiy imtihon natijasi emas */
  speakingAdvisory: string
  completedAt: number
}

export interface DayActivity {
  date: string // YYYY-MM-DD (lokal)
  seconds: number
  attempts: number
  correct: number
  newWords: number
  reviewedWords: number
  skills: Partial<Record<Skill, number>> // skill -> seconds
}

export interface BadgeAward {
  id: string
  titleUz: string
  at: number
}

/**
 * Kun ichida yig'iladigan o'yin hisoblari (questlar shu hissadan tekshiriladi).
 * `day` kaliti o'zgarganda boshqadan boshlanadi — shuning uchun kechasi
 * questlar yong'iladi.
 */
export interface TodayCounters {
  day: string
  /** Bugun berilgan XP (byust va bonuslar BILAN — `attempts`dan qayta hisoblanmaydi). */
  xp: number
  attempts: number
  reviews: number
  perfectLessons: number
}

/** Bir kunda beriladigan quest holati (gem avtomatik beriladi). */
export interface QuestAward {
  id: string
  at: number
}

/** Liga tablolarining SAQLANGAN nusxasi — internet bo'lmasa oxirgi holat ko'rsatiladi. */
export interface LeagueRow {
  userId: string
  name: string
  xp: number
}

export interface LeagueSnapshot {
  /** Hafta boshi (dushanba, lokal sana) — serverdagi `week_start` bilan bir xil. */
  weekStart: string
  leagueId: string
  /** Bizning o'rnimiz (1 dan sanaladi) — jadvalda biz yo'q bo'lsak 0. */
  rank: number
  boardSize: number
  /** Ro'yxat READ qilingan payt (epoch ms). */
  at: number
  entries: LeagueRow[]
  /** Hafta yakunlanib, sovg'a BERILGANMI (takror berilmasin uchun). */
  prizeClaimed: boolean
}

/**
 * O'yin qatlami holati (Duolingo mexanikasi). BARCHA sonlar
 * `src/lib/gameConfig.ts` da (mobil tomonda `res/raw/game_manifest.json`).
 *
 * Sahifa/sinxron uchun: bu obyekt `learning_plans.plan.game` JSON'ida
 * saqlanadi — qo'shimcha jadval FAQAT liga uchun (`weekly_xp`).
 */
export interface GameState {
  version: number
  /* --- yuraklar --- */
  hearts: number
  /** Yuraklar oxirgi o'zgargan payt — oradan `HEART_REFILL_MINUTES` o'tsa bittasi qaytadi. */
  heartsAt: number
  /** Yuraklar toganida: qancha SRS takrorlash keyingi yurakni qaytardi. */
  practiceReviews: number
  /** Ketma-ket to'g'ri javoblar (Energy tizimidagi kabi yurak qaytaradi). */
  combo: number
  /* --- gemlar, byust, himoya --- */
  gems: number
  freezes: number
  /** Faol 2× XP byust tugash payti (0 — yo'q). */
  boostUntil: number
  /** "Double or Nothing" garovi (Duolingo: 50 gem → 7 kun streak bo'lsa 100 gem). */
  bet: { startDay: string; streakAtStart: number; gems: number } | null
  /** Qaysi kunlar qalqon (freeze) bilan qoplangan — uzilmagan zanjir uchun. */
  frozenDays: string[]
  /* --- questlar va yutuqlar --- */
  today: TodayCounters
  questsDay: string
  questsDone: QuestAward[]
  questsTotal: number
  /** Kunlik maqsad sovg'asi QAYSI kunda berilgan (kuniga bir marta). */
  goalRewardedDay: string
  achievementLevels: Record<string, number>
  /** Xatosiz tugatilgan darslar (JAMI — yutuq mezoni). */
  perfectLessonsTotal: number
  /** Bajarilgan haftalik sandiq haftalari (takror ochilmasin uchun). */
  chestsWeeks: string[]
  /** So'nggi o'qilgan liga tablasi (offline — oxirgi snapshot). */
  league: LeagueSnapshot | null
}

export interface AppData {
  version: number
  userId: string
  settings: UserSettings
  /** user_vocabulary: vocabId -> SRS holati */
  srs: Record<string, SrsState>
  attempts: AttemptRecord[]
  activity: Record<string, DayActivity>
  writing: WritingSubmission[]
  speaking: SpeakingSession[]
  mockAttempts: MockExamAttempt[]
  xp: number
  streak: { count: number; lastDate: string | null; freezeUsed?: number }
  badges: BadgeAward[]
  /** O'yin qatlami (yuraklar, gemlar, questlar, ligalar). */
  game: GameState
  /** O'quv yo'li: tugatilgan kunlar va bo'lim testlari */
  path: {
    completedDays: string[] // dayId
    passedTests: Record<string, number> // sectionTestId -> score
    /** Joriy bosqich: tavsiya qilingan keyingi kun */
    currentDayId: string
  }
  /** Diagnostika natijasi (agar topshirilgan bo'lsa) */
  diagnostic: { at: number; level: CefrLevel | null; labelUz: string; confidence: number } | null
  /**
   * `profiles.display_name` ning qurilmadagi KACHI — liga tablasida o'z
   * ismimiz ko'rinishi uchun (`weekly_xp.display_name`ga yoziladi). Serverdan
   * o'qiladi; bo'sh bo'lsa liga ekrani "Siz" deb ko'rsatadi (ism ixtir
   * qilinmaydi).
   */
  profileName: string
  /**
   * Onboarding yakunlangan payt (diagnostika o'tkazib yuborilgan bo'lsa ham).
   * ESKI BUG: "sozlamalar to'ldirilmagan" banneri faqat diagnostikaga qarardi —
   * uni o'tkazib yuborgan foydalanuvchi bannerni har safar ko'rardi.
   */
  onboardedAt: number | null
  /**
   * O'z-o'zini baholash (Likert 1–5): CEFR da'vo id → oxirgi baho va vaqti.
   * Darajaga ham, XP'ga ham ta'sir qilmaydi. Sinxron: `plan.selfAssessment`,
   * birlashtirishda har da'vo bo'yicha ENG KEYINGI (`at`) baho qoladi.
   */
  selfAssessment: Record<string, { score: number; at: number }>
  timer: TimerState
  updatedAt: number
}

/** O'yin holatining boshlang'ichi — `day` buguniga qo'yiladi. */
export function emptyGame(day = todayKey()): GameState {
  return {
    version: GAME_DATA_VERSION,
    hearts: HEARTS_MAX,
    heartsAt: Date.now(),
    practiceReviews: 0,
    combo: 0,
    gems: 0,
    freezes: 0,
    boostUntil: 0,
    bet: null,
    frozenDays: [],
    today: { day, xp: 0, attempts: 0, reviews: 0, perfectLessons: 0 },
    questsDay: day,
    questsDone: [],
    questsTotal: 0,
    goalRewardedDay: '',
    achievementLevels: {},
    perfectLessonsTotal: 0,
    chestsWeeks: [],
    league: null,
  }
}

export const APP_DATA_VERSION = 1

/** Qurilmada saqlanadigan tarix chegaralari (reducer va server birlashmasi uchun bitta manba). */
export const HISTORY_LIMITS = { attempts: 3000, writing: 300, speaking: 300, mockAttempts: 60, leagueEntries: 30 } as const

export function emptyData(userId: string): AppData {
  return {
    version: APP_DATA_VERSION,
    userId,
    settings: { ...DEFAULT_SETTINGS },
    srs: {},
    attempts: [],
    activity: {},
    writing: [],
    speaking: [],
    mockAttempts: [],
    xp: 0,
    streak: { count: 0, lastDate: null },
    badges: [],
    game: emptyGame(),
    // Muhim: ID kontentdagi haqiqiy kun ID'si bilan bir xil bo'lishi shart
    // (`a1-day-01`). Eski qiymat 'a1-day-1' edi — hech qaysi kunga mos
    // kelmasligi sababli O'quv yo'li va Dashboard joriy kunni topaymasdi.
    path: { completedDays: [], passedTests: {}, currentDayId: 'a1-day-01' },
    diagnostic: null,
    onboardedAt: null,
    selfAssessment: {},
    profileName: '',
    timer: { elapsedSec: 0, startedAt: null, sessionId: null, skill: null, updatedAt: Date.now() },
    updatedAt: Date.now(),
  }
}

/** Lokal sana kaliti (YYYY-MM-DD, foydalanuvchi zonasi). */
export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
