/**
 * AI SUHBATDOSH (rol o'yini) — UMUMIY mantiq: edge funksiya
 * (`supabase/functions/ai-roleplay`) ham, veb mijoz ham shu faylni ishlatadi.
 * Deno yoki brauzerga xos API YO'Q — vitest bilan tekshiriladi
 * (`src/test/roleplay.test.ts`).
 *
 *  - so'rov shakli va tekshiruvi (`parseRoleplayRequest`);
 *  - modelga ko'rsatma va JSON sxema (structured outputs);
 *  - model javobini QAT'IY tekshirish (`parseRoleplayTurn`): maydon
 *    yetishmasa yoki tur noto'g'ri bo'lsa `null` — mijoz oldindan yozilgan
 *    ssenariyga o'tadi, soxta javob yasalmaydi.
 */

export interface RoleplayLine {
  /** `partner` — model o'ynaydigan rol, `learner` — o'quvchi. */
  speaker: 'partner' | 'learner'
  text: string
}

export interface RoleplayRequest {
  level: string
  /** Vaziyat (o'zbekcha yoki inglizcha). */
  situation: string
  /** Rollar nomi (inglizcha): kim o'ynaydi, o'quvchi kim. */
  partnerRole: string
  learnerRole: string
  /** Shu paytgacha suhbat (eng ko'pi bilan `MAX_TURNS` qator). */
  history: RoleplayLine[]
}

export interface RoleplayCorrection {
  original: string
  corrected: string
  whyUz: string
}

export interface RoleplayTurn {
  /** Hamsuhbatning keyingi replikasi (inglizcha, 1–2 gap). */
  reply: string
  /** O'quvchining OXIRGI replikasidagi xatolar (ko'pi bilan 3 ta). */
  corrections: RoleplayCorrection[]
  /** Suhbatda ishlatilgan foydali so'zlar (ko'pi bilan 3 ta). */
  newWords: { word: string; translationUz: string }[]
  /** Suhbat tabiiy yakunlandimi. */
  done: boolean
}

export const MAX_TURNS = 24
export const MAX_LINE_CHARS = 400
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

export function parseRoleplayRequest(body: unknown): { ok: true; req: RoleplayRequest } | { ok: false; reasonUz: string } {
  if (!body || typeof body !== 'object') return { ok: false, reasonUz: 'So‘rov tanasi JSON obyekt bo‘lishi kerak.' }
  const b = body as Record<string, unknown>
  if (typeof b.level !== 'string' || !LEVELS.includes(b.level)) return { ok: false, reasonUz: 'level: A1–C1.' }
  for (const k of ['situation', 'partnerRole', 'learnerRole'] as const) {
    if (typeof b[k] !== 'string' || !(b[k] as string).trim()) return { ok: false, reasonUz: `${k} bo‘sh.` }
    if ((b[k] as string).length > 600) return { ok: false, reasonUz: `${k} juda uzun.` }
  }
  if (!Array.isArray(b.history)) return { ok: false, reasonUz: 'history ro‘yxat bo‘lishi kerak.' }
  if (b.history.length > MAX_TURNS) return { ok: false, reasonUz: `Suhbat juda uzun (${MAX_TURNS} replikagacha).` }
  const history: RoleplayLine[] = []
  for (const h of b.history) {
    const l = h as Record<string, unknown>
    if ((l.speaker !== 'partner' && l.speaker !== 'learner') || typeof l.text !== 'string' || !l.text.trim()) {
      return { ok: false, reasonUz: 'history qatori noto‘g‘ri.' }
    }
    if (l.text.length > MAX_LINE_CHARS) return { ok: false, reasonUz: `Replika juda uzun (${MAX_LINE_CHARS} belgigacha).` }
    history.push({ speaker: l.speaker, text: l.text.trim() })
  }
  if (history.length === 0 || history[history.length - 1]!.speaker !== 'learner') {
    return { ok: false, reasonUz: 'Oxirgi replika o‘quvchiniki bo‘lishi kerak.' }
  }
  return {
    ok: true,
    req: {
      level: b.level,
      situation: (b.situation as string).trim(),
      partnerRole: (b.partnerRole as string).trim(),
      learnerRole: (b.learnerRole as string).trim(),
      history,
    },
  }
}

/* ------------------------------ ko'rsatma ------------------------------ */

export const ROLEPLAY_SYSTEM_PROMPT = `You are a friendly English conversation partner for Uzbek learners.
Stay in the role you are given and keep the scene realistic.
Use vocabulary and grammar suitable for the learner's CEFR level; keep each reply to one or two short sentences and usually end with a question or prompt so the learner keeps talking.
In "corrections", list only real mistakes from the learner's LAST message (quote "original" exactly, give "corrected", explain briefly in Uzbek, Latin script); return an empty list if there are none. Do not correct punctuation or capitalisation of a speech transcript.
In "newWords", give up to three useful words or phrases from this exchange with an Uzbek translation.
Set "done" to true only when the scene has reached a natural end. Never mention that you are an AI.`

export function roleplayPrompt(req: RoleplayRequest): string {
  const transcript = req.history
    .map((l) => `${l.speaker === 'partner' ? req.partnerRole : req.learnerRole}: ${l.text}`)
    .join('\n')
  return `CEFR level: ${req.level}
Situation: ${req.situation}
You play: ${req.partnerRole}. The learner plays: ${req.learnerRole}.

Conversation so far:
"""
${transcript}
"""

Write ${req.partnerRole}'s next line.`
}

export const ROLEPLAY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'corrections', 'newWords', 'done'],
  properties: {
    reply: { type: 'string' },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['original', 'corrected', 'whyUz'],
        properties: { original: { type: 'string' }, corrected: { type: 'string' }, whyUz: { type: 'string' } },
      },
    },
    newWords: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['word', 'translationUz'],
        properties: { word: { type: 'string' }, translationUz: { type: 'string' } },
      },
    },
    done: { type: 'boolean' },
  },
} as const

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null)

/** Model javobini qat'iy tekshirish. Yaroqsiz bo'lsa — null (soxta javob yo'q). */
export function parseRoleplayTurn(v: unknown): RoleplayTurn | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const reply = str(o.reply, 600)
  if (!reply || !Array.isArray(o.corrections) || !Array.isArray(o.newWords) || typeof o.done !== 'boolean') return null
  const corrections: RoleplayCorrection[] = []
  for (const c of o.corrections.slice(0, 3)) {
    const r = c as Record<string, unknown>
    const original = str(r.original, 300)
    const corrected = str(r.corrected, 300)
    const whyUz = str(r.whyUz, 300)
    if (!original || !corrected || !whyUz) return null
    if (original !== corrected) corrections.push({ original, corrected, whyUz })
  }
  const newWords: RoleplayTurn['newWords'] = []
  for (const w of o.newWords.slice(0, 3)) {
    const r = w as Record<string, unknown>
    const word = str(r.word, 60)
    const translationUz = str(r.translationUz, 120)
    if (!word || !translationUz) return null
    newWords.push({ word, translationUz })
  }
  return { reply, corrections, newWords, done: o.done }
}
