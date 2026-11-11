/**
 * Javoblarni tekshirish — qoidaviy, ishonchli.
 *
 * Har bir mashq turi uchun bitta `checkAnswer` ishlaydi. Nativ HTML elementlari
 * ishlatilmaydi: funksiya toza qiymat oladi va natija qaytaradi, shuning uchun
 * test qilish oson.
 */

import type { Exercise } from '../content/types'
import { foldUzLatin } from './uzAlphabet'

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
  // Yangi alifbo harflari (ö, ğ, ş, ç) eski shaklga keltiriladi — aks holda
  // NFD ularni diakritiksiz «o, g, s, c» ga aylantirib, «o'qish» ≠ «öqiş» bo'lardi.
  return foldUzLatin(value)
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
    case 'audio-matching':
      return checkAudioMatching(exercise, answer)
    case 'listening-select':
      return checkListeningSelect(exercise, answer)
    case 'listening-fill':
      return checkListeningFill(exercise, answer)
    case 'listening-choice':
      return checkListeningChoice(exercise, answer)
    case 'gap-fill':
      return checkGapFill(exercise, answer)
    case 'word-order':
      return checkWordOrder(exercise, answer)
    case 'multi-select':
      return checkMultiSelect(exercise, answer)
    case 'dropdown-cloze':
      return checkDropdown(exercise, answer)
    case 'sequence':
      return checkSequence(exercise, answer)
    case 'categorize':
      return checkCategorize(exercise, answer)
    case 'short-answer':
      return checkShortAnswer(exercise, answer)
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
    whyUz: correct ? exercise.explanationUz : `Tanlovingiz notöğri. ${exercise.explanationUz}`,
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
    why = `Töğri javob — ${TFNG_LABEL[exercise.answer]}. ${exercise.explanationUz}`
    if (exercise.evidence) why += ` Matndagi asos: “${exercise.evidence}”.`
  } else if (exercise.evidence) {
    why += ` Matndagi asos: “${exercise.evidence}”.`
  }
  return { correct, given: TFNG_LABEL[given] ?? '', expected: TFNG_LABEL[exercise.answer], whyUz: why, partial: correct ? 1 : 0 }
}

/** Bir nechta javob: to'plam aniq teng bo'lsa to'g'ri; ortiqcha tanlov ballni kamaytiradi. */
function checkMultiSelect(exercise: Extract<Exercise, { kind: 'multi-select' }>, answer: unknown): CheckResult {
  const raw = Array.isArray(answer) ? answer : []
  const chosen = [...new Set(raw.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n >= 0 && n < exercise.options.length))].sort(
    (a, b) => a - b,
  )
  const right = [...new Set(exercise.answerIndexes)].sort((a, b) => a - b)
  const hits = chosen.filter((i) => right.includes(i)).length
  const extra = chosen.length - hits
  const correct = hits === right.length && extra === 0
  const partial = right.length === 0 ? 0 : Math.max(0, (hits - extra) / right.length)
  const missed = right.filter((i) => !chosen.includes(i)).map((i) => `“${exercise.options[i]}”`)
  const wrong = chosen.filter((i) => !right.includes(i)).map((i) => `“${exercise.options[i]}”`)
  let why = exercise.explanationUz
  if (!correct) {
    const bits: string[] = []
    if (missed.length) bits.push(`belgilanmagan töğri javob: ${missed.join(', ')}`)
    if (wrong.length) bits.push(`ortiqça belgilangan: ${wrong.join(', ')}`)
    why = `${bits.join('; ')}. ${exercise.explanationUz}`
  }
  return {
    correct,
    given: chosen.map((i) => exercise.options[i]).join(', '),
    expected: right.map((i) => exercise.options[i]).join(', '),
    whyUz: why,
    partial: correct ? 1 : partial,
  }
}

