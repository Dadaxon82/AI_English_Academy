/**
 * A2 kontenti uchun umumiy asoslar — ma'lumot SHAKLI A1 bilan bir xil
 * (`VocabularyItem`, `Exercise`), faqat takrorlanadigan maydonlar qisqartirilgan.
 */
import type { VocabularyItem } from '../types'

export const G = { level: 'A2' as const, skill: 'grammar' as const }
export const R = { level: 'A2' as const, skill: 'reading' as const }
export const L = { level: 'A2' as const, skill: 'listening' as const }
export const V = { level: 'A2' as const, skill: 'vocabulary' as const }

/** Tinglash audiosi: fayl hali yaratilmagan — pleyer KO'RSATILMAYDI, mashqlar transkript asosida. */
export const NO_AUDIO = {
  src: '',
  fileAvailable: false,
  source: 'original' as const,
  attribution: 'AI English Academy (original script)',
  license: 'CC0 — created for this project',
  offlineAllowed: true,
  level: 'A2' as const,
}

export function word(
  id: string,
  w: string,
  translationUz: string,
  explanationEn: string,
  ipa: string,
  pos: VocabularyItem['pos'],
  topic: string,
  exampleEn: string,
  exampleUz: string,
  relations?: VocabularyItem['relations'],
): VocabularyItem {
  return {
    id,
    word: w,
    translationUz,
    explanationEn,
    ipa,
    pronunciation: { kind: 'browser-tts', ttsText: w, lang: 'en-US' },
    exampleEn,
    exampleUz,
    pos,
    topic,
    level: 'A2',
    ...(relations ? { relations } : {}),
  }
}
