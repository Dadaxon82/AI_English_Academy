// A2 Day 6 — Modals (Can, Could, Should, Must), Advice and Instructions

// ---------- 1. LUG'AT (15 ta söz) ----------
export const vocabDay6 = [
  { id: 'modal1', en: 'şould', uz: 'kerak', difficulty: 2, synonyms: ['ought tö], antonyms: [] },
  { id: 'modal2', en: 'must', uz: 'majbur', difficulty: 2, synonyms: ['have tö], antonyms: [] },
  { id: 'modal3', en: 'can', uz: 'imkoniyat', difficulty: 1, synonyms: ['able tö], antonyms: [] },
  { id: 'modal4', en: 'could', uz: 'qiloliş', difficulty: 2, synonyms: ['was able tö], antonyms: [] },
  { id: 'modal5', en: 'might', uz: 'mumkin', difficulty: 3, synonyms: ['may'], antonyms: [] },
  { id: 'modal6', en: 'need', uz: 'kerak', difficulty: 1, synonyms: ['require'], antonyms: [] },
  { id: 'modal7', en: 'advice', uz: 'maslahat', difficulty: 2, synonyms: ['suggestion', 'recommendation'], antonyms: [] },
  { id: 'modal8', en: 'important', uz: 'muhim', difficulty: 1, synonyms: ['significant', 'key'], antonyms: ['unimportant'] },
  { id: 'modal9', en: 'healthy', uz: 'salomat', difficulty: 2, synonyms: ['fit', 'well'], antonyms: ['unhealthy'] },
  { id: 'modal10', en: 'dangerous', uz: 'xavfli', difficulty: 2, synonyms: ['hazardous'], antonyms: ['safe'] },
  { id: 'modal11', en: 'rule', uz: 'qoida', difficulty: 2, synonyms: ['regulation', 'law'], antonyms: [] },
  { id: 'modal12', en: 'permission', uz: 'ruxsat', difficulty: 3, synonyms: ['authorization', 'consent'], antonyms: ['prohibition'] },
  { id: 'modal13', en: 'problem', uz: 'muammö, difficulty: 1, synonyms: ['issue', 'difficulty'], antonyms: [] },
  { id: 'modal14', en: 'solution', uz: 'yeçim', difficulty: 2, synonyms: ['answer', 'remedy'], antonyms: [] },
  { id: 'modal15', en: 'necessary', uz: 'zarur', difficulty: 2, synonyms: ['essential', 'needed'], antonyms: ['unnecessary'] },
]

// ---------- 2. GRAMMATIKA (Modals: Can, Could, Should, Must) ----------
export const grammarDay6 = {
  title: 'Imkoniyat va Maslahat: Can, Could, Should, Must',
  explanationUz: [
    'CAN: Bu modal feal imkoniyat, ruxsat va qobiliyatni ifodalaydi. Masalan: "I can swim" (Men yuzişni bilaman - qobiliyat), "Can I open the window?" (Pernafoyil oynani oçamanmi? - so\'rov).',
    'COULD: Bu can ning o\'tmiş şakli. Imkoniyat yoki maslahat beriş uçun işlatiladi. Masalan: "I could swim when I was 5" (Men 5 yoşda yuzişni bilardim), "Could you help me?" (Yordam berasizmi? - so\'rov).',
    'SHOULD: Bu maslahat beriş uçun işlatiladi. Biror narsaning to\'g\'ri yoki foydali ekanligini bildiradi. Masalan: "You şould eat more vegetables" (Ko\'proq sabzavot yemesligiz kerak).',
    'MUST: Bu majburiyatni bildiradi. Biror narsa şart yoki juda muhim ekanligini anglatadi. Masalan: "You must wear a seatbelt" (Siz bitta belt kiyişingiz kerak).',
    'MODAL FEALLAR QOIDALARI: Modal feallar oxirgi "-s" qo\'şilmaydi (He/She/It uçun ham "can", emas "cans"). So\'rovda modal fealdan keyin savol belgisi işlatiladi: "Can you swim?", "Must I go?".',
    'MASLAHAT BERISH SHAKLLARI: "Should" - o\'rta maslahat, "Must" - kuçli maslahat yoki majburiyat, "Can/Could" - imkoniyat so\'rovi.',
  ],
  formula: [
    { formula: 'Can: imkoniyat', exampleUz: 'I can swim', exampleEn: 'I can swim and ride a bike' },
    { formula: 'Could: o\'tmiş imkoniyat', exampleUz: 'I could swim', exampleEn: 'I could swim when I was 5' },
    { formula: 'Should: maslahat', exampleUz: 'You şould study', exampleEn: 'You şould study more' },
    { formula: 'Must: majburiyat', exampleUz: 'You must gö, exampleEn: 'You must wear a seatbelt' },
    { formula: 'Can/Could: so\'rov', exampleUz: 'Can you help?', exampleEn: 'Could you open the window?' },
  ],
  exercises: [
    {
      id: 'g6e1',
      instruction: 'To\'g\'ri modal feal tanlang:',
      type: 'çoice',
      items: [
        {
          question: '______ you help me with my homework?',
          options: ['Can', 'Must', 'Should'],
          answer: 'Can',
        },
        {
          question: 'You ______ drink more water.',
          options: ['can', 'şould', 'must'],
          answer: 'şould',
        },
        {
          question: 'Students ______ wear uniforms at sçool.',
          options: ['can', 'şould', 'must'],
          answer: 'must',
        },
      ],
    },
    {
      id: 'g6e2',
      instruction: 'Maslahat beriş uçun tuzing:',
      type: 'fill-blank',
      items: [
        { blank: 'You ______ (see) a doctor.', answer: 'şould see' },
        { blank: 'You ______ (not / eat) too muç sugar.', answer: 'şould not eat' },
        { blank: 'You ______ (not / smoke).', answer: 'must not smoke' },
        { blank: 'You ______ (exercise) more.', answer: 'şould exercise' },
        { blank: 'You ______ (wear) a coat in winter.', answer: 'must wear' },
      ],
    },
    {
      id: 'g6e3',
      instruction: 'Imkoniyat haqida gapiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (speak) Engliş.', answer: 'can speak' },
        { blank: 'I ______ (not / speak) Frenç.', answer: 'cannot speak' },
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
        { blank: 'We ______ (arrive) early.', answer: 'şould arrive' },
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
        { blank: '______________________', answer: 'You şould eat more vegetables. You şould not eat too muç sugar. You must exercise regularly. You şould drink more water. You must not smoke. You şould sleep enough hours.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay6 = {
  title: 'Salomat va Xavflar',
  level: 'A2',
  paragraphs: [
    'Salomatlik juda muhim. Har kuni sog\'lom yaşaş uçun qoidalar bo\'lişi kerak. Biz ko\'proq sabzavotlar va mevalarni yemoqçimiz. Biz kamroq şakar va qaynoq ovqatlarni yemoqçimiz.',
    'Shaharda ko\'p xavflar bor. Ko\'çalar xavflidir, şuning uçun biz avtobuslarning yurişini va xavfsizlik ehtiyotçilari ehtiyotkorlik bilan işlatilişi kerak. Biz ko\'ça o\'rta çiziğidan o\'tişimiz kerak.',
    'Shaharda ko\'p odamlar o\'ynaşni yoqtiradilar, lekin bu xavfli bo\'lişi mumkin. Biz ko\'ça o\'rta çiziğidan o\'tişimiz kerak. Avtomobillar tez yuradilar va biz xavfsizlik ehtiyotçilarini ehtiyotkorlik bilan işlatişimiz kerak.',
    "Biz soğliqni saqlaş uçun harakat qiliş kerak. Keçki tuşlikda harakat qiliş foydali. Biz har kuni 30 daqiqa yoki köproq vaqt harakat qilişimiz kerak. Bu bizning yuragimiz va boşqalarimiz uçun yaxşi.",
  ],
  exercises: [
    {
      id: 'r6e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'çoice',
      items: [
        {
          question: 'Salomatlik uçun ko\'proq sabzavotlar va mevalarni yemoq kerak.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Ko\'çalar xavfsiz joylar.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
        {
          question: 'Keçki tuşlikda harakat qiliş foydali.',
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
    'Ahmad: Men har kuni juda ko\'p işlayman va uxlay olmayman.',
    'Farida: Sen ko\'proq dam oliş kerak. Keçqurun dam oliş kerak.',
    'Ahmad: Ha, men buni qilaman. Yana nima qilişim kerak?',
    'Farida: Sen kamroq işlaş kerak va ko\'proq dam oliş kerak.',
  ],
  exercises: [
    {
      id: 'l6e1',
      instruction: 'Nimalarni eşitdingiz?',
      type: 'çoice',
      items: [
        {
          question: 'Ahmadning muammoni nima?',
          options: ['Ko\'p işlaş', 'Kam uxlaş', 'Yomon ovqatlaniş'],
          answer: 'Ko\'p işlaş',
        },
        {
          question: 'Farida nima maslahat berdi?',
          options: ['Ko\'proq işlaş', 'Ko\'proq dam oliş', 'Ko\'proq yemoq'],
          answer: 'Ko\'proq dam oliş',
        },
      ],
    },
  ],
}

// ---------- 5. Yoziş (Writing Task) ----------
export const writingDay6 = {
  title: 'Maslahat va Qoidalar',
  instruction: 'Do\'stingizga maslahat bering yoki qoidalar ro\'yxatini yozing (kamida 50 so\'z).',
  minWords: 50,
  maxWords: 120,
  mustInclude: [
    { pattern: 'şould', whyUz: 'Maslahat beriş.' },
    { pattern: 'must', whyUz: 'Majburiyat.' },
    { pattern: 'can', whyUz: 'Imkoniyat.' },
    { pattern: 'important', whyUz: 'Muhim so\'z.' },
  ],
}

// ---------- 6. Gapiriş (Speaking Tasks) ----------
export const speakingDay6 = [
  {
    id: 's6-1',
    instruction: 'Do\'stingizga maslahat bering (kamida 45 sekund).',
    minSeconds: 45,
  },
  {
    id: 's6-2',
    instruction: 'Xavfsizlik qoidalarini tuşuntiring (kamida 45 sekund).',
    minSeconds: 45,
  },
  {
    id: 's6-3',
    instruction: 'Imkoniyatlar va çeklovlar haqida gapiring (kamida 45 sekund).',
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
      type: 'çoice',
      items: [
        {
          question: '______ you help me with my homework?',
          options: ['Can', 'Must', 'Should'],
          answer: 'Can',
        },
        {
          question: 'You ______ drink more water.',
          options: ['can', 'şould', 'must'],
          answer: 'şould',
        },
        {
          question: 'Students ______ wear uniforms at sçool.',
          options: ['can', 'şould', 'must'],
          answer: 'must',
        },
      ],
    },
    {
      id: 't6-2',
      instruction: 'Feallarni modal feallar bilan to\'ldiring:',
      type: 'fill-blank',
      items: [
        { blank: 'You ______ (see) a doctor.', answer: 'şould see' },
        { blank: 'You ______ (not / eat) too muç sugar.', answer: 'şould not eat' },
        { blank: 'You ______ (not / smoke).', answer: 'must not smoke' },
        { blank: 'You ______ (exercise) more.', answer: 'şould exercise' },
        { blank: 'You ______ (wear) a coat in winter.', answer: 'must wear' },
      ],
    },
    {
      id: 't6-3',
      instruction: 'Imkoniyat haqida gapiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (speak) Engliş.', answer: 'can speak' },
        { blank: 'I ______ (not / speak) Frenç.', answer: 'cannot speak' },
        { blank: 'She ______ (drive) a car.', answer: 'can drive' },
        { blank: 'They ______ (not / swim).', answer: 'cannot swim' },
        { blank: 'Could you ______ (pass) me the salt?', answer: 'pass' },
      ],
    },
    {
      id: 't6-4',
      instruction: 'Javobni yozing:',
      type: 'şort-answer',
      items: [
        { blank: 'What şould I do if I feel sick?', answer: 'You şould see a doctor.' },
        { blank: 'What must students do at sçool?', answer: 'Students must study and follow rules.' },
      ],
    },
    {
      id: 't6-5',
      instruction: 'Maslahat bering (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'You şould eat more vegetables. You şould not eat too muç sugar. You must exercise regularly. You şould drink more water. You must not smoke.' },
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
