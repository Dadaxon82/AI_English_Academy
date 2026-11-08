/**
 * Lug'at O'YINI — so'zlardan Duolingo dars uslubidagi topshiriqlar zanjiri.
 *
 * Sessiya: `WORDS_PER_GAME` ta so'z (avval takrori yetganlar, so'ng yangi,
 * so'ng qolganlar). Har so'z uchun:
 *  1. YANGI so'z bo'lsa — «YANGI SO'Z» belgili tarjima tanlovi (3 variant);
 *  2. rasmi bo'lsa — rasmli kartalar: «suv» so'zini tanlang (3 karta);
 *  3. misol gap qisqa bo'lsa — gapni plitkalardan yig'ish (EN→UZ, har
 *     ikkinchisi UZ→EN);
 * oxirida — barcha so'zlar bo'yicha juftlik (4 tagacha).
 *
 * SOF funksiya: tasodif `rand` orqali beriladi (testda deterministik).
 */

import { vocabMatchExercise, vocabPictureExercise, vocabQuizExercise, vocabSentenceExercise } from '../content'
import type { Exercise, VocabularyItem } from '../content/types'
import { vocabEmoji } from '../content/vocabEmoji'
import { isDue, type SrsState } from './srs'

export const WORDS_PER_GAME = 5
/** Plitkali gap uchun eng ko'p so'z soni (uzun gap o'yinni zeriktiradi). */
export const MAX_SENTENCE_WORDS = 8

export interface GameStep {
  exercise: Exercise
  /** Shu topshiriq qaysi so'zlarni tekshiradi (SRS bahosi shularga). */
  vocabIds: string[]
  /** «YANGI SO'Z» belgisi. */
  isNew: boolean
  /** Rasmli tanlovda har variantning rasmi. */
  icons?: string[]
}

function shuffled<T>(arr: readonly T[], rand: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = out[i]!
    out[i] = out[j]!
    out[j] = t
  }
  return out
}

const key = (s: string) => s.trim().toLowerCase()
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/** Sessiya so'zlari: due → yangi → qolgan (har guruh ichida aralash). */
export function pickGameWords(
  pool: readonly VocabularyItem[],
  srs: Record<string, SrsState>,
  rand: () => number,
  now = Date.now(),
  n = WORDS_PER_GAME,
): VocabularyItem[] {
  const due: VocabularyItem[] = []
  const fresh: VocabularyItem[] = []
  const rest: VocabularyItem[] = []
  const seen = new Set<string>()
  for (const v of pool) {
    if (seen.has(key(v.word))) continue
    seen.add(key(v.word))
    const st = srs[v.id]
    if (st && isDue(st, now)) due.push(v)
    else if (!st || st.learnedAt === null) fresh.push(v)
    else rest.push(v)
  }
  return [...shuffled(due, rand), ...shuffled(fresh, rand), ...shuffled(rest, rand)].slice(0, n)
}

export function buildWordGame(
  pool: readonly VocabularyItem[],
  srs: Record<string, SrsState>,
  rand: () => number = Math.random,
  now = Date.now(),
): GameStep[] {
  const picked = pickGameWords(pool, srs, rand, now)
  const steps: GameStep[] = []
  let sentenceFlip = false

  for (const v of picked) {
    const isNew = !srs[v.id] || srs[v.id]!.learnedAt === null
    const others = pool.filter((o) => key(o.word) !== key(v.word) && key(o.translationUz) !== key(v.translationUz))

    if (isNew && others.length >= 2) {
      const opts = shuffled([v.translationUz, ...shuffled(others, rand).slice(0, 2).map((o) => o.translationUz)], rand)
      // Gap pufagida faqat so'zning o'zi (id o'zgarmaydi — Xatolar daftari uni tiklaydi).
      const base = vocabQuizExercise(v, opts)
      steps.push({ exercise: { ...base, question: v.word, instructionUz: 'Tarjimasini tanlang' }, vocabIds: [v.id], isNew: true })
    }

    const icon = vocabEmoji(v.word)
    if (icon) {
      const usedIcons = new Set([icon])
      const distract: VocabularyItem[] = []
      for (const o of shuffled(others, rand)) {
        const oi = vocabEmoji(o.word)
        if (!oi || usedIcons.has(oi)) continue
        usedIcons.add(oi)
        distract.push(o)
        if (distract.length === 2) break
      }
      if (distract.length === 2) {
        const cards = shuffled([v, ...distract], rand)
        steps.push({
          exercise: vocabPictureExercise(v, cards.map((c) => c.word)),
          vocabIds: [v.id],
          isNew: false,
          icons: cards.map((c) => vocabEmoji(c.word)!),
        })
      }
    }

    // Misol gapi yo'q so'zlar (masalan O'qish matnidan saqlangan glossariy) — gap topshirig'isiz.
    const ne = words(v.exampleEn), nu = words(v.exampleUz)
    if (ne > 0 && nu > 0 && ne <= MAX_SENTENCE_WORDS && nu <= MAX_SENTENCE_WORDS) {
      steps.push({ exercise: vocabSentenceExercise(v, sentenceFlip ? 'uz' : 'en'), vocabIds: [v.id], isNew: false })
      sentenceFlip = !sentenceFlip
    }
  }

  const matchable: VocabularyItem[] = []
  for (const v of picked) {
    if (matchable.some((m) => key(m.translationUz) === key(v.translationUz))) continue
    matchable.push(v)
    if (matchable.length === 4) break
  }
  if (matchable.length >= 3) {
    steps.push({ exercise: vocabMatchExercise(matchable), vocabIds: matchable.map((m) => m.id), isNew: false })
  }
  return steps
}

/** Oddiy deterministik tasodif (testlar uchun). */
export function seededRand(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}
