/**
 * TALAFFUZ MASHQI (g'oya: Rosetta Stone; usul va dizayn bizniki).
 *
 * Gapni tinglang (TTS) → ayting → brauzer tanigan matn namuna bilan
 * so'zma-so'z solishtiriladi: to'g'ri tanilgan so'zlar yashil, tushib
 * qolganlari qizil (ustidan chizilgan). Ball «taxminiy moslik» — rasmiy
 * talaffuz bahosi EMAS. Brauzer nutqni tanimasa ball chiqmaydi, sabab
 * aytiladi; tinglash baribir ishlaydi. Audio hech qayerga yuborilmaydi.
 */

import { trackUsage } from '../lib/usage'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Chip, InfoBanner, LoadingBlock, SpeakButton } from '../components/ui'
import UzTranslation from '../components/UzTranslation'
import type { CefrLevel } from '../content/types'
import { comparePronunciation, pronunciationSentences, type PronunciationResult } from '../lib/pronunciation'
import { useStore } from '../lib/storeContext'
import { SPEECH_UNSUPPORTED_UZ, useSpeechInput } from '../lib/useSpeechInput'

const LEVELS: CefrLevel[] = ['A1', 'A2']

export default function Pronunciation() {
  const { data, ready } = useStore()
  const [level, setLevel] = useState<CefrLevel>(LEVELS.includes(data.settings.currentLevel) ? data.settings.currentLevel : 'A1')
  const sentences = useMemo(() => pronunciationSentences(level), [level])
  const [idx, setIdx] = useState(0)
  const [said, setSaid] = useState<{ text: string; confidence: number | null } | null>(null)
  const [result, setResult] = useState<PronunciationResult | null>(null)
  const [tally, setTally] = useState<{ tries: number; sum: number }>({ tries: 0, sum: 0 })

  const target = sentences[idx]
  const speech = useSpeechInput((r) => {
    if (!target) return
    const res = comparePronunciation(target.en, r.text)
    setSaid(r)
    setResult(res)
    trackUsage('pronunciation', 'started')
    if (res.score >= 80) trackUsage('pronunciation', 'finished')
    setTally((t) => ({ tries: t.tries + 1, sum: t.sum + res.score }))
  })

  if (!ready) return <LoadingBlock label="Talaffuz maşqi tayyorlanmoqda…" />

  const go = (n: number) => {
    speech.stop()
    setIdx(((n % sentences.length) + sentences.length) % sentences.length)
    setSaid(null)
    setResult(null)
  }

  return (
    <div className="grid content-start gap-4">
      <Card className="grid gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold">Talaffuz maşqi</h1>
        <p className="text-sm muted">
          Gapni tinglang, söng ovoz çiqarib ayting. Brauzer tanigan sözlar namuna bilan soliştiriladi: yaşil — töğri tanildi,
          qizil — tanilmadi. Bu taxminiy moslik, rasmiy talaffuz bahosi emas. Audio heç qayerga yuborilmaydi.
        </p>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Daraja">
          {LEVELS.map((l) => (
            <Button
              key={l}
              size="sm"
              variant={l === level ? 'primary' : 'secondary'}
              aria-pressed={l === level}
              onClick={() => {
                setLevel(l)
                setIdx(0)
                setSaid(null)
                setResult(null)
              }}
            >
              {l}
            </Button>
          ))}
          {tally.tries > 0 && (
            <Chip>
              Bu sessiyada {tally.tries} uriniş · örtaça {Math.round(tally.sum / tally.tries)}%
            </Chip>
          )}
        </div>
        {!speech.supported && <InfoBanner tone="warn">{SPEECH_UNSUPPORTED_UZ} Tinglaş baribir işlaydi.</InfoBanner>}
      </Card>

      {target && (
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip>
              {idx + 1} / {sentences.length}
            </Chip>
            <span className="flex-1" />
            <SpeakButton text={target.en} label="Namunani tinglaş" size="md" />
          </div>

          <p className="text-xl sm:text-2xl font-bold leading-snug" aria-live="polite">
            {result
              ? result.words.map((w, i) => (
                  <span key={i}>
                    <span className={w.status === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300 line-through'}>
                      {w.text}
                    </span>{' '}
                  </span>
                ))
              : target.en}
          </p>
          <p className="text-sm muted">
            <UzTranslation>{target.uz}</UzTranslation>
          </p>

          <div className="flex flex-wrap gap-2">
            <Button size="lg" disabled={!speech.supported} onClick={speech.listening ? speech.stop : speech.start} aria-pressed={speech.listening}>
              {speech.listening ? '■ Tinglayapman…' : result ? '🎤 Qayta aytiş' : '🎤 Aytiş'}
            </Button>
            <Button variant="secondary" onClick={() => go(idx - 1)}>
              ← Oldingi
            </Button>
            <Button variant="secondary" onClick={() => go(idx + 1)}>
              Keyingi →
            </Button>
          </div>
          {speech.error && <InfoBanner tone="warn">{speech.error}</InfoBanner>}

          {result && said && (
            <div className="rounded-2xl border-2 p-3 grid gap-1.5" data-testid="pron-result">
              <p className="text-sm">
                Taxminiy moslik: <b>{result.score}%</b>
                {said.confidence !== null && <span className="muted"> · brauzer işonçi {Math.round(said.confidence * 100)}%</span>}
              </p>
              <p className="text-sm">
                Brauzer tanigani: <i>“{said.text}”</i>
              </p>
              {result.extra.length > 0 && <p className="text-xs muted">Namunada yöq sözlar: {result.extra.join(', ')}</p>}
              <p className="text-xs muted">
                Qizil sözni avval tinglang, keyin sekinroq va aniqroq ayting. Şovqinli joyda brauzer sözni notöğri tanişi mumkin.
              </p>
            </div>
          )}
        </Card>
      )}

      <p className="text-xs muted">
        Gaplar <Link to="/dialogues" className="underline font-semibold">real hayot suhbatlari</Link>dan olingan.
      </p>
    </div>
  )
}
