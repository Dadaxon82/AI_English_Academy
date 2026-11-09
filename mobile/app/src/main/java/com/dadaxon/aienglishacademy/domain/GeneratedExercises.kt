package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.GrammarTopic
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.Pair2
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.SpeakingTask
import com.dadaxon.aienglishacademy.data.VocabularyItem
import com.dadaxon.aienglishacademy.data.WritingTask

/**
 * Id'dan QAYTA QURILADIGAN mashqlar — veb `src/content/index.ts` va
 * `src/content/remix.ts` bilan BAYT-BAYT bir xil (paritet testi:
 * `GeneratedExercisesParityTest`, veb fixture'ga solishtiriladi).
 *
 * Nima uchun kerak: vebda yechilgan lug'at o'yini (`vocab-pic-…`), dars
 * (`lesson-gtr-…`) va xatolar o'yini (`remix-…`) urinishlari sinxron orqali
 * mobilga keladi. Mobil ularni tiklay olmasa Xatolar daftari "—" ko'rsatardi.
 *
 * SOF funksiyalar — kontent qidiruvlari parametr bilan beriladi (JVM testi).
 */

const val VOCAB_PIC_PREFIX = "vocab-pic-"
const val VOCAB_SENT_PREFIX = "vocab-sent-"
const val VOCAB_MATCH_PREFIX = "vocab-match-"
const val LESSON_GRAMMAR_PREFIX = "lesson-gtr-"
const val LESSON_WRITING_PREFIX = "lesson-wwo-"
const val LESSON_SPEAK_PREFIX = "lesson-spk-"
const val REMIX_PREFIX = "remix-"

/** Plitkalar uchun gap uzunligi chegarasi (so'z) — veb `LESSON_SENTENCE_MAX`. */
const val LESSON_SENTENCE_MAX = 12

private fun wordsOf(s: String): List<String> = s.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }

/**
 * Veb `seededShuffle`/`seeded` bilan bir xil 32-bit xesh (FNV-1a + LCG).
 * JS `Math.imul` = Kotlin Int ko'paytmasi (to'lib o'tish bir xil), `>>> 0` —
 * ishorasiz qiymat sifatida modul olinadi.
 */
private fun <T> seeded(arr: List<T>, seed: String): MutableList<T> {
    val out = arr.toMutableList()
    var h = 2166136261L.toInt()
    // JS `for (const ch of seed)` kod nuqtalari bo'yicha, `charCodeAt(0)` — birinchi UTF-16 birligi
    var k = 0
    while (k < seed.length) {
        val cp = seed.codePointAt(k)
        h = (h xor seed[k].code) * 16777619
        k += Character.charCount(cp)
    }
    for (i in out.size - 1 downTo 1) {
        h = h * 1103515245 + 12345
        val j = ((h.toLong() and 0xffffffffL) % (i + 1)).toInt()
        val t = out[i]
        out[i] = out[j]
        out[j] = t
    }
    return out
}

/** Veb `seededShuffle`: aralash natija javobning o'zi bo'lib qolmasin. */
private fun <T> seededShuffle(arr: List<T>, seed: String): List<T> {
    val out = seeded(arr, seed)
    if (out.size > 1 && out.indices.all { out[it] == arr[it] }) out.add(out.removeAt(0))
    return out
}

/* ------------------------------ lug'at o'yini ------------------------------ */

fun vocabPictureExercise(v: VocabularyItem, options: List<String> = listOf(v.word)): Exercise =
    Exercise(
        id = "$VOCAB_PIC_PREFIX${v.id}",
        kind = Kinds.MULTIPLE_CHOICE,
        instructionUz = "«${v.translationUz.split(Regex("[,;]"))[0].trim()}» so‘zini tanlang",
        level = v.level,
        skill = Skills.VOCABULARY,
        explanationUz = "${v.translationUz} — ${v.word}.",
        difficulty = 1,
        tags = listOf("vocab game", v.topic),
        question = "",
        options = options,
        answerIndex = options.indexOf(v.word),
    )

fun vocabSentenceExercise(v: VocabularyItem, from: String): Exercise =
    Exercise(
        id = "$VOCAB_SENT_PREFIX$from-${v.id}",
        kind = Kinds.TRANSLATION,
        instructionUz = if (from == "en") "O‘zbekchaga tarjima qiling" else "Inglizchaga tarjima qiling",
        level = v.level,
        skill = Skills.VOCABULARY,
        explanationUz = "${v.exampleEn} — ${v.exampleUz}",
        difficulty = if (from == "en") 1 else 2,
        tags = listOf("vocab game", v.topic),
        source = if (from == "en") v.exampleEn else v.exampleUz,
        sourceLang = from,
        accepted = listOf(if (from == "en") v.exampleUz else v.exampleEn),
    )

