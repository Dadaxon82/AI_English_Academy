// A2 Day 2 — Daily Routine, Past Simple (Regular/Irregular Verbs)

// ---------- 1. LUG'AT (15 ta so'z) ----------
export const vocabDay2 = [
  { id: 'routine1', en: 'routine', uz: 'kun tartibi', difficulty: 2, synonyms: ['schedule', 'plan'], antonyms: [] },
  { id: 'routine2', en: 'wake up', uz: 'yohlanib turmoq', difficulty: 1, synonyms: ['get up'], antonyms: [] },
  { id: 'routine3', en: 'brush my teeth', uz: 'stilni tozalash', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'routine4', en: 'have breakfast', uz: 'savat yemoq', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'routine5', en: 'go to work', uz: 'ishga borish', difficulty: 2, synonyms: ['go to the office'], antonyms: [] },
  { id: 'routine6', en: 'meet', uz: 'duo', difficulty: 2, synonyms: ['encounter'], antonyms: [] },
  { id: 'routine7', en: 'finish', uz: 'tamom qilmoq', difficulty: 2, synonyms: ['complete'], antonyms: ['start'] },
  { id: 'routine8', en: 'have lunch', uz: 'tushlik yemoq', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'routine9', en: 'come back', uz: 'kelib qolmoq', difficulty: 2, synonyms: ['return'], antonyms: ['leave'] },
  { id: 'routine10', en: 'cook dinner', uz: 'xomir pishirmoq', difficulty: 2, synonyms: [], antonyms: [] },
  { id: 'routine11', en: 'watch TV', uz: 'televizor tomosha qilmoq', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'routine12', en: 'relax', uz: 'dam olish', difficulty: 2, synonyms: ['rest', 'unwind'], antonyms: ['work'] },
  { id: 'routine13', en: 'go to bed', uz: 'yotishga ketish', difficulty: 1, synonyms: ['sleep'], antonyms: [] },
  { id: 'routine14', en: 'always', uz: 'har doim', difficulty: 1, synonyms: ['constantly'], antonyms: ['never'] },
  { id: 'routine15', en: 'yesterday', uz: 'kecha', difficulty: 1, synonyms: ['the day before'], antonyms: ['today'] },
]

