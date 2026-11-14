import type {
  CefrLevel,
  DailyPlanDay,
  Exercise,
  GrammarTopic,
  ListeningTask,
  MockExamSpec,
  ReadingPassage,
  SectionTest,
  SpeakingTask,
  VocabularyItem,
  WritingTask,
} from '../types'

import { day1 as a1day1, vocabDay1 as avocabDay1, grammarDay1 as agramDay1, readingDay1 as areadDay1, listeningDay1 as alistDay1, writingDay1 as awritDay1, speakingDay1 as aspeaDay1, testDay1 as atestDay1 } from './a1/day-01'
import { day2, vocabDay2, grammarDay2, readingDay2, listeningDay2, writingDay2, speakingDay2, testDay2 } from './a1/day-02'
import { day3, vocabDay3, grammarDay3, readingDay3, listeningDay3, writingDay3, speakingDay3, testDay3 } from './a1/day-03'
import { day4, vocabDay4, grammarDay4, readingDay4, listeningDay4, writingDay4, speakingDay4, testDay4 } from './a1/day-04'
import { day5, vocabDay5, grammarDay5, readingDay5, listeningDay5, writingDay5, speakingDay5, testDay5 } from './a1/day-05'
import { day6, vocabDay6, grammarDay6, readingDay6, listeningDay6, writingDay6, speakingDay6, testDay6 } from './a1/day-06'
import { day7, vocabDay7, grammarDay7, readingDay7, listeningDay7, writingDay7, speakingDay7, testDay7 } from './a1/day-07'
import { mockExamA1 } from './mockExamA1'
import { diagnosticTest } from './diagnostic'

import { day1 as a2day1, vocabDay1 as avocabDay1_a2, grammarDay1 as agramDay1_a2, readingDay1 as areadDay1_a2, listeningDay1 as alistDay1_a2, writingDay1 as awritDay1_a2, speakingDay1 as aspeaDay1_a2, testDay1 as atestDay1_a2 } from './a2/day-01'
import { day2, vocabDay2_b1, grammarDay2_b1, readingDay2_b1, listeningDay2_b1, writingDay2_b1, speakingDay2_b1, testDay2_b1 } from './b1/day-02'
import { day3, vocabDay3_b1, grammarDay3_b1, readingDay3_b1, listeningDay3_b1, writingDay3_b1, speakingDay3_b1, testDay3_b1 } from './b1/day-03'
import { day4, vocabDay4_b1, grammarDay4_b1, readingDay4_b1, listeningDay4_b1, writingDay4_b1, speakingDay4_b1, testDay4_b1 } from './b1/day-04'
import { day5, vocabDay5_b1, grammarDay5_b1, readingDay5_b1, listeningDay5_b1, writingDay5_b1, speakingDay5_b1, testDay5_b1 } from './b1/day-05'
import { day6, vocabDay6_b1, grammarDay6_b1, readingDay6_b1, listeningDay6_b1, writingDay6_b1, speakingDay6_b1, testDay6_b1 } from './b1/day-06'
import { day7, vocabDay7_b1, grammarDay7_b1, readingDay7_b1, listeningDay7_b1, writingDay7_b1, speakingDay7_b1, testDay7_b1 } from './b1/day-07'
import { mockExamB1 } from './mockExamA1'
import { mockExamA2 } from './mockExamA1'

/** Har bir daraja uchun to'plam. A2/B1/B2/C1 shu strukturada qo'shiladi. */
export interface LevelBundle {
  level: CefrLevel
  days: DailyPlanDay[]
  vocab: VocabularyItem[]
  grammar: GrammarTopic[]
  reading: ReadingPassage[]
  listening: ListeningTask[]
  writing: WritingTask[]
  speaking: SpeakingTask[]
  tests: SectionTest[]
  mockExam?: MockExamSpec
}

export const a1: LevelBundle = {
  level: 'A1',
  days: [a1day1, a1day2, a1day3, a1day4, a1day5, a1day6, a1day7],
  vocab: [...avocabDay1, ...vocabDay2, ...vocabDay3, ...vocabDay4, ...vocabDay5, ...vocabDay6, ...vocabDay7],
  grammar: [agramDay1, grammarDay2, grammarDay3, grammarDay4, grammarDay5, grammarDay6, grammarDay7],
  reading: [areadDay1, readingDay2, readingDay3, readingDay4, readingDay5, readingDay6, readingDay7],
  listening: [alistDay1, listeningDay2, listeningDay3, listeningDay4, listeningDay5, listeningDay6, listeningDay7],
  writing: [awritDay1, writingDay2, writingDay3, writingDay4, writingDay5, writingDay6, writingDay7],
  speaking: [...aspeaDay1, ...speakingDay2, ...speakingDay3, ...speakingDay4, ...speakingDay5, ...speakingDay6, ...speakingDay7],
  tests: [atestDay1, testDay2, testDay3, testDay4, testDay5, testDay6, testDay7],
  mockExam: mockExamA1,
}

