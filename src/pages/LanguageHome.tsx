/**
 * Til sahifasi (`/lang/:code`) — header'dagi bayroq bosilganda ochiladi.
 * Hozircha faqat ingliz tili kursi tayyor; boshqa tillar uchun kurs
 * kontenti keyinchalik shu sahifaga qo'shiladi.
 */
import { Link, Navigate, useParams } from 'react-router-dom'
import Flag from '../components/Flag'
import { Button, Card, Chip } from '../components/ui'
import { findLanguage } from '../lib/languages'

export default function LanguageHome() {
  const lang = findLanguage(useParams().code)
  if (!lang || lang.code === 'en') return <Navigate to="/dashboard" replace />

  return (
    <Card as="section" className="grid gap-5 content-start self-start justify-items-center text-center py-10">
      <Flag code={lang.code} className="w-36 h-24 rounded-lg shadow-md ring-1 ring-black/15" />
      <div className="grid gap-2 justify-items-center">
        <h1 className="text-3xl font-bold">{lang.nameUz}</h1>
        <p className="muted">
          {lang.nativeName} · {lang.countryUz}
        </p>
        <p className="text-2xl font-semibold" lang={lang.code}>
          {lang.hello}
        </p>
        <Chip tone="warn">Kurs tayyorlanmoqda</Chip>
      </div>
      <p className="max-w-md">
        {lang.nameUz} kursi tez orada şu yerda oçiladi. Hozirça ingliz tilini A1 dan C1 gaça örganişingiz mumkin.
      </p>
      <Link to="/dashboard">
        <Button>Ingliz tili kursiga ötiş</Button>
      </Link>
    </Card>
  )
}
