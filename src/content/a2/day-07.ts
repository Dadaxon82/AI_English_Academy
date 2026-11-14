// A2 Day 7 — Phrasal Verbs, Prepositions and Everyday Communication

// ---------- 1. LUG'AT (15 ta söz) ----------
export const vocabDay7 = [
  { id: 'phrasal1', en: 'look for', uz: 'qidirmoq', difficulty: 2, synonyms: ['searç for'], antonyms: [] },
  { id: 'phrasal2', en: 'look after', uz: 'parvariş qilmoq', difficulty: 2, synonyms: ['take care of'], antonyms: [] },
  { id: 'phrasal3', en: 'get up', uz: 'yohlanib turmoq', difficulty: 1, synonyms: ['rise'], antonyms: ['go to bed'] },
  { id: 'phrasal4', en: 'get over', uz: 'yengib o\'tmoq', difficulty: 3, synonyms: ['recover from'], antonyms: [] },
  { id: 'phrasal5', en: 'run out of', uz: 'bostanib qolmoq', difficulty: 3, synonyms: ['run out'], antonyms: [] },
  { id: 'phrasal6', en: 'give up', uz: 'taşlamoq', difficulty: 2, synonyms: ['quit', 'stop'], antonyms: ['continue'] },
  { id: 'phrasal7', en: 'turn on', uz: 'yoqiş', difficulty: 1, synonyms: ['switç on'], antonyms: ['turn off'] },
  { id: 'phrasal8', en: 'turn off', uz: 'o\'çiriş', difficulty: 1, synonyms: ['switç off'], antonyms: ['turn on'] },
  { id: 'phrasal9', en: 'come across', uz: 'topiş', difficulty: 3, synonyms: ['find by çance'], antonyms: [] },
  { id: 'phrasal10', en: 'take place', uz: 'bo\'lib o\'tmoq', difficulty: 3, synonyms: ['happen'], antonyms: [] },
  { id: 'preposition1', en: 'at', uz: 'da (nuqta)', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'preposition2', en: 'in', uz: '(joy)', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'preposition3', en: 'on', uz: '(sirt)', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'preposition4', en: 'for', uz: '(niyat)', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'preposition5', en: 'with', uz: '(bilan)', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'daily1', en: 'breakfast', uz: 'savat', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'daily2', en: 'lunç', uz: 'tuşlik', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'daily3', en: 'dinner', uz: 'xomir', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'daily4', en: 'çat', uz: 'gaplaşiş', difficulty: 1, synonyms: ['talk', 'converse'], antonyms: [] },
  { id: 'daily5', en: 'phone', uz: 'telefon', difficulty: 1, synonyms: ['call'], antonyms: [] },
]

