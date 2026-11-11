/**
 * Parolni tiklaş — emaildagi havoladan kelgandan keyin körinadigan ekran.
 * Supabase `detectSessionInUrl` orqali URL'dagi tiklaş tokenini özi oqiydi va
 * `PASSWORD_RECOVERY` hodisasini qötaradi (App.tsx'da tinglanadi); şu payt
 * vaqtinça sessiya mavjud bölib, `updateUser({ password })` işlaydi.
 */
import { useId, useState, type FormEvent } from 'react'
import { Button, Field, InfoBanner, SuccessBanner, inputCls } from '../components/ui'
import { MascotFigure } from '../components/Mascot'
import { NEW_PASSWORD_MIN, setNewPasswordAfterRecovery } from '../lib/auth'

export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const id = useId()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (pw !== pw2) {
      setErr('Parollar bir xil emas.')
      return
    }
    setBusy(true)
    const res = await setNewPasswordAfterRecovery(pw)
    setBusy(false)
    if (res.ok) setDone(true)
    else setErr(res.reasonUz)
  }

  return (
    <div className="min-h-dvh grid place-items-center px-4 py-8">
      <div className="w-full max-w-md grid gap-6">
        <MascotFigure maxHeight="max-h-28" alt="AI English Academy qahramoni" className="mx-auto" />
        <div className="panel p-6 grid gap-4">
          <h1 className="text-xl font-bold text-center">Yangi parol örnatiş</h1>
          {done ? (
            <div className="grid gap-3">
              <SuccessBanner>Parol muvaffaqiyatli özgartirildi. Endi davom etişingiz mumkin.</SuccessBanner>
              <Button size="lg" onClick={onDone}>
                Davom etiş
              </Button>
            </div>
          ) : (
            <form className="grid gap-3.5" onSubmit={submit} noValidate>
              <Field label="Yangi parol" htmlFor={`${id}-pw`} hint={`Kamida ${NEW_PASSWORD_MIN} belgi, harf va raqam bilan.`}>
                <input
                  id={`${id}-pw`}
                  className={inputCls}
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  minLength={NEW_PASSWORD_MIN}
                  required
                  autoFocus
                />
              </Field>
              <Field label="Yangi parolni takrorlang" htmlFor={`${id}-pw2`}>
                <input
                  id={`${id}-pw2`}
                  className={inputCls}
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  minLength={NEW_PASSWORD_MIN}
                  required
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Parolni körsatiş
              </label>
              {err && <InfoBanner tone="warn">{err}</InfoBanner>}
              <Button type="submit" busy={busy} size="lg">
                Saqlaş
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
