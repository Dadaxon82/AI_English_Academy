package com.dadaxon.aienglishacademy.sync

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AuthStore
import com.dadaxon.aienglishacademy.data.HttpResp
import com.dadaxon.aienglishacademy.data.HttpTransport
import com.dadaxon.aienglishacademy.data.LocalStore
import com.dadaxon.aienglishacademy.data.MemoryStore
import com.dadaxon.aienglishacademy.data.QueueItem
import com.dadaxon.aienglishacademy.data.Session
import com.dadaxon.aienglishacademy.data.SupabaseClient
import com.dadaxon.aienglishacademy.data.SupabaseConfig
import com.dadaxon.aienglishacademy.net.NetworkMonitor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Sinxron dvigateli: bo'laklash, xato tasnifi (qayta uriladi / rad etildi /
 * to'xtaydi), navbatning yo'qolmasligi. Tarmoq YO'Q — sun'iy transport.
 */
class SyncEngineTest {

    private class FakeTransport(private val handler: (String, String, String?) -> HttpResp) : HttpTransport {
        val calls = ArrayList<Triple<String, String, String?>>()
        override fun request(method: String, url: String, headers: Map<String, String>, body: String?): HttpResp {
            calls.add(Triple(method, url, body))
            return handler(method, url, body)
        }
    }

    private companion object {
        val CFG = SupabaseConfig("https://example.supabase.co", "anon-key")
    }

    private class Harness(
        handler: (String, String, String?) -> HttpResp = { _, _, _ -> HttpResp(201, "", null) },
        online: Boolean = true,
    ) {
        val transport = FakeTransport(handler)
        val client = SupabaseClient(CFG, transport)
        val kv = MemoryStore()
        val local = LocalStore(kv)
        val auth = AuthStore(kv, client)
        val protocol = SyncProtocol(local)
        val engine = SyncEngine(
            client = client,
            auth = auth,
            local = local,
            protocol = protocol,
            network = NetworkMonitor(null),
            dayIds = { listOf("a1-day-01", "a1-day-02") },
            online = { online },
        )

        init {
            auth.save(
                Session(
                    accessToken = "jwt", refreshToken = "r",
                    expiresAt = System.currentTimeMillis() / 1000 + 3600,
                    userId = "u-1", email = "a@b.c",
                ),
            )
        }
    }

    private fun item(table: String, payload: String, id: String = "x") =
        QueueItem(id = id, table = table, op = "upsert", payload = payload, at = 1L, tries = 0)

    /* ----------------------------- bo'laklash ----------------------------- */

    @Test
    fun chunkGroupsByTableAndCapsRows() {
        val h = Harness()
        val items = (0..149).map { item("exercise_attempts", "{\"id\":\"a$it\"}", "q$it") } +
            item("user_settings", "{\"user_id\":\"u-1\"}", "qs")
        val chunks = h.engine.chunkForBulk(items)
        // 150 attempt → 100 + 50; settings alohida guruh.
        assertEquals(3, chunks.size)
        assertEquals(100, chunks[0].size)
        assertEquals(50, chunks[1].size)
        assertEquals(1, chunks[2].size)
        assertTrue(chunks.all { it.map { x -> x.table }.distinct().size == 1 })
    }

    @Test
    fun chunkCapsCharacters() {
        val h = Harness()
        val big = (0..9).map { item("writing_submissions", "{\"id\":\"w$it\",\"text\":\"" + "y".repeat(40_000) + "\"}", "q$it") }
        val chunks = h.engine.chunkForBulk(big)
        // 250 000 belgi chegarasi: 6 × 40 000 = 240 000 → birinchi bo'lak 6 ta.
        assertEquals(2, chunks.size)
        assertEquals(6, chunks[0].size)
        assertEquals(4, chunks[1].size)
    }

    /* ------------------------------ yuborish ------------------------------ */

    @Test
    fun flushSendsAllQueueNotOnlyFirstEighty() {
        val h = Harness()
        val items = (0..119).map { item("exercise_attempts", "{\"id\":\"a$it\"}", "q$it") }
        h.local.enqueueMany("u-1", items)
        val st = h.engine.flush("u-1")
        assertTrue(st.ok)
        assertEquals(120, st.attempted)
        assertEquals(120, st.done)
        assertEquals(0, st.failed)
        assertEquals(0, h.local.queueSize("u-1"))
        // Bulk: 100 + 20 = ikkita POST (har biri bitta so'rov).
        assertEquals(2, h.transport.calls.count { it.first == "POST" })
    }

