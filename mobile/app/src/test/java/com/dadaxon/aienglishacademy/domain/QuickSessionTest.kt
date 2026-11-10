package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.FsAssetSource
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.VocabEmoji
import com.dadaxon.aienglishacademy.data.VocabularyItem
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * «5 daqiqa» tezkor sessiya — veb `src/test/quick-session.test.ts` bilan BIR
 * XIL holatlar. Kontent HAQIQIY (`assets/content/a1.json`), sonlar va so'z
 * rasmlari veb fayllaridan o'qib solishtiriladi (paritet).
 */
class QuickSessionTest {

    private fun assetsDir(): File {
        for (c in listOf("src/main/assets", "app/src/main/assets", "mobile/app/src/main/assets")) {
            val f = File(c)
            if (File(f, ContentRepository.MANIFEST_PATH).isFile) return f
        }
        throw IllegalStateException("content/manifest.json topilmadi (pwd=${File(".").absolutePath})")
    }

    private fun repoFile(rel: String): File {
        for (c in listOf("..", "../..", ".", "app")) {
            val f = File(File(c), rel)
            if (f.isFile) return f
        }
        throw IllegalStateException("$rel topilmadi (pwd=${File(".").absolutePath})")
    }

    private val pool: List<VocabularyItem> = ContentRepository(FsAssetSource(assetsDir())).bundle("A1").vocab

    private val t0 = 1_793_000_000_000L
    private val day = 86_400_000L

    /** So'zni "o'rganilgan, muddati `dueAt`" holatiga keltirish. */
    private fun learned(dueAt: Long, lapses: Int = 0): SrsState =
        review(initialSrsState(t0 - 5 * day), SrsGrade.GOOD, t0 - 5 * day).copy(dueAt = dueAt, lapses = lapses)

    @Test
    fun avvalTakrorlarXatoBirinchiKeyinBittaMavzudanYangi() {
        val (a, b, c) = Triple(pool[0], pool[1], pool[2])
        val srs = mapOf(
            a.id to learned(t0 - 1000),
            b.id to learned(t0 - 500, lapses = 2),
            c.id to learned(t0 + day),
        )
        val deck = QuickSession.buildDeck(pool, srs, t0)
        assertEquals(listOf(b.id, a.id), deck.cards.take(2).map { it.item.id })
        assertEquals(2, deck.dueCount)
        assertTrue(deck.cards.none { it.item.id == c.id })
        val fresh = deck.cards.filter { it.isNew }
        assertEquals(QuickSession.NEW_WORDS, fresh.size)
        assertEquals(1, fresh.map { it.item.topic }.toSet().size)
        assertEquals(deck.newTopic, fresh.first().item.topic)
        assertTrue(fresh.all { srs[it.item.id] == null })
    }

    @Test
    fun takrorlarSoniChegaralanadi() {
        val srs = pool.associate { it.id to learned(t0 - 1) }
        val deck = QuickSession.buildDeck(pool, srs, t0)
        assertEquals(minOf(QuickSession.MAX_DUE, pool.size), deck.dueCount)
        assertEquals(0, deck.newCount)
        assertNull(deck.newTopic)
    }

    @Test
    fun hammasiOrganilganBolsaBoshSoxtaKartaYoq() {
        val srs = pool.associate { it.id to learned(t0 + day) }
        assertTrue(QuickSession.buildDeck(pool, srs, t0).cards.isEmpty())
    }

    @Test
    fun takrorlanganSozBittaKarta() {
        assertEquals(1, QuickSession.buildDeck(listOf(pool[0], pool[0]), emptyMap(), t0).cards.size)
    }

    @Test
    fun yangiSozlarFaqatNewPooldan() {
        val main = pool.take(20)
        val extra = pool.drop(20).take(20).map { it.copy(id = "g-" + it.id, topic = "matndan olingan") }
        val saved = extra.first()
        val deck = QuickSession.buildDeck(main + extra, mapOf(saved.id to learned(t0 - 1)), t0, newPool = main)
        assertEquals(saved.id, deck.cards.first().item.id)
        val fresh = deck.cards.filter { it.isNew }
        assertTrue(fresh.isNotEmpty())
        assertTrue(fresh.all { f -> main.any { it.id == f.item.id } })
    }

