/**
 * Writing / Speaking tahlili — QOIDAVIY (rule-based) dvigatel.
 *
 * Loyiha talabi: "AI Writing tahlili mavjud bo'lmasa, sodda qoidaviy
 * tekshiruv va foydali ko'rsatmalardan foydalaning. AI xizmatini ulangan
 * deb ko'rsatib, amalda mavjud bo'lmagan natija yasama."
 *
 * Shuning uchun bu yerda har bir baholashning OCHIG'ICH qoidasi bor va
 * natijada `engine: 'rule-based'` ko'rsatiladi.
 */

import type { WritingTask } from '../content/types'
import type { CoreCriterionKey, SpeakingAnalysis, WritingAnalysis } from './types'

const CRITERIA_UZ: Record<CoreCriterionKey, string> = {
  task_achievement: 'Topshiriq bajarilishi',
  coherence: 'Mantiqiy bog‘lanish',
  lexical_resource: 'Lug‘at boyligi',
  grammatical_range: 'Grammatik qamrov',
  accuracy: 'Aniqlik',
}

export function criterionLabelUz(k: CoreCriterionKey): string {
  return CRITERIA_UZ[k]
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length
}

function sentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** Yozma matnni qoida bilan tekshirish. */
export function analyzeWriting(text: string, task: WritingTask): WritingAnalysis {
  const words = countWords(text)
  const sents = sentences(text)
  const unique = new Set(text.toLowerCase().match(/[a-z']+/g) ?? [])
  const errors: WritingAnalysis['errors'] = []
  const strengthsUz: string[] = []
  const weaknessesUz: string[] = []

  // --- 1. Aniq, tez tekshiriladigan xatolar ---
  const rules: { re: RegExp; kind: string; fix: (m: RegExpExecArray) => string; why: string }[] = [
    { re: /\bi\b(?!')/g, kind: 'capitalization', fix: () => 'I', why: 'Ingliz tilida “I” har doim katta harf bilan yoziladi.' },
    { re: /\bdont\b/gi, kind: 'punctuation', fix: () => "don't", why: 'Apostrof tushib qolgan.' },
    { re: /\bcant\b/gi, kind: 'punctuation', fix: () => "can't", why: 'Apostrof tushib qolgan.' },
    { re: /\bim\b(?=\s)/gi, kind: 'contraction', fix: () => "I'm", why: 'Qisqartirma apostrof bilan yoziladi.' },
    { re: /\bive\b/gi, kind: 'contraction', fix: () => "I've", why: 'Apostrof kerak.' },
    { re: /\ba m\b/g, kind: 'spacing', fix: () => 'am', why: '“am” bir so‘z.' },
    { re: /\bisnt\b/gi, kind: 'punctuation', fix: () => "isn't", why: 'Apostrof tushib qolgan.' },
    { re: /\bgonna\b/gi, kind: 'register', fix: () => 'going to', why: 'Rasmiy yozuvda “gonna” ishlatilmaydi.' },
    { re: /\bthx\b/gi, kind: 'register', fix: () => 'thanks', why: 'Qisqartirma rasmiy uslubga mos emas.' },
    { re: /\bwich\b/gi, kind: 'spelling', fix: () => 'which', why: 'Imlo xatosi.' },
    { re: /\bbecouse\b/gi, kind: 'spelling', fix: () => 'because', why: 'Imlo xatosi.' },
    { re: /\bteh\b/gi, kind: 'spelling', fix: () => 'the', why: 'Imlo xatosi.' },
    { re: /\brecieve\b/gi, kind: 'spelling', fix: () => 'receive', why: 'Imlo xatosi.' },
    { re: /\b(alot)\b/gi, kind: 'spacing', fix: () => 'a lot', why: 'Ikki so‘z bilan yoziladi.' },
    {
      re: /\b(i|we|they|he|she|it)\s+(go|do|have|like|want|need)\b(?!s|n't)/gi,
      kind: 'agreement',
      fix: (m) => {
        const subj = m[1]
        const verb = m[2]
        const third = /^(he|she|it)$/i.test(subj)
        if (!third) return m[0]
        const map: Record<string, string> = { go: 'goes', do: 'does', have: 'has', like: 'likes', want: 'wants', need: 'needs' }
        return `${subj} ${map[verb] ?? verb}`
      },
      why: 'Uchinchi shaxs birlikda fe‘lga -s/-es qo‘shiladi.',
    },
  ]

  const seen = new Set<string>()
  for (const r of rules) {
    let m: RegExpExecArray | null
    r.re.lastIndex = 0
    while ((m = r.re.exec(text)) !== null) {
      const key = `${r.kind}:${m[0].toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      errors.push({
        excerpt: sliceAround(text, m.index, m[0].length),
        kind: r.kind,
        correction: r.fix(m),
        whyUz: r.why,
      })
      if (errors.length >= 12) break
    }
  }

  // --- 2. So'z xilma-xilligi (lexical variety) ---
  let lexical: number
  if (unique.size === 0) lexical = 0
  else {
    const ratio = unique.size / Math.max(1, words)
    lexical = clamp(Math.round(ratio * 10), 0, 5)
  }

  // --- 3. Bog'lanish (linkers) va nuqtali belgilar ---
  const linkers = (text.toLowerCase().match(/\b(and|but|because|so|then|after|before|when|also|first|next|finally|however)\b/g) ?? []).length
  const coherence = clamp(1 + Math.round(linkers / 2) + (sents.length >= 3 ? 1 : 0), 0, 5)

  // --- 4. Topshiriq bajarilishi: hajm + mustInclude ---
  let hit = 0
  for (const need of task.mustInclude ?? []) {
    const found = containsLoose(text, need.pattern)
    if (!found) {
      errors.push({ excerpt: '—', kind: 'content', correction: need.pattern, whyUz: `Topshiriqda bu ma‘no kutiladi: ${need.whyUz}` })
    } else hit++
  }
  const lenScore = words < task.minWords ? (words >= task.minWords * 0.7 ? 2 : 0) : words > task.maxWords ? 3 : 4
  const needCount = (task.mustInclude ?? []).length
  const taskAchievement = clamp(Math.round(lenScore * 0.5 + (needCount === 0 ? 2.5 : (hit / needCount) * 2.5)), 0, 5)

  // --- 5. Grammatik qamrov: zamon xilma-xilligi ---
  const tenses = [
    /\b(am|is|are)\b/i.test(text),
    /\b(was|were)\b/i.test(text),
    /\b[a-z]+ing\b/i.test(text),
    /\b(can|must|should|will|would|could)\b/i.test(text),
    /\b(ed|gone|been|done|had|went|saw)\b/i.test(text),
  ].filter(Boolean).length
  const grammarRange = clamp(1 + tenses, 0, 5)

  // --- 6. Aniqlik: xatolar zichligi ---
  const accuracy = clamp(5 - Math.round((errors.length / Math.max(1, sents.length)) * 2), 0, 5)

  const criteriaScores: Record<CoreCriterionKey, number> = {
    task_achievement: taskAchievement,
    coherence,
    lexical_resource: lexical,
    grammatical_range: grammarRange,
    accuracy,
  }

  if (words >= task.minWords) strengthsUz.push(`Hajm talabi bajarildi: ${words} so‘z.`)
  if (linkers >= 3) strengthsUz.push('Gaplar bog‘lovchilar bilan mantliq bog‘langan.')
  if (unique.size >= words * 0.55 && words > 20) strengthsUz.push('So‘z boyligi yaxshi — takrorlar kam.')
  if (errors.length === 0) strengthsUz.push('Tekshirilgan asosiy xatolar topilmadi.')

  if (words < task.minWords) weaknessesUz.push(`Matn qisqa: ${words} so‘z, kamida ${task.minWords} kerak.`)
  if (linkers < 2) weaknessesUz.push('Bog‘lovchilar kam: and, but, because, then, so qo‘shing.')
  if (sents.length < 3) weaknessesUz.push('Gaplar soni kam — fikrlarni alohida gaplarga bo‘ling.')
  if (errors.length > 0) weaknessesUz.push(`${errors.length} ta tuzatiladigan xato bor (pastda ko‘rsatilgan).`)

  const suggestionsUz = buildSuggestions(criteriaScores, task)

  return {
    engine: 'rule-based',
    criteriaScores,
    errors,
    strengthsUz,
    weaknessesUz,
    suggestionsUz,
    wordCount: words,
  }
}

function buildSuggestions(scores: Record<CoreCriterionKey, number>, task: WritingTask): string[] {
  const out: string[] = []
  if (scores.task_achievement < 3) out.push(`Topshiriqdagi har bir bandni alohida gap bilan javoblang (hajm: ${task.minWords}–${task.maxWords} so‘z).`)
  if (scores.coherence < 3) out.push('Fikrlarni first / next / then / finally bilan tartiblang.')
  if (scores.lexical_resource < 3) out.push('Bir so‘zni takrorlamang — sinonim izlang (vocabulary bo‘limidan foydalaning).')
  if (scores.grammatical_range < 3) out.push(`${task.genre === 'email' ? 'Hozirgi va o‘tmish zamonlarini birga' : 'Ikki xil zamonnı'} ishlatishga harakat qiling.`)
  if (scores.accuracy < 3) out.push('Yozganingizdan so‘ng har bir fe‘lga e’tibor bering: kim ishlayapti — -s kerakmi?')
  out.push('Qayta yozib, eski va yangi versiyani solishtiring — o‘sish shu taqqoslashda ko‘rinadi.')
  return out.slice(0, 5)
}

function containsLoose(text: string, pattern: string): boolean {
  const t = text.toLowerCase()
  const p = pattern.toLowerCase()
  if (t.includes(p)) return true
  // so'zlarni tartibdagi oraliq bilan ham qidirish (a ... b)
  const parts = p.split(/\s+/)
  if (parts.length <= 1) return false
  const re = new RegExp(`^${parts.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\S]{0,40}?')}$`.replace(/^\^/, ''), 'i')
  return re.test(t)
}

function sliceAround(text: string, idx: number, len: number): string {
  const from = Math.max(0, idx - 24)
  const to = Math.min(text.length, idx + len + 24)
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/**
 *Speaking tahlili (transkript + davomiylik asosida).
 * Baho rasmiy imtihon natijasi EMMAS — disclaimer bilan qaytadi.
 */
export function analyzeSpeaking(transcript: string, durationSec: number, task: { minSeconds: number; targetSeconds: number }): SpeakingAnalysis {
  const words = countWords(transcript)
  const sents = sentences(transcript)
  const wpm = durationSec > 0 ? Math.round((words / durationSec) * 60) : 0

  const lengthScore = clamp(
    durationSec < task.minSeconds ? (durationSec >= task.minSeconds * 0.6 ? 1 : 0) : durationSec >= task.targetSeconds ? 5 : 3,
    0,
    5,
  )

  const unique = new Set(transcript.toLowerCase().match(/[a-z']+/g) ?? [])
  const lexis = clamp(unique.size <= 5 ? 1 : Math.round((unique.size / Math.max(1, words)) * 8), 0, 5)

  const structures = [
    /\b(i|we)\s+(am|'m)\s+/i.test(transcript),
    /\b(go|goes|went|going)\b/i.test(transcript),
    /\b(can|cannot|can't)\b/i.test(transcript),
    /\b(because|so|but|and then)\b/i.test(transcript),
    /\b(yesterday|last week|tomorrow|usually|every day)\b/i.test(transcript),
  ].filter(Boolean).length
  const grammar = clamp(1 + structures, 0, 5)

  // Ravonlik: so'z tezligi A1 uchun 60-140 wpm normal oralig'i.
  const fluency = wpm === 0 ? 0 : wpm < 50 ? 2 : wpm > 190 ? 3 : 5

  const notesUz: string[] = []
  if (durationSec < task.minSeconds) notesUz.push(`Javob qisqa: ${durationSec}s. Kamida ${task.minSeconds} sekund gapirishga harakat qiling.`)
  if (wpm > 0 && wpm < 60) notesUz.push('Gapirish sekin — gaplar orasidagi pauzalarni kamaytiring, kunni shu mavzuda 1 daqiqa mashq qilib ko‘ring.')
  if (unique.size <= 8 && words > 0) notesUz.push('Kam so‘z ishlatsiz — kunlik lug‘atdan 3–4 ta yangi so‘zni shu javobga qo‘shib ko‘ring.')
  if (sents.length < 3) notesUz.push('Fikrlarni alohida gaplarga bo‘ling: kim, nima, qachon, nega.')
  if (notesUz.length === 0) notesUz.push('Yaxshi javob: davomiylik va tuzilish A1 me’yoriga mos.')

  return {
    engine: 'rule-based',
    fluency,
    lexis,
    grammar,
    length: lengthScore,
    wordCount: words,
    wpm,
    notesUz,
    disclaimerUz:
      'Bu baho mashq maqsadida berildi — rasmiy imtihon natijasi emas. Transkript avtomatik va aniq bo‘lmasligi mumkin.',
  }
}
