/**
 * Xatolar kunnigi — xatolarni ko'rish, takrorlanadigan xatolarni topish,
 * filtrlash va eksport qilish.
 *
 * Talab: foydalanuvchi o'z xatolarini ko'radi va ular ustida ishlaydi.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Chip, EmptyState, Field, InfoBanner, inputCls } from '../components/ui'
import { useStore } from '../lib/store'
import { findExercise } from '../content'
import { checkAnswer } from '../lib/check'
import { skillLabelUz } from '../lib/planning'
import type { AttemptRecord, AttemptSource } from '../lib/types'
import type { Skill } from '../content/types'

type Range = 'all' | '7' | '30'

const SKILL_ORDER: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking']

export default function ErrorLog() {
  const { data } = useStore()
  const [skill, setSkill] = useState<Skill | 'all'>('all')
  const [range, setRange] = useState<Range>('all')
  const [source, setSource] = useState<AttemptSource | 'all'>('all')
  const [q, setQ] = useState('')

  const errors = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - (range === '7' ? 7 : 30) * 86_400_000
    return data.attempts
      .filter((a) => !a.correct)
      .filter((a) => (skill === 'all' ? true : a.skill === skill))
      .filter((a) => (source === 'all' ? true : a.source === source))
      .filter((a) => a.at >= cutoff)
      .filter((a) => (q.trim() ? a.exerciseId.toLowerCase().includes(q.trim().toLowerCase()) : true))
      .sort((a, b) => b.at - a.at)
  }, [data.attempts, skill, source, range, q])

  /** Takrorlanadigan xatolar: bir xil mashqda 2+ marta xato. */
  const repeated = useMemo(() => {
    const map = new Map<string, AttemptRecord[]>()
    for (const a of data.attempts.filter((x) => !x.correct)) {
      const list = map.get(a.exerciseId) ?? []
      list.push(a)
      map.set(a.exerciseId, list)
    }
    return [...map.entries()]
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 12)
  }, [data.attempts])

  const totalErrors = data.attempts.filter((a) => !a.correct).length

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <h1 className="text-xl font-bold">Xatolar kunnigi</h1>
        <p className="muted text-sm">
          Barcha noto‘g‘ri javoblaringiz shu yerda. {totalErrors} ta xato qayd etilgan. Takrorlanadigan xatolar —
          eng avval ishlash kerak bo‘lgan joylar.
        </p>
        <ExportButtons rows={errors} />
      </Card>

      {repeated.length > 0 && (
        <Card className="grid gap-3">
          <h2 className="font-bold">Takrorlanadigan xatolar</h2>
          <p className="text-xs muted">Bitta mashqda kamida ikki marta xato qilganingiz.</p>
          <div className="grid gap-2">
            {repeated.map(([exId, list]) => {
              const ex = findExercise(exId)
              return (
                <div key={exId} className="rounded-xl border p-3 grid gap-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Chip tone="bad">{list.length} marta</Chip>
                    <Chip>{skillLabelUz(list[0]!.skill)}</Chip>
                    <Chip>{list[0]!.level}</Chip>
                    <span className="muted font-mono text-[11px]">{exId}</span>
                    <span className="flex-1" />
                    {ex && (
                      <Link to={pathForSkill(ex.skill)} className="text-xs font-semibold text-[var(--accent)]">
                        Mashq qilish →
                      </Link>
                    )}
                  </div>
                  {ex && <p className="text-sm">{ex.instructionUz}</p>}
                  {list[0] && <WrongPair exerciseId={exId} attempt={list[0]} />}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="grid gap-3">
        <h2 className="font-bold">Barcha xatolar</h2>
        <div className="grid sm:grid-cols-4 gap-2.5">
          <Field label="Ko'nikma">
            <select value={skill} onChange={(e) => setSkill(e.target.value as Skill | 'all')} className={inputCls}>
              <option value="all">Barchasi</option>
              {SKILL_ORDER.map((s) => (
                <option key={s} value={s}>
                  {skillLabelUz(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Manba">
            <select value={source} onChange={(e) => setSource(e.target.value as AttemptSource | 'all')} className={inputCls}>
              <option value="all">Barchasi</option>
              <option value="practice">Mashq</option>
              <option value="section_test">Bo‘lim testi</option>
              <option value="mock_exam">Mock imtihon</option>
              <option value="diagnostic">Diagnostika</option>
            </select>
          </Field>
          <Field label="Davr">
            <select value={range} onChange={(e) => setRange(e.target.value as Range)} className={inputCls}>
              <option value="all">Butun tarix</option>
              <option value="30">Oxirgi 30 kun</option>
              <option value="7">Oxirgi 7 kun</option>
            </select>
          </Field>
          <Field label="Qidiruv">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mashq ID…" className={inputCls} />
          </Field>
        </div>

        {errors.length === 0 ? (
          <EmptyState
            title="Bu filtr bo‘yicha xato topilmadi"
            body="Filtrni o'zgartiring yoki mashq qiling — xatolar avtomatik qayd etiladi."
            action={
              <Button variant="secondary" size="sm" onClick={() => (window.location.href = '/dashboard')}>
                Mashqqa o‘tish
              </Button>
            }
          />
        ) : (
          <div className="grid gap-2">
            {errors.slice(0, 200).map((a) => (
              <div key={a.id} className="rounded-xl border p-3 grid gap-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Chip>{skillLabelUz(a.skill)}</Chip>
                  <Chip>{a.level}</Chip>
                  <Chip>{a.difficulty}/5</Chip>
                  <Chip tone={a.source === 'mock_exam' ? 'brand' : 'default'}>{sourceLabelUz(a.source)}</Chip>
                  <span className="muted">{new Date(a.at).toLocaleString('uz')}</span>
                  <span className="flex-1" />
                  <span className="muted font-mono text-[11px]">{a.exerciseId}</span>
                </div>
                <WrongPair exerciseId={a.exerciseId} attempt={a} />
                <Explain exerciseId={a.exerciseId} />
              </div>
            ))}
            {errors.length > 200 && <p className="text-xs muted">Yana {errors.length - 200} ta xato eksportda mavjud.</p>}
          </div>
        )}
      </Card>
    </div>
  )
}

function WrongPair({ exerciseId, attempt }: { exerciseId: string; attempt: AttemptRecord }) {
  const ex = findExercise(exerciseId)
  const result = ex ? checkAnswer(ex, attempt.answerGiven) : null
  return (
    <div className="grid sm:grid-cols-2 gap-2 text-sm">
      <div className="rounded-lg bg-[var(--panel-2)] p-2.5">
        <div className="text-[10px] muted font-semibold uppercase">Sizning javobingiz</div>
        <div className="text-[var(--bad)] break-words">{attempt.answerGiven || '—'}</div>
      </div>
      <div className="rounded-lg bg-[var(--panel-2)] p-2.5">
        <div className="text-[10px] muted font-semibold uppercase">To‘g‘ri javob</div>
        <div className="text-[var(--ok)] break-words">{result?.expected ?? '—'}</div>
      </div>
    </div>
  )
}

function Explain({ exerciseId }: { exerciseId: string }) {
  const ex = findExercise(exerciseId)
  if (!ex?.explanationUz) return null
  return <InfoBanner tone="muted">{ex.explanationUz}</InfoBanner>
}

function ExportButtons({ rows }: { rows: AttemptRecord[] }) {
  const [note, setNote] = useState<string | null>(null)

  const download = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0) {
    return <InfoBanner>Eksport uchun xato yo‘q.</InfoBanner>
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          download('xatolar.json', JSON.stringify(rows, null, 2), 'application/json')
          setNote(`${rows.length} ta xato JSON sifatida yuklab olindi.`)
        }}
      >
        JSON eksport
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          const head = ['id', 'exerciseId', 'skill', 'level', 'given', 'at', 'source', 'secondsSpent']
          const body = rows.map((r) =>
            [r.id, r.exerciseId, r.skill, r.level, q(r.answerGiven), new Date(r.at).toISOString(), r.source, r.secondsSpent].join(','),
          )
          download('xatolar.csv', [head.join(','), ...body].join('\n'), 'text/csv')
          setNote(`${rows.length} ta xato CSV sifatida yuklab olindi.`)
        }}
      >
        CSV eksport
      </Button>
      {note && <span className="text-xs text-[var(--ok)]">{note}</span>}
    </div>
  )
}

function q(v: string) {
  return `"${v.replace(/"/g, '""').replace(/\n/g, ' ')}"`
}

function sourceLabelUz(s: AttemptSource) {
  return { practice: 'Mashq', section_test: 'Bo‘lim testi', mock_exam: 'Mock imtihon', diagnostic: 'Diagnostika' }[s]
}

function pathForSkill(s: Skill) {
  return {
    vocabulary: '/vocabulary',
    grammar: '/grammar',
    reading: '/reading',
    listening: '/listening',
    writing: '/writing',
    speaking: '/speaking',
  }[s]
}
