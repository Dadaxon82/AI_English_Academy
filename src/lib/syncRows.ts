/** Serverdagi qatorlar → mahalliy holat (har maydon tekshiriladi, buzuq qator tashlanadi). */

import { CEFR_LEVELS, CORE_SKILLS, SKILLS, type CefrLevel, type CoreSkill, type Skill } from '../content/types'
import { normalizeGame } from './game'
import { LEAGUE_BOARD_SIZE, leagueById } from './gameConfig'
import type { RemoteSnapshot } from './merge'
import { START_EASE, type SrsState } from './srs'
import type { AttemptRecord, AttemptSource, DayActivity, GameState, MockExamAttempt, SpeakingAnalysis, SpeakingSession, UserSettings, WritingAnalysis, WritingSubmission } from './types'
import { clampDailyMinutes, nearestXpGoal } from './types'

/* ------------------------------- o'qish ------------------------------- */

export type Row = Record<string, unknown>

export interface RemoteRows {
  settings: Row | null
  plan: Row | null
  attempts: Row[]
  vocabulary: Row[]
  activity: Row[]
  writing: Row[]
  speaking: Row[]
  mocks: Row[]
  /** `profiles` qatori — liga uchun ko'rsatish nomi (o'z qatorimiz, RLS). */
  profile?: Row | null
  /** Liga tablasidagi qatorlar (o'sha hafta + o'sha liga — barcha a'zolar). */
  leagueRows?: Row[]
  /** O'z `weekly_xp` qatorlarimiz (so'nggi haftalar) — liga snapshoti uchun. */
  ownWeekly?: Row[]
}

/** `weekly_xp` qatorini o'qib, liga tablasi qatoriga aylantiradi. */
export function leagueRowFromRow(r: Row): { userId: string; name: string; xp: number } | null {
  const userId = str(r.user_id)
  if (!userId) return null
  return { userId, name: str(r.display_name) ?? '', xp: Math.max(0, Math.floor(num(r.xp))) }
}

export const isObj = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v)
export const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
export const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}
export const time = (v: unknown): number | null => {
  const s = str(v)
  if (!s) return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}
export const isLevel = (v: unknown): v is CefrLevel => typeof v === 'string' && (CEFR_LEVELS as readonly string[]).includes(v)
export const isSkill = (v: unknown): v is Skill => typeof v === 'string' && (SKILLS as readonly string[]).includes(v)
export const isCoreSkill = (v: unknown): v is CoreSkill => typeof v === 'string' && (CORE_SKILLS as readonly string[]).includes(v)
export const isSource = (v: unknown): v is AttemptSource =>
  v === 'practice' || v === 'section_test' || v === 'mock_exam' || v === 'diagnostic'

export function numRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!isObj(v)) return out
  for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && Number.isFinite(x)) out[k] = x
  return out
}

export function settingsFromRow(r: Row | null): Partial<UserSettings> | null {
  if (!r) return null
  const out: Partial<UserSettings> = {}
  if (r.daily_minutes !== null && r.daily_minutes !== undefined) out.dailyMinutes = clampDailyMinutes(num(r.daily_minutes, 90))
  if (isLevel(r.current_level)) out.currentLevel = r.current_level
  if (isLevel(r.target_level)) out.targetLevel = r.target_level
  out.examDate = str(r.exam_date)
  const alloc = numRecord(r.allocation)
  if (SKILLS.every((s) => alloc[s] !== undefined)) out.allocation = alloc as UserSettings['allocation']
  if (r.theme === 'light' || r.theme === 'dark' || r.theme === 'system') out.theme = r.theme
  if (typeof r.ai_enabled === 'boolean') out.aiEnabled = r.ai_enabled
  // `motion_enabled` ustuni bo'lmasa (migratsiya hali bajarilmagan baza) lokal
  // qiymat saqlanadi — hech narsa ixtir qilinmaydi.
  if (typeof r.motion_enabled === 'boolean') out.motionEnabled = r.motion_enabled
  // O'yin sozlamalari (`0004_weekly_xp.sql`). `xp_goal_xp` eng yaqin bosqichga
  // qaytariladi: DB bosqichlarini CHECK ham tekshiradi, lekin eski/ boshqa
  // bazadan kelgan son lokal qoidani buzmasligi kerak.
  if (typeof r.xp_goal_xp === 'number' && Number.isFinite(r.xp_goal_xp)) out.xpGoalXp = nearestXpGoal(r.xp_goal_xp)
  if (typeof r.hearts_enabled === 'boolean') out.heartsEnabled = r.hearts_enabled
  return out
}