    @Test
    fun bulkUrlCarriesOnConflictAndPreferHeader() {
        val h = Harness()
        h.local.enqueueMany("u-1", listOf(
            item("user_vocabulary", "{\"user_id\":\"u-1\",\"vocabulary_id\":\"v1\"}", "q1"),
            item("user_vocabulary", "{\"user_id\":\"u-1\",\"vocabulary_id\":\"v2\"}", "q2"),
        ))
        h.engine.flush("u-1")
        val call = h.transport.calls.first { it.first == "POST" }
        assertTrue(call.second.contains("on_conflict=user_id,vocabulary_id"))
    }

    @Test
    fun transientFailureIsRequeuedAtTailWithTries() {
        val h = Harness(handler = { _, url, _ ->
            if (url.contains("exercise_attempts")) HttpResp(500, "{\"code\":\"XX\",\"message\":\"server xatosi\"}", null)
            else HttpResp(201, "", null)
        })
        h.local.enqueueMany("u-1", listOf(
            item("exercise_attempts", "{\"id\":\"a1\"}", "q1"),
            item("user_settings", "{\"user_id\":\"u-1\"}", "q2"),
        ))
        val st = h.engine.flush("u-1")
        assertFalse(st.ok)
        assertEquals(1, st.failed)
        assertEquals(1, st.done)
        val q = h.local.loadQueue("u-1")
        assertEquals(1, q.size)
        assertEquals("exercise_attempts", q[0].table)
        assertEquals(1, q[0].tries) // qayta urinish sanaldi
    }

    @Test
    fun permanentFailureIsDroppedNotRetried() {
        // 22/23/42 yoki PGRST1/PGRST2 — qayta urinish foydasiz.
        val h = Harness(handler = { _, _, _ -> HttpResp(400, "{\"code\":\"23502\",\"message\":\"not null\"}", null) })
        h.local.enqueueMany("u-1", listOf(item("exercise_attempts", "{\"id\":\"a1\"}", "q1")))
        val st = h.engine.flush("u-1")
        assertEquals(1, st.rejected)
        assertEquals(0, st.failed)
        assertEquals(0, h.local.queueSize("u-1"))
    }

    @Test
    fun foreignKeyFailureStaysRetryable() {
        val h = Harness(handler = { _, _, _ -> HttpResp(400, "{\"code\":\"23503\",\"message\":\"fk\"}", null) })
        h.local.enqueueMany("u-1", listOf(item("exercise_attempts", "{\"id\":\"a1\"}", "q1")))
        val st = h.engine.flush("u-1")
        assertEquals(0, st.rejected)
        assertEquals(1, st.failed)
        assertEquals(1, h.local.queueSize("u-1"))
    }

    @Test
    fun networkFailureStopsRunAndKeepsData() {
        val h = Harness(handler = { _, _, _ -> HttpResp(0, "", "Unable to resolve host") })
        h.local.enqueueMany("u-1", listOf(
            item("exercise_attempts", "{\"id\":\"a1\"}", "q1"),
            item("user_settings", "{\"user_id\":\"u-1\"}", "q2"),
        ))
        val st = h.engine.flush("u-1")
        assertFalse(st.ok)
        assertEquals(2, st.failed)
        assertEquals(2, h.local.queueSize("u-1")) // ma'lumot yo'qolmadi
        // Tarmoq yiqilganda keyingi bo'laklar uchun so'rov YUBORILMAYDI.
        assertEquals(1, h.transport.calls.size)
    }

    @Test
    fun offlineDoesNotSendAnything() {
        val h = Harness(online = false)
        h.local.enqueueMany("u-1", listOf(item("user_settings", "{\"user_id\":\"u-1\"}", "q1")))
        val st = h.engine.flush("u-1")
        assertEquals(0, st.attempted)
        assertTrue(h.transport.calls.isEmpty())
        assertNotNull(st.reasonUz)
        assertTrue(st.reasonUz!!.contains("Internet"))
    }

    @Test
    fun unconfiguredClientReportsHonestly() {
        val kv = MemoryStore()
        val local = LocalStore(kv)
        val engine = SyncEngine(
            client = null,
            auth = AuthStore(kv, null),
            local = local,
            protocol = SyncProtocol(local),
            network = NetworkMonitor(null),
            dayIds = { emptyList() },
        )
        val st = engine.flush("u-1")
        assertFalse(engine.configured)
        assertEquals(0, st.attempted)
        assertNotNull(st.reasonUz)
    }

