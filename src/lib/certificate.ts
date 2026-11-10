/**
 * DARAJA YAKUNLASH GUVOHNOMASI (g'oya: Busuu sertifikati; lekin RASMIY EMAS).
 *
 * Shart — daraja bo'yicha O'quv yo'lining barcha kunlari yakunlangan bo'lishi.
 * Guvohnomadagi har son HAQIQIY ma'lumotdan (urinishlar, SRS, can-do dalili)
 * olinadi; ixtiro qilinmaydi. Matnda doim «rasmiy sertifikat emas — mashq
 * natijasi» deb yoziladi (mock imtihon qoidasi bilan bir xil).
 */

import { canDoFor } from '../content/canDo'
import type { CefrLevel, DailyPlanDay } from '../content/types'
import { canDoEvidence } from './canDoEvidence'
import type { AppData } from './types'

export const CERTIFICATE_DISCLAIMER_UZ =
  'Bu rasmiy sertifikat emas: AI English Academy platformasidagi mashq natijalari asosida avtomatik yaratilgan yakunlash guvohnomasi.'

export interface CertificateInfo {
  eligible: boolean
  level: CefrLevel
  daysDone: number
  daysTotal: number
  /** Shu daraja bo'yicha urinishlar soni va aniqligi (0..100, urinish yo'q bo'lsa null). */
  attempts: number
  accuracy: number | null
  /** O'zlashtirilgan so'zlar (SRS, shu daraja havuzidan). */
  wordsLearned: number
  /** Natija bilan tasdiqlangan «Men qila olaman» da'volari. */
  canDoConfirmed: number
  canDoTotal: number
}

export function certificateInfo(
  data: AppData,
  level: CefrLevel,
  days: readonly DailyPlanDay[],
  levelVocabIds: readonly string[],
  now: number,
  examLevel: (examId: string) => CefrLevel | null,
): CertificateInfo {
  const done = days.filter((d) => data.path.completedDays.includes(d.id)).length
  const atts = data.attempts.filter((a) => a.level === level)
  const correct = atts.filter((a) => a.correct).length
  const claims = canDoFor(level)
  return {
    eligible: days.length > 0 && done === days.length,
    level,
    daysDone: done,
    daysTotal: days.length,
    attempts: atts.length,
    accuracy: atts.length === 0 ? null : Math.round((correct / atts.length) * 100),
    wordsLearned: levelVocabIds.filter((id) => data.srs[id]?.learnedAt != null).length,
    canDoConfirmed: claims.filter((c) => canDoEvidence(c, data.attempts, data.mockAttempts, now, examLevel).status === 'confirmed').length,
    canDoTotal: claims.length,
  }
}
