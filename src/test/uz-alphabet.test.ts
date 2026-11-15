/**
 * Yangi o'zbek lotin alifbosi (ö, ğ, ş, ç) va eski yozuv (o‘, g‘, sh, ch) —
 * javob tekshiruvi va qidiruvda TENG. Kontent yangi alifboda; o'quvchi
 * klaviaturada eski shaklda yozsa ham to'g'ri hisoblanishi kerak.
 */
import { describe, expect, it } from 'vitest'
import { foldUzLatin } from '../lib/uzAlphabet'
import { looseEquals, normalize } from '../lib/check'
import { LOADED_LEVELS, getBundle, loadLevels } from '../content'

describe('foldUzLatin', () => {
  it('yangi harflar eski ikki belgili shaklga, apostroflar bitta belgiga', () => {
    expect(foldUzLatin('öqituvçi')).toBe("o'qituvchi")
    expect(foldUzLatin('Ğalaba, Şahar, Çiroyli, Özbek')).toBe("G'alaba, Shahar, Chiroyli, O'zbek")
    expect(foldUzLatin('o‘qish oʻqish o’qish')).toBe("o'qish o'qish o'qish")
    // tutuq belgisi saqlanadi (faqat apostrof turi bir xillashadi)
    expect(foldUzLatin('ma’lumot')).toBe("ma'lumot")
  })

  it('normalize: yangi va eski yozuv bir xil natija beradi', () => {
    expect(normalize('Töğri javob')).toBe(normalize("To'g'ri javob"))
    expect(normalize('keçirasiz')).toBe(normalize('kechirasiz'))
    expect(looseEquals('yaxşi', 'yaxshi')).toBe(true)
    // inglizcha javoblarga ta'sir qilmaydi
    expect(normalize("She doesn’t watch TV")).toBe("she doesn't watch tv")
  })
})

describe('kontent yangi alifboda', () => {
  it('o‘zbekcha tarjimalarda eski «o‘ / g‘» qolmagan (tutuq belgisi ’ bundan mustasno)', async () => {
    await loadLevels()
    expect(LOADED_LEVELS).toContain('A2')
    const bad: string[] = []
    for (const lvl of LOADED_LEVELS) {
      for (const v of getBundle(lvl).vocab) {
        for (const t of [v.translationUz, v.exampleUz]) if (t && /[oOgG][‘ʻ'`][a-z]/.test(t)) bad.push(`${v.id}: ${t}`)
      }
    }
    expect(bad).toEqual([])
  })
})
