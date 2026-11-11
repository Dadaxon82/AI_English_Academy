/** Plitkali javoblar: so'z yig'ish, juftlik, tarjima. */
import { useMemo, useState } from 'react'
import type { Exercise, PronunciationSource } from '../../content/types'
import { inputCls } from '../ui'
import { shuffle, translationBank } from './helpers'
import { cardCls, cardOn, tileCls } from './styles'
/**
 * So'z plitkalari: yuqorida chiziqlar ustida tanlangan so'zlar (bosilsa
 * qaytadi), pastda bank — ishlatilgan plitka o'rnida bo'sh "soya" qoladi.
 */
export function TileBuilder({
  bank,
  chosen,
  onChange,
  locked,
  note,
}: {
  bank: readonly string[]
  chosen: string[]
  onChange: (v: string[]) => void
  locked: boolean
  note?: string
}) {
  // Har bank indeksi ishlatilganmi (bir xil so'z ikki marta bo'lsa ham to'g'ri).
  const usedIdx = new Set<number>()
  for (const w of chosen) {
    const i = bank.findIndex((b, j) => b === w && !usedIdx.has(j))
    if (i > -1) usedIdx.add(i)
  }
  return (
    <div className="grid gap-5">
      <div
        className="min-h-[6.5rem] flex flex-wrap content-start gap-2 py-1.5 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_3rem,var(--border)_3rem,var(--border)_calc(3rem+2px))]"
        aria-label="Javob"
      >
        {chosen.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            disabled={locked}
            onClick={() => onChange(chosen.filter((_, j) => j !== i))}
            className={`${tileCls} hover:bg-[var(--panel-2)]`}
            title="Olib taşlaş"
          >
            {w}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {bank.map((w, i) =>
          usedIdx.has(i) ? (
            <span key={`${w}-${i}`} aria-hidden className="inline-flex rounded-xl px-3 py-1.5 text-sm sm:text-base bg-[var(--panel-2)] text-transparent select-none border-2 border-transparent">
              {w}
            </span>
          ) : (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={locked}
              onClick={() => onChange([...chosen, w])}
              className={`${tileCls} hover:bg-[var(--panel-2)]`}
            >
              {w}
            </button>
          ),
        )}
      </div>
      {note && <p className="text-[11px] muted text-center">{note}</p>}
    </div>
  )
}

/** Juftlik: ikki ustun plitkalar — chapdan bittasini, so'ng o'ngdan juftini bosing. */
export function MatchingInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'matching' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const map = (answer ?? {}) as Record<string, string>
  const rights = useMemo(() => shuffle(exercise.pairs.map((p) => p.right), exercise.id), [exercise])
  const [pick, setPick] = useState<string | null>(null)
  const lefts = exercise.pairs.map((p) => p.left)
  const pairNo = (left: string) => lefts.filter((l) => map[l]).indexOf(left) + 1
  const leftOfRight = (r: string) => lefts.find((l) => map[l] === r)

  const tapLeft = (l: string) => {
    if (map[l]) {
      const next = { ...map }
      delete next[l]
      onChange(next)
      setPick(null)
      return
    }
    setPick(pick === l ? null : l)
  }
  const tapRight = (r: string) => {
    const owner = leftOfRight(r)
    if (owner) {
      const next = { ...map }
      delete next[owner]
      onChange(next)
      return
    }
    if (!pick) return
    onChange({ ...map, [pick]: r })
    setPick(null)
  }

  const tone = (paired: boolean, picked: boolean) =>
    picked ? cardOn : paired ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-600' : 'hover:bg-[var(--panel-2)]'

  return (
    <div className="grid gap-2">
      <p className="text-xs muted text-center">Çapdan sözni, söng öngdan uning juftini bosing. Juftni bekor qiliş uçun yana bosing.</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-2.5 content-start">
          {lefts.map((l) => (
            <button
              key={l}
              type="button"
              disabled={locked}
              aria-pressed={pick === l || Boolean(map[l])}
              aria-label={map[l] ? `${l} — ${map[l]} bilan juftlangan` : l}
              onClick={() => tapLeft(l)}
              className={`${cardCls} justify-center ${tone(Boolean(map[l]), pick === l)}`}
            >
              {map[l] && <span className="text-xs font-extrabold text-sky-600">{pairNo(l)}</span>}
              <span className="text-center break-words">{l}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-2.5 content-start">
          {rights.map((r) => {
            const owner = leftOfRight(r)
            return (
              <button
                key={r}
                type="button"
                disabled={locked || (!pick && !owner)}
                aria-pressed={Boolean(owner)}
                onClick={() => tapRight(r)}
                className={`${cardCls} justify-center ${tone(Boolean(owner), false)}`}
              >
                {owner && <span className="text-xs font-extrabold text-sky-600">{pairNo(owner)}</span>}
                <span className="text-center break-words">{r}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Tinglab juftlashtirish — Duolingo "Выберите пары слов" ko'rinishi: chapda
 * raqamlangan tovush kartalari (bosilganda talaffuz o'qiladi — audio fayl
 * bo'lsa u, aks holda brauzer TTS; ikkisi ham yo'q bo'lsa so'z matni o'zi
 * xira ko'rinishda ko'rsatiladi — "hech qanday tugma dekoratsiya bo'lmasin"
 * qoidasiga mos, ovozsiz holatda ham mashq bajarib bo'ladi), o'ngda
 * raqamlangan aralashtirilgan tarjima kartalari. Juftlik — `MatchingInput`
 * bilan bir xil mexanika (chapdan, so'ng o'ngdan bosish).
 */
export function AudioMatchingInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'audio-matching' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const map = (answer ?? {}) as Record<string, string>
  const rights = useMemo(() => shuffle(exercise.pairs.map((p) => p.right), exercise.id), [exercise])
  const [pick, setPick] = useState<string | null>(null)
  const lefts = exercise.pairs.map((p) => p.left)
  const pairNo = (word: string) => lefts.filter((l) => map[l.word]).map((l) => l.word).indexOf(word) + 1
  const leftOfRight = (r: string) => lefts.find((l) => map[l.word] === r)

  const tapLeft = (word: string) => {
    if (map[word]) {
      const next = { ...map }
      delete next[word]
      onChange(next)
      setPick(null)
      return
    }
    setPick(pick === word ? null : word)
  }
  const tapRight = (r: string) => {
    const owner = leftOfRight(r)
    if (owner) {
      const next = { ...map }
      delete next[owner.word]
      onChange(next)
      return
    }
    if (!pick) return
    onChange({ ...map, [pick]: r })
    setPick(null)
  }

  const tone = (paired: boolean, picked: boolean) =>
    picked ? cardOn : paired ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-600' : 'hover:bg-[var(--panel-2)]'

  return (
    <div className="grid gap-2">
      <p className="text-xs muted text-center">Tovuşni tinglang, söng möslaşadigan sözni bosing.</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-2.5 content-start">
          {lefts.map((l) => (
            <AudioMatchCard
              key={l.word}
              word={l.word}
              pronunciation={l.pronunciation}
              paired={Boolean(map[l.word])}
              picked={pick === l.word}
              locked={locked}
              pairNo={map[l.word] ? pairNo(l.word) : undefined}
              onClick={() => tapLeft(l.word)}
              toneCls={tone(Boolean(map[l.word]), pick === l.word)}
            />
          ))}
        </div>
        <div className="grid gap-2.5 content-start">
          {rights.map((r) => {
            const owner = leftOfRight(r)
            return (
              <button
                key={r}
                type="button"
                disabled={locked || (!pick && !owner)}
                aria-pressed={Boolean(owner)}
                onClick={() => tapRight(r)}
                className={`${cardCls} justify-center ${tone(Boolean(owner), false)}`}
              >
                {owner && <span className="text-xs font-extrabold text-sky-600">{pairNo(owner.word)}</span>}
                <span className="text-center break-words">{r}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Audio-matching'dagi bitta "tovush" kartasi. Audio fayl (`pronunciation.src`)
 * bo'lsa u o'ynatiladi, bo'lmasa brauzer TTS (`speechSynthesis`) so'zni
 * o'qiydi; ikkisi ham mavjud bo'lmasa karnay tugmasi ko'rsatilmaydi va so'z
 * matnining o'zi ko'rinadi (dekorativ tugma qoldirmaslik qoidasi).
 */
function AudioMatchCard({
  word,
  pronunciation,
  paired,
  picked,
  locked,
  pairNo,
  onClick,
  toneCls,
}: {
  word: string
  pronunciation?: PronunciationSource
  paired: boolean
  picked: boolean
  locked: boolean
  pairNo?: number
  onClick: () => void
  toneCls: string
}) {
  const [playing, setPlaying] = useState(false)
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const canPlay = pronunciation?.kind === 'audio-file' ? Boolean(pronunciation.src) : ttsSupported
  const revealWord = !canPlay || paired || picked

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (pronunciation?.kind === 'audio-file' && pronunciation.src) {
      const audio = new Audio(pronunciation.src)
      setPlaying(true)
      audio.onended = () => setPlaying(false)
      audio.onerror = () => setPlaying(false)
      void audio.play().catch(() => setPlaying(false))
      return
    }
    if (ttsSupported) {
      const u = new SpeechSynthesisUtterance(pronunciation?.ttsText ?? word)
      u.lang = pronunciation?.lang ?? 'en-US'
      u.rate = 0.92
      u.onstart = () => setPlaying(true)
      u.onend = () => setPlaying(false)
      u.onerror = () => setPlaying(false)
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    }
  }

  return (
    <button
      type="button"
      disabled={locked}
      aria-pressed={picked || paired}
      aria-label={paired ? `${word} — juftlaştirilgan` : word}
      onClick={onClick}
      className={`${cardCls} justify-center ${toneCls}`}
    >
      {paired && <span className="text-xs font-extrabold text-sky-600">{pairNo}</span>}
      {canPlay && (
        <span
          role="button"
          tabIndex={-1}
          onClick={speak}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-navy-600 dark:bg-navy-500 text-white shrink-0"
          title="Tinglaş"
          aria-hidden
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            {playing ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
          </svg>
        </span>
      )}
      {revealWord ? (
        <span className="text-center break-words">{word}</span>
      ) : (
        <span className="flex-1 flex items-center justify-center gap-0.5" aria-hidden>
          {[3, 6, 4, 7, 5, 3].map((h, i) => (
            <span key={i} className="w-0.5 rounded-full bg-[var(--line)]" style={{ height: h * 2 }} />
          ))}
        </span>
      )}
    </button>
  )
}

/**
 * Tarjima: standart — so'z plitkalari (birinchi qabul qilinadigan javob
 * so'zlari + shu darajadagi lug'atdan 2–3 chalg'ituvchi so'z, deterministik).
 * "Klaviatura bilan yozish" — erkin matn (boshqa to'g'ri variantlar uchun).
 */
export function TranslationInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'translation' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const [typing, setTyping] = useState(false)
  const bank = useMemo(() => translationBank(exercise), [exercise])
  const text = Array.isArray(answer) ? String(answer[0] ?? '') : String(answer ?? '')
  const chosen = text.trim() === '' ? [] : text.trim().split(/\s+/)

  return (
    <div className="grid gap-3">
      {typing || bank.length === 0 ? (
        <textarea
          className={`${inputCls} min-h-28 text-base rounded-2xl border-2`}
          value={text}
          disabled={locked}
          aria-label="Tarjima"
          placeholder={exercise.sourceLang === 'uz' ? 'Write in English…' : "Özbekça yozing…"}
          onChange={(e) => onChange([e.target.value])}
        />
      ) : (
        <TileBuilder bank={bank} chosen={chosen} onChange={(ws) => onChange([ws.join(' ')])} locked={locked} />
      )}
      {!locked && bank.length > 0 && (
        <button
          type="button"
          className="justify-self-center text-xs font-extrabold uppercase tracking-wide text-navy-700 dark:text-navy-300 hover:underline"
          onClick={() => {
            setTyping((v) => !v)
            onChange([''])
          }}
        >
          {typing ? 'Söz plitkalari bilan' : 'Klaviatura bilan yoziş'}
        </button>
      )}
    </div>
  )
}
