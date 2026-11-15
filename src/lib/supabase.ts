/**
 * Supabase mijoz qatlami.
 *
 * Siyosat:
 *  - Supabase SOZLANMAGAN bo'lsa ilova to'liq ishlayveradi (mahalliy
 *    IndexedDB / localStorage). "Ulangan" deb ko'rsatilmaydi.
 *  - Anon kalit FQAT VITE_SUPABASE_ANON_KEY orqali keladi.
 *  - Service role key bu yerga HECH QACHON kirmaydi (serverda qoladi).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const supabaseConfigured = Boolean(url && anon && /^https?:\/\//.test(url))

let client: Promise<SupabaseClient> | null = null

/**
 * Mijoz KERAK bo'lganda yuklanadi (dinamik import, alohida chunk): Supabase
 * sozlanmagan (mehmon) rejimda ~170 KB kutubxona umuman yuklanmaydi.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null)
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'x-application-name': 'ai-english-academy' } },
    }),
  )
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
  if (!err) return "Noma'lum xatolik. Qayta urinib köring."
  const e = err as { message?: string; code?: string; status?: number }
  const msg = (e.message ?? '').toLowerCase()
  if (e.status === 401 || msg.includes('invalid login')) return 'Email yoki parol notöğri.'
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'Internet aloqasi yöq. Ulanişni tekşiring.'
  if (msg.includes('rate')) return 'Juda köp uriniş. Birozdan keyin qayta urinib köring.'
  if (msg.includes('already registered')) return 'Bu email allaqaçon röyxatdan ötgan.'
  if (msg.includes('confirm')) return 'Emailingizni tasdiqlang. Kelgan xatni tekşiring.'
  return 'Xatolik yuz berdi. Keyinroq qayta urinib köring.'
}
