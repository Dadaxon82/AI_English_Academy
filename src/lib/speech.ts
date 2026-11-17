/**
 * Inglizcha matnni brauzer nutq sintezi (TTS) bilan o'qish — ilovadagi BARCHA
 * karnay tugmalari shu yerdan o'tadi.
 *
 * Nega kerak: ekrandagi matn o'qish uchun yozilgan, eshitish uchun emas.
 * TTS "two ___" ni «two underscore underscore underscore», "→" ni «right arrow»,
 * "(yonimda, yaqinda)" ni inglizcha talaffuz bilan o'qirdi. `speechText` faqat
 * eshitiladigan inglizcha qismni qoldiradi; ekrandagi matn o'zgarmaydi.
 */

/** Javob bo'shlig'i "___" — o'qituvchilar kabi «blank» deb aytiladi ("two ___" → "two blank"). */
const BLANK = /_{2,}/g
/** Davomi tushirilgan joy "…", "..." — o'qilmaydi, qisqa pauza. */
const ELLIPSIS = /…|\.{3,}/g
/** Qavs ichidagi izoh (ko'pincha o'zbekcha ishora yoki ekran uchun eslatma). */
const PAREN = /\s*\([^)]*\)/g
/** Emoji va piktogrammalar. */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|\u{FE0F}|\u{200D}/gu
/** TTS harfma-harf o'qishi kerak bo'lgan qisqartmalar — kichik harfga o'tkazilmaydi. */
const ACRONYMS = new Set(['TV', 'IT', 'IELTS', 'MBA', 'SMS', 'CEFR', 'UK', 'USA', 'UN', 'ID', 'PM', 'AM', 'OK', 'DJ', 'CV', 'AI', 'GPS', 'ATM', 'UNESCO'])

export function speechText(text: string): string {
  return (
    text
      .replace(EMOJI, '')
      .replace(PAREN, '')
      // "→" va "=" — o'qilmaydi, o'rniga pauza.
      .replace(/\s*[→⇒=]\s*/g, '. ')
      // "he / she", "a/an" → "he or she"
      .replace(/\s*\/\s*/g, ' or ')
      .replace(BLANK, ' blank ')
      // Qo'shtirnoq yoki gap oxiridagi "…" — shunchaki tushadi; gap ichida — pauza.
      .replace(new RegExp(`\\s*(?:${ELLIPSIS.source})\\s*(?=["”’]|[.?!]|$)`, 'g'), '')
      .replace(ELLIPSIS, ',')
      // Katta harfli ta'kid ("NOT", "EXIT") — so'z sifatida, qisqartmalar emas.
      .replace(/\b[A-Z]{3,}\b/g, (w) => (ACRONYMS.has(w) ? w : w.toLowerCase()))
      // Bo'sh qolgan tinish belgilari: ", ," / " ,." / "— ," va boshidagi vergul.
      .replace(/\s+([,.?!])/g, '$1')
      .replace(/([,—–-])(\s*[,—–-])+/g, '$1')
      .replace(/,([.?!])/g, '$1')
      .replace(/([.?!]["”’]?)\s*\.+/g, '$1')
      .replace(/^[\s,.—–-]+/, '')
      .replace(/[\s,—–-]+$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
}

let cachedVoice: SpeechSynthesisVoice | null | undefined

/** Inglizcha ovoz: en-US > en-GB > istalgan en-*. Topilmasa — `lang` bo'yicha brauzer tanlaydi. */
function englishVoice(lang: string): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null // ro'yxat hali yuklanmagan — keyingi safar
  const en = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en'))
  const exact = (l: string) => en.find((v) => v.lang.toLowerCase().replace('_', '-') === l)
  cachedVoice = exact(lang.toLowerCase()) ?? exact('en-us') ?? exact('en-gb') ?? en[0] ?? null
  return cachedVoice
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis?.addEventListener?.('voiceschanged', () => {
    cachedVoice = undefined
  })
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && Boolean(window.speechSynthesis)
}

export interface SpeakOptions {
  lang?: string
  rate?: number
  onStart?: () => void
  onEnd?: () => void
}

/** Inglizcha matnni o'qiydi (oldingi o'qishni to'xtatib). Matn bo'sh qolsa — hech narsa qilmaydi. */
export function speakEnglish(text: string, opts: SpeakOptions = {}): boolean {
  if (!ttsSupported()) return false
  const clean = speechText(text)
  if (!clean) return false
  const lang = opts.lang ?? 'en-US'
  const u = new SpeechSynthesisUtterance(clean)
  u.lang = lang
  const voice = englishVoice(lang)
  if (voice) u.voice = voice
  u.rate = opts.rate ?? 0.92
  if (opts.onStart) u.onstart = opts.onStart
  if (opts.onEnd) {
    u.onend = opts.onEnd
    u.onerror = opts.onEnd
  }
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
  return true
}
