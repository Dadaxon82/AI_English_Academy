/**
 * ADMIN PANEL — platforma statistikasi va foydalanuvchilarni boshqarish.
 *
 * Kirish: `AdminRoute` (faqat faol admin). Barcha ma'lumot serverdan
 * (`admin_stats`, `admin_list_users` RPC'lari) — soxta/namuna son yo'q:
 * server javob bermasa sabab ko'rsatiladi.
 */
import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Activity,
} from 'lucide-react'
import { Button, ErrorState, EmptyState, inputCls } from '../../components/ui'
import { useAuthActions } from '../../lib/authContext'
import {
  PAGE_SIZE,
  ROLES,
  STATUSES,
  growthPct,
  listUsers,
  loadAdminStats,
  pageCount,
  resetAdminCache,
  setUserRole,
  type AdminResult,
  type AdminRole,
  type AdminStats,
  type AdminUser,
  type UserQuery,
  type UserStatus,
} from '../../lib/admin'
import { ChartSkeleton, KpiSkeleton, TableSkeleton } from '../../components/admin/Skeleton'
import { ToastStack } from '../../components/admin/Toasts'
import { useToasts } from '../../components/admin/useToasts'
import { LevelsChart, SignupsChart } from '../../components/admin/AdminCharts'
import UserManagementModal from '../../components/admin/UserManagementModal'

export const SEARCH_DEBOUNCE_MS = 300

const ROLE_BADGE: Record<AdminRole, string> = {
  admin: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800',
  moderator: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800',
  user: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600',
}

