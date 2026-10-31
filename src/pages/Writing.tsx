/**
 * Writing — qulay muharrir, so'zlar soni, taymer, tahlil.
 *
 * Tahlil: AI ulangmasa QOIDAVIY tekshiruv ishlatiladi (engine: rule-based).
 * AI "ulangan" deb ko'rsatilmaydi va mavjud bo'lmagan natija yasalmaydi.
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Chip, EmptyState, InfoBanner, SuccessBanner } from '../components/ui'
import { useStore } from '../lib/store'
import { getBundle } from '../content'
import { criterionLabelUz } from '../lib/analyze'
import { formatDuration } from '../lib/timer'
import type { CoreCriterionKey, WritingSubmission } from '../lib/types'
import type { WritingTask } from '../content/types'

export default function Writing() {
  const { data, actions, netOnline, timerElapsed } = useStore()
  const [params, setParams] = useSearchParams()
  const bundle = getBundle(data.settings.currentLevel)
  const tasks = useMemo(
    () => [...bundle.writing, ...(bundle.mockExam?.sections.flatMap((s) => (s.writingTask ? [s.writingTask] : [])) ?? [])],
    [bundle],
  )
  const selectedId = params.get('task') ?? tasks[0]?.id ?? ''
  const task = tasks.find((t) => t.id === selectedId)

  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(`aea-drafts:${data.userId}`)
      return raw ? (JSON.parse(raw) as Record<string, string>) : {}
    } catch {
      return {}
    }
  })
  const [submitted, setSubmitted] = useState<WritingSubmission[]>([])
  const [compareWith, setCompareWith] = useState<string | null>(null)
  const [saveNote, setSaveNote] = useState<string | null>(null)

  // saqlangan javoblarni yuklash
  useEffect(() => {
    setSubmitted(data.writing.filter((w) => w.taskId === (params.get('task') ?? tasks[0]?.id)))
  }, [data.writing, params, tasks])

  // Taymer: tanlangan topshiriq uchun store taymeri ishga tushadi.
  // Store ichida saqlanadi — sahifa yangilansa ham vaqt yo'qolmaydi.
  const startT = actions.startTimer
  const pauseT = actions.pauseTimer
  const taskIdForTimer = task?.id ?? ''
  useEffect(() => {
    if (!taskIdForTimer) return
    startT(taskIdForTimer, 'writing')
    return () => pauseT()
  }, [taskIdForTimer, startT, pauseT])

  const seconds = data.timer.sessionId === taskIdForTimer ? timerElapsed : 0

  const draft = drafts[selectedId] ?? ''
  const words = draft.trim() ? draft.trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length : 0

  const setDraft = (v: string) => {
    setDrafts((d) => ({ ...d, [selectedId]: v }))
    try {
      localStorage.setItem(`aea-drafts:${data.userId}`, JSON.stringify({ ...drafts, [selectedId]: v }))
      setSaveNote('Qoralama saqlandi')
    } catch {
      setSaveNote(null)
    }
  }

  if (tasks.length === 0) {
    return <EmptyState title="Yozish topshiriqlari topilmadi" body="Ushbu daraja uchun yozish kontenti hali yuklanmagan." />
  }

  const prior = data.writing.filter((w) => w.taskId === selectedId)

  const compareTarget = compareWith ? data.writing.find((w) => w.id === compareWith) : prior[0]

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <h1 className="text-xl font-bold">Yozish</h1>
        <p className="muted text-sm">
          Javobingiz shu brauzerda saqlanadi (qoralama) va sinxronlashda Supabase’ga yuboriladi. Tahlil{' '}
          <b>{aiEnabled(data.settings.aiEnabled, netOnline) ? 'qoidaviy + AI' : 'qoidaviy'} dvigatel</b> bilan bajariladi.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => setParams({ task: t.id })}
              className={`chip cursor-pointer ${selectedId === t.id ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
            >
              {t.level} · {genreLabelUz(t.genre)}
            </button>
          ))}
        </div>
      </Card>

      {task && (
        <Card className="grid gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold">{genreLabelUz(task.genre)} — topshiriq</h2>
            <Chip>{task.level}</Chip>
            <Chip>{task.minWords}–{task.maxWords} so‘z</Chip>
            <Chip>{task.minutes}′</Chip>
          </div>
          <p className="text-sm">{task.promptEn}</p>
          <p className="text-sm muted">{task.instructionUz}</p>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            placeholder="Write your answer in English…"
            className="w-full rounded-xl border bg-[var(--panel)] p-3.5 text-sm leading-6 outline-none focus:border-[var(--accent)] font-[inherit]"
            aria-label="Yozish maydoni"
          />

          <div className="flex flex-wrap items-center gap-3 text-xs muted">
            <span className={`tabular-nums font-semibold ${words > task.maxWords ? 'text-[var(--bad)]' : 'text-[var(--text)]'}`}>
              {words} so‘z
            </span>
            <span className="tabular-nums">⏱ {formatDuration(seconds)}</span>
            <span>{saveNote}</span>
            <span className="flex-1" />
            <Button
              size="sm"
              variant="secondary"
              disabled={words === 0}
              onClick={() => {
                const sub = actions.addWriting(task.id, draft, seconds, prior[0]?.id ?? null)
                setSubmitted((s) => [...s, sub])
              }}
            >
              Tahlil qilish
            </Button>
            <Button size="sm" variant="ghost" onClick={() => actions.stopTimer()}>
              Taymerni to‘xtatish
            </Button>
          </div>

          {task.checklistUz && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold muted">Tekshiruv ro'yxati</summary>
              <ul className="mt-2 grid gap-1 list-disc pl-5">
                {task.checklistUz.map((c) => (
                  <li key={c} className="muted">{c}</li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}

      {/* --- Natijalar --- */}
      <Card className="grid gap-3.5">
        <h2 className="font-bold">Natijalar va tahlil</h2>
        {submitted.length === 0 ? (
          <EmptyState title="Hali javob yuborilmadi" body="Matn yozing va “Tahlil qilish” tugmasini bosing — tahlil darhol ko‘rsatiladi." />
        ) : (
          [...submitted].reverse().map((sub, i) => (
            <div key={sub.id} className="grid gap-3 rounded-xl border p-3.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Chip tone={sub.analysis?.engine === 'ai' ? 'brand' : 'default'}>
                  {sub.analysis?.engine === 'ai' ? 'AI tahlil' : 'Qoidaviy tahlil'}
                </Chip>
                <Chip>{sub.wordCount} so‘z</Chip>
                <span className="muted">{new Date(sub.createdAt).toLocaleString('uz')}</span>
                {i === 0 && submitted.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => setCompareWith(compareWith ? null : submitted[1]!.id)}>
                    {compareWith ? 'Solishtirishni yopish' : "Eski javob bilan solishtirish"}
                  </Button>
                )}
              </div>

              {sub.analysis && (
                <>
                  <div className="grid sm:grid-cols-5 gap-2">
                    {(Object.keys(sub.analysis.criteriaScores) as CoreCriterionKey[]).map((k) => (
                      <div key={k} className="text-center rounded-lg bg-[var(--panel-2)] p-2">
                        <div className="text-[10px] muted font-semibold leading-tight">{criterionLabelUz(k)}</div>
                        <div className="font-bold tabular-nums">{sub.analysis!.criteriaScores[k]}/5</div>
                      </div>
                    ))}
                  </div>

                  {sub.analysis.errors.length > 0 && (
                    <div className="grid gap-1.5">
                      <h3 className="text-sm font-semibold">Topilgan xatolar</h3>
                      {sub.analysis.errors.map((e, j) => (
                        <div key={j} className="text-sm rounded-lg border-l-4 !border-l-[var(--bad)] pl-3 py-1 bg-[var(--panel-2)]">
                          <span className="line-through muted">{e.excerpt}</span>{' '}
                          <b className="text-[var(--ok)]">{e.correction}</b>
                          <div className="text-[11px] muted">{e.whyUz}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--ok)]">Kuchli jihatlar</h3>
                      <ul className="text-sm list-disc pl-5 mt-1">
                        {sub.analysis.strengthsUz.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--warn)]">Zaif jihatlar</h3>
                      <ul className="text-sm list-disc pl-5 mt-1">
                        {sub.analysis.weaknessesUz.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                  </div>

                  <InfoBanner tone="muted">
                    <b>Keyingi qadamlar:</b>
                    <ul className="list-disc pl-5 mt-1">
                      {sub.analysis.suggestionsUz.map((s) => <li key={s}>{s}</li>)}
                    </ul>
                  </InfoBanner>

                  <details>
                    <summary className="cursor-pointer text-sm font-semibold muted">Model javob (namuna)</summary>
                    <p className="mt-2 text-sm italic">{task?.modelAnswerEn}</p>
                  </details>
                </>
              )}
            </div>
          ))
        )}

        {compareTarget && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border p-3">
              <h3 className="text-sm font-semibold mb-2">Eski javob</h3>
              <p className="text-sm whitespace-pre-wrap">{compareTarget.text}</p>
              <p className="text-[11px] muted mt-1">{compareTarget.wordCount} so‘z</p>
            </div>
            <div className="rounded-xl border p-3">
              <h3 className="text-sm font-semibold mb-2">Yangi javob</h3>
              <p className="text-sm whitespace-pre-wrap">{submitted[0]?.text}</p>
              <p className="text-[11px] muted mt-1">{submitted[0]?.wordCount} so‘z</p>
            </div>
            {compareTarget.analysis && submitted[0]?.analysis && (
              <SuccessBanner>
                O‘rtacha ball: {avg(compareTarget.analysis)}/5 → <b>{avg(submitted[0].analysis)}/5</b>
                {avg(submitted[0].analysis) > avg(compareTarget.analysis) ? ' — o‘sish bor 👏' : ''}
              </SuccessBanner>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

function aiEnabled(flag: boolean, online: boolean) {
  return flag && online
}

/** `avg` — 5 mezon o'rtachasi (0..1 o'lchamida ko'rsatiladi). */
const avg = (a: { criteriaScores: Record<CoreCriterionKey, number> }) =>
  (Object.values(a.criteriaScores).reduce((x, y) => x + y, 0) / 5).toFixed(1)

function genreLabelUz(g: WritingTask['genre']): string {
  return {
    email: 'Email',
    message: 'Xabar',
    essay: 'Insho',
    story: 'Hikoya',
    form: 'Anketa',
    paragraph: 'Paragraf',
    report: 'Hisobot',
  }[g]
}
