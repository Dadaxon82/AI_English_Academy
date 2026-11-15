package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.Pair2
import com.dadaxon.aienglishacademy.data.Skills
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Javob tekshiruv testlari — veb `src/test/check.test.ts` kutilganlari
 * (6 mashq turi + chegara holatlar) asosida.
 */
class AnswerCheckerTest {
    /* ------------------------------ multiple-choice ------------------------------ */

    private val mc =
        Exercise(
            id = "x-1",
            kind = Kinds.MULTIPLE_CHOICE,
            instructionUz = "Töğri variantni tanlang.",
            level = Levels.A1,
            skill = Skills.GRAMMAR,
            difficulty = 2,
            explanationUz = "Izoh.",
            question = "She ___ to school every day.",
            options = listOf("go", "goes", "going"),
            answerIndex = 1,
        )

    @Test
    fun `multiple-choice indeks boyicha tekshiradi`() {
        val r = checkAnswer(mc, 1)
        assertTrue(r.correct)
        assertEquals("goes", r.given)
        assertEquals("Izoh.", r.whyUz)
        assertFalse(checkAnswer(mc, 0).correct)
        assertEquals(1.0, r.partial, 1e-9)
    }

    @Test
    fun `multiple-choice - javob BERILMAGAN bo'lsa 0-variant to'g'ri bo'lmaydi`() {
        val first = mc.copy(answerIndex = 0)
        for (empty in listOf<Any?>("", null, "   ")) {
            val r = checkAnswer(first, empty)
            assertFalse("$empty javobsiz hisoblanişi kerak edi", r.correct)
            assertEquals("", r.given)
            assertEquals("go", r.expected)
        }
        assertTrue(checkAnswer(first, 0).correct)
        // Son ko'rinishidagi satr ham index sifatida o'qiladi (veb: Number('1'))
        assertFalse(checkAnswer(first, "1").correct)
        assertTrue(checkAnswer(mc, "1").correct)
    }

    @Test
    fun `multiple-choice - nan va manfiy indeks javobsiz`() {
        val r = checkAnswer(mc, "goes")
        assertFalse(r.correct)
        assertEquals("", r.given)
        assertFalse(checkAnswer(mc, -1).correct)
        assertFalse(checkAnswer(mc, 99).correct)
        assertFalse(checkAnswer(mc, true).correct) // Boolean — index emas
    }

    /* ------------------------------ true-false-notgiven ------------------------------ */

    private val tf =
        Exercise(
            id = "x-1",
            kind = Kinds.TRUE_FALSE_NOTGIVEN,
            instructionUz = "True / False / Not Given.",
            level = Levels.A1,
            skill = Skills.READING,
            difficulty = 2,
            explanationUz = "Izoh.",
            statement = "Tom works on Sundays.",
            answer = "notgiven",
            evidence = "Tom works from Monday to Saturday.",
        )

    @Test
    fun `tfng - evidence izohga qoshiladi`() {
        val r = checkAnswer(tf, "notgiven")
        assertTrue(r.correct)
        assertTrue(r.whyUz.contains("Tom works from Monday to Saturday."))
        assertEquals("Not Given", r.given)
        assertEquals("Not Given", r.expected)
        val bad = checkAnswer(tf, "true")
        assertFalse(bad.correct)
        assertTrue(bad.whyUz.contains("Töğri javob — Not Given."))
        assertTrue(bad.whyUz.contains("Matndagi asos: “Tom works from Monday to Saturday.”"))
    }

    @Test
    fun `tfng - registrga sezgir (vebdagi === saqlanadi)`() {
        assertFalse(checkAnswer(tf, "NotGiven").correct)
        assertFalse(checkAnswer(tf, null).correct)
        assertEquals("", checkAnswer(tf, null).given)
    }

    /* ------------------------------ matching ------------------------------ */

