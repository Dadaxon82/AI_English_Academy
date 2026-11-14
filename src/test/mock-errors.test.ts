import { describe, expect, it } from 'vitest'
import { mockErrorAttempts, withMockErrors } from '../lib/mockErrors'
import type { AttemptRecord, MockExamAttempt } from '../lib/types'

const t0 = 1_764_000_000_000

function mockAttempt(overrides: Partial<MockExamAttempt> = {}): MockExamAttempt {
  return {
    id: 'mx-1',
    examId: 'a1-mock-1',
    sections: [
      {
        sectionId: 'a1-mock-reading',
        skill: 'reading',
        answered: 3,
        total: 4,
        score: 60,
        startedAt: t0,
        finishedAt: t0 + 600_000,
        exerciseResults: {
          'a1-ex-r1-01': { correct: true, given: 'A' },
          'a1-ex-r1-02': { correct: false, given: 'B' },
          'a1-ex-r1-03': { correct: false, given: '   ' }, // javob berilmagan
          'note:a1-mock-writing': { correct: false, given: 'erkin matn' },
        },
      },
    ],
    totalScore: 60,
    speakingAdvisory: '',
    completedAt: t0 + 900_000,
    ...overrides,
  }
}

const attempt = (id: string, exerciseId: string, at: number, given = 'x'): AttemptRecord => ({
  id,
  exerciseId,
  skill: 'grammar',
  level: 'A1',
  correct: false,
  partial: 0,
  difficulty: 2,
  secondsSpent: 10,
  source: 'practice',
  answerGiven: given,
  at,
})

describe('Mock imtihon xatolari Xatolar kundaligida ko‘rinadi', () => {
  it('faqat xato va javob berilgan savollar keltiriladi', () => {
    const rows = mockErrorAttempts([mockAttempt()], 'A1')
    expect(rows).toHaveLength(1)
    const r = rows[0]!
    expect(r.exerciseId).toBe('a1-ex-r1-02')
    expect(r.source).toBe('mock_exam')
    expect(r.correct).toBe(false)
    expect(r.answerGiven).toBe('B')
    expect(r.at).toBe(t0 + 900_000)
    // Bo'lim vaqti sekundga aylantiriladi (600 s).
    expect(r.secondsSpent).toBe(600)
  })

  it('bo‘sh javob va „note:“ erkin matni xato hisoblanmaydi', () => {
    const rows = mockErrorAttempts([mockAttempt()], 'A1')
    expect(rows.some((r) => r.exerciseId === 'a1-ex-r1-03')).toBe(false)
    expect(rows.some((r) => r.exerciseId.startsWith('note:'))).toBe(false)
  })

  it('attempts IFLOSHATILMAYDI — merge faqat qo‘shadi, dublikat qilmaydi', () => {
    const acts = [attempt('a1', 'a1-ex-g1-01', t0)]
    const merged = withMockErrors(acts, [mockAttempt()], 'A1')
    expect(merged).toHaveLength(2)
    expect(merged.filter((a) => a.source === 'mock_exam')).toHaveLength(1)
    // Tartib: avval haqiqiy, keyin mock (ErrorLog qayta saralaydi).
    expect(merged[0]!.id).toBe('a1')
  })

  it('bir xil yozuv ikki marta tushmaydi (agar keyinroq attempts‘ga yozilsa)', () => {
    const m = mockAttempt()
    const r = mockErrorAttempts([m], 'A1')[0]!
    const merged = withMockErrors([attempt('dup', r.exerciseId, r.at, r.answerGiven)], [m], 'A1')
    expect(merged.filter((a) => a.exerciseId === r.exerciseId)).toHaveLength(1)
  })

  it('mock bo‘lmasa attempts o‘zgarishsiz qaytadi', () => {
    const acts = [attempt('a1', 'a1-ex-g1-01', t0)]
    expect(withMockErrors(acts, [], 'A1')).toEqual(acts)
  })
})
