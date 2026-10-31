/**
 * Milliy CEFR / Multilevel Mock Exam.
 *
 * Talablar: 4 bo'lim, bo'lim vaqtlari, savol turlarini alohida boshqarish,
 * javoblarni saqlash, yakunlashdan oldin tasdiqlash, natijalar va xatolar
 * tahlili, kuchli/zaif jihatlar, tavsiyalar, format o'zgarsa konfiguratsiyani
 * yangilash imkoniyati. Material rasmiy emas — "mashq uchun yaratilgan
 * namuna" deb belgilanadi.
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Chip, EmptyState, InfoBanner, LoadingBlock, Modal, ProgressRing, Spinner } from '../components/ui'
import ExerciseRunner from '../components/ExerciseRunner'
import { useStore } from '../lib/store'
import { getBundle } from '../content'
import { checkAnswer } from '../lib/check'
import { audioItem, loadAudioManifest, hasAudio } from '../lib/audio'
import type { MockExamSectionSpec } from '../content/types'

interface SectionProgress {
  sectionId: string
  idx: number
  results: Record<string, { correct: boolean; given: string }>
  startedAt: number
  finishedAt: number | null
  secondsUsed: number
}

/** Jarayon holati — refresh'da yo'l qo'ymaslik uchun shu kalitga saqlanadi. */
const SESSION_KEY = 'aea-mock-session'

interface SavedSession {
  examId: string
  sectionIdx: number
  progress: SectionProgress[]
  savedAt: number
}

function loadSavedSession(examId: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as SavedSession
    // Boshqa imtihon yoki 6 soatdan eski sessiya tiklanmaydi.
    if (s.examId !== examId || Date.now() - s.savedAt > 6 * 3600_000) return null
    if (!Array.isArray(s.progress) || s.progress.length === 0) return null
    return s
  } catch {
    return null
  }
}

