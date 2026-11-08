package com.dadaxon.aienglishacademy.ui

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mashq jarayonining progress chizig'i (`R.id.exBar`) testi.
 *
 * Vebdagi moslama: `src/components/ExerciseRunner.tsx` dagi `.aea-step-bar`
 * (test: `src/test/exercise-runner.test.tsx`). Ikkala tomonda uchta qoida
 * BIR XIL bo'lishi shart (foydalanuvchi telefon va brauzerda bir xil
 * jarayonni ko'rishi uchun):
 *   1. chiziq mavjud va u eski `exCounter` SON MATNINING o'rnini bosadi;
 *   2. son ixtir qilinmaydi — bar FAQAT JAVOB BERILGAN mashqlarni ko'rsatadi
 *      (`index` + `checked` dan hisoblanadi, `results` sanog'idan emas);
 *   3. harakat o'chirilganda (`Motion.enabled` false) bar SILJIMAYDI.
 *
 * Test faylni O'QIB tekshiradi (`LayoutWiringTest` / `MascotPresenceTest`
 * an'anasida) — Android Framework testda ishlamaydi.
 */
class ExerciseProgressTest {

    /** Gradle test ischi papkasisi modil papkasi — yo'llar shundan qidiriladi. */
    private fun appDir(): File {
        val candidates = listOf(File("."), File("app"), File(".."))
        return candidates.firstOrNull { File(it, "src/main/res/layout").isDirectory } ?: File(".")
    }

    private val app = appDir()

    @Test
    fun layoutdaJarayonChizigiBorVaEskiSonMatniniOrniniBosadi() {
        val xml = File(app, "src/main/res/layout/fragment_exercise.xml").readText()
        assertTrue(
            "fragment_exercise.xml da `exBar` bo'lishi kerak (vebdagi `.aea-step-bar` moslamasi)",
            xml.contains("""android:id="@+id/exBar""""),
        )
        assertTrue(
            "`exBar` Material `LinearProgressIndicator` bo'lishi kerak — YANGI bog'liqlik qo'shilmaydi",
            xml.contains("com.google.android.material.progressindicator.LinearProgressIndicator"),
        )
        // Qoida: bar sonning O'RNINI bosadi (Duolingo jarayoni). Aks holda
        // ekranda ikkita jarayon ko'rsatkichi qoladi.
        assertTrue(
            "`exCounter` matni `exBar` bilan almashtirilgan bo'lishi kerak",
            !xml.contains("""android:id="@+id/exCounter"""),
        )
    }

    @Test
    fun barSonIxtirQilinmaydiIndexVaCheckedDanHisoblanadi() {
        val src = fragmentSource()
        val fn = src.substringAfter("private fun showProgress(animate: Boolean)")
        assertTrue(
            "bar qiymati vebdagi `answeredCount` qoidasi bilan bir xil bo'lishi shart " +
                "(`checked` bo'lsa index+1, aks holda index)",
            fn.contains("val done = if (checked) index + 1 else index"),
        )
        assertTrue(
            "foiz haqiqiy hisobdan olinadi, chegaralangan (soxta to'ldirish yo'q)",
            fn.contains("done.coerceIn(0, total) * 100 / total"),
        )
        assertTrue(
            "son matni `contentDescription`da saqlanadi — ekranni o'qiydigan dastur o'qiydi",
            fn.contains("getString(R.string.ex_index, done, total)"),
        )
    }

    @Test
    fun harakatOchirilsaBarSiljimaydiVaBarJavobBilanHarakatlanadi() {
        val src = fragmentSource()
        val fn = src.substringAfter("private fun showProgress(animate: Boolean)")
        assertTrue(
            "harakat o'chirilganda `setProgressCompat(…, false)` bo'lishi shart " +
                "(vebdagi `html.no-motion` qoidasining mobil ekvivalenti)",
            fn.contains("animate && Motion.enabled(requireContext())"),
        )
        val onCheck = src.substringAfter("private fun onCheck()").substringBefore("private fun showOutcome")
        assertTrue(
            "bar javob bilan birga siljishi kerak (to'g'ri/noto'g'ri farqi yo'q)",
            onCheck.contains("showProgress(animate = true)"),
        )
        val show = src.substringAfter("private fun showExercise(i: Int)").substringBefore("private fun hideAllInputs")
        assertTrue(
            "mashq ochilganda bar joyiga o'tadi (animatsiya yo'q)",
            show.contains("showProgress(animate = false)"),
        )
    }

    private fun fragmentSource(): String =
        File(app, "src/main/java/com/dadaxon/aienglishacademy/ui/runner/ExerciseFragment.kt").readText()
}
