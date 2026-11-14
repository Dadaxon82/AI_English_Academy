// A2 Day 4 — Future Forms (Will, Going to, Future Continuous), Hobbies and Interests

// ---------- 1. LUG'AT (15 ta söz) ----------
export const vocabDay4 = [
  { id: 'hobby1', en: 'hobby', uz: 'hobi', difficulty: 1, synonyms: ['pastime', 'interest'], antonyms: [] },
  { id: 'hobby2', en: 'paintinğ, uz: 'rusum', difficulty: 2, synonyms: ['art', 'drawinğ], antonyms: [] },
  { id: 'hobby3', en: 'collectinğ, uz: 'to\'plamoq', difficulty: 2, synonyms: [], antonyms: [] },
  { id: 'hobby4', en: 'readinğ, uz: 'kitob o\'qiş', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby5', en: 'cookinğ, uz: 'xomir pişiriş', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby6', en: 'gardeninğ, uz: 'bog\'dorligi', difficulty: 2, synonyms: ['growing plants'], antonyms: [] },
  { id: 'hobby7', en: 'swimminğ, uz: 'yuziş', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby8', en: 'dancinğ, uz: 'raqsga tuşiş', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby9', en: 'music', uz: 'muzika', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'hobby10', en: 'sports', uz: 'sport', difficulty: 1, synonyms: ['games'], antonyms: [] },
  { id: 'hobby11', en: 'future', uz: 'kelajak', difficulty: 2, synonyms: [], antonyms: ['past'] },
  { id: 'hobby12', en: 'planninğ, uz: 'rejalaştiriş', difficulty: 2, synonyms: ['organizinğ], antonyms: [] },
  { id: 'hobby13', en: 'enjoy', uz: 'iyiş', difficulty: 2, synonyms: ['love', 'like'], antonyms: ['dislike'] },
  { id: 'hobby14', en: 'favourite', uz: 'eng yoqtirgan', difficulty: 2, synonyms: ['favorite', 'most liked'], antonyms: [] },
  { id: 'hobby15', en: 'çallenge', uz: 'qiyinçilik', difficulty: 3, synonyms: ['difficulty', 'test'], antonyms: [] },
]

