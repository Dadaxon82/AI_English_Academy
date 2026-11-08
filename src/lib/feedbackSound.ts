/**
 * Mashq javobining OVOZ signali — Web Audio API bilan sintez qilinadi.
 *
 * Nega fayl emas? `public/audio/manifest.json` qoidasi: **fayl bo'lmasa
 * pleyer ko'rsatilmaydi** (soxta audio yo'q). Bizda javob ovozi uchun hech
 * qanday fayl yo'q — fayl qo'shish yoki ruxsatsiz tashqi mp3 ishlatish
 * o'rniga tovush brauzerda sintez qilinadi: nol fayl, nol litsenziya
 * muammosi, offline ishlaydi.
 *
 * Mantiqi DULO'dan olindi (o'lchangan dalil: `res/raw`da 297 `.mp3` +
 * 135 `.ogg`; 278 tebranish `.hla` fayli harakat bilan bog'langan), lekin
 * boshqa studiyaning audio fayllari KO'CHIRILMAYDI.
 *
 * HALOLLIK:
 *  - tovush uzamligi MAVJOQ harakat byudjetidan olinadi
 *    (`motionManifest.ts`: to'g'ri — ikki nota, har biri `popMs`/2;
 *    noto'g'ri — bitta nota `outcomeMs`). Yangi ms soni ixtir qilinmagan;
 *  - brauzerda `AudioContext` bo'lmasa/yechilmasa JIM qaytamiz — "ovoz bor"
 *    deb yolg'on signal berilmaydi (`feedbackSoundAvailable()`);
 *  - sozlama: alohida "tovush" tugmasi QO'SHILMADI — mavjud
 *    `settings.motionEnabled` (= mobilda ham bor, DB'da ustuni bor) javob
 *    ovazini ham boshqaradi. Sabab: yangi sozlama = yangi DB ustuni +
 *    migratsiya + veb/mobil parity; bitta "jonli feedback" tugmasi halolroq
 *    va foydalanuvchi uchun sodda.
 */

import { defaultMotionSpec } from './motionManifest'

export type FeedbackTone = 'correct' | 'wrong'

/**
 * Notalar (Gerts). Bu MUSIQIY TANLOV — o'lchov emas, shuning uchun ochiq
 * aytiladi: DULO o'z `.mp3`larida qaysi chastotalardan foydalanishi bizga
 * noma'lum (fayllarni ko'chirmadik). Tanlov ma'noga mos: to'g'ri javob —
 * ko'tarilib ikki nota (tugallanganlik), noto'g'ri — pastga tushadigan bitta
 * nota (urinishga undash; masxaralama ovazi YO'Q — ohang ohangdor).
 */
const TONES: Record<FeedbackTone, number[]> = {
  correct: [660, 880],
  wrong: [300],
}

type AudioCtor = new () => AudioContext

function contextCtor(): AudioCtor | null {
  const w = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

/**
 * Javob ovozini ijro etish MUMKINMI. UI shu javobga qarab ovozni
 * rejalashtiradi yoki umuman urinmaydi — "ishlamaydigan narsa ko'rsatilmaydi"
 * qoidasi (`audio/manifest.json`dag `available: false` mantig'i bilan bir xil).
 */
export function feedbackSoundAvailable(): boolean {
  return contextCtor() !== null
}

let cachedContext: AudioContext | null = null

/** Bitta toza tono + yumshoq envelope (klip va "g'adirillash" bo'lmasligi uchun). */
function playNote(c: AudioContext, freqHz: number, startAt: number, durationMs: number): void {
  const durS = durationMs / 1000
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freqHz, startAt)
  const edge = Math.min(0.02, durS / 4)
  // `exponentialRampToValueAtTime` 0 ga intila olmaydi — sh uchun 0,0001.
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.12, startAt + edge)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durS)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(startAt)
  osc.stop(startAt + durS + 0.02)
  osc.onended = () => {
    osc.disconnect()
    gain.disconnect()
  }
}

/**
 * Javob signalini ijro etish. `enabled` — sozlama; o'chilganda hech narsa
 * qilinmaydi. Xato bo'lsa JIM o'tamiz: tovush — ma'lumot EMAS, javob matn
 * va rangdan bilinishi mumkin (shuning uchun tovush uzilgani xabar
 * qilinmaydi, lekin yashirilmaydi — `probeError()` oxirgi sababni saqlaydi).
 */
export function playFeedback(kind: FeedbackTone, enabled: boolean): void {
  if (!enabled) return
  const Ctor = contextCtor()
  if (!Ctor) return
  try {
    cachedContext ??= new Ctor()
    const c = cachedContext
    if (c.state === 'closed') return
    // Brauzer avtoijroni cheklaydi: ovoz tugma bosilganda (user gesture)
    // chaqiriladi — shunda `resume()` ruxsat etilgan.
    if (c.state === 'suspended') void c.resume().catch(() => undefined)
    const spec = defaultMotionSpec()
    const notes = TONES[kind]
    // Tovush uzamligi — MAVJOQ byudjetdan (ixtir emas).
    const eachMs = kind === 'correct' ? spec.popMs / notes.length : spec.outcomeMs
    const t0 = c.currentTime
    notes.forEach((f, i) => playNote(c, f, t0 + (i * eachMs) / 1000, eachMs))
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err)
  }
}

/** Oxirgi sintez xatosi (test/diagnostika uchun; null — xato yo'q). */
let lastError: string | null = null
export function probeError(): string | null {
  return lastError
}
