// A2 Day 3 — Past Continuous, Present Perfect, Travel Topics

// ---------- 1. LUG'AT (15 ta so'z) ----------
export const vocabDay3 = [
  { id: 'travel1', en: 'journey', uz: 'safar', difficulty: 2, synonyms: ['trip', 'travel'], antonyms: [] },
  { id: 'travel2', en: 'arrive', uz: 'kelib yetish', difficulty: 2, synonyms: ['reach'], antonyms: ['leave'] },
  { id: 'travel3', en: 'depart', uz: 'ketish', difficulty: 3, synonyms: ['leave', 'set off'], antonyms: ['arrive'] },
  { id: 'travel4', en: 'destination', uz: 'maqsad', difficulty: 3, synonyms: ['goal', 'end point'], antonyms: [] },
  { id: 'travel5', en: 'passenger', uz: 'yўlovchi', difficulty: 2, synonyms: ['traveler'], antonyms: [] },
  { id: 'travel6', en: 'ticket', uz: 'bilet', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'travel7', en: 'accommodation', uz: 'mavjud', difficulty: 3, synonyms: ['hotel', 'stay'], antonyms: [] },
  { id: 'travel8', en: 'airport', uz: ' aeroport', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'travel9', en: 'train station', uz: 'poyezd stantsiyasi', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'travel10', en: 'excited', uz: 'qiziqqan', difficulty: 2, synonyms: ['thrilled', 'eager'], antonyms: ['bored'] },
  { id: 'travel11', en: 'wonderful', uz: 'zamon', difficulty: 2, synonyms: ['amazing', 'fantastic'], antonyms: ['terrible'] },
  { id: 'travel12', en: 'expensive', uz: 'qimmat', difficulty: 2, synonyms: ['costly'], antonyms: ['cheap'] },
  { id: 'travel13', en: 'comfortable', uz: 'qulay', difficulty: 2, synonyms: ['cozy', 'pleasant'], antonyms: ['uncomfortable'] },
  { id: 'travel14', en: 'vacation', uz: 'tuzilish', difficulty: 2, synonyms: ['holiday', 'break'], antonyms: [] },
  { id: 'travel15', en: 'planning', uz: 'rejalashtirish', difficulty: 2, synonyms: ['organizing'], antonyms: [] },
]

