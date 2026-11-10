/**
 * Bo'lim DARSLARI — Grammatika, O'qish, Tinglash, Yozish, Gapirish uchun
 * Duolingo uslubidagi o'yin-dars (`LessonPlayer`) va info kartalari.
 * Qadamlar `lib/lessons.ts` dagi sof quruvchilardan.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GrammarTopic, ListeningTask, ReadingPassage, SpeakingTask, WritingTask } from '../content/types'
import { audioItem, loadAudioManifest } from '../lib/audio'
import { grammarLesson, listeningLesson, readingLesson, speakingLesson, writingLesson, type LessonStep } from '../lib/lessons'
import { chunkyGreen } from './chunky'
import LessonPlayer from './LessonPlayer'
import { MascotFigure } from './Mascot'
import { Card, InfoBanner, SpeakButton } from './ui'

function Shell({ children }: { children: ReactNode }) {
  return <Card className="p-4 sm:p-6">{children}</Card>
}

/* ------------------------------ Grammatika ------------------------------ */

export function GrammarLesson({ topic, onClose, onFinish }: { topic: GrammarTopic; onClose: () => void; onFinish?: (pct: number) => void }) {
  const steps = useMemo(() => grammarLesson(topic), [topic])
  return (
    <Shell>
      <LessonPlayer
        steps={steps}
        onClose={onClose}
        onFinish={onFinish}
        renderInfo={() => (
          <>
            {topic.explanationUz.slice(0, 2).map((p, i) => (
              <p key={i} className="text-sm leading-relaxed">
                {p}
              </p>
            ))}
            {topic.formula.length > 0 && (
              <div className="rounded-2xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 p-3.5 grid gap-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">Qoida</p>
                {topic.formula.map((f, i) => (
                  <p key={i} className="font-mono text-sm font-semibold">
                    {f.form}
                    {f.noteUz && <span className="ml-2 font-sans font-normal muted text-xs">— {f.noteUz}</span>}
                  </p>
                ))}
              </div>
            )}
            <ul className="grid gap-2">
              {topic.examples.slice(0, 3).map((e, i) => (
                <li key={i} className="flex items-start gap-2 rounded-2xl border-2 px-3 py-2">
                  <SpeakButton text={e.en} label="Tinglaş" />
                  <span className="min-w-0">
                    <span className="block font-semibold" lang="en">
                      {e.en}
                    </span>
                    <span className="block text-xs muted">{e.uz}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      />
    </Shell>
  )
}

/* ------------------------------ O'qish ------------------------------ */

function PassageText({ passage }: { passage: ReadingPassage }) {
  return (
    <div className="grid gap-2.5">
      {passage.paragraphs.map((p, i) => (
        <p key={i} className="leading-relaxed" lang="en">
          {p}
        </p>
      ))}
    </div>
  )
}

export function ReadingLesson({ passage, onClose, onFinish }: { passage: ReadingPassage; onClose: () => void; onFinish?: (pct: number) => void }) {
  const steps = useMemo(() => readingLesson(passage), [passage])
  return (
    <Shell>
      <LessonPlayer
        steps={steps}
        onClose={onClose}
        onFinish={onFinish}
        renderInfo={() => (
          <>
            <p className="text-sm muted">Matnni diqqat bilan öqing — keyingi savollar şu matn böyiça. Savol paytida matnni qayta oçiş mumkin.</p>
            <div className="rounded-2xl border-2 p-4 bg-[var(--panel)]">
              <PassageText passage={passage} />
            </div>
            {passage.glossary && passage.glossary.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {passage.glossary.map((g) => (
                  <span key={g.word} className="chip">
                    <b lang="en">{g.word}</b> — {g.uz}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
        renderContext={() => <PassageText passage={passage} />}
      />
    </Shell>
  )
}

/* ------------------------------ Tinglash ------------------------------ */

/**
 * Audio — FAQAT manifestda mavjud bo'lsa pleyer chiziladi (loyiha qoidasi:
 * soxta pleyer yo'q). Bo'lmasa ochiq xabar va transkript.
 */
function LessonAudio({ task }: { task: ListeningTask }) {
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void loadAudioManifest().then(() => {
      if (!alive) return
      const it = audioItem(task.audio.id)
      if (it && it.available && task.audio.fileAvailable) {
        setSrc(it.src)
        setState('ok')
      } else setState('missing')
    })
    return () => {
      alive = false
    }
  }, [task.audio.id, task.audio.fileAvailable])

  if (state === 'loading') return <p className="text-sm muted">Audio tekşirilmoqda…</p>
  if (state === 'missing' || !src) {
    return (
      <div className="grid gap-2">
        <InfoBanner tone="warn">Audio fayl topilmadi — transkript bilan işlang.</InfoBanner>
        <div className="grid gap-1.5 text-sm" lang="en">
          {task.audio.transcript.map((t, i) => (
            <p key={i}>{t.text}</p>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="grid gap-2 justify-items-center">
      <MascotFigure maxHeight="max-h-24" alt="" />
      <audio controls preload="metadata" src={src} className="w-full max-w-md" aria-label={`Audio: ${task.title}`} />
    </div>
  )
}

export function ListeningLesson({ task, onClose, onFinish }: { task: ListeningTask; onClose: () => void; onFinish?: (pct: number) => void }) {
  const steps = useMemo(() => listeningLesson(task), [task])
  return (
    <Shell>
      <LessonPlayer
        steps={steps}
        onClose={onClose}
        onFinish={onFinish}
        renderInfo={() => (
          <>
            <p className="text-sm muted">
              {task.audio.fileAvailable
                ? 'Audioni tinglang — savollar şu audio böyiça. Savol paytida uni qayta tinglaş mumkin.'
                : 'Bu suhbatning audio fayli hali yöq — transkriptni öqing, savollar şu matn böyiça.'}
            </p>
            <LessonAudio task={task} />
          </>
        )}
        renderContext={() => <LessonAudio task={task} />}
      />
    </Shell>
  )
}

/* ------------------------------ Yozish / Gapirish ------------------------------ */

export function WritingLesson({ task, onClose, onFinish }: { task: WritingTask; onClose: () => void; onFinish?: (pct: number) => void }) {
  const steps = useMemo(() => writingLesson(task), [task])
  return (
    <Shell>
      <LessonPlayer
        steps={steps}
        onClose={onClose}
        onFinish={onFinish}
        renderInfo={() => (
          <>
            <p className="text-sm">{task.instructionUz}</p>
            <blockquote className="rounded-2xl border-2 bg-[var(--panel-2)] p-3.5 font-medium" lang="en">
              {task.promptEn}
            </blockquote>
            <p className="text-sm muted">
              {task.minWords}–{task.maxWords} söz. «Davom etiş»dan keyin yoziş maydoni oçiladi — matningiz tahlil qilinadi.
            </p>
          </>
        )}
      />
    </Shell>
  )
}

export function SpeakingLesson({ task, onClose, onFinish }: { task: SpeakingTask; onClose: () => void; onFinish?: (pct: number) => void }) {
  const steps = useMemo(() => speakingLesson(task), [task])
  return (
    <Shell>
      <LessonPlayer
        steps={steps}
        onClose={onClose}
        onFinish={onFinish}
        renderInfo={() => (
          <>
            <blockquote className="rounded-2xl border-2 bg-[var(--panel-2)] p-3.5 font-medium flex items-center gap-2" lang="en">
              <SpeakButton text={task.questionEn} label="Tinglaş" />
              {task.questionEn}
            </blockquote>
            {task.hintUz && <p className="text-sm muted">{task.hintUz}</p>}
            <p className="text-sm muted">
              Kamida {task.minSeconds} soniya gapiring. «Davom etiş»dan keyin yozib oliş paneli oçiladi.
            </p>
          </>
        )}
      />
    </Shell>
  )
}

/* ------------------------------ Boshlash kartasi ------------------------------ */

/** Bo'lim sahifasi tepasidagi "o'yin-dars" kartasi. */
export function LessonStartCard({
  kicker,
  title,
  body,
  onStart,
  steps,
}: {
  kicker: string
  title: string
  body: string
  onStart: () => void
  steps: LessonStep[]
}) {
  const graded = steps.filter((s) => s.type !== 'info').length
  return (
    <Card className="grid sm:grid-cols-[1fr_auto] items-center gap-4 p-5 sm:p-6 border-2 border-emerald-300 dark:border-emerald-700">
      <div className="grid gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">{kicker}</p>
        <h2 className="text-xl sm:text-2xl font-extrabold">{title}</h2>
        <p className="text-sm muted">
          {body} · {graded} ta topşiriq
        </p>
        <div>
          <button type="button" className={chunkyGreen} onClick={onStart}>
            Darsni boşlaş
          </button>
        </div>
      </div>
      <MascotFigure maxHeight="max-h-28 sm:max-h-36" alt="" />
    </Card>
  )
}
