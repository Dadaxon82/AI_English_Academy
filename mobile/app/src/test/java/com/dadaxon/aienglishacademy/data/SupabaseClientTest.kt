package com.dadaxon.aienglishacademy.data

import com.google.gson.JsonParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * PostgREST/auth so'rovlarining shakli va xato talqini. Tarmoq YO'Q —
 * `HttpTransport` sun'iy.
 */
class SupabaseClientTest {

    private class Fixture(private val resp: (String, String, String?) -> HttpResp) : HttpTransport {
        val urls = ArrayList<String>()
        val bodies = ArrayList<String?>()
        val sentHeaders = ArrayList<Map<String, String>>()
        override fun request(method: String, url: String, headers: Map<String, String>, body: String?): HttpResp {
            urls.add("$method $url")
            bodies.add(body)
            sentHeaders.add(LinkedHashMap(headers))
            return resp(method, url, body)
        }
    }

    private val cfg = SupabaseConfig("https://proj.supabase.co", "anon-xyz")

    private fun client(r: (String, String, String?) -> HttpResp = { _, _, _ -> HttpResp(200, "[]", null) }) =
        SupabaseClient(cfg, Fixture(r))

    /* ------------------------------ sozlash ------------------------------ */

    @Test
    fun unconfiguredTreatedAsGuestMode() {
        assertFalse(SupabaseConfig("", "").isConfigured)
        assertFalse(SupabaseConfig("proj.supabase.co", "k").isConfigured) // https:// shart
        assertTrue(SupabaseConfig("https://x.co", "k").isConfigured)
    }

    /* ------------------------------ o'qish ------------------------------- */

    @Test
    fun selectUsesGetWithQueryAndBearer() {
        val f = Fixture { _, _, _ -> HttpResp(200, """[{"id":"a1"}]""", null) }
        val c = SupabaseClient(cfg, f)
        val r = c.select("exercise_attempts", "user_id=eq.u1&limit=5", "tok-1")
        assertTrue(r.ok)
        assertEquals(1, r.rows.size)
        assertEquals("GET https://proj.supabase.co/rest/v1/exercise_attempts?user_id=eq.u1&limit=5", f.urls[0])
        assertEquals("Bearer tok-1", f.sentHeaders[0]["Authorization"])
        assertEquals("anon-xyz", f.sentHeaders[0]["apikey"])
        assertEquals("ai-english-academy", f.sentHeaders[0]["x-application-name"])
    }

    @Test
    fun selectErrorParsesCodeAndMessage() {
        val c = client { _, _, _ -> HttpResp(406, """{"code":"42P01","message":"relation not found"}""", null) }
        val r = c.select("bogus", "", "t")
        assertFalse(r.ok)
        assertEquals("42P01", r.code)
        assertEquals("relation not found", r.errorUz)
    }

    @Test
    fun networkErrorHasNoCode() {
        val c = client { _, _, _ -> HttpResp(0, "", "Unable to resolve host") }
        val r = c.select("user_settings", "", "t")
        assertFalse(r.ok)
        assertNull(r.code) // kodsiz → SyncEngine "töxtaydi" deb biladi
        assertTrue(r.errorUz!!.contains("Internet") || r.errorUz!!.contains("host"))
    }

    @Test
    fun emptyBodyIsSuccessWithNoRows() {
        // `Prefer: return=minimal` javobi — bo'sh jismoniy jism.
        val r = client { _, _, _ -> HttpResp(204, "", null) }.select("user_settings", "", "t")
        assertTrue(r.ok)
        assertTrue(r.rows.isEmpty())
    }

    /* ------------------------------ yozish ------------------------------- */

    @Test
    fun bulkUpsertUsesArrayOnConflictAndMergePreference() {
        val f = Fixture { _, _, _ -> HttpResp(201, "", null) }
        val c = SupabaseClient(cfg, f)
        val rows = listOf(
            JsonParser.parseString("""{"id":"a1"}"""),
            JsonParser.parseString("""{"id":"a2"}"""),
        )
        val r = c.upsert("exercise_attempts", rows, "t", null)
        assertTrue(r.ok)
        assertEquals("POST https://proj.supabase.co/rest/v1/exercise_attempts?on_conflict=id", f.urls[0])
        assertTrue(f.bodies[0]!!.startsWith("["))
        assertEquals("return=minimal,resolution=merge-duplicates", f.sentHeaders[0]["Prefer"])
    }

    @Test
    fun singleRowIsSentAsObjectNotArray() {
        val f = Fixture { _, _, _ -> HttpResp(201, "", null) }
        SupabaseClient(cfg, f).upsert("user_settings", listOf(JsonParser.parseString("""{"user_id":"u"}""")), "t")
        assertFalse(f.bodies[0]!!.startsWith("["))
        assertEquals("on_conflict=user_id", f.urls[0].substringAfter("?"))
    }

    @Test
    fun everyTableHasItsOwnConflictKey() {
        // PK lar (0001_init.sql) — noto'g'ri kalit dublyukalarni ko'paytiradi.
        assertEquals("user_id", SupabaseClient.Tables.ON_CONFLICT[SupabaseClient.Tables.USER_SETTINGS])
        assertEquals("id", SupabaseClient.Tables.ON_CONFLICT[SupabaseClient.Tables.LEARNING_PLANS])
        assertEquals("user_id,vocabulary_id", SupabaseClient.Tables.ON_CONFLICT[SupabaseClient.Tables.USER_VOCABULARY])
        assertEquals("user_id,day", SupabaseClient.Tables.ON_CONFLICT[SupabaseClient.Tables.DAILY_ACTIVITY])
        for (t in listOf(
            SupabaseClient.Tables.EXERCISE_ATTEMPTS,
            SupabaseClient.Tables.WRITING_SUBMISSIONS,
            SupabaseClient.Tables.SPEAKING_SESSIONS,
            SupabaseClient.Tables.MOCK_EXAM_ATTEMPTS,
        )) assertEquals("id", SupabaseClient.Tables.ON_CONFLICT[t])
    }

