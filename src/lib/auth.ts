/** Hisobdan chiqish: Supabase sessiyasi, mahalliy ma'lumot va SW keshlari tozalanadi. */
import { purgeUserData } from './storage'
import { getSupabase } from './supabase'

export async function signOutCurrent(userId: string) {
  const sb = getSupabase()
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
