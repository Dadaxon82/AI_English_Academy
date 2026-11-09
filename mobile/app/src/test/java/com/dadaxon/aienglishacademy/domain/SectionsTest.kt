package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.DailyPlanDay
import com.dadaxon.aienglishacademy.data.FsAssetSource
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Bo'limlar qatlami testlari — veb `src/test/sections.test.ts` ning
 * SO'ZMA-SO'Z moslamasi (bir xil da'volar, bir xil kontent: haqiqiy
 * `assets/content/a1.json`).
 *
 * Kontent `FsAssetSource` orqali o'qiladi — ya'ni test APK asset'laridagi
 * HAQIQIY kunlar ustida ishlaydi, ixtiro qilingan obyekt emas.
 */
class SectionsTest {

    /** Gradle unit test ishi papkasi moduldadir (`mobile/app`) — zaxira yo'llar ham sinab ko'riladi. */
    private fun assetsDir(): File {
        val candidates = listOf("src/main/assets", "app/src/main/assets", "mobile/app/src/main/assets")
        for (c in candidates) {
            val f = File(c)
            if (File(f, ContentRepository.MANIFEST_PATH).isFile) return f
        }
        throw IllegalStateException("content/manifest.json topilmadi: ${candidates.joinToString()} (pwd=${File(".").absolutePath})")
    }

    private val repo = ContentRepository(FsAssetSource(assetsDir()))

    private fun daysOf(level: String): List<DailyPlanDay> = repo.bundle(level).days

    private val a1Days get() = daysOf("A1")

    @Test
    fun testSectionOrderShart() {
        assertEquals(
            listOf("A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2", "B2.1", "B2.2", "C1.1", "C1.2"),
            SECTION_PLAN.map { sectionLabel(it.level, it.part) },
        )
    }

    @Test
    fun a1KunlariBolimlargaToliqVaTakrorsiz() {
        val nums = SECTION_PLAN.filter { it.level == "A1" }.flatMap { it.dayNumbers }
        assertEquals(a1Days.map { it.dayNumber }, nums.sorted())
    }

    @Test
    fun yangiFoydalanuvchiHolati() {
        val cards = buildSections(AppData().path, ::daysOf) { repo.bundle(it).vocab }
        assertEquals(
            listOf(
                // A2 kontenti bor — A2.1/A2.2 qulflangan; B1+ bo'sh (veb bilan bir xil)
                SectionStatus.CURRENT, SectionStatus.LOCKED, SectionStatus.LOCKED, SectionStatus.LOCKED, SectionStatus.EMPTY,
                SectionStatus.EMPTY, SectionStatus.EMPTY, SectionStatus.EMPTY, SectionStatus.EMPTY, SectionStatus.EMPTY,
            ),
            cards.map { it.status },
        )
        assertEquals(0, cards[0].daysDone.toLong())
        assertTrue(cards[1].canJump)
        assertTrue(cards[2].canJump)
        // Kontenti yo'q bo'limga sakrash tugmasi chiqmaydi
        assertTrue(!cards[4].canJump)
    }

    @Test
    fun namunaIboraKontentdanOlinadi() {
        val card = buildSections(AppData().path, ::daysOf) { repo.bundle(it).vocab }[0]
        val vocab = repo.bundle("A1").vocab
        assertNotNull(card.sampleEn)
        assertTrue(
            "namuna ibora kontentda BO'LISHI kerak (ixtiro emas)",
            vocab.any { it.exampleEn == card.sampleEn },
        )
        assertTrue(vocab.any { it.exampleUz == card.sampleUz })
    }

    @Test
    fun a11KunlariTugasaKeyingiBolimJoriy() {
        val d = AppData().copy(
            path = AppData().path.copy(completedDays = a1Days.filter { it.dayNumber <= 4 }.map { it.id }),
        )
        val cards = buildSections(d.path, ::daysOf)
        assertEquals(SectionStatus.DONE, cards[0].status)
        assertEquals(SectionStatus.CURRENT, cards[1].status)
    }

