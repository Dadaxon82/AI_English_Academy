/**
 * Zanjir auditi HAQIQIY A1 kontentida — brauzer va telefonda ko'rinadigan
 * satrning sonlari shu yerda o'lchanadi (ixtira emas).
 */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildChain, chainAudit, exerciseIdsForSection } from '../lib/lessonChain'
import { findExercise, getBundle, type LevelBundle, vocabQuizExercise } from '../content'

const bundle = getBundle('A1')

function chainsOf(b: LevelBundle) {
  const days = b.days
  return days.map((day, i) =>
    buildChain(
      day,
      Object.fromEntries(
        day.sections.map((s) => [
          s.skill,
          exerciseIdsForSection(s, {
            vocabQuizIds: (ids) =>
              ids
                .map((id) => b.vocab.find((v) => v.id === id))
                .filter((v) => v !== undefined)
                .map((v) => vocabQuizExercise(v).id),
            grammarExercises: (id) => b.grammar.find((g) => g.id === id)?.exercises ?? [],
            readingExercises: (id) => b.reading.find((r) => r.id === id)?.exercises ?? [],
            listeningExercises: (id) => b.listening.find((l) => l.id === id)?.exercises ?? [],
            findExercise,
          }),
        ]),
      ),
      i,
      day.id === days[0].id,
      false,
    ),
  )
}

describe('chainAudit — A1 kontenti (o‘lchangan sonlar)', () => {
  const chains = chainsOf(bundle)
  const audit = chainAudit(chains, (id) => findExercise(id)?.kind)
  it('A1 — 7 kun, 49 bo‘lim/test (o‘lchangan kontent hajmi)', () => {
    expect(chains).toHaveLength(bundle.days.length)
    expect(chains.reduce((a, c) => a + c.steps.length, 0)).toBe(49)
  })
  it('audit sonlari kontentdan hisoblanadi', () => {
    if (process.env.AEA_AUDIT_DUMP) writeFileSync(process.env.AEA_AUDIT_DUMP, JSON.stringify(audit))
    expect(audit.sections).toBeGreaterThan(0)
    expect(audit.rotationSteps).toBeGreaterThan(0)
    // Aralash bo'limlarda tur almashinuvi ishlaydi: qolgan bir xil qo'shnilar
    // FAQAT yagona turli bo'limlarning majburiy takroridir.
    expect(audit.sameNeighbours).toBe(audit.unavoidable)
    expect(audit.reinforcement).toBeGreaterThan(0) // REINFORCE_EVERY qatlam ishlaydi
    expect(audit.minGap).toBeGreaterThanOrEqual(2)
  })
  it('mobil `chainAudit` bilan bir xil — sonlar tartibga bog‘liq emas', () => {
    // KUNLAR va BO'LIMLAR teskari tartibda berilsa ham xuddi shu son chiqadi
    // (`buildChain` bo'limlarni `Skills.PLAN_ORDER` tartibiga qaytaradi).
    const reversed = chainsOf({
      ...bundle,
      days: [...bundle.days].reverse().map((d) => ({ ...d, sections: [...d.sections].reverse() })),
    })
    expect(chainAudit(reversed, (id) => findExercise(id)?.kind)).toEqual(audit)
  })
})
