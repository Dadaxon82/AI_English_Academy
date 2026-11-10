/**
 * Hisob amallari: chiqish va "Barcha ma'lumotni o'chirish".
 *
 * ESKI BUG'lar: "Hisobdan chiqish" lokal ma'lumot va sinxron navbatini darhol
 * o'chirardi — serverga yetmagan progress jimgina yo'qolardi; "Barcha
 * ma'lumotni o'chirish" esa serverdagi yozuvlarga tegmasdi (endi ular
 * keyingi kirishda qaytib kelardi).
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
import { useStore } from '../lib/storeContext'
import { emptyData, type AppData } from '../lib/types'
import Settings from '../pages/Settings'

function AttemptCount() {
  const { data } = useStore()
  return <output data-testid="attempts">{data.attempts.length}</output>
}

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
          <AttemptCount />
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

describe('Hisobdan çiqiş — avval sinxron, yuborilmagan narsa qolsa ogohlantiriş', () => {
  it('hammasi serverga yetsa darhol çiqadi', async () => {
    seedLocal(5)
    const signOut = vi.fn()
    renderSettings(signOut)
    fireEvent.click(await screen.findByRole('button', { name: 'Hisobdan çiqiş' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(server.rows('exercise_attempts')).toHaveLength(5)
    expect(screen.queryByText('Serverga yetmagan ma’lumot bor')).toBeNull()
  })

  it('internet bölmasa çiqmaydi, tasdiq söraydi; tasdiqdan keyingina çiqadi', async () => {
    seedLocal(5)
    server.network = true
    const signOut = vi.fn()
    renderSettings(signOut)
    fireEvent.click(await screen.findByRole('button', { name: 'Hisobdan çiqiş' }))
    expect(await screen.findByText('Serverga yetmagan ma’lumot bor')).toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Baribir çiqiş' }))
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})

describe('Barça ma’lumotni öçiriş — hisobga kirgan foydalanuvçida serverdan ham', () => {
  const openAndConfirm = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Barça ma’lumotni öçiriş' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ha, öçirilsin' }))
  }

  it('serverdagi şaxsiy yozuvlar va qurilmadagi ma’lumot öçadi', async () => {
    seedLocal(5)
    server.tables.set('exercise_attempts', new Map([['att-1', { id: 'att-1', user_id: UID }]]))
    server.tables.set('user_settings', new Map([[UID, { user_id: UID, daily_minutes: 90 }]]))
    renderSettings(vi.fn())
    expect(await screen.findByTestId('attempts')).toHaveTextContent('5')
    await openAndConfirm()
    expect(await screen.findByText(/Ma’lumotlar öçirildi/)).toBeInTheDocument()
    expect(server.rows('exercise_attempts')).toHaveLength(0)
    expect(server.rows('user_settings')).toHaveLength(0)
    expect(screen.getByTestId('attempts')).toHaveTextContent('0')
  })

  it('server öçira olmasa qurilmadagi ma’lumot ham tegilmaydi (qayta uriniş mumkin)', async () => {
    seedLocal(5)
    server.tables.set('exercise_attempts', new Map([['att-1', { id: 'att-1', user_id: UID }]]))
    server.network = true
    renderSettings(vi.fn())
    expect(await screen.findByTestId('attempts')).toHaveTextContent('5')
    await openAndConfirm()
    expect(await screen.findByText(/Qurilmadagi ma’lumotlar özgarmadi/)).toBeInTheDocument()
    expect(screen.getByTestId('attempts')).toHaveTextContent('5')
    expect(server.rows('exercise_attempts')).toHaveLength(1)
  })
})