/** Ochiluvchi ro'yxat: har bo'shliq alohida baholanadi. */
function checkDropdown(exercise: Extract<Exercise, { kind: 'dropdown-cloze' }>, answer: unknown): CheckResult {
  const given = toList(answer)
  let ok = 0
  const detail: string[] = []
  exercise.answers.forEach((expected, i) => {
    const user = given[i] ?? ''
    if (norm(user) === norm(expected)) ok += 1
    else detail.push(`${i + 1}-böşliq: “${user || '—'}” emas, “${expected}”`)
  })
  const total = exercise.answers.length
  return {
    correct: ok === total && total > 0,
    given: given.join(' / '),
    expected: exercise.answers.join(' / '),
    whyUz: ok === total ? exercise.explanationUz : `${detail.join('; ')}. ${exercise.explanationUz}`,
    partial: total === 0 ? 0 : ok / total,
  }
}

/** Ketma-ketlik: to'liq tartib mos bo'lsa to'g'ri; qisman — to'g'ri o'rindagilar ulushi. */
function checkSequence(exercise: Extract<Exercise, { kind: 'sequence' }>, answer: unknown): CheckResult {
  const given = toList(answer)
  const n = exercise.items.length
  let ok = 0
  exercise.items.forEach((it, i) => {
    if (norm(given[i] ?? '') === norm(it)) ok += 1
  })
  const correct = ok === n && given.length === n
  let why = exercise.explanationUz
  if (!correct) {
    const first = exercise.items.findIndex((it, i) => norm(given[i] ?? '') !== norm(it))
    why = `${ok}/${n} ta element öz joyida. ${first + 1}-örinda “${exercise.items[first] ?? '—'}” turişi kerak edi. ${exercise.explanationUz}`
  }
  return {
    correct,
    given: given.map((g, i) => `${i + 1}) ${g}`).join(' '),
    expected: exercise.items.map((g, i) => `${i + 1}) ${g}`).join(' '),
    whyUz: why,
    partial: n === 0 ? 0 : ok / n,
  }
}

/** Saralash: javob — element matni → guruh indeksi. */
function checkCategorize(exercise: Extract<Exercise, { kind: 'categorize' }>, answer: unknown): CheckResult {
  const map = (answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {}) as Record<string, unknown>
  let ok = 0
  const wrong: string[] = []
  for (const it of exercise.sortItems) {
    if (Number(map[it.text]) === it.category) ok += 1
    else wrong.push(`“${it.text}” → ${exercise.categories[it.category] ?? '—'}`)
  }
  const total = exercise.sortItems.length
  const group = (pick: (i: number) => boolean) =>
    exercise.categories
      .map((c, ci) => `${c}: ${exercise.sortItems.filter((it) => pick(ci) && it.category === ci).map((it) => it.text).join(', ')}`)
      .join(' | ')
  return {
    correct: ok === total && total > 0,
    given: exercise.categories
      .map((c, ci) => `${c}: ${exercise.sortItems.filter((it) => Number(map[it.text]) === ci).map((it) => it.text).join(', ')}`)
      .join(' | '),
    expected: group(() => true),
    whyUz: ok === total ? exercise.explanationUz : `${ok}/${total} töğri. Töğrisi: ${wrong.slice(0, 4).join('; ')}. ${exercise.explanationUz}`,
    partial: total === 0 ? 0 : ok / total,
  }
}

/** Qisqa javob: qabul qilinadigan variantlardan biriga bardoshli tenglik. */
function checkShortAnswer(exercise: Extract<Exercise, { kind: 'short-answer' }>, answer: unknown): CheckResult {
  const given = toList(answer)[0] ?? ''
  const correct = given.trim() !== '' && exercise.accepted.some((a) => looseEquals(a, given))
  return {
    correct,
    given,
    expected: exercise.accepted[0] ?? '',
    whyUz: correct
      ? exercise.explanationUz
      : `Kutilgan javob: ${exercise.accepted.map((a) => `“${a}”`).join(' yoki ')}. ${exercise.explanationUz}`,
    partial: correct ? 1 : 0,
  }
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
        : `${ok}/${total} juftlik töğri. Xatolar: ${wrongPairs.slice(0, 4).join(', ')}. ${exercise.explanationUz}`,
    partial,
  }
}