// ---------- 2. GRAMMATIKA (Past Continuous, Present Perfect) ----------
export const grammarDay3 = {
  title: 'O\'tmishdagi davomiylar va Hozirgi vaqt',
  explanationUz: [
    'PAST CONTINUOUS ZOMON: Bu zamon o\'tmishning ma\'lum bir vaqtida davom etayotgan harakatlarni ifodalaydi. Feal "to be" (was/were) + V-ing shaklida ishlatiladi. Masalan: "I was working when you called" (Uzingiz qo\'ng\'iroq qilganda, men ishlayotganman).',
    'PAST CONTINUOUS FEALLARI: I/We/You/They uchun "was" ishlatiladi, He/She/It uchun "were" ishlatiladi. Masalan: "They were playing football" yoki "She was studying at 8 PM yesterday".',
    'PRESENT PERFECT ZOMON: Bu zamon o\'tgan vaqtgani muhim emas, balki natijaga urg\'u beradi. Feal "have/has" + V3 (past participle) shaklida ishlatiladi. Masalan: "I have visited Uzbekistan" (Men O\'zbekistonni ziyorat qilganman).',
    'PRESENT PERFECT FEALLARI: I/You/We/They uchun "have" ishlatiladi, He/She/It uchun "has" ishlatiladi. Masalan: "She has finished her homework" yoki "They have gone to school".',
    'V3 FEALLAR: Many feallar uchun V3 shakli oddiy -d qo\'shimchasidan iborat. Masalan: work → worked, play → played, watch → watched. Biroq ba\'zi feallar o\'ziga xos shakllarga ega. Masalan: go → gone, see → seen, have → had, go → gone.',
  ],
  formula: [
    { formula: 'Past Continuous: was/were + V-ing', exampleUz: 'She was working', exampleEn: 'She was working when I called her' },
    { formula: 'Present Perfect: have/has + V3', exampleUz: 'He has visited', exampleEn: 'He has visited Paris three times' },
    { formula: 'When: Past Simple', exampleUz: 'when', exampleEn: 'I was sleeping when you called (Uzingiz qo\'ng\'iroq qilganda, men uxlayotganman)' },
  ],
  exercises: [
    {
      id: 'g3e1',
      instruction: 'Feallarni Past Continuous shakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (study) when you called.', answer: 'was studying' },
        { blank: 'They ______ (play) football at 5 PM.', answer: 'were playing' },
        { blank: 'She ______ (cook) dinner when I arrived.', answer: 'was cooking' },
        { blank: 'We ______ (watch) TV when the power went out.', answer: 'were watching' },
        { blank: 'He ______ (drive) home when it started to rain.', answer: 'was driving' },
      ],
    },
    {
      id: 'g3e2',
      instruction: 'Feallarni Present Perfect shakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (visit) my grandmother today.', answer: 'have visited' },
        { blank: 'She ______ (finish) her homework.', answer: 'has finished' },
        { blank: 'They ______ (go) to the beach.', answer: 'have gone' },
        { blank: 'We ______ (see) that movie.', answer: 'have seen' },
        { blank: 'He ______ (read) that book.', answer: 'has read' },
      ],
    },
    {
      id: 'g3e3',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: '"I have worked here for two years" — bu Past Continuous zamon.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: '"She was studying at 8 PM" — bu Past Continuous zamon.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: '"They have arrived" — bu Present Perfect zamon.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
    {
      id: 'g3e4',
      instruction: 'Jumlani to\'ldiring:',
      type: 'choice',
      items: [
        {
          question: '______ (I/You/We/They) ______ (watch) TV at the moment.',
          options: ['are watching', 'watching', 'watched'],
          answer: 'are watching',
        },
        {
          question: 'She ______ (have) a car.',
          options: ['has', 'have', 'had'],
          answer: 'has',
        },
      ],
    },
    {
      id: 'g3e5',
      instruction: 'O\'tmishda nima qilayotganingiz haqida gapiring (Past Continuous).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I was working when you called. I was cooking dinner when my friend came. I was studying when the power went out.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay3 = {
  title: 'O\'zbekistonni Ziyorat Qilish',
  level: 'A2',
  paragraphs: [
    'Ahmad va Farida O\'zbekistonga safar qilishdi. Ular Toshkent aeroportiga bordilar va u yerdan Tashkentga poyezdga chiqdilar. Ular shahar markaziga 2 soat ichida yetib keldilar.',
    'Ahmad aytib o\'tadiki, O\'zbekiston juda qiziq joy. Shahar ko'p madaniy va tarixiy joylarga ega. Ular ko'p joylarni ko\'rishdi va ko\'p narsalarni bilishdi.',
    'Kechqurun, ular mehmonxona vaqtlarini qidirishdi. Ular xar xonali mehmonxonani topishdi va mehmonxona juda qulay va arzon edi. Ahmad aytib o\'tadiki, O\'zbekiston arzon va qulay joydir.',
    "Kechqurun, Ahmad va Farida mehmonxona yotoqxonaga ketdilar. Ular uzoq vaqt dam olishdi. Ertalab ular shaharda sayr qilishga chiqishdi. Ular ko'p narsalarni ko'rishdi va ko'p narsalarni bilishdi.",
  ],
  exercises: [
    {
      id: 'r3e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: 'Ahmad va Farida avtobusda Tashkentga bordilar.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: 'O\'zbekiston ko\'p madaniy va tarixiy joylarga ega.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Ular mehmonxona xar xonali edi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
  ],
  glossary: [
    { en: 'journey', uz: 'safar' },
    { en: 'arrive', uz: 'kelib yetish' },
    { en: 'ticket', uz: 'bilet' },
    { en: 'accommodation', uz: 'mavjud' },
    { en: 'expensive', uz: 'qimmat' },
    { en: 'comfortable', uz: 'qulay' },
  ],
}

// ---------- 4. ESHITISH (Listening Task) ----------
export const listeningDay3 = {
  title: 'Travel Conversations',
  level: 'A2',
  audio: {
    src: '/audio/a2/listening-day-3.mp3',
    duration: 300,
  },
  transcript: [
    'Ahmad: Salom! O\'zbekistonga safar qilasizmi?',
    'Farid: Ha, biz Tashkentga ketdik. Poyezd bilan keldik.',
    'Ahmad: Ajoyib! Mening mening mehmonxona topdimmi?',
    'Farid: Ha, biz xar xonali mehmonxonamizni topdik. U juda qulay edi.',
    'Ahmad: Qanday narxda edi?',
    'Farid: Arzon edi. Ushbu narsalar juda qulay edi.',
  ],
  exercises: [
    {
      id: 'l3e1',
      instruction: 'Nimalarni eshitdingiz?',
      type: 'choice',
      items: [
        {
          question: 'Farid qanday transportda ketdi?',
          options: ['Avtobus', 'Poyezd', 'Samolyot'],
          answer: 'Poyezd',
        },
        {
          question: 'Mehmonxona qanday edi?',
          options: ['Qimmat', 'Qulay', 'Katta'],
          answer: 'Qulay',
        },
      ],
    },
  ],
}

// ---------- 5. Yozish (Writing Task) ----------
export const writingDay3 = {
  title: 'Safar haqida',
  instruction: 'O\'tmishda qilgan safaringiz haqida tavsiflang (kamida 35 so\'z).',
  minWords: 35,
  maxWords: 100,
  mustInclude: [
    { pattern: 'travel', whyUz: 'Safar mavzusi.' },
    { pattern: 'went', whyUz: 'O\'tmish feali kerak.' },
    { pattern: 'arrive', whyUz: 'Kelib yetish haqida.' },
    { pattern: 'stay', whyUz: 'Mavjud qilish haqida.' },
  ],
}

// ---------- 6. Gapirish (Speaking Tasks) ----------
export const speakingDay3 = [
  {
    id: 's3-1',
    instruction: 'O\'tmishda qilgan eng xotirangizli safaringiz haqida gapiring.',
    minSeconds: 45,
  },
  {
    id: 's3-2',
    instruction: 'Keyingi sayohat rejalari haqida gapiring (Present Perfect ishlatib).',
    minSeconds: 45,
  },
  {
    id: 's3-3',
    instruction: 'Safar vaqti haqida gapiring.',
    minSeconds: 30,
  },
]

// ---------- 7. BAHOLASH TESTI (Section Test) ----------
export const testDay3 = {
  title: 'Past Continuous va Present Perfect',
  passScore: 2,
  exercises: [
    {
      id: 't3-1',
      instruction: 'Feallarni to\'g\'ri shakllantiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (work) when the phone rang.', answer: 'was working' },
        { blank: 'They ______ (fly) to London yesterday.', answer: 'flew' },
        { blank: 'She ______ (see) that movie.', answer: 'has seen' },
        { blank: 'We ______ (watch) TV at 8 PM.', answer: 'were watching' },
        { blank: 'He ______ (arrive) at the station.', answer: 'has arrived' },
      ],
    },
    {
      id: 't3-2',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: '"I am working now" — bu Past Continuous.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: '"She has gone to school" — bu Present Perfect.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: '"They were playing" — bu Past Continuous.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
    {
      id: 't3-3',
      instruction: 'Jumlani tuzing:',
      type: 'fill-blank',
      items: [
        { blank: '______ (I/You/We/They) ______ (study) when you called.', answer: 'were studying' },
        { blank: 'She ______ (have) a car.', answer: 'has' },
        { blank: 'I ______ (visit) Paris last year.', answer: 'visited' },
      ],
    },
    {
      id: 't3-4',
      instruction: 'Javobni yozing:',
      type: 'short-answer',
      items: [
        { blank: 'Where did you go on vacation?', answer: 'I went to the beach.' },
        { blank: 'What have you done today?', answer: 'I have studied and worked.' },
      ],
    },
    {
      id: 't3-5',
      instruction: 'Safar haqida gapiring (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I traveled to Uzbekistan. I went to Tashkent by train. I stayed in a hotel. I ate good food and saw beautiful places.' },
      ],
    },
  ],
}

// ---------- Eksportlar ----------
export const day3 = {
  vocab: vocabDay3,
  grammar: grammarDay3,
  reading: readingDay3,
  listening: listeningDay3,
  writing: writingDay3,
  speaking: speakingDay3,
  test: testDay3,
}
export { vocabDay3, grammarDay3, readingDay3, listeningDay3, writingDay3, speakingDay3, testDay3 }
