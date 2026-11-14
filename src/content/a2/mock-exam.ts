// A2 Mock Exam — Namunaviy Töliq Imtihon
// Barça könikmalarni va mavzularni qamrab oladi

// ---------- 1. MOCK EXAM Tuzilmasi ----------
export const mockExam = {
  title: 'A2 Mock Exam — Töliq Imtihon',
  descriptionUz: 'Barça könikmalar va mavzularni qamrovçi namunaviy to\'liq imtihon.',
  timeLimit: 60, // daqiqa
  passScore: 20, // ball
  sections: [
    {
      id: 'readinğ,
      titleUz: 'O\'QISH (Reading)',
      descriptionUz: 'Kiçik matnlarni tuşuniş',
      timeLimit: 15, // daqiqa
      exercises: [
        {
          id: 'mock-r1',
          instruction: 'To\'g\'ri yoki noto\'g\'ri?',
          type: 'çoice',
          items: [
            {
              question: 'Past Simple zamon o\'tmişdagi voqealar uçun işlatiladi.',
              options: ['To\'g\'ri', 'Noto\'g\'ri'],
              answer: 'To\'g\'ri',
            },
            {
              question: 'Present Perfect feal "have/has" + V3 şaklida işlatiladi.',
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
          instruction: 'Feallarni to\'g\'ri şakllantiring:',
          type: 'fill-blank',
          items: [
            { blank: 'She ______ (work) yesterday.', answer: 'worked' },
            { blank: 'I ______ (see) that movie.', answer: 'have seen' },
            { blank: 'They ______ (play) at 5 PM.', answer: 'were playinğ },
            { blank: 'He ______ (visit) London last year.', answer: 'visited' },
          ],
        },
        {
          id: 'mock-r3',
          instruction: 'Sifatlarni saliştiring:',
          type: 'çoice',
          items: [
            {
              question: 'This car is ______ (big) than that one.',
              options: ['bigger', 'biggest', 'more biğ],
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
          type: 'çoice',
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
          instruction: 'Matnni tuşuniş (300 so\'z)',
          type: 'çoice',
          items: [
            {
              question: 'Matnda nima haqida gap ketgan?',
              options: ['Safar', 'Iş', 'Salomatlik'],
              answer: 'Salomatlik',
            },
            {
              question: 'Eng yaxşi maslahat qaysi?',
              options: ['Ko\'proq işlaş', 'Ko\'proq dam oliş', 'Ko\'proq yemoq'],
              answer: 'Ko\'proq dam oliş',
            },
          ],
        },
      ],
    },
    {
      id: 'listeninğ,
      titleUz: 'ESHTISH (Listening)',
      descriptionUz: 'Gaplaşişlarni tuşuniş',
      timeLimit: 10, // daqiqa
      audio: {
        src: '/audio/a2/mock-exam.mp3',
        duration: 400,
      },
      transcript: [
        'Ahmad: Salom! Kelajakda nima qilasan?',
        'Farida: Salom! Kelajakda men yangi işlarni qilaman. Kelajakdagi işim ajoyib va qiziqarli bo\'ladi. Bu o\'şa işingdan yaxşiroq.',
        'Ahmad: Ajoyib! Sen nima hobi bilan şug\'ullanasan?',
        'Farida: Men yozişni yoqtiraman. Kelajakda yozuvçi bo\'laman. Men kitob yozişni rejalaştiryapman.',
        'Ahmad: Bu juda yaxşi! Men ham o\'qişni yoqtiraman. Kelajakda professor bo\'lişni rejalaştiryapman.',
        'Farida: Bu juda qiziqarli! Biz kelajakda nima qiliş uçun gaplaşmoqdamiz?',
        'Ahmad: Ha, kelajakdagi rejalaringiz va hobilar haqida gaplaşmoqdamiz.',
      ],
      exercises: [
        {
          id: 'mock-l1',
          instruction: 'Nimalarni eşitdingiz?',
          type: 'çoice',
          items: [
            {
              question: 'Farida kelajakda nima bo\'lişni rejalaştirapti?',
              options: ['Yozuvçi', 'Professor', 'Shifokor'],
              answer: 'Yozuvçi',
            },
            {
              question: 'Ahmad kelajakda nima bo\'lişni rejalaştirapti?',
              options: ['Yozuvçi', 'Professor', 'Shifokor'],
              answer: 'Professor',
            },
            {
              question: 'Farida nima hobi bilan şug\'ullanadi?',
              options: ['Yoziş', 'O\'qiş', 'Rasm çiziş'],
              answer: 'Yoziş',
            },
          ],
        },
        {
          id: 'mock-l2',
          instruction: 'Gaplaşiş tuzilmasini tuşuniş:',
          type: 'çoice',
          items: [
            {
              question: 'Gaplaşiş qanday mavzu haqida?',
              options: ['Kelajakdagi rejalari', 'O\'tgan yillar', 'Hozirgi vaziyat'],
              answer: 'Kelajakdagi rejalari',
            },
            {
              question: 'Ahmad va Farida nima haqida gaplaşyapti?',
              options: ['Kelajakdagi rejalari', 'O\'tgan yillar', 'Hobi'],
              answer: 'Kelajakdagi rejalari',
            },
          ],
        },
      ],
    },
    {
      id: 'writinğ,
      titleUz: 'YOZISH (Writing)',
      descriptionUz: 'Yozma topşiriqni bajariş',
      timeLimit: 15, // daqiqa
      exercises: [
        {
          id: 'mock-w1',
          instruction: 'Maslahat bering:',
          type: 'long-answer',
          items: [
            {
              blank: 'Do\'stingizga salomatlik haqida maslahat bering (kamida 60 so\'z).',
              answer: 'You şould eat more vegetables. You şould drink more water. You şould exercise regularly. You must not smoke. You must wear a seatbelt. You şould sleep enough hours. It is important to take care of your health.',
            },
          ],
        },
        {
          id: 'mock-w2',
          instruction: 'O\'tmiş haqida yozing:',
          type: 'long-answer',
          items: [
            {
              blank: 'O\'tmişda qilgan safaringiz haqida yozing (kamida 60 so\'z).',
              answer: 'I traveled to Uzbekistan last year. I went to Taşkent by train. I stayed in a hotel. I ate good food and saw beautiful places. I was working when I arrived. The city was very beautiful and interesting.',
            },
          ],
        },
      ],
    },
    {
      id: 'speakinğ,
      titleUz: 'GAPIRISH (Speaking)',
      descriptionUz: 'Gapiriş va qisqa so\'rovlar',
      timeLimit: 10, // daqiqa
      exercises: [
        {
          id: 'mock-sp1',
          instruction: 'Do\'stingizni tanişing:',
          type: 'çoice',
          items: [
            {
              question: 'Do\'stingizning ismi nima?',
              options: ['Ahmad', 'Farida', 'Zokir'],
              answer: 'Farida',
            },
            {
              question: 'Do\'stingizning hobisi nima?',
              options: ['Yoziş', 'O\'qiş', 'Rasm çiziş'],
              answer: 'Yoziş',
            },
          ],
        },
        {
          id: 'mock-sp2',
          instruction: 'Kelajakdagi rejalari haqida gapiring:',
          type: 'çoice',
          items: [
            {
              question: 'Do\'stingiz kelajakda nima qilişni rejalaştiryapti?',
              options: ['Yozuvçi bo\'liş', 'Professor bo\'liş', 'Shifokor bo\'liş'],
              answer: 'Yozuvçi bo\'liş',
            },
            {
              question: 'U nima deyişni rejalaştiryapti?',
              options: ['Kitob yoziş', 'O\'qiş', 'Rasm çiziş'],
              answer: 'Kitob yoziş',
            },
          ],
        },
      ],
    },
    {
      id: 'test',
      titleUz: 'BAHOLASH TESTI (Section Test)',
      descriptionUz: 'Barça ko\'nikmalarni qamrovçi test',
      timeLimit: 10, // daqiqa
      passScore: 10,
      exercises: [
        {
          id: 'mock-t1',
          instruction: 'Feallarni to\'g\'ri şakllantiring:',
          type: 'fill-blank',
          items: [
            { blank: 'I ______ (work) yesterday.', answer: 'worked' },
            { blank: 'I ______ (see) that movie.', answer: 'have seen' },
            { blank: 'She ______ (be) at 5 PM.', answer: 'was' },
            { blank: 'They ______ (play) at 5 PM.', answer: 'were playinğ },
            { blank: 'This is the ______ (good) movie.', answer: 'best' },
            { blank: 'This car is ______ (big) than that one.', answer: 'bigger' },
          ],
        },
        {
          id: 'mock-t2',
          instruction: 'To\'g\'ri yoki noto\'g\'ri?',
          type: 'çoice',
          items: [
            {
              question: '"I was working when you called" — bu Past Continuous.',
              options: ['To\'g\'ri', 'Noto\'g\'ri'],
              answer: 'To\'g\'ri',
            },
            {
              question: 'Past Simple zamon o\'tmişdagi voqealar uçun işlatiladi.',
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
          type: 'çoice',
          items: [
            {
              question: 'I ______ my keys everywhere.',
              options: ['look after', 'look for', 'turn on'],
              answer: 'look for',
            },
            {
              question: 'She ______ her çildren every day.',
              options: ['looks after', 'looks for', 'looks up'],
              answer: 'looks after',
            },
          ],
        },
        {
          id: 'mock-t4',
          instruction: 'Javobni yozing:',
          type: 'şort-answer',
          items: [
            { blank: 'What is your hobby?', answer: 'My hobby is painting/reading.' },
            { blank: 'What will you do tomorrow?', answer: 'I will study and work.' },
            { blank: 'What şould I do?', answer: 'You şould eat more vegetables.' },
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
