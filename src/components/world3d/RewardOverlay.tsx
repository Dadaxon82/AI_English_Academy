/** Mukofot oynalari: stansiya yakuni (yulduz, XP, tanga) va kun g'alabasi (kubok + konfetti). */
import { useMemo } from 'react'
import { Button } from '../ui'
import { skillLabelUz } from '../../lib/planning'
import { COINS_PER_DAY, type StationReward } from '../../lib/world3d'

const CARD = 'relative w-full max-w-sm rounded-3xl border border-white/40 bg-white/85 p-6 text-center text-slate-900 shadow-2xl backdrop-blur-xl dark:bg-slate-900/85 dark:text-slate-50 animate-[var(--animate-pop)]'
const WRAP = 'absolute inset-0 z-20 grid place-items-center bg-slate-900/45 p-4 backdrop-blur-[2px]'

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: ((i * 53) % 30) / 10,
        dur: 2.6 + ((i * 17) % 20) / 10,
        color: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#facc15'][i % 6]!,
        rot: (i * 47) % 360,
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="world-confetti absolute -top-4 h-3 w-2 rounded-sm"
          style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }}
        />
      ))}
    </div>
  )
}

export function StationRewardCard({ reward, onClose }: { reward: StationReward; onClose: () => void }) {
  return (
    <div className={WRAP} role="dialog" aria-modal="true" aria-label="Stansiya mukofoti">
      <div className={CARD}>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Stansiya yakunlandi</p>
        <h3 className="mt-1 text-xl font-black">{skillLabelUz(reward.skill)}</h3>
        <p className="mt-3 text-5xl" aria-label={`${reward.stars} yulduz`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`inline-block ${n <= reward.stars ? 'animate-[var(--animate-pop)]' : 'opacity-25 grayscale'}`} style={{ animationDelay: `${n * 0.18}s` }}>
              ⭐
            </span>
          ))}
        </p>
        <p className="mt-2 text-sm">
          Natija: <b>{reward.score}%</b>
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-extrabold">
          {reward.xp > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">⚡ +{reward.xp} XP</span>}
          {reward.coins > 0 && <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-900">🪙 +{reward.coins}</span>}
        </div>
        <Button className="mt-5 w-full" onClick={onClose} autoFocus>
          Davom etiş
        </Button>
      </div>
    </div>
  )
}

export function VictoryCard({ dayTitle, nextTitle, score, onClose }: { dayTitle: string; nextTitle: string | null; score: number | null; onClose: () => void }) {
  return (
    <div className={WRAP} role="dialog" aria-modal="true" aria-label="Ğalaba">
      <Confetti />
      <div className={CARD}>
        <p className="text-6xl animate-[var(--animate-pop)]" aria-hidden>
          🏆
        </p>
        <h3 className="mt-2 text-2xl font-black">Ğalaba!</h3>
        <p className="mt-1 text-sm">
          «{dayTitle}» kuni yakunlandi{score !== null ? ` — yakuniy sinov: ${score} ball` : ''}.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-extrabold">
          <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-900">🪙 +{COINS_PER_DAY}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">🏆 Kubok</span>
        </div>
        <p className="mt-3 text-sm muted">{nextTitle ? `Keyingi olam oçildi: «${nextTitle}».` : 'Bu darajadagi barça kunlar yakunlandi.'}</p>
        <Button className="mt-5 w-full" onClick={onClose} autoFocus>
          {nextTitle ? 'Keyingi olamga ötiş' : 'Yopiş'}
        </Button>
      </div>
    </div>
  )
}
