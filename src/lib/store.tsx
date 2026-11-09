/**
 * Ilova store — React Context + reducer.
 *
 * Har bir o'zgarish birinchi NAVBATDA mahalliy saqlanadi (offline-first),
 * so'ng Supabase navbatiga qo'shiladi. Internet bo'lmasa ham ishlaydi.
 */


import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type { CefrLevel, Skill } from '../content/types'
import { allGlossaryVocab, allVocab, getBundle, LOADED_LEVELS, loadLevels } from '../content/index'
import { type SrsGrade } from './srs'
import { currentElapsed, formatDuration, planProgress } from './timer'
import { streakFor, evaluateLevelPromotion } from './skillScoring'
import { achievementViews, buy as buyItem, goalView, heartsView, leagueWeek, placeBet, questView, streakWithFreezes } from './game'
import { SHOP_ITEMS } from './game'
import { analyzeSpeaking, analyzeSpeakingText, analyzeWriting, countWords } from './analyze'
import { computeAllocation } from './planning'
import { loadData, saveData } from './storage'
import { pullRemote, queueAllData, syncNow, type PullResult } from './sync'
import { isPristine, mergeRemote } from './merge'
import { supabaseConfigured } from './supabase'
import type { MockExamAttempt, SpeakingSession, UserSettings, WritingSubmission } from './types'
import { emptyData, todayKey } from './types'
import { aiRuntimeEnabled, requestSpeakingFeedback, requestWritingFeedback, speakingAnalysisFromAi, writingAnalysisFromAi } from './ai'
import { nowMs } from './clock'
import { stepScoreKey } from './stepProgress'
import { reducer } from './reducer'
import { skillEvidence, totalVocabCount } from './selectors'
import { StoreContext, type StoreValue, type SyncOutcome } from './storeContext'

/** Yangi qurilmada serverni kutish chegarasi — tarmoq sekin bo'lsa ilova osilib qolmasin. */
const FIRST_PULL_WAIT_MS = 8000


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
  // Ma'lumot QAYSI foydalanuvchi uchun yuklangan — id o'zgarsa `ready`
  // darhol false bo'ladi (effect ichida sinxron setState kerak emas).
  const [readyFor, setReadyFor] = useState<string | null>(null)
  const ready = readyFor === userId
  const [netOnline, setNetOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [tick, setTick] = useState(0)
  const loadedFor = useRef<string | null>(null)

  // yuklash: userId o'zgarsa — yangi foydalanuvchining keshi (aralashmaydi).
  // Hisobga kirgan foydalanuvchi uchun serverdagi progress ham o'qiladi —
  // ESKI BUG: server faqat yozilardi, logout esa lokal keshni tozalardi,
  // shuning uchun qayta kirganda yoki boshqa qurilmada hammasi noldan edi.
  useEffect(() => {
    let alive = true
    const applyLate = (pull: Promise<PullResult>) =>
      void pull.then((res) => {
        if (alive && res.snapshot) dispatch({ type: 'merge-remote', userId, remote: res.snapshot })
      })
    void (async () => {
      // Kontent darajalari (A2 … alohida chunk) ma'lumot bilan PARALLEL yuklanadi.
      const [d] = await Promise.all([loadData(userId), loadLevels()])
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
        setReadyFor(userId)
        if (res === null) applyLate(pull)
        return
      }
      dispatch({ type: 'hydrate', data: d })
      setReadyFor(userId)
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
  //  2) `minuteNow` — "keyingi yurak: 12 daqiqa" yozuvi ham yangilanishi
  //     uchun (holat o'zgarmasa ham matn o'zgaradi). Render SOF qoladi:
  //     vaqt holat sifatida keladi, render ichida `Date.now()` o'qilmaydi.
  // DAQIQA chegarasi — ekranda sekund ko'rsatilmaydi; eski kamchilik bundan
  // ham og'ir edi: taymer yurmaғanda ham har SONIYADA qayta chizilardi.
  const [minuteNow, setMinuteNow] = useState(nowMs)
  useEffect(() => {
    if (!ready || loadedFor.current !== userId) return
    const iv = window.setInterval(() => {
      dispatch({ type: 'game-settle' })
      setMinuteNow(Date.now())
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
      // AI (ulangan bo'lsa): qoidaviy tahlil darhol ko'rinadi, AI javobi kelsa almashtiriladi.
      if (task && sub.analysis && aiRuntimeEnabled(data.settings.aiEnabled, netOnline)) {
        void requestWritingFeedback({ level: data.settings.currentLevel, taskPrompt: task.promptEn, text }).then((r) => {
          if (r.ok) dispatch({ type: 'writing-analysis', id: sub.id, analysis: writingAnalysisFromAi(r.feedback, sub.wordCount) })
        })
      }
      return sub
    },
    [data.settings.currentLevel, data.settings.aiEnabled, netOnline],
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
      const said = (transcript ?? textAnswer ?? '').trim()
      if (task && analysis && said && aiRuntimeEnabled(data.settings.aiEnabled, netOnline)) {
        void requestSpeakingFeedback({ level: data.settings.currentLevel, taskPrompt: task.questionEn, text: said }).then((r) => {
          if (r.ok) dispatch({ type: 'speaking-analysis', id: session.id, analysis: speakingAnalysisFromAi(r.feedback, analysis) })
        })
      }
      return session
    },
    [data.settings.currentLevel, data.settings.aiEnabled, netOnline],
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

  const recordStepScore = useCallback((dayId: string, skill: string, score: number) => {
    dispatch({ type: 'step-score', key: stepScoreKey(dayId, skill), score })
  }, [])

  const jumpToSection = useCallback((sectionId: string, score: number) => {
    dispatch({ type: 'section-jump', sectionId, score })
  }, [])

  const rateCanDo = useCallback((id: string, score: number) => {
    dispatch({ type: 'self-assess', id, score, at: Date.now() })
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
    const now = minuteNow
    // Asosiy lug'at + matndan saqlangan glossariy so'zlari.
    // ESKI BUG: glossariy kalitlari (`<matn>|gl-<so'z>`) sanalmasdi —
    // foydalanuvchi Reading'da so'z saqlaydi, lekin "Bugun takror" 0
    // ko'rsatardi va Lug'at sahifasi uni umuman qaytarmaardi.
    const known = new Set([...allVocab(LOADED_LEVELS).map((v) => v.id), ...allGlossaryVocab(LOADED_LEVELS).map((v) => v.id)])
    return Object.entries(data.srs).filter(([id, s]) => s.dueAt <= now && known.has(id)).length
  }, [data.srs, minuteNow])
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
  // Daqiqada bir marta qayta hisoblanadi (yurak/byust countdowni uchun).
  // Yurak o'zgargan paytdan (`heartsAt`) oldingi vaqt ishlatilmaydi —
  // aks holda countdown bir daqiqagacha "orqada" qolardi.
  const gameViews = useMemo(() => {
    const now = Math.max(minuteNow, data.game.heartsAt)
    return {
      hearts: heartsView(data, now),
      goal: goalView(data),
      quests: questView(data),
      achievements: achievementViews(data, streakProtected),
      league: leagueWeek(data),
    }
    // `data` o'zgarganda qayta hisoblanadi; daqiqada bir marta — minuteNow.
  }, [data, minuteNow, streakProtected])

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
      recordStepScore,
      rateCanDo,
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