    private val match =
        Exercise(
            id = "x-1",
            kind = Kinds.MATCHING,
            instructionUz = "Juftlaştiring.",
            level = Levels.A1,
            skill = Skills.VOCABULARY,
            difficulty = 2,
            explanationUz = "Izoh.",
            pairs = listOf(Pair2("apple", "olma"), Pair2("bread", "non")),
        )

    @Test
    fun `matching - qisman hisob (partial) beriladi`() {
        val r = checkAnswer(match, mapOf("apple" to "olma", "bread" to "suv"))
        assertFalse(r.correct)
        assertEquals(0.5, r.partial, 1e-9)
        assertTrue(r.whyUz.contains("1/2"))
        // Veb `check.ts::checkMatching` — noto'g'ri juftlikda KERAKLI o'ng qiymat
        // yoziladi: `“${pair.left}” → ${pair.right}` (foydalanuvchinik emas).
        assertTrue(r.whyUz.contains("“bread” → non"))
    }

    @Test
    fun `matching - javob berilmasa barchasi xato`() {
        for (noAnswer in listOf<Any?>(null, "", 5)) {
            val r = checkAnswer(match, noAnswer)
            assertFalse(r.correct)
            assertEquals(0.0, r.partial, 1e-9)
            assertTrue(r.whyUz.startsWith("0/2 juftlik töğri."))
            assertEquals("apple → —; bread → —", r.given)
        }
    }

    @Test
    fun `matching - to'liq to'g'ri`() {
        val r = checkAnswer(match, mapOf("apple" to "olma", "bread" to "non"))
        assertTrue(r.correct)
        assertEquals(1.0, r.partial, 1e-9)
        assertEquals("Izoh.", r.whyUz)
    }

    /* ------------------------------ gap-fill ------------------------------ */

    private val gap =
        Exercise(
            id = "x-1",
            kind = Kinds.GAP_FILL,
            instructionUz = "Böş joyni töldiring.",
            level = Levels.A1,
            skill = Skills.GRAMMAR,
            difficulty = 2,
            explanationUz = "Izoh.",
            text = "I ___ a student and she ___ a teacher.",
            answers = listOf("am", "is"),
            acceptAlternatives = listOf(emptyList(), listOf("is")),
        )

    @Test
    fun `gap-fill - alternativ javoblar qabul qilinadi`() {
        assertTrue(checkAnswer(gap, listOf("am", "is")).correct)
        val part = checkAnswer(gap, listOf("am", "are"))
        assertFalse(part.correct)
        assertEquals(0.5, part.partial, 1e-9)
        assertTrue(part.whyUz.contains("2-böşliq: sizda “are”, töğri: “is”"))
    }

    @Test
    fun `gap-fill - javoblar kam bo'lsa (buoshiq) bo'sh hisoblanadi`() {
        val r = checkAnswer(gap, listOf("am"))
        assertFalse(r.correct)
        assertEquals(0.5, r.partial, 1e-9)
        assertTrue(r.whyUz.contains("2-böşliq: sizda “böş”, töğri: “is”"))
        val none = checkAnswer(gap, emptyList<String>())
        assertFalse(none.correct)
        assertEquals(0.0, none.partial, 1e-9)
    }

    private val gapApos =
        Exercise(
            id = "x-1",
            kind = Kinds.GAP_FILL,
            instructionUz = "Böş joyni töldiring.",
            level = Levels.A1,
            skill = Skills.GRAMMAR,
            difficulty = 2,
            explanationUz = "Izoh.",
            text = "He ___ any money.",
            answers = listOf("doesn't"),
        )

    @Test
    fun `gap-fill - apostrofsiz variant (doesnt) rad etilmaydi`() {
        assertTrue(checkAnswer(gapApos, listOf("doesn't")).correct)
        assertTrue(checkAnswer(gapApos, listOf("doesnt")).correct)
        assertFalse(checkAnswer(gapApos, listOf("isnt")).correct)
    }

    @Test
    fun `gap-fill - caseSensitive=true bo'lsa registr hisobga olinadi`() {
        val cs = gapApos.copy(caseSensitive = true)
        assertTrue(checkAnswer(cs, listOf("doesn't")).correct)
        assertFalse(checkAnswer(cs, listOf("Doesn't")).correct)
    }

