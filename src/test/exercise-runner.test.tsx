/**
 * Mashq JARAYONI testlari (`src/components/ExerciseRunner.tsx`).
 *
 * Nima uchun alohida fayl: oldin testlar asosan MA'LUMOTni (kontent, check,
 * game, motion) tekshirardi — ekranning o'zi tekshirilmagan. Endi DULO
 * darajasidagi jonli jarayonning HAQIQIY ishlashi tekshiriladi:
 *   A) progress chizig'i har javobdan keyin to'ladi (soxta son yo'q);
 *   B) fikr-mulohaza va XP soni store hisobi bilan BIR XIL (ixtir emas);
 *   C) combo chipi FAQAT store'dagi haqiqiy combo ni ko'rsatadi.
 *
 * Haqiqiy sahifalar kabi `checked`回调 `actions.recordAttempt` chaqiradi
 * (Grammar.tsx / Reading.tsx shu tarzda yozadi) — shuning uchun store'dagi
 * combo/XP/yurak sonlari ekranga chiqqan sonlar bilan bir manbadan keladi.
 *
 * Tarmoq YO'Q: `StoreProvider` `remoteSync=false` (standart) — store
 * `localStorage`da ishlaydi, test izolyatsiyada.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { act, type ReactElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExerciseRunner from '../components/ExerciseRunner'
import { HEART_COMBO_STREAK } from '../lib/gameConfig'
import { playFeedback } from '../lib/feedbackSound'
import { StoreProvider } from '../lib/store'
import { useStore } from '../lib/storeContext'
import type { Exercise } from '../content/types'

const ROOT = process.cwd()
const indexCss = path.join(ROOT, 'src/index.css')
const mobileLayout = path.join(ROOT, 'mobile/app/src/main/res/layout/fragment_exercise.xml')
const mobileFragment = path.join(
  ROOT,
  'mobile/app/src/main/java/com/dadaxon/aienglishacademy/ui/runner/ExerciseFragment.kt',
)
const mobileMotion = path.join(ROOT, 'mobile/app/src/main/java/com/dadaxon/aienglishacademy/ui/Motion.kt')
const mobileGameConfig = path.join(
  ROOT,
  'mobile/app/src/main/java/com/dadaxon/aienglishacademy/data/GameConfig.kt',
)
const runnerSource = path.join(ROOT, 'src/components/ExerciseRunner.tsx')

/** Multiple-choice mashq — test uchun qisqa, haqiqiy kontraktga mos. */
const CHOICE: Exercise = {
  id: 'ex-feel-1',
  kind: 'multiple-choice',
  skill: 'grammar',
  level: 'B1',
  difficulty: 2,
  instructionUz: 'To‘g‘ri javobni tanlang.',
  question: 'She ___ to the market yesterday.',
  options: ['went', 'goes', 'going'],
  answerIndex: 0,
} as Exercise

const UID = 'u-runner-test'

let host: HTMLElement
let root: Root | null = null

function mount(el: ReactElement) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root?.render(el))
}

function unmount() {
  const r = root
  if (r) act(() => r.unmount())
  root = null
  host?.remove()
}

/**
 * Provider ichida: `checked` — xuddi haqiqiy sahifadagidek `recordAttempt`
 * chaqiradi (Grammar.tsx / Reading.tsx shu tarzda yozadi); probe esa
 * store'dagi sonlarni `<output>` matniga chizadi — test DOM'dan o'qiydi.
 * (Tashqi obyektga render ichida yozish `react-hooks/immutability` qoidasiga
 * zid: render toza bo'lishi kerak. DOM chizish esa mutatsiya emas.)
 */
function Inside({ exercise, index, total, heartFree }: ProbeProps) {
  const { data, actions } = useStore()
  const g = data.game
  return (
    <>
      <output data-probe aria-hidden>
        {JSON.stringify({ combo: g.combo, hearts: g.hearts, xp: g.today.xp })}
      </output>
      <ExerciseRunner
        exercise={exercise}
        index={index}
        total={total}
        heartFree={heartFree}
        checked={(r, secondsSpent) => {
          actions.recordAttempt({
            exercise,
            correct: r.correct,
            partial: r.partial,
            given: r.given,
            secondsSpent,
            source: 'practice',
          })
        }}
        onNext={() => undefined}
      />
    </>
  )
}