    @Test
    fun guestSessionIsNotPushed() {
        val h = Harness()
        h.auth.clear()
        val st = h.engine.flush("u-9")
        assertEquals(0, st.attempted)
        assertNotNull(st.reasonUz)
        assertTrue(h.transport.calls.isEmpty())
    }

    @Test
    fun singleRowChunkStillUsesUpsert() {
        val h = Harness()
        h.local.enqueueMany("u-1", listOf(item("user_settings", "{\"user_id\":\"u-1\",\"daily_minutes\":90}", "q1")))
        val st = h.engine.flush("u-1")
        assertTrue(st.ok)
        val call = h.transport.calls.single()
        assertEquals("POST", call.first)
        assertTrue(call.second.contains("on_conflict=user_id"))
    }

    @Test
    fun traceIsWrittenAfterSuccess() {
        val h = Harness()
        val it = item("user_settings", "{\"user_id\":\"u-1\",\"daily_minutes\":90}", "q1")
        h.local.enqueueMany("u-1", listOf(it))
        h.engine.flush("u-1")
        val trace = h.local.loadSynced("u-1")
        assertEquals(1, trace.size)
        assertEquals(h.protocol.fingerprint(it.payload), trace["user_settings|uk:user"])
    }

    @Test
    fun failedRowFallsBackToPerRowSending() {
        // Bo'lakdagi BITTA yaroqsiz qator butun so'rovni yiqitadi:
        // qatorlar alohida yuborilib, aybdor ajratiladi (veb siyosati).
        var bulk = true
        val h = Harness(handler = { _, url, body ->
            when {
                !url.contains("exercise_attempts") -> HttpResp(201, "", null)
                // Birinchi chaqiruv — bulk (3 qator bir so'rovda): aybdor bor, rad etiladi.
                bulk -> {
                    bulk = false
                    HttpResp(400, "{\"code\":\"22001\",\"message\":\"too long\"}", null)
                }
                // Keyin qatorlar alohida yuboriladi: "bad" rad, qolganlari qabul.
                body != null && body.contains("bad") ->
                    HttpResp(400, "{\"code\":\"22001\",\"message\":\"too long\"}", null)
                else -> HttpResp(201, "", null)
            }
        })
        h.local.enqueueMany("u-1", listOf(
            item("exercise_attempts", "{\"id\":\"ok1\"}", "q1"),
            item("exercise_attempts", "{\"id\":\"bad\"}", "q2"),
            item("exercise_attempts", "{\"id\":\"ok2\"}", "q3"),
        ))
        val st = h.engine.flush("u-1")
        assertEquals(2, st.done)
        assertEquals(1, st.rejected)
        assertEquals(0, st.failed)
        assertEquals(0, h.local.queueSize("u-1"))
    }

    /* ------------------------------ xato tasnifi -------------------------- */

    @Test
    fun errorClassification() {
        assertFalse(SyncEngine.isPermanent(null))
        assertTrue(SyncEngine.isPermanent("22001"))
        assertTrue(SyncEngine.isPermanent("23505"))
        assertFalse(SyncEngine.isPermanent("23503")) // FK — keyin o'tishi mumkin
        assertTrue(SyncEngine.isPermanent("42501"))
        assertTrue(SyncEngine.isPermanent("PGRST116"))
        assertTrue(SyncEngine.isPermanent("PGRST202"))
        assertFalse(SyncEngine.isPermanent("PGRST301"))
        assertTrue(SyncEngine.stopsRun(null))
        assertTrue(SyncEngine.stopsRun("PGRST301"))
        assertFalse(SyncEngine.stopsRun("23505"))
    }

    /* ------------------------- baza ESKI sxemada (veb bilan bir) ----------
     * `scripts/check_supabase_schema.py` jonli bazada o'lchadi (2026-11-08):
     * `0003_motion.sql` / `0004_weekly_xp.sql` qo'llanmagan — `weekly_xp` yozuvi
     * 404 PGRST205, `user_settings`da `motion_enabled / xp_goal_xp /
     * hearts_enabled` ustunlari yo'q (PGRST204). Mobil ilova ham shu javoblarda
     * ma'lumotni saqlab qolishi, sababni ochiq aytishi va migratsiyadan keyin
     * o'zi tuzalishi shu testlarda talab qilinadi.
     */

