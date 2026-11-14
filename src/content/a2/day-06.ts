// A2 Day 6 — Modals (Can, Could, Should, Must), Advice and Instructions

// ---------- 1. LUG'AT (15 ta so'z) ----------
export const vocabDay6 = [
  { id: 'modal1', en: 'should', uz: 'kerak', difficulty: 2, synonyms: ['ought to'], antonyms: [] },
  { id: 'modal2', en: 'must', uz: 'majbur', difficulty: 2, synonyms: ['have to'], antonyms: [] },
  { id: 'modal3', en: 'can', uz: 'imkoniyat', difficulty: 1, synonyms: ['able to'], antonyms: [] },
  { id: 'modal4', en: 'could', uz: 'qilolish', difficulty: 2, synonyms: ['was able to'], antonyms: [] },
  { id: 'modal5', en: 'might', uz: 'mumkin', difficulty: 3, synonyms: ['may'], antonyms: [] },
  { id: 'modal6', en: 'need', uz: 'kerak', difficulty: 1, synonyms: ['require'], antonyms: [] },
  { id: 'modal7', en: 'advice', uz: 'maslahat', difficulty: 2, synonyms: ['suggestion', 'recommendation'], antonyms: [] },
  { id: 'modal8', en: 'important', uz: 'muhim', difficulty: 1, synonyms: ['significant', 'key'], antonyms: ['unimportant'] },
  { id: 'modal9', en: 'healthy', uz: 'salomat', difficulty: 2, synonyms: ['fit', 'well'], antonyms: ['unhealthy'] },
  { id: 'modal10', en: 'dangerous', uz: 'xavfli', difficulty: 2, synonyms: ['hazardous'], antonyms: ['safe'] },
  { id: 'modal11', en: 'rule', uz: 'qoida', difficulty: 2, synonyms: ['regulation', 'law'], antonyms: [] },
  { id: 'modal12', en: 'permission', uz: 'ruxsat', difficulty: 3, synonyms: ['authorization', 'consent'], antonyms: ['prohibition'] },
  { id: 'modal13', en: 'problem', uz: 'muammo', difficulty: 1, synonyms: ['issue', 'difficulty'], antonyms: [] },
  { id: 'modal14', en: 'solution', uz: 'yechim', difficulty: 2, synonyms: ['answer', 'remedy'], antonyms: [] },
  { id: 'modal15', en: 'necessary', uz: 'zarur', difficulty: 2, synonyms: ['essential', 'needed'], antonyms: ['unnecessary'] },
]

