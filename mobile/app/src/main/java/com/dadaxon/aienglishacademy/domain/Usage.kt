package com.dadaxon.aienglishacademy.domain

import com.google.gson.JsonObject
import com.google.gson.JsonParser

/**
 * Yangi funksiyalardan foydalanish o'lchovi (6-bosqich) — veb `src/lib/usage.ts`
 * ning sof qismi. Hisob FAQAT qurilmada; matn/javob saqlanmaydi.
 */
data class UsageFeature(val id: String, val titleUz: String, val finishedUz: String)

val USAGE_FEATURES: List<UsageFeature> = listOf(
    UsageFeature("quick", "«5 daqiqa» sessiya", "vaqt yoki kartalar tugaguncha"),
    UsageFeature("dialogue", "Real hayot suhbatlari", "dars oxirigacha"),
    UsageFeature("review", "Takrorlash menejeri", "navbat oxirigacha"),
    UsageFeature("conversation", "Suhbatdosh", "kamida bitta javob bilan yakunlandi"),
    UsageFeature("pronunciation", "Talaffuz mashqi", "moslik 80% va undan yuqori"),
    UsageFeature("community_submit", "Hamjamiyatga yuborish", "serverga yetdi"),
    UsageFeature("community_review", "Hamjamiyatda tekshirish", "izoh yuborildi"),
    UsageFeature("certificate", "Yakunlash guvohnomasi", "rasm yaratildi"),
)

data class UsageStats(val started: Int = 0, val finished: Int = 0, val lastAt: Long = 0)

const val USAGE_MAX = 1_000_000

fun bumpUsage(stats: Map<String, UsageStats>, id: String, started: Boolean, now: Long): Map<String, UsageStats> {
    val cur = stats[id] ?: UsageStats()
    var next = if (started) cur.copy(started = minOf(USAGE_MAX, cur.started + 1), lastAt = now)
    else cur.copy(finished = minOf(USAGE_MAX, cur.finished + 1), lastAt = now)
    if (next.finished > next.started) next = next.copy(started = next.finished)
    return stats + (id to next)
}

fun completionPct(s: UsageStats?): Int? =
    if (s == null || s.started == 0) null else Math.round(minOf(s.finished, s.started) * 100.0 / s.started).toInt()

/** Saqlangan JSON'ni xavfsiz o'qish (veb `parseUsage` bilan bir xil qoidalar). */
fun parseUsage(raw: String?): Map<String, UsageStats> {
    if (raw.isNullOrBlank()) return emptyMap()
    val o = runCatching { JsonParser.parseString(raw).asJsonObject }.getOrNull() ?: return emptyMap()
    val out = LinkedHashMap<String, UsageStats>()
    for (f in USAGE_FEATURES) {
        val s = o.get(f.id)?.takeIf { it.isJsonObject }?.asJsonObject ?: continue
        fun n(k: String): Long {
            val v = s.get(k) ?: return 0
            if (!v.isJsonPrimitive || !v.asJsonPrimitive.isNumber) return 0
            val d = v.asDouble
            return if (d.isFinite() && d >= 0) minOf(USAGE_MAX.toDouble(), Math.floor(d)).toLong() else 0
        }
        val started = n("started").toInt()
        out[f.id] = UsageStats(started, minOf(n("finished").toInt(), started), n("lastAt"))
    }
    return out
}

fun usageToJson(stats: Map<String, UsageStats>): String {
    val o = JsonObject()
    for ((k, v) in stats) o.add(k, JsonObject().apply { addProperty("started", v.started); addProperty("finished", v.finished); addProperty("lastAt", v.lastAt) })
    return o.toString()
}
