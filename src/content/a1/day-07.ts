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

export const day7: DailyPlanDay = {
  id: 'a1-day-07',
  titleUz: 'Hobbilar va Tuyu-tuyu',
  titleEn: 'Hobbies & Feelings',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qish', titleEn: 'Reading', minutes: 15 },
    { titleUz: 'Eshitish', titleEn: 'Listening', minutes: 15 },
    { titleUz: 'Gapirish', titleEn: 'Speaking', minutes: 10 },
    { titleUz: 'Yozish', titleEn: 'Writing', minutes: 10 },
  ],
}

export const vocabDay7: VocabularyItem[] = [
  { id: 'a1-v7-1', word: 'happy', translationUz: 'baxtli', explanationEn: 'Feeling joy.', exampleEn: 'I am happy today.', exampleUz: 'Men bugun baxtliman.', pos: 'adj', topic: 'feelings', level: 'A1' },
  { id: 'a1-v7-2', word: 'sad', translationUz: 'xafasiz', explanationEn: 'Feeling unhappy.', exampleEn: 'He is sad.', exampleUz: 'U xafasiz.', pos: 'adj', topic: 'feelings', level: 'A1' },
  { id: 'a1-v7-3', word: 'tired', translationUz: 'charchagan', explanationEn: 'Needing rest.', exampleEn: 'I am tired.', exampleUz: 'Men charchadim.', pos: 'adj', topic: 'feelings', level: 'A1' },
  { id: 'a1-v7-4', word: 'excited', translationUz: 'hayajonlangan', explanationEn: 'Very happy and eager.', exampleEn: 'I am excited for the trip.', exampleUz: 'Men sayohat uchun hayajonman.', pos: 'adj', topic: 'feelings', level: 'A1' },
  { id: 'a1-v7-5', word: 'interested', translationUz: 'qiziqan', explanationEn: 'Wanting to know about something.', exampleEn: 'I am interested in music.', exampleUz: 'Men musiqa bilan qiziqaman.', pos: 'adj', topic: 'hobbies', level: 'A1' },
]

export const grammarDay7: GrammarTopic = {
  id: 'a1-g7',
  titleUz: 'Adjectives and Feelings',
  titleEn: 'Adjectives and Feelings',
  explanationUz: 'Hisob-kitob: Sifatlar bilan his-tuyg\'ularni ifodalash.',
  explanationEn: 'Using adjectives to express feelings and states.',
  exercises: [
    {
      id: 'a1-g7-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['adjectives'],
      text: 'I ___ (happy) to see you.',
      answers: ['happy'],
      wordBank: ['happy'],
      caseSensitive: false,
    },
    {
      id: 'a1-g7-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['adjectives'],
      question: 'How do you feel?',
      options: ['I am tired.', 'I am happy.', 'I am student.', 'I am red.'],
      answerIndex: 0,
    },
  ],
}

export const readingDay7: ReadingPassage = {
  id: 'a1-r7',
  level: 'A1',
  titleUz: 'Mening xobbim',
  titleEn: 'My Hobby',
  content: 'My name is Alex. I love music. I play the guitar every evening. I am very happy when I play music. It is my favorite hobby.',
  glossary: [
    { word: 'favorite', uz: 'sevimli', level: 'A1' },
    { word: 'hobby', uz: 'xobbi', level: 'A1' },
    { word: 'play', uz: 'chalmoq', level: 'A1' },
  ],
}

export const listeningDay7: ListeningTask = {
  id: 'a1-l7',
  level: 'A1',
  titleUz: 'Hissiyotlar',
  titleEn: 'Feelings',
  audioUrl: '',
  transcript: 'I am so excited! Today is my birthday.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay7: WritingTask = {
  id: 'a1-w7',
  level: 'A1',
  titleUz: 'Sizning xobbingiz',
  titleEn: 'Your Hobby',
  prompt: 'Write 3 simple sentences about your hobby.',
  wordCountMin: 20,
  wordCountMax: 60,
  analysisRules: [
    { rule: 'Use at least 1 hobby word', weight: 2 },
    { rule: 'Use "I like..."', weight: 2 },
  ],
}

export const speakingDay7: SpeakingTask = {
  id: 'a1-s7',
  level: 'A1',
  titleUz: 'Siz qanday his qilasiz?',
  titleEn: 'How do you feel?',
  prompt: 'How do you feel today? Why?',
  expectedDuration: 30,
}

export const testDay7: SectionTest = {
  id: 'a1-t7',
  level: 'A1',
  section: 'daily-test',
  titleUz: 'A1 7-kunlik test',
  titleEn: 'A1 Day 07 Test',
  passScore: 70,
  exercises: [
    {
      id: 'a1-t7-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'vocabulary',
      difficulty: 1,
      tags: ['feelings'],
      question: 'What is the opposite of "happy"?',
      options: ['excited', 'sad', 'happy', 'tired'],
      answerIndex: 1,
    },
  ],
}
