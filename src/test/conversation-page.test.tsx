/**
 * Suhbatdosh sahifasi: stsenariy rejimi (AI yo'q) va AI rejimi (javob soxta
 * mijozdan) — tuzatishlar mashqqa, lug'atdagi so'zlar SRS'ga.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBundle } from '../content'
import { StoreProvider } from '../lib/store'
import { useStore } from '../lib/storeContext'
import Conversation from '../pages/Conversation'

const aiMode = { on: false }
const turns: unknown[] = []
vi.mock('../lib/ai', async (orig) => ({
  ...(await orig<typeof import('../lib/ai')>()),
  aiRuntimeEnabled: () => aiMode.on,
}))
vi.mock('../lib/roleplay', async (orig) => ({
  ...(await orig<typeof import('../lib/roleplay')>()),
  requestRoleplayTurn: vi.fn(async () => turns.shift() ?? { ok: false, reasonUz: 'navbat bo‘sh' }),
}))

const word = getBundle('A1').vocab.find((v) => v.word === 'sandwich') ?? getBundle('A1').vocab[0]!

function Probe() {
  const { data } = useStore()
  return (
    <>
      <output data-testid="srs">{data.srs[word.id] ? 'saved' : '-'}</output>
      <output data-testid="attempts">{data.attempts.length}</output>
    </>
  )
}

const advance = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function renderPage() {
  render(
    <MemoryRouter>
      <StoreProvider userId="u-conv">
        <Conversation />
        <Probe />
      </StoreProvider>
    </MemoryRouter>,
  )
}

const say = (text: string) => {
  fireEvent.change(screen.getByLabelText('Javobingiz'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Yuborish' }))
}

const openCafe = () => {
  const card = screen.getByRole('heading', { name: 'Kafeda buyurtma berish' }).closest('article')!
  fireEvent.click(card.querySelector('button')!)
}

beforeEach(() => {
  localStorage.clear()
  aiMode.on = false
  turns.length = 0
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Suhbatdosh — stsenariy (AI ulanmagan)', () => {
  it('rejim ochiq aytiladi; javob namuna bilan solishtiriladi; oxirida yakun', async () => {
    renderPage()
    await advance(50)
    expect(screen.getByText(/AI ulanmagan/)).toBeTruthy()
    openCafe()
    await advance(0)
    expect(screen.getByText('Oldindan yozilgan stsenariy')).toBeTruthy()
    expect(screen.getByText('Hello! What would you like?')).toBeTruthy()
    expect(screen.getByText('Bir piyola choy olsam bo‘ladimi?')).toBeTruthy()
    say('Can I have tea please')
    await advance(0)
    expect(screen.getByText('Can I have a cup of tea, please?')).toBeTruthy()
    expect(screen.getByText(/Namunadagi so‘zlardan 5\/8 tasi bor/)).toBeTruthy()
    say('I would like a sandwich')
    await advance(0)
    say('How much is it')
    await advance(0)
    expect(screen.getByText('The tea and the soup are six dollars.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Suhbat yakunlandi' })).toBeTruthy()
    // Stsenariyda soxta baho / soxta xato yo'q.
    expect(screen.getByTestId('attempts').textContent).toBe('0')
  })
})

describe('Suhbatdosh — AI rejimi', () => {
  it('AI javobi, tuzatish mashqqa aylanadi, lug‘atdagi so‘z saqlanadi', async () => {
    aiMode.on = true
    turns.push({
      ok: true,
      model: 'm',
      feedback: {
        reply: 'Of course. Anything to eat?',
        corrections: [{ original: 'I want a tea', corrected: 'I would like a tea', whyUz: 'Muloyim so‘rov.' }],
        newWords: [{ word: word.word, translationUz: word.translationUz }, { word: 'zzqx', translationUz: 'yo‘q' }],
        done: true,
      },
    })
    renderPage()
    await advance(50)
    openCafe()
    await advance(0)
    expect(screen.getByText('AI hamsuhbat')).toBeTruthy()
    say('I want a tea')
    await advance(0)
    expect(screen.getByText('Of course. Anything to eat?')).toBeTruthy()
    expect(screen.getByText('I would like a tea')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Suhbat yakunlandi' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Lug‘atimga saqlash (1 ta)' }))
    await advance(0)
    expect(screen.getByTestId('srs').textContent).toBe('saved')
    fireEvent.click(screen.getByRole('button', { name: 'Xatolar ustida ishlash (1 ta mashq)' }))
    await advance(0)
    expect(screen.getByText(/Suhbatda shunday dedingiz: “I want a tea”/)).toBeTruthy()
  })

  it('AI xatosi: replika qaytariladi, sabab va stsenariyga o‘tish taklif qilinadi', async () => {
    aiMode.on = true
    turns.push({ ok: false, reasonUz: 'Bugungi AI limiti tugadi' })
    renderPage()
    await advance(50)
    openCafe()
    await advance(0)
    say('I want a tea')
    await advance(0)
    expect(screen.getByText('Bugungi AI limiti tugadi')).toBeTruthy()
    expect((screen.getByLabelText('Javobingiz') as HTMLTextAreaElement).value).toBe('I want a tea')
    fireEvent.click(screen.getByRole('button', { name: 'Oldindan yozilgan stsenariy bilan boshidan' }))
    await advance(0)
    expect(screen.getByText('Oldindan yozilgan stsenariy')).toBeTruthy()
  })
})