interface ProbeProps {
  exercise: Exercise
  index: number
  total: number
  heartFree?: boolean
}

/**
 * Combo testi uchun ZANJIR: bitta store ichida ketma-ket mashqlar.
 * Har mashq `exercise.id` bo'yicha qayta ochiladi (`key`) — xuddi haqiqiy
 * sahifadagidek (`Grammar.tsx`: `key={...-${current.id}-${pos}}`). Javoblar
 * `recordAttempt` bilan yoziladi — ya'ni combo store'da HAQIQIY o'sadi;
 * `comboTracked` esa chipni ko'rsatish/ko'rsatmaslikni sinaydi.
 */
function Chain({ comboTracked, total }: { comboTracked: boolean; total: number }) {
  const { data, actions } = useStore()
  const [pos, setPos] = useState(0)
  const [tick, setTick] = useState(0)
  return (
    <>
      <output data-probe aria-hidden>
        {JSON.stringify({ combo: data.game.combo, hearts: data.game.hearts, xp: data.game.today.xp })}
      </output>
      <ExerciseRunner
        key={`${CHOICE.id}-${pos}-${tick}`}
        exercise={{ ...CHOICE, id: `${CHOICE.id}-${pos}` }}
        index={pos}
        total={total}
        comboTracked={comboTracked}
        checked={(r, secondsSpent) => {
          actions.recordAttempt({
            exercise: { ...CHOICE, id: `${CHOICE.id}-${pos}`, difficulty: 1 },
            correct: r.correct,
            partial: r.partial,
            given: r.given,
            secondsSpent,
            source: 'practice',
          })
        }}
        onNext={() => {
          setPos((p) => p + 1)
          setTick((t) => t + 1)
        }}
      />
    </>
  )
}

function one(props: ProbeProps) {
  return (
    <StoreProvider userId={UID}>
      <Inside {...props} />
    </StoreProvider>
  )
}

/** Probe'dan store sonlarini o'qish (DOM — yagona haqiqat manbai). */
function storeNums(): { combo: number; hearts: number; xp: number } {
  const el = host.querySelector('[data-probe]')
  expect(el, 'probe topilmadi').toBeTruthy()
  return JSON.parse(el!.textContent ?? '{}') as { combo: number; hearts: number; xp: number }
}

/** Matn bo'yicha tugma bosish (bosilgan holat React'ga yetib boradi). */
function press(text: string) {
  const btn = [...host.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(text))
  expect(btn, `tugma topilmadi: ${text}`).toBeTruthy()
  // `el.click()` — React sintetik hodisa tizimi oddiy `click`ni ham oladi;
  // `new MouseEvent(..., {view: window})` jsdom'da "view is not Window" beradi.
  act(() => {
    btn!.click()
  })
}

function bar(): HTMLElement {
  const el = host.querySelector<HTMLElement>('[role="progressbar"]')
  expect(el, 'progress bar topilmadi').toBeTruthy()
  return el!
}
const fill = (b: HTMLElement) => b.firstElementChild as HTMLElement

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 8, 10, 0, 0))
})

afterEach(async () => {
  // Store yangilanishlari (persist) mikrotask/scheduler navbatida qolishi mumkin —
  // ular test TUGAGANDAN keyin act() chaqirsagina React ogohlantiradi
  // ("environment is not configured to support act"). Shuning uchun navbat
  // avval, test ichida, bo'shatiladi.
  await act(async () => {
    vi.advanceTimersByTime(2000)
  })
  unmount()
  vi.useRealTimers()
  localStorage.clear()
})

