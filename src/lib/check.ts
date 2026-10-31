/**
 * Javoblarni tekshirish — qoidaviy, ishonchli.
 *
 * Har bir mashq turi uchun bitta `checkAnswer` ishlaydi. Nativ HTML elementlari
 * ishlatilmaydi: funksiya toza qiymat oladi va natija qaytaradi, shuning uchun
 * test qilish oson.
 */

import type { Exercise } from '../content/types'

export interface CheckResult {
  correct: boolean
  /** Foydalanuvchi javobi (qayta ko'rsatish uchun normallashtirilgan) */
  given: string
  /** To'g'ri javob matni */
  expected: string
  /** Xato sababi — o'zbekcha tushuntirish */
  whyUz: string
  /** Qisman to'g'ri bo'lsa (gap-fill / matching) hissa 0..1 */
  partial: number
}

export function normalize(value: string): string {
  return value
    .toLocaleLowerCase('en')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // O'zbek lotin yozuvida ikki xil apostrof ishlatiladi: ʻ (U+02BB, rasmiy)
    // va o‘ (U+2018/2019 klaviatura variantlari). Ikkalasi ham bitta belgiga
    // keltiriladi — aks holda o'quvchining normal klaviatura holatidagi javobi
    // ("oʻn ikki") noto'g'ri deb baholanardi.
    .replace(/[’‘`ʼʻʹ´]/g, "'")
    .replace(/[^a-z0-9' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Bo'shliq/apostrofgabardosh taqqoslash (caseSensitive=false rejallar uchun).
 * Talab: "to'g'ri javob nuqta, vergul, qo'shimcha bo'shliq yoki apostrof
 * tufayli noto'g'ri deb belgilanmasin". Shuning uchun qo'shimcha ravishda
 * apostrofsiz ko'rinishi ham qabul qilinadi ("doesnt" ≈ "doesn't").
 */
export function looseEquals(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true
  return norm(a).replace(/'/g, '') === norm(b).replace(/'/g, '')
}

const norm = normalize

export function checkAnswer(exercise: Exercise, answer: unknown): CheckResult {
  switch (exercise.kind) {
    case 'multiple-choice':
      return checkChoice(exercise, answer)
    case 'true-false-notgiven':
      return checkTfng(exercise, answer)
    case 'matching':
      return checkMatching(exercise, answer)
    case 'gap-fill':
      return checkGapFill(exercise, answer)
    case 'word-order':
      return checkWordOrder(exercise, answer)
    case 'translation':
      return checkTranslation(exercise, answer)
  }
}

function toList(answer: unknown): string[] {
  if (Array.isArray(answer)) return answer.map((a) => String(a ?? ''))
  if (answer == null) return []
  return [String(answer)]
}

function checkChoice(exercise: Extract<Exercise, { kind: 'multiple-choice' }>, answer: unknown): CheckResult {
  // Javob BERILMAGAN bo'lsa (bo'sh setr / null) `Number('') === 0` 0-variantni
  // "tanlangan" deb yuborardi — Xatolar daftarida javobsiz savol "to'g'ri"
  // bo'lib ko'rinardi. Endi bunday holat aniq noto'g'ri hisoblanadi.
  const answered = typeof answer === 'number' ? Number.isFinite(answer) : answer !== null && answer !== undefined && String(answer).trim() !== ''
  const idx = answered ? (typeof answer === 'number' ? answer : Number(answer)) : -1
  const chosen = idx >= 0 ? exercise.options[idx] ?? '' : ''
  const correct = answered && idx === exercise.answerIndex
  return {
    correct,
    given: chosen,
    expected: exercise.options[exercise.answerIndex],
    whyUz: correct ? exercise.explanationUz : `Tanlovingiz noto‘g‘ri. ${exercise.explanationUz}`,
    partial: correct ? 1 : 0,
  }
}

const TFNG_LABEL: Record<'true' | 'false' | 'notgiven', string> = {
  true: 'True',
  false: 'False',
  notgiven: 'Not Given',
}

function checkTfng(exercise: Extract<Exercise, { kind: 'true-false-notgiven' }>, answer: unknown): CheckResult {
  const given = String(answer ?? '') as 'true' | 'false' | 'notgiven'
  const correct = given === exercise.answer
  let why = exercise.explanationUz
  if (!correct) {
    why = `To‘g‘ri javob — ${TFNG_LABEL[exercise.answer]}. ${exercise.explanationUz}`
    if (exercise.evidence) why += ` Matndagi asos: “${exercise.evidence}”.`
  } else if (exercise.evidence) {
    why += ` Matndagi asos: “${exercise.evidence}”.`
  }
  return { correct, given: TFNG_LABEL[given] ?? '', expected: TFNG_LABEL[exercise.answer], whyUz: why, partial: correct ? 1 : 0 }
}

function checkMatching(exercise: Extract<Exercise, { kind: 'matching' }>, answer: unknown): CheckResult {
  const map = (answer ?? {}) as Record<string, string>
  let ok = 0
  const wrongPairs: string[] = []
  for (const pair of exercise.pairs) {
    if (norm(map[pair.left] ?? '') === norm(pair.right)) ok += 1
    else wrongPairs.push(`“${pair.left}” → ${pair.right}`)
  }
  const total = exercise.pairs.length
  const partial = total === 0 ? 0 : ok / total
  return {
    correct: ok === total,
    given: exercise.pairs.map((p) => `${p.left} → ${map[p.left] ?? '—'}`).join('; '),
    expected: exercise.pairs.map((p) => `${p.left} → ${p.right}`).join('; '),
    whyUz:
      ok === total
        ? exercise.explanationUz
        : `${ok}/${total} juftlik to‘g‘ri. Xatolar: ${wrongPairs.slice(0, 4).join(', ')}. ${exercise.explanationUz}`,
    partial,
  }
}

function checkGapFill(exercise: Extract<Exercise, { kind: 'gap-fill' }>, answer: unknown): CheckResult {
  const given = toList(answer)
  const alternatives = exercise.acceptAlternatives ?? []
  let ok = 0
  const detail: string[] = []

  exercise.answers.forEach((expected, i) => {
    const user = given[i] ?? ''
    const acceptable = [expected, ...(alternatives[i] ?? [])]
    const hit = acceptable.some((a) => (exercise.caseSensitive ? a === user : looseEquals(a, user)))
    if (hit) ok += 1
    else detail.push(`${i + 1}-bo‘shliq: sizda “${user || 'bo‘sh'}”, to‘g‘ri: “${expected}”`)
  })

  const total = exercise.answers.length
  const partial = total === 0 ? 0 : ok / total
  return {
    correct: ok === total,
    given: given.join(' / '),
    expected: exercise.answers.join(' / '),
    whyUz: ok === total ? exercise.explanationUz : `${detail.join('; ')}. ${exercise.explanationUz}`,
    partial,
  }
}

function checkWordOrder(exercise: Extract<Exercise, { kind: 'word-order' }>, answer: unknown): CheckResult {
  // `answer` bazan BITTA setr bo'lib keladi (ErrorLog qayta baholash,
  // MockExam tiklash) — tokenlarga ajratamiz, aks holda "qaysi o'rinda xato"
  // tushuntirishi Butun gapni 1-tekt deb ko'rsatardi.
  const given = toList(answer).flatMap((a) => a.split(/\s+/)).filter((t) => t.length > 0)
  const correctSeq = given.join(' ')
  const expectedSeq = exercise.answer.join(' ')
  const correct = norm(correctSeq) === norm(expectedSeq)

  let why = exercise.explanationUz
  if (!correct) {
    // Qaysi so'z noto'g'ri joyda — buni ko'rsatamiz (tuzilish xatosini tushuntirish).
    const firstWrong = exercise.answer.findIndex((w, i) => norm(given[i] ?? '') !== norm(w))
    const pos = firstWrong + 1
    why =
      `Tartibda xato bor: ${pos}-o‘rinda “${exercise.answer[firstWrong] ?? '—'}” turishi kerak edi` +
      (given[firstWrong] ? `, sizda “${given[firstWrong]}”.` : '.') +
      ` ${exercise.noteUz ?? ''} ${exercise.explanationUz}`.trim()
  }

  return { correct, given: correctSeq, expected: expectedSeq, whyUz: why, partial: correct ? 1 : 0 }
}

function checkTranslation(exercise: Extract<Exercise, { kind: 'translation' }>, answer: unknown): CheckResult {
  const given = toList(answer)[0] ?? ''
  const correct = exercise.accepted.some((a) => looseEquals(a, given))
  return {
    correct,
    given,
    expected: exercise.accepted[0] ?? '',
    whyUz: correct
      ? exercise.explanationUz
      : `Qabul qilingan variantlar: ${exercise.accepted.map((a) => `“${a}”`).join(', ')}. ${exercise.explanationUz}`,
    partial: correct ? 1 : 0,
  }
}

/**
 * Natijaga moslashtirish: keyingi mashqni tanlash.
 * To'g'ri javoblar -> qiyinlik oshadi, xatolar -> shu mavzu qaytadi.
 */
export function nextExerciseIndex(currentIndex: number, results: readonly CheckResult[], poolSize: number): number {
  if (poolSize <= 1) return 0
  const recent = results.slice(-3)
  const avg = recent.length === 0 ? 0.5 : recent.reduce((a, r) => a + r.partial, 0) / recent.length
  const last = results[results.length - 1]

  if (last && !last.correct) {
    // Xato: o'sha qiyinlikda qolamiz, lekin bitta oldingi/keyingi bilan mustahkamlaymiz.
    return Math.max(0, Math.min(poolSize - 1, currentIndex - 1))
  }
  if (avg >= 0.8) return Math.min(poolSize - 1, currentIndex + 1)
  return Math.max(0, Math.min(poolSize - 1, currentIndex))
}
