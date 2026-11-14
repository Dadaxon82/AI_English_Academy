import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, HashRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from './lib/authContext'
import Layout from './components/Layout'
import { StoreProvider, useStore } from './lib/store'
import { getSupabase, localGuestId, supabaseConfigured, type AuthState } from './lib/supabase'
import { LoadingBlock, InfoBanner, Button } from './components/ui'
import Login, { signOutCurrent } from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import LearningPath from './pages/LearningPath'
import Vocabulary from './pages/Vocabulary'
import Grammar from './pages/Grammar'
import Reading from './pages/Reading'
import Listening from './pages/Listening'
import Writing from './pages/Writing'
import Speaking from './pages/Speaking'
import MockExam from './pages/MockExam'
import ErrorLog from './pages/ErrorLog'
import Progress from './pages/Progress'
import Settings from './pages/Settings'

/**
 * Router tanlovi:
 *  - file:// (statik Ochish) → HashRouter
 *  - GitHub Pages (`*.github.io/<repo>/`) → HashRouter, chunkuki server
 *    `/AI_English_Academy/dashboard` kabi manzilga to'g'ridan-to'g'ri
 *    o'tishda 404 qaytaradi (SPA fallback yo'q).
 *  - o'zimizing host / Vite dev → BrowserRouter (toza URL)
 */
const useHashRoutes =
  window.location.protocol === 'file:' ||
  window.location.hostname.endsWith('.github.io') ||
  Boolean((import.meta as ImportMeta).env?.VITE_HASH_ROUTES)
const Router = useHashRoutes ? HashRouter : BrowserRouter

function Shell({ auth, onAuth }: { auth: AuthState; onAuth: (s: AuthState) => void }) {
  const { ready, data } = useStore()
  const loc = useLocation()
  // Diagnostika topshirilmagan bo'lsa — onboarding'ga taklif qilamiz
  const needsOnboarding = data.diagnostic === null

  if (!ready) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <LoadingBlock label="Mavjud ma'lumotingiz yuklanmoqda…" />
      </div>
    )
  }

  // Kirish talab qilinadi (mahalliy rejimda ham mehmon hisobi ochiladi)
  if (auth.kind === 'signed-out' || auth.kind === 'checking') {
    return <Login authState={auth} onAuth={onAuth} />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login authState={auth} onAuth={onAuth} />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/path" element={<LearningPath />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/grammar" element={<Grammar />} />
        <Route path="/reading" element={<Reading />} />
        <Route path="/listening" element={<Listening />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/speaking" element={<Speaking />} />
        <Route path="/mock-exam" element={<MockExam />} />
        <Route path="/errors" element={<ErrorLog />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {needsOnboarding && loc.pathname === '/dashboard' && <FirstRunHint />}
    </Layout>
  )
}

function FirstRunHint() {
  const [hidden, setHidden] = useState(false)
  const nav = useNavigate()
  if (hidden) return null
  return (
    <InfoBanner>
      <div className="flex items-center gap-3">
        <span>Boshlang‘ich sozlamalar to‘ldirilmagan.</span>
        <span className="flex-1" />
        {/* Router orqali: Pages'da `/onboarding` to'g'ridan-to'g'ri havolasi
            bazani (`/AI_English_Academy/`) tashlab yuborib 404 beradi. */}
        <Button size="sm" onClick={() => nav('/onboarding')}>
          Sozlamalarni to‘ldirish
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setHidden(true)}>
          Keyin
        </Button>
      </div>
    </InfoBanner>
  )
}

function NotFound() {
  return (
    <div className="panel p-8 text-center grid gap-3">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="muted">Bunday sahifa mavjud emas.</p>
      <Link to="/dashboard" className="inline-flex justify-center">
        <Button>Dashboardga qaytish</Button>
      </Link>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ kind: 'checking' })

  useEffect(() => {
    let alive = true
    const cleanup: Array<() => void> = []
    const boot = async () => {
      if (!supabaseConfigured) {
        if (alive) setAuth({ kind: 'local-only', userId: localGuestId() })
        return
      }
      const sb = getSupabase()
      if (!sb) {
        if (alive) setAuth({ kind: 'local-only', userId: localGuestId() })
        return
      }
      const { data } = await sb.auth.getSession()
      if (!alive) return
      if (data.session?.user) {
        setAuth({ kind: 'signed-in', userId: data.session.user.id, email: data.session.user.email ?? null })
      } else {
        // Mahalliy ishlatuvchi bo'lsa uni saqlab qolamiz, aks holda login
        setAuth({ kind: 'signed-out' })
      }
      const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
        if (!alive) return
        setAuth(
          session?.user
            ? { kind: 'signed-in', userId: session.user.id, email: session.user.email ?? null }
            : { kind: 'signed-out' },
        )
      })
      cleanup.push(() => sub.subscription.unsubscribe())
    }
    void boot()
    return () => {
      alive = false
      for (const fn of cleanup) fn()
    }
  }, [])

  const userId = auth.kind === 'signed-in' || auth.kind === 'local-only' ? auth.userId : 'anonymous'

  // Chiqish:
  //  - Supabase hisobi → sessiya + shaxsiy kesh + SW keshlari tozalanadi.
  //  - Mehmon (mahalliy) hisob → faqat login ekraniga qaytamiz; ma'lumot
  //    o'chirilmaydi (foydalanuvchi xohlasa Sozlamalardan o'chiradi).
  const signOut = useCallback(() => {
    void (async () => {
      if (auth.kind === 'signed-in') {
        await signOutCurrent(userId)
        setAuth({ kind: 'signed-out' })
      } else {
        // Mehmon hisob: sessiya yo'q — local-only holatda qolamiz, shunda
        // Login sahifasi "Davom etish (mavjud mahalliy hisob)" tugmasini
        // ko'rsatadi va ma'lumot yo'qolmaydi.
        setAuth({ kind: 'local-only', userId: localGuestId() })
      }
    })()
  }, [auth.kind, userId])

  // BrowserRouter uchun base (masalan custom domain ostidagi `/aea/`).
  // HashRouter o'zi ham `/AI_English_Academy/#/dashboard` dan ishlaydi.
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const routerProps = !useHashRoutes && base && base !== '/' ? { basename: base } : {}

  return (
    <Router {...routerProps}>
      <AuthContext.Provider value={{ signOut }}>
        <StoreProvider userId={userId}>
          <Shell auth={auth} onAuth={setAuth} />
        </StoreProvider>
      </AuthContext.Provider>
    </Router>
  )
}