export function planFromRow(r: Row | null): RemoteSnapshot['plan'] {
  if (!r || !isObj(r.plan)) return null
  const p = r.plan
  const out: NonNullable<RemoteSnapshot['plan']> = {}
  if (isObj(p.path) && Array.isArray(p.path.completedDays)) {
    out.path = {
      completedDays: p.path.completedDays.filter((d): d is string => typeof d === 'string'),
      passedTests: numRecord(p.path.passedTests),
      currentDayId: str(p.path.currentDayId) ?? 'a1-day-01',
    }
  }
  if (typeof p.xp === 'number' && Number.isFinite(p.xp)) out.xp = p.xp
  if (typeof p.onboardedAt === 'number' && Number.isFinite(p.onboardedAt)) out.onboardedAt = p.onboardedAt
  if (isObj(p.diagnostic) && typeof p.diagnostic.at === 'number') {
    const d = p.diagnostic
    out.diagnostic = {
      at: d.at as number,
      level: isLevel(d.level) ? d.level : null,
      labelUz: str(d.labelUz) ?? '',
      confidence: num(d.confidence),
    }
  }
  // Nishonlar (yutuqlar) — `id` bo'yicha birlashma `mergeRemote`da bo'ladi.
  if (Array.isArray(p.badges)) {
    out.badges = p.badges
      .filter((b): b is Row => isObj(b) && typeof b.id === 'string')
      .map((b) => ({ id: String(b.id), titleUz: str(b.titleUz) ?? '', at: num(b.at) }))
  }
  // O'yin qatlami — `normalizeGame` har bir sonni chegaralaydi (serverdagi
  // jsonb tashqi ma'lumot: ishonchli holatga keltirilmasa `game.ts`ning
  // hisoblashlari buziladi).
  if (isObj(p.game)) out.game = normalizeGame(p.game as Partial<GameState>)
  // O'z-o'zini baholash — faqat 1..5 butun baho va son vaqt qabul qilinadi.
  if (isObj(p.selfAssessment)) {
    const sa: NonNullable<typeof out.selfAssessment> = {}
    for (const [k, v] of Object.entries(p.selfAssessment)) {
      if (!isObj(v)) continue
      const score = v.score
      const at = v.at
      if (typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 5 && typeof at === 'number' && Number.isFinite(at)) {
        sa[k] = { score, at }
      }
    }
    out.selfAssessment = sa
  }
  return out
}

export function attemptFromRow(r: Row): AttemptRecord | null {
  const id = str(r.id)
  const exerciseId = str(r.exercise_id)
  const at = time(r.created_at)
  if (!id || !exerciseId || at === null || !isSkill(r.skill) || !isLevel(r.level) || !isSource(r.source)) return null
  return {
    id,
    exerciseId,
    skill: r.skill,
    level: r.level,
    correct: r.correct === true,
    partial: num(r.partial_score),
    difficulty: num(r.difficulty, 1),
    secondsSpent: num(r.seconds_spent),
    source: r.source,
    answerGiven: str(r.answer_text) ?? '',
    at,
  }
}

export function srsFromRow(r: Row): [string, SrsState] | null {
  const id = str(r.vocabulary_id)
  const dueAt = time(r.due_at)
  if (!id || dueAt === null) return null
  return [
    id,
    {
      learnedAt: time(r.learned_at),
      dueAt,
      intervalDays: num(r.interval_days),
      ease: num(r.ease, START_EASE),
      reps: num(r.reps),
      lapses: num(r.lapses),
      lastReviewedAt: time(r.updated_at),
    },
  ]
}

export function activityFromRow(r: Row): DayActivity | null {
  const day = str(r.day)
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const skills: DayActivity['skills'] = {}
  for (const [k, v] of Object.entries(numRecord(r.skills))) if (isSkill(k)) skills[k] = v
  return {
    date: day,
    seconds: num(r.seconds),
    attempts: num(r.attempts),
    correct: num(r.correct),
    newWords: num(r.new_words),
    reviewedWords: num(r.reviewed_words),
    skills,
  }
}

export function writingAnalysis(v: unknown): WritingAnalysis | null {
  if (!isObj(v) || !isObj(v.criteriaScores)) return null
  if (![v.errors, v.strengthsUz, v.weaknessesUz, v.suggestionsUz].every(Array.isArray)) return null
  return v as unknown as WritingAnalysis
}

export function speakingAnalysis(v: unknown): SpeakingAnalysis | null {
  if (!isObj(v) || !Array.isArray(v.notesUz)) return null
  if (![v.fluency, v.lexis, v.grammar, v.length].every((x) => typeof x === 'number')) return null
  return v as unknown as SpeakingAnalysis
}

