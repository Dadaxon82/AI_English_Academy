package com.dadaxon.aienglishacademy.data

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser

/**
 * Diagnostika materiali — `assets/content/diagnostic.json`.
 *
 * Fayl shakli eksport skripti (veb `src/content/diagnostic.ts`) bilan bir xil:
 * `id`, `titleUz`, `descriptionUz`, `passScore`, `exercises` — 12 ta HAQIQIY
 * mashq (`dg-01 … dg-12`), turli turlarda (`multiple-choice`, `gap-fill`,
 * `true-false-notgiven`, `translation`, `word-order`). Vebda mashq turlari
 * UNION bo'lgani uchun `word-order`da `answer` — MASSIV; mobil model
 * yassilangan (`answer: String?`), shuning uchun avval
 * `ContentRepository.fixWordOrderAnswers` orqali ro'yxat `answers` ga
 * ko'chiriladi (aks holda Gson `answer` ustida «Expected STRING but was
 * BEGIN_ARRAY» deb, butun test yo'qolardi — onboarding'dagi «material
 * o'qilmadi» shundan chiqqan edi).
 */
data class DiagnosticAsset(
    val id: String,
    val titleUz: String,
    val descriptionUz: String,
    val passScore: Int,
    val exercises: List<Exercise>,
    /** O'qib bo'lmagan savollar soni — 0 bo'lmasa ekranda ochiq aytiladi. */
    val skipped: Int = 0,
)

object DiagnosticLoader {
    /** Eksport skripti yozadigan yo'l. */
    const val PATH = "content/diagnostic.json"

    /**
     * Materialni o'qish. Fayl bo'lmasa yoki butunlay buzilgan bo'lsa `null` —
     * onboarding diagnostikasiz davom etadi (raqam ixtiro qilinmaydi).
     *
     * Bitta savol buzilgan bo'lsa butun test tashlanmaydi: u savol o'tkazib
     * yuboriladi va soni `skipped` da ochiq yoziladi.
     */
    fun load(src: AssetSource): DiagnosticAsset? {
        if (!src.exists(PATH)) return null
        val root = runCatching { JsonParser.parseString(src.read(PATH)) }.getOrNull()
        if (root == null || !root.isJsonObject) return null
        val o = root.asJsonObject

        // Veb unioni: word-order `answer: string[]` → modeldagi `answers`.
        // Daraxt (root) beriladi — funksiya aynan `exercises` kalitini izlaydi.
        ContentRepository.fixWordOrderAnswers(o)

        val arr = o.getAsJsonArray("exercises") ?: return null
        val gson = Gson()
        val list = ArrayList<Exercise>(arr.size())
        var skipped = 0
        for (el in arr) {
            val e = parseExercise(gson, el)
            if (e == null || e.id.isBlank()) skipped += 1 else list.add(e)
        }
        // Hech savol o'qilmadi — material buzilgan, holat ochiq.
        if (list.isEmpty()) return null

        return DiagnosticAsset(
            id = text(o, "id"),
            titleUz = text(o, "titleUz"),
            descriptionUz = text(o, "descriptionUz"),
            passScore = o.get("passScore")?.takeIf { it.isJsonPrimitive }?.asInt ?: 0,
            exercises = list,
            skipped = skipped,
        )
    }

    /** Bitta mashq obyektini modelga aylantirish (sinf/testlar uchun ochiq). */
    fun parseExercise(gson: Gson, el: JsonElement): Exercise? =
        runCatching { gson.fromJson(el, Exercise::class.java) }.getOrNull()

    private fun text(o: JsonObject, key: String): String =
        o.get(key)?.takeIf { it.isJsonPrimitive }?.asString ?: ""
}
