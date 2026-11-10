/**
 * Admin panel sahifasi: KPI, jadval, rolni tezkor o'zgartirish, qidiruv,
 * tahrirlash modali va toast xabarlari. Server qatlami soxtalashtirilgan.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminStats, AdminUser } from '../lib/admin'
import { AuthContext } from '../lib/authContext'

const api = vi.hoisted(() => ({
  loadAdminStats: vi.fn(),
  listUsers: vi.fn(),
  setUserRole: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}))

vi.mock('../lib/admin', async (orig) => ({ ...(await orig<typeof import('../lib/admin')>()), ...api }))

import AdminDashboard from '../pages/admin/AdminDashboard'

const STATS: AdminStats = {
  total_users: 12,
  new_this_week: 3,
  new_prev_week: 2,
  dau: 4,
  avg_streak: 2.5,
  total_xp: 9800,
  admins: 1,
  moderators: 2,
  blocked: 1,
  signups_30d: Array.from({ length: 30 }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, '0')}`, count: i % 3 })),
  levels: { A1: 5, B1: 2, C1: 1, none: 4 },
}

const USERS: AdminUser[] = [
  { id: 'me', full_name: 'Bosh Admin', email: 'admin@x.uz', avatar_url: null, role: 'admin', status: 'active', xp: 500, streak: 7, level: 'C1', created_at: '2026-10-01T00:00:00Z', last_active: '2026-11-10' },
  { id: 'u2', full_name: 'Ali Valiyev', email: 'ali@x.uz', avatar_url: null, role: 'user', status: 'active', xp: 120, streak: 3, level: 'A2', created_at: '2026-11-02T00:00:00Z', last_active: '2026-11-10' },
]

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', RO)
  api.loadAdminStats.mockResolvedValue({ ok: true, data: STATS })
  api.listUsers.mockResolvedValue({ ok: true, data: { rows: USERS, total: 2 } })
  api.setUserRole.mockResolvedValue({ ok: true, data: null })
  api.updateUser.mockResolvedValue({ ok: true, data: null })
  api.deleteUser.mockResolvedValue({ ok: true, data: null })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function renderPage() {
  return render(
    <AuthContext.Provider value={{ signOut: () => {}, userId: 'me' }}>
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('Admin panel', () => {
  it('KPI kartochkalari va jadval serverdagi sonlarni ko‘rsatadi', async () => {
    renderPage()
    expect(await screen.findByText('Jami foydalanuvchilar')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText(/\+50% o‘tgan haftaga nisbatan/)).toBeTruthy()
    expect(screen.getByText(/O‘rtacha streak: 2.5 kun/)).toBeTruthy()
    expect(screen.getByText('1 admin · 2 moderator · 1 bloklangan')).toBeTruthy()
    expect(screen.getByText(/Beginner: 5 · Intermediate: 2 · Advanced: 1 · Belgilanmagan: 4/)).toBeTruthy()

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Ali Valiyev')).toBeTruthy()
    expect(within(table).getByText('(siz)')).toBeTruthy()
    expect(api.listUsers).toHaveBeenCalledWith({ search: '', role: null, status: null, page: 0 })
  })

  it('rolni jadvalning o‘zida o‘zgartirish → UPDATE, toast va ro‘yxat yangilanadi', async () => {
    renderPage()
    const sel = await screen.findByLabelText('Ali Valiyev roli')
    fireEvent.change(sel, { target: { value: 'moderator' } })
    await waitFor(() => expect(api.setUserRole).toHaveBeenCalledWith('u2', 'moderator'))
    expect(await screen.findByText('Ali Valiyev endi — Moderator.')).toBeTruthy()
    await waitFor(() => expect(api.listUsers).toHaveBeenCalledTimes(2))
  })

  it('server rad etsa — xato toast (sabab bilan)', async () => {
    api.setUserRole.mockResolvedValueOnce({ ok: false, reasonUz: 'Bu oxirgi faol admin — avval boshqa foydalanuvchini admin qiling.' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    fireEvent.change(await screen.findByLabelText('Bosh Admin roli'), { target: { value: 'user' } })
    expect(await screen.findByText(/oxirgi faol admin/)).toBeTruthy()
  })

  it('qidiruv kechiktirib yuboriladi, filtr sahifani boshiga qaytaradi', async () => {
    renderPage()
    await screen.findByRole('table')
    fireEvent.change(screen.getByLabelText('Ism yoki email bo‘yicha qidirish'), { target: { value: 'ali' } })
    expect(api.listUsers).not.toHaveBeenCalledWith(expect.objectContaining({ search: 'ali' }))
    await waitFor(() => expect(api.listUsers).toHaveBeenCalledWith({ search: 'ali', role: null, status: null, page: 0 }), { timeout: 1500 })
    fireEvent.change(screen.getByLabelText('Holat bo‘yicha filtr'), { target: { value: 'blocked' } })
    await waitFor(() => expect(api.listUsers).toHaveBeenCalledWith({ search: 'ali', role: null, status: 'blocked', page: 0 }))
  })

  it('tahrirlash modali: ism va statusni saqlaydi; XP faqat ko‘rish uchun', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Ali Valiyevni tahrirlash' }))
    const dialog = screen.getByRole('dialog', { name: 'Foydalanuvchini tahrirlash' })
    expect(within(dialog).getByText(/qo‘lda o‘zgartirilmaydi/)).toBeTruthy()
    const save = within(dialog).getByRole('button', { name: 'Saqlash' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)

    fireEvent.change(within(dialog).getByLabelText(/^Ism/), { target: { value: 'Ali V.' } })
    fireEvent.change(within(dialog).getByLabelText(/^Holat/), { target: { value: 'blocked' } })
    expect(within(dialog).getByText(/hamjamiyatga javob\/izoh yubora olmaydi/)).toBeTruthy()
    fireEvent.click(save)
    await waitFor(() =>
      expect(api.updateUser).toHaveBeenCalledWith('u2', { full_name: 'Ali V.', avatar_url: '', role: 'user', status: 'blocked' }),
    )
    expect(await screen.findByText('«Ali V.» ma’lumotlari saqlandi.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('o‘chirish faqat email to‘g‘ri yozilganda yoqiladi; o‘zini o‘chirish bo‘limi yo‘q', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Bosh Adminni tahrirlash' }))
    expect(screen.queryByText(/Xavfli zona/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }))

    fireEvent.click(screen.getByRole('button', { name: 'Ali Valiyevni tahrirlash' }))
    const dialog = screen.getByRole('dialog')
    const del = within(dialog).getByRole('button', { name: /Butunlay o‘chirish/ }) as HTMLButtonElement
    expect(del.disabled).toBe(true)
    fireEvent.change(within(dialog).getByLabelText(/Tasdiqlash uchun yozing/), { target: { value: 'ali@x.uz' } })
    expect(del.disabled).toBe(false)
    fireEvent.click(del)
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith('u2'))
    expect(await screen.findByText('«Ali Valiyev» hisobi o‘chirildi.')).toBeTruthy()
  })

  it('server xatosi — soxta son emas, sabab va «Qayta urinish»', async () => {
    api.loadAdminStats.mockResolvedValue({ ok: false, reasonUz: 'Serverda admin funksiyalari hali yo‘q.' })
    renderPage()
    expect(await screen.findByText('Serverda admin funksiyalari hali yo‘q.')).toBeTruthy()
    expect(screen.queryByText('Jami foydalanuvchilar')).toBeNull()
    await act(async () => {
      await Promise.resolve()
    })
  })
})
