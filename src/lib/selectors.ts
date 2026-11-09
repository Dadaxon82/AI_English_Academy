/** Holatdan hosil qilinadigan ko'rsatkichlar (sof funksiyalar, sahifalar uchun). */

import type { CoreSkill } from '../content/types'
import { allVocab, LOADED_LEVELS } from '../content/index'
import { weightedScore, confidenceFor, type SkillEvidence } from './skillScoring'
import { speakingScore } from './analyze'
import type { AppData } from './types'
import { todayKey } from './types'

// ---------- Derived helpers (exported for pages) ----------

export function skillEvidence(data: AppData): SkillEvidence[] {
  const core: CoreSkill[] = ['reading', 'listening', 'writing', 'speaking']
  const now = Date.now()
  return core.map((skill) => {
    const samples: { score: number; at: number; kind: string }[] = []
    for (const a of data.attempts) {
      if (a.skill !== skill) continue
      samples.push({ score: a.correct ? 100 : Math.round(a.partial * 100), at: a.at, kind: a.source })
    }
    for (const m of data.mockAttempts) {
      for (const s of m.sections) {
        if (s.skill === skill && s.score !== null) samples.push({ score: s.score, at: m.completedAt, kind: 'mock_exam' })
      }
    }
    for (const w of data.writing) {
      if (!w.analysis) continue
      const avg = Object.values(w.analysis.criteriaScores).reduce((a, b) => a + b, 0) / 5
      samples.push({ score: Math.round((avg / 5) * 100), at: w.createdAt, kind: 'writing_task' })
    }
    for (const s of data.speaking) {
      if (!s.analysis) continue
      samples.push({ score: speakingScore(s.analysis), at: s.createdAt, kind: 'speaking_task' })
    }
    const kinds = new Set(samples.map((s) => s.kind))
    return {
      skill,
      score: Math.round(weightedScore(samples, now)),
      evidenceCount: samples.length,
      confidence: confidenceFor(samples.length, kinds.size),
      lastAt: samples.length ? Math.max(...samples.map((s) => s.at)) : null,
    }
  })
}

export interface ActivityDay {
  date: string
  seconds: number
  attempts: number
  correct: number
}

export function lastNDays(data: AppData, n = 7): ActivityDay[] {
  const out: ActivityDay[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = todayKey(d)
    const a = data.activity[key]
    out.push({
      date: key,
      seconds: a?.seconds ?? 0,
      attempts: a?.attempts ?? 0,
      correct: a?.correct ?? 0,
    })
  }
  return out
}


export function totalVocabCount(): number {
  return allVocab(LOADED_LEVELS).length
}