    @Test
    fun schemaMissingClassificationMatchesLiveCodes() {
        assertTrue(SyncEngine.isSchemaMissing("PGRST204"))
        assertTrue(SyncEngine.isSchemaMissing("PGRST205")) // jadval yo'q (jonli o'lchov)
        assertTrue(SyncEngine.isSchemaMissing("42703"))    // ustun yo'q (jonli o'lchov)
        assertFalse(SyncEngine.isSchemaMissing("23505"))
        assertFalse(SyncEngine.isSchemaMissing(null))
        // So'z chegarasi: `xp` `xp_goal_xp` ichiga kirmasin (`_` — so'z belgisi).
        assertTrue(SyncEngine.mentionsColumn("the column xp_goal_xp does not exist", "xp_goal_xp"))
        assertFalse(SyncEngine.mentionsColumn("the column xp_goal_xp does not exist", "xp"))
        assertFalse(SyncEngine.mentionsColumn(null, "motion_enabled"))
    }

    @Test
    fun weeklyXpMissingTableStaysQueuedAndResendsAfterMigration() {
        var migrated = false
        val h = Harness(handler = { m, url, _ ->
            if (m == "POST" && url.contains("/rest/v1/weekly_xp")) {
                if (migrated) HttpResp(201, "", null)
                else HttpResp(404, "{\"code\":\"PGRST205\",\"message\":\"Could not find the table 'public.weekly_xp' in the schema cache\"}", null)
            } else {
                HttpResp(201, "", null)
            }
        })
        val weekly = item(
            "weekly_xp",
            "{\"user_id\":\"u-1\",\"week_start\":\"2026-11-02\",\"xp\":120,\"league_id\":\"bronze\",\"display_name\":\"Aziz\"}",
            "qw",
        )
        val settings = item("user_settings", "{\"user_id\":\"u-1\",\"daily_minutes\":90}", "qs")
        h.local.enqueueMany("u-1", listOf(weekly, settings))
        val st = h.engine.flush("u-1")
        assertFalse(st.ok)
        assertEquals(1, st.done)
        assertEquals(1, st.failed)
        assertEquals(0, st.rejected) // "jadval yo'q" — qabul qilmadi emas, kutadi
        val q = h.local.loadQueue("u-1")
        assertEquals(1, q.size)
        assertEquals("weekly_xp", q[0].table) // qator NAVBATDA qoldi (izi yozilmadi)
        assertNotNull(st.reasonUz)
        assertTrue(st.reasonUz!!.contains("0004_weekly_xp.sql"))
        assertTrue(st.reasonUz!!.contains("SQL Editor"))

        // Migratsiya bajarildi — qator O'ZI qayta yuboriladi.
        migrated = true
        val again = h.engine.flush("u-1")
        assertTrue(again.ok)
        assertEquals(1, again.done)
        assertEquals(0, h.local.queueSize("u-1"))
    }

    @Test
    fun oldSchemaSettingsStillLandWithNamedColumnsDropped() {
        // PostgREST har safar BITTA yo'q ustunni aytadi — mijoz o'shani tushiradi.
        val h = Harness(handler = { m, url, body ->
            if (m != "POST" || !url.contains("/rest/v1/user_settings")) HttpResp(201, "", null)
            else {
                val col = listOf("motion_enabled", "xp_goal_xp", "hearts_enabled").firstOrNull { body != null && body.contains(it) }
                if (col == null) HttpResp(201, "", null)
                else HttpResp(400, "{\"code\":\"PGRST204\",\"message\":\"Could not find the '$col' column of 'public.user_settings' in the schema cache\"}", null)
            }
        })
        val payload = "{\"user_id\":\"u-1\",\"daily_minutes\":120,\"motion_enabled\":false,\"xp_goal_xp\":100,\"hearts_enabled\":true}"
        h.local.enqueueMany("u-1", listOf(item("user_settings", payload, "qs")))
        val st = h.engine.flush("u-1")
        assertTrue(st.ok) // yozuv YETIB BORDI — faqat 3 ustun tushdi
        assertEquals(1, st.done)
        assertEquals(0, h.local.queueSize("u-1"))
        val last = h.transport.calls.filter { it.first == "POST" && it.second.contains("/rest/v1/user_settings") }.last()
        assertNotNull(last.third)
        assertTrue(last.third!!.contains("daily_minutes"))
        for (col in listOf("motion_enabled", "xp_goal_xp", "hearts_enabled")) {
            assertFalse("$col tushirilishi kerak", last.third!!.contains(col))
        }
        // Sabab konkret: migratsiya fayllari va ustun nomlari.
        assertNotNull(st.reasonUz)
        assertTrue(st.reasonUz!!.contains("0003_motion.sql"))
        assertTrue(st.reasonUz!!.contains("0004_weekly_xp.sql"))
        // Iz HAQIQIY yuborilgan (qisqartirilgan) qator bo'yicha — shunda
        // migratsiyadan keyin qator o'zi qayta yuboriladi.
        val trace = h.local.loadSynced("u-1")
        assertEquals(1, trace.size)
        assertNotEquals(h.protocol.fingerprint(payload), trace["user_settings|uk:user"])
    }

