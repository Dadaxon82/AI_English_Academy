/**
 * Lug'at O'YINI — so'zlar Duolingo dars uslubidagi zanjirda (`lib/wordGame.ts`),
 * umumiy `LessonPlayer` orqali (xatolarni qayta ishlash, ketma-ket to'g'ri
 * javoblar, «Dars tugadi!» ekrani).
 *
 * HAQIQIY HISOB: har javob `recordAttempt(source: 'practice')` bilan yoziladi
 * (LessonPlayer), so'z SRS jadvalida baholanadi (to'g'ri → good,
 * xato/o'tkazish → again), oxirida `completeLesson`.
 */

import { useMemo, useState } from 'react'
import { vocabRepeatExercise } from '../content'
import type { VocabularyItem } from '../content/types'
import type { LessonStep } from '../lib/lessons'
import { useStore } from '../lib/storeContext'
import { buildWordGame } from '../lib/wordGame'
import { chunkyGreen } from './chunky'
import LessonPlayer from './LessonPlayer'
import { MascotFigure } from './Mascot'
import { Card, InfoBanner } from './ui'

export default function WordGame({ pool }: { pool: VocabularyItem[] }) {
  const { data, actions } = useStore()
  const [steps, setSteps] = useState<LessonStep[] | null>(null)
  const [now] = useState(() => Date.now())

  const preview = useMemo(() => {
    const due = pool.filter((v) => data.srs[v.id] && data.srs[v.id]!.dueAt <= now).length
    const fresh = pool.filter((v) => !data.srs[v.id] || data.srs[v.id]!.learnedAt === null).length
    return { due, fresh }
  }, [pool, data.srs, now])

  const start = () => {
    const game = buildWordGame(pool, data.srs)
    const steps: LessonStep[] = game.map(
      (g, i): LessonStep => ({
        type: 'exercise',
        id: `${g.exercise.id}#${i}`,
        exercise: g.exercise,
        badge: g.isNew ? 'Yangi söz' : undefined,
        icons: g.icons,
        vocabIds: g.vocabIds,
      }),
    )
    // «Повторите это предложение вслух» — har so'zning misol gapi uchun (mavjud
    // bo'lsa), game.ts'dagi so'zlar bilan bir xil so'zlardan (ixtiro qilinmaydi).
    const pickedIds = new Set(game.flatMap((g) => g.vocabIds))
    for (const v of pool) {
      if (!pickedIds.has(v.id)) continue
      const fb = vocabRepeatExercise(v)
      if (fb) steps.push({ type: 'speak', id: `${fb.id}#speak`, sentence: v.exampleEn, fallback: fb, vocabIds: [v.id] })
    }
    setSteps(steps)
  }

  if (pool.length < 4) {
    return <InfoBanner tone="warn">Öyin uçun kamida 4 ta söz kerak — filtrlarni tozalang.</InfoBanner>
  }

  if (steps) {
    return (
      <Card className="p-4 sm:p-6">
        <LessonPlayer
          steps={steps}
          onClose={() => setSteps(null)}
          onAnswer={(step, correct) => {
            if (step.type !== 'exercise' && step.type !== 'speak') return
            for (const id of step.vocabIds ?? []) actions.gradeVocab(id, correct ? 'good' : 'again')
          }}
        />
      </Card>
    )
  }

  return (
    <Card className="grid sm:grid-cols-[1fr_auto] items-center gap-4 p-5 sm:p-7">
      <div className="grid gap-2.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">Söz öyini</p>
        <h2 className="text-2xl font-extrabold">5 ta söz — rasm, tarjima, gap va juftlik</h2>
        <p className="text-sm muted">
          Avval takrori yetgan sözlar ({preview.due}), söng yangilari ({preview.fresh}). Har javob takrorlaş jadvaliga
          yoziladi; xato qilingan topşiriq dars oxirida yana bir marta beriladi.
        </p>
        <div>
          <button type="button" onClick={start} className={chunkyGreen}>
            Öyinni boşlaş
          </button>
        </div>
      </div>
      <MascotFigure maxHeight="max-h-32 sm:max-h-40" alt="" />
    </Card>
  )
}
