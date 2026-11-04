/**
 * "Mobil ilova" bloki — PWA'ni bosh ekranga o'rnatish.
 *
 * Talab: tugma faqat brauzer haqiqatan o'rnatish oynasini bera olganda
 * ko'rsatiladi (dekorativ tugma yo'q), aks holda yo'riqnoma; ilova sifatida
 * ochilganda blok umuman yo'q.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../lib/store'
import Dashboard from '../pages/Dashboard'

/** O'rnatish holati modul darajasida — har test toza nusxa bilan. */
async function freshCard() {
  vi.resetModules()
  const install = await import('../lib/install')
  const { default: InstallAppCard } = await import('../components/InstallAppCard')
  install.initInstallPrompt()
  return InstallAppCard
}

/** Brauzerning `beforeinstallprompt` hodisasi (Chrome/Edge) taqlidi. */
function firePrompt(outcome: 'accepted' | 'dismissed') {
  const prompt = vi.fn(() => Promise.resolve())
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return { event, prompt }
}

const installButton = () => screen.queryByRole('button', { name: 'Ilovani o‘rnatish' })

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  // navigator ustiga qo'yilgan qiymat o'chirilsa, jsdom'ning asl qiymati qaytadi
  Reflect.deleteProperty(navigator, 'userAgent')
})

describe('Mobil ilova (PWA o‘rnatish)', () => {
  it('brauzer o‘rnatish oynasini bermasa — tugma yo‘q, yo‘riqnoma bor', async () => {
    const InstallAppCard = await freshCard()
    render(<InstallAppCard />)
    expect(screen.getByRole('heading', { name: 'Mobil ilova' })).toBeInTheDocument()
    expect(installButton()).toBeNull()
    expect(screen.getByText(/Brauzer menyusidan/)).toBeInTheDocument()
  })

  it('iPhone’da «Bosh ekranga qo‘shish» yo‘riqnomasi', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      configurable: true,
    })
    const InstallAppCard = await freshCard()
    render(<InstallAppCard />)
    expect(screen.getByText(/Bosh ekranga qo‘shish/)).toBeInTheDocument()
    expect(installButton()).toBeNull()
  })

  it('ilova sifatida (standalone) ochilganda blok ko‘rsatilmaydi', async () => {
    const real = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({ ...real(query), matches: query.includes('standalone') }))
    const InstallAppCard = await freshCard()
    const { container } = render(<InstallAppCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('o‘rnatish oynasi bo‘lsa tugma ishlaydi; rad etilsa izoh chiqadi', async () => {
    const InstallAppCard = await freshCard()
    render(<InstallAppCard />)
    expect(installButton()).toBeNull()
    const { event, prompt } = firePrompt('dismissed')
    expect(event.defaultPrevented).toBe(true) // brauzerning o'z banneri o'rniga bizning tugma
    fireEvent.click(installButton()!)
    expect(await screen.findByText(/O‘rnatish bekor qilindi/)).toBeInTheDocument()
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(installButton()).toBeNull() // hodisa bir martalik
  })

  it('o‘rnatish qabul qilinsa «O‘rnatildi» holati', async () => {
    const InstallAppCard = await freshCard()
    render(<InstallAppCard />)
    firePrompt('accepted')
    fireEvent.click(installButton()!)
    expect(await screen.findByText('O‘rnatildi')).toBeInTheDocument()
    expect(installButton()).toBeNull()
  })

  it('Dashboard’da blok sahifaning eng yuqorisida', async () => {
    render(
      <MemoryRouter>
        <StoreProvider userId="u-install">
          <Dashboard />
        </StoreProvider>
      </MemoryRouter>,
    )
    const card = await screen.findByRole('heading', { name: 'Mobil ilova' })
    const title = screen.getByRole('heading', { level: 1 }) // sahifa sarlavhasi (kutib olish)
    expect(card.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
