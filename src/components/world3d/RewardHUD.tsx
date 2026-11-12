/**
 * Yuqori HUD (shisha uslubida): yulduz, XP, yurak, gem, qalqon, kumush tanga.
 * Barcha sonlar store'dan — profil bilan bir xil manba. Tanga bosilsa — tanga do'koni.
 */
import { useState } from 'react'
import { Button } from '../ui'
import Panel from './Panel'
import { useStore } from '../../lib/storeContext'
import { COIN_SHOP, coinBalance, type CoinItemId, type World } from '../../lib/world3d'

const PILL = 'inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/25 px-2 py-1 text-[11px] sm:text-xs font-extrabold text-slate-900 shadow-sm backdrop-blur-md tabular-nums'

export default function RewardHUD({ world }: { world: World }) {
  const { data, hearts, actions } = useStore()
  const [shop, setShop] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const coins = coinBalance(data)
  const stars = world.stations.reduce((a, s) => a + s.stars, 0)
  const maxStars = world.stations.length * 3

  const buy = (id: CoinItemId, title: string) => {
    const r = actions.coinBuy(id)
    setMsg(r.ok ? { ok: true, text: `Sotib olindi: ${title}.` } : { ok: false, text: r.reasonUz ?? 'Xarid amalga oşmadi.' })
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-1.5 p-2 sm:p-3" role="group" aria-label="Öyin körsatkiçlari">
        <span className={PILL} title="Bu kundagi yulduzlar">
          ⭐ {stars}/{maxStars}
        </span>
        <span className={PILL} title="Jami XP">
          ⚡ {data.xp} XP
        </span>
        {hearts.enabled && (
          <span className={PILL} title="Yuraklar">
            ❤️ {hearts.count}/{hearts.max}
          </span>
        )}
        <span className={PILL} title="Gemlar">
          💎 {data.game.gems}
        </span>
        <span className={PILL} title="Streak qalqonlari">
          🛡️ {data.game.freezes}
        </span>
        <button type="button" className={`${PILL} pointer-events-auto hover:bg-white/50 focus-visible:outline-2 focus-visible:outline-offset-2`} onClick={() => setShop(true)} aria-label={`Kumuş tangalar: ${coins}. Döqonni oçiş`}>
          🪙 {coins} <span className="font-semibold">· döqon</span>
        </button>
      </div>

      {shop && (
      <Panel
        title="Tanga döqoni"
        onClose={() => {
          setShop(false)
          setMsg(null)
        }}
      >
        <div className="grid gap-3">
          <p className="text-sm muted">
            Sizda <b>🪙 {coins}</b> kumuş tanga. Har yulduz — 10 tanga, har yakunlangan kun — 100 tanga.
          </p>
          <ul className="grid gap-2">
            {COIN_SHOP.map((it) => (
              <li key={it.id} className="flex items-center gap-3 rounded-xl border p-3">
                <span className="text-2xl" aria-hidden>
                  {it.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{it.titleUz}</span>
                  <span className="block text-xs muted">{it.noteUz}</span>
                </span>
                <Button size="sm" variant="secondary" disabled={coins < it.price} onClick={() => buy(it.id, it.titleUz)}>
                  🪙 {it.price}
                </Button>
              </li>
            ))}
          </ul>
          {msg && (
            <p className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--bad)]'}`} role="status">
              {msg.text}
            </p>
          )}
        </div>
      </Panel>
      )}
    </>
  )
}
