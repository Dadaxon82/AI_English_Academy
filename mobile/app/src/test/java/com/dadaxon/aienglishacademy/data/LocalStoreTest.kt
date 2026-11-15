package com.dadaxon.aienglishacademy.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Qurilmadagi saqlash: migratsiya, deduplikat (navbat shishmasligi), iz,
 * logout tozalashi. SharedPreferences emas — `MemoryStore`.
 */
class LocalStoreTest {

    private fun s(): LocalStore = LocalStore(MemoryStore())

    /* ------------------------------ AppData ------------------------------ */

    @Test
    fun emptyDataRoundTrips() {
        val st = s()
        st.saveData("u-1", AppData.empty("u-1").copy(xp = 42))
        assertEquals(42, st.loadData("u-1").xp)
    }

    @Test
    fun otherUsersBlobIsNotLoaded() {
        val st = LocalStore(MemoryStore())
        st.saveData("u-1", AppData.empty("u-1").copy(xp = 42))
        // Kalit boshqa foydalanuvchi — bo'sh holat qaytishi kerak.
        assertEquals(0, st.loadData("u-2").xp)
    }

    @Test
    fun corruptedJsonBecomesEmptyState() {
        val kv = MemoryStore()
        kv.put(StoreKeys.data("u-1"), "{ bu json emas")
        val d = LocalStore(kv).loadData("u-1")
        assertEquals("u-1", d.userId)
        assertTrue(d.attempts.isEmpty())
    }

    @Test
    fun missingFieldsGetDefaultsNotNull() {
        // Gson Kotlin default qiymatlarini chaqirmaydi — merge SHART (veb: {...base, ...raw}).
        val kv = MemoryStore()
        kv.put(StoreKeys.data("u-1"), """{"userId":"u-1","xp":7}""")
        val d = LocalStore(kv).loadData("u-1")
        assertEquals(7, d.xp)
        assertEquals(90, d.settings.dailyMinutes)
        assertNotNull(d.path)
        assertEquals("a1-day-01", d.path.currentDayId)
    }

    /* ------------------------------ migrate ------------------------------ */

    @Test
    fun migrateClampsOldDailyMinutes() {
        val kv = MemoryStore()
        kv.put(
            StoreKeys.data("u-1"),
            """{"userId":"u-1","settings":{"dailyMinutes":15,"currentLevel":"A1","targetLevel":"C1","allocation":{"vocabulary":10,"grammar":15,"reading":15,"listening":15,"writing":20,"speaking":15},"theme":"system","aiEnabled":true}}""",
        )
        val d = LocalStore(kv).loadData("u-1")
        // DB CHECK (30..240): 15 → 30, aks holda sinxron navbati abadiy to'xtardi.
        assertEquals(30, d.settings.dailyMinutes)
    }

    @Test
    fun migrateRebuildsOnboardedAt() {
        val st = s()
        val old = AppData.empty("u-1").copy(
            onboardedAt = null,
            attempts = listOf(AttemptRecord("a", "e", "reading", "A1", true, 1.0, 1, 5, "practice", "x", 1234L)),
        )
        st.saveData("u-1", old)
        assertEquals(1234L, st.loadData("u-1").onboardedAt)
    }

    @Test
    fun migrateRewritesLegacyGlossaryKeyKeepingLargerDue() {
        val st = s()
        val old = AppData.empty("u-1").copy(
            srs = linkedMapOf(
                "apple|gl-apple" to SrsState(dueAt = 100L, reps = 1),
                "gl-apple" to SrsState(dueAt = 900L, reps = 3),
            ),
        )
        val d = st.migrate(old)
        assertEquals(setOf("gl-apple"), d.srs.keys)
        assertEquals(900L, d.srs["gl-apple"]!!.dueAt) // kattaroq dueAt saqlanadi
        assertEquals(3, d.srs["gl-apple"]!!.reps)
    }

    /* ------------------------------- navbat ------------------------------ */

    @Test
    fun dedupeKeyCoversNaturalKeys() {
        val st = s()
        assertEquals("id:x1", st.dedupeKey("exercise_attempts", "{\"id\":\"x1\"}"))
        assertEquals("uk:user", st.dedupeKey("user_settings", "{\"user_id\":\"u\"}"))
        assertEquals("uk:v:v7", st.dedupeKey("user_vocabulary", "{\"vocabulary_id\":\"v7\"}"))
        assertEquals("uk:d:2026-11-04", st.dedupeKey("daily_activity", "{\"day\":\"2026-11-04\"}"))
        assertNull(st.dedupeKey("user_vocabulary", "{}"))
        assertNull(st.dedupeKey("user_settings", "buziq"))
    }

