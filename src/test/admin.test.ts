/**
 * Admin panel — mijoz qatlami (`src/lib/admin.ts`).
 * Server qoidalari (rol himoyasi, RLS, bloklash) alohida: `supabase/tests/admin.test.sql`.
 */
import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminErrorUz,
  bucketLevels,
  deleteUser,
  fetchIsAdmin,
  growthPct,
  levelBucket,
  listUsers,
  loadAdminStats,
  pageCount,
  setUserRole,
  updateUser,
  validateAvatarUrl,
  validateFullName,
  PAGE_SIZE,
  type AdminDeps,
} from '../lib/admin'

type Call = { op: string; name?: string; args?: unknown; table?: string; patch?: unknown; eq?: unknown[] }

function fake(opts: {
  session?: { user: { id: string } } | null
  rpc?: Record<string, { data?: unknown; error?: { code?: string; message: string } }>
  updateRows?: unknown[]
  updateError?: { code?: string; message: string }
}) {
  const calls: Call[] = []
  const client = {
    auth: { getSession: async () => ({ data: { session: opts.session === undefined ? { user: { id: 'admin-1' } } : opts.session }, error: null }) },
    rpc: async (name: string, args?: unknown) => {
      calls.push({ op: 'rpc', name, args })
      const r = opts.rpc?.[name] ?? { data: null }
      return { data: r.data ?? null, error: r.error ?? null }
    },
    from: (table: string) => ({
      update: (patch: unknown) => ({
        eq: (c: string, v: unknown) => ({
          select: async () => {
            calls.push({ op: 'update', table, patch, eq: [c, v] })
            return opts.updateError ? { data: null, error: opts.updateError } : { data: opts.updateRows ?? [{ id: v }], error: null }
          },
        }),
      }),
    }),
  }
  const deps: AdminDeps = { configured: true, getClient: async () => client as unknown as SupabaseClient }
  return { deps, calls }
}

describe('sof yordamchilar', () => {
  it('o‘sish foizi: oldingi 0 bo‘lsa null, aks holda yaxlitlangan %', () => {
    expect(growthPct(5, 0)).toBeNull()
    expect(growthPct(15, 10)).toBe(50)
    expect(growthPct(5, 10)).toBe(-50)
    expect(growthPct(1, 3)).toBe(-67)
  })

  it('CEFR → Beginner/Intermediate/Advanced', () => {
    expect(levelBucket('A1')).toBe('Beginner')
    expect(levelBucket('A2')).toBe('Beginner')
    expect(levelBucket('B2')).toBe('Intermediate')
    expect(levelBucket('C1')).toBe('Advanced')
    expect(levelBucket(null)).toBe('Belgilanmagan')
    expect(levelBucket('none')).toBe('Belgilanmagan')
    expect(bucketLevels({ A1: 3, A2: 2, B1: 1, C1: 4, none: 5 })).toEqual([
      { name: 'Beginner', value: 5 },
      { name: 'Intermediate', value: 1 },
      { name: 'Advanced', value: 4 },
      { name: 'Belgilanmagan', value: 5 },
    ])
  })

  it('ism va rasm havolasini tekshirish', () => {
    expect(validateFullName('  ')).toMatch(/bo‘sh/)
    expect(validateFullName('a'.repeat(81))).toMatch(/uzun/)
    expect(validateFullName('Ali')).toBeNull()
    expect(validateAvatarUrl('')).toBeNull()
    expect(validateAvatarUrl('http://x.uz/a.png')).toMatch(/https/)
    expect(validateAvatarUrl('javascript:alert(1)')).toMatch(/https/)
    expect(validateAvatarUrl('https://x.uz/a.png')).toBeNull()
  })

  it('sahifalar soni kamida 1', () => {
    expect(pageCount(0)).toBe(1)
    expect(pageCount(PAGE_SIZE)).toBe(1)
    expect(pageCount(PAGE_SIZE + 1)).toBe(2)
  })

  it('server xatolari tushunarli sababga aylanadi (SQL sizib chiqmaydi)', () => {
    expect(adminErrorUz({ code: '42501', message: 'admin_last' })).toMatch(/oxirgi faol admin/)
    expect(adminErrorUz({ code: '42501', message: 'admin_self_block' })).toMatch(/bloklay olmaysiz/)
    expect(adminErrorUz({ code: '42501', message: 'admin_only' })).toMatch(/faqat admin/)
    expect(adminErrorUz({ code: 'PGRST202', message: 'Could not find the function' })).toMatch(/0007_admin\.sql/)
    expect(adminErrorUz({ message: 'Failed to fetch' })).toMatch(/Internet/)
    expect(adminErrorUz({ code: 'XX000', message: 'select * from secret' })).not.toMatch(/select/)
  })
})

