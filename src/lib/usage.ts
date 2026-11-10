/**
 * Yangi funksiyalardan FOYDALANISH o'lchovi (6-bosqich) — QAYSI funksiya
 * haqiqatan yordam berayotganini bilish uchun.
 *
 * Maxfiylik: hisob FAQAT shu qurilmada (`localStorage`), hech qayerga
 * yuborilmaydi, matn yoki javob saqlanmaydi — faqat sonlar va oxirgi sana.
 * Progress sahifasida ko'rinadi va bitta tugma bilan tozalanadi.
 *
 * `started` — funksiya boshlandi; `finished` — oxirigacha yetkazildi
 * (har funksiya uchun ma'nosi `FEATURES[].finishedUz` da ochiq yozilgan).
 */

import { useSyncExternalStore } from 'react'

export type FeatureId =
  | 'quick'
  | 'dialogue'
  | 'review'
  | 'conversation'
  | 'pronunciation'
  | 'community_submit'
  | 'community_review'
  | 'certificate'
  | 'shorts'

export const FEATURES: { id: FeatureId; titleUz: string; startedUz: string; finishedUz: string }[] = [
  { id: 'quick', titleUz: '«5 daqiqa» sessiya', startedUz: 'boşlandi', finishedUz: 'vaqt yoki kartalar tugagunça' },
  { id: 'dialogue', titleUz: 'Real hayot suhbatlari', startedUz: 'oçildi', finishedUz: 'dars oxirigaça' },
  { id: 'review', titleUz: 'Takrorlaş menejeri', startedUz: 'boşlandi', finishedUz: 'navbat oxirigaça' },
  { id: 'conversation', titleUz: 'Suhbatdoş', startedUz: 'boşlandi', finishedUz: 'kamida bitta javob bilan yakunlandi' },
  { id: 'pronunciation', titleUz: 'Talaffuz maşqi', startedUz: 'uriniş', finishedUz: 'moslik 80% va undan yuqori' },
  { id: 'community_submit', titleUz: 'Hamjamiyatga yuboriş', startedUz: 'uriniş', finishedUz: 'serverga yetdi' },
  { id: 'community_review', titleUz: 'Hamjamiyatda tekşiriş', startedUz: 'javob olindi', finishedUz: 'izoh yuborildi' },
  { id: 'certificate', titleUz: 'Yakunlaş guvohnomasi', startedUz: 'yaratiş bosildi', finishedUz: 'rasm yaratildi' },
  { id: 'shorts', titleUz: 'Video shortlar', startedUz: 'playlist oçildi', finishedUz: 'playlist oxirigaça' },
]

export interface FeatureStats {
  started: number
  finished: number
  lastAt: number
}

export type UsageStats = Partial<Record<FeatureId, FeatureStats>>

const KEY = 'aea-usage-v1'
const EVENT = 'aea-usage'
/** Hisoblagich chegarasi — buzilgan/ulkan son saqlanmasin. */
export const USAGE_MAX = 1_000_000

/** Sof: bitta hodisani qo'shadi (testlar shu funksiyani tekshiradi). */
export function bumpUsage(stats: UsageStats, id: FeatureId, kind: 'started' | 'finished', now: number): UsageStats {
  const cur = stats[id] ?? { started: 0, finished: 0, lastAt: 0 }
  const next = { ...cur, [kind]: Math.min(USAGE_MAX, cur[kind] + 1), lastAt: now }
  // Yakunlangan soni boshlanganidan oshmasin (eski yozuvsiz yakun — boshlangan ham sanaladi).
  if (next.finished > next.started) next.started = next.finished
  return { ...stats, [id]: next }
}

/** Tugatish foizi (0..100); boshlanmagan bo'lsa null. */
export function completionPct(s: FeatureStats | undefined): number | null {
  if (!s || s.started === 0) return null
  return Math.round((Math.min(s.finished, s.started) / s.started) * 100)
}

/** Saqlangan JSON'ni xavfsiz o'qish: noma'lum kalit va noto'g'ri son tashlanadi. */
export function parseUsage(raw: string | null): UsageStats {
  if (!raw) return {}
  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!v || typeof v !== 'object') return {}
  const out: UsageStats = {}
  for (const f of FEATURES) {
    const s = (v as Record<string, unknown>)[f.id] as Record<string, unknown> | undefined
    if (!s || typeof s !== 'object') continue
    const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(USAGE_MAX, Math.floor(x)) : 0)
    const started = n(s.started)
    const finished = Math.min(n(s.finished), started)
    out[f.id] = { started, finished, lastAt: n(s.lastAt) }
  }
  return out
}

const EMPTY: UsageStats = {}
let cacheRaw: string | null | undefined
let cacheVal: UsageStats = {}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function snapshot(): UsageStats {
  const raw = readRaw()
  if (raw !== cacheRaw) {
    cacheRaw = raw
    cacheVal = parseUsage(raw)
  }
  return cacheVal
}

export function trackUsage(id: FeatureId, kind: 'started' | 'finished', now: number = Date.now()): void {
  const next = bumpUsage(snapshot(), id, kind, now)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* saqlab bo'lmadi (xususiy oyna) — o'lchov jimgina o'tkazib yuboriladi */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function clearUsage(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* e'tiborsiz */
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb()
  }
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

export function useUsageStats(): UsageStats {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY)
}
