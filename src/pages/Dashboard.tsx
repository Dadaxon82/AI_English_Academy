/**
 * Dashboard — umumiy holat ekrani.
 *
 * Ko'rsatiladi: daraja va maqsad, bugungi moslashgan 90 daqiqalik reja
 * (nega o'zgargani izohi bilan), bugungi mashg'ulotlar holati, streak/XP,
 * ko'nikma natijalari (ishonchsizlar "noaniq" deb belgilangan), haftalik
 * faollik, oxirgi xatolar va keyingi tavsiya. Barcha havolalar haqiqiy.
 */

import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart, Button, Card, Chip, EmptyState, InfoBanner, LoadingBlock, StatTile } from '../components/ui'
import { findExercise, getBundle } from '../content'
import type { Skill } from '../content/types'
import { buildDayTasks, nextDayId, skillLabelUz } from '../lib/planning'
import { levelLabel } from '../lib/skillScoring'
import { lastNDays, useStore } from '../lib/store'
import { todayKey } from '../lib/types'

const SKILL_SEQ: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking']

const SKILL_ROUTE: Record<Skill, string> = {
  vocabulary: '/vocabulary',
  grammar: '/grammar',
  reading: '/reading',
  listening: '/listening',
  writing: '/writing',
  speaking: '/speaking',
}

const linkPrimary =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl text-sm px-4 py-2.5 transition-all ' +
  'bg-navy-700 text-white hover:bg-navy-600 dark:bg-navy-500 dark:hover:bg-navy-400 dark:text-navy-950'
const linkSecondary =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl text-sm px-4 py-2.5 transition-all border ' +
  'bg-white text-navy-900 hover:bg-slate-50 dark:bg-[var(--panel)] dark:text-[var(--text)] dark:hover:bg-[var(--panel-2)]'

/** TimerState.skill maydoni string | null — xavfsiz tartda Skill ga qaytarish. */
function asSkill(s: string | null): Skill {
  return s !== null && (SKILL_SEQ as readonly string[]).includes(s) ? (s as Skill) : 'reading'
}

const WEEK_SHORT = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Jum', 'Shan']

function weekdayShortUz(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? dateKey.slice(5) : WEEK_SHORT[d.getDay()]
}