function fmt(n: number): string {
  return n.toLocaleString('uz-UZ')
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function initials(name: string, email: string | null): string {
  const src = name.trim() || email || '?'
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/* ------------------------------ KPI ------------------------------ */

function Kpi({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint: React.ReactNode; accent: string }) {
  return (
    <div className="panel p-4 grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider muted">{label}</span>
        <span className={`grid place-items-center h-9 w-9 rounded-xl ${accent}`}>{icon}</span>
      </div>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs muted">{hint}</span>
    </div>
  )
}

function KpiRow({ s }: { s: AdminStats }) {
  const g = growthPct(s.new_this_week, s.new_prev_week)
  const trend =
    g === null ? (
      <span>Bu hafta +{fmt(s.new_this_week)} (o‘tgan hafta yangi yo‘q)</span>
    ) : (
      <span className={`inline-flex items-center gap-1 font-semibold ${g >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
        {g >= 0 ? <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" /> : <TrendingDown aria-hidden="true" className="h-3.5 w-3.5" />}
        {g >= 0 ? '+' : ''}
        {g}% o‘tgan haftaga nisbatan
        <span className="font-normal muted"> (+{fmt(s.new_this_week)})</span>
      </span>
    )
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        label="Jami foydalanuvchilar"
        value={fmt(s.total_users)}
        hint={trend}
        icon={<Users aria-hidden="true" className="h-5 w-5" />}
        accent="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
      />
      <Kpi
        label="Bugun faol (DAU)"
        value={fmt(s.dau)}
        hint={
          <span className="inline-flex items-center gap-1">
            <Flame aria-hidden="true" className="h-3.5 w-3.5 text-orange-700 dark:text-orange-300" /> O‘rtacha streak: {s.avg_streak} kun
          </span>
        }
        icon={<Activity aria-hidden="true" className="h-5 w-5" />}
        accent="bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
      />
      <Kpi
        label="To‘plangan jami XP"
        value={fmt(s.total_xp)}
        hint="Mashq urinishlaridan (liga hisobi)"
        icon={<Sparkles aria-hidden="true" className="h-5 w-5" />}
        accent="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
      />
      <Kpi
        label="Admin va moderatorlar"
        value={fmt(s.admins + s.moderators)}
        hint={`${fmt(s.admins)} admin · ${fmt(s.moderators)} moderator · ${fmt(s.blocked)} bloklangan`}
        icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
        accent="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
      />
    </div>
  )
}

/* ------------------------------ jadval ------------------------------ */

function Avatar({ u }: { u: AdminUser }) {
  if (u.avatar_url) {
    return <img src={u.avatar_url} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-9 w-9 rounded-full object-cover bg-slate-200" />
  }
  return (
    <span aria-hidden="true" className="grid place-items-center h-9 w-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-xs font-bold">
      {initials(u.full_name, u.email)}
    </span>
  )
}

function StatusBadge({ status }: { status: UserStatus }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{STATUSES.find((s) => s.id === status)?.labelUz}</span>
}

function RoleSelect({ u, busy, onChange }: { u: AdminUser; busy: boolean; onChange: (r: AdminRole) => void }) {
  return (
    <select
      aria-label={`${u.full_name || u.email || 'Foydalanuvchi'} roli`}
      value={u.role}
      disabled={busy}
      onChange={(e) => onChange(e.target.value as AdminRole)}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer disabled:opacity-60 ${ROLE_BADGE[u.role]}`}
    >
      {ROLES.map((r) => (
        <option key={r.id} value={r.id}>
          {r.labelUz}
        </option>
      ))}
    </select>
  )
}

/* ------------------------------ sahifa ------------------------------ */

type Loaded<T> = { key: string; result: AdminResult<T> }

export default function AdminDashboard() {
  const nav = useNavigate()
  const id = useId()
  const currentUserId = useAuthActions()?.userId ?? null
  const { items, push, dismiss } = useToasts()

  const [rev, setRev] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<AdminRole | null>(null)
  const [status, setStatus] = useState<UserStatus | null>(null)
  const [page, setPage] = useState(0)
  const [stats, setStats] = useState<Loaded<AdminStats> | null>(null)
  const [users, setUsers] = useState<Loaded<{ rows: AdminUser[]; total: number }> | null>(null)
  const [busyRow, setBusyRow] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminUser | null>(null)

  // Qidiruv kechiktiriladi (har harfda so'rov yuborilmaydi).
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(0)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  const statsKey = String(rev)
  useEffect(() => {
    let alive = true
    void loadAdminStats().then((result) => alive && setStats({ key: statsKey, result }))
    return () => {
      alive = false
    }
  }, [statsKey])

  const query: UserQuery = { search, role, status, page }
  const usersKey = JSON.stringify([query, rev])
  useEffect(() => {
    let alive = true
    const q = JSON.parse(usersKey)[0] as UserQuery
    void listUsers(q).then((result) => alive && setUsers({ key: usersKey, result }))
    return () => {
      alive = false
    }
  }, [usersKey])

  const statsLoading = stats?.key !== statsKey
  const usersLoading = users?.key !== usersKey
  const refresh = () => setRev((r) => r + 1)

  const changeRole = async (u: AdminUser, next: AdminRole) => {
    if (next === u.role) return
    const self = u.id === currentUserId
    if (self && next !== 'admin' && !window.confirm('O‘z admin rolingizni olib tashlaysizmi? Shundan keyin admin panelga kira olmaysiz.')) return
    setBusyRow(u.id)
    const r = await setUserRole(u.id, next)
    setBusyRow(null)
    if (!r.ok) {
      push('error', r.reasonUz)
      return
    }
    push('ok', `${u.full_name || u.email || 'Foydalanuvchi'} endi — ${ROLES.find((x) => x.id === next)?.labelUz}.`)
    if (self && next !== 'admin') {
      resetAdminCache()
      nav('/dashboard', { replace: true })
      return
    }
    refresh()
  }

  const setFilter = (fn: () => void) => {
    fn()
    setPage(0)
  }

  const usersData = users && !usersLoading && users.result.ok ? users.result.data : null
  const total = usersData?.total ?? 0
  const pages = pageCount(total)

  return (
    <div className="grid gap-5 min-w-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">AI English Academy</p>
          <h1 className="text-2xl font-bold">Admin panel</h1>
          <p className="text-sm muted">Platforma statistikasi va foydalanuvchilarni boshqarish.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh} busy={statsLoading || usersLoading}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" /> Yangilash
        </Button>
      </header>

      {/* ---------- statistika ---------- */}
      <section aria-labelledby={`${id}-stats`} className="grid gap-3 min-w-0">
        <h2 id={`${id}-stats`} className="sr-only">
          Platforma statistikasi
        </h2>
        {statsLoading || !stats ? (
          <>
            <KpiSkeleton />
            <ChartSkeleton />
          </>
        ) : !stats.result.ok ? (
          <ErrorState message={stats.result.reasonUz} retry={refresh} />
        ) : (
          <>
            <KpiRow s={stats.result.data} />
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="panel p-4 lg:col-span-2 min-w-0">
                <SignupsChart data={stats.result.data.signups_30d} />
              </div>
              <div className="panel p-4 min-w-0">
                <LevelsChart levels={stats.result.data.levels} />
              </div>
            </div>
          </>
        )}
      </section>

      {/* ---------- foydalanuvchilar ---------- */}
      <section aria-labelledby={`${id}-users`} className="panel p-4 grid gap-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={`${id}-users`} className="font-bold text-lg">
            Foydalanuvchilar
          </h2>
          {usersData && <span className="text-sm muted">{fmt(total)} ta</span>}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <span className="sr-only">Ism yoki email bo‘yicha qidirish</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 muted" />
            <input
              type="search"
              className={`${inputCls} pl-9`}
              placeholder="Ism yoki email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Rol bo‘yicha filtr</span>
            <select
              className={inputCls}
              value={role ?? ''}
              onChange={(e) => setFilter(() => setRole((e.target.value || null) as AdminRole | null))}
            >
              <option value="">Barcha rollar</option>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.labelUz}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Holat bo‘yicha filtr</span>
            <select
              className={inputCls}
              value={status ?? ''}
              onChange={(e) => setFilter(() => setStatus((e.target.value || null) as UserStatus | null))}
            >
              <option value="">Barcha holatlar</option>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labelUz}
                </option>
              ))}
            </select>
          </label>
        </div>

        {usersLoading || !users ? (
          <TableSkeleton rows={Math.min(PAGE_SIZE, 6)} />
        ) : !users.result.ok ? (
          <ErrorState message={users.result.reasonUz} retry={refresh} />
        ) : users.result.data.rows.length === 0 ? (
          <EmptyState title="Foydalanuvchi topilmadi" body={search || role || status ? 'Qidiruv yoki filtrni o‘zgartirib ko‘ring.' : undefined} />
        ) : (
          <div className="relative overflow-x-auto min-w-0 -mx-4 px-4" tabIndex={0} role="region" aria-label="Foydalanuvchilar jadvali">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider muted border-b">
                  <th scope="col" className="py-2 pr-3 font-semibold">Foydalanuvchi</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Rol</th>
                  <th scope="col" className="py-2 pr-3 font-semibold text-right">XP</th>
                  <th scope="col" className="py-2 pr-3 font-semibold text-right">Streak</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Holat</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Ro‘yxatdan o‘tgan</th>
                  <th scope="col" className="py-2 font-semibold">
                    <span className="sr-only">Amallar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.result.data.rows.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0 hover:bg-[var(--panel-2)]">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar u={u} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate max-w-[220px]">
                            {u.full_name || '—'}
                            {u.id === currentUserId && <span className="ml-1.5 text-[11px] font-normal muted">(siz)</span>}
                          </p>
                          <p className="text-xs muted truncate max-w-[240px]">{u.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <RoleSelect u={u} busy={busyRow === u.id} onChange={(r) => void changeRole(u, r)} />
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{fmt(u.xp)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Flame aria-hidden="true" className="h-3.5 w-3.5 text-orange-700 dark:text-orange-300" />
                        {u.streak}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{fmtDate(u.created_at)}</td>
                    <td className="py-2.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(u)} aria-label={`${u.full_name || u.email || 'Foydalanuvchi'}ni tahrirlash`}>
                        <Pencil aria-hidden="true" className="h-4 w-4" /> Tahrirlash
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {usersData && total > PAGE_SIZE && (
          <nav className="flex items-center justify-between gap-2" aria-label="Sahifalar">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft aria-hidden="true" className="h-4 w-4" /> Oldingi
            </Button>
            <span className="text-sm muted tabular-nums">
              {page + 1} / {pages}
            </span>
            <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>
              Keyingi <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </section>

      {editing && (
        <UserManagementModal
          key={editing.id}
          user={editing}
          currentUserId={currentUserId}
          onClose={() => setEditing(null)}
          onSaved={(m, saved) => {
            const selfDemoted = editing.id === currentUserId && saved.role !== 'admin'
            setEditing(null)
            push('ok', m)
            if (selfDemoted) {
              resetAdminCache()
              nav('/dashboard', { replace: true })
              return
            }
            refresh()
          }}
          onDeleted={(m) => {
            setEditing(null)
            push('ok', m)
            refresh()
          }}
          onError={(m) => push('error', m)}
        />
      )}

      <ToastStack items={items} onDismiss={dismiss} />
    </div>
  )
}
