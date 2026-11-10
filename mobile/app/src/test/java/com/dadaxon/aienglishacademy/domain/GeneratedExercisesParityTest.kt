package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.LevelBundle
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Veb ↔ mobil paritet: `scripts/export-content-mobile.mjs` vebning O'Z
 * funksiyalari bilan `generated-parity.json` yozadi (lug'at o'yini, dars
 * qadamlari, remix). Kotlin xuddi shu kontentdan AYNAN shuni yasashi shart —
 * aks holda vebdagi urinish mobil Xatolar daftarida tiklanmaydi.
 */
class GeneratedExercisesParityTest {
    private val contentDir = System.getProperty("contentDir") ?: "src/main/assets/content"

    private fun fixWordOrder(el: JsonElement) {
        if (el is JsonArray) { for (c in el) fixWordOrder(c); return }
        if (el !is JsonObject) return
        val ans = el.get("answer")
        if (ans is JsonArray) { el.remove("answer"); if (!el.has("answers")) el.add("answers", ans) }
        for ((_, v) in el.entrySet()) fixWordOrder(v)
    }

    private fun bundle(level: String): LevelBundle {
        val root = JsonParser.parseString(File("$contentDir/${level.lowercase()}.json").readText())
        fixWordOrder(root)
        return Gson().fromJson(root, LevelBundle::class.java)
    }

    private val bundles = listOf("A1", "A2").map { bundle(it) }

    private val parity: JsonObject by lazy {
        val text = javaClass.classLoader!!.getResource("generated-parity.json")?.readText()
            ?: File(System.getProperty("parityJson") ?: "src/test/resources/generated-parity.json").readText()
        JsonParser.parseString(text).asJsonObject
    }

    private val lookup = GeneratedLookup(
        vocabById = { id -> bundles.flatMap { it.vocab }.firstOrNull { it.id == id } },
        grammarTopics = { bundles.flatMap { it.grammar } },
        writingTasks = { bundles.flatMap { b -> b.writing + (b.mockExam?.sections?.mapNotNull { it.writingTask } ?: emptyList()) } },
        speakingTasks = { bundles.flatMap { b -> b.speaking + (b.mockExam?.sections?.mapNotNull { it.speakingTask } ?: emptyList()) } },
        plainExercise = { id ->
            bundles.flatMap { b -> b.grammar.flatMap { it.exercises } + b.reading.flatMap { it.exercises } + b.listening.flatMap { it.exercises } + b.tests.flatMap { it.exercises } }
                .firstOrNull { it.id == id }
        },
    )

    /** Solishtiriladigan maydonlar — veb JSON'ini mobil modelga keltirib. */
    private fun view(e: Exercise): Map<String, Any?> = mapOf(
        "id" to e.id, "kind" to e.kind, "instructionUz" to e.instructionUz, "explanationUz" to e.explanationUz,
        "level" to e.level, "skill" to e.skill, "difficulty" to e.difficulty, "tags" to e.tags,
        "question" to e.question, "options" to e.options, "answerIndex" to if (e.kind == Kinds.MULTIPLE_CHOICE) e.answerIndex else null,
        "text" to e.text, "answers" to e.answers, "bank" to e.bank, "choices" to e.choices,
        "source" to e.source, "sourceLang" to e.sourceLang, "accepted" to e.accepted, "maxWords" to e.maxWords,
        "pairs" to e.pairs?.map { it.left to it.right },
    )

    private val generatedPrefixes = listOf(VOCAB_PIC_PREFIX, VOCAB_SENT_PREFIX, VOCAB_MATCH_PREFIX, LESSON_GRAMMAR_PREFIX, LESSON_WRITING_PREFIX, LESSON_SPEAK_PREFIX, REMIX_PREFIX)

    @Test fun `id dan tiklangan mashqlar vebdagi bilan aynan bir xil`() {
        val arr = parity.getAsJsonArray("exercises")
        val web = arr.map { el -> el.deepCopy().also { fixWordOrder(it) } }.map { Gson().fromJson(it, Exercise::class.java) }
            .filter { e -> generatedPrefixes.any { e.id.startsWith(it) } }
        assertTrue("fixture böş emas", web.size > 500)
        val bad = mutableListOf<String>()
        for (w in web) {
            val k = generatedExercise(w.id, lookup)
            if (k == null) { bad.add("${w.id}: tiklanmadi"); continue }
            val a = view(w); val b = view(k)
            for (key in a.keys) if (a[key] != b[key]) bad.add("${w.id}.$key: veb=${a[key]} kotlin=${b[key]}")
        }
        assertEquals(bad.take(15).joinToString("\n"), 0, bad.size)
    }