// ---------- 2. GRAMMATIKA (Past Simple: Regular/Irregular Verbs) ----------
export const grammarDay2 = {
  title: 'Kecha va o'tgan voqealar: Past Simple (Regular va Irregular Feallar)',
  explanationUz: [
    'Past Simple zamon faqat o\'tmishdagi voqealar uchun ishlatiladi. Masalan, "I worked yesterday" (Men kecha ishlaganman) yoki "She cooked dinner last night" (U kechqurun xomir pishirgan).',
    'FEALLARNING O\'ZGARISHLARI: Ingliz tilida feallar Past Simple zamonida ikki xil o\'zgaradi:',
    'REGULAR VERBS (QOIDA BOYIGA FEALLAR): Ko\'pchilik feallar -d/-ed qo\'shimchasi bilan o\'zgaradi. Masalan: work → worked, play → played, visit → visited.',
    'IRREGULAR VERBS (QOIDASIZ FEALLAR): Ba\'zi feallar qoidaga bo\'ysunmaydi va butunlay boshqa shaklga o\'tadi. Masalan: go → went, eat → ate, have → had, see → saw.',
    'ADVERBS OF FREQUENCY (Tezlik So\'zlari): "Always" (har doim), "often" (kўp hollarda), "sometimes" (ba\'zan), "rarely" (deyarli hech qachon), "never" (hech qachon) so\'zlar Past Simple bilan ishlatiladi. Ko'pincha ular fealdan oldin keladi, masalan: "I often go to work" yoki "She never drinks coffee".',
  ],
  formula: [
    { formula: 'Regular: verb + ed', exampleUz: 'work → worked', exampleEn: 'I worked yesterday (Men kecha ishlaganman)' },
    { formula: 'Irregular: butunlay yangi shakl', exampleUz: 'go → went', exampleEn: 'She went to the office (U ofisga ketdi)' },
    { formula: 'Adverb of frequency: fealdan oldin', exampleUz: 'often + verb', exampleEn: 'I often go to work (Men ko\'p hollarda ishga boraman)' },
  ],
  exercises: [
    {
      id: 'g2e1',
      instruction: 'Past Simple zamonida feallarni to\'g\'ri shakllantiring:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (work) yesterday.', answer: 'worked' },
        { blank: 'She ______ (play) tennis last Sunday.', answer: 'played' },
        { blank: 'They ______ (visit) their friends last week.', answer: 'visited' },
        { blank: 'He ______ (go) to work yesterday.', answer: 'went' },
        { blank: 'We ______ (eat) dinner at home.', answer: 'ate' },
      ],
    },
    {
      id: 'g2e2',
      instruction: 'To\'g\'ri jumlani tanlang:',
      type: 'choice',
      items: [
        { question: 'What did you do yesterday?', options: ['I go to work.', 'I went to work.', 'I am going to work.'] },
        { question: 'She often ______ coffee.', options: ['drink', 'drinks', 'drank'] },
      ],
    },
    {
      id: 'g2e3',
      instruction: 'Adverbs of frequency bilan to\'g\'ri tuzing:',
      type: 'fill-blank',
      items: [
        { blank: 'I ______ (never / drink) milk.', answer: 'never drink' },
        { blank: 'She ______ (always / wake up) at 6 AM.', answer: 'always wakes up' },
        { blank: 'They ______ (often / go) to the gym.', answer: 'often go' },
      ],
    },
    {
      id: 'g2e4',
      instruction: 'Javoblarni yozing:',
      type: 'short-answer',
      items: [
        { blank: 'He ______ (see) me yesterday.', answer: 'saw me' },
        { blank: 'What did you have for breakfast?', answer: 'I had bread and coffee.' },
      ],
    },
    {
      id: 'g2e5',
      instruction: 'O\'zingizning kun tartibingiz haqida gapiring (Past Simple ishlatib):',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I woke up at 6 AM and brushed my teeth. Then I had breakfast and went to work.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay2 = {
  title: 'Ahmadning Kun Tartibi',
  level: 'A2',
  paragraphs: [
    'Ahmad har kuni xuddi shunday kun tartibi bilan yashaydi. U soat 6:00 da uyg\'onadi, stilini tozalaydi va savatni yeydi. Keyin u ofisga boradi va u yerda soat 8:00 dan 18:00 gacha ishlaydi. Ahmad har kuni do\'stlari bilan duko qilib ishlaydi.',
    "Kechqurun, Ahmad uyga qaytadi va kecha xomir qiladi. U kecha 18:00 gacha ko'rib qoladi, keyin uyquga yotadi. Ahmad har kuni shunday qiladi, lekin kecha u o'zgarish qildi.",
    'Kecha Ahmad uydan chiqmadi. U uyda qoldi va uyda xomir qildi. U shaharda bo\'lgan do\'stlari bilan telefon qiladi. U "Men uyda dam olaman", dedi. Ahmadning ota-onasi u bilan gapirishadi va aytishadiki, Ahmad buni qilmayapti.',
  ],
  exercises: [
    {
      id: 'r2e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: 'Ahmad har kuni 6:00 da uyg\'onadi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Ahmad ofisda 8:00 dan 18:00 gacha ishlaydi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Ahmad kecha ishga bordi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
      ],
    },
  ],
  glossary: [
    { en: 'routine', uz: 'kun tartibi' },
    { en: 'brush my teeth', uz: 'stil tozalash' },
    { en: 'come back', uz: 'kelib qolmoq' },
    { en: 'relax', uz: 'dam olish' },
  ],
}

// ---------- 4. ESHITISH (Listening Task) ----------
export const listeningDay2 = {
  title: 'Daily Routine Conversations',
  level: 'A2',
  audio: {
    src: '/audio/a2/listening-day-2.mp3',
    duration: 300,
  },
  transcript: [
    'Ahmad: Salom! Nima gap?',
    'Farid: Salom! Kecha qanday o\'tdi?',
    'Ahmad: Yoqimtoy bo\'ldi. Men uyda qolaman va do\'stlarim bilan telefon qilaman.',
    'Farid: Ajoyib! Men ishga boraman. Kecha 8:00 da uyg\'onishim kerak.',
    'Ahmad: Ha, mening kun tartibim ham shu.',
    'Farid: Ha, men har kuni xuddi shunday qilaman.',
  ],
  exercises: [
    {
      id: 'l2e1',
      instruction: 'Nimalarni eshitdingiz?',
      type: 'choice',
      items: [
        {
          question: 'Kecha Ahmad nima qildi?',
          options: ['Ishga bordi', 'Uyda qoldi', 'Do\'stlari bilan duko qildi'],
          answer: 'Uyda qoldi',
        },
        {
          question: 'Farid nima qilishi kerak?',
          options: ['Ishga borish', 'Uyda qolish', 'Telefon qilish'],
          answer: 'Ishga borish',
        },
      ],
    },
  ],
}

