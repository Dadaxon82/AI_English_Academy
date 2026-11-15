/**
 * VIDEO SHORTLAR — real hayot suhbatlari replikalaridan qisqa kliplar
 * (g'oya: Memrise «Learn with Locals»; kontent bizniki).
 *
 * Har short = suhbatning BITTA replikasi: kim aytadi, qayerda, nima deydi.
 * Pleyer (`ShortPlayer`) uni vertikal (9:16) sahnada ko'rsatadi:
 *  - `public/video/manifest.json` da shu short uchun HAQIQIY video bo'lsa —
 *    o'sha video (ona tilida so'zlashuvchi yozuvi);
 *  - bo'lmasa — animatsion sahna, ovoz qurilmaning ingliz nutq sintezi (TTS).
 *    Bu ochiq yoziladi: «Animatsion · sintez ovoz» (soxta «haqiqiy odam» yo'q).
 *
 * Mashq (Memrise uslubi): avval tomosha → savol → subtitr JAVOBDAN KEYIN
 * ochiladi. Ikki xil:
 *   `m` — ma'no: «Nima demoqçi? Ma'nosini tanlang» (o'zbekcha variantlar);
 *   `l` — eşitiş: «Qaysi gapni eşitdingiz?» (inglizcha variantlar).
 * Id: `short-<suhbat>-<qator>-<m|l>` — `findExercise()` uni qayta tiklaydi,
 * shuning uchun xatolar Xatolar daftariga va Takrorlaş menejeriga tushadi.
 */

import { DIALOGUES, filledLine, findDialogue } from './dialogues'
import type { CefrLevel, Dialogue, MultipleChoiceExercise } from './types'

export const SHORT_PREFIX = 'short-'
/** Juda uzun replika short uchun noqulay (3–6 soniyadan oshadi). */
export const SHORT_MAX_WORDS = 16

export type ShortMode = 'm' | 'l'

