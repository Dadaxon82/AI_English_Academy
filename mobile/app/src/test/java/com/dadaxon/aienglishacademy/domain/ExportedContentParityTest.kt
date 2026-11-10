package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.LevelBundle
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Haqiqiy eksport (`assets/content/a1.json`) Gson bilan o'qiladi va yangi turlar to'g'ri javob bilan yechiladi. */
class ExportedContentParityTest {
    private fun fix(el: JsonElement) {
        if (el is JsonArray) { for (c in el) fix(c); return }
        if (el !is JsonObject) return
        for ((k, v) in el.entrySet()) {
            if (k == "exercises" && v is JsonArray) for (e in v) if (e is JsonObject) {
                val ans = e.get("answer")
                if (ans is JsonArray) { e.remove("answer"); if (!e.has("answers")) e.add("answers", ans) }
            }
            fix(v)
        }
    }

    private fun right(ex: Exercise): Any? = when (ex.kind) {
        Kinds.MULTI_SELECT -> ex.answerIndexes
        Kinds.DROPDOWN_CLOZE -> ex.answers
        Kinds.SEQUENCE -> ex.items
        Kinds.CATEGORIZE -> ex.sortItems!!.associate { it.text to it.category }
        Kinds.SHORT_ANSWER -> listOf(ex.accepted!!.first())
        else -> null
    }

    @Test fun `yangi turlar Gson bilan oqiladi va yechiladi`() {
        val root = JsonParser.parseString(File(System.getProperty("a1json") ?: "src/main/assets/content/a1.json").readText())
        fix(root)
        val b = Gson().fromJson(root, LevelBundle::class.java)
        val all = b.grammar.flatMap { it.exercises } + b.reading.flatMap { it.exercises }
        val kinds = listOf(Kinds.MULTI_SELECT, Kinds.DROPDOWN_CLOZE, Kinds.SEQUENCE, Kinds.CATEGORIZE, Kinds.SHORT_ANSWER)
        for (k in kinds) {
            val list = all.filter { it.kind == k }
            assertEquals("$k soni", 7, list.size)
            for (ex in list) assertTrue("${ex.id} yeçilmadi", checkAnswer(ex, right(ex)).correct)
        }
        val dc = all.first { it.kind == Kinds.DROPDOWN_CLOZE }
        assertEquals(dc.answers!!.size, dc.choices!!.size)
        val ct = all.first { it.kind == Kinds.CATEGORIZE }
        assertTrue(ct.sortItems!!.all { it.text.isNotEmpty() })
    }
}
