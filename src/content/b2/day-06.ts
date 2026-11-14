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
  id: 'b2-day-06',
  titleUz: 'Ijtimoiy Masalalar va Etika',
  titleEn: 'Social Issues & Ethics',
  sections: [
    { titleUz: 'Lug\'at', titleEn: 'Vocabulary', minutes: 20 },
    { titleUz: 'Grammatika', titleEn: 'Grammar', minutes: 20 },
    { titleUz: 'O\'qish', titleEn: 'Reading', minutes: 15 },
    { titleUz: 'Eshitish', titleEn: 'Listening', minutes: 15 },
    { titleUz: 'Gapirish', titleEn: 'Speaking', minutes: 10 },
    { titleUz: 'Yozish', titleEn: 'Writing', minutes: 10 },
  ],
}

export const vocabDay6: VocabularyItem[] = [
  { id: 'b2-v6-1', word: 'integrity', translationUz: 'halollik', explanationEn: 'The quality of being honest and having strong moral principles.', exampleEn: 'The company is known for its integrity.', exampleUz: 'Kompaniya halolligi bilan tanilgan.', pos: 'noun', topic: 'ethics', level: 'B2' },
  { id: 'b2-v6-2', word: 'advocate', translationUz: 'tarqituvchi, tarafdor', explanationEn: 'A person who publicly supports a particular cause.', exampleEn: 'She is a strong advocate for animal rights.', exampleUz: 'U hayvon huquqlari tarafdori.', pos: 'noun', topic: 'ethics', level: 'B2' },
  { id: 'b2-v6-3', word: 'prejudice', translationUz: 'xavotir, oldi fikr', explanationEn: 'Preconceived opinion that is not based on reason.', exampleEn: 'We must overcome our prejudices.', exampleUz: 'Biz oldi fikrlardan voz kechishimiz kerak.', pos: 'noun', topic: 'social', level: 'B2' },
  { id: 'b2-v6-4', word: 'mandatory', translationUz: 'majburiy', explanationEn: 'Required by law or rules.', exampleEn: 'Masks are mandatory in some areas.', exampleUz: 'Bazi hududlarda niqob majburiy.', pos: 'adj', topic: 'law', level: 'B2' },
  { id: 'b2-v6-5', word: 'equality', translationUz: 'tenghlik', explanationEn: 'The state of being equal, especially in status or rights.', exampleEn: 'We fight for gender equality.', exampleUz: 'Biz jins tengligi uchun kurashamiz.', pos: 'noun', topic: 'social', level: 'B2' },
]

export const grammarDay6: GrammarTopic = {
  id: 'b2-g6',
  titleUz: 'Subjunctive Mood',
  titleEn: 'Subjunctive Mood',
  explanationUz: 'Taqqoz va taklif ma\'noylarida foydalaniladigan Subjunctive Mood (e.g., "I suggest that he be present").',
  explanationEn: 'The subjunctive mood is used to express wishes, suggestions, demands, and possibilities. It is often used after verbs like "suggest", "insist", "demand".',
  exercises: [
    {
      id: 'b2-g6-ex1',
      kind: 'gap-fill',
      instructionUz: 'Bo\'sh joyni to\'g\'ri shakl bilan to\'ldiring.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['subjunctive'],
      text: 'It is essential that he ___ (be) on time.',
      answers: ['be'],
      wordBank: ['be'],
      caseSensitive: false,
    },
    {
      id: 'b2-g6-ex2',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'grammar',
      difficulty: 3,
      tags: ['subjunctive'],
      question: 'I suggest that she ___ (study) harder.',
      options: ['studies', 'study', 'studied', 'is studying'],
      answerIndex: 1,
    },
  ],
}

export const readingDay6: ReadingPassage = {
  id: 'b2-r6',
  level: 'B2',
  titleUz: 'Ijtimoiy adolat',
  titleEn: 'Social Justice',
  content: 'Social justice is the view that all individuals should be treated fairly. This includes equality of opportunity, rights, and treatment under the law. Discussions often center on systemic issues like poverty and discrimination...',
  glossary: [
    { word: 'discrimination', uz: 'kamsitish', level: 'B2' },
    { word: 'systemic', uz: 'tizimli', level: 'B2' },
    { word: 'equity', uz: 'adolat', level: 'B2' },
  ],
}

export const listeningDay6: ListeningTask = {
  id: 'b2-l6',
  level: 'B2',
  titleUz: 'Etika debat',
  titleEn: 'Ethics Debate',
  audioUrl: '',
  transcript: 'Should companies be responsible for the environmental impact of their products? This is a major ethical question.',
  transcriptUnlockPolicy: 'listen-first',
}

export const writingDay6: WritingTask = {
  id: 'b2-w6',
  level: 'B2',
  titleUz: 'Maqola yozish',
  titleEn: 'Opinion Essay',
  prompt: 'Is it the government\'s responsibility to provide free healthcare for everyone?',
  wordCountMin: 150,
  wordCountMax: 300,
  analysisRules: [
    { rule: 'Use at least 3 ethics vocab words', weight: 3 },
    { rule: 'Clearly state your position', weight: 2 },
  ],
}

export const speakingDay6: SpeakingTask = {
  id: 'b2-s6',
  level: 'B2',
  titleUz: 'Ijtimoiy masalalar',
  titleEn: 'Social Issues',
  prompt: 'Discuss the importance of equality in the workplace.',
  expectedDuration: 60,
}

export const testDay6: SectionTest = {
  id: 'b2-t6',
  level: 'B2',
  section: 'daily-test',
  titleUz: 'B2 6-kunlik test',
  titleEn: 'B2 Day 06 Test',
  passScore: 70,
  exercises: [
    {
      id: 'b2-t6-ex1',
      kind: 'multiple-choice',
      instructionUz: 'To\'g\'ri javobni tanlang.',
      level: 'B2',
      skill: 'vocabulary',
      difficulty: 2,
      tags: ['ethics'],
      question: 'Which word means "required by law"?',
      options: ['optional', 'mandatory', 'voluntary', 'discretionary'],
      answerIndex: 1,
    },
  ],
}
