package com.dadaxon.aienglishacademy.sync

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.LocalStore
import com.dadaxon.aienglishacademy.data.MemoryStore
import com.dadaxon.aienglishacademy.data.SpeakingSession
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.WritingSubmission
import com.google.gson.JsonParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `toQueueItems` / fingerprint — veb `src/lib/sync.ts` bilan BIR bazaga
 * yozilgani uchun payload formati so'zma-so'z mos bo'lishi shart.
 */
class SyncProtocolTest {

    private fun store(): Pair<LocalStore, MemoryStore> {
        val kv = MemoryStore()
        return LocalStore(kv) to kv
    }

    /* ---------------- xesh: JS (veb) bilan bir xil qiymatlar ------------- */
    /* Qiymatlar veb `hashString` funksiyasidan (node) olindi — cyrb53.     */

    @Test
    fun hashstringMatchesWebExactly() {
        val p = SyncProtocol(store().first)
        assertEquals("wvjl67o803", p.hashString(""))
        assertEquals("262p94epp1d", p.hashString("a"))
        assertEquals("1dtlchkfkb1", p.hashString("abc"))
        assertEquals("1k9xd0c3jsc", p.hashString("AI English Academy"))
        assertEquals("dob08ecp2k", p.hashString("{\"user_id\":\"u1\",\"daily_minutes\":90}"))
        assertEquals("rh5towhzal", p.hashString("Salam, dunyo — 123"))
    }

    /* ------------------------- payload shakli ----------------------------- */

    private fun attempt(id: String, at: Long, answer: String = "x") = AttemptRecord(
        id = id, exerciseId = "ex-1", skill = "reading", level = "A1",
        correct = true, partial = 1.0, difficulty = 1, secondsSpent = 12,
        source = "practice", answerGiven = answer, at = at,
    )

    @Test
    fun settingsAndPlanAlwaysQueued() {
        val (ls, _) = store()
        val p = SyncProtocol(ls)
        val items = p.toQueueItems(AppData.empty("u-1"))
        val tables = items.map { it.table }
        assertTrue(tables.contains("user_settings"))
        assertTrue(tables.contains("learning_plans"))
    }

    @Test
    fun settingsPayloadUsesSnakeCaseAndClampsMinutes() {
        val (ls, _) = store()
        val p = SyncProtocol(ls)
        val data = AppData.empty("u-1").copy(settings = AppData.empty("u-1").settings.copy(dailyMinutes = 15))
        val s = p.toQueueItems(data).first { it.table == "user_settings" }
        val o = JsonParser.parseString(s.payloadJson).asJsonObject
        assertEquals("u-1", o.get("user_id").asString)
        // DB CHECK (30..240) — 15 rad etilardi: clamp bilan 30 bo'lishi shart.
        assertEquals(30, o.get("daily_minutes").asInt)
        assertNotNull(o.get("current_level"))
        assertFalse("camelCase ustun qolmasligi kerak", o.has("dailyMinutes"))
    }

    @Test
    fun learningPlanIdIsDeterministic() {
        val (ls, _) = store()
        val p = SyncProtocol(ls)
        val pl = p.toQueueItems(AppData.empty("u-1")).first { it.table == "learning_plans" }
        val o = JsonParser.parseString(pl.payloadJson).asJsonObject
        // PK bo'lmagan id har safar yangi qator qo'shardi — id = uid.
        assertEquals("u-1", o.get("id").asString)
        assertTrue(o.has("plan"))
    }

    @Test
    fun attemptsAreCappedTrimmedAndSnakeCased() {
        val (ls, _) = store()
        val p = SyncProtocol(ls)
        val many = (0..500).map { attempt("a$it", 1000L + it) }
        val long = attempt("along", 9999L, "z".repeat(2500))
        val items = p.toQueueItems(
            AppData.empty("u-1").copy(
                attempts = many + long,
            ),
        )
        val att = items.filter { it.table == "exercise_attempts" }
        assertEquals(500, att.size) // slice(-500) — birinchi ("a0") tashlanadi
        assertFalse(att.any { JsonParser.parseString(it.payloadJson).asJsonObject.get("id").asString == "a0" })
        val o = JsonParser.parseString(att.last().payloadJson).asJsonObject
        assertEquals(2000, o.get("answer_text").asString.length) // slice(0, 2000)
        assertEquals("exercise_attempts", att[0].table)
        assertTrue(o.has("seconds_spent"))
        assertFalse(o.has("secondsSpent"))
    }

