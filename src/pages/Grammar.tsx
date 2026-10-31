/**
 * GRAMMATIKA bo'limi.
 *
 * Qilinadi:
 *  - Mavzular ro'yxati: titleUz, level, mashqlar soni, progress (data.attempts
 *    ichida shu mavzu mashq id'lari bo'yicha sanaladi)
 *  - Mavzu sahifasi: izoh paragraflari, formula, misollar (en+uz),
 *    forms (ijobiy / inkor / so'roq), commonMistakes jadvali
 *  - Mashqlar ExerciseRunner orqali; natija recordAttempt bilan yoziladi
 *  - Moslashuvchan tartib: nextExerciseIndex (src/lib/check.ts) — order massivi
 *  - 2 ta ketma-ket xatoda izohni qayta o'qish taklif qilinadi (scroll)
 *
 * Izohlar va tekshiruv to'liq lokal qoidalarga asoslangan (AI yo'q).
 */

import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'
import ExerciseRunner from '../components/ExerciseRunner'
import { Button, Card, Chip, EmptyState, InfoBanner, LoadingBlock, ProgressRing, StatTile } from '../components/ui'
import { getBundle } from '../content'
import type { Exercise, GrammarTopic } from '../content/types'
import { nextExerciseIndex, type CheckResult } from '../lib/check'
import { useStore } from '../lib/store'

/* --------------------------- progress hisobi --------------------------- */

interface TopicProgress {
  total: number
  attempted: number
  correct: number
  attempts: number
  ratio: number
  lastAt: number | null
}

function topicProgress(topic: GrammarTopic, attempts: { exerciseId: string; correct: boolean; at: number }[]): TopicProgress {
  const ids = new Set(topic.exercises.map((e) => e.id))
  const mine = attempts.filter((a) => ids.has(a.exerciseId))
  const answeredIds = new Set(mine.map((a) => a.exerciseId))
  const correct = new Set(mine.filter((a) => a.correct).map((a) => a.exerciseId)).size
  const total = topic.exercises.length
  return {
    total,
    attempted: answeredIds.size,
    correct,
    attempts: mine.length,
    ratio: total === 0 ? 0 : answeredIds.size / total,
    lastAt: mine.length ? Math.max(...mine.map((a) => a.at)) : null,
  }
}

function agoLabel(at: number): string {
  const days = Math.floor((Date.now() - at) / 86_400_000)
  if (days <= 0) return 'bugun'
  if (days === 1) return 'kecha'
  return `${days} kun oldin`
}

/* -------------------------------- sahifa -------------------------------- */

