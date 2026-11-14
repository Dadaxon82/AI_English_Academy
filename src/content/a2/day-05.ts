// A2 Day 5 — Comparatives and Superlatives, Adjectives and Descriptions

// ---------- 1. LUG'AT (15 ta so'z) ----------
export const vocabDay5 = [
  { id: 'adj1', en: 'big', uz: 'katta', difficulty: 1, synonyms: ['large'], antonyms: ['small'] },
  { id: 'adj2', en: 'small', uz: 'kichik', difficulty: 1, synonyms: ['little', 'tiny'], antonyms: ['big'] },
  { id: 'adj3', en: 'tall', uz: 'uzun', difficulty: 1, synonyms: ['high'], antonyms: ['short'] },
  { id: 'adj4', en: 'short', uz: 'qisqa', difficulty: 1, synonyms: ['low'], antonyms: ['tall'] },
  { id: 'adj5', en: 'long', uz: 'uzoq', difficulty: 1, synonyms: ['extended'], antonyms: ['short'] },
  { id: 'adj6', en: 'beautiful', uz: 'gozal', difficulty: 2, synonyms: ['pretty', 'attractive'], antonyms: ['ugly'] },
  { id: 'adj7', en: 'expensive', uz: 'qimmat', difficulty: 2, synonyms: ['costly'], antonyms: ['cheap'] },
  { id: 'adj8', en: 'cheap', uz: 'arzon', difficulty: 2, synonyms: ['inexpensive'], antonyms: ['expensive'] },
  { id: 'adj9', en: 'fast', uz: 'tezkor', difficulty: 1, synonyms: ['quick'], antonyms: ['slow'] },
  { id: 'adj10', en: 'slow', uz: 'sekin', difficulty: 1, synonyms: ['sluggish'], antonyms: ['fast'] },
  { id: 'adj11', en: 'good', uz: 'yaxshi', difficulty: 1, synonyms: ['excellent', 'fine'], antonyms: ['bad'] },
  { id: 'adj12', en: 'bad', uz: 'yomon', difficulty: 1, synonyms: ['terrible', 'poor'], antonyms: ['good'] },
  { id: 'adj13', en: 'interesting', uz: 'qiziqarli', difficulty: 2, synonyms: ['fascinating', 'engaging'], antonyms: ['boring'] },
  { id: 'adj14', en: 'popular', uz: 'mashhur', difficulty: 2, synonyms: ['well-known', 'famous'], antonyms: ['unpopular'] },
  { id: 'adj15', en: 'healthy', uz: 'salomat', difficulty: 2, synonyms: ['fit', 'well'], antonyms: ['unhealthy'] },
]

