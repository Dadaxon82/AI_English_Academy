/**
 * Bo'lim DARSLARI (Duolingo dars uslubi) — har bo'lim kontentidan
 * `LessonPlayer` uchun qadamlar ro'yxati.
 *
 * Qadam turlari:
 *  - `info`     — o'qish/tinglash/qoida kartasi ("Davom etish" bilan);
 *  - `exercise` — oddiy mashq (ExerciseRunner);
 *  - `speak`    — gapni ovoz chiqarib takrorlash (mikrofon; bo'lmasa plitkalar).
 *
 * SOF funksiyalar — kontent obyektlaridan tashqari hech narsaga bog'liq emas.
 */

import { dialogueExercise, dialogueExerciseId, gapLineIndexes } from '../content/dialogues'
import type { AttemptRecord } from './types'
import {
  grammarExampleExercise,
  shortSentences,
  speakingRepeatExercise,
  speakingSentences,
  writingSentenceExercise,
} from '../content'
import { lessonShortExercises, shortExercisesOf } from '../content/shorts'
import type {
  Dialogue,
  Exercise,
  GrammarTopic,
  ListeningTask,
  ReadingPassage,
  SpeakingTask,
  WordOrderExercise,
  WritingTask,
} from '../content/types'

export type InfoKind = 'rule' | 'passage' | 'audio' | 'write-cta' | 'speak-cta'

export type LessonStep =
  | { type: 'info'; id: string; info: InfoKind; titleUz: string }
  | {
      type: 'exercise'
      id: string
      exercise: Exercise
      /** Savol paytida qayta ochiladigan kontekst (matn yoki audio). */
      context?: 'passage' | 'audio'
      badge?: string
      /** Belgi rangi: `fix` — to'q sariq (xatolar ustida ishlash). */
      badgeTone?: 'new' | 'fix'
      icons?: string[]
      vocabIds?: string[]
    }
  | { type: 'speak'; id: string; sentence: string; fallback: WordOrderExercise }

/** Qadam javob talab qiladimi (aniqlik/XP hisobiga kiradimi). */
export function isGraded(step: LessonStep): boolean {
  return step.type !== 'info'
}

export function grammarLesson(topic: GrammarTopic): LessonStep[] {
  const steps: LessonStep[] = [{ type: 'info', id: `${topic.id}:rule`, info: 'rule', titleUz: topic.titleUz }]
  // Mashqlar: avval osonlari (qiyinlik bo'yicha, barqaror tartib).
  const ex = [...topic.exercises].sort((a, b) => a.difficulty - b.difficulty)
  const half = Math.ceil(ex.length / 2)
  for (const e of ex.slice(0, half)) steps.push({ type: 'exercise', id: e.id, exercise: e })
  // O'rtada — misollardan gap yig'ish (2 tagacha).
  for (let i = 0; i < Math.min(2, topic.examples.length); i++) {
    const g = grammarExampleExercise(topic, i)
    if (g) steps.push({ type: 'exercise', id: g.id, exercise: g })
  }
  for (const e of ex.slice(half)) steps.push({ type: 'exercise', id: e.id, exercise: e })
  return steps
}

export function readingLesson(passage: ReadingPassage): LessonStep[] {
  return [
    { type: 'info', id: `${passage.id}:read`, info: 'passage', titleUz: passage.title },
    ...passage.exercises.map((e): LessonStep => ({ type: 'exercise', id: e.id, exercise: e, context: 'passage' })),
  ]
}

export function listeningLesson(task: ListeningTask): LessonStep[] {
  return [
    { type: 'info', id: `${task.id}:listen`, info: 'audio', titleUz: task.title },
    ...task.exercises.map((e): LessonStep => ({ type: 'exercise', id: e.id, exercise: e, context: 'audio' })),
  ]
}

