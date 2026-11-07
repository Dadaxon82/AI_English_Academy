package com.dadaxon.aienglishacademy.data

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * O'yin manifesti (`res/raw/game_manifest.json`) — saqlangan sonlar KOD
 * (`GameConfig`) bilan solishtiriladi va har bir sonning MANBASI faylning
 * o'zida borligi tekshiriladi.
 *
 * Nima uchun: veb (`src/lib/gameConfig.ts`), mobil (`GameConfig.kt`) va shu
 * fayl BIR xatti jadvalga yozadi. Sonlar farq qilsa, o'quvchi telefonida
 * brauzerdagidan boshqa yurak/quest/liga ko'radi. Manifest veb jadvalidan
 * avtomatik yasaladi — bu test bog'lanish uzilganda darhol ushlaydi.
 */
class GameManifestTest {

    private fun repoDir(): File {
        val candidates = listOf(File("."), File("app"), File(".."))
        return candidates.firstOrNull { File(it, "src/main/res/raw/game_manifest.json").isFile } ?: File(".")
    }

    private fun manifestText(): String {
        val f = File(repoDir(), "src/main/res/raw/game_manifest.json")
        assertTrue("`res/raw/game_manifest.json` yo'q: ${f.absolutePath}", f.isFile)
        return f.readText()
    }

    private fun parsed(): JsonObject = JsonParser.parseString(manifestText()).asJsonObject

    @Test
    fun shippedManifestParsesAndMatchesTheCode() {
        val text = manifestText()
        assertTrue("manifest bo'sh", text.isNotBlank())
        val m = parseGameManifest(text)
        assertNotNull("manifest parse bo'lmadi (maydon yo'q yoki turi buzilgan)", m)
        assertEquals(
            "manifest sonlari `GameConfig` bilan mos emas",
            emptyList<String>(),
            m!!.mismatches(),
        )
        assertEquals("manifest sonlarining manbasi ko'rsatilmagan", emptyList<String>(), m.missingSources())
    }

    @Test
    fun everyNumberHasItsSourceWrittenInTheFile() {
        val raw = parsed()
        // `_comment` majburiy — Duolingo mexanikasi va BIZNING qarorlar shu
        // faylning o'zida ochiq yozilgan (ixtir sonlarga qarshi himoya).
        assertTrue("`_comment` yo'q", raw.has("_comment"))
        val comment = raw.get("_comment").asString
        assertTrue("izohda Duolingo manbasi aytilmagan", comment.contains("Duolingo"))
        assertTrue("izohda bizning qarorlar ajratilmagan", comment.lowercase().contains("biznik"))
        for (key in GameManifest.SOURCE_KEYS) {
            val e = raw.get("${key}Source")
            assertTrue("`$key` sonining manbasi (`$key`Source) yo'q", e != null && e.isJsonPrimitive && !e.isJsonNull)
            assertTrue("`$key`Source bo'sh", e.asString.isNotBlank())
        }
        // Ro'yxatning o'zi ham to'liq — veb testi bilan bir xil kalitlar.
        assertEquals(24, GameManifest.SOURCE_KEYS.size)
        // `freezeSearchDays` — BIZNING qarorimiz (Duolingo aniq aytmagan),
        // shuning uchun manbasida shu so'z bo'lishi shart.
        assertTrue(
            "`freezeSearchDays` manbasida «biznik» deyilishi kerak",
            raw.get("freezeSearchDaysSource").asString.lowercase().contains("biznik"),
        )
        // Har bir qatorning `src` izohi ham bor (test `missingSources` orqali
        // sanaydi, bu yerda soni tekshiriladi).
        assertEquals(5, raw.getAsJsonArray("xpGoalTiers").size())
        assertEquals(10, raw.getAsJsonArray("questPool").size())
        assertEquals(6, raw.getAsJsonArray("achievements").size())
        assertEquals(10, raw.getAsJsonArray("leagues").size())
        for (e in raw.getAsJsonArray("questPool")) {
            assertTrue("quest satrida `src` yo'q", e.asJsonObject.get("src").asString.isNotBlank())
        }
        for (e in raw.getAsJsonArray("achievements")) {
            assertTrue("yutuq satrida `src` yo'q", e.asJsonObject.get("src").asString.isNotBlank())
        }
    }

