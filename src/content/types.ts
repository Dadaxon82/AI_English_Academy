/**
 * Kontent shartnomasi (contract).
 *
 * BU FAYL UI KODIDAN ALOHIDA SAQLANADI.
 * Butun o'quv materiallari (so'zlar, grammatika, matnlar, audio, yozish va
 * gapirish topshiriqlari) shu tiplarga mos kelishi shart. A2, B1, B2, C1
 * kontenti keyin shu kontrakt ustiga qo'shiladi.
 */

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
export type CefrLevel = (typeof CEFR_LEVELS)[number]

export const SKILLS = ['reading', 'listening', 'writing', 'speaking', 'vocabulary', 'grammar'] as const
export type Skill = (typeof SKILLS)[number]

/** Ko'nikma — Mock Exam va kundalik reja uchun asosiy to'rt ko'nikma. */
export const CORE_SKILLS = ['reading', 'listening', 'writing', 'speaking'] as const
export type CoreSkill = (typeof CORE_SKILLS)[number]

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'determiner'
  | 'interjection'

/** ------------------------------- LUG'AT ------------------------------- */

export interface VocabularyItem {
  id: string
  word: string
  /** O'zbekcha tarjima */
  translationUz: string
  /** Inglizcha sodda izoh (darajaga mos) */
  explanationEn: string
  /** IPA talaffuzi — mavjud bo'lsa */
  ipa?: string
  /** Talaffuz audio manbasi. yo'q bo'lsa tugma ko'rsatilmaydi */
  pronunciation?: PronunciationSource
  exampleEn: string
  exampleUz: string
  pos: PartOfSpeech
  topic: string
  level: CefrLevel
  /** Matndan lug'atga saqlash uchun qoida: sinonim/antonym va h.k. */
  relations?: { synonym?: string[]; antonym?: string[] }
}

/** Audio manba va litsenziyasi ALBATDA qayd etiladi. */
export interface AudioAsset {
  id: string
  /** /audio/... ichida statik fayl yoki to'liq URL */
  src: string
  /** Kesoncha (mp3/wav) — fayl mavjud bo'lsa */
  fileAvailable: boolean
  source: AudioSourceKind
  /** Manba nomi, masalan "Loyihada original yaratilgan" */
  attribution: string
  license: string
  transcript: TranscriptSegment[]
  /** Offline rejimda keshlashga ruxsat */
  offlineAllowed: boolean
  level: CefrLevel
  title: string
  /** sekunda, taxminiy — audio borida */
  durationSec?: number
}

export type AudioSourceKind =
  | 'original' /* loyihada biz yaratgan audio */
  | 'public-domain'
  | 'cc' /* CC lisenziyali tashqi manba */
  | 'generated-tts' /* sintez qilingan, rasmiy emas */
  | 'missing' /* audio yo'q — pleyer ko'rsatilmaydi */

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

/** Talaffuz uchun audio (so'z darajasida). */
export interface PronunciationSource {
  kind: 'audio-file' | 'browser-tts'
  /** kind === 'audio-file' bo'lsa fayl yo'li */
  src?: string
  /** TTS uchun to'g'ri aytiladigan matn, masalan "record (verb)" */
  ttsText?: string
  lang?: string
}

/** --------------------------- MASHQLAR --------------------------- */

export type ExerciseKind =
  | 'multiple-choice'
  | 'true-false-notgiven'
  | 'matching'
  | 'gap-fill'
  | 'word-order'
  | 'translation'

interface ExerciseBase {
  id: string
  /** Foydalanuvchiga ko'rsatiladigan topshiriq (o'zbekcha) */
  instructionUz: string
  level: CefrLevel
  skill: Skill
  /** Javobdan keyin ko'rsatiladigan izoh (o'zbekcha) */
  explanationUz: string
  /** Qiyinlik 1..5 — moslashtirilgan mashq tanlash uchun */
  difficulty: number
  tags?: string[]
}

export interface MultipleChoiceExercise extends ExerciseBase {
  kind: 'multiple-choice'
  passageId?: string
  /** Matn iqtibosi — savol matnga bog'liq bo'lsa ko'rsatiladi */
  passageExcerpt?: string
  question: string
  options: string[]
  /** options ichidagi indeks */
  answerIndex: number
}

export interface TrueFalseNotGivenExercise extends ExerciseBase {
  kind: 'true-false-notgiven'
  passageId?: string
  /** Matn iqtibosi — matn o'quvchi ko'zinda bo'lmasa shu yerda ko'rsatiladi */
  passageExcerpt?: string
  statement: string
  answer: 'true' | 'false' | 'notgiven'
  /** Matnda qaysi qism asos bo'ldi (javobdan keyin ko'rsatiladi) */
  evidence?: string
}

export interface MatchingExercise extends ExerciseBase {
  kind: 'matching'
  pairs: { left: string; right: string }[]
}

export interface GapFillExercise extends ExerciseBase {
  kind: 'gap-fill'
  /** Bo'shliq ___ bilan belgilanadi */
  text: string
  answers: string[]
  /** Kiritishni qabul qilish qoidalari */
  acceptAlternatives?: string[][]
  /** Foydalanuvchiga ko'rsatiladigan variantlar (bank) */
  wordBank?: string[]
  caseSensitive?: boolean
}

