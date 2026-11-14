package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.FsAssetSource
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Talaffuz moslash — veb `src/test/pronunciation-immersion.test.tsx` bilan bir xil holatlar. */
class PronunciationTest {
    @Test
    fun hammasiTanildiTinishBelgisiAhamiyatsiz() {
        val r = comparePronunciation("Can I have a cup of tea, please?", "can i have a cup of tea please")
        assertEquals(100, r.score)
        assertTrue(r.words.all { it.ok })
        assertEquals("please?", r.words[7].text)
    }

    @Test
    fun tushibQolganVaOrtiqcha() {
        val r = comparePronunciation("I usually get up at seven", "I get up at eleven")
        assertEquals(listOf(true, false, true, true, true, false), r.words.map { it.ok })
        assertEquals(listOf("eleven"), r.extra)
        assertEquals(67, r.score)
    }

    @Test
    fun apostrofVaRaqam() {
        assertEquals(100, comparePronunciation("I’m nineteen", "I'm nineteen").score)
        assertEquals(100, comparePronunciation("It takes 4 hours", "it takes four hours").score)
        assertEquals(0, comparePronunciation("Hello there", "").score)
    }

    @Test
    fun gaplarSuhbatlardanTakrorsiz() {
        val dir = listOf("src/main/assets", "app/src/main/assets", "mobile/app/src/main/assets").map { File(it) }.first { File(it, ContentRepository.MANIFEST_PATH).isFile }
        val list = pronunciationSentences(ContentRepository(FsAssetSource(dir)).dialogues(), "A1")
        assertTrue(list.size > 20)
        assertEquals(list.size, list.map { it.en }.toSet().size)
        assertTrue(list.all { it.en.split(Regex("\\s+")).size in 3..12 && !it.en.contains("___") })
        // Veb bilan bir xil son (A1: 43 ta — veb sahifasi «1 / 43»).
        assertEquals(43, list.size)
    }
}
