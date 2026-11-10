/**
 * Suhbatlar sahifasi va Takrorlash menejeri — haqiqiy store + soxta soat.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBundle, vocabQuizExercise } from '../content'
import { dialoguesFor, gapLineIndexes } from '../content/dialogues'
import { StoreProvider } from '../lib/store'
import { useStore } from '../lib/storeContext'
import Dialogues from '../pages/Dialogues'
import ErrorLog from '../pages/ErrorLog'

const [wordA, wordB] = getBundle('A1').vocab

function Probe() {
  const { data, actions } = useStore()
  const a = data.srs[wordA!.id]
  const b = data.srs[wordB!.id]
  return (
    <>
      <output data-testid="attempts">{data.attempts.length}</output>
      <output data-testid="wrong">{data.attempts.filter((x) => !x.correct).length}</output>
      <output data-testid="srs-a">{a ? `${a.reps}/${a.lapses}` : '-'}</output>
      <output data-testid="srs-b">{b ? `${b.reps}/${b.lapses}` : '-'}</output>
      <button
        type="button"
        onClick={() => {
          actions.gradeVocab(wordA!.id, 'good')
          actions.gradeVocab(wordB!.id, 'good')
          actions.recordAttempt({ exercise: vocabQuizExercise(wordA!), correct: false, partial: 0, given: 'x', secondsSpent: 3, source: 'practice' })
        }}
      >
        seed
      </button>
    </>
  )
}

function renderPage(page: ReactNode) {
  return render(
    <MemoryRouter>
      <StoreProvider userId="u-dialogues">
        {page}
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

/** Variant tugmasini matni bo'yicha tanlash (oldidagi tartib raqami e'tiborsiz). */
function pick(text: string) {
  const r = screen.getAllByRole('radio').find((el) => (el.textContent ?? '').replace(/^\s*\d+/, '').trim() === text)
  if (!r) throw new Error(`variant topilmadi: ${text}`)
  fireEvent.click(r)
}
function pickOther(text: string) {
  const r = screen.getAllByRole('radio').find((el) => (el.textContent ?? '').replace(/^\s*\d+/, '').trim() !== text)
  fireEvent.click(r!)
}
const check = () => fireEvent.click(screen.getByRole('button', { name: 'Tekşiriş' }))
const next = () => fireEvent.click(screen.getByRole('button', { name: /Keyingi maşq|Yakunlaş/ }))

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

describe('Suhbatlar sahifasi', () => {
  it('suhbat oxirigaça: 3 javob yoziladi, xato bitta, kartada holat körinadi', async () => {
    renderPage(<Dialogues />)
    await advance(50)
    const d = dialoguesFor('A1')[0]!
    expect(screen.getByRole('heading', { name: d.titleUz })).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Boşlaş' })[0]!)
    await advance(0)
    // O'qish kartasi: vaziyat va suhbat.
    expect(screen.getByText(d.situationUz)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Davom etiş' }))
    await advance(0)

    const gaps = gapLineIndexes(d).map((i) => d.lines[i]!.gap!)
    // 1-bo'shliq xato, qolganlari to'g'ri.
    pickOther(gaps[0]!.answer)
    check()
    await advance(0)
    next()
    await advance(0)
    for (const g of gaps.slice(1)) {
      pick(g.answer)
      check()
      await advance(0)
      next()
      await advance(0)
    }
    // «Nega shunday?» izohi — xatoni qayta urinishdan OLDIN (qoidani o'qib, keyin tuzatadi).
    expect(screen.getByRole('heading', { name: `Nega şunday? ${d.note.titleUz}` })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Davom etiş' }))
    await advance(0)
    // Xato dars oxirida qayta beriladi.
    pick(gaps[0]!.answer)
    check()
    await advance(0)
    next()
    await advance(0)
    expect(screen.getByText('Dars tugadi!')).toBeTruthy()
    expect(screen.getByTestId('attempts').textContent).toBe('4')
    expect(screen.getByTestId('wrong').textContent).toBe('1')
    expect(JSON.parse(localStorage.getItem('aea-usage-v1')!).dialogue).toMatchObject({ started: 1, finished: 1 })
    // Ro'yxatga qaytish: oxirgi urinishlar hammasi to'g'ri → 3/3.
    fireEvent.click(screen.getByRole('button', { name: 'Davom etiş' }))
    await advance(0)
    expect(screen.getAllByText('3/3 töğri').length).toBe(1)
  })
})

describe('Takrorlaş menejeri', () => {
  it('söz xatosi va öşa sözning takrori bitta qadam; SRS har qadamda bir marta baholanadi', async () => {
    renderPage(<ErrorLog />)
    await advance(50)
    fireEvent.click(screen.getByRole('button', { name: 'seed' }))
    await advance(0)
    expect(screen.getByTestId('srs-a').textContent).toBe('1/0')
    // 2 kun o'tadi — ikkala so'zning takrori keladi.
    vi.setSystemTime(new Date(2026, 10, 11, 10, 0, 0))
    await advance(61_000)
    expect(screen.getByRole('heading', { name: 'Bugungi takror: 1 ta xato + 1 ta söz' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Takrorlaşni boşlaş' }))
    await advance(0)

    // 1-qadam: A so'zi bo'yicha xato mashqi — yana xato.
    pickOther(wordA!.translationUz)
    check()
    await advance(0)
    next()
    await advance(0)
    // 2-qadam: B so'zi takrori — to'g'ri.
    pick(wordB!.translationUz)
    check()
    await advance(0)
    next()
    await advance(0)
    // Qayta urinish (A) — to'g'ri, lekin SRS ikkinchi marta baholanmaydi.
    pick(wordA!.translationUz)
    check()
    await advance(0)
    next()
    await advance(0)
    expect(screen.getByText('Dars tugadi!')).toBeTruthy()
    expect(screen.getByTestId('srs-a').textContent).toBe('2/1')
    expect(screen.getByTestId('srs-b').textContent).toBe('2/0')
  })
})
