/**
 * B2 darajasi to'plami — alohida chunk (`content/index.ts::loadLevels`).
 * Tuzilma A2 bilan bir xil: har kun 12 so'z, grammatika, o'qish, tinglash,
 * yozish, 3 gapirish va kun testi.
 */
import type { GrammarTopic, ReadingPassage } from '../types'
import type { LevelBundle } from '../index'
import * as d1 from './day-01'

const days = [d1]
const withExtra = <T extends GrammarTopic | ReadingPassage>(t: T, extra: T['exercises']): T => ({ ...t, exercises: [...t.exercises, ...extra] })

export const b2: LevelBundle = {
  level: 'B2',
  days: days.map((d) => d.day),
  vocab: days.flatMap((d) => d.vocab),
  grammar: days.map((d) => withExtra(d.grammar, d.extraGrammar)),
  reading: days.map((d) => withExtra(d.reading, d.extraReading)),
  listening: days.map((d) => d.listening),
  writing: days.map((d) => d.writing),
  speaking: days.flatMap((d) => d.speaking),
  tests: days.map((d) => d.test),
}