describe('server bilan ishlash', () => {
  it('server sozlanmagan yoki kirmagan — sabab, so‘rov yo‘q', async () => {
    const off: AdminDeps = { configured: false, getClient: async () => null }
    expect(await fetchIsAdmin(off)).toEqual({ ok: false, reasonUz: expect.stringMatching(/ulanmagan/) })
    const { deps, calls } = fake({ session: null })
    expect(await loadAdminStats(deps)).toEqual({ ok: false, reasonUz: expect.stringMatching(/kiring/) })
    expect(calls).toHaveLength(0)
  })

  it('is_admin faqat aniq true bo‘lsa admin', async () => {
    expect(await fetchIsAdmin(fake({ rpc: { is_admin: { data: true } } }).deps)).toEqual({ ok: true, data: true })
    expect(await fetchIsAdmin(fake({ rpc: { is_admin: { data: 'true' } } }).deps)).toEqual({ ok: true, data: false })
    expect(await fetchIsAdmin(fake({ rpc: { is_admin: { data: null } } }).deps)).toEqual({ ok: true, data: false })
  })

  it('statistika: sonlar normallashtiriladi', async () => {
    const { deps } = fake({
      rpc: {
        admin_stats: {
          data: {
            total_users: 12, new_this_week: 3, new_prev_week: 2, dau: 4, avg_streak: '2.5', total_xp: 900,
            admins: 1, moderators: 2, blocked: 1,
            signups_30d: [{ day: '2026-11-10', count: 2 }],
            levels: { A1: 5, B1: '2' },
          },
        },
      },
    })
    const r = await loadAdminStats(deps)
    expect(r.ok && r.data).toMatchObject({ total_users: 12, avg_streak: 2.5, levels: { A1: 5, B1: 2 }, signups_30d: [{ day: '2026-11-10', count: 2 }] })
  })

  it('ro‘yxat: qidiruv, filtr va sahifa serverga uzatiladi, total_count olinadi', async () => {
    const { deps, calls } = fake({
      rpc: {
        admin_list_users: {
          data: [
            { id: 'u1', full_name: 'Ali', email: 'ali@x.uz', avatar_url: null, role: 'user', status: 'active', xp: 120, streak: 3, level: 'B1', created_at: '2026-11-01T10:00:00Z', last_active: '2026-11-10', total_count: 23 },
          ],
        },
      },
    })
    const r = await listUsers({ search: '  ali ', role: 'user', status: 'active', page: 2 }, deps)
    expect(calls[0]).toEqual({
      op: 'rpc',
      name: 'admin_list_users',
      args: { p_search: 'ali', p_role: 'user', p_status: 'active', p_limit: PAGE_SIZE, p_offset: 2 * PAGE_SIZE },
    })
    expect(r.ok && r.data.total).toBe(23)
    expect(r.ok && r.data.rows[0]).toMatchObject({ id: 'u1', xp: 120, streak: 3, level: 'B1' })
  })

  it('rolni o‘zgartirish — profiles UPDATE; 0 qator — ruxsat yo‘q', async () => {
    const ok = fake({})
    expect(await setUserRole('u1', 'moderator', ok.deps)).toEqual({ ok: true, data: null })
    expect(ok.calls[0]).toEqual({ op: 'update', table: 'profiles', patch: { role: 'moderator' }, eq: ['id', 'u1'] })

    const none = fake({ updateRows: [] })
    expect(await setUserRole('u1', 'admin', none.deps)).toEqual({ ok: false, reasonUz: expect.stringMatching(/ruxsat yo‘q/) })

    const last = fake({ updateError: { code: '42501', message: 'admin_last' } })
    expect(await setUserRole('me', 'user', last.deps)).toEqual({ ok: false, reasonUz: expect.stringMatching(/oxirgi faol admin/) })
  })

  it('tahrirlash: tekshiruvdan o‘tmasa so‘rov yuborilmaydi; aks holda tozalangan qiymatlar', async () => {
    const bad = fake({})
    expect((await updateUser('u1', { full_name: ' ', avatar_url: '', role: 'user', status: 'active' }, bad.deps)).ok).toBe(false)
    expect(bad.calls).toHaveLength(0)

    const good = fake({})
    await updateUser('u1', { full_name: '  Ali Valiyev ', avatar_url: '  ', role: 'user', status: 'blocked' }, good.deps)
    expect(good.calls[0].patch).toEqual({ display_name: 'Ali Valiyev', avatar_url: null, role: 'user', status: 'blocked' })
  })

  it('o‘chirish — admin_delete_user RPC', async () => {
    const { deps, calls } = fake({ rpc: { admin_delete_user: { error: { code: '42501', message: 'admin_delete_admin' } } } })
    expect(await deleteUser('u9', deps)).toEqual({ ok: false, reasonUz: expect.stringMatching(/Adminni o‘chirib bo‘lmaydi/) })
    expect(calls[0]).toEqual({ op: 'rpc', name: 'admin_delete_user', args: { p_user: 'u9' } })
  })
})
