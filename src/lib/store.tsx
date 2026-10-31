/**
 * Ilova store — React Context + reducer.
 *
 * Har bir o'zgarish birinchi NAVBATDA mahalliy saqlanadi (offline-first),
 * so'ng Supabase navbatiga qo'shiladi. Internet bo'lmasa ham ishlaydi.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type { CefrLevel, CoreSkill, Exercise, Skill } from '../content/types'
import { allVocab, findExercise, getBundle, LOADED_LEVELS } from '../content/index'
import { initialSrsState, review, type SrsGrade } from './srs'
import { currentElapsed, pauseTimer, startTimer, stopTimer, formatDuration, planProgress } from './timer'
import { xpForAttempt, streakFor, evaluateLevelPromotion, weightedScore, confidenceFor, type SkillEvidence } from './skillScoring'
import { analyzeSpeaking, analyzeWriting, countWords } from './analyze'
import { computeAllocation, type Allocation } from './planning'
import { loadData, saveData } from './storage'
import { queueAllData, syncNow } from './sync'
import { supabaseConfigured } from './supabase'
import type {
  AppData,
  AttemptRecord,
  AttemptSource,
  MockExamAttempt,
  SpeakingSession,
  UserSettings,
  WritingSubmission,
} from './types'
import { emptyData, todayKey } from './types'

// ---------- Actions ----------
type Action =
  | { type: 'hydrate'; data: AppData }
  | { type: 'settings'; patch: Partial<UserSettings> }
  | { type: 'attempt'; record: AttemptRecord }
  | { type: 'srs'; vocabId: string; grade: SrsGrade }
  | { type: 'timer-start'; sessionId: string; skill: Skill }
  | { type: 'timer-pause' }
  | { type: 'timer-stop' }
  | { type: 'writing-add'; sub: WritingSubmission }
  | { type: 'speaking-add'; session: SpeakingSession }
  | { type: 'mock-add'; attempt: MockExamAttempt }
  | { type: 'day-complete'; dayId: string; testScore?: number; testId?: string }
  | { type: 'diagnostic'; at: number; level: CefrLevel | null; labelUz: string; confidence: number }
  | { type: 'level-set'; level: CefrLevel }
  | { type: 'reset' }

/** Kundalik faollikka daqiqa/sekund qo'shish (taymer hisobi uchun umumiy). */
function addActivitySeconds(state: AppData, seconds: number, skill: Skill): AppData {
  if (seconds <= 0) return state
  const key = todayKey()
  const cur = state.activity[key] ?? { date: key, seconds: 0, attempts: 0, correct: 0, newWords: 0, reviewedWords: 0, skills: {} }
  return {
    ...state,
    activity: {
      ...state.activity,
      [key]: {
        ...cur,
        seconds: cur.seconds + seconds,
        skills: { ...cur.skills, [skill]: (cur.skills[skill] ?? 0) + seconds },
      },
    },
  }
}

