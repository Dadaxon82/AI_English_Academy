/**
 * Mashq dvigateli — 6 turdagi mashqni ko'rsatadi va tekshiradi.
 *
 * Talablar: javobni tekshirish, xato sababini tushuntirish, keyingi
 * mashqni natijaga moslashtirish. Barcha tugmalar HAQIQIY ishlaydi.
 *
 * KO'RINISH — "dars rejimi" (Duolingo dars ekrani MEXANIKASI, dizayn va
 * qahramon bizniki): tepada yopish + progress + yuraklar, katta topshiriq
 * sarlavhasi, qahramon va gap pufagi (savol / manba matn + talaffuz),
 * raqamli variant kartalari (1–9 tugmalari), so'z plitkalari (chiziqlar
 * ustiga yig'iladi), pastda "TEKSHIRISH" paneli — javobdan keyin yashil /
 * qizil bo'lib, natija va "KEYINGI" tugmasini ko'rsatadi.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getBundle } from '../content'
import type { Exercise } from '../content/types'
import { checkAnswer, type CheckResult } from '../lib/check'
import { xpGain } from '../lib/game'
import { HEART_COMBO_STREAK } from '../lib/gameConfig'
import { playFeedback } from '../lib/feedbackSound'
import { useStore } from '../lib/store'
import { Chip, InfoBanner, inputCls } from './ui'
import { GameIcon } from './icons'
import { MascotExerciseFeedback, MascotFigure } from './Mascot'

export interface ExerciseRunProps {
  exercise: Exercise
  checked: (r: CheckResult, secondsSpent: number) => void
  index: number
  total: number
  onNext: () => void
  prevResult?: CheckResult | null
  /**
   * `true` — bu mashq yurak JARIMA QILMAYDIGAN turdan (mock imtihon,
   * diagnostika, bo'lim testi). Bunday holda yurak darvozasi KO'RSATILMAYDI:
   * o'quvchi yuraklari tugagan bo'lsa ham imtihonni topshira oladi.
   */
  heartFree?: boolean
  /**
   * `true` — sahifa har javobni `actions.recordAttempt(...)` bilan store'ga
   * yozadi, ya'ni o'yin holati (`game.combo`) SHU MASHQLAR hisobidan
   * yangilanadi. Combo chipi faqat shunday holda ko'rsatiladi.
   *
   * Nega prop kerak (SOXTA SONGA QARSHI): `MockExam.tsx` va `Onboarding.tsx`
   * mashq natijasini o'z hisoblariga yozadi, lekin `recordAttempt`
   * CHAQIRMAYDI — demak `data.game.combo` u yerda o'smaydi. Comboni u
   * yerda ko'rsatish o'tgan darsning eski sonini ko'rsatish bo'lardi.
   * Standart `false` — himoyaviy: yangi sahifa qo'shilsa chip chiqmaydi.
   */
  comboTracked?: boolean
  /** Berilsa — tepada "×" (darsdan chiqish) tugmasi chiziladi. */
  onExit?: () => void
  /** Sarlavha ustidagi belgi (masalan «YANGI SO‘Z»); berilsa tur yorlig‘i o‘rnida chiqadi. */
  badge?: string
  /** Belgi rangi: `new` — binafsha (yangi so'z), `fix` — to'q sariq (xatolarni tuzatamiz). */
  badgeTone?: 'new' | 'fix'
  /**
   * Dars ichidagi ketma-ket to'g'ri javoblar (LessonPlayer hisoblaydi). 3 dan
   * boshlab progress ustida "N TA KETMA-KET TO'G'RI" yoziladi va chiziq oltin rangga o'tadi.
   */
  streak?: number
  /** Sarlavha ostida qo'shimcha kontekst (matn / audio tugmasi). */
  context?: ReactNode
  /** Tanlov variantlari rasmlari (emoji) — berilsa variantlar rasmli kartalar bo'ladi. */
  optionIcons?: string[]
  /** `true` — "O‘tkazib yuborish" tugmasi (xato javob sifatida hisoblanadi, to‘g‘ri javob ko‘rsatiladi). */
  skippable?: boolean
}

