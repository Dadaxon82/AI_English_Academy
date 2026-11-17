/**
 * ADDIE qatlami: baholash tahlili, moslashuvchan reja, daraja imtihoni,
 * guruh mashg'uloti ma'lumotini tekshirish.
 */
import { describe, expect, it } from 'vitest'
import { getBundle } from '../content'
import type { Exercise } from '../content/types'
import { buildAdaptiveDrill, buildAdaptivePlan, targetDifficulty } from '../lib/adaptive'
import { fingerprintOf, snapshotRow, validateGroupInput } from '../lib/addieRemote'
import { errorCategories, skillMastery, topicOf, velocityReport } from '../lib/evaluation'
import { LEVEL_EXAM_PASS, buildLevelExam, levelExamKey, levelExamReady, levelExamScore, nextLevelOf } from '../lib/levelExam'
import { reducer } from '../lib/reducer'
import type { AttemptRecord } from '../lib/types'
import { emptyData } from '../lib/types'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 16, 12)

const ex = (id: string, skill: Exercise['skill'], tags: string[], difficulty = 2): Exercise =>
  ({ id, kind: 'multiple-choice', skill, level: 'A1', tags, difficulty, instructionUz: '', explanationUz: '', question: 'q', options: ['a', 'b'], answerIndex: 0 }) as Exercise

const POOL: Exercise[] = [
  ex('g-aan-1', 'grammar', ['a an'], 1),
  ex('g-aan-2', 'grammar', ['a an'], 2),
  ex('g-aan-3', 'grammar', ['a an'], 4),
  ex('g-pl-1', 'grammar', ['plural'], 2),
  ex('v-1', 'vocabulary', ['colours'], 1),
  ex('r-1', 'reading', ['detail'], 2),
]
const find = (id: string) => POOL.find((e) => e.id === id)

let n = 0
function att(exerciseId: string, correct: boolean, at: number, skill: Exercise['skill'] = 'grammar', difficulty = 2): AttemptRecord {
  return { id: `a${n++}`, exerciseId, skill, level: 'A1', correct, partial: correct ? 1 : 0, difficulty, secondsSpent: 5, source: 'practice', answerGiven: '', at }
}

describe('evaluation — xato toifalari', () => {
  it('teg bo‘yicha guruhlanadi, keyin töğri yeçilgani hisobdan çiqadi', () => {
    const attempts = [
      att('g-aan-1', false, NOW - 3 * DAY),
      att('g-aan-1', false, NOW - 2 * DAY),
      att('g-aan-2', false, NOW - DAY),
      att('g-pl-1', false, NOW - DAY),
      att('g-pl-1', true, NOW - 1000),
    ]
    const cats = errorCategories(attempts, find, NOW)
    expect(cats.map((c) => c.key)).toEqual(['grammar:a an'])
    expect(cats[0]!.open).toBe(2)
    expect(cats[0]!.wrong).toBe(3)
    expect(cats[0]!.exerciseIds.sort()).toEqual(['g-aan-1', 'g-aan-2'])
  })
  it('teg bo‘lmasa — mashq turi', () => {
    expect(topicOf({ ...POOL[0]!, tags: [] })).toBe('multiple-choice')
  })
  it('oynadan tashqari xatolar hisobga olinmaydi', () => {
    expect(errorCategories([att('g-aan-1', false, NOW - 90 * DAY)], find, NOW)).toEqual([])
  })
})

