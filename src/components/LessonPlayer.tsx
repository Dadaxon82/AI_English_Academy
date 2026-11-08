/**
 * Dars o'yinchisi — Duolingo dars MEXANIKASI (dizayn va qahramon bizniki):
 *  - qadamlar ketma-ket: info kartasi / mashq / gapirish;
 *  - dars ichida ketma-ket to'g'ri javoblar — progress ustida yoziladi;
 *  - xato qilingan mashq dars oxirida yana bir marta beriladi
 *    («XATOLARNI TUZATAMIZ»);
 *  - yakunda «Dars tugadi!»: XP, aniqlik (birinchi urinishlar bo'yicha),
 *    «Darsni ko'rib chiqish» ro'yxati.
 *
 * HAQIQIY HISOB: har javob `recordAttempt(source: 'practice')` — XP, yuraklar,
 * Xatolar daftari; yakunda `completeLesson`.
 */

import { useState, type ReactNode } from 'react'
import type { Exercise } from '../content/types'
import type { CheckResult } from '../lib/check'
import { SPEECH_PASS, isGraded, speechMatch, type LessonStep } from '../lib/lessons'
import { playFeedback } from '../lib/feedbackSound'
import { useStore } from '../lib/store'
import ExerciseRunner from './ExerciseRunner'
import { GameIcon } from './icons'
import { MascotExerciseFeedback, MascotFigure } from './Mascot'
import { InfoBanner } from './ui'

const chunky =
  'inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-extrabold uppercase tracking-wide border-b-4 ' +
  'transition-all active:translate-y-0.5 active:border-b-2 disabled:opacity-50 disabled:cursor-not-allowed'
export const chunkyGreen = `${chunky} bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-700`
export const chunkyPlain = `${chunky} bg-[var(--panel)] border-2 border-b-4 hover:bg-[var(--panel-2)]`

interface QueueItem {
  step: LessonStep
  retry: boolean
}

interface ResultRow {
  step: LessonStep
  correct: boolean
  retry: boolean
}

export interface LessonPlayerProps {
  steps: LessonStep[]
  /** "×" yoki yakuniy "Davom etish" — darsdan chiqish. */
  onClose: () => void
  /** Info qadam tanasi (qoida, matn, audio, chaqiriq). */
  renderInfo?: (step: Extract<LessonStep, { type: 'info' }>) => ReactNode
  /** Savol paytida qayta ochiladigan kontekst (matn / audio). */
  renderContext?: (kind: 'passage' | 'audio') => ReactNode
  /** Har baholangan javobdan keyin (masalan, SRS bahosi). */
  onAnswer?: (step: LessonStep, correct: boolean) => void
}

function exerciseOf(step: LessonStep): Exercise | null {
  if (step.type === 'exercise') return step.exercise
  if (step.type === 'speak') return step.fallback
  return null
}

