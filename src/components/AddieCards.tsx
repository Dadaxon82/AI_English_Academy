/**
 * ADDIE kartalari (Progress sahifasi): moslashuvchan reja, tahlil va daraja imtihoni.
 * Faqat mavjud UI komponentlari (`ui.tsx`) va `LessonPlayer` ishlatiladi — yangi uslub yo'q.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Chip, EmptyState, InfoBanner, StatTile } from './ui'
import LessonPlayer from './LessonPlayer'
import { useStore } from '../lib/storeContext'
import { allExercises, findExercise, getBundle } from '../content'
import type { CefrLevel } from '../content/types'
import type { LessonStep } from '../lib/lessons'
import { skillLabelUz } from '../lib/planning'
import { buildAdaptiveDrill, buildAdaptivePlan } from '../lib/adaptive'
import { errorCategories, skillMastery, velocityReport } from '../lib/evaluation'
import { LEVEL_EXAM_PASS, buildLevelExam, levelExamKey, levelExamReady, levelExamScore, nextLevelOf } from '../lib/levelExam'
import { saveAdaptivePlan, saveProgressSnapshot } from '../lib/addieRemote'

const toSteps = (list: ReturnType<typeof allExercises>): LessonStep[] => list.map((e) => ({ type: 'exercise', id: e.id, exercise: e }))

const latest = (list: readonly { createdAt: number }[]) => (list.length ? Math.max(...list.map((x) => x.createdAt)) : null)

function localDay(now = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** Hisob-kitob bir joyda: reja, tahlil, imtihon tayyorligi. */
function useAddie() {
  const { data, dueCount } = useStore()
  const level = data.settings.currentLevel
  return useMemo(() => {
    const days = getBundle(level).days
    const done = new Set(data.path.completedDays)
    const next = days.find((d) => !done.has(d.id)) ?? null
    const examReady = levelExamReady(level, days, data.path.completedDays, data.path.passedTests)
    const plan = buildAdaptivePlan({
      level,
      attempts: data.attempts,
      find: findExercise,
      dueWords: dueCount,
      nextDay: next ? { dayNumber: next.dayNumber, titleUz: next.titleUz } : null,
      lastWritingAt: latest(data.writing),
      lastSpeakingAt: latest(data.speaking),
      levelExamReady: examReady,
    })
    const mastery = skillMastery(data.attempts)
    const categories = errorCategories(data.attempts, findExercise)
    const velocity = velocityReport({
      attempts: data.attempts,
      activity: data.activity,
      completedDays: data.path.completedDays,
      levelDaysLeft: days.filter((d) => !done.has(d.id)).length,
    })
    const levelDone = days.filter((d) => done.has(d.id)).length
    return { level, days, plan, mastery, categories, velocity, levelDone, examReady }
  }, [data.attempts, data.activity, data.path, data.writing, data.speaking, dueCount, level])
}

/** Kirgan foydalanuvchida kunlik surat va reja serverga (o'zgarganda) yoziladi. Xato — jim: lokal ish davom etadi. */
function useRemoteSnapshot(a: ReturnType<typeof useAddie>) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      void saveProgressSnapshot({ level: a.level, mastery: a.mastery, velocity: a.velocity, categories: a.categories, completedDays: a.levelDone }, localDay())
      void saveAdaptivePlan(a.plan)
    }, 1500)
    return () => window.clearTimeout(t)
  }, [a])
}

