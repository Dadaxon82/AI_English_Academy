package com.dadaxon.aienglishacademy.data

/**
 * Kontent modellari — veb tomondagi `src/content/types.ts` kontraktining
 * mobil nusxasi (JSON kalitlari SO'ZMA-SO'Z bir xil: `scripts/export-content-mobile.mjs`
 * TS interfeyslarini to'g'ridan-to'g'ri JSON qiladi).
 *
 * Mashq turlari bitta `Exercise` klassida YASSILANGAN (union emas): Gson uchun
 * discriminator shart emas, `kind` maydoni qaysi maydonlar to'ldirilganini aytdi.
 * Boshqa maydonlar null bo'ladi — tekshiruvchi (`AnswerChecker`) `kind` bo'yicha
 * qaysi birini o'qishni biladi.
 */

/** CEFR darajalari (web: CEFR_LEVELS). */
object Levels {
    const val A1 = "A1"
    const val A2 = "A2"
    const val B1 = "B1"
    const val B2 = "B2"
    const val C1 = "C1"

    val ALL = listOf(A1, A2, B1, B2, C1)

    fun next(current: String): String? = ALL.indexOf(current).takeIf { it in 0 until ALL.size - 1 }?.let { ALL[it + 1] }
}

/** Ko'nikmalar (web: SKILLS / CORE_SKILLS). */
object Skills {
    const val READING = "reading"
    const val LISTENING = "listening"
    const val WRITING = "writing"
    const val SPEAKING = "speaking"
    const val VOCABULARY = "vocabulary"
    const val GRAMMAR = "grammar"

    val ALL = listOf(READING, LISTENING, WRITING, SPEAKING, VOCABULARY, GRAMMAR)

    /** Reja va Mock Exam uchun asosiy to'rt ko'nikma. */
    val CORE = listOf(READING, LISTENING, WRITING, SPEAKING)

    /** Kun tartibi (web: planning.ts SKILL_ORDER). */
    val PLAN_ORDER = listOf(VOCABULARY, GRAMMAR, READING, LISTENING, WRITING, SPEAKING)
}

/** Mashq turlari (web: ExerciseKind). */
object Kinds {
    const val MULTIPLE_CHOICE = "multiple-choice"
    const val TRUE_FALSE_NOTGIVEN = "true-false-notgiven"
    const val MATCHING = "matching"
    const val GAP_FILL = "gap-fill"
    const val WORD_ORDER = "word-order"
    const val TRANSLATION = "translation"

    // 2026-11-08 — yangi turlar (veb: `docs/TOPSHIRIQ_TURLARI_TAHLIL.md`)
    const val MULTI_SELECT = "multi-select"
    const val DROPDOWN_CLOZE = "dropdown-cloze"
    const val SEQUENCE = "sequence"
    const val CATEGORIZE = "categorize"
    const val SHORT_ANSWER = "short-answer"
}

/* ------------------------------- LUG'AT ------------------------------- */

data class PronunciationSource(
    val kind: String? = null, // "audio-file" | "browser-tts"
    val src: String? = null,
    val ttsText: String? = null,
    val lang: String? = null,
)

data class VocabularyItem(
    val id: String,
    val word: String,
    val translationUz: String,
    val explanationEn: String,
    val ipa: String? = null,
    val pronunciation: PronunciationSource? = null,
    val exampleEn: String = "",
    val exampleUz: String = "",
    val pos: String = "",
    val topic: String = "",
    val level: String = Levels.A1,
)

/* ------------------------------- MASHQLAR ------------------------------ */

data class Pair2(val left: String = "", val right: String = "")

/** categorize: element va uning guruhi (`categories` indeksi). */
data class SortItem(val text: String = "", val category: Int = 0)

data class Exercise(
    val id: String,
    val kind: String,
    val instructionUz: String = "",
    val level: String = Levels.A1,
    val skill: String = Skills.GRAMMAR,
    val explanationUz: String = "",
    val difficulty: Int = 1,
    val tags: List<String>? = null,

    // multiple-choice
    val passageId: String? = null,
    val passageExcerpt: String? = null,
    val question: String? = null,
    val options: List<String>? = null,
    val answerIndex: Int = 0,

    // true-false-notgiven
    val statement: String? = null,
    val answer: String? = null, // "true" | "false" | "notgiven"
    val evidence: String? = null,

    // matching
    val pairs: List<Pair2>? = null,

    // gap-fill
    val text: String? = null,
    val answers: List<String>? = null,
    val acceptAlternatives: List<List<String>>? = null,
    val wordBank: List<String>? = null,
    val caseSensitive: Boolean? = null,

    // word-order
    val bank: List<String>? = null,
    val noteUz: String? = null,

    // translation
    val source: String? = null,
    val sourceLang: String? = null, // "en" | "uz"
    val accepted: List<String>? = null, // translation + short-answer

    // multi-select (question + options ham)
    val answerIndexes: List<Int>? = null,

    // dropdown-cloze (text + answers ham)
    val choices: List<List<String>>? = null,

    // sequence (question ixtiyoriy)
    val items: List<String>? = null,
    val itemsShuffled: List<String>? = null,

    // categorize
    val categories: List<String>? = null,
    val sortItems: List<SortItem>? = null,

    // short-answer (question + accepted ham)
    val maxWords: Int? = null,
)

/* ------------------------- Grammatika / O'qish / Tinglash ------------- */

data class GrammarFormula(val form: String = "", val noteUz: String? = null)
data class ExampleEn(val en: String = "", val uz: String = "")
data class GrammarForms(
    val affirmative: List<String>? = null,
    val negative: List<String>? = null,
    val question: List<String>? = null,
)
data class CommonMistake(val wrong: String = "", val right: String = "", val whyUz: String = "")

