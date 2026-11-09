import { describe, expect, it, vi } from 'vitest'
import {
  SPEAKING_SCHEMA,
  WRITING_SCHEMA,
  dailyLimit,
  parseFeedbackRequest,
  parseSpeakingFeedback,
  parseWritingFeedback,
  userPrompt,
} from '../../supabase/functions/_shared/feedback'
import { requestSpeakingFeedback, requestWritingFeedback, speakingAnalysisFromAi, writingAnalysisFromAi, type AiDeps } from '../lib/ai'
import { reducer } from '../lib/reducer'
import { emptyData, type SpeakingAnalysis, type WritingSubmission } from '../lib/types'

const goodWriting = {
  criteria: { task_achievement: 4, coherence: 3, lexical_resource: 3, grammatical_range: 2, accuracy: 7 },
  errors: [{ excerpt: 'he go', kind: 'grammar', correction: 'he goes', whyUz: '3-shaxs birlikda -s qo‘shiladi.' }],
  strengthsUz: ['Topshiriq bajarilgan.'],
  weaknessesUz: ['Bog‘lovchilar kam.'],
  suggestionsUz: ['“because”, “but” ishlating.'],
}

function deps(res: { status: number; body: unknown } | Error, token: string | null = 'jwt-1'): AiDeps & { calls: unknown[][] } {
  const calls: unknown[][] = []
  return {
    calls,
    getToken: async () => token,
    functionsUrl: 'https://x.supabase.co/functions/v1',
    anonKey: 'anon',
    fetch: vi.fn(async (...a: unknown[]) => {
      calls.push(a)
      if (res instanceof Error) throw res
      return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch,
  }
}

const req = { level: 'A1', taskPrompt: 'Write about your family.', text: 'My brother he go to school.' }

describe('umumiy sxema (_shared/feedback)', () => {
  it('so‘rovni tekshiradi', () => {
    expect(parseFeedbackRequest({ kind: 'writing', ...req }).ok).toBe(true)
    expect(parseFeedbackRequest({ kind: 'essay', ...req }).ok).toBe(false)
    expect(parseFeedbackRequest({ kind: 'writing', ...req, level: 'Z9' }).ok).toBe(false)
    expect(parseFeedbackRequest({ kind: 'writing', ...req, text: '  ' }).ok).toBe(false)
    expect(parseFeedbackRequest({ kind: 'writing', ...req, text: 'a'.repeat(4001) }).ok).toBe(false)
  })

  it('model javobi: ballar 0..5 ga qisiladi, tur xato bo‘lsa null', () => {
    expect(parseWritingFeedback(goodWriting)?.criteria.accuracy).toBe(5)
    expect(parseWritingFeedback({ ...goodWriting, criteria: { ...goodWriting.criteria, coherence: 'yaxshi' } })).toBeNull()
    expect(parseWritingFeedback({ ...goodWriting, errors: 'yo‘q' })).toBeNull()
    expect(parseSpeakingFeedback({ lexis: 3, grammar: -2, notesUz: ['ok'] })).toEqual({ lexis: 3, grammar: 0, notesUz: ['ok'] })
    expect(parseSpeakingFeedback({ lexis: 3, notesUz: [] })).toBeNull()
  })

  it('sxemalar qat’iy (additionalProperties: false) va hamma maydon majburiy', () => {
    expect(WRITING_SCHEMA.additionalProperties).toBe(false)
    expect([...WRITING_SCHEMA.required].sort()).toEqual(Object.keys(WRITING_SCHEMA.properties).sort())
    expect([...SPEAKING_SCHEMA.required].sort()).toEqual(Object.keys(SPEAKING_SCHEMA.properties).sort())
  })

  it('ko‘rsatmada daraja, topshiriq va javob bor; limit standarti 20', () => {
    const p = userPrompt({ kind: 'writing', ...req })
    expect(p).toContain('A1')
    expect(p).toContain(req.taskPrompt)
    expect(p).toContain(req.text)
    expect(dailyLimit(undefined)).toBe(20)
    expect(dailyLimit('5')).toBe(5)
    expect(dailyLimit('-1')).toBe(20)
  })
})

describe('mijoz (src/lib/ai.ts) — fetch mock', () => {
  it('muvaffaqiyat: JWT bilan POST va tekshirilgan javob', async () => {
    const d = deps({ status: 200, body: { kind: 'writing', model: 'm', feedback: goodWriting } })
    const r = await requestWritingFeedback(req, d)
    expect(r.ok).toBe(true)
    const [url, init] = d.calls[0] as [string, RequestInit]
    expect(url).toBe('https://x.supabase.co/functions/v1/ai-feedback')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer jwt-1')
    expect(JSON.parse(init.body as string)).toMatchObject({ kind: 'writing', level: 'A1' })
  })

  it('limit tugagan (429) — serverning sababi qaytadi', async () => {
    const r = await requestWritingFeedback(req, deps({ status: 429, body: { reasonUz: 'Bugungi AI limiti (20 ta) tugadi' } }))
    expect(r).toEqual({ ok: false, reasonUz: 'Bugungi AI limiti (20 ta) tugadi' })
  })

  it('sxemaga mos bo‘lmagan javob — rad etiladi (soxta baho yo‘q)', async () => {
    const r = await requestWritingFeedback(req, deps({ status: 200, body: { feedback: { criteria: {} } } }))
    expect(r.ok).toBe(false)
  })

  it('tarmoq xatosi va sessiyasiz holat — fetch chaqirilmaydi yoki xato qaytadi', async () => {
    expect((await requestWritingFeedback(req, deps(new TypeError('Failed to fetch')))).ok).toBe(false)
    const noTok = deps({ status: 200, body: {} }, null)
    expect((await requestSpeakingFeedback(req, noTok)).ok).toBe(false)
    expect(noTok.calls).toHaveLength(0)
  })

  it('gapirish: AI lug‘at/grammatika, ravonlik qurilmadagi o‘lchovdan', () => {
    const measured: SpeakingAnalysis = { engine: 'rule-based', mode: 'audio', fluency: 4, lexis: 1, grammar: 1, length: 3, wordCount: 30, wpm: 95, notesUz: ['x'], disclaimerUz: 'd' }
    const a = speakingAnalysisFromAi({ lexis: 4, grammar: 3, notesUz: ['Yaxshi'] }, measured)
    expect(a).toMatchObject({ engine: 'ai', fluency: 4, wpm: 95, lexis: 4, grammar: 3, notesUz: ['Yaxshi'] })
  })
})

describe('reducer: writing-analysis', () => {
  it('faqat o‘sha yozuvning tahlili almashtiriladi', () => {
    const base = emptyData('u1')
    const sub: WritingSubmission = { id: 'wr-1', taskId: 't', text: 'x', wordCount: 1, secondsSpent: 1, analysis: null, supersedesId: null, createdAt: 1 }
    const s1 = reducer(base, { type: 'writing-add', sub })
    const ai = writingAnalysisFromAi(parseWritingFeedback(goodWriting)!, 1)
    const s2 = reducer(s1, { type: 'writing-analysis', id: 'wr-1', analysis: ai })
    expect(s2.writing[0]!.analysis?.engine).toBe('ai')
    expect(reducer(s2, { type: 'writing-analysis', id: 'yo‘q', analysis: ai })).toBe(s2)
  })
})
