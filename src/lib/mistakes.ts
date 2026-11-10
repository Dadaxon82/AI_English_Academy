/**
 * Xatolar daftari O'YINLARI — xato qilingan mashqlarni qayta ishlash.
 *
 * "Tuzatilmagan xato": mashqning (remix bo'lsa — asl mashqning) ENG OXIRGI
 * urinishi noto'g'ri. To'g'ri yechilsa ro'yxatdan o'zi chiqadi (yangi
 * to'g'ri urinish yoziladi) — alohida "o'chirish" holati yo'q.
 *
 * O'yin usullari:
 *  - `fix`    — tuzatilmagan xatolar (eng yangisi birinchi), 10 tagacha;
 *  - `hard`   — 2+ marta xato qilinganlar (eng ko'pi birinchi), 8 tagacha;
 *  - `remix`  — xato mashq BOSHQA formatda (`content/remix.ts`), 8 tagacha;
 *  - `timed`  — vaqtga qarshi: tuzatilmaganlar aralash tartibda, 15 tagacha.
 *
 * SOF funksiyalar: urinishlar va `find` beriladi (testda soxta).
 */

import type { Exercise } from '../content/types'
import { baseExerciseId, remixExercise } from '../content/remix'
import type { LessonStep } from './lessons'
import type { AttemptRecord } from './types'

export type MistakeMode = 'fix' | 'hard' | 'remix' | 'timed'

export interface Mistake {
  exercise: Exercise
  wrongCount: number
  lastAt: number
  /** Oxirgi xato javob (remix uchun) */
  lastGiven: string
}

/** Vaqtga qarshi o'yin davomiyligi (soniya) — BIZNING qarorimiz. */
export const TIMED_SECONDS = 90

/**
 * Tuzatilmagan xatolar. `find` topa olmaydigan (eski/o'chgan) mashqlar
 * tashlab yuboriladi — o'yinda "bo'sh" qadam bo'lmasin.
 */
export function unresolvedMistakes(attempts: readonly AttemptRecord[], find: (id: string) => Exercise | undefined): Mistake[] {
  const byBase = new Map<string, AttemptRecord[]>()
  for (const a of attempts) {
    const k = baseExerciseId(a.exerciseId)
    const list = byBase.get(k) ?? []
    list.push(a)
    byBase.set(k, list)
  }
  const out: Mistake[] = []
  for (const [id, list] of byBase) {
    const sorted = [...list].sort((x, y) => x.at - y.at)
    const last = sorted[sorted.length - 1]!
    if (last.correct) continue
    const ex = find(id)
    if (!ex) continue
    const wrong = sorted.filter((x) => !x.correct)
    out.push({ exercise: ex, wrongCount: wrong.length, lastAt: last.at, lastGiven: last.answerGiven ?? '' })
  }
  return out.sort((a, b) => b.lastAt - a.lastAt)
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

/** Har usul uchun nechta xato mos keladi (kartadagi son va tugma holati uchun). */
export function modeCount(mode: MistakeMode, list: readonly Mistake[]): number {
  switch (mode) {
    case 'fix':
      return Math.min(10, list.length)
    case 'hard':
      return Math.min(8, list.filter((m) => m.wrongCount >= 2).length)
    case 'remix':
      return Math.min(8, list.filter((m) => remixExercise(m.exercise, m.lastGiven)).length)
    case 'timed':
      return Math.min(15, list.length)
  }
}

export function buildMistakeLesson(mode: MistakeMode, list: readonly Mistake[], rand: () => number = Math.random): LessonStep[] {
  const step = (ex: Exercise, i: number, badge: string, tone: 'new' | 'fix' = 'fix'): LessonStep => ({
    type: 'exercise',
    id: `${ex.id}#${i}`,
    exercise: ex,
    badge,
    badgeTone: tone,
  })
  switch (mode) {
    case 'fix':
      return list.slice(0, 10).map((m, i) => step(m.exercise, i, 'Xatoni tuzatamiz'))
    case 'hard':
      return [...list]
        .filter((m) => m.wrongCount >= 2)
        .sort((a, b) => b.wrongCount - a.wrongCount || b.lastAt - a.lastAt)
        .slice(0, 8)
        .map((m, i) => step(m.exercise, i, `${m.wrongCount} marta xato qilingan`))
    case 'remix':
      return list
        .map((m) => remixExercise(m.exercise, m.lastGiven))
        .filter((e): e is Exercise => e !== null)
        .slice(0, 8)
        .map((e, i) => step(e, i, 'Boşqa körinişda', 'new'))
    case 'timed':
      return shuffled(list, rand)
        .slice(0, 15)
        .map((m, i) => step(m.exercise, i, 'Vaqtga qarşi'))
  }
}
