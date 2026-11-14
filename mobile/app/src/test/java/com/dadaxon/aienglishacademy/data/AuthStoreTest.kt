package com.dadaxon.aienglishacademy.data

import com.google.gson.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.charset.StandardCharsets
import java.util.Base64

/**
 * Sessiya saqlash/muddat/yangilash. JWT sun'iy (base64url `sub`/`exp`) —
 * tarmoq yo'q.
 */
class AuthStoreTest {

    private class MockTransport(private val handler: (String, String, String?) -> HttpResp) : HttpTransport {
        val calls = ArrayList<Triple<String, String, String?>>()
        override fun request(method: String, url: String, headers: Map<String, String>, body: String?): HttpResp {
            calls.add(Triple(method, url, body))
            return handler(method, url, body)
        }
    }

    private class Fixture(handler: (String, String, String?) -> HttpResp) {
        val kv = MemoryStore()
        val transport = MockTransport(handler)
        val client = SupabaseClient(SupabaseConfig("https://x.supabase.co", "k"), transport)
        val auth = AuthStore(kv, client)
    }

    /** Soxta JWT: `header.payload.sig` (payload — JSON, base64url). */
    private fun jwt(userId: String, expSec: Long): String {
        val payload = JsonObject().apply {
            addProperty("sub", userId)
            addProperty("exp", expSec)
            addProperty("email", "a@b.co")
        }
        val enc = Base64.getUrlEncoder().withoutPadding()
        val h = enc.encodeToString("""{"alg":"HS256"}""".toByteArray(StandardCharsets.UTF_8))
        val p = enc.encodeToString(payload.toString().toByteArray(StandardCharsets.UTF_8))
        return "$h.$p.sig"
    }

    private fun authBody(userId: String, expSec: Long): String =
        """{"access_token":"${jwt(userId, expSec)}","refresh_token":"rt-1","expires_in":3600,"token_type":"bearer","user":{"id":"$userId","email":"a@b.co"}}"""

    @Test
    fun noSessionMeansGuest() {
        val f = Fixture { _, _, _ -> HttpResp(200, "", null) }
        assertFalse(f.auth.isSignedIn())
        assertTrue(f.auth.isGuest())
        assertTrue(f.auth.isExpired())
        assertNull(f.auth.session())
    }

    @Test
    fun guestIdIsStable() {
        val f = Fixture { _, _, _ -> HttpResp(200, "", null) }
        val a = f.auth.userId()
        val b = f.auth.userId()
        assertEquals(a, b)
        assertTrue(a.startsWith("local-")) // veb: localGuestId
        assertEquals(18, a.length)
    }

    @Test
    fun sessionRoundTripAndJwtUserId() {
        val f = Fixture { _, url, _ ->
            if (url.endsWith("signup")) HttpResp(200, authBody("uid-9", System.currentTimeMillis() / 1000 + 3600), null)
            else HttpResp(200, "{}", null)
        }
        val r = f.client.signUp("a@b.co", "secret1", "Dadaxon")
        assertNotNull(r.session)
        f.auth.save(r.session!!)
        assertEquals("uid-9", f.auth.userId()) // JWT `sub` dan (veb SDK kabi)
        assertFalse(f.auth.isExpired())
        assertTrue(f.auth.isSignedIn())
        // Saqlangan kalit bitta — foydalanuvchalar aralashmaydi.
        assertEquals("a@b.co", f.auth.session()?.email)
    }

    @Test
    fun expiredSessionIsRefreshed() {
        val now = System.currentTimeMillis() / 1000
        val f = Fixture { _, url, _ ->
            if (url.contains("grant_type=refresh_token")) HttpResp(200, authBody("uid-9", now + 3600), null)
            else HttpResp(200, "{}", null)
        }
        f.auth.save(Session(accessToken = jwt("uid-9", now - 10), refreshToken = "rt-1", expiresAt = now - 10, userId = "uid-9"))
        val (s, err) = f.auth.ensureFresh()
        assertNull(err)
        assertNotNull(s)
        assertEquals("uid-9", s!!.userId)
        assertEquals(1, f.transport.calls.count { it.second.contains("grant_type=refresh_token") })
    }

    @Test
    fun failedRefreshClearsSessionHonestly() {
        val now = System.currentTimeMillis() / 1000
        val f = Fixture { _, url, _ ->
            if (url.contains("grant_type=refresh_token")) HttpResp(400, """{"error":"invalid refresh_token"}""", null)
            else HttpResp(200, "{}", null)
        }
        f.auth.save(Session(accessToken = jwt("uid-9", now - 5), refreshToken = "rt-1", expiresAt = now - 5, userId = "uid-9"))
        val (s, err) = f.auth.ensureFresh()
        assertNull(s)
        assertNotNull(err)
        assertFalse(f.auth.isSignedIn()) // halol: mehmaonga qaytish
    }

    @Test
    fun expiredWithoutRefreshTokenIsNoAttempt() {
        val now = System.currentTimeMillis() / 1000
        val f = Fixture { _, _, _ -> HttpResp(200, "{}", null) }
        f.auth.save(Session(accessToken = jwt("u", now - 5), refreshToken = "", expiresAt = now - 5, userId = "u"))
        val (s, err) = f.auth.ensureFresh()
        assertNull(s)
        assertNotNull(err)
        assertTrue(f.transport.calls.isEmpty()) // so'rov yuborilmadi
    }

    @Test
    fun corruptStoredSessionIsIgnored() {
        val f = Fixture { _, _, _ -> HttpResp(200, "{}", null) }
        f.kv.put("aea:auth:session", "{ buziq")
        assertNull(f.auth.session())
        assertTrue(f.auth.isGuest())
    }

    @Test
    fun clearRemovesSessionOnly() {
        val f = Fixture { _, _, _ -> HttpResp(200, "{}", null) }
        f.kv.put("aea:data:u-1", "{}")
        f.auth.save(Session("at", "rt", System.currentTimeMillis() / 1000 + 3600, "u-1", null))
        f.auth.clear()
        assertNull(f.auth.session())
        assertNotNull(f.kv.get("aea:data:u-1")) // ma'lumot keshi o'rmagan
    }

    @Test
    fun guestModeHasNoClientCall() {
        val kv = MemoryStore()
        val auth = AuthStore(kv, null)
        val (s, err) = auth.ensureFresh()
        assertNull(s)
        assertNull(err) // sessiya yo'q — xato ham yo'q (mehmon rejimi)
    }
}
