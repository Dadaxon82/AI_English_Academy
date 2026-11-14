/**
 * Onboarding va boshlang'ich diagnostika.
 *
 * Foydalanuvchi A1 dan boshlaydi; diagnostika ixtiyoriy. Natija noaniq
 * bo'lsa aniq CEFR darajasi deb ko'rsatilmaydi.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Chip, Field, InfoBanner, inputCls } from '../components/ui'
import ExerciseRunner from '../components/ExerciseRunner'
import { diagnosticTest, diagnose } from '../content/diagnostic'
import { useStore } from '../lib/store'
import { CEFR_LEVELS, type CefrLevel } from '../content/types'
import { LOADED_LEVELS } from '../content'

export default function Onboarding() {
  const { data, actions } = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const steps = ['Maqsadlar', 'Kundalik reja', 'Diagnostika', 'Tayyor']

  const [level, setLevel] = useState<CefrLevel>('A1')
  const [target, setTarget] = useState<CefrLevel>('C1')
  const [minutes, setMinutes] = useState(data.settings.dailyMinutes)
  const [examDate, setExamDate] = useState(data.settings.examDate ?? '')

  // ESKI BUG: bu yerda to'g'ridan-to'g'ri setStep(2) qilardi — "Kundalik reja"
  // bosqichi (Schedule) HECH QACHON ochilmaydi, daqiqa/imtihon sanasi
  // sozlanmay qolardi. Endi 1 → 2 ketma-ketligi ishlaydi.
  const saveBasics = () => {
    actions.setSettings({ currentLevel: level, targetLevel: target })
    setStep(1)
  }

  const saveSchedule = () => {
    actions.setSettings({
      dailyMinutes: Math.max(15, Math.min(240, minutes)),
      examDate: examDate || null,
    })
    setStep(2)
  }

  return (
    <div className="min-h-dvh grid place-items-center p-4">
      <div className="w-full max-w-2xl grid gap-4">
        <header className="text-center grid gap-1.5">
          <h1 className="text-2xl font-bold">Xush kelibsiz!</h1>
          <p className="muted text-sm">3 ta savol — so‘ng boshlaymiz. Bularning barchasini keyin sozlamalardan o‘zgartirasiz.</p>
          <ol className="flex justify-center gap-2 mt-2">
            {steps.map((s, i) => (
              <li key={s} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${i === step ? 'bg-navy-700 text-white dark:bg-navy-500 dark:text-navy-950' : i < step ? 'text-[var(--ok)]' : 'muted'}`}>
                {i + 1}. {s}
              </li>
            ))}
          </ol>
        </header>

        {step === 0 && <Basics level={level} setLevel={setLevel} target={target} setTarget={setTarget} onNext={saveBasics} />}
        {step === 1 && <Schedule minutes={minutes} setMinutes={setMinutes} examDate={examDate} setExamDate={setExamDate} onNext={saveSchedule} onBack={() => setStep(0)} />}
        {step === 2 && <DiagnosticStep onSkip={() => setStep(3)} onDone={(res) => { actions.setDiagnostic(res.level, res.labelUz, res.confidence); setStep(3) }} />}
        {step === 3 && (
          <Card className="text-center grid gap-3">
            <h2 className="text-xl font-bold">Hammasi tayyor 🎉</h2>
            <p className="muted text-sm">
              Boshlang‘ich darajangiz: <b>{data.settings.currentLevel}</b> · Maqsad: <b>{data.settings.targetLevel}</b> ·
              Kunlik reja: <b>{data.settings.dailyMinutes} daqiqa</b>
            </p>
            {data.diagnostic && <InfoBanner>{data.diagnostic.labelUz}</InfoBanner>}
            {!data.diagnostic && (
              <InfoBanner tone="muted">
                Diagnostika o‘tkazilmadi — A1 bosqichidan boshlaysiz. Testni Progress bo‘limidan keyin ham topshirishingiz
                mumkin.
              </InfoBanner>
            )}
            <div className="flex gap-2 justify-center">
              <Button size="lg" onClick={() => nav('/dashboard')}>
                Dashboardga o‘tish
              </Button>
              <Button size="lg" variant="secondary" onClick={() => nav('/path')}>
                Darsni boshlash
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function Basics({
  level,
  setLevel,
  target,
  setTarget,
  onNext,
}: {
  level: CefrLevel
  setLevel: (l: CefrLevel) => void
  target: CefrLevel
  setTarget: (l: CefrLevel) => void
  onNext: () => void
}) {
  const loaded = new Set(LOADED_LEVELS)
  return (
    <Card className="grid gap-4">
      <Field label="Hozirgi darajangiz" hint="Ishonchsiz bo‘lsangiz A1 ni tanlang — dastur diagnostika bilan tekshiradi.">
        <div className="flex flex-wrap gap-2">
          {CEFR_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => setLevel(l)}
              disabled={!loaded.has(l)}
              title={loaded.has(l) ? undefined : `${l} kontenti hali yuklanmagan — A1 dan boshlang`}
              className={`px-4 py-2 rounded-xl border font-bold ${level === l ? 'border-[var(--accent)] bg-navy-50 dark:bg-navy-900/40' : 'hover:bg-[var(--panel-2)]'} ${!loaded.has(l) ? 'opacity-50' : ''}`}
            >
              {l}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Qaysi darajaga yetmoqchisiz?">
        <div className="flex flex-wrap gap-2">
          {CEFR_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={target === l}
              onClick={() => setTarget(l)}
              className={`px-4 py-2 rounded-xl border font-bold ${target === l ? 'border-[var(--accent)] bg-navy-50 dark:bg-navy-900/40' : 'hover:bg-[var(--panel-2)]'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Asosiy ko‘nikmalar">
        <div className="flex flex-wrap gap-1.5">
          {['Reading', 'Listening', 'Writing', 'Speaking'].map((s) => (
            <Chip key={s} tone="brand">{s}</Chip>
          ))}
        </div>
      </Field>
      <InfoBanner tone="muted">Interfeys tili: o‘zbekcha · O‘rganiladigan til: inglizcha · Platformalar: kompyuter va telefon.</InfoBanner>
      <Button size="lg" onClick={onNext}>Davom etish</Button>
    </Card>
  )
}

function Schedule({
  minutes,
  setMinutes,
  examDate,
  setExamDate,
  onNext,
  onBack,
}: {
  minutes: number
  setMinutes: (n: number) => void
  examDate: string
  setExamDate: (s: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const split = { voc: 10, gr: 15, rd: 15, ls: 15, wr: 20, sp: 15 }
  const factors = [
    ['Vocabulary', split.voc],
    ['Grammar', split.gr],
    ['Reading', split.rd],
    ['Listening', split.ls],
    ['Writing', split.wr],
    ['Speaking', split.sp],
  ] as const
  return (
    <Card className="grid gap-4">
      <Field label="Kunlik o‘qish vaqti (daqiqa)" hint={`Boshlang‘ich: 90 daqiqa. ${minutes} daqiqaga taqsimlanadi.`}>
        <div className="flex items-center gap-3">
          <input type="range" min={15} max={180} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" />
          <span className="font-bold tabular-nums w-16 text-right">{minutes}′</span>
        </div>
      </Field>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {factors.map(([name, m]) => (
          <div key={name} className="rounded-xl border p-2.5 text-center">
            <div className="text-[11px] muted font-semibold">{name}</div>
            <div className="font-bold tabular-nums">{Math.round((m / 90) * minutes)}′</div>
          </div>
        ))}
      </div>
      <Field label="Imtihon sanangiz (agar ma'lum bo'lsa)" hint="Milliy CEFR / Multilevel imtihoniga tayyorgarlik rejasi shu sanaga moslashadi.">
        <input type="date" className={inputCls} value={examDate} onChange={(e) => setExamDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
      </Field>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>Orqaga</Button>
        <Button className="flex-1" size="lg" onClick={onNext}>Davom etish</Button>
      </div>
    </Card>
  )
}

export function DiagnosticStep({ onDone, onSkip }: { onDone: (r: ReturnType<typeof diagnose>) => void; onSkip: () => void }) {
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [done, setDone] = useState(false)
  const ex = diagnosticTest.exercises[idx]
  const total = diagnosticTest.exercises.length

  const verdict = useMemo(() => (done ? diagnose(results) : null), [done, results])

  if (!ex) return null

  return (
    <Card className="grid gap-4">
      {!done ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Diagnostika — {total} savol</h2>
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Hozir o‘tkazmayman
            </Button>
          </div>
          <ExerciseRunner
            exercise={ex}
            index={idx}
            total={total}
            checked={(r) => setResults((prev) => ({ ...prev, [ex.id]: r.correct }))}
            onNext={() => {
              if (idx + 1 < total) setIdx(idx + 1)
              else setDone(true)
            }}
          />
        </>
      ) : (
        <div className="grid gap-3 text-center">
          <h2 className="font-bold text-lg">Diagnostika yakunlandi</h2>
          <p className="text-sm">{verdict?.labelUz}</p>
          <p className="text-[11px] muted">Ishonchlilik: {Math.round((verdict?.confidence ?? 0) * 100)}%</p>
          <div className="flex gap-2 justify-center">
            {verdict && verdict.level && <Chip tone="ok">Tavsiya: {verdict.level} daraja</Chip>}
            <Button onClick={() => onDone(verdict!)}>Davom etish</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
