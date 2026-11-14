import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, InfoBanner, inputCls } from '../components/ui'
import { getSupabase, localGuestId, safeErrorMessage, supabaseConfigured, type AuthState } from '../lib/supabase'
import { purgeUserData } from '../lib/storage'

export default function Login({ onAuth, authState }: { onAuth: (s: AuthState) => void; authState: AuthState }) {
  const nav = useNavigate()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // allaqachon kirilgan bo'lsa — dashboardga
  useEffect(() => {
    if (authState.kind === 'signed-in') nav('/dashboard', { replace: true })
  }, [authState, nav])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setNotice(null)
    const sb = getSupabase()
    if (!sb) {
      setErr('Supabase sozlanmagan. “Mehmon sifatida davom etish” tugmasidan foydalaning.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setErr('Email manzil noto‘g‘ri ko‘rinmoqda.')
      return
    }
    if (password.length < 6) {
      setErr('Parol kamida 6 belgi bo‘lishi kerak.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'sign-up') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name } } })
        if (error) throw error
        if (!data.session) {
          setNotice('Hisob yaratildi. Emailingizdagi tasdiq havolasini oching, so‘ng qaytadan kiring.')
          setMode('sign-in')
        } else {
          onAuth({ kind: 'signed-in', userId: data.user!.id, email: data.user!.email ?? null })
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuth({ kind: 'signed-in', userId: data.user.id, email: data.user.email ?? null })
      }
    } catch (e2) {
      setErr(safeErrorMessage(e2))
    } finally {
      setBusy(false)
    }
  }

  const guest = () => {
    onAuth({ kind: 'local-only', userId: localGuestId() })
    nav('/onboarding')
  }

  return (
    <div className="min-h-dvh grid place-items-center p-4">
      <div className="w-full grid gap-4 max-w-[520px] mx-auto">
        <header className="text-center grid gap-2">
          <div className="mx-auto grid place-items-center w-12 h-12 rounded-2xl bg-navy-700 dark:bg-navy-500 text-white dark:text-navy-950 font-black text-lg">
            AE
          </div>
          <h1 className="text-2xl font-bold">
            AI English <span className="text-navy-700 dark:text-navy-300">Academy</span>
          </h1>
          <p className="muted text-sm">A1 dan C1 gacha — CEFR asosida shaxsiy ingliz tili platformasi</p>
        </header>

        {!supabaseConfigured && (
          <InfoBanner tone="warn">
            <b>Supabase ulanmagan.</b> Ilova to‘liq ishlaydi, ma’lumotlar shu qurilmada saqlanadi. Hisob yaratish
            istalsangiz <code>.env</code> faylga <code>VITE_SUPABASE_URL</code> va <code>VITE_SUPABASE_ANON_KEY</code>{' '}
            kiriting.
          </InfoBanner>
        )}

        <Card>
          <form onSubmit={submit} className="grid gap-3.5">
            <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--panel-2)]">
              {(['sign-in', 'sign-up'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === m ? 'bg-[var(--panel)] shadow-sm' : 'muted'}`}
                >
                  {m === 'sign-in' ? 'Kirish' : "Ro'yxatdan o'tish"}
                </button>
              ))}
            </div>

            {mode === 'sign-up' && (
              <Field label="Ism" htmlFor="login-name">
                <input id="login-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Sardor" />
              </Field>
            )}
            <Field label="Email" htmlFor="login-email">
              <input id="login-email" className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="siz@example.com" />
            </Field>
            <Field label="Parol" htmlFor="login-pass" hint="Kamida 6 belgi">
              <input id="login-pass" className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required minLength={6} />
            </Field>

            {err && <InfoBanner tone="warn">{err}</InfoBanner>}
            {notice && <InfoBanner>{notice}</InfoBanner>}

            <Button type="submit" busy={busy} size="lg" disabled={!supabaseConfigured}>
              {mode === 'sign-in' ? 'Kirish' : 'Hisob yaratish'}
            </Button>
            {!supabaseConfigured && (
              <Button type="button" onClick={guest} variant="secondary" size="lg">
                Mehmon sifatida davom etish
              </Button>
            )}
          </form>
        </Card>

        <div className="grid gap-2 text-center">
          <span className="chip mx-auto">Bepul / arzon xizmatlar ustuvor</span>
          {authState.kind === 'local-only' && (
            <Button variant="secondary" onClick={() => nav('/onboarding')}>
              Davom etish (mavjud mahalliy hisob)
            </Button>
          )}
          <p className="text-[11px] muted">
            Ma’lumotlaringiz RLS bilan himoyalanadi va faqat sizga ochiladi. Hisobingizni sozlamalardan o‘chirishingiz
            mumkin.
          </p>
        </div>
      </div>
    </div>
  )
}

export async function signOutCurrent(userId: string) {
  const sb = getSupabase()
  if (sb) await sb.auth.signOut()
  await purgeUserData(userId)
  // Service Worker keshlari (Supabase GET javoblari, audio, rasm) — logout'da
  // to'zalanadi, keyingi foydalanuvchi oldingisining ma'lumotINI ko'masin.
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n.startsWith('aea-')).map((n) => caches.delete(n)))
    }
  } catch {
    /* kesh o'chirilmasa ham xavfsizlik RLS'da — davom etamiz */
  }
}
