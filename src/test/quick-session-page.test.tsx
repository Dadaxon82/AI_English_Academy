/**
 * «5 daqiqa» sahifasi — haqiqiy store + soxta soat.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../lib/store'
import { useStore } from '../lib/storeContext'
import { todayKey } from '../lib/types'
import QuickSession from '../pages/QuickSession'

function Probe() {
  const { data } = useStore()
  return (
    <>
      <output data-testid="today-seconds">{data.activity[todayKey()]?.seconds ?? 0}</output>
      <output data-testid="srs-count">{Object.keys(data.srs).length}</output>
      <output data-testid="timer">{data.timer.startedAt === null ? 'stopped' : 'running'}</output>
      <output data-testid="timer-session">{data.timer.sessionId ?? '-'}</output>
    </>
  )
}

function renderPage(show = true) {
  return render(
    <MemoryRouter>
      <StoreProvider userId="u-quick-page">
        {show && <QuickSession />}
        <Probe />
      </StoreProvider>
    </MemoryRouter>,
  )
}

const advance = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0, 0))
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('«5 daqiqa» sahifasi', () => {
  it('boshlash → klaviatura bilan baholash → vaqt tugaganda natija va 300 sekund faollik', async () => {
    renderPage()
    await advance(50)
    expect(screen.getByRole('heading', { name: /5 daqiqa — tezkor takror/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Boshlash/ }))
    await advance(0)
    expect(screen.getByTestId('timer').textContent).toBe('running')

    // → Bilaman, ← Yana — har biri SRS'ga yoziladi.
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    await advance(0)
    expect(Number(screen.getByTestId('srs-count').textContent)).toBe(2)

    // Tugmalar ham ishlaydi (klaviatura muqobili emas, asosiy yo'l).
    fireEvent.click(screen.getByRole('button', { name: 'Bilaman →' }))
    await advance(0)
    expect(Number(screen.getByTestId('srs-count').textContent)).toBe(3)

    // 5 daqiqa o'tadi — sessiya o'zi yakunlanadi.
    await advance(5 * 60 * 1000 + 1000)
    expect(screen.getByRole('heading', { name: 'Sessiya yakunlandi' })).toBeTruthy()
    expect(screen.getByTestId('timer').textContent).toBe('stopped')
    expect(screen.getByTestId('timer-session').textContent).toBe('-')
    // Taymer soniyada bir yangilanadi: to'xtash 300-soniyadan keyingi birinchi tikda.
    // Haqiqatan o'tgan vaqt yoziladi (kesib tashlanmaydi, oshirilmaydi).
    const sec = Number(screen.getByTestId('today-seconds').textContent)
    expect(sec).toBeGreaterThanOrEqual(300)
    expect(sec).toBeLessThanOrEqual(302)
    expect(screen.getByText(/3 ta karta: 2 tasini bildingiz, 1 tasi qayta takrorlanadi/)).toBeTruthy()
  })

  it('sahifadan chiqilsa taymer pauzaga olinadi va qaytganda «Davom etish» taklif qilinadi', async () => {
    const view = renderPage()
    await advance(50)
    fireEvent.click(screen.getByRole('button', { name: /Boshlash/ }))
    await advance(60_000)
    view.rerender(
      <MemoryRouter>
        <StoreProvider userId="u-quick-page">
          <Probe />
        </StoreProvider>
      </MemoryRouter>,
    )
    await advance(0)
    expect(screen.getByTestId('timer').textContent).toBe('stopped')
    expect(screen.getByTestId('timer-session').textContent).toBe(`quick-${todayKey()}`)
    // Ko'rilmagan vaqt sanalmaydi.
    await advance(10 * 60_000)
    view.rerender(
      <MemoryRouter>
        <StoreProvider userId="u-quick-page">
          <QuickSession />
          <Probe />
        </StoreProvider>
      </MemoryRouter>,
    )
    await advance(0)
    expect(screen.getByRole('heading', { name: /davom etmoqda/ })).toBeTruthy()
    expect(screen.getByText('04:00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))
    await advance(0)
    expect(screen.getByTestId('timer').textContent).toBe('running')
  })
})