export default function MockExam() {
  const { data, actions, netOnline, ready } = useStore()
  const exam = getBundle(data.settings.currentLevel).mockExam

  const [running, setRunning] = useState(false)
  const [sectionIdx, setSectionIdx] = useState(0)
  const [progress, setProgress] = useState<SectionProgress[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [finished, setFinished] = useState<string | null>(null)
  const [manifestOk, setManifestOk] = useState<boolean | null>(null)
  const [saved, setSaved] = useState<SavedSession | null>(null)

  useEffect(() => {
    void loadAudioManifest().then((m) => setManifestOk(m !== null))
  }, [])

  // Saqlangan jarayon borimi? (sahifani yangilasak imtihon yo'qolmasin)
  useEffect(() => {
    if (exam) setSaved(loadSavedSession(exam.id))
  }, [exam])
  useEffect(() => {
    if (!running || progress.length === 0 || !exam) return
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ examId: exam.id, sectionIdx, progress, savedAt: Date.now() }))
    } catch {
      /* kvota — jimgina o'tamiz */
    }
  }, [running, progress, sectionIdx, exam])

  const sections = exam?.sections ?? []
  const section = sections[sectionIdx]
  const prog = progress.find((p) => p.sectionId === section?.id)

  // Bo'lim taymeri — vaqt tugasa bo'lim avtomatik yakunlanadi
  const [left, setLeft] = useState(0)
  const tickRef = useRef<number | null>(null)
  useEffect(() => {
    if (!running || !section || !prog || prog.finishedAt) return
    const end = prog.startedAt + section.minutes * 60_000
    const update = () => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setLeft(l)
      if (l === 0) finishSection()
    }
    update()
    tickRef.current = window.setInterval(update, 1000)
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, sectionIdx, progress])

  // Ma'lumot yuklanayotganda "topilmadi" ko'rsatmaslik kerak — aks holda
  // sahifa ochilganda bir lahza soxta bo'sholat ko'rinadi.
  if (!ready) return <LoadingBlock label="Mock Exam ma'lumotlari yuklanmoqda…" />
  if (!exam) {
    return <EmptyState title="Mock Exam topilmadi" body="Ushbu daraja uchun namunaviy imtihon hali mavjud emas." />
  }

  const start = () => {
    const now = Date.now()
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* e'tibor bermang */
    }
    setProgress(sections.map((s) => ({ sectionId: s.id, idx: 0, results: {}, startedAt: now, finishedAt: null, secondsUsed: 0 })))
    setSectionIdx(0)
    setRunning(true)
    setFinished(null)
    setSaved(null)
  }

  // Yarim qolgan imtihonni sahifa yangilangandan keyin davom ettirish.
  const resume = () => {
    const s = saved
    if (!s) return
    // Bo'limlar soni o'zgarsa (kontent yangilansa) tiklash xavfli — boshlaymiz.
    if (s.progress.length !== sections.length) {
      try {
        localStorage.removeItem(SESSION_KEY)
      } catch {
        /* e'tibor bermang */
      }
      setSaved(null)
      return
    }
    setProgress(s.progress)
    setSectionIdx(Math.max(0, Math.min(sections.length - 1, s.sectionIdx)))
    setRunning(true)
    setFinished(null)
  }

  // Bo'limga o'tish (chip orqali). Har bo'lim vaqti SHU BO'LIM OCHILGAN
  // paytdan yuradi — `start()` barcha bo'limlarga bitta startedAt beradi,
  // aks holda keyin ochilgan bo'limlarning taymeri allaqachon tugagan
  // bo'lib, 1 soniyada avtomatik yopilardi (finishSection ham shu qoidada).
  const gotoSection = (i: number) => {
    const s = sections[i]
    if (!s) return
    const now = Date.now()
    setProgress((ps) => ps.map((p) => (p.sectionId === s.id && !p.finishedAt ? { ...p, startedAt: now } : p)))
    setSectionIdx(i)
  }

  const recordResult = (sectionId: string, exId: string, correct: boolean, given: string) => {
    setProgress((ps) => ps.map((p) => (p.sectionId === sectionId ? { ...p, results: { ...p.results, [exId]: { correct, given } } } : p)))
  }

  const advance = () => {
    if (!section || !prog) return
    const exCount = examExercises(section).length
    if (prog.idx + 1 < exCount) {
      setProgress((ps) => ps.map((p) => (p.sectionId === section.id ? { ...p, idx: p.idx + 1 } : p)))
    } else {
      finishSection()
    }
  }

  const finishSection = () => {
    if (!section || !prog || prog.finishedAt) return
    const now = Date.now()
    setProgress((ps) => ps.map((p) => (p.sectionId === section.id ? { ...p, finishedAt: now, secondsUsed: Math.round((now - p.startedAt) / 1000) } : p)))
    const nextIdx = sections.findIndex((s, i) => i > sectionIdx && !progress.some((p) => p.sectionId === s.id && p.finishedAt))
    // KEYINGI BO'LIM taymeri shu paytdan yuradi: start() barcha bo'limlarga
    // bitta `startedAt` beradi, aks holda 2–4-bo'limlar ochilganda taymer
    // allaqachon tugagan bo'lardi va 1 soniyada avtomatik yopilardi.
    if (nextIdx > -1) {
      const nextStart = Date.now()
      const nextId = sections[nextIdx]!.id
      setProgress((ps) => ps.map((p) => (p.sectionId === nextId && !p.finishedAt ? { ...p, startedAt: nextStart } : p)))
      setSectionIdx(nextIdx)
    }
  }

  const allDone = () => sections.every((s) => progress.some((p) => p.sectionId === s.id && p.finishedAt))

  const buildAttempt = () => {
    const secs = sections.map((s) => {
      const p = progress.find((x) => x.sectionId === s.id)!
      const total = examExercises(s).length
      // `note:` bilan boshlanadigan yozuvlar — erkin matnli javob (G‘apirish
      // bo‘limidagi qoralama). Ular SAVOL EMAS: hisobga, ballga va xatolar
      // ro'yxatiga kirmaydi. (Eski bug: "1/0 javob" va soxta ijobiy natija.)
      const graded = Object.entries(p.results).filter(([k]) => !k.startsWith('note:'))
      const entries = graded.map(([, r]) => r)
      const answered = graded.length
      const correct = entries.filter((r) => r.correct).length
      const score = total === 0 ? null : Math.round((correct / Math.max(1, total)) * 100)
      return {
        sectionId: s.id,
        skill: s.skill,
        answered,
        total,
        score,
        startedAt: p.startedAt,
        finishedAt: p.finishedAt ?? Date.now(),
        exerciseResults: p.results,
      }
    })
    const scored = secs.filter((s) => s.score !== null)
    const totalScore = scored.length ? Math.round(scored.reduce((a, s) => a + (s.score ?? 0), 0) / scored.length) : null
    return {
      examId: exam.id,
      sections: secs,
      totalScore,
      speakingAdvisory:
        'Speaking bo‘limidagi baho mashq maqsadida berilgan — rasmiy imtihon natijasi emas va umumiy ballga kiritilmagan.',
    }
  }

  const submit = () => {
    const completed = buildAttempt()
    const attempt = actions.addMockAttempt(completed)
    // Saqlangan jarayon end kerak emas — natija store'da.
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* e'tibor bermang */
    }
    setSaved(null)
    setFinished(attempt.id)
    setRunning(false)
    setConfirmOpen(false)
  }

  // ---------- Yakuniy natijalar ----------
  if (finished) {
    const attempt = data.mockAttempts.find((a) => a.id === finished)
    if (!attempt) return <EmptyState title="Natija topilmadi" body="Imtihon natijasi yuklanmadi. Qaytadan urinib ko'ring." />
    return <Results exam={exam} attempt={attempt} onRetry={start} />
  }

  // ---------- Boshlash ekrani ----------
  if (!running) {
    const past = data.mockAttempts.filter((a) => a.examId === exam.id)
    return (
      <div className="grid gap-4">
        <Card className="grid gap-3">
          <h1 className="text-xl font-bold">{exam.titleUz}</h1>
          <p className="text-sm">{exam.descriptionUz}</p>
          <InfoBanner tone="warn">{exam.disclaimerUz}</InfoBanner>

          <div className="grid sm:grid-cols-2 gap-2">
            {sections.map((s) => (
              <div key={s.id} className="rounded-xl border p-3 grid gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{s.titleUz}</span>
                  <Chip>{s.minutes}′</Chip>
                </div>
                <ul className="text-xs muted">
                  {examExercises(s).length > 0 && <li>{examExercises(s).length} ta savol ({kindSummary(s)})</li>}
                  {s.writingTask && <li>Yozish: {s.writingTask.minWords}–{s.writingTask.maxWords} so‘z</li>}
                  {s.speakingTask && <li>G‘apirish: {s.speakingTask.targetSeconds}s</li>}
                  {s.audio && !hasAudio(manifestOk, s.audio) && <li className="!text-[var(--warn)]">Audio fayl topilmadi — tinglash bo‘limi matn asosida o‘tkaziladi</li>}
                </ul>
                {!s.formatVerified && (
                  <p className="text-[10px] muted italic">{s.formatNote}</p>
                )}
              </div>
            ))}
          </div>

          {!netOnline && <InfoBanner tone="warn">Internet yo‘q. Imtihon mahalliy ishlaydi, natija keyin sinxronlanadi.</InfoBanner>}

          {saved && (
            <InfoBanner tone="warn">
              Yarim qolgan urinish topildi ({new Date(saved.savedAt).toLocaleString('uz')}). Sahifa yangilanganda javoblar
              yo‘qolmasligi uchun saqlangan edi.
              <span className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" onClick={resume}>
                  Davom ettirish
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    try {
                      localStorage.removeItem(SESSION_KEY)
                    } catch {
                      /* e'tibor bermang */
                    }
                    setSaved(null)
                  }}
                >
                  Tashlab, yangi boshlash
                </Button>
              </span>
            </InfoBanner>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={start}>
              {data.mockAttempts.length ? 'Yangi urinish' : 'Imtihonni boshlash'}
            </Button>
          </div>

          {past.length > 0 && (
            <div className="grid gap-2">
              <h2 className="font-semibold text-sm">Oxirgi urinishlar</h2>
              {past.slice(-3).reverse().map((a) => (
                <div key={a.id} className="flex items-center gap-3 text-sm border rounded-xl p-2.5">
                  <ProgressRing value={(a.totalScore ?? 0) / 100} size={52} />
                  <div>
                    <div>{new Date(a.completedAt).toLocaleString('uz')}</div>
                    <div className="text-[11px] muted">{a.sections.map((s) => `${s.skill}: ${s.score ?? '—'}`).join(' · ')}</div>
                  </div>
                  <span className="flex-1" />
                  <Button size="sm" variant="ghost" onClick={() => setFinished(a.id)}>
                    Ko'rish
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    )
  }

  // ---------- Jarayon ----------
  if (!section || !prog) return <EmptyState title="Bo'lim topilmadi" />
  const exList = examExercises(section)
  const ex = exList[prog.idx]
  const leftMin = Math.floor(left / 60)
  const leftSec = left % 60

  return (
    <div className="grid gap-4">
      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <b>{section.titleEn}</b>
          <span className="muted text-sm">— {section.titleUz}</span>
        </div>
        <span className={`tabular-nums font-mono text-sm ${left < 60 ? 'text-[var(--bad)] font-bold' : ''}`}>
          ⏱ {String(leftMin).padStart(2, '0')}:{String(leftSec).padStart(2, '0')}
        </span>
        <span className="flex-1" />
        <div className="flex gap-1.5">
          {sections.map((s, i) => {
            const p = progress.find((x) => x.sectionId === s.id)
            return (
              <button
                key={s.id}
                type="button"
                aria-current={i === sectionIdx ? 'step' : undefined}
                onClick={() => gotoSection(i)}
                className={`chip cursor-pointer ${i === sectionIdx ? '!border-[var(--accent)] !text-[var(--accent)]' : ''} ${p?.finishedAt ? '!text-[var(--ok)]' : ''}`}
                title={`${s.titleUz} — ${p?.finishedAt ? 'yakunlandi' : 'davom etmoqda'}`}
              >
                {s.titleEn}
              </button>
            )
          })}
        </div>
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          Imtihonni yakunlash
        </Button>
      </Card>

      {section.audio && (
        <AudioPanel audio={section.audio} manifestOk={manifestOk} />
      )}

      {ex ? (
        <Card>
          <ExerciseRunner
            exercise={ex}
            index={prog.idx}
            total={exList.length}
            checked={(r) => recordResult(section.id, ex.id, r.correct, r.given)}
            onNext={advance}
          />
        </Card>
      ) : section.writingTask ? (
        <MiniWriting taskId={section.writingTask.id} prompt={section.writingTask.promptEn} instruction={section.writingTask.instructionUz} onDone={finishSection} />
      ) : section.speakingTask ? (
        <div className="grid gap-3">
          <Card className="grid gap-2">
            <h2 className="font-bold">{section.speakingTask.questionEn}</h2>
            <p className="text-sm muted">{section.speakingTask.hintUz}</p>
            <InfoBanner tone="warn">
              G‘apirish bo‘limida audio yozish va baholash{' '}
              <Link to="/speaking" className="underline font-semibold">Speaking</Link> bo‘limida mavjud. Bu yerda javob
              matnini qoldirishingiz mumkin — baho rasmiy imtihon natijasi emas.
            </InfoBanner>
            <Writing2Note textAnswer={prog.results['note:speaking-text']?.given ?? ''} onSave={(v) => recordResult(section.id, 'note:speaking-text', false, v)} onFinish={finishSection} />
          </Card>
        </div>
      ) : (
        <EmptyState title="Bu bo'limda savol yo'q" body="Bo'limni yakunlang." action={<Button onClick={finishSection}>Yakunlash</Button>} />
      )}

      <Modal open={confirmOpen} title="Imtihonni yakunlasangizmi?" onClose={() => setConfirmOpen(false)}>
        <div className="grid gap-3 text-sm">
          <p>Yakunlashdan oldin holat:</p>
          <ul className="grid gap-1.5">
            {sections.map((s) => {
              const p = progress.find((x) => x.sectionId === s.id)!
              const total = examExercises(s).length
              const answered = Object.keys(p.results).filter((k) => !k.startsWith('note:')).length
              return (
                <li key={s.id} className="flex justify-between border-b pb-1.5">
                  <span>{s.titleUz}</span>
                  <span className={answered < total ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}>
                    {answered}/{total} {s.writingTask || s.speakingTask ? '+ topshiriq' : ''} {p.finishedAt ? '(yakunlandi)' : '(tugamagan)'}
                  </span>
                </li>
              )
            })}
          </ul>
          {!allDone() && <InfoBanner tone="warn">Ba'zi bo'limlar tugamagan. Tugamagan savollar noto‘g‘ri deb hisoblanadi.</InfoBanner>}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Davom etish
            </Button>
            <Button variant="success" onClick={submit}>
              Ha, yakunlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function examExercises(s: MockExamSectionSpec) {
  return s.exercises
}

function kindSummary(s: MockExamSectionSpec): string {
  const kinds = new Map<string, number>()
  for (const e of s.exercises) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1)
  return [...kinds].map(([k, n]) => `${n}×${k}`).join(', ')
}

// ---------------------- Audio paneli ----------------------
function AudioPanel({ audio, manifestOk }: { audio: NonNullable<MockExamSectionSpec['audio']>; manifestOk: boolean | null }) {
  // Fayl manzili MANIFESTDAN olinadi (id bo'yicha) — kontentdagi eski
  // taxminiy nom emas. Manifest bazaga (GitHub Pages /AI_English_Academy/)
  // moslashtirilgan holda keladi.
  const item = audioItem(audio.id)
  const src = item?.available ? item.src : null
  const [loadError, setLoadError] = useState(false)
  return (
    <Card className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Chip tone="brand">{audio.source}</Chip>
        <Chip>{audio.license}</Chip>
        <Chip>{audio.attribution}</Chip>
      </div>
      {manifestOk === null ? (
        <div className="flex items-center gap-2 text-sm muted">
          <Spinner size={16} /> Audio fayl tekshirilmoqda…
        </div>
      ) : src && !loadError ? (
        <audio
          key={src}
          src={src}
          controls
          className="w-full"
          onError={() => setLoadError(true)}
        />
      ) : (
        <InfoBanner tone="warn">
          {loadError
            ? 'Audio fayl yuklanmadi (yo‘q yoki buzilgan). Ilova soxta pleyer ko‘rsatmaydi — savollar matn asosida.'
            : <>Audio fayl topilmadi (<code>/audio/{audio.id}.wav</code>). Ilova soxta pleyer ko‘rsatmaydi — savollar matn asosida. Audio yaratish uchun: <code>npm run audio:build</code>.</>}
        </InfoBanner>
      )}
    </Card>
  )
}

// ---------------------- Mini yozish (imtihon ichida) ----------------------
function MiniWriting({ taskId, prompt, instruction, onDone }: { taskId: string; prompt: string; instruction: string; onDone: () => void }) {
  const { actions } = useStore()
  const [text, setText] = useState('')
  const words = text.trim() ? text.trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length : 0
  return (
    <Card className="grid gap-3">
      <p className="text-sm font-medium">{prompt}</p>
      <p className="text-sm muted">{instruction}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="w-full rounded-xl border bg-[var(--panel)] p-3 text-sm"
        placeholder="Write in English…"
        aria-label="Imtihon javobi"
      />
      <div className="flex items-center gap-3 text-sm">
        <span className="tabular-nums">{words} so‘z</span>
        <span className="flex-1" />
        <Button
          onClick={() => {
            actions.addWriting(taskId, text, 0, null)
            onDone()
          }}
        >
          Saqlash va bo'limni yakunlash
        </Button>
      </div>
    </Card>
  )
}

function Writing2Note({ textAnswer, onSave, onFinish }: { textAnswer: string; onSave: (v: string) => void; onFinish: () => void }) {
  const [v, setV] = useState(textAnswer)
  return (
    <div className="grid gap-2">
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={6} className="w-full rounded-xl border bg-[var(--panel)] p-3 text-sm" placeholder="Write your answer here…" aria-label="G'apirish bo'limi matn javobi" />
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => onSave(v)}>Javobni saqlash</Button>
        <Button onClick={onFinish}>Bo'limni yakunlash</Button>
      </div>
    </div>
  )
}

// ---------------------- Natijalar ----------------------
function Results({ exam, attempt, onRetry }: { exam: NonNullable<ReturnType<typeof getBundle>['mockExam']>; attempt: NonNullable<ReturnType<typeof useStore>['data']['mockAttempts'][number]>; onRetry: () => void }) {
  const strong = attempt.sections.filter((s) => (s.score ?? 0) >= 75).map((s) => s.skill)
  const weak = attempt.sections.filter((s) => (s.score ?? 0) < 60).map((s) => s.skill)

  const mistakes = attempt.sections.flatMap((s) =>
    Object.entries(s.exerciseResults)
      // `note:` yozuvlari — erkin matnli javob, xato emas; bo‘sh javoblar
      // ham ro'yxatga olinmaydi (ular imtihonda ishtirok etmagan).
      .filter(([k, r]) => !k.startsWith('note:') && !r.correct && r.given.trim() !== '')
      .map(([exId, r]) => ({ section: s.skill, exId, given: r.given })),
  )

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3 text-center">
        <h1 className="text-xl font-bold">Imtihon natijasi</h1>
        <div className="mx-auto">
          <ProgressRing value={(attempt.totalScore ?? 0) / 100} size={110} label="umumiy" />
        </div>
        <p className="text-sm">{exam.disclaimerUz}</p>
        <p className="text-[11px] muted">{attempt.speakingAdvisory}</p>
      </Card>

      <Card className="grid gap-2">
        <h2 className="font-bold">Bo'limlar bo'yicha</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {attempt.sections.map((s) => (
            <div key={s.sectionId} className="rounded-xl border p-3 flex items-center gap-3">
              <ProgressRing value={(s.score ?? 0) / 100} size={64} />
              <div className="grid gap-0.5">
                <b>{s.skill}</b>
                <span className="text-xs muted">
                  {s.answered}/{s.total} javob · {Math.round(s.finishedAt - s.startedAt) / 1000}s
                </span>
                <Chip tone={(s.score ?? 0) >= 75 ? 'ok' : (s.score ?? 0) >= 60 ? 'warn' : 'bad'}>{s.score ?? '—'} ball</Chip>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="grid gap-2">
        <h2 className="font-bold">Kuchli va zaif jihatlar</h2>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
            <b>Kuchli:</b> {strong.length ? strong.join(', ') : 'hozircha yo‘q'}
          </div>
          <div className="rounded-xl bg-rose-50 dark:bg-rose-900/15 p-3">
            <b>Zaif:</b> {weak.length ? weak.join(', ') : 'jiddiy zaiflik topilmadi'}
          </div>
        </div>
        <InfoBanner>
          <b>Tavsiya:</b>{' '}
          {weak.length
            ? `Zaif bo‘limlarni kundalik rejada kuchaytirdik — Progress bo‘limida yangi taqsimotni ko‘rasiz. ${weak.join(', ')} bo‘limlaridagi mashqlarni takrorlang.`
            : 'Umumiy holat yaxshi. Keyingi daraja uchun bo‘lim testlaridan o‘tishni davom ettiring.'}
        </InfoBanner>
      </Card>

      <Card className="grid gap-2">
        <h2 className="font-bold">Xatolar tahlili ({mistakes.length})</h2>
        {mistakes.length === 0 ? (
          <p className="text-sm muted">Xato qilinmadi yoki savollarga javob berilmadi.</p>
        ) : (
          mistakes.slice(0, 20).map((m, i) => {
            const ex = findEx(m.exId)
            const g = ex ? guessAnswer(ex, m.given) : null
            const res = ex && g !== null ? checkAnswer(ex, g) : null
            return (
              <div key={i} className="text-sm border-l-4 !border-l-[var(--bad)] pl-3 py-1">
                <div className="flex gap-2 items-center">
                  <Chip>{m.section}</Chip>
                  <span className="muted text-xs">{ex?.instructionUz ?? m.exId}</span>
                </div>
                {res && (
                  <p className="text-xs muted mt-0.5">
                    Sizning javobingiz: <span className="line-through">{res.given || '—'}</span> · To‘g‘ri: <b>{res.expected}</b>
                  </p>
                )}
                {ex && <p className="text-xs mt-0.5">{ex.explanationUz}</p>}
              </div>
            )
          })
        )}
      </Card>

      <div className="flex gap-2">
        <Button onClick={onRetry}>Qayta topshirish</Button>
        <Link to="/errors" className="inline-flex">
          <Button variant="secondary">Xatolar daftari</Button>
        </Link>
      </div>
    </div>
  )
}

import { findExercise } from '../content'
function findEx(id: string) {
  return findExercise(id)
}
/**
 * Saqlangan javob matnini qayta tekshirish uchun boshlang'ich shakliga
 * qaytarish. `null` — qayta hisoblab bo'lmaydi (juftlik turi), sahifa
 * saqlangan matnni o'zini ko'rsatadi.
 */
function guessAnswer(ex: NonNullable<ReturnType<typeof findExercise>>, given: string): unknown {
  if (ex.kind === 'multiple-choice') {
    const i = ex.options.indexOf(given)
    return i > -1 ? i : null
  }
  if (ex.kind === 'true-false-notgiven') return given.toLowerCase()
  if (ex.kind === 'gap-fill' || ex.kind === 'translation') return given.split(' / ')
  if (ex.kind === 'word-order') return given.split(' ')
  return null
}
