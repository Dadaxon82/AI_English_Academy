/**
 * Kontent auditi — har bir mashqning to'g'ri javobi HAQIQIY to'g'ri va
 * topshiriq yaxlitmi, shuni tekshiradi.
 *
 * Nega kerak: `word-order` mashqlarida javob so'zi bankda yo'q bo'lsa
 * (masalan a1-ex-t4-07 — "bathroom" tushib qolgan), `gap-fill`da bo'shliq
 * soni javoblar soniga teng bo'lmasa — foydalanuvchi qancha urinmasin mashq
 * "noto'g'ri" deb qoladi. Bunday xatolar endi testda ko'rinadi.
 *
 * Test muammolarni JAMLAYDI — bitta expect'da to'xtab qolmaydi, barcha
 * xatolar bir marotaba ro'yxat bo'lib chiqadi.
 */
import { describe, expect, it } from 'vitest'
import { a1, diagnosticTest, mockExamA1 } from '../content'
import { normalize } from '../lib/check'
import type { Exercise, ReadingPassage } from '../content/types'

interface Item {
  ex: Exercise
  owner: string
  passage?: ReadingPassage
  transcript?: string
}

function collect(): Item[] {
  const out: Item[] = []
  const add = (ex: Exercise, owner: string, passage?: ReadingPassage, transcript?: string) =>
    out.push({ ex, owner, passage, transcript })

  for (const g of a1.grammar) for (const e of g.exercises) add(e, g.id)
  for (const r of a1.reading) for (const e of r.exercises) add(e, r.id, r)
  for (const l of a1.listening) {
    const tr = l.audio.transcript.map((t) => t.text).join(' ')
    for (const e of l.exercises) add(e, l.id, undefined, tr)
  }
  for (const t of a1.tests) for (const e of t.exercises) add(e, t.id)
  for (const s of mockExamA1.sections) {
    const tr = s.audio?.transcript.map((t) => t.text).join(' ')
    for (const e of s.exercises) add(e, s.id, undefined, tr)
  }
  for (const e of diagnosticTest.exercises) add(e, diagnosticTest.id)
  return out
}

const ITEMS = collect()
/** check.ts'dagi bilan BIR xil normallashtirish (apostrof/tire belgilari). */
const norm = normalize
const GAP_RE = /_{2,}/g

function expectClean(problems: string[], header: string) {
  expect(problems, `${header} (${problems.length} ta):\n` + problems.join('\n')).toEqual([])
}