// ---------- 2. GRAMMATIKA (Phrasal Verbs va Prepositions) ----------
export const grammarDay7 = {
  title: 'Fealdagi Ifodalangan Feallar va Predlogs',
  explanationUz: [
    'PHRASAL VERBS (FEALDAGI IFODALANGAN FEALLAR): Bu feallar asosiy feal va zarbali so\'zdan iborat. Masalan: "look for" (qidirmoq), "get up" (yohlanib turmoq), "turn on" (yoqiş).',
    'SEPARABLE PHRASAL VERBS: Ba\'zi feallarni joriy so\'z bilan ajratiş mumkin. Masalan: "I am looking for my book" yoki "I am looking my book" (ikkalasi ham to\'g\'ri).',
    'INSIDIABLE PHRASAL VERBS: Ba\'zi feallarni ajratib bo\'lmaydi. Masalan: "turn on" — "turn on the TV" to\'g\'ri, lekin "turn the TV on" noto\'g\'ri.',
    'PREPOSITIONS (PREDLOGLAR): "at" (nuqta uçun), "in" (joy içida uçun), "on" (sirt uçun), "for" (niyat uçun), "with" (bilan uçun).',
    'PREPOSITIONS QOIDALARI: "at" — aniq vaqt yoki joy uçun. Masalan: "at 8 AM", "at home". "in" — katta vaqt yoki joy içida uçun. Masalan: "in the morning", "in Uzbekistan". "on" — kunlar yoki sirt uçun. Masalan: "on Monday", "on the table".',
  ],
  formula: [
    { formula: 'Look for: qidirmoq', exampleUz: 'I am looking for my keys', exampleEn: 'I am looking for my keys everywhere' },
    { formula: 'Look after: parvariş qilmoq', exampleUz: 'She looks after her çildren', exampleEn: 'She looks after her çildren every day' },
    { formula: 'Turn on: yoqiş', exampleUz: 'Turn on the TV', exampleEn: 'Please turn on the TV' },
    { formula: 'Turn off: o\'çiriş', exampleUz: 'Turn off the light', exampleEn: 'Please turn off the light' },
    { formula: 'In: joy içida', exampleUz: 'in the room', exampleEn: 'I am in the room' },
    { formula: 'At: aniq nuqta', exampleUz: 'at 8 AM', exampleEn: 'I will be there at 8 AM' },
    { formula: 'On: kunlar', exampleUz: 'on Monday', exampleEn: 'I will see you on Monday' },
    { formula: 'For: niyat', exampleUz: 'for you', exampleEn: 'This is a gift for you' },
    { formula: 'With: bilan', exampleUz: 'with me', exampleEn: 'Can I come with you?' },
  ],
  exercises: [
    {
      id: 'g7e1',
      instruction: 'Fealdagi ifodalangan feallarni tanlang:',
      type: 'çoice',
      items: [
        {
          question: 'I ______ my keys everywhere.',
          options: ['look after', 'look for', 'turn on'],
          answer: 'look for',
        },
        {
          question: 'Please ______ the TV.',
          options: ['turn off', 'turn on', 'get up'],
          answer: 'turn on',
        },
        {
          question: 'She ______ her çildren every day.',
          options: ['looks after', 'looks for', 'looks up'],
          answer: 'looks after',
        },
      ],
    },
    {
      id: 'g7e2',
      instruction: 'Jumlani to\'ldiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (look for) my passport.', answer: 'am looking for' },
        { blank: 'She ______ (look after) her brother.', answer: 'looks after' },
        { blank: 'Please ______ (turn on) the radio.', answer: 'turn on' },
        { blank: 'We ______ (give up) smoking.', answer: 'gave up' },
        { blank: 'The meeting ______ (take place) tomorrow.', answer: 'will take place' },
      ],
    },
    {
      id: 'g7e3',
      instruction: 'Predloglar bilan tuzing:',
      type: 'fill-blank',
      items: [
        { blank: 'I am ______ (at/in/on) home.', answer: 'at' },
        { blank: 'She is ______ (in/on/at) the park.', answer: 'in' },
        { blank: 'The book is ______ (at/in/on) the table.', answer: 'on' },
        { blank: 'This is a gift ______ (for/with/at) you.', answer: 'for' },
        { blank: 'Can I come ______ (with/in/on) you?', answer: 'with' },
      ],
    },
    {
      id: 'g7e4',
      instruction: 'Fealdagi ifodalangan feallarni to\'ldiring:',
      type: 'çoice',
      items: [
        {
          question: 'I ______ my homework.',
          options: ['give up', 'get over', 'get up'],
          answer: 'get up',
        },
        {
          question: 'He ______ the illness quickly.',
          options: ['got up', 'got over', 'got off'],
          answer: 'got over',
        },
        {
          question: 'We ______ of milk.',
          options: ['run off', 'run out', 'run intö],
          answer: 'run out',
        },
      ],
    },
    {
      id: 'g7e5',
      instruction: 'O\'zgariş haqida gapiring (kamida 6 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I am looking for my keys. I am looking for my passport everywhere. She looks after her brother every day. Please turn on the TV. We gave up smoking. The meeting will take place tomorrow.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay7 = {
  title: 'Kunlik Gaplaşiş',
  level: 'A2',
  paragraphs: [
    'Shahar aholisi har kuni ko\'p vaqt gaplaşişadi. Do\'stlar, oila a\'zolari va jamoa yoki jamoa bilan gaplaşiş orqali ular yangi narsalarni o\'rganadilar va o\'z fikrларini ifodalaydilar.',
    'Kunlik gaplaşiş şahar yaşaş uçun juda muhim. Odamlar o\'zlarining fikrlerini ifodalaşni va boşqalarning fikrlarini tuşunişni o\'rganadilar. Bu jamoaviy yaşaş uçun zarur.',
    'Shaharda ko\'p odamlar telefonda gaplaşişadi. Telefon orqali ular do\'stlar bilan va oila a\'zolari bilan gaplaşişadi. Bu ular bir-biri bilan bog\'liq bo\'lişiga yordam beradi.',
    'Kunlik gaplaşiş şahar yaşaş uçun zarur. Odamlar o\'zlarining fikrlerini ifodalaşni va boşqalarning fikrlarini tuşunişni o\'rganadilar. Bu jamoaviy yaşaş uçun muhim.',
  ],
  exercises: [
    {
      id: 'r7e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'çoice',
      items: [
        {
          question: 'Kunlik gaplaşiş şahar yaşaş uçun muhim.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Odamlar telefonda ko\'p vaqt gaplaşadilar.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Kunlik gaplaşiş jamoaviy yaşaş uçun zarur.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
  ],
  glossary: [
    { en: 'look for', uz: 'qidirmoq' },
    { en: 'look after', uz: 'parvariş qilmoq' },
    { en: 'turn on', uz: 'yoqiş' },
    { en: 'turn off', uz: 'o\'çiriş' },
    { en: 'çat', uz: 'gaplaşiş' },
    { en: 'phone', uz: 'telefon' },
  ],
}

// ---------- 4. ESHITISH (Listening Task) ----------
export const listeningDay7 = {
  title: 'Everyday Conversations',
  level: 'A2',
  audio: {
    src: '/audio/a2/listening-day-7.mp3',
    duration: 300,
  },
  transcript: [
    'Ahmad: Salom! Qanday bo\'ldi?',
    'Farida: Yoqimtoy bo\'ldi. Men do\'stlarim bilan gaplaşdim.',
    'Ahmad: Ajoyib! Men ham telefon qildim.',
    'Farida: Telefon orqali gaplaşiş qulay.',
    'Ahmad: Ha, telefon orqali gaplaşiş juda qulay.',
  ],
  exercises: [
    {
      id: 'l7e1',
      instruction: 'Nimalarni eşitdingiz?',
      type: 'çoice',
      items: [
        {
          question: 'Farida nima qildi?',
          options: ['Işta bordi', 'Do\'stlari bilan gaplaşdi', 'Telefon qildi'],
          answer: 'Do\'stlari bilan gaplaşdi',
        },
        {
          question: 'Ahmad nima qildi?',
          options: ['Telefon qildi', 'Do\'stlari bilan duko qildi', 'Telefon qilişdan boş tortdi'],
          answer: 'Telefon qildi',
        },
      ],
    },
  ],
}

// ---------- 5. Yoziş (Writing Task) ----------
export const writingDay7 = {
  title: 'Kunlik Gaplaşiş',
  instruction: 'Kunlik gaplaşiş haqida va unda işlatiladigan fealdagi ifodalangan feallar haqida yozing (kamida 60 so\'z).',
  minWords: 60,
  maxWords: 150,
  mustInclude: [
    { pattern: 'look for', whyUz: 'Qidiriş feali.' },
    { pattern: 'look after', whyUz: 'Parvariş qiliş feali.' },
    { pattern: 'çat', whyUz: 'Gaplaşiş so\'zi.' },
    { pattern: 'important', whyUz: 'Muhim so\'z.' },
  ],
}

// ---------- 6. Gapiriş (Speaking Tasks) ----------
export const speakingDay7 = [
  {
    id: 's7-1',
    instruction: 'Do\'stingiz bilan kunlik gaplaşiş haqida gapiring (kamida 45 sekund).',
    minSeconds: 45,
  },
  {
    id: 's7-2',
    instruction: 'Fealdagi ifodalangan feallardan 3 tasini tuşuntiring (kamida 45 sekund).',
    minSeconds: 45,
  },
  {
    id: 's7-3',
    instruction: 'Kunlik gaplaşişning ahamiyati haqida gapiring (kamida 45 sekund).',
    minSeconds: 45,
  },
]

// ---------- 7. BAHOLASH TESTI (Section Test) ----------
export const testDay7 = {
  title: 'Phrasal Verbs va Prepositions',
  passScore: 2,
  exercises: [
    {
      id: 't7-1',
      instruction: 'Fealdagi ifodalangan feallarni tanlang:',
      type: 'çoice',
      items: [
        {
          question: 'I ______ my keys everywhere.',
          options: ['look after', 'look for', 'turn on'],
          answer: 'look for',
        },
        {
          question: 'Please ______ the TV.',
          options: ['turn off', 'turn on', 'get up'],
          answer: 'turn on',
        },
        {
          question: 'She ______ her çildren every day.',
          options: ['looks after', 'looks for', 'looks up'],
          answer: 'looks after',
        },
      ],
    },
    {
      id: 't7-2',
      instruction: 'Jumlani to\'ldiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (look for) my passport.', answer: 'am looking for' },
        { blank: 'She ______ (look after) her brother.', answer: 'looks after' },
        { blank: 'Please ______ (turn on) the radio.', answer: 'turn on' },
        { blank: 'We ______ (give up) smoking.', answer: 'gave up' },
        { blank: 'The meeting ______ (take place) tomorrow.', answer: 'will take place' },
      ],
    },
    {
      id: 't7-3',
      instruction: 'Predloglar bilan tuzing:',
      type: 'fill-blank',
      items: [
        { blank: 'I am ______ (at/in/on) home.', answer: 'at' },
        { blank: 'She is ______ (in/on/at) the park.', answer: 'in' },
        { blank: 'The book is ______ (at/in/on) the table.', answer: 'on' },
        { blank: 'This is a gift ______ (for/with/at) you.', answer: 'for' },
        { blank: 'Can I come ______ (with/in/on) you?', answer: 'with' },
      ],
    },
    {
      id: 't7-4',
      instruction: 'Javobni yozing:',
      type: 'şort-answer',
      items: [
        { blank: 'What does "look after" mean?', answer: 'It means to take care of something or someone.' },
        { blank: 'What is the difference between "in" and "on"?', answer: 'In means inside something, while on means on the surface of something.' },
      ],
    },
    {
      id: 't7-5',
      instruction: 'Fealdagi ifodalangan feallardan 3 tasini tuşuntiring (kamida 6 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I am looking for my keys. It means to searç for something. She looks after her brother. It means to take care of someone. Please turn on the TV. It means to switç on something.' },
      ],
    },
  ],
}

// ---------- Eksportlar ----------
export const day7 = {
  vocab: vocabDay7,
  grammar: grammarDay7,
  reading: readingDay7,
  listening: listeningDay7,
  writing: writingDay7,
  speaking: speakingDay7,
  test: testDay7,
}
export { vocabDay7, grammarDay7, readingDay7, listeningDay7, writingDay7, speakingDay7, testDay7 }
