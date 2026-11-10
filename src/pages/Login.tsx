import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, InfoBanner, inputCls } from '../components/ui'
import { MascotFigure } from '../components/Mascot'
import { CHUNKY, CHUNKY_GO } from '../components/chunky'
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
  const emailRef = useRef<HTMLInputElement>(null)

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

  // «Bepul boşlaş»: Supabase bor bölsa — röyxatdan ötiş formasi, yöq bölsa — mehmon rejimi.
  const startFree = () => {
    if (!supabaseConfigured) return guest()
    setMode('sign-up')
    setErr(null)
    emailRef.current?.focus()
  }

  return (
    <div className="@container min-h-dvh grid place-items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-6xl mx-auto grid gap-8 @5xl:gap-10 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)] items-center">
        <header className="grid gap-6 @xl:grid-cols-[auto_minmax(0,1fr)] items-center text-center @xl:text-left">
          <MascotFigure
            maxHeight="max-h-52 @xl:max-h-72 @6xl:max-h-[22rem]"
            alt="AI English Academy qahramoni"
            className="mx-auto"
          />
          <div className="grid gap-4 justify-items-center @xl:justify-items-start">
            <h1 className="text-4xl @xl:text-5xl @6xl:text-6xl font-black leading-[1.05] tracking-tight whitespace-nowrap">
              AI English
              <br />
              Academy
            </h1>
            <p className="text-lg sm:text-xl leading-snug muted max-w-md">
              Ingliz tili — özbek tilida, öyin şaklida.
              <br />
              CEFR yöli: A1 dan C1 gaça.
            </p>
            <button type="button" onClick={startFree} className={`${CHUNKY} ${CHUNKY_GO} px-7 py-3.5 text-base @xl:text-lg mt-1 whitespace-nowrap`}>
              Bepul boşlaş
            </button>
          </div>
        </header>

        <div className="grid gap-4 w-full max-w-[520px] mx-auto @5xl:max-w-none">
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
                <input id="login-email" ref={emailRef} className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="siz@example.com" />
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
    </div>
  )
}
