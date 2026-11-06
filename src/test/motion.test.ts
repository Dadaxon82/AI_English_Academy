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