// ---------- 2. GRAMMATIKA (Future Forms: Will, Going to, Future Continuous) ----------
export const grammarDay4 = {
  title: 'Kelajak vaqtlar: Will, Going to, Future Continuous',
  explanationUz: [
    'FUTURE WITH WILL: Bu zamon sponton harakatlarni, va'dalarni, va başoratlarni ifodalaydi. Feal "will" + V1 (asosiy feal) şaklida işlatiladi. Masalan: "I will call you later" (Men sizga keyinroq qo\'ng\'iroq qilaman).',
    'WILL FEALLARI: Will barça şaxslar uçun bir xil. I, You, We, They, He, She, It uçun hammasi "will" işlatiladi. Manfiy: "I will not" (yoki "I won't")',
    'GOING TO: Bu zamon rejalaştirilgan harakatlarni va oldindan körilgan voqealarni ifodalaydi. Feal "am/is/are + going to" + V1 şaklida işlatiladi. Masalan: "I am going to visit my friend" (Men döstimga boraman — reja tayyor).',
    'GOING TO FEALLARI: I/You/We/They uçun "am/is/are" işlatiladi. I — am, You/We/They — are, He/She/It — is. Masalan: "She is going to study" yoki "They are going to travel".',
    'FUTURE CONTINUOUS ZOMON: Bu zamon kelajakning ma\'lum vaqtida davom etayotgan harakatlarni ifodalaydi. Feal "will be + V-ing" şaklida işlatiladi. Masalan: "I will be working at 9 AM tomorrow" (Ertab 9 soatda men işlayotganman).',
  ],
  formula: [
    { formula: 'Will: will + V1', exampleUz: 'I will call', exampleEn: 'I will call you later' },
    { formula: 'Going to: am/is/are + going to + V1', exampleUz: 'She is going to visit', exampleEn: 'She is going to visit her grandmother' },
    { formula: 'Future Continuous: will be + V-inğ, exampleUz: 'I will be workinğ, exampleEn: 'I will be working at 9 AM tomorrow' },
  ],
  exercises: [
    {
      id: 'g4e1',
      instruction: 'Will yoki Going to bilan to\'ldiring:',
      type: 'çoice',
      items: [
        {
          question: 'I ______ (visit) my friend tomorrow. (rejalaştirilgan)',
          options: ['will visit', 'am going to visit', 'will be visitinğ],
          answer: 'am going to visit',
        },
        {
          question: 'I think it ______ (rain) later.',
          options: ['is going to rain', 'will rain', 'will be raininğ],
          answer: 'will rain',
        },
        {
          question: '______ (You/We/They) ______ (help) me, please.',
          options: ['Will you', 'Are you going tö, 'Will you be'],
          answer: 'Will you',
        },
      ],
    },
    {
      id: 'g4e2',
      instruction: 'Feallarni kelajak şakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (call) you tomorrow.', answer: 'will call' },
        { blank: 'She ______ (study) for the exam.', answer: 'is going to study' },
        { blank: 'They ______ (travel) next month.', answer: 'are going to travel' },
        { blank: 'He ______ (work) at 10 AM tomorrow.', answer: 'will be workinğ },
        { blank: 'We ______ (watç) a movie tonight.', answer: 'will watç' },
      ],
    },
    {
      id: 'g4e3',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'çoice',
      items: [
        {
          question: '"I will visit you" — bu rejalaştirilgan harakat.',
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
        { blank: 'They ______ (play) football at 5 PM.', answer: 'will be playinğ },
      ],
    },
    {
      id: 'g4e5',
      instruction: 'Kelajak rejalaringiz haqida gapiring (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I will travel to another country next year. I am going to learn a new skill. I will be working at 9 AM tomorrow. I am going to visit my parents. I will be watçing TV in the evening.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay4 = {
  title: 'Hobi va Kelajak',
  level: 'A2',
  paragraphs: [
    'Ahmadning eng yoqtirgan hobisi rasm çiziş. U har kuni soat 4 dan 6 gaça rasmlarni çizadi. Ahmad aytadiki, rasm çiziş juda qiziqarli va u ko\'p vaqtni o\'tkaadi.',
    "Farida esa xomir qilişni yoqtiradi. U har kuni keça uyda xomir qiladi. U aytib o\'tadiki, xomir qiliş juda qulay va arzon. U yangi retseptlarni o\'rganmoqda.",
    'Ahmad va Farida har ikkalari ham sport bilan şug\'ullanadilar. Ahmad yuzişni va Farida esa raqsga tuşişni yoqtiradi. Ular har kuni dam oliş uçun sport zallarga boradilar.',
    'Ertaga, Ahmad va Farida kelajak rejalari haqida gaplaşişadilar. Ahmad aytadiki, u O\'zbekistondan çiqmoqçi va boşqa mamlakatga safar qilmoqçi. Farida esa aytadiki, u yozgi tuzilişda do\'stlarini ko\'riş uçun kelajakda boşqa şaharga boradi.',
  ],
  exercises: [
    {
      id: 'r4e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'çoice',
      items: [
        {
          question: 'Ahmad rasm çizişni yoqtiradi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Farida sport qiladi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Farida raqsga tuşişni yoqtiradi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
  ],
  glossary: [
    { en: 'hobby', uz: 'hobi' },
    { en: 'paintinğ, uz: 'rusum' },
    { en: 'collectinğ, uz: 'to\'plamoq' },
    { en: 'readinğ, uz: 'kitob o\'qiş' },
    { en: 'cookinğ, uz: 'xomir pişiriş' },
    { en: 'future', uz: 'kelajak' },
    { en: 'enjoy', uz: 'iyiş' },
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
    'Farida: Salom! Men yangi hobi topdim. Men yozişni yoqtiraman.',
    'Ahmad: Ajoyib! Men ham o\'qişni yoqtiraman.',
    'Farida: Ha, kitob o\'qiş juda qiziqarli.',
    'Ahmad: Kelajakda nima qilasiz?',
    'Farida: Men kelajakda yozuvçi bo\'laman. Men kitob yozişni rejalaştiryapman.',
  ],
  exercises: [
    {
      id: 'l4e1',
      instruction: 'Nimalarni eşitdingiz?',
      type: 'çoice',
      items: [
        {
          question: 'Farida nima yoqtiradi?',
          options: ['Yoziş', 'Rasm çiziş', 'Xomir qiliş'],
          answer: 'Yoziş',
        },
        {
          question: 'Farida kelajakda nima bo\'lişni rejalaştirapti?',
          options: ['Yozuvçi', 'Rasmçi', 'Xomirçi'],
          answer: 'Yozuvçi',
        },
      ],
    },
  ],
}

// ---------- 5. Yoziş (Writing Task) ----------
export const writingDay4 = {
  title: 'Hobilar va Kelajak',
  instruction: 'O\'zingizning hobilar haqida va kelajakdagi rejalaringiz haqida gapiring (kamida 40 so\'z).',
  minWords: 40,
  maxWords: 120,
  mustInclude: [
    { pattern: 'hobby', whyUz: 'Hobi mavzusi.' },
    { pattern: 'will', whyUz: 'Kelajak zamon işlatiş.' },
    { pattern: 'going tö, whyUz: 'Rejalaştirilgan harakat.' },
    { pattern: 'enjoy', whyUz: 'Iyiş feali kerak.' },
  ],
}

// ---------- 6. Gapiriş (Speaking Tasks) ----------
export const speakingDay4 = [
  {
    id: 's4-1',
    instruction: 'O\'zingizning hobilar haqida gapiring (nimalarni qilasiz, nima uçun yoqtirasiz).',
    minSeconds: 45,
  },
  {
    id: 's4-2',
    instruction: 'Kelajakdagi rejalaringiz haqida gapiring (will va going to işlatib).',
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
      type: 'çoice',
      items: [
        {
          question: '"I will visit you" — bu sponton va\'da.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: '"I am going to study" — bu rejalaştirilgan harakat.',
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
      instruction: 'Feallarni kelajak şakliga o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (call) you later.', answer: 'will call' },
        { blank: 'She ______ (study) for the exam.', answer: 'is going to study' },
        { blank: 'They ______ (travel) next month.', answer: 'are going to travel' },
        { blank: 'He ______ (work) at 10 AM tomorrow.', answer: 'will be workinğ },
        { blank: 'We ______ (watç) a movie tonight.', answer: 'will watç' },
      ],
    },
    {
      id: 't4-3',
      instruction: 'Jumlani to\'ldiring:',
      type: 'çoice',
      items: [
        {
          question: 'I think it ______ (rain) later.',
          options: ['will rain', 'is going to rain', 'will be raininğ],
          answer: 'will rain',
        },
        {
          question: '______ (You/We/They) ______ (help) me, please.',
          options: ['Will you', 'Are you going tö, 'Will you be'],
          answer: 'Will you',
        },
      ],
    },
    {
      id: 't4-4',
      instruction: 'Javobni yozing:',
      type: 'şort-answer',
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
        { blank: '______________________', answer: 'I will travel to another country next year. I am going to learn a new skill. I will be working at 9 AM tomorrow. I am going to visit my parents. I will be watçing TV in the evening.' },
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
