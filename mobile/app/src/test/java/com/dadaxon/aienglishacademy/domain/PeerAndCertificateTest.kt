package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.AuthStore
import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.FsAssetSource
import com.dadaxon.aienglishacademy.data.HttpResp
import com.dadaxon.aienglishacademy.data.HttpTransport
import com.dadaxon.aienglishacademy.data.KeyValueStore
import com.dadaxon.aienglishacademy.data.LearningPath
import com.dadaxon.aienglishacademy.data.PeerRepository
import com.dadaxon.aienglishacademy.data.PeerResult
import com.dadaxon.aienglishacademy.data.Session
import com.dadaxon.aienglishacademy.data.SupabaseClient
import com.dadaxon.aienglishacademy.data.SupabaseConfig
import com.google.gson.JsonParser
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** 3-bosqich (mobil): hamjamiyat mijozi, «Men qila olaman» dalili, guvohnoma — veb testlari bilan bir xil holatlar. */
class PeerAndCertificateTest {

    /* ------------------------------ hamjamiyat ------------------------------ */

    private class MemKv : KeyValueStore {
        val m = HashMap<String, String>()
        override fun get(key: String) = m[key]
        override fun put(key: String, value: String) { m[key] = value }
        override fun remove(key: String) { m.remove(key) }
        override fun keysWithPrefix(prefix: String) = m.keys.filter { it.startsWith(prefix) }
    }

    private class FakeTransport(var reply: HttpResp = HttpResp(201, "[]")) : HttpTransport {
        val calls = ArrayList<Triple<String, String, String?>>()
        val headers = ArrayList<Map<String, String>>()
        override fun request(method: String, url: String, headers: Map<String, String>, body: String?): HttpResp {
            calls += Triple(method, url, body)
            this.headers += headers
            return reply
        }
    }

    private fun repo(signedIn: Boolean, t: FakeTransport): PeerRepository {
        val client = SupabaseClient(SupabaseConfig("https://x.supabase.co", "anon"), t)
        val auth = AuthStore(MemKv(), client)
        if (signedIn) auth.save(Session("jwt-1", "r", System.currentTimeMillis() / 1000 + 3600, "u-1"))
        return PeerRepository(client, auth)
    }

    @Test
    fun chegaralarVaSabablarVebBilanBirXil() {
        assertEquals("Bahoni 1 dan 5 gaça tanlang.", validateReview(0, "yaxşi yozilgan matn"))
        assertTrue(validateReview(4, "qisqa")!!.contains("kamida 10"))
        assertNull(validateReview(5, "  Juda yaxşi, rahmat!  "))
        assertTrue(validateSubmissionBody("   ")!!.startsWith("Böş"))
        assertTrue(validateSubmissionBody("a".repeat(4001))!!.contains("juda uzun"))
        assertTrue(peerErrorUz("P0001", "peer_daily_limit").contains("kunlik çegara"))
        assertTrue(peerErrorUz("PGRST205", "Could not find the table").contains("0006_peer_review"))
        assertTrue(peerErrorUz("23505", "dup").contains("allaqaçon"))
        assertTrue(peerErrorUz("42501", "new row violates row-level security policy").contains("ruxsat yöq"))
        // Veb faylidagi sonlar bilan paritet.
        val ts = listOf("..", "../..", ".", "app").map { File(File(it), "src/lib/peer.ts") }.first { it.isFile }.readText()
        for ((k, v) in mapOf("bodyMax" to PeerLimits.BODY_MAX, "commentMin" to PeerLimits.COMMENT_MIN, "commentMax" to PeerLimits.COMMENT_MAX, "dailySubmissions" to PeerLimits.DAILY_SUBMISSIONS)) {
            assertEquals(k, v.toString(), Regex("""$k:\s*(\d+)""").find(ts)?.groupValues?.get(1))
        }
    }

    @Test
    fun mehmonRejimidaSorovYuborilmaydi() {
        val t = FakeTransport()
        val r = repo(signedIn = false, t).claim()
        assertTrue(r is PeerResult.Fail && r.reasonUz.contains("hisobingizga kiring"))
        assertTrue(t.calls.isEmpty())
    }

