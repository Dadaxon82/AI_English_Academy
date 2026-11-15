/**
 * Tinglab bajariladigan mashqlar: «Что вы услышали?» (so'z/gap yig'ish),
 * «Введите пропущенное слово» (yozib to'ldirish), «Послушайте и заполните
 * пропуск» (audio variantlardan tanlash).
 *
 * Audio: fayl (`PronunciationSource.kind === 'audio-file'`) bo'lsa u, aks
 * holda brauzer TTS (`speechSynthesis`). Ikkisi ham yo'q qurilmalarda
 * (`!canPlay`) karnay tugmasi ko'rsatilmaydi va bo'sh joyda shu haqda
 * ogohlantirish chiqadi — audio YO'Q bo'lsa o'quvchi mashqni bajara olmay
 * qolmasin, deb matn/TTS fallback orqali yana tinglash imkoni qoladi
 * ("hech qanday tugma dekoratsiya bo'lmasin" qoidasi).
 */
import { useState } from 'react'
import type { Exercise, PronunciationSource } from '../../content/types'
import { cardCls, cardOn } from './styles'
import { TileBuilder } from './tileInputs'

/** TTS yoki audio-fayl bilan matnni o'qiydigan karnay tugmasi (katta, markazlashtirilgan). */
export function PlayAudioButton({
  pronunciation,
  text,
  label = 'Tinglaş',
}: {
  pronunciation?: PronunciationSource
  text: string
  label?: string
}) {
  const [playing, setPlaying] = useState(false)
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const canPlay = pronunciation?.kind === 'audio-file' ? Boolean(pronunciation.src) : ttsSupported

  const speak = () => {
    if (pronunciation?.kind === 'audio-file' && pronunciation.src) {
      const audio = new Audio(pronunciation.src)
      setPlaying(true)
      audio.onended = () => setPlaying(false)
      audio.onerror = () => setPlaying(false)
      void audio.play().catch(() => setPlaying(false))
      return
    }
    if (ttsSupported) {
      const u = new SpeechSynthesisUtterance(pronunciation?.ttsText ?? text)
      u.lang = pronunciation?.lang ?? 'en-US'
      u.rate = 0.92
      u.onstart = () => setPlaying(true)
      u.onend = () => setPlaying(false)
      u.onerror = () => setPlaying(false)
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    }
  }

  if (!canPlay) {
    return <p className="text-xs muted text-center">Bu qurilmada audio ösh (TTS yöq) — matn pastda ko'rinadi.</p>
  }

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={label}
      title={label}
      className={`justify-self-center inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy-600 dark:bg-navy-500 text-white ${
        playing ? 'animate-pulse' : 'hover:bg-navy-700 dark:hover:bg-navy-400'
      }`}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" />
      </svg>
    </button>
  )
}

/**
 * «Что вы услышали?» — audio (yoki TTS) o'ynatiladi, o'quvchi pastdagi
 * plitkalardan eshitgan so'zlarni TARTIB bilan yig'adi. Audio umuman
 * bo'lmasa (fallback banner ko'rsatilgandan keyin ham) to'g'ri javob
 * matnining o'zi `targetText` sifatida TTS'ga uzatiladi — qurilmada ovoz
 * bo'lmasa ham plitkalar bank'i o'zgarmaydi, o'quvchi baribir ishlay oladi.
 */
export function ListeningSelectInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'listening-select' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const chosen = Array.isArray(answer) ? (answer as string[]) : []
  return (
    <div className="grid gap-4">
      <PlayAudioButton pronunciation={exercise.pronunciation} text={exercise.targetText} />
      <TileBuilder bank={exercise.bank} chosen={chosen} onChange={onChange} locked={locked} />
    </div>
  )
}

/**
 * «Введите пропущенное слово» — gap TTS orqali o'qiladi (`audioText`,
 * bo'shliqsiz), o'quvchi bo'shliqqa (`text` ichidagi `___`) klaviaturadan
 * javob yozadi. Transkript oldindan ko'rsatilmaydi — faqat audio tugmasi.
 */
export function ListeningFillInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'listening-fill' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const text = Array.isArray(answer) ? String(answer[0] ?? '') : ''
  const parts = exercise.text.split('___')
  return (
    <div className="grid gap-4">
      <PlayAudioButton text={exercise.audioText} />
      <p className="text-base sm:text-lg leading-[2.6rem] font-medium text-center">
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 && (
              <input
                className="inline-block w-28 mx-1 px-2 py-0.5 text-center font-bold bg-transparent border-0 border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none"
                value={text}
                disabled={locked}
                aria-label="Böşliq"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => onChange([e.target.value])}
                placeholder="…"
              />
            )}
          </span>
        ))}
      </p>
    </div>
  )
}

/**
 * «Послушайте и заполните пропуск» — to'liq gap TTS orqali o'qiladi
 * (`audioText`), o'quvchi bo'shliqni to'ldiruvchi so'zni 2 (yoki ko'proq)
 * AUDIO variantdan tanlaydi — variantlarning matni oldindan ko'rinmaydi,
 * faqat raqamlangan karnay tugmalari (har biri alohida TTS bilan o'qiladi).
 */
export function ListeningChoiceInput({
  exercise,
  answer,
  onChange,
  locked,
}: {
  exercise: Extract<Exercise, { kind: 'listening-choice' }>
  answer: unknown
  onChange: (v: unknown) => void
  locked: boolean
}) {
  const chosen = typeof answer === 'number' ? answer : -1
  return (
    <div className="grid gap-4">
      <PlayAudioButton text={exercise.audioText} label="Gapni tinglaş" />
      <p className="text-sm muted text-center" lang="en">
        {exercise.text}
      </p>
      <div className="grid gap-2.5" role="radiogroup" aria-label="Audio variantlar">
        {exercise.options.map((opt, i) => {
          const on = chosen === i
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={locked}
              onClick={() => onChange(i)}
              className={`${cardCls} ${on ? cardOn : 'hover:bg-[var(--panel-2)]'}`}
            >
              <span className="inline-grid place-items-center w-7 h-7 rounded-full border-2 text-xs font-extrabold shrink-0">{i + 1}</span>
              <ListeningOptionPlayer text={opt} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Variant ichidagi kichik karnay — bosilsa o'sha variantning TTS'i o'ynaydi (tashqi tanlovdan mustaqil). */
function ListeningOptionPlayer({ text }: { text: string }) {
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const play = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!ttsSupported) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.92
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }
  return (
    <span className="flex-1 flex items-center justify-center gap-2">
      {ttsSupported ? (
        <span role="button" tabIndex={-1} onClick={play} className="inline-flex items-center gap-1.5" title="Tinglaş">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span aria-hidden className="flex items-center gap-0.5">
            {[3, 6, 4, 7, 5, 3].map((h, i) => (
              <span key={i} className="w-0.5 rounded-full bg-[var(--line)]" style={{ height: h * 2 }} />
            ))}
          </span>
        </span>
      ) : (
        <span lang="en">{text}</span>
      )}
    </span>
  )
}
