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
  id: 'b2-day-04',
  titleUz: 'Sayohat va Madaniyat',
  titleEn: 'Travel & Culture',
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
  { id: 'b2-v4-1', word: 'breathtaking', translationUz: 'hayratlanarli', explanationEn: 'Astonishing orINN. amazing.', exampleEn: 'The view from the mountain was breathtaking.', exampleUz: 'Tog\'dan ko\'rilayotgan manzara hayratlanarli edi.', pos: 'adj', topic: 'travel', level: 'B2' },
  { id: 'b2-v4-2', word: 'itinerary', translationUz: 'sayohat rejasi', explanationEn: 'A planned route or journey.', exampleEn: 'We have a very busy itinerary for tomorrow.', exampleUz: 'Ertaga bizning sayohat rejamiz juda band.', pos: 'noun', topic: 'travel', level: 'B2' },
  { id: 'b2-v4-3', word: 'authentic', translationUz: 'haqiqiy, asl', explanationEn: 'Real, not false or copied.', exampleEn: 'We wanted to find an authentic local restaurant.', exampleUz: 'Biz haqiqiy mahalliy restorani qidirmoqchi edik.', pos: 'adj', topic: 'culture', level: 'B2' },
  { id: 'b2-v4-4', word: 'scenic', translationUz: 'manzarali', explanationEn: 'Providing beautiful views of nature.', exampleEn: 'We took the scenic route through the valley.', exampleUz: 'Biz vodiha bo\'ylab manzarali yo\'l evazidan o\'tdik.', pos: 'adj', topic: 'travel', level: 'B2' },
  { id: 'b2-v4-5', word: 'off the beaten track', translationUz: 'odatiy bo\'lmagan yo\'l', explanationEn: 'In a place where few people go.', exampleEn: 'We love finding places off the beaten track.', exampleUz: 'Biz odatiy bo\'lmagan joylarni topishni yaxshi ko\'ramiz.', pos: 'idiom', topic: 'travel', level: 'B2' },
]

export const grammarDay4: GrammarTopic = {
  id: 'b2-g4',
  titleUz: 'Relative Clauses',
  titleEn: 'Relative Clauses',
  explanationUz: 'Defining va Non-defining relative clauses (who, which, where, whose).',
  explanationEn: 'Relative clauses provide extra information about a person, place, or thing. Defining clauses are essential, while non-defining clauses provide extra, non-essential info.',
  exercises: [
    {
      id: 'b2-g4-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['relative-clauses'],
      text: 'That is the man ___ wife won the lottery.',
      answers: ['whose'],
      wordBank: ['whose'],
      caseSensitive: false,
    },
    {
      id: 'b2-g4-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['relative-clauses'],
      question: 'Paris, ___ is the capital of France, is beautiful.',
      options: ['that is', 'which is', 'where is', 'who is'],
      answerIndex: 1,
    },
  ],
}

export const readingDay4: ReadingPassage = {
  id: 'b2-r4',
  level: 'B2',
  titleUz: 'Turizm va Mahalliy Madaniyat',
  titleEn: 'Tourism & Local Culture',
  content: 'Mass tourism can have a profound impact on local cultures. While it brings economic benefits, it can also lead to the "commodification" of culture, where traditions are staged for profit...',
  glossary: [
    { word: 'profound', uz: 'chuqur', level: 'B2' },
    { word: 'commodification', uz: 'tovarbardlik', level: 'B2' },
    { word: 'staged', uz: 'sahnalashtirilgan', level: 'B2' },
  ],
}

export const listeningDay4: ListeningTask = {
  id: 'b2-l4',
  level: 'B2',
  titleUz: 'Sayohat xabaroti',
  titleEn: 'Travel Report',
  audioUrl: '',
  transcript: 'The hidden gem of the Mediterranean is its small coastal villages, where life moves at a slower pace.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay4: WritingTask = {
  id: 'b2-w4',
  level: 'B2',
  titleUz: 'Sayohat blogi',
  titleEn: 'Travel Blog Entry',
  prompt: 'Write a short blog post about a place you visited that was "off the beaten track".',
  wordCountMin: 150,
  wordCountMax: 300,
  analysisRules: [
    { rule: 'Use at least 3 travel vocabulary words', weight: 3 },
    { rule: 'Use at least one relative clause', weight: 2 },
  ],
}

export const speakingDay4: SpeakingTask = {
  id: 'b2-s4',
  level: 'B2',
  titleUz: 'Madaniyat va Sayohat',
  titleEn: 'Culture & Travel',
  prompt: 'Do you think tourism helps or hurts local cultures?',
  expectedDuration: 60,
}

export const testDay4: SectionTest = {
  id: 'b2-t4',
  level: 'B2',
  section: 'daily-test',
  titleUz: 'B2 4-kunlik test',
  titleEn: 'B2 Day 04 Test',
  passScore: 70,
  exercises: [
    {
      id: 'b2-t4-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'vocabulary',
      difficulty: 2,
      tags: ['travel'],
      question: 'What does "scenic" mean?',
      options: ['boring', 'providing beautiful views', 'very expensive', 'crowded'],
      answerIndex: 1,
    },
  ],
}
