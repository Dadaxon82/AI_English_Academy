package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.FsAssetSource
import com.google.gson.Gson
import com.google.gson.JsonParser
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Real hayot suhbatlari — veb ↔ mobil paritet. `generated-parity.json` dagi
 * `dlg-…` mashqlarni veb O'ZI yasagan (`allDialogueExercises()`); Kotlin
 * `dialogues.json`dan aynan shuni yasashi shart (savol, iqtibos, variantlar,
 * javob o'rni, izoh). Aks holda vebdagi xato mobilda tiklanmaydi.
 */
class DialoguesParityTest {

    private fun assetsDir(): File {
        for (c in listOf("src/main/assets", "app/src/main/assets", "mobile/app/src/main/assets")) {
            val f = File(c)
            if (File(f, ContentRepository.MANIFEST_PATH).isFile) return f
        }
        throw IllegalStateException("assets topilmadi (pwd=${File(".").absolutePath})")
    }

    private val repo = ContentRepository(FsAssetSource(assetsDir()))
    private val dialogues = repo.dialogues()

    private val web: List<Exercise> by lazy {
        val text = javaClass.classLoader!!.getResource("generated-parity.json")?.readText()
            ?: File("src/test/resources/generated-parity.json").readText()
        // Avval id bo'yicha filtr: boshqa turlar (`word-order` — `answer` massiv) Exercise'ga to'g'ridan-to'g'ri o'qilmaydi.
        JsonParser.parseString(text).asJsonObject.getAsJsonArray("exercises")
            .filter { it.asJsonObject.get("id")?.asString?.startsWith(DIALOGUE_PREFIX) == true }
            .map { Gson().fromJson(it, Exercise::class.java) }
    }

    @Test
    fun suhbatlarYuklandiHarDarajaHarKun() {
        assertEquals(14, dialogues.size)
        for (lvl in listOf("A1", "A2")) assertEquals((1..7).toList(), dialoguesFor(dialogues, lvl).map { it.dayNumber })
        assertTrue(dialogues.all { gapLineIndexes(it).size == 3 })
    }

    @Test
    fun mashqlarVebBilanAynanBirXil() {
        assertEquals("fixture: 14 suhbat × 3 bo'shliq", 42, web.size)
        val bad = mutableListOf<String>()
        for (w in web) {
            val k = repo.findExercise(w.id)
            if (k == null) { bad += "${w.id}: mobil tiklamadi"; continue }
            fun same(name: String, a: Any?, b: Any?) { if (a != b) bad += "${w.id}.$name: veb=$a mobil=$b" }
            same("kind", w.kind, k.kind)
            same("instructionUz", w.instructionUz, k.instructionUz)
            same("explanationUz", w.explanationUz, k.explanationUz)
            same("level", w.level, k.level)
            same("skill", w.skill, k.skill)
            same("difficulty", w.difficulty, k.difficulty)
            same("tags", w.tags, k.tags)
            same("passageExcerpt", w.passageExcerpt, k.passageExcerpt)
            same("question", w.question, k.question)
            same("options", w.options, k.options)
            same("answerIndex", w.answerIndex, k.answerIndex)
        }
        assertTrue(bad.joinToString("\n"), bad.isEmpty())
    }

    @Test
    fun nomalumIdVaBoshliqsizQatorNull() {
        assertNull(repo.findExercise("dlg-yoq-suhbat-1"))
        assertNull(repo.findExercise("dlg-${dialogues.first().id}-0"))
    }

    @Test
    fun holatOxirgiUrinishBoyicha() {
        val d = dialogues.first()
        val ids = gapLineIndexes(d).map { dialogueExerciseId(d, it) }
        fun a(id: String, ok: Boolean, at: Long) = AttemptRecord(id = "$id$at", exerciseId = id, skill = "grammar", level = "A1", correct = ok, partial = 0.0, difficulty = 1, secondsSpent = 1, source = "practice", answerGiven = "", at = at)
        assertEquals(DialogueProgress(0, 0, 3), dialogueProgress(d, emptyList()))
        val atts = listOf(a(ids[0], false, 1), a(ids[0], true, 2), a(ids[1], true, 3), a(ids[1], false, 4), a("boshqa", true, 5))
        assertEquals(DialogueProgress(1, 2, 3), dialogueProgress(d, atts))
    }
}
