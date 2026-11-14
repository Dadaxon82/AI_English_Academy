/**
 * 3D OLAM oynasi: sahna (alohida yuklanadigan chunk) + HUD, joystik, NPC suhbati,
 * mukofot oynalari va stansiyalar ro'yxati (klaviatura / ekran o'quvchisi uchun
 * sahnaning to'liq muqobili — yurmasdan ham har stansiyani ochish mumkin).
 */
import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, InfoBanner } from '../ui'
import { skillLabelUz } from '../../lib/planning'
import { useStore } from '../../lib/storeContext'
import { coinBalance, frontOf, rememberVisit, rewardFor, takeVisit, webglSupported, type Station, type World } from '../../lib/world3d'
import Joystick from './Joystick'
import NPCDialogModal, { type DialogTarget } from './NPCDialogModal'
import RewardHUD from './RewardHUD'
import { StationRewardCard, VictoryCard } from './RewardOverlay'
import type { NearId } from './World3D'
import { createControls, loadPos, savePos } from './controls'

const World3D = lazy(() => import('./World3D'))

/** Sahna yuklanmasa (masalan oflayn va chunk keshda yo'q) — sababi ko'rsatiladi, sahifa buzilmaydi. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <div className="grid h-full place-items-center p-6 text-center text-sm text-slate-900">
          3D sahnani yuklab bölmadi (internet yoki grafika drayveri). Pastdagi röyxatdan stansiyani oçing yoki 2D xaritaga öting.
        </div>
      )
    return this.props.children
  }
}

export interface VictoryInfo {
  dayTitle: string
  nextTitle: string | null
  score: number | null
}

export default function WorldView({
  world,
  victory,
  onVictoryClose,
  onStartStation,
  onStartFinish,
}: {
  world: World
  victory: VictoryInfo | null
  onVictoryClose: () => void
  onStartStation: (s: Station) => void
  onStartFinish: () => void
}) {
  const { data } = useStore()
  const [ctrl] = useState(() => createControls(loadPos(world.dayId) ?? world.spawn))
  const [near, setNear] = useState<NearId>(null)
  const [dialog, setDialog] = useState<DialogTarget | null>(null)
  const [reward, setReward] = useState(() => rewardFor(takeVisit(), world, data))
  // To'liq ekran — brauzerning Fullscreen API'si (qo'llamasa tugma ko'rsatilmaydi)
  const box = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  const [canFull] = useState(() => typeof document !== 'undefined' && document.fullscreenEnabled === true)
  useEffect(() => {
    const h = () => setFull(document.fullscreenElement === box.current && box.current !== null)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void box.current?.requestFullscreen().catch(() => {})
  }
  const [webgl] = useState(webglSupported)
  const [touch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)

  const targetOf = (id: NearId): DialogTarget | null => {
    if (id === 'finish') return world.finish ? { kind: 'finish', finish: world.finish } : null
    const st = world.stations.find((s) => s.skill === id)
    return st ? { kind: 'station', station: st } : null
  }
  const nearTarget = targetOf(near)
  const busy = dialog !== null || reward !== null || victory !== null

  // Oyna ochiq paytda qahramon to'xtaydi
  useEffect(() => {
    ctrl.setPaused(busy)
  }, [ctrl, busy])

  // E / Enter — yonidagi NPC bilan suhbat
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName)) return
      if ((e.code === 'KeyE' || e.code === 'Enter') && !busy && nearTarget) {
        e.preventDefault()
        setDialog(nearTarget)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  // Sahifadan chiqilganda qahramon o'rni saqlanadi (darsdan qaytganda shu yerda turadi)
  useEffect(() => () => savePos(world.dayId, ctrl.pos), [ctrl, world.dayId])

  const start = (t: DialogTarget) => {
    setDialog(null)
    savePos(world.dayId, ctrl.pos)
    if (document.fullscreenElement) void document.exitFullscreen()
    if (t.kind === 'finish') {
      onStartFinish()
      return
    }
    rememberVisit({ dayId: world.dayId, skill: t.station.skill, xp: data.xp, coins: coinBalance(data), hadScore: t.station.score !== null })
    onStartStation(t.station)
  }

  const next = world.stations.find((s) => s.state === 'open')
  const hint = next
    ? `Keyingi maqsad: ${next.index + 1}-stansiya — ${skillLabelUz(next.skill)}`
    : world.finish?.state === 'open'
      ? 'Barça stansiyalar yakunlandi — oltin Finiş qasriga boring'
      : world.finish?.state === 'done'
        ? 'Bu olam yakunlangan'
        : ''

  return (
    <div className="grid gap-3 min-w-0">
      <div ref={box} className={`relative isolate overflow-hidden bg-sky-200 ${full ? 'h-screen w-screen' : 'h-[62vh] min-h-[440px] max-h-[720px] rounded-2xl border'}`}>
        {webgl ? (
          <SceneBoundary>
            <Suspense fallback={<div className="grid h-full place-items-center text-sm font-semibold text-slate-900">3D olam yuklanmoqda…</div>}>
              <World3D world={world} ctrl={ctrl} onNear={setNear} />
            </Suspense>
          </SceneBoundary>
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-slate-900">
            Bu qurilma yoki brauzer 3D grafikani (WebGL) qöllamaydi. Pastdagi röyxatdan stansiyani oçing yoki 2D xaritaga öting.
          </div>
        )}

        <RewardHUD world={world} />

        {canFull && (
          <div className="absolute right-2 top-12 z-10 sm:right-3 sm:top-3">
            <button
              type="button"
              onClick={toggleFull}
              className="rounded-full border border-white/40 bg-white/25 px-2.5 py-1 text-[11px] font-extrabold text-slate-900 shadow-sm backdrop-blur-md hover:bg-white/50"
            >
              {full ? '✕ Kiçraytiriş' : '⛶ Töliq ekran'}
            </button>
          </div>
        )}

        {webgl && touch && !busy && <Joystick ctrl={ctrl} />}

        {!busy && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 grid justify-items-center gap-2 px-3">
            {nearTarget ? (
              <Button className="pointer-events-auto shadow-xl" onClick={() => setDialog(nearTarget)}>
                💬 {nearTarget.kind === 'station' ? nearTarget.station.npc.name : nearTarget.finish.npc.name} bilan gaplaşiş
                {!touch && <kbd className="rounded border border-white/40 px-1 text-[10px]">E</kbd>}
              </Button>
            ) : (
              hint && <span className="rounded-full border border-white/40 bg-slate-900/60 px-3 py-1 text-center text-[11px] font-bold text-white backdrop-blur">{hint}</span>
            )}
            {webgl && !touch && <span className="hidden text-[11px] font-semibold text-slate-900/80 sm:block">Yuriş: W A S D yoki strelkalar · yerni yoki stansiyani bosing</span>}
          </div>
        )}

        <NPCDialogModal target={dialog} world={world} onStart={start} onClose={() => setDialog(null)} />
        {reward && <StationRewardCard reward={reward} onClose={() => setReward(null)} />}
        {!reward && victory && <VictoryCard {...victory} onClose={onVictoryClose} />}
      </div>

      {/* Stansiyalar ro'yxati — sahnaning klaviatura/ekran o'quvchisi uchun muqobili */}
      <ol className="flex flex-wrap gap-2" aria-label="Stansiyalar">
        {world.stations.map((s) => (
          <li key={s.skill}>
            <button
              type="button"
              onClick={() => {
                if (webgl && !busy) ctrl.walkTo(frontOf(s.pos))
                setDialog({ kind: 'station', station: s })
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${s.state === 'locked' ? 'muted' : s.state === 'done' ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700' : 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700'}`}
            >
              {s.state === 'locked' ? '🔒' : s.state === 'done' ? '✅' : '▶'} {s.index + 1}. {skillLabelUz(s.skill)}
              {s.stars > 0 && <span aria-label={`${s.stars} yulduz`}> {'⭐'.repeat(s.stars)}</span>}
            </button>
          </li>
        ))}
        {world.finish && (
          <li>
            <button
              type="button"
              onClick={() => {
                if (webgl && !busy) ctrl.walkTo(frontOf(world.finish!.pos, true))
                setDialog({ kind: 'finish', finish: world.finish! })
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${world.finish.state === 'locked' ? 'muted' : 'bg-amber-200 text-amber-950 border-amber-400 dark:bg-amber-800/50 dark:text-amber-50 dark:border-amber-600'}`}
            >
              {world.finish.state === 'locked' ? '🔒' : '🏆'} Finiş
            </button>
          </li>
        )}
      </ol>
      {!webgl && <InfoBanner tone="warn">3D grafika işlamadi — stansiyalarni yuqoridagi röyxatdan oçiş mumkin.</InfoBanner>}

    </div>
  )
}
