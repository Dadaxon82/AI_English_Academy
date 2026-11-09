/**
 * REAL HAYOT SUHBATLARI (g'oya: Babbel; matnlar va dizayn bizniki).
 *
 * Har darajaning har kuniga bitta stsenariy (kafe, vokzal, shifokor …).
 * Dars `LessonPlayer` orqali: suhbatni o'qish → bo'shliqlarni to'ldirish →
 * «Nega shunday?» izohi. Har javob `recordAttempt` bilan yoziladi — XP,
 * yuraklar va Xatolar daftari (Takrorlash menejeri) o'zi ishlaydi.
 *
 * Holat (nechta bo'shliq to'g'ri) ALOHIDA saqlanmaydi — urinishlar tarixidan
 * hisoblanadi: har bo'shliqning ENG OXIRGI urinishi to'g'rimi.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LessonPlayer from '../components/LessonPlayer'
import { MascotFigure } from '../components/Mascot'
import { Button, Card, Chip, LoadingBlock, SpeakButton } from '../components/ui'
import { dialoguesFor, filledLine } from '../content/dialogues'
import type { CefrLevel, Dialogue } from '../content/types'
import { dialogueLesson, dialogueProgress } from '../lib/lessons'
import { useStore } from '../lib/storeContext'

const LEVELS: CefrLevel[] = ['A1', 'A2']

/** Suhbat matni: bo'shliqlar `___` (yoki to'ldirilgan), tarjima ixtiyoriy. */
function DialogueView({ d, filled }: { d: Dialogue; filled: boolean }) {
  const [showUz, setShowUz] = useState(false)
  return (
    <div className="grid gap-2">
      <div className="flex justify-end">
        <button type="button" className="text-xs font-semibold underline" onClick={() => setShowUz((v) => !v)} aria-pressed={showUz}>
          {showUz ? 'Tarjimani yashirish' : 'O‘zbekcha tarjimani ko‘rsatish'}
        </button>
      </div>
      <ol className="grid gap-2">
        {d.lines.map((l, i) => {
          const learner = l.speaker === 'b'
          const text = filled ? filledLine(l) : l.en
          return (
            <li key={i} className={`flex ${learner ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] rounded-2xl border-2 px-3 py-2 grid gap-1 ${
                  learner ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-[var(--panel-2)]'
                }`}
              >
                <span className="text-[11px] font-extrabold uppercase tracking-wider muted">{d.roles[l.speaker]}</span>
                <span className="flex items-start gap-2">
                  <span className="text-sm leading-relaxed">{text}</span>
                  {(filled || !l.gap) && <SpeakButton text={filledLine(l)} label="Tinglash" />}
                </span>
                {showUz && <span className="text-xs muted">{l.uz}</span>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function NoteView({ d }: { d: Dialogue }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 p-3.5 grid gap-1.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300">Qoida</p>
        <ul className="grid gap-1 text-sm list-disc pl-5">
          {d.note.pointsUz.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
      <ul className="grid gap-2">
        {d.note.examples.map((e, i) => (
          <li key={i} className="flex items-start gap-2 rounded-2xl border-2 px-3 py-2">
            <SpeakButton text={e.en} label="Tinglash" />
            <span className="min-w-0 grid">
              <span className="text-sm font-semibold">{e.en}</span>
              <span className="text-xs muted">{e.uz}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm font-bold">To‘liq suhbat</p>
      <DialogueView d={d} filled />
    </div>
  )
}

export default function Dialogues() {
  const { data, ready } = useStore()
  const [level, setLevel] = useState<CefrLevel>(() => (LEVELS.includes(data.settings.currentLevel) ? data.settings.currentLevel : 'A1'))
  const [active, setActive] = useState<Dialogue | null>(null)
  const list = useMemo(() => dialoguesFor(level), [level])
  const steps = useMemo(() => (active ? dialogueLesson(active) : []), [active])

  if (!ready) return <LoadingBlock label="Suhbatlar yuklanmoqda…" />

  if (active) {
    return (
      <Card className="p-4 sm:p-6">
        <LessonPlayer
          steps={steps}
          onClose={() => setActive(null)}
          renderInfo={(step) =>
            step.info === 'rule' ? (
              <NoteView d={active} />
            ) : (
              <>
                <p className="text-sm leading-relaxed">{active.situationUz}</p>
                <p className="text-xs muted">
                  Siz — <b>{active.roles.b}</b>. Suhbatni o‘qing: keyingi qadamlarda bo‘sh joylarni to‘ldirasiz.
                </p>
                <DialogueView d={active} filled={false} />
              </>
            )
          }
          renderContext={() => <DialogueView d={active} filled={false} />}
        />
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <div className="grid sm:grid-cols-[1fr_auto] items-center gap-3">
          <div className="grid gap-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold">Real hayot suhbatlari</h1>
            <p className="text-sm muted">
              Kafe, vokzal, shifokor, ish suhbati — kundalik vaziyatlarda kerak bo‘ladigan iboralar. Har suhbat kun mavzusiga mos;
              oxirida «Nega shunday?» izohi bor. Xato qilingan bo‘shliqlar Xatolar daftaridagi Takrorlash menejeriga tushadi.
            </p>
          </div>
          <MascotFigure maxHeight="max-h-24" alt="" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Daraja">
          {LEVELS.map((l) => (
            <Button key={l} size="sm" variant={l === level ? 'primary' : 'secondary'} aria-pressed={l === level} onClick={() => setLevel(l)}>
              {l}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {list.map((d) => {
          const p = dialogueProgress(d, data.attempts)
          const done = p.correct === p.total
          return (
            <Card key={d.id} as="article" className="grid gap-2 content-between">
              <div className="grid gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip>{d.dayNumber}-kun</Chip>
                  <Chip tone={done ? 'ok' : p.tried > 0 ? 'warn' : 'default'}>
                    {p.tried === 0 ? 'Hali boshlanmagan' : `${p.correct}/${p.total} to‘g‘ri`}
                  </Chip>
                </div>
                <h2 className="font-bold">{d.titleUz}</h2>
                <p className="text-sm muted">{d.situationUz}</p>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setActive(d)}>
                  {p.tried === 0 ? 'Boshlash' : 'Qayta o‘tish'}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <p className="text-xs muted">
        Xatolaringizni bir joyda takrorlash: <Link to="/errors" className="underline font-semibold">Xatolar daftari → Takrorlash menejeri</Link>
      </p>
    </div>
  )
}