export function writingLesson(task: WritingTask): LessonStep[] {
  const steps: LessonStep[] = []
  const n = shortSentences(task.modelAnswerEn ?? '').length
  for (let i = 0; i < n; i++) {
    const e = writingSentenceExercise(task, i)
    if (e) steps.push({ type: 'exercise', id: e.id, exercise: e })
  }
  steps.push({ type: 'info', id: `${task.id}:write`, info: 'write-cta', titleUz: 'Endi özingiz yozing' })
  return steps
}

export function speakingLesson(task: SpeakingTask): LessonStep[] {
  const steps: LessonStep[] = speakingSentences(task).flatMap((sentence, i): LessonStep[] => {
    const fb = speakingRepeatExercise(task, i)
    return fb ? [{ type: 'speak', id: fb.id, sentence, fallback: fb }] : []
  })
  steps.push({ type: 'info', id: `${task.id}:speak`, info: 'speak-cta', titleUz: 'Endi savolga javob bering' })
  return steps
}

/**
 * Talaffuz bahosi: kutilgan gapdagi so'zlarning necha foizi aytilgan
 * (tartibsiz, takrorlarsiz). 0..1.
 */
export function speechMatch(expected: string, heard: string): number {
  const toks = (s: string) =>
    s
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/[^a-z0-9' ]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  const exp = toks(expected)
  if (exp.length === 0) return 0
  const pool = toks(heard)
  let hit = 0
  for (const w of exp) {
    const i = pool.indexOf(w)
    if (i > -1) {
      hit++
      pool.splice(i, 1)
    }
  }
  return hit / exp.length
}

/** Talaffuz "to'g'ri" deb qabul qilinadigan chegara — BIZNING qarorimiz. */
export const SPEECH_PASS = 0.7

/**
 * Suhbat darsi: vaziyat va suhbat (bo'shliqlar bilan) → har bo'shliq mashq
 * (suhbat matni qayta ochiladi) → «Nega shunday?» izohi.
 */
export function dialogueLesson(d: Dialogue): LessonStep[] {
  const steps: LessonStep[] = [{ type: 'info', id: `${d.id}:read`, info: 'passage', titleUz: d.titleUz }]
  for (const i of gapLineIndexes(d)) {
    const ex = dialogueExercise(d, i)
    if (ex) steps.push({ type: 'exercise', id: ex.id, exercise: ex, context: 'passage' })
  }
  // Video shortlar: suhbatdoşning replikalari — tomoşa qiliş + eşitiş/ma'no savoli.
  for (const ex of lessonShortExercises(d)) steps.push({ type: 'exercise', id: ex.id, exercise: ex })
  steps.push({ type: 'info', id: `${d.id}:note`, info: 'rule', titleUz: `Nega şunday? ${d.note.titleUz}` })
  return steps
}

/** Har bo'shliqning oxirgi urinishi bo'yicha: nechtasi to'g'ri, nechtasi urinilgan. */
export function dialogueProgress(d: Dialogue, attempts: readonly AttemptRecord[]): { correct: number; tried: number; total: number } {
  const ids = gapLineIndexes(d).map((i) => dialogueExerciseId(d, i))
  const last = new Map<string, AttemptRecord>()
  for (const a of attempts) {
    if (!ids.includes(a.exerciseId)) continue
    const prev = last.get(a.exerciseId)
    if (!prev || a.at >= prev.at) last.set(a.exerciseId, a)
  }
  return { correct: [...last.values()].filter((a) => a.correct).length, tried: last.size, total: ids.length }
}

/** Har short mashqining OXIRGI urinishi: nechtasi to'g'ri, nechtasi ko'rilgan. */
export function shortsProgress(d: Dialogue, attempts: readonly AttemptRecord[]): { correct: number; tried: number; total: number } {
  const ids = new Set(shortExercisesOf(d).map((e) => e.id))
  const last = new Map<string, AttemptRecord>()
  for (const a of attempts) {
    if (!ids.has(a.exerciseId)) continue
    const prev = last.get(a.exerciseId)
    if (!prev || a.at >= prev.at) last.set(a.exerciseId, a)
  }
  return { correct: [...last.values()].filter((a) => a.correct).length, tried: last.size, total: ids.size }
}
