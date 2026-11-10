/**
 * «Men qila olaman» da'volarining DALILI (g'oya: Busuu CEFR yo'li).
 *
 * O'z-o'zini baholash (Likert) — his-tuyg'u; bu modul esa o'sha da'vo
 * HAQIQIY mashqlar bilan tasdiqlanganmi, shuni ko'rsatadi. Daraja qoidasi
 * bilan bir xil chegaralar (`skillScoring.ts`): kamida
 * `MIN_EVIDENCE_PER_SKILL` ta natija va vaqt bo'yicha og'irlikli ball
 * `PROMOTION_THRESHOLD` dan yuqori bo'lsa — «tasdiqlandi».
 *
 * Dalil manbai — o'sha DARAJA va KO'NIKMA bo'yicha urinishlar (attempt) va
 * mock imtihon bo'limlari (mock imtihonning darajasi `examLevel`dan).
 * Ball ixtiro qilinmaydi: natija yo'q bo'lsa «dalil yo'q».
 */

import type { CanDoStatement } from '../content/canDo'
import type { CefrLevel } from '../content/types'
import { MIN_EVIDENCE_PER_SKILL, PROMOTION_THRESHOLD, weightedScore } from './skillScoring'
import type { AttemptRecord, MockExamAttempt } from './types'

export type CanDoStatus = 'none' | 'few' | 'practice' | 'confirmed'

export interface CanDoEvidence {
  status: CanDoStatus
  /** Nechta natija hisobga olindi. */
  count: number
  /** 0..100 — natija bo'lmasa null. */
  score: number | null
  /** Tasdiqlanishi uchun yana nechta natija kerak (few holatida). */
  needed: number
}

export const CAN_DO_STATUS_UZ: Record<CanDoStatus, string> = {
  none: 'Dalil yo‘q',
  few: 'Dalil yetarli emas',
  practice: 'Hali mashq kerak',
  confirmed: 'Natija bilan tasdiqlandi',
}

export function canDoEvidence(
  s: CanDoStatement,
  attempts: readonly AttemptRecord[],
  mockAttempts: readonly MockExamAttempt[],
  now: number,
  examLevel: (examId: string) => CefrLevel | null = () => 'A1',
): CanDoEvidence {
  const samples: { score: number; at: number; kind: string }[] = []
  for (const a of attempts) {
    if (a.level !== s.level || a.skill !== s.skill) continue
    samples.push({ score: a.correct ? 100 : Math.round(a.partial * 100), at: a.at, kind: a.source })
  }
  for (const m of mockAttempts) {
    if (examLevel(m.examId) !== s.level) continue
    for (const sec of m.sections) {
      if (sec.skill === s.skill && sec.score !== null) samples.push({ score: sec.score, at: m.completedAt, kind: 'mock_exam' })
    }
  }
  if (samples.length === 0) return { status: 'none', count: 0, score: null, needed: MIN_EVIDENCE_PER_SKILL }
  const score = Math.round(weightedScore(samples, now))
  if (samples.length < MIN_EVIDENCE_PER_SKILL) {
    return { status: 'few', count: samples.length, score, needed: MIN_EVIDENCE_PER_SKILL - samples.length }
  }
  return { status: score >= PROMOTION_THRESHOLD ? 'confirmed' : 'practice', count: samples.length, score, needed: 0 }
}
