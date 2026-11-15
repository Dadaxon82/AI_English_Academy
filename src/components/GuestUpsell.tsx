/**
 * Mehmon rejimida yopiq bölim/sahifa ochilganda — ro'yxatdan o'tish taklifi.
 * Qoida: `lib/guest.ts`.
 */
import { useNavigate } from 'react-router-dom'
import { MascotFigure } from './Mascot'
import { CHUNKY, CHUNKY_GO, chunkyPlain } from './chunky'
import { InfoBanner } from './ui'
import { useOpenSignUp } from '../lib/useOpenSignUp'

export default function GuestUpsell() {
  const nav = useNavigate()
  const openSignUp = useOpenSignUp()
  return (
    <section className="panel rounded-3xl border-2 border-b-4 p-6 sm:p-8 grid gap-5 content-start self-start justify-items-center text-center" aria-labelledby="guest-upsell-title">
      <MascotFigure maxHeight="max-h-40 sm:max-h-48" alt="" />
      <div className="grid gap-2 max-w-md">
        <h1 id="guest-upsell-title" className="text-2xl sm:text-3xl font-extrabold">
          Bu bölim röyxatdan ötganlar uçun
        </h1>
        <p className="muted">
          Mehmon sifatida faqat <b>A1.1-bölim</b> oçiq. Qolgan bölimlar, luğat, maşqlar, Mock Exam va progressdan
          foydalaniş uçun bepul röyxatdan öting — natijalaringiz hisobingizda saqlanadi.
        </p>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-3">
        <button type="button" className={`${CHUNKY} ${CHUNKY_GO} px-6 py-3`} onClick={openSignUp}>
          Röyxatdan ötiş
        </button>
        <button type="button" className={chunkyPlain} onClick={() => nav('/path')}>
          A1.1 ga qaytiş
        </button>
      </div>
    </section>
  )
}

/** Mehmonga doimiy eslatma (sahifa tepasida). */
export function GuestNotice() {
  const openSignUp = useOpenSignUp()
  return (
    <InfoBanner>
      <div className="flex flex-wrap items-center gap-3">
        <span>
          <b>Mehmon rejimi:</b> faqat A1.1-bölim oçiq.
        </span>
        <span className="flex-1" />
        <button type="button" className={`${CHUNKY} ${CHUNKY_GO} px-4 py-2 text-xs`} onClick={openSignUp}>
          Röyxatdan ötiş
        </button>
      </div>
    </InfoBanner>
  )
}
