/**
 * Ilova store — React Context + reducer.
 *
 * Har bir o'zgarish birinchi NAVBATDA mahalliy saqlanadi (offline-first),
 * so'ng Supabase navbatiga qo'shiladi. Internet bo'lmasa ham ishlaydi.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type { CefrLevel, CoreSkill, Exercise, Skill } from '../content/types'
import { allGlossaryVocab, allVocab, findExercise, getBundle, LOADED_LEVELS } from '../content/index'
import { initialSrsState, review, type SrsGrade } from './srs'
import { MAX_CONTINUOUS_SEC, currentElapsed, pauseTimer, startTimer, stopTimer, formatDuration, planProgress } from './timer'
import { streakFor, evaluateLevelPromotion, weightedScore, confidenceFor, type SkillEvidence } from './skillScoring'
import {
  achievementViews,
  afterAttempt,
  afterReview,
  buy as buyItem,
  goalView,
  heartsView,
  leagueWeek,
  lessonComplete,
  placeBet,
  questView,
  settle,
  streakWithFreezes,
  xpGain,
  type AchievementView,
} from './game'
import { SHOP_ITEMS } from './game'
import type { ShopItemId } from './gameConfig'
import { analyzeSpeaking, analyzeSpeakingText, analyzeWriting, countWords, speakingScore } from './analyze'
import { computeAllocation, type Allocation } from './planning'
import { loadData, saveData } from './storage'
import { pullRemote, queueAllData, syncNow, type PullResult } from './sync'
import { isPristine, mergeRemote, type RemoteSnapshot } from './merge'
import { supabaseConfigured } from './supabase'
import { applySectionJump } from './sections'
import type {
  AppData,
  AttemptRecord,
  AttemptSource,
  MockExamAttempt,
  SpeakingSession,
  UserSettings,
  WritingSubmission,
} from './types'
import { HISTORY_LIMITS, emptyData, nearestXpGoal, todayKey } from './types'

// ---------- Actions ----------
type Action =
  | { type: 'hydrate'; data: AppData }
  | { type: 'settings'; patch: Partial<UserSettings> }
  | { type: 'attempt'; record: AttemptRecord }
  | { type: 'srs'; vocabId: string; grade: SrsGrade }
  | { type: 'srs-add'; vocabId: string }
  | { type: 'timer-start'; sessionId: string; skill: Skill }
  | { type: 'timer-pause' }
  | { type: 'timer-stop' }
  | { type: 'writing-add'; sub: WritingSubmission }
  | { type: 'speaking-add'; session: SpeakingSession }
  | { type: 'mock-add'; attempt: MockExamAttempt }
  | { type: 'mock-time'; entries: { skill: CoreSkill; seconds: number }[] }
  | { type: 'merge-remote'; userId: string; remote: RemoteSnapshot }
  | { type: 'day-complete'; dayId: string; testScore?: number; testId?: string }
  /** Bo'lim sakrash testi natijasi (`src/lib/sections.ts::applySectionJump`). */
  | { type: 'section-jump'; sectionId: string; score: number }
  | { type: 'diagnostic'; at: number; level: CefrLevel | null; labelUz: string; confidence: number }
  | { type: 'onboarded'; at: number }
  | { type: 'level-set'; level: CefrLevel }
  | { type: 'reset' }
  /** O'yin qatlamining yig'uvchisi (idempotent) — har o'zgarishdan keyin. */
  | { type: 'game-settle' }
  /** Dars (mashq bloki) yakuni: bonus XP + xatosiz dars hisobi. */
  | { type: 'lesson-complete'; exercises: number; mistakes: number }
  /** Do'kon xaridi (gem). */
  | { type: 'game-buy'; item: ShopItemId }
  /** "Double or Nothing" garovi. */
  | { type: 'game-bet' }

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

/**
 * O'yin qatlamining yig'uvchisini chaqirish (yurak tiklash, quest/maqsad/
 * sandiq/yutuq sovg'alari, qalqonlar). IDEMPOTENT — qayta-qaeta chaqirilsa
 * natija o'zgarmaydi, shuning uchun har o'zgarishdan keyin xavfsiz.
 */
