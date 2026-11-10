/** Asosiy javob kiritish (variantlar, matn, TFNG, ko'p tanlov). */
import type { Exercise } from '../../content/types'
import { inputCls } from '../ui'
import { choiceLabels, choiceValue, count, toggleIndex } from './helpers'
import { cardCls, cardOn, tileCls } from './styles'
import { CategorizeInput, DropdownInput, SequenceInput } from './structuredInputs'
import { MatchingInput, TileBuilder, TranslationInput } from './tileInputs'
/** Gap pufagidagi karnay — matnni brauzer TTS bilan o'qiydi (fayl yo'q). */
export function SpeakIcon({ text }: { text: string }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return (
    <button
      type="button"
      aria-label={`Tinglaş: ${text}`}
      title="Tinglaş"
      onClick={() => {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'en-US'
        u.rate = 0.92
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
      }}
      className="shrink-0 inline-grid place-items-center w-8 h-8 rounded-lg text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  )
}

export function NumBadge({ n, on }: { n: number; on: boolean }) {
  return (
    <span
      aria-hidden
      className={`shrink-0 inline-grid place-items-center w-7 h-7 rounded-lg border-2 text-xs font-bold ${
        on ? 'border-navy-400 text-navy-700 dark:text-navy-200' : 'muted'
      }`}
    >
      {n}
    </span>
  )
}

// --------------------------- Javob kiritish ---------------------------

export function AnswerInput({
  exercise,
  answer,
  onChange,
  locked,
  icons,
}: {
  exercise: Exercise
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
  icons?: string[]
}) {
  switch (exercise.kind) {
    case 'multiple-choice':
    case 'true-false-notgiven': {
      const opts = choiceLabels(exercise)
      const chosen = answer
      if (icons && icons.length === opts.length) {
        return (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3" role="radiogroup" aria-label="Javob variantlari">
            {opts.map((label, i) => {
              const on = chosen === choiceValue(exercise, i)
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={locked}
                  onClick={() => onChange(choiceValue(exercise, i))}
                  className={`aea-choice flex flex-col rounded-2xl border-2 border-b-4 p-2.5 sm:p-3 bg-[var(--panel)] ${
                    on ? cardOn : 'hover:bg-[var(--panel-2)]'
                  }`}
                >
                  <span aria-hidden className="grid place-items-center h-20 sm:h-28 text-5xl sm:text-7xl select-none">
                    {icons[i]}
                  </span>
                  <span className="flex items-center justify-between gap-1 pt-2">
                    <span className="text-sm sm:text-base font-semibold break-words text-left">{label}</span>
                    <NumBadge n={i + 1} on={on} />
                  </span>
                </button>
              )
            })}
          </div>
        )
      }
      return (
        <div className="grid gap-2.5" role="radiogroup" aria-label="Javob variantlari">
          {opts.map((label, i) => {
            const on = chosen === choiceValue(exercise, i)
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={locked}
                onClick={() => onChange(choiceValue(exercise, i))}
                className={`${cardCls} ${on ? cardOn : 'hover:bg-[var(--panel-2)]'}`}
              >
                <NumBadge n={i + 1} on={on} />
                <span className="flex-1 text-center">{label}</span>
                <span className="w-7 shrink-0" aria-hidden />
              </button>
            )
          })}
        </div>
      )
    }
    case 'gap-fill': {
      const arr = Array.isArray(answer) ? (answer as string[]) : exercise.answers.map(() => '')
      const parts = exercise.text.split('___')
      return (
        <div className="grid gap-4">
          <p className="text-base sm:text-lg leading-[2.6rem] font-medium">
            {parts.map((p, i) => (
              <span key={i}>
                {p}
                {i < parts.length - 1 && (
                  <input
                    className="inline-block w-28 mx-1 px-2 py-0.5 text-center font-bold bg-transparent border-0 border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none"
                    value={arr[i] ?? ''}
                    disabled={locked}
                    aria-label={`${i + 1}-böşliq`}
                    onChange={(e) => {
                      const next = [...arr]
                      next[i] = e.target.value
                      onChange(next)
                    }}
                    placeholder="…"
                  />
                )}
              </span>
            ))}
          </p>
          {exercise.wordBank && (
            <div className="flex flex-wrap justify-center gap-2">
              {exercise.wordBank.map((w, bi) => {
                const used = count(arr, w) > count(exercise.wordBank!.slice(0, bi), w)
                return (
                  <button
                    key={`${w}-${bi}`}
                    type="button"
                    disabled={locked || used}
                    // Tugma ENG BIRINCHI BO'SH bo'shliqqa yozadi.
                    onClick={() => {
                      const next = [...arr]
                      const slot = next.findIndex((x) => String(x).trim() === '')
                      if (slot > -1) next[slot] = w
                      else next.push(w)
                      onChange(next)
                    }}
                    className={`${tileCls} ${used ? 'opacity-40' : 'hover:bg-[var(--panel-2)]'}`}
                  >
                    {w}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }
    case 'matching':
      return <MatchingInput exercise={exercise} answer={answer} onChange={onChange} locked={locked} />
    case 'word-order':
      return (
        <TileBuilder
          bank={exercise.bank}
          chosen={Array.isArray(answer) ? (answer as string[]) : []}
          onChange={onChange}
          locked={locked}
          note={exercise.noteUz}
        />
      )
    case 'translation':
      return <TranslationInput exercise={exercise} answer={answer} onChange={onChange} locked={locked} />
    case 'multi-select': {
      const chosen = Array.isArray(answer) ? (answer as number[]) : []
      return (
        <div className="grid gap-2.5" role="group" aria-label="Javob variantlari (bir neçtasi)">
          <p className="text-xs font-bold muted text-center">Barça töğri javoblarni belgilang — bittadan köp böladi.</p>
          {exercise.options.map((label, i) => {
            const on = chosen.includes(i)
            return (
              <button
                key={i}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={locked}
                onClick={() => onChange(toggleIndex(chosen, i))}
                className={`${cardCls} ${on ? cardOn : 'hover:bg-[var(--panel-2)]'}`}
              >
                <span
                  aria-hidden
                  className={`shrink-0 inline-grid place-items-center w-7 h-7 rounded-lg border-2 text-sm font-extrabold ${
                    on ? 'bg-navy-500 border-navy-500 text-white' : 'muted'
                  }`}
                >
                  {on ? '✓' : i + 1}
                </span>
                <span className="flex-1 text-center">{label}</span>
                <span className="w-7 shrink-0" aria-hidden />
              </button>
            )
          })}
        </div>
      )
    }
    case 'dropdown-cloze':
      return <DropdownInput exercise={exercise} answer={answer} onChange={onChange} locked={locked} />
    case 'sequence':
      return <SequenceInput exercise={exercise} answer={answer} onChange={onChange} locked={locked} />
    case 'categorize':
      return <CategorizeInput exercise={exercise} answer={answer} onChange={onChange} locked={locked} />
    case 'short-answer':
      return (
        <div className="grid gap-2">
          <input
            className={`${inputCls} text-base rounded-2xl border-2 py-3`}
            value={Array.isArray(answer) ? String(answer[0] ?? '') : String(answer ?? '')}
            disabled={locked}
            aria-label="Qisqa javob"
            autoComplete="off"
            spellCheck={false}
            placeholder={exercise.maxWords ? `Javob (${exercise.maxWords} sözgaça)…` : 'Javobingiz…'}
            onChange={(e) => onChange([e.target.value])}
          />
        </div>
      )
  }
}

/** Ro'yxatdagi indeksni qo'shish/olib tashlash (multi-select). */
