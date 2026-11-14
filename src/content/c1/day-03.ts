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

export const day3: DailyPlanDay = {
  id: 'c1-day-03',
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

export const vocabDay3: VocabularyItem[] = [
  { id: 'c1-v3-1', word: 'fiscal', translationUz: 'moliyaviy', explanationEn: 'Relating to government revenue and spending.', exampleEn: 'The government is proposing new fiscal reforms.', exampleUz: 'Hukumat yangi moliyaviy islohotlarni taklif qilmoqda.', pos: 'adj', topic: 'economics', level: 'C1' },
  { id: 'c1-v3-2', word: 'subsidize', translationUz: 'subsidiya berish', explanationEn: 'Support financially.', exampleEn: 'The government decided to subsidize renewable energy.', exampleUz: 'Hukumat qayta tiklanuvchi energiyaga subsidiya berishga qaror qildi.', pos: 'verb', topic: 'economics', level: 'C1' },
  { id: 'c1-v3-3', word: 'volatility', translationUz: 'o\tskiluvchanlik', explanationEn: 'Liability to change rapidly and unpredictably.', exampleEn: 'Currency volatility can affect international trade.', exampleUz: 'Valyuta o\tskiluvchanligi xalqaro savdoni ta\'sir qilishi mumkin.', pos: 'noun', topic: 'finance', level: 'C1' },
  { id: 'c1-v3-4', word: 'equilibrium', translationUz: 'muvozanat', explanationEn: 'A state in which opposing forces are balanced.', exampleEn: 'The market is struggling to reach equilibrium.', exampleUz: 'Bozor muvazannatga erishish uchun kurashmoqda.', pos: 'noun', topic: 'economics', level: 'C1' },
  { id: 'c1-v3-5', word: 'leverage', translationUz: 'foydalanish', explanationEn: 'Use something to maximum advantage.', exampleEn: 'Companies can leverage AI to improve efficiency.', exampleUz: 'Kompaniyalari samaradorlikni oshirish uchun AI dan foydalanishlari mumkin.', pos: 'verb', topic: 'business', level: 'C1' },
]

export const grammarDay3: GrammarTopic = {
  id: 'c1-g3',
  titleUz: 'Inverted Conditionals',
  titleEn: 'Inverted Conditionals',
  explanationUz: 'Taqqozli konditsionallar (masalan, "Should you require...").',
  explanationEn: 'Using inversion with "should", "were", and "had" to create a more formal and sophisticated conditional structure.',
  exercises: [
    {
      id: 'c1-g3-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['inversion'],
      text: 'Should you require any further assistance, do not hesitate to contact us.',
      answers: ['require'],
      wordBank: ['require'],
      caseSensitive: false,
    },
    {
      id: 'c1-g3-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['inversion'],
      question: 'Were I ___ (know) about the issue, I would have acted immediately.',
      options: ['known', 'have known', 'had known', 'knowing'],
      answerIndex: 2,
    },
  ],
}

export const readingDay3: ReadingPassage = {
  id: 'c1-r3',
  level: 'C1',
  titleUz: 'Global Savdo Oqimlari',
  titleEn: 'Global Trade Flows',
  content: 'The dynamics of global trade have shifted significantly in recent years. Protectionism is rising in several regions, challenging the established liberal trade order...',
  glossary: [
    { word: 'protectionism', uz: 'himoyagarchilik', level: 'C1' },
    { word: 'liberalization', uz: 'liberalizatsiya', level: 'C1' },
    { word: 'dynamics', uz: 'dinamika', level: 'C1' },
  ],
}

export const listeningDay3: ListeningTask = {
  id: 'c1-l3',
  level: 'C1',
  titleUz: 'Iqtisodiy Maqola',
  titleEn: 'Economic Lecture',
  audioUrl: '',
  transcript: 'The overarching challenge for global trade is balancing economic growth with environmental sustainability.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay3: WritingTask = {
  id: 'c1-w3',
  level: 'C1',
  titleUz: 'Iqtisodiy Tahlil',
  titleEn: 'Economic Analysis',
  prompt: 'Write a critical analysis of the impact of protectionism on global markets.',
  wordCountMin: 300,
  wordCountMax: 600,
  analysisRules: [
    { rule: 'Use at least 5 C1 economic terms', weight: 3 },
    { rule: 'Critical perspective required', weight: 3 },
  ],
}

export const speakingDay3: SpeakingTask = {
  id: 'c1-s3',
  level: 'C1',
  titleUz: 'Savdo va Etika',
  titleEn: 'Trade & Ethics',
  prompt: 'Discuss the ethical implications of trade with countries that have poor human rights records.',
  expectedDuration: 180,
}

export const testDay3: SectionTest = {
  id: 'c1-t3',
  level: 'C1',
  section: 'daily-test',
  titleUz: 'C1 3-kunlik test',
  titleEn: 'C1 Day 03 Test',
  passScore: 80,
  exercises: [
    {
      id: 'c1-t3-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'vocabulary',
      difficulty: 4,
      tags: ['economics'],
      question: 'What does "subsidize" mean?',
      options: ['tax', 'support financially', 'penalize', 'regulate'],
      answerIndex: 1,
    },
  ],
}