export const a2: LevelBundle = {
  level: 'A2',
  days: [a2day1, day2, day3, day4, day5, day6, day7],
  vocab: [
    ...avocabDay1_a2,
    ...vocabDay2,
    ...vocabDay3,
    ...vocabDay4,
    ...vocabDay5,
    ...vocabDay6,
    ...vocabDay7,
  ],
  grammar: [agramDay1_a2, grammarDay2, grammarDay3, grammarDay4, grammarDay5, grammarDay6, grammarDay7],
  reading: [areadDay1_a2, readingDay2, readingDay3, readingDay4, readingDay5, readingDay6, readingDay7],
  listening: [alistDay1_a2, listeningDay2, listeningDay3, listeningDay4, listeningDay5, listeningDay6, listeningDay7],
  writing: [awritDay1_a2, writingDay2, writingDay3, writingDay4, writingDay5, writingDay6, writingDay7],
  speaking: [
    ...aspeaDay1_a2,
    ...speakingDay2,
    ...speakingDay3,
    ...speakingDay4,
    ...speakingDay5,
    ...speakingDay6,
    ...speakingDay7,
  ],
  tests: [atestDay1_a2, testDay2, testDay3, testDay4, testDay5, testDay6, testDay7],
  mockExam: mockExamA2,
}

export const b1: LevelBundle = {
  level: 'B1',
  days: [b1day1, b1day2, b1day3, b1day4, b1day5, b1day6, b1day7],
  vocab: [...b1vocabDay1, ...vocabDay2_b1, ...vocabDay3_b1, ...vocabDay4_b1, ...vocabDay5_b1, ...vocabDay6_b1, ...vocabDay7_b1],
  grammar: [b1grammarDay1, b1grammarDay2, b1grammarDay3, b1grammarDay4, b1grammarDay5, b1grammarDay6, b1grammarDay7],
  reading: [b1readingDay1, b1readingDay2, b1readingDay3, b1readingDay4, b1readingDay5, b1readingDay6, b1readingDay7],
  listening: [b1listeningDay1, b1listeningDay2, b1listeningDay3, b1listeningDay4, b1listeningDay5, b1listeningDay6, b1listeningDay7],
  writing: [b1writingDay1, b1writingDay2, b1writingDay3, b1writingDay4, b1writingDay5, b1writingDay6, b1writingDay7],
  speaking: [...b1speakingDay1, ...b1speakingDay2, ...b1speakingDay3, ...b1speakingDay4, ...b1speakingDay5, ...b1speakingDay6, ...b1speakingDay7],
  tests: [b1testDay1, b1testDay2, b1testDay3, b1testDay4, b1testDay5, b1testDay6, b1testDay7],
  mockExam: mockExamB1,
}

export const c1: LevelBundle = {
  level: 'C1',
  days: [c1day1, c1day2, c1day3, c1day4, c1day5, c1day6, c1day7],
  vocab: [...c1vocabDay1, ...vocabDay2, ...vocabDay3, ...vocabDay4, ...vocabDay5, ...vocabDay6, ...vocabDay7],
  grammar: [c1grammarDay1, grammarDay2, grammarDay3, grammarDay4, grammarDay5, grammarDay6, grammarDay7],
  reading: [c1readingDay1, readingDay2, readingDay3, readingDay4, readingDay5, readingDay6, readingDay7],
  listening: [c1listeningDay1, listeningDay2, listeningDay3, listeningDay4, listeningDay5, listeningDay6, listeningDay7],
  writing: [c1writingDay1, writingDay2, writingDay3, writingDay4, writingDay5, writingDay6, writingDay7],
  speaking: [...c1speakingDay1, ...speakingDay2, ...speakingDay3, ...speakingDay4, ...speakingDay5, ...speakingDay6, ...speakingDay7],
  tests: [c1testDay1, testDay2, testDay3, testDay4, testDay5, testDay6, testDay7],
}

/** Kundalik bo'lim minutlarini kunlik rejaga (90′) moslashtirish. */
export function normalizeDayMinutes(
  day: DailyPlanDay,
  total = DAILY_PLAN_TOTAL,
): DailyPlanDay {
  const raw = day.sections.reduce((a, s) => a + s.minutes, 0)
  if (raw === total || raw <= 0 || day.sections.length === 0) return day
  const weights = day.sections.map((s) => s.minutes / raw)
  const exact = weights.map((w) => total * w)
  const scaled = exact.map((x) => Math.floor(x))
  // Kasr qoldig'ini eng katta bo'lganlardan birlab beramiz — yig'indi
  // ANIQ `total` ga teng bo'ladi va tartib (vocab<grammar<…) buzilmaydi.
  const order = scaled
    .map((v, i) => ({ i, frac: exact[i] - v }))
    .sort((a, b) => b.frac - a.frac)
  let assigned = scaled.reduce((a, b) => a + b, 0)
  for (const o of order) {
    if (assigned >= total) break
    scaled[o.i] += 1
    assigned += 1
  }
  return { ...day, sections: day.sections.map((s, i) => ({ ...s, minutes: scaled[i] })) }
}

