/**
 * Brauzer nutqni tanish (Web Speech API) — bitta gap uchun.
 *
 * Qo'llanmasa (`supported: false` — Safari/Firefox'ning ko'p versiyalari)
 * SABAB oldindan aytiladi; natija ixtiro qilinmaydi. Audio hech qayerga
 * saqlanmaydi va yuborilmaydi — faqat brauzer bergan matn qaytadi.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives?: number
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string; confidence?: number }; isFinal: boolean }> }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type Ctor = new () => RecognitionLike

export function speechRecognizer(): Ctor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const SPEECH_UNSUPPORTED_UZ =
  'Bu brauzer nutqni tanimaydi (Web Speech API yo‘q) — Chrome yoki Edge’da oching yoki javobni yozib kiriting.'

export function speechErrorUz(code: string | undefined): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki yozib kiriting.'
  if (code === 'no-speech') return 'Ovoz eshitilmadi. Mikrofonni tekshirib, qayta urinib ko‘ring.'
  if (code === 'network') return 'Nutqni tanish xizmatiga ulanib bo‘lmadi (internet kerak).'
  if (code === 'audio-capture') return 'Mikrofon topilmadi.'
  return 'Nutqni tanib bo‘lmadi. Qayta urinib ko‘ring yoki yozib kiriting.'
}

export interface SpeechResult {
  text: string
  /** Brauzer bergan ishonch (0..1); bermasa null. */
  confidence: number | null
}

export function useSpeechInput(onFinal: (r: SpeechResult) => void) {
  const supported = speechRecognizer() !== null
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<RecognitionLike | null>(null)
  const cbRef = useRef(onFinal)
  useEffect(() => {
    cbRef.current = onFinal
  })
  useEffect(() => () => recRef.current?.stop(), [])

  const start = useCallback(() => {
    const C = speechRecognizer()
    setError(null)
    if (!C) {
      setError(SPEECH_UNSUPPORTED_UZ)
      return
    }
    const r = new C()
    r.lang = 'en-US'
    r.continuous = false
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (e) => {
      let text = ''
      let conf: number | null = null
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (!res?.isFinal) continue
        text += res[0].transcript + ' '
        if (typeof res[0].confidence === 'number' && res[0].confidence > 0) conf = res[0].confidence
      }
      if (text.trim()) cbRef.current({ text: text.trim(), confidence: conf })
    }
    r.onerror = (e) => setError(speechErrorUz(e.error))
    r.onend = () => {
      setListening(false)
      recRef.current = null
    }
    recRef.current = r
    try {
      r.start()
      setListening(true)
    } catch {
      setListening(false)
      setError(speechErrorUz(undefined))
    }
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  return { supported, listening, error, start, stop }
}
