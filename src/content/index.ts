/**
 * Kontent registri — UI kontentga shu yer orqali murojaat qiladi.
 * Yangi daraja qo'shish uchun faqat shu fayl va yangi papka kifoya.
 */

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
} from './types'

import { day1, vocabDay1, grammarDay1, readingDay1, listeningDay1, writingDay1, speakingDay1, testDay1 } from './a1/day-01'
import { day2, vocabDay2, grammarDay2, readingDay2, listeningDay2, writingDay2, speakingDay2, testDay2 } from './a1/day-02'
import { day3, vocabDay3, grammarDay3, readingDay3, listeningDay3, writingDay3, speakingDay3, testDay3 } from './a1/day-03'
import { day4, vocabDay4, grammarDay4, readingDay4, listeningDay4, writingDay4, speakingDay4, testDay4 } from './a1/day-04'
import { day5, vocabDay5, grammarDay5, readingDay5, listeningDay5, writingDay5, speakingDay5, testDay5 } from './a1/day-05'
import { day6, vocabDay6, grammarDay6, readingDay6, listeningDay6, writingDay6, speakingDay6, testDay6 } from './a1/day-06'
import { day7, vocabDay7, grammarDay7, readingDay7, listeningDay7, writingDay7, speakingDay7, testDay7 } from './a1/day-07'
import { mockExamA1 } from './mockExamA1'
import { diagnosticTest } from './diagnostic'

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
  days: [day1, day2, day3, day4, day5, day6, day7],
  vocab: [...vocabDay1, ...vocabDay2, ...vocabDay3, ...vocabDay4, ...vocabDay5, ...vocabDay6, ...vocabDay7],
  grammar: [grammarDay1, grammarDay2, grammarDay3, grammarDay4, grammarDay5, grammarDay6, grammarDay7],
  reading: [readingDay1, readingDay2, readingDay3, readingDay4, readingDay5, readingDay6, readingDay7],
  listening: [listeningDay1, listeningDay2, listeningDay3, listeningDay4, listeningDay5, listeningDay6, listeningDay7],
  writing: [writingDay1, writingDay2, writingDay3, writingDay4, writingDay5, writingDay6, writingDay7],
  speaking: [...speakingDay1, ...speakingDay2, ...speakingDay3, ...speakingDay4, ...speakingDay5, ...speakingDay6, ...speakingDay7],
  tests: [testDay1, testDay2, testDay3, testDay4, testDay5, testDay6, testDay7],
  mockExam: mockExamA1,
}

/** Hozircha faqat A1 yuklangan. Qolgan darajalar bo'sh to'plam qaytaradi. */
export function getBundle(level: CefrLevel): LevelBundle {
  switch (level) {
    case 'A1':
      return a1
    default:
      return { level, days: [], vocab: [], grammar: [], reading: [], listening: [], writing: [], speaking: [], tests: [] }
  }
}

export const LOADED_LEVELS: CefrLevel[] = ['A1']

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
export * from './types'
