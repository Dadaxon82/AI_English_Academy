/**
 * VIDEO SHORT pleyeri (gorizontal 16:9) — Memrise «Learn with Locals» g'oyasi, bizning qoidalar bilan.
 *
 * Ikki rejim, ikkalasi ham OCHIQ belgilanadi:
 *  - «Video» — `public/video/manifest.json` da shu short uchun haqiqiy klip bo'lsa
 *    (kim gapirgani va litsenziyasi yoziladi);
 *  - «Animatsion · sintez ovoz» — sahna + personajlar, ovoz qurilmaning ingliz TTS'i,
 *    aytilayotgan so'z subtitrda yonadi.
 *
 * Subtitr `revealed` bo'lmaguncha yopiq (avval quloq bilan — Memrise kabi). TTS
 * ishlamasa — buni aytamiz va subtitrni ochamiz (ovozsiz «video» ko'rsatilmaydi).
 */
import { useEffect, useRef, useState } from 'react'
import type { Short } from '../content/shorts'
import { loadVideoManifest, speakWithWords, splitWords, ttsSupported, type ShortVideoItem } from '../lib/shortPlayback'
import UzTranslation from './UzTranslation'
import { roleEmoji, sceneOf } from './shortScene'

type Phase = 'ready' | 'playing' | 'done' | 'no-tts'

