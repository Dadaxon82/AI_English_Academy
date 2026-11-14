/**
 * Shaxsiy o'quv yo'li — vertikal xronologik kunlar ro'yxati.
 *
 * Ketma-ketlik halol ko'rsatiladi: oldingi kunni yakunlamascha keyingi kun
 * yopiq ko'rinadi va "Ochish" tugmasi disabled (+ izoh). Har kun ichida
 * bo'limlar, ularning haqiqiy kontenti va bo'lim yakuniy testi
 * ExerciseRunner orqali. Kun taymeri store.ga bog'langan (sessionId = dayId).
 */

import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ExerciseRunner from '../components/ExerciseRunner'
import { Button, Card, Chip, EmptyState, InfoBanner, LoadingBlock, ProgressRing, SpeakButton, SuccessBanner } from '../components/ui'
import { getBundle } from '../content'
import type { LevelBundle } from '../content'
import type { DailyPlanDay, DaySection, Skill, VocabularyItem } from '../content/types'
import type { CheckResult } from '../lib/check'
import { skillLabelUz } from '../lib/planning'
import { useStore } from '../lib/store'
import { currentElapsed, formatDuration } from '../lib/timer'
import { todayKey } from '../lib/types'
import type { AppData } from '../lib/types'

const SKILL_ROUTE: Record<Skill, string> = {
  vocabulary: '/vocabulary',
  grammar: '/grammar',
  reading: '/reading',
  listening: '/listening',
  writing: '/writing',
  speaking: '/speaking',
}

const linkSecondary =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl text-sm px-4 py-2.5 transition-all border ' +
  'bg-white text-navy-900 hover:bg-slate-50 dark:bg-[var(--panel)] dark:text-[var(--text)] dark:hover:bg-[var(--panel-2)]'

type DayStatus = 'completed' | 'current' | 'locked'

/** Bugungi faoliyatda skill bo'yicha sarflangan sekundlar. */
function secondsToday(data: AppData, skill: Skill): number {
  return data.activity[todayKey()]?.skills?.[skill] ?? 0
}

/** Kun bo'limlaridan bugun yetarlicha vaqt sarflanmagan birinchisi. */
function firstOpenSection(day: DailyPlanDay, data: AppData): DaySection | null {
  return day.sections.find((s) => secondsToday(data, s.skill) < s.minutes * 60) ?? day.sections[0] ?? null
}

