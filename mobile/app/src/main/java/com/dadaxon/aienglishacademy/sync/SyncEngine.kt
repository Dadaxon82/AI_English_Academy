package com.dadaxon.aienglishacademy.sync

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.AuthStore
import com.dadaxon.aienglishacademy.data.BadgeAward
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.DiagnosticResult
import com.dadaxon.aienglishacademy.data.ExerciseResult
import com.dadaxon.aienglishacademy.data.GameConfig
import com.dadaxon.aienglishacademy.data.LeagueRow
import com.dadaxon.aienglishacademy.data.LocalStore
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.MockExamAttempt
import com.dadaxon.aienglishacademy.data.MockSectionResult
import com.dadaxon.aienglishacademy.data.QueueItem
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.SpeakingAnalysis
import com.dadaxon.aienglishacademy.data.SpeakingSession
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.SupabaseClient
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.data.WritingAnalysis
import com.dadaxon.aienglishacademy.data.WritingSubmission
import com.dadaxon.aienglishacademy.data.clampDailyMinutes
import com.dadaxon.aienglishacademy.data.todayKey
import com.dadaxon.aienglishacademy.net.NetworkMonitor
import com.dadaxon.aienglishacademy.domain.GameLogic
import com.dadaxon.aienglishacademy.domain.RemoteLeague
import com.dadaxon.aienglishacademy.domain.RemotePath
import com.dadaxon.aienglishacademy.domain.RemotePlan
import com.dadaxon.aienglishacademy.domain.RemoteSnapshot
import com.dadaxon.aienglishacademy.domain.mergeRemote
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser

/**
 * Navbatni yuborish va serverdan o'qish — veb `src/lib/sync.ts` ning
 * `syncNow` / `pullRemote` qismlarining ko'chirmasi.
 *
 * Siyosat:
 *  - Internet yo'qligini aniq ko'rsatish (buni ilova UI'da ko'rsatadi).
 *  - Navbat xavfsiz boshqariladi: xato bo'lsa qayta urinishlar sanaladi,
 *    ma'lumot yo'qolmaydi.
 *  - RLS: foydalanuvchi FAQAT o'z qatorini yozadi/o'qiydi (anon bilan).
 *    Shuning uchun barcha so'rovlarda user_id = sessionUserId.
 *  - Bitta "sinxronizatsiya" butun navbatni yuboradi.
 */
data class SyncStats(
    val ok: Boolean,
    val attempted: Int,
    val done: Int,
    /** Vaqtinchalik xato — navbatda qoldi, keyingi sinxronda qayta uriladi */
    val failed: Int,
    /** Server qabul qilmadi (ma'lumot/cheklov/ruxsat xatosi) — qayta urinish foydasiz */
    val rejected: Int,
    val pulled: Boolean,
    val reasonUz: String?,
)

