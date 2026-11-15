/**
 * Bo'limlar sahifasi — kursning A1.1 … C1.2 bo'limlari kartalari, progress va
 * sakrash testi. Mantiq: `src/lib/sections.ts` (sof funksiyalar).
 *
 * HAR TUGMA HAQIQIY: "Davom etish"/"Takrorlash" o'quv yo'liga o'tadi,
 * "Sakrash testi" shu yerda haqiqiy testni boshlaydi, "Batafsil" kartani
 * ochadi. Kontenti yo'q bo'limda tugma yo'q — ochiq "tayyorlanmoqda" yozuvi.
 */

import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ExerciseRunner from '../components/ExerciseRunner'
import { MascotFigure } from '../components/Mascot'
import { Button, Chip, InfoBanner, LoadingBlock, SuccessBanner } from '../components/ui'
import type { CheckResult } from '../lib/check'
import { JUMP_PASS_SCORE, buildSections, jumpTestExercises, skippedDaysFor, type SectionCard } from '../lib/sections'
import { levelLabel } from '../lib/skillScoring'
import { useStore } from '../lib/storeContext'
import { CHUNKY, CHUNKY_ALT, CHUNKY_GO, CHUNKY_PLAIN } from '../components/chunky'
import { useOpenSignUp } from '../lib/useOpenSignUp'
import { useAuthActions } from '../lib/authContext'
import { GUEST_SECTION_ID } from '../lib/guest'


const STATUS_CHIP: Record<SectionCard['status'], { text: string; tone: 'ok' | 'brand' | 'warn' | 'default' }> = {
  done: { text: '✓ Yakunlangan', tone: 'ok' },
  current: { text: 'Joriy bölim', tone: 'brand' },
  locked: { text: 'Qulflangan', tone: 'warn' },
  empty: { text: 'Tayyorlanmoqda', tone: 'default' },
}

/** Katta "3D" tugma (pastki chegara — chuqurlik). */
const chunky = `w-full ${CHUNKY} px-5 py-3 disabled:opacity-50`
const chunkyGreen = `${chunky} ${CHUNKY_GO}`
const chunkyBlue = `${chunky} ${CHUNKY_ALT}`
const chunkyPlain = `${chunky} ${CHUNKY_PLAIN}`