export default function Dashboard() {
  const { data, ready, allocation, evidence, promotion, streak, learnedCount, dueCount, timerLabel, actions } = useStore()
  const nav = useNavigate()

  // --- Hisoblab olinadigan ma'lumotlar (hook'lar katta return oldidan) ---
  const bundle = useMemo(() => getBundle(data.settings.currentLevel), [data.settings.currentLevel])

  const today = useMemo(() => {
    if (bundle.days.length === 0) return null
    const cur = bundle.days.find((d) => d.id === data.path.currentDayId)
    // Joriy kun allaqachon yakunlangan bo'lsa — keyingi (yoyilmagan) kun olinadi
    if (cur && !data.path.completedDays.includes(cur.id)) return cur
    const nid = nextDayId(
      data.settings.currentLevel,
      bundle.days,
      data.path.completedDays,
    )
    return bundle.days.find((d) => d.id === nid) ?? null
  }, [bundle.days, data.path.currentDayId, data.path.completedDays, data.settings.currentLevel])

  const tasks = useMemo(() => {
    if (!today) return []
    // "Bajarilgan" halol ko'rsatiladi: BUGUNGI faoliyatda skill bo'yicha
    // rejalashtirilgan daqiqadan ko'p vaqt sarflangan bo'lsa.
    const act = data.activity[todayKey()]
    const doneBySkill: Partial<Record<Skill, string>> = {}
    for (const s of SKILL_SEQ) {
      const spent = act?.skills?.[s] ?? 0
      if (spent >= allocation.minutes[s] * 60) doneBySkill[s] = today.id
    }
    return buildDayTasks(today, allocation, doneBySkill)
  }, [today, allocation, data.activity])

  const week = useMemo(() => lastNDays(data, 7), [data])
  const weekTotalSec = useMemo(() => week.reduce((a, d) => a + d.seconds, 0), [week])
  const mistakes = useMemo(() => data.attempts.filter((a) => !a.correct).slice(-5).reverse(), [data.attempts])

  const doneCount = tasks.filter((t) => t.done).length
  const remainingTask = tasks.find((t) => !t.done)

  if (!ready) return <LoadingBlock label="Ma'lumotlaringiz yuklanmoqda…" />

  const curLevel = data.settings.currentLevel
  const tgtLevel = data.settings.targetLevel
  const timer = data.timer
  const running = timer.startedAt !== null
  const paused = timer.startedAt === null && timer.sessionId !== null

  return (
    <div className="grid gap-4 sm:gap-5">
      {/* ---------- Sarlavha: daraja va maqsad ---------- */}
      <Card as="section" className="grid gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Chip tone="brand">Hozirgi: {curLevel} — {levelLabel(curLevel).titleUz}</Chip>
          <Chip>Maqsad: {tgtLevel} — {levelLabel(tgtLevel).titleUz}</Chip>
        </div>
        <p className="muted text-sm">
          Kunlik reja: <b>{allocation.total} daqiqa</b> · O‘quv yo‘li bosqichi:{' '}
          <b>{data.path.completedDays.length}/{bundle.days.length || '—'}</b> kun yakunlangan.
        </p>
      </Card>

      {/* ---------- Jonli taymer ---------- */}
      {running && (
        <Card className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold tabular-nums" aria-live="off">⏱ {timerLabel}</span>
          {timer.skill && <Chip>{skillLabelUz(asSkill(timer.skill))}</Chip>}
          {timer.sessionId && <Chip>{timer.sessionId}</Chip>}
          <span className="flex-1" />
          <Button variant="secondary" size="sm" onClick={actions.pauseTimer}>
            Pauza
          </Button>
          <Button variant="danger" size="sm" onClick={actions.stopTimer}>
            To‘xtatish
          </Button>
        </Card>
      )}
      {!running && paused && (
        <InfoBanner tone="muted">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">
              Taymer pauzada — <b className="tabular-nums">{timerLabel}</b> ({timer.sessionId})
            </span>
            <span className="flex-1" />
            <Button size="sm" onClick={() => actions.startTimer(timer.sessionId ?? '', asSkill(timer.skill))}>
              Davom etish
            </Button>
          </div>
        </InfoBanner>
      )}

      {/* ---------- Statistika qatori ---------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Ketma-ket kun" value={streak} hint="Har kuni mashq qilish zanjiri" tone={streak > 0 ? 'ok' : 'default'} />
        <StatTile label="XP" value={data.xp} hint="FAQAT motivatsiya — darajani oshirmaydi" />
        <StatTile label="O‘zlashtirilgan so‘zlar" value={learnedCount} />
        <StatTile
          label="Takrorlash navbati"
          value={dueCount}
          hint={dueCount > 0 ? 'Lug‘at bo‘limida takrorlang' : 'Hozir navbatda yo‘q'}
          tone={dueCount > 0 ? 'warn' : 'default'}
        />
      </div>

      {/* ---------- Bugungi reja (taqsimot + nega o'zgargani) ---------- */}
      <Card className="grid gap-3.5">
        <h2 className="font-bold">Bugungi reja — {allocation.total} daqiqa</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {tasks.map((t) => (
            <div key={`alloc-${t.skill}`} className="rounded-xl border p-2.5 text-center">
              <div className="text-[11px] muted font-semibold leading-tight">{skillLabelUz(t.skill)}</div>
              <div className="font-bold tabular-nums">{allocation.minutes[t.skill]}′</div>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="col-span-full text-sm muted">Hozirgi daraja uchun reja kontenti yuklanmagan.</p>
          )}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold muted">
            Taqsimot nima uchun standart 90 daqiqadan farq qiladi?
          </summary>
          <InfoBanner tone="muted">
            <ul className="list-disc pl-5 grid gap-1">
              {allocation.reasonUz.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </InfoBanner>
        </details>
      </Card>

      {/* ---------- Bugungi mashg'ulotlar ---------- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Bugungi mashg‘ulotlar</h2>
          {today && <Chip tone={doneCount === tasks.length ? 'ok' : 'default'}>{doneCount}/{tasks.length} bajarilgan</Chip>}
        </div>
        {today ? (
          <>
            <p className="text-sm muted">
              Bosqich: <b>{today.dayNumber}-kun — {today.titleUz}</b>
            </p>
            {today.goalUz && <p className="text-sm">{today.goalUz}</p>}
            <div className="grid gap-2">
              {tasks.map((t) => (
                <Link
                  key={t.sectionId}
                  to={SKILL_ROUTE[t.skill]}
                  className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 hover:bg-[var(--panel-2)] transition-colors"
                >
                  <Chip tone={t.done ? 'ok' : 'default'}>{t.done ? '✓ Bajarildi' : 'Rejada'}</Chip>
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{skillLabelUz(t.skill)}</span>
                    <span className="block text-xs muted truncate">{t.titleUz}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">{t.minutes}′</span>
                </Link>
              ))}
            </div>
            <p className="text-[11px] muted">
              “Bajarildi” belgisi — bugun shu ko‘nikmaga rejalashtirilgan daqiqadan ko‘proq vaqt sarflangan bo‘lsa qo‘yiladi.
            </p>
          </>
        ) : (
          <EmptyState
            title="Bugungi reja topilmadi"
            body={
              bundle.days.length === 0
                ? 'Ushbu daraja uchun kunlik reja hali tayyor emas — A1 yo‘lidagi mashqlar mavjud.'
                : 'Yo‘ldagi barcha kunlar yakunlangan. Sozlamalardan darajani ko‘rib chiqing.'
            }
            action={<Link to="/path" className={linkSecondary}>"O'quv yo‘li"ni ochish</Link>}
          />
        )}
      </Card>

      {/* ---------- Ko'nikma natijalari ---------- */}
      <Card className="grid gap-3.5">
        <h2 className="font-bold">Asosiy ko‘nikmalar natijalari</h2>
        <div className="grid gap-3">
          {evidence.map((e) => (
            <div key={e.skill} className="grid gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{skillLabelUz(e.skill)}</span>
                <span className="flex items-center gap-2 tabular-nums">
                  {e.evidenceCount === 0 ? (
                    <span className="muted text-xs">dalillar yig‘ilmagan</span>
                  ) : (
                    <>
                      <span className={e.confidence < 0.6 ? 'muted italic' : 'font-bold'}>
                        {e.confidence < 0.6 ? '≈' : ''}
                        {e.score}/100
                      </span>
                      <Chip tone={e.confidence < 0.6 ? 'warn' : 'ok'}>
                        {e.confidence < 0.6 ? 'noaniq' : `${Math.round(e.confidence * 100)}% ishonchli`}
                      </Chip>
                    </>
                  )}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full bg-navy-600 dark:bg-navy-400 transition-[width] duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, e.score))}%` }}
                />
              </div>
              <p className="text-[11px] muted">
                {e.evidenceCount} ta natija saqlangan
                {e.lastAt ? ` · oxirgisi ${new Date(e.lastAt).toLocaleString('uz')}` : ''}
                {e.confidence < 0.6 && e.evidenceCount > 0 ? ' — bu baho aniq natija deb taqdim etilmaydi' : ''}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ---------- Haftalik faollik ---------- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">So‘nggi 7 kundagi faollik</h2>
          <Chip>{Math.round(weekTotalSec / 60)} daqiqa jami</Chip>
        </div>
        {weekTotalSec === 0 ? (
          <EmptyState
            title="Hozircha faollik yo‘q"
            body="Birinchi mashg‘ulotni boshlang — bu yerde Du/Se/… kunlari bo‘yicha sarflangan vaqt ko‘rinadi."
            action={<Button onClick={() => nav('/path')}>Birinchi mashg‘ulotni ochish</Button>}
          />
        ) : (
          <BarChart data={week.map((d) => ({ label: weekdayShortUz(d.date), value: d.seconds }))} />
        )}
      </Card>

      {/* ---------- Oxirgi xatolar ---------- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">So‘nggi xatolar</h2>
          <Link to="/errors" className="text-sm font-semibold text-navy-700 dark:text-navy-300 hover:underline">
            Xatolar daftari →
          </Link>
        </div>
        {mistakes.length === 0 ? (
          <EmptyState
            title={data.attempts.length === 0 ? 'Hali mashq qilinmagan' : 'So‘nggi mashqlarda xato yo‘q 👏'}
            body={data.attempts.length === 0 ? 'Birinchi mashqni boshlang — xatolar shu yerde ko‘rinadi.' : undefined}
            action={
              data.attempts.length === 0 ? (
                <Button onClick={() => nav('/path')}>“O‘quv yo‘li”dan boshlash</Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid gap-2">
            {mistakes.map((a) => {
              const ex = findExercise(a.exerciseId)
              return (
                <li key={a.id} className="rounded-xl border-l-4 !border-l-[var(--bad)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm grid gap-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Chip tone="bad">{a.exerciseId}</Chip>
                    <Chip>{skillLabelUz(a.skill)}</Chip>
                    <span className="muted">{new Date(a.at).toLocaleString('uz')}</span>
                  </div>
                  <p className="text-xs muted">{ex ? ex.instructionUz : `Mashq: ${a.exerciseId}`}</p>
                  {a.answerGiven && (
                    <p className="text-xs">
                      Sizning javobingiz: <span className="line-through">{a.answerGiven.slice(0, 80)}</span>
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* ---------- Keyingi tavsiya ---------- */}
      <Card className="grid gap-3">
        <h2 className="font-bold">Keyingi tavsiya etilgan mashg‘ulot</h2>
        <p className="text-sm">{promotion.reasonUz}</p>
        {promotion.recommendedLevel && (
          <InfoBanner tone="warn">
            <b>{promotion.recommendedLevel} — {levelLabel(promotion.recommendedLevel).titleUz}</b> darajasi tavsiya etiladi.
            Bu avtomatik o‘tish emas — o‘zingiz sozlamalardan tasdiqlaysiz.
          </InfoBanner>
        )}
        <div className="flex flex-wrap gap-1.5">
          {promotion.readySkills.length > 0 && <Chip tone="ok">Tayyor: {promotion.readySkills.map(skillLabelUz).join(', ')}</Chip>}
          {promotion.weakSkills.length > 0 && <Chip tone="warn">Zaif: {promotion.weakSkills.map(skillLabelUz).join(', ')}</Chip>}
        </div>
        {remainingTask ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border px-3.5 py-2.5">
            <span className="text-sm">
              Navbatdagi mashg‘ulot: <b>{skillLabelUz(remainingTask.skill)}</b> — {remainingTask.minutes} daqiqa
            </span>
            <span className="flex-1" />
            <Link to={SKILL_ROUTE[remainingTask.skill]} className={linkSecondary}>
              Ochiq mashg‘ulot
            </Link>
          </div>
        ) : (
          today && <p className="text-sm muted">Bugungi barcha mashg‘ulotlar reja bo‘yicha bajarilgan 👏</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => nav('/path')}>
            Darsni davom ettirish
          </Button>
        </div>
      </Card>

      {/* ---------- Mock exam va diagnostika ---------- */}
      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48 grid gap-1">
          <h2 className="font-bold">To‘liq Mock Exam</h2>
          <p className="text-sm muted">
            Reading · Listening · Writing · Speaking — namunaviy imtihon. Natijalar ko‘nikma bahosiga kuchliroq hisobga
            olinadi.
          </p>
          {data.diagnostic && (
            <p className="text-[11px] muted">
              Diagnostika natijangiz: {data.diagnostic.labelUz} ({new Date(data.diagnostic.at).toLocaleString('uz')},
              ishonch {Math.round(data.diagnostic.confidence * 100)}%)
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {data.diagnostic && (
            <Link to="/progress?retake=1" className={linkSecondary}>
              Diagnostikani qayta topshirish
            </Link>
          )}
          <Link to="/mock-exam" className={linkPrimary}>
            Mock Examni ochish
          </Link>
        </div>
      </Card>
    </div>
  )
}
