/**
 * Talaffuz mashqi (so'zma-so'z moslash) va Immersion rejimi.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UzTranslation from '../components/UzTranslation'
import { comparePronunciation, pronunciationSentences } from '../lib/pronunciation'
import { setImmersion } from '../lib/prefs'
import { StoreProvider } from '../lib/store'
import Pronunciation from '../pages/Pronunciation'

describe('comparePronunciation', () => {
  it('hammasi tanildi — 100; tinish belgilari va katta harf ahamiyatsiz', () => {
    const r = comparePronunciation('Can I have a cup of tea, please?', 'can i have a cup of tea please')
    expect(r.score).toBe(100)
    expect(r.words.every((w) => w.status === 'ok')).toBe(true)
    expect(r.words[7]!.text).toBe('please?')
  })
  it('tushib qolgan va ortiqcha so‘zlar alohida; tartib saqlanadi', () => {
    const r = comparePronunciation('I usually get up at seven', 'I get up at eleven')
    expect(r.words.map((w) => w.status)).toEqual(['ok', 'miss', 'ok', 'ok', 'ok', 'miss'])
    expect(r.extra).toEqual(['eleven'])
    expect(r.score).toBe(67)
  })
  it('apostrof turlari va raqam/so‘z bir xil', () => {
    expect(comparePronunciation('I’m nineteen', "I'm nineteen").score).toBe(100)
    expect(comparePronunciation('It takes 4 hours', 'it takes four hours').score).toBe(100)
  })
  it('bo‘sh javob — 0, soxta moslik yo‘q', () => {
    expect(comparePronunciation('Hello there', '').score).toBe(0)
  })
  it('gaplar suhbatlardan: 3–12 so‘z, takrorsiz', () => {
    const list = pronunciationSentences('A1')
    expect(list.length).toBeGreaterThan(20)
    expect(new Set(list.map((x) => x.en)).size).toBe(list.length)
    expect(list.every((x) => x.en.split(/\s+/).length >= 3 && x.en.split(/\s+/).length <= 12 && !x.en.includes('___'))).toBe(true)
  })
})

describe('Immersion rejimi', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })
  it('o‘chiq — tarjima ko‘rinadi; yoqilsa — yashirin, tugma bilan ochiladi; boshqa komponent ham yangilanadi', () => {
    render(<UzTranslation>non</UzTranslation>)
    expect(screen.getByText('non')).toBeTruthy()
    act(() => setImmersion(true))
    expect(screen.queryByText('non')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tarjimani ko‘rsatish' }))
    expect(screen.getByText('non')).toBeTruthy()
    expect(localStorage.getItem('aea-immersion')).toBe('1')
    act(() => setImmersion(false))
    expect(localStorage.getItem('aea-immersion')).toBeNull()
  })
})

describe('Talaffuz sahifasi — nutqni tanish yo‘q (jsdom)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  it('sabab oldindan aytiladi, «Aytish» o‘chiq, ball chiqmaydi; gaplar orasida yurish ishlaydi', async () => {
    render(
      <MemoryRouter>
        <StoreProvider userId="u-pron">
          <Pronunciation />
        </StoreProvider>
      </MemoryRouter>,
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(screen.getByText(/Web Speech API yo‘q/)).toBeTruthy()
    expect((screen.getByRole('button', { name: /Aytish/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByTestId('pron-result')).toBeNull()
    const first = pronunciationSentences('A1')[0]!.en
    expect(screen.getByText(first)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keyingi →' }))
    expect(screen.getByText(pronunciationSentences('A1')[1]!.en)).toBeTruthy()
  })
})

describe('Talaffuz sahifasi — nutq tanildi (soxta SpeechRecognition)', () => {
  let instance: { onresult: ((e: unknown) => void) | null; onend: (() => void) | null } | null = null
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
    class FakeRec {
      lang = ''
      continuous = false
      interimResults = false
      onresult: ((e: unknown) => void) | null = null
      onerror = null
      onend: (() => void) | null = null
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        instance = this
      }
      start() {}
      stop() {
        this.onend?.()
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', FakeRec)
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  it('tanilgan matn so‘zma-so‘z solishtiriladi va «taxminiy» ball chiqadi', async () => {
    render(
      <MemoryRouter>
        <StoreProvider userId="u-pron2">
          <Pronunciation />
        </StoreProvider>
      </MemoryRouter>,
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    const target = pronunciationSentences('A1')[0]!.en
    fireEvent.click(screen.getByRole('button', { name: /Aytish/ }))
    const words = target.split(/\s+/)
    act(() => {
      instance!.onresult!({ resultIndex: 0, results: [{ 0: { transcript: words.slice(0, -1).join(' '), confidence: 0.9 }, isFinal: true }] })
      instance!.onend!()
    })
    const res = screen.getByTestId('pron-result')
    expect(res.textContent).toMatch(/Taxminiy moslik: \d+%/)
    expect(res.textContent).toMatch(/brauzer ishonchi 90%/)
    expect(screen.getByText(/Bu sessiyada 1 urinish/)).toBeTruthy()
  })
})
