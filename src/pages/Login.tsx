import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, InfoBanner, inputCls } from '../components/ui'
import { MascotAvatar } from '../components/Mascot'
import { getSupabase, localGuestId, safeErrorMessage, supabaseConfigured, type AuthState } from '../lib/supabase'

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
    const sb = await getSupabase()
    if (!sb) {
      setErr('Supabase sozlanmagan. “Mehmon sifatida davom etiş” tugmasidan foydalaning.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setErr('Email manzil notöğri körinmoqda.')
      return
    }
    if (password.length < 6) {
      setErr('Parol kamida 6 belgi bölişi kerak.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'sign-up') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name } } })
        if (error) throw error
        if (!data.session) {
          setNotice('Hisob yaratildi. Emailingizdagi tasdiq havolasini oçing, söng qaytadan kiring.')
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
          <div className="flex justify-center mb-1">
            <MascotAvatar size="xl" alt="AI English Academy qahramoni" className="shadow-lg" />
          </div>
          <h1 className="text-2xl font-bold">
            AI English <span className="text-navy-700 dark:text-navy-300">Academy</span>
          </h1>
          <p className="muted text-sm">A1 dan C1 gaça — CEFR asosida şaxsiy ingliz tili platformasi</p>
        </header>

        {!supabaseConfigured && (
          <InfoBanner tone="warn">
            <b>Supabase ulanmagan.</b> Ilova töliq işlaydi, ma’lumotlar şu qurilmada saqlanadi. Hisob yaratiş
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
                  {m === 'sign-in' ? 'Kiriş' : "Röyxatdan ötiş"}
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
              {mode === 'sign-in' ? 'Kiriş' : 'Hisob yaratiş'}
            </Button>
            {!supabaseConfigured && (
              <Button type="button" onClick={guest} variant="secondary" size="lg">
                Mehmon sifatida davom etiş
              </Button>
            )}
          </form>
        </Card>

        <div className="grid gap-2 text-center">
          <span className="chip mx-auto">Bepul / arzon xizmatlar ustuvor</span>
          {authState.kind === 'local-only' && (
            // Mavjud hisob — o'qishni davom ettirish (onboarding'ni qayta boshlamaydi;
            // tugallanmagan bo'lsa Dashboard o'zi taklif qiladi).
            <Button variant="secondary" onClick={() => nav('/dashboard')}>
              Davom etiş (mavjud mahalliy hisob)
            </Button>
          )}
          <p className="text-[11px] muted">
            Ma’lumotlaringiz RLS bilan himoyalanadi va faqat sizga oçiladi. Hisobingizni sozlamalardan öçirişingiz
            mumkin.
          </p>
        </div>
      </div>
    </div>
  )
}
