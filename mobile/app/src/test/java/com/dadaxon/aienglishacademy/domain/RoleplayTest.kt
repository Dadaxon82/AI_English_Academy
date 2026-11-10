package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AuthStore
import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.FsAssetSource
import com.dadaxon.aienglishacademy.data.HttpResp
import com.dadaxon.aienglishacademy.data.HttpTransport
import com.dadaxon.aienglishacademy.data.KeyValueStore
import com.dadaxon.aienglishacademy.data.RoleplayClient
import com.dadaxon.aienglishacademy.data.Session
import com.dadaxon.aienglishacademy.data.SupabaseConfig
import com.google.gson.JsonParser
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** AI suhbatdosh (mobil) — veb `src/test/roleplay.test.ts` bilan bir xil holatlar va ID pariteti. */
class RoleplayTest {
    private val repo = ContentRepository(
        FsAssetSource(listOf("src/main/assets", "app/src/main/assets", "mobile/app/src/main/assets").map { File(it) }.first { File(it, ContentRepository.MANIFEST_PATH).isFile }),
    )

    private val good = """{"reply":"Sure! Anything to eat?","corrections":[{"original":"I want a tea","corrected":"I would like a tea, please","whyUz":"Muloyim so‘rov"}],"newWords":[{"word":"sandwich","translationUz":"sendvich"}],"done":false}"""

    @Test
    fun javobQatiyTekshiriladi() {
        val t = parseRoleplayTurn(JsonParser.parseString(good))!!
        assertEquals("Sure! Anything to eat?", t.reply)
        assertEquals(1, t.corrections.size)
        assertNull(parseRoleplayTurn(JsonParser.parseString(good.replace("\"done\":false", "\"done\":\"no\""))))
        assertNull(parseRoleplayTurn(JsonParser.parseString(good.replace("Sure! Anything to eat?", ""))))
        val same = parseRoleplayTurn(JsonParser.parseString(good.replace("I would like a tea, please", "I want a tea")))!!
        assertTrue("o'zgarmagan tuzatish tashlanadi", same.corrections.isEmpty())
    }

    @Test
    fun stsenariyVaSolishtirish() {
        val cafe = repo.dialogues().first { it.id == "a1-d5-cafe" }
        val s = scriptTurns(cafe)
        assertEquals(3, s.turns.size)
        assertEquals(listOf("Hello! What would you like?"), s.turns[0].partner)
        assertEquals("Can I have a cup of tea, please?", s.turns[0].modelEn)
        assertEquals(listOf("The tea and the soup are six dollars."), s.closing)
        assertEquals(ModelCompare(listOf("can", "i", "have", "tea", "please"), listOf("a", "cup", "of")), compareWithModel("can i have tea please", "Can I have a cup of tea, please?"))
        assertTrue(compareWithModel("I’m from Uzbekistan", "I'm from Uzbekistan.").missing.isEmpty())
        for (d in repo.dialogues()) assertEquals(d.lines.count { it.speaker == "b" }, scriptTurns(d).turns.size)
    }

    @Test
    fun tuzatishIdVebBilanBaytmaBayt() {
        // Veb `roleplayFixId` (src/content/index.ts) chiqargan qiymatlar — 2026-11-10 o'lchangan.
        val pin1 = "rpfix-eyJvIjoiSSB3YW50IGEgdGVhIiwiYyI6Ikkgd291bGQgbGlrZSBhIHRlYSwgcGxlYXNlIiwidyI6Ik11bG95aW0gc2_igJhyb3Yg4oCUIOKAnEkgd291bGQgbGlrZeKApuKAnSIsImwiOiJBMSJ9"
        val pin2 = "rpfix-eyJvIjoiSGUgZ28gPGhvbWU-IiwiYyI6IkhlIGdvZXMgaG9tZSAmIHJlc3RzIiwidyI6IjMtc2hheHM6IC1zIHFvJ3NoaWxhZGkgPSB0bydnJ3JpIiwibCI6IkEyIn0"
        assertEquals(pin1, roleplayFixId(RoleplayCorrection("I want a tea", "I would like a tea, please", "Muloyim so‘rov — “I would like…”"), "A1"))
        assertEquals(pin2, roleplayFixId(RoleplayCorrection("He go <home>", "He goes home & rests", "3-shaxs: -s qo'shiladi = to'g'ri"), "A2"))
        val ex = repo.findExercise(pin1)!!
        assertEquals("word-order", ex.kind)
        assertEquals(listOf("I", "would", "like", "a", "tea,", "please"), ex.answers)
        assertTrue(ex.instructionUz.contains("I want a tea"))
        assertNull(roleplayFixId(RoleplayCorrection("x", "please", "w"), "A1"))
        assertNull(repo.findExercise("rpfix-!!!buzuq"))
    }