export function AdaptivePlanCard() {
  const { data } = useStore()
  const a = useAddie()
  useRemoteSnapshot(a)
  const [drill, setDrill] = useState<LessonStep[] | null>(null)
  const drillPool = useMemo(() => buildAdaptiveDrill(allExercises(a.level), a.plan, data.attempts), [a.level, a.plan, data.attempts])

  if (drill) {
    return (
      <Card className="p-4 sm:p-6">
        <LessonPlayer steps={drill} onClose={() => setDrill(null)} />
      </Card>
    )
  }

  return (
    <Card className="grid gap-3">
      <div id="adaptive" className="flex flex-wrap items-center gap-2 scroll-mt-20">
        <h2 className="font-bold">Moslaşuvçan reja</h2>
        <Chip tone="brand">Qiyinlik {a.plan.targetDifficulty}/5</Chip>
      </div>
      <p className="muted text-sm">{a.plan.difficultyReasonUz}</p>
      {a.plan.actions.length === 0 ? (
        <EmptyState title="Hozirça tavsiya yöq" body="Bir neçta maşq bajaring — reja natijalaringizga qarab tuziladi." />
      ) : (
        <ol className="grid gap-2">
          {a.plan.actions.map((act, i) => (
            <li key={act.id} className="flex items-start gap-2 text-sm rounded-lg border p-2.5">
              <Chip tone={i === 0 ? 'ok' : 'default'}>{i + 1}</Chip>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{act.titleUz}</div>
                <div className="muted text-xs">{act.reasonUz}</div>
              </div>
              {act.id === 'focus' || act.id === 'weak-skill' ? (
                <Button size="sm" variant="secondary" disabled={drillPool.length === 0} onClick={() => setDrill(toSteps(drillPool))}>
                  Boşlaş
                </Button>
              ) : (
                <Link to={act.to} className="text-xs font-semibold underline underline-offset-2 shrink-0 self-center">
                  Öçiş
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={drillPool.length === 0} onClick={() => setDrill(toSteps(drillPool))}>
          Moslaşuvçan maşq ({drillPool.length})
        </Button>
        <span className="muted text-xs">
          {drillPool.length === 0 ? 'Zaif mavzu topilmadi — yangi dars bilan davom eting.' : 'Xato qilgan mavzularingizdagi hali yeçilmagan maşqlar, qiyinligi sizga mos.'}
        </span>
      </div>
    </Card>
  )
}

const TREND_UZ = { up: 'öşmoqda', down: 'pasaymoqda', flat: 'barqaror', none: 'ma’lumot kam' } as const

export function AnalyticsCard() {
  const a = useAddie()
  const v = a.velocity
  return (
    <Card className="grid gap-3">
      <h2 className="font-bold">Öquv tahlili</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Faol kunlar" value={`${v.activeDays7}/7`} hint={`28 kunda ${v.activeDays28}`} />
        <StatTile label="Kuniga" value={v.minutesPerActiveDay7 === null ? '—' : `${v.minutesPerActiveDay7} daq`} hint="Faol kun örtaçasi" />
        <StatTile
          label="Aniqlik (7 kun)"
          value={v.accuracy7 === null ? '—' : `${v.accuracy7}%`}
          tone={v.trend === 'up' ? 'ok' : v.trend === 'down' ? 'warn' : 'default'}
          hint={`Tendensiya: ${TREND_UZ[v.trend]}`}
        />
        <StatTile
          label="Sur’at"
          value={v.daysPerWeek === null ? '—' : `${v.daysPerWeek} kun/hafta`}
          hint={v.weeksToFinishLevel === null ? 'Kun tugatilgaç hisoblanadi' : `${a.level} ni ~${v.weeksToFinishLevel} haftada tugatasiz`}
        />
      </div>

      <div className="grid gap-1.5">
        <h3 className="text-sm font-semibold">Könikma özlaştiriliši (oxirgi 40 urinish)</h3>
        <div className="flex flex-wrap gap-1.5">
          {a.mastery.map((m) => (
            <Chip key={m.skill} tone={m.accuracy === null ? 'default' : m.accuracy >= 80 ? 'ok' : m.accuracy >= 60 ? 'warn' : 'bad'}>
              {skillLabelUz(m.skill)}: {m.accuracy === null ? 'dalil yöq' : `${m.accuracy}% · ${m.count}`}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <h3 className="text-sm font-semibold">Oçiq xato toifalari (60 kun)</h3>
        {a.categories.length === 0 ? (
          <p className="muted text-sm">Tuzatilmagan xato yöq.</p>
        ) : (
          <ul className="grid gap-1.5">
            {a.categories.slice(0, 6).map((c) => (
              <li key={c.key} className="flex items-center gap-2 text-sm rounded-lg border p-2">
                <Chip tone="brand">{skillLabelUz(c.skill)}</Chip>
                <span className="flex-1 min-w-0 truncate">{c.topic}</span>
                <span className="muted text-xs">{c.open} ta maşq · {c.wrong} xato</span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/errors" className="text-xs font-semibold underline underline-offset-2 justify-self-start">
          Xatolar daftarini öçiş
        </Link>
      </div>
    </Card>
  )
}

export function LevelExamCard() {
  const { data, actions } = useStore()
  const a = useAddie()
  const [steps, setSteps] = useState<LessonStep[] | null>(null)
  const [result, setResult] = useState<{ level: CefrLevel; score: number } | null>(null)
  const firstTries = useRef(new Map<string, { correct: boolean; partial: number }>())
  const best = data.path.passedTests[levelExamKey(a.level)]
  const next = nextLevelOf(a.level)
  const remaining = a.days.length - a.levelDone

  const start = () => {
    firstTries.current = new Map()
    setResult(null)
    setSteps(toSteps(buildLevelExam(a.days)))
  }

  if (steps) {
    const total = steps.length
    const level = a.level
    return (
      <Card className="p-4 sm:p-6">
        <LessonPlayer
          steps={steps}
          onClose={() => setSteps(null)}
          onAnswer={(step, correct) => {
            if (!firstTries.current.has(step.id)) firstTries.current.set(step.id, { correct, partial: correct ? 1 : 0 })
          }}
          onFinish={() => {
            const score = levelExamScore(firstTries.current, total)
            actions.recordLevelExam(level, score)
            setResult({ level, score })
          }}
        />
      </Card>
    )
  }

  return (
    <Card className="grid gap-3">
      <div id="level-exam" className="flex flex-wrap items-center gap-2 scroll-mt-20">
        <h2 className="font-bold">{a.level} daraja imtihoni</h2>
        {best !== undefined && <Chip tone={best >= LEVEL_EXAM_PASS ? 'ok' : 'warn'}>Eng yaxşi: {best}%</Chip>}
      </div>
      <p className="muted text-sm">
        {a.days.length} kunning har biridan savollar, jami {buildLevelExam(a.days).length} ta. Ötiş çegarasi — {LEVEL_EXAM_PASS}%, birinçi javoblar hisoblanadi.
        {next ? ` Ötsangiz, ${next} darajasiga öçişni taklif qilamiz.` : ' Bu oxirgi daraja.'}
      </p>
      {result && (
        <InfoBanner tone={result.score >= LEVEL_EXAM_PASS ? 'info' : 'warn'}>
          Natija: <b>{result.score}%</b>.{' '}
          {result.score >= LEVEL_EXAM_PASS
            ? `${result.level} darajasi tasdiqlandi.`
            : `Ötiş uçun ${LEVEL_EXAM_PASS}% kerak. Moslaşuvçan rejadagi maşqlardan keyin qayta topşiring.`}
        </InfoBanner>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={a.examReady ? 'primary' : 'secondary'} onClick={start}>
          {best === undefined ? 'Imtihonni boşlaş' : 'Qayta topşiriş'}
        </Button>
        {result && result.score >= LEVEL_EXAM_PASS && next && data.settings.currentLevel === result.level && (
          <Button size="sm" variant="success" onClick={() => actions.setLevel(next)}>
            {next} darajasiga öçiş
          </Button>
        )}
        {!a.examReady && remaining > 0 && <span className="muted text-xs">Tavsiya: avval qolgan {remaining} kunni tugating.</span>}
      </div>
    </Card>
  )
}

/**
 * Ustoz / mentor izohi: AI tahlilidan tashqari inson fikri. Lokal saqlanadi va
 * sinxronlashda `writing_submissions.mentor_note` ustuniga yoziladi.
 */
export function MentorNoteField({ id, note }: { id: string; note: string | undefined }) {
  const { actions } = useStore()
  const [draft, setDraft] = useState(note ?? '')
  const [saved, setSaved] = useState(false)
  const dirty = draft.trim() !== (note ?? '').trim()
  return (
    <div className="grid gap-1.5">
      <label htmlFor={`mentor-${id}`} className="text-sm font-semibold">
        Ustoz izohi
      </label>
      <textarea
        id={`mentor-${id}`}
        value={draft}
        maxLength={2000}
        rows={2}
        onChange={(e) => {
          setDraft(e.target.value)
          setSaved(false)
        }}
        placeholder="Ustozingiz yoki mentoringiz fikrini şu yerga yozing."
        className="w-full rounded-xl border bg-[var(--panel)] p-3 text-sm leading-6 outline-none focus:border-[var(--accent)] font-[inherit]"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={!dirty}
          onClick={() => {
            actions.setWritingNote(id, draft.trim())
            setSaved(true)
          }}
        >
          Izohni saqlaş
        </Button>
        {saved && !dirty && <span className="muted text-xs">Saqlandi. Hisobga kirgan bölsangiz, serverga ham yuboriladi.</span>}
      </div>
    </div>
  )
}
