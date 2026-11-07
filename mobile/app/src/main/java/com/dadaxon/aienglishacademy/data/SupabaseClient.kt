package com.dadaxon.aienglishacademy.data

import com.dadaxon.aienglishacademy.BuildConfig
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.Base64

/**
 * Supabase bilan ishlaydigan eng past qatlam.
 *
 * Veb manbasi: `src/lib/supabase.ts` (@supabase/supabase-js) + `src/lib/sync.ts`
 * so'rov shakllari. Android tomonda Supabase SDK **ishlatilmagan** (oflayn
 * gradle kechasida yo'q), shuning uchun PostgREST va `auth/v1` so'rovlari
 * `HttpURLConnection` + Gson bilan qo'lda yozildi — JSON/HTTP formati veb bilan
 * bir xil, chunki ikkala ilova BIR bazaga yozadi.
 */

/** HTTP transport abstraksiyasi — unit testlarda sun'iy transport ishlatiladi. */
interface HttpTransport {
    /**
     * @return javob; tarmoq yiqilsa `error` bilan (status = 0).
     */
    fun request(method: String, url: String, headers: Map<String, String>, body: String?): HttpResp
}

data class HttpResp(val status: Int, val body: String, val error: String? = null) {
    val ok: Boolean get() = error == null && status in 200..299
}

/** Real transport (Android/JVM). Ulashish va o'qish cheklovlari bilan. */
class UrlConnectionTransport : HttpTransport {
    override fun request(method: String, url: String, headers: Map<String, String>, body: String?): HttpResp {
        var conn: HttpURLConnection? = null
        try {
            conn = URL(url).openConnection() as HttpURLConnection
            conn.requestMethod = method
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000
            conn.instanceFollowRedirects = true
            for ((k, v) in headers) conn.setRequestProperty(k, v)
            if (body != null) {
                conn.doOutput = true
                conn.outputStream.use { os ->
                    OutputStreamWriter(os, StandardCharsets.UTF_8).use { it.write(body) }
                }
            }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else (conn.errorStream ?: conn.inputStream)
            val text = stream?.bufferedReader(StandardCharsets.UTF_8)?.use(BufferedReader::readText) ?: ""
            return HttpResp(status, text, null)
        } catch (err: Exception) {
            return HttpResp(0, "", err.message ?: err.javaClass.simpleName)
        } finally {
            conn?.disconnect()
        }
    }
}

/** Sozlash. Bo'sh/noteskis bo'lsa `null` qaytadi → ilova mehmon rejimida ishlaydi. */
data class SupabaseConfig(val url: String, val anonKey: String) {
    val isConfigured: Boolean
        get() = url.isNotBlank() && anonKey.isNotBlank() &&
            (url.startsWith("https://") || url.startsWith("http://"))

    fun rest(table: String): String = "${url.trimEnd('/')}/rest/v1/$table"
    fun auth(path: String): String = "${url.trimEnd('/')}/auth/v1/$path"

    companion object {
        /** `BuildConfig.SUPABASE_URL / SUPABASE_ANON_KEY` dan (bo'sh bo'lsa null). */
        fun fromBuildConfig(): SupabaseConfig? {
            val c = SupabaseConfig(BuildConfig.SUPABASE_URL.trim(), BuildConfig.SUPABASE_ANON_KEY.trim())
            return if (c.isConfigured) c else null
        }
    }
}

/** Auth sessiyasi (JWT). `expiresAt` — sekundlarda (JWT `exp`). */
data class Session(
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: Long,
    val userId: String,
    val email: String? = null,
) {
    fun isExpired(nowSec: Long = System.currentTimeMillis() / 1000L): Boolean =
        expiresAt <= 0L || expiresAt - nowSec < 60L
}

