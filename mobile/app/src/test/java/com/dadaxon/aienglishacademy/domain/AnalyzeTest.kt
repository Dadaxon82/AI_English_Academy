package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.MustInclude
import com.dadaxon.aienglishacademy.data.WritingTask
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Qoidaviy tahlil testlari — veb `src/test/analyze-rules.test.ts`
 * kutilganlari (soxta agreement xatolari va `mustInclude` anchor bugi).
 */
class AnalyzeTest {
    private val cleanA1 =
        "I am twelve years old. I go to school every day and I like my teacher. " +
            "My family has five people and we eat dinner together. We are happy."

    private val stubTask =
        WritingTask(
            id = "t-stub",
            level = "A1",
            genre = "paragraph",
            promptEn = "About your family.",
            instructionUz = "Oilangiz haqida yozing.",
            minWords = 25,
            maxWords = 80,
            minutes = 10,
            criteria = listOf("task_achievement", "coherence", "lexical_resource", "grammatical_range", "accuracy"),
            mustInclude = listOf(MustInclude("my family", "Oilangizni titlang.")),
        )

    @Test
    fun `countWords - harf yoki raqamli tokenlar sanaladi`() {
        // Veb: `text.trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length`
        // — nuqta/tire/nuqta-unchadan iborat tokenlarda harf yo'q, ular SANALMAYDI.
        assertEquals(0, countWords(""))
        assertEquals(0, countWords("   "))
        assertEquals(3, countWords("I am happy"))
        assertEquals(0, countWords("... -- !!"))
        assertEquals(4, countWords("Men 12 yoşdaman. (hozir)"))
    }

    @Test
    fun `toza A1 matnida soxta kelishuv (agreement) xatosi chiqmaydi`() {
        val a = analyzeWriting(cleanA1, stubTask)
        val agreement = a.errors.filter { it.kind == "agreement" }
        assertEquals("topildi: ${agreement.map { it.correction }}", emptyList<Nothing>(), agreement)
        assertEquals(5.0, a.criteriaScores.getValue("accuracy"), 1e-9)
        assertEquals(cleanA1.trim().split(Regex("\\s+")).size, a.wordCount)
        assertEquals("rule-based", a.engine)
    }

    @Test
    fun `haqiqiy kelishuv xatosi topiladi (he go)`() {
        val a = analyzeWriting("$cleanA1 He go to the market.", stubTask)
        val agreement = a.errors.filter { it.kind == "agreement" }
        assertEquals(1, agreement.size)
        assertEquals("He goes", agreement[0].correction)
        assertTrue(agreement[0].whyUz.contains("-s/-es"))
    }

    @Test
    fun `birinchi va ikkinchi shaxs avtoman to'g'ri (I go, we like)`() {
        val a = analyzeWriting("I go to school. We like English. They want tea. You need sugar.", stubTask.copy(minWords = 5))
        assertTrue(a.errors.none { it.kind == "agreement" })
    }

    @Test
    fun `imlo va punktuatsiya qoidalari`() {
        val a = analyzeWriting("i dont cant know. This is alot of wich becouse teh recieve isnt gonna thx a m.", stubTask.copy(minWords = 1))
        val kinds = a.errors.map { it.kind }.toSet()
        // Veb `src/lib/analyze.ts`da contraction qoidalari FAQAT `\bim\b(?=\s)` va
        // `\bive\b` — bu matnda "im"/"ive" yo'q, shuning uchun "contraction" turi
        // chiqmaydi (ro'yxat veb qoidalari bilan bir xil: cap/punct/spacing/register/spelling).
        listOf("capitalization", "punctuation", "spacing", "register", "spelling").forEach {
            assertTrue("$it turi kerak edi, borlari: $kinds", kinds.contains(it))
        }
        val corrections = a.errors.map { it.correction }
        listOf("I", "don't", "can't", "a lot", "which", "because", "the", "receive", "isn't", "going to", "thanks", "am").forEach {
            assertTrue("$corrections içida $it bölişi kerak", corrections.contains(it))
        }
    }