// ---------- 2. GRAMMATIKA (Comparatives and Superlatives) ----------
export const grammarDay5 = {
  title: 'Sifatlar: Salishtirish va Superlativ',
  explanationUz: [
    'COMPARATIVES (SALISTIRISH SHAKLLARI): Bu shakllar ikki narsani salishtirish uchun ishlatiladi. Oddiy sifatlar uchun "-er" qo\'shimchasi qo\'shiladi. Masalan: big → bigger, small → smaller, tall → taller.',
    'QOIDASIZ SALISTIRISH: Ba\'zi sifatlar qoidasiga bo\'ysunmaydi va butunlay boshqa shaklga o\'tadi. Masalan: good → better, bad → worse, far → farther, old → older.',
    'MORE SHAKLI: Uzun sifatlar (3 yoki undan ko\'p harfdan iborat) uchun "more" qo\'shimchasi ishlatiladi. Masalan: beautiful → more beautiful, expensive → more expensive, interesting → more interesting.',
    'SUPERLATIVES (SUPERLATIV SHAKLLARI): Bu shakllar uch yoki undan ko\'p narsa orasidan eng yaxshisini ifodalaydi. Oddiy sifatlar uchun "-est" qo\'shimchasi qo\'shiladi. Masalan: big → biggest, small → smallest, tall → tallest.',
    'MOST SHAKLI: Uzun sifatlar uchun "most" qo\'shimchasi ishlatiladi. Masalan: beautiful → most beautiful, expensive → most expensive, interesting → most interesting.',
    'A va AS SHAKLLI: Ikki narsa teng bo\'lsa, "as + sifat + as" shakli ishlatiladi. Masalan: "I am as tall as you" (Men siz bilan bir xil uzunman).',
  ],
  formula: [
    { formula: 'Comparative: -er', exampleUz: 'big → bigger', exampleEn: 'A car is bigger than a bus' },
    { formula: 'Comparative (irregular): better', exampleUz: 'good → better', exampleEn: 'This book is better than that one' },
    { formula: 'Comparative (long): more', exampleUz: 'beautiful → more beautiful', exampleEn: 'This dress is more beautiful than that one' },
    { formula: 'Superlative: -est', exampleUz: 'big → biggest', exampleEn: 'This is the biggest building in the city' },
    { formula: 'Superlative (irregular): best', exampleUz: 'good → best', exampleEn: 'This is the best book I have read' },
    { formula: 'Equal: as + adj + as', exampleUz: 'as tall as', exampleEn: 'I am as tall as my brother' },
  ],
  exercises: [
    {
      id: 'g5e1',
      instruction: 'Feallarni salishtirish shakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'A car is ______ (big) than a bus.', answer: 'bigger' },
        { blank: 'This book is ______ (interesting) than that one.', answer: 'more interesting' },
        { blank: 'My car is ______ (fast) than yours.', answer: 'faster' },
        { blank: 'This movie is ______ (good) than the last one.', answer: 'better' },
        { blank: 'This dress is ______ (beautiful) than that one.', answer: 'more beautiful' },
      ],
    },
    {
      id: 'g5e2',
      instruction: 'Superlativ shakllarni tuzing:',
      type: 'fill-blank',
      items: [
        { blank: 'This is the ______ (big) building in the city.', answer: 'biggest' },
        { blank: 'This is the ______ (expensive) restaurant.', answer: 'most expensive' },
        { blank: 'This is the ______ (good) movie I have seen.', answer: 'best' },
        { blank: 'This is the ______ (interesting) book.', answer: 'most interesting' },
        { blank: 'This is the ______ (tall) tree in the park.', answer: 'tallest' },
      ],
    },
    {
      id: 'g5e3',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: '"This car is more big than that one" — bu to\'g\'ri.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: '"This is the best book" — bu Superlativ.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: '"I am as tall as you" — bu tenglik.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
    {
      id: 'g5e4',
      instruction: 'Jumlani to\'ldiring:',
      type: 'fill-blank',
      items: [
        { blank: 'This car is ______ (fast) than that one.', answer: 'faster' },
        { blank: 'She is the ______ (beautiful) girl in the class.', answer: 'most beautiful' },
        { blank: 'This movie is ______ (good) than the last one.', answer: 'better' },
        { blank: 'I am ______ (tall) than my brother.', answer: 'taller' },
        { blank: 'This is ______ (interesting) book I have read.', answer: 'the most interesting' },
      ],
    },
    {
      id: 'g5e5',
      instruction: 'Narsalar haqida ta\'rifingiz haqida gapiring (kamida 6 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'My car is faster than my brother\'s. This is the best movie I have seen. The city is more beautiful than the countryside. This book is more interesting than that one. She is taller than me. This is the most expensive restaurant I have been to.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay5 = {
  title: 'Shahar va Yovvoyi Tabiat',
  level: 'A2',
  paragraphs: [
    'Toshkent shahri O\'zbekistondagi eng katta shahar. U juda ko\'p odamlar va ko\'p binolarga ega. Toshkentda ko\'p transport turlari mavjud: poyezdlar, avtobuslar va metro. Shahar juda tez va zo\'r.',
    "Biroq, shahar tabiatga nisbatan yomonroq. Shaharda ko'p qatorlar, shovqin va iflos havo. Shaharda dam olish va dam olish uchun ko'p joylar yo'q. Shahar aholisi bu muammoni yechishga urinmoqda.",
    'Shahardan tashqarida esa, tabiat chiroyli va qulay. Tog'lar, daryolar va o\'rmonlar mavjud. Katta shahardan chiqib, siz chiroyli joylarni ko\'rishingiz mumkin. Ko\'plab odamlar hafta oxirida shahardan chiqib, dam olmoqchilar.',
    'Shahar va yovvoyi tabiat o\'rtasida muvozanat yaratish muhim. Shahar rivojlanishi kerak, lekin tabiatni ham himoya qilish kerak. O\'zbekiston bu muammolarni hal qilish uchun ko\'p ish qilib kelmoqda.',
  ],
  exercises: [
    {
      id: 'r5e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: 'Toshkent O\'zbekistondagi eng katta shahar.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Shahar tabiatdan chiroyliroq.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: 'Odamlar shahardan chiqib dam olishni yoqtiradilar.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
  ],
  glossary: [
    { en: 'big', uz: 'katta' },
    { en: 'tall', uz: 'uzun' },
    { en: 'beautiful', uz: 'gozal' },
    { en: 'expensive', uz: 'qimmat' },
    { en: 'fast', uz: 'tezkor' },
    { en: 'good', uz: 'yaxshi' },
    { en: 'popular', uz: 'mashhur' },
    { en: 'healthy', uz: 'salomat' },
  ],
}

// ---------- 4. ESHITISH (Listening Task) ----------
export const listeningDay5 = {
  title: 'Comparisons in Daily Life',
  level: 'A2',
  audio: {
    src: '/audio/a2/listening-day-5.mp3',
    duration: 300,
  },
  transcript: [
    'Ahmad: Salom! Kelajakda nima qilasan?',
    'Farida: Salom! Kelajakda men yangi ishlarni qilaman.',
    'Ahmad: Kelajakdagi ishing qanday?',
    'Farida: Kelajakdagi ishim ajoyib va qiziqarli bo\'ladi.',
    'Ahmad: Bu o\'sha ishingdan yaxshiroqmi?',
    'Farida: Ha, bu o\'sha ishingdan yaxshiroq va qiziqarliroq.',
  ],
  exercises: [
    {
      id: 'l5e1',
      instruction: 'Nimalarni eshitdingiz?',
      type: 'choice',
      items: [
        {
          question: 'Farida kelajakdagi ishi qanday?',
          options: ['Yomon', 'Yaxshi', 'O\'rta'],
          answer: 'Yaxshi',
        },
        {
          question: 'Kelajakdagi ish hozirgi ishdan yaxshiroqmi?',
          options: ['Ha', 'Yo\'q', 'Bilmayman'],
          answer: 'Ha',
        },
      ],
    },
  ],
}

// ---------- 5. Yozish (Writing Task) ----------
export const writingDay5 = {
  title: 'Sifatlar bilan ta\'rif',
  instruction: 'Ikkita narsani salishtiring va ularni sifatlar bilan tasvirlang (kamida 45 so\'z).',
  minWords: 45,
  maxWords: 120,
  mustInclude: [
    { pattern: 'than', whyUz: 'Salistirish kerak.' },
    { pattern: 'the most', whyUz: 'Superlativ ishlatish.' },
    { pattern: 'as', whyUz: 'Tenglik shakli.' },
    { pattern: 'more', whyUz: 'Uzun sifat salishtirish.' },
  ],
}

// ---------- 6. Gapirish (Speaking Tasks) ----------
export const speakingDay5 = [
  {
    id: 's5-1',
    instruction: 'O\'zingiz va do\'stingizni sifatlar bilan salishtiring (kamida 45 sekund).',
    minSeconds: 45,
  },
  {
    id: 's5-2',
    instruction: 'Ikkita shaharni yoki joyni sifatlar bilan salishtiring.',
    minSeconds: 45,
  },
  {
    id: 's5-3',
    instruction: 'Eng yaxshi va yomon narsalar haqida gapiring (kamida 45 sekund).',
    minSeconds: 45,
  },
]

// ---------- 7. BAHOLASH TESTI (Section Test) ----------
export const testDay5 = {
  title: 'Comparatives and Superlatives',
  passScore: 2,
  exercises: [
    {
      id: 't5-1',
      instruction: 'Feallarni salishtirish shakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'A car is ______ (big) than a bus.', answer: 'bigger' },
        { blank: 'This book is ______ (interesting) than that one.', answer: 'more interesting' },
        { blank: 'My car is ______ (fast) than yours.', answer: 'faster' },
        { blank: 'This movie is ______ (good) than the last one.', answer: 'better' },
        { blank: 'This dress is ______ (beautiful) than that one.', answer: 'more beautiful' },
      ],
    },
    {
      id: 't5-2',
      instruction: 'Superlativ shakllarni tuzing:',
      type: 'fill-blank',
      items: [
        { blank: 'This is the ______ (big) building in the city.', answer: 'biggest' },
        { blank: 'This is the ______ (expensive) restaurant.', answer: 'most expensive' },
        { blank: 'This is the ______ (good) movie I have seen.', answer: 'best' },
        { blank: 'This is the ______ (interesting) book.', answer: 'most interesting' },
        { blank: 'This is the ______ (tall) tree in the park.', answer: 'tallest' },
      ],
    },
    {
      id: 't5-3',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: '"This car is more big than that one" — to\'g\'ri.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: '"This is the best book" — bu Superlativ.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: '"I am as tall as you" — bu tenglik.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
    {
      id: 't5-4',
      instruction: 'Javobni yozing:',
      type: 'short-answer',
      items: [
        { blank: 'Which city is bigger, Tashkent or Samarkand?', answer: 'Tashkent is bigger than Samarkand.' },
        { blank: 'What is the best movie you have seen?', answer: 'The best movie I have seen is Avatar.' },
      ],
    },
    {
      id: 't5-5',
      instruction: 'Ikkita narsani salishtiring (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'My car is faster than my brother\'s. This is the best movie I have seen. The city is more beautiful than the countryside. This book is more interesting than that one. She is taller than me.' },
      ],
    },
  ],
}

// ---------- Eksportlar ----------
export const day5 = {
  vocab: vocabDay5,
  grammar: grammarDay5,
  reading: readingDay5,
  listening: listeningDay5,
  writing: writingDay5,
  speaking: speakingDay5,
  test: testDay5,
}
export { vocabDay5, grammarDay5, readingDay5, listeningDay5, writingDay5, speakingDay5, testDay5 }