export interface WordOrderExercise extends ExerciseBase {
  kind: 'word-order'
  /** To'g'ri joylashgan so'zlar */
  answer: string[]
  /** Aralashtirilgan variantlar */
  bank: string[]
  noteUz?: string
}

export interface TranslationExercise extends ExerciseBase {
  kind: 'translation'
  source: string
  sourceLang: 'en' | 'uz'
  /** Qabul qilinadigan javoblar (maydon to'ldirish) */
  accepted: string[]
}

export type Exercise =
  | MultipleChoiceExercise
  | TrueFalseNotGivenExercise
  | MatchingExercise
  | GapFillExercise
  | WordOrderExercise
  | TranslationExercise

/** --------------------------- GRAMMATIKA --------------------------- */

export interface GrammarTopic {
  id: string
  titleUz: string
  titleEn: string
  level: CefrLevel
  explanationUz: string[]
  formula: { form: string; noteUz?: string }[]
  examples: { en: string; uz: string }[]
  /** Ijobiy / inkor / so'roq shakllari — tegishli bo'lsa */
  forms?: { affirmative?: string[]; negative?: string[]; question?: string[] }
  /** 5–10 ta amaliy mashq */
  exercises: Exercise[]
  commonMistakes?: { wrong: string; right: string; whyUz: string }[]
}

/** --------------------------- O'QISH --------------------------- */

export interface ReadingPassage {
  id: string
  title: string
  level: CefrLevel
  /** Taxminiy o'qish vaqti (daqiqa) */
  estMinutes: number
  /** Original — biz yozgan matn; rasmiy imtihon savoli deb atalmaydi */
  provenance: 'original' | 'adapted'
  paragraphs: string[]
  glossary?: { word: string; uz: string }[]
  exercises: Exercise[]
}

/** --------------------------- TINGLASH --------------------------- */

export interface ListeningTask {
  id: string
  title: string
  level: CefrLevel
  audio: AudioAsset
  /** Transkript qachon ruxsat etiladi (mashq qoidalari) */
  transcriptPolicy: 'never-until-checked' | 'after-first-listen' | 'always'
  exercises: Exercise[]
}

/** --------------------------- YOZISH --------------------------- */

export type WritingGenre =
  | 'email'
  | 'message'
  | 'essay'
  | 'story'
  | 'form'
  | 'paragraph'
  | 'report'

export interface WritingTask {
  id: string
  level: CefrLevel
  genre: WritingGenre
  promptEn: string
  instructionUz: string
  minWords: number
  maxWords: number
  /** Tavsiya etilgan daqiqa */
  minutes: number
  /** Baholash mezonlari (CEFR uslubida) */
  criteria: CoreCriterion[]
  checklistUz?: string[]
  /** Rule-based tekshiruv uchun kalit so'zlar / strukturaviy talablar */
  mustInclude?: { pattern: string; whyUz: string }[]
  modelAnswerEn?: string
}

export type CoreCriterion =
  | 'task_achievement'
  | 'coherence'
  | 'lexical_resource'
  | 'grammatical_range'
  | 'accuracy'

/** --------------------------- GAPIRISH --------------------------- */

export interface SpeakingTask {
  id: string
  level: CefrLevel
  topicUz: string
  questionEn: string
  hintUz?: string
  minSeconds: number
  targetSeconds: number
  /** Matnli muqobil topshiriq (audio ishlamasa) */
  textAlternative: string
  followUpsEn?: string[]
}

/** --------------------- KUNLIK / BO'LIM TESTLARI --------------------- */

export interface SectionTest {
  id: string
  level: CefrLevel
  section: 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'writing' | 'speaking'
  titleUz: string
  passScore: number
  exercises: Exercise[]
}

/** --------------------------- KUN REJASI --------------------------- */

export interface DailyPlanDay {
  id: string
  level: CefrLevel
  /** 1..7 — daraja ichidagi kun raqami */
  dayNumber: number
  titleUz: string
  goalUz: string
  sections: DaySection[]
  /** Kun yakuniy testi (ixtiyoriy bo'lim) */
  sectionTest?: SectionTest
}

export interface DaySection {
  skill: Skill
  minutes: number
  /** Vocab uchun so'z id'lari; boshqalar uchun kontent id'lari */
  itemIds: string[]
  titleUz: string
}

/** --------------------------- MOCK EXAM --------------------------- */

export interface MockExamSectionSpec {
  id: string
  skill: CoreSkill
  titleEn: string
  titleUz: string
  minutes: number
  /** Rasmiy format manbasi tekshirilganmi */
  formatVerified: boolean
  formatNote: string
  exercises: Exercise[]
  /** Writing / Speaking uchun topshiriqlar */
  writingTask?: WritingTask
  speakingTask?: SpeakingTask
  audio?: AudioAsset
}

export interface MockExamSpec {
  id: string
  titleUz: string
  level: CefrLevel
  descriptionUz: string
  /** "mashq uchun yaratilgan namuna" — rasmiy savol emas */
  disclaimerUz: string
  sections: MockExamSectionSpec[]
}