fun vocabMatchExercise(vs: List<VocabularyItem>): Exercise =
    Exercise(
        id = "$VOCAB_MATCH_PREFIX${vs.joinToString("~") { it.id }}",
        kind = Kinds.MATCHING,
        instructionUz = "Juftliklarni toping",
        level = vs.firstOrNull()?.level ?: Levels.A1,
        skill = Skills.VOCABULARY,
        explanationUz = vs.joinToString("; ") { "${it.word} — ${it.translationUz}" },
        difficulty = 1,
        tags = listOf("vocab game"),
        pairs = vs.map { Pair2(left = it.word, right = it.translationUz) },
    )

/* ------------------------------ bo'lim darslari ------------------------------ */

fun grammarExampleExercise(topic: GrammarTopic, i: Int): Exercise? {
    val ex = topic.examples.getOrNull(i) ?: return null
    return Exercise(
        id = "$LESSON_GRAMMAR_PREFIX${topic.id}-$i",
        kind = Kinds.TRANSLATION,
        instructionUz = "Inglizchaga tarjima qiling",
        level = topic.level,
        skill = Skills.GRAMMAR,
        explanationUz = "${ex.uz} — ${ex.en}",
        difficulty = 2,
        tags = listOf("lesson", topic.id),
        source = ex.uz,
        sourceLang = "uz",
        accepted = listOf(ex.en),
    )
}

/** Veb `shortSentences`: gaplarga bo'lish (3..12 so'zli), `max` tagacha. */
fun shortSentences(text: String, max: Int = 4): List<String> =
    text.split(Regex("(?<=[.!?])\\s+"))
        .map { it.trim() }
        .filter { val n = wordsOf(it).size; n in 3..LESSON_SENTENCE_MAX }
        .take(max)

private fun wordOrder(id: String, sentence: String, level: String, skill: String, instructionUz: String, note: String): Exercise {
    val answer = wordsOf(sentence)
    return Exercise(
        id = id,
        kind = Kinds.WORD_ORDER,
        instructionUz = instructionUz,
        level = level,
        skill = skill,
        explanationUz = note,
        difficulty = 2,
        tags = listOf("lesson"),
        // Mobil model yassilangan: word-order javobi `answers`da (ContentRepository bilan bir xil).
        answers = answer,
        bank = seededShuffle(answer, id),
    )
}

fun writingSentenceExercise(task: WritingTask, i: Int): Exercise? {
    val s = shortSentences(task.modelAnswerEn ?: "").getOrNull(i) ?: return null
    return wordOrder("$LESSON_WRITING_PREFIX${task.id}-$i", s, task.level, Skills.WRITING, "Gapni to‘g‘ri tartibda tuzing", "Namuna javobdan: “$s”")
}

fun speakingSentences(task: SpeakingTask): List<String> =
    (listOf(task.questionEn) + (task.followUpsEn ?: emptyList())).filter {
        val n = wordsOf(it).size
        n in 2..(LESSON_SENTENCE_MAX + 2)
    }

fun speakingRepeatExercise(task: SpeakingTask, i: Int): Exercise? {
    val s = speakingSentences(task).getOrNull(i) ?: return null
    return wordOrder("$LESSON_SPEAK_PREFIX${task.id}-$i", s, task.level, Skills.SPEAKING, "Gapni tinglang va takrorlang", "Savol: “$s”")
}

/** `<owner>-<index>` (owner id'da ham "-" bor). */
private fun splitIndexed(rest: String): Pair<String, Int>? {
    val m = Regex("^(.*)-(\\d+)$").find(rest) ?: return null
    return m.groupValues[1] to m.groupValues[2].toInt()
}

/* ------------------------------ remix (xatolar o'yini) ------------------------------ */

private fun low(s: String) = s.trim().lowercase()

