/**
 * C1 darajasi to'plami — alohida chunk (`content/index.ts::loadLevels`).
 * Tuzilma A2 bilan bir xil: har kun 12 so'z, grammatika, o'qish, tinglash,
 * yozish, 3 gapirish va kun testi.
 */
import type { GrammarTopic, ReadingPassage } from '../types'
import type { LevelBundle } from '../index'
import * as d1 from './day-01'
import * as d2 from './day-02'
import * as d3 from './day-03'
import * as d4 from './day-04'
import * as d5 from './day-05'

const days = [d1, d2, d3, d4, d5]
const withExtra = <T extends GrammarTopic | ReadingPassage>(t: T, extra: T['exercises']): T => ({ ...t, exercises: [...t.exercises, ...extra] })

export const c1: LevelBundle = {
  level: 'C1',
  days: days.map((d) => d.day),
  vocab: days.flatMap((d) => d.vocab),
  grammar: days.map((d) => withExtra(d.grammar, d.extraGrammar)),
  reading: days.map((d) => withExtra(d.reading, d.extraReading)),
  listening: days.map((d) => d.listening),
  writing: days.map((d) => d.writing),
  speaking: days.flatMap((d) => d.speaking),
  tests: days.map((d) => d.test),
}