describe('A) Jonli progress chizig‘i — har javobdan keyin to‘ladi', () => {
  it('mashq ochilganda bar HAQIQIY holatni ko‘rsatadi: 0 ta yakunlangan', () => {
    mount(one({ exercise: CHOICE, index: 0, total: 5 }))
    const b = bar()
    expect(b.getAttribute('aria-valuemin')).toBe('0')
    expect(b.getAttribute('aria-valuemax')).toBe('5')
    expect(b.getAttribute('aria-valuenow')).toBe('0')
    expect(b.getAttribute('aria-valuetext')).toBe('0 / 5 mashq yakunlandi')
    expect(fill(b).style.width).toBe('0%')
  })

  it('to‘g‘ri javobdan keyin bar keyingi qismga siljiydi (1/5 = 20%)', () => {
    mount(one({ exercise: CHOICE, index: 0, total: 5 }))
    press('went')
    press('Tekshirish')
    const b = bar()
    expect(b.getAttribute('aria-valuenow')).toBe('1')
    expect(b.getAttribute('aria-valuetext')).toBe('1 / 5 mashq yakunlandi')
    expect(fill(b).style.width).toBe('20%')
  })

  it('NOTO‘G‘RI javobda ham bar to‘ladi — jarayon siljiydi (jarimaga bog‘liq emas)', () => {
    mount(one({ exercise: CHOICE, index: 0, total: 4 }))
    press('goes')
    press('Tekshirish')
    expect(fill(bar()).style.width).toBe('25%')
  })

  it('oxirgi mashqda bar 100% bo‘ladi', () => {
    mount(one({ exercise: CHOICE, index: 4, total: 5 }))
    press('went')
    press('Tekshirish')
    expect(fill(bar()).style.width).toBe('100%')
  })

  it('o‘rtadagi mashqda bar oldingi javoblar hisobidan boshlanadi (index emas, javoblar)', () => {
    mount(one({ exercise: CHOICE, index: 2, total: 5 }))
    // 2 mashq oldin: ochilganda 40% (`answeredCount = index`).
    expect(fill(bar()).style.width).toBe('40%')
    press('went')
    press('Tekshirish')
    expect(fill(bar()).style.width).toBe('60%')
  })

  it('bar uzamligi YANGI SON EMAS — manifest `stepMs` (`--aea-step`)', () => {
    const css = readFileSync(indexCss, 'utf8').replace(/\s+/g, '')
    expect(css).toContain('--aea-step:260ms;')
    expect(css).toContain('transition:widthvar(--aea-step)cubic-bezier(0.16,1,0.3,1);')
  })

  it('harakat o‘chirilganda siljish o‘chadi (`no-motion` + `prefers-reduced-motion`)', () => {
    const css = readFileSync(indexCss, 'utf8').replace(/\s+/g, '')
    // Bar `animation` EMAS, `transition` bilan ishlaydi — mavjud `no-motion`
    // qoidasi (`transition-duration:0.01ms`) uni o'chiradi: chiziq siljimaydi,
    // joyiga o'tadi. Shu qoida buzilsa test yiqiladi.
    const noMotion = /html\.no-motion[\s\S]{0,140}?transition-duration:\s*0\.01ms\s*!important/.test(css)
    const reduced = /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,160}?transition-duration:\s*0\.01ms\s*!important/.test(css)
    expect(noMotion, 'no-motion bloki transition ni o‘chirmayapti').toBe(true)
    expect(reduced, 'prefers-reduced-motion bloki transition ni o‘chirmayapti').toBe(true)
  })

  it('MOBIL tomonda ham bar bor — `exBar` (`fragment_exercise.xml`), parallellik buzilmagan', () => {
    const xml = readFileSync(mobileLayout, 'utf8')
    expect(xml, 'mobilda `exBar` bo‘lishi kerak').toContain('android:id="@+id/exBar"')
    expect(xml).toContain('com.google.android.material.progressindicator.LinearProgressIndicator')
    const kt = readFileSync(mobileFragment, 'utf8')
    // Mobil ham sonni `ex_index` orqali beradi (matn yo‘qolmagan, accessibility).
    expect(kt).toContain('R.string.ex_index')
    expect(kt).toContain('setProgressCompat')
    // Ikkala tomonda ham xulq BIR xil: harakat o‘chilsa siljish yo‘q, va qoida
    // bir xil (`checked` bo‘lsa index+1).
    expect(kt).toContain('animate && Motion.enabled(requireContext())')
    expect(kt).toContain('val done = if (checked) index + 1 else index')
  })
})

