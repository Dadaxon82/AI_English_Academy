/**
 * Writing — qulay muharrir, so'zlar soni, taymer, tahlil.
 *
 * Tahlil: AI ulangmasa QOIDAVIY tekshiruv ishlatiladi (engine: rule-based).
 * AI "ulangan" deb ko'rsatilmaydi va mavjud bo'lmagan natija yasalmaydi.
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Chip, EmptyState, InfoBanner, LoadingBlock, SuccessBanner } from '../components/ui'
import { useStore } from '../lib/storeContext'
import { LessonStartCard, WritingLesson } from '../components/SectionLessons'
import { writingLesson } from '../lib/lessons'
import { getBundle } from '../content'
import { aiRuntimeEnabled } from '../lib/ai'
import { criterionLabelUz } from '../lib/analyze'
import { formatDuration } from '../lib/timer'
import type { CoreCriterionKey } from '../lib/types'
import type { WritingTask } from '../content/types'

export default function Writing() {
  const { data, actions, netOnline, timerElapsed, ready } = useStore()
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
  const [lesson, setLesson] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [saveNote, setSaveNote] = useState<string | null>(null)

  // Saqlangan javoblar — store'dan hosila (yangi tahlil ham o'zi qo'shiladi).
  const submittedTaskId = params.get('task') ?? tasks[0]?.id
  const submitted = useMemo(() => data.writing.filter((w) => w.taskId === submittedTaskId), [data.writing, submittedTaskId])

  // Taymer: faqat foydalanuvchi haqiqatan YOZISHNI BOSHLAGANDA ishga tushadi.
  // Oldin sahifa ochilishi bilan avtomatik yurardi — sahifada hech narsa
  // qilmasangiz ham daqiqa yig'ilardi. Store ichida saqlanadi — sahifa
  // yangilansa ham vaqt yo'qolmaydi; sahifadan chiqsa pauza bo'ladi.
  const startT = actions.startTimer
  const pauseT = actions.pauseTimer
  const taskIdForTimer = task?.id ?? ''
  const typing = (drafts[taskIdForTimer] ?? '').trim().length > 0
  useEffect(() => {
    if (!taskIdForTimer || !typing) return
    startT(taskIdForTimer, 'writing')
    return () => pauseT()
  }, [taskIdForTimer, typing, startT, pauseT])

  const seconds = data.timer.sessionId === taskIdForTimer ? timerElapsed : 0

  const draft = drafts[selectedId] ?? ''
  const words = draft.trim() ? draft.trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length : 0

  // BUG: localStorage'ga yopiq (closure) `drafts` yozilardi — birinchi
  // yozuvdan keyin boshqa topshiriq qoralamalari xotiradan o'chib qolardi.
  // Endi saqlash state o'zgarishi ortidan effect orqali (har doim to'liq).
  // Saqlash yozish ishlovchisida: joriy render'dagi TO'LIQ `drafts` + yangi
  // qiymat yoziladi (boshqa topshiriqlar qoralamasi o'chmaydi).
  const setDraft = (v: string) => {
    const next = { ...drafts, [selectedId]: v }
    setDrafts(next)
    try {
      localStorage.setItem(`aea-drafts:${data.userId}`, JSON.stringify(next))
      setSaveNote('Qoralama saqlandi')
    } catch {
      setSaveNote(null)
    }
  }

  // BUG: ma'lumotlar yuklanmasa sahifa "topshiriq topilmadi" deb yalgan
  // bo'sh holat ko'rsatardi. Avval yuklanish holati ko'rsatiladi.
  if (!ready) return <LoadingBlock label="Yozish ma'lumotlari yuklanmoqda…" />

  if (tasks.length === 0) {
    return <EmptyState title="Yozish topshiriqlari topilmadi" body="Ushbu daraja uchun yozish kontenti hali yuklanmagan." />
  }

  const prior = data.writing.filter((w) => w.taskId === selectedId)
  // `prior` XRONOLOGIK tartibda (eski → yangi). Solishtiruv uchun "eng yangi"
  // = oxirgi element; "oldingi javob" = undan bitta oldingi.
  const newest = prior[prior.length - 1] ?? null
  // ESKI BUG: bitta javob bo'lsa ham panel chiqib, javobni O'ZI bilan
  // solishtirardi, "Solishtirishni yopish" esa uni yopmasdi. Endi panel faqat
  // kamida ikki javob bo'lganda va foydalanuvchi ochganda ko'rinadi.
  const previous = prior.length >= 2 ? prior[prior.length - 2]! : null
  const compareTarget = showCompare ? previous : null

  if (lesson && task) return <WritingLesson task={task} onClose={() => setLesson(false)} />

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <h1 className="text-xl font-bold">Yozish</h1>
        <p className="muted text-sm">
          Javobingiz shu brauzerda saqlanadi (qoralama) va sinxronlashda Supabase’ga yuboriladi. Tahlil{' '}
          <b>{aiRuntimeEnabled(data.settings.aiEnabled, netOnline) ? 'qoidaviy + AI' : 'qoidaviy'} dvigatel</b> bilan bajariladi.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={selectedId === t.id}
              onClick={() => setParams({ task: t.id })}
              className={`chip cursor-pointer ${selectedId === t.id ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
            >
              {t.level} · {genreLabelUz(t.genre)}
            </button>
          ))}
        </div>
      </Card>

      {task && (
        <LessonStartCard
          kicker="Yozish darsi"
          title={`${genreLabelUz(task.genre)}: tayyorgarlik`}
          body="Namuna javob gaplarini plitkalardan tuzing, so‘ng o‘zingiz yozing"
          steps={writingLesson(task)}
          onStart={() => setLesson(true)}
        />
      )}

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
                // Qayta yozish oxirgi javobga bog'lanadi (eski: doim birinchisiga).
                actions.addWriting(task.id, draft, seconds, newest?.id ?? null)
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
                {i === 0 && previous && (
                  <Button size="sm" variant="ghost" aria-pressed={showCompare} onClick={() => setShowCompare((v) => !v)}>
                    {showCompare ? 'Solishtirishni yopish' : 'Oldingi javob bilan solishtirish'}
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
              {/* BUG: bu yerda `submitted[0]` ishlatilardi — massiv kronologik
                  tartibda saqlangani uchun [0] ENG KOGIRGI javob edi. Endi
                  solishtiruv paneli haqiqatan oxirgi (eng yangi) javobni ko'rsatadi. */}
              <p className="text-sm whitespace-pre-wrap">{newest?.text}</p>
              <p className="text-[11px] muted mt-1">{newest?.wordCount} so‘z</p>
            </div>
            {compareTarget.analysis && newest?.analysis && (
              <SuccessBanner>
                O‘rtacha ball: {avg(compareTarget.analysis)}/5 → <b>{avg(newest.analysis)}/5</b>
                {avg(newest.analysis) > avg(compareTarget.analysis) ? ' — o‘sish bor 👏' : ''}
              </SuccessBanner>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

/** `avg` — 5 mezon o'rtachasi (0..5 o'lchamida ko'rsatiladi). */
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
