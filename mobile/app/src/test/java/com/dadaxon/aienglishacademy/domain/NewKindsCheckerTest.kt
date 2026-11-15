package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.SortItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 2026-11-08 — yangi mashq turlari. Kutilganlar veb `src/test/new-kinds.test.ts`
 * bilan BIR XIL (veb ↔ mobil paritet).
 */
class NewKindsCheckerTest {
    private val ms =
        Exercise(
            id = "ms", kind = Kinds.MULTI_SELECT, explanationUz = "izoh",
            question = "Which are fruits?", options = listOf("apple", "bread", "banana", "milk"), answerIndexes = listOf(0, 2),
        )
    private val dc =
        Exercise(
            id = "dc", kind = Kinds.DROPDOWN_CLOZE, explanationUz = "izoh",
            text = "She ___ a student. They ___ friends.",
            choices = listOf(listOf("am", "is", "are"), listOf("am", "is", "are")), answers = listOf("is", "are"),
        )
    private val sq =
        Exercise(
            id = "sq", kind = Kinds.SEQUENCE, explanationUz = "izoh",
            items = listOf("Hello!", "Hi, how are you?", "Fine, thanks."),
            itemsShuffled = listOf("Fine, thanks.", "Hello!", "Hi, how are you?"),
        )
    private val ct =
        Exercise(
            id = "ct", kind = Kinds.CATEGORIZE, explanationUz = "izoh",
            categories = listOf("Countable", "Uncountable"),
            sortItems = listOf(SortItem("apple", 0), SortItem("milk", 1), SortItem("egg", 0)),
        )
    private val sa =
        Exercise(id = "sa", kind = Kinds.SHORT_ANSWER, explanationUz = "izoh", question = "How old is Samir?", accepted = listOf("eleven", "11"))

    @Test fun `multi-select aniq toplam togri, tartib ahamiyatsiz`() = assertTrue(checkAnswer(ms, listOf(2, 0)).correct)

    @Test fun `multi-select bittasi yetishmasa qisman 0_5`() {
        val r = checkAnswer(ms, listOf(0))
        assertFalse(r.correct)
        assertEquals(0.5, r.partial, 1e-9)
        assertTrue(r.whyUz.contains("banana"))
    }

    @Test fun `multi-select ortiqcha tanlov ballni kamaytiradi`() {
        val r = checkAnswer(ms, listOf(0, 1, 2))
        assertFalse(r.correct)
        assertEquals(0.5, r.partial, 1e-9)
        assertTrue(r.whyUz.contains("ortiqça"))
        assertEquals(0.0, checkAnswer(ms, listOf(0, 1, 2, 3)).partial, 1e-9)
        assertFalse(checkAnswer(ms, emptyList<Int>()).correct)
    }

    @Test fun `dropdown har boshliq alohida`() {
        assertTrue(checkAnswer(dc, listOf("is", "are")).correct)
        val r = checkAnswer(dc, listOf("are", "are"))
        assertEquals(0.5, r.partial, 1e-9)
        assertTrue(r.whyUz.contains("1-böşliq"))
    }

    @Test fun `sequence togri va notogri tartib`() {
        assertTrue(checkAnswer(sq, sq.items).correct)
        val r = checkAnswer(sq, listOf("Hello!", "Fine, thanks.", "Hi, how are you?"))
        assertFalse(r.correct)
        assertEquals(1.0 / 3, r.partial, 1e-9)
        assertTrue(r.whyUz.contains("2-örinda"))
        assertFalse(checkAnswer(sq, listOf("Hello!")).correct)
    }

    @Test fun `categorize guruhlar`() {
        assertTrue(checkAnswer(ct, mapOf("apple" to 0, "milk" to 1, "egg" to 0)).correct)
        val r = checkAnswer(ct, mapOf("apple" to 0, "milk" to 0, "egg" to 0))
        assertFalse(r.correct)
        assertEquals(2.0 / 3, r.partial, 1e-9)
        assertTrue(r.whyUz.contains("milk"))
    }

    @Test fun `short-answer bardoshli`() {
        assertTrue(checkAnswer(sa, listOf("Eleven.")).correct)
        assertTrue(checkAnswer(sa, "11").correct)
        assertFalse(checkAnswer(sa, listOf("twelve")).correct)
        assertFalse(checkAnswer(sa, listOf("")).correct)
    }
}
