package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.Dialogue
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.VocabularyItem
import com.google.gson.GsonBuilder
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser

/**
 * AI SUHBATDOSH (4-bosqich) — veb `supabase/functions/_shared/roleplay.ts`,
 * `src/lib/roleplay.ts` va `src/content/index.ts::roleplayFix*` nusxasi.
 *
 *  - javobni QAT'IY tekshirish (`parseRoleplayTurn`) — yaroqsiz bo'lsa null;
 *  - stsenariy rejimi (AI yo'q): suhbat o'quvchi navbatlariga bo'linadi,
 *    javob namuna bilan so'zma-so'z solishtiriladi (baho emas);
 *  - tuzatish → `rpfix-` mashqi: ma'lumot to'liq ID ichida (base64url JSON),
 *    ID veb yasagan bilan BAYTMA-BAYT bir xil (testda tekshiriladi).
 */

data class RoleplayLine(val speaker: String, val text: String)

data class RoleplayCorrection(val original: String, val corrected: String, val whyUz: String)

data class RoleplayWord(val word: String, val translationUz: String)

data class RoleplayTurn(
    val reply: String,
    val corrections: List<RoleplayCorrection>,
    val newWords: List<RoleplayWord>,
    val done: Boolean,
)

const val ROLEPLAY_MAX_TURNS = 24
const val ROLEPLAY_MAX_LINE = 400

private fun str(v: JsonElement?, max: Int): String? {
    if (v == null || !v.isJsonPrimitive || !v.asJsonPrimitive.isString) return null
    val s = v.asString
    return if (s.isNotBlank() && s.length <= max) s.trim() else null
}

/** Model javobini qat'iy tekshirish (veb `parseRoleplayTurn` bilan bir xil qoidalar). */
fun parseRoleplayTurn(v: JsonElement?): RoleplayTurn? {
    if (v == null || !v.isJsonObject) return null
    val o = v.asJsonObject
    val reply = str(o.get("reply"), 600) ?: return null
    val cs = o.get("corrections")
    val ws = o.get("newWords")
    val done = o.get("done")
    if (cs == null || !cs.isJsonArray || ws == null || !ws.isJsonArray) return null
    if (done == null || !done.isJsonPrimitive || !done.asJsonPrimitive.isBoolean) return null
    val corrections = ArrayList<RoleplayCorrection>()
    for (c in cs.asJsonArray.take(3)) {
        if (!c.isJsonObject) return null
        val r = c.asJsonObject
        val original = str(r.get("original"), 300) ?: return null
        val corrected = str(r.get("corrected"), 300) ?: return null
        val why = str(r.get("whyUz"), 300) ?: return null
        if (original != corrected) corrections += RoleplayCorrection(original, corrected, why)
    }
    val words = ArrayList<RoleplayWord>()
    for (w in ws.asJsonArray.take(3)) {
        if (!w.isJsonObject) return null
        val r = w.asJsonObject
        val word = str(r.get("word"), 60) ?: return null
        val tr = str(r.get("translationUz"), 120) ?: return null
        words += RoleplayWord(word, tr)
    }
    return RoleplayTurn(reply, corrections, words, done.asBoolean)
}

/** Serverga yuboriladigan so'rov (veb `RoleplayRequest`); tarix oxirgi [ROLEPLAY_MAX_TURNS] replika. */
fun roleplayRequestJson(level: String, situation: String, partnerRole: String, learnerRole: String, history: List<RoleplayLine>): JsonObject {
    val o = JsonObject()
    o.addProperty("level", level)
    o.addProperty("situation", situation)
    o.addProperty("partnerRole", partnerRole)
    o.addProperty("learnerRole", learnerRole)
    val arr = com.google.gson.JsonArray()
    for (l in history.takeLast(ROLEPLAY_MAX_TURNS)) {
        arr.add(JsonObject().apply { addProperty("speaker", l.speaker); addProperty("text", l.text.take(ROLEPLAY_MAX_LINE)) })
    }
    o.add("history", arr)
    return o
}

/* ------------------------------ stsenariy ------------------------------ */

data class ScriptTurn(val partner: List<String>, val modelEn: String, val modelUz: String)

data class Script(val turns: List<ScriptTurn>, val closing: List<String>)

