/**
 * VIDEO SHORTLAR (g'oya: Memrise «Learn with Locals»; kontent va qoidalar bizniki).
 *
 * Har suhbat — bitta playlist: uning har replikasi qisqa klip. Har klipdan
 * keyin savol (eşitiş yoki ma'no), subtitr javobdan keyin ochiladi. Javoblar
 * odatdagi mashq kabi yoziladi (XP, Xatolar daftari, Takrorlaş menejeri).
 *
 * Halollik: hozircha kliplar animatsion, ovoz — qurilmaning nutq sintezi; bu
 * har pleyer ostida yoziladi. Haqiqiy video qo'shilsa (`public/video/`) —
 * o'sha short avtomatik video bilan ko'rsatiladi.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LessonPlayer from '../components/LessonPlayer'
import ShortPlayer from '../components/ShortPlayer'
import { sceneOf } from '../components/shortScene'
import { Button, Card, Chip, InfoBanner, LoadingBlock } from '../components/ui'
import { dialoguesFor } from '../content/dialogues'
import { shortExercisesOf, shortsOf } from '../content/shorts'
import type { CefrLevel, Dialogue } from '../content/types'
import { shortsProgress, type LessonStep } from '../lib/lessons'
import { useStore } from '../lib/storeContext'
import { trackUsage } from '../lib/usage'

const LEVELS: CefrLevel[] = ['A1', 'A2']

export default function Shorts() {
  const { data, ready } = useStore()
  const [level, setLevel] = useState<CefrLevel>(() => (LEVELS.includes(data.settings.currentLevel) ? data.settings.currentLevel : 'A1'))
  const [active, setActive] = useState<Dialogue | null>(null)
  const list = useMemo(() => dialoguesFor(level), [level])
  const preview = useMemo(() => shortsOf(list[0]!)[0], [list])
  const steps: LessonStep[] = useMemo(
    () => (active ? shortExercisesOf(active).map((ex) => ({ type: 'exercise' as const, id: ex.id, exercise: ex })) : []),
    [active],
  )

  if (!ready) return <LoadingBlock label="Shortlar yuklanmoqda…" />

  if (active) {
    return (
      <Card className="p-4 sm:p-6">
        <LessonPlayer steps={steps} onClose={() => setActive(null)} onFinish={() => trackUsage('shorts', 'finished')} />
      </Card>
    )
  }

  return (
    <div className="grid content-start gap-4">
      <Card className="grid gap-4 sm:grid-cols-[1fr_auto] items-start">
        <div className="grid gap-2">
          <h1 className="text-xl sm:text-2xl font-extrabold">Video shortlar</h1>
          <p className="text-sm muted">
            Real hayot suhbatlaridan qisqa kliplar: kim, qayerda, nima deydi. Avval tomoşa qiling, keyin savolga javob bering —
            subtitr javobdan keyin oçiladi. «🐢 Sekin» tugmasi bilan sekinroq eşitiş mumkin.
          </p>
          <InfoBanner tone="muted">
            Hozircha kliplar <b>animatsion</b>, ovoz — qurilmangizning ingliz nutq sintezi (ona tilida sözlaşuvçi yozuvi emas). Haqiqiy
            video qöşilganda öşa short avtomatik video bilan körsatiladi.
          </InfoBanner>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Daraja">
            {LEVELS.map((l) => (
              <Button key={l} size="sm" variant={l === level ? 'primary' : 'secondary'} aria-pressed={l === level} onClick={() => setLevel(l)}>
                {l}
              </Button>
            ))}
          </div>
          <p className="text-sm">
            Matn bilan işlaşni xohlaysizmi?{' '}
            <Link to="/dialogues" className="font-semibold underline">
              Real hayot suhbatlari →
            </Link>
          </p>
        </div>
        {preview && (
          <div className="justify-self-center">
            <ShortPlayer key={preview.id} short={preview} revealed />
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {list.map((d) => {
          const p = shortsProgress(d, data.attempts)
          const scene = sceneOf(d.id)
          const done = p.total > 0 && p.correct === p.total
          return (
            <Card key={d.id} as="article" className="grid gap-2 content-between">
              <div className="flex gap-3">
                <span aria-hidden className={`grid h-14 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b ${scene.bg} text-2xl`}>
                  {scene.emoji}
                </span>
                <div className="grid gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip>{p.total} ta short</Chip>
                    <Chip tone={done ? 'ok' : p.tried > 0 ? 'warn' : 'default'}>
                      {p.tried === 0 ? 'Hali körilmagan' : `${p.correct}/${p.total} töğri`}
                    </Chip>
                  </div>
                  <h2 className="font-bold">{d.titleUz}</h2>
                  <p className="text-sm muted">{d.situationUz}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    trackUsage('shorts', 'started')
                    setActive(d)
                  }}
                  aria-label={`${d.titleUz}: shortlarni ${p.tried === 0 ? 'köriş' : 'qayta köriş'}`}
                >
                  {p.tried === 0 ? '▶ Köriş' : '▶ Qayta köriş'}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <p className="text-xs muted">
        Xato javoblar <Link to="/errors" className="underline font-semibold">Xatolar daftari → Takrorlaş menejeri</Link>ga tuşadi.
      </p>
    </div>
  )
}
