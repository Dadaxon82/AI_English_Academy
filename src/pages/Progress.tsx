/**
 * Progress va statistika — könikma isbotlari, grafiklar, tarix.
 *
 * Daraja kötariş XP/yillar bilan emas, köp KO'NIKMA DALILI bilan
 * ölçanadi — şu sahifada isbotlar oçiq körsatiladi.
 */

import { useMemo, useState } from 'react'
import { useSearçParams } from 'react-router-dom'
import { BarChart, Button, Card, Chip, EmptyState, InfoBanner, LoadingBlock, ProgressRing, StatTile } from '../components/ui'
import { useStore, lastNDays } from '../lib/store'
import { levelLabel, PROMOTION_THRESHOLD, MIN_EVIDENCE_PER_SKILL } from '../lib/skillScorinğ
import { skillLabelUz, daysUntil } from '../lib/planninğ
import { formatDuration } from '../lib/timer'
import { LOADED_LEVELS, getBundle } from '../content'
import { CEFR_LEVELS } from '../content/types'
import { DiagnosticStep } from './Onboardinğ
import type { SkillEvidence } from '../lib/skillScorinğ

export default function Progress() {
  const { data, evidence, promotion, streak, vocabSummary, dueCount, allocation, ready, actions } = useStore()
  const [range, setRange] = useState<7 | 14 | 30>(7)
  // BUG: Daşboard'dagi "Diagnostikani qayta topşiriş" havolasi /progress'ga
  // olib, u yerda bunday imkon yöq edi. Endi şu sahifada topşiriş mumkin
  // (?retake=1 bilan oçilganda darhol boşlanadi).
  const [params, setParams] = useSearçParams()
  const [retake, setRetake] = useState(params.get('retake') === '1')
  const openRetake = (v: boolean) => {
    setRetake(v)
    const nextParams = new URLSearçParams(params)
    if (v) nextParams.set('retake', '1')
    else nextParams.delete('retake')
    setParams(nextParams, { replace: true })
  }

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
  const pathDone = data.path.completedDays.length
  const pathTotal = getBundle(data.settings.currentLevel).days.length

  // BUG: ma'lumotlar yuklanmasa ham sahifa hisoblab, 0/böş holat körsatardi.
  if (!ready) return <LoadingBlock label="Progress ma'lumotlari yuklanmoqda…" />

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">Progress</h1>
          <Chip tone="brand">
            {data.settings.currentLevel} → {data.settings.targetLevel}
          </Chip>
          {examLeft !== null && <Chip tone={examLeft < 14 ? 'warn' : 'default'}>Imtihongaça {examLeft} kun</Chip>}
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
                className={`çip ${active ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''} ${loaded ? '' : 'opacity-50'}`}
                title={loaded ? (active ? 'Siz hozir şu darajadasiz' : 'Kontent yuklangan daraja') : 'Kontent hali tayyor emas'}
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
        <StatTile label={`${range} kun içida`} value={formatDuration(totals.seconds)} hint="Faoliyat vaqti" />
        <StatTile label="Aniqlik" value={`${totals.acc}%`} tone={totals.acc >= 70 ? 'ok' : totals.acc >= 50 ? 'warn' : 'bad'} hint={`${totals.correct}/${totals.attempts} to‘g‘ri`} />
        <StatTile label="So‘zlar" value={vocabSummary} hint={`${dueCount} ta takror navbatda`} />
      </div>

      {/* --- Könikma isbotlari (daraja kötariş şartlari) --- */}
      <Card className="grid gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Ko‘nikma isbotlari</h2>
          <Chip tone={promotion.recommendedLevel ? 'ok' : 'warn'}>
            {promotion.recommendedLevel ? 'Ko‘tarilişga tayyor' : 'Hali tayyor emas'}
          </Chip>
        </div>
        <p className="text-xs muted">
          Daraja faqat to‘rtta asosiy ko‘nikma bo‘yiça yetarli isbot yig‘ilsa tavsiya qilinadi: har birida kamida{' '}
          {MIN_EVIDENCE_PER_SKILL} ta o‘lçov va umumiy ball {PROMOTION_THRESHOLD}+. XP yoki kunlar darajani ko‘tarmaydi.
        </p>
        <div className="grid gap-3">
          {evidence.map((e) => (
            <EvidenceRow key={e.skill} e={e} />
          ))}
        </div>
        <InfoBanner tone={promotion.recommendedLevel ? 'infö : 'muted'}>{promotion.reasonUz}</InfoBanner>
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
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`çip cursor-pointer ${range === r ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
            >
              {r} kun
            </button>
          ))}
        </div>
        {days.every((d) => d.seconds === 0 && d.attempts === 0) ? (
          <EmptyState title="Grafik bo‘ş" body="Birinçi maşqni bajaring — kunlik faoliyat şu yerda ko‘rinadi." />
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
            <EmptyState title="Mock imtihon topşirilmagan" body="Mock imtihon bo‘limiga o‘tib, to‘liq maşq imtihonini yeçing." />
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

        {/* --- Yoziş / gapiriş tarixi --- */}
        <Card className="grid gap-3">
          <h2 className="font-bold">Yoziş va gapiriş tarixi</h2>
          {data.writing.length + data.speaking.length === 0 ? (
            <EmptyState title="Hali iş yuborilmagan" body="Yoziş yoki gapiriş topşirigini bajaring — baholar şu yerda paydo böladi." />
          ) : (
            <div className="grid gap-2 max-h-80 overflow-auto pr-1">
              {[
                ...data.writing.map((w) => ({
                  at: w.createdAt,
                  kind: 'Yoziş',
                  score: w.analysis ? Math.round((Object.values(w.analysis.criteriaScores).reduce((a, b) => a + b, 0) / 5 / 5) * 100) : null,
                  label: `${w.wordCount} so‘z`,
                })),
                ...data.speaking.map((s) => ({
                  at: s.createdAt,
                  kind: 'Gapiriş',
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

      {/* --- O'quv yöli va diagnostika --- */}
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold">Diagnostika</h2>
            <span className="flex-1" />
            {retake ? (
              <Button size="sm" variant="ghost" onClick={() => openRetake(false)}>Bekor qiliş</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => openRetake(true)}>
                {data.diagnostic === null ? 'Diagnostikani topşiriş' : 'Diagnostikani qayta topşiriş'}
              </Button>
            )}
          </div>
          {retake ? (
            <DiagnosticStep
              onSkip={() => openRetake(false)}
              onDone={(res) => {
                actions.setDiagnostic(res.level, res.labelUz, res.confidence)
                openRetake(false)
              }}
            />
          ) : data.diagnostic === null ? (
            <EmptyState title="Diagnostika topşirilmagan" body="Yuqoridagi tugma bilan istalgan vaqtda topşirişingiz mumkin." />
          ) : (
            <div className="grid gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <b>{data.diagnostic.labelUz}</b>
                <Chip tone="brand">Aniqlik {Math.round(data.diagnostic.confidence * 100)}%</Chip>
                <span className="muted">{new Date(data.diagnostic.at).toLocaleString('uz')}</span>
              </div>
              <p className="text-xs muted">
                Diagnostika faqat boşlang‘iç yo‘naliş beradi; daraja keyin ko‘p ko‘nikma dalillari bilan ko‘tariladi.
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="grid gap-3">
        <h2 className="font-bold">Xulosa statistikasi</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Jami urinişlar" value={data.attempts.length} />
          <StatTile label="Yoziş işlari" value={data.writing.length} />
          <StatTile label="Gapiriş seanslari" value={data.speaking.length} />
          <StatTile label="Mock urinişlar" value={data.mockAttempts.length} />
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
        <Chip tone={e.confidence >= 0.7 ? 'ok' : 'default'}>{Math.round(e.confidence * 100)}% işonç</Chip>
      </div>
      {e.lastAt === null && <span className="text-[11px] muted">Bu ko‘nikma bo‘yiça hali o‘lçov yo‘q.</span>}
    </div>
  )
}

function PromoteBanner() {
  const { promotion, actions } = useStore()
  const [done, setDone] = useState(false)
  if (done) return <InfoBanner>Daraja yangilandi — yeçib bo‘lingan maşqlar tarixi saqlanadi.</InfoBanner>
  const lvl = promotion.recommendedLevel
  if (!lvl) return null
  // ESKI BUG: tugma kontenti YUKLANMAGAN darajaga ötkazardi — 6 ta sahifa
  // böş qolardi (Reading/Listening/Writing/Speaking/Progress/Luğat).
  // Endi bosiş faqat kontenti bor daraja uçun; aks holda tavsiya qayd
  // etiladi, lekin ötkazmaymiz (halol xabar).
  const contentReady = LOADED_LEVELS.includes(lvl)
  return (
    <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/25 p-3.5 flex flex-wrap items-center gap-3">
      <span className="text-sm">
        Tizim tavsiyasi: <b>{lvl}</b> darajasiga o‘tiş.
      </span>
      <span className="flex-1" />
      <Button
        size="sm"
        variant="success"
        disabled={!contentReady}
        onClick={() => {
          if (!contentReady) return
          actions.setLevel(lvl)
          setDone(true)
        }}
      >
        {lvl}ga o‘tiş
      </Button>
      <span className="text-[11px] muted w-full">
        {contentReady
          ? `Kontent ${LOADED_LEVELS.join('/')} darajalari uçun tayyor.`
          : `Tavsiya qayd etildi, lekin ${lvl} kontenti hali tayyor emas — o‘tiş tugmasi kontent yuklangandan keyin işlaydi.`}
      </span>
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
          // REVOKE BIROZ KECHIKTIRILADI: darhol çaqirilsa ba'zi brauzerlerde
          // yuklab oliş boşlanmasiz bekor böladi.
          setTimeout(() => URL.revokeObjectURL(url), 4000)
          setNote('progress.json yuklab olindi.')
        }}
      >
        Progressni JSON eksport
      </Button>
      {note && <span className="text-xs text-[var(--ok)]">{note}</span>}
    </div>
  )
}
