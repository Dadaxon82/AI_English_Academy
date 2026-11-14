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

export const day1: DailyPlanDay = {
  id: 'a1-day-01',
  titleUz: 'Salomlashish va O\'zini tanishtirish',
  titleEn: 'Greetings & Personal Info',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qish', titleEn: 'Reading', minutes: 15 },
    { titleUz: 'Eshitish', titleEn: 'Listening', minutes: 15 },
    { titleUz: 'Gapirish', titleEn: 'Speaking', minutes: 10 },
    { titleUz: 'Yozish', titleEn: 'Writing', minutes: 10 },
  ],
}

export const vocabDay1: VocabularyItem[] = [
  { id: 'a1-v1-1', word: 'hello', translationUz: 'salom', explanationEn: 'A common greeting.', exampleEn: 'Hello! How are you?', exampleUz: 'Salom! Qalaysiz?', pos: 'interjection', topic: 'greetings', level: 'A1' },
  { id: 'a1-v1-2', word: 'name', translationUz: 'ism', explanationEn: 'What a person is called.', exampleEn: 'My name is John.', exampleUz: 'Mening ismim Jon.', pos: 'noun', topic: 'personal', level: 'A1' },
  { id: 'a1-v1-3', word: 'student', translationUz: 'talaba', explanationEn: 'A person who is studying.', exampleEn: 'I am a student.', exampleUz: 'Men talabaman.', pos: 'noun', topic: 'jobs', level: 'A1' },
  { id: 'a1-v1-4', word: 'teacher', translationUz: 'o\'qituvchi', explanationEn: 'A person who teaches.', exampleEn: 'She is a teacher.', exampleUz: 'U o\'qituvchi.', pos: 'noun', topic: 'jobs', level: 'A1' },
  { id: 'a1-v1-5', word: 'friend', translationUz: 'do\'st', explanationEn: 'A person you know well.', exampleEn: 'He is my friend.', exampleUz: 'U mening do\'stim.', pos: 'noun', topic: 'people', level: 'A1' },
]

export const grammarDay1: GrammarTopic = {
  id: 'a1-g1',
  titleUz: 'To be (am, is, are)',
  titleEn: 'To be (am, is, are)',
  explanationUz: 'Hozirgi zamonda "bo\'lmoq" fe\'li.',
  explanationEn: 'Using "to be" to describe identity, feelings, and locations.',
  exercises: [
    {
      id: 'a1-g1-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['to-be'],
      text: 'I ___ a student. They ___ my friends.',
      answers: ['am', 'are'],
      wordBank: ['am', 'are'],
      caseSensitive: false,
    },
    {
      id: 'a1-g1-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['to-be'],
      question: 'She ___ from Uzbekistan.',
      options: ['am', 'is', 'are', 'be'],
      answerIndex: 1,
    },
  ],
}

export const readingDay1: ReadingPassage = {
  id: 'a1-r1',
  level: 'A1',
  titleUz: 'Mening do\'stim',
  titleEn: 'My Friend',
  content: 'Hello! My name is Sarah. I am from London. I am a doctor. I am very happy to meet you. This is my friend, Tom. He is a student.',
  glossary: [
    { word: 'happy', uz: 'baxtli', level: 'A1' },
    { word: 'meet', uz: 'uchrashmoq', level: 'A1' },
    { word: 'from', uz: 'dan', level: 'A1' },
  ],
}

export const listeningDay1: ListeningTask = {
  id: 'a1-l1',
  level: 'A1',
  titleUz: 'Tanishuv',
  titleEn: 'Introduction',
  audioUrl: '',
  transcript: 'Hello! I am Maria. I am from Spain. Nice to meet you.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay1: WritingTask = {
  id: 'a1-w1',
  level: 'A1',
  titleUz: 'O\'zini tanishtirish',
  titleEn: 'Introducing Yourself',
  prompt: 'Write 3 simple sentences about yourself (Name, Country, Job).',
  wordCountMin: 10,
  wordCountMax: 50,
  analysisRules: [
    { rule: 'Use "I am..."', weight: 2 },
    { rule: 'Mention at least 2 facts', weight: 2 },
  ],
}

export const speakingDay1: SpeakingTask = {
  id: 'a1-s1',
  level: 'A1',
  titleUz: 'Salomlashish',
  titleEn: 'Greetings',
  prompt: 'Say hello and tell your name.',
  expectedDuration: 30,
}

export const testDay1: SectionTest = {
  id: 'a1-t1',
  level: 'A1',
  section: 'daily-test',
  titleUz: 'A1 1-kunlik test',
  titleEn: 'A1 Day 01 Test',
  passScore: 70,
  exercises: [
    {
      id: 'a1-t1-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'vocabulary',
      difficulty: 1,
      tags: ['greetings'],
      question: 'How do you say "Salom" in English?',
      options: ['Goodbye', 'Hello', 'Please', 'Thank you'],
      answerIndex: 1,
    },
  ],
}