describe('B) Fikr-mulohaza — ekrandagi son store hisobi bilan BIR XIL', () => {
  it('to‘g‘ri javobda ko‘rsatilgan XP store dagi kundalik XP ga teng', () => {
    mount(one({ exercise: CHOICE, index: 0, total: 3 }))
    press('went')
    press('Tekshirish')
    const nums = storeNums()
    expect(nums.xp).toBeGreaterThan(0)
    const tag = host.querySelector('[aria-label*="Bu javob uchun"]')
    expect(tag, 'XP yozuvi topilmadi').toBeTruthy()
    expect(tag!.getAttribute('aria-label')).toBe(`Bu javob uchun ${nums.xp} XP`)
  })

  it('xato javobda XP = 1 va yurak bittaga kamayadi (gameConfig qoidasi)', () => {
    mount(one({ exercise: CHOICE, index: 0, total: 3 }))
    const heartsBefore = storeNums().hearts
    press('goes')
    press('Tekshirish')
    const nums = storeNums()
    expect(nums.xp).toBe(1)
    expect(nums.hearts).toBe(heartsBefore - 1)
  })

  it('to‘g‘ri javob — zarba halqasi, noto‘g‘ri — silkinish sinfi (DULO mexanikasi, biznikigi)', () => {
    mount(one({ exercise: CHOICE, index: 0, total: 4 }))
    press('went')
    press('Tekshirish')
    expect(host.querySelector('.aea-outcome-correct'), 'to‘g‘ri kartada halqa sinfi yo‘q').toBeTruthy()
    expect(host.querySelector('.aea-outcome-wrong')).toBeNull()
    unmount()

    mount(one({ exercise: CHOICE, index: 0, total: 4 }))
    press('goes')
    press('Tekshirish')
    expect(host.querySelector('.aea-outcome-wrong'), 'noto‘g‘ri kartada silkinish sinfi yo‘q').toBeTruthy()
    // Qahramon bizniki (`MascotAvatar`) — tashqi brend belgisi qo'shilmagan.
    const mascot = host.querySelector('[aria-label*="qahramon" i], [aria-label*="Akira" i]')
    expect(mascot, 'qahramon topilmadi — u doim bizniki').toBeTruthy()
  })

  it('MOBIL tomonda ham silkinish va javob ovozi bor — parallellik', () => {
    const kt = readFileSync(mobileFragment, 'utf8')
    expect(kt, 'mobilda `Motion.shake` chaqirilmayapti').toContain('Motion.shake(b.resultCard)')
    expect(kt).toContain('Motion.playFeedback(ctx, out.correct)')
    // Mobilda tebranish soni YANGI EMAS — mavjud `outcomeMs`.
    const motion = readFileSync(mobileMotion, 'utf8')
    expect(motion).toContain('sp.outcomeMs / 5')
    expect(motion).toContain('sp.pressMs')
  })

  it('audio FAYL qo‘shilmagan — ovoz sintez qilinadi (manifest qoidasi buzilmaydi)', () => {
    const runner = readFileSync(runnerSource, 'utf8')
    expect(runner, 'ExerciseRunner javob ovozini chaqirmayapti').toContain("playFeedback(r.correct ? 'correct' : 'wrong'")
    // `public/audio/manifest.json`dagı fayllar ro'yxati o'smagan (soxta audio yo'q).
    const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public/audio/manifest.json'), 'utf8')) as unknown[]
    const names = JSON.stringify(manifest)
    for (const fake of ['correct', 'wrong', 'feedback']) {
      for (const ext of ['.mp3', '.ogg', '.wav', '.m4a']) {
        expect(names, `audio manifestiga ${fake}${ext} qo'shilgan — fayl yo'q edi`).not.toContain(`${fake}${ext}`)
      }
    }
  })

  it(`jsdom'da AudioContext bo'lmasa ovoz jim jo'natiladi (xato tashlanmaydi)`, () => {
    // Brauzer/API yo'q muhit — halol yo'l: "ishlamadi" deb xabar yoq, lekin
    // ilova ishlashda davom etadi (`feedbackSound.ts` dagi `try/catch`).
    expect(() => playFeedback('correct', true)).not.toThrow()
    expect(() => playFeedback('wrong', false)).not.toThrow()
  })
})