function checkAudioMatching(exercise: Extract<Exercise, { kind: 'audio-matching' }>, answer: unknown): CheckResult {
  const map = (answer ?? {}) as Record<string, string>
  let ok = 0
  const wrongPairs: string[] = []
  for (const pair of exercise.pairs) {
    if (norm(map[pair.left.word] ?? '') === norm(pair.right)) ok += 1
    else wrongPairs.push(`“${pair.left.word}” → ${pair.right}`)
  }
  const total = exercise.pairs.length
  const partial = total === 0 ? 0 : ok / total
  return {
    correct: ok === total,
    given: exercise.pairs.map((p) => `${p.left.word} → ${map[p.left.word] ?? '—'}`).join('; '),
    expected: exercise.pairs.map((p) => `${p.left.word} → ${p.right}`).join('; '),
    whyUz:
      ok === total
        ? exercise.explanationUz
        : `${ok}/${total} juftlik töğri. Xatolar: ${wrongPairs.slice(0, 4).join(', ')}. ${exercise.explanationUz}`,
    partial,
  }
}

/** «Что вы услышали?» — plitkalardan tartib bilan yig'ilgan matn so'z-so'z solishtiriladi. */
function checkListeningSelect(exercise: Extract<Exercise, { kind: 'listening-select' }>, answer: unknown): CheckResult {
  const given = toList(answer)
  const correct = given.length === exercise.answer.length && given.every((w, i) => norm(w) === norm(exercise.answer[i] ?? ''))
  const ok = exercise.answer.filter((w, i) => norm(given[i] ?? '') === norm(w)).length
  const total = exercise.answer.length
  return {
    correct,
    given: given.join(' '),
    expected: exercise.answer.join(' '),
    whyUz: correct ? exercise.explanationUz : `Eşitilgan matn: “${exercise.answer.join(' ')}”. ${exercise.explanationUz}`,
    partial: total === 0 ? 0 : ok / total,
  }
}

/** «Введите пропущенное слово» — audio orqali eşitilgan gapdagi bo'shliqqa klaviaturadan yozilgan javob. */
function checkListeningFill(exercise: Extract<Exercise, { kind: 'listening-fill' }>, answer: unknown): CheckResult {
  const given = toList(answer)[0] ?? ''
  const acceptable = [exercise.answer, ...(exercise.acceptAlternatives ?? [])]
  const correct = given.trim() !== '' && acceptable.some((a) => looseEquals(a, given))
  return {
    correct,
    given,
    expected: exercise.answer,
    whyUz: correct ? exercise.explanationUz : `Töğri söz: “${exercise.answer}”. ${exercise.explanationUz}`,
    partial: correct ? 1 : 0,
  }
}

/** «Послушайте и заполните пропуск» — 2 audio variantdan töğrisini tanlash (multiple-choice bilan bir xil shartnoma). */
function checkListeningChoice(exercise: Extract<Exercise, { kind: 'listening-choice' }>, answer: unknown): CheckResult {
  const answered = typeof answer === 'number' ? Number.isFinite(answer) : answer !== null && answer !== undefined && String(answer).trim() !== ''
  const idx = answered ? (typeof answer === 'number' ? answer : Number(answer)) : -1
  const chosen = idx >= 0 ? exercise.options[idx] ?? '' : ''
  const correct = answered && idx === exercise.answerIndex
  return {
    correct,
    given: chosen,
    expected: exercise.options[exercise.answerIndex] ?? '',
    whyUz: correct ? exercise.explanationUz : `Töğri variant eşitilgan gapqa mos keladi: “${exercise.options[exercise.answerIndex]}”. ${exercise.explanationUz}`,
    partial: correct ? 1 : 0,
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
    else detail.push(`${i + 1}-böşliq: sizda “${user || 'böş'}”, töğri: “${expected}”`)
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
      `Tartibda xato bor: ${pos}-örinda “${exercise.answer[firstWrong] ?? '—'}” turişi kerak edi` +
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