data class GrammarTopic(
    val id: String,
    val titleUz: String = "",
    val titleEn: String = "",
    val level: String = Levels.A1,
    val explanationUz: List<String> = emptyList(),
    val formula: List<GrammarFormula> = emptyList(),
    val examples: List<ExampleEn> = emptyList(),
    val forms: GrammarForms? = null,
    val exercises: List<Exercise> = emptyList(),
    val commonMistakes: List<CommonMistake>? = null,
)

data class GlossaryEntry(val word: String = "", val uz: String = "")

data class ReadingPassage(
    val id: String,
    val title: String = "",
    val level: String = Levels.A1,
    val estMinutes: Int = 3,
    val provenance: String = "original",
    val paragraphs: List<String> = emptyList(),
    val glossary: List<GlossaryEntry>? = null,
    val exercises: List<Exercise> = emptyList(),
)

data class TranscriptSegment(val start: Double = 0.0, val end: Double = 0.0, val text: String = "")

data class AudioAsset(
    val id: String = "",
    val src: String = "",
    val fileAvailable: Boolean = false,
    val source: String = "missing",
    val attribution: String = "",
    val license: String = "",
    val transcript: List<TranscriptSegment> = emptyList(),
    val offlineAllowed: Boolean = false,
    val level: String = Levels.A1,
    val title: String = "",
    val durationSec: Double? = null,
)

data class ListeningTask(
    val id: String,
    val title: String = "",
    val level: String = Levels.A1,
    val audio: AudioAsset = AudioAsset(),
    val transcriptPolicy: String = "after-first-listen",
    val exercises: List<Exercise> = emptyList(),
)

/* --------------------------- Yozish / Gapirish ----------------------- */

data class MustInclude(val pattern: String = "", val whyUz: String = "")

data class WritingTask(
    val id: String,
    val level: String = Levels.A1,
    val genre: String = "paragraph",
    val promptEn: String = "",
    val instructionUz: String = "",
    val minWords: Int = 20,
    val maxWords: Int = 120,
    val minutes: Int = 15,
    val criteria: List<String> = emptyList(),
    val checklistUz: List<String>? = null,
    val mustInclude: List<MustInclude>? = null,
    val modelAnswerEn: String? = null,
)

data class SpeakingTask(
    val id: String,
    val level: String = Levels.A1,
    val topicUz: String = "",
    val questionEn: String = "",
    val hintUz: String? = null,
    val minSeconds: Int = 20,
    val targetSeconds: Int = 60,
    val textAlternative: String = "",
    val followUpsEn: List<String>? = null,
)

/* --------------------- Kun / Bo'lim testi / Mock Exam ----------------- */

data class SectionTest(
    val id: String,
    val level: String = Levels.A1,
    val section: String = Skills.GRAMMAR,
    val titleUz: String = "",
    val passScore: Int = 70,
    val exercises: List<Exercise> = emptyList(),
)

data class DaySection(
    val skill: String = Skills.VOCABULARY,
    val minutes: Int = 10,
    val itemIds: List<String> = emptyList(),
    val titleUz: String = "",
)

data class DailyPlanDay(
    val id: String,
    val level: String = Levels.A1,
    val dayNumber: Int = 1,
    val titleUz: String = "",
    val goalUz: String = "",
    val sections: List<DaySection> = emptyList(),
    val sectionTest: SectionTest? = null,
)

data class MockExamSectionSpec(
    val id: String,
    val skill: String = Skills.READING,
    val titleEn: String = "",
    val titleUz: String = "",
    val minutes: Int = 20,
    val formatVerified: Boolean = false,
    val formatNote: String = "",
    val exercises: List<Exercise> = emptyList(),
    val writingTask: WritingTask? = null,
    val speakingTask: SpeakingTask? = null,
    val audio: AudioAsset? = null,
)

data class MockExamSpec(
    val id: String,
    val titleUz: String = "",
    val level: String = Levels.A1,
    val descriptionUz: String = "",
    val disclaimerUz: String = "",
    val sections: List<MockExamSectionSpec> = emptyList(),
)

data class DiagnosticQuestion(
    val id: String = "",
    val level: String = Levels.A1,
    val exercise: Exercise? = null,
)

data class DiagnosticTest(
    val id: String = "",
    val titleUz: String = "",
    val instructionUz: String = "",
    val questions: List<DiagnosticQuestion> = emptyList(),
)

/* --------------------------- Daraja to'plami ------------------------- */

data class LevelBundle(
    val level: String = Levels.A1,
    val days: List<DailyPlanDay> = emptyList(),
    val vocab: List<VocabularyItem> = emptyList(),
    val grammar: List<GrammarTopic> = emptyList(),
    val reading: List<ReadingPassage> = emptyList(),
    val listening: List<ListeningTask> = emptyList(),
    val writing: List<WritingTask> = emptyList(),
    val speaking: List<SpeakingTask> = emptyList(),
    val tests: List<SectionTest> = emptyList(),
    val mockExam: MockExamSpec? = null,
)

/** `assets/content/manifest.json` (eksport skripti yozadi). */
data class ContentManifest(
    val generatedAt: String = "",
    val source: String = "",
    val levels: List<ContentLevelInfo> = emptyList(),
)

data class ContentLevelInfo(
    val level: String = "",
    val days: Int = 0,
    val vocab: Int = 0,
    val exercises: Int = 0,
    val bytes: Int = 0,
)
