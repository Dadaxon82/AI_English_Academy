/**
 * "Boshqa ko'rinishda" — xato qilingan mashqni BOSHQA formatda qayta berish
 * (Xatolar daftari o'yini). Bir xil bilim, boshqa yo'l bilan tekshiriladi:
 *
 *  - gap-fill        → dropdown-cloze (to'g'ri javob + o'quvchining xato javobi
 *                      + bankdagi chalg'ituvchi) — tanib olish;
 *  - dropdown-cloze  → gap-fill (variantsiz, yozib) — eslab yozish;
 *  - multiple-choice → short-answer (javob 1–3 so'z bo'lsa) — eslab yozish;
 *  - translation     → word-order (javob so'zlaridan gap tuzish).
 *
 * Boshqa turlar uchun `null` (o'yin asl mashqni beradi).
 *
 * SOF funksiya — faqat `types.ts`ga bog'liq (content/index ham ishlatadi:
 * `findExercise('remix-<id>')` id'dan tiklaydi).
 */

import type { Exercise } from './types'

export const REMIX_PREFIX = 'remix-'

function wordsOf(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean)
}

/** Deterministik aralashtirish (id bo'yicha). */
function seeded<T>(arr: readonly T[], seed: string): T[] {
  const out = [...arr]
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    const j = h % (i + 1)
    const t = out[i]!
    out[i] = out[j]!
    out[j] = t
  }
  return out
}

const low = (s: string) => s.trim().toLowerCase()

/**
 * @param lastGiven — o'quvchining oxirgi xato javobi (`AttemptRecord.answerGiven`);
 *   berilsa, gap-fill → ro'yxat variantlariga qo'shiladi (aynan o'z xatosini taniydi).
 */
export function remixExercise(ex: Exercise, lastGiven = ''): Exercise | null {
  const id = `${REMIX_PREFIX}${ex.id}`
  const base = { id, level: ex.level, skill: ex.skill, difficulty: ex.difficulty, tags: [...(ex.tags ?? []), 'remix'] }
  switch (ex.kind) {
    case 'gap-fill': {
      const given = lastGiven.split(' / ')
      const bank = ex.wordBank ?? []
      const choices = ex.answers.map((ans, i) => {
        const pool = [ans]
        const g = (given[i] ?? '').trim()
        if (g && low(g) !== low(ans)) pool.push(g)
        for (const w of [...bank, ...ex.answers]) {
          if (pool.length >= 3) break
          if (!pool.some((p) => low(p) === low(w))) pool.push(w)
        }
        return seeded(pool, `${id}:${i}`)
      })
      if (choices.some((c) => c.length < 2)) return null
      return {
        ...base,
        kind: 'dropdown-cloze',
        instructionUz: 'Böşliqlar uçun töğri variantni tanlang.',
        text: ex.text,
        choices,
        answers: ex.answers,
        explanationUz: ex.explanationUz,
      }
    }
    case 'dropdown-cloze':
      return {
        ...base,
        kind: 'gap-fill',
        instructionUz: 'Endi variantlarsiz — böşliqlarni özingiz yozing.',
        text: ex.text,
        answers: ex.answers,
        explanationUz: ex.explanationUz,
      }
    case 'multiple-choice': {
      const answer = ex.options[ex.answerIndex] ?? ''
      const n = wordsOf(answer).length
      if (!ex.question.trim() || n === 0 || n > 3 || ex.passageExcerpt) return null
      return {
        ...base,
        kind: 'short-answer',
        instructionUz: 'Variantlarsiz — javobni eslab yozing.',
        question: ex.question,
        accepted: [answer],
        maxWords: Math.max(3, n),
        explanationUz: ex.explanationUz,
      }
    }
    case 'translation': {
      const answer = wordsOf(ex.accepted[0] ?? '')
      if (answer.length < 2 || answer.length > 12) return null
      let bank = seeded(answer, id)
      if (bank.join(' ') === answer.join(' ')) bank = [...bank.slice(1), bank[0]!]
      return {
        ...base,
        kind: 'word-order',
        instructionUz: `Tarjimani sözlardan tuzing: “${ex.source}”`,
        answer,
        bank,
        explanationUz: ex.explanationUz,
      }
    }
    default:
      return null
  }
}

/** `remix-<id>` → `<id>` (boshqa id o'zgarishsiz). */
export function baseExerciseId(id: string): string {
  return id.startsWith(REMIX_PREFIX) ? id.slice(REMIX_PREFIX.length) : id
}
