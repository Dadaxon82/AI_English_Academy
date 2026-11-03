/**
 * Hisobdan chiqish xavfsizligi.
 *
 * ESKI BUG: "Hisobdan chiqish" lokal ma'lumot va sinxron navbatini darhol
 * o'chirardi — serverga yetmagan progress jimgina yo'qolardi.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/supabase')>()
  const fake = await import('./fakeSupabase')
  return { ...real, supabaseConfigured: true, getSupabase: () => fake.client }
})

import { server } from './fakeSupabase'
import { AuthContext } from '../lib/authContext'
import { StoreProvider } from '../lib/store'
import { emptyData, type AppData } from '../lib/types'
import Settings from '../pages/Settings'

const UID = 'u-test'

function seedLocal(n: number) {
  const data: AppData = {
    ...emptyData(UID),
    attempts: Array.from({ length: n }, (_, i) => ({
      id: `att-${i + 1}`,
      exerciseId: 'a1-ex-g1-01',
      skill: 'grammar' as const,
      level: 'A1' as const,
      correct: true,
      partial: 1,
      difficulty: 1,
      secondsSpent: 10,
      source: 'practice' as const,
      answerGiven: 'am',
      at: Date.UTC(2026, 10, 1, 9, 0, i),
    })),
  }
  // jsdom'da IndexedDB yo'q — storage localStorage zaxirasini ishlatadi.
  localStorage.setItem(`aea:data:${UID}`, JSON.stringify(data))
}

function renderSettings(signOut: () => void) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ signOut }}>
        <StoreProvider userId={UID} remoteSync>
          <Settings />
        </StoreProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  server.reset(UID)
})

afterEach(() => {
  cleanup()
})

describe('Hisobdan chiqish — avval sinxron, yuborilmagan narsa qolsa ogohlantirish', () => {
  it('hammasi serverga yetsa darhol chiqadi', async () => {
    seedLocal(5)
    const signOut = vi.fn()
    renderSettings(signOut)
    fireEvent.click(await screen.findByRole('button', { name: 'Hisobdan chiqish' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(server.rows('exercise_attempts')).toHaveLength(5)
    expect(screen.queryByText('Serverga yetmagan ma’lumot bor')).toBeNull()
  })

  it('internet bo‘lmasa chiqmaydi, tasdiq so‘raydi; tasdiqdan keyingina chiqadi', async () => {
    seedLocal(5)
    server.network = true
    const signOut = vi.fn()
    renderSettings(signOut)
    fireEvent.click(await screen.findByRole('button', { name: 'Hisobdan chiqish' }))
    expect(await screen.findByText('Serverga yetmagan ma’lumot bor')).toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Baribir chiqish' }))
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
