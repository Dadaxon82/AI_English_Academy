/**
 * Short ijrosi: qurilmaning ingliz nutq sintezi (TTS) + so'zma-so'z
 * subtitr (karaoke) va haqiqiy video manifesti.
 *
 * - TTS `boundary` hodisasi kelsa — aynan o'sha so'z yonadi; kelmasa (ba'zi
 *   brauzer/ovozlar) — so'zlar taxminiy tezlikda yonadi (taymer).
 * - TTS umuman yo'q yoki xato bersa — `onError`: pleyer buni ochiq aytadi va
 *   subtitrni ko'rsatadi (ovozsiz «video» ko'rsatilmaydi).
 * - Haqiqiy video: `public/video/manifest.json` (`items: [{ shortId, src, … }]`).
 */
import { assetUrl } from './audio'

/** Taymer rejimida bir so'z uchun soniya (rate = 1). */
export const SECONDS_PER_WORD = 0.42

export function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

/** Har so'zning matndagi boshlanish indeksi (boundary `charIndex` → so'z raqami). */
export function wordStarts(text: string): number[] {
  const out: number[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push(m.index)
  return out
}

/** `charIndex` qaysi so'zga tushadi (oxirgi boshlanishi ≤ charIndex bo'lgan so'z). */
export function wordAt(starts: readonly number[], charIndex: number): number {
  let lo = 0
  let hi = starts.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (starts[mid]! <= charIndex) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return ans
}

export function estimateSeconds(text: string, rate: number): number {
  return Math.max(1.2, (splitWords(text).length * SECONDS_PER_WORD) / Math.max(0.5, rate))
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
}

export interface SpeakHandlers {
  onWord(index: number): void
  onEnd(): void
  onError(): void
}

/**
 * Matnni aytadi. Qaytadi: to'xtatish funksiyasi. `pitch` — rollarni farqlash
 * uchun (suhbatdosh / o'quvchi ovozi biroz farqli).
 */
export function speakWithWords(text: string, opts: { rate: number; pitch: number }, h: SpeakHandlers): () => void {
  if (!ttsSupported()) {
    h.onError()
    return () => {}
  }
  const synth = window.speechSynthesis
  const starts = wordStarts(text)
  const n = starts.length
  let stopped = false
  let gotBoundary = false
  let timer: ReturnType<typeof setInterval> | null = null
  const perWordMs = (SECONDS_PER_WORD / Math.max(0.5, opts.rate)) * 1000

  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = opts.rate
  u.pitch = opts.pitch
  const voice = pickEnglishVoice(synth.getVoices())
  if (voice) u.voice = voice
  u.onstart = () => {
    if (stopped) return
    h.onWord(0)
    let i = 0
    timer = setInterval(() => {
      if (gotBoundary || stopped) return
      i = Math.min(n - 1, i + 1)
      h.onWord(i)
    }, perWordMs)
  }
  u.onboundary = (e: SpeechSynthesisEvent) => {
    if (stopped || (e.name && e.name !== 'word')) return
    gotBoundary = true
    h.onWord(wordAt(starts, e.charIndex))
  }
  const finish = (ok: boolean) => {
    if (timer) clearInterval(timer)
    timer = null
    if (stopped) return
    stopped = true
    if (ok) h.onEnd()
    else h.onError()
  }
  u.onend = () => finish(true)
  u.onerror = (e: SpeechSynthesisErrorEvent) => {
    // `interrupted`/`canceled` — foydalanuvchi o'zi to'xtatdi, xato emas.
    if (e.error === 'interrupted' || e.error === 'canceled') finish(true)
    else finish(false)
  }
  synth.cancel()
  synth.speak(u)
  return () => {
    stopped = true
    if (timer) clearInterval(timer)
    synth.cancel()
  }
}

/** Ingliz ovozi: avval en-US, keyin istalgan en-*. Bo'lmasa — brauzer o'zi tanlaydi. */
export function pickEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang?.toLowerCase().startsWith('en'))
}

/* ------------------------------ haqiqiy video ------------------------------ */

export interface ShortVideoItem {
  shortId: string
  /** `video/…mp4` (public ichida) yoki to'liq https manzil */
  src: string
  poster?: string
  /** Kim gapiradi (masalan «Emma, London») — ochiq ko'rsatiladi */
  speakerUz: string
  /** Litsenziya / ruxsat (masalan «Muallif roziligi bilan, 2026») */
  license: string
}

let manifest: Promise<Map<string, ShortVideoItem>> | null = null

export function parseVideoManifest(json: unknown): Map<string, ShortVideoItem> {
  const out = new Map<string, ShortVideoItem>()
  const items = (json as { items?: unknown })?.items
  if (!Array.isArray(items)) return out
  for (const raw of items) {
    const it = raw as Partial<ShortVideoItem>
    if (typeof it.shortId !== 'string' || typeof it.src !== 'string' || typeof it.license !== 'string' || !it.license.trim()) continue
    if (!/^(https:\/\/|video\/)[^\s"']+\.(mp4|webm)$/i.test(it.src)) continue
    out.set(it.shortId, {
      shortId: it.shortId,
      src: it.src.startsWith('https://') ? it.src : assetUrl(it.src),
      poster: typeof it.poster === 'string' && /^(https:\/\/|video\/)\S+$/.test(it.poster) ? (it.poster.startsWith('https://') ? it.poster : assetUrl(it.poster)) : undefined,
      speakerUz: typeof it.speakerUz === 'string' ? it.speakerUz : '',
      license: it.license,
    })
  }
  return out
}

/** Manifest bir marta o'qiladi; o'qib bo'lmasa — bo'sh (animatsion short ishlatiladi). */
export function loadVideoManifest(fetcher: typeof fetch = fetch): Promise<Map<string, ShortVideoItem>> {
  manifest ??= fetcher(assetUrl('/video/manifest.json'), { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then(parseVideoManifest)
    .catch(() => new Map<string, ShortVideoItem>())
  return manifest
}

/** Faqat testlar uchun. */
export function resetVideoManifest(): void {
  manifest = null
}
