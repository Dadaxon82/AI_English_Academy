package com.dadaxon.aienglishacademy

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Uzoq ro'yxatlar BO'LAKLAB chizilishi kerak — hammasi bir zamlda emas.
 *
 * SABAB (emulator dalili, 2026-11-05): Lug'at ekranida 117 ta so'z kartasi
 * bitta `for` sikli bilan qurilardi. Asosiy o'qim ~10 s band bo'ldi, tizim
 * ANR yozdi: `/data/anr/anr_2026-11-05-17-43-31-296` —
 * `main` o'qimi `Rows.small → VocabularyFragment.wordCard` ichida Runnable.
 * Tuzatishdan keyin o'lchov: eng uzun asosiy-o'qim bloki 49 kadr (~0.8 s),
 * ANR yo'q, keyingi ekranga o'tish ishlaydi (`dumpsys gfxinfo`:
 * 95-persent kadr 109 ms).
 *
 * Mobilda RecyclerView yo'q (XML Views + dinamik qatorlar), shuning uchun
 * bu test qoidani STATIK tekshiradi: kartalar sig'imi chegaralangan bo'lsin,
 * kartalar statistika bilan BIR sig'imga aralashmasin.
 */
class ListPagingTest {

    private fun appDir(): File {
        val candidates = listOf(File("."), File("app"), File(".."))
        return candidates.firstOrNull { File(it, "src/main/java").isDirectory } ?: File(".")
    }

    private fun src(rel: String): String = File(appDir(), rel).readText()

    @Test
    fun vocabularyListIsBoundedAndPaged() {
        val f = src("src/main/java/com/dadaxon/aienglishacademy/ui/VocabularyFragment.kt")

        // 1) Bir bo'lakda nechta karta chizilishi ANIQ yozilgan.
        val page = Regex("""const val PAGE = (\d+)""").find(f)?.groupValues?.get(1)?.toInt()
        assertTrue("`PAGE` (bir bölakdagi kartalar soni) topilmadi", page != null)
        assertTrue(
            "Bölak juda katta ($page) — asosiy öqimni bloklaydi; 24 dan katta bölmasin",
            page!! in 1..24,
        )

        // 2) Ro'yxat sig'imiga cheksiz `for` bilan qo'shilmasin.
        assertTrue(
            "Kartalar hali ham butun filtr natijasidan birga qurilmoqda",
            !Regex("""for \(\w+ in filtered\)\s*\n?\s*\w+\.addView""").containsMatchIn(f),
        )
        // 3) Chizilgan son index orqali chegaralanadi (`coerceIn`) va keyingi
        //    bo'lak `rendered` dan davom etadi (qayta qurilmaydi).
        assertTrue("Çiziş çegarasi (`coerceIn`) yöq", f.contains("shown.coerceIn("))
        assertTrue("Bölak davomi (`rendered until`) yöq", Regex("""rendered until""").containsMatchIn(f))

        // 4) Davom tugmasi — foydalanuvchi "hammasi yo'q" deb o'ylamasligi uchun
        //    ko'rsatilgan son ochiq aytiladi.
        assertTrue("`vocab_show_more` işlatilmaydi", f.contains("R.string.vocab_show_more"))
        assertTrue("`vocab_shown` işlatilmaydi", f.contains("R.string.vocab_shown"))
    }

    /**
     * Kartalar va statistika/plitalar ALOHIDA sig'imdа bo'lishi shart: bo'lak
     * qo'shilganda statistikalar qayta qurilmasligi uchun va aks holda
     * `Rows.clear` butun ekranni tozalab, yana 117 kartani qayta qurardi.
     */
    @Test
    fun cardsHaveTheirOwnContainer() {
        val xml = src("src/main/res/layout/fragment_vocabulary.xml")
        assertTrue("`vocabCards` siğimi yöq", xml.contains("""android:id="@+id/vocabCards""""))
        assertTrue("`vocabRows` (statistika) siğimi yöq", xml.contains("""android:id="@+id/vocabRows""""))
    }
}