export default function LessonPlayer({ steps, onClose, renderInfo, renderContext, onAnswer }: LessonPlayerProps) {
  const { data, actions } = useStore()
  const [queue, setQueue] = useState<QueueItem[]>(() => steps.map((step) => ({ step, retry: false })))
  const [pos, setPos] = useState(0)
  const [streak, setStreak] = useState(0)
  const [results, setResults] = useState<ResultRow[]>([])
  const [xpStart] = useState(data.xp)
  const [ended, setEnded] = useState(false)

  const item = queue[pos]

  const record = (r: { correct: boolean; partial: number; given: string }, secondsSpent: number) => {
    if (!item) return
    const ex = exerciseOf(item.step)
    if (ex) actions.recordAttempt({ exercise: ex, correct: r.correct, partial: r.partial, given: r.given, secondsSpent, source: 'practice' })
    setStreak((s) => (r.correct ? s + 1 : 0))
    setResults((rs) => [...rs, { step: item.step, correct: r.correct, retry: item.retry }])
    onAnswer?.(item.step, r.correct)
    // Xato — dars oxirida bir marta qayta beriladi.
    if (!r.correct && !item.retry) setQueue((q) => [...q, { step: item.step, retry: true }])
  }

  const next = () => {
    if (pos + 1 < queue.length) {
      setPos(pos + 1)
      return
    }
    const graded = results.length
    actions.completeLesson(graded, results.filter((x) => !x.correct).length)
    setEnded(true)
  }

  if (ended || !item) return <LessonEnd results={results} xp={Math.max(0, data.xp - xpStart)} onClose={onClose} />

  const step = item.step
  const badge = item.retry ? 'Xatolarni tuzatamiz' : step.type === 'exercise' ? step.badge : undefined
  const badgeTone = item.retry ? 'fix' : 'new'

  if (step.type === 'info') {
    return (
      <LessonFrame pos={pos} total={queue.length} streak={streak} onExit={onClose}>
        <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">{step.titleUz}</h2>
        <div className="grid gap-3">{renderInfo?.(step)}</div>
        <div className="flex justify-end rounded-2xl border-2 bg-[var(--panel-2)] px-3.5 sm:px-5 py-3.5">
          <button type="button" className={chunkyGreen} onClick={next} autoFocus>
            Davom etish
          </button>
        </div>
      </LessonFrame>
    )
  }

  if (step.type === 'speak') {
    return (
      <SpeakStep
        key={`${pos}-${step.id}`}
        step={step}
        pos={pos}
        total={queue.length}
        streak={streak}
        badge={item.retry ? 'Xatolarni tuzatamiz' : undefined}
        onExit={onClose}
        onResult={record}
        onNext={next}
      />
    )
  }

  return (
    <ExerciseRunner
      key={`${pos}-${step.id}`}
      exercise={step.exercise}
      checked={(r: CheckResult, s: number) => record(r, s)}
      index={pos}
      total={queue.length}
      onNext={next}
      prevResult={null}
      skippable
      onExit={onClose}
      streak={streak}
      badge={badge}
      badgeTone={badgeTone}
      optionIcons={step.icons}
      context={step.context && renderContext ? <ContextToggle kind={step.context}>{renderContext(step.context)}</ContextToggle> : undefined}
    />
  )
}

/* ------------------------------ tepa chiziq ------------------------------ */

