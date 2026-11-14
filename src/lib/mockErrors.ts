/**
 * Mock imtihon xatolarini Xatolar kundaligidan ko'rinadigan qilish.
 *
 * ESKI KAMCHILIK: MockExam javoblari faqat `mockAttempts`da saqlanardi,
 * `attempts`ga yozilmaskdi. Natijada:
 *   - Xatolar kundaligidagi "Manba: Mock imtihon" filtri AMALDA DOIM bo'sh
 *     edi (filtr mavjud, lekin unga tushadigan yozuv yo'q — yarim ishlangan
 *     tugma/filtr);
 *   - imtihonda xato qilgan mashq "Mashq qilish →" havolasi orqali qayta
 *     ochib bo'lmaskdi.
 *
 * Bu funksiya `attempts`ni IFLOSHATMAYDI (dalil `skillEvidence`da mock
 * bo'lim ballari orqali ALLOQACHON hisoblanadi — qo'shsak ikki marta
 * sanalar edi). U faqat ko'rsatish/eksport uchun AttemptRecord shakliga
 * keltiradi.
 */

import { findExercise } from '../content'
import type { CefrLevel } from '../content/types'
import type { AttemptRecord, MockExamAttempt } from './types'

export function mockErrorAttempts(
  mockAttempts: readonly MockExamAttempt[],
  currentLevel: CefrLevel,
): AttemptRecord[] {
  const out: AttemptRecord[] = []
  for (const m of mockAttempts) {
    for (const s of m.sections) {
      for (const [exId, r] of Object.entries(s.exerciseResults)) {
        // `note:` — erkin matnli javob (savol emas); bo'sh javob — ishtirok etmagan.
        if (exId.startsWith('note:') || r.correct || r.given.trim() === '') continue
        const ex = findExercise(exId)
        out.push({
          id: `mx-err-${m.id}-${exId}`,
          exerciseId: exId,
          skill: ex?.skill ?? s.skill,
          level: ex?.level ?? currentLevel,
          correct: false,
          partial: 0,
          difficulty: ex?.difficulty ?? 2,
          secondsSpent: Math.max(0, Math.round((s.finishedAt - s.startedAt) / 1000)),
          source: 'mock_exam',
          answerGiven: r.given,
          at: m.completedAt,
        })
      }
    }
  }
  // Yangisidan eskisiga (sahifadagi tartib shu).
  return out.sort((a, b) => b.at - a.at)
}

/**
 * Bir xil mashq bo'yicha takrorlanadigan xatolarni sanashda mock yozuvlari
 * haqiqiy `attempts` yozuvlari bilan ALMASHTIRILMAYDI — ikkalasi ham hisobga
 * olinadi, shuning uchun bir mashq mockda va mashqda xato bo'lsa 2 marta
 * deb chiqadi (bu to'g'ri: foydalanuvchi ikki marta adashgan).
 */
export function withMockErrors(
  attempts: readonly AttemptRecord[],
  mockAttempts: readonly MockExamAttempt[],
  currentLevel: CefrLevel,
): AttemptRecord[] {
  const mock = mockErrorAttempts(mockAttempts, currentLevel)
  if (mock.length === 0) return [...attempts]
  // Bir xil yozuv ikki marta tushmasin (kelajakda mock attempt'lar `attempts`ga
  // yozilsa) — kalit: exerciseId + javob + vaqt.
  const seen = new Set(attempts.map((a) => `${a.exerciseId}|${a.answerGiven}|${a.at}`))
  const extra = mock.filter((a) => {
    const k = `${a.exerciseId}|${a.answerGiven}|${a.at}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return [...attempts, ...extra]
}