    @Test
    fun `xatolar 12 tadan ko'p bo'lmaydi`() {
        val text = "i dont cant ive isnt gonna thx wich becouse teh recieve alot a m. he go she do it have. i a m."
        val a = analyzeWriting(text, stubTask.copy(minWords = 1))
        // Veb `analyze.ts`: `if (errors.length >= 12) break` ichki `while` ni sinadi xolos —
        // tashqi qoidalar sikli DAVOM etadi, har bir keyingi qoida (agar mos kelsa) yana
        // bittadan qo'shadi. Shuning uchun 12 sof chegka EMAS: qoidaviy xatolar soni
        // qoidalar sonidan (16) oshmaydi, `mustInclude` (content) xatolari esa bundan
        // ham tashqarida qo'shiladi.
        val rules = a.errors.filter { it.kind != "content" }.size
        assertTrue("qoidaviy xatolar: $rules", rules in 12..16)
    }

    @Test
    fun `mustInclude naqshi matn o'rtasida bo'lsa ham topiladi`() {
        val text = "Yesterday my family and friends went out last weekend because it was sunny. $cleanA1"
        val a = analyzeWriting(text, stubTask.copy(mustInclude = listOf(MustInclude("my family weekend", "Oilangiz haqida."))))
        assertEquals(emptyList<Nothing>(), a.errors.filter { it.kind == "content" })
        assertTrue(a.criteriaScores.getValue("task_achievement") >= 4.0)
    }

    @Test
    fun `mustInclude topilmasa content xatosi chiqadi`() {
        val a = analyzeWriting(cleanA1, stubTask.copy(mustInclude = listOf(MustInclude("my holiday travel", "Ta'til haqida."))))
        val content = a.errors.filter { it.kind == "content" }
        assertEquals(1, content.size)
        assertEquals("my holiday travel", content[0].correction)
        assertTrue(content[0].whyUz.contains("Topşiriqda bu ma’no kutiladi"))
    }

    @Test
    fun `qisqa matn uchun zaiflik va tavsiyalar beriladi`() {
        val a = analyzeWriting("I like cats.", stubTask)
        assertEquals(3, a.wordCount)
        assertTrue(a.weaknessesUz.any { it.contains("Matn qisqa") })
        assertTrue(a.suggestionsUz.isNotEmpty())
        assertTrue(a.suggestionsUz.size <= 5)
        assertTrue(a.weaknessesUz.any { it.contains("Gaplar soni kam") })
        assertEquals(0.0, a.criteriaScores.getValue("task_achievement"), 1e-9)
    }

    @Test
    fun `kuchli matn kuchli tomonlar ro'yxatini oladi`() {
        val a = analyzeWriting(cleanA1, stubTask)
        assertTrue(a.strengthsUz.any { it.contains("Hajm talabi bajarildi") })
        assertTrue(a.strengthsUz.any { it.contains("Tekşirilgan asosiy xatolar topilmadi") })
    }

    @Test
    fun `criterionLabelUz o'zbekcha nomlar`() {
        assertEquals("Topşiriq bajarilişi", criterionLabelUz("task_achievement"))
        assertEquals("Mantiqiy boğlaniş", criterionLabelUz("coherence"))
        assertEquals("Aniqlik", criterionLabelUz("accuracy"))
        assertEquals("noma'lum", criterionLabelUz("noma'lum"))
    }

    /* ---------------------------- Speaking ---------------------------- */

    @Test
    fun `juda sekin gapirish wpm 60 dan past ravon deb 5 ball olmaydi`() {
        val transcript = "I like my cat. My cat is small. I feed my cat. I love my cat."
        val a = analyzeSpeaking(transcript, 25, 30, 60)
        assertTrue("wpm=${a.wpm}", a.wpm < 60)
        assertTrue("fluency=${a.fluency}", a.fluency <= 2)
        assertTrue(a.notesUz.any { it.contains("sekin") })
        assertTrue(a.notesUz.any { it.contains("Javob qisqa") })
        assertEquals("audio", a.mode)
        assertTrue(a.disclaimerUz.contains("rasmiy imtihon natijasi emas"))
    }