    /** Veb bilan bir xil natija: A1 havuzi, SRS bo'sh — tanlangan mavzu va so'zlar. */
    @Test
    fun boshHolatdaVebBilanBirXilMavzu() {
        val deck = QuickSession.buildDeck(pool, emptyMap(), t0)
        // Eng ko'p so'zli mavzu (teng bo'lsa birinchi uchragani) — mustaqil hisob.
        val counts = LinkedHashMap<String, Int>()
        for (v in pool) counts[v.topic] = (counts[v.topic] ?: 0) + 1
        var best: String? = null
        var n = 0
        for ((t, k) in counts) if (k > n) { best = t; n = k }
        assertEquals(best, deck.newTopic)
        assertEquals(pool.filter { it.topic == best }.take(QuickSession.NEW_WORDS).map { it.id }, deck.cards.map { it.item.id })
    }

    @Test
    fun surishVaQolganVaqt() {
        val min = 80f
        assertEquals(SrsGrade.GOOD, QuickSession.swipeGrade(80f, 200f, min))
        assertEquals(SrsGrade.AGAIN, QuickSession.swipeGrade(-80f, 200f, min))
        assertNull(QuickSession.swipeGrade(79f, 200f, min))
        assertNull(QuickSession.swipeGrade(100f, 600f, min))
        assertEquals(SrsGrade.GOOD, QuickSession.swipeGrade(150f, 600f, min))
        assertNull(QuickSession.swipeGrade(Float.NaN, 200f, min))
        assertEquals(QuickSession.SESSION_SEC, QuickSession.remaining(0))
        assertEquals(QuickSession.SESSION_SEC - 120, QuickSession.remaining(120))
        assertEquals(0, QuickSession.remaining(QuickSession.SESSION_SEC + 50))
        assertEquals("quick-2026-11-09", QuickSession.sessionId("2026-11-09"))
    }

    /** Paritet: veb `src/lib/quickSession.ts` konstantalari. */
    @Test
    fun sonlarVebBilanBirXil() {
        val ts = repoFile("src/lib/quickSession.ts").readText()
        fun num(name: String) = Regex("""$name\s*=\s*([0-9.* ]+)""").find(ts)?.groupValues?.get(1)?.trim()
        assertEquals("5 * 60", num("QUICK_SESSION_SEC"))
        assertEquals(QuickSession.SESSION_SEC, 5 * 60)
        assertEquals(QuickSession.MAX_DUE.toString(), num("QUICK_MAX_DUE"))
        assertEquals(QuickSession.NEW_WORDS.toString(), num("QUICK_NEW_WORDS"))
        assertEquals(QuickSession.SWIPE_MIN_DP.toString(), num("SWIPE_MIN_PX"))
        assertEquals(QuickSession.SWIPE_WIDTH_RATIO.toString(), num("SWIPE_WIDTH_RATIO"))
        assertTrue("sessiya kaliti formati", ts.contains("`quick-\${day}`"))
    }

    /** Paritet: so'z rasmlari veb `src/content/vocabEmoji.ts` bilan juftma-juft bir xil. */
    @Test
    fun sozRasmlariVebBilanBirXil() {
        val ts = repoFile("src/content/vocabEmoji.ts").readText()
        val body = ts.substringAfter("VOCAB_EMOJI").substringAfter("{").substringBefore("\n}")
        // Kalit uch xil yoziladi: `hello:`, `'wake up':`, `"o’clock":` (ichida apostrof).
        val re = Regex("""^\s*(?:([a-z]+)|'([^']+)'|"([^"]+)"):\s*'([^']+)',""", RegexOption.MULTILINE)
        val web = re.findAll(body).associate { m ->
            (m.groupValues[1].ifEmpty { m.groupValues[2] }.ifEmpty { m.groupValues[3] }) to m.groupValues[4]
        }
        // Veb faylidagi har bir qator o'qilganini tekshirish (regex yozuvni o'tkazib yubormasin).
        val lines = body.lines().count { Regex("""^\s*\S.*:\s*'[^']+',""").containsMatchIn(it) }
        assertEquals("veb faylidagi barcha yozuvlar o'qildi", lines, web.size)
        assertEquals(web.size, VocabEmoji.MAP.size)
        assertEquals(web, VocabEmoji.MAP)
        assertEquals("🍞", VocabEmoji.of(" Bread "))
        assertNull(VocabEmoji.of("usually"))
    }

    /** Zanjir: 5 daqiqalik faollik kunni faol qiladi (yangi qoida ixtiro qilinmagan). */
    @Test
    fun besDaqiqaKunniFaolQiladi() {
        val today = "2026-11-09"
        val d = com.dadaxon.aienglishacademy.data.AppData().copy(
            activity = mapOf(
                today to com.dadaxon.aienglishacademy.data.DayActivity(date = today, seconds = QuickSession.SESSION_SEC),
            ),
        )
        assertTrue(today in GameLogic.activeDayKeys(d))
    }
}