    @Test
    fun speakingNeverUploadsAudio() {
        val (ls, _) = store()
        val p = SyncProtocol(ls)
        val data = AppData.empty("u-1").copy(
            speaking = listOf(
                SpeakingSession(
                    id = "s1", taskId = "t1", audioBlobStored = true, durationSec = 42,
                    transcript = null, transcriptionEngine = "none", analysis = null,
                    textAnswer = "salom", createdAt = 5000L,
                ),
            ),
        )
        val o = JsonParser.parseString(
            p.toQueueItems(data).first { it.table == "speaking_sessions" }.payloadJson,
        ).asJsonObject
        assertFalse(o.get("audio_stored").asBoolean)
        assertEquals(42, o.get("duration_sec").asInt)
    }

    @Test
    fun writingAndMockCapsMatchWeb() {
        val (ls, _) = store()
        val p = SyncProtocol(ls)
        val wr = (0..104).map { WritingSubmission(id = "w$it", taskId = "t", text = "x", wordCount = 1, secondsSpent = 1, createdAt = 1000L + it) }
        val items = p.toQueueItems(AppData.empty("u-1").copy(writing = wr))
        assertEquals(100, items.count { it.table == "writing_submissions" })
        assertEquals(
            "w5",
            JsonParser.parseString(items.filter { it.table == "writing_submissions" }.first().payloadJson)
                .asJsonObject.get("id").asString,
        ) // takeLast(100) — w0..w4 tushib qoladi
    }

    /* ------------------------------ IsoTime ------------------------------- */

    @Test
    fun isoTimeFormatAndParse() {
        // Soxta son (1.73e9 ms) UTC bo'yicha 03:33:20 ga to'g'ri keladi
        // (Node: Date.parse("2024-10-27T03:33:20.000Z") === 1730000000000).
        assertEquals("2024-10-27T03:33:20.000Z", IsoTime.of(1730000000000L))
        assertEquals(1730000000000L, IsoTime.parse("2024-10-27T03:33:20.000Z"))
        assertEquals(1730000000000L, IsoTime.parse("2024-10-27T03:33:20Z"))
        assertNull(IsoTime.parse("keça"))
        assertNull(IsoTime.parse(null))
    }

    /* --------------------- queueAllData / iz (trace) ---------------------- */

    @Test
    fun queueAllDataDeduplicatesAcrossCalls() {
        val (ls, _) = store()
        val p = SyncProtocol(ls)
        val data = AppData.empty("u-1").copy(
            attempts = listOf(attempt("a1", 10L)),
            srs = mapOf("v1" to SrsState(dueAt = 999L)),
            activity = mapOf("2026-11-04" to DayActivity(date = "2026-11-04", seconds = 5)),
            writing = listOf(WritingSubmission("w1", "t", "x", 1, 1, createdAt = 7L)),
            speaking = listOf(SpeakingSession("s1", "t", durationSec = 2, createdAt = 7L)),
        )
        val n1 = p.queueAllData(data)
        // 2 (settings+plan) + weekly_xp (0004 liga qatori — har holatda bitta
        // qator yuboriladi) + attempt + srs + activity + writing + speaking
        assertEquals(8, n1)
        assertEquals(8, ls.queueSize("u-1"))
        // Ikkinchi chaqiruv: navbat kalitlari bir xil → shishmaydi (veb bugi).
        val n2 = p.queueAllData(data)
        assertEquals(8, n2)
        assertEquals(8, ls.queueSize("u-1"))
    }

    @Test
    fun fingerprintKeyUsesDedupeKey() {
        val (ls, _) = store()
        val p = SyncProtocol(ls)
        assertEquals(
            "exercise_attempts|id:a1",
            p.fingerprintKey("exercise_attempts", "{\"id\":\"a1\"}"),
        )
        assertEquals("user_settings|uk:user", p.fingerprintKey("user_settings", "{\"user_id\":\"u\"}"))
        assertNull(p.fingerprintKey("daily_activity", "{\"user_id\":\"u\"}")) // "day" yo'q
    }

    @Test
    fun syncedRowsAreNotRequeuedButLiveSetIsPruned() {
        val (ls, _) = store()
        val p = SyncProtocol(ls)
        val data = AppData.empty("u-1").copy(attempts = listOf(attempt("a1", 10L)))
        p.queueAllData(data)
        // Sun'iy "yuborilgan" izi: barcha tirik yozuvlar izi bilan belgilanadi.
        val items = p.toQueueItems(data)
        val trace = items.mapNotNull { p.fingerprintKey(it.table, it.payloadJson) }
            .associateWith { p.fingerprint(items.first { i -> p.fingerprintKey(i.table, i.payloadJson) == it }.payloadJson) }
        ls.saveSynced("u-1", trace)
        assertEquals(0, p.queueAllData(data)) // o'zgarmagan — hech narsa navbatga qo'shilmaydi
    }
}
