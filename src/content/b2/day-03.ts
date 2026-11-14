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
  id: 'b2-day-03',
  titleUz: 'Atrof-muhit va Ekologiya',
  titleEn: 'Environment & Ecology',
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
  { id: 'b2-v3-1', word: 'sustainable', translationUz: 'barqaror', explanationEn: 'Able to be maintained at a certain rate.', exampleEn: 'We need sustainable energy.', exampleUz: 'Bizga barqaror energiya kerak.', pos: 'adj', topic: 'environment', level: 'B2' },
  { id: 'b2-v3-2', word: 'biodegradable', translationUz: 'biodegradatsiyalanadigan', explanationEn: 'Capable of being decomposed by bacteria.', exampleEn: 'The packaging is biodegradable.', exampleUz: 'Qadoqlovchi biodegradatsiyalanadigan.', pos: 'adj', topic: 'environment', level: 'B2' },
  { id: 'b2-v3-3', word: 'depletion', translationUz: 'kamayish', explanationEn: 'Reduction in the number or quantity.', exampleEn: 'The depletion of natural resources.', exampleUz: 'Tabiiy resurslarning kamayishi.', pos: 'noun', topic: 'ecology', level: 'B2' },
  { id: 'b2-v3-4', word: 'conservation', translationUz: 'muhofaza', explanationEn: 'Prevention of waste.', exampleEn: 'Wildlife conservation is crucial.', exampleUz: 'Yovvoyi tabiatni muhofazalash juda muhim.', pos: 'noun', topic: 'environment', level: 'B2' },
  { id: 'b2-v3-5', word: 'impact', translationUz: 'ta'sir', explanationEn: 'The effect or influence of something.', exampleEn: 'Global warming has a huge impact.', exampleUz: 'Global isitish katta ta'sirga ega.', pos: 'noun', topic: 'ecology', level: 'B2' },
]

export const grammarDay3: GrammarTopic = {
  id: 'b2-g3',
  titleUz: 'Modal Verbs in the Past',
  titleEn: 'Modal Verbs in the Past',
  explanationUz: 'O\'tgan zamonにおける modal verbs (must have, should have, could have).',
  explanationEn: 'Using modal verbs like "should have", "must have", and "could have" to express degrees of certainty, regret, or obligation in the past.',
  exercises: [
    {
      id: 'b2-g3-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['modal-verbs'],
      text: 'I ___ (tell) him the truth, but I was too afraid.',
      answers: ['should have told'],
      wordBank: ['should have told'],
      caseSensitive: false,
    },
    {
      id: 'b2-g3-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['modal-verbs'],
      question: 'She ___ (be) more careful; the accident was avoidable.',
      options: ['must have been', 'should have been', 'could have been', 'might have been'],
      answerIndex: 1,
    },
  ],
}

export const readingDay3: ReadingPassage = {
  id: 'b2-r3',
  level: 'B2',
  titleUz: 'Iqlim o\'zgarishi va biz',
  titleEn: 'Climate Change & Us',
  content: 'Climate change is no longer a distant threat. It is affecting agriculture, health, and safety worldwide. Taking action requires a multi-faceted approach involving policy change and individual responsibility...',
  glossary: [
    { word: 'consequence', uz: 'natija', level: 'B2' },
    { word: 'urgent', uz: 'shoshilinch', level: 'B2' },
    { word: 'awareness', uz: 'xabardorlik', level: 'B2' },
  ],
}

export const listeningDay3: ListeningTask = {
  id: 'b2-l3',
  level: 'B2',
  titleUz: 'Tabiatni muhofaza qilish',
  titleEn: 'Environmental Protection',
  audioUrl: '',
  transcript: 'We must prioritize sustainable practices to ensure the survival of our planet for future generations.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay3: WritingTask = {
  id: 'b2-w3',
  level: 'B2',
  titleUz: 'Ekologik loyiha',
  titleEn: 'Ecological Project',
  prompt: 'Describe a project that helps the environment in your city. What are its goals?',
  wordCountMin: 150,
  wordCountMax: 300,
  analysisRules: [
    { rule: 'Use 3 environment keywords', weight: 3 },
    { rule: 'Clear structure (Intro, Body, Conclusion)', weight: 2 },
  ],
}

export const speakingDay3: SpeakingTask = {
  id: 'b2-s3',
  level: 'B2',
  titleUz: 'Yashil texnologiyalar',
  titleEn: 'Green Tech',
  prompt: 'Do you think individuals can make a real difference in fighting climate change?',
  expectedDuration: 60,
}

export const testDay3: SectionTest = {
  id: 'b2-t3',
  level: 'B2',
  section: 'daily-test',
  titleUz: 'B2 3-kunlik test',
  titleEn: 'B2 Day 03 Test',
  passScore: 70,
  exercises: [
    {
      id: 'b2-t3-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'vocabulary',
      difficulty: 2,
      tags: ['environment'],
      question: 'What is another word for "sustainable"?',
      options: ['temporary', 'renewable', 'expensive', 'harmful'],
      answerIndex: 1,
    },
  ],
}
