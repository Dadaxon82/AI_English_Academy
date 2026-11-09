/**
 * Ilova holati REDUCER'i — barcha o'zgarishlar shu yerda (sof funksiya).
 * `StoreProvider` (store.tsx) dispatch qiladi; testlar to'g'ridan-to'g'ri chaqiradi.
 */

import type { CefrLevel, CoreSkill, Skill } from '../content/types'
import { getBundle } from '../content/index'
import { initialSrsState, review, type SrsGrade } from './srs'
import { MAX_CONTINUOUS_SEC, currentElapsed, pauseTimer, startTimer, stopTimer } from './timer'
import { afterAttempt, afterReview, buy as buyItem, lessonComplete, placeBet, settle, streakWithFreezes, xpGain } from './game'
import type { ShopItemId } from './gameConfig'
import { mergeRemote, type RemoteSnapshot } from './merge'
import { applySectionJump } from './sections'
import type { AppData, AttemptRecord, MockExamAttempt, SpeakingSession, UserSettings, WritingSubmission } from './types'
import { HISTORY_LIMITS, emptyData, nearestXpGoal, todayKey } from './types'

// ---------- Actions ----------
export type Action =
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
  /** O'z-o'zini baholash (Likert 1–5). */
  | { type: 'self-assess'; id: string; score: number; at: number }
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
    case 'self-assess': {
      if (!Number.isInteger(action.score) || action.score < 1 || action.score > 5) return state
      return { ...state, selfAssessment: { ...state.selfAssessment, [action.id]: { score: action.score, at: action.at } } }
    }
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
