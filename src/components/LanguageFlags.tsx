/**
 * Header'dagi til bayroqlari (Angliya, Germaniya, Rossiya, Xitoy, Koreya).
 * Bayroq bosilsa — o'sha tilni o'rganish sahifasi ochiladi (`languageHref`).
 */
import { Link, useLocation } from 'react-router-dom'
import Flag from './Flag'
import { LANGUAGES, activeLanguage, languageHref } from '../lib/languages'

export default function LanguageFlags() {
  const active = activeLanguage(useLocation().pathname)
  return (
    <nav aria-label="Örganiladigan til" className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
      {LANGUAGES.map((l) => {
        const isActive = l.code === active
        return (
          <Link
            key={l.code}
            to={languageHref(l.code)}
            title={`${l.nameUz} (${l.countryUz})`}
            aria-label={`${l.nameUz} — ${l.countryUz} bayroği`}
            aria-current={isActive ? 'page' : undefined}
            className={`grid place-items-center rounded-md p-px sm:p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              isActive ? 'ring-2 ring-navy-600 dark:ring-navy-300' : 'opacity-80 hover:opacity-100'
            }`}
          >
            <Flag code={l.code} className="block w-5 h-[13.33px] sm:w-7 sm:h-[18.67px] rounded-[3px] shadow-sm ring-1 ring-black/15" />
          </Link>
        )
      })}
    </nav>
  )
}
