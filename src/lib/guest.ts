/**
 * MEHMON (ro'yxatdan o'tmagan) rejimi cheklovlari.
 *
 * Qaror (foydalanuvchi bilan kelishilgan, 2026-11-10): Supabase ulangan
 * saytda «Mehmon sifatida davom etiş» bilan kirgan foydalanuvchi FAQAT
 * A1.1-bölimdan foydalanadi. Qolgan bölimlar va sahifalar ochilmoqchi
 * bo'lsa — ro'yxatdan o'tish taklif qilinadi (`GuestUpsell`).
 *
 * Supabase SOZLANMAGAN bo'lsa cheklov yo'q: u holda ro'yxatdan o'tishning
 * imkoni yo'q va ilova to'liq mahalliy rejimda ishlaydi (README siyosati).
 *
 * SOF funksiyalar — kontent registrydan boshqa bog'liqlik yo'q.
 */

import { getBundle } from '../content'
import { SECTION_PLAN } from './sections'

/** Mehmonga ochiq yagona bölim. */
export const GUEST_SECTION_ID = 'a1-1'

/** Mehmonga ochiq kunlar (`DailyPlanDay.id`) — A1.1 kunlari. */
export function guestDayIds(): Set<string> {
  const entry = SECTION_PLAN.find((s) => s.id === GUEST_SECTION_ID)
  if (!entry) return new Set()
  const days = getBundle(entry.level).days
  return new Set(days.filter((d) => entry.dayNumbers.includes(d.dayNumber)).map((d) => d.id))
}

/**
 * Mehmonga ochiq sahifalar: bosh sahifa, o'quv yo'li (A1.1 darslari bilan),
 * bölimlar ro'yxati, sozlamalar (hisobni o'chirish / chiqish uchun),
 * boshlang'ich sozlash va kirish sahifasi.
 */
const GUEST_PATHS = new Set(['/', '/dashboard', '/path', '/sections', '/settings', '/onboarding', '/login'])

/** Shu manzil mehmonga ochiqmi. */
export function isGuestAllowedPath(pathname: string): boolean {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (GUEST_PATHS.has(p)) return true
  const m = /^\/lesson\/([^/]+)\/[^/]+$/.exec(p)
  return m !== null && guestDayIds().has(decodeURIComponent(m[1]!))
}

/** «Mehmon sifatida davom etiş» tanlovi — sahifa qayta yuklanganda ham eslab qolinadi. */
const GUEST_FLAG = 'aea-guest-mode'

export function rememberGuest(on: boolean): void {
  try {
    if (on) localStorage.setItem(GUEST_FLAG, '1')
    else localStorage.removeItem(GUEST_FLAG)
  } catch {
    /* xotira yopiq (maxfiy oyna) — tanlov faqat shu sessiyada */
  }
}

export function guestRemembered(): boolean {
  try {
    return localStorage.getItem(GUEST_FLAG) === '1'
  } catch {
    return false
  }
}
