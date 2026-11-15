package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.Dialogue

/**
 * TALAFFUZ MASHQI — veb `src/lib/pronunciation.ts` nusxasi: tizim tanigan
 * matn namuna gap bilan so'zma-so'z (LCS) solishtiriladi. Bu TALAFFUZ BAHOSI
 * EMAS — «taxminiy moslik»; nutq tanilmasa ball umuman chiqmaydi.
 */
data class PronWord(val text: String, val ok: Boolean)

data class PronunciationResult(val words: List<PronWord>, val extra: List<String>, val score: Int)

private fun normWord(w: String): String = w.lowercase().replace(Regex("[’‘`´]"), "'").replace(Regex("[^a-z0-9']"), "")

private val NUM = mapOf(
    "0" to "zero", "1" to "one", "2" to "two", "3" to "three", "4" to "four", "5" to "five",
    "6" to "six", "7" to "seven", "8" to "eight", "9" to "nine", "10" to "ten",
)

private fun canon(w: String): String = NUM[w] ?: w

fun comparePronunciation(target: String, said: String): PronunciationResult {
    val tWords = target.split(Regex("\\s+")).filter { normWord(it).isNotEmpty() }
    val t = tWords.map { canon(normWord(it)) }
    val s = said.split(Regex("\\s+")).map { canon(normWord(it)) }.filter { it.isNotEmpty() }
    val dp = Array(t.size + 1) { IntArray(s.size + 1) }
    for (i in t.size - 1 downTo 0) for (j in s.size - 1 downTo 0) {
        dp[i][j] = if (t[i] == s[j]) dp[i + 1][j + 1] + 1 else maxOf(dp[i + 1][j], dp[i][j + 1])
    }
    val ok = BooleanArray(t.size)
    val used = BooleanArray(s.size)
    var i = 0
    var j = 0
    while (i < t.size && j < s.size) {
        when {
            t[i] == s[j] -> { ok[i] = true; used[j] = true; i++; j++ }
            dp[i + 1][j] >= dp[i][j + 1] -> i++
            else -> j++
        }
    }
    val n = ok.count { it }
    return PronunciationResult(
        words = tWords.mapIndexed { k, w -> PronWord(w, ok[k]) },
        extra = s.filterIndexed { k, _ -> !used[k] },
        score = if (t.isEmpty()) 0 else Math.round(n * 100.0 / t.size).toInt(),
    )
}

data class PronSentence(val en: String, val uz: String)

/** Mashq gaplari: shu daraja suhbatlaridan (ikkala rol), 3–12 so'z, takrorsiz. */
fun pronunciationSentences(all: List<Dialogue>, level: String): List<PronSentence> {
    val seen = HashSet<String>()
    val out = ArrayList<PronSentence>()
    for (d in dialoguesFor(all, level)) for (l in d.lines) {
        val en = filledLine(l)
        val n = en.split(Regex("\\s+")).size
        if (n < 3 || n > 12 || !seen.add(en)) continue
        out += PronSentence(en, l.uz)
    }
    return out
}
