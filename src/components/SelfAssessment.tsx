/**
 * O'z-o'zini baholash — Likert shkalasi (1–5) CEFR "Men … qila olaman"
 * da'volari bo'yicha. Baho darajaga ham, XP'ga ham TA'SIR QILMAYDI —
 * o'quvchi o'zini qanday his qilishini ko'radi va haqiqiy natija (ko'nikma
 * isbotlari) bilan solishtiradi. Saqlanadi va qurilmalar orasida sinxron.
 */

import { useState } from 'react'
import { mockExamA1 } from '../content'
import { CAN_DO_STATUS_UZ, canDoEvidence } from '../lib/canDoEvidence'
import { useNow } from '../lib/clock'
import { MIN_EVIDENCE_PER_SKILL, PROMOTION_THRESHOLD } from '../lib/skillScoring'
import { CEFR_LEVELS, type CefrLevel } from '../content/types'
import { LIKERT_LABELS, canDoFor } from '../content/canDo'
import { skillLabelUz } from '../lib/planning'
import { useStore } from '../lib/storeContext'
import { Card, Chip } from './ui'

const TONES = [
  'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
  'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300',
  'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  'border-lime-300 bg-lime-50 text-lime-700 dark:bg-lime-950/30 dark:text-lime-300',
  'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
]

export default function SelfAssessment() {
  const { data, actions } = useStore()
  const [level, setLevel] = useState<CefrLevel>(data.settings.currentLevel)
  const items = canDoFor(level)
  const now = useNow()
  const examLevel = (id: string) => (id === mockExamA1.id ? mockExamA1.level : null)
  const confirmed = items.filter((s) => canDoEvidence(s, data.attempts, data.mockAttempts, now, examLevel).status === 'confirmed').length
  const rated = items.filter((s) => data.selfAssessment[s.id])
  const avg = rated.length === 0 ? null : rated.reduce((a, s) => a + data.selfAssessment[s.id]!.score, 0) / rated.length

  return (
    <Card className="grid gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-bold">O‘zingizni baholang</h2>
        <Chip>{rated.length}/{items.length} baholangan</Chip>
        {avg !== null && <Chip tone={avg >= 4 ? 'ok' : avg >= 3 ? 'brand' : 'warn'}>o‘rtacha {avg.toFixed(1)} / 5</Chip>}
        <Chip tone={confirmed > 0 ? 'ok' : 'default'}>
          {confirmed}/{items.length} natija bilan tasdiqlangan
        </Chip>
      </div>
      <p className="text-sm muted">
        Har da’voga 1 dan 5 gacha baho bering: 1 — {LIKERT_LABELS[0]!.toLowerCase()}, 5 — {LIKERT_LABELS[4]!.toLowerCase()}. Bu baho
        darajangizni o‘zgartirmaydi va XP bermaydi — faqat o‘zingizni qanday his qilishingizni ko‘rsatadi. Haqiqiy natija
        yuqoridagi “Ko‘nikma isbotlari”da. Har da’vo ostida — shu daraja va ko‘nikma bo‘yicha haqiqiy mashq natijalari: kamida {MIN_EVIDENCE_PER_SKILL} ta
        natija va {PROMOTION_THRESHOLD}% dan yuqori ball bo‘lsa «natija bilan tasdiqlandi» (daraja qoidasi bilan bir xil chegaralar).
      </p>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Daraja">
        {CEFR_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={level === l}
            onClick={() => setLevel(l)}
            className={`chip cursor-pointer ${level === l ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
          >
            {l}
          </button>
        ))}
      </div>
      <ol className="grid gap-2.5">
        {items.map((s) => {
          const cur = data.selfAssessment[s.id]?.score ?? 0
          const ev = canDoEvidence(s, data.attempts, data.mockAttempts, now, examLevel)
          return (
            <li key={s.id} className="rounded-2xl border-2 p-3 grid gap-2">
              <div className="flex flex-wrap items-start gap-2">
                <Chip>{skillLabelUz(s.skill)}</Chip>
                <p className="flex-1 min-w-48 text-sm font-semibold">{s.textUz}</p>
              </div>
              <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={s.textUz}>
                {LIKERT_LABELS.map((label, i) => {
                  const score = i + 1
                  const on = cur === score
                  return (
                    <button
                      key={score}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      title={label}
                      aria-label={`${score} — ${label}`}
                      onClick={() => actions.rateCanDo(s.id, score)}
                      className={`aea-choice rounded-xl border-2 border-b-4 py-1.5 text-sm font-extrabold tabular-nums ${
                        on ? TONES[i] : 'bg-[var(--panel)] muted hover:bg-[var(--panel-2)]'
                      }`}
                    >
                      {score}
                    </button>
                  )
                })}
              </div>
              {cur > 0 && <p className="text-[11px] muted">{LIKERT_LABELS[cur - 1]}</p>}
              <p className="flex flex-wrap items-center gap-1.5 text-xs" data-testid={`cando-${s.id}`}>
                <Chip tone={ev.status === 'confirmed' ? 'ok' : ev.status === 'practice' ? 'warn' : 'default'}>{CAN_DO_STATUS_UZ[ev.status]}</Chip>
                <span className="muted">
                  {ev.status === 'none'
                    ? `${s.level} ${skillLabelUz(s.skill).toLowerCase()} mashqlari natijasi hali yo‘q.`
                    : ev.status === 'few'
                      ? `${ev.count} ta natija (${ev.score}%) — tasdiqlash uchun yana ${ev.needed} ta kerak.`
                      : `${ev.count} ta natija, og‘irlikli ball ${ev.score}%.`}
                </span>
              </p>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