describe('Kontent auditi — mashqlar yaxlitligi', () => {
  it('mashqlar to‘plami bo‘sh emas', () => {
    expect(ITEMS.length).toBeGreaterThan(50)
  })

  it('har bir mashqda ID, topshiriq, izoh va qiyinlik bor', () => {
    const bad: string[] = []
    for (const { ex, owner } of ITEMS) {
      if (!ex.id.trim()) bad.push(`${owner}: bo‘sh ID`)
      if (ex.instructionUz.length <= 5) bad.push(`${ex.id}: topshiriq yo‘q`)
      if (ex.explanationUz.length <= 5) bad.push(`${ex.id}: izoh yo‘q`)
      if (ex.difficulty < 1 || ex.difficulty > 5) bad.push(`${ex.id}: qiyinlik ${ex.difficulty}`)
    }
    expectClean(bad, 'maydon yetishmaydi')
  })

  it('mashq IDlari takrorlanmagan (kunlar + mock + diagnostika)', () => {
    const seen = new Map<string, string>()
    const dup: string[] = []
    for (const { ex, owner } of ITEMS) {
      if (seen.has(ex.id)) dup.push(`${ex.id}: ${owner} va ${seen.get(ex.id)}`)
      else seen.set(ex.id, owner)
    }
    expectClean(dup, 'takroriy ID')
  })

  it('multiple-choice: javob indeksi chegarada, variantlar noyob', () => {
    const bad: string[] = []
    for (const { ex, owner } of ITEMS) {
      if (ex.kind !== 'multiple-choice') continue
      if (ex.options.length < 2) bad.push(`${ex.id}: variantlar soni ${ex.options.length}`)
      if (new Set(ex.options.map(norm)).size !== ex.options.length) bad.push(`${ex.id}: takroriy variant`)
      if (ex.answerIndex < 0 || ex.answerIndex >= ex.options.length)
        bad.push(`${owner}/${ex.id}: answerIndex=${ex.answerIndex} chegaradan tashqarida`)
    }
    expectClean(bad, 'multiple-choice')
  })

  it('multiple-choice (tinglash): to‘g‘ri variant audio mazmuniga mos', () => {
    // Variantlar paraphrase bo‘lishi mumkin, shuning uchun so‘z darajasida
    // solishtiramiz. Aniq signal: to‘g‘ri variantning barcha muhim so‘zlari
    // transkriptda YO‘Q, lekin biror xato variantning barcha so‘zlari BOR.
    // Bunday holat kalit noto‘g‘ri indeksda turibdi degani.
    const STOP = new Set(['and', 'the', 'with', 'some', 'his', 'her', 'for', 'from', 'that', 'this', 'they', 'there'])
    const tokens = (s: string) => norm(s).split(' ').filter((w) => w.length > 3 && !STOP.has(w))
    const bad: string[] = []
    for (const { ex, transcript, owner } of ITEMS) {
      if (ex.kind !== 'multiple-choice' || !transcript) continue
      const tr = norm(transcript)
      const rightToks = tokens(ex.options[ex.answerIndex] ?? '')
      if (rightToks.length === 0) continue
      const rightHits = rightToks.filter((t) => tr.includes(t)).length
      const fullWrong = ex.options
        .map((o, i) => ({ o, i, t: tokens(o) }))
        .filter(({ i, t }) => i !== ex.answerIndex && t.length >= 2 && t.every((w) => tr.includes(w)))
      if (rightHits === 0 && fullWrong.length > 0)
        bad.push(
          `${owner}/${ex.id}: javob “${ex.options[ex.answerIndex]}” audioda umuman eshitilmaydi, ` +
            `lekin “${fullWrong.map((w) => w.o).join(' | ')}” eshitiladi — kalit indeksini tekshiring`,
        )
    }
    expectClean(bad, 'tinglash kaliti shubhali')
  })

  it('true/false/not given: javob ruxsat etilgan qiymatda', () => {
    const bad: string[] = []
    for (const { ex } of ITEMS) {
      if (ex.kind !== 'true-false-notgiven') continue
      if (!['true', 'false', 'notgiven'].includes(ex.answer)) bad.push(`${ex.id}: answer="${ex.answer}"`)
    }
    expectClean(bad, 'tfng javobi')
  })

  it('tfng “evidence” haqiqatan matndan olingan qator', () => {
    // Not Given’da evidence o‘zbekcha izoh bo‘lishi mumkin ("matnda yo‘q"),
    // lekin true/false uchun u matn yoki transkriptda so‘zma-so‘z bor bo‘lishi
    // shart — aks holda o‘quvchini aldaydi.
    const bad: string[] = []
    for (const { ex, passage, transcript, owner } of ITEMS) {
      if (ex.kind !== 'true-false-notgiven' || ex.answer === 'notgiven' || !ex.evidence) continue
      const src = [ex.passageExcerpt ?? '', ...(passage?.paragraphs ?? []), transcript ?? ''].join(' ')
      if (!src.trim()) continue // manba testda ko‘rinmaydi — tekshirmaymiz
      // "Malika: ..." ko‘rinishidagi nutq egasi boshi ixtiyoriy.
      const ev = ex.evidence.replace(/^[A-Z][\w ]*:\s*/, '')
      if (!norm(src).includes(norm(ev))) bad.push(`${owner}/${ex.id}: evidence matnda yo‘q — "${ex.evidence}"`)
    }
    expectClean(bad, 'tfng evidence')
  })

  it('matching: kamida 2 juftlik, chap/o‘ng tomonlar noyob', () => {
    const bad: string[] = []
    for (const { ex } of ITEMS) {
      if (ex.kind !== 'matching') continue
      if (ex.pairs.length < 2) bad.push(`${ex.id}: juftliklar soni ${ex.pairs.length}`)
      if (new Set(ex.pairs.map((p) => norm(p.left))).size !== ex.pairs.length) bad.push(`${ex.id}: takroriy chap tomon`)
      if (new Set(ex.pairs.map((p) => norm(p.right))).size !== ex.pairs.length) bad.push(`${ex.id}: takroriy o‘ng tomon`)
    }
    expectClean(bad, 'matching')
  })

  it('gap-fill: bo‘shliq soni == javoblar soni, bankda javoblar bor', () => {
    const bad: string[] = []
    for (const { ex, owner } of ITEMS) {
      if (ex.kind !== 'gap-fill') continue
      const gaps = (ex.text.match(GAP_RE) || []).length
      if (gaps !== ex.answers.length) bad.push(`${owner}/${ex.id}: ${gaps} bo‘shliq / ${ex.answers.length} javob`)
      if (ex.answers.some((a) => !a.trim())) bad.push(`${ex.id}: bo‘sh javob`)
      if (ex.acceptAlternatives && ex.acceptAlternatives.length !== ex.answers.length)
        bad.push(`${ex.id}: alternativalar ${ex.acceptAlternatives.length} ≠ javoblar ${ex.answers.length}`)
      if (ex.wordBank?.length)
        for (const a of ex.answers)
          if (!ex.wordBank.some((b) => norm(b) === norm(a)))
            bad.push(`${ex.id}: javob “${a}” bankda yo‘q (${ex.wordBank.join(', ')})`)
    }
    expectClean(bad, 'gap-fill')
  })

  it('gap-fill (o‘qish): javob matnda so‘zma-so‘z uchraydi', () => {
    const bad: string[] = []
    for (const { ex, passage } of ITEMS) {
      if (ex.kind !== 'gap-fill' || !passage) continue
      const body = norm(passage.paragraphs.join(' '))
      for (const a of ex.answers) if (!body.includes(norm(a)) && !body.includes(norm(a) + 's')) bad.push(`${ex.id}: javob “${a}” matnda yo‘q`)
    }
    expectClean(bad, 'gap-fill javoblari matnda')
  })

  it('word-order: bank = javob so‘zlarining aniq to‘plami', () => {
    const bad: string[] = []
    for (const { ex, owner } of ITEMS) {
      if (ex.kind !== 'word-order') continue
      if (ex.answer.length < 3) bad.push(`${ex.id}: javob juda qisqa (${ex.answer.length})`)
      const bank = [...ex.bank].sort()
      const ans = [...ex.answer].sort()
      for (const w of ans) if (!bank.includes(w)) bad.push(`${owner}/${ex.id}: javob so‘zi “${w}” bankda yo‘q (${ex.bank.join(', ')})`)
      if (bank.length !== ans.length) bad.push(`${owner}/${ex.id}: bank ${bank.length} ≠ javob ${ans.length} so‘z`)
    }
    expectClean(bad, 'word-order banki')
  })

  it('translation: kamida bitta qabul qilinadigan javob', () => {
    const bad: string[] = []
    for (const { ex } of ITEMS) {
      if (ex.kind !== 'translation') continue
      if (ex.accepted.length === 0) bad.push(`${ex.id}: accepted bo‘sh`)
      if (ex.accepted.some((a) => !a.trim())) bad.push(`${ex.id}: bo‘sh accepted`)
    }
    expectClean(bad, 'translation')
  })

  it('mock imtihon: bo‘lim bo‘sh emas, savol ko‘nikması bo‘limga mos', () => {
    const bad: string[] = []
    for (const s of mockExamA1.sections) {
      const hasTask = Boolean(s.writingTask || s.speakingTask)
      if (!(s.exercises.length > 0 || hasTask)) bad.push(`${s.id}: bo‘sh bo‘lim`)
      for (const e of s.exercises) if (e.skill !== s.skill) bad.push(`${e.id}: skill=${e.skill} ≠ bo‘lim ${s.skill}`)
    }
    expectClean(bad, 'mock imtihon')
  })
})
