import { describe, expect, it } from 'vitest'
import {
  MIN_EVIDENCE_PER_SKILL,
  PROMOTION_THRESHOLD,
  SKILLS_REQUIRED_TO_PROMOTE,
  evaluateLevelPromotion,
  streakFor,
  weightedScore,
  xpForAttempt,
} from '../lib/skillScoring'
import type { SkillEvidence } from '../lib/skillScoring'

const NOW = Date.UTC(2026, 10, 1)

const ev = (skill: SkillEvidence['skill'], score: number, n = MIN_EVIDENCE_PER_SKILL, conf = 0.8): SkillEvidence => ({
  skill,
  score,
  evidenceCount: n,
  confidence: conf,
  lastAt: NOW,
})

const allFour = (score: number, n = MIN_EVIDENCE_PER_SKILL): SkillEvidence[] => [
  ev('reading', score, n),
  ev('listening', score, n),
  ev('writing', score, n),
  ev('speaking', score, n),
]

describe('Daraja ko‘tarish — faqat ko‘p ko‘nikmalı isbot bilan', () => {
  it('4 ta asosiy ko‘nikma yetarli → keyingi daraja tavsiya qilinadi', () => {
    const p = evaluateLevelPromotion('A1', allFour(PROMOTION_THRESHOLD))
    expect(p.recommendedLevel).toBe('A2')
    expect(p.readySkills).toHaveLength(SKILLS_REQUIRED_TO_PROMOTE)
    expect(p.reasonUz).toContain('tavsiya')
  })

  it('bitta ko‘nikma zaif bo‘lsa — tavsiya YO‘Q', () => {
    const mixed = [ev('reading', 90), ev('listening', 90), ev('writing', 90), ev('speaking', 30)]
    const p = evaluateLevelPromotion('A1', mixed)
    expect(p.recommendedLevel).toBeNull()
    expect(p.weakSkills).toContain('speaking')
  })

  it('isbotlar soni yetarli bo‘lmasa — tavsiya yo‘q (XP emas, dalil muhim)', () => {
    const p = evaluateLevelPromotion('A1', allFour(95, MIN_EVIDENCE_PER_SKILL - 1))
    expect(p.recommendedLevel).toBeNull()
  })

  it('ball chegaradan 1 ga past bo‘lsa — tavsiya yo‘q', () => {
    const p = evaluateLevelPromotion('A1', allFour(PROMOTION_THRESHOLD - 1))
    expect(p.recommendedLevel).toBeNull()
  })

  it('C1 da tavsiya yo‘q (oxirgi daraja)', () => {
    const p = evaluateLevelPromotion('C1', allFour(99))
    expect(p.recommendedLevel).toBeNull()
  })

  it('isbotlar butunlay bo‘lmasa — tavsiya yo‘q (XP/daqiqa emas, dalil kerak)', () => {
    const none = allFour(99, 0)
    const p = evaluateLevelPromotion('A1', none)
    expect(p.recommendedLevel).toBeNull()
  })
})

describe('weightedScore — yangi natijalar ko‘proq og‘irlikda', () => {
  it('yaqindagi yuqori natija eski yuqori natijadan ko‘ra ballni ko‘proq ko‘taradi', () => {
    const recentHigh = weightedScore(
      [
        { score: 100, at: NOW - 86_400_000, kind: 'practice' },
        { score: 0, at: NOW - 120 * 86_400_000, kind: 'practice' },
      ],
      NOW,
    )
    const oldHigh = weightedScore(
      [
        { score: 0, at: NOW - 86_400_000, kind: 'practice' },
        { score: 100, at: NOW - 120 * 86_400_000, kind: 'practice' },
      ],
      NOW,
    )
    expect(recentHigh).toBeGreaterThan(oldHigh)
    expect(recentHigh).toBeGreaterThan(50)
    expect(oldHigh).toBeLessThan(50)
  })

  it('mock imtihon oddiy mashqqa qaraganda kuchliroq ta’sir qiladi', () => {
    const withPractice = weightedScore(
      [
        { score: 40, at: NOW - 86_400_000, kind: 'practice' },
        { score: 90, at: NOW - 2 * 86_400_000, kind: 'practice' },
      ],
      NOW,
    )
    const withMock = weightedScore(
      [
        { score: 40, at: NOW - 86_400_000, kind: 'practice' },
        { score: 90, at: NOW - 2 * 86_400_000, kind: 'mock_exam' },
      ],
      NOW,
    )
    expect(withMock).toBeGreaterThan(withPractice)
  })
})

describe('XP va streak — motivatsiya, darajaga aloqasi yo‘q', () => {
  it('to‘g‘ri javob xatodan ko‘ra ko‘proq XP beradi', () => {
    expect(xpForAttempt(true, 3, true)).toBeGreaterThan(xpForAttempt(false, 3, true))
  })

  it('streak uzilgan kunlar bilan uzaladi', () => {
    const today = '2026-11-04'
    expect(streakFor(['2026-11-04', '2026-11-03', '2026-11-02'], today)).toBe(3)
    expect(streakFor(['2026-11-04', '2026-11-02'], today)).toBe(1)
    expect(streakFor([], today)).toBe(0)
  })
})
