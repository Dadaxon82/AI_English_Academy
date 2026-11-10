/**
 * AI fikr-mulohazasi — UMUMIY mantiq (edge funksiya ham, veb mijoz ham
 * shu faylni ishlatadi). Deno yoki brauzerga xos API YO'Q — vitest bilan
 * tekshiriladi (`src/test/ai-feedback.test.ts`).
 *
 *  - so'rov shakli va tekshiruvi (`parseFeedbackRequest`);
 *  - modelga beriladigan ko'rsatma va JSON sxema (structured outputs);
 *  - model javobini QAT'IY tekshirish (`parseWritingFeedback`,
 *    `parseSpeakingFeedback`): maydon yetishmasa yoki tur noto'g'ri bo'lsa
 *    `null` — mijoz qoidaviy dvigatelga qaytadi, soxta baho yasalmaydi.
 */

export type FeedbackKind = 'writing' | 'speaking'

export interface FeedbackRequest {
  kind: FeedbackKind
  /** CEFR daraja (A1..C1) — baholash shu darajaga nisbatan. */
  level: string
  /** Topshiriq matni (inglizcha). */
  taskPrompt: string
  /** O'quvchi javobi (yozma matn yoki nutq transkripti). */
  text: string
}

export const MAX_TEXT_CHARS = 4000
export const MAX_PROMPT_CHARS = 1000
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

/** Kiruvchi so'rovni tekshiradi; xato bo'lsa o'zbekcha sabab qaytaradi. */
export function parseFeedbackRequest(body: unknown): { ok: true; req: FeedbackRequest } | { ok: false; reasonUz: string } {
  if (!body || typeof body !== 'object') return { ok: false, reasonUz: 'Sörov tanasi JSON obyekt bölişi kerak.' }
  const b = body as Record<string, unknown>
  if (b.kind !== 'writing' && b.kind !== 'speaking') return { ok: false, reasonUz: 'kind: "writing" yoki "speaking".' }
  if (typeof b.level !== 'string' || !LEVELS.includes(b.level)) return { ok: false, reasonUz: 'level: A1–C1.' }
  if (typeof b.taskPrompt !== 'string' || !b.taskPrompt.trim()) return { ok: false, reasonUz: 'taskPrompt böş.' }
  if (typeof b.text !== 'string' || !b.text.trim()) return { ok: false, reasonUz: 'Javob matni böş.' }
  if (b.text.length > MAX_TEXT_CHARS) return { ok: false, reasonUz: `Matn juda uzun (${MAX_TEXT_CHARS} belgigaça).` }
  if (b.taskPrompt.length > MAX_PROMPT_CHARS) return { ok: false, reasonUz: 'Topşiriq matni juda uzun.' }
  return { ok: true, req: { kind: b.kind, level: b.level, taskPrompt: b.taskPrompt.trim(), text: b.text.trim() } }
}

/* ------------------------------ ko'rsatma ------------------------------ */

export const SYSTEM_PROMPT = `You are an experienced CEFR examiner for Uzbek learners of English.
Assess the learner's answer strictly against the stated CEFR level and task.
Scores are integers from 0 to 5 (5 = fully meets the level's descriptor).
Quote errors exactly as they appear in the learner's text ("excerpt") and give a corrected version.
Write every explanation, strength, weakness, suggestion and note in Uzbek (Latin script), short and concrete. Write Uzbek in the NEW Latin alphabet: use ö, ğ, ş, ç instead of o‘, g‘, sh, ch (for example "töğri", "şu", "çiroyli", "öqituvçi"); keep the apostrophe ’ only for the glottal stop (ma’lumot).
Do not invent errors: if the text has none of a kind, return fewer items. Never mention that you are an AI.`

export function userPrompt(req: FeedbackRequest): string {
  const what = req.kind === 'writing' ? 'written answer' : 'spoken answer (speech-recognition transcript; ignore punctuation and capitalisation)'
  return `CEFR level: ${req.level}
Task: ${req.taskPrompt}

Learner's ${what}:
"""
${req.text}
"""`
}

const strArr = { type: 'array', items: { type: 'string' } } as const

