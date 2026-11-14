/**
 * Kontent shartnomasi (contract).
 *
 * BU FAYL UI KODIDAN ALOHIDA SAQLANADI.
 * Butun o'quv materiallari (so'zlar, grammatika, matnlar, audio, yozish va
 * gapirish topshiriqlari) shu tiplarga mos kelishi shart. A2, B1, B2, C1
 * kontenti keyin shu kontrakt ustiga qo'shiladi.
 */

import type { CefrLevel, CoreSkill, Skill } from '../content/types'
import type { SrsState } from './srs'
import type { TimerState } from './timer'

export interface UserSettings {
  /** Kundalik reja daqiqalari (boshlang'ich: 90) */
  dailyMinutes: number
  currentLevel: CefrLevel
  targetLevel: CefrLevel
  examDate: string | null // YYYY-MM-DD
  /** Kundalik taqsimot — moslashuvchan, zaif ko'nikmalarga qarab o'zgaradi */
  allocation: Record<Skill, number>
  theme: 'light' | 'dark' | 'system'
  /** AI xizmati ulanganmi (sozlamadan ham o'chiriladi) */
  aiEnabled: boolean
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
  currentLevel: 'A1',
  targetLevel: 'C1',
  examDate: null,
  allocation: { ...DEFAULT_ALLOCATION },
  theme: 'system',
  aiEnabled: true,
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

import type { CefrLevel, CoreSkill, Skill } from '../content/types'
import type { SrsState } from './srs'
import type { TimerState } from './timer'

export interface UserSettings {
  /** Kundalik reja daqiqalari (boshlang'ich: 90) */
  dailyMinutes: number
  currentLevel: CefrLevel
  targetLevel: CefrLevel
  examDate: string | null // YYYY-MM-DD
  /** Kundalik taqsimot — moslashuvchan, zaif ko'nikmalarga qarab o'zgaradi */
  allocation: Record<Skill, number>
  theme: 'light' | 'dark' | 'system'
  /** AI xizmati ulanganmi (sozlamadan ham o'chiriladi) */
  aiEnabled: boolean
}

export const DEFAULT_ALLOCATION: Record<Skill, number> = {
  vocabulary: 10,
  grammar: 15,
  reading: 15,
  listening: 15,
  writing: 20,
  speaking: 15
}

export const DEFAULT_SETTINGS: UserSettings = {
  dailyMinutes: 90,
  currentLevel: 'A1',
  targetLevel: 'C1',
  examDate: null,
  allocation: { ...DEFAULT_ALLOCATION },
  theme: 'system',
  aiEnabled: true
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
  descriptionUz: string
  at: number
  type: 'milestone' | 'streak' | 'completion'
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
  /** O'quv yo'li: tugatilgan kunlar va bo'lim testlari */
  path: {
    completedDays: string[] // dayId
    passedTests: Record<string, number> // sectionTestId -> score
    /** Joriy bosqich: tavsiya qilingan keyingi kun */
    currentDayId: string
  }
  /** Diagnostika natijasi (agar topshirilgan bo'lsa) */
  diagnostic: { at: number; level: CefrLevel | null; labelUz: string; confidence: number } | null
  timer: TimerState
  updatedAt: number
}

export const APP_DATA_VERSION = 1

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
    path: { completedDays: [], passedTests: {}, currentDayId: 'a1-day-01' },
    diagnostic: null,
    timer: { elapsedSec: 0, startedAt: null, sessionId: null, skill: null, updatedAt: Date.now() },
    updatedAt: Date.now(),
  }
}

/**
 * Adaptiv Mantiq uchun qo'shimcha
 */

export interface WeakPoint {
  skill: Skill
  exerciseId: string
  count: number
  lastSeen: number
}

export interface MistakeHistory {
  id: string
  exerciseId: string
  skill: Skill
  wrongAnswer: string
  correctAnswer: string
  explanationUz: string
  at: number
}

export interface AppDataExtended extends AppData {
  /** Zaif nuqtalar ro'yxati */
  weakPoints: WeakPoint[]
  /** Xatolar tarixi */
  mistakeHistory: MistakeHistory[]
}

export interface SrsState {
  nextReview: number // Timestamp
  interval: number // Sekundalar
  easeFactor: number // 2.5 - 3.0
  reviews: number
  stability: number
  lastReview: number | null
  repetition: number // 0: new, 1: learning, 2: reviewing
}

export interface VocabularyItem {
  id: string
  word: string
  translationUz: string
  explanationEn: string
  ipa: string
  pronunciation: { kind: 'browser-tts' | 'audio' | 'none'; ttsText?: string; audioUrl?: string; lang?: string }
  exampleEn: string
  exampleUz: string
  pos: string
  topic: string
  level: CefrLevel
  relations: { synonym?: string[]; antonym?: string[] }
  difficulty?: number // 1-5
  srs_metadata?: {
    last_seen: number
    mastered: boolean
  }
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
  /** O'quv yo'li: tugatilgan kunlar va bo'lim testlari */
  path: {
    completedDays: string[] // dayId
    passedTests: Record<string, number> // sectionTestId -> score
    /** Joriy bosqich: tavsiya qilingan keyingi kun */
    currentDayId: string
  }
  /** Diagnostika natijasi (agar topshirilgan bo'lsa) */
  diagnostic: { at: number; level: CefrLevel | null; labelUz: string; confidence: number } | null
  timer: TimerState
  updatedAt: number
}

export const APP_DATA_VERSION = 1

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
    path: { completedDays: [], passedTests: {}, currentDayId: 'a1-day-01' },
    diagnostic: null,
    timer: { elapsedSec: 0, startedAt: null, sessionId: null, skill: null, updatedAt: Date.now() },
    updatedAt: Date.now(),
  }
}

/** --------------------------- Adaptiv Mantiq uchun qo'shimcha --------------------------- */

/** Foydalanuvchi ko'p xato qilgan mavzular (skill va exerciseId bo'yichi) */
export interface WeakPoint {
  skill: Skill
  exerciseId: string
  count: number
  lastSeen: number
}

/** O'quvchi xatolarining tarixi */
export interface MistakeHistory {
  id: string
  exerciseId: string
  skill: Skill
  wrongAnswer: string
  correctAnswer: string
  explanationUz: string
  at: number
}

export interface AppDataExtended extends AppData {
  /** Zaif nuqtalar ro'yxati */
  weakPoints: WeakPoint[]
  /** Xatolar tarixi */
  mistakeHistory: MistakeHistory[]
}

/**
 * SRS (Spaced Repetition System) holati
 * SM-2 algoritmi asosida qurilgan
 */
export interface SrsState {
  nextReview: number // Timestamp
  interval: number // Sekundalar
  easeFactor: number // 2.5 - 3.0
  reviews: number
  stability: number
  lastReview: number | null
  repetition: number // 0: new, 1: learning, 2: reviewing
}

export interface VocabularyItem {
  id: string
  word: string
  translationUz: string
  explanationEn: string
  ipa: string
  pronunciation: { kind: 'browser-tts' | 'audio' | 'none'; ttsText?: string; audioUrl?: string; lang?: string }
  exampleEn: string
  exampleUz: string
  pos: string
  topic: string
  level: CefrLevel
  relations: { synonym?: string[]; antonym?: string[] }
  difficulty?: number // 1-5
  srs_metadata?: {
    last_seen: number
    mastered: boolean
  }
}