function settled(state: AppData): AppData {
  return settle(state, Date.now(), todayKey())
}

/** Reducer — testlar uchun ham ochiq (vaqt hisobi regressiyaga qarshi). */
export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'hydrate':
      // Ochilishda ham yig'ish: kechikkan kun uchun questlar yangilanadi,
      // yuraklar tiklanadi, ochilgan yutuqlar beriladi.
      return settled(action.data)
    case 'settings': {
      const patch = { ...action.patch }
      // XP maqsadi FAQAT bosqich qiymati (`XP_GOAL_TIERS`) — bosqichdan tashqari
      // son yuborilsa ENG YAQIN bosqichga qaytariladi.
      if (patch.xpGoalXp !== undefined) patch.xpGoalXp = nearestXpGoal(patch.xpGoalXp)
      return { ...state, settings: { ...state.settings, ...patch } }
    }
    case 'attempt': {
      const r = action.record
      const key = todayKey()
      const now = Date.now()
      const cur = state.activity[key] ?? { date: key, seconds: 0, attempts: 0, correct: 0, newWords: 0, reviewedWords: 0, skills: {} }
      // Ikki marta sanash qoidasi: taymer yurayotgan bo'lsa vaqt devor-soat
      // bo'yicha ALLOQACHON hisoblanadi — lekin FaqAT shu taymer sessiyasining
      // ko'nikmasi uchun. Boshqa ko'nikma bo'yicha attempt (masalan Yozish
      // taymeri yurarida 300 sekundlik Grammatika mashqi) o'z sekundlarini
      // olib keladi va ULAR YO'QOLMASLIGI kerak (eski bug: grammar=0).
      const timerCoversThisSkill = state.timer.startedAt !== null && state.timer.skill === r.skill
      // Avval kun/yurak holati yangilanadi (kecha qolib ketgan `today` hisobi
      // bugungi mashqqa yozilib qolmasin).
      const fresh = settle(state, now, key)
      // XP: asos son `xpForAttempt`, byust faol bo'lsa ×2 (`game.ts::xpGain`).
      const gained = xpGain(fresh.game, r.correct, r.difficulty, now)
      const game = afterAttempt(fresh.game, r.correct, r.source, gained, now)
      return settled({
        ...fresh,
        attempts: [...fresh.attempts, r].slice(-HISTORY_LIMITS.attempts),
        xp: fresh.xp + gained,
        game,
        activity: {
          ...fresh.activity,
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
      })
    }
    case 'srs': {
      const prev = state.srs[action.vocabId] ?? initialSrsState()
      const next = review(prev, action.grade)
      const key = todayKey()
      const now = Date.now()
      const cur = state.activity[key] ?? { date: key, seconds: 0, attempts: 0, correct: 0, newWords: 0, reviewedWords: 0, skills: {} }
      const firstLearn = prev.learnedAt === null && next.learnedAt !== null
      const fresh = settle(state, now, key)
      return settled({
        ...fresh,
        srs: { ...fresh.srs, [action.vocabId]: next },
        // O'yin tomoni: takros haqiqiy TAKROR bo'lsa kuns hisobiga yoziladi
        // (quest mezoni), yuraklar 0 bo'lsa "takrorlash darsi" darvozasi
        // olgatiladi — `HEART_PRACTICE_REVIEWS` yetganda 1 yurak qaytadi.
        // Yangi so'zni BIRINCHI marta o'rganish takror sanalmaydi (faqat
        // oldindan o'zlashtirilgan so'z qayta takrorlanadi).
        game: afterReview(fresh.game, prev.learnedAt !== null, now),
        activity: {
          ...fresh.activity,
          [key]: {
            ...cur,
            // Takrorlangan so'z IKKI marta hisoblanmaydi: `newWords` faqat
            // birinchi marta o'zlashtirilganda oshadi.
            newWords: cur.newWords + (firstLearn ? 1 : 0),
            reviewedWords: cur.reviewedWords + (firstLearn ? 0 : 1),
          },
        },
      })
    }
    case 'srs-add':
      // "Lug'atimga saqlash": so'z takrorlash jadvaliga qo'shiladi (bugun
      // takrorlanadi). ESKI KAMCHILIK: bu `again` bahosi bilan qilinardi —
      // saqlash xato (lapse) va "takrorlangan so'z" sifatida sanalardi.
      return state.srs[action.vocabId] ? state : { ...state, srs: { ...state.srs, [action.vocabId]: initialSrsState() } }
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
        // Yig'ilgan VA hozir yurayotgan vaqt yuqorida eski ko'nikmaga yozildi —
        // yangi taymer noldan boshlanadi. ESKI BUG: `startedAt` saqlanib
        // qolgani uchun `startTimer` (bir sessiya, boshqa ko'nikma) yurgan
        // vaqtni yana `elapsedSec`ga qo'shardi va u ikkinchi marta hisobga
        // yozilardi (2-kun: 10 daq lug'at + 5 daq test → 25 daq).
        timer: startTimer({ ...committed.timer, elapsedSec: 0, startedAt: null }, action.sessionId, action.skill),
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
      return { ...state, writing: [...state.writing, action.sub].slice(-HISTORY_LIMITS.writing) }
    case 'speaking-add':
      return { ...state, speaking: [...state.speaking, action.session].slice(-HISTORY_LIMITS.speaking) }
    case 'mock-add':
      return { ...state, mockAttempts: [...state.mockAttempts, action.attempt].slice(-HISTORY_LIMITS.mockAttempts) }
    case 'mock-time': {
      // Mock imtihonda sarflangan vaqt kundalik hisobga yoziladi.
      // ESKI BUG: MockExam bo'limlari real taymer yurar, lekin hech qachon
      // `activity`ga yozilmasdi — Dashboard'da "0/90 daq" ko'rsatilardi.
      // Ball/zanjar dalili `skillEvidence()`da mockAttempts orqali ALLOQACHON
      // hisoblanadi, shuning uchun bu yerda attempt QO'SHILMAYDI (ikki marta
      // sanash bo'lardi).
      //
      // Sekundlar — bo'lim haqiqatan OCHIQ turgan vaqt (MockExam hisoblaydi),
      // "boshlanish → yakunlash" ayirmasi emas: ochilmagan bo'limlar ham butun
      // imtihon vaqtini olib, hisob bir necha barobar oshib ketardi.
      let next = state
      for (const e of action.entries) {
        const sec = Number.isFinite(e.seconds) ? Math.min(MAX_CONTINUOUS_SEC, Math.max(0, Math.round(e.seconds))) : 0
        next = addActivitySeconds(next, sec, e.skill)
      }
      return next
    }
    case 'merge-remote':
      // Boshqa foydalanuvchiga tegishli (kechikkan) javob bu holatga aralashmaydi.
      // Birlashtirishdan keyin ham yig'ish: serverdan kelgan yutuq/liga sovg'asi
      // shu qurilmada ham berilishi kerak.
      return action.userId === state.userId ? settled(mergeRemote(state, action.remote)) : state
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
    case 'section-jump':
      return applySectionJump(state, action.sectionId, action.score)
    case 'diagnostic':
      return { ...state, diagnostic: { at: action.at, level: action.level, labelUz: action.labelUz, confidence: action.confidence } }
    case 'onboarded':
      return state.onboardedAt === null ? { ...state, onboardedAt: action.at } : state
    case 'level-set':
      return { ...state, settings: { ...state.settings, currentLevel: action.level } }
    case 'reset':
      return emptyData(state.userId)
    case 'game-settle':
      return settled(state)
    case 'lesson-complete':
      // Dars yakuni: bonus XP (`lessonComplete` o'zi qo'shadi — `xp` va
      // `game.today.xp`), 0 xato bo'lsa "xatosiz dars" hisobi.
      return settled(lessonComplete(state, action.exercises, action.mistakes))
    case 'game-buy': {
      const res = buyItem(state, action.item)
      return res.ok ? settled(res.data) : state
    }
    case 'game-bet': {
      const res = placeBet(state, streakWithFreezes(state, todayKey()))
      return res.ok ? settled(res.data) : state
    }
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
      samples.push({ score: speakingScore(s.analysis), at: s.createdAt, kind: 'speaking_task' })
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

/** Yangi qurilmada serverni kutish chegarasi — tarmoq sekin bo'lsa ilova osilib qolmasin. */
const FIRST_PULL_WAIT_MS = 8000

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({
  userId,
  remoteSync = false,
  children,
}: {
  userId: string
  /** Supabase'ga kirgan foydalanuvchi: serverdagi progress o'qiladi va birlashtiriladi */
  remoteSync?: boolean
  children: ReactNode
}) {
  const [data, dispatch] = useReducer(reducer, emptyData(userId))
  const [ready, setReady] = useState(false)
  const [netOnline, setNetOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [tick, setTick] = useState(0)
  const loadedFor = useRef<string | null>(null)

  // yuklash: userId o'zgarsa — yangi foydalanuvchining keshi (aralashmaydi).
  // Hisobga kirgan foydalanuvchi uchun serverdagi progress ham o'qiladi —
  // ESKI BUG: server faqat yozilardi, logout esa lokal keshni tozalardi,
  // shuning uchun qayta kirganda yoki boshqa qurilmada hammasi noldan edi.
  useEffect(() => {
    let alive = true
    setReady(false)
    const applyLate = (pull: Promise<PullResult>) =>
      void pull.then((res) => {
        if (alive && res.snapshot) dispatch({ type: 'merge-remote', userId, remote: res.snapshot })
      })
    void (async () => {
      const d = await loadData(userId)
      if (!alive) return
      loadedFor.current = userId
      if (remoteSync && isPristine(d)) {
        // Qurilmada hali hech narsa yo'q (yangi qurilma / chiqishdan keyin):
        // bo'sh holatni ko'rsatib onboarding'ga undamaslik uchun avval serverni
        // qisqa muddat kutamiz.
        const pull = pullRemote(userId)
        const res = await Promise.race([pull, new Promise<null>((r) => window.setTimeout(() => r(null), FIRST_PULL_WAIT_MS))])
        if (!alive) return
        dispatch({ type: 'hydrate', data: res?.snapshot ? mergeRemote(d, res.snapshot) : d })
        setReady(true)
        if (res === null) applyLate(pull)
        return
      }
      dispatch({ type: 'hydrate', data: d })
      setReady(true)
      if (remoteSync) applyLate(pullRemote(userId))
    })()
    return () => {
      alive = false
    }
  }, [userId, remoteSync])

  // Taymer yurganda har soniyada qayta render (ko'rsatkichlar uchun).
  // ESKI KAMCHILIK: bu taymer yurmaganda ham ishlardi — butun ilova (store'ni
  // ishlatadigan har bir komponent) har soniyada behuda qayta chizilardi.
  const timerRunning = data.timer.startedAt !== null
  useEffect(() => {
    if (!timerRunning) return
    const iv = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000)
    return () => window.clearInterval(iv)
  }, [timerRunning])

  // O'yin qatlami VAQTGA bog'liq: yuraklar tiklanadi, byust tugaydi, kun
  // o'zgarsa questlar yangilanadi. Shuning uchun bir daqiqada bir marta:
  //  1) `game-settle` — hisoblarni yig'adi (`settle()` hech narsa o'zgarmasa
  //     SAYO BILAN BIR XIL obyek qaytaradi → saqlash navbati qo'zg'almaydi);
  //  2) `minuteTick` — "keyingi yurak: 12 daqiqa" yozuvi ham yangilanishi
  //     uchun (holat o'zgarmasa ham matn o'zgaradi).
  // DAQIQA chegarasi — ekranda sekund ko'rsatilmaydi; eski kamchilik bundan
  // ham og'ir edi: taymer yurmaғanda ham har SONIYADA qayta chizilardi.
  const [minuteTick, setMinuteTick] = useState(0)
  useEffect(() => {
    if (!ready || loadedFor.current !== userId) return
    const iv = window.setInterval(() => {
      dispatch({ type: 'game-settle' })
      setMinuteTick((t) => (t + 1) % 1_000_000)
    }, 60_000)
    return () => window.clearInterval(iv)
  }, [ready, userId])

  // Saxifa ko'zga tashlanganda (telefon qulfi, boshqa tab) ham yig'ish —
  // oradan soatlar o'tgan bo'lishi mumkin.
  useEffect(() => {
    if (!ready) return
    const onVis = () => {
      if (document.visibilityState === 'visible') dispatch({ type: 'game-settle' })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [ready])

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
  const saveVocab = useCallback((vocabId: string) => dispatch({ type: 'srs-add', vocabId }), [])

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
      // Transkript bo'lmasa matnli javob tahlil qilinadi (ravonliksiz) — aks
      // holda Firefox / mikrofonsiz foydalanuvchida gapirish dalili bo'lmasdi.
      const analysis = !task
        ? null
        : transcript
          ? analyzeSpeaking(transcript, durationSec, task)
          : textAnswer && textAnswer.trim()
            ? analyzeSpeakingText(textAnswer, task)
            : null
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

  const recordMockTime = useCallback<StoreValue['actions']['recordMockTime']>((entries) => {
    dispatch({ type: 'mock-time', entries })
  }, [])

  const completeDay = useCallback((dayId: string, testId?: string, testScore?: number) => {
    dispatch({ type: 'day-complete', dayId, testId, testScore })
  }, [])

  const jumpToSection = useCallback((sectionId: string, score: number) => {
    dispatch({ type: 'section-jump', sectionId, score })
  }, [])

  const setDiagnostic = useCallback((level: CefrLevel | null, labelUz: string, confidence: number) => {
    dispatch({ type: 'diagnostic', at: Date.now(), level, labelUz, confidence })
  }, [])

  const markOnboarded = useCallback(() => dispatch({ type: 'onboarded', at: Date.now() }), [])
  const setLevel = useCallback((level: CefrLevel) => dispatch({ type: 'level-set', level }), [])
  const resetAll = useCallback(() => dispatch({ type: 'reset' }), [])

  // ---- O'yin qatlami amallari ----
  const completeLesson = useCallback((exercises: number, mistakes: number) => {
    dispatch({ type: 'lesson-complete', exercises, mistakes })
  }, [])

  // Xarid/garov natijasi reducerda belgilanadi; bu yerda SABAB ochiq
  // qaytariladi (gem yetmasa / chegarada bo'lsa) — foydalanuvchi tushunadi.
  const buyAction = useCallback<StoreValue['actions']['buy']>(
    (item) => {
      const res = buyItem(data, item)
      if (res.ok) dispatch({ type: 'game-buy', item })
      return { ok: res.ok, reasonUz: res.reasonUz }
    },
    [data],
  )

  const placeStreakBet = useCallback<StoreValue['actions']['placeStreakBet']>(() => {
    const res = placeBet(data, streakWithFreezes(data, todayKey()))
    if (res.ok) dispatch({ type: 'game-bet' })
    return { ok: res.ok, reasonUz: res.reasonUz }
  }, [data])

  const settleGame = useCallback(() => dispatch({ type: 'game-settle' }), [])

  // Bir vaqtda bitta sinxron (tugma ikki marta bosilsa yoki logout paytida).
  const syncInFlight = useRef<Promise<SyncOutcome> | null>(null)
  const sync = useCallback(async (): Promise<SyncOutcome> => {
    if (syncInFlight.current) return syncInFlight.current
    const run = async (): Promise<SyncOutcome> => {
      if (!netOnline) return { ok: false, reasonUz: 'Internet yo‘q — navbat saqlandi.', done: 0, pulled: false }
      // Supabase sozlanmagan bo'lsa navbatga yozish behuda — yuboradigan joy yo'q.
      if (!supabaseConfigured) {
        const res = await syncNow(userId)
        return { ok: res.ok, reasonUz: res.reasonUz, done: res.done, pulled: false }
      }
      // Avval serverdagini olib birlashtiramiz: aks holda yangi qurilmadagi bo'sh
      // holat (masalan standart sozlamalar) serverdagi ma'lumotni bosib ketardi.
      let base = data
      let pulled = false
      if (remoteSync) {
        const pr = await pullRemote(userId)
        if (pr.snapshot) {
          base = mergeRemote(data, pr.snapshot)
          dispatch({ type: 'merge-remote', userId, remote: pr.snapshot })
          pulled = true
        } else if (isPristine(data)) {
          return { ok: false, reasonUz: pr.reasonUz ?? 'Serverdagi ma’lumotni o‘qib bo‘lmadi.', done: 0, pulled: false }
        }
      }
      await queueAllData(base)
      const res = await syncNow(userId)
      return { ok: res.ok, reasonUz: res.reasonUz, done: res.done, pulled }
    }
    const p = run()
    syncInFlight.current = p
    try {
      return await p
    } finally {
      syncInFlight.current = null
    }
  }, [data, userId, netOnline, remoteSync])

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
  // Zanjir + qalqon kunlari (o'yin ko'rsatkichi — Header/Dashboard'da).
  const streakProtected = useMemo(() => streakWithFreezes(data, todayKey()), [data])

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
    // Asosiy lug'at + matndan saqlangan glossariy so'zlari.
    // ESKI BUG: glossariy kalitlari (`<matn>|gl-<so'z>`) sanalmasdi —
    // foydalanuvchi Reading'da so'z saqlaydi, lekin "Bugun takror" 0
    // ko'rsatardi va Lug'at sahifasi uni umuman qaytarmaardi.
    const known = new Set([...allVocab(LOADED_LEVELS).map((v) => v.id), ...allGlossaryVocab(LOADED_LEVELS).map((v) => v.id)])
    return Object.entries(data.srs).filter(([id, s]) => s.dueAt <= now && known.has(id)).length
  }, [data.srs])
  const totalVocab = useMemo(() => totalVocabCount(), [])
  const vocabSummary = `${learnedCount}/${totalVocab}${learnedExtraCount > 0 ? ` +${learnedExtraCount} matn so‘zi` : ''}`

  const todaySeconds = data.activity[todayKey()]?.seconds ?? 0
  const timerView = useMemo(() => {
    const e = currentElapsed(data.timer)
    void tick // re-render triggers recalculation
    const planned = allocation.total
    // Kunlik reja progressi = bugun hisobga yozilgan vaqt + hali yozilmagan
    // taymer vaqti. ESKI BUG: faqat joriy taymer sanalardi — 20 daqiqalik
    // mashg'ulot to'xtatilgach sarlavha yana "0/90 daq" ko'rsatardi.
    return { elapsed: e, label: formatDuration(e), progress: planProgress(todaySeconds + e, planned) }
  }, [data.timer, tick, allocation.total, todaySeconds])

  // --- O'yin qatlami ko'rinishlari ---
  // `minuteTick` ixtiyoriy qatorda ishlatiladi: daqiqada bir marta qayta
  // hisoblanadi (yurak/byust countdowni uchun).
  const gameViews = useMemo(() => {
    void minuteTick
    const now = Date.now()
    return {
      hearts: heartsView(data, now),
      goal: goalView(data),
      quests: questView(data),
      achievements: achievementViews(data, streakProtected),
      league: leagueWeek(data),
    }
    // `data` o'zgarganda qayta hisoblanadi; daqiqada bir marta — minuteTick.
  }, [data, minuteTick, streakProtected])

  const value: StoreValue = {
    data,
    ready,
    netOnline,
    allocation,
    evidence,
    promotion,
    streak,
    streakProtected,
    learnedCount,
    vocabSummary,
    dueCount,
    timerElapsed: timerView.elapsed,
    timerLabel: timerView.label,
    dayProgress: timerView.progress,
    hearts: gameViews.hearts,
    goal: gameViews.goal,
    quests: gameViews.quests,
    achievements: gameViews.achievements,
    league: gameViews.league,
    shop: SHOP_ITEMS,
    actions: {
      setSettings,
      recordAttempt,
      gradeVocab,
      saveVocab,
      startTimer: startT,
      pauseTimer: pauseT,
      stopTimer: stopT,
      addWriting,
      addSpeaking,
      addMockAttempt,
      recordMockTime,
      completeDay,
      jumpToSection,
      setDiagnostic,
      markOnboarded,
      setLevel,
      resetAll,
      completeLesson,
      buy: buyAction,
      placeStreakBet,
      settleGame,
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
