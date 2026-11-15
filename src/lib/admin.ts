/**
 * ADMIN PANEL — mijoz qatlami.
 *
 * Server qismi: `supabase/migrations/0007_admin.sql`. Xavfsizlik SERVERDA:
 * rol/statusni faqat admin o'zgartiradi (`profiles_guard` trigger'i), admin
 * RPC'lari `is_admin()` ni tekshiradi, RLS boshqalarning profilini faqat
 * adminga ochadi. Bu modul faqat UI uchun: so'rov yuboradi va har xatoni
 * tushunarli o'zbekcha SABAB bilan qaytaradi.
 *
 * Ko'rsatkichlar HAQIQIY yozuvlardan: XP — `weekly_xp` (urinishlardan),
 * streak — `daily_activity`, daraja — `user_settings.current_level`. Admin
 * ularni qo'lda o'zgartirmaydi.
 */

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase, supabaseConfigured } from './supabase'

export type AdminRole = 'user' | 'moderator' | 'admin'
export type UserStatus = 'active' | 'blocked'

export const ROLES: { id: AdminRole; labelUz: string }[] = [
  { id: 'user', labelUz: 'Foydalanuvçi' },
  { id: 'moderator', labelUz: 'Moderator' },
  { id: 'admin', labelUz: 'Admin' },
]

export const STATUSES: { id: UserStatus; labelUz: string }[] = [
  { id: 'active', labelUz: 'Faol' },
  { id: 'blocked', labelUz: 'Bloklangan' },
]

export const PAGE_SIZE = 10
export const FULL_NAME_MAX = 80

export interface AdminUser {
  id: string
  full_name: string
  email: string | null
  avatar_url: string | null
  role: AdminRole
  status: UserStatus
  xp: number
  streak: number
  level: string | null
  created_at: string
  last_active: string | null
}

export interface AdminStats {
  total_users: number
  new_this_week: number
  new_prev_week: number
  dau: number
  avg_streak: number
  total_xp: number
  admins: number
  moderators: number
  blocked: number
  signups_30d: { day: string; count: number }[]
  levels: Record<string, number>
}

export interface UserQuery {
  search: string
  role: AdminRole | null
  status: UserStatus | null
  page: number
}

export type AdminResult<T> = { ok: true; data: T } | { ok: false; reasonUz: string }

/* ------------------------------ sof yordamchilar ------------------------------ */

/** O'tgan haftaga nisbatan o'sish (%). Avval 0 bo'lsa — `null` (cheksiz o'sishni ko'rsatmaymiz). */
export function growthPct(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export type LevelBucket = 'Beginner' | 'Intermediate' | 'Advanced' | 'Belgilanmagan'

/** CEFR → umumiy guruh: A1–A2 Beginner, B1–B2 Intermediate, C1+ Advanced. */
export function levelBucket(level: string | null | undefined): LevelBucket {
  switch (level) {
    case 'A1':
    case 'A2':
      return 'Beginner'
    case 'B1':
    case 'B2':
      return 'Intermediate'
    case 'C1':
    case 'C2':
      return 'Advanced'
    default:
      return 'Belgilanmagan'
  }
}

export const LEVEL_BUCKETS: LevelBucket[] = ['Beginner', 'Intermediate', 'Advanced', 'Belgilanmagan']

export function bucketLevels(levels: Record<string, number>): { name: LevelBucket; value: number }[] {
  const sums = new Map<LevelBucket, number>(LEVEL_BUCKETS.map((b) => [b, 0]))
  for (const [lvl, n] of Object.entries(levels)) {
    const b = levelBucket(lvl)
    sums.set(b, (sums.get(b) ?? 0) + (Number(n) || 0))
  }
  return LEVEL_BUCKETS.map((name) => ({ name, value: sums.get(name) ?? 0 }))
}

export function validateFullName(name: string): string | null {
  const t = name.trim()
  if (t.length === 0) return 'Ism böş bölmasin.'
  if (t.length > FULL_NAME_MAX) return `Ism juda uzun (köpi bilan ${FULL_NAME_MAX} belgi).`
  return null
}

export function validateAvatarUrl(url: string): string | null {
  const t = url.trim()
  if (t === '') return null
  if (t.length > 500) return 'Havola juda uzun (köpi bilan 500 belgi).'
  if (!/^https:\/\/\S+$/.test(t)) return 'Rasm havolasi https:// bilan boşlansin.'
  return null
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size))
}

