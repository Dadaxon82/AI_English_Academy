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
  id: 'a1-day-05',
  titleUz: 'Ovqatlaniş va Içimliklar',
  titleEn: 'Food & Drink',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qiş', titleEn: 'Readinğ, minutes: 15 },
    { titleUz: 'Eşitiş', titleEn: 'Listeninğ, minutes: 15 },
    { titleUz: 'Gapiriş', titleEn: 'Speakinğ, minutes: 10 },
    { titleUz: 'Yoziş', titleEn: 'Writinğ, minutes: 10 },
  ],
}

export const vocabDay5: VocabularyItem[] = [
  { id: 'a1-v5-1', word: 'delicious', translationUz: 'mazali', explanationEn: 'Very tasty.', exampleEn: 'This cake is delicious.', exampleUz: 'Bu tort mazali.', pos: 'adj', topic: 'food', level: 'A1' },
  { id: 'a1-v5-2', word: 'hungry', translationUz: 'oç', explanationEn: 'Needing food.', exampleEn: 'I am very hungry.', exampleUz: 'Men juda oçman.', pos: 'adj', topic: 'feelings', level: 'A1' },
  { id: 'a1-v5-3', word: 'drink', translationUz: 'içimlik', explanationEn: 'Liquid for drinking.', exampleEn: 'I want a drink of water.', exampleUz: 'Men suv içmoqçiman.', pos: 'noun', topic: 'drink', level: 'A1' },
  { id: 'a1-v5-4', word: 'fruit', translationUz: 'meva', explanationEn: 'Sweet part of a plant.', exampleEn: 'I like eating fruit.', exampleUz: 'Men meva yeyişni yaxşi ko\'raman.', pos: 'noun', topic: 'food', level: 'A1' },
  { id: 'a1-v5-5', word: 'vegetable', translationUz: 'sabzavot', explanationEn: 'Plant used as food.', exampleEn: 'Vegetables are healthy.', exampleUz: 'Sabzavotlar sog\'lom.', pos: 'noun', topic: 'food', level: 'A1' },
]

export const grammarDay5: GrammarTopic = {
  id: 'a1-g5',
  titleUz: 'Countable & Uncountable Nouns',
  titleEn: 'Countable & Uncountable Nouns',
  explanationUz: 'Sanaladigan va sanalmaydigan otlar.',
  explanationEn: 'Using "a/an", "some", and "any" with different types of nouns.',
  exercises: [
    {
      id: 'a1-g5-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'ş joyni to\'g\'ri şakl bilan to\'ldiring.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['countables'],
      text: 'I want ___ apple.',
      answers: ['an'],
      wordBank: ['an'],
      caseSensitive: false,
    },
    {
      id: 'a1-g5-ex2',
      kind: 'multiple-çoice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['countables'],
      question: 'I have ___ water.',
      options: ['a', 'some', 'an', 'many'],
      answerIndex: 1,
    },
  ],
}

export const readingDay5: ReadingPassage = {
  id: 'a1-r5',
  level: 'A1',
  titleUz: 'Salom, men ovqatni yoqaman',
  titleEn: 'I Love Food',
  content: 'My favorite food is pizza. It is delicious! I like fruit, especially apples and bananas. I don\'t like fiş. For breakfast, I usually have eggs and toast. I drink orange juice.',
  glossary: [
    { word: 'delicious', uz: 'mazali', level: 'A1' },
    { word: 'especially', uz: 'ayniqsa', level: 'A1' },
    { word: 'breakfast', uz: 'nonuşta', level: 'A1' },
  ],
}

export const listeningDay5: ListeningTask = {
  id: 'a1-l5',
  level: 'A1',
  titleUz: 'Restoran',
  titleEn: 'At a Restaurant',
  audioUrl: '',
  transcript: 'Waiter: What would you like to drink? Customer: I would like a glass of water, please.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay5: WritingTask = {
  id: 'a1-w5',
  level: 'A1',
  titleUz: 'Mening sevimli taomim',
  titleEn: 'My Favorite Food',
  prompt: 'Write 3 simple sentences about your favorite food and drink.',
  wordCountMin: 20,
  wordCountMax: 60,
  analysisRules: [
    { rule: 'Use at least 2 food words', weight: 2 },
    { rule: 'Use "I like..."', weight: 2 },
  ],
}

export const speakingDay5: SpeakingTask = {
  id: 'a1-s5',
  level: 'A1',
  titleUz: 'Ovqatlaniş haqida gapiriş',
  titleEn: 'Food Talk',
  prompt: 'What is your favorite food? Why do you like it?',
  expectedDuration: 30,
}

export const testDay5: SectionTest = {
  id: 'a1-t5',
  level: 'A1',
  section: 'daily-test',
  titleUz: 'A1 5-kunlik test',
  titleEn: 'A1 Day 05 Test',
  passScore: 70,
  exercises: [
    {
      id: 'a1-t5-ex1',
      kind: 'multiple-çoice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'vocabulary',
      difficulty: 1,
      tags: ['food'],
      question: 'What is a fruit?',
      options: ['meat', 'apple', 'bread', 'milk'],
      answerIndex: 1,
    },
  ],
}
