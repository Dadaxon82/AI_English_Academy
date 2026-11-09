import { describe, expect, it } from 'vitest'
import { getBundle } from '../content'
import { buildChain } from '../lib/lessonChain'
import { buildPathLayout } from '../lib/pathMap'
import { pathMilestoneSpecs } from '../lib/sections'
import { stepDoneChecker } from '../lib/stepProgress'
import { emptyData, type AttemptRecord } from '../lib/types'

const days = getBundle('A1').days
const grammar = getBundle('A1').grammar
// Grammatika qadami mashqlari — haqiqiy kontentdan
const day1 = days[0]!
const gIds = grammar.find((g) => g.id === day1.sections.find((s) => s.skill === 'grammar')!.itemIds[0])!.exercises.map((e) => e.id)
const chains = () => days.map((d, i) => buildChain(d, i === 0 ? { grammar: gIds, vocabulary: ['v1'] } : { grammar: ['x'] }, i, i === 0, false))

function att(exerciseId: string, correct: boolean, at: number): AttemptRecord {
  return { id: `a${at}`, exerciseId, skill: 'grammar', level: 'A1', correct, partial: correct ? 1 : 0, difficulty: 1, secondsSpent: 5, source: 'practice', answerGiven: '', at }
}

describe('xarita — qadam darajasidagi progress', () => {
  it('bo‘lim mashqlari hammasi to‘g‘ri yechilsa qadam "done", qolgan vazifalar 1 taga kamayadi', () => {
    const d = emptyData('u')
    const before = buildPathLayout(chains(), 360, pathMilestoneSpecs('A1'), stepDoneChecker(d))
    d.attempts = gIds.map((id, i) => att(id, true, i + 1))
    const after = buildPathLayout(chains(), 360, pathMilestoneSpecs('A1'), stepDoneChecker(d))
    expect(after.milestones[0]!.remaining).toBe(before.milestones[0]!.remaining - 1)
    expect(after.nodes.find((n) => n.dayId === day1.id && n.skill === 'grammar')!.status).toBe('done')
    expect(after.units[0]!.stepsDone).toBe(1)
  })

  it('bitta mashq xato bo‘lsa — qadam tugamagan; remix to‘g‘ri yechilsa asliga yoziladi', () => {
    const d = emptyData('u')
    d.attempts = gIds.map((id, i) => att(id, i !== 0, i + 1))
    expect(buildPathLayout(chains(), 360, [], stepDoneChecker(d)).nodes.find((n) => n.skill === 'grammar')!.status).toBe('current')
    d.attempts.push(att(`remix-${gIds[0]}`, true, 99))
    expect(buildPathLayout(chains(), 360, [], stepDoneChecker(d)).nodes.find((n) => n.skill === 'grammar')!.status).toBe('done')
  })

  it('yozish qadami — shu topshiriq uchun javob saqlansa', () => {
    const d = emptyData('u')
    const wId = day1.sections.find((s) => s.skill === 'writing')!.itemIds[0]!
    const check = stepDoneChecker(d)
    const chain = buildChain(day1, {}, 0, true, false)
    const wStep = chain.steps.find((s) => s.skill === 'writing')!
    expect(check(wStep, day1)).toBe(false)
    d.writing = [{ id: 'w1', taskId: wId, text: 'x', wordCount: 1, secondsSpent: 1, analysis: null, supersedesId: null, createdAt: 1 }]
    expect(stepDoneChecker(d)(wStep, day1)).toBe(true)
  })

  it('qulflangan kun qadamlari signal bo‘lsa ham "done" bo‘lmaydi (qulf kun darajasida)', () => {
    const d = emptyData('u')
    d.attempts = [att('x', true, 1)]
    const l = buildPathLayout(chains(), 360, [], stepDoneChecker(d))
    expect(l.nodes.filter((n) => n.dayId === days[1]!.id).every((n) => n.status === 'locked')).toBe(true)
  })
})
