package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.GrammarTopic
import com.dadaxon.aienglishacademy.data.ListeningTask
import com.dadaxon.aienglishacademy.data.ReadingPassage
import com.dadaxon.aienglishacademy.data.SpeakingTask
import com.dadaxon.aienglishacademy.data.WritingTask

/**
 * Dars rejimi (Duolingo uslubi) — veb `src/lib/lessons.ts`, `mistakes.ts`
 * va `LessonPlayer` navbati bilan BIR XIL mantiq.
 *
 *  - Bo'lim darslari: qoida/matn/audio kartasi → mashqlar.
 *  - Xatolar o'yinlari: fix / hard / remix / timed.
 *  - Dars navbati: xato javob oxiriga qayta qo'yiladi ("Xatolarni tuzatamiz"),
 *    aniqlik faqat BIRINCHI urinishlar bo'yicha.
 */

sealed class LessonStep {
    abstract val id: String

    data class Info(override val id: String, val info: String, val titleUz: String) : LessonStep()

    data class Ex(
        override val id: String,
        val exercise: Exercise,
        val context: String? = null,
        val badge: String? = null,
        val badgeTone: String? = null,
    ) : LessonStep()

    data class Speak(override val id: String, val sentence: String, val fallback: Exercise) : LessonStep()
}

fun isGraded(step: LessonStep): Boolean = step !is LessonStep.Info

fun grammarLesson(topic: GrammarTopic): List<LessonStep> {
    val steps = mutableListOf<LessonStep>(LessonStep.Info("${topic.id}:rule", "rule", topic.titleUz))
    // Avval osonlari (barqaror tartib — `sortedBy` stabil, JS `sort` ham).
    val ex = topic.exercises.sortedBy { it.difficulty }
    val half = (ex.size + 1) / 2
    ex.take(half).forEach { steps.add(LessonStep.Ex(it.id, it)) }
    for (i in 0 until minOf(2, topic.examples.size)) grammarExampleExercise(topic, i)?.let { steps.add(LessonStep.Ex(it.id, it)) }
    ex.drop(half).forEach { steps.add(LessonStep.Ex(it.id, it)) }
    return steps
}

fun readingLesson(p: ReadingPassage): List<LessonStep> =
    listOf<LessonStep>(LessonStep.Info("${p.id}:read", "passage", p.title)) + p.exercises.map { LessonStep.Ex(it.id, it, context = "passage") }

fun listeningLesson(t: ListeningTask): List<LessonStep> =
    listOf<LessonStep>(LessonStep.Info("${t.id}:listen", "audio", t.title)) + t.exercises.map { LessonStep.Ex(it.id, it, context = "audio") }

fun writingLesson(task: WritingTask): List<LessonStep> {
    val steps = mutableListOf<LessonStep>()
    val n = shortSentences(task.modelAnswerEn ?: "").size
    for (i in 0 until n) writingSentenceExercise(task, i)?.let { steps.add(LessonStep.Ex(it.id, it)) }
    steps.add(LessonStep.Info("${task.id}:write", "write-cta", "Endi özingiz yozing"))
    return steps
}

fun speakingLesson(task: SpeakingTask): List<LessonStep> {
    val steps = mutableListOf<LessonStep>()
    speakingSentences(task).forEachIndexed { i, s -> speakingRepeatExercise(task, i)?.let { steps.add(LessonStep.Speak(it.id, s, it)) } }
    steps.add(LessonStep.Info("${task.id}:speak", "speak-cta", "Endi savolga javob bering"))
    return steps
}

/** Talaffuz bahosi (veb `speechMatch`): kutilgan so'zlarning necha foizi aytilgan. 0..1. */
fun speechMatch(expected: String, heard: String): Double {
    fun toks(s: String) =
        s.lowercase().replace(Regex("[’‘`]"), "'").replace(Regex("[^a-z0-9' ]"), " ").split(Regex("\\s+")).filter { it.isNotEmpty() }
    val exp = toks(expected)
    if (exp.isEmpty()) return 0.0
    val pool = toks(heard).toMutableList()
    var hit = 0
    for (w in exp) {
        val i = pool.indexOf(w)
        if (i > -1) {
            hit++
            pool.removeAt(i)
        }
    }
    return hit.toDouble() / exp.size
}

const val SPEECH_PASS = 0.7

/* ------------------------------ dars navbati ------------------------------ */

/**
 * LessonPlayer navbati (veb `LessonPlayer.tsx` bilan bir xil qoida):
 * xato javob berilgan baholanadigan qadam navbat OXIRIGA bir marta qayta
 * qo'yiladi; aniqlik faqat birinchi urinishlardan.
 */
