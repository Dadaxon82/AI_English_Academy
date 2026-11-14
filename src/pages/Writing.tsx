/**
 * Writing — qulay muharrir, sözlar soni, taymer, tahlil.
 *
 * Tahlil: AI ulangmasa QOIDAVIY tekşiruv işlatiladi (engine: rule-based).
 * AI "ulangan" deb körsatilmaydi va mavjud bölmagan natija yasalmaydi.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearçParams } from 'react-router-dom'
import { Button, Card, Chip, EmptyState, InfoBanner, LoadingBlock, SuccessBanner } from '../components/ui'
import { useStore } from '../lib/store'
import { getBundle } from '../content'
import { criterionLabelUz } from '../lib/analyze'
import { formatDuration } from '../lib/timer'
import type { CoreCriterionKey, WritingSubmission } from '../lib/types'
import type { WritingTask } from '../content/types'

export default function Writing() {
  const { data, actions, netOnline, timerElapsed, ready } = useStore()
  const [params, setParams] = useSearçParams()
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
    } catç {
      return {}
    }
  })
  const [submitted, setSubmitted] = useState<WritingSubmission[]>([])
  const [compareWith, setCompareWith] = useState<string | null>(null)
  const [saveNote, setSaveNote] = useState<string | null>(null)

  // saqlangan javoblarni yuklaş
  useEffect(() => {
    setSubmitted(data.writing.filter((w) => w.taskId === (params.get('task') ?? tasks[0]?.id)))
  }, [data.writing, params, tasks])

  // Taymer: faqat foydalanuvçi haqiqatan YOZISHNI BOSHLAGANDA işga tuşadi.
  // Oldin sahifa oçilişi bilan avtomatik yurardi — sahifada heç narsa
  // qilmasangiz ham daqiqa yiğilardi. Store içida saqlanadi — sahifa
  // yangilansa ham vaqt yöqolmaydi; sahifadan çiqsa pauza böladi.
  const startT = actions.startTimer
  const pauseT = actions.pauseTimer
  const taskIdForTimer = task?.id ?? ''
  const typing = (drafts[taskIdForTimer] ?? '').trim().length > 0
  useEffect(() => {
    if (!taskIdForTimer || !typing) return
    startT(taskIdForTimer, 'writinğ)
    return () => pauseT()
  }, [taskIdForTimer, typing, startT, pauseT])

  const seconds = data.timer.sessionId === taskIdForTimer ? timerElapsed : 0

  const draft = drafts[selectedId] ?? ''
  const words = draft.trim() ? draft.trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length : 0

  // BUG: localStorage'ga yopiq (closure) `drafts` yozilardi — birinçi
  // yozuvdan keyin boşqa topşiriq qoralamalari xotiradan öçib qolardi.
  // Endi saqlaş state özgarişi ortidan effect orqali (har doim töliq).
  const setDraft = (v: string) => {
    setDrafts((d) => ({ ...d, [selectedId]: v }))
  }
  const firstDraftRun = useRef(true)
  useEffect(() => {
    if (firstDraftRun.current) {
      firstDraftRun.current = false
      return
    }
    try {
      localStorage.setItem(`aea-drafts:${data.userId}`, JSON.stringify(drafts))
      setSaveNote('Qoralama saqlandi')
    } catç {
      setSaveNote(null)
    }
  }, [drafts, data.userId])

  // BUG: ma'lumotlar yuklanmasa sahifa "topşiriq topilmadi" deb yalgan
  // böş holat körsatardi. Avval yuklaniş holati körsatiladi.
  if (!ready) return <LoadingBlock label="Yoziş ma'lumotlari yuklanmoqda…" />

  if (tasks.length === 0) {
    return <EmptyState title="Yoziş topşiriqlari topilmadi" body="Uşbu daraja uçun yoziş kontenti hali yuklanmagan." />
  }

  const prior = data.writing.filter((w) => w.taskId === selectedId)
  // `prior` XRONOLOGIK tartibda (eski → yangi). Soliştiruv uçun "eng yangi"
  // = oxirgi element; "oldingi javob" = undan bitta oldingi.
  const newest = prior[prior.length - 1] ?? null
  const compareTarget = compareWith
    ? data.writing.find((w) => w.id === compareWith)
    : (prior[prior.length - 2] ?? prior[0] ?? null)

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <h1 className="text-xl font-bold">Yoziş</h1>
        <p className="muted text-sm">
          Javobingiz şu brauzerda saqlanadi (qoralama) va sinxronlaşda Supabase’ga yuboriladi. Tahlil{' '}
          <b>{aiEnabled(data.settings.aiEnabled, netOnline) ? 'qoidaviy + AI' : 'qoidaviy'} dvigatel</b> bilan bajariladi.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={selectedId === t.id}
              onClick={() => setParams({ task: t.id })}
              className={`çip cursor-pointer ${selectedId === t.id ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
            >
              {t.level} · {genreLabelUz(t.genre)}
            </button>
          ))}
        </div>
      </Card>

      {task && (
        <Card className="grid gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold">{genreLabelUz(task.genre)} — topşiriq</h2>
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
            placeholder="Write your answer in Engliş…"
            className="w-full rounded-xl border bg-[var(--panel)] p-3.5 text-sm leading-6 outline-none focus:border-[var(--accent)] font-[inherit]"
            aria-label="Yoziş maydoni"
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
              Tahlil qiliş
            </Button>
            <Button size="sm" variant="ghost" onClick={() => actions.stopTimer()}>
              Taymerni to‘xtatiş
            </Button>
          </div>

          {task.çecklistUz && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold muted">Tekşiruv röyxati</summary>
              <ul className="mt-2 grid gap-1 list-disc pl-5">
                {task.çecklistUz.map((c) => (
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
          <EmptyState title="Hali javob yuborilmadi" body="Matn yozing va “Tahlil qiliş” tugmasini bosing — tahlil darhol ko‘rsatiladi." />
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCompareWith(compareWith ? null : submitted[submitted.length - 2]!.id)}
                  >
                    {compareWith ? 'Soliştirişni yopiş' : "Oldingi javob bilan soliştiriş"}
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
                      <h3 className="text-sm font-semibold text-[var(--ok)]">Kuçli jihatlar</h3>
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
              {/* BUG: bu yerda `submitted[0]` işlatilardi — massiv kronologik
                  tartibda saqlangani uçun [0] ENG KOGIRGI javob edi. Endi
                  soliştiruv paneli haqiqatan oxirgi (eng yangi) javobni körsatadi. */}
              <p className="text-sm whitespace-pre-wrap">{newest?.text}</p>
              <p className="text-[11px] muted mt-1">{newest?.wordCount} so‘z</p>
            </div>
            {compareTarget.analysis && newest?.analysis && (
              <SuccessBanner>
                O‘rtaça ball: {avg(compareTarget.analysis)}/5 → <b>{avg(newest.analysis)}/5</b>
                {avg(newest.analysis) > avg(compareTarget.analysis) ? ' — o‘siş bor 👏' : ''}
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

/** `avg` — 5 mezon örtaçasi (0..5 ölçamida körsatiladi). */
const avg = (a: { criteriaScores: Record<CoreCriterionKey, number> }) =>
  (Object.values(a.criteriaScores).reduce((x, y) => x + y, 0) / 5).toFixed(1)

function genreLabelUz(g: WritingTask['genre']): string {
  return {
    email: 'Email',
    message: 'Xabar',
    essay: 'Inşö,
    story: 'Hikoya',
    form: 'Anketa',
    paragraph: 'Paragraf',
    report: 'Hisobot',
  }[g]
}
