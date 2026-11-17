/**
 * Karnay tugmasi o'qiydigan matn (foydalanuvchi videosi: "two ___" savolida
 * TTS «two underscore underscore underscore» deb o'qirdi).
 */
import { describe, expect, it } from 'vitest'
import { speechText } from '../lib/speech'
import { guessLang, promptOf } from '../components/exercise/helpers'
import { allExercises, loadLevels, LOADED_LEVELS } from '../content'

describe('speechText — eshitiladigan inglizcha matn', () => {
  it('bo‘shliq «blank» deb aytiladi, pastki chiziq o‘qilmaydi', () => {
    expect(speechText('two ___')).toBe('two blank')
    expect(speechText('Who is ___? — She is my wife.')).toBe('Who is blank? — She is my wife.')
    expect(speechText('K, L, ___, N')).toBe('K, L, blank, N')
    expect(speechText('___ three lamps in the shop.')).toBe('blank three lamps in the shop.')
  })
  it('qavs ichidagi o‘zbekcha ishora va ekran izohi o‘qilmaydi', () => {
    expect(speechText('My bag is ___ (yonimda, yaqinda).')).toBe('My bag is blank.')
    expect(speechText('Whose bag is it? (name)')).toBe('Whose bag is it?')
  })
  it('«…», «→», «/» va katta harfli ta’kid — tabiiy o‘qiladi', () => {
    expect(speechText('Your grandmother is 70. You say: “My grandmother ...”')).toBe('Your grandmother is 70. You say: “My grandmother”')
    expect(speechText('“Where do you work?” → He asked me ___.')).toBe('“Where do you work?” He asked me blank.')
    expect(speechText('He / She is my …')).toBe('He or She is my')
    expect(speechText('EXIT')).toBe('exit')
    expect(speechText('Where is the TV?')).toBe('Where is the TV?')
  })
  it('oddiy gap o‘zgarmaydi', () => {
    expect(speechText('Is this your pen or my pen?')).toBe('Is this your pen or my pen?')
  })
})

describe('guessLang — o‘zbekcha matn inglizcha ovozda o‘qilmaydi', () => {
  it('o‘zbek harflari yoki «Which word means …» — uz', () => {
    expect(guessLang('Men bananni yaxşi köraman.')).toBe('uz')
    expect(guessLang('payşanba — choose the correct spelling.')).toBe('uz')
    expect(guessLang('Which word means "sinf xonasi"?')).toBe('uz')
    expect(guessLang('The café is open until 22.')).toBe('en')
  })
  it('barcha darajalar: karnayli savollarda pastki chiziq, qavs va o‘zbek harfi eshitilmaydi', async () => {
    await loadLevels()
    let n = 0
    for (const l of LOADED_LEVELS)
      for (const e of allExercises(l)) {
        const p = promptOf(e)
        if (!p || p.lang !== 'en') continue
        n++
        const s = speechText(p.text)
        expect(s, e.id).not.toMatch(/_|[()→…]|[öğşçÖĞŞÇ]/)
        expect(s.length, e.id).toBeGreaterThan(0)
      }
    expect(n).toBeGreaterThan(500)
  })
})
