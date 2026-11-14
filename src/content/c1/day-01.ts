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
  id: 'c1-day-01',
  titleUz: 'Tanqidiy fikrlash va Retorika',
  titleEn: 'Critical Thinking & Advanced Rhetoric',
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
  { id: 'c1-v1-1', word: 'substantiate', translationUz: 'tasdiqlamoq, dalil keltirmoq', explanationEn: 'Provide evidence to support or prove the truth of.', exampleEn: 'You need to substantiate your claims with data.', exampleUz: 'Siz o\'z da'volaringizni ma\'lumotlar bilan tasdiqlashingiz kerak.', pos: 'verb', topic: 'rhetoric', level: 'C1' },
  { id: 'c1-v1-2', word: 'nuanced', translationUz: 'nozik farqlar bilan', explanationEn: 'Characterized by subtle differences or shades of meaning.', exampleEn: 'The situation requires a more nuanced approach.', exampleUz: 'Vaziyat ko\'proq nozik farqlar bilan yondashuvni talab qiladi.', pos: 'adj', topic: 'communication', level: 'C1' },
  { id: 'c1-v1-3', word: 'paradigm', translationUz: 'paradigma, model', explanationEn: 'A typical example or pattern of something.', exampleEn: 'A shift in the scientific paradigm.', exampleUz: 'Ilmiy paradigmadagi o\'zgarish.', pos: 'noun', topic: 'academic', level: 'C1' },
  { id: 'c1-v1-4', word: 'equivocal', translationUz: 'noaniq, ikkilamchi', explanationEn: 'Open to more than one interpretation; ambiguous.', exampleEn: 'His reply was somewhat equivocal.', exampleUz: 'Uning javobi biroz noaniq edi.', pos: 'adj', topic: 'rhetoric', level: 'C1' },
  { id: 'c1-v1-5', word: 'tenacity', translationUz: 'qat\'iyat, xavos', explanationEn: 'The quality of being very determined.', exampleEn: 'Her tenacity in pursuing the research was admirable.', exampleUz: 'Tadqiqotni davom ettirishdagi qat\'iyati maqtovga loyiq.', pos: 'noun', topic: 'personality', level: 'C1' },
]

export const grammarDay1: GrammarTopic = {
  id: 'c1-g1',
  titleUz: 'Inversion for Emphasis',
  titleEn: 'Inversion for Emphasis',
  explanationUz: 'Ta\'kidlash uchun gap tartibining o\'zgarishi (masalan, "Not only did they...").',
  explanationEn: 'Inversion is a stylistic device where the normal word order is reversed for emphasis, often used with negative adverbs.',
  exercises: [
    {
      id: 'c1-g1-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
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
      id: 'c1-g1-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'grammar',
      difficulty: 4,
      tags: ['inversion'],
      question: 'Seldom ___ (one/see) such a breathtaking display of skill.',
      options: ['one sees', 'does one see', 'one does see', 'has one seen'],
      answerIndex: 1,
    },
  ],
}

export const readingDay1: ReadingPassage = {
  id: 'c1-r1',
  level: 'C1',
  titleUz: 'Suniy Intellekt va Urush Etikasi',
  titleEn: 'The Ethics of AI in Warfare',
  content: 'The integration of autonomous weapons systems into modern warfare presents profound ethical dilemmas. From accountability in "lethal autonomous weapons" to the potential for escalation, the international community faces a critical need for governance...',
  glossary: [
    { word: 'accountability', uz: 'javobgarlik', level: 'C1' },
    { word: 'escalation', uz: 'keskinlashuv', level: 'C1' },
    { word: 'governance', uz: 'boshqaruv', level: 'C1' },
  ],
}

export const listeningDay1: ListeningTask = {
  id: 'c1-l1',
  level: 'C1',
  titleUz: 'Akademik Debat',
  titleEn: 'Academic Debate',
  audioUrl: '',
  transcript: 'The core issue isn\'t just the capability of AI, but the lack of a clear ethical framework for its deployment in high-stakes environments.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay1: WritingTask = {
  id: 'c1-w1',
  level: 'C1',
  titleUz: 'Ta\'sirli Maqola',
  titleEn: 'Persuasive Essay',
  prompt: 'Write an essay arguing for or against the implementation of AI in public healthcare systems.',
  wordCountMin: 250,
  wordCountMax: 500,
  analysisRules: [
    { rule: 'Use advanced rhetorical devices', weight: 3 },
    { rule: 'Clear and logical structure', weight: 3 },
  ],
}

export const speakingDay1: SpeakingTask = {
  id: 'c1-s1',
  level: 'C1',
  titleUz: 'Murakkab Muammolar',
  titleEn: 'Complex Issues',
  prompt: 'Analyze the societal implications of universal basic income.',
  expectedDuration: 120,
}

export const testDay1: SectionTest = {
  id: 'c1-t1',
  level: 'C1',
  section: 'daily-test',
  titleUz: 'C1 1-kunlik test',
  titleEn: 'C1 Day 01 Test',
  passScore: 80,
  exercises: [
    {
      id: 'c1-t1-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'C1',
      skill: 'vocabulary',
      difficulty: 4,
      tags: ['rhetoric'],
      question: 'Which word means "to provide evidence"?',
      options: ['equivocal', 'substantiate', 'mitigate', 'redundant'],
      answerIndex: 1,
    },
  ],
}