describe('C) Combo — FAQAT haqiqiy holat ko‘rsatiladi', () => {
  /** Bitta store ichida ketma-ket mashq zanjiri. */
  function chain(comboTracked: boolean) {
    mount(
      <StoreProvider userId={UID}>
        <Chain comboTracked={comboTracked} total={6} />
      </StoreProvider>,
    )
  }

  it('birinchi to‘g‘ri javobdan keyin chip YO‘Q (combo = 1 — hali ahamiyatsiz)', () => {
    chain(true)
    press('went')
    press('Tekshirish')
    expect(storeNums().combo).toBe(1)
    expect(host.textContent ?? '').not.toContain('ketma-ket to')
  })

  it('ikkinchi to‘g‘ri javobdan keyin chip store dagi sonni ko‘rsatadi', () => {
    chain(true)
    press('went')
    press('Tekshirish')
    press('Keyingi')
    press('went')
    press('Tekshirish')
    const nums = storeNums()
    expect(nums.combo).toBe(2)
    const chip = [...host.querySelectorAll('*')].find((el) => (el.textContent ?? '').trim().includes('ketma-ket to'))
    expect(chip, 'combo chipi topilmadi').toBeTruthy()
    // Son IXTIR EMAS — store dagi hisob bilan bir xil.
    expect(chip!.textContent).toContain(`${nums.combo} ketma-ket to`)
  })

  it('noto‘g‘ri javob combo ni nolga tushiradi — chip yo‘qoladi (soxta son qolmaydi)', () => {
    chain(true)
    press('went')
    press('Tekshirish')
    press('Keyingi')
    press('went')
    press('Tekshirish')
    expect(storeNums().combo).toBe(2)
    press('Keyingi')
    press('goes')
    press('Tekshirish')
    expect(storeNums().combo).toBe(0)
    expect(host.textContent ?? '').not.toContain('ketma-ket to')
  })

  it("sahifa javobni yozmasa (comboTracked yo‘q) chip CHIZILMAYDI — store'da combo o'ssa ham", () => {
    // MockExam / Onboarding `recordAttempt` chaqirmaydi; himoya sifatida
    // `comboTracked = false` standarti chipni yashiradi. Bu yerda zanjir
    // `recordAttempt` QILADI (combo o'sadi), lekin belgi berilmagan — chip
    // baribir chizilmaydi (eski, ishonchsiz ko'rinish qaytmasin).
    chain(false)
    press('went')
    press('Tekshirish')
    press('Keyingi')
    press('went')
    press('Tekshirish')
    expect(storeNums().combo).toBe(2)
    expect(host.textContent ?? '').not.toContain('ketma-ket to')
  })

  it('yurak qaytish soni gameConfig DAN olinadi — ixtir emas (veb ↔ mobil)', () => {
    const runner = readFileSync(runnerSource, 'utf8')
    expect(runner).toContain('HEART_COMBO_STREAK')
    const cfg = readFileSync(path.join(ROOT, 'src/lib/gameConfig.ts'), 'utf8')
    expect(cfg).toContain(`export const HEART_COMBO_STREAK = ${HEART_COMBO_STREAK}`)
    const mob = readFileSync(mobileGameConfig, 'utf8')
    expect(mob).toContain(`HEART_COMBO_STREAK = ${HEART_COMBO_STREAK}`)
    // Matnlar ham ikkala tomonda bor (mobilda `strings.xml`).
    const strings = readFileSync(path.join(ROOT, 'mobile/app/src/main/res/values/strings.xml'), 'utf8')
    expect(strings, 'mobilda combo matni yo‘q').toContain('ex_combo')
  })

  it('variant tugmalari bosilganda JONLI: `--aea-press` + mobil `Motion.press`', () => {
    mount(one({ exercise: CHOICE, index: 0, total: 3 }))
    const target = [...host.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('went'))
    expect(target, 'variant tugmasi topilmadi').toBeTruthy()
    expect(target!.className).toContain('aea-choice')
    const css = readFileSync(indexCss, 'utf8').replace(/\s+/g, '')
    expect(css).toContain('transformvar(--aea-press)cubic-bezier(0.34,1.56,0.64,1)')
    expect(css).toContain(':active{transform:scale(0.97);}')
    const kt = readFileSync(mobileFragment, 'utf8')
    // Mobilda ham javob tugmalarining HARMASIDA bosish qo'yilgan:
    // variant (2 xil), matching tugmasi, gap banki, word-order banki.
    const applied = (kt.match(/pressOnTouch\(this\)/g) ?? []).length
    expect(applied, 'mobil tugmalarda pressOnTouch yetarli emas').toBeGreaterThanOrEqual(5)
    expect(kt).toContain('Motion.press(view)')
  })
})
