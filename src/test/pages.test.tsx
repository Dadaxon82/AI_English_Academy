/**
 * Sahifa darajasidagi regressiyalar (haqiqiy komponentlar + store, soxta soat).
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiRuntimeEnabled } from '../lib/ai'
import { StoreProvider, useStore } from '../lib/store'
import { todayKey } from '../lib/types'
import MockExam from '../pages/MockExam'
import Speaking from '../pages/Speaking'
import Writing from '../pages/Writing'

function TodaySeconds() {
  const { data } = useStore()
  return <output data-testid="today-seconds">{data.activity[todayKey()]?.seconds ?? 0}</output>
}

function renderPage(page: ReactNode) {
  return render(
    <MemoryRouter>
      <StoreProvider userId="u-page">
        {page}
        <TodaySeconds />
      </StoreProvider>
    </MemoryRouter>,
  )
}

/** Soxta soatni surib, kutilayotgan promise/effektlarni bajarish. */
const advance = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 3, 10, 0, 0))
  // Audio manifesti yo'q — sahifa soxta pleyer ko'rsatmasligi kerak.
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const finishExam = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Imtihonni yakunlash' }))
  fireEvent.click(screen.getByRole('button', { name: 'Ha, yakunlash' }))
}

describe('Mock imtihon — kundalik hisobga faqat ochiq turgan bo‘lim vaqti yoziladi', () => {
  it('erta yakunlansa ochilmagan bo‘limlar vaqt olmaydi (eski: har biri butun vaqtni olardi)', async () => {
    renderPage(<MockExam />)
    await advance()
    fireEvent.click(screen.getByRole('button', { name: 'Imtihonni boshlash' }))
    await advance(5 * 60_000)
    finishExam()
    await advance()
    expect(screen.getByTestId('today-seconds')).toHaveTextContent('300')
  })

  it('bo‘limlar orasida o‘tish vaqtni ikki marta yozmaydi va bo‘lim taymerini qayta boshlamaydi', async () => {
    renderPage(<MockExam />)
    await advance()
    fireEvent.click(screen.getByRole('button', { name: 'Imtihonni boshlash' }))
    await advance(2 * 60_000) // Reading: 2 daq
    fireEvent.click(screen.getByRole('button', { name: 'Listening' }))
    await advance(60_000) // Listening: 1 daq
    fireEvent.click(screen.getByRole('button', { name: 'Reading' }))
    await advance(1000)
    // Reading 15 daqiqalik: 2 daq 1 s sarflangan → 12:59 qoldi (boshidan 15:00 emas)
    expect(screen.getByText('⏱ 12:59')).toBeInTheDocument()
    await advance(59_000)
    finishExam()
    await advance()
    expect(screen.getByTestId('today-seconds')).toHaveTextContent('240')
  })
})

describe('Yozish — AI ulanmagan bo‘lsa "AI" deb ko‘rsatilmaydi', () => {
  it('standart sozlamada (AI bayrog‘i yoqiq, internet bor) tahlil "qoidaviy" deb yoziladi', async () => {
    renderPage(<Writing />)
    await advance()
    expect(screen.getByText('qoidaviy dvigatel')).toBeInTheDocument()
    expect(screen.queryByText(/\+ AI/)).toBeNull()
  })

  it('"ulangan" faqat VITE_AI_ENABLED=true + foydalanuvchi bayrog‘i + internet bo‘lganda', () => {
    expect(aiRuntimeEnabled(true, true)).toBe(false)
    vi.stubEnv('VITE_AI_ENABLED', 'true')
    expect(aiRuntimeEnabled(true, true)).toBe(true)
    expect(aiRuntimeEnabled(false, true)).toBe(false)
    expect(aiRuntimeEnabled(true, false)).toBe(false)
  })
})

describe('Gapirish — mikrofonsiz matnli javob ham tahlil qilinadi', () => {
  it('matnli javob saqlanadi, baholanadi va ravonlik "—" deb ko‘rsatiladi', async () => {
    renderPage(<Speaking />)
    await advance()
    fireEvent.change(screen.getByLabelText('Matnli javob'), {
      target: {
        value:
          'I am twelve years old. I usually go to school by bus because it is far. I can read and write English. ' +
          'Yesterday I went to the park with my friends and we played football.',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash va tahlil' }))
    await advance()
    expect(screen.getByText(/Javob saqlandi va tahlil qilindi/)).toBeInTheDocument()
    expect(screen.getByText('Hajm')).toBeInTheDocument()
    expect(screen.getByText('Ravonlik').nextElementSibling).toHaveTextContent('—')
  })
})
