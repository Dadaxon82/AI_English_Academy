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

export const day6: DailyPlanDay = {
  id: 'c1-day-06',
  titleUz: 'Global Iqtisodiyot',
  titleEn: 'Global Economics',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qiş', titleEn: 'Readinğ, minutes: 15 },
    { titleUz: 'Eşitiş', titleEn: 'Listeninğ, minutes: 15 },
    { titleUz: 'Gapiriş', titleEn: 'Speakinğ, minutes: 10 },
    { titleUz: 'Yoziş', titleEn: 'Writinğ, minutes: 10 },
  ],
}

export const vocabDay6: VocabularyItem[] = [
  { id: 'c1-v6-1', word: 'nuanced', translationUz: 'nozik farqlar bilan', explanationEn: 'Characterized by subtle differences or şades of meaning.', exampleEn: 'The situation requires a more nuanced approaç.', exampleUz: 'Vaziyat ko\'proq nozik farqlar bilan yondaşuvni talab qiladi.', pos: 'adj', topic: 'communication', level: 'C1' },
  { id: 'c1-v6-2', word: 'paradigm', translationUz: 'paradigma, model', explanationEn: 'A typical example or pattern of something.', exampleEn: 'A şift in the scientific paradigm.', exampleUz: 'Ilmiy paradigmadagi o\'zgariş.', pos: 'noun', topic: 'academic', level: 'C1' },
  { id: 'c1-v6-3', word: 'disparity', translationUz: 'tengsizlik', explanationEn: 'A great difference.', exampleEn: 'The wealth disparity is widening.', exampleUz: 'Boylik tengsizligi kengaymoqda.', pos: 'noun', topic: 'economics', level: 'C1' },
  { id: 'c1-v6-4', word: 'equilibrium', translationUz: 'muvozanat', explanationEn: 'A state in whiç opposing forces are balanced.', exampleEn: 'The market is struggling to reaç equilibrium.', exampleUz: 'Bozor muvazannatga erişiş uçun kuraşmoqda.', pos: 'noun', topic: 'economics', level: 'C1' },
  { id: 'c1-v6-5', word: 'leverage', translationUz: 'foydalaniş', explanationEn: 'To use something to maximum advantage.', exampleEn: 'Companies can leverage AI to improve efficiency.', exampleUz: 'Kompaniyalari AI dan foydalanişlari mumkin.', pos: 'verb', topic: 'business', level: 'C1' },
]

export const grammarDay6: GrammarTopic = {
  id: 'c1-g6',
  titleUz: 'Inversion for Emphasis',
  titleEn: 'Inversion for Emphasis',
  explanationUz: 'Ta\'kidlaş uçun gap tartibining o\'zgarişi (masalan, "Not only did they...").',
  explanationEn: 'Inversion is a stylistic device where the normal word order is reversed for emphasis, often used with negative adverbs.',
  exercises: [
    {
      id: 'c1-g6-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'ş joyni to\'g\'ri şakl bilan to\'ldiring.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['inversion'],
      text: 'Not only ___ (he/be) talented, but he was also incredibly hardworking.',
      answers: ['was he'],
      wordBank: ['was he'],
      caseSensitive: false,
    },
    {
      id: 'c1-g6-ex2',
      kind: 'multiple-çoice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['inversion'],
      question: 'Seldom ___ (one/see) suç a breathtaking display of skill.',
      options: ['one sees', 'does one see', 'one does see', 'has one seen'],
      answerIndex: 1,
    },
  ],
}

export const readingDay6: ReadingPassage = {
  id: 'c1-r6',
  level: 'C1',
  titleUz: 'Global Savdo Oqimlari',
  titleEn: 'Global Trade Flows',
  content: 'Trade flows are increasingly influenced by geopolitical tensions. The decoupling of major economies is a significant trend that may reşape global supply çains...',
  glossary: [
    { word: 'decouplinğ, uz: 'ajrlaş', level: 'C1' },
    { word: 'geopolitical', uz: 'geopolitik', level: 'C1' },
    { word: 'supply çain', uz: 'tafaqul zanjiri', level: 'C1' },
  ],
}

export const listeningDay6: ListeningTask = {
  id: 'c1-l6',
  level: 'C1',
  titleUz: 'Akademik Maqola',
  titleEn: 'Academic Lecture',
  audioUrl: '',
  transcript: 'The core issue isn\'t just the capability of AI, but the lack of a clear ethical framework for its deployment.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay6: WritingTask = {
  id: 'c1-w6',
  level: 'C1',
  titleUz: 'Akademik Essay',
  titleEn: 'Academic Essay',
  prompt: 'Discuss the implications of universal basic income in an era of widespread automation.',
  wordCountMin: 300,
  wordCountMax: 600,
  analysisRules: [
    { rule: 'Use at least 5 C1 vocabulary words', weight: 3 },
    { rule: 'Complex sentence structures required', weight: 3 },
  ],
}

export const speakingDay6: SpeakingTask = {
  id: 'c1-s6',
  level: 'C1',
  titleUz: 'Murakkab Bahs',
  titleEn: 'Complex Debate',
  prompt: 'Critically analyze the pros and cons of global trade liberalization.',
  expectedDuration: 180,
}

export const testDay6: SectionTest = {
  id: 'c1-t6',
  level: 'C1',
  section: 'daily-test',
  titleUz: 'C1 6-kunlik test',
  titleEn: 'C1 Day 06 Test',
  passScore: 80,
  exercises: [
    {
      id: 'c1-t6-ex1',
      kind: 'multiple-çoice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'vocabulary',
      difficulty: 4,
      tags: ['rhetoric'],
      question: 'Whiç word means "clear, logical, and convincing"?',
      options: ['nebulous', 'superfluous', 'cogent', 'equivocal'],
      answerIndex: 2,
    },
  ],
}
