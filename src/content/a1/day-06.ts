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

export const day6: DailyPlanDay = {
  id: 'a1-day-06',
  titleUz: 'Joylar va Transport',
  titleEn: 'Places & Transportation',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qish', titleEn: 'Reading', minutes: 15 },
    { titleUz: 'Eshitish', titleEn: 'Listening', minutes: 15 },
    { titleUz: 'Gapirish', titleEn: 'Speaking', minutes: 10 },
    { titleUz: 'Yozish', titleEn: 'Writing', minutes: 10 },
  ],
}

export const vocabDay6: VocabularyItem[] = [
  { id: 'a1-v6-1', word: 'hobby', translationUz: 'xobbi, qiziqish', explanationEn: 'An activity done for pleasure.', exampleEn: 'My hobby is reading books.', exampleUz: 'Mening xobbim kitob o\'qish.', pos: 'noun', topic: 'hobbies', level: 'A1' },
  { id: 'a1-v6-2', word: 'travel', translationUz: 'sayohat qilish', explanationEn: 'Go to different places.', exampleEn: 'I love to travel in summer.', exampleUz: 'Men yozda sayohat qilishni yaxshi ko\'raman.', pos: 'verb', topic: 'travel', level: 'A1' },
  { id: 'a1-v6-3', word: 'bus', translationUz: 'avtobus', explanationEn: 'A large vehicle for passengers.', exampleEn: 'I go to school by bus.', exampleUz: 'Men maktabga avtobusda boraman.', pos: 'noun', topic: 'transport', level: 'A1' },
  { id: 'a1-v6-4', word: 'train', translationUz: 'poyezd', explanationEn: 'A railway vehicle.', exampleEn: 'The train is very fast.', exampleUz: 'Poyezd juda tez.', pos: 'noun', topic: 'transport', level: 'A1' },
  { id: 'a1-v6-5', word: 'bicycle', translationUz: 'velosiped', explanationEn: 'A vehicle with two wheels.', exampleEn: 'I ride my bicycle to the park.', exampleUz: 'Men bog\'ga velosipedda boraman.', pos: 'noun', topic: 'transport', level: 'A1' },
]

export const grammarDay6: GrammarTopic = {
  id: 'a1-g6',
  titleUz: 'Prepositions of Place',
  titleEn: 'Prepositions of Place',
  explanationUz: 'Joylashuv predloglari (in, on, at, under, next to).',
  explanationEn: 'Using prepositions to describe where things or people are.',
  exercises: [
    {
      id: 'a1-g6-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['prepositions'],
      text: 'The book is ___ the table.',
      answers: ['on'],
      wordBank: ['on'],
      caseSensitive: false,
    },
    {
      id: 'a1-g6-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['prepositions'],
      question: 'Where is the cat? It is ___ the chair.',
      options: ['on', 'in', 'at', 'under'],
      answerIndex: 3,
    },
  ],
}

export const readingDay6: ReadingPassage = {
  id: 'a1-r6',
  level: 'A1',
  titleUz: 'Mening bo\'sh vaqtim',
  titleEn: 'My Free Time',
  content: 'In my free time, I like to listen to music and go to the park. I also like to ride my bicycle. On weekends, I often meet my friends. We drink coffee and talk.',
  glossary: [
    { word: 'free time', uz: 'bo\'sh vaqt', level: 'A1' },
    { word: 'often', uz: 'tez-tez', level: 'A1' },
    { word: 'meet', uz: 'uchrashmoq', level: 'A1' },
  ],
}

export const listeningDay6: ListeningTask = {
  id: 'a1-l6',
  level: 'A1',
  titleUz: 'Transport',
  titleEn: 'Transportation',
  audioUrl: '',
  transcript: 'I usually go to work by car. But on weekends, I ride my bicycle.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay6: WritingTask = {
  id: 'a1-w6',
  level: 'A1',
  titleUz: 'Mening xobbim',
  titleEn: 'My Hobby',
  prompt: 'Write 3 simple sentences about your hobby.',
  wordCountMin: 20,
  wordCountMax: 60,
  analysisRules: [
    { rule: 'Use at least 1 hobby word', weight: 2 },
    { rule: 'Use "I like..."', weight: 2 },
  ],
}

export const speakingDay6: SpeakingTask = {
  id: 'a1-s6',
  level: 'A1',
  titleUz: 'Sayohat haqida',
  titleEn: 'Travel Talk',
  prompt: 'How do you go to work? Do you like your city?',
  expectedDuration: 30,
}

export const testDay6: SectionTest = {
  id: 'a1-t6',
  level: 'A1',
  section: 'daily-test',
  titleUz: 'A1 6-kunlik test',
  titleEn: 'A1 Day 06 Test',
  passScore: 70,
  exercises: [
    {
      id: 'a1-t6-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'vocabulary',
      difficulty: 1,
      tags: ['transport'],
      question: 'What is a vehicle with two wheels?',
      options: ['bus', 'train', 'bicycle', 'car'],
      answerIndex: 2,
    },
  ],
}
