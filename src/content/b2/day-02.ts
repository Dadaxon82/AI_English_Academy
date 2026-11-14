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
  id: 'b2-day-02',
  titleUz: 'Texnologiya va Innovatsiya',
  titleEn: 'Technology & Innovation',
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
  { id: 'b2-v2-1', word: 'cutting-edge', translationUz: 'zamonaviy, ilgah', explanationEn: 'The most advanced stage of development.', exampleEn: 'This is cutting-edge technology.', exampleUz: 'Bu zamonaviy texnologiya.', pos: 'adj', topic: 'technology', level: 'B2' },
  { id: 'b2-v2-2', word: 'seamless', translationUz: 'uzluksiz', explanationEn: 'Smooth and without any problems.', exampleEn: 'The integration is seamless.', exampleUz: 'Integratsiya uzluksiz.', pos: 'adj', topic: 'technology', level: 'B2' },
  { id: 'b2-v2-3', word: 'obsolete', translationUz: 'eski, mulkosiz', explanationEn: 'No longer produced or used; out of date.', exampleEn: 'Typewriters are now obsolete.', exampleUz: 'Daktil mashinalar endi mulkosiz.', pos: 'adj', topic: 'technology', level: 'B2' },
  { id: 'b2-v2-4', word: 'breakthrough', translationUz: 'yutuq', explanationEn: 'A significantfordance or discovery.', exampleEn: 'A major breakthrough in cancer research.', exampleUz: 'Sariq saraton tadqiqotida katta yutuq.', pos: 'noun', topic: 'innovation', level: 'B2' },
  { id: 'b2-v2-5', word: 'deploy', translationUz: 'jalb qilish, joriy qilish', explanationEn: 'To move to a position or use in a specific way.', exampleEn: 'We need to deploy the new software.', exampleUz: 'Biz yangi dasturni joriy qilishimiz kerak.', pos: 'verb', topic: 'IT', level: 'B2' },
]

export const grammarDay2: GrammarTopic = {
  id: 'b2-g2',
  titleUz: 'Advanced Passive Voice',
  titleEn: 'Advanced Passive Voice',
  explanationUz: 'Passive voice barcha zamonlarda, ayniqsa rasmiy va ilmiy matnlarda foydalanish.',
  explanationEn: 'Passive voice is essential in formal and academic writing to focus on the action rather than the doer.',
  exercises: [
    {
      id: 'b2-g2-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['passive-voice'],
      text: 'The new software ___ (deploy) by the IT team yesterday.',
      answers: ['was deployed'],
      wordBank: ['was deployed'],
      caseSensitive: false,
    },
    {
      id: 'b2-g2-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['passive-voice'],
      question: 'The results ___ (analyze) currently by the specialists.',
      options: ['are being analyzed', 'are analyzing', 'were analyzed', 'have been analyzing'],
      answerIndex: 0,
    },
  ],
}

export const readingDay1: ReadingPassage = {
  id: 'b2-r2',
  level: 'B2',
  titleUz: 'Tibbiyotda SunSuniy Intellekt',
  titleEn: 'AI in Healthcare',
  content: 'Artificial Intelligence is revolutionizing medicine. From early diagnosis of diseases to personalized treatment plans, AI algorithms are processing data faster than humans ever could...',
  glossary: [
    { word: 'diagnosis', uz: 'tahlil, tashxis', level: 'B2' },
    { word: 'personalized', uz: 'shaxsiylashtirilgan', level: 'B2' },
    { word: 'algorithm', uz: 'algoritm', level: 'B2' },
  ],
}

export const listeningDay1: ListeningTask = {
  id: 'b2-l2',
  level: 'B2',
  titleUz: 'Texnologik yangiliklar',
  titleEn: 'Tech News',
  audioUrl: '',
  transcript: 'The latest breakthrough in AI was announced today. It could change how we interact with machines.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay1: WritingTask = {
  id: 'b2-w2',
  level: 'B2',
  titleUz: 'Mahsulot sharhi yozish',
  titleEn: 'Product Review',
  prompt: 'Write a review of a new smartphone. Discuss its features, pros, and cons.',
  wordCountMin: 120,
  wordCountMax: 300,
  analysisRules: [
    { rule: 'Use at least 3 technology vocab words', weight: 3 },
    { rule: 'Clearly state pros and cons', weight: 3 },
  ],
}

export const speakingDay1: SpeakingTask = {
  id: 'b2-s2',
  level: 'B2',
  titleUz: 'Suniy Intellekt haqida bahs',
  titleEn: 'Debate on AI',
  prompt: 'Do you think AI will replace human jobs in the next decade? Explain your view.',
  expectedDuration: 60,
}

export const testDay1: SectionTest = {
  id: 'b2-t2',
  level: 'B2',
  section: 'daily-test',
  titleUz: 'B2 2-kunlik test',
  titleEn: 'B2 Day 02 Test',
  passScore: 70,
  exercises: [
    {
      id: 'b2-t2-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'vocabulary',
      difficulty: 2,
      tags: ['technology'],
      question: 'Which word describes something that is out of date?',
      options: ['cutting-edge', 'seamless', 'obsolete', 'deploy'],
      answerIndex: 2,
    },
  ],
}