export default function ShortPlayer({ short, revealed, autoPlay = false }: { short: Short; revealed: boolean; autoPlay?: boolean }) {
  const [video, setVideo] = useState<ShortVideoItem | null>(null)
  const [phase, setPhase] = useState<Phase>(() => (ttsSupported() ? 'ready' : 'no-tts'))
  const [word, setWord] = useState(-1)
  const [slow, setSlow] = useState(false)
  const stopRef = useRef<() => void>(() => {})
  const words = splitWords(short.en)
  const scene = sceneOf(short.dialogueId)

  // Haqiqiy video bormi (bir marta, keshlanadi)
  useEffect(() => {
    let alive = true
    void loadVideoManifest().then((m) => alive && setVideo(m.get(short.id) ?? null))
    return () => {
      alive = false
    }
  }, [short.id])

  // Short almashsa yoki sahifa yopilsa — ovoz to'xtaydi
  useEffect(() => () => stopRef.current(), [short.id])

  const play = () => {
    stopRef.current()
    setWord(0)
    setPhase('playing')
    stopRef.current = speakWithWords(
      short.en,
      { rate: slow ? 0.7 : 0.95, pitch: short.learnerSpeaks ? 0.95 : 1.12 },
      {
        onWord: setWord,
        onEnd: () => {
          setPhase('done')
          setWord(-1)
        },
        onError: () => {
          setPhase('no-tts')
          setWord(-1)
        },
      },
    )
  }

  // Avtomatik ijro — faqat foydalanuvchi sahifada allaqachon nimanidir bosgan bo'lsa
  // (brauzerlar ovozni imo-ishorasiz bloklaydi).
  const autoRef = useRef(false)
  useEffect(() => {
    if (!autoPlay || autoRef.current || video) return
    const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }
    if (!nav.userActivation?.hasBeenActive || !ttsSupported()) return
    autoRef.current = true
    const t = setTimeout(play, 250)
    return () => clearTimeout(t)
    // play — har renderda yangi; faqat short almashganda ishga tushadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, short.id, video])

  const captionsOpen = revealed || phase === 'no-tts'
  const speaking = phase === 'playing'

  return (
    <figure className="grid gap-2 justify-items-center" aria-label={`Video short: ${short.speaker}`}>
      <div
        className={`relative w-full max-w-2xl aspect-video overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br ${scene.bg} text-white`}
      >
        {video ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={video.src}
            poster={video.poster}
            controls
            playsInline
            preload="metadata"
            aria-label={`${short.speaker}: haqiqiy video`}
            onEnded={() => setPhase('done')}
          />
        ) : (
          <>
            {/* Sahna */}
            <span aria-hidden className="absolute right-2 top-1 text-[4.5rem] sm:text-[8rem] leading-none opacity-25 select-none">
              {scene.emoji}
            </span>
            <span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold">
              {scene.emoji} {scene.labelUz}
            </span>
            {/* Personajlar: gapirayotgani oldinda, kattaroq */}
            <div className="absolute inset-x-0 top-[10%] sm:top-[20%] flex items-end justify-center gap-6 sm:gap-12 px-3">
              <Character
                active={!short.learnerSpeaks}
                speaking={speaking && !short.learnerSpeaks}
                label={short.learnerSpeaks ? short.listener : short.speaker}
                emoji={roleEmoji(short.learnerSpeaks ? short.listener : short.speaker)}
              />
              <Character active={short.learnerSpeaks} speaking={speaking && short.learnerSpeaks} label="Siz" mascot />
            </div>
          </>
        )}

        {/* Subtitr hududi */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-6 sm:px-4 sm:pb-3 bg-gradient-to-t from-black/80 via-black/55 to-transparent">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">{short.speaker}</p>
          {captionsOpen ? (
            <p className="text-sm sm:text-lg font-bold leading-snug" lang="en">
              {words.map((w, i) => (
                <span key={i} className={i === word ? 'rounded bg-yellow-300 px-0.5 text-black' : undefined}>
                  {w}
                  {i < words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1 py-1" aria-label="Subtitr javobdan keyin oçiladi">
              {words.map((_, i) => (
                <span key={i} aria-hidden className={`h-2.5 w-6 rounded-full ${i <= word ? 'bg-yellow-300' : 'bg-white/35'}`} />
              ))}
            </div>
          )}
          {revealed && (
            <p className="mt-1 text-sm text-white/90">
              <UzTranslation>{short.uz}</UzTranslation>
            </p>
          )}
        </div>

        {/* Ijro: butun oyna — video pleyerlardagidek (personajlarni to'smaydi) */}
        {!video && phase !== 'no-tts' && !speaking && (
          <button
            type="button"
            onClick={play}
            className="group absolute inset-0 grid place-items-center bg-black/20 transition-colors hover:bg-black/10 focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-yellow-300"
            aria-label={phase === 'done' ? 'Shortni qayta köriş' : 'Shortni köriş'}
          >
            <span className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full bg-white/90 text-indigo-800 shadow-xl transition-transform group-hover:scale-105">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                {phase === 'done' ? <path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z" /> : <path d="M8 5v14l11-7z" />}
              </svg>
            </span>
          </button>
        )}
      </div>

      {/* Boshqaruv va ochiq belgilar */}
      <figcaption className="grid gap-1.5 justify-items-center text-center">
        {!video && phase !== 'no-tts' && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setSlow((s) => !s)}
              aria-pressed={slow}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${slow ? 'bg-indigo-700 text-white border-indigo-700 dark:bg-indigo-300 dark:text-indigo-950' : ''}`}
            >
              🐢 Sekin
            </button>
            {speaking && (
              <button type="button" onClick={() => { stopRef.current(); setPhase('done'); setWord(-1) }} className="rounded-full border px-3 py-1 text-xs font-semibold">
                ⏹ Töxtatiş
              </button>
            )}
          </div>
        )}
        {video ? (
          <p className="text-[11px] muted">
            Video · {video.speakerUz || 'ona tilida sözlaşuvçi'} · {video.license}
          </p>
        ) : phase === 'no-tts' ? (
          <p className="text-xs text-amber-800 dark:text-amber-300" role="status">
            Bu qurilmada ingliz ovozi (nutq sintezi) işlamadi — subtitr oçiq. Chrome yoki Safari'da ovoz bilan körsatiladi.
          </p>
        ) : (
          <p className="text-[11px] muted">Animatsion short · ovoz: qurilmangizning ingliz nutq sintezi</p>
        )}
        {!revealed && phase !== 'no-tts' && <p className="text-[11px] muted">Subtitr javobdan keyin oçiladi.</p>}
      </figcaption>
    </figure>
  )
}

function Character({ active, speaking, label, emoji, mascot }: { active: boolean; speaking: boolean; label: string; emoji?: string; mascot?: boolean }) {
  return (
    <div className={`grid justify-items-center gap-1 transition-all duration-300 ${active ? 'opacity-100' : 'opacity-60 scale-90'}`}>
      <div
        className={`grid place-items-center rounded-full bg-white/15 ring-2 ${speaking ? 'ring-yellow-300 motion-safe:animate-[short-talk_0.5s_ease-in-out_infinite]' : 'ring-white/30'} ${active ? 'h-16 w-16 sm:h-28 sm:w-28' : 'h-12 w-12 sm:h-20 sm:w-20'}`}
      >
        {mascot ? (
          <img src={`${import.meta.env.BASE_URL}mascot/mascot-avatar-128.png`} alt="" className="h-[80%] w-[80%] object-contain" />
        ) : (
          <span aria-hidden className={active ? 'text-4xl sm:text-7xl' : 'text-2xl sm:text-5xl'}>
            {emoji}
          </span>
        )}
      </div>
      <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold">{label}</span>
    </div>
  )
}
