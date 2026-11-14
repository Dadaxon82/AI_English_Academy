import type {
  DailyPlanDay,
  Exercise,
  GrammarTopic,
  ListeningTask,
  MockExamSpec,
  ReadingPassage,
  SectionTest,
  SpeakingTask,
  VocabularyItem,
  WritingTask,
} from '../types'

export const day2: DailyPlanDay = {
  id: 'a1-day-02',
  titleUz: 'Sonlar va Ranglar',
  titleEn: 'Numbers & Colors',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qish', titleEn: 'Reading', minutes: 15 },
    { titleUz: 'Eshitish', titleEn: 'Listening', minutes: 15 },
    { titleUz: 'Gapirish', titleEn: 'Speaking', minutes: 10 },
    { titleUz: 'Yozish', titleEn: 'Writing', minutes: 10 },
  ],
}

export const vocabDay2: VocabularyItem[] = [
  { id: 'a1-v2-1', word: 'one', translationUz: 'bir', explanationEn: 'The number 1.', exampleEn: 'I have one apple.', exampleUz: 'Menda bir olma bor.', pos: 'number', topic: 'numbers', level: 'A1' },
  { id: 'a1-v2-2', word: 'two', translationUz: 'ikki', explanationEn: 'The number 2.', exampleEn: 'I have two pens.', exampleUz: 'Menda ikkita ruchka bor.', pos: 'number', topic: 'numbers', level: 'A1' },
  { id: 'a1-v2-3', word: 'red', translationUz: 'qizil', explanationEn: 'A primary color.', exampleEn: 'The rose is red.', exampleUz: 'Gul qizil.', pos: 'color', topic: 'colors', level: 'A1' },
  { id: 'a1-v2-4', word: 'blue', translationUz: 'ko\'k', explanationEn: 'The color of the sky.', exampleEn: 'The sky is blue.', exampleUz: 'Osmon ko\'k.', pos: 'color', topic: 'colors', level: 'A1' },
  { id: 'a1-v2-5', word: 'green', translationUz: 'yashil', explanationEn: 'The color of grass.', exampleEn: 'The grass is green.', exampleUz: 'Ot o\'lchish.', pos: 'color', topic: 'colors', level: 'A1' },
]

export const grammarDay2: GrammarTopic = {
  id: 'a1-g2',
  titleUz: 'Plural Nouns',
  titleEn: 'Plural Nouns',
  explanationUz: 'Ko\'p sonli otlar (s/es qo\'shimchasi).',
  explanationEn: 'Adding -s or -es to make nouns plural.',
  exercises: [
    {
      id: 'a1-g2-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['plural'],
      text: 'I have two ___ (book).',
      answers: ['books'],
      wordBank: ['books'],
      caseSensitive: false,
    },
    {
      id: 'a1-g2-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['plural'],
      question: 'There are three ___ (box).',
      options: ['box', 'boxes', 'boxs', 'boxies'],
      answerIndex: 1,
    },
  ],
}

export const readingDay2: ReadingPassage = {
  id: 'a1-r2',
  level: 'A1',
  titleUz: 'Mening xonam',
  titleEn: 'My Room',
  content: 'My room is small. It has a big bed. There are two chairs and a desk. The walls are white. I have many books on the shelf.',
  glossary: [
    { word: 'shelf', uz: 'javon', level: 'A1' },
    { word: 'wall', uz: 'devor', level: 'A1' },
    { word: 'small', uz: 'kichik', level: 'A1' },
  ],
}

export const listeningDay2: ListeningTask = {
  id: 'a1-l2',
  level: 'A1',
  titleUz: 'Ranglarni aniqlash',
  titleEn: 'Identifying Colors',
  audioUrl: '',
  transcript: 'Look at the picture. What color is the car? It is red. What color is the house? It is blue.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay2: WritingTask = {
  id: 'a1-w2',
  level: 'A1',
  titleUz: 'Xonamni tasvirlash',
  titleEn: 'Describe Your Room',
  prompt: 'Write 3 simple sentences about your room. (Color, Furniture, Size)',
  wordCountMin: 20,
  wordCountMax: 60,
  analysisRules: [
    { rule: 'Use at least 2 colors', weight: 2 },
    { rule: 'Use plural nouns', weight: 2 },
  ],
}

export const speakingDay2: SpeakingTask = {
  id: 'a1-s2',
  level: 'A1',
  titleUz: 'Ranglar haqida gapirish',
  titleEn: 'Talking about Colors',
  prompt: 'What is your favorite color? Why?',
  expectedDuration: 30,
}

export const testDay2: SectionTest = {
  id: 'a1-t2',
  level: 'A1',
  section: 'daily-test',
  titleUz: 'A1 2-kunlik test',
  titleEn: 'A1 Day 02 Test',
  passScore: 70,
  exercises: [
    {
      id: 'a1-t2-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'vocabulary',
      difficulty: 1,
      tags: ['colors'],
      question: 'What color is the grass?',
      options: ['red', 'blue', 'green', 'yellow'],
      answerIndex: 2,
    },
  ],
}
