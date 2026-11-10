/**
 * Hisobdan chiqish tugmasi (header va Sozlamalar).
 *
 * Xavfsiz chiqish: Supabase hisobida avval sinxronlanadi; serverga yetmagan
 * yozuv qolsa — tasdiq so'raladi (chiqishda bu qurilmadagi ma'lumot
 * o'chiriladi, yuborilmagan progress tiklanmaydi). Mehmon hisobida
 * ma'lumot o'chirilmaydi — darhol kirish sahifasiga qaytiladi.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthActions } from '../lib/authContext'
import { useStore } from '../lib/storeContext'
import { loadQueue } from '../lib/storage'
import { supabaseConfigured } from '../lib/supabase'
import { Button, InfoBanner, Modal } from './ui'

export default function SignOutButton({ compact = false }: { compact?: boolean }) {
  const { data, actions } = useStore()
  const authActions = useAuthActions()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [unsynced, setUnsynced] = useState<{ pending: number; reasonUz: string | null } | null>(null)
  const isGuest = data.userId.startsWith('local-')

  const doSignOut = () => {
    setUnsynced(null)
    authActions?.signOut()
    void nav('/login')
  }

  const request = async () => {
    if (isGuest || !supabaseConfigured) {
      doSignOut()
      return
    }
    setBusy(true)
    const res = await actions.sync()
    const q = await loadQueue(data.userId)
    setBusy(false)
    if (res.ok && q.length === 0) doSignOut()
    else setUnsynced({ pending: q.length, reasonUz: res.reasonUz })
  }

  const label = isGuest ? 'Çiqiş (ma’lumot saqlanadi)' : busy ? 'Sinxronlanmoqda…' : 'Hisobdan çiqiş'

  return (
    <>
      {compact ? (
        <Button
          variant="ghost"
          size="sm"
          busy={busy}
          onClick={() => void request()}
          aria-label={label}
          title={label}
          className="text-rose-700 hover:!bg-rose-50 dark:text-rose-300 dark:hover:!bg-rose-950/40"
        >
          {!busy && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
            </svg>
          )}
          <span className="hidden sm:inline">Çiqiş</span>
        </Button>
      ) : (
        <Button variant="secondary" busy={busy} onClick={() => void request()}>
          {label}
        </Button>
      )}

      <Modal open={unsynced !== null} title="Serverga yetmagan ma’lumot bor" onClose={() => setUnsynced(null)}>
        <div className="grid gap-3">
          <p className="text-sm">
            {unsynced && unsynced.pending > 0
              ? `${unsynced.pending} ta yozuv serverga yuborilmadi.`
              : 'Sinxronizatsiya töliq bajarilmadi.'}{' '}
            {unsynced?.reasonUz}
          </p>
          <InfoBanner tone="warn">
            Hisobdan çiqsangiz, bu qurilmadagi ma’lumotlar öçiriladi — serverga yetmagan qismini tiklab bölmaydi.
            Internetni tekşirib, qayta urinib köring.
          </InfoBanner>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setUnsynced(null)}>
              Qoliş
            </Button>
            <Button variant="danger" onClick={doSignOut}>
              Baribir çiqiş
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
