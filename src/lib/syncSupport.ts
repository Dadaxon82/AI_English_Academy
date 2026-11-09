/** Sinxron yordamchilari: yuborilgan izlar, bulk bo'laklar, eski DB sxemasiga moslash. */

import { dedupeKey, type QueueItem } from './storage'

/* ------------------------- yuborilganlar izi ------------------------- */

/** Tez, kriptografik bo'lmagan 53-bit xesh (cyrb53) — faqat o'zgarishni aniqlash uchun. */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/** Yozuvning barqaror kaliti (jadval + tabiiy kalit). */
export function fingerprintKey(table: string, payload: unknown): string | null {
  const k = dedupeKey(table, payload)
  return k === null ? null : `${table}|${k}`
}

export function fingerprint(payload: unknown): string {
  return hashString(JSON.stringify(payload))
}

/* ------------------------------ yuborish ------------------------------ */

export interface SyncResult {
  ok: boolean
  attempted: number
  done: number
  /** Vaqtinchalik xato — navbatda qoldi, keyingi sinxronda qayta uriladi */
  failed: number
  /** Server qabul qilmadi (ma'lumot/cheklov/ruxsat xatosi) — qayta urinish foydasiz */
  rejected: number
  reasonUz: string | null
}

/** Bitta so'rovdagi qatorlar chegarasi (PostgREST bulk upsert). */
export const BULK_ROWS = 100
export const BULK_CHARS = 250_000

/**
 * Qayta urinishdan foyda yo'q xatolar: ma'lumot (22…), cheklov (23…),
 * huquq/sxema (42…) va so'rov (PGRST1…/PGRST2…) xatolari. 23503 (FK)
 * bundan mustasno — bog'liq qator keyin yozilsa o'tishi mumkin.
 */
export function isPermanent(code: string | undefined): boolean {
  if (!code || code === '23503') return false
  return /^(22|23|42)/.test(code) || /^PGRST[12]/.test(code)
}

/** Tarmoq (kodsiz) yoki sessiya/JWT (PGRST3…) xatosi — qolgan so'rovlar ham yiqiladi, to'xtaymiz. */
export function stopsRun(code: string | undefined): boolean {
  return !code || /^PGRST3/.test(code)
}

/* ------------------- baza sxemasi eski bo'lsa (2026-11-08) -------------------
 * Jonli baza tekshiruvida (`scripts/check_supabase_schema.py`) `0003_motion.sql`
 * va `0004_weekly_xp.sql` hali qo'llanmagan edi: `weekly_xp` → 404 PGRST205,
 * `user_settings.motion_enabled / xp_goal_xp / hearts_enabled` → 400 42703.
 * Bunday holda oqibat HALOL aytilishi kerak — jimgina "server qabul qilmadi"
 * emas ("nima uchun?" degan savolga javob migratsiya nomi bo'ladi):
 *
 *  a) `user_settings` — rad etilgan ustunlar so'rovdan tushirib qoldirilib
 *     qayta yuboriladi (PGRST204 / 42703). Eski bazaga ham yozuv yetadi;
 *     migratsiya keyin bajarilsa ustunlar NULL qoladi, `rowToSettings` esa
 *     ular bo'lmasa lokal qiymatni saqlaydi (pastdagi izoh) — sinxron buzilmaydi.
 *  b) `weekly_xp` — jadval bo'lmasa yozuv rad etiladi va sababi ochiq yoziladi.
 *     `deletedBySchema` sanog'i SHART: bunday yozuvlar qatorlari navbatda
 *     qoldiriladi (fingerprint izi yozilmaydi), shuning uchun migratsiya
 *     qo'llanilgach qator avtomatik qayta yuboriladi.
 *  c) `weekly_xp` o'qilmasa liga maydoni `undefined` qoldiriladi — `merge.ts`
 *     (`applyLeagueSnapshot`) `undefined` holatida eski snapshotni saqlaydi,
 *     son ixtir QILINMAYDI.
 */

/** Migratsiyaga bog'liq jadvallar: jadval bo'lmasa yozuv/liga imkonsiz. */
export const TABLE_REQUIRES_MIGRATION: Record<string, string> = { weekly_xp: '0004_weekly_xp.sql' }

