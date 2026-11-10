/**
 * ProtectedRoute: admin bo'lmagan (mehmon / server ulanmagan) foydalanuvchi
 * admin panelni ko'rmaydi va Dashboard'ga yo'naltiriladi; menyuda havola yo'q.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import AdminRoute from '../components/admin/AdminRoute'
import { AuthContext } from '../lib/authContext'
import { resetAdminCache } from '../lib/admin'

afterEach(() => {
  cleanup()
  resetAdminCache()
})

describe('AdminRoute', () => {
  it('admin emas → /dashboard, maxfiy kontent körinmaydi', async () => {
    render(
      <AuthContext.Provider value={{ signOut: () => {}, userId: 'u-1' }}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <p>MAXFIY ADMIN</p>
                </AdminRoute>
              }
            />
            <Route path="/dashboard" element={<p>BOŞ SAHIFA</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByText('BOŞ SAHIFA')).toBeTruthy()
    expect(screen.queryByText('MAXFIY ADMIN')).toBeNull()
  })
})
