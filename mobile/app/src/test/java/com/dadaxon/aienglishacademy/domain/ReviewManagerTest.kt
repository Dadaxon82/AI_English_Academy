package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.FsAssetSource
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.SrsState
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/** Takrorlash menejeri — veb `src/test/review-manager.test.ts` bilan bir xil holatlar. */
class ReviewManagerTest {
    private fun assetsDir(): File {
        for (c in listOf("src/main/assets", "app/src/main/assets", "mobile/app/src/main/assets")) {
            val f = File(c)
            if (File(f, ContentRepository.MANIFEST_PATH).isFile) return f
        }
        throw IllegalStateException("assets topilmadi")
    }

    private val repo = ContentRepository(FsAssetSource(assetsDir()))
    private val vocab = repo.bundle("A1").vocab
    private val grammarEx: List<Exercise> = repo.bundle("A1").grammar.flatMap { it.exercises }
    private val t0 = 1_793_000_000_000L
    private val day = 86_400_000L

    private fun due(lapses: Int = 0, at: Long = t0 - 1): SrsState =
        review(initialSrsState(t0 - 5 * day), SrsGrade.GOOD, t0 - 5 * day).copy(dueAt = at, lapses = lapses)

    private fun mistake(e: Exercise, wrong: Int = 1) = Mistake(e, wrong, t0, "")

    @Test
    fun vocabIdOfExerciseHarXilPrefiks() {
        assertEquals("a1-v-hello", vocabIdOfExercise("vocab-quiz-a1-v-hello"))
        assertEquals("a1-v-hello", vocabIdOfExercise("vocab-pic-a1-v-hello"))
        assertEquals("a1-v-hello", vocabIdOfExercise("vocab-sent-en-a1-v-hello"))
        assertEquals("a1-v-hello", vocabIdOfExercise("vocab-sent-uz-a1-v-hello"))
        assertNull(vocabIdOfExercise("a1-g1-ex1"))
        assertNull(vocabIdOfExercise("dlg-a1-d5-cafe-1"))
    }

    @Test
    fun navbatmaNavbatVaSrsTartibi() {
        val (v1, v2) = vocab
        val srs = mapOf(v1.id to due(0, t0 - 100), v2.id to due(2, t0 - 10))
        val plan = buildReviewPlan(listOf(mistake(grammarEx[0]), mistake(grammarEx[1])), srs, vocab, t0)
        assertEquals(listOf(grammarEx[0].id, "vocab-quiz-${v2.id}", grammarEx[1].id, "vocab-quiz-${v1.id}"), plan.exerciseIds)
        assertEquals(2, plan.mistakes)
        assertEquals(2, plan.words)
    }

    @Test
    fun birXatoIkkiMartaSanalmaydi() {
        val v = vocab[0]
        val quiz = repo.vocabQuizExercise(v)
        val plan = buildReviewPlan(listOf(mistake(quiz)), mapOf(v.id to due()), vocab, t0)
        assertEquals(listOf(quiz.id), plan.exerciseIds)
        assertEquals(0, plan.words)
    }

    @Test
    fun chegaraVaBoshHolat() {
        assertEquals(REVIEW_MAX, buildReviewPlan(grammarEx.take(20).map { mistake(it) }, emptyMap(), vocab, t0).exerciseIds.size)
        assertEquals(ReviewPlan(emptyList(), 0, 0), buildReviewPlan(emptyList(), mapOf(vocab[0].id to due(0, t0 + day)), vocab, t0))
    }

    @Test
    fun variantsizLugatSavoliToldiriladiVaBarqaror() {
        val v = vocab[0]
        val bare = repo.vocabQuizExercise(v)
        assertEquals(1, bare.options!!.size)
        val a = withQuizOptions(bare, vocab)
        val b = withQuizOptions(bare, vocab)
        assertEquals(4, a.options!!.size)
        assertEquals(v.translationUz, a.options!![a.answerIndex])
        assertEquals("bir xil id — bir xil tartib", a.options, b.options)
        assertTrue(a.options!!.toSet().size == 4)
        // To'liq savol va boshqa mashqlar o'zgarmaydi.
        assertSame(a, withQuizOptions(a, vocab))
        assertSame(grammarEx[0], withQuizOptions(grammarEx[0], vocab))
        assertEquals(Kinds.MULTIPLE_CHOICE, a.kind)
    }
}
