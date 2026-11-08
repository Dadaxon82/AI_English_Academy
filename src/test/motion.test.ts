/**
 * Harakat (animatsiya) manifesti testlari — mobildagi
 * `mobile/app/src/test/java/.../data/MotionManifestTest.kt` bilan BIR XIL
 * qoidalar. Ikkala tomonda SONLAR BIR XIL bo'lishi shart (foydalanuvchi
 * telefon va brauzerda bir xil harakatni ko'rishi uchun) — shu test shu
 * barqarorlikni qo'yadi.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  defaultMotionSpec,
  MOTION,
  MOTION_MAX_MS,
  MOTION_MIN_MS,
  MOTION_USAGE,
  motionAllowed,
  motionSpecToJson,
  motionVars,
  parseMotionSpec,
} from '../lib/motionManifest'

// jsdom'da `import.meta.url` file:// sxemali emas — shuning uchun yo'llar
// loyiha ildizi (`process.cwd()`) dan olinadi (`audio-integrity.test.ts`
// ham shu usuldan foydalanadi).
const ROOT = process.cwd()

/** Mobil tomondagi haqiqiy manifest (`assets` emas — `res/raw`). */
const mobileManifest = path.join(ROOT, 'mobile/app/src/main/res/raw/motion_manifest.json')
const indexCss = path.join(ROOT, 'src/index.css')

describe('Harakat manifesti (sonlar hujjatlangan, ixtira EMAS)', () => {
  it('standart qiymatlar mobil `res/raw/motion_manifest.json` bilan BIR XIL', () => {
    const mobile = parseMotionSpec(readFileSync(mobileManifest, 'utf8'))
    expect(mobile, `mobil manifest o'qilmadi: ${mobileManifest}`).not.toBeNull()
    expect(mobile).toEqual(defaultMotionSpec())
  })

  it('manifest izohida byudjet sonlari ochiq yozilgan (DULO o‘lchovlari)', () => {
    const raw = JSON.parse(readFileSync(mobileManifest, 'utf8')) as Record<string, unknown>
    expect(raw._comment, 'manifestda izoh bo‘lishi kerak').toBeTruthy()
    expect(raw.stepMs).toBe(260)
    expect(raw.xpMs).toBe(620)
    // Bosish micro-interaction'i — mobil JSON'da ham AYNAN shu son.
    expect(raw.pressMs).toBe(defaultMotionSpec().pressMs)
  })

  it('CSS o‘zgaruvchilari manifest sonlaridan yasaladi (byudjet haqiqatan ishlatiladi)', () => {
    const vars = motionVars(MOTION)
    expect(vars['--aea-step']).toBe(`${MOTION.stepMs}ms`)
    expect(vars['--aea-outcome']).toBe(`${MOTION.outcomeMs}ms`)
    expect(vars['--aea-pop']).toBe(`${MOTION.popMs}ms`)
    expect(vars['--aea-xp']).toBe(`${MOTION.xpMs}ms`)
    expect(vars['--aea-chain']).toBe(`${MOTION.chainMs}ms`)
    expect(vars['--aea-stagger']).toBe(`${MOTION.staggerMs}ms`)
    expect(vars['--aea-pop-scale']).toBe(String(MOTION.popScale))
    // `src/index.css` bu o'zgaruvchilardan foydalanadi; sonlardan biri
    // o'zgartirilsa shu test signal beradi (ikki manba zid kelmasin).
    const css = readFileSync(indexCss, 'utf8').replace(/\s+/g, '')
    for (const [k, v] of Object.entries(vars)) {
      expect(css.includes(`${k}:${v};`), `src/index.css da ${k}: ${v} bo'lishi kerak`).toBe(true)
    }
  })

  it('manifestdagi har bir son qayerda ishlatiladi — ro‘yxat to‘liq', () => {
    const keys = Object.keys(defaultMotionSpec()).sort()
    expect(MOTION_USAGE.map((u) => u.key).sort()).toEqual(keys)
    for (const u of MOTION_USAGE) expect(u.whereUz.length).toBeGreaterThan(3)
  })
})