export interface Short {
  /** `<suhbat id>-<qator>` */
  id: string
  dialogueId: string
  lineIndex: number
  level: CefrLevel
  /** Gapiruvchi roli (inglizcha, suhbatdagidek: Teacher, Waiter, You…) */
  speaker: string
  /** Suhbatdosh roli */
  listener: string
  /** O'quvchi o'zimi (`b` roli) — sahnada maskot */
  learnerSpeaks: boolean
  /** To'liq inglizcha replika (bo'shliq o'rniga javob) */
  en: string
  uz: string
  situationUz: string
  titleUz: string
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

function shortOf(d: Dialogue, i: number): Short | undefined {
  const line = d.lines[i]
  if (!line) return undefined
  const en = filledLine(line)
  if (words(en) > SHORT_MAX_WORDS) return undefined
  const other = line.speaker === 'a' ? 'b' : 'a'
  return {
    id: `${d.id}-${i}`,
    dialogueId: d.id,
    lineIndex: i,
    level: d.level,
    speaker: d.roles[line.speaker],
    listener: d.roles[other],
    learnerSpeaks: line.speaker === 'b',
    en,
    uz: line.uz,
    situationUz: d.situationUz,
    titleUz: d.titleUz,
  }
}

/** Suhbatning barcha shortlari (tartib — suhbat tartibi). */
export function shortsOf(d: Dialogue): Short[] {
  return d.lines.map((_, i) => shortOf(d, i)).filter((s): s is Short => s !== undefined)
}

export function allShorts(level?: CefrLevel): Short[] {
  return DIALOGUES.filter((d) => !level || d.level === level).flatMap(shortsOf)
}

export function findShort(shortId: string): Short | undefined {
  const m = /^(.*)-(\d+)$/.exec(shortId)
  if (!m) return undefined
  const d = findDialogue(m[1]!)
  return d ? shortOf(d, Number(m[2])) : undefined
}

/* ------------------------------ mashqlar ------------------------------ */

export function shortExerciseId(s: Short, mode: ShortMode): string {
  return `${SHORT_PREFIX}${s.id}-${mode}`
}

/** Seed bo'yicha barqaror aralashtirish (bir id — har doim bir xil tartib). */
function seeded(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function shuffled<T>(xs: readonly T[], seed: string): T[] {
  const rnd = seeded(seed)
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-zöğşç0-9]+/g, ' ').trim()

/**
 * Chalg'ituvchi variantlar: avval O'SHA suhbatning boshqa replikalari (mavzu
 * bir xil — oson emas), keyin shu darajaning boshqa suhbatlari. Takror va
 * to'g'ri javobga teng variant chiqmaydi.
 */
function distractors(s: Short, pick: (x: Short) => string, seed: string): string[] {
  const right = norm(pick(s))
  const same = allShorts(s.level).filter((x) => x.dialogueId === s.dialogueId && x.id !== s.id)
  const rest = allShorts(s.level).filter((x) => x.dialogueId !== s.dialogueId)
  const out: string[] = []
  const seen = new Set([right])
  for (const pool of [shuffled(same, seed), shuffled(rest, seed + '#')]) {
    for (const x of pool) {
      const v = pick(x)
      const k = norm(v)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(v)
      if (out.length === 3) return out
    }
  }
  return out
}

export function shortExercise(s: Short, mode: ShortMode): MultipleChoiceExercise {
  const id = shortExerciseId(s, mode)
  const pick = mode === 'm' ? (x: Short) => x.uz : (x: Short) => x.en
  const right = pick(s)
  const options = shuffled([right, ...distractors(s, pick, id)], id + '@')
  const who = s.learnerSpeaks ? 'Siz (suhbatda)' : s.speaker
  return {
    id,
    kind: 'multiple-choice',
    instructionUz: mode === 'm' ? 'Shortni tomoşa qiling: nima demoqçi?' : 'Shortni tomoşa qiling: qaysi gapni eşitdingiz?',
    level: s.level,
    skill: mode === 'm' ? 'vocabulary' : 'listening',
    explanationUz: `${who}: “${s.en}” — ${s.uz}`,
    difficulty: s.level === 'A1' ? 1 : 2,
    tags: ['short', s.dialogueId],
    question: mode === 'm' ? `${s.speaker} nima dedi? Ma’nosini tanlang.` : `${s.speaker} qaysi gapni aytdi?`,
    options,
    answerIndex: options.indexOf(right),
    shortId: s.id,
  }
}

/** `short-<suhbat>-<qator>-<m|l>` → mashq (Xatolar daftari uchun). */
export function findShortExercise(id: string): MultipleChoiceExercise | undefined {
  if (!id.startsWith(SHORT_PREFIX)) return undefined
  const m = /^(.*)-(m|l)$/.exec(id.slice(SHORT_PREFIX.length))
  if (!m) return undefined
  const s = findShort(m[1]!)
  return s ? shortExercise(s, m[2] as ShortMode) : undefined
}

/**
 * Suhbatning short mashqlari — replikalar tartibida, eşitiş va ma'no
 * navbatma-navbat (eşitiş bilan boshlanadi: avval quloq, keyin ma'no).
 */
export function shortExercisesOf(d: Dialogue): MultipleChoiceExercise[] {
  return shortsOf(d).map((s, i) => shortExercise(s, i % 2 === 0 ? 'l' : 'm'))
}

/**
 * Suhbat darsiga qo'shiladigan 2 ta short: suhbatdoshning (o'quvchi emas)
 * replikalaridan — bo'shliq javoblarini oshkor qilmaydi.
 */
export function lessonShortExercises(d: Dialogue): MultipleChoiceExercise[] {
  const partner = shortsOf(d).filter((s) => !s.learnerSpeaks)
  const pick = [partner[0], partner[partner.length - 1]].filter((s, i, a): s is Short => !!s && a.indexOf(s) === i)
  return pick.map((s, i) => shortExercise(s, i === 0 ? 'l' : 'm'))
}

export function allShortExercises(level?: CefrLevel): MultipleChoiceExercise[] {
  return DIALOGUES.filter((d) => !level || d.level === level).flatMap(shortExercisesOf)
}
