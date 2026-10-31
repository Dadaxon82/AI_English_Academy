/**
 * Haqiqiy ishlaydigan taymer.
 *
 * Sahifa yangilanganda yoki qurilma o'chganda bajarilgan vaqt asossiz
 * yo'qolmasligi uchun hisob "boshlangan moment" + "to'plangan sekund"
 * ko'rinishida saqlanadi. Pauza holati ham shu bilan birga yuritiladi.
 */

export interface TimerState {
  /** Faol o'lchangan daqiqalar soni (pauzada hisoblanmaydi) */
  elapsedSec: number
  /** start === null bo'lsa taymer to'xtatilgan/pauzada */
  startedAt: number | null
  /** Bugungi bog'langan mashg'ulot idsi (bo'sh bo'lsa bog'lanmagan) */
  sessionId: string | null
  skill: string | null
  /** So'nggi marta saqlangan vaqt — qulashdan tiklash uchun */
  updatedAt: number
}

export const idleTimer: TimerState = {
  elapsedSec: 0,
  startedAt: null,
  sessionId: null,
  skill: null,
  updatedAt: Date.now(),
}

/**
 * Uyqu / sahifa yopiq bo'lgan oraliq cheklanadi.
 *
 * `currentElapsed` devor-soat orqali hisoblaydi. Qurilma 25 soat uxlaysa yoki
 *Brauzer seansida taymer yopib qo'yilsa, bu butun oraliq "bajarilgan vaqt"
 * deb yozilardi — kundalik 90 daqiqalik reja bir zumda 100%+ chiqardi.
 * Shuning uchun uzluksiz yurish [MAX_CONTINUOUS_SEC] bilan chegaralanadi:
 * haqiqatan davom etgan mashg'ulot bu chegaradan oshmaydi.
 */
export const MAX_CONTINUOUS_SEC = 3 * 3600 // 3 soat — real seans uchun chegara

export function startTimer(prev: TimerState, sessionId: string, skill: string, now = Date.now()): TimerState {
  // Bir vaqtda faqat bitta mashg'ulot taymeri yuradi.
  // Xuddi shu sessiya + xuddi shu ko'nikma: hech narsa qilmaymiz (pauzadan
  // "Davom etish" hisob ustiga qo'shiladi).
  if (prev.startedAt !== null && prev.sessionId === sessionId && prev.skill === skill) return prev
  // Sessiya bir xil, lekin KO'NIKMA o'zgarsa (LearningPath: `day-01` sessiyasi
  // bilan vocab → grammar) — oldingi ko'nikmaning hisoblanmagan sekundlarini
  // yig'ib, yangi ko'nikmaga o'tamiz. Aks holda butun sessiya vaqti noto'g'ri
  // ko'nikmaga yozilardi.
  const sameSessionOtherSkill = prev.startedAt !== null && prev.sessionId === sessionId && prev.skill !== skill
  let base: TimerState
  if (sameSessionOtherSkill) {
    const runningFor = Math.floor(clampDelta(now - (prev.startedAt as number)) / 1000)
    base = { ...prev, elapsedSec: prev.elapsedSec + runningFor, startedAt: null, updatedAt: now }
  } else if (prev.startedAt !== null) {
    base = stopTimer(prev, sessionId, skill, now)
  } else {
    base = prev
  }
  return {
    elapsedSec: base.sessionId === sessionId || base.sessionId === null ? base.elapsedSec : 0,
    startedAt: now,
    sessionId,
    skill,
    updatedAt: now,
  }
}

export function pauseTimer(prev: TimerState, now = Date.now()): TimerState {
  if (prev.startedAt === null) return prev
  return {
    ...prev,
    elapsedSec: prev.elapsedSec + Math.floor(clampDelta(now - prev.startedAt) / 1000),
    startedAt: null,
    updatedAt: now,
  }
}

export function stopTimer(
  prev: TimerState,
  sessionId: string,
  skill: string,
  now = Date.now(),
): TimerState {
  const paused = pauseTimer(prev, now)
  // Boshqa mashg'ulotga o'tilsa hisob tozalanadi — aralashmasligi uchun.
  if (prev.sessionId !== null && prev.sessionId !== sessionId) {
    return { ...idleTimer, skill, sessionId: null, updatedAt: now }
  }
  // Sessiya tugadi: `sessionId` ham `null` qilinadi — aks holda Dashboard
  // `paused = startedAt === null && sessionId !== null` sharti bilan "Taymer
  // pauzada — 00:00" soxta kartasini chizadi va "Davom etish" o'lik taymerni
  // tiriklashtiradi.
  return { ...paused, sessionId: null, updatedAt: now }
}

/**
 * Devor-soat farqi — soat siljishi / tizim saati o'zgarsa manfiy bo'lmasligi
 * va uxlash oralig'i cheklanishi uchun.
 */
function clampDelta(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0
  return Math.min(deltaMs, MAX_CONTINUOUS_SEC * 1000)
}

/** Joriy hisoblangan sekundlar (rendersiz, toza funksiya). */
export function currentElapsed(state: TimerState, now = Date.now()): number {
  if (state.startedAt === null) return state.elapsedSec
  return state.elapsedSec + Math.floor(clampDelta(now - state.startedAt) / 1000)
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** Kundalik reja bosqichi: bajarilgan / reja (dakika). */
export function planProgress(elapsedSec: number, plannedMinutes: number): {
  doneMin: number
  leftMin: number
  ratio: number
} {
  const doneMin = Math.floor(elapsedSec / 60)
  const leftMin = Math.max(0, plannedMinutes - doneMin)
  return { doneMin, leftMin, ratio: plannedMinutes === 0 ? 0 : Math.min(1, doneMin / plannedMinutes) }
}