/** Veb `remixExercise`: xato mashqni boshqa formatda. Mos kelmasa `null`. */
fun remixExercise(ex: Exercise, lastGiven: String = ""): Exercise? {
    val id = "$REMIX_PREFIX${ex.id}"
    val tags = (ex.tags ?: emptyList()) + "remix"
    return when (ex.kind) {
        Kinds.GAP_FILL -> {
            val given = lastGiven.split(" / ")
            val bank = ex.wordBank ?: emptyList()
            val answers = ex.answers ?: emptyList()
            val choices = answers.mapIndexed { i, ans ->
                val pool = mutableListOf(ans)
                val g = (given.getOrNull(i) ?: "").trim()
                if (g.isNotEmpty() && low(g) != low(ans)) pool.add(g)
                for (w in bank + answers) {
                    if (pool.size >= 3) break
                    if (pool.none { low(it) == low(w) }) pool.add(w)
                }
                seeded(pool, "$id:$i").toList()
            }
            if (choices.any { it.size < 2 }) return null
            Exercise(
                id = id, kind = Kinds.DROPDOWN_CLOZE, instructionUz = "Bo‘shliqlar uchun to‘g‘ri variantni tanlang.",
                level = ex.level, skill = ex.skill, explanationUz = ex.explanationUz, difficulty = ex.difficulty, tags = tags,
                text = ex.text, choices = choices, answers = answers,
            )
        }
        Kinds.DROPDOWN_CLOZE ->
            Exercise(
                id = id, kind = Kinds.GAP_FILL, instructionUz = "Endi variantlarsiz — bo‘shliqlarni o‘zingiz yozing.",
                level = ex.level, skill = ex.skill, explanationUz = ex.explanationUz, difficulty = ex.difficulty, tags = tags,
                text = ex.text, answers = ex.answers,
            )
        Kinds.MULTIPLE_CHOICE -> {
            val answer = ex.options?.getOrNull(ex.answerIndex) ?: ""
            val n = wordsOf(answer).size
            if ((ex.question ?: "").isBlank() || n == 0 || n > 3 || ex.passageExcerpt != null) return null
            Exercise(
                id = id, kind = Kinds.SHORT_ANSWER, instructionUz = "Variantlarsiz — javobni eslab yozing.",
                level = ex.level, skill = ex.skill, explanationUz = ex.explanationUz, difficulty = ex.difficulty, tags = tags,
                question = ex.question, accepted = listOf(answer), maxWords = maxOf(3, n),
            )
        }
        Kinds.TRANSLATION -> {
            val answer = wordsOf(ex.accepted?.firstOrNull() ?: "")
            if (answer.size < 2 || answer.size > 12) return null
            var bank: List<String> = seeded(answer, id)
            if (bank.joinToString(" ") == answer.joinToString(" ")) bank = bank.drop(1) + bank[0]
            Exercise(
                id = id, kind = Kinds.WORD_ORDER, instructionUz = "Tarjimani so‘zlardan tuzing: “${ex.source}”",
                level = ex.level, skill = ex.skill, explanationUz = ex.explanationUz, difficulty = ex.difficulty, tags = tags,
                answers = answer, bank = bank,
            )
        }
        else -> null
    }
}

fun baseExerciseId(id: String): String = if (id.startsWith(REMIX_PREFIX)) id.removePrefix(REMIX_PREFIX) else id

/* ------------------------------ id'dan tiklash ------------------------------ */

/** Kontent qidiruvlari (ContentRepository beradi; testda — JSON'dan). */
class GeneratedLookup(
    val vocabById: (String) -> VocabularyItem?,
    val grammarTopics: () -> List<GrammarTopic>,
    val writingTasks: () -> List<WritingTask>,
    val speakingTasks: () -> List<SpeakingTask>,
    /** Oddiy (ro'yxatdagi) mashq — remix asli uchun. */
    val plainExercise: (String) -> Exercise?,
)

/**
 * Id'dan yasalgan mashqni tiklaydi (veb `findExercise`ning shu qismi).
 * Oddiy mashqlar uchun `null` — chaqiruvchi ro'yxatdan qidiradi.
 */
fun generatedExercise(id: String, lk: GeneratedLookup): Exercise? {
    if (id.startsWith(REMIX_PREFIX)) {
        val base = baseExerciseId(id)
        val orig = generatedExercise(base, lk) ?: lk.plainExercise(base) ?: return null
        return remixExercise(orig)
    }
    if (id.startsWith(LESSON_GRAMMAR_PREFIX)) {
        val (owner, i) = splitIndexed(id.removePrefix(LESSON_GRAMMAR_PREFIX)) ?: return null
        return lk.grammarTopics().firstOrNull { it.id == owner }?.let { grammarExampleExercise(it, i) }
    }
    if (id.startsWith(LESSON_WRITING_PREFIX)) {
        val (owner, i) = splitIndexed(id.removePrefix(LESSON_WRITING_PREFIX)) ?: return null
        return lk.writingTasks().firstOrNull { it.id == owner }?.let { writingSentenceExercise(it, i) }
    }
    if (id.startsWith(LESSON_SPEAK_PREFIX)) {
        val (owner, i) = splitIndexed(id.removePrefix(LESSON_SPEAK_PREFIX)) ?: return null
        return lk.speakingTasks().firstOrNull { it.id == owner }?.let { speakingRepeatExercise(it, i) }
    }
    if (id.startsWith(VOCAB_PIC_PREFIX)) return lk.vocabById(id.removePrefix(VOCAB_PIC_PREFIX))?.let { vocabPictureExercise(it) }
    if (id.startsWith(VOCAB_SENT_PREFIX)) {
        val rest = id.removePrefix(VOCAB_SENT_PREFIX)
        val from = if (rest.startsWith("uz-")) "uz" else "en"
        return lk.vocabById(rest.drop(3))?.let { vocabSentenceExercise(it, from) }
    }
    if (id.startsWith(VOCAB_MATCH_PREFIX)) {
        val vs = id.removePrefix(VOCAB_MATCH_PREFIX).split("~").map(lk.vocabById)
        return if (vs.isNotEmpty() && vs.all { it != null }) vocabMatchExercise(vs.filterNotNull()) else null
    }
    return null
}
