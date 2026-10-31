/**
 * Mashq dvigateli — 6 turdagi mashqni ko'rsatadi va tekshiradi.
 *
 * Talablar: javobni tekshirish, xato sababini tushuntirish, keyingi
 * mashqni natijaga moslashtirish. Barcha tugmalar HAQIQIY ishlaydi.
 */

import { useMemo, useState } from 'react'
import type { Exercise } from '../content/types'
import { checkAnswer, nextExerciseIndex, type CheckResult } from '../lib/check'
import { Button, Chip, InfoBanner, inputCls } from './ui'

export interface ExerciseRunProps {
  exercise: Exercise
  checked: (r: CheckResult, secondsSpent: number) => void
  index: number
  total: number
  onNext: () => void
  prevResult?: CheckResult | null
}

export default function ExerciseRunner({ exercise, checked, index, total, onNext, prevResult }: ExerciseRunProps) {
  const [answer, setAnswer] = useState<unknown>(initialAnswer(exercise))
  const [state, setState] = useState<'idle' | 'answered'>('idle')
  const [result, setResult] = useState<CheckResult | null>(null)
  const startedAt = useMemo(() => Date.now(), [exercise.id])
  const [lastExerciseId, setLastExerciseId] = useState(exercise.id)

  // Mashq o'zgarsa holat tozalanadi (React rasmiy "state reset during render"
  // namuni — effect'dan ko'ra bir qadam tezroq va izchil).
  if (exercise.id !== lastExerciseId) {
    setLastExerciseId(exercise.id)
    setState('idle')
    setResult(null)
    setAnswer(initialAnswer(exercise))
  }

  // matching uchun aralashtirilgan variantlar — hook doimiy chaqirilishi
  // shart (switch ichida bo'la olmaydi).
  const rights = useMemo(
    () => (exercise.kind === 'matching' ? shuffle(exercise.pairs.map((p) => p.right), exercise.id) : []),
    [exercise],
  )

  const canCheck = !isAnswerEmpty(exercise, answer)

  const doCheck = () => {
    if (state === 'answered') return
    const r = checkAnswer(exercise, answer)
    setResult(r)
    setState('answered')
    checked(r, Math.round((Date.now() - startedAt) / 1000))
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold muted tabular-nums">
          {index + 1} / {total}
        </span>
        <div className="flex gap-1.5">
          <Chip>{kindLabel(exercise.kind)}</Chip>
          <Chip>{'Qiyinlik ' + exercise.difficulty}</Chip>
        </div>
      </div>

      {prevResult && !prevResult.correct && (
        <InfoBanner tone="warn">
          Oldingi savolda xato bor edi — shu mavzuni mustahkamlash uchun keyingi mashq tanlandi.
        </InfoBanner>
      )}

      <p className="font-semibold">{exercise.instructionUz}</p>

      {'passageExcerpt' in exercise && exercise.passageExcerpt && (
        <blockquote className="rounded-xl border bg-[var(--panel-2)] p-3.5 text-sm italic">
          “{exercise.passageExcerpt}”
        </blockquote>
      )}

      <AnswerInput exercise={exercise} answer={answer} onChange={setAnswer} locked={state === 'answered'} rights={rights} />

      {state === 'answered' && result && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm animate-[var(--animate-pop)] ${
            result.correct
              ? 'border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-rose-400/60 bg-rose-50 dark:bg-rose-900/15'
          }`}
          role="status"
          aria-live="polite"
        >
          <strong className={result.correct ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}>
            {result.correct ? 'To‘g‘ri!' : result.partial > 0 ? 'Qisman to‘g‘ri' : 'Noto‘g‘ri'}
          </strong>
          {!result.correct && (
            <p className="mt-1">
              To‘g‘ri javob: <b>{result.expected}</b>
            </p>
          )}
          <p className="mt-1 muted">{result.whyUz}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {state === 'idle' ? (
          <Button onClick={doCheck} disabled={!canCheck}>
            Tekshirish
          </Button>
        ) : (
          <Button onClick={onNext}>{index + 1 < total ? 'Keyingi mashq' : 'Yakunlash'}</Button>
        )}
        {state === 'idle' && (
          <Button variant="ghost" size="sm" onClick={() => setAnswer(skipAnswer(exercise))} disabled={!canCheck}>
            Javobni tozalash
          </Button>
        )}
      </div>
      {state === 'idle' && (
        <p className="text-[11px] muted">
          Klaviatura: <b>Enter</b> — tekshirish / davom etish. Ba'zi brauzerlarda matn maydonida Enter yubormaydi — tugmani
          bosing.
        </p>
      )}
    </div>
  )
}

// --------------------------- Javob kiritish ---------------------------

function AnswerInput({
  exercise,
  answer,
  onChange,
  locked,
  rights,
}: {
  exercise: Exercise
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
  rights: string[]
}) {
  switch (exercise.kind) {
    case 'multiple-choice': {
      const chosen = typeof answer === 'number' ? answer : -1
      return (
        <div className="grid gap-2" role="radiogroup" aria-label="Javob variantlari">
          {exercise.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={chosen === i}
              disabled={locked}
              onClick={() => onChange(i)}
              className={`text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                chosen === i
                  ? 'border-[var(--accent)] bg-navy-50 dark:bg-navy-900/40 font-semibold'
                  : 'hover:bg-[var(--panel-2)]'
              }`}
            >
              <span className="inline-grid place-items-center w-5 h-5 rounded-full border text-[10px] mr-2">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )
    }
    case 'true-false-notgiven': {
      const opts: { v: string; label: string }[] = [
        { v: 'true', label: 'True — to‘g‘ri' },
        { v: 'false', label: 'False — noto‘g‘ri' },
        { v: 'notgiven', label: 'Not Given — matnda yo‘q' },
      ]
      const chosen = String(answer ?? '')
      return (
        <div className="grid gap-2">
          <p className="text-sm font-medium">{exercise.statement}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="True / False / Not Given">
            {opts.map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={chosen === o.v}
                disabled={locked}
                onClick={() => onChange(o.v)}
                className={`px-3.5 py-2 rounded-xl border text-sm ${
                  chosen === o.v ? 'border-[var(--accent)] bg-navy-50 dark:bg-navy-900/40 font-semibold' : 'hover:bg-[var(--panel-2)]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )
    }
    case 'gap-fill': {
      const arr = Array.isArray(answer) ? answer : exercise.answers.map(() => '')
      const parts = exercise.text.split('___')
      return (
        <div className="grid gap-3">
          <p className="text-sm leading-8">
            {parts.map((p, i) => (
              <span key={i}>
                {p}
                {i < parts.length - 1 && (
                  <input
                    className={`${inputCls} inline-block w-28 mx-1 px-2 py-1 text-center`}
                    value={arr[i] ?? ''}
                    disabled={locked}
                    aria-label={`${i + 1}-bo‘shliq`}
                    onChange={(e) => {
                      const next = [...arr]
                      next[i] = e.target.value
                      onChange(next)
                    }}
                    placeholder="____"
                  />
                )}
              </span>
            ))}
          </p>
          {exercise.wordBank && (
            <div className="flex flex-wrap gap-1.5">
              {exercise.wordBank.map((w) => (
                <button
                  key={w}
                  type="button"
                  disabled={locked}
                  onClick={() => onChange([w, ...arr.slice(1)])}
                  className="chip hover:bg-[var(--panel)] cursor-pointer"
                >
                  {w}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }
    case 'matching': {
      const map = (answer ?? {}) as Record<string, string>
      return (
        <div className="grid gap-2">
          {exercise.pairs.map((p) => (
            <div key={p.left} className="flex items-center gap-2 text-sm">
              <span className="flex-1 min-w-0 font-medium truncate">{p.left}</span>
              <span aria-hidden>→</span>
              <select
                className={`${inputCls} w-44`}
                value={map[p.left] ?? ''}
                disabled={locked}
                aria-label={`${p.left} juftligi`}
                onChange={(e) => onChange({ ...map, [p.left]: e.target.value })}
              >
                <option value="">tanlang…</option>
                {rights.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )
    }
    case 'word-order': {
      const chosen = Array.isArray(answer) ? (answer as string[]) : []
      const bankLeft = exercise.bank.filter((w) => chosen.lastIndexOf(w) === -1 || count(exercise.bank, w) > count(chosen, w))
      return (
        <div className="grid gap-3">
          <div className="min-h-12 rounded-xl border bg-[var(--panel-2)] p-2.5 flex flex-wrap gap-1.5">
            {chosen.length === 0 && <span className="text-sm muted">So‘zlarni quyidagi tartibda bosing…</span>}
            {chosen.map((w, i) => (
              <button
                key={`${w}-${i}`}
                type="button"
                disabled={locked}
                onClick={() => onChange(chosen.filter((_, j) => j !== i))}
                className="px-2.5 py-1 rounded-lg bg-navy-700 text-white dark:bg-navy-500 dark:text-navy-950 text-sm font-medium"
                title="Olib tashlash"
              >
                {w}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bankLeft.map((w, i) => (
              <button
                key={`${w}-${i}`}
                type="button"
                disabled={locked}
                onClick={() => onChange([...chosen, w])}
                className="chip cursor-pointer hover:bg-[var(--panel)]"
              >
                {w}
              </button>
            ))}
          </div>
          {exercise.noteUz && <p className="text-[11px] muted">{exercise.noteUz}</p>}
        </div>
      )
    }
    case 'translation':
      return (
        <div className="grid gap-2">
          <p className="font-medium">{exercise.source}</p>
          <input
            className={inputCls}
            value={Array.isArray(answer) ? String(answer[0] ?? '') : String(answer ?? '')}
            disabled={locked}
            placeholder={exercise.sourceLang === 'uz' ? 'Write in English…' : "O'zbekcha yozing…"}
            onChange={(e) => onChange([e.target.value])}
          />
        </div>
      )
  }
}

// --------------------------- yordamchi ---------------------------

function initialAnswer(ex: Exercise): unknown {
  switch (ex.kind) {
    case 'multiple-choice':
      return -1
    case 'true-false-notgiven':
      return ''
    case 'gap-fill':
      return ex.answers.map(() => '')
    case 'matching':
      return {}
    case 'word-order':
      return []
    case 'translation':
      return ['']
  }
}

function skipAnswer(ex: Exercise): unknown {
  return initialAnswer(ex)
}

function isAnswerEmpty(ex: Exercise, a: unknown): boolean {
  switch (ex.kind) {
    case 'multiple-choice':
      return typeof a !== 'number' || a < 0
    case 'true-false-notgiven':
      return !a
    case 'gap-fill':
      return !Array.isArray(a) || a.every((x) => String(x).trim() === '')
    case 'matching':
      return !a || Object.keys(a as object).length < ex.pairs.length || Object.values(a as Record<string, string>).some((v) => !v)
    case 'word-order':
      return !Array.isArray(a) || a.length < ex.answer.length
    case 'translation':
      return !Array.isArray(a) || String(a[0] ?? '').trim() === ''
  }
}

function kindLabel(k: Exercise['kind']): string {
  return {
    'multiple-choice': 'Tanlovi',
    'true-false-notgiven': 'True / False / Not Given',
    matching: 'Juftlik',
    'gap-fill': 'Bo‘shliq',
    'word-order': 'So‘z tartibi',
    translation: 'Tarjima',
  }[k]
}

function count(arr: readonly string[], v: string): number {
  return arr.filter((x) => x === v).length
}

/** Deterministic shuffle — har mashqda bir xil tartib (testlar uchun). */
function shuffle<T>(arr: T[], seed: string): T[] {
  const out = [...arr]
  let h = 2166136261
  for (const ch of seed) h = (h ^ ch.charCodeAt(0)) * 16777619
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    const j = h % (i + 1)
    const t = out[i]!
    out[i] = out[j]!
    out[j] = t
  }
  return out
}

/** Natijaga moslashtirilgan ketma-ketlik uchun rekvizit. */
export function useAdaptiveSequence(total: number) {
  const [order] = useState<number[]>(() => Array.from({ length: total }, (_, i) => i))
  const [pos, setPos] = useState(0)
  const results: CheckResult[] = []
  const advance = (r: CheckResult) => {
    results.push(r)
    return pos
  }
  const next = (lastResult: CheckResult | null) => {
    const idx = nextExerciseIndex(pos, results, total)
    setPos(idx)
    void lastResult
    return idx
  }
  return { order, pos, advance, next }
}
