/**
 * O'zbekcha tarjima — Immersion rejimida YASHIRIN, «Tarjimani ko'rsatish»
 * tugmasi bilan istalgan payt ochiladi (Rosetta Stone g'oyasi; bizniki).
 * Rejim o'chiq bo'lsa — oddiy matn.
 */

import { useState, type ReactNode } from 'react'
import { useImmersion } from '../lib/prefs'

export default function UzTranslation({ children, className = '' }: { children: ReactNode; className?: string }) {
  const immersion = useImmersion()
  const [shown, setShown] = useState(false)
  if (!immersion || shown) return <span className={className}>{children}</span>
  return (
    <button
      type="button"
      className="text-xs font-semibold underline text-[var(--accent)] dark:text-navy-300"
      onClick={(e) => {
        // Karta ichida bo'lsa — kartaning o'z bosilishi (aylanish) ishlamasin.
        e.stopPropagation()
        setShown(true)
      }}
    >
      Tarjimani ko‘rsatish
    </button>
  )
}
