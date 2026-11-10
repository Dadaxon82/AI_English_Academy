/** Hisobdan chiqish: Supabase sessiyasi, mahalliy ma'lumot va SW keshlari tozalanadi. */
import { purgeUserData } from './storage'
import { getSupabase } from './supabase'

export async function signOutCurrent(userId: string) {
  const sb = await getSupabase()
  if (sb) await sb.auth.signOut()
  await purgeUserData(userId)
  // Service Worker keshlari (Supabase GET javoblari, audio, rasm) — logout'da
  // to'zalanadi, keyingi foydalanuvchi oldingisining ma'lumotINI ko'masin.
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n.startsWith('aea-')).map((n) => caches.delete(n)))
    }
  } catch {
    /* kesh o'chirilmasa ham xavfsizlik RLS'da — davom etamiz */
  }
}

/** Yangi parol talabi — Supabase Auth sozlamasi bilan bir xil (min 8, harf + raqam). */
export const NEW_PASSWORD_MIN = 8

/** Ro'yxatdan o'tishdagi parol: xato bo'lsa o'zbekcha sabab, aks holda null. */
export function validateNewPassword(pw: string): string | null {
  if (pw.length < NEW_PASSWORD_MIN) return `Parol kamida ${NEW_PASSWORD_MIN} belgi bölişi kerak.`
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Parolda kamida bitta harf va bitta raqam bölsin.'
  return null
}

/** Email tasdiq havolasi qaytadigan manzil (saytning öz bazasi; localhost emas). */
export function authRedirectUrl(): string {
  return new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
}
