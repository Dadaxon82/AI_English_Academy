/**
 * ShortPlayer: TTS bilan so'zma-so'z subtitr, subtitr javobdan keyin, TTS yo'q
 * bo'lsa — halol xabar, haqiqiy video manifesti. Shortlar sahifasi.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ShortPlayer from '../components/ShortPlayer'
import { allShorts } from '../content/shorts'
import { StoreProvider } from '../lib/store'
import { parseVideoManifest, resetVideoManifest, wordAt, wordStarts } from '../lib/shortPlayback'
import Shorts from '../pages/Shorts'

type Utter = {
  text: string
  rate: number
  pitch: number
  onstart?: () => void
  onend?: () => void
  onerror?: (e: { error: string }) => void
  onboundary?: (e: { name: string; charIndex: number }) => void
}
let spoken: Utter[] = []

function installTts() {
  spoken = []
  class FakeUtterance {
    text: string
    rate = 1
    pitch = 1
    lang = ''
    voice: unknown = null
    onstart?: () => void
    onend?: () => void
    onerror?: (e: { error: string }) => void
    onboundary?: (e: { name: string; charIndex: number }) => void
    constructor(t: string) {
      this.text = t
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { cancel: vi.fn(), getVoices: () => [], speak: (u: Utter) => spoken.push(u) },
  })
}

const short = allShorts('A1').find((s) => !s.learnerSpeaks && s.en.split(' ').length >= 4)!

beforeEach(() => {
  resetVideoManifest()
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ items: [] }) })))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  // @ts-expect-error — test uchun olib tashlaymiz
  delete window.speechSynthesis
})

describe('so‘z indekslari', () => {
  it('charIndex → so‘z raqami', () => {
    const t = 'Good morning, my friend!'
    const s = wordStarts(t)
    expect(s).toEqual([0, 5, 14, 17])
    expect(wordAt(s, 0)).toBe(0)
    expect(wordAt(s, 6)).toBe(1)
    expect(wordAt(s, 17)).toBe(3)
  })
})

describe('ShortPlayer', () => {
  it('ovoz bilan: bosilganda TTS, aytilayotgan so‘z yonadi; subtitr javobgacha yopiq', async () => {
    installTts()
    render(<ShortPlayer short={short} revealed={false} />)
    await act(async () => {})
    expect(screen.getByText(/Animatsion short · ovoz/)).toBeTruthy()
    expect(screen.queryByText(short.en.split(' ')[0]!)).toBeNull()
    expect(screen.getByLabelText('Subtitr javobdan keyin oçiladi')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Shortni köriş' }))
    expect(spoken).toHaveLength(1)
    expect(spoken[0]!.text).toBe(short.en)
    expect(spoken[0]!.pitch).toBeGreaterThan(1) // suhbatdoş ovozi
    act(() => spoken[0]!.onstart?.())
    expect(screen.getByRole('button', { name: /Töxtatiş/ })).toBeTruthy()
    act(() => spoken[0]!.onend?.())
    expect(screen.getByRole('button', { name: 'Shortni qayta köriş' })).toBeTruthy()

    // Sekin rejim — past tezlik
    fireEvent.click(screen.getByRole('button', { name: /Sekin/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Shortni qayta köriş' }))
    expect(spoken[1]!.rate).toBeLessThan(spoken[0]!.rate)
  })

  it('javobdan keyin: subtitr (yonayotgan so‘z bilan) va tarjima', async () => {
    installTts()
    render(<ShortPlayer short={short} revealed />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Shortni köriş' }))
    act(() => spoken[0]!.onstart?.())
    const second = short.en.split(' ')[1]!
    act(() => spoken[0]!.onboundary?.({ name: 'word', charIndex: short.en.indexOf(second, short.en.indexOf(' ')) }))
    const lit = screen.getByText(second)
    expect(lit.className).toContain('bg-yellow-300')
    expect(screen.getByText(short.uz)).toBeTruthy()
  })

  it('TTS yo‘q — halol xabar va subtitr oçiq, ijro tugmasi yo‘q', async () => {
    render(<ShortPlayer short={short} revealed={false} />)
    await act(async () => {})
    expect(screen.getByRole('status').textContent).toMatch(/ingliz ovozi .* işlamadi/)
    expect(screen.queryByRole('button', { name: 'Shortni köriş' })).toBeNull()
    expect(screen.getByText(short.en.split(' ')[0]!)).toBeTruthy()
  })

  it('manifestda haqiqiy video bo‘lsa — video, kim gapirgani va litsenziya', async () => {
    installTts()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ items: [{ shortId: short.id, src: 'video/x.mp4', speakerUz: 'Emma, London', license: 'Muallif roziligi bilan' }] }),
      })),
    )
    render(<ShortPlayer short={short} revealed={false} />)
    await act(async () => {})
    expect(screen.getByLabelText(`${short.speaker}: haqiqiy video`).tagName).toBe('VIDEO')
    expect(screen.getByText(/Video · Emma, London · Muallif roziligi bilan/)).toBeTruthy()
  })

  it('manifest: litsenziyasiz yoki noto‘g‘ri manzil — qabul qilinmaydi', () => {
    const m = parseVideoManifest({
      items: [
        { shortId: 'a', src: 'video/a.mp4', license: '' },
        { shortId: 'b', src: 'javascript:alert(1).mp4', license: 'x' },
        { shortId: 'c', src: 'https://cdn.example.com/c.webm', license: 'CC BY 4.0' },
      ],
    })
    expect([...m.keys()]).toEqual(['c'])
  })
})

describe('Shortlar sahifasi', () => {
  it('playlistlar, oldindan körish va playlist oçiladi (birinçi savol bilan)', async () => {
    installTts()
    render(
      <MemoryRouter>
        <StoreProvider userId="u-shorts">
          <Shorts />
        </StoreProvider>
      </MemoryRouter>,
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(screen.getByRole('heading', { name: 'Video shortlar' })).toBeTruthy()
    const cards = screen.getAllByRole('article')
    expect(cards.length).toBe(7)
    expect(within(cards[0]!).getByText(/ta short/)).toBeTruthy()
    fireEvent.click(within(cards[0]!).getByRole('button', { name: /shortlarni köriş/ }))
    await act(async () => {})
    expect(screen.getByRole('figure', { name: /Video short/ })).toBeTruthy()
    expect(screen.getByText(/qaysi gapni eşitdingiz\?/)).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('aea-usage-v1')!).shorts).toMatchObject({ started: 1 })
  })
})
