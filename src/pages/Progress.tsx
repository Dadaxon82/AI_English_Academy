/**
 * Progress va statistika — ko'nikma isbotlari, grafiklar, tarix.
 *
 * Daraja ko'tarish XP/yillar bilan emas, ko'p ko'nikmalı ISBOT bilan
 * o'lchanadi — shu sahifada isbotlar ochiq ko'rsatiladi.
 */

import { useMemo, useState } from 'react'
import { BarChart, Button, Card, Chip, EmptyState, InfoBanner, ProgressRing, StatTile } from '../components/ui'
import { useStore, lastNDays, totalVocabCount } from '../lib/store'
import { levelLabel, PROMOTION_THRESHOLD, MIN_EVIDENCE_PER_SKILL } from '../lib/skillScoring'
import { skillLabelUz, daysUntil } from '../lib/planning'
import { formatDuration } from '../lib/timer'
import { LOADED_LEVELS, getBundle } from '../content'
import { CEFR_LEVELS } from '../content/types'
import type { SkillEvidence } from '../lib/skillScoring'

export default function Progress() {
  const { data, evidence, promotion, streak, learnedCount, dueCount, allocation } = useStore()
  const [range, setRange] = useState<7 | 14 | 30>(7)

  const days = useMemo(() => lastNDays(data, range), [data, range])
  const totals = useMemo(() => {
    const seconds = days.reduce((a, d) => a + d.seconds, 0)
    const attempts = days.reduce((a, d) => a + d.attempts, 0)
    const correct = days.reduce((a, d) => a + d.correct, 0)
    return { seconds, attempts, correct, acc: attempts ? Math.round((correct / attempts) * 100) : 0 }
  }, [days])

  const ll = levelLabel(data.settings.currentLevel)
  const target = levelLabel(data.settings.targetLevel)
  const examLeft = daysUntil(data.settings.examDate)
  const vocabTotal = totalVocabCount()
  const pathDone = data.path.completedDays.length
  const pathTotal = getBundle(data.settings.currentLevel).days.length

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">Progress</h1>
          <Chip tone="brand">
            {data.settings.currentLevel} → {data.settings.targetLevel}
          </Chip>
          {examLeft !== null && <Chip tone={examLeft < 14 ? 'warn' : 'default'}>Imtihongacha {examLeft} kun</Chip>}
        </div>
        <p className="muted text-sm">
          Hozirgi daraja: <b>{ll.titleUz}</b> ({ll.titleEn}). Maqsad: <b>{target.titleUz}</b>.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CEFR_LEVELS.map((lvl) => {
            const loaded = LOADED_LEVELS.includes(lvl)
            const active = lvl === data.settings.currentLevel
            return (
              <span
                key={lvl}
                className={`chip ${active ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''} ${loaded ? '' : 'opacity-50'}`}
                title={loaded ? (active ? 'Siz hozir shu darajadasiz' : 'Kontent yuklangan daraja') : 'Kontent hali tayyor emas'}
              >
                {lvl}
                {!loaded && ' ·'}
              </span>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Kunlik ketma-ketlik" value={`${streak} kun`} tone={streak > 0 ? 'ok' : 'default'} hint="Ketma-ket faol kunlar" />
        <StatTile label={`${range} kun ichida`} value={formatDuration(totals.seconds)} hint="Faoliyat vaqti" />
        <StatTile label="Aniqlik" value={`${totals.acc}%`} tone={totals.acc >= 70 ? 'ok' : totals.acc >= 50 ? 'warn' : 'bad'} hint={`${totals.correct}/${totals.attempts} to‘g‘ri`} />
        <StatTile label="So‘zlar" value={`${learnedCount}/${vocabTotal}`} hint={`${dueCount} ta takror navbatda`} />
      </div>

      {/* --- Ko'nikma isbotlari (daraja ko'tarish shartlari) --- */}
      <Card className="grid gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Ko‘nikma isbotlari</h2>
          <Chip tone={promotion.recommendedLevel ? 'ok' : 'warn'}>
            {promotion.recommendedLevel ? 'Ko‘tarilishga tayyor' : 'Hali tayyor emas'}
          </Chip>
        </div>
        <p className="text-xs muted">
          Daraja faqat to‘rtta asosiy ko‘nikma bo‘yicha yetarli isbot yig‘ilsa tavsiya qilinadi: har birida kamida{' '}
          {MIN_EVIDENCE_PER_SKILL} ta o‘lchov va umumiy ball {PROMOTION_THRESHOLD}+. XP yoki kunlar darajani ko‘tarmaydi.
        </p>
        <div className="grid gap-3">
          {evidence.map((e) => (
            <EvidenceRow key={e.skill} e={e} />
          ))}
        </div>
        <InfoBanner tone={promotion.recommendedLevel ? 'info' : 'muted'}>{promotion.reasonUz}</InfoBanner>
        {promotion.recommendedLevel !== null && <PromoteBanner />}
      </Card>

      {/* --- Faoliyat grafigi --- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Kunlik faoliyat</h2>
          <span className="flex-1" />
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`chip cursor-pointer ${range === r ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
            >
              {r} kun
            </button>
          ))}
        </div>
        {days.every((d) => d.seconds === 0 && d.attempts === 0) ? (
          <EmptyState title="Grafik bo‘sh" body="Birinchi mashqni bajaring — kunlik faoliyat shu yerda ko‘rinadi." />
        ) : (
          <BarChart
            data={days.map((d) => ({
              label: d.date.slice(8) + '.' + d.date.slice(5, 7),
              value: d.seconds,
              max: allocation.total * 60,
            }))}
          />
        )}
        <p className="text-[11px] muted">Chiziq — kunlik maqsad ({allocation.total}′).</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* --- Mock imtihonlar tarixi --- */}
        <Card className="grid gap-3">
          <h2 className="font-bold">Mock imtihon natijalari</h2>
          {data.mockAttempts.length === 0 ? (
            <EmptyState title="Mock imtihon topshirilmagan" body="Mock imtihon bo‘limiga o‘tib, to‘liq mashq imtihonini yeching." />
          ) : (
            [...data.mockAttempts].reverse().map((m) => (
              <div key={m.id} className="rounded-xl border p-3 grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ProgressRing value={(m.totalScore ?? 0) / 100} size={54} />
                  <div>
                    <div className="font-semibold">{new Date(m.completedAt).toLocaleString('uz')}</div>
                    <div className="text-xs muted">{m.examId}</div>
                  </div>
                  <span className="flex-1" />
                  {m.sections.map((s) => (
                    <Chip key={s.sectionId} tone={s.score === null ? 'default' : s.score >= 70 ? 'ok' : s.score >= 50 ? 'warn' : 'bad'}>
                      {skillLabelUz(s.skill)}: {s.score === null ? '—' : s.score}
                    </Chip>
                  ))}
                </div>
                <p className="text-[11px] muted">{m.speakingAdvisory}</p>
              </div>
            ))
          )}
        </Card>

        {/* --- Yozish / gapirish tarixi --- */}
        <Card className="grid gap-3">
          <h2 className="font-bold">Yozish va gapirish tarixi</h2>
          {data.writing.length + data.speaking.length === 0 ? (
            <EmptyState title="Hali ish yuborilmagan" body="Yozish yoki gapirish topshirigini bajaring — baholar shu yerda paydo bo'ladi." />
          ) : (
            <div className="grid gap-2 max-h-80 overflow-auto pr-1">
              {[
                ...data.writing.map((w) => ({
                  at: w.createdAt,
                  kind: 'Yozish',
                  score: w.analysis ? Math.round((Object.values(w.analysis.criteriaScores).reduce((a, b) => a + b, 0) / 5 / 5) * 100) : null,
                  label: `${w.wordCount} so‘z`,
                })),
                ...data.speaking.map((s) => ({
                  at: s.createdAt,
                  kind: 'Gapirish',
                  score: s.analysis
                    ? Math.round((((s.analysis.fluency + s.analysis.grammar + s.analysis.lexis) / 3 / 5) as number) * 100)
                    : null,
                  label: `${s.durationSec}s`,
                })),
              ]
                .sort((a, b) => b.at - a.at)
                .slice(0, 30)
                .map((row, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm rounded-lg border p-2.5">
                    <Chip tone="brand">{row.kind}</Chip>
                    <span className="muted text-xs">{new Date(row.at).toLocaleString('uz')}</span>
                    <span className="flex-1" />
                    <span className="text-xs muted">{row.label}</span>
                    <Chip tone={row.score === null ? 'default' : row.score >= 70 ? 'ok' : row.score >= 50 ? 'warn' : 'bad'}>
                      {row.score === null ? 'bahosiz' : `${row.score}/100`}
                    </Chip>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      {/* --- O'quv yo'li va diagnostika --- */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="grid gap-3">
          <h2 className="font-bold">O‘quv yo‘li</h2>
          <div className="flex items-center gap-3">
            <ProgressRing value={pathTotal ? pathDone / pathTotal : 0} size={72} label={`${pathDone}/${pathTotal} kun`} />
            <div className="text-sm muted">
              {pathDone === 0
                ? 'Hali birorta kun tugatilmagan.'
                : `${pathDone} kun tugatildi. Bo‘lim testlari: ${Object.keys(data.path.passedTests).length} ta.`}
            </div>
          </div>
        </Card>
        <Card className="grid gap-3">
          <h2 className="font-bold">Diagnostika</h2>
          {data.diagnostic === null ? (
            <EmptyState title="Diagnostika topshirilmagan" body="Onboarding’da yoki Sozlamalardan diagnostikani topshirishingiz mumkin." />
          ) : (
            <div className="grid gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <b>{data.diagnostic.labelUz}</b>
                <Chip tone="brand">Aniqlik {Math.round(data.diagnostic.confidence * 100)}%</Chip>
                <span className="muted">{new Date(data.diagnostic.at).toLocaleString('uz')}</span>
              </div>
              <p className="text-xs muted">
                Diagnostika faqat boshlang‘ich yo‘nalish beradi; daraja keyin ko‘p ko‘nikmalı isbotlar bilan ko‘tariladi.
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="grid gap-3">
        <h2 className="font-bold">Xulosa statistikasi</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Jami urinishlar" value={data.attempts.length} />
          <StatTile label="Yozish ishları" value={data.writing.length} />
          <StatTile label="Gapirish seansları" value={data.speaking.length} />
          <StatTile label="Mock urinishlar" value={data.mockAttempts.length} />
        </div>
        <ExportProgress />
      </Card>
    </div>
  )
}

function EvidenceRow({ e }: { e: SkillEvidence }) {
  const okScore = e.score >= PROMOTION_THRESHOLD
  const okCount = e.evidenceCount >= MIN_EVIDENCE_PER_SKILL
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold w-24">{skillLabelUz(e.skill)}</span>
        <div className="flex-1 h-2.5 rounded-full bg-[var(--panel-2)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${okScore ? 'bg-[var(--ok)]' : okScore === false && e.score >= 50 ? 'bg-[var(--warn)]' : 'bg-[var(--bad)]'}`}
            style={{ width: `${Math.min(100, e.score)}%` }}
          />
        </div>
        <span className="tabular-nums w-12 text-right font-bold">{e.score}</span>
        <Chip tone={okCount ? 'ok' : 'warn'}>
          {e.evidenceCount}/{MIN_EVIDENCE_PER_SKILL} isbot
        </Chip>
        <Chip tone={e.confidence >= 0.7 ? 'ok' : 'default'}>{Math.round(e.confidence * 100)}% ishonch</Chip>
      </div>
      {e.lastAt === null && <span className="text-[11px] muted">Bu ko‘nikma bo‘yicha hali o‘lchov yo‘q.</span>}
    </div>
  )
}

function PromoteBanner() {
  const { promotion, actions } = useStore()
  const [done, setDone] = useState(false)
  if (done) return <InfoBanner>Daraja yangilandi — yechib bo‘lingan mashqlar tarixi saqlanadi.</InfoBanner>
  return (
    <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/25 p-3.5 flex flex-wrap items-center gap-3">
      <span className="text-sm">
        Tizim tavsiyasi: <b>{promotion.recommendedLevel}</b> darajasiga o‘tish.
      </span>
      <span className="flex-1" />
      <Button
        size="sm"
        variant="success"
        onClick={() => {
          if (!promotion.recommendedLevel) return
          actions.setLevel(promotion.recommendedLevel)
          setDone(true)
        }}
      >
        {promotion.recommendedLevel}ga o‘tish
      </Button>
      <span className="text-[11px] muted w-full">Kontent {LOADED_LEVELS.join('/')} darajalari uchun tayyor; boshqa daraja kontenti keyin qo‘shiladi.</span>
    </div>
  )
}

function ExportProgress() {
  const { data, evidence, promotion } = useStore()
  const [note, setNote] = useState<string | null>(null)
  const blob = {
    exportedAt: new Date().toISOString(),
    settings: data.settings,
    xp: data.xp,
    learned: Object.values(data.srs).filter((s) => s.learnedAt !== null).length,
    activity: data.activity,
    skillEvidence: evidence,
    promotion,
    mockAttempts: data.mockAttempts,
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify(blob, null, 2)], { type: 'application/json' }))
          const a = document.createElement('a')
          a.href = url
          a.download = 'progress.json'
          a.click()
          URL.revokeObjectURL(url)
          setNote('progress.json yuklab olindi.')
        }}
      >
        Progressni JSON eksport
      </Button>
      {note && <span className="text-xs text-[var(--ok)]">{note}</span>}
    </div>
  )
}