    @Test
    fun yuborishMualliIdsizJwtBilan() {
        val t = FakeTransport(HttpResp(201, """[{"id":"s1","kind":"speaking","body":"hello"}]"""))
        val r = repo(signedIn = true, t).submit("speaking", "a1-s-01", "A1", "p".repeat(1200), "  hello  ")
        assertTrue(r is PeerResult.Ok)
        val (method, url, body) = t.calls.single()
        assertEquals("POST", method)
        assertEquals("https://x.supabase.co/rest/v1/peer_submissions", url)
        assertEquals("Bearer jwt-1", t.headers.single()["Authorization"])
        val o = JsonParser.parseString(body).asJsonObject
        assertEquals("hello", o.get("body").asString)
        assertEquals(1000, o.get("prompt").asString.length)
        assertFalse(o.has("author_id"))
    }

    @Test
    fun tayinlovRpcVaServerSababi() {
        val t = FakeTransport(HttpResp(200, "[]"))
        val p = repo(signedIn = true, t)
        assertEquals(PeerResult.Ok(null), p.claim())
        assertEquals("https://x.supabase.co/rest/v1/rpc/peer_claim", t.calls.single().second)
        t.reply = HttpResp(400, """{"code":"P0001","message":"peer_daily_limit"}""")
        val r = p.submit("writing", "t", "A1", "", "Hello")
        assertTrue(r is PeerResult.Fail && r.reasonUz.contains("kunlik çegara"))
        // Noto'g'ri izoh serverga yuborilmaydi.
        val before = t.calls.size
        assertTrue(p.review("s1", 4, "qisqa") is PeerResult.Fail)
        assertEquals(before, t.calls.size)
    }

    /* ------------------------------ can-do va guvohnoma ------------------------------ */

    private fun assetsDir(): File =
        listOf("src/main/assets", "app/src/main/assets", "mobile/app/src/main/assets").map { File(it) }
            .first { File(it, ContentRepository.MANIFEST_PATH).isFile }

    private val cr = ContentRepository(FsAssetSource(assetsDir()))
    private val now = 1_793_000_000_000L
    private fun att(level: String = "A1", skill: String = "grammar", ok: Boolean = true) =
        AttemptRecord("a${level}${skill}${ok}${Math.random()}", "x", skill, level, ok, if (ok) 1.0 else 0.0, 1, 5, "practice", "", now - 1000)

    @Test
    fun canDoDaliliFaqatShuDarajaVaKonikma() {
        val grammarA1 = cr.canDo().statements.first { it.level == "A1" && it.skill == "grammar" }
        val ex = { _: String -> "A1" }
        assertEquals(CanDoEvidenceResult(CanDoStatus.NONE, 0, null, MIN_EVIDENCE_PER_SKILL), canDoEvidence(grammarA1, emptyList(), emptyList(), now, ex))
        assertEquals(CanDoStatus.FEW, canDoEvidence(grammarA1, listOf(att(), att("A2"), att(skill = "reading")), emptyList(), now, ex).status)
        assertEquals(CanDoStatus.CONFIRMED, canDoEvidence(grammarA1, List(4) { att() }, emptyList(), now, ex).status)
        assertEquals(CanDoStatus.PRACTICE, canDoEvidence(grammarA1, List(4) { att(ok = it == 0) }, emptyList(), now, ex).status)
    }

    @Test
    fun guvohnomaKunlarTugaganidaVaSonlarHaqiqiy() {
        val b = cr.bundle("A1")
        val ids = b.vocab.map { it.id }
        val claims = cr.canDo().statements
        val six = AppData().copy(path = LearningPath(completedDays = b.days.take(6).map { it.id }))
        val i6 = certificateInfo(six, "A1", b.days, ids, claims, now) { "A1" }
        assertFalse(i6.eligible)
        assertNull(i6.accuracy)
        val all = AppData().copy(
            path = LearningPath(completedDays = b.days.map { it.id }),
            attempts = listOf(att(), att(ok = false), att("A2")),
        )
        val i7 = certificateInfo(all, "A1", b.days, ids, claims, now) { "A1" }
        assertTrue(i7.eligible)
        assertEquals(listOf(7, 2, 50, 6), listOf(i7.daysDone, i7.attempts, i7.accuracy, i7.canDoTotal))
    }
}