/** Talabnomadagi asosiy kunlik reja (daqiqa). */
export const DAILY_PLAN_TOTAL = 90

/* ------------------- MATN (GLOSSARIY) SO'ZLARI ---------------------------- */

/** So'zni solishtirish kaliti — Reading/Lug'at sahifalari BIR XIL kalit ishlatadi. */
export function wordKeyOf(s: string): string {
  return s
    .toLocaleLowerCase('en')
    .replace(/[‘’`´ʻ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Matn glossariyi so'zi uchun barqaror SRS kaliti. */
export function glossaryVocabId(word: string): string {
  return `gl-${wordKeyOf(word)}`
}

/* Eski SRS kaliti (`<matn>|gl-<so'z>`) faqat kesh migratsiyasi uchun kerak —
* u `lib/storage.ts`da yashaydi (kontentkalit qoidasini o'zi belgilamaydi). */

let glossaryCache: VocabularyItem[] | null = null

/** Barcha o'qish matnlarining glossariy so'zlari — `VocabularyItem` ko'rinishida. */
export function allGlossaryVocab(levels: readonly CefrLevel[] = LOADED_LEVELS): VocabularyItem[] {
  if (glossaryCache) return glossaryCache
  const mainKeys = new Set(allVocab(levels).map((v) => wordKeyOf(v.word)))
  const seen = new Set<string>()
  const out: VocabularyItem[] = []
  for (const lvl of levels) {
    for (const p of getBundle(lvl).reading) {
      for (const g of p.glossary ?? []) {
        const key = wordKeyOf(g.word)
        if (!key || mainKeys.has(key) || seen.has(key)) continue
        seen.add(key)
        out.push({
          id: glossaryVocabId(g.word),
          word: g.word,
          translationUz: g.uz,
          explanationEn: `Bu so‘z “${p.title}” matnining glossariyidan olindi.`,
          exampleEn: '',
          exampleUz: '',
          pos: 'noun',
          topic: 'matndan olingan',
          level: p.level,
        })
      }
    }
  }
  glossaryCache = out
  return out
}

const bundleCache = new Map<CefrLevel, LevelBundle>()

export function getBundle(level: CefrLevel): LevelBundle {
  const hit = bundleCache.get(level)
  if (hit) return hit
  const made: LevelBundle =
    level === 'A1'
      ? { ...a1, days: a1.days.map((d) => normalizeDayMinutes(d)) }
      : level === 'A2'
      ? { ...a2, days: a2.days.map((d) => normalizeDayMinutes(d)) }
      : level === 'B1'
      ? { ...b1, days: b1.days.map((d) => normalizeDayMinutes(d)) }
      : level === 'B2'
      ? { ...b2, days: b2.days.map((d) => normalizeDayMinutes(d)) }
      : level === 'C1'
      ? { ...c1, days: c1.days.map((d) => normalizeDayMinutes(d)) }
      : { level, days: [], vocab: [], grammar: [], reading: [], listening: [], writing: [], speaking: [], tests: [] }
  bundleCache.set(level, made)
  return made
}

export const LOADED_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']

export function allVocab(levels: readonly CefrLevel[] = LOADED_LEVELS): VocabularyItem[] {
  return levels.flatMap((l) => getBundle(l).vocab)
}

export function findVocab(id: string): VocabularyItem | undefined {
  return allVocab().find((v) => v.id === id)
}

export function allExercises(level: CefrLevel = 'A1'): Exercise[] {
  const b = getBundle(level)
  return [
    ...b.grammar.flatMap((g) => g.exercises),
    ...b.reading.flatMap((r) => r.exercises),
    ...b.listening.flatMap((l) => l.exercises),
    ...b.tests.flatMap((t) => t.exercises),
  ]
}

export function findExercise(id: string): Exercise | undefined {
  for (const lvl of LOADED_LEVELS) {
    const hit = allExercises(lvl).find((e) => e.id === id)
    if (hit) return hit
  }
  const exam = getBundle('A1').mockExam
  if (exam) {
    const hit = exam.sections.flatMap((s) => s.exercises).find((e) => e.id === id)
    if (hit) return hit
  }
  return diagnosticTest.exercises.find((e) => e.id === id)
}

export { mockExamA1 } from './mockExamA1'
export { diagnosticTest } from './diagnostic'
