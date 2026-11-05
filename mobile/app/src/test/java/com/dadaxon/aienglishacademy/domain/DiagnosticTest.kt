package com.dadaxon.aienglishacademy.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Diagnostika testlari — veb `src/content/diagnostic.ts` qoidalari
 * (2/3 chegarasi, confidence yaxlitlashi, aniq bo'lmagan natijada
 * `level: null`) va mobil `Diagnostic.kt` yordamchilari.
 */
class DiagnosticTest {
    private fun results(vararg correct: String): Map<String, Boolean> {
        val all = DIAGNOSTIC_BAND_IDS.values.flatten()
        return all.associateWith { correct.contains(it) }
    }

    @Test
    fun `banda id'lari veb bilan bir xil`() {
        assertEquals(
            mapOf(
                "A1" to listOf("dg-01", "dg-02", "dg-03"),
                "A2" to listOf("dg-04", "dg-05", "dg-06"),
                "B1" to listOf("dg-07"),
                "B2" to listOf("dg-08", "dg-09", "dg-12"),
                "C1" to listOf("dg-10", "dg-11"),
            ),
            DIAGNOSTIC_BAND_IDS,
        )
        assertEquals(listOf("A1", "A2", "B1", "B2", "C1"), DIAGNOSTIC_ORDER)
        assertEquals(12, DIAGNOSTIC_BAND_IDS.values.sumOf { it.size })
        assertEquals("diagnostic-01", DIAGNOSTIC_TEST_ID)
        assertEquals(50, DIAGNOSTIC_PASS_SCORE)
    }

    @Test
    fun `hammasi to'g'ri bo'lsa C1 va ishonch aniq 1`() {
        val o =
            diagnose(
                results(
                    "dg-01", "dg-02", "dg-03", "dg-04", "dg-05", "dg-06",
                    "dg-07", "dg-08", "dg-09", "dg-12", "dg-10", "dg-11",
                ),
            )
        assertEquals("C1", o.level)
        assertEquals(1.0, o.confidence, 1e-9)
        assertEquals("Diagnostika natijasi: C1. Bu taxminiy baho — darslar davomida aniqlashtiriladi.", o.labelUz)
    }

    @Test
    fun `hech narsa to'g'ri bo'lmasa daraja yo'q va ishonch 0`() {
        val o = diagnose(results())
        assertNull(o.level)
        assertEquals(0.0, o.confidence, 1e-9)
        assertEquals("Natija noaniq — A1 dan boshlaymiz va diagnostikani keyin takrorlaymiz.", o.labelUz)
    }

    @Test
    fun `faqat A1 to'liq bo'lsa ishonch 0,2 ya'ni 0,5 dan past — daraja null`() {
        val o = diagnose(results("dg-01", "dg-02", "dg-03"))
        assertEquals(0.2, o.confidence, 1e-9)
        assertNull("confidence < 0.5 bo'lsa daraja aniq deb ko'rsatilmaydi", o.level)
        assertTrue(o.labelUz.startsWith("Taxminiy darajangiz A1, ammo dalil yetarli emas."))
        assertTrue(o.labelUz.contains("birinchi bo‘lim testidan so‘ng qayta baholanadi."))
    }

    @Test
    fun `A1 A2 B1 to'liq va B2 dan uchdan ikkisi bo'lsa B1 tasdiqlanadi`() {
        val o =
            diagnose(
                results(
                    "dg-01", "dg-02", "dg-03", "dg-04", "dg-05", "dg-06",
                    "dg-07", "dg-08", "dg-09",
                ),
            )
        // 4 ta banda 2/3+ → confidence 0.8
        assertEquals(0.8, o.confidence, 1e-9)
        assertEquals("B1", o.level)
        assertEquals("Diagnostika natijasi: B1. Bu taxminiy baho — darslar davomida aniqlashtiriladi.", o.labelUz)
    }

    @Test
    fun `banda to'liq bo'lmasa o'sha darajaga o'tilmaydi`() {
        // B1 bandasi (1 savol) noto'g'ri — reached A2, ishonch: A1, A2 ✓ → 0.4 < 0.5
        val o = diagnose(results("dg-01", "dg-02", "dg-03", "dg-04", "dg-05", "dg-06"))
        assertEquals(0.4, o.confidence, 1e-9)
        assertNull(o.level)
        assertTrue(o.labelUz.contains("A2"))
    }

    @Test
    fun `yarim to'g'ri banda uchdan ikkisi chegarasidan o'tmaydi`() {
        val o = diagnose(results("dg-01", "dg-02"))
        assertEquals(0.2, o.confidence, 1e-9)
        assertNull(o.level)
        assertEquals("Natija noaniq — A1 dan boshlaymiz va diagnostikani keyin takrorlaymiz.", o.labelUz)
    }

    @Test
    fun `noto'g'ri deb belgilanganlar hisobga olinadi (false)`() {
        val o = diagnose(mapOf("dg-01" to false, "dg-02" to false, "dg-03" to false))
        assertEquals(0.0, o.confidence, 1e-9)
        assertNull(o.level)
    }

    @Test
    fun `scoreDiagnosticLevel va diagnosticQuestionLevel`() {
        // Veb `diagnostic.ts::diagnose`: dg-01..dg-07 A1+A2+B1 bolaklarini to'liq
        // qoplaydi → reached "B1", ishonch 3/5 = 0.6 >= 0.5 → daraja "B1".
        assertEquals("B1", scoreDiagnosticLevel(results("dg-01", "dg-02", "dg-03", "dg-04", "dg-05", "dg-06", "dg-07")))
        assertEquals("B1", diagnosticQuestionLevel("dg-07"))
        assertEquals("B2", diagnosticQuestionLevel("dg-12"))
        assertEquals("C1", diagnosticQuestionLevel("dg-10"))
        assertNull(diagnosticQuestionLevel("dg-99"))
    }

    @Test
    fun `normalizeLevel registrga bog'liq emas`() {
        assertEquals("A1", normalizeLevel("a1"))
        assertEquals("B2", normalizeLevel("B2"))
    }

    @Test
    fun `confidence ikki xonagacha yaxlitlanadi`() {
        // 5 bandada 2 tasi confident → 0.4
        val o = diagnose(results("dg-01", "dg-02", "dg-03", "dg-04", "dg-05", "dg-06"))
        assertEquals(round2(2.0 / 5.0), o.confidence, 1e-9)
    }
}
