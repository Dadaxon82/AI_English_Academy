/**
 * Sahifa darajasidagi regressiyalar (haqiqiy komponentlar + store, soxta soat).
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiRuntimeEnabled } from '../lib/ai'
import { BET_COST_GEMS, BET_DAYS, BET_STREAK_DAYS, BET_WIN_GEMS } from '../lib/gameConfig'
import { StoreProvider } from '../lib/store'
import { useStore } from '../lib/storeContext'
import { emptyData, emptyGame, todayKey } from '../lib/types'
import MockExam from '../pages/MockExam'
import Onboarding from '../pages/Onboarding'
import Settings from '../pages/Settings'
import Speaking from '../pages/Speaking'
import Writing from '../pages/Writing'

/** Store'ga bog'liq komponent har render bo'lganda chaqiriladi. */
const probeRendered = vi.fn()

/** Store holatini test uchun ko'rinadigan qiluvchi kichik "zond". */
function Probe() {
  const { data, dayProgress, actions } = useStore()
  probeRendered()
  return (
    <>
      <output data-testid="today-seconds">{data.activity[todayKey()]?.seconds ?? 0}</output>
      <output data-testid="day-progress">{dayProgress.doneMin}</output>
      <output data-testid="writing-count">{data.writing.length}</output>
      <output data-testid="onboarded">{data.onboardedAt === null ? 'no' : 'yes'}</output>
      <output data-testid="gems">{data.game.gems}</output>
      <output data-testid="bet">{data.game.bet ? `${data.game.bet.startDay}:${data.game.bet.gems}` : 'yoq'}</output>
      <button type="button" onClick={() => actions.startTimer('probe-session', 'reading')}>
        probe-start-timer
      </button>
    </>
  )
}

const UID = 'u-page'

