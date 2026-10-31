/**
 * Ko'nikma bahosi va daraja o'tish qoidalari.
 *
 * LOYIHA TALABI: faqat kunlar soni yoki umumiy XP darajani oshirmaydi.
 * Daraja keyingi bosqichga faqat bir necha ko'nikma bo'yicha dalil
 * yig'ilsa tavsiya qilinadi. Noaniq baholar aniq CEFR darajasi deb
 * ko'rsatilmaydi — shuning uchun bu yerda `confidence` ham qaytadi.
 */

import { CORE_SKILLS, CEFR_LEVELS, type CefrLevel, type CoreSkill } from '../content/types'

export interface SkillEvidence {
  skill: CoreSkill
  /** 0..100 — yig'ilgan natijalardan hisoblangan o'rtacha, vaqt bilan og'irlikli */
  score: number
  /** Qanchalik ishonchli: nuqta soni va xilma-xillik */
  evidenceCount: number
  /** 0..1 */
  confidence: number
  lastAt: number | null
}

/** Baho berish uchun minimal dalil soni (har bir ko'nikma). */
export const MIN_EVIDENCE_PER_SKILL = 4
/** Daraja o'tish uchun nechta ko'nikma yetarli bo'lishi kerak. */
export const SKILLS_REQUIRED_TO_PROMOTE = 4
/** Har bir ko'nikma uchun o'tish bosiqlari (0..100). */
export const PROMOTION_THRESHOLD = 72
/** Kamida bitta Mock Exam natijasi bo'lishi shart. */
export const MOCK_EXAM_WEIGHT = 0.35

export function weightedScore(samples: readonly { score: number; at: number; kind: string }[], now: number): number {
  if (samples.length === 0) return 0
  let sum = 0
  let totalW = 0
  for (const s of samples) {
    // Yangi natijalar ko'proq hisobga olinadi (yarim umr ~30 kun).
    const ageDays = Math.max(0, (now - s.at) / 86_400_000)
    const recency = Math.pow(0.5, ageDays / 30)
    const kindWeight = s.kind === 'mock_exam' ? 1 + MOCK_EXAM_WEIGHT : s.kind === 'section_test' ? 1.15 : 1
    const w = recency * kindWeight
    sum += s.score * w
    totalW += w
  }
  return totalW === 0 ? 0 : sum / totalW
}

export function confidenceFor(evidenceCount: number, distinctKinds: number): number {
  const byCount = Math.min(1, evidenceCount / MIN_EVIDENCE_PER_SKILL)
  const byVariety = Math.min(1, distinctKinds / 3)
  return Number((Math.min(byCount, byVariety * 0.4 + byCount * 0.6)).toFixed(2))
}

/**
 * Daraja tavsiyasi. `recommendedLevel === null` bo'lsa — hozircha
 * tavsiya yo'q, foydalanuvchi hozirgi darajada davom etadi.
 */
export function evaluateLevelPromotion(
  current: CefrLevel,
  evidence: readonly SkillEvidence[],
): {
  recommendedLevel: CefrLevel | null
  readySkills: CoreSkill[]
  weakSkills: CoreSkill[]
  reasonUz: string
} {
  const bySkill = new Map(evidence.map((e) => [e.skill, e]))
  const ready: CoreSkill[] = []
  const weak: CoreSkill[] = []

  for (const skill of CORE_SKILLS) {
    const e = bySkill.get(skill)
    if (!e) {
      weak.push(skill)
      continue
    }
    const solid = e.score >= PROMOTION_THRESHOLD && e.evidenceCount >= MIN_EVIDENCE_PER_SKILL && e.confidence >= 0.6
    if (solid) ready.push(skill)
    else weak.push(skill)
  }

  const idx = CEFR_LEVELS.indexOf(current)
  const next = idx >= 0 && idx < CEFR_LEVELS.length - 1 ? CEFR_LEVELS[idx + 1] : null

  if (ready.length >= SKILLS_REQUIRED_TO_PROMOTE && next) {
    return {
      recommendedLevel: next,
      readySkills: ready,
      weakSkills: weak,
      reasonUz:
        `To'rt asosiy ko'nikma bo'yicha yetarli dalil to'plandi (har biri ≥${PROMOTION_THRESHOLD} ball va ≥${MIN_EVIDENCE_PER_SKILL} natija). ` +
        `${next} bosqichiga o‘tish tavsiya etiladi. Bu avtomatik o‘tish emas — faqat tavsiya.`,
    }
  }

  return {
    recommendedLevel: null,
    readySkills: ready,
    weakSkills: weak,
    reasonUz:
      ready.length >= SKILLS_REQUIRED_TO_PROMOTE
        ? 'Keyingi bosqich hozircha oxirgi daraja.'
        : `Daraja oshirish uchun kamida ${SKILLS_REQUIRED_TO_PROMOTE} ko‘nikma bo‘yicha dalil kerak. Hozircha ${ready.length} ta tayyor; zaif: ${weak.join(', ') || 'yo‘q'}. XP va kunlar soni darajani o‘zgartirmaydi.`,
  }
}

/** XP / streak motivatsiya uchun — darajaga ta'siri YO'Q. */
export function xpForAttempt(correct: boolean, difficulty: number, firstTry: boolean): number {
  const base = correct ? 6 + difficulty * 2 : 1
  return firstTry && correct ? base : Math.max(1, Math.round(base * 0.4))
}

export function streakFor(dates: readonly string[], today: string): number {
  // dates: YYYY-MM-DD
  const set = new Set(dates)
  let streak = 0
  let cursor = today
  while (set.has(cursor)) {
    streak += 1
    const d = new Date(cursor + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    cursor = d.toISOString().slice(0, 10)
  }
  return streak
}

export function levelLabel(level: CefrLevel): { titleEn: string; titleUz: string } {
  const map: Record<CefrLevel, { titleEn: string; titleUz: string }> = {
    A1: { titleEn: 'Beginner', titleUz: 'Boshlang‘ich' },
    A2: { titleEn: 'Elementary', titleUz: 'O‘rtacha past' },
    B1: { titleEn: 'Intermediate', titleUz: 'O‘rtacha' },
    B2: { titleEn: 'Upper-Intermediate', titleUz: 'O‘rtachadan yuqori' },
    C1: { titleEn: 'Advanced', titleUz: 'Yuqori' },
  }
  return map[level]
}