    @Test
    fun unknownColumnFaultIsRejectedNotSilentlyDegraded() {
        // Matn BIZNI ustunni aytmaydi → hech narsa tushirilmaydi, yozuv ochiq
        // rad etilgan deb sanaladi (jimgina yo'qotish YO'Q).
        val h = Harness(handler = { _, _, _ ->
            HttpResp(
                400,
                "{\"code\":\"PGRST204\",\"message\":\"Could not find the 'quantum_mode' column of 'public.user_settings' in the schema cache\"}",
                null,
            )
        })
        h.local.enqueueMany("u-1", listOf(item("user_settings", "{\"user_id\":\"u-1\",\"daily_minutes\":90,\"motion_enabled\":true}", "qs")))
        val st = h.engine.flush("u-1")
        assertEquals(1, st.rejected)
        assertEquals(0, st.failed)
        assertEquals(0, h.local.queueSize("u-1"))
        assertNotNull(st.reasonUz)
        assertTrue(st.reasonUz!!.contains("qabul qilmadi"))
        assertFalse(st.reasonUz!!.contains("migratsiya"))
    }

    @Test
    fun pullKeepsWorkingWhenLeagueTablesAreMissing() {
        // `weekly_xp` / `profiles` bazada yo'q (404 PGRST205) — o'qish YIQILMAYNDI:
        // progress qaytadi, liga maydoni bo'sh qoladi (eski snapshot saqlanadi,
        // son ixtir qilinmaydi).
        val h = Harness(handler = { m, url, _ ->
            when {
                m != "GET" -> HttpResp(201, "", null)
                url.contains("/rest/v1/user_settings?") ->
                    HttpResp(200, "[{\"user_id\":\"u-1\",\"daily_minutes\":120,\"current_level\":\"A2\"}]", null)
                url.contains("/rest/v1/weekly_xp?") || url.contains("/rest/v1/profiles?") ->
                    HttpResp(404, "{\"code\":\"PGRST205\",\"message\":\"Could not find the table 'public.weekly_xp' in the schema cache\"}", null)
                else -> HttpResp(200, "[]", null)
            }
        })
        val pr = h.engine.pullRemote("u-1")
        assertTrue(pr.ok)
        assertEquals(120, pr.snapshot!!.settings!!.dailyMinutes)
        assertNull(pr.snapshot!!.league)
        assertEquals("", pr.snapshot!!.profileName)
    }

    /* ------------------------- pull / merge (veb bilan bir) --------------- */

