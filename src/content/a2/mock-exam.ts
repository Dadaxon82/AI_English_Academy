// A2 Mock Exam — Namunaviy To'liq Imtihon
// Barcha ko'nikmalarni va mavzularni qamrab oladi

// ---------- 1. MOCK EXAM Tuzilmasi ----------
export const mockExam = {
  title: 'A2 Mock Exam — To'liq Imtihon',
  descriptionUz: 'Barcha ko'nikmalar va mavzularni qamrovchi namunaviy to\'liq imtihon.',
  timeLimit: 60, // daqiqa
  passScore: 20, // ball
  sections: [
    {
      id: 'reading',
      titleUz: 'O\'QISH (Reading)',
      descriptionUz: 'Kichik matnlarni tushunish',
      timeLimit: 15, // daqiqa
      exercises: [
        {
          id: 'mock-r1',
          instruction: 'To\'g\'ri yoki noto\'g\'ri?',
          type: 'choice',
          items: [
            {
              question: 'Past Simple zamon o\'tmishdagi voqealar uchun ishlatiladi.',
              options: ['To\'g\'ri', 'Noto\'g\'ri'],
              answer: 'To\'g\'ri',
            },
            {
              question: 'Present Perfect feal "have/has" + V3 shaklida ishlatiladi.',
              options: ['To\'g\'ri', 'Noto\'g\'ri'],
              answer: 'To\'g\'ri',
            },
            {
              question: '"I was working when you called" — bu Past Continuous.',
              options: ['To\'g\'ri', 'Noto\'g\'ri'],
              answer: 'To\'g\'ri',
            },
          ],
        },
        {
          id: 'mock-r2',
          instruction: 'Feallarni to\'g\'ri shakllantiring:',
          type: 'fill-blank',
          items: [
            { blank: 'She ______ (work) yesterday.', answer: 'worked' },
            { blank: 'I ______ (see) that movie.', answer: 'have seen' },
            { blank: 'They ______ (play) at 5 PM.', answer: 'were playing' },
            { blank: 'He ______ (visit) London last year.', answer: 'visited' },
          ],
        },
        {
          id: 'mock-r3',
          instruction: 'Sifatlarni salishtiring:',
          type: 'choice',
          items: [
            {
              question: 'This car is ______ (big) than that one.',
              options: ['bigger', 'biggest', 'more big'],
              answer: 'bigger',
            },
            {
              question: 'This is the ______ (good) movie.',
              options: ['good', 'better', 'best'],
              answer: 'best',
            },
            {
              question: 'She is ______ (beautiful) than her sister.',
              options: ['more beautiful', 'beautifuler', 'most beautiful'],
              answer: 'more beautiful',
            },
          ],
        },
        {
          id: 'mock-r4',
          instruction: 'Predloglarni tanlang:',
          type: 'choice',
          items: [
            {
              question: 'The book is ______ the table.',
              options: ['in', 'at', 'on'],
              answer: 'on',
            },
            {
              question: 'I will be there ______ 8 AM.',
              options: ['at', 'in', 'on'],
              answer: 'at',
            },
            {
              question: 'This is a gift ______ you.',
              options: ['for', 'with', 'at'],
              answer: 'for',
            },
          ],
        },
        {
          id: 'mock-r5',
          instruction: 'Matnni tushunish (300 so\'z)',
          type: 'choice',
          items: [
            {
              question: 'Matnda nima haqida gap ketgan?',
              options: ['Safar', 'Ish', 'Salomatlik'],
              answer: 'Salomatlik',
            },
            {
              question: 'Eng yaxshi maslahat qaysi?',
              options: ['Ko\'proq ishlash', 'Ko\'proq dam olish', 'Ko\'proq yemoq'],
              answer: 'Ko\'proq dam olish',
            },
          ],
        },
      ],
    },
    {
      id: 'listening',
      titleUz: 'ESHTISH (Listening)',
      descriptionUz: 'Gaplashishlarni tushunish',
      timeLimit: 10, // daqiqa
      audio: {
        src: '/audio/a2/mock-exam.mp3',
        duration: 400,
      },
      transcript: [
        'Ahmad: Salom! Kelajakda nima qilasan?',
        'Farida: Salom! Kelajakda men yangi ishlarni qilaman. Kelajakdagi ishim ajoyib va qiziqarli bo\'ladi. Bu o\'sha ishingdan yaxshiroq.',
        'Ahmad: Ajoyib! Sen nima hobi bilan shug\'ullanasan?',
        'Farida: Men yozishni yoqtiraman. Kelajakda yozuvchi bo\'laman. Men kitob yozishni rejalashtiryapman.',
        'Ahmad: Bu juda yaxshi! Men ham o\'qishni yoqtiraman. Kelajakda professor bo\'lishni rejalashtiryapman.',
        'Farida: Bu juda qiziqarli! Biz kelajakda nima qilish uchun gaplashmoqdamiz?',
        'Ahmad: Ha, kelajakdagi rejalaringiz va hobilar haqida gaplashmoqdamiz.',
      ],
      exercises: [
        {
          id: 'mock-l1',
          instruction: 'Nimalarni eshitdingiz?',
          type: 'choice',
          items: [
            {
              question: 'Farida kelajakda nima bo\'lishni rejalashtirapti?',
              options: ['Yozuvchi', 'Professor', 'Shifokor'],
              answer: 'Yozuvchi',
            },
            {
              question: 'Ahmad kelajakda nima bo\'lishni rejalashtirapti?',
              options: ['Yozuvchi', 'Professor', 'Shifokor'],
              answer: 'Professor',
            },
            {
              question: 'Farida nima hobi bilan shug\'ullanadi?',
              options: ['Yozish', 'O\'qish', 'Rasm chizish'],
              answer: 'Yozish',
            },
          ],
        },
        {
          id: 'mock-l2',
          instruction: 'Gaplashish tuzilmasini tushunish:',
          type: 'choice',
          items: [
            {
              question: 'Gaplashish qanday mavzu haqida?',
              options: ['Kelajakdagi rejalari', 'O\'tgan yillar', 'Hozirgi vaziyat'],
              answer: 'Kelajakdagi rejalari',
            },
            {
              question: 'Ahmad va Farida nima haqida gaplashyapti?',
              options: ['Kelajakdagi rejalari', 'O\'tgan yillar', 'Hobi'],
              answer: 'Kelajakdagi rejalari',
            },
          ],
        },
      ],
    },
    {
      id: 'writing',
      titleUz: 'YOZISH (Writing)',
      descriptionUz: 'Yozma topshiriqni bajarish',
      timeLimit: 15, // daqiqa
      exercises: [
        {
          id: 'mock-w1',
          instruction: 'Maslahat bering:',
          type: 'long-answer',
          items: [
            {
              blank: 'Do\'stingizga salomatlik haqida maslahat bering (kamida 60 so\'z).',
              answer: 'You should eat more vegetables. You should drink more water. You should exercise regularly. You must not smoke. You must wear a seatbelt. You should sleep enough hours. It is important to take care of your health.',
            },
          ],
        },
        {
          id: 'mock-w2',
          instruction: 'O\'tmish haqida yozing:',
          type: 'long-answer',
          items: [
            {
              blank: 'O\'tmishda qilgan safaringiz haqida yozing (kamida 60 so\'z).',
              answer: 'I traveled to Uzbekistan last year. I went to Tashkent by train. I stayed in a hotel. I ate good food and saw beautiful places. I was working when I arrived. The city was very beautiful and interesting.',
            },
          ],
        },
      ],
    },
    {
      id: 'speaking',
      titleUz: 'GAPIRISH (Speaking)',
      descriptionUz: 'Gapirish va qisqa so\'rovlar',
      timeLimit: 10, // daqiqa
      exercises: [
        {
          id: 'mock-sp1',
          instruction: 'Do\'stingizni tanishing:',
          type: 'choice',
          items: [
            {
              question: 'Do\'stingizning ismi nima?',
              options: ['Ahmad', 'Farida', 'Zokir'],
              answer: 'Farida',
            },
            {
              question: 'Do\'stingizning hobisi nima?',
              options: ['Yozish', 'O\'qish', 'Rasm chizish'],
              answer: 'Yozish',
            },
          ],
        },
        {
          id: 'mock-sp2',
          instruction: 'Kelajakdagi rejalari haqida gapiring:',
          type: 'choice',
          items: [
            {
              question: 'Do\'stingiz kelajakda nima qilishni rejalashtiryapti?',
              options: ['Yozuvchi bo\'lish', 'Professor bo\'lish', 'Shifokor bo\'lish'],
              answer: 'Yozuvchi bo\'lish',
            },
            {
              question: 'U nima deyishni rejalashtiryapti?',
              options: ['Kitob yozish', 'O\'qish', 'Rasm chizish'],
              answer: 'Kitob yozish',
            },
          ],
        },
      ],
    },
    {
      id: 'test',
      titleUz: 'BAHOLASH TESTI (Section Test)',
      descriptionUz: 'Barcha ko\'nikmalarni qamrovchi test',
      timeLimit: 10, // daqiqa
      passScore: 10,
      exercises: [
        {
          id: 'mock-t1',
          instruction: 'Feallarni to\'g\'ri shakllantiring:',
          type: 'fill-blank',
          items: [
            { blank: 'I ______ (work) yesterday.', answer: 'worked' },
            { blank: 'I ______ (see) that movie.', answer: 'have seen' },
            { blank: 'She ______ (be) at 5 PM.', answer: 'was' },
            { blank: 'They ______ (play) at 5 PM.', answer: 'were playing' },
            { blank: 'This is the ______ (good) movie.', answer: 'best' },
            { blank: 'This car is ______ (big) than that one.', answer: 'bigger' },
          ],
        },
        {
          id: 'mock-t2',
          instruction: 'To\'g\'ri yoki noto\'g\'ri?',
          type: 'choice',
          items: [
            {
              question: '"I was working when you called" — bu Past Continuous.',
              options: ['To\'g\'ri', 'Noto\'g\'ri'],
              answer: 'To\'g\'ri',
            },
            {
              question: 'Past Simple zamon o\'tmishdagi voqealar uchun ishlatiladi.',
              options: ['To\'g\'ri', 'Noto\'g\'ri'],
              answer: 'To\'g\'ri',
            },
            {
              question: '"This is the best book" — bu Superlativ.',
              options: ['To\'g\'ri', 'Noto\'g\'ri'],
              answer: 'To\'g\'ri',
            },
          ],
        },
        {
          id: 'mock-t3',
          instruction: 'Fealdagi ifodalangan feallarni tanlang:',
          type: 'choice',
          items: [
            {
              question: 'I ______ my keys everywhere.',
              options: ['look after', 'look for', 'turn on'],
              answer: 'look for',
            },
            {
              question: 'She ______ her children every day.',
              options: ['looks after', 'looks for', 'looks up'],
              answer: 'looks after',
            },
          ],
        },
        {
          id: 'mock-t4',
          instruction: 'Javobni yozing:',
          type: 'short-answer',
          items: [
            { blank: 'What is your hobby?', answer: 'My hobby is painting/reading.' },
            { blank: 'What will you do tomorrow?', answer: 'I will study and work.' },
            { blank: 'What should I do?', answer: 'You should eat more vegetables.' },
          ],
        },
        {
          id: 'mock-t5',
          instruction: 'Jumlani to\'ldiring:',
          type: 'fill-blank',
          items: [
            { blank: 'I am ______ (at/in/on) home.', answer: 'at' },
            { blank: 'The book is ______ (at/in/on) the table.', answer: 'on' },
            { blank: 'I will be there ______ (at/in/on) 8 AM.', answer: 'at' },
          ],
        },
      ],
    },
  ],
}
export { mockExam }
