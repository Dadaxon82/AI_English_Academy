/**
 * AI suhbatdosh — umumiy sxema (edge funksiya bilan bir xil), mijoz, stsenariy
 * va suhbat tuzatishlaridan yasalgan mashqlar.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  MAX_TURNS,
  ROLEPLAY_SCHEMA,
  parseRoleplayRequest,
  parseRoleplayTurn,
  roleplayPrompt,
} from '../../supabase/functions/_shared/roleplay'
import { ROLEPLAY_FIX_MAX_WORDS, ROLEPLAY_FIX_PREFIX, findExercise, getBundle, roleplayFixExercise, roleplayFixId } from '../content'
import { DIALOGUES, findDialogue } from '../content/dialogues'
import type { AiDeps } from '../lib/ai'
import { checkAnswer } from '../lib/check'
import { compareWithModel, historyForRequest, matchVocab, requestRoleplayTurn, scriptTurns } from '../lib/roleplay'

const goodTurn = {
  reply: 'Sure! Anything to eat?',
  corrections: [{ original: 'I want a tea', corrected: 'I would like a tea, please', whyUz: 'Muloyim sörov: I would like…' }],
  newWords: [{ word: 'sandwich', translationUz: 'sendviç' }],
  done: false,
}
const req = {
  level: 'A1',
  situation: 'Kafe',
  partnerRole: 'Waiter',
  learnerRole: 'You',
  history: [
    { speaker: 'partner', text: 'Hello! What would you like?' },
    { speaker: 'learner', text: 'I want a tea' },
  ],
}

function deps(res: { status: number; body: unknown }): AiDeps & { urls: string[] } {
  const urls: string[] = []
  return {
    urls,
    getToken: async () => 'jwt',
    functionsUrl: 'https://x.supabase.co/functions/v1',
    anonKey: 'anon',
    fetch: vi.fn(async (u: unknown) => {
      urls.push(String(u))
      return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch,
  }
}

describe('umumiy sxema (_shared/roleplay)', () => {
  it('sörov: daraja, rollar, tarix; oxirgi replika öquvçiniki bölişi şart', () => {
    expect(parseRoleplayRequest(req).ok).toBe(true)
    expect(parseRoleplayRequest({ ...req, level: 'Z1' }).ok).toBe(false)
    expect(parseRoleplayRequest({ ...req, partnerRole: ' ' }).ok).toBe(false)
    expect(parseRoleplayRequest({ ...req, history: [req.history[0]] }).ok).toBe(false)
    expect(parseRoleplayRequest({ ...req, history: [{ speaker: 'bot', text: 'x' }] }).ok).toBe(false)
    expect(parseRoleplayRequest({ ...req, history: Array.from({ length: MAX_TURNS + 1 }, () => req.history[1]) }).ok).toBe(false)
    expect(parseRoleplayRequest({ ...req, history: [{ speaker: 'learner', text: 'a'.repeat(401) }] }).ok).toBe(false)
  })

  it('körsatmada rollar va suhbat bor', () => {
    const parsed = parseRoleplayRequest(req)
    if (!parsed.ok) throw new Error(parsed.reasonUz)
    const p = roleplayPrompt(parsed.req)
    expect(p).toContain('You play: Waiter')
    expect(p).toContain('You: I want a tea')
    expect(p).toContain("Write Waiter's next line.")
  })

  it('javob qat’iy tekşiriladi; özgarmagan “tuzatiş” taşlanadi; köpi bilan 3 ta', () => {
    expect(parseRoleplayTurn(goodTurn)).toEqual(goodTurn)
    expect(parseRoleplayTurn({ ...goodTurn, done: 'no' })).toBeNull()
    expect(parseRoleplayTurn({ ...goodTurn, reply: '' })).toBeNull()
    expect(parseRoleplayTurn({ ...goodTurn, corrections: [{ original: 'x' }] })).toBeNull()
    const same = parseRoleplayTurn({ ...goodTurn, corrections: [{ original: 'ok', corrected: 'ok', whyUz: 'w' }] })
    expect(same?.corrections).toEqual([])
    const many = parseRoleplayTurn({ ...goodTurn, newWords: Array.from({ length: 6 }, (_, i) => ({ word: `w${i}`, translationUz: 't' })) })
    expect(many?.newWords).toHaveLength(3)
  })

  it('sxema qat’iy: hamma maydon majburiy, ortiqça maydon yöq', () => {
    expect(ROLEPLAY_SCHEMA.additionalProperties).toBe(false)
    expect([...ROLEPLAY_SCHEMA.required].sort()).toEqual(Object.keys(ROLEPLAY_SCHEMA.properties).sort())
  })
})

describe('mijoz: requestRoleplayTurn', () => {
  it('ai-roleplay funksiyasiga boradi va javobni tekşiradi', async () => {
    const d = deps({ status: 200, body: { model: 'm', turn: goodTurn } })
    const r = await requestRoleplayTurn(req as never, d)
    expect(d.urls[0]).toBe('https://x.supabase.co/functions/v1/ai-roleplay')
    expect(r).toEqual({ ok: true, feedback: goodTurn, model: 'm' })
  })
  it('server sababi özgarişsiz qaytadi; sxemaga mos bölmasa rad', async () => {
    expect(await requestRoleplayTurn(req as never, deps({ status: 429, body: { reasonUz: 'limit tugadi' } }))).toEqual({ ok: false, reasonUz: 'limit tugadi' })
    expect((await requestRoleplayTurn(req as never, deps({ status: 200, body: { turn: { reply: 1 } } }))).ok).toBe(false)
  })
})

describe('stsenariy (AI ulanmaganda)', () => {
  it('suhbat öquvçi navbatlariga bölinadi; namuna böşliq töldirilgan', () => {
    const d = findDialogue('a1-d5-cafe')!
    const { turns, closing } = scriptTurns(d)
    expect(turns).toHaveLength(3)
    expect(turns[0]!.partner).toEqual(['Hello! What would you like?'])
    expect(turns[0]!.modelEn).toBe('Can I have a cup of tea, please?')
    expect(closing).toEqual(['The tea and the soup are six dollars.'])
    // O'quvchi birinchi gapiradigan suhbat — ochilishda hamsuhbat replikasi yo'q.
    expect(scriptTurns(findDialogue('a1-d7-directions')!).turns[0]!.partner).toEqual([])
  })
  it('har suhbatda navbatlar soni = öquvçi replikalari', () => {
    for (const d of DIALOGUES) expect(scriptTurns(d).turns).toHaveLength(d.lines.filter((l) => l.speaker === 'b').length)
  })
  it('namuna bilan soliştiriş — baho emas, sözlar röyxati', () => {
    expect(compareWithModel('can i have tea please', 'Can I have a cup of tea, please?')).toEqual({
      matched: ['can', 'i', 'have', 'tea', 'please'],
      missing: ['a', 'cup', 'of'],
    })
    expect(compareWithModel('I’m from Uzbekistan', "I'm from Uzbekistan.").missing).toEqual([])
  })
  it('luğatda bor sözlargina olinadi; tarix serverga çeklangan holda', () => {
    const pool = getBundle('A1').vocab
    const known = pool[0]!
    expect(matchVocab([{ word: known.word.toUpperCase() }, { word: 'zzzunknown' }], pool).map((v) => v.id)).toEqual([known.id])
    const long = Array.from({ length: 30 }, (_, i) => ({ speaker: i % 2 ? 'learner' : 'partner', text: 'x'.repeat(500) }) as const)
    const h = historyForRequest(long)
    expect(h).toHaveLength(24)
    expect(h.every((l) => l.text.length === 400)).toBe(true)
  })
})

describe('suhbat tuzatişi → maşq (id’dan tiklanadi)', () => {
  const fix = { original: 'I want a tea', corrected: 'I would like a tea, please', whyUz: 'Muloyim sörov — I would like…' }
  it('id içida hammasi bor; findExercise tiklaydi; töğri tartib qabul qilinadi', () => {
    const id = roleplayFixId(fix, 'A1')!
    expect(id.startsWith(ROLEPLAY_FIX_PREFIX)).toBe(true)
    const ex = findExercise(id)!
    expect(ex).toEqual(roleplayFixExercise(id))
    expect(ex.kind).toBe('word-order')
    expect(ex.instructionUz).toContain('I want a tea')
    expect(ex.explanationUz).toContain('Muloyim sörov')
    expect(ex.kind === 'word-order' && checkAnswer(ex, ex.answer).correct).toBe(true)
    expect(ex.kind === 'word-order' && checkAnswer(ex, [...ex.answer].reverse()).correct).toBe(false)
  })
  it('juda uzun / bitta sözli tuzatiş maşqqa aylanmaydi; buzilgan id — undefined', () => {
    expect(roleplayFixId({ ...fix, corrected: Array.from({ length: ROLEPLAY_FIX_MAX_WORDS + 1 }, () => 'w').join(' ') }, 'A1')).toBeNull()
    expect(roleplayFixId({ ...fix, corrected: 'please' }, 'A1')).toBeNull()
    expect(findExercise(`${ROLEPLAY_FIX_PREFIX}!!!buzuq`)).toBeUndefined()
    expect(findExercise(`${ROLEPLAY_FIX_PREFIX}${btoa('{"o":1}')}`)).toBeUndefined()
  })
})