function LessonFrame({
  pos,
  total,
  streak,
  onExit,
  children,
}: {
  pos: number
  total: number
  streak: number
  onExit: () => void
  children: ReactNode
}) {
  const { hearts } = useStore()
  const pct = total > 0 ? Math.min(100, (pos / total) * 100) : 0
  return (
    <div className="aea-lesson grid gap-5">
      {streak >= 3 && (
        <p className="-mb-3 text-center text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
          {streak} ta ketma-ket to‘g‘ri javob
        </p>
      )}
      <div className="flex items-center gap-3">
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
        <div
          className={`aea-step-bar flex-1 ${streak >= 3 ? 'aea-step-bar-gold' : ''}`}
          role="progressbar"
          aria-label="Dars jarayoni"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={pos}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        {hearts.enabled && (
          <span className="shrink-0 inline-flex items-center gap-1 font-extrabold tabular-nums text-[var(--heart)]" title={`Yuraklar: ${hearts.count}/${hearts.max}`}>
            <GameIcon name="heart" size={22} filled={hearts.count > 0} />
            {hearts.count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/* ------------------------------ kontekst ------------------------------ */

function ContextToggle({ kind, children }: { kind: 'passage' | 'audio'; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="justify-self-start inline-flex items-center gap-1.5 rounded-xl border-2 border-b-4 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-sky-600 dark:text-sky-400 bg-[var(--panel)] hover:bg-[var(--panel-2)]"
      >
        {kind === 'passage' ? '📖' : '🎧'} {open ? 'Yopish' : kind === 'passage' ? 'Matnni ko‘rish' : 'Audioni qayta tinglash'}
      </button>
      {open && <div className="rounded-2xl border-2 bg-[var(--panel-2)] p-3.5 text-sm max-h-72 overflow-auto">{children}</div>}
    </div>
  )
}

/* ------------------------------ gapirish ------------------------------ */

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

function recognizerCtor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

function SpeakStep({
  step,
  pos,
  total,
  streak,
  badge,
  onExit,
  onResult,
  onNext,
}: {
  step: Extract<LessonStep, { type: 'speak' }>
  pos: number
  total: number
  streak: number
  badge?: string
  onExit: () => void
  onResult: (r: { correct: boolean; partial: number; given: string }, seconds: number) => void
  onNext: () => void
}) {
  const { data, hearts } = useStore()
  const Ctor = recognizerCtor()
  const [mode, setMode] = useState<'mic' | 'tiles'>(Ctor ? 'mic' : 'tiles')
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ correct: boolean; score: number } | null>(null)
  const [startedAt] = useState(() => Date.now())
  const blocked = hearts.blocked

  if (mode === 'tiles') {
    return (
      <ExerciseRunner
        exercise={step.fallback}
        checked={(r, s) => onResult(r, s)}
        index={pos}
        total={total}
        onNext={onNext}
        prevResult={null}
        skippable
        onExit={onExit}
        streak={streak}
        badge={badge ?? (Ctor ? undefined : 'Mikrofon yo‘q — plitkalar bilan')}
        badgeTone={badge ? 'fix' : 'new'}
        context={<SentenceBubble sentence={step.sentence} hidden />}
      />
    )
  }

  const finish = (text: string) => {
    const score = speechMatch(step.sentence, text)
    const correct = score >= SPEECH_PASS
    setResult({ correct, score })
    onResult({ correct, partial: correct ? 1 : Math.round(score * 100) / 100, given: text }, Math.round((Date.now() - startedAt) / 1000))
    playFeedback(correct ? 'correct' : 'wrong', data.settings.motionEnabled)
  }

  const listen = () => {
    if (!Ctor || listening || result || blocked) return
    setError(null)
    setHeard('')
    try {
      const rec = new Ctor()
      rec.lang = 'en-US'
      rec.continuous = false
      rec.interimResults = true
      let finalText = ''
      rec.onresult = (e) => {
        let t = ''
        for (let i = 0; i < e.results.length; i++) t += e.results[i]![0].transcript
        setHeard(t)
        if (e.results[e.results.length - 1]?.isFinal) finalText = t
      }
      rec.onerror = (e) => {
        setError(e.error === 'not-allowed' ? 'Mikrofonga ruxsat berilmadi.' : 'Ovoz tanilmadi — qayta urinib ko‘ring.')
      }
      rec.onend = () => {
        setListening(false)
        if (finalText.trim()) finish(finalText)
      }
      rec.start()
      setListening(true)
    } catch {
      setError('Ovozni tanish ishga tushmadi.')
    }
  }

  return (
    <LessonFrame pos={result ? pos + 1 : pos} total={total} streak={streak} onExit={onExit}>
      <div className="grid gap-1">
        <p className={`text-[11px] font-extrabold uppercase tracking-wider ${badge ? 'text-orange-500' : 'text-violet-600 dark:text-violet-400'}`}>
          {badge ?? 'Gapirish'}
        </p>
        <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">Ovoz chiqarib ayting</h2>
      </div>
      <SentenceBubble sentence={step.sentence} />
      {blocked && <InfoBanner tone="warn">Yuraklar tugadi — Lug‘at bo‘limida so‘z takrorlab yurak qaytaring.</InfoBanner>}
      <button
        type="button"
        onClick={listen}
        disabled={listening || result !== null || blocked}
        className={`w-full rounded-2xl border-2 border-b-4 py-5 text-sm font-extrabold uppercase tracking-wide text-sky-600 dark:text-sky-400 ${
          listening ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-400 animate-pulse' : 'bg-[var(--panel)] hover:bg-[var(--panel-2)]'
        } disabled:cursor-not-allowed`}
      >
        🎤 {listening ? 'Tinglayapman… gapiring' : 'Gapirish uchun bosing'}
      </button>
      {heard && (
        <p className="text-sm text-center">
          Eshitildi: <b lang="en">{heard}</b>
        </p>
      )}
      {error && <InfoBanner tone="warn">{error}</InfoBanner>}
      <div
        className={`rounded-2xl border-2 px-3.5 sm:px-5 py-3.5 grid gap-3 ${
          result
            ? result.correct
              ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700'
              : 'bg-rose-50 border-rose-300 dark:bg-rose-950/30 dark:border-rose-700'
            : 'bg-[var(--panel-2)]'
        }`}
      >
        {result && (
          <div className={result.correct ? 'aea-outcome-correct' : 'aea-outcome-wrong'}>
            <MascotExerciseFeedback
              bare
              correct={result.correct}
              expected={step.sentence}
              whyUz={`Gapdagi so‘zlarning ${Math.round(result.score * 100)}% i aniq eshitildi (o‘tish: ${Math.round(SPEECH_PASS * 100)}%).`}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!result ? (
            <button
              type="button"
              onClick={() => setMode('tiles')}
              className="rounded-2xl border-2 border-b-4 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wide muted bg-[var(--panel)] hover:bg-[var(--panel-2)]"
            >
              Hozir gapira olmayman
            </button>
          ) : (
            <span />
          )}
          {result && (
            <button type="button" onClick={onNext} className={result.correct ? chunkyGreen : `${chunky} bg-rose-500 hover:bg-rose-400 text-white border-rose-700`}>
              Keyingi mashq
            </button>
          )}
        </div>
      </div>
    </LessonFrame>
  )
}

/**
 * Gap pufagi. `hidden` — plitkalar rejimida matn yashirin (aks holda javob
 * ko'chiriladi): faqat 🔊 orqali eshittiriladi, xohlasa "Matnni ko'rsatish".
 */
function SentenceBubble({ sentence, hidden = false }: { sentence: string; hidden?: boolean }) {
  const [shown, setShown] = useState(!hidden)
  return (
    <div className="flex items-end gap-2 sm:gap-3">
      <MascotFigure className="shrink-0" maxHeight="max-h-24 sm:max-h-32" alt="" />
      <div className="relative mb-6 sm:mb-8 rounded-2xl border-2 bg-[var(--panel)] px-3.5 py-2.5 min-w-0 flex items-center gap-2">
        <span aria-hidden className="absolute -left-[7px] bottom-4 w-3 h-3 rotate-45 border-l-2 border-b-2 bg-[var(--panel)]" />
        <button
          type="button"
          onClick={() => speak(sentence)}
          aria-label={`Tinglash: ${sentence}`}
          className="shrink-0 inline-grid place-items-center w-8 h-8 rounded-lg text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {shown ? (
          <p className="font-semibold break-words" lang="en">
            {sentence}
          </p>
        ) : (
          <button type="button" onClick={() => setShown(true)} className="text-sm font-bold muted hover:underline">
            Tinglang va yig‘ing · matnni ko‘rsatish
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ yakun ------------------------------ */

function LessonEnd({ results, xp, onClose }: { results: ResultRow[]; xp: number; onClose: () => void }) {
  const [review, setReview] = useState(false)
  const first = results.filter((r) => !r.retry && isGraded(r.step))
  const right = first.filter((r) => r.correct).length
  const pct = first.length === 0 ? 100 : Math.round((right / first.length) * 100)
  const praise = pct >= 90 ? 'Zo‘r!' : pct >= 70 ? 'Yaxshi!' : 'Aniqlik'
  return (
    <div className="grid gap-5 py-2 sm:py-4 text-center justify-items-center animate-[var(--animate-pop)]">
      <MascotFigure maxHeight="max-h-36" alt="" />
      <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-500">Dars tugadi!</h2>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        <div className="rounded-2xl border-2 border-amber-400 overflow-hidden">
          <p className="bg-amber-400 text-white text-[11px] font-extrabold uppercase py-1">Tajriba ochkolari</p>
          <p className="py-3 text-2xl font-extrabold text-amber-500 tabular-nums">⚡ {xp}</p>
        </div>
        <div className="rounded-2xl border-2 border-emerald-500 overflow-hidden">
          <p className="bg-emerald-500 text-white text-[11px] font-extrabold uppercase py-1">{praise}</p>
          <p className="py-3 text-2xl font-extrabold text-emerald-600 tabular-nums">🎯 {pct}%</p>
        </div>
      </div>
      {review && (
        <ol className="grid gap-1.5 w-full max-w-lg text-left text-sm">
          {results.map((r, i) => {
            const ex = exerciseOf(r.step)
            const label = r.step.type === 'speak' ? r.step.sentence : ex?.instructionUz ?? ''
            return (
              <li key={i} className={`rounded-xl border-2 px-3 py-2 flex items-start gap-2 ${r.correct ? 'border-emerald-300' : 'border-rose-300'}`}>
                <span aria-hidden>{r.correct ? '✅' : '❌'}</span>
                <span className="flex-1 min-w-0 break-words">
                  {label}
                  {r.retry && <span className="ml-1 text-[11px] font-bold text-orange-500">(qayta)</span>}
                </span>
              </li>
            )
          })}
        </ol>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => setReview((v) => !v)} className={chunkyPlain} aria-expanded={review}>
          {review ? 'Ro‘yxatni yopish' : 'Darsni ko‘rib chiqish'}
        </button>
        <button type="button" onClick={onClose} className={chunkyGreen}>
          Davom etish
        </button>
      </div>
    </div>
  )
}
