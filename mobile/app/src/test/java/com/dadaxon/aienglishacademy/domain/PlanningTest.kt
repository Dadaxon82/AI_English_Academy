package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.DEFAULT_ALLOCATION
import com.dadaxon.aienglishacademy.data.DaySection
import com.dadaxon.aienglishacademy.data.DailyPlanDay
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.UserSettings
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Kundalik reja testlari — veb `src/test/planning.test.ts` kutilganlari.
 *
 * Vebda `WED = new Date(2026, 10, 4)` — 2026-11-04, chorshanba: oyning kuniga
 * bog'liq siljish (yakshanba) ta'sir qilmasligi uchun tanlangan.
 */
class PlanningTest {
    private val wed: LocalDate = LocalDate.parse("2026-11-04") // chorshanba

    private fun settings(
        dailyMinutes: Int = 90,
        examDate: String? = null,
    ): UserSettings = UserSettings(dailyMinutes = dailyMinutes, examDate = examDate)

    private fun ev(
        skill: String,
        score: Double,
        n: Int = 6,
        confidence: Double = 0.8,
    ): SkillEvidence = SkillEvidence(skill = skill, score = score, evidenceCount = n, confidence = confidence, lastAt = System.currentTimeMillis())

    @Test
    fun `boshlang'ich taqsimot 10-15-15-15-20-15`() {
        val a = computeAllocation(settings(), emptyList(), wed)
        assertEquals(
            mapOf(
                Skills.VOCABULARY to 10,
                Skills.GRAMMAR to 15,
                Skills.READING to 15,
                Skills.LISTENING to 15,
                Skills.WRITING to 20,
                Skills.SPEAKING to 15,
            ),
            a.minutes,
        )
        assertEquals(90, a.total)
    }

    @Test
    fun `yig'indi har doim dailyMinutes ga teng (30-47-90-120-180)`() {
        for (m in listOf(30, 47, 90, 120, 180)) {
            val a = computeAllocation(settings(dailyMinutes = m), emptyList(), wed)
            assertEquals(m, a.total)
            assertEquals("$m daqiqa", m, a.minutes.values.sum())
        }
    }

    @Test
    fun `zaif ko'nikma ko'proq vaqt oladi`() {
        val before = computeAllocation(settings(), emptyList(), wed)
        val after = computeAllocation(settings(), listOf(ev("listening", 40.0), ev("speaking", 45.0)), wed)
        assertTrue(after.minutes.getValue("listening") > before.minutes.getValue("listening"))
        assertTrue(after.minutes.getValue("speaking") > before.minutes.getValue("speaking"))
        assertEquals(90, after.total)
        assertTrue(after.reasonUz.any { it.contains("Zaif") })
    }

    @Test
    fun `zaif ko'nikma ishonchsiz bo'lsa (confidence past) reja o'zgarmaydi`() {
        val base = computeAllocation(settings(), emptyList(), wed)
        val shaky =
            computeAllocation(
                settings(),
                listOf(SkillEvidence("listening", 20.0, 1, 0.2, System.currentTimeMillis())),
                wed,
            )
        assertEquals(base.minutes, shaky.minutes)
    }

    @Test
    fun `imtihon yaqin bo'lsa Writing 25 Reading 20`() {
        val exam = wed.plusDays(10).toString()
        val a = computeAllocation(settings(examDate = exam), emptyList(), wed)
        assertEquals(25, a.minutes.getValue(Skills.WRITING))
        assertEquals(20, a.minutes.getValue(Skills.READING))
        assertEquals(90, a.total)
        assertTrue(a.reasonUz.any { it.contains("Imtihonga") })
    }

    @Test
    fun `imtihon sanasi 30 kunlik oyna chegarasi aniq`() {
        val late = LocalDate.parse("2026-11-04") // vebda 23:30 — kun hisobi yarim tun oralig'i
        val exam = "2026-12-05" // 31 kun — oyna chegarasi tashqarida
        assertEquals(31, daysUntil(exam, late))
        val a = computeAllocation(settings(examDate = exam), emptyList(), late)
        assertFalse(a.reasonUz.any { it.contains("Imtihonga") })

        val near = "2026-12-04"
        assertEquals(30, daysUntil(near, late))
        val b = computeAllocation(settings(examDate = near), emptyList(), late)
        assertTrue(b.reasonUz.any { it.contains("Imtihonga") })
    }

    @Test
    fun `kunlik minutlar manfiy yoki juda katta bo'lsa chegaralanadi`() {
        assertEquals(30, computeAllocation(settings(dailyMinutes = -10), emptyList(), wed).total)
        assertEquals(240, computeAllocation(settings(dailyMinutes = 1000), emptyList(), wed).total)
    }

