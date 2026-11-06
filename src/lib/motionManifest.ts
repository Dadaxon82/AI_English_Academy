/**
 * Animatsiya byudjeti — mobildagi `res/raw/motion_manifest.json` ning vebdagi
 * ekvivalenti (`mobile/.../data/MotionManifest.kt` bilan BIR XIL sonlar).
 *
 * Nima uchun alohida fayl: namunaviy ilova (`DULO_mod.apk`) barcha harakat va
 * ovoz fayllarini ilova ichida saqlaydi. O'lchangan dalil (2026-11-05,
 * `New_loixa\dulo_scan\scan2.py…scan7.py`): `res/raw`da 1212 fayl / 75,5 MB —
 * 290 `.riv` (Rive), 198 Lottie `.json`, 278 `.hla` (tebranish+hana jufti),
 * 297 `.mp3`, 135 `.ogg`, 6 `.wav`. Lottie fayllarining haqiqiy davomiyligi
 * `fr/ip/op` maydonlaridan hisoblandi: eng qisqasi 483 ms, mediana 2917 ms,
 * eng uzoq 14 815 ms; `.hla` `Duration` 1…7005 ms, mediana 947 ms.
 *
 * Biz Rive/Lottie binarylarini ko'chirmaymiz (75 MB va tashqi formatlar) —
 * **mantiqi va joyi bir xil**: qaysi harakat qancha millisekund davom etishi
 * bitta manifestda yoziladi, sekundlarda emas. Bizning qadamlar qisqa: ekranni
 * kutdirmaymiz (Material standart harakati 200—450 ms atrofida).
 *
 * Diqqat: bu fayl JAVOB MAS'ULIYATINI O'Z ICHIGA OLADI. Brauzerda CSS
 * `var(--animate-*)` qiymatlari `src/index.css`da shu sonlar bilan yozilgan;
 * `motionVars()` esa ularni `style` orqali jonli yangilaydi (sozlama
 * o'zgarsa). Mana shu sonlar haqiqatan ishlatiladi — bezak manifest emas.
 */

export interface MotionSpec {
  /** Bir mashqdan ikkinchisiga o'tish (fade+slide) — ms. */
  stepMs: number
  /** Natija kartasining chiqishi — ms. */
  outcomeMs: number
  /** Qahramon "sakrash" (scale bounce) — ms. */
  popMs: number
  /** Qahramon eng katta masshtabi (1.0 = o'z o'lchami). */
  popScale: number
  /** Ro'yxat elementlarining narigor (stagger) oralig'i — ms. */
  staggerMs: number
  /** Narigor qatoridagi maksimal element soni (byudjet). */
  staggerMaxItems: number
  /** XP sonining uchib chiqishi — ms. */
  xpMs: number
  /** Zanjir kataklari to'lishi — ms. */
  chainMs: number
}

export const MOTION_MIN_MS = 0
export const MOTION_MAX_MS = 1500

/** Manifest bo'lmasa yoki buzilsa ishlatiladigan qiymatlar (mobil bilan bir xil). */
export function defaultMotionSpec(): MotionSpec {
  return {
    stepMs: 260,
    outcomeMs: 320,
    popMs: 380,
    popScale: 1.14,
    staggerMs: 40,
    staggerMaxItems: 8,
    xpMs: 620,
    chainMs: 240,
  }
}

/**
 * Byudjetning Bitta manbasi — UI shu qiymatlardan foydalanadi (CSS o'zgaruvchilari
 * `src/index.css`da shu sonlar bilan yozilgan, `Layout.tsx` esa ularni jonli
 * yangilaydi). Manifest matndan o'qilsa bu qiymatlar almashtiriladi.
 */
export const MOTION: MotionSpec = defaultMotionSpec()

/**
 * JSON matnini tekshirib o'qish (mobildagi `MotionSpec.parse` bilan bir
 * qoida): noto'g'ri son maydoni bo'lsa butun manifest `null` — jimgina
 * yarim sozlangan holat qolmaydi, chaqiruvchi `defaultMotionSpec()` ga qaytadi.
 * chegaradan chiqqan son KLAMPQILADI.
 */
