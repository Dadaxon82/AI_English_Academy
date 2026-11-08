/**
 * Joriy bo'lim banneri — o'quv sahifasi tepasidagi rangli sarlavha:
 * "A1.1-BO'LIM · 2-KUN" + kun nomi va "Bo'limlar" tugmasi (`/sections`).
 * Ma'lumot `currentSectionInfo()`dan — son ixtiro qilinmaydi.
 */

import { Link } from 'react-router-dom'
import { currentSectionInfo } from '../lib/sections'
import { useStore } from '../lib/store'

export default function SectionBanner() {
  const { data } = useStore()
  const info = currentSectionInfo(data)
  if (!info) return null
  const { section, unitNumber, day } = info
  return (
    <section
      aria-label="Joriy bo‘lim"
      className="flex items-center gap-3 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-white bg-emerald-600 border-b-4 border-emerald-800 shadow-sm"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-emerald-100">
          {section.label}-bo‘lim · {unitNumber}-kun
        </p>
        <p className="font-extrabold text-base sm:text-lg leading-tight truncate">{day.titleUz}</p>
      </div>
      <Link
        to="/sections"
        className="shrink-0 inline-flex items-center gap-2 rounded-xl border-2 border-emerald-300/70 px-3 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M4 5h16v4H4zM4 11h16v4H4zM4 17h10v3H4z" />
        </svg>
        Bo‘limlar
      </Link>
    </section>
  )
}