/** Structured outputs sxemasi — yozma ish (`WritingAnalysis` bilan bir xil mezonlar). */
export const WRITING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['criteria', 'errors', 'strengthsUz', 'weaknessesUz', 'suggestionsUz'],
  properties: {
    criteria: {
      type: 'object',
      additionalProperties: false,
      required: ['task_achievement', 'coherence', 'lexical_resource', 'grammatical_range', 'accuracy'],
      properties: {
        task_achievement: { type: 'integer' },
        coherence: { type: 'integer' },
        lexical_resource: { type: 'integer' },
        grammatical_range: { type: 'integer' },
        accuracy: { type: 'integer' },
      },
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['excerpt', 'kind', 'correction', 'whyUz'],
        properties: {
          excerpt: { type: 'string' },
          kind: { type: 'string', enum: ['grammar', 'spelling', 'vocabulary', 'punctuation', 'coherence'] },
          correction: { type: 'string' },
          whyUz: { type: 'string' },
        },
      },
    },
    strengthsUz: strArr,
    weaknessesUz: strArr,
    suggestionsUz: strArr,
  },
} as const

/** Gapirish: AI faqat transkriptni ko'radi — ravonlik/tezlik qurilmada o'lchanadi. */
export const SPEAKING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lexis', 'grammar', 'notesUz'],
  properties: {
    lexis: { type: 'integer' },
    grammar: { type: 'integer' },
    notesUz: strArr,
  },
} as const

/* ---------------------------- javob tekshiruvi ---------------------------- */

export const CRITERIA = ['task_achievement', 'coherence', 'lexical_resource', 'grammatical_range', 'accuracy'] as const
export type CriterionKey = (typeof CRITERIA)[number]

export interface WritingFeedback {
  criteria: Record<CriterionKey, number>
  errors: { excerpt: string; kind: string; correction: string; whyUz: string }[]
  strengthsUz: string[]
  weaknessesUz: string[]
  suggestionsUz: string[]
}

export interface SpeakingFeedback {
  lexis: number
  grammar: number
  notesUz: string[]
}

function score(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return Math.max(0, Math.min(5, Math.round(v)))
}

function strings(v: unknown, max: number): string[] | null {
  if (!Array.isArray(v)) return null
  if (!v.every((x) => typeof x === 'string')) return null
  return (v as string[]).map((s) => s.trim()).filter(Boolean).slice(0, max)
}

export function parseWritingFeedback(v: unknown): WritingFeedback | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const c = o.criteria as Record<string, unknown> | undefined
  if (!c || typeof c !== 'object') return null
  const criteria = {} as Record<CriterionKey, number>
  for (const k of CRITERIA) {
    const s = score(c[k])
    if (s === null) return null
    criteria[k] = s
  }
  if (!Array.isArray(o.errors)) return null
  const errors: WritingFeedback['errors'] = []
  for (const e of o.errors.slice(0, 12)) {
    if (!e || typeof e !== 'object') return null
    const r = e as Record<string, unknown>
    if (typeof r.excerpt !== 'string' || typeof r.kind !== 'string' || typeof r.correction !== 'string' || typeof r.whyUz !== 'string') return null
    errors.push({ excerpt: r.excerpt, kind: r.kind, correction: r.correction, whyUz: r.whyUz })
  }
  const strengthsUz = strings(o.strengthsUz, 5)
  const weaknessesUz = strings(o.weaknessesUz, 5)
  const suggestionsUz = strings(o.suggestionsUz, 5)
  if (!strengthsUz || !weaknessesUz || !suggestionsUz) return null
  return { criteria, errors, strengthsUz, weaknessesUz, suggestionsUz }
}

export function parseSpeakingFeedback(v: unknown): SpeakingFeedback | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const lexis = score(o.lexis)
  const grammar = score(o.grammar)
  const notesUz = strings(o.notesUz, 6)
  if (lexis === null || grammar === null || !notesUz) return null
  return { lexis, grammar, notesUz }
}

/** Kunlik limit (standart 20) — server o'zgaruvchisidan, noto'g'ri bo'lsa standart. */
export function dailyLimit(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 && n <= 1000 ? n : 20
}
