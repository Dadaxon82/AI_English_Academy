/** Mashq dvigatelining SOF yordamchilari (javob holati, yorliqlar, aralashtirish). */
import { getBundle } from '../../content'
import type { Exercise } from '../../content/types'

export function toggleIndex(prev: unknown, i: number): number[] {
  const arr = Array.isArray(prev) ? (prev as number[]) : []
  return arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i].sort((a, b) => a - b)
}
// --------------------------- yordamchi ---------------------------

export function initialAnswer(ex: Exercise): unknown {
  switch (ex.kind) {
    case 'multiple-choice':
      return -1
    case 'true-false-notgiven':
      return ''
    case 'gap-fill':
      return ex.answers.map(() => '')
    case 'matching':
      return {}
    case 'audio-matching':
      return {}
    case 'listening-select':
      return []
    case 'listening-fill':
      return ['']
    case 'listening-choice':
      return -1
    case 'word-order':
      return []
    case 'translation':
      return ['']
    case 'multi-select':
      return []
    case 'dropdown-cloze':
      return ex.answers.map(() => '')
    case 'sequence':
      return []
    case 'categorize':
      return {}
    case 'short-answer':
      return ['']
  }
}

export const TFNG: { v: 'true' | 'false' | 'notgiven'; label: string }[] = [
  { v: 'true', label: 'True — töğri' },
  { v: 'false', label: 'False — notöğri' },
  { v: 'notgiven', label: 'Not Given — matnda yöq' },
]

/** Raqamli variantlar soni (1–9 tugmalari uchun); variantsiz turda 0. */
export function choiceCount(ex: Exercise): number {
  if (ex.kind === 'multiple-choice') return Math.min(9, ex.options.length)
  if (ex.kind === 'true-false-notgiven') return TFNG.length
  if (ex.kind === 'multi-select') return Math.min(9, ex.options.length)
  return 0
}

export function choiceLabels(ex: Exercise): string[] {
  if (ex.kind === 'multiple-choice') return ex.options
  if (ex.kind === 'true-false-notgiven') return TFNG.map((o) => o.label)
  return []
}

/** i-variant tanlanganda javob qiymati (tekshiruvchi kutgan shaklda). */
export function choiceValue(ex: Exercise, i: number): unknown {
  if (ex.kind === 'true-false-notgiven') return TFNG[i]?.v ?? ''
  return i
}

/** Gap pufagidagi matn: savol, da'vo yoki tarjima manbasi. */
export function promptOf(ex: Exercise): { text: string; lang: 'en' | 'uz' } | null {
  switch (ex.kind) {
    case 'multiple-choice':
      return ex.question.trim() ? { text: ex.question, lang: guessLang(ex.question) } : null
    case 'true-false-notgiven':
      return ex.statement.trim() ? { text: ex.statement, lang: 'en' } : null
    case 'translation':
      return ex.source.trim() ? { text: ex.source, lang: ex.sourceLang } : null
    case 'multi-select':
    case 'short-answer':
      return ex.question.trim() ? { text: ex.question, lang: guessLang(ex.question) } : null
    default:
      return null
  }
}

/**
 * Savol tili — faqat talaffuz tugmasi uchun (inglizcha bo'lsa ko'rsatiladi).
 * Tipik o'zbekcha so'zlar bo'lsa — o'zbekcha ("teacher’s" kabi inglizcha
 * apostrof o'zbekcha belgisi hisoblanmaydi).
 */
export function guessLang(text: string): 'en' | 'uz' {
  const a = "[ʻ‘’']"
  const uz = new RegExp(
    `(^|\\s)(qaysi|nima|kim|qanday|neçta|qayerda|qaçon|nega|so${a}z|gap|to${a}g${a}ri|ma${a}no|bilan|uçun|emas|yo${a}q|bor|qiling|tanlang)(?=$|[\\s.,?!])`,
    'i',
  )
  return uz.test(text) ? 'uz' : 'en'
}