    @Test
    fun emptyUpsertSendsNothing() {
        val f = Fixture { _, _, _ -> HttpResp(201, "", null) }
        val r = SupabaseClient(cfg, f).upsert("user_settings", emptyList(), "t")
        assertTrue(r.ok)
        assertTrue(f.urls.isEmpty())
    }

    @Test
    fun deleteSendsFilterWithMinPreference() {
        val f = Fixture { _, _, _ -> HttpResp(204, "", null) }
        val r = SupabaseClient(cfg, f).delete("exercise_attempts", "user_id=eq.u1&id=eq.a1", "t")
        assertTrue(r.ok)
        assertEquals("DELETE https://proj.supabase.co/rest/v1/exercise_attempts?user_id=eq.u1&id=eq.a1", f.urls[0])
        assertEquals("return=minimal", f.sentHeaders[0]["Prefer"])
    }

    /* -------------------------------- auth -------------------------------- */

    @Test
    fun signInReadsSessionFromJwt() {
        val token = fakeJwt("uid-7", 2000000000L)
        val f = Fixture { method, url, body ->
            assertEquals("POST https://proj.supabase.co/auth/v1/token?grant_type=password", "$method $url")
            assertTrue(body!!.contains("\"email\":\"a@b.co\""))
            HttpResp(200, """{"access_token":"$token","refresh_token":"r1","user":{"id":"uid-7","email":"a@b.co"}}""", null)
        }
        val r = SupabaseClient(cfg, f).signIn(" a@b.co ", "parol")
        assertNull(r.errorUz)
        assertNotNull(r.session)
        assertEquals("uid-7", r.session!!.userId)
        assertEquals(2000000000L, r.session!!.expiresAt)
        assertEquals("r1", r.session!!.refreshToken)
    }

    @Test
    fun signUpSendsDisplayNameMetadata() {
        val f = Fixture { method, url, body ->
            assertEquals("POST https://proj.supabase.co/auth/v1/signup", "$method $url")
            assertTrue(body!!.contains("display_name"))
            HttpResp(400, """{"message":"User already registered"}""", null)
        }
        val r = SupabaseClient(cfg, f).signUp("a@b.co", "parol", "Dadaxon")
        assertNull(r.session)
        // Veb `safeErrorMessage` matni almashtiradi — foydalanuvchi tushunadi.
        assertEquals("Bu email allaqaçon röyxatdan ötgan.", r.errorUz)
    }

    @Test
    fun authErrorsAreMappedToUzbek() {
        assertEquals("Email yoki parol notöğri.", AuthErrors.safe(401, "invalid login credentials"))
        assertEquals("Internet aloqasi yöq. Ulanişni tekşiring.", AuthErrors.safe(0, "Failed to fetch"))
        assertEquals("Juda köp uriniş. Birozdan keyin qayta urinib köring.", AuthErrors.safe(429, "Rate limit"))
        assertEquals("Emailingizni tasdiqlang. Kelgan xatni tekşiring.", AuthErrors.safe(400, "Email not confirmed"))
        assertEquals("Noma'lum xatolik. Qayta urinib köring.", AuthErrors.safe(500, "boom"))
    }

    @Test
    fun networkFailureInAuthIsNotSilent() {
        val r = client { _, _, _ -> HttpResp(0, "", "connection refused") }.signIn("a@b.co", "x")
        assertNull(r.session)
        assertTrue(r.errorUz!!.contains("Internet"))
    }

    @Test
    fun signOutAcceptsQuietly() {
        val f = Fixture { _, _, _ -> HttpResp(204, "", null) }
        assertTrue(SupabaseClient(cfg, f).signOut("tok"))
        assertEquals("POST https://proj.supabase.co/auth/v1/logout", f.urls[0])
    }

    @Test
    fun refreshUsesRefreshTokenGrant() {
        val f = Fixture { _, url, body ->
            assertTrue(url.endsWith("grant_type=refresh_token"))
            assertTrue(body!!.contains("refresh_token"))
            HttpResp(200, """{"access_token":"${fakeJwt("u", 2000000000L)}","refresh_token":"r2"}""", null)
        }
        val r = SupabaseClient(cfg, f).refreshSession("old")
        assertNotNull(r.session)
        assertEquals("r2", r.session!!.refreshToken)
    }

    @Test
    fun sessionExpiryHasSafetyMargin() {
        val now = System.currentTimeMillis() / 1000
        assertTrue(Session("a", "r", now - 1, "u").isExpired(now))
        assertTrue(Session("a", "r", now + 30, "u").isExpired(now)) // < 60 s — oldindan yangilanadi
        assertFalse(Session("a", "r", now + 600, "u").isExpired(now))
        assertTrue(Session("a", "r", 0L, "u").isExpired(now))
    }

    @Test
    fun peekJwtHandlesGarbage() {
        val c = client()
        assertEquals(null to null, c.peekJwt("hayir"))
        assertEquals(null to null, c.peekJwt(""))
    }

    private fun fakeJwt(userId: String, exp: Long): String {
        val enc = java.util.Base64.getUrlEncoder().withoutPadding()
        val h = enc.encodeToString("""{"alg":"HS256"}""".toByteArray())
        val p = enc.encodeToString("""{"sub":"$userId","exp":$exp}""".toByteArray())
        return "$h.$p.sig"
    }
}