describe('evaluation — o‘zlashtirish va tezlik', () => {
  it('dalil yo‘q ko‘nikma — null (son ixtiro qilinmaydi)', () => {
    const m = skillMastery([att('g-aan-1', true, NOW), att('g-aan-2', false, NOW)])
    expect(m.find((x) => x.skill === 'grammar')).toEqual({ skill: 'grammar', accuracy: 50, count: 2 })
    expect(m.find((x) => x.skill === 'writing')).toEqual({ skill: 'writing', accuracy: null, count: 0 })
  })
  it('aniqlik tendensiyasi va sur’at', () => {
    const attempts = [
      ...Array.from({ length: 10 }, (_, i) => att('g-aan-1', i < 5, NOW - 10 * DAY)), // 50%
      ...Array.from({ length: 10 }, (_, i) => att('g-aan-2', i < 9, NOW - 2 * DAY)), // 90%
    ]
    const v = velocityReport({
      attempts,
      activity: { '2026-11-15': { date: '2026-11-15', seconds: 1200, attempts: 10, correct: 9, newWords: 0, reviewedWords: 0, skills: {} } },
      completedDays: ['a1-day-01', 'a1-day-02'],
      levelDaysLeft: 5,
      now: NOW,
    })
    expect(v.accuracy7).toBe(90)
    expect(v.accuracyPrev7).toBe(50)
    expect(v.trend).toBe('up')
    expect(v.activeDays7).toBe(1)
    expect(v.minutesPerActiveDay7).toBe(20)
    expect(v.daysPerWeek).toBeGreaterThan(0)
    expect(v.weeksToFinishLevel).toBeGreaterThan(0)
  })
  it('urinish yo‘q — tendensiya yo‘q, sur’at null', () => {
    const v = velocityReport({ attempts: [], activity: {}, completedDays: [], levelDaysLeft: 7, now: NOW })
    expect(v.trend).toBe('none')
    expect(v.daysPerWeek).toBeNull()
    expect(v.weeksToFinishLevel).toBeNull()
  })
})

describe('adaptive — qiyinlik va reja', () => {
  it('yuqori aniqlikda qiyinlik oşadi, pastda tuşadi, kam dalilda 1', () => {
    expect(targetDifficulty([att('x', true, NOW)]).value).toBe(1)
    expect(targetDifficulty(Array.from({ length: 20 }, () => att('x', true, NOW, 'grammar', 2))).value).toBe(3)
    expect(targetDifficulty(Array.from({ length: 20 }, (_, i) => att('x', i < 5, NOW, 'grammar', 3))).value).toBe(2)
    expect(targetDifficulty(Array.from({ length: 20 }, (_, i) => att('x', i < 14, NOW, 'grammar', 3))).value).toBe(3)
  })
  it('reja: imtihon, diqqat mavzusi, zaif könikma, sözlar, keyingi dars — sabablari bilan', () => {
    const attempts = [
      ...Array.from({ length: 6 }, () => att('g-aan-1', false, NOW - DAY)),
      att('g-aan-2', false, NOW - DAY),
      att('g-pl-1', false, NOW - DAY),
    ]
    const plan = buildAdaptivePlan({
      level: 'A1',
      attempts,
      find,
      dueWords: 4,
      nextDay: { dayNumber: 3, titleUz: 'Kunlik tartib' },
      lastWritingAt: NOW - DAY,
      lastSpeakingAt: NOW - DAY,
      levelExamReady: true,
      now: NOW,
    })
    expect(plan.actions.map((a) => a.id)).toEqual(['level-exam', 'focus', 'mistakes', 'weak-skill', 'review-words'])
    expect(plan.focus[0]!.topic).toBe('a an')
    expect(plan.weakSkills.map((w) => w.skill)).toEqual(['grammar'])
    for (const a of plan.actions) expect(a.reasonUz.length).toBeGreaterThan(10)
  })
  it('yangi o‘quvçi: navbatdagi dars, yoziş va gapiriş tavsiya qilinadi', () => {
    const plan = buildAdaptivePlan({ level: 'A0', attempts: [], find, dueWords: 0, nextDay: { dayNumber: 1, titleUz: 'Salom va alifbo' }, lastWritingAt: null, lastSpeakingAt: null, levelExamReady: false, now: NOW })
    expect(plan.actions.map((a) => a.id)).toEqual(['next-lesson', 'writing', 'speaking'])
    expect(plan.targetDifficulty).toBe(1)
  })
  it('moslaşuvçan maşq: şu mavzudagi YANGI maşqlar, qiyinligi maqsadga yaqin; yeçilgan va matnli maşqlar yöq', () => {
    const attempts = [att('g-aan-1', false, NOW - DAY), att('g-aan-1', false, NOW - DAY)]
    const plan = buildAdaptivePlan({ level: 'A1', attempts, find, dueWords: 0, nextDay: null, lastWritingAt: NOW, lastSpeakingAt: NOW, levelExamReady: false, now: NOW })
    const drill = buildAdaptiveDrill([...POOL, { ...ex('g-aan-p', 'grammar', ['a an'], 1), passageId: 'r1' } as Exercise], { ...plan, targetDifficulty: 2 }, attempts)
    expect(drill.map((e) => e.id)).toEqual(['g-aan-2', 'g-aan-3'])
  })
})

