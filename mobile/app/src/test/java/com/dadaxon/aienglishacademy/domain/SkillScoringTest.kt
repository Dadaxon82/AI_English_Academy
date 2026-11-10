package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.Skills
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Daraja ko'tarish / baho testlari — veb `src/test/promotion.test.ts`
 * kutilganlari (`NOW = Date.UTC(2026,10,1)`).
 */
class SkillScoringTest {
    private val now: Long = Instant.parse("2026-11-01T00:00:00Z").toEpochMilli()
    private val day = 86_400_000L

    private fun ev(
        skill: String,
        score: Double,
        n: Int = MIN_EVIDENCE_PER_SKILL,
        conf: Double = 0.8,
    ): SkillEvidence = SkillEvidence(skill = skill, score = score, evidenceCount = n, confidence = conf, lastAt = now)

    private fun allFour(
        score: Double,
        n: Int = MIN_EVIDENCE_PER_SKILL,
    ): List<SkillEvidence> =
        listOf(
            ev(Skills.READING, score, n),
            ev(Skills.LISTENING, score, n),
            ev(Skills.WRITING, score, n),
            ev(Skills.SPEAKING, score, n),
        )

    @Test
    fun `4 ta asosiy ko'nikma yetarli bo'lsa keyingi daraja tavsiya qilinadi`() {
        val p = evaluateLevelPromotion("A1", allFour(PROMOTION_THRESHOLD.toDouble()))
        assertEquals("A2", p.recommendedLevel)
        assertEquals(SKILLS_REQUIRED_TO_PROMOTE, p.readySkills.size)
        assertTrue(p.reasonUz.contains("tavsiya"))
        assertTrue(p.weakSkills.isEmpty())
    }

    @Test
    fun `bitta ko'nikma zaif bo'lsa tavsiya YO'Q`() {
        val mixed = listOf(ev("reading", 90.0), ev("listening", 90.0), ev("writing", 90.0), ev("speaking", 30.0))
        val p = evaluateLevelPromotion("A1", mixed)
        assertNull(p.recommendedLevel)
        assertTrue(p.weakSkills.contains("speaking"))
        assertTrue(p.reasonUz.contains("XP va kunlar soni darajani özgartirmaydi."))
    }

    @Test
    fun `dalillar soni yetarli bo'lmasa tavsiya yo'q`() {
        val p = evaluateLevelPromotion("A1", allFour(95.0, MIN_EVIDENCE_PER_SKILL - 1))
        assertNull(p.recommendedLevel)
    }

    @Test
    fun `ball chegaradan 1 ga past bo'lmasa tavsiya yo'q`() {
        val p = evaluateLevelPromotion("A1", allFour((PROMOTION_THRESHOLD - 1).toDouble()))
        assertNull(p.recommendedLevel)
    }

    @Test
    fun `ishonch past bo'lsa confidence 0,6 dan kam tavsiya yo'q`() {
        val shaky = listOf(ev("reading", 90.0, conf = 0.5), ev("listening", 90.0), ev("writing", 90.0), ev("speaking", 90.0))
        val p = evaluateLevelPromotion("A1", shaky)
        assertNull(p.recommendedLevel)
        assertTrue(p.weakSkills.contains("reading"))
    }

    @Test
    fun `C1 da tavsiya yo'q (oxirgi daraja)`() {
        val p = evaluateLevelPromotion("C1", allFour(99.0))
        assertNull(p.recommendedLevel)
        assertEquals(SKILLS_REQUIRED_TO_PROMOTE, p.readySkills.size)
        assertEquals("Keyingi bosqiç hozirça oxirgi daraja.", p.reasonUz)
    }

    @Test
    fun `dalillar butunlay bo'lmasa tavsiya yo'q`() {
        val p = evaluateLevelPromotion("A1", allFour(99.0, 0))
        assertNull(p.recommendedLevel)
    }

    @Test
    fun `hech qanday ko'nikma bo'lmasa ham tavsiya yo'q, 4 tasi zaif`() {
        val p = evaluateLevelPromotion("A1", emptyList())
        assertNull(p.recommendedLevel)
        assertEquals(Skills.CORE.size, p.weakSkills.size)
    }

    @Test
    fun `A2 dan B1 ga o'tish`() {
        assertEquals("B1", evaluateLevelPromotion("A2", allFour(80.0)).recommendedLevel)
    }

