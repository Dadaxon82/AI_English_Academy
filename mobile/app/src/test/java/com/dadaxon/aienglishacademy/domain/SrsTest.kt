package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.MIN_EASE
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.START_EASE
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * SRS testlari — veb `src/test/srs.test.ts` kutilganlari asosida
 * (veb `Date.UTC(2026,0,1,12,0,0)` = T0, DAY = 86_400_000).
 */
class SrsTest {
    private val t0: Long = java.time.Instant.parse("2026-01-01T12:00:00Z").toEpochMilli()
    private val day = 86_400_000L

    @Test
    fun `initialSrsState - dueAt hozir, learnedAt yoq`() {
        val s = initialSrsState(t0)
        assertNull(s.learnedAt)
        assertEquals(t0, s.dueAt)
        assertEquals(0, s.intervalDays)
        assertEquals(START_EASE, s.ease, 1e-9)
        assertEquals(0, s.reps)
        assertEquals(0, s.lapses)
        assertTrue(isDue(s, t0))
    }

    @Test
    fun `toQuality - vebdagi 1-3-4-5`() {
        assertEquals(1, toQuality(SrsGrade.AGAIN))
        assertEquals(3, toQuality(SrsGrade.HARD))
        assertEquals(4, toQuality(SrsGrade.GOOD))
        assertEquals(5, toQuality(SrsGrade.EASY))
    }

    @Test
    fun `learnedAt birinchi muvaffaqiyatli bahoda ORNATILADI va keyin ozgarmaydi`() {
        var s = review(initialSrsState(t0), SrsGrade.GOOD, t0)
        val first = s.learnedAt
        assertEquals(t0, first)
        s = review(s, SrsGrade.GOOD, t0 + day)
        s = review(s, SrsGrade.AGAIN, t0 + 2 * day)
        s = review(s, SrsGrade.EASY, t0 + 3 * day)
        assertEquals(first, s.learnedAt)
    }

    @Test
    fun `xato learnedAt ni ochirmaydi, lekin intervalni qaytaradi (10 daqiqa)`() {
        val a = review(initialSrsState(t0), SrsGrade.GOOD, t0)
        val s = review(a, SrsGrade.AGAIN, t0 + day)
        assertEquals(t0, s.learnedAt)
        assertEquals(0, s.intervalDays)
        assertEquals(t0 + day + 10 * 60 * 1000L, s.dueAt)
        assertTrue(isDue(s, t0 + day + 11 * 60 * 1000L))
        assertFalse(isDue(s, t0 + day + 9 * 60 * 1000L))
        assertEquals(0, a.lapses)
        assertEquals(1, s.lapses)
        assertEquals(2, s.reps)
    }

    @Test
    fun `interval ease bilan osadi`() {
        val s1 = review(initialSrsState(t0), SrsGrade.GOOD, t0)
        assertEquals(1, s1.intervalDays)
        val s2 = review(s1, SrsGrade.GOOD, t0 + day)
        assertTrue("interval oşişi kerak edi: ${s2.intervalDays}", s2.intervalDays > s1.intervalDays)
        // ease 2.5 → 2.6: round(1 * 2.6) = 3
        assertEquals(3, s2.intervalDays)
    }

    @Test
    fun `EASY birinchi bahoda 3 kunlik interval beradi`() {
        val s = review(initialSrsState(t0), SrsGrade.EASY, t0)
        assertEquals(3, s.intervalDays)
        // HARD birinchi bahoda oddiy kabi 1 kun
        assertEquals(1, review(initialSrsState(t0), SrsGrade.HARD, t0).intervalDays)
    }

    @Test
    fun `bir necha marta takrorlangan soz ham BIR dona hisoblanadi`() {
        var a = review(initialSrsState(t0), SrsGrade.GOOD, t0)
        a = review(a, SrsGrade.GOOD, t0 + day)
        a = review(a, SrsGrade.AGAIN, t0 + 2 * day)
        a = review(a, SrsGrade.EASY, t0 + 3 * day)
        assertEquals(4, a.reps)
        assertEquals(1, countLearned(listOf(a)))
    }

    @Test
    fun `again - ease pasadi, lekin minimal chegaradan tushmaydi`() {
        var s = initialSrsState(t0)
        for (i in 0 until 10) s = review(s, SrsGrade.AGAIN, t0 + i * day)
        assertTrue("ease >= 1.3 bölişi kerak: ${s.ease}", s.ease >= MIN_EASE)
        assertEquals(10, s.lapses)
    }

    @Test
    fun `countLearned - learnedAt null bo'lganlar sanalmaydi`() {
        val learned = review(initialSrsState(t0), SrsGrade.GOOD, t0)
        val notYet = initialSrsState(t0)
        // Veb: `states.filter((s) => s.learnedAt != null).length` — RUYXAT elementlari
        // sanaladi; bir xil holat ikki marta berilsa IKKI marta hisoblanadi.
        assertEquals(2, countLearned(listOf(learned, notYet, learned)))
    }

    @Test
    fun `countDue - muddati kelganlar soni`() {
        val dueNow = initialSrsState(t0)
        val later = review(dueNow, SrsGrade.GOOD, t0)
        assertEquals(1, countDue(listOf(dueNow, later), t0))
        assertEquals(2, countDue(listOf(dueNow, later), t0 + 2 * day))
    }

    @Test
    fun `sortForReview - xato qilinganlar ustuvor, keyin muddat bo'yicha`() {
        val fresh = initialSrsState(t0)
        val lapsed = review(fresh, SrsGrade.AGAIN, t0)
        val ordered =
            sortForReview(
                listOf(
                    ReviewEntry(fresh.copy(dueAt = t0 + 10 * day), "kelin"),
                    ReviewEntry(lapsed, "xato"),
                    ReviewEntry(fresh.copy(dueAt = t0), "muddati"),
                ),
            )
        assertEquals(listOf("xato", "muddati", "kelin"), ordered)
    }

    @Test
    fun `wire qiymatlari server bilan bir xil`() {
        assertEquals("again", SrsGrade.AGAIN.wire())
        assertEquals("easy", SrsGrade.EASY.wire())
        assertEquals(SrsGrade.HARD, SrsGrade.fromWire("Hard"))
        assertEquals(null, SrsGrade.fromWire("mukammal"))
        assertEquals(null, SrsGrade.fromWire(null))
    }

    @Test
    fun `review - non-mutatsion (asl holat o'zgarmaydi)`() {
        val original = SrsState(learnedAt = null, dueAt = t0, intervalDays = 0, ease = START_EASE, reps = 0, lapses = 0, lastReviewedAt = null)
        val next = review(original, SrsGrade.GOOD, t0)
        assertNotEquals(original, next)
        assertEquals(0, original.reps)
        assertEquals(null, original.learnedAt)
    }
}
