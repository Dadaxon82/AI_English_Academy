package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.SelfRating
import org.junit.Assert.assertEquals
import org.junit.Test

/** Veb `self-assessment.test.ts` bilan bir xil: har da'vo bo'yicha eng keyingi baho qoladi. */
class SelfAssessmentMergeTest {
    @Test fun `eng keyingi baho qoladi`() {
        val merged = mergeSelfAssessment(
            mapOf("a" to SelfRating(2, 10), "b" to SelfRating(5, 50)),
            mapOf("a" to SelfRating(4, 20), "b" to SelfRating(1, 30), "c" to SelfRating(3, 5)),
        )
        assertEquals(mapOf("a" to SelfRating(4, 20), "b" to SelfRating(5, 50), "c" to SelfRating(3, 5)), merged)
    }
}
