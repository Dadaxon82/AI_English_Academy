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

export const day5: DailyPlanDay = {
  id: 'b2-day-05',
  titleUz: 'Moliyaviy Sfires va Iqtisodiyot',
  titleEn: 'Finance & Economics',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qish', titleEn: 'Reading', minutes: 15 },
    { titleUz: 'Eshitish', titleEn: 'Listening', minutes: 15 },
    { titleUz: 'Gapirish', titleEn: 'Speaking', minutes: 10 },
    { titleUz: 'Yozish', titleEn: 'Writing', minutes: 10 },
  ],
}

export const vocabDay5: VocabularyItem[] = [
  { id: 'b2-v5-1', word: 'fluctuate', translationUz: 'o\tskilanish', explanationEn: 'To rise and fall irregularly.', exampleEn: 'Stock prices fluctuate daily.', exampleUz: 'Birja narxlari har kuni o\tskilanishi mumkin.', pos: 'verb', topic: 'finance', level: 'B2' },
  { id: 'b2-v5-2', word: 'deficit', translationUz: 'kamchilik, deficit', explanationEn: 'The amount by which something is too small.', exampleEn: 'The government is running a budget deficit.', exampleUz: 'Hukumat budjetda kamchilik bilan yuzlanmoqda.', pos: 'noun', topic: 'finance', level: 'B2' },
  { id: 'b2-v5-3', word: 'inflation', translationUz: 'inflyatsiya', explanationEn: 'A general increase in prices.', exampleEn: 'High inflation erodes savings.', exampleUz: 'Yuqori inflyatsiya tejamalarni yeb bitiradi.', pos: 'noun', topic: 'economics', level: 'B2' },
  { id: 'b2-v5-4', word: 'yield', translationUz: 'daromad, foyda', explanationEn: 'Produce or provide (a result, profit, etc).', exampleEn: 'The investment yielded high profits.', exampleUz: 'Investitsiya yuqori foyda berdi.', pos: 'verb', topic: 'finance', level: 'B2' },
  { id: 'b2-v5-5', word: 'volatile', translationUz: 'o\tskiluvchan', explanationEn: 'Liable to change rapidly and unpredictably.', exampleEn: 'The market is very volatile.', exampleUz: 'Bozor juda o\tskiluvchan.', pos: 'adj', topic: 'finance', level: 'B2' },
]

export const grammarDay5: GrammarTopic = {
  id: 'b2-g5',
  titleUz: 'Reporting Verbs',
  titleEn: 'Reporting Verbs',
  explanationUz: 'Xabarlarni yoki boshqalar fikrlarini qayta aytishda foydalaniladigan fe''llar (claim, suggest, deny, insist).',
  explanationEn: 'Reporting verbs are used to convey what someone else said or thought. They add nuance that simple verbs like "said" or "told" do not.',
  exercises: [
    {
      id: 'b2-g5-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['reporting-verbs'],
      text: 'The minister ___ (deny) that the economy was in crisis.',
      answers: ['denied'],
      wordBank: ['denied'],
      caseSensitive: false,
    },
    {
      id: 'b2-g5-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['reporting-verbs'],
      question: 'She ___ (suggest) that we should invest in green energy.',
      options: ['suggested', 'claimed', 'denied', 'insisted'],
      answerIndex: 0,
    },
  ],
}

export const readingDay5: ReadingPassage = {
  id: 'b2-r5',
  level: 'B2',
  titleUz: 'Global Iqtisodiyot va Investitsiya',
  titleEn: 'Global Economics & Investment',
  content: 'Investing in emerging markets can offer high returns but also carries significant risks. Understanding global trade flows and currency fluctuations is essential for any modern investor...',
  glossary: [
    { word: 'emerging', uz: 'rivojlanayotgan', level: 'B2' },
    { word: 'returns', uz: 'daromadlar', level: 'B2' },
    { word: 'trade flows', uz: 'savdo oqimlari', level: 'B2' },
  ],
}

export const listeningDay5: ListeningTask = {
  id: 'b2-l5',
  level: 'B2',
  titleUz: 'Moliyaviy xabar',
  titleEn: 'Financial News',
  audioUrl: '',
  transcript: 'The central bank announced a rise in interest rates to combat the rising inflation.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay5: WritingTask = {
  id: 'b2-w5',
  level: 'B2',
  titleUz: 'Moliyaviy hisobot yozish',
  titleEn: 'Writing a Financial Summary',
  prompt: 'Write a summary of a company\'s financial performance for the last quarter.',
  wordCountMin: 150,
  wordCountMax: 300,
  analysisRules: [
    { rule: 'Use at least 3 finance vocab words', weight: 3 },
    { rule: 'Use correct reporting verbs', weight: 2 },
  ],
}

export const speakingDay5: SpeakingTask = {
  id: 'b2-s5',
  level: 'B2',
  titleUz: 'Iqtisodiyot haqida bahs',
  titleEn: 'Economic Debate',
  prompt: 'Is economic growth always a good thing? Discuss the pros and cons.',
  expectedDuration: 60,
}

export const testDay5: SectionTest = {
  id: 'b2-t5',
  level: 'B2',
  section: 'daily-test',
  titleUz: 'B2 5-kunlik test',
  titleEn: 'B2 Day 05 Test',
  passScore: 70,
  exercises: [
    {
      id: 'b2-t5-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'vocabulary',
      difficulty: 2,
      tags: ['finance'],
      question: 'What does "volatile" mean?',
      options: ['stable', 'liable to change rapidly', 'profitable', 'constant'],
      answerIndex: 1,
    },
  ],
}