class SyncEngine(
    private val client: SupabaseClient?,
    private val auth: AuthStore,
    private val local: LocalStore,
    private val protocol: SyncProtocol,
    private val network: NetworkMonitor,
    /** Joriy daraja kunlari id tartibi (merge'da currentDayId uchun). */
    private val dayIds: (level: String) -> List<String>,
    /** Tarmoq tekshiruvi — sinovda sun'iy "internet yo'q" holati uchun ochiq. */
    private val online: () -> Boolean = { network.isOnline() },
) {
    companion object {
        /** Bitta so'rovdagi qatorlar chegarasi (PostgREST bulk upsert). */
        const val BULK_ROWS = 100
        const val BULK_CHARS = 250_000

        /** Qayta urinishdan foyda yo'q xatolar: ma'lumot (22…), cheklov (23…),
         * huquq/sxema (42…) va so'rov (PGRST1…/PGRST2…) xatolari.
         * 23503 (FK) bundan mustasno — bog'liq qator keyin yozilsa o'tishi mumkin. */
        fun isPermanent(code: String?): Boolean {
            if (code == null || code == "23503") return false
            return Regex("^(22|23|42)").containsMatchIn(code) || Regex("^PGRST[12]").containsMatchIn(code)
        }

        /** Tarmoq (kodsiz) yoki sessiya/JWT (PGRST3…) xatosi — qolgan so'rovlar
         * ham yiqiladi, to'xtaymiz. */
        fun stopsRun(code: String?): Boolean = code == null || Regex("^PGRST3").containsMatchIn(code)

        /** `user_vocabulary.ease` uchun standart (veb `START_EASE`). */
        const val START_EASE_FALLBACK = 2.5

        /* ---------- baza sxemasi eski bo'lsa (veb `sync.ts` bilan BIR XIL) ----------
         * 2026-11-08 jonli o'lchov: `weekly_xp` → 404 PGRST205,
         * `user_settings.motion_enabled / xp_goal_xp / hearts_enabled` → 400 42703.
         * Bunday holda:
         *  a) rad etilgan ustunlar so'rovdan tushirib qo'yiladi (eski bazaga ham
         *     yozuv yetadi, keyin migratsiya qilinsa iz mos kelmaydi — qator
         *     avtomatik qayta yuboriladi);
         *  b) jadval yo'q bo'lsa yozuv NAVBATDA qoladi va sababi ochiq aytiladi;
         *  c) o'qishda jadval yo'q bo'lsa liga maydoni birlashtirilmaydi.
         */

        /** Migratsiyaga bog'liq jadvallar: jadval bo'lmasa yozuv/liga imkonsiz. */
        val TABLE_REQUIRES_MIGRATION: Map<String, String> = mapOf("weekly_xp" to "0004_weekly_xp.sql")

        /** Migratsiya qo'shgan IXTIYORIY ustunlar: yo'q bo'lsa so'rovdan tushiriladi. */
        val OPTIONAL_COLUMNS: Map<String, Map<String, String>> = mapOf(
            "user_settings" to mapOf(
                "motion_enabled" to "0003_motion.sql",
                "xp_goal_xp" to "0004_weekly_xp.sql",
                "hearts_enabled" to "0004_weekly_xp.sql",
            ),
        )

        /** PostgREST/Postgres "jadval yoki ustun topilmadi" xatolari (o'lchangan kodlar). */
        fun isSchemaMissing(code: String?): Boolean =
            code == "PGRST204" || code == "PGRST205" || code == "42703" || code == "42P01"

        /** Ustun nomini xatolik matnidan topish (so'z chegarasi bilan — `xp`
         * `xp_goal_xp` ichiga kirmasin: `_` ham so'z belgisi). */
        fun mentionsColumn(message: String?, column: String): Boolean {
            if (message.isNullOrEmpty()) return false
            return Regex("(?i)\\b${Regex.escape(column)}\\b").containsMatchIn(message)
        }
    }

    /** Bir sinxron davomida yig'ilgan "baza eski" sabablari (migratsiya nomlari). */
    private class SchemaNotes {
        private val missing = LinkedHashMap<String, MutableSet<String>>()

        /** Jadval nomiga ko'ra sabab (konkret ustun noma'lum bo'lsa). */
        fun noteTable(table: String) {
            val m = TABLE_REQUIRES_MIGRATION[table] ?: return
            if (!missing.containsKey(m)) missing[m] = LinkedHashSet()
        }

        /** Rad etilgan konkret ustun sababi — xato matnidan ajratib oladi. */
        fun noteColumnsDropped(table: String, columns: Collection<String>, message: String?) {
            val allowed = OPTIONAL_COLUMNS[table] ?: return
            for (name in columns) {
                val migration = allowed[name] ?: continue
                if (!mentionsColumn(message, name)) continue
                val set = missing[migration] ?: LinkedHashSet<String>().also { missing[migration] = it }
                set.add(name)
            }
        }

        fun isEmpty(): Boolean = missing.isEmpty()

        fun text(): String = missing.entries.sortedBy { it.key }.map { (migration, columns) ->
            if (columns.isNotEmpty()) {
                "baza eski: $migration migratsiyasi qo‘llanmagan (${columns.sorted().joinToString(", ")} ustunlari yo‘q)"
            } else {
                "baza eski: jadval yo‘q — $migration migratsiyasi qo‘llanmagan"
            }
        }.joinToString("; ")
    }

    val configured: Boolean get() = client != null && client.isConfigured

    /* ---------------------------- yuborish ---------------------------- */

    /** Yozuvlarni jadval bo'yicha guruhlab, bulk so'rovlarga bo'lish. */
    fun chunkForBulk(items: List<QueueItem>): List<List<QueueItem>> {
        val groups = LinkedHashMap<String, MutableList<QueueItem>>()
        for (it in items) {
            val g = "${it.op}|${it.table}"
            groups.getOrPut(g) { ArrayList() }.add(it)
        }
        val out = ArrayList<List<QueueItem>>()
        for (list in groups.values) {
            var cur = ArrayList<QueueItem>()
            var chars = 0
            for (it in list) {
                val size = it.payload.length
                if (cur.isNotEmpty() && (cur.size >= BULK_ROWS || chars + size > BULK_CHARS)) {
                    out.add(cur)
                    cur = ArrayList()
                    chars = 0
                }
                cur.add(it)
                chars += size
            }
            if (cur.isNotEmpty()) out.add(cur)
        }
        return out
    }

    /**
     * Navbatni serverga yuborish. ESKI BUG (veb izohi): har chaqiruv faqat
     * navbat boshidagi 80 ta yozuvni olardi — qolganlari (lug'at, kunlik
     * faollik, yozish, mock…) serverga hech qachon yetmasdi. Endi butun navbat
     * bo'shatiladi.
     */
    fun flush(userId: String, maxItems: Int? = null): SyncStats {
        val empty = SyncStats(false, 0, 0, 0, 0, false, null)
        val sb = client
        if (!configured || sb == null) {
            return empty.copy(reasonUz = "Supabase sozlanmagan — ma’lumotlar qurilmada saqlanmoqda.")
        }
        if (!online()) {
            return empty.copy(reasonUz = "Internet yo‘q. Navbat saqlandi, ulanish qaytganda yuboriladi.")
        }
        val (session, authErr) = auth.ensureFresh()
        if (session == null) {
            return empty.copy(reasonUz = authErr ?: "Tizimga kirilmagan — sinxronlash to‘xtatildi.")
        }

        val queue = local.loadQueue(userId)
        val batch = queue.take(maxItems ?: queue.size)
        val synced = local.loadSynced(userId)
        var done = 0
        var rejected = 0
        var stopped = false
        val failures = ArrayList<QueueItem>()
        val notes = SchemaNotes()

        /**
         * Yozuv serverga yetdi. `sent` — HAQIQIY yuborilgan qator (eski sxemaga
         * moslashtirib ustun tushirib yuborsak izi SHU qator bo'yicha qo'yiladi).
         * Shunda migratsiya qo'llanilgach `queueAllData` izni mahalliy holat bilan
         * mos emas deb topadi va sozlamalarni o'zi qayta yuboradi.
         */
        fun markDone(item: QueueItem, sent: String? = null) {
            done++
            val k = protocol.fingerprintKey(item.table, item.payload)
            if (k != null) synced[k] = protocol.fingerprint(sent ?: item.payload)
        }

        fun fail(item: QueueItem, code: String?) {
            if (stopsRun(code)) stopped = true
            if (isPermanent(code)) rejected++ else failures.add(item.copy(tries = item.tries + 1))
        }

        /** Qatorni yoqib, ixtiyoriy ustunlarni o'chirish uchun nusxa (boshqa obyektni buzmasin). */
        fun copyRow(el: JsonElement): JsonObject {
            val src = if (el.isJsonObject) el.asJsonObject else JsonObject()
            return Gson().toJsonTree(src).asJsonObject
        }

        fun sendOne(item: QueueItem) {
            // Tarmoq/sessiya yiqilgan bo'lsa urinib o'tirmaymiz — keyingi sinxronda.
            if (stopped) {
                failures.add(item.copy(tries = item.tries + 1))
                return
            }
            if (item.op == "delete") {
                val id = runCatching {
                    JsonParser.parseString(item.payload).asJsonObject.get("id")?.asString
                }.getOrNull()
                val resDel =
                    if (id == null) DbFail
                    else sb.delete(item.table, "user_id=eq.$userId&id=eq.$id", session.accessToken)
                if (resDel.ok) markDone(item) else fail(item, resDel.code)
                return
            }

            val optional = OPTIONAL_COLUMNS[item.table]
            var row = copyRow(parseRow(item.payload))
            var res = sb.upsert(item.table, listOf(row), session.accessToken)
            var degraded = false

            // Baza eski: xatoda aytilgan ustunni tushirib qayta uriramiz. PostgREST
            // har urinishda BITTA ustunni aytadi, shuning uchun sikl ustunlar
            // soniga chegaralanadi (cheksiz takrorlanmasin).
            if (optional != null) {
                var guard = 0
                while (!res.ok && isSchemaMissing(res.code) && guard < optional.size) {
                    val dropped = degradedRow(item.table, row, res.errorUz)
                    if (dropped.isEmpty()) break
                    notes.noteColumnsDropped(item.table, dropped, res.errorUz)
                    degraded = true
                    res = sb.upsert(item.table, listOf(row), session.accessToken)
                    guard++
                }
            }

            if (res.ok) {
                // `sent` FAQAT ustun tushirilgan bo'lsa: aks holda iz asl payload
                // bo'yicha qo'yiladi (yo'q joyga iz qo'yish har sinxronda qatorni
                // qayta yuborishga olib kelardi).
                markDone(item, if (degraded) row.toString() else null)
                return
            }
            // Jadval butunlay yo'q (`weekly_xp` → PGRST205): qator NAVBATDA qoladi —
            // izi yozilmagani uchun migratsiya qo'llanilgach avtomatik qayta yuboriladi.
            if (isSchemaMissing(res.code) && TABLE_REQUIRES_MIGRATION.containsKey(item.table)) {
                notes.noteTable(item.table)
                failures.add(item.copy(tries = item.tries + 1))
                return
            }
            fail(item, res.code)
        }

        for (chunk in chunkForBulk(batch)) {
            if (stopped || chunk.size == 1 || chunk[0].op == "delete") {
                for (it in chunk) sendOne(it)
                continue
            }
            val table = chunk[0].table
            var rows = chunk.map { copyRow(parseRow(it.payload)) }
            var res = sb.upsert(table, rows, session.accessToken)
            var degraded = false

            // Baza eskiligi butun bo'lakka tegishli (bir jadval), shuning uchun
            // tushirilgan ustunlar bir marta HAMMA qatorga qo'llanadi.
            if (OPTIONAL_COLUMNS.containsKey(table)) {
                var guard = 0
                while (!res.ok && isSchemaMissing(res.code) && guard < OPTIONAL_COLUMNS.getValue(table).size) {
                    val dropped = degradedRow(table, rows[0], res.errorUz)
                    if (dropped.isEmpty()) break
                    notes.noteColumnsDropped(table, dropped, res.errorUz)
                    for (r in rows) degradedRow(table, r, res.errorUz)
                    degraded = true
                    res = sb.upsert(table, rows, session.accessToken)
                    guard++
                }
            }

            if (res.ok) {
                for ((index, it) in chunk.withIndex()) markDone(it, if (degraded) rows[index].toString() else null)
            } else if (stopsRun(res.code)) {
                // Tarmoq yoki sessiya xatosi: bu va qolgan bo'laklar keyingi sinxronda.
                stopped = true
                for (it in chunk) failures.add(it.copy(tries = it.tries + 1))
            } else if (isSchemaMissing(res.code) && TABLE_REQUIRES_MIGRATION.containsKey(table)) {
                // Jadval butunlay yo'q — butun bo'lak navbatda qoladi (izi yozilmaydi).
                notes.noteTable(table)
                for (it in chunk) failures.add(it.copy(tries = it.tries + 1))
            } else {
                // Bo'lakda bitta yaroqsiz qator butun so'rovni yiqitadi — qatorlarni
                // alohida yuborib, faqat aybdorini ajratamiz.
                for (it in chunk) sendOne(it)
            }
        }

        local.saveSynced(userId, synced)
        // Muvaffaqiyatsizlar navbatning oxiriga qo'yiladi (tartib saqlanadi).
        local.updateQueue(userId, queue.drop(batch.size) + failures)

        val failed = failures.size
        val reasons = ArrayList<String>()
        if (failed > 0) reasons.add("$failed ta yozuv yuborilmadi — keyingi sinxronda qayta uriladi.")
        if (rejected > 0) reasons.add("$rejected ta yozuvni server qabul qilmadi (ma’lumot yoki ruxsat xatosi).")
        // Sabab ochiq aytiladi: "qabul qilinmadi" yetarli emas — foydalanuvchi
        // nimani qilishi kerakligini bilishi kerak (SQL Editor'da migratsiya).
        if (!notes.isEmpty()) reasons.add("Baza eski sxemada — ${notes.text()}. Supabase SQL Editor’ida shu skriptni bir marta bajaring.")
        return SyncStats(
            ok = failed == 0 && rejected == 0,
            attempted = batch.size,
            done = done,
            failed = failed,
            rejected = rejected,
            pulled = false,
            reasonUz = reasons.joinToString(" ").ifEmpty { null },
        )
    }

    /**
     * Xatoda aytilgan ixtiyoriy ustunlarni qatordan O'CHIRADI (obyekt o'zgartiriladi)
     * va o'chirilgan ustun nomlarini qaytaradi.
     */
    private fun degradedRow(table: String, row: JsonObject, message: String?): List<String> {
        val allowed = OPTIONAL_COLUMNS[table] ?: return emptyList()
        val dropped = allowed.keys.filter { row.has(it) && mentionsColumn(message, it) }
        for (name in dropped) row.remove(name)
        return dropped
    }

    /** Butun holatni navbatga qo'yish (veb `queueAllData`). */
    fun pushAppData(data: AppData): Int = protocol.queueAllData(data)

    private val DbFail = com.dadaxon.aienglishacademy.data.DbResult(false, emptyList(), null, "id topilmadi")

    private fun parseRow(payloadJson: String): JsonElement =
        try {
            JsonParser.parseString(payloadJson)
        } catch (err: Exception) {
            JsonObject()
        }

    /* ------------------------------ o'qish ------------------------------ */

    data class PullResult(val ok: Boolean, val snapshot: RemoteSnapshot?, val reasonUz: String?)

    /** Foydalanuvchining serverdagi ma'lumotini o'qish (RLS: faqat o'z qatorlari). */
    fun pullRemote(userId: String): PullResult {
        val sb = client
        if (!configured || sb == null) return PullResult(false, null, "Supabase sozlanmagan.")
        if (!online()) return PullResult(false, null, "Internet yo‘q.")
        val (session, authErr) = auth.ensureFresh()
        // Boshqa foydalanuvchining sessiyasi bilan o'qilgan ma'lumot bu holatga aralashmasin.
        if (session == null || session.userId != userId) {
            return PullResult(false, null, authErr ?: "Tizimga kirilmagan.")
        }
        val failRead = PullResult(false, null, "Serverdagi ma’lumotni o‘qib bo‘lmadi.")
        val own = { table: String, query: String ->
            val q = "user_id=eq.$userId&$query".trimEnd('&')
            sb.select(table, q, session.accessToken)
        }
        val settings = own(SupabaseClient.Tables.USER_SETTINGS, "limit=1")
        val plan = own(SupabaseClient.Tables.LEARNING_PLANS, "order=updated_at.desc&limit=1")
        val attempts = own(SupabaseClient.Tables.EXERCISE_ATTEMPTS, "order=created_at.desc&limit=500")
        val vocabulary = own(SupabaseClient.Tables.USER_VOCABULARY, "limit=5000")
        val activity = own(SupabaseClient.Tables.DAILY_ACTIVITY, "order=day.desc&limit=400")
        val writing = own(SupabaseClient.Tables.WRITING_SUBMISSIONS, "order=created_at.desc&limit=100")
        val speaking = own(SupabaseClient.Tables.SPEAKING_SESSIONS, "order=created_at.desc&limit=100")
        val mocks = own(SupabaseClient.Tables.MOCK_EXAM_ATTEMPTS, "order=completed_at.desc&limit=20")
        if (listOf(settings, plan, attempts, vocabulary, activity, writing, speaking, mocks).any { !it.ok }) return failRead

        // --- O'yin qatlami o'qishlari (veb `pullRemote` ning 9–10-qadamlari) ---
        // Ikkalasi ham MAJBURIY EMAS: xato bo'lsa eski snapshot saqlanadi, son
        // ixtir QILINMAYDI (vebda ham `leagueRows` bo'sh qoladi).
        val profile = sb.select(SupabaseClient.Tables.PROFILES, "id=eq.$userId&limit=1", session.accessToken)
        val ownWeekly = own(SupabaseClient.Tables.WEEKLY_XP, "order=week_start.desc&limit=2")
        val leagueRows = ArrayList<JsonObject>()
        val latestOwn = if (ownWeekly.ok) {
            ownWeekly.rows
                .filter { str(it, "week_start") != null && str(it, "league_id") != null }
                .maxByOrNull { str(it, "week_start") ?: "" }
        } else {
            null
        }
        if (latestOwn != null) {
            // Liga tablasini o'qish IKKINCHI QADAM: hafta va liga id'si yuqoridagi
            // o'qishdan keladi (boshqa qurilmada yuborilgan hafta ham shu yerda).
            val week = str(latestOwn, "week_start")!!
            val leagueId = str(latestOwn, "league_id")!!
            val board = sb.select(
                SupabaseClient.Tables.WEEKLY_XP,
                "week_start=eq.$week&league_id=eq.$leagueId&order=xp.desc&limit=${GameConfig.LEAGUE_BOARD_SIZE}",
                session.accessToken,
            )
            if (board.ok) leagueRows.addAll(board.rows)
        }

        val current = local.loadData(userId)
        return PullResult(
            ok = true,
            reasonUz = null,
            snapshot = rowsToSnapshot(
                settings = settings.rows.firstOrNull(),
                plan = plan.rows.firstOrNull(),
                attempts = attempts.rows,
                vocabulary = vocabulary.rows,
                activity = activity.rows,
                writing = writing.rows,
                speaking = speaking.rows,
                mocks = mocks.rows,
                baseSettings = current.settings,
                profile = profile.rows.firstOrNull(),
                leagueRows = leagueRows,
                ownWeekly = if (ownWeekly.ok) ownWeekly.rows else emptyList(),
                today = todayKey(),
            ),
        )
    }

    /** Server ⇄ qurilma: pull → merge → saqlash. UI shu metodni chaqiradi. */
    fun syncNow(userId: String, forcePull: Boolean = true): SyncStats {
        val push = flush(userId)
        if (!configured) return push
        if (!forcePull && push.attempted == 0) return push
        val pr = pullRemote(userId)
        if (!pr.ok || pr.snapshot == null) {
            // Pull urnilmadi — push natijasi yuboriladi (ma'lumot yo'qolmaydi).
            return push.copy(
                pulled = false,
                ok = push.ok,
                reasonUz = listOfNotNull(push.reasonUz, pr.reasonUz?.let { "Serverdan o'qib bo'lmadi: $it" })
                    .joinToString(" ").ifEmpty { null },
            )
        }
        val localData = local.loadData(userId)
        val merged = mergeRemote(localData, pr.snapshot, dayIds(localData.settings.currentLevel))
        local.saveData(userId, merged)
        val reasons = ArrayList<String>()
        push.reasonUz?.let { reasons.add(it) }
        return push.copy(
            ok = push.ok,
            pulled = true,
            reasonUz = reasons.joinToString(" ").ifEmpty { null },
        )
    }

    /* ---------------- qatorlar → ilova tiplari (veb sync.ts) ------------ */

    /** DB qatorlarini ilova tiplariga aylantirish (yaroqsiz qatorlar tashlanadi). */
    fun rowsToSnapshot(
        settings: JsonObject?,
        plan: JsonObject?,
        attempts: List<JsonObject>,
        vocabulary: List<JsonObject>,
        activity: List<JsonObject>,
        writing: List<JsonObject>,
        speaking: List<JsonObject>,
        mocks: List<JsonObject>,
        baseSettings: UserSettings,
        profile: JsonObject? = null,
        leagueRows: List<JsonObject> = emptyList(),
        ownWeekly: List<JsonObject> = emptyList(),
        today: String = todayKey(),
    ): RemoteSnapshot {
        val srs = LinkedHashMap<String, SrsState>()
        for (r in vocabulary) {
            val id = str(r, "vocabulary_id") ?: continue
            val dueAt = time(r, "due_at") ?: continue
            srs[id] = SrsState(
                learnedAt = time(r, "learned_at"),
                dueAt = dueAt,
                intervalDays = num(r, "interval_days", 0.0).toInt(),
                ease = num(r, "ease", START_EASE_FALLBACK),
                reps = num(r, "reps", 0.0).toInt(),
                lapses = num(r, "lapses", 0.0).toInt(),
                // Oxirgi takror vaqti — boshqa qurilmadagi holat bilan solishtirishda kerak.
                lastReviewedAt = time(r, "updated_at"),
            )
        }
        val act = LinkedHashMap<String, DayActivity>()
        for (r in activity) {
            val day = str(r, "day") ?: continue
            if (!Regex("""^\d{4}-\d{2}-\d{2}$""").matches(day)) continue
            val skills = LinkedHashMap<String, Int>()
            for ((k, v) in numRecord(obj(r, "skills"))) if (Skills.ALL.contains(k)) skills[k] = v.toInt()
            act[day] = DayActivity(
                date = day,
                seconds = num(r, "seconds", 0.0).toInt(),
                attempts = num(r, "attempts", 0.0).toInt(),
                correct = num(r, "correct", 0.0).toInt(),
                newWords = num(r, "new_words", 0.0).toInt(),
                reviewedWords = num(r, "reviewed_words", 0.0).toInt(),
                skills = skills,
            )
        }

        val att = attempts.mapNotNull { r ->
            val id = str(r, "id") ?: return@mapNotNull null
            val ex = str(r, "exercise_id") ?: return@mapNotNull null
            val at = time(r, "created_at") ?: return@mapNotNull null
            val skill = str(r, "skill")?.takeIf { Skills.ALL.contains(it) } ?: return@mapNotNull null
            val level = str(r, "level")?.takeIf { Levels.ALL.contains(it) } ?: return@mapNotNull null
            val source = str(r, "source")?.takeIf {
                it == "practice" || it == "section_test" || it == "mock_exam" || it == "diagnostic"
            } ?: return@mapNotNull null
            AttemptRecord(
                id = id,
                exerciseId = ex,
                skill = skill,
                level = level,
                correct = bool(r, "correct"),
                partial = num(r, "partial_score", 0.0),
                difficulty = num(r, "difficulty", 1.0).toInt(),
                secondsSpent = num(r, "seconds_spent", 0.0).toInt(),
                source = source,
                answerGiven = str(r, "answer_text") ?: "",
                at = at,
            )
        }.sortedBy { it.at }

        val wr = writing.mapNotNull { r ->
            val id = str(r, "id") ?: return@mapNotNull null
            val taskId = str(r, "task_id") ?: return@mapNotNull null
            val text = str(r, "text") ?: return@mapNotNull null
            val at = time(r, "created_at") ?: return@mapNotNull null
            WritingSubmission(
                id = id,
                taskId = taskId,
                text = text,
                wordCount = num(r, "word_count", 0.0).toInt(),
                secondsSpent = num(r, "seconds_spent", 0.0).toInt(),
                analysis = writingAnalysis(obj(r, "analysis")),
                supersedesId = str(r, "supersedes_id"),
                createdAt = at,
            )
        }.sortedBy { it.createdAt }

        val sp = speaking.mapNotNull { r ->
            val id = str(r, "id") ?: return@mapNotNull null
            val taskId = str(r, "task_id") ?: return@mapNotNull null
            val at = time(r, "created_at") ?: return@mapNotNull null
            val engine = when (str(r, "transcription_engine")) {
                "browser-speech", "device-speech", "ai" -> str(r, "transcription_engine")!!
                else -> "none"
            }
            SpeakingSession(
                id = id,
                taskId = taskId,
                // Audio serverga hech qachon yuborilmaydi — bu qurilmada ham yo'q.
                audioBlobStored = false,
                durationSec = num(r, "duration_sec", 0.0).toInt(),
                transcript = str(r, "transcript"),
                transcriptionEngine = engine,
                analysis = speakingAnalysis(obj(r, "analysis")),
                textAnswer = str(r, "text_answer"),
                createdAt = at,
            )
        }.sortedBy { it.createdAt }

        val mk = mocks.mapNotNull { r ->
            val id = str(r, "id") ?: return@mapNotNull null
            val examId = str(r, "exam_id") ?: return@mapNotNull null
            val at = time(r, "completed_at") ?: return@mapNotNull null
            // Aniq label: tashqi lambda ham `mapNotNull` — bir xil nomli label
            // chalkashadi (Kotlin ogohlantiradi). Bu yerdagi qaytish FAQAT
            // shu ichki bo'lim sikliga tegishli bo'lishi shart.
            val sections = arr(r, "sections").mapNotNull sectionsLoop@ { el ->
                if (!el.isJsonObject) return@sectionsLoop null
                val o = el.asJsonObject
                val sectionId = str(o, "sectionId") ?: return@sectionsLoop null
                val skill = str(o, "skill")?.takeIf { Skills.CORE.contains(it) } ?: return@sectionsLoop null
                val results = obj(o, "exerciseResults") ?: return@sectionsLoop null
                val er = LinkedHashMap<String, ExerciseResult>()
                for ((k, v) in results.entrySet()) {
                    if (!v.isJsonObject) continue
                    val vo = v.asJsonObject
                    er[k] = ExerciseResult(bool(vo, "correct"), str(vo, "given") ?: "")
                }
                MockSectionResult(
                    sectionId = sectionId,
                    skill = skill,
                    answered = num(o, "answered", 0.0).toInt(),
                    total = num(o, "total", 0.0).toInt(),
                    score = if (o.get("score") == null || o.get("score").isJsonNull) null else num(o, "score", 0.0),
                    startedAt = num(o, "startedAt", 0.0).toLong(),
                    finishedAt = num(o, "finishedAt", 0.0).toLong(),
                    secondsUsed = if (o.get("secondsUsed") == null || o.get("secondsUsed").isJsonNull) null
                    else num(o, "secondsUsed", 0.0).toInt(),
                    exerciseResults = er,
                )
            }
            MockExamAttempt(
                id = id,
                examId = examId,
                sections = sections,
                totalScore = if (r.get("total_score") == null || r.get("total_score").isJsonNull) null else num(r, "total_score", 0.0),
                speakingAdvisory = str(r, "speaking_advisory") ?: "",
                completedAt = at,
            )
        }.sortedBy { it.completedAt }

        return RemoteSnapshot(
            settings = settingsFromRow(settings, baseSettings),
            plan = planFromRow(plan, today),
            attempts = att,
            srs = srs,
            activity = act,
            writing = wr,
            speaking = sp,
            mockAttempts = mk,
            // Liga: o'sha haftadagi o'sha ligamız qatorlari (barcha a'zolar —
            // RLSdagi "read league mates" siyosati). Bo'sh bo'lsa `null` —
            // eski snapshot saqlanadi, son ixtir qilinmaydi.
            league = buildLeagueRead(leagueRows, ownWeekly),
            // Profil nomi — `profiles.display_name` (qator bo'lmasa bo'sh satr;
            // `mergeRemote` bo'sh kelsa LOCAL ismni saqlaydi).
            profileName = profile?.let { str(it, "display_name") }?.take(60) ?: "",
        )
    }

    /**
     * O'qilgan qatorlardan liga tablasi (veb `sync.ts::buildLeagueRead`).
     * Biz hali bu haftani yubormagan bo'lsak (`ownWeekly` bo'sh) — o'z ligamiz
     * aniq EMAS, tablani o'qishning ma'nosi yo'q: `null` qaytadi va eski
     * snapshot saqlanadi (son ixtir qilinmaydi).
     */
    private fun buildLeagueRead(leagueRows: List<JsonObject>, ownWeekly: List<JsonObject>): RemoteLeague? {
        val ownRows = ownWeekly.filter { str(it, "week_start") != null && str(it, "league_id") != null }
        if (ownRows.isEmpty()) return null
        val board = leagueRows.mapNotNull { r ->
            val userId = str(r, "user_id") ?: return@mapNotNull null
            LeagueRow(userId, str(r, "display_name") ?: "", num(r, "xp", 0.0).coerceAtLeast(0.0).toInt())
        }.sortedByDescending { it.xp }.take(GameConfig.LEAGUE_BOARD_SIZE)
        if (board.isEmpty()) return null
        val latest = ownRows.maxByOrNull { str(it, "week_start") ?: "" }!!
        return RemoteLeague(
            weekStart = str(latest, "week_start")!!,
            leagueId = GameConfig.leagueById(str(latest, "league_id") ?: "bronze").id,
            entries = board,
        )
    }

    /**
     * `user_settings` qatorini `UserSettings`ga aylantirish. Vebda bu
     * `Partial<UserSettings>` — qatorda BO'LMAGAN maydon lokal qiymatda qoladi,
     * shuning uchun asos sifatida `base` (lokal sozlama) beriladi.
     */
    private fun settingsFromRow(r: JsonObject?, base: UserSettings): UserSettings? {
        if (r == null) return null
        var out = base
        r.get("daily_minutes")?.takeIf { !it.isJsonNull }?.let { out = out.copy(dailyMinutes = clampDailyMinutes(num(r, "daily_minutes", 90.0).toInt())) }
        str(r, "current_level")?.takeIf { Levels.ALL.contains(it) }?.let { out = out.copy(currentLevel = it) }
        str(r, "target_level")?.takeIf { Levels.ALL.contains(it) }?.let { out = out.copy(targetLevel = it) }
        out = out.copy(examDate = str(r, "exam_date"))
        obj(r, "allocation")?.let { a ->
            val m = numRecord(a)
            if (Skills.ALL.all { m.containsKey(it) }) {
                out = out.copy(allocation = Skills.ALL.associateWith { m[it]!!.toInt() })
            }
        }
        when (str(r, "theme")) {
            com.dadaxon.aienglishacademy.data.THEME_LIGHT -> out = out.withTheme(com.dadaxon.aienglishacademy.data.THEME_LIGHT)
            com.dadaxon.aienglishacademy.data.THEME_DARK -> out = out.withTheme(com.dadaxon.aienglishacademy.data.THEME_DARK)
            com.dadaxon.aienglishacademy.data.THEME_SYSTEM -> out = out.withTheme(com.dadaxon.aienglishacademy.data.THEME_SYSTEM)
        }
        if (r.get("ai_enabled") != null && !r.get("ai_enabled").isJsonNull) {
            out = out.copy(aiEnabled = r.get("ai_enabled").asBoolean)
        }
        // Qatorda ustun bo'lmasa (migratsiya qollanilmagan baza) LOCAL qiymat
        // saqlanadi — jimgina "o'chiq" bo'lib qolmaydi.
        r.get("motion_enabled")?.takeIf { !it.isJsonNull }?.let { out = out.copy(motionEnabled = it.asBoolean) }
        // O'yin sozlamalari (`0004_weekly_xp.sql`). `xp_goal_xp` eng yaqin
        // bosqichga qaytariladi: DB CHECK ham bosqichlarni tekshiradi, lekin
        // eski/boshqa bazadan kelgan son lokal qoidani buzmasligi kerak.
        if (r.get("xp_goal_xp") != null && !r.get("xp_goal_xp").isJsonNull) {
            val v = num(r, "xp_goal_xp", Double.NaN)
            if (!v.isNaN() && !v.isInfinite()) out = out.copy(xpGoalXp = GameConfig.nearestXpGoal(v.toInt()))
        }
        r.get("hearts_enabled")?.takeIf { it.isJsonPrimitive && !it.isJsonNull }?.let {
            out = out.copy(heartsEnabled = it.asBoolean)
        }
        return out
    }

    private fun planFromRow(r: JsonObject?, today: String = todayKey()): RemotePlan? {
        if (r == null) return null
        val p = obj(r, "plan") ?: return null
        var path: RemotePath? = null
        obj(p, "path")?.let { po ->
            arr(po, "completedDays").let { cd ->
                val days = cd.filter { it.isJsonPrimitive }.map { it.asString }
                val tests = numRecord(obj(po, "passedTests"))
                    .filterKeys { true }
                    .mapValues { it.value.toInt() }
                path = RemotePath(
                    completedDays = days,
                    passedTests = tests,
                    currentDayId = str(po, "currentDayId") ?: "a1-day-01",
                )
            }
        }
        val xp = p.get("xp")?.takeIf { !it.isJsonNull }?.let { num(p, "xp", 0.0).toInt() }
        val onboardedAt = p.get("onboardedAt")?.takeIf { !it.isJsonNull }?.let { num(p, "onboardedAt", 0.0).toLong() }
        val diag = obj(p, "diagnostic")?.takeIf { it.get("at") != null && !it.get("at").isJsonNull }?.let { d ->
            DiagnosticResult(
                at = num(d, "at", 0.0).toLong(),
                level = str(d, "level")?.takeIf { Levels.ALL.contains(it) },
                labelUz = str(d, "labelUz") ?: "",
                confidence = num(d, "confidence", 0.0),
            )
        }
        // Nishonlar (yutuqlar) — `plan.badges`; `id` bo'yicha birlashma
        // `mergeGame`/`mergeRemote` da bo'ladi.
        val badges = arr(p, "badges").mapNotNull { el ->
            if (!el.isJsonObject) return@mapNotNull null
            val o = el.asJsonObject
            val id = str(o, "id") ?: return@mapNotNull null
            BadgeAward(id, str(o, "titleUz") ?: "", num(o, "at", 0.0).toLong())
        }
        // O'yin qatlami — `normalizeGameJson` har bir sonni chegaralaydi
        // (serverdagi jsonb tashqi ma'lumot: ishonchli holatga keltirilmasa
        // o'yin hisoblashlari buziladi).
        val game = obj(p, "game")?.let { GameLogic.normalizeGameJson(it, today) }
        return RemotePlan(
            path = path,
            xp = xp,
            diagnostic = diag,
            onboardedAt = onboardedAt,
            badges = badges,
            game = game,
        )
    }

    private fun writingAnalysis(v: JsonObject?): WritingAnalysis? {
        if (v == null || obj(v, "criteriaScores") == null) return null
        if (!listOf("errors", "strengthsUz", "weaknessesUz", "suggestionsUz").all { arr(v, it).isJsonArray }) return null
        val crit = obj(v, "criteriaScores")!!.entrySet().associate { (k, e) -> k to (if (e.isJsonPrimitive) e.asDouble else 0.0) }
        return WritingAnalysis(
            engine = str(v, "engine") ?: "rule-based",
            criteriaScores = crit,
            errors = arr(v, "errors").mapNotNull { e ->
                if (!e.isJsonObject) return@mapNotNull null
                val o = e.asJsonObject
                com.dadaxon.aienglishacademy.data.WritingError(
                    excerpt = str(o, "excerpt") ?: "",
                    kind = str(o, "kind") ?: "",
                    correction = str(o, "correction") ?: "",
                    whyUz = str(o, "whyUz") ?: "",
                )
            },
            strengthsUz = arr(v, "strengthsUz").mapNotNull { if (it.isJsonPrimitive) it.asString else null },
            weaknessesUz = arr(v, "weaknessesUz").mapNotNull { if (it.isJsonPrimitive) it.asString else null },
            suggestionsUz = arr(v, "suggestionsUz").mapNotNull { if (it.isJsonPrimitive) it.asString else null },
            wordCount = num(v, "word_count", 0.0).toInt(),
        )
    }

    private fun speakingAnalysis(v: JsonObject?): SpeakingAnalysis? {
        if (v == null || !arr(v, "notesUz").isJsonArray) return null
        if (!listOf("fluency", "lexis", "grammar", "length").all { v.get(it) != null && v.get(it).isJsonPrimitive }) return null
        return SpeakingAnalysis(
            engine = str(v, "engine") ?: "rule-based",
            mode = str(v, "mode") ?: "audio",
            fluency = v.get("fluency").asDouble,
            lexis = v.get("lexis").asDouble,
            grammar = v.get("grammar").asDouble,
            length = v.get("length").asDouble,
            wordCount = num(v, "wordCount", 0.0).toInt(),
            wpm = num(v, "wpm", 0.0),
            notesUz = arr(v, "notesUz").mapNotNull { if (it.isJsonPrimitive) it.asString else null },
            disclaimerUz = str(v, "disclaimerUz") ?: "",
        )
    }

    /* ------------------------ kichik yordamchilar ----------------------- */

    private fun obj(o: JsonObject?, key: String): JsonObject? {
        val el = o?.get(key) ?: return null
        return if (el.isJsonObject) el.asJsonObject else null
    }

    private fun arr(o: JsonObject?, key: String): JsonArray {
        val el = o?.get(key) ?: return JsonArray()
        return if (el.isJsonArray) el.asJsonArray else JsonArray()
    }

    private fun str(o: JsonObject, key: String): String? {
        val el = o.get(key) ?: return null
        return if (el.isJsonPrimitive && !el.isJsonNull) el.asString else null
    }

    private fun bool(o: JsonObject, key: String): Boolean = o.get(key)?.takeIf { it.isJsonPrimitive }?.asBoolean == true

    private fun num(o: JsonObject, key: String, fallback: Double): Double {
        val el = o.get(key) ?: return fallback
        if (!el.isJsonPrimitive || el.isJsonNull) return fallback
        return try {
            el.asDouble
        } catch (err: Exception) {
            fallback
        }
    }

    private fun time(o: JsonObject, key: String): Long? = IsoTime.parse(str(o, key))

    private fun numRecord(v: JsonObject?): Map<String, Double> {
        val out = LinkedHashMap<String, Double>()
        if (v == null) return out
        for ((k, e) in v.entrySet()) {
            if (e.isJsonPrimitive && !e.isJsonNull) {
                val d = try {
                    e.asDouble
                } catch (err: Exception) {
                    continue
                }
                if (!d.isNaN() && !d.isInfinite()) out[k] = d
            }
        }
        return out
    }
}