// ---------- 5. Yozish (Writing Task) ----------
export const writingDay2 = {
  title: 'Kecha qanday o\'tdi?',
  instruction: 'O\'zingizning kechagi kun tartibingiz haqida qisqacha tavsiflang (kamida 30 so\'z).',
  minWords: 30,
  maxWords: 100,
  mustInclude: [
    { pattern: 'yesterday', whyUz: 'Kecha haqida gapirish kerak.' },
    { pattern: 'wake up', whyUz: 'Uygunib turganingiz haqida.' },
    { pattern: 'go', whyUz: 'Kechagi faoliyatingiz haqida.' },
    { pattern: 'evening', whyUz: 'Kechasi nima qilinganligingiz haqida.' },
  ],
}

// ---------- 6. Gapirish (Speaking Tasks) ----------
export const speakingDay2 = [
  {
    id: 's2-1',
    instruction: 'Kechagi kun tartibingiz haqida gapiring.',
    minSeconds: 30,
  },
  {
    id: 's2-2',
    instruction: 'O\'zingizning odatiy kun tartibingiz haqida gapiring (har kuni nimalarni qilasiz).',
    minSeconds: 45,
  },
  {
    id: 's2-3',
    instruction: 'Kechagi o\'zgarishlar haqida gapiring (agar bo\'lsa).',
    minSeconds: 30,
  },
]

// ---------- 7. BAHOLASH TESTI (Section Test) ----------
export const testDay2 = {
  title: 'Kun Tartibi va O\'tmish Zamon',
  passScore: 2,
  exercises: [
    {
      id: 't2-1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'choice',
      items: [
        {
          question: 'Past Simple zamon o\'tmishdagi voqealar uchun ishlatiladi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
      ],
    },
    {
      id: 't2-2',
      instruction: 'Feallarni o\'zgartiring:',
      type: 'fill-blank',
      items: [
        { blank: 'She ______ (work) yesterday.', answer: 'worked' },
        { blank: 'I ______ (go) to the park.', answer: 'went' },
        { blank: 'They ______ (watch) TV.', answer: 'watched' },
        { blank: 'He ______ (have) breakfast.', answer: 'had' },
        { blank: 'We ______ (see) a film.', answer: 'saw' },
      ],
    },
    {
      id: 't2-3',
      instruction: 'Jumlani to\'ldiring:',
      type: 'choice',
      items: [
        { question: 'I ______ coffee. (always)', options: ['always drink', 'drink always', 'always drinking'] },
        { question: 'She ______ to school yesterday.', options: ['go', 'went', 'going'] },
      ],
    },
    {
      id: 't2-4',
      instruction: 'Javobni yozing:',
      type: 'short-answer',
      items: [
        { blank: 'What did you have for breakfast?', answer: 'I had bread and tea.' },
        { blank: 'Where did you go yesterday?', answer: 'I went to the park.' },
      ],
    },
    {
      id: 't2-5',
      instruction: 'O\'zingizning kechagi kun tartibingiz haqida gapiring (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I woke up at 6 AM. I brushed my teeth and had breakfast. Then I went to work. I worked until 6 PM. In the evening, I came home and watched TV.' },
      ],
    },
  ],
}

// ---------- Eksportlar ----------
export const day2 = {
  vocab: vocabDay2,
  grammar: grammarDay2,
  reading: readingDay2,
  listening: listeningDay2,
  writing: writingDay2,
  speaking: speakingDay2,
  test: testDay2,
}
export { vocabDay2, grammarDay2, readingDay2, listeningDay2, writingDay2, speakingDay2, testDay2 }
