package com.dadaxon.aienglishacademy.data

import com.google.gson.Gson
import com.google.gson.JsonParser
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * HAQIQIY asset fayllarini o'qib tekshiradi — `assets/content/…`.
 *
 * Bu testlar «APK ichida fayl bor, lekin o'qilmayapti» turidagi xatolni
 * ushlaydi: emulatorda diagnostika bo'sh chiqqan edi, sababi `dg-11`
 * (`word-order`)da `answer` — MASSIV, mobil modelda esa `answer: String?`.
 * Gson bitta elementda xato berganda `DiagnosticLoader` butun faylni tashlab
 * yuborardi. Endi `ContentRepository.fixWordOrderAnswers` ro'yxatni `answers`
 * ga ko'chiradi va loader elementma-element yuradi.
 */
class RealAssetFilesTest {

    /** Gradle testlari `app/` papkasidan yuguradi — asset'lar shu yerda. */
    private fun assetsRoot(): File {
        val candidates = listOf(
            File("src/main/assets"),
            File("app/src/main/assets"),
            File("../app/src/main/assets"),
        )
        return candidates.firstOrNull { it.isDirectory } ?: File("src/main/assets")
    }

    @Test
    fun diagnosticAssetLoadsAllExercises() {
        val src = FsAssetSource(assetsRoot())
        assertTrue("diagnostic.json topilmadi", src.exists(DiagnosticLoader.PATH))
        val a = DiagnosticLoader.load(src)
        assertNotNull("diagnostika o'qilmadi (null)", a)
        assertEquals("barcha savollar o'qilishi kerak", 0, a!!.skipped)
        assertEquals(12, a.exercises.size)
        assertTrue(a.passScore > 0)
        val ids = a.exercises.map { it.id }
        assertEquals("dg-01", ids.first())
        assertEquals("dg-12", ids.last())
        // Har bir savolda kamida bitta javob maydoni to'ldirilgan bo'lishi
        // kerak — aks holda uni tekshirib bo'lmaydi.
        for (e in a.exercises) {
            val hasAnswer = when (e.kind) {
                Kinds.MULTIPLE_CHOICE -> !e.options.isNullOrEmpty()
                Kinds.TRUE_FALSE_NOTGIVEN -> !e.answer.isNullOrEmpty()
                Kinds.GAP_FILL -> !e.answers.isNullOrEmpty()
                Kinds.WORD_ORDER -> !e.answers.isNullOrEmpty() && !e.bank.isNullOrEmpty()
                Kinds.TRANSLATION -> !e.accepted.isNullOrEmpty()
                Kinds.MATCHING -> !e.pairs.isNullOrEmpty()
                else -> false
            }
            assertTrue("${e.id} (${e.kind}) javobi yo'q", hasAnswer)
        }
        // `dg-11` — word-order: `answer` massivi `answers` ga ko'chirilgan.
        val dg11 = a.exercises.first { it.id == "dg-11" }
        assertEquals(Kinds.WORD_ORDER, dg11.kind)
        assertEquals(null, dg11.answer)
        assertEquals(listOf("Never", "had", "she", "seen", "snow"), dg11.answers)
    }

    /** Diagnostika javoblari `checkAnswer` bilan tekshirib bo'ladi (barcha tur). */
    @Test
    fun diagnosticExercisesAreCheckable() {
        val a = DiagnosticLoader.load(FsAssetSource(assetsRoot())) ?: error("diagnostika yo'q")
        for (e in a.exercises) {
            val answer: Any? = when (e.kind) {
                Kinds.MULTIPLE_CHOICE -> e.answerIndex
                Kinds.TRUE_FALSE_NOTGIVEN -> e.answer
                Kinds.GAP_FILL -> e.answers
                Kinds.WORD_ORDER -> e.answers?.joinToString(" ")
                Kinds.TRANSLATION -> e.accepted?.firstOrNull()
                else -> null
            } ?: continue
            val out = com.dadaxon.aienglishacademy.domain.checkAnswer(e, answer)
            assertTrue("${e.id} (${e.kind}) — o'z javobi «noto‘g‘ri» deb chiqdi", out.correct)
        }
    }

    @Test
    fun a1BundleLoadsFromAssets() {
        val cr = ContentRepository()
        cr.init(FsAssetSource(assetsRoot()))
        assertTrue(cr.levels().contains("A1"))
        val b = cr.bundle("A1")
        assertEquals(7, b.days.size)
        assertTrue(b.vocab.isNotEmpty())
        // Kun sarlavhalari bo'sh emas — dashboard'da «Kun N — …» shundan olinadi.
        for (d in b.days) {
            assertTrue("kun ${d.id} sarlavhasi bo'sh", d.titleUz.isNotBlank())
            assertTrue("kun ${d.id} bo'limlari yo'q", d.sections.isNotEmpty())
        }
    }

    /** Buzuq element butun faylni yo'q qilmasin — `skipped` sanaladi. */
    @Test
    fun brokenExerciseIsSkippedNotFatal() {
        val json = """
            {"id":"x","titleUz":"t","descriptionUz":"d","passScore":50,
             "exercises":[
               {"id":"ok-1","kind":"multiple-choice","question":"q","options":["a","b"],"answerIndex":1},
               {"id":"bad-1","kind":"multiple-choice","options":{"no":"obyekt"}},
               {"id":"ok-2","kind":"translation","source":"salom","accepted":["hello"]}
             ]}
        """.trimIndent()
        val arr = JsonParser.parseString(json).asJsonObject.getAsJsonArray("exercises")
        val gson = Gson()
        val parsed = arr.map { DiagnosticLoader.parseExercise(gson, it) }
        assertNotNull(parsed[0])
        assertEquals(null, parsed[1])
        assertNotNull(parsed[2])
    }
}
