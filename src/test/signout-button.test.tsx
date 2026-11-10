/**
 * Header'dagi «Chiqish» tugmasi: mehmon hisobida darhol chiqadi (ma'lumot
 * saqlanadi) va kirish sahifasiga o'tadi.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../lib/store'
import { AuthContext } from '../lib/authContext'
import SignOutButton from '../components/SignOutButton'

beforeEach(() => localStorage.clear())
afterEach(() => cleanup())

describe('SignOutButton', () => {
  it('mehmon: bosilganda signOut chaqiriladi va /login ochiladi', async () => {
    const signOut = vi.fn()
    render(
      <AuthContext.Provider value={{ signOut, userId: null }}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <StoreProvider userId="local-test-guest">
            <Routes>
              <Route path="/dashboard" element={<SignOutButton compact />} />
              <Route path="/login" element={<p>KIRISH SAHIFASI</p>} />
            </Routes>
          </StoreProvider>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    const btn = await screen.findByRole('button', { name: 'Chiqish (ma’lumot saqlanadi)' })
    expect(btn.textContent).toContain('Chiqish')
    await act(async () => {
      fireEvent.click(btn)
    })
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('KIRISH SAHIFASI')).toBeTruthy()
  })
})
