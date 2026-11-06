package com.dadaxon.aienglishacademy.sync

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.LocalStore
import com.dadaxon.aienglishacademy.data.MockExamAttempt
import com.dadaxon.aienglishacademy.data.QueueItem
import com.dadaxon.aienglishacademy.data.SpeakingSession
import com.dadaxon.aienglishacademy.data.SupabaseClient
import com.dadaxon.aienglishacademy.data.WritingSubmission
import com.dadaxon.aienglishacademy.data.clampDailyMinutes
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * AppData → DB yozuvlari (table, op, payload) — veb `src/lib/sync.ts::toQueueItems`
 * ning so'zma-so'z ko'chirilgan nusxasi.
 *
 * Diqqat: PostgREST ustun nomlarini **snake_case** kutadi. `settings` obyekti
 * (camelCase) to'g'ridan-to'g'ri yuborilsa so'rov "column not found" bilan
 * qaytadi va navbat hech qachon tozalanmaydi — shuning uchun maydonlar
 * bittalab aylantiriladi (vebdagi izoh shu xatoni yodda tutadi).
 */
data class QueueItemDraft(
    val table: String,
    val op: String,
    val payloadJson: String,
    val at: Long,
)

object IsoTime {
    /** Veb `toISOString` formati: `2026-11-04T12:00:00.000Z`. */
    private val FMT = DateTimeFormatter
        .ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        .withLocale(Locale.ROOT)
        .withZone(ZoneOffset.UTC)

    fun of(millis: Long): String = FMT.format(Instant.ofEpochMilli(millis))

    /** ISO/Postgres matnini milliskundiga; bo'lmasa yoki buzilsa `null`. */
    fun parse(text: String?): Long? {
        if (text.isNullOrBlank()) return null
        return try {
            Instant.parse(text).toEpochMilli()
        } catch (err: Exception) {
            try {
                Instant.from(FMT.parse(text)).toEpochMilli()
            } catch (err2: Exception) {
                null
            }
        }
    }
}