    @Test
    fun `yakshanba — o'qishga ko'proq vaqt, yengil kun`() {
        val sunday = LocalDate.parse("2026-11-01") // 2026-11-01 — yakshanba
        val a = computeAllocation(settings(), emptyList(), sunday)
        assertTrue(a.reasonUz.any { it.contains("Yakshanba") })
        val base = computeAllocation(settings(), emptyList(), wed)
        assertTrue(a.minutes.getValue(Skills.READING) > base.minutes.getValue(Skills.READING))
        assertEquals(90, a.total)
    }

    @Test
    fun `donor yetarli bo'lmasa kuchaytirildi xabari chiqmaydi`() {
        // Minimal 30 daq → har ko'nikma 5 daqiqa, donor 5→0 ga tusholmaydi.
        val a = computeAllocation(settings(dailyMinutes = 30), listOf(ev("listening", 40.0), ev("speaking", 40.0)), wed)
        val changed = a.minutes.entries.any { (s, m) -> m > (DEFAULT_ALLOCATION[s] ?: 0) }
        val claims = a.reasonUz.any { it.contains("kuchaytirildi") }
        assertEquals(changed, claims)
    }

    @Test
    fun `90 daqiqalik rejada zaif ko'nikma haqiqatan oshadi va xabar chiqadi`() {
        val a = computeAllocation(settings(dailyMinutes = 90), listOf(ev("listening", 40.0)), wed)
        assertTrue(a.minutes.getValue("listening") > 15)
        assertTrue(a.reasonUz.any { it.contains("listening") })
    }

    /* ---------------- kun vazifalari va o'quv yo'li ---------------- */

    private val day =
        DailyPlanDay(
            id = "a1-day-1",
            sections =
                listOf(
                    DaySection(skill = Skills.VOCABULARY, minutes = 15, itemIds = listOf("a1-v1-1"), titleUz = "Yangi so‘zlar"),
                    DaySection(skill = Skills.GRAMMAR, minutes = 25, itemIds = listOf("a1-ex-g1-01"), titleUz = "to be"),
                ),
        )

    @Test
    fun `buildDayTasks 6 ko'nikma qaytaradi va bajarilganini belgilaydi`() {
        val alloc = computeAllocation(settings(), emptyList(), wed)
        val tasks = buildDayTasks(day, alloc, mapOf(Skills.GRAMMAR to "a1-day-1"))
        assertEquals(6, tasks.size)
        assertEquals(
            listOf(
                Skills.VOCABULARY,
                Skills.GRAMMAR,
                Skills.READING,
                Skills.LISTENING,
                Skills.WRITING,
                Skills.SPEAKING,
            ),
            tasks.map { it.skill },
        )
        assertTrue(tasks.first { it.skill == Skills.GRAMMAR }.done)
        assertFalse(tasks.first { it.skill == Skills.READING }.done)
        assertEquals(alloc.minutes.getValue(Skills.READING), tasks.first { it.skill == Skills.READING }.minutes)
        assertEquals("to be", tasks.first { it.skill == Skills.GRAMMAR }.titleUz)
        // Bo'lim bo'lmasa — o'zbekcha nomdan foydalaniladi
        assertEquals("O‘qish", tasks.first { it.skill == Skills.READING }.titleUz)
        assertEquals("a1-day-1:vocabulary", tasks.first { it.skill == Skills.VOCABULARY }.sectionId)
        assertEquals("a1-v1-1", tasks.first { it.skill == Skills.VOCABULARY }.contentId)
        assertNull(tasks.first { it.skill == Skills.READING }.contentId)
    }

    @Test
    fun `nextDayId tugamagan kunni topadi`() {
        val days = listOf("d1", "d2", "d3")
        assertEquals("d1", nextDayId("A1", days, emptyList()))
        assertEquals("d3", nextDayId("A1", days, listOf("d1", "d2")))
        assertEquals("d3", nextDayId("A1", days, listOf("d1", "d2", "d3")))
        assertEquals("a1-day-1", nextDayId("A1", emptyList(), emptyList()))
    }

    @Test
    fun `daysUntil null va noto'g'ri sana`() {
        assertNull(daysUntil(null, wed))
        assertNull(daysUntil("", wed))
        assertNull(daysUntil("05.12.2026", wed))
        val soon = wed.plusDays(5)
        val left = daysUntil(soon.toString(), wed)
        assertTrue(left != null && left >= 4 && left <= 6)
    }

    @Test
    fun `skillLabelUz o'zbekcha nom beradi`() {
        assertEquals("Lug‘at", skillLabelUz("vocabulary"))
        assertEquals("Gapirish", skillLabelUz("speaking"))
        assertEquals("Grammatika", skillLabelUz("grammar"))
        assertEquals("O‘qish", skillLabelUz("reading"))
        assertEquals("Tinglash", skillLabelUz("listening"))
        assertEquals("Yozish", skillLabelUz("writing"))
        assertEquals("noma'lum", skillLabelUz("noma'lum"))
    }
}