/** Migratsiya qo'shgan IXTIYORIY ustunlar: yo'q bo'lsa so'rovdan tushiriladi. */
export const OPTIONAL_COLUMNS: Record<string, Record<string, string>> = {
  user_settings: { motion_enabled: '0003_motion.sql', xp_goal_xp: '0004_weekly_xp.sql', hearts_enabled: '0004_weekly_xp.sql' },
}

/** Ustun nomini xatolik matnidan topish (so'z chegarasi bilan — `xp` `xp_goal_xp` ichiga kirmasin). */
export function mentionsColumn(message: string | undefined, column: string): boolean {
  if (!message) return false
  const escaped = column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(message)
}

/** PostgREST javobidagi xato matni (kod emas — MATN konkret ustunni aytadi). */
export function errorMessage(err: unknown): string | undefined {
  const m = (err as { message?: unknown } | null | undefined)?.message
  return typeof m === 'string' ? m : undefined
}

/** Bir sinxron davomida yig'ilgan "baza eski" sabablari (migratsiya nomlari). */
export class SchemaNotes {
  private readonly missing = new Map<string, Set<string>>()

  /** Jadval nomiga ko'ra sabab qo'shish (konkret ustun noma'lum bo'lsa). */
  noteTable(table: string) {
    const m = TABLE_REQUIRES_MIGRATION[table]
    if (m) this.missing.set(m, this.missing.get(m) ?? new Set())
  }

  /** Rad etilgan konkret ustun sababi — matndan ajratib oladi. */
  noteColumnsDropped(table: string, columns: readonly string[], message: string | undefined) {
    const allowed = OPTIONAL_COLUMNS[table]
    if (!allowed) return
    for (const name of columns) {
      const migration = allowed[name]
      if (!migration || !mentionsColumn(message, name)) continue
      const set = this.missing.get(migration) ?? new Set<string>()
      set.add(name)
      this.missing.set(migration, set)
    }
  }

  text(): string {
    const parts: string[] = []
    for (const [migration, columns] of [...this.missing.entries()].sort()) {
      parts.push(
        columns.size > 0
          ? `baza eski: ${migration} migratsiyasi qo‘llanmagan (${[...columns].sort().join(', ')} ustunlari yo‘q)`
          : `baza eski: jadval yo‘q — ${migration} migratsiyasi qo‘llanmagan`,
      )
    }
    return parts.join('; ')
  }

  get empty(): boolean {
    return this.missing.size === 0
  }
}

/** Xatoda aytilgan ixtiyoriy ustunlarni so'rovdan chiqarib tashlash. */
export function degradedPayload(table: string, payload: Record<string, unknown>, message: string | undefined) {
  const allowed = OPTIONAL_COLUMNS[table]
  if (!allowed) return { payload: null as Record<string, unknown> | null, dropped: [] as string[] }
  const dropped = Object.keys(allowed).filter((name) => name in payload && mentionsColumn(message, name))
  if (dropped.length === 0) return { payload: null, dropped }
  const next = { ...payload }
  for (const name of dropped) delete next[name]
  return { payload: next, dropped }
}

/**
 * PostgREST/Postgres "jadval yoki ustun topilmadi" xatolari.
 * O'lchangan (2026-11-08, jonli baza): jadval yo'q → 404 PGRST205;
 * so'rovdagi ustun yo'q → 400 PGRST204; SELECT ustuni yo'q → 400 42703.
 */
export function isSchemaMissing(code: string | undefined): boolean {
  return code === 'PGRST204' || code === 'PGRST205' || code === '42703' || code === '42P01'
}

/** Yozuvlarni jadval bo'yicha guruhlab, bulk so'rovlarga bo'lish (jadval ichidagi tartib saqlanadi). */
export function chunkForBulk(items: readonly QueueItem[]): QueueItem[][] {
  const groups = new Map<string, QueueItem[]>()
  for (const it of items) {
    const g = `${it.op}|${it.table}`
    const list = groups.get(g)
    if (list) list.push(it)
    else groups.set(g, [it])
  }
  const out: QueueItem[][] = []
  for (const list of groups.values()) {
    let cur: QueueItem[] = []
    let chars = 0
    for (const it of list) {
      const size = JSON.stringify(it.payload).length
      if (cur.length > 0 && (cur.length >= BULK_ROWS || chars + size > BULK_CHARS)) {
        out.push(cur)
        cur = []
        chars = 0
      }
      cur.push(it)
      chars += size
    }
    if (cur.length) out.push(cur)
  }
  return out
}