    /* ------------------------------ word-order ------------------------------ */

    private val wo =
        Exercise(
            id = "x-1",
            kind = Kinds.WORD_ORDER,
            instructionUz = "Sözlarni tartib bilan tizing.",
            level = Levels.A1,
            skill = Skills.GRAMMAR,
            difficulty = 2,
            explanationUz = "Izoh.",
            bank = listOf("a", "doctor", "She", "is"),
            answers = listOf("She", "is", "a", "doctor"), // JSON'da `answer`
            noteUz = "Eslatma.",
        )

    @Test
    fun `word-order - normallashtirilgan taqqoslash`() {
        assertTrue(checkAnswer(wo, listOf("she", "IS", "a", "doctor.")).correct)
        val bad = checkAnswer(wo, listOf("is", "she", "a", "doctor"))
        assertFalse(bad.correct)
        assertTrue(bad.whyUz.contains("1-örin"))
        assertTrue(bad.whyUz.contains("“She” turişi kerak edi"))
        assertTrue(bad.whyUz.contains("sizda “is”"))
    }

    @Test
    fun `word-order - qator korinishidagi javob tokenlarga ajratiladi`() {
        val r = checkAnswer(wo, "She  is a doctor.")
        assertTrue(r.correct)
        // Veb: `given = tokens.join(' ')` — normallashtirish FAQAT taqqoslash uchun,
        // nuqta saqlanadi.
        assertEquals("She is a doctor.", r.given)
        val bad = checkAnswer(wo, "is she a doctor")
        assertFalse(bad.correct)
        assertTrue(bad.whyUz.contains("1-örin"))
    }

    @Test
    fun `word-order - javob berilmagan`() {
        val r = checkAnswer(wo, null)
        assertFalse(r.correct)
        assertEquals("", r.given)
        assertEquals("She is a doctor", r.expected)
    }

    /* ------------------------------ translation ------------------------------ */

    private val tr =
        Exercise(
            id = "x-1",
            kind = Kinds.TRANSLATION,
            instructionUz = "Tarjima qiling.",
            level = Levels.A1,
            skill = Skills.WRITING,
            difficulty = 2,
            explanationUz = "Izoh.",
            source = "Kitob",
            sourceLang = "uz",
            accepted = listOf("book"),
        )

    @Test
    fun `translation - registr va belgilardan qat'iy emas`() {
        assertTrue(checkAnswer(tr, "Book").correct)
        assertTrue(checkAnswer(tr, "  book! ").correct)
        assertFalse(checkAnswer(tr, "pen").correct)
        val r = checkAnswer(tr, "pen")
        assertTrue(r.whyUz.contains("Qabul qilingan variantlar: “book”."))
    }

    @Test
    fun `translation - o'zbekcha apostrof variantlari (uch xil belgi)`() {
        val uz =
            Exercise(
                id = "x-1",
                kind = Kinds.TRANSLATION,
                instructionUz = "Tarjima qiling.",
                level = Levels.A1,
                skill = Skills.WRITING,
                difficulty = 2,
                explanationUz = "Izoh.",
                source = "I am twelve years old.",
                sourceLang = "en",
                accepted = listOf("Mening ismim Aziza va men o‘n ikki yoshdaman"),
            )
        assertTrue(checkAnswer(uz, "Mening ismim Aziza va men oʻn ikki yoshdaman").correct)
        assertTrue(checkAnswer(uz, "Mening ismim Aziza va men o'n ikki yoshdaman").correct)
        // Yangi alifbo (ö, ş) — eski yozuv bilan teng.
        assertTrue(checkAnswer(uz, "Mening ismim Aziza va men ön ikki yoşdaman").correct)
        // Apostrof umuman tushirib qo'yilsa ham rad etilmaydi.
        assertTrue(checkAnswer(uz, "Mening ismim Aziza va men on ikki yoshdaman").correct)
    }