class SyncProtocol(
    private val store: LocalStore,
    private val gson: Gson = GsonBuilder().disableHtmlEscaping().create(),
) {
    private fun jsonToString(o: JsonObject): String = gson.toJson(o)

    private fun tree(v: Any?): JsonElement =
        if (v == null) JsonNull.INSTANCE else gson.toJsonTree(v)

    /** `exercise_attempts` — oxirgi 500 tasi (veb: `data.attempts.slice(-500)`). */
    private fun add(rows: MutableList<QueueItemDraft>, table: String, payload: JsonObject, at: Long) {
        rows.add(QueueItemDraft(table, "upsert", jsonToString(payload), at))
    }

    fun toQueueItems(data: AppData): List<QueueItemDraft> {
        val uid = data.userId
        val items = ArrayList<QueueItemDraft>()

        items += QueueItemDraft(
            SupabaseClient.Tables.USER_SETTINGS, "upsert",
            jsonToString(JsonObject().apply {
                put("user_id", uid)
                // DB CHECK (30..240) bilan bir xil chegara: eski keshdagi 15–25
                // daqiqa qiymati yozuvni abadiy rad ettirardi.
                put("daily_minutes", clampDailyMinutes(data.settings.dailyMinutes))
                put("current_level", data.settings.currentLevel)
                put("target_level", data.settings.targetLevel)
                putOrNull("exam_date", data.settings.examDate)
                put("allocation", tree(data.settings.allocation))
                put("theme", data.settings.theme)
                put("ai_enabled", data.settings.aiEnabled)
                // Harakat (animatsiya) holati — `motion_enabled` ustuni
                // `0003_motion.sql`da qo'shilgan. Bu maydon yuborilmasa
                // boshqa qurilmada yoqilgan/o'chirilgan holat yo'qolardi
                // (ikki tomonlama sinxron shart).
                put("motion_enabled", data.settings.motionEnabled)
            }),
            System.currentTimeMillis(),
        )

        // O'quv yo'li (tugatilgan kunlar, test ballari), XP va diagnostika
        // serverda boshqa joyda saqlanmaydi — `plan` jsonb ustuniga yoziladi,
        // aks holda boshqa qurilmada yoki qayta kirganda yo'qolardi. Shuning
        // uchun diagnostika topshirilmagan bo'lsa ham yuboriladi.
        //
        // PK default UUID bo'lgani uchun payload'da id bo'lmasa upsert har
        // safar yangi qator qo'shardi. Foydalanuvchiga bitta faol reja —
        // id'ni foydalanuvchi id'si bilan bir xil qilamiz (deterministik).
        items += QueueItemDraft(
            SupabaseClient.Tables.LEARNING_PLANS, "upsert",
            jsonToString(JsonObject().apply {
                put("id", uid)
                put("user_id", uid)
                put("current_level", data.settings.currentLevel)
                put("target_level", data.settings.targetLevel)
                putOrNull("diagnostic_level", data.diagnostic?.level)
                put("plan", JsonObject().apply {
                    put("path", tree(data.path))
                    put("xp", data.xp)
                    put("diagnostic", tree(data.diagnostic))
                    put("onboardedAt", tree(data.onboardedAt))
                })
            }),
            System.currentTimeMillis(),
        )

        for (a in data.attempts.takeLast(500)) {
            items += QueueItemDraft(
                SupabaseClient.Tables.EXERCISE_ATTEMPTS, "upsert",
                jsonToString(JsonObject().apply {
                    put("id", a.id)
                    put("user_id", uid)
                    put("exercise_id", a.exerciseId)
                    put("skill", a.skill)
                    put("level", a.level)
                    put("correct", a.correct)
                    put("partial_score", a.partial)
                    put("difficulty", a.difficulty)
                    put("seconds_spent", a.secondsSpent)
                    put("source", a.source)
                    put("answer_text", a.answerGiven.take(2000))
                    put("created_at", IsoTime.of(a.at))
                }),
                a.at,
            )
        }

        for ((vocabId, st) in data.srs) {
            items += QueueItemDraft(
                SupabaseClient.Tables.USER_VOCABULARY, "upsert",
                jsonToString(JsonObject().apply {
                    put("user_id", uid)
                    put("vocabulary_id", vocabId)
                    putIsoOrNull("learned_at", st.learnedAt)
                    put("due_at", IsoTime.of(st.dueAt))
                    put("interval_days", st.intervalDays)
                    put("ease", st.ease)
                    put("reps", st.reps)
                    put("lapses", st.lapses)
                    // Oxirgi takror vaqti — boshqa qurilmadagi holat bilan
                    // solishtirishda kerak.
                    put("updated_at", IsoTime.of(st.lastReviewedAt ?: st.dueAt))
                }),
                System.currentTimeMillis(),
            )
        }

        for ((date, act) in data.activity) {
            items += QueueItemDraft(
                SupabaseClient.Tables.DAILY_ACTIVITY, "upsert",
                jsonToString(JsonObject().apply {
                    put("user_id", uid)
                    put("day", date)
                    put("seconds", act.seconds)
                    put("attempts", act.attempts)
                    put("correct", act.correct)
                    put("new_words", act.newWords)
                    put("reviewed_words", act.reviewedWords)
                    put("skills", tree(act.skills))
                }),
                System.currentTimeMillis(),
            )
        }

        for (w in data.writing.takeLast(100)) addWriting(items, uid, w)
        for (s in data.speaking.takeLast(100)) addSpeaking(items, uid, s)
        for (m in data.mockAttempts.takeLast(20)) addMock(items, uid, m)

        return items
    }

    private fun addWriting(items: MutableList<QueueItemDraft>, uid: String, w: WritingSubmission) {
        items += QueueItemDraft(
            SupabaseClient.Tables.WRITING_SUBMISSIONS, "upsert",
            jsonToString(JsonObject().apply {
                put("id", w.id)
                put("user_id", uid)
                put("task_id", w.taskId)
                put("text", w.text.take(20_000))
                put("word_count", w.wordCount)
                put("seconds_spent", w.secondsSpent)
                put("analysis", tree(w.analysis))
                putOrNull("supersedes_id", w.supersedesId)
                put("created_at", IsoTime.of(w.createdAt))
            }),
            w.createdAt,
        )
    }

    private fun addSpeaking(items: MutableList<QueueItemDraft>, uid: String, s: SpeakingSession) {
        items += QueueItemDraft(
            SupabaseClient.Tables.SPEAKING_SESSIONS, "upsert",
            jsonToString(JsonObject().apply {
                put("id", s.id)
                put("user_id", uid)
                put("task_id", s.taskId)
                put("duration_sec", s.durationSec)
                // Ovoz fayli rozilikisiz serverga yuborilmaydi.
                put("audio_stored", false)
                putOrNull("transcript", s.transcript)
                put("transcription_engine", s.transcriptionEngine)
                put("analysis", tree(s.analysis))
                putOrNull("text_answer", s.textAnswer)
                put("created_at", IsoTime.of(s.createdAt))
            }),
            s.createdAt,
        )
    }

    private fun addMock(items: MutableList<QueueItemDraft>, uid: String, m: MockExamAttempt) {
        items += QueueItemDraft(
            SupabaseClient.Tables.MOCK_EXAM_ATTEMPTS, "upsert",
            jsonToString(JsonObject().apply {
                put("id", m.id)
                put("user_id", uid)
                put("exam_id", m.examId)
                put("sections", tree(m.sections))
                putNumberOrNull("total_score", m.totalScore)
                put("speaking_advisory", m.speakingAdvisory)
                put("completed_at", IsoTime.of(m.completedAt))
            }),
            m.completedAt,
        )
    }

    /* ------------------------- yuborilganlar izi ------------------------- */

    /**
     * Tez, kriptografik bo'lmagan 53-bit xesh (cyrb53) — faqat o'zgarishni
     * aniqlash uchun. Veb `hashString` ning to'liq ko'chirmasi (32-bit Int
     * amallari JS'dagidek o'raladi).
     */
    fun hashString(s: String): String {
        // Qiymatlar doim [0, 2^32) oralig'ida saqlanadi — SHUNDING UCHUN `ushr`
        // JS'dagi `>>>` (mantıqiy siljish) bilan aynan bir xil ishlaydi.
        var h1 = 0xdeadbeefL
        var h2 = 0x41c6ce57L
        for (ch in s) {
            val c = ch.code.toLong()
            h1 = imul(h1 xor c, 2654435761L)
            h2 = imul(h2 xor c, 1597334677L)
        }
        h1 = imul(h1 xor (h1 ushr 16), 2246822507L)
        h1 = h1 xor imul(h2 xor (h2 ushr 13), 3266489909L)
        h2 = imul(h2 xor (h2 ushr 16), 2246822507L)
        h2 = h2 xor imul(h1 xor (h1 ushr 13), 3266489909L)
        val v = ((h2 and 0x1FFFFFL) shl 32) or (h1 and 0xFFFFFFFFL)
        return v.toString(36)
    }

    /** JS `Math.imul` moslamasi: ko'paytmaning pastki 32 bitini belgisiz qaytaradi. */
    private fun imul(a: Long, b: Long): Long = (a * b) and 0xFFFFFFFFL

    /** Yozuvning barqaror kaliti (jadval + tabiiy kalit) — veb `fingerprintKey`. */
    fun fingerprintKey(table: String, payloadJson: String): String? {
        val k = store.dedupeKey(table, payloadJson) ?: return null
        return "$table|$k"
    }

    fun fingerprint(payloadJson: String): String = hashString(payloadJson)

    /** Veb `queueAllData`: butun holatni navbatga qo'yish (o'zgarmaganlar sizib). */
    fun queueAllData(data: AppData): Int {
        val all = toQueueItems(data)
        val synced = store.loadSynced(data.userId)
        // Serverda allaqachon AYNAN shu ko'rinishda bor yozuvlar (izi mos)
        // qayta navbatga qo'yilmaydi.
        val pending = all.filter {
            val k = fingerprintKey(it.table, it.payloadJson)
            k == null || synced[k] != fingerprint(it.payloadJson)
        }
        // Endi holatda yo'q yozuvlar izini tozalaymiz (masalan 500 tadan eski urinishlar).
        val live = all.mapNotNull { fingerprintKey(it.table, it.payloadJson) }.toHashSet()
        val kept = synced.entries.filter { live.contains(it.key) }
        if (kept.size != synced.size) store.saveSynced(data.userId, kept.associate { it.key to it.value })
        val stamp = System.currentTimeMillis()
        val uid = data.userId
        store.enqueueMany(
            uid,
            pending.mapIndexed { i, it ->
                QueueItem(
                    id = "${it.table}:$stamp:$i",
                    table = it.table,
                    op = it.op,
                    payload = it.payloadJson,
                    at = it.at,
                    tries = 0,
                )
            },
        )
        return pending.size
    }

    private fun JsonObject.put(key: String, value: String) = addProperty(key, value)
    private fun JsonObject.put(key: String, value: Boolean) = addProperty(key, value)
    private fun JsonObject.put(key: String, value: Number) = addProperty(key, value)
    private fun JsonObject.put(key: String, value: JsonElement) = add(key, value)
    private fun JsonObject.putOrNull(key: String, value: String?) {
        if (value == null) add(key, JsonNull.INSTANCE) else addProperty(key, value)
    }

    private fun JsonObject.putNumberOrNull(key: String, value: Double?) {
        if (value == null) add(key, JsonNull.INSTANCE) else addProperty(key, value)
    }

    private fun JsonObject.putIsoOrNull(key: String, value: Long?) {
        if (value == null) add(key, JsonNull.INSTANCE) else addProperty(key, IsoTime.of(value))
    }
}
