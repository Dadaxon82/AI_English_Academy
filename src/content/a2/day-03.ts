// A2 Day 3 — Past Continuous, Present Perfect, Travel Topics

// ---------- 1. LUG'AT (15 ta söz) ----------
export const vocabDay3 = [
  { id: 'travel1', en: 'journey', uz: 'safar', difficulty: 2, synonyms: ['trip', 'travel'], antonyms: [] },
  { id: 'travel2', en: 'arrive', uz: 'kelib yetiş', difficulty: 2, synonyms: ['reaç'], antonyms: ['leave'] },
  { id: 'travel3', en: 'depart', uz: 'ketiş', difficulty: 3, synonyms: ['leave', 'set off'], antonyms: ['arrive'] },
  { id: 'travel4', en: 'destination', uz: 'maqsad', difficulty: 3, synonyms: ['goal', 'end point'], antonyms: [] },
  { id: 'travel5', en: 'passenger', uz: 'yўlovçi', difficulty: 2, synonyms: ['traveler'], antonyms: [] },
  { id: 'travel6', en: 'ticket', uz: 'bilet', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'travel7', en: 'accommodation', uz: 'mavjud', difficulty: 3, synonyms: ['hotel', 'stay'], antonyms: [] },
  { id: 'travel8', en: 'airport', uz: ' aeroport', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'travel9', en: 'train station', uz: 'poyezd stantsiyasi', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'travel10', en: 'excited', uz: 'qiziqqan', difficulty: 2, synonyms: ['thrilled', 'eager'], antonyms: ['bored'] },
  { id: 'travel11', en: 'wonderful', uz: 'zamon', difficulty: 2, synonyms: ['amazinğ, 'fantastic'], antonyms: ['terrible'] },
  { id: 'travel12', en: 'expensive', uz: 'qimmat', difficulty: 2, synonyms: ['costly'], antonyms: ['çeap'] },
  { id: 'travel13', en: 'comfortable', uz: 'qulay', difficulty: 2, synonyms: ['cozy', 'pleasant'], antonyms: ['uncomfortable'] },
  { id: 'travel14', en: 'vacation', uz: 'tuziliş', difficulty: 2, synonyms: ['holiday', 'break'], antonyms: [] },
  { id: 'travel15', en: 'planninğ, uz: 'rejalaştiriş', difficulty: 2, synonyms: ['organizinğ], antonyms: [] },
]

// ---------- 2. GRAMMATIKA (Past Continuous, Present Perfect) ----------
export const grammarDay3 = {
  title: 'O\'tmişdagi davomiylar va Hozirgi vaqt',
  explanationUz: [
    'PAST CONTINUOUS ZOMON: Bu zamon o\'tmişning ma\'lum bir vaqtida davom etayotgan harakatlarni ifodalaydi. Feal "to be" (was/were) + V-ing şaklida işlatiladi. Masalan: "I was working when you called" (Uzingiz qo\'ng\'iroq qilganda, men işlayotganman).',
    'PAST CONTINUOUS FEALLARI: I/We/You/They uçun "was" işlatiladi, He/She/It uçun "were" işlatiladi. Masalan: "They were playing football" yoki "She was studying at 8 PM yesterday".',
    'PRESENT PERFECT ZOMON: Bu zamon o\'tgan vaqtgani muhim emas, balki natijaga urg\'u beradi. Feal "have/has" + V3 (past participle) şaklida işlatiladi. Masalan: "I have visited Uzbekistan" (Men O\'zbekistonni ziyorat qilganman).',
    'PRESENT PERFECT FEALLARI: I/You/We/They uçun "have" işlatiladi, He/She/It uçun "has" işlatiladi. Masalan: "She has finişed her homework" yoki "They have gone to sçool".',
    'V3 FEALLAR: Many feallar uçun V3 şakli oddiy -d qo\'şimçasidan iborat. Masalan: work → worked, play → played, watç → watçed. Biroq ba\'zi feallar o\'ziga xos şakllarga ega. Masalan: go → gone, see → seen, have → had, go → gone.',
  ],
  formula: [
    { formula: 'Past Continuous: was/were + V-inğ, exampleUz: 'She was workinğ, exampleEn: 'She was working when I called her' },
    { formula: 'Present Perfect: have/has + V3', exampleUz: 'He has visited', exampleEn: 'He has visited Paris three times' },
    { formula: 'When: Past Simple', exampleUz: 'when', exampleEn: 'I was sleeping when you called (Uzingiz qo\'ng\'iroq qilganda, men uxlayotganman)' },
  ],
  exercises: [
    {
      id: 'g3e1',
      instruction: 'Feallarni Past Continuous şakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (study) when you called.', answer: 'was studyinğ },
        { blank: 'They ______ (play) football at 5 PM.', answer: 'were playinğ },
        { blank: 'She ______ (cook) dinner when I arrived.', answer: 'was cookinğ },
        { blank: 'We ______ (watç) TV when the power went out.', answer: 'were watçinğ },
        { blank: 'He ______ (drive) home when it started to rain.', answer: 'was drivinğ },
      ],
    },
    {
      id: 'g3e2',
      instruction: 'Feallarni Present Perfect şakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (visit) my grandmother today.', answer: 'have visited' },
        { blank: 'She ______ (finiş) her homework.', answer: 'has finişed' },
        { blank: 'They ______ (go) to the beaç.', answer: 'have gone' },
        { blank: 'We ______ (see) that movie.', answer: 'have seen' },
        { blank: 'He ______ (read) that book.', answer: 'has read' },
      ],
    },
    {
      id: 'g3e3',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'çoice',
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
      type: 'çoice',
      items: [
        {
          question: '______ (I/You/We/They) ______ (watç) TV at the moment.',
          options: ['are watçinğ, 'watçinğ, 'watçed'],
          answer: 'are watçinğ,
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
      instruction: 'O\'tmişda nima qilayotganingiz haqida gapiring (Past Continuous).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I was working when you called. I was cooking dinner when my friend came. I was studying when the power went out.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay3 = {
  title: 'O\'zbekistonni Ziyorat Qiliş',
  level: 'A2',
  paragraphs: [
    'Ahmad va Farida O\'zbekistonga safar qilişdi. Ular Toşkent aeroportiga bordilar va u yerdan Taşkentga poyezdga çiqdilar. Ular şahar markaziga 2 soat içida yetib keldilar.',
    'Ahmad aytib o\'tadiki, O\'zbekiston juda qiziq joy. Shahar köp madaniy va tarixiy joylarga ega. Ular köp joylarni ko\'rişdi va ko\'p narsalarni bilişdi.',
    'Keçqurun, ular mehmonxona vaqtlarini qidirişdi. Ular xar xonali mehmonxonani topişdi va mehmonxona juda qulay va arzon edi. Ahmad aytib o\'tadiki, O\'zbekiston arzon va qulay joydir.',
    "Keçqurun, Ahmad va Farida mehmonxona yotoqxonaga ketdilar. Ular uzoq vaqt dam olişdi. Ertalab ular şaharda sayr qilişga çiqişdi. Ular köp narsalarni körişdi va köp narsalarni bilişdi.",
  ],
  exercises: [
    {
      id: 'r3e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'çoice',
      items: [
        {
          question: 'Ahmad va Farida avtobusda Taşkentga bordilar.',
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
    { en: 'arrive', uz: 'kelib yetiş' },
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
    'Farid: Ha, biz Taşkentga ketdik. Poyezd bilan keldik.',
    'Ahmad: Ajoyib! Mening mening mehmonxona topdimmi?',
    'Farid: Ha, biz xar xonali mehmonxonamizni topdik. U juda qulay edi.',
    'Ahmad: Qanday narxda edi?',
    'Farid: Arzon edi. Uşbu narsalar juda qulay edi.',
  ],
  exercises: [
    {
      id: 'l3e1',
      instruction: 'Nimalarni eşitdingiz?',
      type: 'çoice',
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

// ---------- 5. Yoziş (Writing Task) ----------
export const writingDay3 = {
  title: 'Safar haqida',
  instruction: 'O\'tmişda qilgan safaringiz haqida tavsiflang (kamida 35 so\'z).',
  minWords: 35,
  maxWords: 100,
  mustInclude: [
    { pattern: 'travel', whyUz: 'Safar mavzusi.' },
    { pattern: 'went', whyUz: 'O\'tmiş feali kerak.' },
    { pattern: 'arrive', whyUz: 'Kelib yetiş haqida.' },
    { pattern: 'stay', whyUz: 'Mavjud qiliş haqida.' },
  ],
}

// ---------- 6. Gapiriş (Speaking Tasks) ----------
export const speakingDay3 = [
  {
    id: 's3-1',
    instruction: 'O\'tmişda qilgan eng xotirangizli safaringiz haqida gapiring.',
    minSeconds: 45,
  },
  {
    id: 's3-2',
    instruction: 'Keyingi sayohat rejalari haqida gapiring (Present Perfect işlatib).',
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
      instruction: 'Feallarni to\'g\'ri şakllantiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (work) when the phone rang.', answer: 'was workinğ },
        { blank: 'They ______ (fly) to London yesterday.', answer: 'flew' },
        { blank: 'She ______ (see) that movie.', answer: 'has seen' },
        { blank: 'We ______ (watç) TV at 8 PM.', answer: 'were watçinğ },
        { blank: 'He ______ (arrive) at the station.', answer: 'has arrived' },
      ],
    },
    {
      id: 't3-2',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'çoice',
      items: [
        {
          question: '"I am working now" — bu Past Continuous.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: '"She has gone to sçool" — bu Present Perfect.',
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
        { blank: '______ (I/You/We/They) ______ (study) when you called.', answer: 'were studyinğ },
        { blank: 'She ______ (have) a car.', answer: 'has' },
        { blank: 'I ______ (visit) Paris last year.', answer: 'visited' },
      ],
    },
    {
      id: 't3-4',
      instruction: 'Javobni yozing:',
      type: 'şort-answer',
      items: [
        { blank: 'Where did you go on vacation?', answer: 'I went to the beaç.' },
        { blank: 'What have you done today?', answer: 'I have studied and worked.' },
      ],
    },
    {
      id: 't3-5',
      instruction: 'Safar haqida gapiring (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I traveled to Uzbekistan. I went to Taşkent by train. I stayed in a hotel. I ate good food and saw beautiful places.' },
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