    @Test
    fun sectionTestsAndHeartsMatchTheAgreedDecision() {
        val m = parseGameManifest(manifestText())!!
        // Foydalanuvchi tanlovi: imtihon, diagnostika va bo'lim testida yurak
        // jarima QILINMAYDI.
        assertTrue("bo'lim testi yurak jarimasidan holmiq", m.sectionTestIsFree())
        assertEquals(listOf("mock_exam", "diagnostic", "section_test"), m.heartFreeSources)
        assertEquals(5, m.heartsMax)
        assertEquals(1, m.heartsCostWrong)
        assertEquals(30, m.heartRefillMinutes)
        assertEquals(8, m.heartPracticeReviews)
        assertEquals(1, m.heartGateMin)
        assertEquals(10, m.questGemReward)
        assertEquals(50, m.chestGemReward)
        assertEquals(2, m.maxFreezes)
        assertEquals(GameConfig.FREEZE_SEARCH_DAYS, m.freezeSearchDays)
        assertEquals(mapOf("heart" to 70, "refill" to 350, "freeze" to 200, "xpBoost" to 100), m.shop)
        assertEquals(listOf(100, 50, 30), m.leaguePrizeGems)
        // Quest hovuzi TARTIBI ham bir xil — tanlov arifmetikasi shu tartibga
        // qaraydi (mobil/veb bir xil kun tanlovi shu bilan kafolatlanadi).
        assertEquals(
            GameConfig.QUEST_POOL.map { it.id },
            parsed().getAsJsonArray("questPool").map { it.asJsonObject.get("id").asString },
        )
    }

    @Test
    fun malformedManifestReturnsNullInsteadOfGuessedNumbers() {
        // Parse bo'lmasa `null` — sonlar ixtir QILINMAYDI (chaqiruvchi halol
        // "manifest o'qilmadi" deydi).
        assertNull(parseGameManifest("bu json emas"))
        assertNull(parseGameManifest("[]"))
        assertNull(parseGameManifest(""))
        assertNull(parseGameManifest("{}"))

        // Maydon olib tashlansa — butun manifest rad etiladi.
        val noPrize = parsed().also { it.remove("leaguePrizeGems") }
        assertNull(parseGameManifest(noPrize.toString()))
        // Turi buzilsa (son o'rniga satr) — ham rad etiladi.
        val badHearts = parsed().also { it.addProperty("heartsMax", "besh") }
        assertNull(parseGameManifest(badHearts.toString()))
        // Izoh (`*Source`) yetishmasa parse YARAYDI, lekin `missingSources()`
        // jimgina o'tib ketmaydi.
        val noSrc = parsed().also { it.remove("leaguePrizeSource") }
        val m = parseGameManifest(noSrc.toString())
        assertNotNull(m)
        assertEquals(listOf("leaguePrizeSource"), m!!.missingSources())
    }

    @Test
    fun missingFreezeSearchDaysFallsBackToTheKnownDefault() {
        val without = parsed().also { it.remove("freezeSearchDays") }
        val m = parseGameManifest(without.toString())
        assertNotNull(m)
        // Maydon yo'q — KODdagı o'lchangan qiymat (14) ishlatiladi: ikkala
        // mijozda bir xil bo'lishi uchun.
        assertEquals(GameConfig.FREEZE_SEARCH_DAYS, m!!.freezeSearchDays)
        // MANBASI esa baribir talab qilinadi.
        val noSource = parsed().also { it.remove("freezeSearchDaysSource") }
        assertEquals(
            listOf("freezeSearchDaysSource"),
            parseGameManifest(noSource.toString())?.missingSources(),
        )
    }

    @Test
    fun aChangedNumberIsCaughtByName() {
        // Manifestda bitta sonni buzib ko'rsatamiz — `mismatches()` uni topadi
        // (faqat shu qator qaytishi kerak: qolganlari joyida).
        val found = parseGameManifest(parsed().also { it.addProperty("heartsMax", 6) }.toString())!!.mismatches()
        assertEquals(1, found.size)
        assertTrue(found[0].contains("heartsMax"))
        // Liga jadvalining bitta satridagi `promoteTop` buzilsa — `leagues`
        // qatori chiqadi (butun jadval solishtiriladi).
        val mutated = parsed()
        mutated.getAsJsonArray("leagues").get(0).asJsonObject.addProperty("promoteTop", 99)
        val found2 = parseGameManifest(mutated.toString())
        assertNotNull(found2)
        assertTrue("`leagues` farqi topilmadi", found2!!.mismatches().any { it.startsWith("leagues") })
    }
}
