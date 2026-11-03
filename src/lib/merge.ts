/**
 * Serverdagi holatni qurilmadagi holat bilan birlashtirish (toza funksiya).
 *
 * ESKI BUG: ilova serverdan HECH NARSA o'qimasdi, logout esa lokal keshni
 * tozalardi — qayta kirganda yoki boshqa qurilmada progress noldan boshlanardi.
 *
 * Qoidalar (qayta-qayta chaqirilsa ham natija o'zgarmaydi):
 *  - urinishlar, yozish/gapirish ishlari, mock natijalari — `id` bo'yicha birlashma;
 *  - SRS — ko'proq takrorlangan (`reps`) holat ustun, teng bo'lsa keyingisi;
 *  - kunlik faollik — har maydon bo'yicha maksimum (bir xil kun ikki marta
 *    o'qilsa ham vaqt ikki marta sanalmaydi);
 *  - sozlamalar — qurilmada hali hech narsa bo'lmasa serverdagisi, aks holda
 *    qurilmadagisi (foydalanuvchi shu yerda o'zgartirgan);
 *  - o'quv yo'li — tugatilgan kunlar birlashmasi, test ballari maksimumi.
 */

import { getBundle } from '../content'
import type { SrsState } from './srs'
import type { AppData, AttemptRecord, DayActivity, MockExamAttempt, SpeakingSession, UserSettings, WritingSubmission } from './types'
import { HISTORY_LIMITS } from './types'

/** Serverdan o'qilgan holat (faqat foydalanuvchining o'z qatorlari — RLS). */
export interface RemoteSnapshot {
  settings: Partial<UserSettings> | null
  plan: { path?: AppData['path']; xp?: number; diagnostic?: AppData['diagnostic'] } | null
  attempts: AttemptRecord[]
  srs: Record<string, SrsState>
  activity: Record<string, DayActivity>
  writing: WritingSubmission[]
  speaking: SpeakingSession[]
  mockAttempts: MockExamAttempt[]
}

/** Qurilmada hali hech qanday o'quv izi yo'q (yangi qurilma yoki chiqishdan keyin). */
export function isPristine(d: AppData): boolean {
  return (
    d.attempts.length === 0 &&
    Object.keys(d.srs).length === 0 &&
    Object.keys(d.activity).length === 0 &&
    d.writing.length === 0 &&
    d.speaking.length === 0 &&
    d.mockAttempts.length === 0 &&
    d.path.completedDays.length === 0 &&
    d.diagnostic === null
  )
}

function unionById<T extends { id: string }>(local: readonly T[], remote: readonly T[], at: (x: T) => number, cap: number): T[] {
  const map = new Map<string, T>()
  for (const r of remote) map.set(r.id, r)
  // Lokal yozuv ustun: unda serverga yuborilmaydigan maydonlar ham bor
  // (masalan gapirish yozuvining qurilmadagi audio belgisi).
  for (const l of local) map.set(l.id, l)
  return [...map.values()].sort((a, b) => at(a) - at(b)).slice(-cap)
}

function pickSrs(local: SrsState, remote: SrsState): SrsState {
  if (local.reps !== remote.reps) return local.reps > remote.reps ? local : remote
  return (remote.lastReviewedAt ?? 0) > (local.lastReviewedAt ?? 0) ? remote : local
}

function mergeDay(local: DayActivity, remote: DayActivity): DayActivity {
  const skills: DayActivity['skills'] = { ...local.skills }
  for (const [k, v] of Object.entries(remote.skills)) {
    const key = k as keyof DayActivity['skills']
    skills[key] = Math.max(skills[key] ?? 0, v ?? 0)
  }
  return {
    date: local.date,
    seconds: Math.max(local.seconds, remote.seconds),
    attempts: Math.max(local.attempts, remote.attempts),
    correct: Math.max(local.correct, remote.correct),
    newWords: Math.max(local.newWords, remote.newWords),
    reviewedWords: Math.max(local.reviewedWords, remote.reviewedWords),
    skills,
  }
}

export function mergeRemote(local: AppData, remote: RemoteSnapshot): AppData {
  const pristine = isPristine(local)
  const settings = pristine && remote.settings ? { ...local.settings, ...remote.settings } : local.settings

  const srs = { ...local.srs }
  for (const [id, st] of Object.entries(remote.srs)) {
    const mine = srs[id]
    srs[id] = mine ? pickSrs(mine, st) : st
  }

  const activity = { ...local.activity }
  for (const [day, act] of Object.entries(remote.activity)) {
    const mine = activity[day]
    activity[day] = mine ? mergeDay(mine, act) : act
  }

  const rp = remote.plan?.path
  const completedDays = [...local.path.completedDays]
  for (const d of rp?.completedDays ?? []) if (!completedDays.includes(d)) completedDays.push(d)
  const passedTests = { ...local.path.passedTests }
  for (const [k, v] of Object.entries(rp?.passedTests ?? {})) passedTests[k] = Math.max(passedTests[k] ?? 0, v)
  const fallbackDay = pristine && rp ? rp.currentDayId : local.path.currentDayId
  const currentDayId = getBundle(settings.currentLevel).days.find((d) => !completedDays.includes(d.id))?.id ?? fallbackDay

  const ld = local.diagnostic
  const rd = remote.plan?.diagnostic ?? null
  const diagnostic = !rd ? ld : !ld ? rd : rd.at > ld.at ? rd : ld

  return {
    ...local,
    settings,
    srs,
    activity,
    attempts: unionById(local.attempts, remote.attempts, (a) => a.at, HISTORY_LIMITS.attempts),
    writing: unionById(local.writing, remote.writing, (w) => w.createdAt, HISTORY_LIMITS.writing),
    speaking: unionById(local.speaking, remote.speaking, (s) => s.createdAt, HISTORY_LIMITS.speaking),
    mockAttempts: unionById(local.mockAttempts, remote.mockAttempts, (m) => m.completedAt, HISTORY_LIMITS.mockAttempts),
    xp: Math.max(local.xp, remote.plan?.xp ?? 0),
    path: { completedDays, passedTests, currentDayId },
    diagnostic,
  }
}
