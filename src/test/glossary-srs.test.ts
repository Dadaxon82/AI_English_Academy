/**
 * Matn (glossariy) so'zlari SRS'da yo'qolmasin — Reading'da saqlangan so'z
 * Lug'at bo'limida ko'rinishi va "Bugun takror" hisobiga kirishi kerak.
 *
 * ESKI KAMCHILIK: glossariy so'zlari `<matn>|gl-<so'z>` kaliti bilan SRS'ga
 * yozilardi, lekin Lug'at sahifasi ularni ro'yxatga olmaytirdi va `dueCount`
 * ularni sanamasdi — "Lug'atga" tugmasi amalda bepul ish qilardi (33 ta so'z
 * bir ora qayta ko'rikmasdi).
 */
import { describe, expect, it } from 'vitest'
import { a1, allGlossaryVocab, allVocab, findExercise, glossaryVocabId, vocabQuizExercise, wordKeyOf } from '../content'
import { checkAnswer } from '../lib/check'
import { reducer } from '../lib/reducer'
import { migrate } from '../lib/storage'
import { initialSrsState } from '../lib/srs'
import { emptyData, todayKey, type AppData } from '../lib/types'

describe('Matn glossariyi so‘zlari', () => {
  const gl = allGlossaryVocab()

  it('har bir matn glossariyi asosiy lug‘atga qo‘shib ko‘rib chiqilgan', () => {
    const glossWords = a1.reading.flatMap((p) => (p.glossary ?? []).map((g) => wordKeyOf(g.word)))
    const mainKeys = new Set(allVocab().map((v) => wordKeyOf(v.word)))
    const glKeys = new Set(gl.map((g) => wordKeyOf(g.word)))
    for (const k of glossWords) {
      // asosiy lug‘atda bo‘lsa — qayta qo‘shilmagan; bo‘lmasa — gl ro‘yxatida bo‘lishi SHART
      expect(mainKeys.has(k) || glKeys.has(k), `glossary word missing: ${k}`).toBe(true)
    }
  })

  it('bir xil so‘z ikki marta qaytarilmaydi va asosiy lug‘at takrorlanmaydi', () => {
    const keys = gl.map((g) => wordKeyOf(g.word))
    expect(new Set(keys).size).toBe(keys.length)
    const mainKeys = new Set(allVocab().map((v) => wordKeyOf(v.word)))
    for (const k of keys) expect(mainKeys.has(k), `duplicate of main vocab: ${k}`).toBe(false)
  })

  it('SRS kaliti Reading sahifasi ishlatadigan kalit bilan BIR XIL', () => {
    const p = a1.reading.find((x) => (x.glossary?.length ?? 0) > 0)
    expect(p).toBeDefined()
    const g = p!.glossary![0]!
    const item = gl.find((x) => wordKeyOf(x.word) === wordKeyOf(g.word))
    expect(item?.id).toBe(glossaryVocabId(g.word))
  })

  it('saqlangan glossariy so‘zi “Bugun takror” hisobiga kiritiladi', () => {
    const word = gl[0]!
    let s = emptyData('u1')
    s = reducer(s, { type: 'srs', vocabId: word.id, grade: 'good' }) // o‘rganish boshlandi
    const st = s.srs[word.id]
    expect(st).toBeDefined()
    expect(st!.learnedAt).not.toBeNull()
    // Kalit lug‘at ro‘yxatida topilishi kerak (Lug‘at sahifasi shu ro‘yxatdan ko‘rsatadi)
    expect(gl.some((g) => g.id === word.id)).toBe(true)
  })

  it('glossariy so‘zlarida tarjima va matn provenancesi mavjud', () => {
    for (const g of gl) {
      expect(g.translationUz.length, `no translation for ${g.word}`).toBeGreaterThan(0)
      expect(g.topic).toBe('matndan olingan')
      expect(g.level).toBe('A1')
    }
  })

  it('“Lug‘atimga saqlash” so‘zni jadvalga qo‘shadi, lekin xato yoki takror deb sanamaydi', () => {
    const word = allVocab()[0]!
    let s = emptyData('u1')
    s = reducer(s, { type: 'srs-add', vocabId: word.id })
    const st = s.srs[word.id]
    expect(st).toBeDefined()
    expect(st!.lapses).toBe(0)
    expect(st!.reps).toBe(0)
    expect(st!.dueAt).toBeLessThanOrEqual(Date.now()) // bugun takrorlanadi
    expect(s.activity[todayKey()]).toBeUndefined() // statistika o'zgarmaydi
    // Qayta saqlash mavjud holatni buzmaydi
    const graded = reducer(s, { type: 'srs', vocabId: word.id, grade: 'good' })
    expect(reducer(graded, { type: 'srs-add', vocabId: word.id }).srs[word.id]).toEqual(graded.srs[word.id])
  })

  it('lug‘at testidagi xato uchun Xatolar daftari to‘g‘ri javobni tiklay oladi', () => {
    const word = allVocab()[0]!
    const quiz = vocabQuizExercise(word, ['boshqa', word.translationUz, 'yana biri'])
    const restored = findExercise(quiz.id)
    expect(restored).toBeDefined()
    expect(restored!.instructionUz).toBe(quiz.instructionUz)
    // Xatolar daftari saqlangan javob matnini tekshirib, "to'g'ri javob"ni ko'rsatadi
    expect(checkAnswer(restored!, 'boshqa').expected).toBe(word.translationUz)
    // Glossariy so'zi uchun ham
    const gl = allGlossaryVocab()[0]!
    expect(findExercise(vocabQuizExercise(gl).id)).toBeDefined()
  })

  it('eski kesh kaliti (`<matn>|gl-…`) yangisiga migratsiya qilinadi', () => {
    const old = emptyData('u1')
    const base = { ...initialSrsState(), learnedAt: 10, dueAt: 100, reps: 1 }
    const raw: AppData = {
      ...old,
      srs: {
        'a1-read-2|gl-orchard': { ...base, dueAt: 100 },
        'a1-read-5|gl-orchard': { ...base, dueAt: 500 }, // keyingi baho — saqlanadi
        'a1-v2-01': base, // oddiy lug‘at kaliti o‘zgarmaydi
      },
    }
    const out = migrate(raw)
    expect(out.srs['gl-orchard']).toBeDefined()
    expect(out.srs['gl-orchard']!.dueAt).toBe(500)
    expect(out.srs['a1-read-2|gl-orchard']).toBeUndefined()
    expect(out.srs['a1-v2-01']).toBeDefined()
  })
})
