package com.dadaxon.aienglishacademy.data

/**
 * Qurilmadagi foydalanuvchi holati — veb `src/lib/types.ts` (`AppData`) ning
 * mobil nusxasi. JSON kalitlari bir xil saqlanadi: foydalanuvchi bitta jadvaga
 * yozadi, shuning uchun maydon nomlari va semantika **bir xil** bo'lishi shart.
 */

data class UserSettings(
    val dailyMinutes: Int = 90,
    val currentLevel: String = Levels.A1,
    val targetLevel: String = Levels.C1,
    /** YYYY-MM-DD yoki null */
    val examDate: String? = null,
    /** skill -> daqiqa (jami = dailyMinutes) */
    val allocation: Map<String, Int> = DEFAULT_ALLOCATION,
    /** "light" | "dark" | "system" */
    val theme: String = THEME_SYSTEM,
    val aiEnabled: Boolean = true,
    /**
     * Harakat (animatsiya) yoqilganmi. Standart YOQILGAN — qoida: foydalanuvchi
     * o'chirmaguncha ilova jonli ko'rinadi; o'chirilganda hamma narsa darhol
     * holatida chiziladi (`ui/Motion.kt`). Tizim animatsiyalari
     * (`animator_duration_scale = 0`) o'chirilgan bo'lsa, bu kalitga qaramay
     * harakat chizilmaydi.
     */
    val motionEnabled: Boolean = true,
) {
    fun withTheme(t: String): UserSettings = copy(theme = t)
}

/**
 * Harakat manifestining qurilmadagi kaliti (`MotionSpec` JSON'i).
 * `res/raw/motion_manifest.json` ni foydalanuvchi o'zi sozlashi uchun
 * (`Settings` → "Harakatlar"); bo'sh bo'lsa manifestning o'zi ishlatiladi.
 */
const val KEY_MOTION = "aea:motion"

const val THEME_LIGHT = "light"
const val THEME_DARK = "dark"
const val THEME_SYSTEM = "system"

/** Veb: DEFAULT_ALLOCATION (jami 90). */
val DEFAULT_ALLOCATION: Map<String, Int> = linkedMapOf(
    Skills.VOCABULARY to 10,
    Skills.GRAMMAR to 15,
    Skills.READING to 15,
    Skills.LISTENING to 15,
    Skills.WRITING to 20,
    Skills.SPEAKING to 15,
)

const val MIN_DAILY_MINUTES = 30
const val MAX_DAILY_MINUTES = 240

/** Veb: `clampDailyMinutes` — DB CHECK (30..240) bilan bir xil. */
fun clampDailyMinutes(m: Int): Int = m.coerceIn(MIN_DAILY_MINUTES, MAX_DAILY_MINUTES)

/** Attempt manbalari (web: AttemptSource). */
object Source {
    const val PRACTICE = "practice"
    const val SECTION_TEST = "section_test"
    const val MOCK_EXAM = "mock_exam"
    const val DIAGNOSTIC = "diagnostic"
}

data class AttemptRecord(
    val id: String,
    val exerciseId: String,
    val skill: String,
    val level: String,
    val correct: Boolean,
    val partial: Double,
    val difficulty: Int,
    val secondsSpent: Int,
    val source: String,
    val answerGiven: String,
    val at: Long,
)

data class CheckResultDto(
    val correct: Boolean,
    val given: String,
    val whyUz: String,
    val partial: Double,
)

/* ------------------------- Yozish / Gapirish tahlili ------------------ */

/** Veb: WritingAnalysis (rule-based yoki ai). */
data class WritingAnalysis(
    val engine: String = "rule-based", // "rule-based" | "ai"
    val criteriaScores: Map<String, Double> = emptyMap(),
    val errors: List<WritingError> = emptyList(),
    val strengthsUz: List<String> = emptyList(),
    val weaknessesUz: List<String> = emptyList(),
    val suggestionsUz: List<String> = emptyList(),
    val wordCount: Int = 0,
)

data class WritingError(
    val excerpt: String = "",
    val kind: String = "",
    val correction: String = "",
    val whyUz: String = "",
)

/** Mezonlar (web: CoreCriterionKey). */
object Criterion {
    const val TASK_ACHIEVEMENT = "task_achievement"
    const val COHERENCE = "coherence"
    const val LEXICAL_RESOURCE = "lexical_resource"
    const val GRAMMATICAL_RANGE = "grammatical_range"
    const val ACCURACY = "accuracy"

    val ALL = listOf(TASK_ACHIEVEMENT, COHERENCE, LEXICAL_RESOURCE, GRAMMATICAL_RANGE, ACCURACY)

    fun labelUz(k: String): String = when (k) {
        TASK_ACHIEVEMENT -> "Vazifa bajarilishi"
        COHERENCE -> "Mantiqiy bog'liqlik"
        LEXICAL_RESOURCE -> "Lug'at boyligi"
        GRAMMATICAL_RANGE -> "Grammatik qamrov"
        ACCURACY -> "Aniqlik"
        else -> k
    }
}

data class WritingSubmission(
    val id: String,
    val taskId: String,
    val text: String,
    val wordCount: Int,
    val secondsSpent: Int,
    val analysis: WritingAnalysis? = null,
    val supersedesId: String? = null,
    val createdAt: Long,
)

