/**
 * Auth konteksti — App `signOut` funksiyasini taqdim etadi, ichki sahifalar
 * (masalan Settings akkaunt bo'limi) "Chiqish" tugmasi uchun shu yerdan
 * oladi. Alohida fayl: pages → App → pages aylanma importi bo'lmasin.
 */
import { createContext, useContext } from 'react'

export interface AuthActions {
  /** Supabase sessiyasi + mahalliy kesh + SW keshlarini tozalaydi. */
  signOut(): void
}

export const AuthContext = createContext<AuthActions | null>(null)

export function useAuthActions(): AuthActions | null {
  return useContext(AuthContext)
}
