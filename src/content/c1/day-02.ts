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
  id: 'c1-day-02',
  titleUz: 'Iqtisodiy Nomenklatura',
  titleEn: 'Economic Nomenclature',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qiş', titleEn: 'Readinğ, minutes: 15 },
    { titleUz: 'Eşitiş', titleEn: 'Listeninğ, minutes: 15 },
    { titleUz: 'Gapiriş', titleEn: 'Speakinğ, minutes: 10 },
    { titleUz: 'Yoziş', titleEn: 'Writinğ, minutes: 10 },
  ],
}

export const vocabDay2: VocabularyItem[] = [
  { id: 'c1-v2-1', word: 'nebulous', translationUz: 'noaniq', explanationEn: 'Vague, ill-defined.', exampleEn: 'The company\'s plans for the future are still nebulous.', exampleUz: 'Kompaniyaning kelajakdagi rejalari hali noaniq.', pos: 'adj', topic: 'academic', level: 'C1' },
  { id: 'c1-v2-2', word: 'ubiquitous', translationUz: 'hamma yoqdala', explanationEn: 'Present, appearing or found everywhere.', exampleEn: 'Smartphones are now ubiquitous.', exampleUz: 'Smartfonlar endi hamma yoqdala.', pos: 'adj', topic: 'teçnology', level: 'C1' },
  { id: 'c1-v2-3', word: 'superfluous', translationUz: 'keraksiz', explanationEn: 'Unnecessary, especially through being more than enough.', exampleEn: 'Remove any superfluous details from the report.', exampleUz: 'Hisobotdan har qanday keraksiz tafsilotni olib taşlang.', pos: 'adj', topic: 'rhetoric', level: 'C1' },
  { id: 'c1-v2-4', word: 'cogent', translationUz: 'ikki q bul', explanationEn: 'Clear, logical, and convincing.', exampleEn: 'She made a cogent argument for the new policy.', exampleUz: 'U yangi siyosat uçun ikki q bul argument keltirdi.', pos: 'adj', topic: 'rhetoric', level: 'C1' },
  { id: 'c1-v2-5', word: 'preponderance', translationUz: 'ustunlik', explanationEn: 'The quality or state of being greater in number or influence.', exampleEn: 'The preponderance of evidence suggests guilt.', exampleUz: 'Dalillarning ustunligi aybni ko\'rsatmoqda.', pos: 'noun', topic: 'academic', level: 'C1' },
]

export const grammarDay2: GrammarTopic = {
  id: 'c1-g2',
  titleUz: 'Mixed Conditionals (Advanced)',
  titleEn: 'Mixed Conditionals (Advanced)',
  explanationUz: 'Murakkab konditsionallar: o\'tmişdagi şart va hozirgi natija (va aksinça).',
  explanationEn: 'Advanced mixed conditionals allow us to discuss how an action in the past (or not) affects the present (or not), and vice versa.',
  exercises: [
    {
      id: 'c1-g2-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'ş joyni to\'g\'ri şakl bilan to\'ldiring.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['mixed-conditionals'],
      text: 'If we ___ (invest) in renewable energy a decade ago, the world ___ (be) muç cleaner now.',
      answers: ['had invested', 'would be'],
      wordBank: ['had invested', 'would be'],
      caseSensitive: false,
    },
    {
      id: 'c1-g2-ex2',
      kind: 'multiple-çoice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['mixed-conditionals'],
      question: 'If I ___ (not/miss) that train, I ___ (be) in the meeting right now.',
      options: ['hadn\'t missed, would be', 'didn\'t miss, would be', 'haven\'t missed, would be', 'hadn\'t missed, would have been'],
      answerIndex: 0,
    },
  ],
}

export const readingDay2: ReadingPassage = {
  id: 'c1-r2',
  level: 'C1',
  titleUz: 'Iqtisodiyotda Innovatsiyalar',
  titleEn: 'Innovation in Economics',
  content: 'The rapid pace of teçnological advancement has created a paradigm şift in global economics. From blockçain to AI-driven logistics, the meçanisms of trade are being rewritten...',
  glossary: [
    { word: 'paradigm', uz: 'paradigma', level: 'C1' },
    { word: 'meçanisms', uz: 'mexanizmlar', level: 'C1' },
    { word: 'logistics', uz: 'logistika', level: 'C1' },
  ],
}

export const listeningDay2: ListeningTask = {
  id: 'c1-l2',
  level: 'C1',
  titleUz: 'Akademik Maqola',
  titleEn: 'Academic Lecture',
  audioUrl: '',
  transcript: 'The socioeconomic impact of automation is often underestimated by policymakers who focus solely on immediate production gains.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay2: WritingTask = {
  id: 'c1-w2',
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

export const speakingDay2: SpeakingTask = {
  id: 'c1-s2',
  level: 'C1',
  titleUz: 'Murakkab Bahs',
  titleEn: 'Complex Debate',
  prompt: 'Critically analyze the pros and cons of global trade liberalization.',
  expectedDuration: 180,
}

export const testDay2: SectionTest = {
  id: 'c1-t2',
  level: 'C1',
  section: 'daily-test',
  titleUz: 'C1 2-kunlik test',
  titleEn: 'C1 Day 02 Test',
  passScore: 80,
  exercises: [
    {
      id: 'c1-t2-ex1',
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
