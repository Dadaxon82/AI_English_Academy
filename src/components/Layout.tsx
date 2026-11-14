import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button, Chip } from './ui'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'M3 12 12 4l9 8M5 11v9h14v-9' },
  { to: '/path', label: "O'quv yo'li", icon: 'M4 18h4V6H4v12Zm6 0h4V6h-4v12Zm6 0h4V6h-4v12Z' },
  { to: '/vocabulary', label: "Lug'at", icon: 'M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5Zm14 3h2v11H6' },
  { to: '/grammar', label: 'Grammatika', icon: 'M5 5h14M12 5v14M7 19h10' },
  { to: '/reading', label: "O'qish", icon: 'M4 6h16v12H4zM8 10h8M8 14h5' },
  { to: '/listening', label: 'Tinglash', icon: 'M4 12a8 8 0 0 1 16 0M6 12v4a2 2 0 0 0 4 0v-4m4 0v4a2 2 0 0 0 4 0v-4' },
  { to: '/writing', label: 'Yozish', icon: 'M4 20l4-1 11-11-3-3L5 16l-1 4Z' },
  { to: '/speaking', label: "Gapirish", icon: 'M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-7 8a7 7 0 0 0 14 0M12 18v3' },
  { to: '/mock-exam', label: 'Mock Exam', icon: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4' },
  { to: '/errors', label: 'Xatolar daftari', icon: 'M12 8v5m0 3.5.01 0M5 4h14v16H5z' },
  { to: '/progress', label: 'Progress', icon: 'M4 19h16M7 16V8m5 8V5m5 11v-6' },
  { to: '/settings', label: 'Sozlamalar', icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a8 8 0 0 0-.2-1.7l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.9-1.7L14 2h-4l-.5 2.6a8 8 0 0 0-2.9 1.7l-2.4-1-2 3.5 2 1.5A8 8 0 0 0 4 12' },
]

function useTheme(theme: 'light' | 'dark' | 'system') {
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const r = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme
      setResolved(r)
      document.documentElement.classList.toggle('dark', r === 'dark')
    }
    apply()
    const handler = () => theme === 'system' && apply()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])
  return resolved
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data, netOnline, streak, allocation, dayProgress, actions } = useStore()
  const theme = useTheme(data.settings.theme)
  const [menuOpen, setMenuOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setMenuOpen(false), [loc.pathname])

  const plannedMinutes = useMemo(() => allocation.total, [allocation])
  const doneMin = dayProgress.doneMin

  return (
    <div className="min-h-dvh flex flex-col">
      {/* ---------- HEADER ---------- */}
      <header className="sticky top-0 z-30 backdrop-blur bg-[var(--bg)]/90 border-b">
        <div className="mx-auto max-w-6xl px-3 sm:px-5 h-14 flex items-center gap-3">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-navy-700 dark:bg-navy-500 text-white dark:text-navy-950 font-black text-sm">
              AE
            </span>
            <span className="hidden sm:block font-bold tracking-tight">
              AI English <span className="text-navy-700 dark:text-navy-300">Academy</span>
            </span>
          </NavLink>

          <div className="flex-1" />

          {/* Reja progressi (jonli) */}
          <div className="hidden md:flex items-center gap-2 text-xs muted" title={`Bugungi reja: ${plannedMinutes} daqiqa`}>
            <span className="tabular-nums">
              {doneMin}/{plannedMinutes} daq
            </span>
            <span className="w-24 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <span
                className="block h-full bg-navy-600 dark:bg-navy-400 transition-[width] duration-500"
                style={{ width: `${Math.min(100, dayProgress.ratio * 100)}%` }}
              />
            </span>
          </div>

          <Chip tone={streak > 0 ? 'warn' : 'default'}>{streak} kun</Chip>

          {!netOnline && <Chip tone="bad">Offline</Chip>}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.setSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
            aria-label={theme === 'dark' ? 'Light rejim' : 'Dark rejim'}
            title={theme === 'dark' ? 'Light rejim' : 'Dark rejim'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5Z" />
              </svg>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Menyu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-3 sm:px-5 flex-1 flex gap-5 py-4">
        {/* ---------- SIDEBAR (desktop) ---------- */}
        <nav aria-label="Asosiy navigatsiya" className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-[4.6rem] grid gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'bg-navy-700 text-white dark:bg-navy-500 dark:text-navy-950' : 'hover:bg-[var(--panel-2)] muted'
                  }`
                }
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d={n.icon} />
                </svg>
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ---------- MENU (mobil) ---------- */}
        {menuOpen && (
          <div className="fixed inset-x-0 top-14 bottom-0 z-20 bg-[var(--bg)] overflow-auto p-3 lg:hidden animate-[var(--animate-fade-in)]">
            <nav aria-label="Mobil navigatsiya" className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `px-3.5 py-3 rounded-xl text-sm font-semibold border ${
                      isActive ? 'bg-navy-700 text-white dark:bg-navy-500 dark:text-navy-950 border-transparent' : 'panel !rounded-xl'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* ---------- KONTENT ---------- */}
        <main className="flex-1 min-w-0 grid gap-4 sm:gap-5 pb-24 lg:pb-6" id="main">
          {children}
        </main>
      </div>

      {/* ---------- BOTTOM NAV (mobil) ---------- */}
      <nav aria-label="Tez navigatsiya" className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-[var(--panel)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {[NAV[0], NAV[2], NAV[8], NAV[10], NAV[11]].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? 'text-navy-700 dark:text-navy-300' : 'muted'}`
              }
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d={n.icon} />
              </svg>
              {n.label.split(' ')[0]}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
