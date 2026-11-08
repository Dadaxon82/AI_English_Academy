package com.dadaxon.aienglishacademy.ui

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mashq JARAYONining fikr-mulohaza qatlami — silkinish, bosish va javob ovozi.
 *
 * Vebdagi moslama: `src/components/ExerciseRunner.tsx` + `src/index.css` +
 * `src/lib/feedbackSound.ts` (test: `src/test/exercise-runner.test.tsx` va
 * `src/test/motion.test.ts`). Ikkala tomonda uchta qoida BIR XIL:
 *   1. YANGI SON YO'Q — har bir uzamlik mavjud byudjetdan olinadi
 *      (`outcomeMs`, `popMs`, `pressMs`);
 *   2. harakat o'chirilgan bootsa (`Motion.enabled` false) — view darhol
 *      o'z holiga qaytadi, "siljiydigan" holat qolmaydi;
 *   3. ovoz FAYL EMAS — sintez qilinadi, shuning uchun `res/raw` ga audio
 *      qo'shilmaydi (vebdagi `public/audio/manifest.json` qoidasi bilan bir xil).
 *
 * Framework testda ishlamaydi, shuning uchun test manba matnini o'qib
 * tekshiradi (`ExerciseProgressTest` / `LayoutWiringTest` an'anasida).
 */
class ExerciseFeedbackTest {

    private fun appDir(): File {
        val candidates = listOf(File("."), File("app"), File(".."))
        return candidates.firstOrNull { File(it, "src/main/res/layout").isDirectory } ?: File(".")
    }

    private val app = appDir()

    private fun motionSource(): String =
        File(app, "src/main/java/com/dadaxon/aienglishacademy/ui/Motion.kt").readText()

    private fun fragmentSource(): String =
        File(app, "src/main/java/com/dadaxon/aienglishacademy/ui/runner/ExerciseFragment.kt").readText()

    @Test
    fun notogriJavobKartasiSilkinadiVaSilkinishByudjetdanOlinadi() {
        val src = fragmentSource()
        val outcome = src.substringAfter("private fun showOutcome(out: CheckOutcome, xp: Int)")
        assertTrue(
            "noto'g'ri javobda natija kartasi silkitilishi kerak (`Motion.shake`)",
            outcome.contains("Motion.shake(b.resultCard)"),
        )
        assertTrue(
            "silkinish FAQAT noto'g'ri tarmoqda bo'lishi kerak (to'g'ride — halqa/pop)",
            outcome.substringAfter("else {").contains("Motion.shake"),
        )

        val motion = motionSource()
        val shake = motion.substringAfter("fun shake(v: View)").substringBefore("/**")
        assertTrue(
            "silkinish uzamligi YANGI SON EMAS — mavjud `outcomeMs` bo'linadi",
            shake.contains("sp.outcomeMs / 5"),
        )
        assertTrue(
            "harakat o'chirilganda view joyiga qaytishi kerak (translyatsiya qolib ketmaydi)",
            shake.contains("v.translationX = 0f"),
        )
        // Bosqich nisbatlari veb CSS'dagi `@keyframes shake` bilan bir xil:
        // -7, +6, -4, +2, 0.
        for (ratio in listOf("d * 6 / 7f", "-d * 4 / 7f", "d * 2 / 7f", "translationX(0f)")) {
            assertTrue("silkinish bosqichi yo'q ($ratio) — veb bilan bir xil bo'lishi shart", shake.contains(ratio))
        }
    }

    @Test
    fun javobOvoziFaylEMASSintezQilinadiVaSozlamagaBoglangan() {
        val motion = motionSource()
        val play = motion.substringAfter("fun playFeedback(ctx: Context, correct: Boolean)")
        assertTrue("ovoz `AudioTrack`da generatsiya qilinadi (fayl o'qilmaydi)", play.contains("AudioTrack"))
        assertTrue("nota chastotalari e'lon qilingan (ixtir emas)", play.contains("NOTE_UP_1"))
        assertTrue(
            "ova uzamligi YANGI SON EMAS — `popMs`/`outcomeMs` dan",
            play.contains("sp.popMs / notes.size") && play.contains("sp.outcomeMs"),
        )
        assertTrue(
            "ovoz so'rovi bitta tugmadan: `settings.motionEnabled` (yangi sozlama/ustun qo'shilmagan)",
            motion.substringAfter("fun soundEnabled(ctx: Context)").substringBefore("/**").contains("motionEnabled"),
        )

        val fragment = fragmentSource()
        val outcome = fragment.substringAfter("private fun showOutcome(out: CheckOutcome, xp: Int)")
        assertTrue(
            "javob ovozi natija bilan bog'langan bo'lishi kerak",
            outcome.contains("Motion.playFeedback(ctx, out.correct)"),
        )

        // `res/raw` da audio fayl YO'Q — soxta audio qo'shilmagan (vebda ham
        // `public/audio/manifest.json`dagi fayllar ro'yxati o'smagan).
        val raw = File(app, "src/main/res/raw")
        val audios = raw.listFiles()?.filter {
            it.name.endsWith(".mp3") || it.name.endsWith(".ogg") || it.name.endsWith(".wav")
        } ?: emptyList()
        assertTrue("res/raw ga audio fayl qo'shilmasligi kerak: ${audios.map { it.name }}", audios.isEmpty())
    }

    @Test
    fun variantTugmalariBosilgandaJonliBosishBor() {
        val motion = motionSource()
        val press = motion.substringAfter("fun press(v: View)").substringBefore("/**")
        assertTrue(
            "bosish uzamligi manifestdan (`pressMs`) — YANGI SON YO'Q",
            press.contains("sp.pressMs"),
        )
        // Masshtablar veb CSS'dagi `@keyframes bump` bilan BIR XIL (0.97 → 1.03 → 1).
        for (literal in listOf("0.97f", "1.03f", "scaleX(1f)")) {
            assertTrue("bosish masshtabi yo'q ($literal)", press.contains(literal))
        }
        assertTrue(
            "harakat o'chirilganda masshtab 1 ga qaytadi",
            press.contains("v.scaleX = 1f"),
        )

        val fragment = fragmentSource()
        val helpers = fragment.substringAfter("private fun pressOnTouch(v: View)")
        assertTrue(
            "Android'ning o'z 'klik' ovozi o'chirilgan (tizim ovozi — brend shovqini)",
            helpers.contains("v.isSoundEffectsEnabled = false"),
        )
        val applied = Regex("""pressOnTouch\(this\)""").findAll(fragment).toList()
        assertTrue(
            "har bir javob tugmasida bosish bo'lishi kerak (topildi: ${applied.size}) — " +
                "variantlar, true/false, matching, gap banki, word-order banki",
            applied.size >= 5,
        )
    }

    @Test
    fun comboSatiriFaqatHaqiqiyHolatniKorsatadi() {
        val xml = File(app, "src/main/res/layout/fragment_exercise.xml").readText()
        assertTrue("`exCombo` maydoni bo'lishi kerak", xml.contains("""android:id="@+id/exCombo"""))
        assertTrue(
            "maydon bo'sh holatda YASHIRILGAN (soxta son ko'rinmasin)",
            Regex("""android:id="@\+id/exCombo"[\s\S]{0,600}?android:visibility="gone"""").containsMatchIn(xml),
        )

        val src = fragmentSource()
        val combo = src.substringAfter("private fun showCombo()").substringBefore("/* ------------------------ jarayon")
        assertTrue("son store'dan olinadi (`data.game.combo`)", combo.contains("data.game.combo"))
        assertTrue("combo < 2 bo'lsa satir yashiriladi", combo.contains("if (combo < 2)"))
        assertTrue(
            "yurak qaytish soni `GameConfig.HEART_COMBO_STREAK` dan (ixtir emas)",
            combo.contains("GameConfig.HEART_COMBO_STREAK"),
        )
        assertTrue(
            "yurak allaqachon qaytgan bo'lsa 'yana N' deb aldashmaydi",
            combo.contains("toHeart"),
        )
        val onCheck = src.substringAfter("private fun onCheck()").substringBefore("private fun showOutcome")
        assertTrue(
            "combo dispatchdan KEYIN o'qiladi (`AppStore.dispatch` sinxron — yangi son darhol to'g'ri)",
            onCheck.indexOf("showCombo()") > onCheck.indexOf("StoreAction.Attempt"),
        )
    }
}
