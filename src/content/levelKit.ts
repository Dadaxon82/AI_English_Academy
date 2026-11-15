/**
 * Darajalar (A2 … C1) uchun umumiy yordamchilar — ma'lumot SHAKLI A1 bilan bir
 * xil (`VocabularyItem`, `Exercise`). Har daraja papkasidagi `shared.ts` shu
 * yerdan o'z darajasi bilan oladi — kod takrorlanmaydi.
 */
import type { CefrLevel, VocabularyItem } from './types'

export function levelKit<L extends CefrLevel>(level: L) {
  return {
    G: { level, skill: 'grammar' as const },
    R: { level, skill: 'reading' as const },
    L: { level, skill: 'listening' as const },
    V: { level, skill: 'vocabulary' as const },
    /** Tinglash audiosi: fayl hali yaratilmagan — pleyer KO'RSATILMAYDI, mashqlar transkript asosida. */
    NO_AUDIO: {
      src: '',
      fileAvailable: false,
      source: 'original' as const,
      attribution: 'AI English Academy (original script)',
      license: 'CC0 — created for this project',
      offlineAllowed: true,
      level,
    },
    word(
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
        level,
        ...(relations ? { relations } : {}),
      }
    },
  }
}
