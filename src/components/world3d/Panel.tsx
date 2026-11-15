/**
 * 3D olam ichidagi oyna (shisha uslubi). Sahna konteyneri ICHIDA turadi (`absolute`),
 * shuning uchun to'liq ekran rejimida ham ko'rinadi. Esc — yopadi, fokus oynaga o'tadi.
 */
import { useEffect, useRef, type ReactNode } from 'react'

export default function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  // Fokus faqat ochilganda oynaga o'tadi (har chizishda emas — tugmadagi fokus yo'qolmasin)
  useEffect(() => {
    ref.current?.focus()
    const h = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  return (
    <div className="absolute inset-0 z-20 grid place-items-center overflow-auto bg-slate-900/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div
        ref={ref}
        tabIndex={-1}
        className="w-full max-w-md rounded-3xl border border-white/50 bg-white/[0.97] p-4 text-slate-900 shadow-2xl outline-none backdrop-blur-xl sm:p-5 dark:border-white/15 dark:bg-slate-900/[0.97] dark:text-slate-50 animate-[var(--animate-pop)]"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-lg font-black">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Yopiş" className="rounded-full px-2 py-0.5 text-lg font-bold hover:bg-black/10 dark:hover:bg-white/10">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