/** Server/tarmoq xatosi → tushunarli sabab (SQL yoki token sizib chiqmaydi). */
export function adminErrorUz(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string }
  const msg = (e.message ?? '').toLowerCase()
  if (msg.includes('admin_last')) return 'Bu oxirgi faol admin — avval boşqa foydalanuvçini admin qiling.'
  if (msg.includes('admin_self_block')) return 'Özingizni bloklay olmaysiz.'
  if (msg.includes('admin_self_delete')) return 'Öz hisobingizni bu yerdan öçira olmaysiz.'
  if (msg.includes('admin_delete_admin')) return 'Adminni öçirib bölmaydi — avval rolini özgartiring.'
  if (msg.includes('admin_not_found')) return 'Foydalanuvçi topilmadi (allaqaçon öçirilgan bölişi mumkin).'
  if (msg.includes('admin_only') || e.code === '42501') return 'Bu amal faqat admin uçun.'
  if (e.code === 'PGRST202' || e.code === 'PGRST205' || e.code === '42883' || e.code === '42P01' || msg.includes('schema cache'))
    return 'Serverda admin funksiyalari hali yöq: `supabase/migrations/0007_admin.sql` migratsiyasini qöllang.'
  if (e.code === '23514') return 'Qiymat ruxsat etilgan çegaradan taşqarida.'
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Internet aloqasi yöq. Ulanişni tekşirib, qayta urinib köring.'
  return 'Server xatosi. Birozdan keyin qayta urinib köring.'
}

/* ------------------------------ ulanish ------------------------------ */

export interface AdminDeps {
  getClient(): Promise<SupabaseClient | null>
  configured: boolean
}

const defaultDeps: AdminDeps = { getClient: getSupabase, configured: supabaseConfigured }

async function withClient<T>(
  fn: (c: SupabaseClient, uid: string) => Promise<AdminResult<T>>,
  deps: AdminDeps,
): Promise<AdminResult<T>> {
  if (!deps.configured) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan — admin panel faqat server bilan işlaydi.' }
  const c = await deps.getClient()
  if (!c) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan.' }
  try {
    const { data, error } = await c.auth.getSession()
    if (error) return { ok: false, reasonUz: adminErrorUz(error) }
    const uid = data.session?.user?.id
    if (!uid) return { ok: false, reasonUz: 'Admin panel uçun hisobingizga kiring.' }
    return await fn(c, uid)
  } catch (err) {
    return { ok: false, reasonUz: adminErrorUz(err) }
  }
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/* ------------------------------ amallar ------------------------------ */

/** Joriy foydalanuvchi faol adminmi (server `is_admin()`). */
export function fetchIsAdmin(deps: AdminDeps = defaultDeps): Promise<AdminResult<boolean>> {
  return withClient(async (c) => {
    const { data, error } = await c.rpc('is_admin')
    if (error) return { ok: false, reasonUz: adminErrorUz(error) }
    return { ok: true, data: data === true }
  }, deps)
}

export function loadAdminStats(deps: AdminDeps = defaultDeps): Promise<AdminResult<AdminStats>> {
  return withClient(async (c) => {
    const { data, error } = await c.rpc('admin_stats')
    if (error) return { ok: false, reasonUz: adminErrorUz(error) }
    const d = (data ?? {}) as Record<string, unknown>
    const signups = Array.isArray(d.signups_30d) ? (d.signups_30d as { day?: unknown; count?: unknown }[]) : []
    const levels = d.levels && typeof d.levels === 'object' ? (d.levels as Record<string, unknown>) : {}
    return {
      ok: true,
      data: {
        total_users: num(d.total_users),
        new_this_week: num(d.new_this_week),
        new_prev_week: num(d.new_prev_week),
        dau: num(d.dau),
        avg_streak: num(d.avg_streak),
        total_xp: num(d.total_xp),
        admins: num(d.admins),
        moderators: num(d.moderators),
        blocked: num(d.blocked),
        signups_30d: signups.map((r) => ({ day: String(r.day ?? ''), count: num(r.count) })),
        levels: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, num(v)])),
      },
    }
  }, deps)
}