    @Test
    fun lugatdaBorSozlarginaVaSorovTarixi() {
        val pool = repo.bundle("A1").vocab
        val k = pool[0]
        assertEquals(listOf(k.id), matchVocab(listOf(RoleplayWord(k.word.uppercase(), "x"), RoleplayWord("zzqx", "y")), pool).map { it.id })
        val body = roleplayRequestJson("A1", "Kafe", "Waiter", "You", List(30) { RoleplayLine(if (it % 2 == 0) "partner" else "learner", "x".repeat(500)) })
        val h = body.getAsJsonArray("history")
        assertEquals(ROLEPLAY_MAX_TURNS, h.size())
        assertTrue(h.all { it.asJsonObject.get("text").asString.length == ROLEPLAY_MAX_LINE })
    }

    private class MemKv : KeyValueStore {
        val m = HashMap<String, String>()
        override fun get(key: String) = m[key]
        override fun put(key: String, value: String) { m[key] = value }
        override fun remove(key: String) { m.remove(key) }
        override fun keysWithPrefix(prefix: String) = m.keys.filter { it.startsWith(prefix) }
    }

    @Test
    fun mijozFunksiyagaBoradiVaSababniQaytaradi() {
        var reply = HttpResp(200, """{"model":"m","turn":$good}""")
        val urls = ArrayList<String>()
        val t = object : HttpTransport {
            override fun request(method: String, url: String, headers: Map<String, String>, body: String?): HttpResp {
                urls += url
                return reply
            }
        }
        val auth = AuthStore(MemKv(), null)
        val client = RoleplayClient(SupabaseConfig("https://x.supabase.co", "anon"), auth, t)
        assertTrue("mehmon — so'rov yuborilmaydi", client.request(roleplayRequestJson("A1", "s", "a", "b", emptyList())) is RoleplayClient.Result.Fail)
        assertTrue(urls.isEmpty())
        auth.save(Session("jwt", "r", System.currentTimeMillis() / 1000 + 3600, "u"))
        val ok = client.request(roleplayRequestJson("A1", "s", "a", "b", emptyList()))
        assertTrue(ok is RoleplayClient.Result.Ok)
        assertEquals("https://x.supabase.co/functions/v1/ai-roleplay", urls.last())
        reply = HttpResp(429, """{"reasonUz":"limit tugadi"}""")
        assertEquals(RoleplayClient.Result.Fail("limit tugadi"), client.request(roleplayRequestJson("A1", "s", "a", "b", emptyList())))
    }

    @Test
    fun foydalanishHisobi() {
        var s = bumpUsage(emptyMap(), "quick", true, 10)
        s = bumpUsage(s, "quick", true, 20)
        s = bumpUsage(s, "quick", false, 30)
        assertEquals(UsageStats(2, 1, 30), s["quick"])
        assertEquals(50, completionPct(s["quick"]))
        assertEquals(UsageStats(1, 1, 1), bumpUsage(emptyMap(), "dialogue", false, 1)["dialogue"])
        assertEquals(emptyMap<String, UsageStats>(), parseUsage("{bu json emas"))
        assertEquals(mapOf("review" to UsageStats(2, 2, 5)), parseUsage("""{"hack":{"started":5},"review":{"started":2,"finished":9,"lastAt":5}}"""))
        assertEquals(s, parseUsage(usageToJson(s)))
    }
}
