/**
 * Parolni o'zgartirish. Server «qayta tasdiqlash»ni talab qilsa (sessiya eski),
 * emailga 6 xonali kod yuboriladi va shu kod bilan saqlanadi.
 */
import { useId, useState, type FormEvent } from 'react'
import { Button, Field, InfoBanner, Modal, SuccessBanner, inputCls } from './ui'
import { NEW_PASSWORD_MIN, changePassword, sendReauthCode, validateNewPassword } from '../lib/auth'

type Step = 'form' | 'code' | 'done'

export default function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const id = useId()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const close = () => {
    if (busy) return
    setPw('')
    setPw2('')
    setCode('')
    setErr(null)
    setStep('form')
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (step === 'form') {
      const bad = validateNewPassword(pw) ?? (pw !== pw2 ? 'Parollar bir xil emas.' : null)
      if (bad) return setErr(bad)
    } else if (!/^\d{6,10}$/.test(code.trim())) {
      return setErr('Emailga kelgan kodni kiriting (raqamlar).')
    }
    setBusy(true)
    const res = await changePassword(pw, step === 'code' ? code : undefined)
    if (res.ok) {
      setStep('done')
    } else if (res.needsCode) {
      const sent = await sendReauthCode()
      if (sent.ok) setStep('code')
      else setErr(sent.reasonUz)
    } else {
      setErr(res.reasonUz)
    }
    setBusy(false)
  }

  const resend = async () => {
    setBusy(true)
    setErr(null)
    const sent = await sendReauthCode()
    if (!sent.ok) setErr(sent.reasonUz)
    setBusy(false)
  }

  return (
    <Modal open={open} title="Parolni özgartiriş" onClose={close}>
      {step === 'done' ? (
        <div className="grid gap-3">
          <SuccessBanner>Parol özgartirildi. Keyingi kirişda yangi paroldan foydalaning.</SuccessBanner>
          <Button onClick={close}>Yopiş</Button>
        </div>
      ) : (
        <form className="grid gap-3" onSubmit={submit} noValidate>
          {step === 'form' ? (
            <>
              <Field label="Yangi parol" htmlFor={`${id}-pw`} hint={`Kamida ${NEW_PASSWORD_MIN} belgi, harf va raqam.`}>
                <input
                  id={`${id}-pw`}
                  className={inputCls}
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
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
                  required
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Parolni körsatiş
              </label>
            </>
          ) : (
            <>
              <InfoBanner>Xavfsizlik uçun emailingizga tasdiq kodi yuborildi. Şu kodni kiriting.</InfoBanner>
              <Field label="Tasdiq kodi" htmlFor={`${id}-code`}>
                <input
                  id={`${id}-code`}
                  className={inputCls}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </Field>
              <button type="button" className="justify-self-start text-sm underline" onClick={resend} disabled={busy}>
                Kodni qayta yuboriş
              </button>
            </>
          )}
          {err && (
            <p className="text-sm text-[var(--bad)]" role="alert">
              {err}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={busy}>
              Bekor qiliş
            </Button>
            <Button type="submit" busy={busy}>
              {step === 'code' ? 'Tasdiqlaş va saqlaş' : 'Saqlaş'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
