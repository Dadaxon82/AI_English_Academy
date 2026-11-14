/**
 * TALAFFUZ MASHQI — brauzer tanigan matnni namuna gap bilan so'zma-so'z
 * solishtirish (g'oya: Rosetta Stone TruAccent; usul bizniki va SODDA).
 *
 * Halollik: bu TALAFFUZ BAHOSI EMAS — brauzer nutqni qanday TANIGANINI
 * namunaga solishtiradi. Ball «taxminiy moslik» deb yoziladi; brauzer
 * nutqni tanimasa ball umuman chiqmaydi.
 *
 * Moslash — so'zlar bo'yicha LCS (eng uzun umumiy ketma-ketlik): tartib
 * saqlanadi, tushib qolgan va ortiqcha so'zlar alohida ko'rinadi.
 */

import { dialoguesFor, filledLine } from '../content/dialogues'
import type { CefrLevel } from '../content/types'

export type WordStatus = 'ok' | 'miss'

export interface PronunciationResult {
  /** Namuna so'zlari (asl yozilishi bilan) va holati. */
  words: { text: string; status: WordStatus }[]
  /** Aytilgan, lekin namunada yo'q so'zlar. */
  extra: string[]
  /** 0..100 — to'g'ri tanilgan namuna so'zlari ulushi. */
  score: number
}

const norm = (w: string) =>
  w
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9']/g, '')

/** Raqamlar so'z bilan aytilishi mumkin — brauzer «7» yoki «seven» qaytaradi. */
const NUM: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
}
const canon = (w: string) => NUM[w] ?? w

export function comparePronunciation(target: string, said: string): PronunciationResult {
  const tWords = target.split(/\s+/).filter((w) => norm(w).length > 0)
  const t = tWords.map((w) => canon(norm(w)))
  const s = said
    .split(/\s+/)
    .map((w) => canon(norm(w)))
    .filter(Boolean)
  // LCS jadvali
  const dp: number[][] = Array.from({ length: t.length + 1 }, () => new Array<number>(s.length + 1).fill(0))
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = s.length - 1; j >= 0; j--) {
      dp[i]![j] = t[i] === s[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }
  const status: WordStatus[] = new Array<WordStatus>(t.length).fill('miss')
  const usedSaid = new Array<boolean>(s.length).fill(false)
  let i = 0
  let j = 0
  while (i < t.length && j < s.length) {
    if (t[i] === s[j]) {
      status[i] = 'ok'
      usedSaid[j] = true
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++
    else j++
  }
  const ok = status.filter((x) => x === 'ok').length
  return {
    words: tWords.map((text, k) => ({ text, status: status[k]! })),
    extra: s.filter((_, k) => !usedSaid[k]),
    score: t.length === 0 ? 0 : Math.round((ok / t.length) * 100),
  }
}

/** Mashq gaplari: shu daraja suhbatlaridan (ikkala rol), 3–12 so'z, takrorsiz. */
export function pronunciationSentences(level: CefrLevel): { en: string; uz: string }[] {
  const seen = new Set<string>()
  const out: { en: string; uz: string }[] = []
  for (const d of dialoguesFor(level)) {
    for (const l of d.lines) {
      const en = filledLine(l)
      const n = en.split(/\s+/).length
      if (n < 3 || n > 12 || seen.has(en)) continue
      seen.add(en)
      out.push({ en, uz: l.uz })
    }
  }
  return out
}
