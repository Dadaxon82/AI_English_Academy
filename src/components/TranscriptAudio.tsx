/**
 * Audio fayli hali yo'q tinglash topshirig'i: transkript qurilmaning nutq
 * sintezi (TTS) bilan rollar bo'yicha o'qiladi, matn esa YASHIRIN — aks holda
 * javob ekranda turadi va mashq tinglash emas, o'qish bo'lib qoladi.
 *
 * Manba ochiq aytiladi: «ovoz: qurilmangizning nutq sintezi». TTS bo'lmasa —
 * transkript ochiq ko'rsatiladi (oldingi xatti-harakat).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, InfoBanner } from './ui'
import type { TranscriptSegment } from '../content/types'
import { speakDialogue, splitSpeaker, ttsSupported } from '../lib/speech'

const RATES = [
  { value: 0.9, label: 'Odatiy' },
  { value: 0.7, label: 'Sekin' },
] as const

export default function TranscriptAudio({
  transcript,
  title,
  onFirstListen,
  withText = true,
}: {
  transcript: readonly TranscriptSegment[]
  title: string
  /** Birinchi tinglash (transkript siyosati uchun). */
  onFirstListen?: () => void
  /** Matnni ko'rsatish tugmasi (sahifaning o'z transkript bo'limi bo'lsa — false). */
  withText?: boolean
}) {
  const lines = useMemo(() => transcript.map((t) => splitSpeaker(t.text)), [transcript])
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const [rate, setRate] = useState<number>(RATES[0].value)
  const [shown, setShown] = useState(false)
  const [listened, setListened] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)

  // Darsdan chiqqanda ovoz to'xtaydi.
  useEffect(() => () => stopRef.current?.(), [])

  if (!ttsSupported()) {
    if (!withText) return null
    return (
      <div className="grid gap-2">
        <InfoBanner tone="warn">Bu qurilmada nutq sintezi yöq va audio fayl hali yaratilmagan — transkript bilan işlang.</InfoBanner>
        <Transcript lines={lines} current={null} />
      </div>
    )
  }

  const play = () => {
    stopRef.current?.()
    setPlaying(true)
    if (!listened) onFirstListen?.()
    setListened(true)
    stopRef.current = speakDialogue(lines, {
      rate,
      onLine: (i) => setCurrent(i),
      onEnd: () => {
        setPlaying(false)
        setCurrent(null)
      },
    })
  }
  const stop = () => {
    stopRef.current?.()
    stopRef.current = null
    setPlaying(false)
    setCurrent(null)
  }

  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={playing ? stop : play} aria-label={playing ? 'Töxtatiş' : `Tinglaş: ${title}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
          </svg>
          {playing ? 'Töxtatiş' : listened ? 'Qayta tinglaş' : 'Tinglaş'}
        </Button>
        <div className="flex gap-1" role="group" aria-label="Tezlik">
          {RATES.map((r) => (
            <Button key={r.value} size="sm" variant={rate === r.value ? 'secondary' : 'ghost'} aria-pressed={rate === r.value} onClick={() => setRate(r.value)}>
              {r.label}
            </Button>
          ))}
        </div>
        <span className="flex-1" />
        {withText && (
          <Button size="sm" variant="ghost" aria-expanded={shown} onClick={() => setShown((v) => !v)}>
            {shown ? 'Matnni yaşiriş' : 'Matnni körsatiş'}
          </Button>
        )}
      </div>
      <p className="text-[11px] muted">Ovoz: qurilmangizning nutq sintezi (bu suhbat uçun audio fayl hali yöq). Avval matnsiz tinglang.</p>
      {withText && shown && <Transcript lines={lines} current={current} />}
    </div>
  )
}

function Transcript({ lines, current }: { lines: readonly { speaker: string | null; text: string }[]; current: number | null }) {
  return (
    <div className="grid gap-1.5 text-sm" lang="en">
      {lines.map((l, i) => (
        <p key={i} className={i === current ? 'font-semibold text-[var(--accent)]' : undefined}>
          {l.speaker && <span className="muted">{l.speaker}: </span>}
          {l.text}
        </p>
      ))}
    </div>
  )
}
