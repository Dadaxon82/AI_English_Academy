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

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Exercise } from '../content/types'
import { checkAnswer, type CheckResult } from '../lib/check'
import { nowMs, secondsSince } from '../lib/clock'
import { xpGain } from '../lib/game'
import { HEART_COMBO_STREAK } from '../lib/gameConfig'
import { playFeedback } from '../lib/feedbackSound'
import { useStore } from '../lib/storeContext'
import { Chip, InfoBanner } from './ui'
import { GameIcon } from './icons'
import { MascotExerciseFeedback, MascotFigure } from './Mascot'
import { choiceCount, choiceValue, initialAnswer, isAnswerEmpty, kindLabel, promptOf, toggleIndex } from './exercise/helpers'
import { AnswerInput, SpeakIcon } from './exercise/inputs'
import { CHUNKY_GO, CHUNKY_NO, CHUNKY_OFF } from './chunky'
import { chunkyBtn } from './exercise/styles'

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
  // Mashq ko'ringan vaqt — effect'da yoziladi (render sof qoladi), faqat
  // tekshirish ishlovchisida o'qiladi.
  const startedAt = useRef(0)
  useEffect(() => {
    startedAt.current = nowMs()
  }, [exercise.id])
  const [lastExerciseId, setLastExerciseId] = useState(exercise.id)
  /** Bu javob uchun XP — tekshirish paytida hisoblanadi (pastga qarang). */
  const [xpShown, setXpShown] = useState<number | undefined>(undefined)

  // Mashq o'zgarsa holat tozalanadi (React rasmiy "state reset during render"
  // namuni — effect'dan ko'ra bir qadam tezroq va izchil).
  if (exercise.id !== lastExerciseId) {
    setLastExerciseId(exercise.id)
    setState('idle')
    setResult(null)
    setXpShown(undefined)
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
    // XP — store'dagi hisob BILAN BIR XIL (`xpGain(game, correct, difficulty, now)`),
    // javob yozilishidan OLDINGI o'yin holati bilan (reducer ham shuni ishlatadi).
    setXpShown(xpGain(game, r.correct, exercise.difficulty, nowMs()))
    checked(r, secondsSince(startedAt.current))
    // Javob ovozi — Web Audio API bilan sintez qilinadi (`feedbackSound.ts`):
    // fayl yo'q, shuning uchun `public/audio/manifest.json` qoidasi
    // ("fayl bo'lmasa pleyer ko'rsatilmaydi") buzilmaydi. Ovoz sozlamadagi
    // bitta tugma bilan boshqariladi (`settings.motionEnabled`). Brauzer
    // `AudioContext`ni bermasa JIM o'tamiz.
    playFeedback(r.correct ? 'correct' : 'wrong', data.settings.motionEnabled)
  }


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
        <p className="-mb-3 text-center text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 animate-[var(--animate-pop)]">
          {streak} ta ketma-ket töğri javob
        </p>
      )}
      {/* ---- Tepa qator: chiqish · progress · yuraklar ---- */}
      <div className="flex items-center gap-3">
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            aria-label="Darsdan çiqiş"
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
          aria-label="Maşq jarayoni"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answeredCount}
          aria-valuetext={`${answeredCount} / ${total} maşq yakunlandi`}
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
              {combo} ketma-ket töğri
              {hearts.enabled && !heartFree && hearts.count < hearts.max && !toHeart && <> · yana {comboNeeded} — yurak qaytadi</>}
            </Chip>
          )}
          {heartFree && <Chip tone="ok">Yurak jarimasi yöq</Chip>}
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
              Maşqni davom ettiriş uçun yurak kerak. <b>{hearts.practiceNeeded}</b> ta sözni takrlab bittasini
              qaytarib oling (ketma-ket {HEART_COMBO_STREAK} ta töğri javob ham bitta yurak qaytaradi).
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/vocabulary" className="chip">
                Takrorlaş darsini oçiş
              </Link>
              <Link to="/settings" className="chip">
                Yuraklarni sozlamada öçiriş
              </Link>
            </div>
          </div>
        </InfoBanner>
      )}

      {prevResult && !prevResult.correct && (
        <InfoBanner tone="warn">
          Oldingi savolda xato bor edi — şu mavzuni mustahkamlaş uçun keyingi maşq tanlandi.
        </InfoBanner>
      )}

      {/* ---- Topshiriq sarlavhasi ---- */}
      <div className="grid gap-1 animate-[var(--animate-fade-in)]">
        <p
          className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider ${
            badge && badgeTone === 'fix' ? 'text-orange-700 dark:text-orange-400' : 'text-violet-600 dark:text-violet-400'
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
              Ötkazib yuboriş
            </button>
          )}
          {state === 'idle' && !skippable && (
            <button
              type="button"
              className="text-xs font-extrabold uppercase tracking-wide muted hover:underline disabled:opacity-40"
              onClick={() => setAnswer(initialAnswer(exercise))}
              disabled={!canCheck}
            >
              Javobni tozalaş
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
                  ? CHUNKY_GO
                  : CHUNKY_OFF
              }`}
            >
              Tekşiriş
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className={`${chunkyBtn} ${result?.correct ? CHUNKY_GO : CHUNKY_NO}`}
            >
              {index + 1 < total ? 'Keyingi maşq' : 'Yakunlaş'}
            </button>
          )}
        </div>
        <p className="text-[11px] muted hidden sm:block">
          Klaviatura: <b>Enter</b> — {state === 'idle' ? 'tekşiriş' : 'davom etiş'}
          {state === 'idle' && optionCount > 0 && (
            <>
              , <b>1–{optionCount}</b> — variant tanlaş
            </>
          )}
          .
        </p>
      </div>
    </div>
  )
}
