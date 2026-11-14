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
  id: 'b2-day-01',
  titleUz: 'Professional Communication',
  titleEn: 'Professional Communication',
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
  { id: 'b2-v1-1', word: 'leverage', translationUz: 'foydalanish', explanationEn: 'To use something to maximum advantage.', exampleEn: 'We can leverage our existing resources.', exampleUz: 'Biz mavjud resurslarimizdan foydalanishimiz mumkin.', pos: 'verb', topic: 'business', level: 'B2' },
  { id: 'b2-v1-2', word: 'redundant', translationUz: 'keraksiz', explanationEn: 'No longer useful or needed.', exampleEn: 'The old system became redundant.', exampleUz: 'Eski tizim keraksiz bo\'ldi.', pos: 'adj', topic: 'workplace', level: 'B2' },
  { id: 'b2-v1-3', word: 'mitigate', translationUz: 'yumshatish', explanationEn: 'Make less severe.', exampleEn: 'We need to mitigate the risks.', exampleUz: 'Biz xavflarni yumshatishimiz kerak.', pos: 'verb', topic: 'business', level: 'B2' },
  { id: 'b2-v1-4', word: 'bottleneck', translationUz: 'to\'qqan joy', explanationEn: 'A point of congestion.', exampleEn: 'The shipping port is a bottleneck.', exampleUz: 'Yuk tashish porti to\'qqan joy hisoblanadi.', pos: 'noun', topic: 'logistics', level: 'B2' },
  { id: 'b2-v1-5', word: 'streamline', translationUz: 'soddalashtirish', explanationEn: 'Make a process more efficient.', exampleEn: 'We want to streamline the workflow.', exampleUz: 'Biz ish jarayonini soddalashtirishni xohlaymiz.', pos: 'verb', topic: 'management', level: 'B2' },
]

export const grammarDay1: GrammarTopic = {
  id: 'b2-g1',
  titleUz: 'Mixed Conditionals',
  titleEn: 'Mixed Conditionals',
  explanationUz: 'Mix konditsionallar: o\'tmishdagi holat va hozirgi natija yoki aksincha.',
  explanationEn: 'Mixed conditionals describe hypothetical situations where the time of the condition and the time of the result are different.',
  exercises: [
    {
      id: 'b2-g1-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['mixed-conditionals'],
      text: 'If I ___ (take) that job last year, I ___ (be) much happier now.',
      answers: ['had taken', 'would be'],
      wordBank: ['had taken', 'would be'],
      caseSensitive: false,
    },
    {
      id: 'b2-g1-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['mixed-conditionals'],
      question: 'If they ___ (not/waste) so much money, they ___ (have) a house now.',
      options: ['hadn\'t wasted, would have', 'didn\'t waste, would have', 'hadn\'t wasted, would have', 'haven\'t wasted, will have'],
      answerIndex: 0,
    },
  ],
}

export const readingDay1: ReadingPassage = {
  id: 'b2-r1',
  level: 'B2',
  titleUz: 'Masofaviy ishning kelajasi',
  titleEn: 'The Future of Remote Work',
  content: 'The global shift towards remote work has fundamentally changed the corporate landscape. While it offers flexibility, it also presents challenges in maintaining company culture and ensuring effective communication...',
  glossary: [
    { word: 'landscape', uz: 'manzara, holat', level: 'B2' },
    { word: 'flexibility', uz: 'moslashuvchanlik', level: 'B2' },
    { word: 'corporate', uz: 'korporativ', level: 'B2' },
  ],
}

export const listeningDay1: ListeningTask = {
  id: 'b2-l1',
  level: 'B2',
  titleUz: 'Ishchi suhbat',
  titleEn: 'Workplace Conversation',
  audioUrl: '', // Placeholder
  transcript: 'A: We need to streamline the onboarding process. B: I agree, the current bottleneck is the paperwork.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay1: WritingTask = {
  id: 'b2-w1',
  level: 'B2',
  titleUz: ' shikoyat xati yozish',
  titleEn: 'Writing a Complaint Email',
  prompt: 'Write an email to a supplier complaining about a delayed shipment and asking for a discount.',
  wordCountMin: 100,
  wordCountMax: 250,
  analysisRules: [
    { rule: 'Must include a formal greeting', weight: 2 },
    { rule: 'Must use at least 3 B2 vocabulary words', weight: 3 },
    { rule: 'Must have a clear call to action', weight: 2 },
  ],
}

export const speakingDay1: SpeakingTask = {
  id: 'b2-s1',
  level: 'B2',
  titleUz: 'Masofaviy ish haqida fikr bildiring',
  titleEn: 'Discuss Remote Work',
  prompt: 'Do you think remote work is better than office work? Give reasons.',
  expectedDuration: 60,
}

export const testDay1: SectionTest = {
  id: 'b2-t1',
  level: 'B2',
  section: 'daily-test',
  titleUz: 'B2 1-kunlik test',
  titleEn: 'B2 Day 01 Test',
  passScore: 70,
  exercises: [
    {
      id: 'b2-t1-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'vocabulary',
      difficulty: 2,
      tags: ['business'],
      question: 'Which word means to make something more efficient?',
      options: ['bottleneck', 'streamline', 'mitigate', 'leverage'],
      answerIndex: 1,
    },
  ],
}
