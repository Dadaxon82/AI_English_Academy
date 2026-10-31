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

export function startTimer(prev: TimerState, sessionId: string, skill: string, now = Date.now()): TimerState {
  // Bir vaqtda faqat bitta mashg'ulot taymeri yuradi.
  if (prev.startedAt !== null && prev.sessionId === sessionId) return prev
  const base = prev.startedAt !== null ? stopTimer(prev, sessionId, skill, now) : prev
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
    elapsedSec: prev.elapsedSec + Math.floor((now - prev.startedAt) / 1000),
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
    return { ...idleTimer, skill, sessionId, updatedAt: now }
  }
  return { ...paused, skill, sessionId, updatedAt: now }
}

/** Joriy hisoblangan sekundlar (rendersiz, toza funksiya). */
export function currentElapsed(state: TimerState, now = Date.now()): number {
  if (state.startedAt === null) return state.elapsedSec
  return state.elapsedSec + Math.floor((now - state.startedAt) / 1000)
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
