/**
 * Mahalliy saqlash — IndexedDB (idb-keyval) yoki localStorage.
 *
 * Xavfsizlik talablari:
 *  - Har bir kalit userId bilan boshlanadi → boshqa foydalanuvchining
 *    ma'lumoti qurilmada aralashmaydi.
 *  - Logout paytida shu foydalanuvchining shaxsiy keshi tozalanadi.
 *  - Faqat kerakli ma'lumot saqlanadi.
 */

import { del, get, keys, set } from 'idb-keyval'
import type { AppData } from './types'
import { APP_DATA_VERSION, emptyData } from './types'

const DATA_KEY = (uid: string) => `aea:data:${uid}`
const QUEUE_KEY = (uid: string) => `aea:queue:${uid}`
const CACHE_KEY = (uid: string) => `aea:cache:${uid}`

const hasIdb = typeof indexedDB !== 'undefined'

/** Fallback: IndexedDB bo'lmasa yoki yozuvda xato bo'lsa localStorage. */
const lsOk = (() => {
  try {
    localStorage.setItem('aea-probe', '1')
    localStorage.removeItem('aea-probe')
    return true
  } catch {
    return false
  }
})()

export interface QueueItem {
  id: string
  table: string
  op: 'upsert' | 'delete'
  payload: unknown
  at: number
  tries: number
}

let idbBroken = false

async function idbSet(key: string, value: unknown): Promise<void> {
  if (hasIdb && !idbBroken) {
    try {
      await set(key, value)
      return
    } catch {
      idbBroken = true
    }
  }
  if (lsOk) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* kvota tugasa — jimgina yiqilamiz, ilova ishlashda davom etadi */
    }
  }
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  if (hasIdb && !idbBroken) {
    try {
      const v = await get<T>(key)
      if (v !== undefined) return v
    } catch {
      idbBroken = true
    }
  }
  if (lsOk) {
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        return JSON.parse(raw) as T
      } catch {
        return undefined
      }
    }
  }
  return undefined
}

export function storageBackend(): 'indexeddb' | 'localstorage' | 'memory' {
  if (hasIdb && !idbBroken) return 'indexeddb'
  return lsOk ? 'localstorage' : 'memory'
}

export async function loadData(userId: string): Promise<AppData> {
  const raw = await idbGet<AppData>(DATA_KEY(userId))
  if (!raw) return emptyData(userId)
  if (raw.userId !== userId) return emptyData(userId) // aralashmaslik kafolati
  return migrate(raw)
}

/** Versiya migratsiyasi — maydon qo'shilsa, eski saqlanganma buzilmasin. */
export function migrate(raw: AppData): AppData {
  const base = emptyData(raw.userId)
  const next: AppData = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    streak: { ...base.streak, ...(raw.streak ?? {}) },
    path: { ...base.path, ...(raw.path ?? {}) },
    timer: { ...base.timer, ...(raw.timer ?? {}) },
  }
  next.version = APP_DATA_VERSION
  return next
}

export async function saveData(data: AppData): Promise<void> {
  await idbSet(DATA_KEY(data.userId), { ...data, updatedAt: Date.now() })
}

/** --- Offline sinxronlash navbati --- */

export async function loadQueue(userId: string): Promise<QueueItem[]> {
  return (await idbGet<QueueItem[]>(QUEUE_KEY(userId))) ?? []
}

/**
 * Navbat elementini takrorlanmasdan birlashtirish uchun barqaror identifikator.
 * `payload.id` bo'lmagan jadvallar (user_settings / user_vocabulary /
 * daily_activity) uchun tabiiy kalit ishlatiladi — aks holda "Sinxronizatsiya"
 * tugmasi har bosilganda butun navbat shishib borardi.
 */
export function dedupeKey(table: string, payload: unknown): string | null {
  const p = payload as Record<string, unknown> | undefined
  if (!p) return null
  if (typeof p.id === 'string') return `id:${p.id}`
  if (table === 'user_settings') return 'uk:user'
  if (table === 'user_vocabulary' && typeof p.vocabulary_id === 'string') return `uk:v:${p.vocabulary_id}`
  if (table === 'daily_activity' && typeof p.day === 'string') return `uk:d:${p.day}`
  return null
}

export async function enqueue(userId: string, item: Omit<QueueItem, 'tries'>): Promise<QueueItem[]> {
  const q = await loadQueue(userId)
  // To'qnashuvlarni hisobga olish: bitta user, bitta ilova — keyingi yozuv
  // oldingisini bosadi (last-write-wins), shuning uchun table+op+dedupeKey
  // bo'yicha deduplikat qilinadi.
  const key = dedupeKey(item.table, item.payload)
  if (key) {
    const idx = q.findIndex((x) => x.table === item.table && x.op === item.op && dedupeKey(x.table, x.payload) === key)
    if (idx >= 0) q.splice(idx, 1)
  }
  q.push({ ...item, tries: 0 })
  await idbSet(QUEUE_KEY(userId), q)
  return q
}

export async function updateQueue(userId: string, q: QueueItem[]): Promise<void> {
  await idbSet(QUEUE_KEY(userId), q)
}

/** --- Offline dars/lug'at kachi --- */

export interface OfflineCache {
  savedAt: number
  level: string
  dayIds: string[]
  vocabIds: string[]
  audioIds: string[]
}

export async function loadCacheMeta(userId: string): Promise<OfflineCache | null> {
  return (await idbGet<OfflineCache>(CACHE_KEY(userId))) ?? null
}

export async function saveCacheMeta(userId: string, meta: OfflineCache): Promise<void> {
  await idbSet(CACHE_KEY(userId), meta)
}

/**
 * Logout: shu foydalanuvchining SHAXSIY keshini tozalash.
 * Boshqa foydalanuvchining kalitlari tegilmaydi.
 */
export async function purgeUserData(userId: string): Promise<void> {
  const prefix = `aea:`
  if (hasIdb && !idbBroken) {
    try {
      const all = await keys()
      const mine = all.filter((k) => typeof k === 'string' && k.startsWith(prefix) && k.endsWith(`:${userId}`))
      for (const k of mine) await del(k as string)
    } catch {
      idbBroken = true
    }
  }
  if (lsOk) {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(prefix) && k.endsWith(`:${userId}`)) localStorage.removeItem(k)
    }
  }
}

export { DATA_KEY, QUEUE_KEY, CACHE_KEY }
