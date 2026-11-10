/**
 * AI SUHBATDOSH — mijoz mantiqi (g'oya: Memrise MemBot / Ling chatbot; bizniki).
 *
 * Ikki dvigatel, ekranda HAR DOIM ochiq yoziladi:
 *  - `ai` — `supabase/functions/ai-roleplay` (kalit serverda, kunlik limit);
 *    model hamsuhbat rolida javob beradi, xatolarni tuzatadi.
 *  - `script` — AI ulanmagan / limit tugagan / xato: suhbat oldindan yozilgan
 *    stsenariy (`content/dialogues.ts`) bo'yicha boradi; o'quvchi javobi
 *    NAMUNA bilan so'zma-so'z solishtiriladi (baho emas — soxta ball yo'q).
 *
 * Sof funksiyalar — testlar `src/test/roleplay.test.ts`.
 */

import {
  parseRoleplayTurn,
  type RoleplayLine,
  type RoleplayRequest,
  type RoleplayTurn,
} from '../../supabase/functions/_shared/roleplay'
import { filledLine } from '../content/dialogues'
import type { Dialogue, VocabularyItem } from '../content/types'
import { callAiFunction, type AiDeps, type AiResult } from './ai'

export type RoleplayEngine = 'ai' | 'script'

export async function requestRoleplayTurn(req: RoleplayRequest, deps?: AiDeps): Promise<AiResult<RoleplayTurn>> {
  const r = await callAiFunction('ai-roleplay', req, deps)
  if (!r.ok) return r
  const turn = parseRoleplayTurn(r.body.turn)
  if (!turn) return { ok: false, reasonUz: 'AI javobi sxemaga mos emas.' }
  return { ok: true, feedback: turn, model: typeof r.body.model === 'string' ? r.body.model : '' }
}

/* ------------------------------ stsenariy ------------------------------ */

export interface ScriptTurn {
  /** O'quvchidan oldingi hamsuhbat replikalari (bo'sh bo'lishi mumkin). */
  partner: string[]
  /** Namuna javob (inglizcha, bo'shliq to'ldirilgan) va o'zbekcha ma'nosi. */
  modelEn: string
  modelUz: string
}

/** Suhbatni o'quvchi navbatlariga bo'ladi; oxiridagi hamsuhbat replikalari — `closing`. */
export function scriptTurns(d: Dialogue): { turns: ScriptTurn[]; closing: string[] } {
  const turns: ScriptTurn[] = []
  let pending: string[] = []
  for (const l of d.lines) {
    if (l.speaker === 'a') {
      pending.push(l.en)
      continue
    }
    turns.push({ partner: pending, modelEn: filledLine(l), modelUz: l.uz })
    pending = []
  }
  return { turns, closing: pending }
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Javob ↔ namuna: namunadagi so'zlardan qaysilari aytildi. Baho EMAS — faqat
 * o'quvchi o'zi solishtirishi uchun (bir xil ma'noni boshqa so'z bilan ham
 * aytish mumkin, buni ekranda ochiq yozamiz).
 */
export function compareWithModel(said: string, model: string): { matched: string[]; missing: string[] } {
  const have = new Set(tokens(said))
  const seen = new Set<string>()
  const matched: string[] = []
  const missing: string[] = []
  for (const w of tokens(model)) {
    if (seen.has(w)) continue
    seen.add(w)
    ;(have.has(w) ? matched : missing).push(w)
  }
  return { matched, missing }
}

/** AI aytgan so'zlar ichidan lug'atimizda BORlarini topadi (yangi so'z ixtiro qilinmaydi). */
export function matchVocab(words: readonly { word: string }[], pool: readonly VocabularyItem[]): VocabularyItem[] {
  const out: VocabularyItem[] = []
  for (const w of words) {
    const key = w.word.trim().toLowerCase()
    const hit = pool.find((v) => v.word.toLowerCase() === key)
    if (hit && !out.some((x) => x.id === hit.id)) out.push(hit)
  }
  return out
}

/** AI so'rovi uchun tarix (oxirgi `max` replika — server chegarasi bilan). */
export function historyForRequest(lines: readonly RoleplayLine[], max = 24): RoleplayLine[] {
  return lines.slice(-max).map((l) => ({ speaker: l.speaker, text: l.text.slice(0, 400) }))
}