export function writingFromRow(r: Row): WritingSubmission | null {
  const id = str(r.id)
  const taskId = str(r.task_id)
  const text = str(r.text)
  const at = time(r.created_at)
  if (!id || !taskId || text === null || at === null) return null
  return {
    id,
    taskId,
    text,
    wordCount: num(r.word_count),
    secondsSpent: num(r.seconds_spent),
    analysis: writingAnalysis(r.analysis),
    supersedesId: str(r.supersedes_id),
    createdAt: at,
  }
}

export function speakingFromRow(r: Row): SpeakingSession | null {
  const id = str(r.id)
  const taskId = str(r.task_id)
  const at = time(r.created_at)
  if (!id || !taskId || at === null) return null
  const engine = r.transcription_engine === 'browser-speech' || r.transcription_engine === 'ai' ? r.transcription_engine : 'none'
  return {
    id,
    taskId,
    // Audio serverga hech qachon yuborilmaydi — bu qurilmada ham yo'q.
    audioBlobStored: false,
    durationSec: num(r.duration_sec),
    transcript: str(r.transcript),
    transcriptionEngine: engine,
    analysis: speakingAnalysis(r.analysis),
    textAnswer: str(r.text_answer),
    createdAt: at,
  }
}

export function mockFromRow(r: Row): MockExamAttempt | null {
  const id = str(r.id)
  const examId = str(r.exam_id)
  const at = time(r.completed_at)
  if (!id || !examId || at === null || !Array.isArray(r.sections)) return null
  const sections = r.sections.filter(
    (s): s is MockExamAttempt['sections'][number] =>
      isObj(s) && typeof s.sectionId === 'string' && isCoreSkill(s.skill) && isObj(s.exerciseResults),
  )
  return {
    id,
    examId,
    sections,
    totalScore: r.total_score === null || r.total_score === undefined ? null : num(r.total_score),
    speakingAdvisory: str(r.speaking_advisory) ?? '',
    completedAt: at,
  }
}

export const compact = <T,>(rows: readonly Row[], fn: (r: Row) => T | null): T[] =>
  rows.map(fn).filter((x): x is T => x !== null)

/** DB qatorlarini ilova tiplariga aylantirish (yaroqsiz qatorlar tashlab yuboriladi). */
export function rowsToSnapshot(rows: RemoteRows): RemoteSnapshot {
  const srs: Record<string, SrsState> = {}
  for (const [id, st] of compact(rows.vocabulary, srsFromRow)) srs[id] = st
  const activity: Record<string, DayActivity> = {}
  for (const a of compact(rows.activity, activityFromRow)) activity[a.date] = a
  const byTime = <T,>(list: T[], at: (x: T) => number) => list.sort((a, b) => at(a) - at(b))
  return {
    settings: settingsFromRow(rows.settings),
    plan: planFromRow(rows.plan),
    attempts: byTime(compact(rows.attempts, attemptFromRow), (a) => a.at),
    srs,
    activity,
    writing: byTime(compact(rows.writing, writingFromRow), (w) => w.createdAt),
    speaking: byTime(compact(rows.speaking, speakingFromRow), (s) => s.createdAt),
    mockAttempts: byTime(compact(rows.mocks, mockFromRow), (m) => m.completedAt),
    // Liga: o'sha haftadagi o'sha ligamız qatorlari (barcha a'zolar — RLSdagi
    // "read league mates" siyosati). Bo'sh bo'lsa `null` — eski snapshot
    // saqlanadi, son ixtir qilinmaydi.
    league: buildLeagueRead(rows),
    profileName: str(rows.profile?.display_name)?.slice(0, 60) ?? '',
  }
}

/**
 * O'qilgan qatorlardan liga tablasi. Biz hali bu haftani yubormagan bo'lsak
 * (`ownWeekly` bo'sh) — o'z ligamiz aniq EMAS, tablani o'qishning ma'nosi
 * yo'q: `null` qaytadi va eski snapshot saqlanadi (son ixtir qilinmaydi).
 */
export function buildLeagueRead(rows: RemoteRows): RemoteSnapshot['league'] {
  const ownRows = (rows.ownWeekly ?? []).filter((r) => str(r.week_start) && str(r.league_id))
  if (ownRows.length === 0) return null
  const board = (rows.leagueRows ?? [])
    .map(leagueRowFromRow)
    .filter((x): x is { userId: string; name: string; xp: number } => x !== null)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, LEAGUE_BOARD_SIZE)
  if (board.length === 0) return null
  const latest = ownRows.reduce((a, b) => (String(b.week_start) > String(a.week_start) ? b : a))
  return {
    weekStart: String(latest.week_start),
    leagueId: leagueById(String(latest.league_id)).id,
    entries: board,
  }
}
