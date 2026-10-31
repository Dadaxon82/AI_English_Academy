/**
 * Kundalik 90 daqiqalik reja va moslashuvchan taqsimot.
 *
 * Boshlang'ich taqsimot: Vocab 10 / Grammar 15 / Reading 15 / Listening 15 /
 * Writing 20 / Speaking 15 = 90 daqiqa.
 * Moslashish omillari: zaif ko'nikmalar, haftalik jadval, imtihon sanasigacha
 * qolgan kunlar.
 */

import { SKILLS, type CefrLevel, type Skill } from '../content/types'
import type { UserSettings } from './types'
import { DEFAULT_ALLOCATION } from './types'
import type { SkillEvidence } from './skillScoring'

export interface Allocation {
  minutes: Record<Skill, number>
  total: number
  /** Nima uchun o'zgarish — interfeysga ko'rsatish uchun */
  reasonUz: string[]
}

const SKILL_ORDER: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking']

export function computeAllocation(
  settings: UserSettings,
  evidence: readonly SkillEvidence[],
  today = new Date(),
): Allocation {
  const total = clampTotal(settings.dailyMinutes)
  const reasons: string[] = []
  const base = { ...DEFAULT_ALLOCATION }

  // 1) Zaif ko'nikmalarga ko'proq vaqt
  const weak = evidence
    .filter((e) => e.confidence >= 0.4 && e.score < 65)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((e) => e.skill as Skill)

  const reasons2: string[] = []
  if (weak.length) {
    reasons2.push(`Zaif ko‘nikmalar kuchaytirildi: ${weak.join(', ')}.`)
  }

  // 2) Hafta kuniga qarab yengil siljish (dam olish kuni Speaking/Vocab kamroq)
  const dow = today.getDay()
  if (dow === 0) {
    base.speaking = Math.max(5, base.speaking - 5)
    base.vocabulary = Math.max(5, base.vocabulary - 5)
    base.reading += 10
    reasons2.push('Yakshanba — o‘qishga ko‘proq vaqt, yengil kun.')
  }

  // 3) Imtihon yaqinlashsa — Mock Examga yaqin ko'nikmalar ustunligi
  if (settings.examDate) {
    const daysToExam = Math.ceil((new Date(settings.examDate + 'T00:00:00').getTime() - today.getTime()) / 86_400_000)
    if (daysToExam >= 0 && daysToExam <= 30) {
      base.writing = Math.min(30, base.writing + 5)
      base.reading = Math.min(25, base.reading + 5)
      base.vocabulary = Math.max(5, base.vocabulary - 5)
      base.grammar = Math.max(5, base.grammar - 5)
      reasons2.push(`Imtihonga ${daysToExam} kun qoldi — Reading va Writing kuchaytirildi.`)
    }
  }

  // weak ga qarab +5 / -5 (jami saqlanishi uchun balanslashtiriladi)
  if (weak.length) {
    const donors = SKILL_ORDER.filter((s) => !weak.includes(s)).sort((a, b) => base[b] - base[a])
    weak.forEach((w, i) => {
      const donor = donors[i % donors.length]
      if (base[donor] - 5 >= 5) {
        base[donor] -= 5
        base[w] = Math.min(35, base[w] + 5)
      }
    })
  }

  // 4) Yig'indini aniq `total` ga keltirish (eng katta maydonni sozlab)
  const sum = SKILL_ORDER.reduce((a, s) => a + base[s], 0)
  if (sum !== total) {
    let diff = total - sum
    const order = [...SKILL_ORDER].sort((a, b) => base[b] - base[a])
    let i = 0
    while (diff !== 0 && i < 400) {
      const s = order[i % order.length]
      if (diff > 0) {
        base[s] += 1
        diff -= 1
      } else if (base[s] > 5) {
        base[s] -= 1
        diff += 1
      }
      i++
    }
  }

  const minutes = base
  return {
    minutes,
    total: SKILL_ORDER.reduce((a, s) => a + minutes[s], 0),
    reasonUz: [
      'Boshlang‘ich taqsimot 90 daqiqaga asoslangan.',
      ...reasons2,
      ...reasons,
    ],
  }
}

function clampTotal(m: number): number {
  if (!Number.isFinite(m)) return 90
  // 6 ko‘nikma × minimal 5 daqiqa = 30 — undan pastga bo‘lishi mumkin emas.
  return Math.max(30, Math.min(240, Math.round(m)))
}

export interface DayTask {
  skill: Skill
  minutes: number
  sectionId: string
  titleUz: string
  contentId: string | null
  done: boolean
}

/** Kun kontenti + taqsimotdan bugungi vaziyat ro'yxati. */
export function buildDayTasks(
  day: { id: string; sections: readonly { skill: Skill; minutes: number; itemIds: readonly string[]; titleUz: string }[] },
  alloc: Allocation,
  doneBySkill: Partial<Record<Skill, string>>,
): DayTask[] {
  return SKILL_ORDER.map((skill) => {
    const sec = day.sections.find((s) => s.skill === skill)
    return {
      skill,
      minutes: alloc.minutes[skill] ?? sec?.minutes ?? 0,
      sectionId: `${day.id}:${skill}`,
      titleUz: sec?.titleUz ?? skillLabelUz(skill),
      contentId: sec?.itemIds[0] ?? null,
      done: doneBySkill[skill] === day.id,
    }
  })
}

export function skillLabelUz(s: Skill): string {
  const map: Record<Skill, string> = {
    vocabulary: 'Lug‘at',
    grammar: 'Grammatika',
    reading: 'O‘qish',
    listening: 'Tinglash',
    writing: 'Yozish',
    speaking: 'G‘apirish',
  }
  return map[s]
}

export function skillLabelEn(s: Skill): string {
  return SKILLS.includes(s) ? s : s
}

export function daysUntil(dateStr: string | null, now = new Date()): number | null {
  if (!dateStr) return null
  const t = new Date(dateStr + 'T00:00:00').getTime()
  if (!Number.isFinite(t)) return null
  return Math.ceil((t - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000)
}

/** Kun tartibida keyingi bosqichni aniqlash (o'quv yo'li). */
export function nextDayId(level: CefrLevel, days: readonly { id: string }[], completed: readonly string[]): string {
  const done = new Set(completed)
  const next = days.find((d) => !done.has(d.id))
  return next?.id ?? days[days.length - 1]?.id ?? `${level.toLowerCase()}-day-1`
}