describe('daraja imtihoni', () => {
  const a0 = getBundle('A0').days
  it('har kun testidan 3 tadan savol, matnsiz, takrorsiz; bir neçta könikma', () => {
    const exam = buildLevelExam(a0)
    expect(exam.length).toBe(21)
    expect(new Set(exam.map((e) => e.id)).size).toBe(21)
    expect(new Set(exam.map((e) => e.skill)).size).toBeGreaterThanOrEqual(2)
  })
  it('ball, tayyorlik, keyingi daraja', () => {
    const m = new Map([['a', { correct: true, partial: 1 }], ['b', { correct: false, partial: 0.5 }]])
    expect(levelExamScore(m, 4)).toBe(38)
    expect(levelExamReady('A0', a0, [], {})).toBe(false)
    expect(levelExamReady('A0', a0, a0.map((d) => d.id), {})).toBe(true)
    expect(levelExamReady('A0', a0, a0.map((d) => d.id), { [levelExamKey('A0')]: LEVEL_EXAM_PASS })).toBe(false)
    expect(nextLevelOf('A0')).toBe('A1')
    expect(nextLevelOf('C1')).toBeNull()
  })
  it('reducer: eng yaxşi natija saqlanadi, daraja özgarmaydi', () => {
    let s = emptyData('u')
    s = reducer(s, { type: 'level-exam', level: 'A0', score: 70 })
    s = reducer(s, { type: 'level-exam', level: 'A0', score: 60 })
    expect(s.path.passedTests['level:A0']).toBe(70)
    expect(s.settings.currentLevel).toBe('A1')
  })
})

describe('mentor izohi', () => {
  it('yozma işga izoh yoziladi (2000 belgigaça)', () => {
    let s = emptyData('u')
    s = { ...s, writing: [{ id: 'w1', taskId: 't', text: 'x', wordCount: 1, secondsSpent: 0, analysis: null, supersedesId: null, createdAt: 1 }] }
    s = reducer(s, { type: 'writing-note', id: 'w1', note: 'a'.repeat(2500) })
    expect(s.writing[0]!.mentorNote?.length).toBe(2000)
  })
})

describe('server qatlami — sof qismlar', () => {
  it('guruh maşğuloti tekşiruvi', () => {
    const now = new Date(NOW)
    const ok = { title: 'Alifbo', topic: '', startsAt: new Date(NOW + DAY), capacity: 6, durationMin: 45 }
    expect(validateGroupInput(ok, now)).toBeNull()
    expect(validateGroupInput({ ...ok, title: 'ab' }, now)).toMatch(/Sarlavha/)
    expect(validateGroupInput({ ...ok, startsAt: new Date(NOW - 1) }, now)).toMatch(/kelajakda/)
    expect(validateGroupInput({ ...ok, capacity: 1 }, now)).toMatch(/2–30/)
  })
  it('kunlik surat qatori va barqaror iz', () => {
    const row = snapshotRow(
      {
        level: 'A0',
        mastery: [{ skill: 'grammar', accuracy: 80, count: 10 }],
        velocity: velocityReport({ attempts: [], activity: {}, completedDays: [], levelDaysLeft: 7, now: NOW }),
        categories: [],
        completedDays: 0,
      },
      '2026-11-16',
    )
    expect(row.skills).toEqual({ grammar: { accuracy: 80, count: 10 } })
    expect(fingerprintOf(row)).toBe(fingerprintOf(JSON.parse(JSON.stringify(row))))
  })
})