    @Test
    fun `me'yordagi tezlik (100 wpm) yuqori ravonlik oladi`() {
        val transcript = List(12) { "I go to school every day and I learn English words" }.joinToString(". ")
        val a = analyzeSpeaking(transcript, 60, 30, 60)
        assertTrue("wpm=${a.wpm}", a.wpm > 90)
        assertTrue("wpm=${a.wpm}", a.wpm <= 190)
        assertEquals(5.0, a.fluency, 1e-9)
    }

    @Test
    fun `ovozli javob bahosi ravonlik grammatika va lug'at o'rtachasi`() {
        val a = analyzeSpeaking("I go to school every day. I can read. I like it because it is fun.", 20, 30, 60)
        val expected = Math.round(((a.fluency + a.grammar + a.lexis) / 3 / 5) * 100).toInt()
        assertEquals(expected, speakingScore(a))
    }

    @Test
    fun `matnli javobda ravonlik o'lchanmaydi va bahoga kirmaydi`() {
        val text =
            "I am twelve years old. I usually go to school by bus because it is far. I can read and write English. " +
                "Yesterday I went to the park with my friends and we played football."
        val a = analyzeSpeakingText(text, 30, 60)
        assertEquals("text", a.mode)
        assertEquals(0.0, a.fluency, 1e-9)
        assertEquals(0.0, a.wpm, 1e-9)
        assertEquals(5.0, a.grammar, 1e-9)
        assertTrue(a.lexis > 0)
        assertEquals(Math.round(((a.grammar + a.lexis) / 2 / 5) * 100).toInt(), speakingScore(a))
        assertTrue(a.notesUz.first().contains("Matnli javob"))
        assertTrue(a.disclaimerUz.contains("ravonlik ölçanmaydi"))
    }

    @Test
    fun `qisqa matn uchun hajm past va izoh beriladi`() {
        val a = analyzeSpeakingText("I like cats.", 30, 60)
        assertEquals(0.0, a.length, 1e-9)
        assertTrue(a.notesUz.any { it.contains("qisqa") })
    }

    @Test
    fun `matnli javob gapirish dalili sifatida hisobga olinadi`() {
        val text =
            "I am twelve years old. I usually go to school by bus because it is far. I can read and write English. " +
                "Yesterday I went to the park with my friends and we played football."
        val a = analyzeSpeakingText(text, 30, 60)
        val data =
            com.dadaxon.aienglishacademy.data.AppData.empty("u1").copy(
                speaking =
                    listOf(
                        com.dadaxon.aienglishacademy.data.SpeakingSession(
                            id = "sp-1",
                            taskId = "t",
                            durationSec = 0,
                            analysis = a,
                            textAnswer = text,
                            createdAt = System.currentTimeMillis(),
                        ),
                    ),
            )
        val sp = skillEvidence(data).first { it.skill == "speaking" }
        assertEquals(1, sp.evidenceCount)
        assertEquals(speakingScore(a).toDouble(), sp.score, 1e-9)
    }

    @Test
    fun `SpeakingTask orqali og'irliklar olinadi`() {
        // Veb: `analyzeSpeaking(transcript, durationSec, task)` — min/target
        // qiymatlari topshiriqdan olinadi. 25 s: min 20 → longay 3, min 30 → 1.
        val task = com.dadaxon.aienglishacademy.data.SpeakingTask(id = "sp-1", level = "A1", minSeconds = 20, targetSeconds = 45)
        val overTask = analyzeSpeaking("I like english. I go.", 25, task)
        val explicit = analyzeSpeaking("I like english. I go.", 25, 20, 45)
        assertEquals(explicit, overTask)
        assertEquals(3.0, overTask.length, 1e-9)
        assertEquals(1.0, analyzeSpeaking("I like english. I go.", 25, 30, 60).length, 1e-9)
        assertEquals("rule-based", overTask.engine)
        assertEquals("audio", overTask.mode)
        // Matnli yo'l ham topshiriqdan oladi (ravonlik 0).
        val txt = analyzeSpeakingText("I like english. I go.", task)
        assertEquals(0.0, txt.fluency, 1e-9)
        assertEquals(0.0, txt.wpm, 1e-9)
        assertEquals(overTask.lexis, txt.lexis, 1e-9)
    }
}
