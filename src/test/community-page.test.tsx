/**
 * Hamjamiyat sahifasi mehmon rejimida: soxta ro'yxat yo'q, SABAB ochiq aytiladi.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../lib/store'
import Community from '../pages/Community'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Hamjamiyat — server ulanmagan', () => {
  it('sabab va kiriş havolasi körsatiladi, yuboriş/tekşiriş tugmalari yöq', async () => {
    render(
      <MemoryRouter>
        <StoreProvider userId="u-community">
          <Community />
        </StoreProvider>
      </MemoryRouter>,
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(screen.getByRole('heading', { name: 'Hamjamiyat tekşiruvi' })).toBeTruthy()
    expect(screen.getByText(/Server \(Supabase\) ulanmagan/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Hisobga kiriş' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Tekşiriş uçun javob oliş' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Yuboriş' })).toBeNull()
  })
})
