package com.dadaxon.aienglishacademy

import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.domain.checkAnswer
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mashq javoblari — interfeys ↔ domen ulanishi.
 *
 * SABAB (real xato, 2026-11-06): `ExerciseFragment.buildTfng` ichida
 * `setOnCheckedChangeListener` shunday yozilgan edi:
 *
 *     val v = (0 until group.childCount).firstOrNull { … }   // v — Int!
 *     tfAnswer = (v as? RadioButton)?.tag as? String          // doim null
 *
 * Kotlin kompilyatori buni ogohlantirish bilan belladi («This cast can never
 * succeed»), lekin kod YUGURILGANDA jim `null` qaytargani uchun true/false/
 * notgiven mashqlarida javob hamisha «javob berilmagan» deb qolardi — o'quvchi
 * tugmani bosadi, natija baribir hisoblanmaydi. Emulatorda tasdiqlandi
 * (2026-11-06): tuzatilgach «False» javobi qabul qilindi («2/2 to'g'ri · 100%»).
 *
 * Shu test xatoning qaytmasini ushlaydi: (1) interfeysdagi kalit so'zlar
 * ro'yxati indeks bo'yicha o'qiladi (View'ga kaste qilinmaydi), (2) kalitlar
 * domen qabul qiladigan kalitlar bilan TENG, (3) har bir kalit o'z mashqida
 * «to'g'ri» deb hisoblanadi (round-trip).
 */
class ExerciseAnswerKeyWiringTest {

    private fun appDir(): File {
        val candidates = listOf(File("."), File("app"), File(".."))
        return candidates.firstOrNull { File(it, "src/main/java").isDirectory } ?: File(".")
    }

    private fun source(): File {
        val f = File(appDir(), "src/main/java/com/dadaxon/aienglishacademy/ui/runner/ExerciseFragment.kt")
        assertTrue("ExerciseFragment.kt topilmadi: ${f.absolutePath}", f.isFile)
        return f
    }

    /** `buildTfng`dagi `keys = listOf(...)` satrlari: "kalit" to R.string.res. */
    private fun tfngKeys(): List<Pair<String, String>> {
        val src = source().readText()
        val block = src.substringAfter("private fun buildTfng(").substringBefore("private fun buildMatching(")
        val re = Regex(""""([^"]+)"\s+to\s+(R\.string\.\w+)""")
        return re.findAll(block).map { it.groupValues[1] to it.groupValues[2] }.toList()
    }

    @Test
    fun `tfng kalitlari uchta va domen kalitlari bilan teng`() {
        val keys = tfngKeys()
        assertEquals("uch javob bo'lishi kerak: $keys", 3, keys.size)
        assertEquals(
            "interfeys kalitlari domen bilan bir xil bo'lishi shart",
            listOf("true", "false", "notgiven"),
            keys.map { it.first },
        )
        // Har bir kalit o'z string resursiga bog'langan (nomlar mos).
        for ((k, res) in keys) {
            assertEquals("kalit '$k' o'z resursiga bog'lansin", "R.string.ex_tf_$k", res)
        }
    }

    @Test
    fun `handler indeksni kalit royxatidan oladi, View ga kaste qilmaydi`() {
        // Izohlar olinadi — izohda eski xato yozuvi tilga olinadi, kodda esa
        // u bo'lmasligi kerak.
        val block = source().readText().lines()
            .filterNot { it.trimStart().startsWith("//") }
            .joinToString("\n")
            .substringAfter("private fun buildTfng(")
            .substringBefore("private fun buildMatching(")
        // Eski xato shakli: sonni View'ga `as?` bilan kaste qilish.
        assertFalse(
            "indeks View emas — `as? RadioButton` abadiy null qaytaradi",
            Regex("""as\?\s*RadioButton""").containsMatchIn(block),
        )
        // Kalit ro'yxat INDEKS bo'yicha o'qiladi.
        assertTrue(
            "`keys[it]` ko'rinishi kutiladi: $block",
            Regex("""keys\[\s*(it|index|i)\s*\]""").containsMatchIn(block),
        )
    }

    @Test
    fun `har bir tfng kaliti domen tomonidan tog'ri deb qabul qilinadi`() {
        for (k in tfngKeys().map { it.first }) {
            val e = Exercise(
                id = "wire-$k",
                kind = Kinds.TRUE_FALSE_NOTGIVEN,
                instructionUz = "True / False / Not Given.",
                level = Levels.A1,
                skill = Skills.READING,
                statement = "Sinov fikri.",
                answer = k,
            )
            val ok = checkAnswer(e, k)
            assertTrue("$k qabul qilinishi kerak", ok.correct)
            // `expected` — o'quvchiga ko'rsatiladigan nom (veb `check.ts` bilan bir xil).
            val label = mapOf("true" to "True", "false" to "False", "notgiven" to "Not Given").getValue(k)
            assertEquals("$k — kutilgan javob nomi", label, ok.expected)
            assertEquals("$k — berilgan javob nomi ham yozilsin", label, ok.given)
            // Boshqa kalit bilan — noto'g'ri (soxta "to'g'ri" bo'lmasin).
            for (other in tfngKeys().map { it.first } - k) {
                assertFalse("$other ≠ $k", checkAnswer(e, other).correct)
            }
        }
    }
}