export default function Sections() {
  const { data, ready } = useStore()
  const sections = useMemo(() => buildSections(data), [data])
  const [jumpId, setJumpId] = useState<string | null>(null)

  if (!ready) return <LoadingBlock label="Bölimlar yuklanmoqda…" />

  const withContent = sections.filter((s) => s.status !== 'empty')
  const doneCount = withContent.filter((s) => s.status === 'done').length

  return (
    <div className="grid gap-4 sm:gap-5 max-w-3xl w-full mx-auto">
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Link
          to="/path"
          aria-label="Öquv yöliga qaytiş"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[var(--panel-2)] text-navy-700 dark:text-navy-300"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-xl sm:text-2xl font-extrabold text-center">Bölimlar</h1>
        <span className="text-xs font-bold muted tabular-nums whitespace-nowrap">
          {doneCount}/{withContent.length} ✓
        </span>
      </header>
      <p className="muted text-sm text-center -mt-2">
        Har CEFR darajasida ikki bölim. Bilsangiz — sakraş testi bilan oldinga öting (darajangiz özgarmaydi: u
        faqat bir neçta könikma böyiça dalil bilan kötariladi).
      </p>

      <ol className="grid gap-4" aria-label="Bölimlar röyxati">
        {sections.map((s) => (
          <li key={s.id}>
            <SectionCardView
              section={s}
              jumping={jumpId === s.id}
              onJump={() => setJumpId(s.id)}
              onCloseJump={() => setJumpId(null)}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}

function SectionCardView({
  section: s,
  jumping,
  onJump,
  onCloseJump,
}: {
  section: SectionCard
  jumping: boolean
  onJump: () => void
  onCloseJump: () => void
}) {
  const nav = useNavigate()
  const openSignUp = useOpenSignUp()
  // Mehmon rejimida faqat A1.1 ochiq — qolganida ro'yxatdan o'tish taklifi.
  const guestLocked = Boolean(useAuthActions()?.guest) && s.id !== GUEST_SECTION_ID && s.status !== 'empty'
  const [open, setOpen] = useState(false)
  const chip = STATUS_CHIP[s.status]
  const total = s.days.length
  const pct = total === 0 ? 0 : Math.round((s.daysDone / total) * 100)
  const lvl = levelLabel(s.level)
  const empty = s.status === 'empty'
  const accent =
    s.status === 'current'
      ? 'border-emerald-400 dark:border-emerald-600'
      : s.status === 'done'
        ? 'border-amber-300 dark:border-amber-600'
        : ''

  return (
    <article
      className={`panel rounded-3xl border-2 border-b-4 p-4 sm:p-6 grid gap-4 ${accent} ${empty ? 'border-dashed' : ''}`}
      aria-label={`${s.label}-bölim`}
    >
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="grid gap-2.5 min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider muted">
            {s.level} · {lvl.titleUz}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-extrabold">{s.label}-bölim</h2>
            <Chip tone={chip.tone}>{chip.text}</Chip>
          </div>

          {s.status === 'done' && (
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              ✓ Barça {total} kun yakunlangan
              {s.jumpScore !== null && s.jumpScore >= JUMP_PASS_SCORE ? ` · sakraş testi ${s.jumpScore}%` : ''}
            </p>
          )}
          {(s.status === 'current' || s.status === 'locked') && (
            <div
              className="relative h-5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
              role="progressbar"
              aria-label={`${s.label} progressi`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={s.daysDone}
            >
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tabular-nums text-slate-700 dark:text-slate-100">
                {s.daysDone} / {total} kun
              </span>
            </div>
          )}
          {s.status === 'locked' && (
            <p className="text-sm font-semibold">
              {s.label} ga sakrab ötasizmi?
              {s.jumpScore !== null && <span className="muted font-normal"> Oxirgi uriniş: {s.jumpScore}%.</span>}
            </p>
          )}
          {empty && <p className="text-sm muted">Bu bölim darslari hali tayyorlanmoqda — hozirça oçib bölmaydi.</p>}

          {!empty && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="justify-self-start text-sm font-extrabold uppercase tracking-wide text-navy-700 dark:text-navy-300 hover:underline"
            >
              {open ? 'Yopiş ▴' : 'Batafsil ▾'}
            </button>
          )}
        </div>

        {s.sample && (
          <div className="flex sm:flex-col items-center gap-2 sm:w-44">
            <div className="relative rounded-2xl border-2 px-3 py-2 text-sm bg-[var(--panel)] min-w-0 order-2 sm:order-1">
              <p className="font-bold break-words" lang="en">
                {s.sample.en}
              </p>
              <p className="text-xs muted break-words">{s.sample.uz}</p>
              <span
                aria-hidden
                className="hidden sm:block absolute left-1/2 -bottom-2 w-3 h-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 bg-[var(--panel)]"
              />
            </div>
            <MascotFigure className="order-1 sm:order-2 shrink-0" maxHeight="max-h-20 sm:max-h-28" alt="" />
          </div>
        )}
      </div>

      {open && (
        <div className="grid gap-2 text-sm">
          <p>{s.summaryUz}</p>
          <ol className="grid gap-1.5">
            {s.days.map((d) => (
              <li key={d.id} className="rounded-xl border px-3 py-2 flex items-center gap-2">
                <span className="font-extrabold tabular-nums">{d.dayNumber}-kun</span>
                <span className="flex-1 min-w-0">{d.titleUz}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {guestLocked && (
        <>
          <p className="text-sm font-semibold">🔒 Bu bölim röyxatdan ötganlar uçun oçiq.</p>
          <button type="button" className={chunkyGreen} onClick={openSignUp}>
            Röyxatdan ötiş
          </button>
        </>
      )}
      {!guestLocked && s.status === 'current' && (
        <button type="button" className={chunkyGreen} onClick={() => nav('/path')}>
          Davom etiş
        </button>
      )}
      {!guestLocked && s.status === 'done' && (
        <button type="button" className={chunkyPlain} onClick={() => nav('/path')}>
          Takrorlaş
        </button>
      )}
      {!guestLocked && s.canJump && !jumping && (
        <button type="button" className={chunkyBlue} onClick={onJump}>
          {s.label} ga sakraş testi
        </button>
      )}

      {!guestLocked && jumping && <JumpTest section={s} onClose={onCloseJump} />}
    </article>
  )
}

function JumpTest({ section, onClose }: { section: SectionCard; onClose: () => void }) {
  const { data, actions } = useStore()
  const nav = useNavigate()
  // Test boshlangan paytdagi to'plam qotiriladi — natija yozilgach kunlar
  // `completedDays`ga qo'shiladi va qayta hisob bo'sh ro'yxat berardi.
  const [exercises] = useState(() => jumpTestExercises(section.id, data))
  const [skippedCount] = useState(() => skippedDaysFor(section.id, data).length)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [pos, setPos] = useState(0)
  const [lastResult, setLastResult] = useState<CheckResult | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const acc = useRef<Record<string, CheckResult>>({})
  const total = exercises.length

  if (total === 0) {
    return <InfoBanner tone="warn">Ötkazib yuboriladigan kunlarda test savollari topilmadi — sakraş mumkin emas.</InfoBanner>
  }

  const start = () => {
    acc.current = {}
    setPos(0)
    setLastResult(null)
    setScore(null)
    setPhase('running')
  }

  const onChecked = (r: CheckResult, secondsSpent: number) => {
    const ex = exercises[pos]
    if (!ex) return
    acc.current[ex.id] = r
    setLastResult(r)
    actions.recordAttempt({ exercise: ex, correct: r.correct, partial: r.partial, given: r.given, secondsSpent, source: 'section_test' })
  }

  const onNext = () => {
    if (pos + 1 < total) {
      setPos(pos + 1)
      return
    }
    const earned = Object.values(acc.current).reduce((a, r) => a + (r.correct ? 1 : r.partial), 0)
    const s = Math.round((earned / total) * 100)
    setScore(s)
    setPhase('done')
    actions.completeLesson(Object.keys(acc.current).length, Object.values(acc.current).filter((r) => !r.correct).length)
    actions.jumpToSection(section.id, s)
  }

  return (
    <div className="grid gap-3 rounded-2xl border p-3 sm:p-4">
      <h3 className="font-bold">{section.label} ga sakraş testi</h3>
      {phase === 'idle' && (
        <>
          <p className="text-sm muted">
            {total} ta savol, oldingi {skippedCount} ta kunning yakuniy testlaridan. Ötiş uçun {JUMP_PASS_SCORE}% kerak.
            Ötsangiz, ötkazib yuborilgan kunlar yakunlangan deb belgilanadi va {section.label} oçiladi. Yuraklar
            sarflanmaydi, darajangiz özgarmaydi.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={start}>
              Testni boşlaş
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Bekor qiliş
            </Button>
          </div>
        </>
      )}
      {phase === 'running' && exercises[pos] && (
        <ExerciseRunner
          exercise={exercises[pos]}
          checked={onChecked}
          index={pos}
          total={total}
          onNext={onNext}
          prevResult={lastResult && !lastResult.correct ? lastResult : null}
          heartFree
          comboTracked
          onExit={onClose}
        />
      )}
      {phase === 'done' && score !== null && (
        <>
          {score >= JUMP_PASS_SCORE ? (
            <SuccessBanner>
              Sakraş testi topşirildi: <b>{score}%</b> ≥ {JUMP_PASS_SCORE}% — {section.label} oçildi.
            </SuccessBanner>
          ) : (
            <InfoBanner tone="warn">
              Natija: <b>{score}%</b> &lt; {JUMP_PASS_SCORE}% — sakraş uçun yetarli emas. Joriy bölimni davom ettiring yoki
              keyinroq qayta urining.
            </InfoBanner>
          )}
          <div className="flex flex-wrap gap-2">
            {score >= JUMP_PASS_SCORE ? (
              <Button size="sm" onClick={() => nav('/path')}>
                Öquv yöliga ötiş
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={start}>
                Qayta uriniş
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Yopiş
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