/**
 * Tarjima plitkalari: birinchi qabul qilinadigan javob so'zlari + shu
 * daraja lug'atidan 3 tagacha chalg'ituvchi so'z (deterministik aralash).
 * Javob so'zlari ichida bo'lgan so'z chalg'ituvchi bo'lmaydi.
 */
export function translationBank(ex: Extract<Exercise, { kind: 'translation' }>): string[] {
  const words = (ex.accepted[0] ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lower = new Set(words.map((w) => w.toLowerCase()))
  const pool = getBundle(ex.level)
    .vocab.map((v) => (ex.sourceLang === 'uz' ? v.word : v.translationUz))
    .filter((w) => /^[^\s]+$/.test(w) && !lower.has(w.toLowerCase()))
  const extra = shuffle(Array.from(new Set(pool)), ex.id).slice(0, 3)
  return shuffle([...words, ...extra], `${ex.id}:bank`)
}

export function isAnswerEmpty(ex: Exercise, a: unknown): boolean {
  switch (ex.kind) {
    case 'multiple-choice':
      return typeof a !== 'number' || a < 0
    case 'true-false-notgiven':
      return !a
    case 'gap-fill':
      return !Array.isArray(a) || a.every((x) => String(x).trim() === '')
    case 'matching':
      return !a || Object.keys(a as object).length < ex.pairs.length || Object.values(a as Record<string, string>).some((v) => !v)
    case 'audio-matching':
      return !a || Object.keys(a as object).length < ex.pairs.length || Object.values(a as Record<string, string>).some((v) => !v)
    case 'listening-select':
      return !Array.isArray(a) || a.length < ex.answer.length
    case 'listening-fill':
      return !Array.isArray(a) || String(a[0] ?? '').trim() === ''
    case 'listening-choice':
      return typeof a !== 'number' || a < 0
    case 'word-order':
      return !Array.isArray(a) || a.length < ex.answer.length
    case 'translation':
      return !Array.isArray(a) || String(a[0] ?? '').trim() === ''
    case 'multi-select':
      return !Array.isArray(a) || a.length === 0
    case 'dropdown-cloze':
      return !Array.isArray(a) || a.some((x) => String(x).trim() === '')
    case 'sequence':
      return !Array.isArray(a) || a.length < ex.items.length
    case 'categorize':
      return !a || typeof a !== 'object' || Object.keys(a as object).length < ex.sortItems.length
    case 'short-answer':
      return !Array.isArray(a) || String(a[0] ?? '').trim() === ''
  }
}

export function kindLabel(k: Exercise['kind']): string {
  return {
    'multiple-choice': 'Tanlov',
    'true-false-notgiven': 'True / False / Not Given',
    matching: 'Juftlik',
    'audio-matching': 'Tinglab juftlaştiriş',
    'listening-select': 'Tinglab sözni tanlaş',
    'listening-fill': 'Tinglab yozib töldiriş',
    'listening-choice': 'Tinglab variant tanlaş',
    'gap-fill': 'Böşliq',
    'word-order': 'Söz tartibi',
    translation: 'Tarjima',
    'multi-select': 'Bir neçta javob',
    'dropdown-cloze': 'Röyxatdan tanlaş',
    sequence: 'Ketma-ketlik',
    categorize: 'Saralaş',
    'short-answer': 'Qisqa javob',
  }[k]
}

export function count(arr: readonly string[], v: string): number {
  return arr.filter((x) => x === v).length
}

/** Deterministic shuffle — har mashqda bir xil tartib (testlar uchun). */
export function shuffle<T>(arr: T[], seed: string): T[] {
  const out = [...arr]
  let h = 2166136261
  for (const ch of seed) h = (h ^ ch.charCodeAt(0)) * 16777619
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    const j = h % (i + 1)
    const t = out[i]!
    out[i] = out[j]!
    out[j] = t
  }
  return out
}

/* Eski `useAdaptiveSequence` rekviziti o'chirildi: hech bir sahisha
   ishlatmasdi (Grammar o'zi nextExerciseIndex chaqiradi) va natija
   ro'yxatini har renderda qayta yasardi — chalkashlik manbai. */
