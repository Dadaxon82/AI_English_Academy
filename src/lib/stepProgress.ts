/**
 * Xaritadagi QADAM holati (kun ichida) — halol signal:
 *  - mashqli qadam: bo'limdagi HAR BIR mashq kamida bir marta TO'G'RI yechilgan
 *    (remix urinishi asl mashqqa yoziladi);
 *  - yozish / gapirish: shu topshiriq uchun javob saqlangan;
 *  - kun testi: kun yakunlanganda o'tilgan hisoblanadi (alohida signal yo'q).
 *
 * Kun yakunlangan bo'lsa barcha qadamlar baribir "done" (`buildPathLayout`).
 */
import { baseExerciseId } from '../content/remix'
import type { DailyPlanDay } from '../content/types'
import type { ChainStep } from './lessonChain'
import type { AppData } from './types'

export function stepDoneChecker(data: Pick<AppData, 'attempts' | 'writing' | 'speaking'>): (step: ChainStep, day: DailyPlanDay) => boolean {
  const solved = new Set(data.attempts.filter((a) => a.correct).map((a) => baseExerciseId(a.exerciseId)))
  const wrote = new Set(data.writing.map((w) => w.taskId))
  const spoke = new Set(data.speaking.map((s) => s.taskId))
  return (step, day) => {
    if (step.isTest) return false
    const items = day.sections.find((s) => s.skill === step.skill)?.itemIds ?? []
    if (step.skill === 'writing') return items.some((id) => wrote.has(id))
    if (step.skill === 'speaking') return items.some((id) => spoke.has(id))
    return step.exerciseIds.length > 0 && step.exerciseIds.every((id) => solved.has(id))
  }
}