/** Xabarlarni xavfsiz matnga aylantirish — veb `supabase.ts::safeErrorMessage`. */
object AuthErrors {
    fun safe(status: Int, body: String): String {
        val msg = body.lowercase()
        return when {
            status == 401 || msg.contains("invalid login") || msg.contains("invalid credentials") ->
                "Email yoki parol noto‘g‘ri."
            msg.contains("network") || msg.contains("failed to fetch") || msg.contains("unable to resolve host") ->
                "Internet aloqasi yo‘q. Ulanishni tekshiring."
            msg.contains("rate") || msg.contains("twice an hour") ->
                "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring."
            msg.contains("already registered") || msg.contains("already exists") ->
                "Bu email allaqachon ro‘yxatdan o‘tgan."
            msg.contains("confirm") ->
                "Emailingizni tasdiqlang. Kelgan xatni tekshiring."
            else -> "Noma'lum xatolik. Qayta urinib ko'ring."
        }
    }
}

/**
 * PostgREST + `auth/v1` mijoz. Faqat ANON kalit ishlatiladi — RLS tufayli
 * foydalanuvchi FAQAT o'z qatorini o'qiydi/yozadi (veb bilan bir xil siyosat).
 */
class SupabaseClient(
    val config: SupabaseConfig,
    private val transport: HttpTransport = UrlConnectionTransport(),
    private val gson: Gson = Gson(),
) {
    val isConfigured: Boolean get() = config.isConfigured

    /** Jadvallar va ularning upsert konflikt kaliti (DB PK/lar bilan bir xil). */
    object Tables {
        const val USER_SETTINGS = "user_settings"
        const val LEARNING_PLANS = "learning_plans"
        const val EXERCISE_ATTEMPTS = "exercise_attempts"
        const val USER_VOCABULARY = "user_vocabulary"
        const val DAILY_ACTIVITY = "daily_activity"
        const val WRITING_SUBMISSIONS = "writing_submissions"
        const val SPEAKING_SESSIONS = "speaking_sessions"
        const val MOCK_EXAM_ATTEMPTS = "mock_exam_attempts"
        /**
         * Haftalik XP ligasi (`supabase/migrations/0004_weekly_xp.sql`).
         * PK — `(user_id, week_start)`: hafta davomida bitta qator yangilanadi.
         */
        const val WEEKLY_XP = "weekly_xp"

        /** `profiles` — hisob qatori (`display_name` ligaga kerak). */
        const val PROFILES = "profiles"

        /** `on_conflict` — PostgREST'ga konflikt kalitini ko'rsatish (0001_init.sql PKlari). */
        val ON_CONFLICT: Map<String, String> = mapOf(
            USER_SETTINGS to "user_id",
            LEARNING_PLANS to "id",
            EXERCISE_ATTEMPTS to "id",
            USER_VOCABULARY to "user_id,vocabulary_id",
            DAILY_ACTIVITY to "user_id,day",
            WRITING_SUBMISSIONS to "id",
            SPEAKING_SESSIONS to "id",
            MOCK_EXAM_ATTEMPTS to "id",
            WEEKLY_XP to "user_id,week_start",
        )

        /**
         * Foydalanuvchining SHAXSIY jadvallari — veb `sync.ts::PERSONAL_TABLES`
         * bilan bir xil ro'yxat ("Barcha ma'lumotni o'chirish" shularni
         * tozalaydi). `profiles` qatori qoldiriladi — u hisobning o'zi (auth
         * bilan bog'langan). Ro'yxatga yangi jadval qo'shilsa, veb tomondagi
         * ro'yxat ham yangilanishi shart (aks holda bir qurilmada o'chirilgan
         * ma'lumot ikkinchisidan qaytib keladi).
         */
        val PERSONAL_TABLES: List<String> = listOf(
            EXERCISE_ATTEMPTS,
            USER_VOCABULARY,
            DAILY_ACTIVITY,
            WRITING_SUBMISSIONS,
            SPEAKING_SESSIONS,
            MOCK_EXAM_ATTEMPTS,
            LEARNING_PLANS,
            USER_SETTINGS,
            WEEKLY_XP,
        )
    }

    private fun baseHeaders(session: String?): Map<String, String> {
        val h = linkedMapOf(
            "apikey" to config.anonKey,
            "x-application-name" to "ai-english-academy", // veb: global headers
        )
        if (!session.isNullOrEmpty()) h["Authorization"] = "Bearer $session"
        return h
    }

    /* ---------------------------- o'qish/yozish ---------------------------- */

    /** `GET <table>?<query>` — qatorlar ro'yxati. Xato bo'lsa `DbResult.error`. */
    fun select(table: String, query: String, session: String?): DbResult {
        val url = config.rest(table) + (if (query.isEmpty()) "" else "?$query")
        val headers = baseHeaders(session) + mapOf(
            "Accept" to "application/json",
            "Content-Type" to "application/json",
        )
        val resp = transport.request("GET", url, headers, null)
        return parseRows(resp)
    }

    /**
     * `POST <table>?on_conflict=…` bulk upsert. `Prefer: return=minimal` —
     * server javobda qator qaytarmaydi (tezrok, veb shunday yuboradi).
     */
    fun upsert(table: String, rows: List<JsonElement>, session: String?, onConflict: String? = null): DbResult {
        if (rows.isEmpty()) return DbResult(true, emptyList(), null, null)
        val q = ArrayList<String>()
        q += "on_conflict=" + (onConflict ?: Tables.ON_CONFLICT[table] ?: "id")
        val url = config.rest(table) + "?" + q.joinToString("&")
        val headers = baseHeaders(session) + mapOf(
            "Content-Type" to "application/json",
            "Prefer" to "return=minimal,resolution=merge-duplicates",
        )
        val body = if (rows.size == 1) gson.toJson(rows[0]) else gson.toJson(rows)
        val resp = transport.request("POST", url, headers, body)
        return parseRows(resp)
    }

    /** `DELETE <table>?<filter>` — vebdagi `delete().eq(...)`. */
    fun delete(table: String, filter: String, session: String?): DbResult {
        val url = config.rest(table) + "?" + filter
        val headers = baseHeaders(session) + mapOf("Prefer" to "return=minimal")
        val resp = transport.request("DELETE", url, headers, null)
        return parseRows(resp)
    }

    private fun parseRows(resp: HttpResp): DbResult {
        if (resp.error != null) return DbResult(false, emptyList(), null, resp.error)
        if (!resp.ok) {
            val (code, message) = parseError(resp.body)
            return DbResult(false, emptyList(), code, message ?: AuthErrors.safe(resp.status, resp.body))
        }
        val body = resp.body.trim()
        if (body.isEmpty()) return DbResult(true, emptyList(), null, null)
        return try {
            val el = JsonParser.parseString(body)
            val rows = when {
                el.isJsonArray -> el.asJsonArray.map { it.asJsonObject }
                el.isJsonObject -> listOf(el.asJsonObject)
                else -> emptyList()
            }
            DbResult(true, rows, null, null)
        } catch (err: Exception) {
            DbResult(false, emptyList(), null, "Server javobi o'qilmadi: ${err.message}")
        }
    }

    /** PostgREST xato jismidan `code` + `message` olish. */
    private fun parseError(body: String): Pair<String?, String?> {
        return try {
            val o = JsonParser.parseString(body).asJsonObject
            val code = o.get("code")?.takeIf { it.isJsonPrimitive }?.asString
            val message = o.get("message")?.takeIf { it.isJsonPrimitive }?.asString
            code to message
        } catch (err: Exception) {
            null to null
        }
    }

    /* -------------------------------- auth -------------------------------- */

    data class AuthResult(val session: Session?, val errorUz: String?, val status: Int)

    fun signUp(email: String, password: String, displayName: String?): AuthResult {
        val payload = JsonObject().apply {
            addProperty("email", email.trim())
            addProperty("password", password)
            if (!displayName.isNullOrBlank()) {
                val data = JsonObject()
                data.addProperty("display_name", displayName.trim())
                add("data", data)
            }
        }
        val resp = transport.request(
            "POST", config.auth("signup"),
            baseHeaders(null) + mapOf("Content-Type" to "application/json"),
            gson.toJson(payload),
        )
        return sessionFrom(resp)
    }

    fun signIn(email: String, password: String): AuthResult {
        val payload = JsonObject().apply {
            addProperty("email", email.trim())
            addProperty("password", password)
        }
        val resp = transport.request(
            "POST", config.auth("token?grant_type=password"),
            baseHeaders(null) + mapOf("Content-Type" to "application/json"),
            gson.toJson(payload),
        )
        return sessionFrom(resp)
    }

    fun refreshSession(refreshToken: String): AuthResult {
        val payload = JsonObject().apply { addProperty("refresh_token", refreshToken) }
        val resp = transport.request(
            "POST", config.auth("token?grant_type=refresh_token"),
            baseHeaders(null) + mapOf("Content-Type" to "application/json"),
            gson.toJson(payload),
        )
        return sessionFrom(resp)
    }

    fun signOut(accessToken: String): Boolean {
        val resp = transport.request("POST", config.auth("logout"), baseHeaders(accessToken), "{}")
        // Logout 204 qaytaradi; javobga qaramay lokal sessiya o'chiriladi.
        return resp.ok || resp.status == 204 || resp.status == 200
    }

    private fun sessionFrom(resp: HttpResp): AuthResult {
        if (resp.error != null) {
            return AuthResult(null, "Internet aloqasi yo‘q. Ulanishni tekshiring.", 0)
        }
        if (!resp.ok) {
            // `auth/v1` xatolari foydalanuvchiga TUSHUNARLI tilga o'giriladi
            // (veb `supabase.ts::safeErrorMessage` qoidasi bilan bir xil).
            return AuthResult(null, AuthErrors.safe(resp.status, resp.body), resp.status)
        }
        val s = parseSession(resp.body) ?: return AuthResult(
            null,
            AuthErrors.safe(resp.status, resp.body),
            resp.status,
        )
        return AuthResult(s, null, resp.status)
    }

    /**
     * `auth/v1` javobidan sessiya olish. `access_token` JWT'ining payload qismidan
     * `sub` (foydalanuvchi id) va `exp` (muddat) o'qiladi — veb SDK'ning ichki
     * jarayoni bilan bir xil (veb SDK tokenni o'zi yechadi).
     */
    private fun parseSession(body: String): Session? {
        return try {
            val o = JsonParser.parseString(body).asJsonObject
            val access = str(o, "access_token") ?: return null
            val refresh = str(o, "refresh_token") ?: return null
            val user = o.get("user")?.takeIf { it.isJsonObject }?.asJsonObject
            val claims = jwtClaims(access)
            val userId = claims.first ?: str(user, "id") ?: return null
            val email = str(user, "email") ?: str(claims.third, "email")
            val exp = claims.second ?: (System.currentTimeMillis() / 1000L + 3600L)
            Session(accessToken = access, refreshToken = refresh, expiresAt = exp, userId = userId, email = email)
        } catch (err: Exception) {
            null
        }
    }

    private fun str(o: JsonObject?, key: String): String? {
        val el = o?.get(key) ?: return null
        return if (el.isJsonNull || !el.isJsonPrimitive) null else el.asString
    }

    /** (sub, exp, butun payload). JWT buzilsa (null, null, null). */
    private fun jwtClaims(token: String): Triple<String?, Long?, JsonObject?> {
        val parts = token.split(".")
        if (parts.size < 2) return Triple(null, null, null)
        return try {
            val raw = Base64.getUrlDecoder().decode(padBase64(parts[1]))
            val o = JsonParser.parseString(String(raw, StandardCharsets.UTF_8)).asJsonObject
            val sub = str(o, "sub")
            val expEl = o.get("exp")
            val exp = if (expEl != null && expEl.isJsonPrimitive) expEl.asLong else null
            Triple(sub, exp, o)
        } catch (err: Exception) {
            Triple(null, null, null)
        }
    }

    private fun padBase64(s: String): String {
        val t = s.trimEnd('=')
        val mod = t.length % 4
        return if (mod == 0) t else t + "=".repeat(4 - mod)
    }

    /** JWT'dan foydalanuvchi id + muddat (AuthStore testlari uchun ochiq). */
    fun peekJwt(token: String): Pair<String?, Long?> {
        val c = jwtClaims(token)
        return c.first to c.second
    }
}

data class DbResult(
    val ok: Boolean,
    val rows: List<JsonObject>,
    /** PostgREST xato kodi (`23505`, `PGRST116`…) — tarmoq xatosida null. */
    val code: String?,
    val errorUz: String? = null,
)