describe('parseMotionSpec — halol o‘qish', () => {
  it('yetishmaydigan maydon standartga qaytadi', () => {
    const s = parseMotionSpec('{"stepMs":100}')
    expect(s?.stepMs).toBe(100)
    expect(s?.xpMs).toBe(defaultMotionSpec().xpMs)
  })

  it('chegaradan chiqqan son klampqiladi', () => {
    const big = parseMotionSpec('{"stepMs":99999,"popScale":5,"staggerMaxItems":500}')
    expect(big?.stepMs).toBe(MOTION_MAX_MS)
    expect(big?.popScale).toBe(1.3)
    expect(big?.staggerMaxItems).toBe(24)
    const neg = parseMotionSpec('{"xpMs":-50}')
    expect(neg?.xpMs).toBe(MOTION_MIN_MS)
  })

  it('buzilgan maydon bo‘lsa butun manifest null (yarim sozlama qolmaydi)', () => {
    for (const bad of ['{"stepMs":"tez"}', '{"popScale":"katta"}', '[]', '{', 'null', '"matn"']) {
      expect(parseMotionSpec(bad), bad).toBeNull()
    }
  })

  it('to‘g‘ri manifest JSON ga qaytadi (round-trip)', () => {
    const s = defaultMotionSpec()
    expect(parseMotionSpec(motionSpecToJson(s))).toEqual(s)
  })

  it('byudjet qisqa: ekranni kutdirmaymiz (DULO medianasi 2917 ms, biz ≤ 1500 ms)', () => {
    const d = defaultMotionSpec()
    for (const ms of [d.stepMs, d.outcomeMs, d.popMs, d.xpMs, d.chainMs, d.staggerMs]) {
      expect(ms).toBeLessThanOrEqual(MOTION_MAX_MS)
      expect(ms).toBeGreaterThan(0)
    }
    expect(d.popScale).toBeLessThanOrEqual(1.3)
  })

  it('bosish “bump” bosqichlari mobil `Motion.press()` bilan BIR XIL', () => {
    // Vebda `@keyframes bump`, mobil `Motion.kt`da `press()` — masshtablar
    // (0.97 → 1.03 → 1) va bosish vaqti (`pressMs`) ikkala tomonda bir xil
    // bo'lishi shart. Matn formati farq qilishi mumkin — shuning uchun
    // raqamlar alohida qidiriladi.
    const css = readFileSync(indexCss, 'utf8')
    const bump = css.match(/@keyframes\s+bump\s*\{([\s\S]*?)\n\}/)
    expect(bump, 'src/index.css da @keyframes bump bo‘lishi kerak').not.toBeNull()
    const scales = [...(bump![1].matchAll(/scale\(([\d.]+)\)/g))].map((m) => Number(m[1]))
    expect(scales, 'bump bosqichlari 0.97 → 1.03 → 1 bo‘lishi kerak').toEqual([0.97, 1.03, 1])
    // Mobil tomonda aynan shu sonlar yozilgan (vaqt esa `pressMs`dan).
    const kt = readFileSync(
      path.join(ROOT, 'mobile/app/src/main/java/com/dadaxon/aienglishacademy/ui/Motion.kt'),
      'utf8',
    )
    for (const literal of ['0.97f', '1.03f', 'sp.pressMs']) {
      expect(kt.includes(literal), `Motion.kt da ${literal} bo'lishi kerak`).toBe(true)
    }
    // CSS ham vaqtni manifestdan oladi — yangi son yo‘q.
    expect(css.replace(/\s+/g, ''), 'bump --aea-press dan olishi kerak').toContain('animation:bumpvar(--aea-press)')
  })

  it('pressMs IXTIR EMAS — byudjetdagi mavjud ikki sondan kelib chiqadi', () => {
    // Izohda aytilgan formula: √(staggerMs × outcomeMs) → 120 ms ga yaxlitlanadi.
    const d = defaultMotionSpec()
    const geo = Math.sqrt(d.staggerMs * d.outcomeMs)
    expect(Math.abs(d.pressMs - geo), `pressMs ${d.pressMs} ≠ √(${d.staggerMs}×${d.outcomeMs})`).toBeLessThanOrEqual(10)
    // Bosish qadami eng kichik qadamdan uzun, lekin eng katta qadamdan qisqa.
    expect(d.pressMs).toBeGreaterThan(d.staggerMs)
    expect(d.pressMs).toBeLessThan(d.xpMs)
  })
})

describe('motionAllowed — ikki manba (sozlama + brauzer so‘rovi)', () => {
  it('sozlama o‘chirilgan bo‘lsa harakat yo‘q', () => {
    expect(motionAllowed(false, () => ({ matches: false }))).toBe(false)
  })

  it('brauzer “kamaytirilgan harakat” desa harakat yo‘q (sozlama yoqiq bo‘lsa ham)', () => {
    expect(motionAllowed(true, () => ({ matches: true }))).toBe(false)
  })

  it('ikkalasi ham yoqsa — harakat bor', () => {
    expect(motionAllowed(true, () => ({ matches: false }))).toBe(true)
  })

  it('matchMedia bo‘lmasa xato tashlamaydi (harakat o‘chirilmaydi)', () => {
    expect(motionAllowed(true, () => undefined as never)).toBe(true)
  })
})
