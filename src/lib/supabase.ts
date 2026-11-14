/**
 * Supabase mijoz qatlami.
 *
 * Siyosat:
 *  - Supabase SOZLANMAGAN bo'lsa ilova to'liq ishlayveradi (mahalliy
 *    IndexedDB / localStorage). "Ulangan" deb ko'rsatilmaydi.
 *  - Anon kalit FQAT VITE_SUPABASE_ANON_KEY orqali keladi.
 *  - Service role key bu yerga HECH QACHON kirmaydi (serverda qoladi).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const supabaseConfigured = Boolean(url && anon && /^https?:\/\//.test(url))

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null
  if (!client) {
    client = createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'x-application-name': 'ai-english-academy' } },
    })
  }
  return client
}

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  created_at: string
}

/**
 * Auth holati. `offline` — Supabase sozlanmagan yoki tarmoq yo'q;
 * bu holda ilova mehmon (guest) rejimida ishlaydi.
 */
export type AuthState =
  | { kind: 'local-only'; userId: string }
  | { kind: 'signed-in'; userId: string; email: string | null }
  | { kind: 'signed-out' }
  | { kind: 'checking' }

export function localGuestId(): string {
  const KEY = 'aea-guest-id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = `local-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
    localStorage.setItem(KEY, id)
  }
  return id
}

/** Xatolarni xavfsiz matnga aylantirish (token/SQL sizib chiqmasin). */
export function safeErrorMessage(err: unknown): string {
  if (!err) return "Noma'lum xatolik. Qayta urinib ko'ring."
  const e = err as { message?: string; code?: string; status?: number }
  const msg = (e.message ?? '').toLowerCase()
  if (e.status === 401 || msg.includes('invalid login')) return 'Email yoki parol noto‘g‘ri.'
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'Internet aloqasi yo‘q. Ulanishni tekshiring.'
  if (msg.includes('rate')) return 'Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.'
  if (msg.includes('already registered')) return 'Bu email allaqachon ro‘yxatdan o‘tgan.'
  if (msg.includes('confirm')) return 'Emailingizni tasdiqlang. Kelgan xatni tekshiring.'
  return 'Xatolik yuz berdi. Keyinroq qayta urinib ko‘ring.'
}
