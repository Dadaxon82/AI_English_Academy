/**
 * Xarita sarlavhasidagi qo'ng'iroq — HAQIQIY eslatmalar: takrorlash navbatidagi
 * so'zlar (SRS) va joriy dars. Yangi eslatma bo'lsa (navbatda so'z bor) qizil
 * nuqta ko'rinadi. Bezak emas: har qator tegishli sahifani ochadi.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export interface MapBellProps {
  dueCount: number
  /** Joriy dars: yorliq va manzil (`null` — kun testi, xaritadagi medal orqali ochiladi). */
  current: { label: string; to: string | null } | null
}

export default function MapBell({ dueCount, current }: MapBellProps) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const count = dueCount > 0 ? 1 : 0
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Eslatmalar${count ? ` (${dueCount} ta söz takrorlaşni kutmoqda)` : ''}`}
        onClick={() => setOpen((v) => !v)}
        className="relative grid place-items-center size-10 rounded-full hover:bg-[var(--panel-2)] transition-colors"
      >
        <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9Zm4.3 13a1.9 1.9 0 0 0 3.4 0" />
        </svg>
        {count > 0 && <span className="absolute top-1.5 right-2 size-2.5 rounded-full bg-rose-600 ring-2 ring-[var(--panel)]" />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-20 w-64 rounded-2xl border bg-[var(--panel)] shadow-lg p-2 grid gap-1 text-sm">
          {dueCount > 0 ? (
            <Link role="menuitem" to="/vocabulary" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-[var(--panel-2)]">
              <b>{dueCount} ta söz</b> takrorlaşni kutmoqda
              <span className="block text-xs muted">Luğat bölimida takrorlang</span>
            </Link>
          ) : (
            <p className="px-3 py-2 muted">Takrorlanadigan söz yöq.</p>
          )}
          {current && current.to && (
            <Link role="menuitem" to={current.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-[var(--panel-2)]">
              <b>Joriy dars:</b> {current.label}
              <span className="block text-xs muted">Davom etiş uçun bosing</span>
            </Link>
          )}
          {current && !current.to && <p className="px-3 py-2"><b>Joriy bosqiç:</b> {current.label} — xaritadagi kubokni bosing.</p>}
        </div>
      )}
    </div>
  )
}
