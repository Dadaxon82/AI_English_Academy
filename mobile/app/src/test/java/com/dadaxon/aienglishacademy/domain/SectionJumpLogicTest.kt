package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.FsAssetSource
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Sakrash testi mantig'i testlari — veb `src/pages/Sections.tsx::JumpTest`
 * da yozilgan sonlarning mobildagi moslamasi (`domain/SectionJumpLogic.kt`).
 *
 * Kontent HAQIQIY (`assets/content/a1.json`) — `SectionsTest.kt` bilan bir
 * xil manba; ixtiro obyekt ishlatilmaydi.
 */
class SectionJumpLogicTest {

    private fun assetsDir(): File {
        val candidates = listOf("src/main/assets", "app/src/main/assets", "mobile/app/src/main/assets")
        for (c in candidates) {
            val f = File(c)
            if (File(f, ContentRepository.MANIFEST_PATH).isFile) return f
        }
        throw IllegalStateException("content/manifest.json topilmadi (pwd=${File(".").absolutePath})")
    }

    private val repo = ContentRepository(FsAssetSource(assetsDir()))

    private fun daysOf(level: String) = repo.bundle(level).days

    private fun out(correct: Boolean, partial: Double = 0.0) =
        CheckOutcome(correct = correct, given = "", expected = "", whyUz = "", partial = partial)

    @Test
    fun testToPlamiOchilishPaytidaHisoblanadiVaTartibiOzgarmaydi() {
        val path = AppData().path
        val plan = jumpPlan("a1-2", path, ::daysOf)
        assertEquals(listOf(1, 2, 3, 4), skippedDaysFor("a1-2", path, ::daysOf).map { it.dayNumber })
        assertEquals(plan.skippedDays, 4)
        assertEquals(plan.exercises.size, jumpTestExercises("a1-2", path, ::daysOf).size)
        // Tartib QAYTA TARTIBLANMAYDI (baholash testi): id'lar shu ketma-ketlikda.
        assertEquals(plan.exercises.map { it.id }, jumpExerciseIds(plan.exercises))
        // Natija yozilgach (kunlar ochilgach) qayta hisob bo'sh bo'ladi —
        // shuning uchun yuqoridagi qotirish MUHIM (veb izohi).
        val after = applySectionJump(AppData(), "a1-2", 100, ::daysOf)
        assertEquals(0, jumpPlan("a1-2", after.path, ::daysOf).exercises.size)
    }

    @Test
    fun ballToqriJavoblarBoyichaFoizBoLadi() {
        val ex = jumpTestExercises("a1-2", AppData().path, ::daysOf)
        val ids = ex.map { it.id }
        val all = ids.associateWith { out(true) }
        assertEquals("hammasi töğri — 100", 100, jumpScore(ex, all))
        val none = ids.associateWith { out(false) }
        assertEquals("heç biri töğri emas — 0", 0, jumpScore(ex, none))
        // Yarmi: `partial` hissa hisobga olinadi (veb `r.correct ? 1 : r.partial`).
        val half = ids.mapIndexed { i, id -> id to out(i % 2 == 0) }.toMap()
        val expected = Math.round(ids.size / 2.0 / ids.size * 100.0).toInt()
        assertEquals(expected, jumpScore(ex, half))
    }

    @Test
    fun xatosizVaChegaraHisoblashi() {
        // Aniq yaxlitlash: 2 ta savol — 1 to'g'ri = 50%; 3 ta savol — 1 to'g'ri = 33%.
        val two = jumpTestExercises("a1-2", AppData().path, ::daysOf).take(2)
        assertEquals(50, jumpScore(two, mapOf(two[0].id to out(true), two[1].id to out(false))))
        val three = jumpTestExercises("a1-2", AppData().path, ::daysOf).take(3)
        assertEquals(33, jumpScore(three, mapOf(three[0].id to out(true))))
        assertTrue("33% ötiş emas", !jumpPassed(33))
        assertTrue("80% ötiş", jumpPassed(JUMP_PASS_SCORE))
    }

    @Test
    fun qismanHissaBallgaQoshiladi() {
        val one = jumpTestExercises("a1-2", AppData().path, ::daysOf).take(1)
        assertEquals(50, jumpScore(one, mapOf(one[0].id to out(false, partial = 0.5))))
    }

    @Test
    fun javobsizSavolNolsanadiVaBoLuvchiSavollarSoni() {
        val ex = jumpTestExercises("a1-2", AppData().path, ::daysOf)
        assertEquals(0, jumpScore(ex, emptyMap()))
        // Bitta javob, bo'luvchi — HAMMA savollar (veb `total = exercises.length`).
        assertEquals(
            Math.round(1.0 / ex.size * 100.0).toInt(),
            jumpScore(ex, mapOf(ex[0].id to out(true))),
        )
        assertEquals(0, jumpScore(emptyList<Exercise>(), mapOf("x" to out(true))))
    }

    @Test
    fun harBirSavolBIRMartaSanaladi() {
        val ex = jumpTestExercises("a1-2", AppData().path, ::daysOf)
        val first = ex.take(2)
        // `jumpOutcomes` — MAP (mashq id'i bo'yicha): pleyer mashqni qayta
        // ko'rsatsaham takror sanalmaydi (kalit takrorlansa qayta yoziladi).
        val m = LinkedHashMap<String, CheckOutcome>()
        m[first[0].id] = out(false)
        m[first[0].id] = out(true)
        val map = m + mapOf(first[1].id to out(true))
        val two = first
        assertEquals(100, jumpScore(two, map))
    }

    /** Veb bilan son pariteti — bu test `src/lib/sections.ts`ni O'QIDI. */
    @Test
    fun chegaralarVebBilanBirXil() {
        val ts = File(repoRoot(), "src/lib/sections.ts").readText()
        val pass = Regex("""JUMP_PASS_SCORE\s*=\s*(\d+)""").find(ts)?.groupValues?.get(1)?.toInt()
        val perDay = Regex("""JUMP_ITEMS_PER_DAY\s*=\s*(\d+)""").find(ts)?.groupValues?.get(1)?.toInt()
        assertEquals("veb JUMP_PASS_SCORE farq qildi", JUMP_PASS_SCORE, pass)
        assertEquals("veb JUMP_ITEMS_PER_DAY farq qildi", JUMP_ITEMS_PER_DAY, perDay)
    }

    /** Loyiha ildizi (`src/lib/sections.ts` shu yerda). */
    private fun repoRoot(): File {
        // Unit test ishi papkasi moduldadir (`mobile/app`), shuning uchun
        // loyiha ildizi ikki daraja yuqorida — zaxira yo'llar ham sineladi.
        val candidates = listOf("..", "../..", ".", "app")
        for (c in candidates) {
            val f = File(File(c), "src/lib/sections.ts")
            if (f.isFile) return File(c).absoluteFile
        }
        throw IllegalStateException("src/lib/sections.ts topilmadi (pwd=${File(".").absolutePath})")
    }
}
