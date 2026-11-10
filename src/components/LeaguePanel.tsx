/**
 * O'ng panel — Duolingo "Learn" sahifasidagi o'ng ustun ko'rinishi: Liga
 * kartasi, Bugungi questlar, Streak/Gem/Qalqon qisqa holati va mobil ilova
 * taklifi. Dashboard'ning markaziy ustuni yonida chiziladi (`LearnShell.tsx`).
 *
 * Sonlar manbasi — `src/lib/game.ts` (`leagueWeek`, `questView`, `heartsView`,
 * `goalView`) va `src/lib/gameConfig.ts` (`LEAGUES`). Hech bir son bu yerda
 * ixtiro qilinmaydi — store'dagi mavjud selektorlardan o'qiladi.
 */

import { Link } from 'react-router-dom'
import { GameIcon } from './icons'
import { Card, Chip } from './ui'
import { leagueById } from '../lib/gameConfig'
import { useStore } from '../lib/storeContext'

export default function LeaguePanel() {
  const { data, streak, hearts, goal, quests, league } = useStore()
  const cur = leagueById(league.leagueId)
  const nextIdx = cur.promoteTop > 0 ? 1 : 0
  const next = nextIdx ? leagueById(cur.id) : null
  void next

  return (
    <div className="grid gap-4">
      {/* ---------- Liga ---------- */}
      <Card className="grid gap-2.5">
        <div className="flex items-center gap-2">
          <GameIcon name="shield" size={18} className="text-[var(--league)]" />
          <h2 className="font-bold text-sm">{cur.titleUz} ligasi</h2>
        </div>
        <p className="text-xs muted">
          Bu hafta <b className="text-[var(--text)] tabular-nums">{league.xp} XP</b> töpladingiz.
          {cur.promoteTop > 0
            ? ` Top ${cur.promoteTop} içida qolsangiz keyingi ligaga kötarilasiz.`
            : ' Eng yuqori liga — kötariliş yöq.'}
        </p>
        <Link
          to="/progress"
          className="text-xs font-semibold text-navy-700 dark:text-navy-300 hover:underline"
        >
          Progressni köriş →
        </Link>
      </Card>

      {/* ---------- Bugungi questlar (qisqa) ---------- */}
      <Card className="grid gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-sm">Bugungi questlar</h2>
          <Chip tone={quests.every((q) => q.done) ? 'ok' : 'default'}>
            {quests.filter((q) => q.done).length}/{quests.length}
          </Chip>
        </div>
        <div className="grid gap-2">
          {quests.map((q) => (
            <div key={q.quest.id} className="grid gap-1">
              <div className="flex items-center gap-2">
                <GameIcon
                  name={q.done ? 'check' : 'bolt'}
                  size={14}
                  className={q.done ? 'text-[var(--ok)]' : 'text-[var(--accent)]'}
                />
                <span className="text-xs font-semibold flex-1 truncate">{q.quest.titleUz}</span>
                <span className="text-[11px] tabular-nums muted">
                  {q.value}/{q.target}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full bg-navy-600 dark:bg-navy-400 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, Math.round((q.value / Math.max(1, q.target)) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ---------- Qisqa holat: streak / yurak / gem / qalqon ---------- */}
      <Card className="grid grid-cols-2 gap-3 text-center">
        <div className="grid gap-0.5">
          <GameIcon name="flame" size={20} className="mx-auto text-[var(--warn)]" />
          <span className="font-bold tabular-nums">{streak}</span>
          <span className="text-[10px] muted">kun ketma-ket</span>
        </div>
        <div className="grid gap-0.5">
          <GameIcon name="heart" size={20} className="mx-auto text-[var(--heart)]" filled={hearts.enabled} />
          <span className="font-bold tabular-nums">{hearts.enabled ? `${hearts.count}/${hearts.max}` : '∞'}</span>
          <span className="text-[10px] muted">yurak</span>
        </div>
        <div className="grid gap-0.5">
          <GameIcon name="gem" size={20} className="mx-auto text-[var(--gem)]" />
          <span className="font-bold tabular-nums">{data.game.gems}</span>
          <span className="text-[10px] muted">gem</span>
        </div>
        <div className="grid gap-0.5">
          <GameIcon name="shield" size={20} className="mx-auto text-[var(--league)]" />
          <span className="font-bold tabular-nums">{data.game.freezes}</span>
          <span className="text-[10px] muted">qalqon</span>
        </div>
      </Card>

      {/* ---------- Kunlik XP maqsadi ---------- */}
      <Card className="grid gap-2">
        <div className="flex items-center gap-2">
          <GameIcon name="star" size={16} className="text-[var(--star)]" />
          <h2 className="font-bold text-sm">Kunlik maqsad</h2>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full bg-navy-600 dark:bg-navy-400 transition-[width] duration-500"
            style={{ width: `${Math.round(goal.ratio * 100)}%` }}
          />
        </div>
        <p className="text-xs muted tabular-nums">
          {goal.value}/{goal.target} XP{goal.reached ? ' · bajarildi 🎉' : ` · yana ${goal.left} XP`}
        </p>
      </Card>
    </div>
  )
}
