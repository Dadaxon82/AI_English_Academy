/**
 * Auth konteksti — App `signOut` funksiyasini taqdim etadi, ichki sahifalar
 * (masalan Settings akkaunt bo'limi) "Chiqish" tugmasi uchun shu yerdan
 * oladi. Alohida fayl: pages → App → pages aylanma importi bo'lmasin.
 */
import { createContext, useContext } from 'react'

export interface AuthActions {
  /** Supabase sessiyasi + mahalliy kesh + SW keshlarini tozalaydi. */
  signOut(): void
  /** Supabase'ga kirgan foydalanuvchi id'si (mehmon rejimida — null). */
  userId?: string | null
  /**
   * Cheklangan mehmon rejimi (Supabase ulangan, lekin ro'yxatdan o'tilmagan):
   * faqat A1.1-bölim ochiq (`lib/guest.ts`).
   */
  guest?: boolean
}

export const AuthContext = createContext<AuthActions | null>(null)

export function useAuthActions(): AuthActions | null {
  return useContext(AuthContext)
}
