package com.dadaxon.aienglishacademy.domain

/**
 * Hamjamiyat tekshiruvi — veb `src/lib/peer.ts` ning sof qismi (chegaralar,
 * tekshiruv, xato → sabab). Server qoidalari `supabase/migrations/0006_peer_review.sql`.
 */
object PeerLimits {
    const val BODY_MAX = 4000
    const val PROMPT_MAX = 1000
    const val COMMENT_MIN = 10
    const val COMMENT_MAX = 1000
    const val DAILY_SUBMISSIONS = 5
    const val REVIEWS_PER_SUBMISSION = 2
}

/** Shikoyat sabablari — veb `PEER_REPORT_REASONS` bilan bir xil id va matn. */
val PEER_REPORT_REASONS: List<Pair<String, String>> = listOf(
    "offensive" to "Haqoratli yoki qo‘pol",
    "spam" to "Mavzuga aloqasiz / spam",
    "personal" to "Shaxsiy ma’lumot bor",
    "other" to "Boshqa sabab",
)

data class PeerSubmission(
    val id: String = "",
    val kind: String = "writing",
    val task_id: String = "",
    val level: String = "A1",
    val prompt: String = "",
    val body: String = "",
    val status: String = "open",
    val created_at: String = "",
)

data class PeerReview(
    val id: String = "",
    val submission_id: String = "",
    val score: Int = 0,
    val comment: String = "",
    val created_at: String = "",
)

fun validateSubmissionBody(body: String): String? {
    val t = body.trim()
    if (t.isEmpty()) return "Bo‘sh javobni yuborib bo‘lmaydi."
    if (t.length > PeerLimits.BODY_MAX) return "Matn juda uzun (${t.length} belgi, ko‘pi bilan ${PeerLimits.BODY_MAX})."
    return null
}

fun validateReview(score: Int, comment: String): String? {
    if (score < 1 || score > 5) return "Bahoni 1 dan 5 gacha tanlang."
    val n = comment.trim().length
    if (n < PeerLimits.COMMENT_MIN) return "Izoh kamida ${PeerLimits.COMMENT_MIN} belgi bo‘lsin — nimasi yaxshi va nimani tuzatish kerakligini yozing."
    if (n > PeerLimits.COMMENT_MAX) return "Izoh juda uzun (ko‘pi bilan ${PeerLimits.COMMENT_MAX} belgi)."
    return null
}

/** Server/tarmoq xatosi → tushunarli sabab (veb `peerErrorUz` bilan bir xil). */
fun peerErrorUz(code: String?, message: String?): String {
    val msg = (message ?: "").lowercase()
    if (msg.contains("peer_daily_limit")) return "Bugun ${PeerLimits.DAILY_SUBMISSIONS} ta javob yuborildi — bu kunlik chegara. Ertaga yana yuborishingiz mumkin."
    if (code == "PGRST205" || code == "42P01" || code == "PGRST202" || msg.contains("schema cache"))
        return "Serverda hamjamiyat jadvallari hali yo‘q: `supabase/migrations/0006_peer_review.sql` migratsiyasini qo‘llang."
    if (code == "23505") return "Bu amal allaqachon bajarilgan (bir javobga bitta izoh / bitta shikoyat)."
    if (code == "23514") return "Matn uzunligi yoki baho chegaradan tashqarida."
    if (code == "42501" || msg.contains("row-level security")) return "Bu amalga ruxsat yo‘q (javob sizga tayinlanmagan yoki yashirilgan)."
    if (code == null && (msg.contains("failed to fetch") || msg.contains("network") || msg.contains("unable to resolve") || msg.contains("timeout") || msg.contains("connect")))
        return "Internet aloqasi yo‘q. Ulanishni tekshirib, qayta urinib ko‘ring."
    return "Server xatosi. Birozdan keyin qayta urinib ko‘ring."
}