/** Reducer — testlar uchun ham ochiq (vaqt hisobi regressiyaga qarshi). */
export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'hydrate':
      return action.data
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'attempt': {
      const r = action.record
      const key = todayKey()
      const cur = state.activity[key] ?? { date: key, seconds: 0, attempts: 0, correct: 0, newWords: 0, reviewedWords: 0, skills: {} }
      // Ikki marta sanash qoidasi: taymer yurayotgan bo'lsa vaqt devor-soat
      // bo'yicha ALLOQACHON hisoblanadi — lekin FaqAT shu taymer sessiyasining
      // ko'nikmasi uchun. Boshqa ko'nikma bo'yicha attempt (masalan Yozish
      // taymeri yurarida 300 sekundlik Grammatika mashqi) o'z sekundlarini
      // olib keladi va ULAR YO'QOLMASLIGI kerak (eski bug: grammar=0).
      const timerCoversThisSkill = state.timer.startedAt !== null && state.timer.skill === r.skill
      return {
        ...state,
        attempts: [...state.attempts, r].slice(-3000),
        xp: state.xp + xpForAttempt(r.correct, r.difficulty, true),
        activity: {
          ...state.activity,
          [key]: {
            ...cur,
            attempts: cur.attempts + 1,
            correct: cur.correct + (r.correct ? 1 : 0),
            // MUHIM: mashqda sarflangan vaqt kundalik hisobga qo'shiladi —
            // oldin Dashboard/Progress grafigi bo'sh qolardi ("Bajarildi"
            // yashil, "0/90 daq" — ziddiyat). LEKIN taymer yurayotgan bo'lsa
            // (Reading/LearningPath) vaqt ALLOQACHON devor-soat bo'yicha
            // hisoblanadi — ikki marta sanamaslik uchu shu yerda qo'shmaymiz.
            // `skills` taqsimoti ham shu qoidaga BO'YSINADI — aks holda
            // ko'nikma yig'indisi umumiy sekunddan oshib ketardi.
            seconds: timerCoversThisSkill ? cur.seconds : cur.seconds + Math.max(0, r.secondsSpent),
            skills: {
              ...cur.skills,
              [r.skill]: timerCoversThisSkill
                ? cur.skills[r.skill] ?? 0
                : (cur.skills[r.skill] ?? 0) + Math.max(0, r.secondsSpent),
            },
          },
        },
      }
    }
    case 'srs': {
      const prev = state.srs[action.vocabId] ?? initialSrsState()
      const next = review(prev, action.grade)
      const key = todayKey()
      const cur = state.activity[key] ?? { date: key, seconds: 0, attempts: 0, correct: 0, newWords: 0, reviewedWords: 0, skills: {} }
      const firstLearn = prev.learnedAt === null && next.learnedAt !== null
      return {
        ...state,
        srs: { ...state.srs, [action.vocabId]: next },
        activity: {
          ...state.activity,
          [key]: {
            ...cur,
            // Takrorlangan so'z IKKI marta hisoblanmaydi: `newWords` faqat
            // birinchi marta o'zlashtirilganda oshadi.
            newWords: cur.newWords + (firstLearn ? 1 : 0),
            reviewedWords: cur.reviewedWords + (firstLearn ? 0 : 1),
          },
        },
      }
    }
    case 'timer-start': {
      // MUHIM: boshqa mashg'ulotga o'tishda oldingi sessiyaning yig'ilgan
      // vaqti AVVAL kundalik hisobga yoziladi. Oldin `startTimer` bu sekundlarni
      // jimgina tashlab yuborardi — foydalanuvchi "yo'qolgan daqiqalar"ni
      // ko'rardi (O'qishda 25 daq → Yozishga o'tsa hisob 0).
      //
      // Xuddi shu SESSIYA + xuddi shu ko'nikma qayta boshlansa (sahifaga
      // qaytish, "Davom etish") yig'ilgan sekundlar hali hisobga YOZILMAGAN
      // bo'ladi — ularni qayta yozib, keyin yana sanash IKKI marta hisob
      // bergani (ESKI BUG).
      //
      // SESSIYA bir xil, lekin KO'NIKMA boshqa bo'lsa (LearningPath: `a1-day-01`
      // sessiyasi bilan Lug'at → Grammatika) — hisoblangan sekundlar AVVAL
      // eski ko'nikmaga yoziladi, keyin tozalanadi. Aks holda butun sessiya
      // vaqti oxirgi ko'nikmaga yozilib, grafigi buzilardi.
      const sameSession =
        state.timer.sessionId !== null &&
        state.timer.sessionId === action.sessionId &&
        state.timer.skill === action.skill
      if (sameSession) {
        return { ...state, timer: startTimer(state.timer, action.sessionId, action.skill) }
      }
      const prevElapsed = currentElapsed(state.timer)
      const committed =
        prevElapsed > 0 && state.timer.skill !== null
          ? addActivitySeconds(state, prevElapsed, state.timer.skill as Skill)
          : state
      return {
        ...committed,
        timer: startTimer({ ...committed.timer, elapsedSec: 0 }, action.sessionId, action.skill),
      }
    }
    case 'timer-pause':
      return { ...state, timer: pauseTimer(state.timer) }
    case 'timer-stop': {
      const elapsed = currentElapsed(state.timer)
      const skill = (state.timer.skill ?? 'reading') as Skill
      const stopped = stopTimer(state.timer, state.timer.sessionId ?? '', skill)
      // Hisobga yozilgan sekundlar darhol NOLLANADI — aks holda sessiyani
      // qayta ishga tushirganda xuddi shu vaqt ikkinchi marta yozilardi.
      return { ...addActivitySeconds({ ...state, timer: { ...stopped, elapsedSec: 0 } }, elapsed, skill) }
    }
    case 'writing-add':
      return { ...state, writing: [...state.writing, action.sub].slice(-300) }
    case 'speaking-add':
      return { ...state, speaking: [...state.speaking, action.session].slice(-300) }
    case 'mock-add':
      return { ...state, mockAttempts: [...state.mockAttempts, action.attempt].slice(-60) }
    case 'day-complete': {
      const completedDays = state.path.completedDays.includes(action.dayId)
        ? state.path.completedDays
        : [...state.path.completedDays, action.dayId]
      const passedTests =
        action.testId && action.testScore !== undefined
          ? { ...state.path.passedTests, [action.testId]: Math.max(state.path.passedTests[action.testId] ?? 0, action.testScore) }
          : state.path.passedTests
      const bundle = getBundle(state.settings.currentLevel)
      const currentDayId = bundle.days.find((d) => !completedDays.includes(d.id))?.id ?? state.path.currentDayId
      return { ...state, path: { ...state.path, completedDays, passedTests, currentDayId } }
    }
    case 'diagnostic':
      return { ...state, diagnostic: { at: action.at, level: action.level, labelUz: action.labelUz, confidence: action.confidence } }
    case 'level-set':
      return { ...state, settings: { ...state.settings, currentLevel: action.level } }
    case 'reset':
      return emptyData(state.userId)
  }
}

