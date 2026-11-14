/** Hisobdan chiqish: Supabase sessiyasi, mahalliy ma'lumot va SW keshlari tozalanadi. */
import { purgeUserData } from './storage'
import type { SupabaseClient } from '@supabase/supabase-js'
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

/* ------------------------------ parolni almashtirish ------------------------------ */

type AuthClient = { auth: Pick<SupabaseClient['auth'], 'updateUser' | 'reauthenticate'> }

export type PasswordChangeResult = { ok: true } | { ok: false; needsCode: true } | { ok: false; needsCode?: false; reasonUz: string }

export function passwordErrorUz(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string; status?: number }
  const msg = (e.message ?? '').toLowerCase()
  if (e.code === 'same_password' || msg.includes('different from the old')) return 'Yangi parol eskisidan farq qilsin.'
  if (e.code === 'weak_password' || msg.includes('weak')) return 'Parol juda oddiy: kamida 8 belgi, harf va raqam bölsin.'
  if (e.code === 'reauthentication_not_valid' || msg.includes('nonce') || msg.includes('otp')) return 'Tasdiq kodi notöğri yoki muddati tugagan. Yangi kod oling.'
  if (e.code === 'over_email_send_rate_limit' || e.status === 429) return 'Juda köp urinish. Birozdan keyin qayta urinib köring.'
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Internet aloqasi yöq.'
  return 'Parolni özgartirib bölmadi. Birozdan keyin qayta urinib köring.'
}

/**
 * Parolni almashtirish. Serverda «qayta tasdiqlash» yoqilgan: sessiya eski
 * bo'lsa server kod so'raydi — shunda `needsCode` qaytadi va `sendReauthCode`
 * emailga 6 xonali kod yuboradi; keyin shu funksiya `nonce` bilan chaqiriladi.
 */
export async function changePassword(
  newPassword: string,
  nonce?: string,
  getClient: () => Promise<AuthClient | null> = getSupabase,
): Promise<PasswordChangeResult> {
  const bad = validateNewPassword(newPassword)
  if (bad) return { ok: false, reasonUz: bad }
  const sb = await getClient()
  if (!sb) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan.' }
  try {
    const { error } = await sb.auth.updateUser(nonce ? { password: newPassword, nonce: nonce.trim() } : { password: newPassword })
    if (!error) return { ok: true }
    const code = (error as { code?: string }).code
    if (!nonce && (code === 'reauthentication_needed' || /reauthenticat/i.test(error.message))) return { ok: false, needsCode: true }
    return { ok: false, reasonUz: passwordErrorUz(error) }
  } catch (err) {
    return { ok: false, reasonUz: passwordErrorUz(err) }
  }
}

export async function sendReauthCode(getClient: () => Promise<AuthClient | null> = getSupabase): Promise<{ ok: true } | { ok: false; reasonUz: string }> {
  const sb = await getClient()
  if (!sb) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan.' }
  try {
    const { error } = await sb.auth.reauthenticate()
    return error ? { ok: false, reasonUz: passwordErrorUz(error) } : { ok: true }
  } catch (err) {
    return { ok: false, reasonUz: passwordErrorUz(err) }
  }
}

/* ------------------------------ parolni tiklash (unutilgan parol) ------------------------------ */

type ResetRequestClient = { auth: Pick<SupabaseClient['auth'], 'resetPasswordForEmail'> }

/**
 * Kirmagan foydalanuvchi uçun: emailga parolni tiklaş havolasi yuboriladi.
 * Havola saytga qaytadi (`authRedirectUrl`), Supabase uni URL'dan avtomatik
 * oqiydi (`detectSessionInUrl`) va `PASSWORD_RECOVERY` hodisasini qötaradi —
 * şunda App.tsx yangi parol sorovini körsatadi.
 */
export async function requestPasswordReset(
  email: string,
  getClient: () => Promise<ResetRequestClient | null> = getSupabase,
): Promise<{ ok: true } | { ok: false; reasonUz: string }> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, reasonUz: 'Email manzil notöğri körinmoqda.' }
  const sb = await getClient()
  if (!sb) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan.' }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() })
    return error ? { ok: false, reasonUz: passwordErrorUz(error) } : { ok: true }
  } catch (err) {
    return { ok: false, reasonUz: passwordErrorUz(err) }
  }
}

type SetNewPasswordClient = { auth: Pick<SupabaseClient['auth'], 'updateUser' | 'signOut'> }

/**
 * `PASSWORD_RECOVERY` hodisasidan keyingi vaqtinça sessiyada yangi parolni
 * saqlaydi. Muvaffaqiyatli bölsa — foydalanuvchi endi şu parol bilan
 * kirişi kerak (sessiya özi saqlanib qoladi, lekin aniqlik uçun çiqariladi).
 */
export async function setNewPasswordAfterRecovery(
  newPassword: string,
  getClient: () => Promise<SetNewPasswordClient | null> = getSupabase,
): Promise<{ ok: true } | { ok: false; reasonUz: string }> {
  const bad = validateNewPassword(newPassword)
  if (bad) return { ok: false, reasonUz: bad }
  const sb = await getClient()
  if (!sb) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan.' }
  try {
    const { error } = await sb.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, reasonUz: passwordErrorUz(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, reasonUz: passwordErrorUz(err) }
  }
}