    /* ------------------------------ normalize / looseEquals ------------------------------ */

    @Test
    fun `normalize - apostrof va diacritic belgilarni bir xillashtiradi`() {
        assertEquals("don't tell", normalize("Don’t TELL"))
        assertEquals("cafe", normalize(" café "))
    }

    @Test
    fun `normalize - NFD + birlashgan belgi (u + diaeresis) - 'u'`() {
        // "u" + U+0308 (combining diaeresis) → "u"
        assertEquals("u", normalize("ü"))
        // Apostrof (U+02BB/U+2018...) `'` ga almashtiriladi va u ruxsat etilgan
        // belgilar to'plamida — vebda "oʻz" → "o'z" (o'chirilmaydi).
        assertEquals("o'z", normalize("oʻz"))
        assertEquals("o'zbekiston", normalize("O‘zbekiston"))
        assertEquals("men o'n ikki yoshdaman", normalize("men oʻn ikki yoshdaman"))
        assertEquals("men o'n ikki yoshdaman", normalize("men o‘n ikki yoshdaman"))
        // Yangi alifbo harflari eski shaklga keltiriladi (veb `foldUzLatin`).
        assertEquals("men o'n ikki yoshdaman", normalize("men ön ikki yoşdaman"))
        assertEquals("o'quvchi g'alaba", normalize("ÖQUVÇI ĞALABA"))
    }

    @Test
    fun `normalize - boshi va oxiri qirqiladi, qoshimcha bushliqlar bittaga tushadi`() {
        assertEquals("a b", normalize("   a    b   "))
        assertEquals("", normalize(""))
        assertEquals("", normalize("   "))
        // Noma'lum belgilar bo'shliq bo'ladi
        assertEquals("a b", normalize("a—b"))
    }

    @Test
    fun `looseEquals - apostrofsiz variant ham teng`() {
        assertTrue(looseEquals("doesn't", "doesnt"))
        assertTrue(looseEquals("TÖĞRI", "töğri"))
        assertFalse(looseEquals("isnt", "doesnt"))
        assertTrue(looseEquals("cafe", "café"))
    }

    /* ------------------------------ noto'g'ri tur / keyingi indeks ------------------------------ */

    @Test
    fun `noma'lum mashq turida javob berilmagan deb hisoblanadi`() {
        val unknown = Exercise(id = "x-9", kind = "noma'lum-tur", explanationUz = "Izoh.")
        val r = checkAnswer(unknown, "heç narsa")
        assertFalse(r.correct)
        assertEquals("", r.given)
        assertEquals("Izoh.", r.whyUz)
    }

    @Test
    fun `nextExerciseIndex - xato bilan bir oldinga qaytadi, yuqori avg bilan keyingiga`() {
        val ok = CheckOutcome(true, "a", "a", "", 1.0)
        val bad = CheckOutcome(false, "a", "b", "", 0.0)
        // Veb: `Math.max(0, Math.min(total - 1, next))` — xatoda current-1 = 4
        // (chegara 0 EMAS, 4 musbat).
        assertEquals(4, nextExerciseIndex(5, listOf(bad), 6))
        assertEquals(2, nextExerciseIndex(1, listOf(ok, ok, ok), 6))
        assertEquals(1, nextExerciseIndex(1, listOf(ok, bad, ok), 6))
        // partial 0.7 lekin `correct=false` — veb AVVAL `!last.correct` ni tekshiradi
        // (o'rtacha hisobga qaramay), shuning uchun bir ORDIN ORQAGA: 1-1 = 0.
        val half = CheckOutcome(false, "a", "b", "", 0.7)
        assertEquals(0, nextExerciseIndex(1, listOf(half), 6))
        // Havza kichik bo'lsa doim 0
        assertEquals(0, nextExerciseIndex(3, listOf(ok), 1))
        assertEquals(0, nextExerciseIndex(3, listOf(ok), 0))
    }
}