    @Test
    fun pullParsesRemoteRowsAndMerges() {
        val rows = mapOf(
            "user_settings" to "[{\"user_id\":\"u-1\",\"daily_minutes\":120,\"current_level\":\"A2\",\"target_level\":\"B1\",\"theme\":\"dark\",\"ai_enabled\":false}]",
            "learning_plans" to "[{\"id\":\"p1\",\"plan\":{\"path\":{\"completedDays\":[\"a1-day-01\"],\"passedTests\":{\"t1\":80},\"currentDayId\":\"a1-day-02\"},\"xp\":340,\"onboardedAt\":1000}}]",
            "exercise_attempts" to "[{\"id\":\"r1\",\"exercise_id\":\"ex1\",\"skill\":\"reading\",\"level\":\"A1\",\"correct\":true,\"partial_score\":1,\"difficulty\":1,\"seconds_spent\":9,\"source\":\"practice\",\"answer_text\":\"b\",\"created_at\":\"2026-11-01T10:00:00.000Z\"}]",
            "user_vocabulary" to "[{\"vocabulary_id\":\"v9\",\"due_at\":\"2026-12-01T00:00:00.000Z\",\"interval_days\":4,\"ease\":2.5,\"reps\":3,\"lapses\":0,\"updated_at\":\"2026-11-02T00:00:00.000Z\"}]",
            "daily_activity" to "[{\"day\":\"2026-11-01\",\"seconds\":600,\"attempts\":5,\"correct\":4,\"new_words\":2,\"reviewed_words\":1,\"skills\":{\"reading\":600}}]",
            "writing_submissions" to "[]",
            "speaking_sessions" to "[]",
            "mock_exam_attempts" to "[]",
        )
        val h = Harness(handler = { method, url, _ ->
            if (method != "GET") HttpResp(201, "", null)
            else {
                val t = rows.entries.firstOrNull { url.contains("/rest/v1/${it.key}?") }
                if (t == null) HttpResp(404, "{}", null) else HttpResp(200, t.value, null)
            }
        })
        val pr = h.engine.pullRemote("u-1")
        assertTrue(pr.ok)
        val snap = pr.snapshot!!
        assertEquals(120, snap.settings!!.dailyMinutes)
        assertEquals(listOf("a1-day-01"), snap.plan!!.path!!.completedDays)
        assertEquals(1, snap.attempts.size)
        assertEquals(3, snap.srs["v9"]!!.reps)
        // Qurilma holatga birlashtirilib saqlanadi:
        h.local.saveData("u-1", AppData.empty("u-1"))
        val st = h.engine.syncNow("u-1")
        assertTrue(st.pulled)
        val saved = h.local.loadData("u-1")
        assertEquals(340, saved.xp)
        assertEquals(120, saved.settings.dailyMinutes) // pristine → server sozlamasi
        assertEquals(listOf("a1-day-01"), saved.path.completedDays)
        assertEquals("a1-day-02", saved.path.currentDayId) // kunlar ro'yxatidan
        assertNotNull(st)
        assertNull(st.reasonUz)
    }

    @Test
    fun pullRejectsOtherUsersSession() {
        val h = Harness()
        val pr = h.engine.pullRemote("boshqa-foydalanuvchi")
        assertFalse(pr.ok)
        assertNotNull(pr.reasonUz)
    }

    @Test
    fun pullFailsHonestlyWhenServerError() {
        val h = Harness(handler = { _, _, _ -> HttpResp(500, "{\"code\":\"XX\",\"message\":\"x\"}", null) })
        val pr = h.engine.pullRemote("u-1")
        assertFalse(pr.ok)
        assertNotNull(pr.reasonUz)
    }

    @Test
    fun syncNowPullFailureKeepsPushResult() {
        val h = Harness(handler = { m, _, _ -> if (m == "GET") HttpResp(500, "{}", null) else HttpResp(201, "", null) })
        h.local.enqueueMany("u-1", listOf(item("user_settings", "{\"user_id\":\"u-1\",\"daily_minutes\":90}", "q1")))
        val st = h.engine.syncNow("u-1")
        assertTrue(st.ok) // push bo'lgan
        assertFalse(st.pulled)
        assertTrue(st.reasonUz!!.contains("Serverdan"))
    }

    @Test
    fun localEditWinsOverServerForSameAttemptId() {
        // Birlashma qoidasi: `id` bo'yicha lokal ustun ( audio belgisi va h.k.).
        val h = Harness(handler = { m, url, _ ->
            when {
                m != "GET" -> HttpResp(201, "", null)
                url.contains("/rest/v1/exercise_attempts?") -> HttpResp(200, "[{\"id\":\"a1\",\"exercise_id\":\"ex1\",\"skill\":\"reading\",\"level\":\"A1\",\"correct\":false,\"partial_score\":0,\"difficulty\":1,\"seconds_spent\":3,\"source\":\"practice\",\"answer_text\":\"\",\"created_at\":\"2026-11-01T10:00:00.000Z\"}]", null)
                else -> HttpResp(200, "[]", null)
            }
        })
        h.local.saveData(
            "u-1",
            AppData.empty("u-1").copy(
                attempts = listOf(
                    com.dadaxon.aienglishacademy.data.AttemptRecord(
                        "a1", "ex1", "reading", "A1", true, 1.0, 1, 9, "practice", "b",
                        1730000000000L,
                    ),
                ),
            ),
        )
        h.engine.syncNow("u-1")
        val saved = h.local.loadData("u-1")
        assertEquals(1, saved.attempts.size)
        assertTrue(saved.attempts[0].correct) // local ustun
    }
}