function renderPage(page: ReactNode) {
  return render(
    <MemoryRouter>
      <StoreProvider userId={UID}>
        {page}
        <Probe />
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
    // Baholanmagan bo'limlar (Writing/Speaking) "zaif" deb ko'rsatilmaydi
    const weak = screen.getByText('Zaif:').parentElement!
    expect(weak).toHaveTextContent('reading')
    expect(weak).not.toHaveTextContent(/writing|speaking/)
  })

  it('bo‘sh yozish javobi saqlanmaydi (soxta past ball dalili qo‘shilmaydi)', async () => {
    renderPage(<MockExam />)
    await advance()
    fireEvent.click(screen.getByRole('button', { name: 'Imtihonni boshlash' }))
    fireEvent.click(screen.getByRole('button', { name: 'Writing' }))
    await advance()
    fireEvent.click(screen.getByRole('button', { name: 'Javobsiz yakunlash' }))
    await advance()
    expect(screen.getByTestId('writing-count')).toHaveTextContent('0')
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

  it('solishtirish paneli: bitta javobda yo‘q, ikkitada ochiladi va yopiladi', async () => {
    renderPage(<Writing />)
    await advance()
    const write = async (text: string) => {
      fireEvent.change(screen.getByLabelText('Yozish maydoni'), { target: { value: text } })
      fireEvent.click(screen.getByRole('button', { name: 'Tahlil qilish' }))
      await advance()
    }
    await write('Hello! My name is Aziz. I am a student.')
    // ESKI BUG: bitta javob o'zi bilan solishtirilib turardi
    expect(screen.queryByText('Eski javob')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Oldingi javob bilan solishtirish' })).toBeNull()

    await write('Hello! My name is Aziz. I am a student and I like my school because my teacher is kind.')
    expect(screen.queryByText('Eski javob')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Oldingi javob bilan solishtirish' }))
    expect(screen.getByText('Eski javob')).toBeInTheDocument()
    // ESKI BUG: "yopish" paneli yopmasdi
    fireEvent.click(screen.getByRole('button', { name: 'Solishtirishni yopish' }))
    expect(screen.queryByText('Eski javob')).toBeNull()
  })

  it('"ulangan" faqat VITE_AI_ENABLED=true + foydalanuvchi bayrog‘i + internet + Supabase bo‘lganda', () => {
    expect(aiRuntimeEnabled(true, true, true)).toBe(false)
    vi.stubEnv('VITE_AI_ENABLED', 'true')
    expect(aiRuntimeEnabled(true, true, true)).toBe(true)
    expect(aiRuntimeEnabled(false, true, true)).toBe(false)
    expect(aiRuntimeEnabled(true, false, true)).toBe(false)
    // Edge funksiya JWT talab qiladi — Supabase sozlanmagan bo'lsa AI yo'q
    expect(aiRuntimeEnabled(true, true, false)).toBe(false)
    expect(aiRuntimeEnabled(true, true)).toBe(false)
  })
})

describe('Onboarding — diagnostikani o‘tkazib yuborish ham yakunlash hisoblanadi', () => {
  it('“Hozir o‘tkazmayman” dan keyin "sozlamalar to‘ldirilmagan" belgisi qolmaydi', async () => {
    renderPage(<Onboarding />)
    await advance()
    expect(screen.getByTestId('onboarded')).toHaveTextContent('no')
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' })) // maqsadlar
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' })) // kundalik reja
    fireEvent.click(screen.getByRole('button', { name: /Hozir o.tkazmayman/ }))
    await advance()
    expect(screen.getByTestId('onboarded')).toHaveTextContent('yes')
  })
})

describe('Store — sarlavhadagi kunlik progress va keraksiz renderlar', () => {
  it('kunlik progress bugungi BUTUN vaqtni ko‘rsatadi (eski: faqat joriy taymer)', async () => {
    const seeded = {
      ...emptyData(UID),
      onboardedAt: 1,
      activity: { [todayKey()]: { date: todayKey(), seconds: 1200, attempts: 2, correct: 2, newWords: 0, reviewedWords: 0, skills: { reading: 1200 } } },
    }
    localStorage.setItem(`aea:data:${UID}`, JSON.stringify(seeded))
    renderPage(<div />)
    await advance()
    expect(screen.getByTestId('day-progress')).toHaveTextContent('20')
    fireEvent.click(screen.getByRole('button', { name: 'probe-start-timer' }))
    await advance(2 * 60_000)
    expect(screen.getByTestId('day-progress')).toHaveTextContent('22')
  })

  it('taymer yurmaganda ilova har soniyada qayta chizilmaydi', async () => {
    // act() bitta qadamdagi bir nechta yangilanishni bitta renderga jamlaydi —
    // shuning uchun soniyama-soniya suriladi.
    const seconds = async (n: number) => {
      for (let i = 0; i < n; i++) await advance(1000)
    }
    renderPage(<div />)
    await advance()
    const renders = () => probeRendered.mock.calls.length
    const idle = renders()
    await seconds(5)
    expect(renders()).toBe(idle)
    fireEvent.click(screen.getByRole('button', { name: 'probe-start-timer' }))
    const running = renders()
    await seconds(3)
    expect(renders()).toBeGreaterThanOrEqual(running + 3)
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

/* Garov ("Double or Nothing") — telefon `SettingsFragment`i bilan BIR XIL
   kirish nuqtasi. Test 2026-11-08 qo'shildi: tugma paydo bo'lgach, uning
   HAQIQIY ish-ijarasi (gem yechishi, garov ochilishi, rad etilsa SABAB)
   avtomatik tekshiruvda yo'q edi. Sonlar `gameConfig`dan olinadi — test
   ham ularni import qiladi, shuning uchun son o'zgarsa test ham yuguradi. */
describe('Sozlama — «Double or Nothing» garovi (mobil SettingsFragment bilan bir xil)', () => {
  const betButton = () => screen.getByRole('button', { name: /Garov:.*gem tikib/ })

  /** `gems` gem bilan saqlangan holatdan Sozlamani ochish. */
  const openSettings = async (gems: number) => {
    const seeded = { ...emptyData(UID), onboardedAt: 1, game: { ...emptyGame(), gems } }
    localStorage.setItem(`aea:data:${UID}`, JSON.stringify(seeded))
    renderPage(<Settings />)
    await advance()
    expect(screen.getByTestId('gems')).toHaveTextContent(String(gems))
  }

  it('gem yetarli bo‘lsa: garov tikiladi, gem yechiladi va ochiq garov ko‘rsatiladi', async () => {
    await openSettings(BET_COST_GEMS)
    expect(screen.getByTestId('bet')).toHaveTextContent('yoq')
    // `findByText` bu faylda ishlamaydi: soxta soatda kutish oldinga
    // surilmaydi. Banner esa tugma bosilganda SINKRON qo'yiladi
    // (`setBetMsg`) — `fireEvent.click` uni bir React qadamida joylaydi.
    fireEvent.click(betButton())
    expect(screen.getByText(`Garov tikildi — ${BET_COST_GEMS} gem sarflandi.`)).toBeInTheDocument()
    expect(screen.getByTestId('gems')).toHaveTextContent('0')
    expect(screen.getByTestId('bet')).toHaveTextContent(`${todayKey()}:${BET_COST_GEMS}`)
    expect(screen.getByText(`Garov ochiq: ${todayKey()} kunidan ${BET_COST_GEMS} gem tikilgan`)).toBeInTheDocument()
  })

  it('gem yetmasa: garov tikilmaydi va SABAB ochiq yoziladi (son ixtir qilinmaydi)', async () => {
    await openSettings(BET_COST_GEMS - 1)
    fireEvent.click(betButton())
    expect(screen.getByText(`Garov uchun ${BET_COST_GEMS} gem kerak.`)).toBeInTheDocument()
    expect(screen.getByTestId('gems')).toHaveTextContent(String(BET_COST_GEMS - 1))
    expect(screen.getByTestId('bet')).toHaveTextContent('yoq')
  })

  it('shartlar matni `gameConfig` sonlari bilan yoziladi (ixtira son yo‘q)', async () => {
    await openSettings(0)
    expect(betButton().textContent).toBe(
      `Garov: ${BET_COST_GEMS} gem tikib, zanjirni ${BET_STREAK_DAYS} kunga uzaytirsak ${BET_WIN_GEMS} gem qaytadi`,
    )
    expect(screen.getByText(new RegExp(`${BET_DAYS} kun o‘tsa va zanjir kamida ${BET_STREAK_DAYS} kunga`))).toBeInTheDocument()
  })
})
