/**
 * Milliy CEFR / Multilevel uslubidagi Mock Exam (A1 daraja).
 *
 * MUHIM: bu — MASHQ UCHUN YARATILGAN NAMUNA. Rasmiy savol deb
 * atalmaydi. Bo'limlar va vaqt tartibi O'zbekistondagi milliy
 * CEFR/Multilevel imtihonining ochiq e'lon qilingan tuzilmasiga
 * o'xshash, lekin savollar — original. Format o'zgarsa, shu fayl va
 * `formatNote` yangilanadi.
 */

import type { MockExamSpec, AudioAsset } from './types'

const examAudio: AudioAsset = {
  id: 'a1-mock-audio-01',
  src: '/audio/a1-mock-audio-01.wav',
  fileAvailable: true,
  source: 'original',
  attribution: 'AI English Academy (original, synthesized for practice)',
  license: 'CC0 — created for this project',
  offlineAllowed: true,
  level: 'A1',
  title: 'A phone call about a picnic',
  durationSec: 75,
  transcript: [
    { start: 0, end: 6, text: 'Hello, Dilnoza! This is Sardor. Are you free on Saturday?' },
    { start: 6, end: 12, text: 'Hi, Sardor! Yes, I am. What are you doing?' },
    { start: 12, end: 19, text: "My family is going to the park for a picnic. Do you want to come?" },
    { start: 19, end: 25, text: 'That sounds great! What time do we meet?' },
    { start: 25, end: 33, text: "Let's meet at nine o'clock, at the main gate of the park." },
    { start: 33, end: 40, text: "OK. I'm bringing fruit and water. Can your brother come too?" },
    { start: 40, end: 48, text: 'Yes, he can. He is making a cake for everyone on Friday evening.' },
    { start: 48, end: 55, text: "Perfect! What's the weather like on Friday? Is it going to rain?" },
    { start: 55, end: 63, text: "The radio says it will be sunny all weekend, so we're lucky." },
    { start: 63, end: 71, text: "Wonderful. See you on Saturday then. Goodbye, Sardor!" },
    { start: 71, end: 75, text: 'Bye, Dilnoza! See you at nine.' },
  ],
}