class LessonQueue(steps: List<LessonStep>) {
    data class Item(val step: LessonStep, val retry: Boolean)
    data class Result(val step: LessonStep, val correct: Boolean, val retry: Boolean)

    private val queue = steps.map { Item(it, false) }.toMutableList()
    var pos = 0
        private set
    val results = mutableListOf<Result>()

    val current: Item? get() = queue.getOrNull(pos)
    val total: Int get() = queue.size
    val ended: Boolean get() = pos >= queue.size

    /** Javob natijasi (info qadamda `correct` e'tiborga olinmaydi). */
    fun answer(correct: Boolean) {
        val item = current ?: return
        if (isGraded(item.step)) {
            results.add(Result(item.step, correct, item.retry))
            if (!correct && !item.retry) queue.add(Item(item.step, true))
        }
        pos++
    }

    /** Birinchi urinishlar bo'yicha aniqlik (0..100); hech narsa yechilmasa 0. */
    fun accuracyPct(): Int {
        val first = results.filter { !it.retry && isGraded(it.step) }
        if (first.isEmpty()) return 0
        return Math.round(first.count { it.correct } * 100.0 / first.size).toInt()
    }
}

/* ------------------------------ xatolar o'yinlari ------------------------------ */

object MistakeModes {
    const val FIX = "fix"
    const val HARD = "hard"
    const val REMIX = "remix"
    const val TIMED = "timed"
    val ALL = listOf(FIX, HARD, REMIX, TIMED)
}

/** Vaqtga qarshi o'yin davomiyligi (soniya) — veb bilan bir xil. */
const val TIMED_SECONDS = 90

data class Mistake(val exercise: Exercise, val wrongCount: Int, val lastAt: Long, val lastGiven: String)

/** Tuzatilmagan xatolar: mashqning (remix bo'lsa — aslining) eng oxirgi urinishi noto'g'ri. */
fun unresolvedMistakes(attempts: List<AttemptRecord>, find: (String) -> Exercise?): List<Mistake> {
    val byBase = LinkedHashMap<String, MutableList<AttemptRecord>>()
    for (a in attempts) byBase.getOrPut(baseExerciseId(a.exerciseId)) { mutableListOf() }.add(a)
    val out = mutableListOf<Mistake>()
    for ((id, list) in byBase) {
        val sorted = list.sortedBy { it.at }
        val last = sorted.last()
        if (last.correct) continue
        val ex = find(id) ?: continue
        out.add(Mistake(ex, sorted.count { !it.correct }, last.at, last.answerGiven))
    }
    return out.sortedByDescending { it.lastAt }
}

fun modeCount(mode: String, list: List<Mistake>): Int =
    when (mode) {
        MistakeModes.FIX -> minOf(10, list.size)
        MistakeModes.HARD -> minOf(8, list.count { it.wrongCount >= 2 })
        MistakeModes.REMIX -> minOf(8, list.count { remixExercise(it.exercise, it.lastGiven) != null })
        MistakeModes.TIMED -> minOf(15, list.size)
        else -> 0
    }

fun buildMistakeLesson(mode: String, list: List<Mistake>, rand: () -> Double = Math::random): List<LessonStep> {
    fun step(ex: Exercise, i: Int, badge: String, tone: String = "fix") = LessonStep.Ex("${ex.id}#$i", ex, badge = badge, badgeTone = tone)
    return when (mode) {
        MistakeModes.FIX -> list.take(10).mapIndexed { i, m -> step(m.exercise, i, "Xatoni tuzatamiz") }
        MistakeModes.HARD ->
            list.filter { it.wrongCount >= 2 }
                .sortedWith(compareByDescending<Mistake> { it.wrongCount }.thenByDescending { it.lastAt })
                .take(8)
                .mapIndexed { i, m -> step(m.exercise, i, "${m.wrongCount} marta xato qilingan") }
        MistakeModes.REMIX ->
            list.mapNotNull { remixExercise(it.exercise, it.lastGiven) }.take(8).mapIndexed { i, e -> step(e, i, "Boşqa körinişda", "new") }
        MistakeModes.TIMED -> {
            val arr = list.toMutableList()
            for (i in arr.size - 1 downTo 1) {
                val j = Math.floor(rand() * (i + 1)).toInt()
                val t = arr[i]
                arr[i] = arr[j]
                arr[j] = t
            }
            arr.take(15).mapIndexed { i, m -> step(m.exercise, i, "Vaqtga qarşi") }
        }
        else -> emptyList()
    }
}
