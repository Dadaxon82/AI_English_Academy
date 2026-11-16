/**
 * A0 (Pre-A1, «noldan A1 gaça») darajasi to'plami — alohida chunk
 * (`content/index.ts::loadLevels`). Tuzilma boshqa darajalar bilan bir xil:
 * har kun 12 so'z, grammatika, o'qish, tinglash, yozish, 3 gapirish va kun testi.
 *
 * Xalqaro asos: CEFR Companion Volume (Council of Europe, 2020) dagi Pre-A1
 * tavsiflari va Cambridge Pre A1 Starters mavzulari (alifbo, sonlar, ranglar,
 * oila, ovqat, vaqt, belgilar). A1 so'zlari takrorlanmaydi.
 */
import type { GrammarTopic, ReadingPassage } from '../types'
import type { LevelBundle } from '../index'
import * as d1 from './day-01'
import * as d2 from './day-02'
import * as d3 from './day-03'
import * as d4 from './day-04'
import * as d5 from './day-05'
import * as d6 from './day-06'

const days = [d1, d2, d3, d4, d5, d6]
const withExtra = <T extends GrammarTopic | ReadingPassage>(t: T, extra: T['exercises']): T => ({ ...t, exercises: [...t.exercises, ...extra] })

export const a0: LevelBundle = {
  level: 'A0',
  days: days.map((d) => d.day),
  vocab: days.flatMap((d) => d.vocab),
  grammar: days.map((d) => withExtra(d.grammar, d.extraGrammar)),
  reading: days.map((d) => withExtra(d.reading, d.extraReading)),
  listening: days.map((d) => d.listening),
  writing: days.map((d) => d.writing),
  speaking: days.flatMap((d) => d.speaking),
  tests: days.map((d) => d.test),
}