// ---------- Derived helpers (exported for pages) ----------

export function skillEvidence(data: AppData): SkillEvidence[] {
  const core: CoreSkill[] = ['reading', 'listening', 'writing', 'speaking']
  const now = Date.now()
  return core.map((skill) => {
    const samples: { score: number; at: number; kind: string }[] = []
    for (const a of data.attempts) {
      if (a.skill !== skill) continue
      samples.push({ score: a.correct ? 100 : Math.round(a.partial * 100), at: a.at, kind: a.source })
    }
    for (const m of data.mockAttempts) {
      for (const s of m.sections) {
        if (s.skill === skill && s.score !== null) samples.push({ score: s.score, at: m.completedAt, kind: 'mock_exam' })
      }
    }
    for (const w of data.writing) {
      if (!w.analysis) continue
      const avg = Object.values(w.analysis.criteriaScores).reduce((a, b) => a + b, 0) / 5
      samples.push({ score: Math.round((avg / 5) * 100), at: w.createdAt, kind: 'writing_task' })
    }
    for (const s of data.speaking) {
      if (!s.analysis) continue
      const avg = (s.analysis.fluency + s.analysis.grammar + s.analysis.lexis) / 3
      samples.push({ score: Math.round((avg / 5) * 100), at: s.createdAt, kind: 'speaking_task' })
    }
    const kinds = new Set(samples.map((s) => s.kind))
    return {
      skill,
      score: Math.round(weightedScore(samples, now)),
      evidenceCount: samples.length,
      confidence: confidenceFor(samples.length, kinds.size),
      lastAt: samples.length ? Math.max(...samples.map((s) => s.at)) : null,
    }
  })
}

export interface ActivityDay {
  date: string
  seconds: number
  attempts: number
  correct: number
}

export function lastNDays(data: AppData, n = 7): ActivityDay[] {
  const out: ActivityDay[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = todayKey(d)
    const a = data.activity[key]
    out.push({
      date: key,
      seconds: a?.seconds ?? 0,
      attempts: a?.attempts ?? 0,
      correct: a?.correct ?? 0,
    })
  }
  return out
}

// ---------- Context ----------

