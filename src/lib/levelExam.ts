/**
 * ADDIE — EVALUATION (summativ): DARAJA IMTIHONI (A0 → A1 → … → C1).
 *
 * Imtihon darajaning har kunlik yakuniy testidan `LEVEL_EXAM_PER_DAY` tadan
 * savol oladi (deterministik: test bo'ylab teng taqsimlangan indekslar) —
 * shuning uchun u butun daraja mazmunini (lug'at, grammatika, o'qish,
 * tinglash) qamraydi. Matnga bog'liq savollar olinmaydi.
 *
 * Natija `passedTests['level:<L>']` ga eng yaxshisi sifatida yoziladi.
 * Imtihon darajani O'ZI ko'tarmaydi: o'tgan o'quvchiga keyingi darajaga o'tish
 * TAKLIF qilinadi (o'quvchi tasdiqlaydi — Sozlamalardagi tanlov bilan bir xil).
 */
import type { CefrLevel, DailyPlanDay, Exercise } from '../content/types'
import { CEFR_LEVELS } from '../content/types'

export const LEVEL_EXAM_PASS = 80
export const LEVEL_EXAM_PER_DAY = 3

export const levelExamKey = (level: CefrLevel) => `level:${level}`

export function nextLevelOf(level: CefrLevel): CefrLevel | null {
  const i = CEFR_LEVELS.indexOf(level)
  return i >= 0 && i < CEFR_LEVELS.length - 1 ? CEFR_LEVELS[i + 1]! : null
}

/** Imtihon savollari — har kun testidan teng oraliqda `perDay` ta. */
export function buildLevelExam(days: readonly DailyPlanDay[], perDay = LEVEL_EXAM_PER_DAY): Exercise[] {
  const out: Exercise[] = []
  for (const d of days) {
    const pool = (d.sectionTest?.exercises ?? []).filter((e) => !('passageId' in e && e.passageId))
    if (pool.length === 0) continue
    const n = Math.min(perDay, pool.length)
    for (let k = 0; k < n; k++) out.push(pool[Math.floor((k * pool.length) / n)]!)
  }
  return out
}

/** Birinchi urinishlar bo'yicha ball (0..100): qisman javob ham hisobga olinadi. */
export function levelExamScore(firstTries: ReadonlyMap<string, { correct: boolean; partial: number }>, total: number): number {
  if (total <= 0) return 0
  let pts = 0
  for (const r of firstTries.values()) pts += r.correct ? 1 : Math.max(0, Math.min(1, r.partial))
  return Math.round((pts / total) * 100)
}

/** Daraja imtihoni tavsiya qilinadimi: hamma kuni tugagan va hali o'tilmagan. */
export function levelExamReady(
  level: CefrLevel,
  days: readonly DailyPlanDay[],
  completed: readonly string[],
  passedTests: Readonly<Record<string, number>>,
): boolean {
  if (days.length === 0) return false
  const allDone = days.every((d) => completed.includes(d.id))
  return allDone && (passedTests[levelExamKey(level)] ?? 0) < LEVEL_EXAM_PASS
}
