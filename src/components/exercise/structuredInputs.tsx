/** Tuzilmali javoblar: ochiluvchi ro'yxat, ketma-ketlik, saralash. */
import { useState } from 'react'
import type { Exercise } from '../../content/types'
import { cardCls, cardOn, tileCls } from './styles'
/**
 * Ochiluvchi ro'yxat: gap ichidagi bo'shliqni bosing — pastda shu bo'shliq
 * variantlari chiqadi. Tanlangach keyingi bo'sh bo'shliq avtomatik ochiladi.
 */
export function DropdownInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'dropdown-cloze' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const arr = Array.isArray(answer) ? (answer as string[]) : exercise.answers.map(() => '')
  const [active, setActive] = useState(0)
  const parts = exercise.text.split('___')
  const pick = (v: string) => {
    const next = [...arr]
    next[active] = v
    onChange(next)
    const empty = next.findIndex((x, i) => i !== active && !String(x).trim())
    if (empty > -1) setActive(empty)
  }
  return (
    <div className="grid gap-4">
      <p className="text-base sm:text-lg leading-[2.8rem] font-medium" lang="en">
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 && (
              <button
                type="button"
                disabled={locked}
                onClick={() => setActive(i)}
                aria-label={`${i + 1}-bo‘shliq: ${arr[i] || 'tanlanmagan'}`}
                aria-pressed={active === i}
                className={`mx-1 inline-flex items-center gap-1 rounded-xl border-2 border-b-4 px-3 py-0.5 font-bold align-middle ${
                  active === i && !locked
                    ? 'border-navy-400 bg-navy-50 text-navy-800 dark:bg-navy-900/40 dark:text-navy-100'
                    : arr[i]
                      ? 'bg-[var(--panel)]'
                      : 'bg-[var(--panel-2)] muted'
                }`}
              >
                {arr[i] || '…'} <span aria-hidden className="text-xs">▾</span>
              </button>
            )}
          </span>
        ))}
      </p>
      {!locked && (
        <div className="grid gap-1.5">
          <p className="text-xs font-bold muted text-center">{active + 1}-bo‘shliq uchun tanlang:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {(exercise.choices[active] ?? []).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pick(c)}
                className={`${tileCls} ${arr[active] === c ? cardOn : 'hover:bg-[var(--panel-2)]'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Ketma-ketlik: kartani bosing — u navbatdagi raqamli joyga tushadi; joydagisini bosing — qaytadi. */
export function SequenceInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'sequence' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const chosen = Array.isArray(answer) ? (answer as string[]) : []
  const left = exercise.itemsShuffled.filter((it) => !chosen.includes(it))
  return (
    <div className="grid gap-4">
      {exercise.question && <p className="text-sm font-semibold text-center">{exercise.question}</p>}
      <ol className="grid gap-2" aria-label="Sizning tartibingiz">
        {exercise.items.map((_, i) => {
          const it = chosen[i]
          return (
            <li key={i} className="flex items-center gap-2">
              <span className="shrink-0 w-7 text-right font-extrabold tabular-nums muted">{i + 1}.</span>
              {it ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onChange(chosen.filter((x) => x !== it))}
                  className={`${cardCls} hover:bg-[var(--panel-2)]`}
                  title="Olib tashlash"
                >
                  <span lang="en">{it}</span>
                </button>
              ) : (
                <span className="flex-1 h-12 rounded-2xl border-2 border-dashed" aria-hidden />
              )}
            </li>
          )
        })}
      </ol>
      {left.length > 0 && (
        <div className="grid gap-2">
          {left.map((it) => (
            <button
              key={it}
              type="button"
              disabled={locked}
              onClick={() => onChange([...chosen, it])}
              className={`${cardCls} hover:bg-[var(--panel-2)]`}
            >
              <span lang="en">{it}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Saralash: so'zni bosing, so'ng guruhni bosing. Guruhdagi so'zni bosing — qaytadi. */
export function CategorizeInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'categorize' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const map = (answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {}) as Record<string, number>
  const [pick, setPick] = useState<string | null>(null)
  const pool = exercise.sortItems.filter((it) => map[it.text] === undefined)
  const place = (ci: number) => {
    if (!pick) return
    onChange({ ...map, [pick]: ci })
    setPick(null)
  }
  const remove = (text: string) => {
    const next = { ...map }
    delete next[text]
    onChange(next)
  }
  return (
    <div className="grid gap-4">
      <p className="text-xs font-bold muted text-center">So‘zni bosing, so‘ng uning guruhini bosing.</p>
      <div className={`grid gap-2.5 ${exercise.categories.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {exercise.categories.map((c, ci) => (
          <div
            key={c}
            className={`rounded-2xl border-2 border-b-4 p-2 grid content-start gap-1.5 min-h-28 ${
              pick ? 'border-navy-300 bg-navy-50/50 dark:bg-navy-900/20' : 'bg-[var(--panel)]'
            }`}
          >
            <button
              type="button"
              disabled={locked || !pick}
              onClick={() => place(ci)}
              className="rounded-xl px-2 py-1.5 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-violet-600 dark:text-violet-400 disabled:cursor-default enabled:hover:bg-violet-50 dark:enabled:hover:bg-violet-950/30"
            >
              {c}
            </button>
            {exercise.sortItems
              .filter((it) => map[it.text] === ci)
              .map((it) => (
                <button
                  key={it.text}
                  type="button"
                  disabled={locked}
                  onClick={() => remove(it.text)}
                  className="rounded-xl border-2 px-2 py-1 text-sm font-semibold bg-[var(--panel-2)] break-words"
                  title="Qaytarish"
                >
                  {it.text}
                </button>
              ))}
          </div>
        ))}
      </div>
      {pool.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {pool.map((it) => (
            <button
              key={it.text}
              type="button"
              disabled={locked}
              aria-pressed={pick === it.text}
              onClick={() => setPick(pick === it.text ? null : it.text)}
              className={`${tileCls} ${pick === it.text ? cardOn : 'hover:bg-[var(--panel-2)]'}`}
            >
              {it.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