    @Test
    fun `weightedScore - yaqindagi yuqori natija og'irlikliroq`() {
        val recentHigh =
            weightedScore(
                listOf(ScoreSample(100.0, now - day, "practice"), ScoreSample(0.0, now - 120 * day, "practice")),
                now,
            )
        val oldHigh =
            weightedScore(
                listOf(ScoreSample(0.0, now - day, "practice"), ScoreSample(100.0, now - 120 * day, "practice")),
                now,
            )
        assertTrue("recentHigh=$recentHigh", recentHigh > oldHigh)
        assertTrue("recentHigh=$recentHigh", recentHigh > 50)
        assertTrue("oldHigh=$oldHigh", oldHigh < 50)
    }

    @Test
    fun `weightedScore - mock imtihon kuchliroq ta'sir qiladi`() {
        val withPractice =
            weightedScore(listOf(ScoreSample(40.0, now - day, "practice"), ScoreSample(90.0, now - 2 * day, "practice")), now)
        val withMock = weightedScore(listOf(ScoreSample(40.0, now - day, "practice"), ScoreSample(90.0, now - 2 * day, "mock_exam")), now)
        assertTrue("withMock=$withMock withPractice=$withPractice", withMock > withPractice)
    }

    @Test
    fun `weightedScore - bo'sh ro'yxat nol va section_test og'irligi`() {
        assertEquals(0.0, weightedScore(emptyList(), now), 1e-9)
        val one = weightedScore(listOf(ScoreSample(80.0, now, "section_test")), now)
        assertEquals(80.0, one, 1e-9)
    }

    @Test
    fun `confidenceFor - dalil soni va xilma-xillik`() {
        assertEquals(0.0, confidenceFor(0, 0), 1e-9)
        assertEquals(1.0, confidenceFor(4, 3), 1e-9)
        assertTrue(confidenceFor(4, 1) < confidenceFor(4, 3))
        assertTrue(confidenceFor(1, 3) < confidenceFor(4, 3))
    }

    @Test
    fun `round2 - ikki xonali yaxlitlash`() {
        assertEquals(0.33, round2(0.3333), 1e-9)
        assertEquals(0.34, round2(0.335), 1e-9)
        assertEquals(2.0, round2(2.004), 1e-9)
    }

    @Test
    fun `to'g'ri javob xatodan ko'proq XP beradi`() {
        assertTrue(xpForAttempt(true, 3, true) > xpForAttempt(false, 3, true))
        assertEquals(12, xpForAttempt(true, 3, true)) // 6 + 3*2
        assertEquals(1, xpForAttempt(false, 3, true))
        // Takror (firstTry=false) — kamaytirilgan, lekin kamida 1
        assertEquals(5, xpForAttempt(true, 3, false)) // round(12*0.4)
        assertEquals(1, xpForAttempt(false, 1, false))
    }

    @Test
    fun `streak uzilgan kunlar bilan uzaladi`() {
        val today = "2026-11-04"
        assertEquals(3, streakFor(listOf("2026-11-04", "2026-11-03", "2026-11-02"), today))
        assertEquals(1, streakFor(listOf("2026-11-04", "2026-11-02"), today))
        assertEquals(0, streakFor(emptyList(), today))
        // Bugun yo'q bo'lsa — 0 (veb aynan bugundan boshlaydi)
        assertEquals(0, streakFor(listOf("2026-11-03", "2026-11-02"), today))
    }

    @Test
    fun `levelLabel o'zbekcha va inglizcha nom`() {
        assertEquals("Boşlanğiç", levelLabel("A1").titleUz)
        assertEquals("Beginner", levelLabel("A1").titleEn)
        assertEquals("Advanced", levelLabel("C1").titleEn)
        assertEquals("X9", levelLabel("X9").titleEn)
    }

    @Test
    fun `doimiylar loyiha talabiga mos`() {
        assertEquals(4, MIN_EVIDENCE_PER_SKILL)
        assertEquals(4, SKILLS_REQUIRED_TO_PROMOTE)
        assertEquals(72, PROMOTION_THRESHOLD)
        assertEquals(0.35, MOCK_EXAM_WEIGHT, 1e-9)
        assertFalse(Skills.CORE.contains(Skills.GRAMMAR))
    }
}
