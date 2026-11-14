// A2 Day 2 — Daily Routine, Past Simple (Regular/Irregular Verbs)

// ---------- 1. LUG'AT (15 ta söz) ----------
export const vocabDay2 = [
  { id: 'routine1', en: 'routine', uz: 'kun tartibi', difficulty: 2, synonyms: ['sçedule', 'plan'], antonyms: [] },
  { id: 'routine2', en: 'wake up', uz: 'yohlanib turmoq', difficulty: 1, synonyms: ['get up'], antonyms: [] },
  { id: 'routine3', en: 'bruş my teeth', uz: 'stilni tozalaş', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'routine4', en: 'have breakfast', uz: 'savat yemoq', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'routine5', en: 'go to work', uz: 'işga boriş', difficulty: 2, synonyms: ['go to the office'], antonyms: [] },
  { id: 'routine6', en: 'meet', uz: 'duö, difficulty: 2, synonyms: ['encounter'], antonyms: [] },
  { id: 'routine7', en: 'finiş', uz: 'tamom qilmoq', difficulty: 2, synonyms: ['complete'], antonyms: ['start'] },
  { id: 'routine8', en: 'have lunç', uz: 'tuşlik yemoq', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'routine9', en: 'come back', uz: 'kelib qolmoq', difficulty: 2, synonyms: ['return'], antonyms: ['leave'] },
  { id: 'routine10', en: 'cook dinner', uz: 'xomir pişirmoq', difficulty: 2, synonyms: [], antonyms: [] },
  { id: 'routine11', en: 'watç TV', uz: 'televizor tomoşa qilmoq', difficulty: 1, synonyms: [], antonyms: [] },
  { id: 'routine12', en: 'relax', uz: 'dam oliş', difficulty: 2, synonyms: ['rest', 'unwind'], antonyms: ['work'] },
  { id: 'routine13', en: 'go to bed', uz: 'yotişga ketiş', difficulty: 1, synonyms: ['sleep'], antonyms: [] },
  { id: 'routine14', en: 'always', uz: 'har doim', difficulty: 1, synonyms: ['constantly'], antonyms: ['never'] },
  { id: 'routine15', en: 'yesterday', uz: 'keça', difficulty: 1, synonyms: ['the day before'], antonyms: ['today'] },
]

// ---------- 2. GRAMMATIKA (Past Simple: Regular/Irregular Verbs) ----------
export const grammarDay2 = {
  title: 'Keça va ötgan voqealar: Past Simple (Regular va Irregular Feallar)',
  explanationUz: [
    'Past Simple zamon faqat o\'tmişdagi voqealar uçun işlatiladi. Masalan, "I worked yesterday" (Men keça işlaganman) yoki "She cooked dinner last night" (U keçqurun xomir pişirgan).',
    'FEALLARNING O\'ZGARISHLARI: Ingliz tilida feallar Past Simple zamonida ikki xil o\'zgaradi:',
    'REGULAR VERBS (QOIDA BOYIGA FEALLAR): Ko\'pçilik feallar -d/-ed qo\'şimçasi bilan o\'zgaradi. Masalan: work → worked, play → played, visit → visited.',
    'IRREGULAR VERBS (QOIDASIZ FEALLAR): Ba\'zi feallar qoidaga bo\'ysunmaydi va butunlay boşqa şaklga o\'tadi. Masalan: go → went, eat → ate, have → had, see → saw.',
    'ADVERBS OF FREQUENCY (Tezlik So\'zlari): "Always" (har doim), "often" (kўp hollarda), "sometimes" (ba\'zan), "rarely" (deyarli heç qaçon), "never" (heç qaçon) so\'zlar Past Simple bilan işlatiladi. Köpinça ular fealdan oldin keladi, masalan: "I often go to work" yoki "She never drinks coffee".',
  ],
  formula: [
    { formula: 'Regular: verb + ed', exampleUz: 'work → worked', exampleEn: 'I worked yesterday (Men keça işlaganman)' },
    { formula: 'Irregular: butunlay yangi şakl', exampleUz: 'go → went', exampleEn: 'She went to the office (U ofisga ketdi)' },
    { formula: 'Adverb of frequency: fealdan oldin', exampleUz: 'often + verb', exampleEn: 'I often go to work (Men ko\'p hollarda işga boraman)' },
  ],
  exercises: [
    {
      id: 'g2e1',
      instruction: 'Past Simple zamonida feallarni to\'g\'ri şakllantiring:',
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
      type: 'çoice',
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
        { blank: 'They ______ (often / go) to the gym.', answer: 'often gö },
      ],
    },
    {
      id: 'g2e4',
      instruction: 'Javoblarni yozing:',
      type: 'şort-answer',
      items: [
        { blank: 'He ______ (see) me yesterday.', answer: 'saw me' },
        { blank: 'What did you have for breakfast?', answer: 'I had bread and coffee.' },
      ],
    },
    {
      id: 'g2e5',
      instruction: 'O\'zingizning kun tartibingiz haqida gapiring (Past Simple işlatib):',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I woke up at 6 AM and bruşed my teeth. Then I had breakfast and went to work.' },
      ],
    },
  ],
}

