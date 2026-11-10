import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, HashRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from './lib/authContext'
import Layout from './components/Layout'
import { StoreProvider } from './lib/store'
import { useStore } from './lib/storeContext'
import { getSupabase, localGuestId, supabaseConfigured, type AuthState } from './lib/supabase'
import { LoadingBlock, InfoBanner, Button } from './components/ui'
import Login from './pages/Login'
import { signOutCurrent } from './lib/auth'
import AdminRoute from './components/admin/AdminRoute'
import GuestUpsell, { GuestNotice } from './components/GuestUpsell'
import { guestRemembered, isGuestAllowedPath, rememberGuest } from './lib/guest'

// Sahifalar alohida chunk'larda — birinchi ochilishda faqat kerakli sahifa
// yuklanadi (PWA service worker barchasini oflayn uchun oldindan keshlaydi).
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const LearningPath = lazy(() => import('./pages/LearningPath'))
const Sections = lazy(() => import('./pages/Sections'))
const Vocabulary = lazy(() => import('./pages/Vocabulary'))
const Grammar = lazy(() => import('./pages/Grammar'))
const Reading = lazy(() => import('./pages/Reading'))
const Listening = lazy(() => import('./pages/Listening'))
const Writing = lazy(() => import('./pages/Writing'))
const Speaking = lazy(() => import('./pages/Speaking'))
const MockExam = lazy(() => import('./pages/MockExam'))
const ErrorLog = lazy(() => import('./pages/ErrorLog'))
const Progress = lazy(() => import('./pages/Progress'))
const Settings = lazy(() => import('./pages/Settings'))
const StepLesson = lazy(() => import('./pages/StepLesson'))
const QuickSession = lazy(() => import('./pages/QuickSession'))
const Dialogues = lazy(() => import('./pages/Dialogues'))
const Community = lazy(() => import('./pages/Community'))
const Conversation = lazy(() => import('./pages/Conversation'))
const Pronunciation = lazy(() => import('./pages/Pronunciation'))
const Shorts = lazy(() => import('./pages/Shorts'))
// Admin panel — alohida chunk (grafik kutubxonasi faqat adminga yuklanadi).
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

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
  // Onboarding yakunlanmagan bo'lsa taklif qilamiz. Diagnostikani o'tkazib
  // yuborish ham yakunlash hisoblanadi (`onboardedAt`).
  const needsOnboarding = data.diagnostic === null && data.onboardedAt === null
  // Supabase ulangan saytdagi mehmon — faqat A1.1-bölim (`lib/guest.ts`).
  const guest = supabaseConfigured && auth.kind === 'local-only'
  const locked = guest && !isGuestAllowedPath(loc.pathname)

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
      {guest && !locked && loc.pathname !== '/login' && <GuestNotice />}
      <Suspense fallback={<LoadingBlock label="Sahifa yuklanmoqda…" />}>
        {locked ? (
          <GuestUpsell />
        ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login authState={auth} onAuth={onAuth} />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/path" element={<LearningPath />} />
              <Route path="/lesson/:dayId/:skill" element={<StepLesson />} />
              <Route path="/sections" element={<Sections />} />
              <Route path="/vocabulary" element={<Vocabulary />} />
              <Route path="/quick" element={<QuickSession />} />
              <Route path="/dialogues" element={<Dialogues />} />
              <Route path="/shorts" element={<Shorts />} />
              <Route path="/community" element={<Community />} />
              <Route path="/conversation" element={<Conversation />} />
              <Route path="/pronunciation" element={<Pronunciation />} />
              <Route path="/grammar" element={<Grammar />} />
              <Route path="/reading" element={<Reading />} />
              <Route path="/listening" element={<Listening />} />
              <Route path="/writing" element={<Writing />} />
              <Route path="/speaking" element={<Speaking />} />
              <Route path="/mock-exam" element={<MockExam />} />
              <Route path="/errors" element={<ErrorLog />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
        )}
      </Suspense>
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
        <span>Boşlanğiç sozlamalar töldirilmagan.</span>
        <span className="flex-1" />
        {/* Router orqali: Pages'da `/onboarding` to'g'ridan-to'g'ri havolasi
            bazani (`/AI_English_Academy/`) tashlab yuborib 404 beradi. */}
        <Button size="sm" onClick={() => nav('/onboarding')}>
          Sozlamalarni töldiriş
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
        <Button>Dashboardga qaytiş</Button>
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
      const sb = await getSupabase()
      if (!sb) {
        if (alive) setAuth({ kind: 'local-only', userId: localGuestId() })
        return
      }
      const { data } = await sb.auth.getSession()
      if (!alive) return
      if (data.session?.user) {
        setAuth({ kind: 'signed-in', userId: data.session.user.id, email: data.session.user.email ?? null })
      } else if (guestRemembered()) {
        // Avval «Mehmon sifatida davom etiş» tanlangan — mehmon hisobi (faqat A1.1).
        setAuth({ kind: 'local-only', userId: localGuestId() })
      } else {
        setAuth({ kind: 'signed-out' })
      }
      const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
        if (!alive) return
        if (session?.user) {
          rememberGuest(false)
          setAuth({ kind: 'signed-in', userId: session.user.id, email: session.user.email ?? null })
        } else {
          // Sessiya yo'q: mehmon bo'lsa mehmonligicha qoladi, aks holda login.
          setAuth((prev) => (prev.kind === 'local-only' ? prev : { kind: 'signed-out' }))
        }
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

  // Login'dan kelgan holat: mehmon tanlovi eslab qolinadi, hisobga kirilsa unutiladi.
  const onAuth = useCallback((s: AuthState) => {
    if (s.kind === 'local-only') rememberGuest(true)
    if (s.kind === 'signed-in') rememberGuest(false)
    setAuth(s)
  }, [])

  const signedInId = auth.kind === 'signed-in' ? auth.userId : null
  const guest = supabaseConfigured && auth.kind === 'local-only'
  const authValue = useMemo(() => ({ signOut, userId: signedInId, guest }), [signOut, signedInId, guest])

  // BrowserRouter uchun base (masalan custom domain ostidagi `/aea/`).
  // HashRouter o'zi ham `/AI_English_Academy/#/dashboard` dan ishlaydi.
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const routerProps = !useHashRoutes && base && base !== '/' ? { basename: base } : {}

  return (
    <Router {...routerProps}>
      <AuthContext.Provider value={authValue}>
        <StoreProvider userId={userId} remoteSync={auth.kind === 'signed-in'}>
          <Shell auth={auth} onAuth={onAuth} />
        </StoreProvider>
      </AuthContext.Provider>
    </Router>
  )
}
