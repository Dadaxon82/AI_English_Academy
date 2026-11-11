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
  | 'audio-matching'
  | 'listening-select'
  | 'listening-fill'
  | 'listening-choice'
  | 'gap-fill'
  | 'word-order'
  | 'translation'
  | 'multi-select'
  | 'dropdown-cloze'
  | 'sequence'
  | 'categorize'
  | 'short-answer'

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
  /** Video short (`shorts.ts`): bo'lsa savol ustida short pleyeri ko'rsatiladi */
  shortId?: string
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

/**
 * Tinglab juftlashtirish — Duolingo "Выберите пары слов" ko'rinishi: chapda
 * raqamlangan tovush kartalari (`left.pronunciation`, yo'q bo'lsa `left.word`
 * browser TTS bilan o'qiladi), o'ngda raqamlangan aralashtirilgan tarjima
 * kartalari. Select/dropdown emas — to'g'ridan-to'g'ri bosish bilan
 * juftlashtiriladi.
 */
export interface AudioMatchingExercise extends ExerciseBase {
  kind: 'audio-matching'
  pairs: { left: { word: string; pronunciation?: PronunciationSource }; right: string }[]
}

/**
 * «Что вы услышали?» — tinglab so'zni tanlash. Audio (`pronunciation`, bo'lmasa
 * TTS orqali `targetText`) o'ynatiladi, o'quvchi plitkalardan ESHITGAN matnni
 * (bir yoki bir nechta so'z) tartib bilan yig'adi.
 */
export interface ListeningSelectExercise extends ExerciseBase {
  kind: 'listening-select'
  pronunciation?: PronunciationSource
  /** TTS uchun aytiladigan/tinglanadigan matn */
  targetText: string
  /** TO'G'RI tartibdagi so'zlar (javob) */
  answer: string[]
  /** O'quvchiga ko'rsatiladigan plitkalar (javob so'zlari + chalg'ituvchilar, aralash) */
  bank: string[]
}

/**
 * «Введите пропущенное слово» — gapni tinglab (TTS), bo'shliqqa erkin matn
 * kiritish (klaviatura). `gap-fill`ning audio bilan boyitilgan versiyasi —
 * bitta bo'shliq, transkript oldindan ko'rsatilmaydi.
 */
export interface ListeningFillExercise extends ExerciseBase {
  kind: 'listening-fill'
  /** TTS/audio orqali o'qiladigan to'liq gap (bo'shliqsiz) */
  audioText: string
  /** Bo'shliqli ko'rinish — ___ belgisi bilan */
  text: string
  answer: string
  acceptAlternatives?: string[]
}

/**
 * «Послушайте и заполните пропуск» — gapni tinglab (TTS), bo'shliqni
 * to'ldiruvchi so'zni 2 ta AUDIO variantdan tanlash (variantlar ham TTS
 * bilan o'qiladi, matn oldindan ko'rinmaydi).
 */
export interface ListeningChoiceExercise extends ExerciseBase {
  kind: 'listening-choice'
  /** Bo'shliqli gap matni (___ bilan) — faqat tuzatish/izoh uchun ko'rsatiladi */
  text: string
  /** TTS orqali o'qiladigan to'liq gap (audioText — bo'shliqsiz, to'g'ri variant bilan) */
  audioText: string
  /** Audio variantlar (bittasi to'g'ri) */
  options: string[]
  answerIndex: number
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

/** Bir nechta to'g'ri javob (checkbox). */
export interface MultiSelectExercise extends ExerciseBase {
  kind: 'multi-select'
  question: string
  options: string[]
  /** To'g'ri variantlar indekslari (kamida 2 ta). */
  answerIndexes: number[]
}

/** Gap ichidagi ochiluvchi ro'yxatlar: har `___` uchun variantlar. */
export interface DropdownClozeExercise extends ExerciseBase {
  kind: 'dropdown-cloze'
  /** Bo'shliq ___ bilan belgilanadi */
  text: string
  /** Har bo'shliq uchun variantlar (to'g'risi ichida) */
  choices: string[][]
  /** Har bo'shliqning to'g'ri javobi */
  answers: string[]
}

/** Ketma-ketlik: gap / voqea / dialog qatorlarini tartiblash. */
export interface SequenceExercise extends ExerciseBase {
  kind: 'sequence'
  passageId?: string
  /** Qo'shimcha izoh (masalan, "Dialogni tartiblang") */
  question?: string
  /** TO'G'RI tartibda */
  items: string[]
  /** O'quvchiga ko'rsatiladigan aralash tartib (muallif belgilaydi) */
  itemsShuffled: string[]
}

/** Saralash: elementlarni guruhlarga ajratish. */
export interface CategorizeExercise extends ExerciseBase {
  kind: 'categorize'
  /** 2–3 ta guruh nomi */
  categories: string[]
  /** Element va uning to'g'ri guruhi (categories indeksi) */
  sortItems: { text: string; category: number }[]
}

/** Qisqa javob: 1–3 so'z yozish. */
export interface ShortAnswerExercise extends ExerciseBase {
  kind: 'short-answer'
  passageId?: string
  question: string
  /** Qabul qilinadigan javoblar (registr/tinish belgisiga bardoshli) */
  accepted: string[]
  maxWords?: number
}

export type Exercise =
  | MultipleChoiceExercise
  | MultiSelectExercise
  | DropdownClozeExercise
  | SequenceExercise
  | CategorizeExercise
  | ShortAnswerExercise
  | TrueFalseNotGivenExercise
  | MatchingExercise
  | AudioMatchingExercise
  | ListeningSelectExercise
  | ListeningFillExercise
  | ListeningChoiceExercise
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

/** --------------------------- DIALOGLAR (real hayot stsenariylari) --------------------------- */

/**
 * Suhbatdagi bitta replika. `gap` bo'lsa — o'quvchining replikasi: `en`
 * ichidagi `___` o'rniga `gap.answer` turadi va u variantlardan tanlanadi.
 */
export interface DialogueLine {
  speaker: 'a' | 'b'
  en: string
  uz: string
  gap?: {
    answer: string
    /** Variantlar (to'g'ri javob ham ichida, aralash tartibda yoziladi). */
    options: string[]
    /** Qaysi ko'nikma dalili sifatida yoziladi. */
    skill: 'vocabulary' | 'grammar'
    /** Javobdan keyin ko'rsatiladigan qisqa izoh (o'zbekcha). */
    whyUz: string
  }
}

export interface Dialogue {
  id: string
  level: CefrLevel
  /** Shu darajadagi qaysi kun mavzusiga mos (1..7). */
  dayNumber: number
  titleUz: string
  /** Vaziyat: qayerda, kim bilan, nima maqsadda. */
  situationUz: string
  /** Rollar nomi (inglizcha, suhbatda ko'rinadi). `b` — o'quvchi. */
  roles: { a: string; b: string }
  lines: DialogueLine[]
  /** «Nega shunday?» — suhbatdagi asosiy grammatika/ibora izohi. */
  note: { titleUz: string; pointsUz: string[]; examples: { en: string; uz: string }[] }
}
