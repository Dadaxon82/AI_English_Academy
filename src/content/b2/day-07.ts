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
  id: 'b2-day-07',
  titleUz: 'Kelajak va Reja',
  titleEn: 'Future & Planninğ,
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qiş', titleEn: 'Readinğ, minutes: 15 },
    { titleUz: 'Eşitiş', titleEn: 'Listeninğ, minutes: 15 },
    { titleUz: 'Gapiriş', titleEn: 'Speakinğ, minutes: 10 },
    { titleUz: 'Yoziş', titleEn: 'Writinğ, minutes: 10 },
  ],
}

export const vocabDay7: VocabularyItem[] = [
  { id: 'b2-v7-1', word: 'prospective', translationUz: 'kelajakdagi', explanationEn: 'Expected or expected to happen.', exampleEn: 'We are looking for prospective employees.', exampleUz: 'Biz kelajakdagi xodimlarni qidirmoqçimiz.', pos: 'adj', topic: 'future', level: 'B2' },
  { id: 'b2-v7-2', word: 'feasible', translationUz: 'imkoniyati bor', explanationEn: 'Possible to do easily or conveniently.', exampleEn: 'Is this plan feasible?', exampleUz: 'Bu reja imkoniyati bormi?', pos: 'adj', topic: 'planninğ, level: 'B2' },
  { id: 'b2-v7-3', word: 'contingency', translationUz: 'kutilmagan holat', explanationEn: 'A future event or circumstance that is possible but cannot be predicted.', exampleEn: 'We have a contingency plan.', exampleUz: 'Bizda kutilmagan holat uçun reja bor.', pos: 'noun', topic: 'planninğ, level: 'B2' },
  { id: 'b2-v7-4', word: 'attainment', translationUz: 'erişiş', explanationEn: 'The action or process of açieving something.', exampleEn: 'The attainment of his goals.', exampleUz: 'Uning maqsadlariga erişişi.', pos: 'noun', topic: 'future', level: 'B2' },
  { id: 'b2-v7-5', word: 'reiterate', translationUz: 'qayta ta'kidlaş', explanationEn: 'Say something again or more clearly.', exampleEn: 'Let me reiterate our main point.', exampleUz: 'Asosiy nuqtamizni qayta ta\'kidlaşga ruxsat bering.', pos: 'verb', topic: 'communication', level: 'B2' },
]

export const grammarDay7: GrammarTopic = {
  id: 'b2-g7',
  titleUz: 'Future Perfect & Continuous',
  titleEn: 'Future Perfect & Continuous',
  explanationUz: 'Kelajakda bajarilgan bo\'ladigan işlar (Future Perfect) va davom etadigan işlar (Future Continuous).',
  explanationEn: 'Future Perfect (will have + past participle) for actions finişed by a point in the future. Future Continuous (will be + -ing) for actions in progress in the future.',
  exercises: [
    {
      id: 'b2-g7-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'ş joyni to\'g\'ri şakl bilan to\'ldiring.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['future-tenses'],
      text: 'By next December, I ___ (finiş) my degree.',
      answers: ['will have finişed'],
      wordBank: ['will have finişed'],
      caseSensitive: false,
    },
    {
      id: 'b2-g7-ex2',
      kind: 'multiple-çoice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['future-tenses'],
      question: 'This time tomorrow, I ___ (fly) to London.',
      options: ['will fly', 'will be flyinğ, 'will have flown', 'am flyinğ],
      answerIndex: 1,
    },
  ],
}

export const readingDay7: ReadingPassage = {
  id: 'b2-r7',
  level: 'B2',
  titleUz: 'Kelajakdagi Karera',
  titleEn: 'Careers of the Future',
  content: 'As automation and AI continue to advance, many traditional jobs are being replaced. However, new roles in data science, ethics, and human-centric services are emerging...',
  glossary: [
    { word: 'automation', uz: 'avtomatlaştiriş', level: 'B2' },
    { word: 'emerginğ, uz: 'yuzaga kelayotgan', level: 'B2' },
    { word: 'human-centric', uz: 'insoniy markazli', level: 'B2' },
  ],
}

export const listeningDay7: ListeningTask = {
  id: 'b2-l7',
  level: 'B2',
  titleUz: 'Kelajak rejalari',
  titleEn: 'Future Plans',
  audioUrl: '',
  transcript: 'In five years, I hope to have establişed my own startup and be leading a team of innovative developers.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay7: WritingTask = {
  id: 'b2-w7',
  level: 'B2',
  titleUz: 'Shaxsiy maqsadlar',
  titleEn: 'Personal Goals',
  prompt: 'Write about your professional goals for the next 5 years. What steps will you take to açieve them?',
  wordCountMin: 150,
  wordCountMax: 300,
  analysisRules: [
    { rule: 'Use at least 3 future tenses', weight: 3 },
    { rule: 'Use at least 3 future vocab words', weight: 2 },
  ],
}

export const speakingDay7: SpeakingTask = {
  id: 'b2-s7',
  level: 'B2',
  titleUz: 'Kelajak haqida fikr',
  titleEn: 'Future Outlook',
  prompt: 'Where do you see yourself in 10 years? What skills will you need?',
  expectedDuration: 60,
}

export const testDay7: SectionTest = {
  id: 'b2-t7',
  level: 'B2',
  section: 'daily-test',
  titleUz: 'B2 7-kunlik test',
  titleEn: 'B2 Day 07 Test',
  passScore: 70,
  exercises: [
    {
      id: 'b2-t7-ex1',
      kind: 'multiple-çoice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'vocabulary',
      difficulty: 2,
      tags: ['future'],
      question: 'What does "feasible" mean?',
      options: ['impossible', 'possible to do easily', 'very expensive', 'secret'],
      answerIndex: 1,
    },
  ],
}