export default function LearningPath() {
  const { data, ready } = useStore()

  const bundle = useMemo(() => getBundle(data.settings.currentLevel), [data.settings.currentLevel])
  const days = bundle.days
  const completed = data.path.completedDays

  const currentIdx = useMemo(() => {
    const i = days.findIndex((d) => d.id === data.path.currentDayId)
    if (i >= 0) return i
    const open = days.findIndex((d) => !completed.includes(d.id))
    return open >= 0 ? open : days.length - 1
  }, [days, data.path.currentDayId, completed])

  // Ochiq kun: yuklangandan keyin joriy kun avtomatik ochiladi; foydalanuvchi
  // boshqa kunni ochsa/yopsa shu tanlov hurmat qilinadi.
  const [openOverride, setOpenOverride] = useState<string | null>(null)
  const defaultOpenId = days[currentIdx]?.id ?? null
  const openDayId = openOverride !== null ? openOverride : defaultOpenId

  const statusOf = (day: DailyPlanDay, idx: number): DayStatus => {
    if (completed.includes(day.id)) return 'completed'
    if (idx <= currentIdx) return 'current'
    return 'locked'
  }

  if (!ready) return <LoadingBlock label="O‘quv yo‘li yuklanmoqda…" />

  if (days.length === 0) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">Shaxsiy o‘quv yo‘li</h1>
        <EmptyState
          title={`${data.settings.currentLevel} uchun reja hali mavjud emas`}
          body="Hozircha faqat A1 yo‘li yuklangan. Sozlamalardan A1 ga qaytib davom eting."
          action={
            <Link to="/settings" className={linkSecondary}>
              Sozlamalarga o‘tish
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      {/* ---------- Progress sarlavhasi ---------- */}
      <Card as="section" className="flex flex-wrap items-center gap-4">
        <ProgressRing value={completed.length / days.length} label={`${completed.length}/${days.length} kun`} />
        <div className="flex-1 min-w-48 grid gap-1.5">
          <h1 className="text-2xl font-bold">Shaxsiy o‘quv yo‘li</h1>
          <p className="muted text-sm">
            {data.settings.currentLevel} darajasi — {days.length} kunlik bosqich. Har kuni 6 ta bo‘lim va yakuniy test.
            Kunlar ketma-ket ochiladi.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={completed.length === days.length ? 'ok' : 'brand'}>
              {completed.length}/{days.length} kun yakunlangan
            </Chip>
            {days[currentIdx] && !completed.includes(days[currentIdx].id) && (
              <Chip>Bosqich: {days[currentIdx].id}</Chip>
            )}
          </div>
        </div>
      </Card>

      {/* ---------- Vertikal xronologik ro'yxat ---------- */}
      <div className="relative grid gap-4 pl-5 sm:pl-7">
        <span aria-hidden className="absolute left-[7px] sm:left-[11px] top-2 bottom-2 w-0.5 bg-[var(--border)]" />
        {days.map((day, idx) => {
          const status = statusOf(day, idx)
          const open = openDayId === day.id
          return (
            <div key={day.id} className="relative">
              <span
                aria-hidden
                className={`absolute -left-5 sm:-left-7 top-5 w-4 h-4 rounded-full border-2 ${
                  status === 'completed'
                    ? 'bg-[var(--ok)] border-[var(--ok)]'
                    : status === 'current'
                      ? 'bg-navy-700 dark:bg-navy-400 border-navy-700 dark:border-navy-400'
                      : 'bg-[var(--panel)] border-[var(--border)]'
                }`}
              />
              <DayCard
                day={day}
                status={status}
                open={open}
                onOpen={() => setOpenOverride(day.id)}
                onClose={() => setOpenOverride('')}
                bundle={bundle}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------- Kun kartasi -------------------------------

function DayCard({
  day,
  status,
  open,
  onOpen,
  onClose,
  bundle,
}: {
  day: DailyPlanDay
  status: DayStatus
  open: boolean
  onOpen: () => void
  onClose: () => void
  bundle: LevelBundle
}) {
  const { data, actions } = useStore()
  const nav = useNavigate()

  const test = day.sectionTest
  const passedScore = test ? (data.path.passedTests[test.id] ?? null) : null
  const alreadyPassed = test !== undefined && passedScore !== null && passedScore >= test.passScore
  const isCompleted = status === 'completed'
  const total = test?.exercises.length ?? 0

  // Bo'lim testi holati: idle → running → done
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [pos, setPos] = useState(0)
  const [lastResult, setLastResult] = useState<CheckResult | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const acc = useRef<Record<string, CheckResult>>({})

  // "Testni tashlab, kunni belgilash" halol yo'li uchun tasdiq
  const [skipAck, setSkipAck] = useState(false)

  const startTest = () => {
    acc.current = {}
    setPos(0)
    setLastResult(null)
    setScore(null)
    setPhase('running')
    actions.startTimer(day.id, test?.section ?? 'vocabulary')
  }

  const onChecked = (r: CheckResult, secondsSpent: number) => {
    if (!test) return
    const ex = test.exercises[pos]
    if (!ex) return
    acc.current[ex.id] = r
    setLastResult(r)
    actions.recordAttempt({
      exercise: ex,
      correct: r.correct,
      partial: r.partial,
      given: r.given,
      secondsSpent,
      source: 'section_test',
    })
  }

  const onNext = () => {
    if (!test) return
    if (pos + 1 < test.exercises.length) {
      setPos(pos + 1)
      return
    }
    const earned = Object.values(acc.current).reduce((a, r) => a + (r.correct ? 1 : r.partial), 0)
    const s = total === 0 ? 0 : Math.round((earned / total) * 100)
    setScore(s)
    setPhase('done')
    actions.stopTimer()
    if (s >= test.passScore) actions.completeDay(day.id, test.id, s)
  }

  // --- Kun taymeri holati ---
  const timer = data.timer
  const mine = timer.sessionId === day.id
  const running = mine && timer.startedAt !== null
  const otherRunning = timer.startedAt !== null && !mine
  const mineElapsed = mine ? currentElapsed(timer) : 0

  const beginDay = () => {
    const sec = firstOpenSection(day, data)
    if (!sec) return
    // Taymer bo'sh bo'lsa shu bo'lim uchun darhol yoqiladi — kun shu yerda
    // "boshlanadi"; bo'sh bo'lmasa sahifaga o'tiladi (yoqish so'rovini
    // foydalanuvchi o'zi beradi).
    if (timer.startedAt === null && timer.sessionId === null) {
      actions.startTimer(day.id, sec.skill)
    }
    nav(SKILL_ROUTE[sec.skill])
  }

  return (
    <Card className={`grid gap-3.5 ${status === 'locked' ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-0 grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-lg">
              {day.dayNumber}-kun — {day.titleUz}
            </h2>
            {status === 'completed' && <Chip tone="ok">✓ Yakunlangan</Chip>}
            {status === 'current' && <Chip tone="brand">Joriy bosqich</Chip>}
            {status === 'locked' && <Chip tone="warn">Qulflangan</Chip>}
          </div>
          <p className="text-sm muted">{day.goalUz}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {status !== 'locked' && (
            <Button size="sm" variant="secondary" onClick={beginDay} title="Tugallanmagan birinchi bo‘lim sahifasiga o‘tadi">
              Kunni boshlash
            </Button>
          )}
          {status === 'locked' ? (
            <Button
              size="sm"
              variant="secondary"
              disabled
              title="Avval oldingi kunni yakunlang"
              aria-label={`${day.dayNumber}-kun qulflangan — avval oldingi kunni yakunlang`}
            >
              Ochish
            </Button>
          ) : (
            <Button size="sm" variant={open ? 'ghost' : 'primary'} onClick={open ? onClose : onOpen} aria-expanded={open}>
              {open ? 'Yopish' : 'Ochish'}
            </Button>
          )}
        </div>
      </div>

      {/* Bo'limlar ro'yxati (har doim ko'rinadi) */}
      <ul className="grid gap-1.5">
        {day.sections.map((s) => {
          const spentSec = secondsToday(data, s.skill)
          const doneToday = spentSec >= s.minutes * 60
          return (
            <li key={`${day.id}-${s.skill}`} className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <Chip tone={doneToday ? 'ok' : 'default'}>{doneToday ? '✓ Bajarildi' : 'Rejada'}</Chip>
              <span className="font-semibold">{skillLabelUz(s.skill)}</span>
              <span className="muted truncate flex-1 min-w-32">{s.titleUz}</span>
              <span className="tabular-nums text-xs muted">
                bugun {Math.floor(spentSec / 60)}′ / {s.minutes}′
              </span>
              <Link to={SKILL_ROUTE[s.skill]} className="text-xs font-semibold text-navy-700 dark:text-navy-300 hover:underline">
                {skillLabelUz(s.skill)} sahifasi →
              </Link>
            </li>
          )
        })}
      </ul>

      {open && (
        <div className="grid gap-4 animate-[var(--animate-fade-in)]">
          {/* --- Kun taymeri paneli --- */}
          <div className="rounded-xl border p-3.5 flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-semibold">Bu kun uchun taymer:</span>
            <span className="text-lg font-bold tabular-nums" aria-label="Bu kunda sarflangan vaqt">
              {formatDuration(mineElapsed)}
            </span>
            {mine && running && <Chip tone="ok">Yurmoqda</Chip>}
            {mine && !running && mineElapsed > 0 && <Chip tone="warn">Pauzada</Chip>}
            {otherRunning && timer.sessionId && <Chip tone="warn">Boshqa mashg‘ulot yuradi: {timer.sessionId}</Chip>}
            <span className="flex-1" />
            <Button
              size="sm"
              disabled={otherRunning || running || !firstOpenSection(day, data)}
              title={otherRunning ? 'Avval boshqa mashg‘ulot taymerini to‘xtating' : undefined}
              onClick={() => {
                const sec = firstOpenSection(day, data)
                if (sec) actions.startTimer(day.id, sec.skill)
              }}
            >
              {mine && !running && mineElapsed > 0 ? 'Davom etish' : 'Boshlash'}
            </Button>
            <Button size="sm" variant="secondary" disabled={!running} onClick={actions.pauseTimer}>
              Pauza
            </Button>
            <Button size="sm" variant="danger" disabled={!mine} onClick={actions.stopTimer}>
              To‘xtatish
            </Button>
          </div>

          <p className="text-[11px] muted">
            Taymer {day.id} seaniga bog‘langan. Sahifaga o‘tganingizda sahifa o‘z bo‘lim taymerini yoqsa, hisob shu
            mashg‘ulotga ko‘chadi — buni oldindan to‘xtatish halolroq.
          </p>

          {/* --- Har bo'limning kontenti --- */}
          {day.sections.map((s) => (
            <SectionDetail key={`${day.id}-detail-${s.skill}`} day={day} section={s} bundle={bundle} />
          ))}

          {/* --- Bo'lim yakuni testi --- */}
          {test ? (
            <div className="rounded-xl border p-3.5 grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold">{test.titleUz}</h3>
                <Chip>{test.exercises.length} savol</Chip>
                <Chip>O‘tish bosqichi: {test.passScore}</Chip>
                {passedScore !== null && (
                  <Chip tone={alreadyPassed ? 'ok' : 'warn'}>Sizning ball: {passedScore}</Chip>
                )}
              </div>

              {alreadyPassed && phase !== 'running' && phase !== 'done' && (
                <SuccessBanner>
                  Test avval muvaffaqiyatli topshirilgan ({passedScore} ≥ {test.passScore}). Bo‘limlar ro‘yxatini
                  qayta ko‘rib chiqing yoki yuqoridagi kunlarni davom ettiring.
                </SuccessBanner>
              )}

              {phase === 'idle' && !alreadyPassed && (
                total === 0 ? (
                  <InfoBanner tone="muted">Bu testda hozircha mashq yo‘q.</InfoBanner>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={startTest}>Testni boshlash</Button>
                    <span className="text-[11px] muted self-center">
                      Har bir javob “section_test” manbasida yozib boriladi va xatolar daftarga tushadi.
                    </span>
                  </div>
                )
              )}

              {phase === 'running' && test.exercises[pos] && (
                <ExerciseRunner
                  exercise={test.exercises[pos]}
                  checked={onChecked}
                  index={pos}
                  total={total}
                  onNext={onNext}
                  prevResult={lastResult && !lastResult.correct ? lastResult : null}
                />
              )}

              {phase === 'done' && score !== null && (
                score >= test.passScore ? (
                  <SuccessBanner>
                    Test topshirildi: <b>{score}</b> ≥ {test.passScore} — kun yakunlandi, keyingi bosqich ochildi.
                  </SuccessBanner>
                ) : (
                  <InfoBanner tone="warn">
                    Test tugadi: <b>{score}</b> &lt; {test.passScore} — o‘tish uchun yetarli emas. Bo‘limlarni qayta
                    o‘qib, yana urining.
                  </InfoBanner>
                )
              )}

              {(phase === 'done' || (phase === 'idle' && alreadyPassed)) && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={startTest}>
                    Testni qayta topshirish
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <InfoBanner tone="muted">Bu kun uchun yakuniy test hali tayyorlanmagan.</InfoBanner>
          )}

          {/* --- Kunni yakunlash (halol qoida) --- */}
          {isCompleted ? (
            <SuccessBanner>Bu kun yakunlangan. Davom etish uchun keyingi kunni oching.</SuccessBanner>
          ) : (
            <div className="rounded-xl border p-3.5 grid gap-2">
              <h3 className="font-bold text-sm">Kunni yakunlash</h3>
              <p className="text-sm muted">
                Kun yakunlanishi uchun yakuniy testni {test ? `${test.passScore}+ ball bilan` : ''} topshirish
                talab qilinadi. Testni hozircha tashlab ketmoqchi bo‘lsangiz — buni halol tasdiqlang.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[var(--accent)]"
                  checked={skipAck}
                  onChange={(e) => setSkipAck(e.target.checked)}
                />
                <span>
                  Testni topshirmay kunni belgilayman — bu holda ko‘nikma bahosiga test dalili kirmaydi va qulf
                  baribir ochiladi.
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!(alreadyPassed || skipAck)}
                  title={
                    alreadyPassed
                      ? 'Test o‘tilgan — kunni belgilang'
                      : skipAck
                        ? 'Test tashlandi — baribir belgilanadi (halol)'
                        : 'Avval testni topshiring yoki “test topshirmay belgilash”ni belgilang'
                  }
                  onClick={() =>
                    actions.completeDay(
                      day.id,
                      alreadyPassed && test ? test.id : undefined,
                      alreadyPassed && score !== null ? score : undefined,
                    )
                  }
                >
                  Kunni yakunlash
                </Button>
                {alreadyPassed && <Chip tone="ok">Test dalili bilan</Chip>}
                {!alreadyPassed && skipAck && <Chip tone="warn">Test tashlandi</Chip>}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// --------------------------- Bo'lim kontenti ---------------------------

function resolveContentTitle(section: DaySection, bundle: LevelBundle): string | null {
  const id = section.itemIds[0]
  if (!id) return null
  switch (section.skill) {
    case 'vocabulary':
      return null // lug'at bo'limida to'liq ro'yxat ko'rsatiladi
    case 'grammar':
      return bundle.grammar.find((g) => g.id === id)?.titleUz ?? null
    case 'reading':
      return bundle.reading.find((r) => r.id === id)?.title ?? null
    case 'listening':
      return bundle.listening.find((l) => l.id === id)?.title ?? null
    case 'writing':
      return bundle.writing.find((w) => w.id === id)?.instructionUz ?? null
    case 'speaking':
      return bundle.speaking.find((s) => s.id === id)?.topicUz ?? null
  }
}

function SectionDetail({ day, section, bundle }: { day: DailyPlanDay; section: DaySection; bundle: LevelBundle }) {
  const [show, setShow] = useState(false)

  const words: VocabularyItem[] =
    section.skill === 'vocabulary'
      ? section.itemIds
          .map((id) => bundle.vocab.find((v) => v.id === id))
          .filter((v): v is VocabularyItem => v !== undefined)
      : []
  const title = resolveContentTitle(section, bundle)

  return (
    <div className="rounded-xl border p-3.5 grid gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-bold text-sm">{section.titleUz}</h4>
        <Chip>{skillLabelUz(section.skill)}</Chip>
        <Chip>{section.minutes}′</Chip>
        <span className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => setShow((v) => !v)} aria-expanded={show}>
          {show ? 'Kontentni yopish' : 'Kontentni ko‘rish'}
        </Button>
        <Link to={SKILL_ROUTE[section.skill]} className={linkSecondary}>
          {skillLabelUz(section.skill)}da ochish
        </Link>
      </div>

      {show && (
        <div className="grid gap-2 animate-[var(--animate-fade-in)]">
          {section.skill === 'vocabulary' ? (
            words.length === 0 ? (
              <p className="text-sm muted">Ushbu bo‘lim so‘zlari topilmadi — kontent hali yuklanmagan.</p>
            ) : (
              <ul className="grid gap-1.5">
                {words.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm"
                  >
                    <span className="font-semibold">
                      {v.word} <span className="muted font-normal">— {v.translationUz}</span>
                    </span>
                    {v.ipa && <span className="text-xs muted">{v.ipa}</span>}
                    <span className="flex-1" />
                    <SpeakButton text={v.pronunciation?.ttsText ?? v.word} label={`${v.word} talaffuzi`} />
                  </li>
                ))}
              </ul>
            )
          ) : title ? (
            <div className="text-sm grid gap-1">
              <p>
                Birinchi material: <b>{title}</b>{' '}
                <span className="muted">(bo‘limda {section.itemIds.length} ta element)</span>
              </p>
              <p className="text-xs muted">
                To‘liq material “{skillLabelUz(section.skill)}” sahifasida — yuqoridagi tugma orqali ochiladi. Kun idsi:{' '}
                {day.id}
              </p>
            </div>
          ) : (
            <p className="text-sm muted">Material topilmadi — sahifani ochib tekshiring.</p>
          )}
        </div>
      )}
    </div>
  )
}
