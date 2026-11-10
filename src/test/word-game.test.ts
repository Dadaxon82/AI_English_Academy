import { describe, expect, it } from 'vitest'
import { allGlossaryVocab, findExercise, getBundle } from '../content'
import type { VocabularyItem } from '../content/types'
import { vocabEmoji } from '../content/vocabEmoji'
import { checkAnswer } from '../lib/check'
import { initialSrsState, review } from '../lib/srs'
import { WORDS_PER_GAME, buildWordGame, pickGameWords, seededRand } from '../lib/wordGame'

const pool = getBundle('A1').vocab

describe('Luğat öyini — sessiya tuzilişi', () => {
  it('yangi foydalanuvçi: 5 ta söz, har biri «YANGI SÖZ» bilan boşlanadi, oxirida juftlik', () => {
    const steps = buildWordGame(pool, {}, seededRand(1))
    const ids = new Set(steps.flatMap((s) => s.vocabIds))
    expect(ids.size).toBe(WORDS_PER_GAME)
    expect(steps.filter((s) => s.isNew).length).toBe(WORDS_PER_GAME)
    expect(steps.at(-1)!.exercise.kind).toBe('matching')
  })

  it('takrori yetgan sözlar birinçi tanlanadi', () => {
    const v = pool[10]!
    const past = Date.now() - 10 * 86_400_000
    const st = review(initialSrsState(past), 'good', past)
    const picked = pickGameWords(pool, { [v.id]: st }, seededRand(2), Date.now())
    expect(picked[0]!.id).toBe(v.id)
  })

  it('rasmli tanlovda 3 ta HAR XIL rasm, töğri javob variantlar içida', () => {
    for (let seed = 1; seed < 20; seed++) {
      for (const s of buildWordGame(pool, {}, seededRand(seed)).filter((x) => x.icons)) {
        expect(s.icons!.length).toBe(3)
        expect(new Set(s.icons).size).toBe(3)
        const ex = s.exercise
        if (ex.kind !== 'multiple-choice') throw new Error('kind')
        expect(ex.answerIndex).toBeGreaterThanOrEqual(0)
        expect(s.icons![ex.answerIndex]).toBe(vocabEmoji(ex.options[ex.answerIndex]!))
      }
    }
  })

  it('har topşiriq töğri javob bilan yeçiladi va id’dan tiklanadi (Xatolar daftari)', () => {
    for (let seed = 1; seed < 10; seed++) {
      for (const s of buildWordGame(pool, {}, seededRand(seed))) {
        const ex = s.exercise
        let answer: unknown
        if (ex.kind === 'multiple-choice') answer = ex.answerIndex
        else if (ex.kind === 'translation') answer = [ex.accepted[0]]
        else if (ex.kind === 'matching') answer = Object.fromEntries(ex.pairs.map((p) => [p.left, p.right]))
        expect(checkAnswer(ex, answer).correct, ex.id).toBe(true)
        expect(findExercise(ex.id), ex.id).toBeDefined()
      }
    }
  })

  it('misol gapi BÖŞ söz (glossariy) gap topşiriğiga tuşmaydi', () => {
    const bare: VocabularyItem[] = pool.map((v) => ({ ...v, exampleEn: '', exampleUz: '' }))
    for (let seed = 1; seed < 10; seed++) {
      const steps = buildWordGame([...bare, ...allGlossaryVocab()], {}, seededRand(seed))
      expect(steps.some((s) => s.exercise.kind === 'translation')).toBe(false)
    }
  })
})
