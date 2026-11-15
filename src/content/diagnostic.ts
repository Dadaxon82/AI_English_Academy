/**
 * Boshlang'ich diagnostika testi.
 *
 * Foydalanuvchi A1 dan boshlaydi, lekin diagnostika testini ham
 * taklif qilimiz. Maqsad — darajani aniqlash (XP emas, dalil asosida).
 * Natija noaniq bo'lsa aniq CEFR darajasi deb ko'rsatilmaydi.
 */

import type { Exercise, CefrLevel } from './types'

export interface DiagnosticQuestion {
  exercise: Exercise
  /** Savol qaysi darajani tekshiradi */
  targets: CefrLevel
}

export const diagnosticTest = {
  id: 'diagnostic-01',
  titleUz: 'Boşlanğiç diagnostika',
  descriptionUz:
    'Taxminan 10 daqiqa. 12 ta qisqa savol — hozirgi darajangizni aniqlaş uçun. Bu test rasmiy imtihon emas.',
  passScore: 50,
  exercises: [
    {
      id: 'dg-01',
      kind: 'multiple-choice',
      instructionUz: 'Böş joyni töldiring.',
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
      kind: 'multiple-choice',
      instructionUz: 'Töğri variantni tanlang.',
      question: 'She ___ to school every day.',
      options: ['go', 'goes', 'going', 'gone'],
      answerIndex: 1,
      level: 'A1',
      skill: 'grammar',
      difficulty: 2,
      explanationUz: 'Present Simple, uçinçi şaxs birlikda fe’lga -s qöşiladi.',
    },
    {
      id: 'dg-03',
      kind: 'gap-fill',
      instructionUz: 'Böş joyni töldiring.',
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
      source: 'Men keça kutubxonaga bordim.',
      sourceLang: 'uz',
      // "kecha" = yesterday: "last week" ma'nosi boshqa — qabul qilinmaydi.
      accepted: ['i went to the library yesterday', 'yesterday i went to the library'],
      level: 'A2',
      skill: 'grammar',
      difficulty: 3,
      explanationUz: 'Past Simple: “go” → “went”, vaqt sözi oxirga qöyiladi.',
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
      skill: 'reading',
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
      skill: 'reading',
      difficulty: 3,
      passageExcerpt: 'Anna is a waiter in a small cafe near her house. She gets up at six and takes the bus to work.',
      explanationUz: 'Maoş haqida heç narsa aytilmagan — Not Given.',
    },
    {
      id: 'dg-07',
      kind: 'multiple-choice',
      instructionUz: 'Sözning ma’nosini tanlang.',
      question: '“reluctant” means…',
      options: ['very happy', 'not wanting to do something', 'very fast', 'dangerous'],
      answerIndex: 1,
      level: 'B1',
      skill: 'vocabulary',
      difficulty: 3,
      explanationUz: '“Reluctant” — istagsiz, köngilsiz.',
    },
    {
      id: 'dg-08',
      kind: 'multiple-choice',
      instructionUz: 'Töğri variantni tanlang.',
      question: 'If the train had left on time, we ___ here now.',
      options: ['would be', 'will be', 'had been', 'are'],
      answerIndex: 0,
      level: 'B2',
      skill: 'grammar',
      difficulty: 4,
      explanationUz: 'Aralaş (mixed) conditional: ötmiş şarti + hozirgi natija.',
    },
    {
      id: 'dg-09',
      kind: 'gap-fill',
      instructionUz: 'Böş joyni töldiring.',
      text: 'By this time next year, she ___ her degree.',
      answers: ['will have finished'],
      acceptAlternatives: [['will have finished', 'will have completed', 'will have got', 'will have gotten']],
      level: 'B2',
      skill: 'grammar',
      difficulty: 4,
      explanationUz: 'Future Perfect: kelajakdagi belgilangan nuqtadan oldin tugagan harakat.',
    },
    {
      id: 'dg-10',
      kind: 'multiple-choice',
      instructionUz: 'Ma’noviy farqni aniqlang.',
      question: '“The findings were largely inconclusive” — “largely” here means…',
      options: ['in a large building', 'mostly', 'rarely', 'loudly'],
      answerIndex: 1,
      level: 'C1',
      skill: 'vocabulary',
      difficulty: 5,
      explanationUz: '“Largely” — asosan, köp jihatdan.',
    },
    {
      id: 'dg-11',
      kind: 'word-order',
      instructionUz: 'Sözlarni töğri tartibga tizing.',
      answer: ['Never', 'had', 'she', 'seen', 'snow'],
      bank: ['she', 'had', 'Never', 'seen', 'snow'],
      noteUz: '“Never” bilan boşlangan gapda invertsiya böladi.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 5,
      explanationUz: 'Inversion: Never + had + ega + V3.',
    },
    {
      id: 'dg-12',
      kind: 'translation',
      instructionUz: 'Inglizçaga tarjima qiling.',
      source: 'Kitobni öqib bölgaç, uni yopdim.',
      sourceLang: 'uz',
      accepted: [
        'after i had finished reading the book, i closed it',
        'having finished reading the book, i closed it',
        'when i had finished reading the book, i closed it',
      ],
      level: 'B2',
      skill: 'writing',
      difficulty: 4,
      explanationUz: 'Ikki ötmiş harakatidan oldinroq bölgani uçun Past Simple (yoki Perfect participle).',
    },
  ] as Exercise[],
}

/**
 * Diagnostika natijasidan darajani baholash aniq qoida bilan.
 * natija noaniq bo'lsa `level: null` qaytadi.
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

  // Daraja: barcha savollar to'g'ri bo'lgan eng yuqori banda,
  // qo'shni bandaga o'tish uchun kamida 2/3 to'g'ri bo'lishi kerak.
  const order: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']
  let reached: CefrLevel | null = null
  let confidentBands = 0
  for (const lvl of order) {
    const b = band[lvl]
    if (b.hits === b.ids.length) reached = lvl
    if (b.hits / b.ids.length >= 2 / 3) confidentBands += 1
  }

  const confidence = Number((confidentBands / order.length).toFixed(2))
  if (!reached) {
    return { level: null, confidence, labelUz: 'Natija noaniq — A1 dan boşlaymiz va diagnostikani keyin takrorlaymiz.' }
  }
  if (confidence < 0.5) {
    return {
      level: null,
      confidence,
      labelUz: `Taxminiy darajangiz ${reached}, ammo dalil yetarli emas. A1 bosqiçidan boşlab, birinçi bölim testidan söng qayta baholanadi.`,
    }
  }
  return { level: reached, confidence, labelUz: `Diagnostika natijasi: ${reached}. Bu taxminiy baho — darslar davomida aniqlaştiriladi.` }
}