    @Test fun `dars qadamlari vebdagi bilan bir xil tartibda`() {
        val bad = mutableListOf<String>()
        for (l in parity.getAsJsonArray("lessons")) {
            val o = l.asJsonObject
            val owner = o.get("owner").asString
            val webIds = o.getAsJsonArray("steps").map { it.asJsonObject.get("id").asString }
            val steps = when (o.get("kind").asString) {
                "grammar" -> bundles.flatMap { it.grammar }.first { it.id == owner }.let(::grammarLesson)
                "reading" -> bundles.flatMap { it.reading }.first { it.id == owner }.let(::readingLesson)
                "listening" -> bundles.flatMap { it.listening }.first { it.id == owner }.let(::listeningLesson)
                "writing" -> bundles.flatMap { it.writing }.first { it.id == owner }.let(::writingLesson)
                else -> bundles.flatMap { it.speaking }.first { it.id == owner }.let(::speakingLesson)
            }
            if (steps.map { it.id } != webIds) bad.add("$owner: veb=$webIds kotlin=${steps.map { it.id }}")
        }
        assertEquals(bad.take(5).joinToString("\n"), 0, bad.size)
    }

    @Test fun `dars navbati - xato oxiriga bir marta qaytadi, aniqlik birinchi urinishdan`() {
        val steps = grammarLesson(bundles[0].grammar[0])
        val q = LessonQueue(steps)
        val graded = steps.count(::isGraded)
        var first = true
        while (!q.ended) {
            val it = q.current!!
            // Birinchi baholanadigan qadam xato, qolganlari to'g'ri
            q.answer(if (isGraded(it.step) && first && !it.retry) { first = false; false } else true)
        }
        assertEquals(steps.size + 1, q.total)
        assertEquals(Math.round((graded - 1) * 100.0 / graded).toInt(), q.accuracyPct())
        assertEquals(0, LessonQueue(emptyList()).accuracyPct())
    }

    @Test fun `xatolar oyini - tuzatilmagan xatolar va usullar`() {
        val ex = bundles[0].grammar[0].exercises
        fun att(id: String, ok: Boolean, at: Long) = AttemptRecord("a$at", id, "grammar", "A1", ok, if (ok) 1.0 else 0.0, 1, 5, "practice", "x", at)
        val attempts = listOf(
            att(ex[0].id, false, 1), att(ex[0].id, false, 2), // 2 marta xato — "hard"
            att(ex[1].id, false, 3), att(ex[1].id, true, 4), // tuzatilgan
            att("$REMIX_PREFIX${ex[2].id}", false, 5), // remix urinishi asliga yoziladi
        )
        val find = { id: String -> lookup.plainExercise(id) }
        val list = unresolvedMistakes(attempts, find)
        assertEquals(listOf(ex[2].id, ex[0].id), list.map { it.exercise.id })
        assertEquals(2, list.first { it.exercise.id == ex[0].id }.wrongCount)
        assertEquals(1, modeCount(MistakeModes.HARD, list))
        assertEquals(2, buildMistakeLesson(MistakeModes.FIX, list).size)
        assertEquals("2 marta xato qilingan", (buildMistakeLesson(MistakeModes.HARD, list)[0] as LessonStep.Ex).badge)
        assertTrue(buildMistakeLesson(MistakeModes.TIMED, list) { 0.0 }.size == 2)
    }

    @Test fun `nomalum id - null, soxta mashq yasalmaydi`() {
        assertNull(generatedExercise("vocab-pic-yoq-soz", lookup))
        assertNull(generatedExercise("lesson-gtr-yoq-0", lookup))
        assertNotNull(generatedExercise("$VOCAB_PIC_PREFIX${bundles[1].vocab[0].id}", lookup))
    }

    @Test fun `talaffuz bahosi`() {
        assertEquals(1.0, speechMatch("I am a student.", "i am a student"), 1e-9)
        assertEquals(0.5, speechMatch("I am a student", "a student"), 1e-9)
        assertEquals(0.0, speechMatch("", "hello"), 1e-9)
    }
}
