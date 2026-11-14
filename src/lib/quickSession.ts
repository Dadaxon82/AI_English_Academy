/**
 * «5 daqiqa» tezkor sessiya — qisqa kunlik odat (g'oya: Drops; nusxa emas).
 *
 * Qoidalar (sof funksiyalar, testlar `src/test/quick-session.test.ts`):
 *  - Sessiya devor-soat taymeri bilan o'lchanadi (`timer.ts`) — sahifa
 *    yangilansa ham qolgan vaqt yo'qolmaydi (taymer IndexedDB'da saqlanadi).
 *  - Kartalar tartibi: avval SRS bo'yicha MUDDATI KELGAN so'zlar (xato
 *    qilinganlar birinchi — `sortForReview`), keyin BITTA mavzudan bir nechta
 *    YANGI so'z (eng ko'p o'rganilmagan so'zi bor mavzu).
 *  - Kunlik reja (`planning.ts`, 90 daqiqa) O'ZGARMAYDI — bu qo'shimcha
 *    «minimal kun». Zanjir (streak) uchun alohida qoida ixtiro qilinmaydi:
 *    mavjud qoida (`gameCore.ts::activeDayKeys` — kunda ≥ 60 sekund faollik)
 *    5 daqiqalik sessiyani o'zi qamraydi.
 */

import type { VocabularyItem } from '../content/types'
import { isDue, sortForReview, type SrsGrade, type SrsState } from './srs'

/** Sessiya davomiyligi (sekund). */
export const QUICK_SESSION_SEC = 5 * 60
/** Bitta sessiyada eng ko'pi bilan nechta takror kartasi. */
export const QUICK_MAX_DUE = 12
/** Bitta sessiyada nechta yangi so'z (bitta mavzudan). */
export const QUICK_NEW_WORDS = 5
/** Swipe (surish) kartani baholashi uchun minimal masofa (px). */
export const SWIPE_MIN_PX = 80
/** Keng kartada masofa karta enining shu ulushidan kam bo'lmasin. */
export const SWIPE_WIDTH_RATIO = 0.25

/** Taymer sessiya kaliti — kun bilan, shuning uchun har kuni yangi sessiya. */
export function quickSessionId(day: string): string {
  return `quick-${day}`
}

export interface QuickCard {
  item: VocabularyItem
  /** true — bu so'z birinchi marta ko'rsatilmoqda (SRS'da yozuvi yo'q). */
  isNew: boolean
}

export interface QuickDeck {
  cards: QuickCard[]
  dueCount: number
  newCount: number
  /** Yangi so'zlar olingan mavzu (yangi so'z bo'lmasa null). */
  newTopic: string | null
}

/**
 * Sessiya kartalarini tuzadi. `pool` — joriy darajaning lug'ati (Lug'at
 * sahifasidagi havuz bilan bir xil). Takrorlar `pool`da bor so'zlardangina
 * olinadi — boshqa darajadagi so'z aralashmaydi.
 */
export function buildQuickDeck(
  pool: readonly VocabularyItem[],
  srs: Readonly<Record<string, SrsState>>,
  now: number,
  opts: {
    maxDue?: number
    newWords?: number
    /**
     * Yangi so'zlar olinadigan havuz (standart — `pool`). Sahifa bu yerga
     * faqat ASOSIY lug'atni beradi: matndan olingan glossariy so'zlarida
     * misol gap yo'q — ular faqat o'quvchi o'zi saqlagach takrorga tushadi.
     */
    newPool?: readonly VocabularyItem[]
  } = {},
): QuickDeck {
  const maxDue = opts.maxDue ?? QUICK_MAX_DUE
  const newWords = opts.newWords ?? QUICK_NEW_WORDS

  // Bir so'z havuzda ikki marta bo'lsa (asosiy + glossariy) — bitta karta.
  const seen = new Set<string>()
  const unique = pool.filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)))

  const due = sortForReview(
    unique.flatMap((item) => {
      const state = srs[item.id]
      return state && isDue(state, now) ? [{ state, item }] : []
    }),
  ).slice(0, Math.max(0, maxDue))

  // Yangi so'zlar: SRS'da umuman yozuvi yo'q so'zlar, mavzu bo'yicha.
  const byTopic = new Map<string, VocabularyItem[]>()
  const dueIds = new Set(due.map((d) => d.id))
  for (const item of opts.newPool ?? unique) {
    if (srs[item.id] || dueIds.has(item.id)) continue
    if (byTopic.get(item.topic)?.some((x) => x.id === item.id)) continue
    const list = byTopic.get(item.topic)
    if (list) list.push(item)
    else byTopic.set(item.topic, [item])
  }
  let newTopic: string | null = null
  let best: VocabularyItem[] = []
  // Map tartibi = havuzdagi birinchi uchrash tartibi; teng bo'lsa birinchisi qoladi.
  for (const [topic, list] of byTopic) {
    if (list.length > best.length) {
      best = list
      newTopic = topic
    }
  }
  const fresh = newWords > 0 ? best.slice(0, newWords) : []
  if (fresh.length === 0) newTopic = null

  return {
    cards: [...due.map((item) => ({ item, isNew: false })), ...fresh.map((item) => ({ item, isNew: true }))],
    dueCount: due.length,
    newCount: fresh.length,
    newTopic,
  }
}

/**
 * Surish (swipe) natijasi: o'ngga — «Bilaman» (`good`), chapga — «Yana»
 * (`again`), masofa yetmasa — null (karta joyiga qaytadi).
 */
export function swipeGrade(dx: number, cardWidth: number): Extract<SrsGrade, 'good' | 'again'> | null {
  if (!Number.isFinite(dx)) return null
  const threshold = Math.max(SWIPE_MIN_PX, (Number.isFinite(cardWidth) ? cardWidth : 0) * SWIPE_WIDTH_RATIO)
  if (dx >= threshold) return 'good'
  if (dx <= -threshold) return 'again'
  return null
}

/** Qolgan sekundlar (manfiy bo'lmaydi). */
export function quickRemaining(elapsedSec: number): number {
  return Math.max(0, QUICK_SESSION_SEC - Math.max(0, Math.floor(elapsedSec)))
}
