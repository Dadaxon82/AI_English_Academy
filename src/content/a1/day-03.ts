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
  id: 'a1-day-03',
  titleUz: 'Oilam va Uy',
  titleEn: 'Family & House',
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
  { id: 'a1-v3-1', word: 'mother', translationUz: 'ona', explanationEn: 'A female parent.', exampleEn: 'My mother is a doctor.', exampleUz: 'Mening onam shifokor.', pos: 'noun', topic: 'family', level: 'A1' },
  { id: 'a1-v3-2', word: 'father', translationUz: 'ota', explanationEn: 'A male parent.', exampleEn: 'My father is a teacher.', exampleUz: 'Mening otam o\'qituvchi.', pos: 'noun', topic: 'family', level: 'A1' },
  { id: 'a1-v3-3', word: 'sister', translationUz: 'singil/opa', explanationEn: 'A female sibling.', exampleEn: 'I have one sister.', exampleUz: 'Mening bir singlim bor.', pos: 'noun', topic: 'family', level: 'A1' },
  { id: 'a1-v3-4', word: 'brother', translationUz: 'aka/uka', explanationEn: 'A male sibling.', exampleEn: 'He is my younger brother.', exampleUz: 'U mening kichik ukam.', pos: 'noun', topic: 'family', level: 'A1' },
  { id: 'a1-v3-5', word: 'kitchen', translationUz: 'oshxona', explanationEn: 'A room for cooking.', exampleEn: 'The kitchen is big.', exampleUz: 'Oshxona katta.', pos: 'noun', topic: 'house', level: 'A1' },
]

export const grammarDay3: GrammarTopic = {
  id: 'a1-g3',
  titleUz: 'Possessive Adjectives',
  titleEn: 'Possessive Adjectives',
  explanationUz: 'Egalik olmoshlari (my, your, his, her, its, our, their).',
  explanationEn: 'Using possessive adjectives to show ownership.',
  exercises: [
    {
      id: 'a1-g3-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['possessive'],
      text: 'This is ___ house. (I)',
      answers: ['my'],
      wordBank: ['my'],
      caseSensitive: false,
    },
    {
      id: 'a1-g3-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'grammar',
      difficulty: 1,
      tags: ['possessive'],
      question: 'Where is ___ car? (She)',
      options: ['my', 'your', 'her', 'his'],
      answerIndex: 2,
    },
  ],
}

export const readingDay3: ReadingPassage = {
  id: 'a1-r3',
  level: 'A1',
  titleUz: 'Mening oilam',
  titleEn: 'My Family',
  content: 'Hello! I am Alice. I live in a small house. I have a big family. My father is a farmer. My mother is a nurse. I have one brother and one sister. We love our home.',
  glossary: [
    { word: 'nurse', uz: 'medico', level: 'A1' },
    { word: 'home', uz: 'uy', level: 'A1' },
    { word: 'farmer', uz: 'fermer', level: 'A1' },
  ],
}

export const listeningDay3: ListeningTask = {
  id: 'a1-l3',
  level: 'A1',
  titleUz: 'Oilaviy arizalar',
  titleEn: 'Family Members',
  audioUrl: '',
  transcript: 'This is my family. This is my mother, Mary. This is my father, Paul. I have a sister, Lily.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay3: WritingTask = {
  id: 'a1-w3',
  level: 'A1',
  titleUz: 'Oilam haqida yozish',
  titleEn: 'Write about your family',
  prompt: 'Write 3 simple sentences about your family members.',
  wordCountMin: 20,
  wordCountMax: 60,
  analysisRules: [
    { rule: 'Use possessive adjectives', weight: 2 },
    { rule: 'Mention at least 2 family members', weight: 2 },
  ],
}

export const speakingDay3: SpeakingTask = {
  id: 'a1-s3',
  level: 'A1',
  titleUz: 'Oilaviy arizalar',
  titleEn: 'Family Talk',
  prompt: 'Do you have a big family or a small family?',
  expectedDuration: 30,
}

export const testDay3: SectionTest = {
  id: 'a1-t3',
  level: 'A1',
  section: 'daily-test',
  titleUz: 'A1 3-kunlik test',
  titleEn: 'A1 Day 03 Test',
  passScore: 70,
  exercises: [
    {
      id: 'a1-t3-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'A1',
      skill: 'vocabulary',
      difficulty: 1,
      tags: ['family'],
      question: 'What is a male parent?',
      options: ['mother', 'father', 'sister', 'brother'],
      answerIndex: 1,
    },
  ],
}