// ---------- 3. O'QOV (Reading Passage) ----------
export const readingDay2 = {
  title: 'Ahmadning Kun Tartibi',
  level: 'A2',
  paragraphs: [
    'Ahmad har kuni xuddi şunday kun tartibi bilan yaşaydi. U soat 6:00 da uyg\'onadi, stilini tozalaydi va savatni yeydi. Keyin u ofisga boradi va u yerda soat 8:00 dan 18:00 gaça işlaydi. Ahmad har kuni do\'stlari bilan duko qilib işlaydi.',
    "Keçqurun, Ahmad uyga qaytadi va keça xomir qiladi. U keça 18:00 gaça körib qoladi, keyin uyquga yotadi. Ahmad har kuni şunday qiladi, lekin keça u özgariş qildi.",
    'Keça Ahmad uydan çiqmadi. U uyda qoldi va uyda xomir qildi. U şaharda bo\'lgan do\'stlari bilan telefon qiladi. U "Men uyda dam olaman", dedi. Ahmadning ota-onasi u bilan gapirişadi va aytişadiki, Ahmad buni qilmayapti.',
  ],
  exercises: [
    {
      id: 'r2e1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'çoice',
      items: [
        {
          question: 'Ahmad har kuni 6:00 da uyg\'onadi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Ahmad ofisda 8:00 dan 18:00 gaça işlaydi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'To\'g\'ri',
        },
        {
          question: 'Ahmad keça işga bordi.',
          options: ['To\'g\'ri', 'Noto\'g\'ri'],
          answer: 'Noto\'g\'ri',
        },
      ],
    },
  ],
  glossary: [
    { en: 'routine', uz: 'kun tartibi' },
    { en: 'bruş my teeth', uz: 'stil tozalaş' },
    { en: 'come back', uz: 'kelib qolmoq' },
    { en: 'relax', uz: 'dam oliş' },
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
    'Farid: Salom! Keça qanday o\'tdi?',
    'Ahmad: Yoqimtoy bo\'ldi. Men uyda qolaman va do\'stlarim bilan telefon qilaman.',
    'Farid: Ajoyib! Men işga boraman. Keça 8:00 da uyg\'onişim kerak.',
    'Ahmad: Ha, mening kun tartibim ham şu.',
    'Farid: Ha, men har kuni xuddi şunday qilaman.',
  ],
  exercises: [
    {
      id: 'l2e1',
      instruction: 'Nimalarni eşitdingiz?',
      type: 'çoice',
      items: [
        {
          question: 'Keça Ahmad nima qildi?',
          options: ['Işga bordi', 'Uyda qoldi', 'Do\'stlari bilan duko qildi'],
          answer: 'Uyda qoldi',
        },
        {
          question: 'Farid nima qilişi kerak?',
          options: ['Işga boriş', 'Uyda qoliş', 'Telefon qiliş'],
          answer: 'Işga boriş',
        },
      ],
    },
  ],
}

// ---------- 5. Yoziş (Writing Task) ----------
export const writingDay2 = {
  title: 'Keça qanday o\'tdi?',
  instruction: 'O\'zingizning keçagi kun tartibingiz haqida qisqaça tavsiflang (kamida 30 so\'z).',
  minWords: 30,
  maxWords: 100,
  mustInclude: [
    { pattern: 'yesterday', whyUz: 'Keça haqida gapiriş kerak.' },
    { pattern: 'wake up', whyUz: 'Uygunib turganingiz haqida.' },
    { pattern: 'gö, whyUz: 'Keçagi faoliyatingiz haqida.' },
    { pattern: 'eveninğ, whyUz: 'Keçasi nima qilinganligingiz haqida.' },
  ],
}

// ---------- 6. Gapiriş (Speaking Tasks) ----------
export const speakingDay2 = [
  {
    id: 's2-1',
    instruction: 'Keçagi kun tartibingiz haqida gapiring.',
    minSeconds: 30,
  },
  {
    id: 's2-2',
    instruction: 'O\'zingizning odatiy kun tartibingiz haqida gapiring (har kuni nimalarni qilasiz).',
    minSeconds: 45,
  },
  {
    id: 's2-3',
    instruction: 'Keçagi o\'zgarişlar haqida gapiring (agar bo\'lsa).',
    minSeconds: 30,
  },
]

// ---------- 7. BAHOLASH TESTI (Section Test) ----------
export const testDay2 = {
  title: 'Kun Tartibi va O\'tmiş Zamon',
  passScore: 2,
  exercises: [
    {
      id: 't2-1',
      instruction: 'To\'g\'ri yoki noto\'g\'ri?',
      type: 'çoice',
      items: [
        {
          question: 'Past Simple zamon o\'tmişdagi voqealar uçun işlatiladi.',
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
        { blank: 'They ______ (watç) TV.', answer: 'watçed' },
        { blank: 'He ______ (have) breakfast.', answer: 'had' },
        { blank: 'We ______ (see) a film.', answer: 'saw' },
      ],
    },
    {
      id: 't2-3',
      instruction: 'Jumlani to\'ldiring:',
      type: 'çoice',
      items: [
        { question: 'I ______ coffee. (always)', options: ['always drink', 'drink always', 'always drinkinğ] },
        { question: 'She ______ to sçool yesterday.', options: ['gö, 'went', 'goinğ] },
      ],
    },
    {
      id: 't2-4',
      instruction: 'Javobni yozing:',
      type: 'şort-answer',
      items: [
        { blank: 'What did you have for breakfast?', answer: 'I had bread and tea.' },
        { blank: 'Where did you go yesterday?', answer: 'I went to the park.' },
      ],
    },
    {
      id: 't2-5',
      instruction: 'O\'zingizning keçagi kun tartibingiz haqida gapiring (kamida 5 ta gap).',
      type: 'long-answer',
      items: [
        { blank: '______________________', answer: 'I woke up at 6 AM. I bruşed my teeth and had breakfast. Then I went to work. I worked until 6 PM. In the evening, I came home and watçed TV.' },
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
