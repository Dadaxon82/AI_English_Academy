/**
 * A2 darajasi to'plami — alohida chunk (`content/index.ts::loadLevels`).
 * Yangi mashq turlari (`extraGrammarDayN`, `extraReadingDayN`) A1'dagidek
 * tegishli mavzu / matn mashqlari oxiriga qo'shiladi.
 */
import type { GrammarTopic, ReadingPassage } from '../types'
import type { LevelBundle } from '../index'
import * as d1 from './day-01'
import * as d2 from './day-02'
import * as d3 from './day-03'
import * as d4 from './day-04'
import * as d5 from './day-05'
import * as d6 from './day-06'
import * as d7 from './day-07'

const days = [d1, d2, d3, d4, d5, d6, d7]
const withExtra = <T extends GrammarTopic | ReadingPassage>(t: T, extra: T['exercises']): T => ({ ...t, exercises: [...t.exercises, ...extra] })

export const a2: LevelBundle = {
  level: 'A2',
  days: days.map((d) => d.day),
  vocab: days.flatMap((d) => d.vocab),
  grammar: days.map((d) => withExtra(d.grammar, d.extraGrammar)),
  reading: days.map((d) => withExtra(d.reading, d.extraReading)),
  listening: days.map((d) => d.listening),
  writing: days.map((d) => d.writing),
  speaking: days.flatMap((d) => d.speaking),
  tests: days.map((d) => d.test),
}