export default function Grammar() {
  const { data, ready, actions } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)

  const bundle = getBundle(data.settings.currentLevel)
  const topics = bundle.grammar

  if (!ready) return <LoadingBlock label="Grammatika materiallari yuklanmoqda…" />

  const opened = openId ? topics.find((t) => t.id === openId) ?? null : null

  if (!opened) {
    return (
      <div className="grid gap-4">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold">Grammatika</h1>
          <p className="muted text-sm">
            {data.settings.currentLevel} darajasi · {topics.length} ta mavzu · har mavzuda izoh, formula va amaliy
            mashqlar. Izohlar lokal qoidalar bilan tekshiriladi.
          </p>
        </header>

        {topics.length === 0 ? (
          <EmptyState
            title={`${data.settings.currentLevel} darajasi grammatikasi hali yuklanmagan`}
            body="Hozircha faqat A1 kontenti mavjud. Sozlamalardan darajani A1 qilib qo'ying yoki keyinroq qaytaning."
            action={
              data.settings.currentLevel !== 'A1' ? (
                <Button onClick={() => actions.setLevel('A1')}>A1 darajasiga o‘tish</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {topics.map((t, i) => {
              const p = topicProgress(t, data.attempts)
              return (
                <Card as="section" key={t.id} className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider muted">
                        {i + 1}-mavzu
                      </span>
                      <h2 className="font-bold leading-snug">{t.titleUz}</h2>
                      <p className="text-xs muted">{t.titleEn}</p>
                    </div>
                    <ProgressRing value={p.ratio} size={64} label="bajarilgan" />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Chip>{t.level}</Chip>
                    <Chip>{t.exercises.length} mashq</Chip>
                    <Chip>{t.examples.length} misol</Chip>
                    <Chip>{t.explanationUz.length} izoh qismi</Chip>
                    {p.attempts > 0 && (
                      <Chip tone={p.correct === p.attempted ? 'ok' : p.correct === 0 ? 'bad' : 'warn'}>
                        to‘g‘ri: {p.correct}/{p.attempted}
                      </Chip>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full bg-navy-600 dark:bg-navy-400 transition-[width] duration-500"
                        style={{ width: `${Math.round(p.ratio * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] muted tabular-nums">
                      {p.attempted}/{p.total} mashq bajarildi
                      {p.attempts > 0 ? ` · jami ${p.attempts} urinish` : ''}
                      {p.lastAt ? ` · oxirgi marta ${agoLabel(p.lastAt)}` : ''}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => setOpenId(t.id)}>{p.attempted > 0 ? 'Davom etish' : 'Mavzuni ochish'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(t.id)} title="Faqat izohni o'qish">
                      Izohni o‘qish
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return <TopicDetail topic={opened} onBack={() => setOpenId(null)} />
}

/* ---------------------------- mavzu sahifasi ---------------------------- */

const FORM_TITLES: { key: 'affirmative' | 'negative' | 'question'; label: string }[] = [
  { key: 'affirmative', label: 'Ijobiy shakl' },
  { key: 'negative', label: 'Inkor shakli' },
  { key: 'question', label: 'So‘roq shakli' },
]

function TopicDetail({ topic, onBack }: { topic: GrammarTopic; onBack: () => void }) {
  const { data, actions } = useStore()
  const explanationRef = useRef<HTMLDivElement>(null)
  const mistakesRef = useRef<HTMLDivElement>(null)
  const runnerRef = useRef<HTMLDivElement>(null)

  const total = topic.exercises.length

  // --- moslashuvchan tartib: qADAMMA-qADAM ko'ringan mashqlar ketma-ketligi ---
  const [order, setOrder] = useState<number[]>([0])
  const [pos, setPos] = useState(0)
  const [results, setResults] = useState<CheckResult[]>([])
  const [answered, setAnswered] = useState<Record<number, CheckResult>>({})
  const [finished, setFinished] = useState(false)

  const consecutiveErrors = useMemo(() => {
    let n = 0
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i] && !results[i]!.correct) n += 1
      else break
    }
    return n
  }, [results])

  const scrollToShow = (ref: RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onChecked = useCallback((r: CheckResult, exIndex: number) => {
    setResults((prev) => [...prev, r])
    setAnswered((prev) => ({ ...prev, [exIndex]: r }))
  }, [])

  const onNext = () => {
    const answeredCount = Object.keys(answered).length
    if (answeredCount >= total) {
      setFinished(true)
      return
    }
    const currentBase = order[pos] ?? 0
    let candidate = nextExerciseIndex(currentBase, results, total)
    // Agar tanlangan mashq allaqachon bajarilgan bo'lsa — keyingi bajarilmaganini
    // olamiz (xato bo'lsa bir pog'ona orqaga qaytish qoidasi saqlanadi).
    if (answered[candidate] !== undefined) {
      let steps = 0
      while (answered[candidate] !== undefined && steps < total * 2) {
        candidate = (candidate + 1) % total
        steps += 1
      }
    }
    setOrder((prev) => [...prev, candidate])
    setPos((prev) => prev + 1)
    scrollToShow(runnerRef)
  }

  const restart = () => {
    setOrder([0])
    setPos(0)
    setResults([])
    setAnswered({})
    setFinished(false)
  }

  const currentIdx = order[pos] ?? 0
  const current: Exercise | undefined = topic.exercises[currentIdx]
  const prevResult = pos > 0 ? results[pos - 1] ?? null : null

  const answeredList = Object.entries(answered).map(([k, r]) => ({ index: Number(k), result: r }))
  const wrong = answeredList.filter((a) => !a.result.correct)
  const score = Math.round((answeredList.filter((a) => a.result.correct).length / Math.max(1, total)) * 100)

  const p = topicProgress(topic, data.attempts)

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-1.5">
            ← Mavzular ro'yxati
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">{topic.titleUz}</h1>
          <p className="muted text-sm">{topic.titleEn}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{topic.level}</Chip>
          <Chip>{topic.exercises.length} mashq</Chip>
          <Chip tone={p.attempted === p.total ? 'ok' : 'warn'}>
            bajarilgan {p.attempted}/{p.total}
          </Chip>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Bajarilgan" value={`${answeredList.length}/${total}`} hint="shu sessiyada" />
        <StatTile label="To'g'ri" value={answeredList.length - wrong.length} tone="ok" hint="birinchi urinishda" />
        <StatTile label="Xato" value={wrong.length} tone={wrong.length > 0 ? 'bad' : 'ok'} hint="sababi ko'rsatilgan" />
        <StatTile label="Ball" value={`${score}%`} tone={score >= 70 ? 'ok' : 'warn'} hint="mavzu bo'yicha" />
      </div>

      {consecutiveErrors >= 2 && (
        <InfoBanner tone="warn">
          <div className="grid gap-2">
            <b>{consecutiveErrors} ta ketma-ket xato bor.</b>
            <span>
              Shu mavzuni mustahkamlash tavsiya etiladi: izohni qayta o'qib chiqing, keyingi mashq oldingi qiyinlikda
              qoladi.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => scrollToShow(explanationRef)}>
                Izohni ko‘rish
              </Button>
              <Button size="sm" variant="secondary" onClick={() => scrollToShow(mistakesRef)}>
                Ko'p qiladigan xatolar
              </Button>
            </div>
          </div>
        </InfoBanner>
      )}

      {/* ---------------------------- IZOH ---------------------------- */}
      <section ref={explanationRef} className="grid gap-3 scroll-mt-24">
        <Card as="section" className="grid gap-3">
          <h2 className="font-bold">Qanday ishlaydi</h2>
          {topic.explanationUz.map((par, i) => (
            <p key={i} className="text-sm leading-7">
              {par}
            </p>
          ))}
        </Card>

        <Card as="section" className="grid gap-2.5">
          <h2 className="font-bold">Formula</h2>
          <ol className="grid gap-2">
            {topic.formula.map((f, i) => (
              <li key={i} className="rounded-xl border bg-[var(--panel-2)] px-3.5 py-2.5 grid gap-1">
                <code className="text-sm font-semibold">{f.form}</code>
                {f.noteUz && <span className="text-xs muted">{f.noteUz}</span>}
              </li>
            ))}
          </ol>
        </Card>

        <Card as="section" className="grid gap-2.5">
          <h2 className="font-bold">Misollar</h2>
          <ul className="grid gap-2">
            {topic.examples.map((ex, i) => (
              <li key={i} className="rounded-xl border p-3 grid gap-1">
                <span className="font-medium">{ex.en}</span>
                <span className="text-sm muted">{ex.uz}</span>
              </li>
            ))}
          </ul>
        </Card>

        {topic.forms && (
          <div className="grid sm:grid-cols-3 gap-3">
            {FORM_TITLES.map(({ key, label }) => {
              const list = topic.forms?.[key]
              if (!list || list.length === 0) return null
              return (
                <Card as="section" key={key} className="grid gap-2">
                  <h3 className="font-bold text-sm">{label}</h3>
                  <ul className="grid gap-1.5 text-sm">
                    {list.map((s, i) => (
                      <li key={i} className="pl-2 border-l-2 border-[var(--border)]">
                        {s}
                      </li>
                    ))}
                  </ul>
                </Card>
              )
            })}
          </div>
        )}

        {topic.commonMistakes && topic.commonMistakes.length > 0 && (
          <div ref={mistakesRef} className="scroll-mt-24">
            <Card as="section" className="grid gap-2.5">
              <h2 className="font-bold">Ko'p qiladigan xatolar</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider muted">
                      <th className="py-2 pr-3 font-semibold">Xato</th>
                      <th className="py-2 pr-3 font-semibold">To‘g‘ri</th>
                      <th className="py-2 font-semibold">Nega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topic.commonMistakes.map((m, i) => (
                      <tr key={i} className="border-t align-top">
                        <td className="py-2 pr-3 text-[var(--bad)]">{m.wrong}</td>
                        <td className="py-2 pr-3 text-[var(--ok)] font-medium">{m.right}</td>
                        <td className="py-2 muted">{m.whyUz}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </section>

      {/* ---------------------------- MASHQLAR ---------------------------- */}
      <section ref={runnerRef} className="grid gap-3 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Mashqlar</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={restart} title="Boshidan boshlash">
              Qayta boshlash
            </Button>
            <Button variant="secondary" size="sm" onClick={() => scrollToShow(explanationRef)}>
              Izohni ko‘rish
            </Button>
          </div>
        </div>

        {total === 0 ? (
          <EmptyState title="Bu mavzuda mashq yo'q" body="Izoh va misollarni o'qib, boshqa mavzuga o'ting." />
        ) : finished ? (
          <Card className="grid gap-3">
            <h3 className="font-bold text-lg">Mashqlar tugadi</h3>
            <p className="text-sm">
              {answeredList.length} ta mashqning {answeredList.length - wrong.length} tasi to‘g‘ri — ball {score}%.
            </p>
            {wrong.length > 0 && <WrongList wrong={wrong} exercises={topic.exercises} />}
            <div className="flex flex-wrap gap-2">
              <Button onClick={restart}>Yana mashq qilish</Button>
              <Button variant="secondary" onClick={onBack}>
                Boshqa mavzuga o‘tish
              </Button>
            </div>
          </Card>
        ) : current ? (
          <Card className="grid gap-4">
            <ExerciseRunner
              key={`${topic.id}-${current.id}-${pos}`}
              exercise={current}
              index={currentIdx}
              total={total}
              prevResult={prevResult}
              checked={(r, secondsSpent) => {
                onChecked(r, currentIdx)
                actions.recordAttempt({
                  exercise: current,
                  correct: r.correct,
                  partial: r.partial,
                  given: r.given,
                  secondsSpent,
                  source: 'practice',
                })
              }}
              onNext={onNext}
            />
            <p className="text-[11px] muted">
              Mashq ketma-ketligi natijaga qarab tanlanadi (check.ts → nextExerciseIndex): to‘g‘ri javob qiyinlikni
              oshiradi, xato bo‘lsa shu darajada mustahkamlaydi.
            </p>
          </Card>
        ) : null}

        {!finished && wrong.length > 0 && <WrongList wrong={wrong} exercises={topic.exercises} />}
      </section>
    </div>
  )
}

function WrongList({
  wrong,
  exercises,
}: {
  wrong: { index: number; result: CheckResult }[]
  exercises: Exercise[]
}) {
  return (
    <Card className="grid gap-2">
      <h3 className="font-bold">Xato sababi</h3>
      <ul className="grid gap-2">
        {wrong.map(({ index, result }) => {
          const ex = exercises[index]
          return (
            <li key={`${ex?.id ?? index}`} className="rounded-xl border bg-[var(--panel-2)] p-3 grid gap-1 text-sm">
              <span className="font-semibold">{ex ? ex.instructionUz : 'Mashq'}</span>
              <span className="muted">
                Sizning javobingiz: <b>{result.given || '—'}</b> · To‘g‘ri: <b>{result.expected}</b>
              </span>
              <span>{result.whyUz}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
