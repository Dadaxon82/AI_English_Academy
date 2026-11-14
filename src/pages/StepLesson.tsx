/**
 * Xaritadagi tugundan to'g'ridan-to'g'ri bo'lim darsi: `/lesson/:dayId/:skill`.
 *
 * Tugun qaysi kun va qaysi bo'limga biriktirilgan bo'lsa, o'sha kontent ochiladi
 * (lug'at — so'z o'yini, grammatika/o'qish/tinglash/yozish/gapirish — dars rejimi).
 * Dars oxirigacha bajarilsa aniqlik (birinchi urinishlar bo'yicha, 0–100)
 * `passedTests['step:<kun>:<bo'lim>']`ga yoziladi (eng yaxshisi saqlanadi,
 * sinxronlanadi) va xaritada tugun ustida ko'rsatiladi. Daraja O'ZGARMAYDI.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LOADED_LEVELS, getBundle, type LevelBundle } from '../content'
import type { DailyPlanDay, Skill } from '../content/types'
import LessonPlayer from '../components/LessonPlayer'
import { GrammarLesson, ListeningLesson, ReadingLesson, SpeakingLesson, WritingLesson } from '../components/SectionLessons'
import { Card, EmptyState } from '../components/ui'
import type { LessonStep } from '../lib/lessons'
import { skillLabelUz } from '../lib/planning'
import { useStore } from '../lib/storeContext'
import { buildWordGame } from '../lib/wordGame'

function findDay(dayId: string): { day: DailyPlanDay; bundle: LevelBundle } | null {
  for (const l of LOADED_LEVELS) {
    const b = getBundle(l)
    const day = b.days.find((d) => d.id === dayId)
    if (day) return { day, bundle: b }
  }
  return null
}

const SKILLS: readonly Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking']

export default function StepLesson() {
  const { dayId = '', skill = '' } = useParams()
  const nav = useNavigate()
  const { data, actions } = useStore()
  const found = useMemo(() => findDay(dayId), [dayId])
  const sk = SKILLS.find((s) => s === skill)
  const section = sk ? found?.day.sections.find((s) => s.skill === sk) : undefined
  const [result, setResult] = useState<number | null>(null)

  // So'z o'yini qadamlari bir marta quriladi (SRS o'zgarsa ham dars davomida qotadi).
  const [vocabSteps] = useState<LessonStep[] | null>(() => {
    if (sk !== 'vocabulary' || !found || !section) return null
    const pool = found.bundle.vocab.filter((v) => section.itemIds.includes(v.id))
    if (pool.length < 4) return null
    return buildWordGame(pool, data.srs).map(
      (g, i): LessonStep => ({ type: 'exercise', id: `${g.exercise.id}#${i}`, exercise: g.exercise, badge: g.isNew ? 'Yangi söz' : undefined, icons: g.icons, vocabIds: g.vocabIds }),
    )
  })

  const back = () => nav('/path')
  const onFinish = (pct: number) => {
    if (!sk) return
    actions.recordStepScore(dayId, sk, pct)
    setResult(pct)
  }

  if (!found || !sk || !section) {
    return (
      <EmptyState
        title="Bölim topilmadi"
        body="Bu tugun uçun dars topilmadi — öquv yöliga qaytib, boşqa bölimni tanlang."
        action={
          <Link to="/path" className="underline font-semibold">
            Öquv yöli
          </Link>
        }
      />
    )
  }

  const { bundle } = found
  const id = section.itemIds[0]
  let body: React.ReactNode = null
  if (sk === 'vocabulary') {
    body = vocabSteps ? (
      <LessonPlayer
        steps={vocabSteps}
        onClose={back}
        onFinish={onFinish}
        onAnswer={(step, correct) => {
          if (step.type !== 'exercise') return
          for (const vid of step.vocabIds ?? []) actions.gradeVocab(vid, correct ? 'good' : 'again')
        }}
      />
    ) : null
  } else if (sk === 'grammar') {
    const t = bundle.grammar.find((g) => g.id === id)
    body = t ? <GrammarLesson topic={t} onClose={back} onFinish={onFinish} /> : null
  } else if (sk === 'reading') {
    const p = bundle.reading.find((r) => r.id === id)
    body = p ? <ReadingLesson passage={p} onClose={back} onFinish={onFinish} /> : null
  } else if (sk === 'listening') {
    const t = bundle.listening.find((l) => l.id === id)
    body = t ? <ListeningLesson task={t} onClose={back} onFinish={onFinish} /> : null
  } else if (sk === 'writing') {
    const t = bundle.writing.find((w) => w.id === id)
    body = t ? <WritingLesson task={t} onClose={back} onFinish={onFinish} /> : null
  } else {
    const t = bundle.speaking.find((s) => section.itemIds.includes(s.id))
    body = t ? <SpeakingLesson task={t} onClose={back} onFinish={onFinish} /> : null
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to="/path" className="font-semibold underline">
          ← Öquv yöli
        </Link>
        <span className="muted">
          {found.day.dayNumber}-kun · {skillLabelUz(sk)} · {section.titleUz}
        </span>
        {result !== null && <span className="font-extrabold">Natija: {result}%</span>}
      </div>
      {body ? (
        <Card className="p-3 sm:p-5">{body}</Card>
      ) : (
        <EmptyState title="Bu bölimda dars yöq" body="Kontent topilmadi — öquv yölidagi boşqa bölimni tanlang." />
      )}
    </div>
  )
}