export const mockExamA1: MockExamSpec = {
  id: 'a1-mock-exam',
  titleUz: 'Milliy CEFR / Multilevel — A1 namunaviy imtihon',
  level: 'A1',
  descriptionUz:
    'Tört bölim: Reading, Listening, Writing, Speaking. Har bölimda alohida vaqt çeklovi bor. Imtihonni yakunlaşdan oldin tasdiqlaş söraladi.',
  disclaimerUz:
    'Bu imtihon maşq uçun yaratilgan namunadir. Savollar original; ular rasmiy imtihon savollari emas. Bölimlar va vaqt tartibi milliy CEFR/Multilevel formatining oçiq tavsifiga asoslangan.',
  sections: [
    {
      id: 'a1-mock-reading',
      skill: 'reading',
      titleEn: 'Reading',
      titleUz: 'Öqiş',
      minutes: 15,
      formatVerified: false,
      formatNote:
        'Format oçiq manbalardan umumiy körinişi olindi; aniq savol turlari va soni rasman e’lon qilinmagan. Bu namuna, rasmiy imtihon emas.',
      exercises: [
        {
          id: 'a1-mock-r-01',
          kind: 'multiple-choice',
          instructionUz: 'Matnni öqing va savolga javob bering.',
          passageExcerpt:
            'Tom works in a bookshop. He opens the shop at nine and closes it at seven in the evening. On Sundays the shop is closed, so Tom visits his parents and cooks lunch for the family.',
          question: 'What does Tom do on Sundays?',
          options: ['He works in the shop', 'He visits his parents', 'He goes to a park', 'He studies English'],
          answerIndex: 1,
          level: 'A1',
          skill: 'reading',
          difficulty: 1,
          explanationUz: '“On Sundays the shop is closed, so Tom visits his parents…”',
        },
        {
          id: 'a1-mock-r-02',
          kind: 'true-false-notgiven',
          instructionUz: 'True (töğri), False (notöğri) yoki Not Given (matnda yöq).',
          passageExcerpt:
            'Tom works in a bookshop. He opens the shop at nine and closes it at seven in the evening.',
          statement: 'The bookshop opens at 9:00 in the morning.',
          answer: 'true',
          evidence: 'He opens the shop at nine',
          level: 'A1',
          skill: 'reading',
          difficulty: 1,
          explanationUz: 'Matnda soat töqqizda oçilişi aytilgan — True.',
        },
        {
          id: 'a1-mock-r-03',
          kind: 'true-false-notgiven',
          instructionUz: 'True (töğri), False (notöğri) yoki Not Given (matnda yöq).',
          passageExcerpt:
            'Tom works in a bookshop. He opens the shop at nine and closes it at seven in the evening.',
          statement: 'Tom earns much money in the bookshop.',
          answer: 'notgiven',
          level: 'A1',
          skill: 'reading',
          difficulty: 2,
          explanationUz: 'Daromad haqida matnda heç narsa yöq — Not Given.',
        },
        {
          id: 'a1-mock-r-04',
          kind: 'gap-fill',
          instructionUz: 'Matndagi böş joyni töldiring (bitta söz).',
          text: 'On Sundays the shop is ___ , so Tom visits his parents.',
          answers: ['closed'],
          wordBank: ['closed', 'open', 'busy'],
          level: 'A1',
          skill: 'reading',
          difficulty: 1,
          explanationUz: 'Yakşanba kuni dökon yopiq (“closed”).',
        },
      ],
      writingTask: undefined,
    },
    {
      id: 'a1-mock-listening',
      skill: 'listening',
      titleEn: 'Listening',
      titleUz: 'Tinglaş',
      minutes: 15,
      formatVerified: false,
      formatNote: 'Audio — loyihada original yaratilgan fayl. Rasmiy audio emas.',
      audio: examAudio,
      exercises: [
        {
          id: 'a1-mock-l-01',
          kind: 'multiple-choice',
          instructionUz: 'Audioni tinglab töğri javobni tanlang.',
          question: 'Who is calling Dilnoza?',
          options: ['Her brother', 'Sardor', 'Her teacher', 'Her mother'],
          answerIndex: 1,
          level: 'A1',
          skill: 'listening',
          difficulty: 1,
          explanationUz: 'Boşida: “This is Sardor.”',
        },
        {
          id: 'a1-mock-l-02',
          kind: 'multiple-choice',
          instructionUz: 'Audioni tinglab töğri javobni tanlang.',
          question: 'Where do they meet?',
          options: ['At the cafe', 'At school', 'At the main gate of the park', 'At Sardor’s house'],
          answerIndex: 2,
          level: 'A1',
          skill: 'listening',
          difficulty: 1,
          explanationUz: '“…at the main gate of the park.”',
        },
        {
          id: 'a1-mock-l-03',
          kind: 'gap-fill',
          instructionUz: 'Eşitgan sözingizni yozing.',
          text: 'They want to meet at ___ o’clock.',
          answers: ['nine'],
          acceptAlternatives: [['nine', '9']],
          level: 'A1',
          skill: 'listening',
          difficulty: 2,
          explanationUz: '“Let’s meet at nine o’clock.”',
        },
        {
          id: 'a1-mock-l-04',
          kind: 'true-false-notgiven',
          instructionUz: 'Audio mazmuniga köra javob bering.',
          statement: 'Dilnoza is bringing fruit and water.',
          answer: 'true',
          evidence: "I'm bringing fruit and water",
          level: 'A1',
          skill: 'listening',
          difficulty: 1,
          explanationUz: 'Dilnoza özi olib kelişini aytadi — True.',
        },
      ],
    },
    {
      id: 'a1-mock-writing',
      skill: 'writing',
      titleEn: 'Writing',
      titleUz: 'Yoziş',
      minutes: 20,
      formatVerified: false,
      formatNote: 'Janr va hajm A1 darajasiga mos namunaviy topşiriq.',
      exercises: [],
      writingTask: {
        id: 'a1-mock-w-01',
        level: 'A1',
        genre: 'email',
        promptEn:
          'Write an email to your English teacher. Tell her: (1) what you did last weekend, (2) what you are doing now, (3) when you can have the next lesson.',
        instructionUz:
          'Ingliz tilida aniq, sodda gaplar bilan yozing. Kamida 40 söz. Reja: kiriş — asosiy qism — yakun.',
        minWords: 40,
        maxWords: 120,
        minutes: 20,
        criteria: ['task_achievement', 'coherence', 'lexical_resource', 'grammatical_range', 'accuracy'],
        checklistUz: [
          'Uçala savolga ham javob berdingizmi?',
          'Salomlaşiş va vidolaşuv bormi?',
          'Present Simple / Past Simple / Present Continuous töğri işlatildimi?',
        ],
        mustInclude: [
          { pattern: 'last weekend', whyUz: 'Ötmiş haqidagi qism uçun vaqt ifodasi kutiladi.' },
          { pattern: 'now', whyUz: 'Hozirgi harakat (Present Continuous) uçun kerak.' },
          { pattern: 'can', whyUz: 'Keyingi dars vaqtini kelişiş uçun modallar.' },
        ],
        modelAnswerEn:
          'Dear Miss Sarah, Last weekend I visited my grandparents and we cooked plov. It was delicious. Now I am doing my homework and studying English. Can we have the next lesson on Friday at five? Thank you very much. Best wishes, Malika',
      },
    },
    {
      id: 'a1-mock-speaking',
      skill: 'speaking',
      titleEn: 'Speaking',
      titleUz: 'Gapiriş',
      minutes: 10,
      formatVerified: false,
      formatNote:
        'Bu bölimning bahosi rasmiy imtihon natijasi emas — maşq bahosi. Audio işlamasa matnli javob qabul qilinadi.',
      exercises: [],
      speakingTask: {
        id: 'a1-mock-s-01',
        level: 'A1',
        topicUz: 'Özingiz va oilangiz',
        questionEn: 'Talk about your typical day: what you do in the morning, at work or school, and in the evening.',
        hintUz: 'Kun tartibi haqida 60 sekund gapiring. Present Simple işlatişga harakat qiling.',
        minSeconds: 30,
        targetSeconds: 60,
        textAlternative:
          'Audio yozib bölmasa: şu mavzuda 6-8 ta gap yozing. Baholaş mezonlari bir xil: davomiylik, grammatika, luğat, ravonlik.',
        followUpsEn: ['Who do you spend most time with?', 'What do you do on Saturdays?'],
      },
    },
  ],
}
