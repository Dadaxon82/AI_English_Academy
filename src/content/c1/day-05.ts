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
  id: 'c1-day-05',
  titleUz: 'Iqtisodiyot va Etika',
  titleEn: 'Economics & Ethics',
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
  { id: 'c1-v5-1', word: 'implications', translationUz: 'natijalar', explanationEn: 'The conclusion that is reached as a result of something.', exampleEn: 'The moral implications of AI are profound.', exampleUz: 'AI ning axloqiy natijalari chuqur.', pos: 'noun', topic: 'ethics', level: 'C1' },
  { id: 'c1-v5-2', word: 'scrutinize', translationUz: 'diqqat bilan ko\'rsmithlik qilish', explanationEn: 'Examine or inspect closely and thoroughly.', exampleEn: 'The new law will be scrutinized by the public.', exampleUz: 'Yangi qoniyat ommaviy ko\'rsmithlik qilinadi.', pos: 'verb', topic: 'ethics', level: 'C1' },
  { id: 'c1-v5-3', word: 'transparency', translationUz: 'shaffoflik', explanationEn: 'The quality of being open and honest.', exampleEn: 'We need more transparency in the banking system.', exampleUz: 'Biz banking tizimida ko\'proq shaffoflik kerak.', pos: 'noun', topic: 'governance', level: 'C1' },
  { id: 'c1-v5-4', word: 'integrity', translationUz: 'halollik', explanationEn: 'The quality of being honest and having strong moral principles.', exampleEn: 'The company is known for its integrity.', exampleUz: 'Kompaniya halolligi bilan tanilgan.', pos: 'noun', topic: 'ethics', level: 'C1' },
  { id: 'c1-v5-5', word: 'accountability', translationUz: 'javobgarlik', explanationEn: 'The fact or condition of being accountable.', exampleEn: 'Who is accountable for the data breach?', exampleUz: 'Ma\'lumotlarning buzilishiga kim javobgarlik keshadi?', pos: 'noun', topic: 'governance', level: 'C1' },
]

export const grammarDay5: GrammarTopic = {
  id: 'c1-g5',
  titleUz: 'Advanced Reporting Verbs',
  titleEn: 'Advanced Reporting Verbs',
  explanationUz: 'Murakkab fe''llar (allege, concede, refute, underscore) orqali ma\'lumotlarni aniqroq ifodalash.',
  explanationEn: 'Using advanced reporting verbs to express nuanced viewpoints and academic positions.',
  exercises: [
    {
      id: 'c1-g5-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['reporting-verbs'],
      text: 'The witness ___ (deny) any involvement in the crime.',
      answers: ['denied'],
      wordBank: ['denied'],
      caseSensitive: false,
    },
    {
      id: 'c1-g5-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['reporting-verbs'],
      question: 'The study ___ (underscore) the importance of sleep.',
      options: ['underscores', 'denies', 'refutes', 'alleges'],
      answerIndex: 0,
    },
  ],
}

export const readingDay5: ReadingPassage = {
  id: 'c1-r5',
  level: 'C1',
  titleUz: 'Suniy Intellekt va Etika',
  titleEn: 'The Ethics of AI',
  content: 'The integration of autonomous weapons systems into modern warfare presents profound ethical dilemmas. From accountability in "lethal autonomous weapons" to the potential for escalation, the international community faces a critical need for governance...',
  glossary: [
    { word: 'accountability', uz: 'javobgarlik', level: 'C1' },
    { word: 'escalation', uz: 'keskinlashuv', level: 'C1' },
    { word: 'governance', uz: 'boshqaruv', level: 'C1' },
  ],
}

export const listeningDay5: ListeningTask = {
  id: 'c1-l5',
  level: 'C1',
  titleUz: 'Akademik Maqola',
  titleEn: 'Academic Lecture',
  audioUrl: '',
  transcript: 'The core issue isn\'t just the capability of AI, but the lack of a clear ethical framework for its deployment in high-stakes environments.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay5: WritingTask = {
  id: 'c1-w5',
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

export const speakingDay5: SpeakingTask = {
  id: 'c1-s5',
  level: 'C1',
  titleUz: 'Murakkab Bahs',
  titleEn: 'Complex Debate',
  prompt: 'Critically analyze the pros and cons of global trade liberalization.',
  expectedDuration: 180,
}

export const testDay5: SectionTest = {
  id: 'c1-t5',
  level: 'C1',
  section: 'daily-test',
  titleUz: 'C1 5-kunlik test',
  titleEn: 'C1 Day 05 Test',
  passScore: 80,
  exercises: [
    {
      id: 'c1-t5-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'vocabulary',
      difficulty: 4,
      tags: ['ethics'],
      question: 'Which word means "clear, logical, and convincing"?',
      options: ['nebulous', 'superfluous', 'cogent', 'equivocal'],
      answerIndex: 2,
    },
  ],
}