data class SpeakingAnalysis(
    val engine: String = "rule-based",
    /** "text" — matnli javob (ravonlik o'lchanmaydi), "audio" — ovozli */
    val mode: String = "audio",
    val fluency: Double = 0.0,
    val lexis: Double = 0.0,
    val grammar: Double = 0.0,
    val length: Double = 0.0,
    val wordCount: Int = 0,
    val wpm: Double = 0.0,
    val notesUz: List<String> = emptyList(),
    val disclaimerUz: String = "",
)

data class SpeakingSession(
    val id: String,
    val taskId: String,
    /** Audio faqat foydalanuvchi roziligi bilan; serverga yuborilmaydi */
    val audioBlobStored: Boolean = false,
    val durationSec: Int,
    val transcript: String? = null,
    /** "device-speech" | "ai" | "none" (vebda "browser-speech") */
    val transcriptionEngine: String = "none",
    val analysis: SpeakingAnalysis? = null,
    val textAnswer: String? = null,
    val createdAt: Long,
)

/* ----------------------------- Mock Exam ----------------------------- */

data class MockSectionResult(
    val sectionId: String,
    val skill: String,
    val answered: Int,
    val total: Int,
    val score: Double?,
    val startedAt: Long,
    val finishedAt: Long,
    val secondsUsed: Int? = null,
    val exerciseResults: Map<String, ExerciseResult> = emptyMap(),
)

data class ExerciseResult(val correct: Boolean = false, val given: String = "")

data class MockExamAttempt(
    val id: String,
    val examId: String,
    val sections: List<MockSectionResult> = emptyList(),
    val totalScore: Double? = null,
    val speakingAdvisory: String = "",
    val completedAt: Long,
)

/* --------------------------- SRS (SM-2 soddalashtirilgan) ------------ */

/** Veb: `SrsState` (src/lib/srs.ts). Kalitlar bir xil — sinxronlashda muhim. */
data class SrsState(
    /** So'z birinchi marta o'zlashtirilgan vaqt (0 = hali o'zlashtirilmagan) */
    val learnedAt: Long? = null,
    val dueAt: Long = 0L,
    val intervalDays: Int = 0,
    /** 1.3..3.0 */
    val ease: Double = START_EASE,
    val reps: Int = 0,
    val lapses: Int = 0,
    val lastReviewedAt: Long? = null,
)

const val MIN_EASE = 1.3
const val START_EASE = 2.5

/* -------------------------- Faollik / streak / badge ----------------- */

data class DayActivity(
    val date: String, // YYYY-MM-DD lokal
    val seconds: Int = 0,
    val attempts: Int = 0,
    val correct: Int = 0,
    val newWords: Int = 0,
    val reviewedWords: Int = 0,
    /** skill -> sekund */
    val skills: Map<String, Int> = emptyMap(),
)

data class BadgeAward(val id: String, val titleUz: String, val at: Long)

data class Streak(val count: Int = 0, val lastDate: String? = null)

data class DiagnosticResult(
    val at: Long,
    val level: String? = null,
    val labelUz: String,
    val confidence: Double,
)

/** O'quv yo'li holati. */
data class LearningPath(
    val completedDays: List<String> = emptyList(),
    /** sectionTestId -> eng yuqori ball */
    val passedTests: Map<String, Int> = emptyMap(),
    /** Joriy (tavsiya etilgan) kun */
    val currentDayId: String = "a1-day-01",
)

/* ------------------------------- AppData ----------------------------- */

data class AppData(
    val version: Int = APP_DATA_VERSION,
    val userId: String = GUEST_ID,
    val settings: UserSettings = UserSettings(),
    /** vocabId -> SRS holati */
    val srs: Map<String, SrsState> = emptyMap(),
    val attempts: List<AttemptRecord> = emptyList(),
    /** YYYY-MM-DD -> faollik */
    val activity: Map<String, DayActivity> = emptyMap(),
    val writing: List<WritingSubmission> = emptyList(),
    val speaking: List<SpeakingSession> = emptyList(),
    val mockAttempts: List<MockExamAttempt> = emptyList(),
    val xp: Int = 0,
    val streak: Streak = Streak(),
    val badges: List<BadgeAward> = emptyList(),
    val path: LearningPath = LearningPath(),
    val diagnostic: DiagnosticResult? = null,
    val onboardedAt: Long? = null,
    val updatedAt: Long = 0L,
) {
    companion object {
        const val APP_DATA_VERSION = 1

        /** Auth bo'lmasa — mahalliy mehmon (veb: "mehmon" rejimi). */
        const val GUEST_ID = "guest-local"

        /** Veb: HISTORY_LIMITS. */
        const val LIMIT_ATTEMPTS = 3000
        const val LIMIT_WRITING = 300
        const val LIMIT_SPEAKING = 300
        const val LIMIT_MOCK = 60

        fun empty(userId: String = GUEST_ID): AppData =
            AppData(userId = userId, updatedAt = System.currentTimeMillis())
    }
}

/** Lokal sana kaliti (YYYY-MM-DD) — veb: `todayKey`. */
fun todayKey(millis: Long = System.currentTimeMillis()): String =
    java.time.LocalDate.ofInstant(java.time.Instant.ofEpochMilli(millis), java.time.ZoneId.systemDefault()).toString()

fun dayKeyAddDays(key: String, delta: Long): String =
    java.time.LocalDate.parse(key).plusDays(delta).toString()

/** `date` bu kunda tushganmi (millis, lokal zona). */
fun isSameLocalDay(millis: Long, key: String): Boolean = todayKey(millis) == key
