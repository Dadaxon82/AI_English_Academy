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
      // Harflab aytish "J-A-V-L-O-N" — har harf alohida (aks holda TTS so'z deb o'qiydi).
      .replace(/\b[A-Z](?:-[A-Z]\b)+/g, (m) => m.split('-').join(', '))
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

/* ------------------------------ suhbat (bir necha ovoz) ------------------------------ */

export interface SpokenLine {
  /** "Woman", "Man", "Lola" … — bo'lmasa bitta ovoz. */
  speaker: string | null
  text: string
}

/** "Woman: Hello!" → { speaker: 'Woman', text: 'Hello!' }. */
export function splitSpeaker(line: string): SpokenLine {
  // "Woman:", "Dr Yusupova:", "Shop assistant:", "Samir and Bekzod:" — bosh harf bilan, 1–4 so'z.
  const m = /^\s*([A-Z][\w’'.-]*(?: [\w’'.-]+){0,3}):\s+(.+)$/.exec(line)
  return m ? { speaker: m[1]!, text: m[2]! } : { speaker: null, text: line }
}

const FEMALE = /\b(woman|girl|mother|mum|mom|grandmother|grandma|wife|sister|daughter|aunt|lady|female|waitress)\b/i
const MALE = /\b(man|boy|father|dad|grandfather|grandpa|husband|brother|son|uncle|male|waiter)\b/i

/**
 * Suhbatni rollar bo'yicha o'qiydi: har so'zlovchiga o'z ovozi (inglizcha ovozlar
 * ikkita bo'lsa — har xil ovoz; bo'lmasa — balandlik farqi). So'zlovchi nomi
 * aytilmaydi. Qaytadi: to'xtatish funksiyasi.
 */
export function speakDialogue(lines: readonly SpokenLine[], opts: { rate?: number; onLine?: (i: number) => void; onEnd?: () => void } = {}): () => void {
  if (!ttsSupported()) {
    opts.onEnd?.()
    return () => {}
  }
  const synth = window.speechSynthesis
  const en = synth.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en'))
  const base = englishVoice('en-US')
  const others = en.filter((v) => v !== base)
  const order: string[] = []
  for (const l of lines) if (l.speaker && !order.includes(l.speaker)) order.push(l.speaker)
  const pitchOf = (sp: string | null, idx: number) => {
    if (!sp) return 1
    if (FEMALE.test(sp)) return 1.15
    if (MALE.test(sp)) return 0.85
    return idx % 2 === 0 ? 1.1 : 0.9
  }
  let stopped = false
  synth.cancel()
  const spoken = lines.map((l, i) => ({ l, i, text: speechText(l.text) })).filter((x) => x.text)
  if (spoken.length === 0) {
    opts.onEnd?.()
    return () => {}
  }
  spoken.forEach(({ l, i, text }, k) => {
    const idx = l.speaker ? order.indexOf(l.speaker) : 0
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    const voice = idx > 0 && others.length > 0 ? others[(idx - 1) % others.length]! : base
    if (voice) u.voice = voice
    u.pitch = pitchOf(l.speaker, idx)
    u.rate = opts.rate ?? 0.9
    u.onstart = () => {
      if (!stopped) opts.onLine?.(i)
    }
    if (k === spoken.length - 1) {
      u.onend = () => {
        if (!stopped) opts.onEnd?.()
      }
    }
    u.onerror = () => {
      if (stopped) return
      stopped = true
      opts.onEnd?.()
    }
    synth.speak(u)
  })
  return () => {
    stopped = true
    synth.cancel()
  }
}