    @Test
    fun enqueueManyReplacesSameKeyKeepingOrderLastWriteWins() {
        val st = s()
        st.enqueueMany(
            "u-1",
            listOf(
                QueueItem("1", "user_settings", "upsert", "{\"user_id\":\"u-1\",\"daily_minutes\":90}", 1L, 0),
                QueueItem("2", "daily_activity", "upsert", "{\"day\":\"2026-11-04\",\"seconds\":10}", 1L, 0),
            ),
        )
        val q = st.enqueueMany(
            "u-1",
            listOf(
                // Kalit bir xil — eski element o'rniga yangisi (last-write-wins).
                QueueItem("3", "user_settings", "upsert", "{\"user_id\":\"u-1\",\"daily_minutes\":120}", 2L, 0),
            ),
        )
        // Veb `storage.ts::enqueueMany`: eskisi OLIB TASHLANADI, yangisi
        // navbat OXIRIGA qo'shiladi (`next = [...kept, ...fresh]`). Shuning
        // uchun birinchi o'rinda eski `daily_activity` qatorq qoladi.
        assertEquals(2, q.size)
        assertEquals("2", q[0].id)
        assertEquals("3", q[1].id)
        assertTrue(q[1].payload.contains("120"))
        assertEquals(1, q.count { it.table == "user_settings" }) // takrorlanmadi
    }

    @Test
    fun itemsWithoutKeyAreAllKept() {
        val st = s()
        // `id` yo'q, jadval natural kalitsiz → deduplikat qilinmaydi.
        st.enqueueMany("u-1", listOf(QueueItem("1", "mystery_table", "upsert", "{\"a\":1}", 1L, 0)))
        val q = st.enqueueMany("u-1", listOf(QueueItem("2", "mystery_table", "upsert", "{\"a\":1}", 1L, 0)))
        assertEquals(2, q.size)
    }

    @Test
    fun queueSurvivesCorruption() {
        val kv = MemoryStore()
        kv.put(StoreKeys.queue("u-1"), "[]}")
        assertEquals(0, LocalStore(kv).loadQueue("u-1").size)
    }

    /* --------------------------------- iz -------------------------------- */

    @Test
    fun syncedTraceRoundTrip() {
        val st = s()
        assertTrue(st.loadSynced("u-1").isEmpty())
        st.saveSynced("u-1", mapOf("user_settings|uk:user" to "abc123"))
        assertEquals("abc123", st.loadSynced("u-1")["user_settings|uk:user"])
    }

    /* ----------------------------- logout ------------------------------- */

    @Test
    fun clearUserDataOnlyThisUser() {
        val st = s()
        st.saveData("u-1", AppData.empty("u-1"))
        st.saveData("u-2", AppData.empty("u-2"))
        st.updateQueue("u-1", listOf(QueueItem("1", "user_settings", "upsert", "{}", 1L, 0)))
        st.saveTimer("u-1", "{}")
        st.clearUserData("u-1")
        assertTrue(st.loadData("u-1").attempts.isEmpty())
        assertEquals(0, st.queueSize("u-1"))
        assertNull(st.loadTimer("u-1"))
        // Boshqa foydalanuvchi ma'lumoti o'rmgadi (xavfsizlik + UX).
        st.saveData("u-2", AppData.empty("u-2").copy(xp = 5))
        assertEquals(5, st.loadData("u-2").xp)
        assertFalse(st.loadData("u-2").userId.isBlank())
    }

    @Test
    fun timerAndDataUseSeparateKeys() {
        val kv = MemoryStore()
        val st = LocalStore(kv)
        st.saveTimer("u-1", """{"startedAt":1}""")
        st.saveData("u-1", AppData.empty("u-1"))
        assertNotNull(st.loadTimer("u-1"))
        assertNotNull(kv.get(StoreKeys.data("u-1")))
        // Taymer foydalanuvchi ma'lumoti emas — AppData'ga aralashmaydi.
        assertFalse(kv.get(StoreKeys.data("u-1"))!!.contains("startedAt"))
    }
}
