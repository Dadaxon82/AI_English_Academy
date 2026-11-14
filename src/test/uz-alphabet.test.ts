/**
 * Yangi o'zbek lotin alifbosi (ö, ğ, ş, ç) va eski yozuv (o‘, g‘, sh, ch) —
 * javob tekshiruvida TENG. Kontent yangi alifboda; o'quvchi klaviaturada eski
 * shaklda yozsa ham to'g'ri hisoblanishi kerak.
 */
import { describe, expect, it } from 'vitest'
import { foldUzLatin } from '../lib/uzAlphabet'
import { looseEquals, normalize } from '../lib/check'
import { getBundle } from '../content'

describe('foldUzLatin', () => {
  it('yangi harflar eski ikki belgili shaklga, apostroflar bitta belgiga', () => {
    expect(foldUzLatin('öqituvçi')).toBe("o'qituvchi")
    expect(foldUzLatin('Ğalaba, Şahar, Çiroyli, Özbek')).toBe("G'alaba, Shahar, Chiroyli, O'zbek")
    expect(foldUzLatin('o‘qish oʻqish o’qish')).toBe("o'qish o'qish o'qish")
    expect(foldUzLatin('ma’lumot')).toBe("ma'lumot")
  })

  it('normalize: yangi va eski yozuv bir xil natija beradi', () => {
    expect(normalize('Töğri javob')).toBe(normalize("To'g'ri javob"))
    expect(normalize('keçirasiz')).toBe(normalize('kechirasiz'))
    expect(looseEquals('yaxşi', 'yaxshi')).toBe(true)
    expect(normalize('She doesn’t watch TV')).toBe("she doesn't watch tv")
  })
})

describe('kontent yangi alifboda', () => {
  it('o‘zbekcha tarjima va misollarda eski «o‘ / g‘ / sh / ch» qolmagan', () => {
    const bad: string[] = []
    for (const v of getBundle('A1').vocab) {
      for (const t of [v.translationUz, v.exampleUz]) if (t && /[oOgG][‘ʻ'`’][a-z]|sh|ch/i.test(t)) bad.push(`${v.id}: ${t}`)
    }
    expect(bad).toEqual([])
  })

  it('inglizcha so‘zlar o‘zgarmagan', () => {
    const words = getBundle('A1').vocab.map((v) => v.word + ' ' + v.exampleEn).join(' ')
    expect(words).not.toMatch(/[öğşç]/)
  })
})