export interface StoreValue {
  data: AppData
  ready: boolean
  netOnline: boolean
  allocation: Allocation
  evidence: SkillEvidence[]
  promotion: ReturnType<typeof evaluateLevelPromotion>
  streak: number
  learnedCount: number
  /** Asosiy lug'at bo'yicha "o'rganilgan/jami"; matn (glossariy) so'zlari alohida belgilanadi. */
  vocabSummary: string
  dueCount: number
  timerElapsed: number
  timerLabel: string
  dayProgress: ReturnType<typeof planProgress>
  actions: {
    setSettings(patch: Partial<UserSettings>): void
    recordAttempt(input: { exercise: Exercise; correct: boolean; partial: number; given: string; secondsSpent: number; source: AttemptSource }): void
    gradeVocab(vocabId: string, grade: SrsGrade): void
    startTimer(sessionId: string, skill: Skill): void
    pauseTimer(): void
    stopTimer(): void
    addWriting(taskId: string, text: string, secondsSpent: number, supersedesId: string | null): WritingSubmission
    addSpeaking(input: { taskId: string; transcript: string | null; engine: SpeakingSession['transcriptionEngine']; durationSec: number; audioStored: boolean; textAnswer: string | null }): SpeakingSession
    addMockAttempt(attempt: Omit<MockExamAttempt, 'id' | 'completedAt'>): MockExamAttempt
    completeDay(dayId: string, testId?: string, testScore?: number): void
    setDiagnostic(level: CefrLevel | null, labelUz: string, confidence: number): void
    setLevel(level: CefrLevel): void
    resetAll(): void
    sync(): Promise<{ ok: boolean; reasonUz: string | null; done: number }>
  }
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, emptyData(userId))
  const [ready, setReady] = useState(false)
  const [netOnline, setNetOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [tick, setTick] = useState(0)
  const loadedFor = useRef<string | null>(null)

  // yuklash: userId o'zgarsa — yangi foydalanuvchining keshi (aralashmaydi)
  useEffect(() => {
    let alive = true
    setReady(false)
    void loadData(userId).then((d) => {
      if (!alive) return
      loadedFor.current = userId
      dispatch({ type: 'hydrate', data: d })
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [userId])

  // Har soniyada taymer ko'rsatkichi uchun qayta render
  useEffect(() => {
    const iv = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000)
    return () => window.clearInterval(iv)
  }, [])

  // Onlayn/offlayn kuzatuvi
  useEffect(() => {
    const on = () => setNetOnline(true)
    const off = () => setNetOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Yozilgandan keyin saqlash (debounce, bir necha yuz ms)
  const saveTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!ready || loadedFor.current !== userId) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void saveData(data)
    }, 350)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [data, ready, userId])

  const setSettings = useCallback((patch: Partial<UserSettings>) => {
    dispatch({ type: 'settings', patch })
  }, [])

  const recordAttempt = useCallback<StoreValue['actions']['recordAttempt']>(({ exercise, correct, partial, given, secondsSpent, source }) => {
    dispatch({
      type: 'attempt',
      record: {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        exerciseId: exercise.id,
        skill: exercise.skill,
        level: exercise.level,
        correct,
        partial,
        difficulty: exercise.difficulty,
        secondsSpent,
        source,
        answerGiven: given,
        at: Date.now(),
      },
    })
  }, [])

  const gradeVocab = useCallback((vocabId: string, grade: SrsGrade) => {
    dispatch({ type: 'srs', vocabId, grade })
  }, [])

  const startT = useCallback((sessionId: string, skill: Skill) => dispatch({ type: 'timer-start', sessionId, skill }), [])
  const pauseT = useCallback(() => dispatch({ type: 'timer-pause' }), [])
  const stopT = useCallback(() => dispatch({ type: 'timer-stop' }), [])

  const addWriting = useCallback<StoreValue['actions']['addWriting']>(
    (taskId, text, secondsSpent, supersedesId) => {
      const bundle = getBundle(data.settings.currentLevel)
      const task = bundle.writing.find((w) => w.id === taskId) ?? bundle.mockExam?.sections.flatMap((s) => (s.writingTask?.id === taskId ? [s.writingTask] : []))[0]
      const sub: WritingSubmission = {
        id: `wr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskId,
        text,
        wordCount: countWords(text),
        secondsSpent,
        analysis: task ? analyzeWriting(text, task) : null,
        supersedesId,
        createdAt: Date.now(),
      }
      dispatch({ type: 'writing-add', sub })
      return sub
    },
    [data.settings.currentLevel],
  )

  const addSpeaking = useCallback<StoreValue['actions']['addSpeaking']>(
    ({ taskId, transcript, engine, durationSec, audioStored, textAnswer }) => {
      const bundle = getBundle(data.settings.currentLevel)
      const task =
        bundle.speaking.find((s) => s.id === taskId) ??
        bundle.mockExam?.sections.flatMap((s) => (s.speakingTask?.id === taskId ? [s.speakingTask] : []))[0]
      const analysis = transcript && task ? analyzeSpeaking(transcript, durationSec, task) : null
      const session: SpeakingSession = {
        id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskId,
        audioBlobStored: audioStored,
        durationSec,
        transcript,
        transcriptionEngine: engine,
        analysis,
        textAnswer,
        createdAt: Date.now(),
      }
      dispatch({ type: 'speaking-add', session })
      return session
    },
    [data.settings.currentLevel],
  )

  const addMockAttempt = useCallback<StoreValue['actions']['addMockAttempt']>((partial) => {
    const attempt: MockExamAttempt = { ...partial, id: `mx-${Date.now()}`, completedAt: Date.now() }
    dispatch({ type: 'mock-add', attempt })
    return attempt
  }, [])

  const completeDay = useCallback((dayId: string, testId?: string, testScore?: number) => {
    dispatch({ type: 'day-complete', dayId, testId, testScore })
  }, [])

  const setDiagnostic = useCallback((level: CefrLevel | null, labelUz: string, confidence: number) => {
    dispatch({ type: 'diagnostic', at: Date.now(), level, labelUz, confidence })
  }, [])

  const setLevel = useCallback((level: CefrLevel) => dispatch({ type: 'level-set', level }), [])
  const resetAll = useCallback(() => dispatch({ type: 'reset' }), [])

  const sync = useCallback(async () => {
    if (!netOnline) return { ok: false, reasonUz: 'Internet yo‘q — navbat saqlandi.', done: 0 }
    // Supabase sozlanmagan bo'lsa navbatga yozish behuda — yuboradigan joy yo'q.
    if (supabaseConfigured) await queueAllData(data)
    const res = await syncNow(userId)
    return { ok: res.ok, reasonUz: res.reasonUz, done: res.done }
  }, [data, userId, netOnline])

  // --- Derived ---
  const evidence = useMemo(() => skillEvidence(data), [data])
  const promotion = useMemo(() => evaluateLevelPromotion(data.settings.currentLevel, evidence), [data.settings.currentLevel, evidence])
  const allocation = useMemo(() => computeAllocation(data.settings, evidence), [data.settings, evidence])
  const streak = useMemo(() => {
    const days = Object.values(data.activity)
      .filter((a) => a.seconds >= 60 || a.attempts > 0)
      .map((a) => a.date)
    return streakFor(days, todayKey())
  }, [data.activity])

  // ESKI BUG: Reading'dagi glossariy so'zlari lug'at ro'yxatida bo'lmasa
  // ular uchun SUN'IY SRS idsi (`<passage>-gloss:<word>`) yasalar edi.
  // `learnedCount` ularni ham sanardi, `totalVocabCount()` esa sanamasdi —
  // natijada "45/37 so'z" kabi zid ko'rsatkich chiqardi.
  // Endi ikki hisob alohida: asosiy lug'at bo'yicha (+ qo'shimcha matn so'zlari).
  const { learnedCount, learnedExtraCount } = useMemo(() => {
    const real = new Set(allVocab(LOADED_LEVELS).map((v) => v.id))
    let inVocab = 0
    let extra = 0
    for (const [id, s] of Object.entries(data.srs)) {
      if (s.learnedAt === null) continue
      if (real.has(id)) inVocab++
      else extra++
    }
    return { learnedCount: inVocab, learnedExtraCount: extra }
  }, [data.srs])
  const dueCount = useMemo(() => {
    const now = Date.now()
    // Takror navbatida ham asosiy lug'at so'zlari sanaladi — Vocabulary
    // sahifasidagi "takror" ro'yxati shu havuzni ko'rsatadi, glossariy
    // so'zlari boshqa sahifada (Reading) takrorlanadi.
    const real = new Set(allVocab(LOADED_LEVELS).map((v) => v.id))
    return Object.entries(data.srs).filter(([id, s]) => s.dueAt <= now && real.has(id)).length
  }, [data.srs])
  const totalVocab = useMemo(() => totalVocabCount(), [])
  const vocabSummary = `${learnedCount}/${totalVocab}${learnedExtraCount > 0 ? ` +${learnedExtraCount} matn so‘zi` : ''}`

  const timerView = useMemo(() => {
    const e = currentElapsed(data.timer)
    void tick // re-render triggers recalculation
    const planned = allocation.total
    return { elapsed: e, label: formatDuration(e), progress: planProgress(e, planned) }
  }, [data.timer, tick, allocation.total])

  const value: StoreValue = {
    data,
    ready,
    netOnline,
    allocation,
    evidence,
    promotion,
    streak,
    learnedCount,
    vocabSummary,
    dueCount,
    timerElapsed: timerView.elapsed,
    timerLabel: timerView.label,
    dayProgress: timerView.progress,
    actions: {
      setSettings,
      recordAttempt,
      gradeVocab,
      startTimer: startT,
      pauseTimer: pauseT,
      stopTimer: stopT,
      addWriting,
      addSpeaking,
      addMockAttempt,
      completeDay,
      setDiagnostic,
      setLevel,
      resetAll,
      sync,
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext)
  if (!v) throw new Error('useStore StoreProvider ichida chaqirilishi kerak')
  return v
}

export function totalVocabCount(): number {
  return allVocab(LOADED_LEVELS).length
}

export { findExercise }
