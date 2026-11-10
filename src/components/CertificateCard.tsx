/**
 * Yakunlash guvohnomasi — daraja kunlari tugaganda PNG sifatida yuklab olinadi.
 * Rasm brauzerda `<canvas>` bilan chiziladi (tarmoq kerak emas); brauzer rasm
 * yasay olmasa SABAB aytiladi. Ism faqat shu qurilmada kiritiladi.
 */

import { useMemo, useState } from 'react'
import { allGlossaryVocab, getBundle, mockExamA1 } from '../content'
import type { CefrLevel } from '../content/types'
import { CERTIFICATE_DISCLAIMER_UZ, certificateInfo } from '../lib/certificate'
import { drawCertificate } from '../lib/certificateDraw'
import { useNow } from '../lib/clock'
import { useStore } from '../lib/storeContext'
import { Button, Card, Chip, InfoBanner, inputCls } from './ui'

const LEVELS: CefrLevel[] = ['A1', 'A2']

export default function CertificateCard() {
  const { data } = useStore()
  const now = useNow()
  const [level, setLevel] = useState<CefrLevel>(LEVELS.includes(data.settings.currentLevel) ? data.settings.currentLevel : 'A1')
  const [name, setName] = useState(data.profileName)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const info = useMemo(() => {
    const b = getBundle(level)
    const ids = [...b.vocab, ...allGlossaryVocab().filter((g) => g.level === level)].map((v) => v.id)
    return certificateInfo(data, level, b.days, ids, now, (id) => (id === mockExamA1.id ? mockExamA1.level : null))
  }, [data, level, now])

  const make = () => {
    setError(null)
    const canvas = document.createElement('canvas')
    const dateUz = new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
    let ok = false
    try {
      ok = drawCertificate(canvas, info, name.trim(), dateUz)
    } catch {
      ok = false
    }
    if (!ok) {
      setError('Brauzeringiz rasm yasay olmadi (canvas qo‘llanmaydi). Boshqa brauzerda urinib ko‘ring.')
      return
    }
    setUrl(canvas.toDataURL('image/png'))
  }

  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-bold">Yakunlash guvohnomasi</h2>
        {LEVELS.map((l) => (
          <Button key={l} size="sm" variant={l === level ? 'primary' : 'secondary'} aria-pressed={l === level} onClick={() => { setLevel(l); setUrl(null) }}>
            {l}
          </Button>
        ))}
      </div>
      <p className="text-sm muted">{CERTIFICATE_DISCLAIMER_UZ}</p>
      <div className="flex flex-wrap gap-1.5">
        <Chip tone={info.eligible ? 'ok' : 'default'}>
          {info.daysDone}/{info.daysTotal} kun yakunlangan
        </Chip>
        <Chip>{info.attempts} ta mashq</Chip>
        {info.accuracy !== null && <Chip>aniqlik {info.accuracy}%</Chip>}
        <Chip>{info.wordsLearned} ta so‘z</Chip>
        <Chip>
          «Men qila olaman»: {info.canDoConfirmed}/{info.canDoTotal}
        </Chip>
      </div>
      {!info.eligible ? (
        <InfoBanner tone="muted">
          Guvohnoma {level} darajasining barcha {info.daysTotal} kuni O‘quv yo‘lida yakunlangach ochiladi (yana{' '}
          {info.daysTotal - info.daysDone} kun).
        </InfoBanner>
      ) : (
        <div className="grid gap-2">
          <label className="grid gap-1 text-sm font-semibold" htmlFor="cert-name">
            Guvohnomadagi ism (faqat shu qurilmada)
            <input id="cert-name" className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={make}>Guvohnomani yaratish</Button>
            {url && (
              <a href={url} download={`guvohnoma-${level}.png`} className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl border">
                PNG yuklab olish
              </a>
            )}
          </div>
          {error && <InfoBanner tone="warn">{error}</InfoBanner>}
          {url && <img src={url} alt={`${level} darajasi yakunlash guvohnomasi`} className="w-full rounded-xl border" />}
        </div>
      )}
    </Card>
  )
}
