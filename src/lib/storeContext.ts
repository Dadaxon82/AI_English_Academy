/** Store konteksti va `useStore` hook'i (provider — store.tsx). */

import { createContext, useContext } from 'react'
import type { CefrLevel, CoreSkill, Exercise, Skill } from '../content/types'
import { type SrsGrade } from './srs'
import { planProgress } from './timer'
import { evaluateLevelPromotion, type SkillEvidence } from './skillScoring'
import { goalView, heartsView, leagueWeek, questView, type AchievementView } from './game'
import { SHOP_ITEMS } from './game'
import type { ShopItemId } from './gameConfig'
import { type Allocation } from './planning'
import type { AppData, AttemptSource, MockExamAttempt, SpeakingSession, UserSettings, WritingSubmission } from './types'

// ---------- Context ----------

export interface StoreValue {
  data: AppData
  ready: boolean
  netOnline: boolean
  allocation: Allocation
  evidence: SkillEvidence[]
  promotion: ReturnType<typeof evaluateLevelPromotion>
  streak: number
  /** Zanjir + qalqon (freeze) kunlari hisobga olingan holda (o'yin ko'rsatkichi). */
  streakProtected: number
  learnedCount: number
  /** Asosiy lug'at bo'yicha "o'rganilgan/jami"; matn (glossariy) so'zlari alohida belgilanadi. */
  vocabSummary: string
  dueCount: number
  timerElapsed: number
  timerLabel: string
  dayProgress: ReturnType<typeof planProgress>
  /* --- O'yin qatlami (Duolingo mexanikasi, `src/lib/game.ts`) --- */
  /** Yuraklar holati (son, tiklanish vaqti, darvoza, byust). */
  hearts: ReturnType<typeof heartsView>
  /** Kunlik XP maqsadi (bugungi XP / tanlangan bosqich). */
  goal: ReturnType<typeof goalView>
  /** Bugungi 3 quest holati (kun kalitiga qarab — ikkala qurilmada bir xil). */
  quests: ReturnType<typeof questView>
  /** Yutuqlar (daraja, mezon qiymati, keyingi bosqich). */
  achievements: AchievementView[]
  /** Joriy liga haftasi (hafta boshi, XP, liga id) — `leagueWeek()`dan, ixtir yo'q. */
  league: ReturnType<typeof leagueWeek>
  /** Do'kon ro'yxati (narxlar bilan) — xarid qilish mumkinmi, gem yetadimi. */
  shop: typeof SHOP_ITEMS
  actions: {
    setSettings(patch: Partial<UserSettings>): void
    recordAttempt(input: { exercise: Exercise; correct: boolean; partial: number; given: string; secondsSpent: number; source: AttemptSource }): void
    gradeVocab(vocabId: string, grade: SrsGrade): void
    /** So'zni takrorlash jadvaliga qo'shish (baho emas — xato yoki takror sanalmaydi). */
    saveVocab(vocabId: string): void
    startTimer(sessionId: string, skill: Skill): void
    pauseTimer(): void
    stopTimer(): void
    addWriting(taskId: string, text: string, secondsSpent: number, supersedesId: string | null): WritingSubmission
    addSpeaking(input: { taskId: string; transcript: string | null; engine: SpeakingSession['transcriptionEngine']; durationSec: number; audioStored: boolean; textAnswer: string | null }): SpeakingSession
    addMockAttempt(attempt: Omit<MockExamAttempt, 'id' | 'completedAt'>): MockExamAttempt
    /** Mock imtihonda bo'lim ochiq turgan sekundlar kundalik hisobga yoziladi. */
    recordMockTime(entries: { skill: CoreSkill; seconds: number }[]): void
    completeDay(dayId: string, testId?: string, testScore?: number): void
    /** Bo'limga sakrash testi yakuni: o'tilsa oldingi kunlar ochiladi (daraja o'zgarmaydi). */
    jumpToSection(sectionId: string, score: number): void
    /** O'z-o'zini baholash: da'vo id va 1–5 baho (darajaga ta'sir qilmaydi). */
    rateCanDo(id: string, score: number): void
    setDiagnostic(level: CefrLevel | null, labelUz: string, confidence: number): void
    /** Onboarding yakunlandi (diagnostika o'tkazib yuborilgan bo'lsa ham). */
    markOnboarded(): void
    setLevel(level: CefrLevel): void
    resetAll(): void
    /** Dars (mashq bloki) yakunlandi: bonus XP + xatosiz dars hisobi. */
    completeLesson(exercises: number, mistakes: number): void
    /** Do'kon xaridi. Natija: ok/sabab (gem yetmasa, chegarada bo'lsa). */
    buy(item: ShopItemId): { ok: boolean; reasonUz: string | null }
    /** "Double or Nothing" garovi (streak 7 kun o'ssa gem qaytadi). */
    placeStreakBet(): { ok: boolean; reasonUz: string | null }
    /** O'yin hisoblarini qayta yig'ish (vaqt o'tishi bilan — yurak/quest). */
    settleGame(): void
    /** Server bilan sinxronlash: avval serverdagisi birlashtiriladi, so'ng butun navbat yuboriladi. */
    sync(): Promise<SyncOutcome>
  }
}

export interface SyncOutcome {
  ok: boolean
  reasonUz: string | null
  done: number
  /** Serverdagi ma'lumot qurilmadagisi bilan birlashtirildimi */
  pulled: boolean
}


export const StoreContext = createContext<StoreValue | null>(null)

export function useStore(): StoreValue {
  const v = useContext(StoreContext)
  if (!v) throw new Error('useStore StoreProvider ichida chaqirilishi kerak')
  return v
}