export function listUsers(q: UserQuery, deps: AdminDeps = defaultDeps): Promise<AdminResult<{ rows: AdminUser[]; total: number }>> {
  return withClient(async (c) => {
    const { data, error } = await c.rpc('admin_list_users', {
      p_search: q.search.trim().slice(0, 100),
      p_role: q.role,
      p_status: q.status,
      p_limit: PAGE_SIZE,
      p_offset: Math.max(0, q.page) * PAGE_SIZE,
    })
    if (error) return { ok: false, reasonUz: adminErrorUz(error) }
    const raw = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
    const rows: AdminUser[] = raw.map((r) => ({
      id: String(r.id),
      full_name: String(r.full_name ?? ''),
      email: r.email == null ? null : String(r.email),
      avatar_url: r.avatar_url == null ? null : String(r.avatar_url),
      role: (r.role as AdminRole) ?? 'user',
      status: (r.status as UserStatus) ?? 'active',
      xp: num(r.xp),
      streak: num(r.streak),
      level: r.level == null ? null : String(r.level),
      created_at: String(r.created_at ?? ''),
      last_active: r.last_active == null ? null : String(r.last_active),
    }))
    return { ok: true, data: { rows, total: raw.length ? num(raw[0].total_count) : 0 } }
  }, deps)
}

async function updateProfile(
  userId: string,
  patch: Record<string, unknown>,
  deps: AdminDeps,
): Promise<AdminResult<null>> {
  return withClient(async (c) => {
    const { data, error } = await c.from('profiles').update(patch).eq('id', userId).select('id')
    if (error) return { ok: false, reasonUz: adminErrorUz(error) }
    // RLS bo'yicha ruxsat bo'lmasa xato emas, 0 qator qaytadi.
    if (!Array.isArray(data) || data.length === 0) return { ok: false, reasonUz: 'Özgartirilmadi: ruxsat yöq yoki foydalanuvçi topilmadi.' }
    return { ok: true, data: null }
  }, deps)
}

export function setUserRole(userId: string, role: AdminRole, deps: AdminDeps = defaultDeps): Promise<AdminResult<null>> {
  return updateProfile(userId, { role }, deps)
}

export function updateUser(
  userId: string,
  patch: { full_name: string; avatar_url: string; role: AdminRole; status: UserStatus },
  deps: AdminDeps = defaultDeps,
): Promise<AdminResult<null>> {
  const bad = validateFullName(patch.full_name) ?? validateAvatarUrl(patch.avatar_url)
  if (bad) return Promise.resolve({ ok: false, reasonUz: bad })
  return updateProfile(
    userId,
    {
      display_name: patch.full_name.trim(),
      avatar_url: patch.avatar_url.trim() || null,
      role: patch.role,
      status: patch.status,
    },
    deps,
  )
}

export function deleteUser(userId: string, deps: AdminDeps = defaultDeps): Promise<AdminResult<null>> {
  return withClient(async (c) => {
    const { error } = await c.rpc('admin_delete_user', { p_user: userId })
    if (error) return { ok: false, reasonUz: adminErrorUz(error) }
    return { ok: true, data: null }
  }, deps)
}

/* ------------------------------ hook ------------------------------ */

export type AdminCheck = 'checking' | 'admin' | 'not-admin'

let cached: { uid: string | null; value: boolean } | null = null

/** Faqat testlar uchun. */
export function resetAdminCache(): void {
  cached = null
}

/**
 * Joriy foydalanuvchi admin ekanini tekshiradi (sessiya davomida keshlanadi).
 * `userId` o'zgarsa (boshqa hisobga kirildi) — qayta so'raladi.
 */
export function useIsAdmin(userId: string | null, deps: AdminDeps = defaultDeps): AdminCheck {
  const hit = cached && cached.uid === userId ? (cached.value ? 'admin' : 'not-admin') : null
  const [state, setState] = useState<{ uid: string | null; value: AdminCheck }>({ uid: userId, value: hit ?? 'checking' })

  useEffect(() => {
    if (cached && cached.uid === userId) return
    let alive = true
    if (!userId || !deps.configured) {
      cached = { uid: userId, value: false }
      queueMicrotask(() => alive && setState({ uid: userId, value: 'not-admin' }))
      return () => {
        alive = false
      }
    }
    void fetchIsAdmin(deps).then((r) => {
      const value = r.ok && r.data
      cached = { uid: userId, value }
      if (alive) setState({ uid: userId, value: value ? 'admin' : 'not-admin' })
    })
    return () => {
      alive = false
    }
  }, [userId, deps])

  if (hit) return hit
  return state.uid === userId ? state.value : 'checking'
}