    @Test
    fun savollarHarKundanJumpItemsPerDayTadan() {
        val path = AppData().path
        val skipped = skippedDaysFor("a1-2", path, ::daysOf)
        assertEquals(listOf(1, 2, 3, 4), skipped.map { it.dayNumber })
        val ex = jumpTestExercises("a1-2", path, ::daysOf)
        val expected = skipped.sumOf { (it.sectionTest?.exercises ?: emptyList()).size.coerceAtMost(JUMP_ITEMS_PER_DAY) }
        assertEquals(expected.toLong(), ex.size.toLong())
        assertTrue(ex.isNotEmpty())
    }

    @Test
    fun otilsaOldingiKunlarOchiladiJoriyKunYangiBolimBoshigaOtadi() {
        val before = AppData()
        val after = applySectionJump(before, "a1-2", JUMP_PASS_SCORE, ::daysOf)
        assertEquals(a1Days.filter { it.dayNumber <= 4 }.map { it.id }, after.path.completedDays)
        assertEquals(a1Days.first { it.dayNumber == 5 }.id, after.path.currentDayId)
        assertEquals(JUMP_PASS_SCORE, after.path.passedTests[jumpKey("a1-2")])
        assertEquals(before.settings.currentLevel, after.settings.currentLevel)
        assertEquals(SectionStatus.CURRENT, buildSections(after.path, ::daysOf)[1].status)
    }

    @Test
    fun otilmasaKunlarOzgarmaydiFaqatEngYaxshiNatijaYoziladi() {
        var s = AppData()
        s = applySectionJump(s, "a1-2", 60, ::daysOf)
        s = applySectionJump(s, "a1-2", 40, ::daysOf)
        assertTrue(s.path.completedDays.isEmpty())
        assertEquals("a1-day-01", s.path.currentDayId)
        assertEquals(60, s.path.passedTests[jumpKey("a1-2")])
    }

    @Test
    fun nomalumBolimEtiborsizQoldiriladi() {
        val s = AppData()
        assertSame(s, applySectionJump(s, "zz-9", 100, ::daysOf))
    }

    @Test
    fun bannerYangiFoydalanuvchiA11BirinchiKun() {
        val info = currentSectionInfo(AppData().path, ::daysOf)!!
        assertEquals("A1.1", info.section.label)
        assertEquals(1, info.unitNumber.toLong())
        assertEquals(1, info.day.dayNumber.toLong())
    }

    @Test
    fun bannerSakrashdanKeyinA12BirinchiKun() {
        val s = applySectionJump(AppData(), "a1-2", 100, ::daysOf)
        val info = currentSectionInfo(s.path, ::daysOf)!!
        assertEquals("A1.2", info.section.label)
        assertEquals(1, info.unitNumber.toLong())
        assertEquals(5, info.day.dayNumber.toLong())
    }

    @Test
    fun a1TugasaA21BirinchiKun() {
        val d = AppData().copy(path = AppData().path.copy(completedDays = a1Days.map { it.id }))
        val info = currentSectionInfo(d.path, ::daysOf)!!
        assertEquals("A2.1", info.section.label)
        assertEquals(1, info.day.dayNumber.toLong())
        // O'quv yo'li A2 ga o'tadi, baholangan daraja o'zgarmaydi
        assertEquals("A2", pathLevel(d.path, d.settings.currentLevel, ::daysOf))
        assertEquals("A1", d.settings.currentLevel)
    }

    @Test
    fun hammaKunTugasaOxirgiBolimOxirgiKuni() {
        val d = AppData().copy(path = AppData().path.copy(completedDays = (a1Days + daysOf("A2")).map { it.id }))
        val info = currentSectionInfo(d.path, ::daysOf)!!
        assertEquals("A2.2", info.section.label)
        assertEquals(7, info.day.dayNumber.toLong())
    }

    @Test
    fun a2danBoshlaganOquvchigaA11Korsatilmaydi() {
        val d = AppData()
        assertEquals("A2.1", currentSectionInfo(d.path, ::daysOf, fromLevel = "A2")!!.section.label)
        assertEquals("A2", pathLevel(d.path, "A2", ::daysOf))
        assertEquals("A1", pathLevel(d.path, "A1", ::daysOf))
    }
}