export function parseMotionSpec(text: string): MotionSpec | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const d = defaultMotionSpec()

  const ms = (key: string, def: number): number | null => {
    const v = o[key]
    if (v === undefined) return def
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    return Math.min(MOTION_MAX_MS, Math.max(MOTION_MIN_MS, Math.trunc(v)))
  }

  const stepMs = ms('stepMs', d.stepMs)
  const outcomeMs = ms('outcomeMs', d.outcomeMs)
  const popMs = ms('popMs', d.popMs)
  const staggerMs = ms('staggerMs', d.staggerMs)
  const xpMs = ms('xpMs', d.xpMs)
  const chainMs = ms('chainMs', d.chainMs)
  if (stepMs === null || outcomeMs === null || popMs === null || staggerMs === null || xpMs === null || chainMs === null)
    return null

  let popScale: number | null
  if (o.popScale === undefined) popScale = d.popScale
  else if (typeof o.popScale === 'number' && Number.isFinite(o.popScale))
    popScale = Math.min(1.3, Math.max(1, o.popScale))
  else popScale = null
  if (popScale === null) return null

  let staggerMaxItems: number | null
  if (o.staggerMaxItems === undefined) staggerMaxItems = d.staggerMaxItems
  else if (typeof o.staggerMaxItems === 'number' && Number.isFinite(o.staggerMaxItems))
    staggerMaxItems = Math.min(24, Math.max(1, Math.trunc(o.staggerMaxItems)))
  else staggerMaxItems = null
  if (staggerMaxItems === null) return null

  return { stepMs, outcomeMs, popMs, popScale, staggerMs, staggerMaxItems, xpMs, chainMs }
}

/** Manifestni JSON ga qaytarish (test va hisobot uchun). */
export function motionSpecToJson(s: MotionSpec): string {
  return JSON.stringify({
    stepMs: s.stepMs,
    outcomeMs: s.outcomeMs,
    popMs: s.popMs,
    popScale: s.popScale,
    staggerMs: s.staggerMs,
    staggerMaxItems: s.staggerMaxItems,
    xpMs: s.xpMs,
    chainMs: s.chainMs,
  })
}

/**
 * Harakatlar RO'YXATI — qaysi harakat qayerda ishlatiladi (halollik uchun:
 * manifestdagi har bir son haqiqatan bir joyda ishlatiladi).
 */
export const MOTION_USAGE: { key: keyof MotionSpec; whereUz: string }[] = [
  { key: 'stepMs', whereUz: 'mashqdan mashqqa o‘tish (--aea-step)' },
  { key: 'outcomeMs', whereUz: 'natija kartasi (--aea-outcome)' },
  { key: 'popMs', whereUz: 'qahramon sakrashi (--aea-pop)' },
  { key: 'popScale', whereUz: 'sakrashning eng katta masshtabi (--aea-pop-scale)' },
  { key: 'staggerMs', whereUz: 'ro‘yxat elementlari kechikishi (--aea-stagger)' },
  { key: 'staggerMaxItems', whereUz: 'kechiktiriladigan elementlar chegarasi' },
  { key: 'xpMs', whereUz: 'XP sonining ko‘tarilishi (--aea-xp)' },
  { key: 'chainMs', whereUz: 'zanjir katakchalarining to‘lishi (--aea-chain)' },
]

/**
 * Manifest qiymatlarini CSS o'zgaruvchilariga aylantirish. `src/index.css`
 * bu o'zgaruvchilardan foydalanadi; `Layout.tsx` sozlama o'zgarganda ularni
 * `<html>`ga yozadi.
 */
export function motionVars(s: MotionSpec): Record<string, string> {
  return {
    '--aea-step': `${s.stepMs}ms`,
    '--aea-outcome': `${s.outcomeMs}ms`,
    '--aea-pop': `${s.popMs}ms`,
    '--aea-pop-scale': String(s.popScale),
    '--aea-stagger': `${s.staggerMs}ms`,
    '--aea-xp': `${s.xpMs}ms`,
    '--aea-chain': `${s.chainMs}ms`,
  }
}

/**
 * Brauzer harakat so'rovi + foydalanuvchi sozlamasi.
 * `prefers-reduced-motion: reduce` — operatsion tizim so'rovi, u HAR DOIM
 * hurmat qilinadi; foydalanuvchi tugmasi qo'shimcha o'chirish.
 */
export function motionAllowed(settingEnabled: boolean, matchMedia: (q: string) => { matches: boolean } = (q) => window.matchMedia(q)): boolean {
  if (!settingEnabled) return false
  // `matchMedia` yo'q bo'lsa (SSR/test) so'rov yo'q deb hisoblaymiz —
  // harakat o'chirilmaydi, lekin bu taxmin emas: muhit suchuvchi yo'q.
  try {
    return !matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}
