/**
 * «Men qila olaman» dalili va daraja yakunlash guvohnomasi.
 */
import { describe, expect, it } from 'vitest'
import { getBundle } from '../content'
import { canDoFor } from '../content/canDo'
import type { CefrLevel } from '../content/types'
import { canDoEvidence } from '../lib/canDoEvidence'
import { CERTIFICATE_DISCLAIMER_UZ, certificateInfo } from '../lib/certificate'
import { MIN_EVIDENCE_PER_SKILL, PROMOTION_THRESHOLD } from '../lib/skillScoring'
import { emptyData, type AttemptRecord, type MockExamAttempt } from '../lib/types'

const NOW = Date.UTC(2026, 10, 10, 9)
const grammarA1 = canDoFor('A1').find((s) => s.skill === 'grammar')!
const readA1 = canDoFor('A1').find((s) => s.skill === 'reading')!
let n = 0
const att = (over: Partial<AttemptRecord>): AttemptRecord => ({
  id: `a${n++}`, exerciseId: 'x', skill: 'grammar', level: 'A1', correct: true, partial: 1, difficulty: 1,
  secondsSpent: 5, source: 'practice', answerGiven: '', at: NOW - 1000, ...over,
})
const examLevel = (id: string): CefrLevel | null => (id === 'a1-mock-exam' ? 'A1' : null)

describe('canDoEvidence', () => {
  it('natija yo‘q — «dalil yo‘q», ball ixtiro qilinmaydi', () => {
    expect(canDoEvidence(grammarA1, [], [], NOW, examLevel)).toEqual({ status: 'none', count: 0, score: null, needed: MIN_EVIDENCE_PER_SKILL })
  })
  it('faqat shu DARAJA va KO‘NIKMA hisoblanadi', () => {
    const atts = [att({}), att({ level: 'A2' }), att({ skill: 'reading' })]
    const ev = canDoEvidence(grammarA1, atts, [], NOW, examLevel)
    expect(ev).toEqual({ status: 'few', count: 1, score: 100, needed: MIN_EVIDENCE_PER_SKILL - 1 })
  })
  it('yetarli dalil: chegaradan yuqori — tasdiqlandi, past — mashq kerak', () => {
    const good = Array.from({ length: MIN_EVIDENCE_PER_SKILL }, () => att({}))
    expect(canDoEvidence(grammarA1, good, [], NOW, examLevel).status).toBe('confirmed')
    const bad = Array.from({ length: MIN_EVIDENCE_PER_SKILL }, (_, i) => att({ correct: i === 0, partial: 0 }))
    const ev = canDoEvidence(grammarA1, bad, [], NOW, examLevel)
    expect(ev.status).toBe('practice')
    expect(ev.score!).toBeLessThan(PROMOTION_THRESHOLD)
  })
  it('mock imtihon bo‘limi o‘z darajasi bo‘yicha hisoblanadi', () => {
    const mock = (examId: string): MockExamAttempt => ({
      id: 'm', examId, totalScore: 80, speakingAdvisory: '', completedAt: NOW - 10,
      sections: [{ sectionId: 's', skill: 'reading', answered: 5, total: 5, score: 80, startedAt: 0, finishedAt: 1, exerciseResults: {} }],
    })
    expect(canDoEvidence(readA1, [], [mock('a1-mock-exam')], NOW, examLevel).count).toBe(1)
    expect(canDoEvidence(readA1, [], [mock('boshqa')], NOW, examLevel).count).toBe(0)
  })
})

describe('certificateInfo', () => {
  const b = getBundle('A1')
  const ids = b.vocab.map((v) => v.id)
  it('kunlar tugamaguncha berilmaydi', () => {
    const d = emptyData('u')
    d.path.completedDays = b.days.slice(0, 6).map((x) => x.id)
    const info = certificateInfo(d, 'A1', b.days, ids, NOW, examLevel)
    expect(info.eligible).toBe(false)
    expect([info.daysDone, info.daysTotal]).toEqual([6, 7])
    expect(info.accuracy).toBeNull()
  })
  it('hammasi tugasa beriladi; sonlar haqiqiy ma’lumotdan', () => {
    const d = emptyData('u')
    d.path.completedDays = b.days.map((x) => x.id)
    d.attempts = [att({}), att({ correct: false, partial: 0 }), att({ level: 'A2' })]
    d.srs = { [ids[0]!]: { learnedAt: 1, dueAt: 0, intervalDays: 1, ease: 2.5, reps: 1, lapses: 0, lastReviewedAt: 1 } }
    const info = certificateInfo(d, 'A1', b.days, ids, NOW, examLevel)
    expect(info).toMatchObject({ eligible: true, daysDone: 7, attempts: 2, accuracy: 50, wordsLearned: 1, canDoTotal: 6 })
  })
  it('ogohlantirish matni «rasmiy sertifikat emas» deydi', () => {
    expect(CERTIFICATE_DISCLAIMER_UZ).toMatch(/rasmiy sertifikat emas/)
  })
})
