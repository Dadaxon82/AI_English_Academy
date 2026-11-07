/**
 * O'yin belgilari va RANGLARI — veb (`src/components/icons.tsx` + `src/index.css`)
 * va mobil (`res/drawable/ic_*.xml` + `res/values/colors.xml`) BIR XIL.
 *
 * Nega: yurak qizil, gem ko'k, olov to'q sariq — bu tanlov foydalanuvchining
 * ko'zida "til" hisoblanadi. Brauzerda binafsha, telefonda ko'k bo'lsa, bu
 * dizayn xatosiga aylanadi. Shuning uchun geometriya (SVG yo'llari) va ranglar
 * BITTA manbadan olinadi; test esa ikkala tomonning haqiqatan teng ekanini sanaydi.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const IconsSrc = path.join(ROOT, 'src/components/icons.tsx')
const indexCss = path.join(ROOT, 'src/index.css')
const colorsXml = path.join(ROOT, 'mobile/app/src/main/res/values/colors.xml')
const drawableDir = path.join(ROOT, 'mobile/app/src/main/res/drawable')

/** Veb tomondagi o'yin ranglari — `src/index.css`. */
const GAME_VARS = ['--heart', '--gem', '--star', '--league'] as const

/** Belgilar ro'yxati — `icons.tsx` dagi `GameIconName` bilan bir xil bo'lishi shart. */
const ICON_NAMES = ['heart', 'gem', 'flame', 'star', 'shield', 'trophy', 'chest', 'bolt', 'lock', 'check'] as const

/** `index.css` dan `:root` va `.dark` bloklaridagi o'zgaruvchi qiymatlari. */
function cssBlock(selector: string): string {
  const css = readFileSync(indexCss, 'utf8')
  const start = css.indexOf(selector)
  expect(start, `index.css da ${selector} bo‘lishi kerak`).toBeGreaterThan(-1)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  return css.slice(open, close)
}

function cssVar(block: string, name: string): string {
  const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block)
  expect(m, `index.css da ${name} rangi bo‘lishi kerak`).not.toBeNull()
  return m![1]!.toLowerCase()
}

describe('O‘yin belgilarining ranglari — veb ↔ mobil BIR XIL', () => {
  it('index.css da to‘rtta o‘yin rangi yoniq va qorong‘u rejimda bor', () => {
    const light = cssBlock(':root {')
    const dark = cssBlock('.dark {')
    for (const v of GAME_VARS) {
      const l = cssVar(light, v)
      const d = cssVar(dark, v)
      expect(l).toMatch(/^#[0-9a-f]{6}$/)
      expect(d).toMatch(/^#[0-9a-f]{6}$/)
      // Qorong'uda rang o'qiladigan bo'lishi uchun yorqinroq (kanal yig'indisi).
      const sum = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0)
      expect(sum(d), `${v} qorong'uda yorqinroq bo'lishi kerak`).toBeGreaterThan(sum(l))
    }
  })

  it('mobil colors.xml dag ranglar veb CSS bilan TENG (hex bo‘yicha)', () => {
    const xml = readFileSync(colorsXml, 'utf8').toLowerCase()
    const light = cssBlock(':root {')
    const pick = (name: string) => {
      const m = new RegExp(`<color name="${name}">#([0-9a-f]{6})</color>`).exec(xml)
      expect(m, `colors.xml da <color name="${name}"> bo‘lishi kerak`).not.toBeNull()
      return m![1]!
    }
    for (const v of GAME_VARS) {
      const key = v.slice(2) // '--heart' → 'heart'
      expect(pick(key), `${key} rangi veb bilan bir xil bo'lishi kerak`).toBe(cssVar(light, v).slice(1))
      expect(pick(`${key}_dark`), `${key}_dark rangi veb qorong'usi bilan bir xil bo'lishi kerak`).toBe(
        cssVar(cssBlock('.dark {'), v).slice(1),
      )
    }
  })

  it('har bir belgi uchun mobil drawable bor va u 24×24 viewport', () => {
    for (const n of ICON_NAMES) {
      const f = path.join(drawableDir, `ic_${n}.xml`)
      const xml = readFileSync(f, 'utf8')
      expect(xml.includes('android:viewportWidth="24"'), `ic_${n}.xml 24×24 bo'lishi kerak`).toBe(true)
      expect(xml.includes('android:viewportHeight="24"'), `ic_${n}.xml 24×24 bo'lishi kerak`).toBe(true)
      expect(xml.includes('<path'), `ic_${n}.xml yo'lga ega bo'lishi kerak`).toBe(true)
    }
  })

  it('SVG yo‘llari veb va mobilning o‘zida bir xil (geometriya nusxa)', () => {
    const tsx = readFileSync(IconsSrc, 'utf8')
    for (const n of ICON_NAMES) {
      // `icons.tsx` da belgi nom va yo'llari sanalgan bo'lishi shart.
      expect(tsx.includes(`${n}:`), `icons.tsx da "${n}" bo‘lishi kerak`).toBe(true)
      const xml = readFileSync(path.join(drawableDir, `ic_${n}.xml`), 'utf8')
      // Mobil yo'llarning kamida BITTASI veb faylida ham yozilgan — ya'ni ikkala
      // taraf ham BIR geometriyadan nusxa olingan (alohida chizilmagan).
      const datas = [...xml.matchAll(/android:pathData="([^"]+)"/g)].map((m) => m[1]!)
      expect(datas.length, `ic_${n}.xml da yo'l bo'lishi kerak`).toBeGreaterThan(0)
      expect(datas.some((d) => tsx.includes(d)), `ic_${n}.xml yo'llari icons.tsx da bo'lishi kerak`).toBe(true)
    }
  })
})