export default function ExerciseRunner({
  exercise,
  checked,
  index,
  total,
  onNext,
  prevResult,
  heartFree = false,
  comboTracked = false,
  onExit,
  badge,
  badgeTone = 'new',
  streak = 0,
  context,
  optionIcons,
  skippable = false,
}: ExerciseRunProps) {
  const { hearts, data } = useStore()
  const game = data.game
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

  const canCheck = !isAnswerEmpty(exercise, answer)

  // Yurak darvozasi: yuraklar tugagan bo'lsa va bu sinov/sanov bo'lmasa
  // mashq BOSHLANMAYDI — o'quvchi takrorlash darsiga yo'naltiriladi
  // (Dulo'dagi "practice to earn hearts" darvozasi).
  const blocked = hearts.blocked && !heartFree

  const doCheck = (skip?: boolean) => {
    if (state === 'answered' || blocked) return
    // O'tkazib yuborish — bo'sh javob bilan tekshiruv: natija "noto'g'ri",
    // to'g'ri javob esa ko'rsatiladi (son ixtir emas — o'sha `checkAnswer`).
    const r = checkAnswer(exercise, skip ? initialAnswer(exercise) : answer)
    setResult(r)
    setState('answered')
    checked(r, Math.round((Date.now() - startedAt) / 1000))
    // Javob ovozi — Web Audio API bilan sintez qilinadi (`feedbackSound.ts`):
    // fayl yo'q, shuning uchun `public/audio/manifest.json` qoidasi
    // ("fayl bo'lmasa pleyer ko'rsatilmaydi") buzilmaydi. Ovoz sozlamadagi
    // bitta tugma bilan boshqariladi (`settings.motionEnabled`). Brauzer
    // `AudioContext`ni bermasa JIM o'tamiz.
    playFeedback(r.correct ? 'correct' : 'wrong', data.settings.motionEnabled)
  }

  /**
   * Bu javob uchun beriladigan XP — store'dagi hisob BILAN BIR XIL
   * (`xpGain(game, correct, difficulty, now)`), son ixtir qilinmaydi.
   */
  const xpShown = result ? xpGain(game, result.correct, exercise.difficulty, Date.now()) : undefined

  /**
   * Progress chizig'i — necha mashq JAVOB BERILGAN. Tekshirilgan paytdan
   * boshlab chiziq `(index + 1) / total` gacha siljiydi.
   */
  const answeredCount = state === 'answered' ? index + 1 : index
  const progressPct = total > 0 ? Math.min(100, (answeredCount / total) * 100) : 0

  /**
   * Combo chipi — `game.combo` HAQIQIY soni. FAQAT `comboTracked` bo'lsa
   * chiziladi (sahifa javobni `recordAttempt` bilan yozsa).
   */
  const combo = game.combo
  const showCombo = comboTracked && combo >= 2
  const toHeart = combo > 0 && combo % HEART_COMBO_STREAK === 0
  const comboNeeded = HEART_COMBO_STREAK - (combo % HEART_COMBO_STREAK)

  // Klaviatura: Enter — tekshirish / davom etish; 1–9 — variant tanlash.
  const doEnter = state === 'idle' && canCheck ? doCheck : state === 'answered' ? onNext : null
  const optionCount = choiceCount(exercise)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (e.key === 'Enter') {
        if (!doEnter) return
        // Tugma focus bo'lsa brauzer o'zi bosadi — ikki marta bosilmasin.
        if (tag === 'BUTTON') return
        e.preventDefault()
        doEnter()
        return
      }
      if (state !== 'idle' || optionCount === 0 || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= optionCount) {
        e.preventDefault()
        if (exercise.kind === 'multi-select') setAnswer((prev: unknown) => toggleIndex(prev, n - 1))
        else setAnswer(choiceValue(exercise, n - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doEnter, state, optionCount, exercise])

  const prompt = promptOf(exercise)
  const outcomeCls = result ? (result.correct ? 'aea-outcome-correct' : 'aea-outcome-wrong') : ''

  return (
    <div className="aea-lesson grid gap-5">
      {/* ---- Ketma-ket to'g'ri javoblar (dars ichida) ---- */}
      {streak >= 3 && (
        <p className="-mb-3 text-center text-[11px] font-extrabold uppercase tracking-wider text-amber-500 animate-[var(--animate-pop)]">
          {streak} ta ketma-ket to‘g‘ri javob
        </p>
      )}
      {/* ---- Tepa qator: chiqish · progress · yuraklar ---- */}
      <div className="flex items-center gap-3">
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            aria-label="Darsdan chiqish"
            className="shrink-0 inline-grid place-items-center w-9 h-9 rounded-xl muted hover:bg-[var(--panel-2)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
        {/* Progress chizig'i — son matni `aria-valuetext`da (ekranni
            o'qiydigan dastur uchun); mobilda `exBar` + `R.string.ex_index`. */}
        <div
          className={`aea-step-bar flex-1 ${streak >= 3 ? 'aea-step-bar-gold' : ''}`}
          role="progressbar"
          aria-label="Mashq jarayoni"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answeredCount}
          aria-valuetext={`${answeredCount} / ${total} mashq yakunlandi`}
        >
          <span style={{ width: `${progressPct}%` }} />
        </div>
        {hearts.enabled && !heartFree && (
          <span
            className="shrink-0 inline-flex items-center gap-1 font-extrabold tabular-nums text-[var(--heart)]"
            title={`Yuraklar: ${hearts.count}/${hearts.max}`}
            aria-label={`Yuraklar: ${hearts.count} / ${hearts.max}`}
          >
            <GameIcon name="heart" size={22} filled={hearts.count > 0} className={hearts.count > 0 ? '' : 'text-[var(--line)]'} />
            {hearts.count}
          </span>
        )}
      </div>

      {(showCombo || heartFree || hearts.boostActive) && (
        <div className="flex flex-wrap items-center gap-1.5 -mt-2">
          {/* Combo — store'dagi haqiqiy ketma-ket to'g'ri javoblar. */}
          {showCombo && (
            <Chip tone="brand">
              <GameIcon name="flame" size={12} />
              {combo} ketma-ket to‘g‘ri
              {hearts.enabled && !heartFree && hearts.count < hearts.max && !toHeart && <> · yana {comboNeeded} — yurak qaytadi</>}
            </Chip>
          )}
          {heartFree && <Chip tone="ok">Yurak jarimasi yo‘q</Chip>}
          {hearts.boostActive && (
            <Chip tone="brand">
              <GameIcon name="bolt" size={12} /> 2× XP · {hearts.boostMinutesLeft} daq
            </Chip>
          )}
        </div>
      )}

      {blocked && (
        /* Yuraklar tugadi — dars darvozasi. Havolalar HAQIQIY. */
        <InfoBanner tone="warn">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <GameIcon name="heart" size={18} filled={false} className="text-[var(--heart)]" title="Yuraklar tugadi" />
              <b>Yuraklar tugadi</b>
              {hearts.minutesLeft > 0 && <span>· {hearts.minutesLeft} daqiqada bittasi qaytadi</span>}
            </div>
            <p>
              Mashqni davom ettirish uchun yurak kerak. <b>{hearts.practiceNeeded}</b> ta so'zni takrlab bittasini
              qaytarib oling (ketma-ket {HEART_COMBO_STREAK} ta to'g'ri javob ham bitta yurak qaytaradi).
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/vocabulary" className="chip">
                Takrorlash darsini ochish
              </Link>
              <Link to="/settings" className="chip">
                Yuraklarni sozlamada o‘chirish
              </Link>
            </div>
          </div>
        </InfoBanner>
      )}

      {prevResult && !prevResult.correct && (
        <InfoBanner tone="warn">
          Oldingi savolda xato bor edi — shu mavzuni mustahkamlash uchun keyingi mashq tanlandi.
        </InfoBanner>
      )}

      {/* ---- Topshiriq sarlavhasi ---- */}
      <div className="grid gap-1 animate-[var(--animate-fade-in)]">
        <p
          className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider ${
            badge && badgeTone === 'fix' ? 'text-orange-500' : 'text-violet-600 dark:text-violet-400'
          }`}
        >
          {badge ? (
            <>
              <span
                aria-hidden
                className={`inline-grid place-items-center w-5 h-5 rounded-full text-white text-[10px] ${
                  badgeTone === 'fix' ? 'bg-orange-500' : 'bg-violet-500'
                }`}
              >
                {badgeTone === 'fix' ? '↻' : '★'}
              </span>
              {badge}
            </>
          ) : (
            <>
              {kindLabel(exercise.kind)} · qiyinlik {exercise.difficulty}
            </>
          )}
        </p>
        <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">{exercise.instructionUz}</h2>
      </div>

      {context}

      {'passageExcerpt' in exercise && exercise.passageExcerpt && (
        <blockquote className="rounded-2xl border-2 bg-[var(--panel-2)] p-3.5 text-sm italic">“{exercise.passageExcerpt}”</blockquote>
      )}

      {/* ---- Qahramon + gap pufagi (savol / manba matn) ---- */}
      {prompt && (
        <div className="flex items-end gap-2 sm:gap-3">
          <MascotFigure className="shrink-0" maxHeight="max-h-24 sm:max-h-32" alt="" />
          <div className="relative mb-6 sm:mb-8 rounded-2xl border-2 bg-[var(--panel)] px-3.5 py-2.5 min-w-0 flex items-center gap-2">
            <span
              aria-hidden
              className="absolute -left-[7px] bottom-4 w-3 h-3 rotate-45 border-l-2 border-b-2 bg-[var(--panel)]"
            />
            {prompt.lang === 'en' && <SpeakIcon text={prompt.text} />}
            <p className="font-semibold break-words" lang={prompt.lang === 'en' ? 'en' : 'uz'}>
              {prompt.text}
            </p>
          </div>
        </div>
      )}

      <AnswerInput
        key={exercise.id}
        exercise={exercise}
        answer={answer}
        onChange={setAnswer}
        locked={state === 'answered'}
        icons={optionIcons}
      />

      {/* ---- Pastki panel: TEKSHIRISH / natija + KEYINGI ---- */}
      <div
        className={`mt-1 rounded-2xl border-2 px-3.5 sm:px-5 py-3.5 sm:py-4 grid gap-3 transition-colors ${
          result
            ? result.correct
              ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700'
              : 'bg-rose-50 border-rose-300 dark:bg-rose-950/30 dark:border-rose-700'
            : 'bg-[var(--panel-2)]'
        }`}
      >
        {state === 'answered' && result && (
          <div className={outcomeCls}>
            <MascotExerciseFeedback bare correct={result.correct} expected={result.expected} whyUz={result.whyUz} xp={xpShown} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {state === 'idle' && skippable && (
            <button
              type="button"
              className="rounded-2xl border-2 border-b-4 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wide muted bg-[var(--panel)] hover:bg-[var(--panel-2)] disabled:opacity-40"
              onClick={() => doCheck(true)}
              disabled={blocked}
            >
              O‘tkazib yuborish
            </button>
          )}
          {state === 'idle' && !skippable && (
            <button
              type="button"
              className="text-xs font-extrabold uppercase tracking-wide muted hover:underline disabled:opacity-40"
              onClick={() => setAnswer(initialAnswer(exercise))}
              disabled={!canCheck}
            >
              Javobni tozalash
            </button>
          )}
          <span className="flex-1" />
          {state === 'idle' ? (
            <button
              type="button"
              onClick={() => doCheck()}
              disabled={!canCheck || blocked}
              className={`${chunkyBtn} ${
                canCheck && !blocked
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-700'
                  : 'bg-slate-200 text-slate-400 border-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
              }`}
            >
              Tekshirish
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className={`${chunkyBtn} text-white ${
                result?.correct ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700' : 'bg-rose-500 hover:bg-rose-400 border-rose-700'
              }`}
            >
              {index + 1 < total ? 'Keyingi mashq' : 'Yakunlash'}
            </button>
          )}
        </div>
        <p className="text-[11px] muted hidden sm:block">
          Klaviatura: <b>Enter</b> — {state === 'idle' ? 'tekshirish' : 'davom etish'}
          {state === 'idle' && optionCount > 0 && (
            <>
              , <b>1–{optionCount}</b> — variant tanlash
            </>
          )}
          .
        </p>
      </div>
    </div>
  )
}

/** Katta "3D" tugma (pastki chegara — chuqurlik). */
const chunkyBtn =
  'min-w-32 sm:min-w-40 inline-flex items-center justify-center rounded-2xl px-4 sm:px-6 py-3 text-sm font-extrabold uppercase tracking-wide ' +
  'border-b-4 transition-all active:translate-y-0.5 active:border-b-2 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:cursor-not-allowed'

/** Variant kartasi (raqamli belgi bilan). */
const cardCls =
  'aea-choice w-full flex items-center gap-3 rounded-2xl border-2 border-b-4 px-3.5 py-3 text-sm sm:text-base text-left ' +
  'bg-[var(--panel)] disabled:cursor-default'
const cardOn = 'border-navy-400 bg-navy-50 text-navy-800 dark:bg-navy-900/40 dark:text-navy-100 dark:border-navy-500 font-bold'

/** So'z plitkasi. */
const tileCls =
  'aea-choice inline-flex items-center rounded-xl border-2 border-b-4 px-3 py-1.5 text-sm sm:text-base font-semibold ' +
  'bg-[var(--panel)] disabled:cursor-default'

/** Gap pufagidagi karnay — matnni brauzer TTS bilan o'qiydi (fayl yo'q). */
function SpeakIcon({ text }: { text: string }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return (
    <button
      type="button"
      aria-label={`Tinglash: ${text}`}
      title="Tinglash"
      onClick={() => {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'en-US'
        u.rate = 0.92
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
      }}
      className="shrink-0 inline-grid place-items-center w-8 h-8 rounded-lg text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  )
}

function NumBadge({ n, on }: { n: number; on: boolean }) {
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

function AnswerInput({
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
                    aria-label={`${i + 1}-bo‘shliq`}
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
        <div className="grid gap-2.5" role="group" aria-label="Javob variantlari (bir nechtasi)">
          <p className="text-xs font-bold muted text-center">Barcha to‘g‘ri javoblarni belgilang — bittadan ko‘p bo‘ladi.</p>
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
            placeholder={exercise.maxWords ? `Javob (${exercise.maxWords} so‘zgacha)…` : 'Javobingiz…'}
            onChange={(e) => onChange([e.target.value])}
          />
        </div>
      )
  }
}

/** Ro'yxatdagi indeksni qo'shish/olib tashlash (multi-select). */
function toggleIndex(prev: unknown, i: number): number[] {
  const arr = Array.isArray(prev) ? (prev as number[]) : []
  return arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i].sort((a, b) => a - b)
}

/**
 * Ochiluvchi ro'yxat: gap ichidagi bo'shliqni bosing — pastda shu bo'shliq
 * variantlari chiqadi. Tanlangach keyingi bo'sh bo'shliq avtomatik ochiladi.
 */
function DropdownInput({
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
function SequenceInput({
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
function CategorizeInput({
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

/**
 * So'z plitkalari: yuqorida chiziqlar ustida tanlangan so'zlar (bosilsa
 * qaytadi), pastda bank — ishlatilgan plitka o'rnida bo'sh "soya" qoladi.
 */
function TileBuilder({
  bank,
  chosen,
  onChange,
  locked,
  note,
}: {
  bank: readonly string[]
  chosen: string[]
  onChange: (v: string[]) => void
  locked: boolean
  note?: string
}) {
  // Har bank indeksi ishlatilganmi (bir xil so'z ikki marta bo'lsa ham to'g'ri).
  const usedIdx = new Set<number>()
  for (const w of chosen) {
    const i = bank.findIndex((b, j) => b === w && !usedIdx.has(j))
    if (i > -1) usedIdx.add(i)
  }
  return (
    <div className="grid gap-5">
      <div
        className="min-h-[6.5rem] flex flex-wrap content-start gap-2 py-1.5 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_3rem,var(--border)_3rem,var(--border)_calc(3rem+2px))]"
        aria-label="Javob"
      >
        {chosen.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            disabled={locked}
            onClick={() => onChange(chosen.filter((_, j) => j !== i))}
            className={`${tileCls} hover:bg-[var(--panel-2)]`}
            title="Olib tashlash"
          >
            {w}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {bank.map((w, i) =>
          usedIdx.has(i) ? (
            <span key={`${w}-${i}`} aria-hidden className="inline-flex rounded-xl px-3 py-1.5 text-sm sm:text-base bg-[var(--panel-2)] text-transparent select-none border-2 border-transparent">
              {w}
            </span>
          ) : (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={locked}
              onClick={() => onChange([...chosen, w])}
              className={`${tileCls} hover:bg-[var(--panel-2)]`}
            >
              {w}
            </button>
          ),
        )}
      </div>
      {note && <p className="text-[11px] muted text-center">{note}</p>}
    </div>
  )
}

/** Juftlik: ikki ustun plitkalar — chapdan bittasini, so'ng o'ngdan juftini bosing. */
function MatchingInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'matching' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const map = (answer ?? {}) as Record<string, string>
  const rights = useMemo(() => shuffle(exercise.pairs.map((p) => p.right), exercise.id), [exercise])
  const [pick, setPick] = useState<string | null>(null)
  const lefts = exercise.pairs.map((p) => p.left)
  const pairNo = (left: string) => lefts.filter((l) => map[l]).indexOf(left) + 1
  const leftOfRight = (r: string) => lefts.find((l) => map[l] === r)

  const tapLeft = (l: string) => {
    if (map[l]) {
      const next = { ...map }
      delete next[l]
      onChange(next)
      setPick(null)
      return
    }
    setPick(pick === l ? null : l)
  }
  const tapRight = (r: string) => {
    const owner = leftOfRight(r)
    if (owner) {
      const next = { ...map }
      delete next[owner]
      onChange(next)
      return
    }
    if (!pick) return
    onChange({ ...map, [pick]: r })
    setPick(null)
  }

  const tone = (paired: boolean, picked: boolean) =>
    picked ? cardOn : paired ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-600' : 'hover:bg-[var(--panel-2)]'

  return (
    <div className="grid gap-2">
      <p className="text-xs muted text-center">Chapdan so‘zni, so‘ng o‘ngdan uning juftini bosing. Juftni bekor qilish uchun yana bosing.</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-2.5 content-start">
          {lefts.map((l) => (
            <button
              key={l}
              type="button"
              disabled={locked}
              aria-pressed={pick === l || Boolean(map[l])}
              aria-label={map[l] ? `${l} — ${map[l]} bilan juftlangan` : l}
              onClick={() => tapLeft(l)}
              className={`${cardCls} justify-center ${tone(Boolean(map[l]), pick === l)}`}
            >
              {map[l] && <span className="text-xs font-extrabold text-sky-600">{pairNo(l)}</span>}
              <span className="text-center break-words">{l}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-2.5 content-start">
          {rights.map((r) => {
            const owner = leftOfRight(r)
            return (
              <button
                key={r}
                type="button"
                disabled={locked || (!pick && !owner)}
                aria-pressed={Boolean(owner)}
                onClick={() => tapRight(r)}
                className={`${cardCls} justify-center ${tone(Boolean(owner), false)}`}
              >
                {owner && <span className="text-xs font-extrabold text-sky-600">{pairNo(owner)}</span>}
                <span className="text-center break-words">{r}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Tarjima: standart — so'z plitkalari (birinchi qabul qilinadigan javob
 * so'zlari + shu darajadagi lug'atdan 2–3 chalg'ituvchi so'z, deterministik).
 * "Klaviatura bilan yozish" — erkin matn (boshqa to'g'ri variantlar uchun).
 */
function TranslationInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'translation' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const [typing, setTyping] = useState(false)
  const bank = useMemo(() => translationBank(exercise), [exercise])
  const text = Array.isArray(answer) ? String(answer[0] ?? '') : String(answer ?? '')
  const chosen = text.trim() === '' ? [] : text.trim().split(/\s+/)

  return (
    <div className="grid gap-3">
      {typing || bank.length === 0 ? (
        <textarea
          className={`${inputCls} min-h-28 text-base rounded-2xl border-2`}
          value={text}
          disabled={locked}
          aria-label="Tarjima"
          placeholder={exercise.sourceLang === 'uz' ? 'Write in English…' : "O'zbekcha yozing…"}
          onChange={(e) => onChange([e.target.value])}
        />
      ) : (
        <TileBuilder bank={bank} chosen={chosen} onChange={(ws) => onChange([ws.join(' ')])} locked={locked} />
      )}
      {!locked && bank.length > 0 && (
        <button
          type="button"
          className="justify-self-center text-xs font-extrabold uppercase tracking-wide text-navy-700 dark:text-navy-300 hover:underline"
          onClick={() => {
            setTyping((v) => !v)
            onChange([''])
          }}
        >
          {typing ? 'So‘z plitkalari bilan' : 'Klaviatura bilan yozish'}
        </button>
      )}
    </div>
  )
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
    case 'multi-select':
      return []
    case 'dropdown-cloze':
      return ex.answers.map(() => '')
    case 'sequence':
      return []
    case 'categorize':
      return {}
    case 'short-answer':
      return ['']
  }
}

const TFNG: { v: 'true' | 'false' | 'notgiven'; label: string }[] = [
  { v: 'true', label: 'True — to‘g‘ri' },
  { v: 'false', label: 'False — noto‘g‘ri' },
  { v: 'notgiven', label: 'Not Given — matnda yo‘q' },
]

/** Raqamli variantlar soni (1–9 tugmalari uchun); variantsiz turda 0. */
function choiceCount(ex: Exercise): number {
  if (ex.kind === 'multiple-choice') return Math.min(9, ex.options.length)
  if (ex.kind === 'true-false-notgiven') return TFNG.length
  if (ex.kind === 'multi-select') return Math.min(9, ex.options.length)
  return 0
}

function choiceLabels(ex: Exercise): string[] {
  if (ex.kind === 'multiple-choice') return ex.options
  if (ex.kind === 'true-false-notgiven') return TFNG.map((o) => o.label)
  return []
}

/** i-variant tanlanganda javob qiymati (tekshiruvchi kutgan shaklda). */
function choiceValue(ex: Exercise, i: number): unknown {
  if (ex.kind === 'true-false-notgiven') return TFNG[i]?.v ?? ''
  return i
}

/** Gap pufagidagi matn: savol, da'vo yoki tarjima manbasi. */
function promptOf(ex: Exercise): { text: string; lang: 'en' | 'uz' } | null {
  switch (ex.kind) {
    case 'multiple-choice':
      return ex.question.trim() ? { text: ex.question, lang: guessLang(ex.question) } : null
    case 'true-false-notgiven':
      return ex.statement.trim() ? { text: ex.statement, lang: 'en' } : null
    case 'translation':
      return ex.source.trim() ? { text: ex.source, lang: ex.sourceLang } : null
    case 'multi-select':
    case 'short-answer':
      return ex.question.trim() ? { text: ex.question, lang: guessLang(ex.question) } : null
    default:
      return null
  }
}

/**
 * Savol tili — faqat talaffuz tugmasi uchun (inglizcha bo'lsa ko'rsatiladi).
 * Tipik o'zbekcha so'zlar bo'lsa — o'zbekcha ("teacher’s" kabi inglizcha
 * apostrof o'zbekcha belgisi hisoblanmaydi).
 */
function guessLang(text: string): 'en' | 'uz' {
  const a = "[ʻ‘’']"
  const uz = new RegExp(
    `(^|\\s)(qaysi|nima|kim|qanday|nechta|qayerda|qachon|nega|so${a}z|gap|to${a}g${a}ri|ma${a}no|bilan|uchun|emas|yo${a}q|bor|qiling|tanlang)(?=$|[\\s.,?!])`,
    'i',
  )
  return uz.test(text) ? 'uz' : 'en'
}

/**
 * Tarjima plitkalari: birinchi qabul qilinadigan javob so'zlari + shu
 * daraja lug'atidan 3 tagacha chalg'ituvchi so'z (deterministik aralash).
 * Javob so'zlari ichida bo'lgan so'z chalg'ituvchi bo'lmaydi.
 */
function translationBank(ex: Extract<Exercise, { kind: 'translation' }>): string[] {
  const words = (ex.accepted[0] ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lower = new Set(words.map((w) => w.toLowerCase()))
  const pool = getBundle(ex.level)
    .vocab.map((v) => (ex.sourceLang === 'uz' ? v.word : v.translationUz))
    .filter((w) => /^[^\s]+$/.test(w) && !lower.has(w.toLowerCase()))
  const extra = shuffle(Array.from(new Set(pool)), ex.id).slice(0, 3)
  return shuffle([...words, ...extra], `${ex.id}:bank`)
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
    case 'multi-select':
      return !Array.isArray(a) || a.length === 0
    case 'dropdown-cloze':
      return !Array.isArray(a) || a.some((x) => String(x).trim() === '')
    case 'sequence':
      return !Array.isArray(a) || a.length < ex.items.length
    case 'categorize':
      return !a || typeof a !== 'object' || Object.keys(a as object).length < ex.sortItems.length
    case 'short-answer':
      return !Array.isArray(a) || String(a[0] ?? '').trim() === ''
  }
}

function kindLabel(k: Exercise['kind']): string {
  return {
    'multiple-choice': 'Tanlov',
    'true-false-notgiven': 'True / False / Not Given',
    matching: 'Juftlik',
    'gap-fill': 'Bo‘shliq',
    'word-order': 'So‘z tartibi',
    translation: 'Tarjima',
    'multi-select': 'Bir nechta javob',
    'dropdown-cloze': 'Ro‘yxatdan tanlash',
    sequence: 'Ketma-ketlik',
    categorize: 'Saralash',
    'short-answer': 'Qisqa javob',
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

/* Eski `useAdaptiveSequence` rekviziti o'chirildi: hech bir sahisha
   ishlatmasdi (Grammar o'zi nextExerciseIndex chaqiradi) va natija
   ro'yxatini har renderda qayta yasardi — chalkashlik manbai. */
