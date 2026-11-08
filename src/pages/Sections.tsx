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
import { MascotAvatar } from '../components/Mascot'
import { Button, Card, Chip, InfoBanner, LoadingBlock, SuccessBanner } from '../components/ui'
import type { CheckResult } from '../lib/check'
import { JUMP_PASS_SCORE, buildSections, jumpTestExercises, skippedDaysFor, type SectionCard } from '../lib/sections'
import { levelLabel } from '../lib/skillScoring'
import { useStore } from '../lib/store'

const STATUS_CHIP: Record<SectionCard['status'], { text: string; tone: 'ok' | 'brand' | 'warn' | 'default' }> = {
  done: { text: '✓ Yakunlangan', tone: 'ok' },
  current: { text: 'Joriy bo‘lim', tone: 'brand' },
  locked: { text: 'Qulflangan', tone: 'warn' },
  empty: { text: 'Tayyorlanmoqda', tone: 'default' },
}

export default function Sections() {
  const { data, ready } = useStore()
  const sections = useMemo(() => buildSections(data), [data])
  const [jumpId, setJumpId] = useState<string | null>(null)

  if (!ready) return <LoadingBlock label="Bo‘limlar yuklanmoqda…" />

  const withContent = sections.filter((s) => s.status !== 'empty')
  const doneCount = withContent.filter((s) => s.status === 'done').length

  return (
    <div className="grid gap-4 sm:gap-5">
      <Card as="section" className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/path" className="text-sm font-semibold text-navy-700 dark:text-navy-300 hover:underline">
            ← O‘quv yo‘li
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Bo‘limlar</h1>
        <p className="muted text-sm">
          Kurs har CEFR darajasida ikki bo‘limdan iborat (A1.1, A1.2 … C1.2). Bo‘lim kunlari ketma-ket ochiladi; bilsangiz
          — sakrash testi bilan oldinga o‘ting. Sakrash testi darajangizni o‘zgartirmaydi: daraja faqat bir nechta
          ko‘nikma bo‘yicha dalil bilan ko‘tariladi.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="brand">
            {doneCount}/{withContent.length} bo‘lim yakunlangan
          </Chip>
          <Chip>Joriy daraja: {data.settings.currentLevel}</Chip>
        </div>
      </Card>

      <ol className="grid gap-3.5" aria-label="Bo‘limlar ro‘yxati">
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
  const [open, setOpen] = useState(false)
  const chip = STATUS_CHIP[s.status]
  const total = s.days.length
  const pct = total === 0 ? 0 : Math.round((s.daysDone / total) * 100)
  const lvl = levelLabel(s.level)

  return (
    <Card className={`grid gap-3 ${s.status === 'locked' || s.status === 'empty' ? 'opacity-90' : ''}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0 grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-lg">{s.label}-bo‘lim</h2>
            <Chip tone={chip.tone}>{chip.text}</Chip>
            {s.jumpScore !== null && (
              <Chip tone={s.jumpScore >= JUMP_PASS_SCORE ? 'ok' : 'default'}>Sakrash testi: {s.jumpScore}%</Chip>
            )}
          </div>
          <p className="text-sm muted">
            {s.level} — {lvl.titleUz} ({lvl.titleEn})
          </p>
        </div>
        {s.sample && (
          <div className="flex items-start gap-2 max-w-full sm:max-w-xs">
            <MascotAvatar size="md" mood={s.status === 'done' ? 'proud' : 'greeting'} />
            <div className="rounded-2xl border px-3 py-2 text-sm bg-[var(--panel)] min-w-0">
              <p className="font-semibold break-words" lang="en">
                {s.sample.en}
              </p>
              <p className="text-xs muted break-words">{s.sample.uz}</p>
            </div>
          </div>
        )}
      </div>

      {s.status !== 'empty' ? (
        <div className="grid gap-1">
          <div
            className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
            role="progressbar"
            aria-label={`${s.label} progressi`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={s.daysDone}
          >
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs muted tabular-nums">
            {s.daysDone}/{total} kun yakunlangan
          </span>
        </div>
      ) : (
        <InfoBanner tone="muted">Bu bo‘lim uchun darslar hali tayyorlanmoqda — hozircha ochib bo‘lmaydi.</InfoBanner>
      )}

      <div className="flex flex-wrap gap-2">
        {s.status === 'current' && (
          <Button size="sm" onClick={() => nav('/path')}>
            Davom etish
          </Button>
        )}
        {s.status === 'done' && (
          <Button size="sm" variant="secondary" onClick={() => nav('/path')}>
            Takrorlash
          </Button>
        )}
        {s.canJump && !jumping && (
          <Button size="sm" variant="secondary" onClick={onJump}>
            {s.label} ga sakrash testi
          </Button>
        )}
        {s.status !== 'empty' && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? 'Yopish' : 'Batafsil'}
          </Button>
        )}
      </div>

      {open && (
        <div className="grid gap-2 text-sm">
          <p>{s.summaryUz}</p>
          <ul className="grid gap-1">
            {s.days.map((d) => (
              <li key={d.id} className="rounded-xl border px-3 py-1.5">
                <b>{d.dayNumber}-kun</b> — {d.titleUz}
              </li>
            ))}
          </ul>
        </div>
      )}

      {jumping && <JumpTest section={s} onClose={onCloseJump} />}
    </Card>
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
    return <InfoBanner tone="warn">O‘tkazib yuboriladigan kunlarda test savollari topilmadi — sakrash mumkin emas.</InfoBanner>
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
      <h3 className="font-bold">{section.label} ga sakrash testi</h3>
      {phase === 'idle' && (
        <>
          <p className="text-sm muted">
            {total} ta savol, oldingi {skippedCount} ta kunning yakuniy testlaridan. O‘tish uchun {JUMP_PASS_SCORE}% kerak.
            O‘tsangiz, o‘tkazib yuborilgan kunlar yakunlangan deb belgilanadi va {section.label} ochiladi. Yuraklar
            sarflanmaydi, darajangiz o‘zgarmaydi.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={start}>
              Testni boshlash
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Bekor qilish
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
        />
      )}
      {phase === 'done' && score !== null && (
        <>
          {score >= JUMP_PASS_SCORE ? (
            <SuccessBanner>
              Sakrash testi topshirildi: <b>{score}%</b> ≥ {JUMP_PASS_SCORE}% — {section.label} ochildi.
            </SuccessBanner>
          ) : (
            <InfoBanner tone="warn">
              Natija: <b>{score}%</b> &lt; {JUMP_PASS_SCORE}% — sakrash uchun yetarli emas. Joriy bo‘limni davom ettiring yoki
              keyinroq qayta urining.
            </InfoBanner>
          )}
          <div className="flex flex-wrap gap-2">
            {score >= JUMP_PASS_SCORE ? (
              <Button size="sm" onClick={() => nav('/path')}>
                O‘quv yo‘liga o‘tish
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={start}>
                Qayta urinish
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Yopish
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
