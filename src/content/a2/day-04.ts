// A2 Day 4 — Future Forms (Will, Going to, Future Continuous), Hobbies and Interests

// ---------- 1. LUG'AT (15 ta so'z) ----------
export const vocabDay4 = [
  { id: 'hobby1', en: 'hobby', uz: 'hobi', difficulty: 1, synonyms: ['pastime', 'interest'], antonyms: [] },
  { id: 'hobby2', en: 'painting', uz: 'rusum', difficulty: 2, synonyms: ['art', 'drawing'], antonyms: [] },
  { id: 'hobby3', en: 'collecting', uz: 'to\'plamoq', difficulty: 2, synonyms: [], antonyms: [] },
  { id: 'hobby4', en: 'reading', uz: 'kitob o\'qish', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby5', en: 'cooking', uz: 'xomir pishirish', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby6', en: 'gardening', uz: 'bog\'dorligi', difficulty: 2, synonyms: ['growing plants'], antonyms: [] },
  { id: 'hobby7', en: 'swimming', uz: 'yuzish', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby8', en: 'dancing', uz: 'raqsga tushish', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby9', en: 'music', uz: 'muzika', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby10', en: 'sports', uz: 'sport', difficulty: 1, synonyms: ['games'], antonyms: [] },
  { id: 'hobby11', en: 'future', uz: 'kelajak', difficulty: 2, synonyms: [], antonyms: ['past'] },
  { id: 'hobby12', en: 'planning', uz: 'rejalashtirish', difficulty: 2, synonyms: ['organizing'], antonyms: [] },
  { id: 'hobby13', en: 'enjoy', uz: 'iyish', difficulty: 2, synonyms: ['love', 'like'], antonyms: ['dislike'] },
  { id: 'hobby14', en: 'favourite', uz: 'eng yoqtirgan', difficulty: 2, synonyms: ['favorite', 'most liked'], antonyms: [] },
  { id: 'hobby15', en: 'challenge', uz: 'qiyinchilik', difficulty: 3, synonyms: ['difficulty', 'test'], antonyms: [] },
]

// ---------- 2. GRAMMATIKA (Future Forms: Will, Going to, Future Continuous) ----------
export const grammarDay4 = {
  title: 'Kelajak vaqtlar: Will, Going to, Future Continuous',
  explanationUz: [
    'FUTURE WITH WILL: Bu zamon sponton harakatlarni, va'dalarni, va bashoratlarni ifodalaydi. Feal "will" + V1 (asosiy feal) shaklida ishlatiladi. Masalan: "I will call you later" (Men sizga keyinroq qo\'ng\'iroq qilaman).',
    'WILL FEALLARI: Will barcha shaxslar uchun bir xil. I, You, We, They, He, She, It uchun hammasi "will" ishlatiladi. Manfiy: "I will not" (yoki "I won't")',
    'GOING TO: Bu zamon rejalashtirilgan harakatlarni va oldindan ko'rilgan voqealarni ifodalaydi. Feal "am/is/are + going to" + V1 shaklida ishlatiladi. Masalan: "I am going to visit my friend" (Men do'stimga boraman — reja tayyor).',
    'GOING TO FEALLARI: I/You/We/They uchun "am/is/are" ishlatiladi. I — am, You/We/They — are, He/She/It — is. Masalan: "She is going to study" yoki "They are going to travel".',
    'FUTURE CONTINUOUS ZOMON: Bu zamon kelajakning ma\'lum vaqtida davom etayotgan harakatlarni ifodalaydi. Feal "will be + V-ing" shaklida ishlatiladi. Masalan: "I will be working at 9 AM tomorrow" (Ertab 9 soatda men ishlayotganman).',
  ],
  formula: [
    { formula: 'Will: will + V1', exampleUz: 'I will call', exampleEn: 'I will call you later' },
    { formula: 'Going to: am/is/are + going to + V1', exampleUz: 'She is going to visit', exampleEn: 'She is going to visit her grandmother' },
    { formula: 'Future Continuous: will be + V-ing', exampleUz: 'I will be working', exampleEn: 'I will be working at 9 AM tomorrow' },
  ],
  exercises: [
    {
      id: 'g4e1',
      instruction: 'Will yoki Going to bilan to\'ldiring:',
      type: 'choice',
      items: [
        {
          question: 'I ______ (visit) my friend tomorrow. (rejalashtirilgan)',
          options: ['will visit', 'am going to visit', 'will be visiting'],
          answer: 'am going to visit',
        },
        {
          question: 'I think it ______ (rain) later.',
          options: ['is going to rain', 'will rain', 'will be raining'],
          answer: 'will rain',
        },
        {
          question: '______ (You/We/They) ______ (help) me, please.',
          options: ['Will you', 'Are you going to', 'Will you be'],
          answer: 'Will you',
        },
      ],
    },
    {
      id: 'g4e2',
      instruction: 'Feallarni kelajak shakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (call) you tomorrow.', answer: 'will call' },
        { blank: 'She ______ (study) for the exam.', answer: 'is going to study' },
        { blank: 'They ______ (travel) next month.', answer: 'are going to travel' },
        { blank: 'He ______ (work) at 10 AM tomorrow.', answer: 'will be working' },
        { blank: 'We ______ (watch) a movie tonight.', answer: 'will watch' },
      ],
    },
    {
      id: 'g4e3',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: '"I will visit you" — bu rejalashtirilgan harakat.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: '"I am going to study" — bu kelajak zamon.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: '"I will be working" — bu Future Continuous zamon.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
    {
      id: 'g4e4',
      instruction: 'Jumlani to\'ldiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (love) music.', answer: 'will love' },
        { blank: 'She ______ (cook) dinner tonight.', answer: 'is going to cook' },
        { blank: 'They ______ (play) football at 5 PM.', answer: 'will be playing' },
      ],
    },
    {
      id: 'g4e5',
      instruction: 'Kelajak rejalaringiz haqida gapiring (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I will travel to another country next year. I am going to learn a new skill. I will be working at 9 AM tomorrow. I am going to visit my parents. I will be watching TV in the evening.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay4 = {
  title: 'Hobi va Kelajak',
  level: 'A2',
  paragraphs: [
    'Ahmadning eng yoqtirgan hobisi rasm chizish. U har kuni soat 4 dan 6 gacha rasmlarni chizadi. Ahmad aytadiki, rasm chizish juda qiziqarli va u ko\'p vaqtni o\'tkaadi.',
    "Farida esa xomir qilishni yoqtiradi. U har kuni kecha uyda xomir qiladi. U aytib o\'tadiki, xomir qilish juda qulay va arzon. U yangi retseptlarni o\'rganmoqda.",
    'Ahmad va Farida har ikkalari ham sport bilan shug\'ullanadilar. Ahmad yuzishni va Farida esa raqsga tushishni yoqtiradi. Ular har kuni dam olish uchun sport zallarga boradilar.',
    'Ertaga, Ahmad va Farida kelajak rejalari haqida gaplashishadilar. Ahmad aytadiki, u O\'zbekistondan chiqmoqchi va boshqa mamlakatga safar qilmoqchi. Farida esa aytadiki, u yozgi tuzilishda do\'stlarini ko\'rish uchun kelajakda boshqa shaharga boradi.',
  ],
  exercises: [
    {
      id: 'r4e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: 'Ahmad rasm chizishni yoqtiradi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Farida sport qiladi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Farida raqsga tushishni yoqtiradi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
  ],
  glossary: [
    { en: 'hobby', uz: 'hobi' },
    { en: 'painting', uz: 'rusum' },
    { en: 'collecting', uz: 'to\'plamoq' },
    { en: 'reading', uz: 'kitob o\'qish' },
    { en: 'cooking', uz: 'xomir pishirish' },
    { en: 'future', uz: 'kelajak' },
    { en: 'enjoy', uz: 'iyish' },
    { en: 'favourite', uz: 'eng yoqtirgan' },
  ],
}

// ---------- 4. ESHITISH (Listening Task) ----------
export const listeningDay4 = {
  title: 'Hobbies and Future Plans',
  level: 'A2',
  audio: {
    src: '/audio/a2/listening-day-4.mp3',
    duration: 300,
  },
  transcript: [
    'Ahmad: Salom! Nima yangi?',
    'Farida: Salom! Men yangi hobi topdim. Men yozishni yoqtiraman.',
    'Ahmad: Ajoyib! Men ham o\'qishni yoqtiraman.',
    'Farida: Ha, kitob o\'qish juda qiziqarli.',
    'Ahmad: Kelajakda nima qilasiz?',
    'Farida: Men kelajakda yozuvchi bo\'laman. Men kitob yozishni rejalashtiryapman.',
  ],
  exercises: [
    {
      id: 'l4e1',
      instruction: 'Nimalarni eshitdingiz?',
      type: 'choice',
      items: [
        {
          question: 'Farida nima yoqtiradi?',
          options: ['Yozish', 'Rasm chizish', 'Xomir qilish'],
          answer: 'Yozish',
        },
        {
          question: 'Farida kelajakda nima bo\'lishni rejalashtirapti?',
          options: ['Yozuvchi', 'Rasmchi', 'Xomirchi'],
          answer: 'Yozuvchi',
        },
      ],
    },
  ],
}

// ---------- 5. Yozish (Writing Task) ----------
export const writingDay4 = {
  title: 'Hobilar va Kelajak',
  instruction: 'O\'zingizning hobilar haqida va kelajakdagi rejalaringiz haqida gapiring (kamida 40 so\'z).',
  minWords: 40,
  maxWords: 120,
  mustInclude: [
    { pattern: 'hobby', whyUz: 'Hobi mavzusi.' },
    { pattern: 'will', whyUz: 'Kelajak zamon ishlatish.' },
    { pattern: 'going to', whyUz: 'Rejalashtirilgan harakat.' },
    { pattern: 'enjoy', whyUz: 'Iyish feali kerak.' },
  ],
}

// ---------- 6. Gapirish (Speaking Tasks) ----------
export const speakingDay4 = [
  {
    id: 's4-1',
    instruction: 'O\'zingizning hobilar haqida gapiring (nimalarni qilasiz, nima uchun yoqtirasiz).',
    minSeconds: 45,
  },
  {
    id: 's4-2',
    instruction: 'Kelajakdagi rejalaringiz haqida gapiring (will va going to ishlatib).',
    minSeconds: 45,
  },
  {
    id: 's4-3',
    instruction: 'Do\'stingiz bilan kelajakdagi rejalaringizni taqqoslang.',
    minSeconds: 45,
  },
]

// ---------- 7. BAHOLASH TESTI (Section Test) ----------
export const testDay4 = {
  title: 'Kelajak Zamonlar',
  passScore: 2,
  exercises: [
    {
      id: 't4-1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: '"I will visit you" — bu sponton va\'da.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: '"I am going to study" — bu rejalashtirilgan harakat.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: '"I will be working" — bu Future Continuous.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
    {
      id: 't4-2',
      instruction: 'Feallarni kelajak shakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (call) you later.', answer: 'will call' },
        { blank: 'She ______ (study) for the exam.', answer: 'is going to study' },
        { blank: 'They ______ (travel) next month.', answer: 'are going to travel' },
        { blank: 'He ______ (work) at 10 AM tomorrow.', answer: 'will be working' },
        { blank: 'We ______ (watch) a movie tonight.', answer: 'will watch' },
      ],
    },
    {
      id: 't4-3',
      instruction: 'Jumlani to\'ldiring:',
      type: 'choice',
      items: [
        {
          question: 'I think it ______ (rain) later.',
          options: ['will rain', 'is going to rain', 'will be raining'],
          answer: 'will rain',
        },
        {
          question: '______ (You/We/They) ______ (help) me, please.',
          options: ['Will you', 'Are you going to', 'Will you be'],
          answer: 'Will you',
        },
      ],
    },
    {
      id: 't4-4',
      instruction: 'Javobni yozing:',
      type: 'short-answer',
      items: [
        { blank: 'What is your hobby?', answer: 'My hobby is painting.' },
        { blank: 'What will you do tomorrow?', answer: 'I will study and work.' },
      ],
    },
    {
      id: 't4-5',
      instruction: 'Kelajakdagi rejalaringiz haqida gapiring (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I will travel to another country next year. I am going to learn a new skill. I will be working at 9 AM tomorrow. I am going to visit my parents. I will be watching TV in the evening.' },
      ],
    },
  ],
}

// ---------- Eksportlar ----------
export const day4 = {
  vocab: vocabDay4,
  grammar: grammarDay4,
  reading: readingDay4,
  listening: listeningDay4,
  writing: writingDay4,
  speaking: speakingDay4,
  test: testDay4,
}
export { vocabDay4, grammarDay4, readingDay4, listeningDay4, writingDay4, speakingDay4, testDay4 }
