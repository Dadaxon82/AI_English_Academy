/**
 * Lug'at O'YINI — so'zlar Duolingo dars uslubidagi zanjirda (`lib/wordGame.ts`).
 *
 * HAQIQIY HISOB: har javob `recordAttempt(source: 'practice')` bilan yoziladi
 * (XP, yuraklar, combo, Xatolar daftari), so'z SRS jadvalida baholanadi
 * (to'g'ri → good, xato/o'tkazish → again), oxirida `completeLesson`.
 */

import { useMemo, useState } from 'react'
import type { VocabularyItem } from '../content/types'
import type { CheckResult } from '../lib/check'
import { useStore } from '../lib/store'
import { buildWordGame, type GameStep } from '../lib/wordGame'
import ExerciseRunner from './ExerciseRunner'
import { MascotFigure } from './Mascot'
import { Card, InfoBanner } from './ui'

const chunky =
  'inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-extrabold uppercase tracking-wide border-b-4 ' +
  'transition-all active:translate-y-0.5 active:border-b-2 disabled:opacity-50 disabled:cursor-not-allowed'

export default function WordGame({ pool }: { pool: VocabularyItem[] }) {
  const { data, actions } = useStore()
  const [steps, setSteps] = useState<GameStep[] | null>(null)
  const [pos, setPos] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [xpAtStart, setXpAtStart] = useState(0)
  const [done, setDone] = useState(false)

  const [now] = useState(() => Date.now())
  const preview = useMemo(() => {
    const due = pool.filter((v) => data.srs[v.id] && data.srs[v.id]!.dueAt <= now).length
    const fresh = pool.filter((v) => !data.srs[v.id] || data.srs[v.id]!.learnedAt === null).length
    return { due, fresh }
  }, [pool, data.srs, now])

  const start = () => {
    setSteps(buildWordGame(pool, data.srs))
    setPos(0)
    setDone(false)
    setResults([])
    setXpAtStart(data.xp)
  }

  if (pool.length < 4) {
    return <InfoBanner tone="warn">O‘yin uchun kamida 4 ta so‘z kerak — filtrlarni tozalang.</InfoBanner>
  }

  // ---------------- Boshlash ekrani ----------------
  if (!steps) {
    return (
      <Card className="grid sm:grid-cols-[1fr_auto] items-center gap-4 p-5 sm:p-7">
        <div className="grid gap-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">So‘z o‘yini</p>
          <h2 className="text-2xl font-extrabold">5 ta so‘z — rasm, tarjima, gap va juftlik</h2>
          <p className="text-sm muted">
            Avval takrori yetgan so‘zlar ({preview.due}), so‘ng yangilari ({preview.fresh}). Har javob takrorlash jadvaliga
            yoziladi; xato yoki o‘tkazib yuborilgan so‘z tezroq qaytadi.
          </p>
          <div>
            <button type="button" onClick={start} className={`${chunky} bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-700`}>
              O‘yinni boshlash
            </button>
          </div>
        </div>
        <MascotFigure maxHeight="max-h-32 sm:max-h-40" alt="" />
      </Card>
    )
  }

  // ---------------- Yakun ekrani ----------------
  if (done || steps.length === 0) {
    const total = results.length
    const right = results.filter(Boolean).length
    const pct = total === 0 ? 0 : Math.round((right / total) * 100)
    const xp = Math.max(0, data.xp - xpAtStart)
    return (
      <Card className="grid gap-5 p-5 sm:p-7 text-center justify-items-center">
        <MascotFigure maxHeight="max-h-36" alt="" />
        <h2 className="text-2xl font-extrabold">{pct >= 80 ? 'Ajoyib! Dars yakunlandi' : 'Dars yakunlandi'}</h2>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          <div className="rounded-2xl border-2 border-amber-400 overflow-hidden">
            <p className="bg-amber-400 text-white text-[11px] font-extrabold uppercase py-1">Jami XP</p>
            <p className="py-3 text-2xl font-extrabold text-amber-500 tabular-nums">{xp}</p>
          </div>
          <div className="rounded-2xl border-2 border-emerald-500 overflow-hidden">
            <p className="bg-emerald-500 text-white text-[11px] font-extrabold uppercase py-1">Aniqlik</p>
            <p className="py-3 text-2xl font-extrabold text-emerald-600 tabular-nums">{pct}%</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={start} className={`${chunky} bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-700`}>
            Yana o‘ynash
          </button>
          <button type="button" onClick={() => setSteps(null)} className={`${chunky} bg-[var(--panel)] border-2 border-b-4 hover:bg-[var(--panel-2)]`}>
            Yopish
          </button>
        </div>
      </Card>
    )
  }

  // ---------------- O'yin ----------------
  const step = steps[pos]!
  const onChecked = (r: CheckResult, secondsSpent: number) => {
    setResults((prev) => [...prev, r.correct])
    actions.recordAttempt({ exercise: step.exercise, correct: r.correct, partial: r.partial, given: r.given, secondsSpent, source: 'practice' })
    for (const id of step.vocabIds) actions.gradeVocab(id, r.correct ? 'good' : 'again')
  }
  const onNext = () => {
    if (pos + 1 < steps.length) {
      setPos(pos + 1)
      return
    }
    actions.completeLesson(results.length, results.filter((x) => !x).length)
    setDone(true)
  }

  return (
    <Card className="p-4 sm:p-6">
      <ExerciseRunner
        exercise={step.exercise}
        checked={onChecked}
        index={pos}
        total={steps.length}
        onNext={onNext}
        prevResult={null}
        comboTracked
        skippable
        onExit={() => setSteps(null)}
        badge={step.isNew ? 'Yangi so‘z' : undefined}
        optionIcons={step.icons}
      />
    </Card>
  )
}