// ---------- 2. GRAMMATIKA (Modals: Can, Could, Should, Must) ----------
export const grammarDay6 = {
  title: 'Imkoniyat va Maslahat: Can, Could, Should, Must',
  explanationUz: [
    'CAN: Bu modal feal imkoniyat, ruxsat va qobiliyatni ifodalaydi. Masalan: "I can swim" (Men yuzishni bilaman - qobiliyat), "Can I open the window?" (Pernafoyil oynani ochamanmi? - so\'rov).',
    'COULD: Bu can ning o\'tmish shakli. Imkoniyat yoki maslahat berish uchun ishlatiladi. Masalan: "I could swim when I was 5" (Men 5 yoshda yuzishni bilardim), "Could you help me?" (Yordam berasizmi? - so\'rov).',
    'SHOULD: Bu maslahat berish uchun ishlatiladi. Biror narsaning to\'g\'ri yoki foydali ekanligini bildiradi. Masalan: "You should eat more vegetables" (Ko\'proq sabzavot yemesligiz kerak).',
    'MUST: Bu majburiyatni bildiradi. Biror narsa shart yoki juda muhim ekanligini anglatadi. Masalan: "You must wear a seatbelt" (Siz bitta belt kiyishingiz kerak).',
    'MODAL FEALLAR QOIDALARI: Modal feallar oxirgi "-s" qo\'shilmaydi (He/She/It uchun ham "can", emas "cans"). So\'rovda modal fealdan keyin savol belgisi ishlatiladi: "Can you swim?", "Must I go?".',
    'MASLAHAT BERISH SHAKLLARI: "Should" - o\'rta maslahat, "Must" - kuchli maslahat yoki majburiyat, "Can/Could" - imkoniyat so\'rovi.',
  ],
  formula: [
    { formula: 'Can: imkoniyat', exampleUz: 'I can swim', exampleEn: 'I can swim and ride a bike' },
    { formula: 'Could: o\'tmish imkoniyat', exampleUz: 'I could swim', exampleEn: 'I could swim when I was 5' },
    { formula: 'Should: maslahat', exampleUz: 'You should study', exampleEn: 'You should study more' },
    { formula: 'Must: majburiyat', exampleUz: 'You must go', exampleEn: 'You must wear a seatbelt' },
    { formula: 'Can/Could: so\'rov', exampleUz: 'Can you help?', exampleEn: 'Could you open the window?' },
  ],
  exercises: [
    {
      id: 'g6e1',
      instruction: 'To\'g\'ri modal feal tanlang:',
      type: 'choice',
      items: [
        {
          question: '______ you help me with my homework?',
          options: ['Can', 'Must', 'Should'],
          answer: 'Can',
        },
        {
          question: 'You ______ drink more water.',
          options: ['can', 'should', 'must'],
          answer: 'should',
        },
        {
          question: 'Students ______ wear uniforms at school.',
          options: ['can', 'should', 'must'],
          answer: 'must',
        },
      ],
    },
    {
      id: 'g6e2',
      instruction: 'Maslahat berish uchun tuzing:',
      type: 'fill-blank',
      items: [
        { blank: 'You ______ (see) a doctor.', answer: 'should see' },
        { blank: 'You ______ (not / eat) too much sugar.', answer: 'should not eat' },
        { blank: 'You ______ (not / smoke).', answer: 'must not smoke' },
        { blank: 'You ______ (exercise) more.', answer: 'should exercise' },
        { blank: 'You ______ (wear) a coat in winter.', answer: 'must wear' },
      ],
    },
    {
      id: 'g6e3',
      instruction: 'Imkoniyat haqida gapiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (speak) English.', answer: 'can speak' },
        { blank: 'I ______ (not / speak) French.', answer: 'cannot speak' },
        { blank: 'She ______ (drive) a car.', answer: 'can drive' },
        { blank: 'They ______ (not / swim).', answer: 'cannot swim' },
        { blank: 'Could you ______ (pass) me the salt?', answer: 'pass' },
      ],
    },
    {
      id: 'g6e4',
      instruction: 'Jumlani to\'ldiring:',
      type: 'fill-blank',
      items: [
        { blank: 'You ______ (not / park) here.', answer: 'must not park' },
        { blank: 'We ______ (arrive) early.', answer: 'should arrive' },
        { blank: 'He ______ (not / run) so fast.', answer: 'can\'t run' },
        { blank: 'They ______ (wear) helmets when riding bikes.', answer: 'must wear' },
        { blank: 'I ______ (cook) delicious food.', answer: 'can cook' },
      ],
    },
    {
      id: 'g6e5',
      instruction: 'Do\'stingizga maslahat bering (kamida 6 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'You should eat more vegetables. You should not eat too much sugar. You must exercise regularly. You should drink more water. You must not smoke. You should sleep enough hours.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay6 = {
  title: 'Salomat va Xavflar',
  level: 'A2',
  paragraphs: [
    'Salomatlik juda muhim. Har kuni sog\'lom yashash uchun qoidalar bo\'lishi kerak. Biz ko\'proq sabzavotlar va mevalarni yemoqchimiz. Biz kamroq shakar va qaynoq ovqatlarni yemoqchimiz.',
    'Shaharda ko\'p xavflar bor. Ko\'chalar xavflidir, shuning uchun biz avtobuslarning yurishini va xavfsizlik ehtiyotchilari ehtiyotkorlik bilan ishlatilishi kerak. Biz ko\'cha o\'rta chizig'idan o\'tishimiz kerak.',
    'Shaharda ko\'p odamlar o\'ynashni yoqtiradilar, lekin bu xavfli bo\'lishi mumkin. Biz ko\'cha o\'rta chizig'idan o\'tishimiz kerak. Avtomobillar tez yuradilar va biz xavfsizlik ehtiyotchilarini ehtiyotkorlik bilan ishlatishimiz kerak.',
    "Biz sog'liqni saqlash uchun harakat qilish kerak. Kechki tushlikda harakat qilish foydali. Biz har kuni 30 daqiqa yoki ko'proq vaqt harakat qilishimiz kerak. Bu bizning yuragimiz va boshqalarimiz uchun yaxshi.",
  ],
  exercises: [
    {
      id: 'r6e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: 'Salomatlik uchun ko\'proq sabzavotlar va mevalarni yemoq kerak.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Ko\'chalar xavfsiz joylar.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: 'Kechki tushlikda harakat qilish foydali.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
  ],
  glossary: [
    { en: 'advice', uz: 'maslahat' },
    { en: 'important', uz: 'muhim' },
    { en: 'healthy', uz: 'salomat' },
    { en: 'dangerous', uz: 'xavfli' },
    { en: 'rule', uz: 'qoida' },
    { en: 'permission', uz: 'ruxsat' },
    { en: 'necessary', uz: 'zarur' },
  ],
}

// ---------- 4. ESHITISH (Listening Task) ----------
export const listeningDay6 = {
  title: 'Advice and Instructions',
  level: 'A2',
  audio: {
    src: '/audio/a2/listening-day-6.mp3',
    duration: 300,
  },
  transcript: [
    'Ahmad: Salom! Mening muammo bor.',
    'Farida: Salom! Qanday muammo?',
    'Ahmad: Men har kuni juda ko\'p ishlayman va uxlay olmayman.',
    'Farida: Sen ko\'proq dam olish kerak. Kechqurun dam olish kerak.',
    'Ahmad: Ha, men buni qilaman. Yana nima qilishim kerak?',
    'Farida: Sen kamroq ishlash kerak va ko\'proq dam olish kerak.',
  ],
  exercises: [
    {
      id: 'l6e1',
      instruction: 'Nimalarni eshitdingiz?',
      type: 'choice',
      items: [
        {
          question: 'Ahmadning muammoni nima?',
          options: ['Ko\'p ishlash', 'Kam uxlash', 'Yomon ovqatlanish'],
          answer: 'Ko\'p ishlash',
        },
        {
          question: 'Farida nima maslahat berdi?',
          options: ['Ko\'proq ishlash', 'Ko\'proq dam olish', 'Ko\'proq yemoq'],
          answer: 'Ko\'proq dam olish',
        },
      ],
    },
  ],
}

// ---------- 5. Yozish (Writing Task) ----------
export const writingDay6 = {
  title: 'Maslahat va Qoidalar',
  instruction: 'Do\'stingizga maslahat bering yoki qoidalar ro\'yxatini yozing (kamida 50 so\'z).',
  minWords: 50,
  maxWords: 120,
  mustInclude: [
    { pattern: 'should', whyUz: 'Maslahat berish.' },
    { pattern: 'must', whyUz: 'Majburiyat.' },
    { pattern: 'can', whyUz: 'Imkoniyat.' },
    { pattern: 'important', whyUz: 'Muhim so\'z.' },
  ],
}

// ---------- 6. Gapirish (Speaking Tasks) ----------
export const speakingDay6 = [
  {
    id: 's6-1',
    instruction: 'Do\'stingizga maslahat bering (kamida 45 sekund).',
    minSeconds: 45,
  },
  {
    id: 's6-2',
    instruction: 'Xavfsizlik qoidalarini tushuntiring (kamida 45 sekund).',
    minSeconds: 45,
  },
  {
    id: 's6-3',
    instruction: 'Imkoniyatlar va cheklovlar haqida gapiring (kamida 45 sekund).',
    minSeconds: 45,
  },
]

// ---------- 7. BAHOLASH TESTI (Section Test) ----------
export const testDay6 = {
  title: 'Modals: Can, Could, Should, Must',
  passScore: 2,
  exercises: [
    {
      id: 't6-1',
      instruction: 'To\'g\'ri modal feal tanlang:',
      type: 'choice',
      items: [
        {
          question: '______ you help me with my homework?',
          options: ['Can', 'Must', 'Should'],
          answer: 'Can',
        },
        {
          question: 'You ______ drink more water.',
          options: ['can', 'should', 'must'],
          answer: 'should',
        },
        {
          question: 'Students ______ wear uniforms at school.',
          options: ['can', 'should', 'must'],
          answer: 'must',
        },
      ],
    },
    {
      id: 't6-2',
      instruction: 'Feallarni modal feallar bilan to\'ldiring:',
      type: 'fill-blank',
      items: [
        { blank: 'You ______ (see) a doctor.', answer: 'should see' },
        { blank: 'You ______ (not / eat) too much sugar.', answer: 'should not eat' },
        { blank: 'You ______ (not / smoke).', answer: 'must not smoke' },
        { blank: 'You ______ (exercise) more.', answer: 'should exercise' },
        { blank: 'You ______ (wear) a coat in winter.', answer: 'must wear' },
      ],
    },
    {
      id: 't6-3',
      instruction: 'Imkoniyat haqida gapiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (speak) English.', answer: 'can speak' },
        { blank: 'I ______ (not / speak) French.', answer: 'cannot speak' },
        { blank: 'She ______ (drive) a car.', answer: 'can drive' },
        { blank: 'They ______ (not / swim).', answer: 'cannot swim' },
        { blank: 'Could you ______ (pass) me the salt?', answer: 'pass' },
      ],
    },
    {
      id: 't6-4',
      instruction: 'Javobni yozing:',
      type: 'short-answer',
      items: [
        { blank: 'What should I do if I feel sick?', answer: 'You should see a doctor.' },
        { blank: 'What must students do at school?', answer: 'Students must study and follow rules.' },
      ],
    },
    {
      id: 't6-5',
      instruction: 'Maslahat bering (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'You should eat more vegetables. You should not eat too much sugar. You must exercise regularly. You should drink more water. You must not smoke.' },
      ],
    },
  ],
}

// ---------- Eksportlar ----------
export const day6 = {
  vocab: vocabDay6,
  grammar: grammarDay6,
  reading: readingDay6,
  listening: listeningDay6,
  writing: writingDay6,
  speaking: speakingDay6,
  test: testDay6,
}
export { vocabDay6, grammarDay6, readingDay6, listeningDay6, writingDay6, speakingDay6, testDay6 }
