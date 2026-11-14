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
  id: 'a1-day-04',
  titleUz: 'Kundalik tartib',
  titleEn: 'Daily Routine',
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
  { id: 'a1-v4-1', word: 'wake up', translationUz: 'Uyg\'onmoq', explanationEn: 'To stop sleeping.', exampleEn: 'I wake up at 7 AM.', exampleUz: 'Men 7 da uyg\'onaman.', pos: 'verb', topic: 'routine', level: 'A1' },
  { id: 'a1-v4-2', word: 'breakfast', translationUz: 'nonushta', explanationEn: 'The first meal of the day.', exampleEn: 'I have breakfast at 8 AM.', exampleUz: 'Men 8 da nonushta qilaman.', pos: 'noun', topic: 'food', level: 'A1' },
  { id: 'a1-v4-3', word: 'work', translationUz: 'ish', explanationEn: 'Activity done for money.', exampleEn: 'I go to work by bus.', exampleUz: 'Men avtobusda ishga boraman.', pos: 'noun', topic: 'work', level: 'A1' },
  { id: 'a1-v4-4', word: 'sleep', translationUz: 'uxlash', explanationEn: 'To rest at night.', exampleEn: 'I sleep at 11 PM.', exampleUz: 'Men soat 11 da uxlayman.', pos: 'verb', topic: 'routine', level: 'A1' },
  { id: 'a1-v4-5', word: 'usually', translationUz: 'odatda', explanationEn: 'Normally.', exampleEn: 'I usually drink tea.', exampleUz: 'Men odatda choy ichaman.', pos: 'adverb', topic: 'frequency', level: 'A1' },
]

export const grammarDay4: GrammarTopic = {
  id: 'a1-g4',
  titleUz: 'Present Simple',
  titleEn: 'Present Simple',
  explanationUz: 'Hozirgi zamon oddiy zamon.',
  explanationEn: 'Using verbs to describe habits and general truths.',
  exercises: [
    {
      id: 'a1-g4-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['present-simple'],
      text: 'He ___ (work) in an office.',
      answers: ['works'],
      wordBank: ['works'],
      caseSensitive: false,
    },
    {
      id: 'a1-g4-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['present-simple'],
      question: 'Do you ___ (like) coffee?',
      options: ['likes', 'like', 'liking', 'liked'],
      answerIndex: 1,
    },
  ],
}

export const readingDay4: ReadingPassage = {
  id: 'a1-r4',
  level: 'A1',
  titleUz: 'Mening kuningiz',
  titleEn: 'My Day',
  content: 'Every day, I wake up at 6 AM. I drink coffee and eat breakfast. I go to work at 8 AM. I finish work at 5 PM. In the evening, I cook dinner and watch TV. I go to bed at 10 PM.',
  glossary: [
    { word: 'finish', uz: 'tugatmoq', level: 'A1' },
    { word: 'evening', uz: 'kechki vaqt', level: 'A1' },
    { word: 'watch', uz: 'tomoshmon', level: 'A1' },
  ],
}

export const listeningDay4: ListeningTask = {
  id: 'a1-l4',
  level: 'A1',
  titleUz: 'Kundalik tartib',
  titleEn: 'Daily Routine',
  audioUrl: '',
  transcript: 'I usually have breakfast at 7. I go to work by car. I come home in the evening.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay4: WritingTask = {
  id: 'a1-w4',
  level: 'A1',
  titleUz: 'Sizning kuningiz',
  titleEn: 'Your Day',
  prompt: 'Write 3 simple sentences about your daily routine.',
  wordCountMin: 20,
  wordCountMax: 60,
  analysisRules: [
    { rule: 'Use Present Simple', weight: 2 },
    { rule: 'Mention at least 2 daily activities', weight: 2 },
  ],
}

export const speakingDay4: SpeakingTask = {
  id: 'a1-s4',
  level: 'A1',
  titleUz: 'Kundalik tartib haqida',
  titleEn: 'Daily Routine Talk',
  prompt: 'What time do you wake up? What do you do in the morning?',
  expectedDuration: 30,
}

export const testDay4: SectionTest = {
  id: 'a1-t4',
  level: 'A1',
  section: 'daily-test',
  titleUz: 'A1 4-kunlik test',
  titleEn: 'A1 Day 04 Test',
  passScore: 70,
  exercises: [
    {
      id: 'a1-t4-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'vocabulary',
      difficulty: 1,
      tags: ['routine'],
      question: 'What is the first meal of the day?',
      options: ['lunch', 'dinner', 'breakfast', 'snack'],
      answerIndex: 2,
    },
  ],
}
