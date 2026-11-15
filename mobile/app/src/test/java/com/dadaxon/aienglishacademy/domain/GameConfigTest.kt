package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.GameConfig
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * O'yin sonlari va TANLOV ARIFMETIKASI — eng muhim test.
 *
 * Nima uchun: `plan.game` bitta jadvalda veb va mobil tomonidan o'qiladi.
 * Agar kun hashi yoki quest tanlovi tildan tilga farq qilsa, o'quvchi
 * telefonida boshqa, brauzerida boshqa quest ko'radi — va `questsDone`
 * belgilari bir-biriga mos tushmaydi (gem ikki marta yoki hech qachon
 * berilmaydi). Shuning uchun bu yerda NATIJALAR OLDINDAN sanab qo'yilgan
 * (PIN jadvali) — kod o'zgarsa test yiqiladi.
 *
 * PIN jadvali mustaqil Python (32 bitli to'liq sonlar, `python -I`) bilan
 * sanalgan: JS `Math.imul` va Kotlin `Int` ko'paytirishining bit natijasi.
 */
class GameConfigTest {

    /**
     * `dayHashUnsigned` (JS `h >>> 0`) va shu kun tanlovi — tartib BILAN.
     * Har qator: sana, hash, uch quest id'si.
     */
    private val pinTable = listOf(
        Triple("2026-01-01", 2049302883L, listOf("q-min-900", "q-att-10", "q-att-20")),
        Triple("2026-02-13", 3362913287L, listOf("q-rev-8", "q-att-20", "q-perf-1")),
        Triple("2026-03-07", 2765300439L, listOf("q-rev-8", "q-min-900", "q-perf-1")),
        Triple("2026-04-30", 2259894170L, listOf("q-rev-15", "q-att-10", "q-rev-8")),
        Triple("2026-05-01", 1605626279L, listOf("q-rev-8", "q-xp-100", "q-min-900")),
        Triple("2026-06-15", 3168692669L, listOf("q-spk-120", "q-min-900", "q-xp-100")),
        Triple("2026-07-04", 3315426934L, listOf("q-att-10", "q-rev-15", "q-spk-120")),
        Triple("2026-08-21", 3490115828L, listOf("q-lis-180", "q-xp-100", "q-min-900")),
        Triple("2026-09-09", 4291630099L, listOf("q-spk-120", "q-lis-180", "q-att-20")),
        Triple("2026-10-01", 1702702973L, listOf("q-rev-8", "q-min-900", "q-xp-100")),
        Triple("2026-11-07", 1864244822L, listOf("q-lis-180", "q-perf-1", "q-xp-300")),
        Triple("2026-11-30", 1487828L, listOf("q-xp-300", "q-att-10", "q-min-900")),
        Triple("2027-01-01", 1431789288L, listOf("q-rev-15", "q-att-10", "q-att-20")),
        Triple("2025-11-07", 2087110427L, listOf("q-xp-100", "q-perf-1", "q-att-20")),
        Triple("2000-02-29", 4125131930L, listOf("q-att-10", "q-xp-100", "q-perf-1")),
    )

    @Test
    fun dayHashPinTable() {
        for ((day, hash, _) in pinTable) {
            assertEquals("$day kun hashi JS tomoni bilan mos emas", hash, GameLogic.dayHashUnsigned(day))
        }
    }

    @Test
    fun questsForDayPinTable() {
        for ((day, _, ids) in pinTable) {
            assertEquals(
                "$day quest tanlovi JS tomoni bilan mos emas",
                ids,
                GameLogic.questsForDay(day).map { it.id },
            )
        }
    }

    /**
     * ESKI XATOGA qarshi regressiya: bir vaqtlar prime `0x0193` (403) deb
     * yozilgan edi — u JS natijasini bermaydi. Aynan shu eski arifmetika bu
     * yerda qayta hisoblanib, hozirgi hash BILAN BOSHAQ ekani tekshiriladi.
     */
    @Test
    fun wrongPrimeWouldBreakCrossDeviceEquality() {
        fun oldHash(s: String): Int {
            var h = 0x811C9DC5.toInt()
            for (ch in s) h = (h xor ch.code) * 0x0193
            return h
        }
        assertNotEquals("prime 0x01000193 bölişi şart", oldHash("2026-11-07"), GameLogic.dayHash("2026-11-07"))
        // Belgili Int — PIN jadvalidagi bilan BIR XIL son (`h >>> 0` = 0x6F1E1E56).
        assertEquals(1_864_244_822L, GameLogic.dayHashUnsigned("2026-11-07"))
        assertTrue("belgili Int manfiy ham bölişi mumkin", GameLogic.dayHash("2026-09-09") < 0)
    }

    @Test
    fun questPoolIsConsistent() {
        val ids = GameConfig.QUEST_POOL.map { it.id }
        assertEquals("quest id'lari takrorlanmasligi kerak", ids.size, ids.toSet().size)
        for (q in GameConfig.QUEST_POOL) {
            assertTrue("${q.id} turi noma'lum", GameConfig.QUEST_KINDS.contains(q.kind))
            assertTrue("${q.id} maqsadi musbat", q.target > 0)
            assertTrue("${q.id} izohi yöq", q.titleUz.isNotBlank())
        }
        // Tanlov hovuzi kamida `QUESTS_PER_DAY` ta bo'lishi shart.
        assertTrue(GameConfig.QUEST_POOL.size >= GameConfig.QUESTS_PER_DAY)
    }

    @Test
    fun questKindsMatchTheWebList() {
        // Veb `QUEST_KINDS` (`src/lib/game.ts`) — ichki test ham sanaydi.
        assertEquals(
            listOf("xp", "attempts", "reviews", "perfect_lesson", "minutes", "listening", "speaking"),
            GameConfig.QUEST_KINDS,
        )
    }

    @Test
    fun leagueTableIsMonotonicAndSane() {
        val ids = GameConfig.LEAGUES.map { it.id }
        assertEquals(10, ids.size)
        assertEquals("liga id'lari takrorlanmasligi kerak", ids.size, ids.toSet().size)
        var prevXp = -1
        for (l in GameConfig.LEAGUES) {
            assertTrue("${l.id} çegarasi kamaymasligi kerak", l.minXp > prevXp)
            prevXp = l.minXp
            assertTrue("${l.id} promoteTop manfiy", l.promoteTop >= 0)
            assertEquals("liga id'si böş", l.id, GameConfig.leagueById(l.id).id)
        }
        // Oxirgi ligaga ko'tarilish YO'Q (Duolingo: Diamond — eng yuqori).
        assertEquals(0, GameConfig.LEAGUES.last().promoteTop)
        assertEquals("bronze", GameConfig.leagueById("yöq-liga").id)
    }

    @Test
    fun shopPricesArePositive() {
        for ((id, price) in GameConfig.SHOP) {
            assertTrue("$id narxi musbat", price > 0)
            assertEquals(price, GameConfig.priceOf(id))
        }
        assertEquals(0, GameConfig.priceOf("noma'lum"))
        assertEquals(
            "dökon röyxati `SHOP` xaritasini töliq qamrab olişi kerak",
            GameConfig.SHOP.keys.toSet(),
            GameConfig.SHOP_ITEMS.map { it.id }.toSet(),
        )
    }

    @Test
    fun xpGoalTiersAreTheDocumentedFive() {
        assertEquals(5, GameConfig.XP_GOAL_TIERS.size)
        assertEquals(GameConfig.XP_GOAL_TIERS[2].xp, GameConfig.XP_GOAL_DEFAULT_XP)
        assertEquals(GameConfig.xpGoalFor(GameConfig.XP_GOAL_DEFAULT_ID), GameConfig.XP_GOAL_DEFAULT_XP)
        // Ro'yxat tashqarisidagi son ENG YAQIN bosqichga qaytadi — ixtir yo'q.
        assertEquals(200, GameConfig.nearestXpGoal(180))
        assertEquals(500, GameConfig.nearestXpGoal(9999))
        assertEquals(50, GameConfig.nearestXpGoal(0))
        // Manfiy son ham ro'yxatdagi ENG YAQIN bosqichga qaytadi (50),
        // standart bosqichga (200) EMIK.
        assertEquals(50, GameConfig.nearestXpGoal(-7))
    }

    @Test
    fun heartFreeSourcesAreTheThreeAgreedPlaces() {
        // Foydalanuvchi tanlovi: imtihon, diagnostika va bo'lim testida yurak
        // jarima QILINMAYDI.
        assertEquals(listOf("mock_exam", "diagnostic", "section_test"), GameConfig.HEART_FREE_SOURCES)
        assertTrue(GameLogic.heartFreeSource("section_test"))
        assertTrue(!GameLogic.heartFreeSource("grammar"))
    }

    /** Sana yordamchilari — liga haftasi PONESHANBA-da boshlanadi (JS formulasi). */
    @Test
    fun weekStartIsMonday() {
        assertEquals("2026-11-02", GameLogic.weekStartOf("2026-11-07")) // Saturday → Monday
        assertEquals("2026-11-02", GameLogic.weekStartOf("2026-11-02")) // Monday → itself
        assertEquals("2026-11-02", GameLogic.weekStartOf("2026-11-08")) // Sunday
        assertEquals("2026-02-23", GameLogic.weekStartOf("2026-03-01")) // crossing a month
    }
}
