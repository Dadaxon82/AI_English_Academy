/**
 * Xarita sarlavhasidagi qo'ng'iroq: eslatmalar haqiqiy ma'lumotdan (SRS navbati,
 * joriy dars) olinadi va har qator tegishli sahifani ochadi.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import MapBell from '../components/MapBell'

afterEach(() => cleanup())

function renderBell(dueCount: number, current: { label: string; to: string | null } | null) {
  return render(
    <MemoryRouter initialEntries={['/path']}>
      <Routes>
        <Route path="/path" element={<MapBell dueCount={dueCount} current={current} />} />
        <Route path="/vocabulary" element={<p>LUĞAT SAHIFASI</p>} />
        <Route path="/lesson/:day/:skill" element={<p>DARS SAHIFASI</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MapBell', () => {
  it('navbatda söz bölsa — nomida soni bor va bosilganda Luğat oçiladi', () => {
    renderBell(4, { label: '1-kun · Luğat', to: '/lesson/a1-day-01/vocabulary' })
    const bell = screen.getByRole('button', { name: /Eslatmalar \(4 ta söz/ })
    fireEvent.click(bell)
    fireEvent.click(screen.getByRole('menuitem', { name: /4 ta söz/ }))
    expect(screen.getByText('LUĞAT SAHIFASI')).toBeTruthy()
  })

  it('navbat böş — «takrorlanadigan söz yöq», joriy dars havolasi işlaydi', () => {
    renderBell(0, { label: '1-kun · Grammatika', to: '/lesson/a1-day-01/grammar' })
    fireEvent.click(screen.getByRole('button', { name: 'Eslatmalar' }))
    expect(screen.getByText('Takrorlanadigan söz yöq.')).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: /Joriy dars/ }))
    expect(screen.getByText('DARS SAHIFASI')).toBeTruthy()
  })
})