fun scriptTurns(d: Dialogue): Script {
    val turns = ArrayList<ScriptTurn>()
    var pending = ArrayList<String>()
    for (l in d.lines) {
        if (l.speaker == "a") { pending.add(l.en); continue }
        turns += ScriptTurn(pending, filledLine(l), l.uz)
        pending = ArrayList()
    }
    return Script(turns, pending)
}

private fun tokens(s: String): List<String> =
    s.lowercase().replace(Regex("[’‘`´]"), "'").replace(Regex("[^a-z0-9'\\s]"), " ").split(Regex("\\s+")).filter { it.isNotEmpty() }

data class ModelCompare(val matched: List<String>, val missing: List<String>)

/** Javob ↔ namuna: namunadagi so'zlardan qaysilari aytildi. Baho EMAS. */
fun compareWithModel(said: String, model: String): ModelCompare {
    val have = tokens(said).toSet()
    val seen = HashSet<String>()
    val matched = ArrayList<String>()
    val missing = ArrayList<String>()
    for (w in tokens(model)) {
        if (!seen.add(w)) continue
        if (w in have) matched += w else missing += w
    }
    return ModelCompare(matched, missing)
}

/** AI aytgan so'zlardan lug'atimizda BORlari (yangi so'z ixtiro qilinmaydi). */
fun matchVocab(words: List<RoleplayWord>, pool: List<VocabularyItem>): List<VocabularyItem> {
    val out = ArrayList<VocabularyItem>()
    for (w in words) {
        val key = w.word.trim().lowercase()
        val hit = pool.firstOrNull { it.word.lowercase() == key } ?: continue
        if (out.none { it.id == hit.id }) out += hit
    }
    return out
}

/* ------------------------------ tuzatish mashqi ------------------------------ */

const val ROLEPLAY_FIX_PREFIX = "rpfix-"
const val ROLEPLAY_FIX_MAX_WORDS = 14

private val compactGson = GsonBuilder().disableHtmlEscaping().create()

private fun b64urlEncode(text: String): String =
    java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(text.toByteArray(Charsets.UTF_8))

private fun b64urlDecode(s: String): String? =
    runCatching { String(java.util.Base64.getUrlDecoder().decode(s), Charsets.UTF_8) }.getOrNull()

/** Veb `roleplayFixId`: `{"o","c","w","l"}` — kalit tartibi va ixcham JSON bir xil. */
fun roleplayFixId(fix: RoleplayCorrection, level: String): String? {
    val words = wordsOf(fix.corrected)
    if (words.size < 2 || words.size > ROLEPLAY_FIX_MAX_WORDS) return null
    val payload = LinkedHashMap<String, String>()
    payload["o"] = fix.original.take(200)
    payload["c"] = fix.corrected.take(200)
    payload["w"] = fix.whyUz.take(200)
    payload["l"] = level
    return ROLEPLAY_FIX_PREFIX + b64urlEncode(compactGson.toJson(payload))
}

fun roleplayFixExercise(id: String): Exercise? {
    if (!id.startsWith(ROLEPLAY_FIX_PREFIX)) return null
    val raw = b64urlDecode(id.removePrefix(ROLEPLAY_FIX_PREFIX)) ?: return null
    val o = runCatching { JsonParser.parseString(raw).asJsonObject }.getOrNull() ?: return null
    val orig = str(o.get("o"), 10_000) ?: return null
    val corr = str(o.get("c"), 10_000) ?: return null
    val why = o.get("w")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isString }?.asString ?: return null
    val level = str(o.get("l"), 4) ?: return null
    if (level !in listOf(Levels.A1, Levels.A2, Levels.B1, Levels.B2, Levels.C1)) return null
    val answer = wordsOf(corr)
    if (answer.size < 2 || answer.size > ROLEPLAY_FIX_MAX_WORDS) return null
    return Exercise(
        id = id,
        kind = Kinds.WORD_ORDER,
        instructionUz = "Suhbatda şunday dedingiz: “$orig”. Töğri gapni sözlardan tuzing.",
        level = level,
        skill = Skills.GRAMMAR,
        explanationUz = "$why Töğri: “$corr”.",
        difficulty = 2,
        tags = listOf("roleplay"),
        answers = answer,
        bank = seededShuffle(answer, id),
    )
}
