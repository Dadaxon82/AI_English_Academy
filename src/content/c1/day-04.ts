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

export const day4: DailyPlanDay = {
  id: 'c1-day-04',
  titleUz: 'Global Iqtisodiyot',
  titleEn: 'Global Economics',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qish', titleEn: 'Reading', minutes: 15 },
    { titleUz: 'Eshitish', titleEn: 'Listening', minutes: 15 },
    { titleUz: 'Gapirish', titleEn: 'Speaking', minutes: 10 },
    { titleUz: 'Yozish', titleEn: 'Writing', minutes: 10 },
  ],
}

export const vocabDay4: VocabularyItem[] = [
  { id: 'c1-v4-1', word: 'disparity', translationUz: 'farq, tengsizlik', explanationEn: 'A great difference.', exampleEn: 'The wealth disparity is widening.', exampleUz: 'Boylik tengsizligi kengaymoqda.', pos: 'noun', topic: 'economics', level: 'C1' },
  { id: 'c1-v4-2', word: 'equilibrium', translationUz: 'muvozanat', explanationEn: 'A state of balance.', exampleEn: 'Market equilibrium is difficult to maintain.', exampleUz: 'Bozor muvozanatini saqlash qiyin.', pos: 'noun', topic: 'economics', level: 'C1' },
  { id: 'c1-v4-3', word: 'volatility', translationUz: 'o\tskiluvchanlik', explanationEn: 'Liability to change rapidly.', exampleEn: 'Crypto markets are known for high volatility.', exampleUz: 'Kripto bozori yuqori o\tskiluvchanlik bilan tanilgan.', pos: 'noun', topic: 'finance', level: 'C1' },
  { id: 'c1-v4-4', word: 'leverage', translationUz: 'foydalanish', explanationEn: 'To use something to maximum advantage.', exampleEn: 'We can leverage our global network.', exampleUz: 'Biz global tarmoqimizdan foydalanishimiz mumkin.', pos: 'verb', topic: 'business', level: 'C1' },
  { id: 'c1-v4-5', word: 'fiscal', translationUz: 'moliyaviy', explanationEn: 'Relating to government revenue.', exampleEn: 'Fiscal policy is crucial for growth.', exampleUz: 'Moliyaviy siyosat o\'sish uchun muhim.', pos: 'adj', topic: 'economics', level: 'C1' },
]

export const grammarDay4: GrammarTopic = {
  id: 'c1-g4',
  titleUz: 'Subjunctive Mood (Advanced)',
  titleEn: 'Subjunctive Mood (Advanced)',
  explanationUz: 'Murakkab gaplarda "be" fe\'lining ishlatilishi.',
  explanationEn: 'Advanced usage of the subjunctive mood in formal instructions and recommendations.',
  exercises: [
    {
      id: 'c1-g4-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['subjunctive'],
      text: 'It is imperative that the committee ___ (meet) today.',
      answers: ['meet'],
      wordBank: ['meet'],
      caseSensitive: false,
    },
    {
      id: 'c1-g4-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['subjunctive'],
      question: 'I suggest that he ___ (be) more transparent.',
      options: ['is', 'be', 'was', 'will be'],
      answerIndex: 1,
    },
  ],
}

export const readingDay4: ReadingPassage = {
  id: 'c1-r4',
  level: 'C1',
  titleUz: 'Global Savdo Oqimlari',
  titleEn: 'Global Trade Flows',
  content: 'Trade flows are increasingly influenced by geopolitical tensions. The decoupling of major economies is a significant trend that may reshape global supply chains...',
  glossary: [
    { word: 'decoupling', uz: 'ajrlash', level: 'C1' },
    { word: 'geopolitical', uz: 'geopolitik', level: 'C1' },
    { word: 'supply chain', uz: 'tafaqul zanjiri', level: 'C1' },
  ],
}

export const listeningDay4: ListeningTask = {
  id: 'c1-l4',
  level: 'C1',
  titleUz: 'Iqtisodiy Maqola',
  titleEn: 'Economic Lecture',
  audioUrl: '',
  transcript: 'The core issue isn\'t just the capability of AI, but the lack of a clear ethical framework for its deployment.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay4: WritingTask = {
  id: 'c1-w4',
  level: 'C1',
  titleUz: 'Akademik Essay',
  titleEn: 'Academic Essay',
  prompt: 'Discuss the implications of universal basic income in an era of widespread automation.',
  wordCountMin: 300,
  wordCountMax: 600,
  analysisRules: [
    { rule: 'Use at least 5 C1 vocabulary words', weight: 3 },
    { rule: 'Complex sentence structures required', weight: 3 },
  ],
}

export const speakingDay4: SpeakingTask = {
  id: 'c1-s4',
  level: 'C1',
  titleUz: 'Murakkab Bahs',
  titleEn: 'Complex Debate',
  prompt: 'Critically analyze the pros and cons of global trade liberalization.',
  expectedDuration: 180,
}

export const testDay4: SectionTest = {
  id: 'c1-t4',
  level: 'C1',
  section: 'daily-test',
  titleUz: 'C1 4-kunlik test',
  titleEn: 'C1 Day 04 Test',
  passScore: 80,
  exercises: [
    {
      id: 'c1-t4-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'vocabulary',
      difficulty: 4,
      tags: ['economics'],
      question: 'What does "disparity" mean?',
      options: ['equality', 'tengsizlik', 'profit', 'balance'],
      answerIndex: 1,
    },
  ],
}
