package com.dadaxon.aienglishacademy.data

import com.dadaxon.aienglishacademy.domain.PeerLimits
import com.dadaxon.aienglishacademy.domain.PeerReview
import com.dadaxon.aienglishacademy.domain.PeerSubmission
import com.dadaxon.aienglishacademy.domain.peerErrorUz
import com.dadaxon.aienglishacademy.domain.validateReview
import com.dadaxon.aienglishacademy.domain.validateSubmissionBody
import com.google.gson.Gson
import com.google.gson.JsonNull
import com.google.gson.JsonObject

/**
 * Hamjamiyat tekshiruvi — tarmoq qatlami (veb `src/lib/peer.ts`). Har
 * amal BLOKLOVCHI (ekran uni `Dispatchers.IO`da chaqiradi) va natija yoki
 * o'quvchiga tushunarli sabab qaytaradi. Muallif id'si yuborilmaydi — server
 * `auth.uid()` qo'yadi; audio hech qachon yuborilmaydi.
 */
sealed class PeerResult<out T> {
    data class Ok<T>(val data: T) : PeerResult<T>()
    data class Fail(val reasonUz: String) : PeerResult<Nothing>()
}

class PeerRepository(private val client: SupabaseClient?, private val auth: AuthStore) {
    private val gson = Gson()

    /** Ishlay oladimi: server sozlangan va foydalanuvchi kirgan (sessiya yangilanadi). */
    fun ready(): PeerResult<Session> {
        if (client == null || !client.isConfigured) return PeerResult.Fail("Server (Supabase) ulanmagan — hamjamiyat tekshiruvi faqat server bilan ishlaydi.")
        if (auth.isGuest()) return PeerResult.Fail("Hamjamiyat tekshiruvi uchun hisobingizga kiring (mehmon rejimida javoblar boshqalarga yuborilmaydi).")
        val (s, err) = auth.ensureFresh()
        if (s == null) return PeerResult.Fail(err ?: "Sessiya muddati tugadi — qaytadan kiring.")
        return PeerResult.Ok(s)
    }

    private inline fun <T> run(block: (SupabaseClient, Session) -> PeerResult<T>): PeerResult<T> =
        when (val r = ready()) {
            is PeerResult.Fail -> r
            is PeerResult.Ok -> try {
                block(client!!, r.data)
            } catch (err: Exception) {
                PeerResult.Fail(peerErrorUz(null, err.message))
            }
        }

    private fun fail(r: DbResult) = PeerResult.Fail(peerErrorUz(r.code, r.errorUz))

    fun submit(kind: String, taskId: String, level: String, prompt: String, body: String): PeerResult<PeerSubmission> {
        validateSubmissionBody(body)?.let { return PeerResult.Fail(it) }
        return run { c, s ->
            val row = JsonObject().apply {
                addProperty("kind", kind)
                addProperty("task_id", taskId.take(120))
                addProperty("level", level)
                addProperty("prompt", prompt.take(PeerLimits.PROMPT_MAX))
                addProperty("body", body.trim())
            }
            val r = c.insert("peer_submissions", row, s.accessToken, returning = true)
            if (!r.ok) fail(r) else PeerResult.Ok(r.rows.firstOrNull()?.let { gson.fromJson(it, PeerSubmission::class.java) } ?: PeerSubmission())
        }
    }

    fun mine(): PeerResult<List<Pair<PeerSubmission, List<PeerReview>>>> = run { c, s ->
        val subs = c.select("peer_submissions", "select=*&author_id=eq.${s.userId}&order=created_at.desc&limit=30", s.accessToken)
        if (!subs.ok) return@run fail(subs)
        val list = subs.rows.map { gson.fromJson(it, PeerSubmission::class.java) }
        if (list.isEmpty()) return@run PeerResult.Ok(emptyList())
        val ids = list.joinToString(",") { it.id }
        val revs = c.select("peer_reviews", "select=id,submission_id,score,comment,created_at&submission_id=in.($ids)", s.accessToken)
        if (!revs.ok) return@run fail(revs)
        val reviews = revs.rows.map { gson.fromJson(it, PeerReview::class.java) }
        PeerResult.Ok(list.map { sub -> sub to reviews.filter { it.submission_id == sub.id } })
    }

    /** Server tekshirish uchun bitta javob tayinlaydi; `null` — hozircha yo'q. */
    fun claim(): PeerResult<PeerSubmission?> = run { c, s ->
        val r = c.rpc("peer_claim", JsonObject().apply { add("p_kind", JsonNull.INSTANCE) }, s.accessToken)
        if (!r.ok) fail(r) else PeerResult.Ok(r.rows.firstOrNull()?.let { gson.fromJson(it, PeerSubmission::class.java) })
    }

    fun review(submissionId: String, score: Int, comment: String): PeerResult<Unit> {
        validateReview(score, comment)?.let { return PeerResult.Fail(it) }
        return run { c, s ->
            val row = JsonObject().apply {
                addProperty("submission_id", submissionId)
                addProperty("score", score)
                addProperty("comment", comment.trim())
            }
            val r = c.insert("peer_reviews", row, s.accessToken)
            if (!r.ok) fail(r) else PeerResult.Ok(Unit)
        }
    }

    fun report(submissionId: String?, reviewId: String?, reason: String): PeerResult<Unit> = run { c, s ->
        val row = JsonObject().apply {
            if (submissionId != null) addProperty("submission_id", submissionId)
            if (reviewId != null) addProperty("review_id", reviewId)
            addProperty("reason", reason)
        }
        val r = c.insert("peer_reports", row, s.accessToken)
        if (!r.ok) fail(r) else PeerResult.Ok(Unit)
    }

    fun delete(id: String): PeerResult<Unit> = run { c, s ->
        val r = c.delete("peer_submissions", "id=eq.$id", s.accessToken)
        if (!r.ok) fail(r) else PeerResult.Ok(Unit)
    }
}
