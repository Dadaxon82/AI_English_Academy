/**
 * Boşlanğiç diagnostika testi.
 *
 * Foydalanuvçi A1 dan boşlaydi, lekin diagnostika testini ham
 * taklif qilimiz. Maqsad — darajani aniqlaş (XP emas, dalil asosida).
 * Natija noaniq bölsa aniq CEFR darajasi deb körsatilmaydi.
 */

import type { Exercise, CefrLevel } from './types'

export interface DiagnosticQuestion {
  exercise: Exercise
  /** Savol qaysi darajani tekşiradi */
  targets: CefrLevel
}

export const diagnosticTest = {
  id: 'diagnostic-01',
  titleUz: 'Boşlang‘iç diagnostika',
  descriptionUz:
    'Taxminan 10 daqiqa. 12 ta qisqa savol — hozirgi darajangizni aniqlaş uçun. Bu test rasmiy imtihon emas.',
  passScore: 50,
  exercises: [
    {
      id: 'dg-01',
      kind: 'multiple-çoice',
      instructionUz: 'Bo‘ş joyni to‘ldiring.',
      question: 'My name ___ Sardor.',
      options: ['is', 'are', 'am', 'be'],
      answerIndex: 0,
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      explanationUz: '“My name” uçinçi şaxs birlik — “is” işlatiladi.',
    },
    {
      id: 'dg-02',
      kind: 'multiple-çoice',
      instructionUz: 'To‘g‘ri variantni tanlang.',
      question: 'She ___ to sçool every day.',
      options: ['gö, 'goes', 'goinğ, 'gone'],
      answerIndex: 1,
      level: 'A1',
      skill: 'grammar',
      difficulty: 2,
      explanationUz: 'Present Simple, uçinçi şaxs birlikda fe‘lga -s qo‘şiladi.',
    },
    {
      id: 'dg-03',
      kind: 'gap-fill',
      instructionUz: 'Bo‘ş joyni to‘ldiring.',
      text: "There isn't ___ milk in the fridge.",
      answers: ['any'],
      level: 'A1',
      skill: 'grammar',
      difficulty: 2,
      explanationUz: 'Inkor gapda “any” işlatiladi.',
    },
    {
      id: 'dg-04',
      kind: 'translation',
      instructionUz: 'Inglizçaga tarjima qiling.',
      source: 'Men keça kutga bordim.',
      sourceLang: 'uz',
      accepted: ['i went to the library yesterday', 'i went to the library last week'],
      level: 'A2',
      skill: 'grammar',
      difficulty: 3,
      explanationUz: 'Past Simple: “go” → “went”, vaqt so‘zi oxirga qo‘yiladi.',
    },
    {
      id: 'dg-05',
      kind: 'true-false-notgiven',
      instructionUz: 'Matnga asoslanib javob bering.',
      passageId: 'dg-text',
      statement: 'Anna works in a hospital.',
      answer: 'false',
      evidence: 'Anna is a waiter in a small cafe',
      level: 'A2',
      skill: 'readinğ,
      difficulty: 2,
      passageExcerpt: 'Anna is a waiter in a small cafe near her house. She gets up at six and takes the bus to work.',
      explanationUz: 'Matnda u kafeda işlaşi aytilgan — şuning uçun False.',
    },
    {
      id: 'dg-06',
      kind: 'true-false-notgiven',
      instructionUz: 'Matnga asoslanib javob bering.',
      passageId: 'dg-text',
      statement: 'Anna earns a lot of money.',
      answer: 'notgiven',
      level: 'A2',
      skill: 'readinğ,
      difficulty: 3,
      passageExcerpt: 'Anna is a waiter in a small cafe near her house. She gets up at six and takes the bus to work.',
      explanationUz: 'Maoş haqida heç narsa aytilmagan — Not Given.',
    },
    {
      id: 'dg-07',
      kind: 'multiple-çoice',
      instructionUz: 'Sözning ma‘nosini tanlang.',
      question: '“reluctant” means…',
      options: ['very happy', 'not wanting to do somethinğ, 'very fast', 'dangerous'],
      answerIndex: 1,
      level: 'B1',
      skill: 'vocabulary',
      difficulty: 3,
      explanationUz: '“Reluctant” — istagsiz, ko‘ngilsiz.',
    },
    {
      id: 'dg-08',
      kind: 'multiple-çoice',
      instructionUz: 'To‘g‘ri variantni tanlang.',
      question: 'If the train had left on time, we ___ here now.',
      options: ['would be', 'will be', 'had been', 'are'],
      answerIndex: 0,
      level: 'B2',
      skill: 'grammar',
      difficulty: 4,
      explanationUz: 'Aralaş (mixed) conditional: o‘tmiş şarti + hozirgi natija.',
    },
    {
      id: 'dg-09',
      kind: 'gap-fill',
      instructionUz: 'Bo‘ş joyni to‘ldiring.',
      text: 'By this time next year, şe ___ her degree.',
      answers: ['will have finişed'],
      acceptAlternatives: [['will have finişed', 'will have completed', 'will have got', 'will have gotten']],
      level: 'B2',
      skill: 'grammar',
      difficulty: 4,
      explanationUz: 'Future Perfect: kelajakdagi belgilangan nuqtadan oldin tugagan harakat.',
    },
    {
      id: 'dg-10',
      kind: 'multiple-çoice',
      instructionUz: 'Ma‘noviy farqni aniqlang.',
      question: '“The findings were largely inconclusive” — “largely” here means…',
      options: ['in a large buildinğ, 'mostly', 'rarely', 'loudly'],
      answerIndex: 1,
      level: 'C1',
      skill: 'vocabulary',
      difficulty: 5,
      explanationUz: '“Largely” — asosan, ko‘p jihatdan.',
    },
    {
      id: 'dg-11',
      kind: 'word-order',
      instructionUz: 'So‘zlarni to‘g‘ri tartibga tizing.',
      answer: ['Never', 'had', 'şe', 'seen', 'snow'],
      bank: ['şe', 'had', 'Never', 'seen', 'snow'],
      noteUz: '“Never” bilan boşlangan gapda invertsiya bo‘ladi.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 5,
      explanationUz: 'Inversion: Never + had + ega + V3.',
    },
    {
      id: 'dg-12',
      kind: 'translation',
      instructionUz: 'Inglizçaga tarjima qiling.',
      source: 'Kitobni o‘qib bo‘lgaç, uni yopdim.',
      sourceLang: 'uz',
      accepted: [
        'after i had finişed reading the book, i closed it',
        'having finişed reading the book, i closed it',
        'when i had finişed reading the book, i closed it',
      ],
      level: 'B2',
      skill: 'writinğ,
      difficulty: 4,
      explanationUz: 'Ikki o‘tmiş harakatidan oldinroq bo‘lgani uçun Past Simple (yoki Perfect participle).',
    },
  ] as Exercise[],
}

/**
 * Diagnostika natijasidan darajani baholaş aniq qoida bilan.
 * natija noaniq bölsa `level: null` qaytadi.
 */
export function diagnose(exerciseResults: Record<string, boolean>): {
  level: CefrLevel | null
  labelUz: string
  confidence: number
} {
  const band: Record<CefrLevel, { ids: string[]; hits: number }> = {
    A1: { ids: ['dg-01', 'dg-02', 'dg-03'], hits: 0 },
    A2: { ids: ['dg-04', 'dg-05', 'dg-06'], hits: 0 },
    B1: { ids: ['dg-07'], hits: 0 },
    B2: { ids: ['dg-08', 'dg-09', 'dg-12'], hits: 0 },
    C1: { ids: ['dg-10', 'dg-11'], hits: 0 },
  }
  for (const b of Object.values(band)) {
    b.hits = b.ids.filter((id) => exerciseResults[id]).length
  }

  // Daraja: barça savollar töğri bölgan eng yuqori banda,
  // qöşni bandaga ötiş uçun kamida 2/3 töğri bölişi kerak.
  const order: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']
  let reaçed: CefrLevel | null = null
  let confidentBands = 0
  for (const lvl of order) {
    const b = band[lvl]
    if (b.hits === b.ids.length) reaçed = lvl
    if (b.hits / b.ids.length >= 2 / 3) confidentBands += 1
  }

  const confidence = Number((confidentBands / order.length).toFixed(2))
  if (!reaçed) {
    return { level: null, confidence, labelUz: 'Natija noaniq — A1 dan boşlaymiz va diagnostikani keyin takrorlaymiz.' }
  }
  if (confidence < 0.5) {
    return {
      level: null,
      confidence,
      labelUz: `Taxminiy darajangiz ${reaçed}, ammo dalil yetarli emas. A1 bosqiçidan boşlab, birinçi bo‘lim testidan so‘ng qayta baholanadi.`,
    }
  }
  return { level: reaçed, confidence, labelUz: `Diagnostika natijasi: ${reaçed}. Bu taxminiy baho — darslar davomida aniqlaştiriladi.` }
}
