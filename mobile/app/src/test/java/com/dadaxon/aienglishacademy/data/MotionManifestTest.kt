package com.dadaxon.aienglishacademy.data

import com.google.gson.JsonParser
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Harakat manifesti (`res/raw/motion_manifest.json`) — parse, chegara va
 * faylning o'zi tekshiruvi.
 *
 * Nima uchun test qilinadi: namunaviy ilova barcha harakatni `res/raw`da
 * saqlaydi (o'lchangan: 1212 fayl / 75,5 MB; Lottie medianasi 2917 ms —
 * `MotionManifest.kt` izohida). Bizning fayl formatimiz buzilsa pleyer
 * jimgina "harakatsiz" bo'lib qolardi — buni foydalanuvchi sezmastas,
 * shuning uchun faylning haqiqatan o'qilishi shu yerda kafolatlanadi.
 */
class MotionManifestTest {

    private fun repoDir(): File {
        val candidates = listOf(File("."), File("app"), File(".."))
        return candidates.firstOrNull { File(it, "src/main/res/raw/motion_manifest.json").isFile } ?: File(".")
    }

    @Test
    fun shippedManifestExistsAndParses() {
        val f = File(repoDir(), "src/main/res/raw/motion_manifest.json")
        assertTrue("`res/raw/motion_manifest.json` yöq: ${f.absolutePath}", f.isFile)
        val spec = MotionSpec.parse(f.readText())
        assertNotNull("manifest parse bölmadi", spec)
        assertEquals(MotionSpec.defaults(), spec)
    }

    @Test
    fun manifestNumbersAreDocumentedInJson() {
        val raw = JsonParser.parseString(File(repoDir(), "src/main/res/raw/motion_manifest.json").readText()).asJsonObject
        // `_comment` majburiy — nima uchun Rive/Lottie ko'chirilmagani shu
        // faylning o'zida yozilgan bo'lishi kerak.
        assertTrue(raw.has("_comment"))
        assertEquals(260L, raw.get("stepMs").asLong)
        assertEquals(620L, raw.get("xpMs").asLong)
        // Bosish micro-interaction'i — veb tomonida ham AYNAN shu son
        // (`src/lib/motionManifest.ts` → `--aea-press`; test:
        // `src/test/motion.test.ts`).
        assertEquals(120L, raw.get("pressMs").asLong)
    }

    @Test
    fun parseDefaultsForMissingKeys() {
        val spec = MotionSpec.parse("""{"stepMs":100}""")
        assertNotNull(spec)
        assertEquals(100L, spec!!.stepMs)
        assertEquals(MotionSpec.defaults().xpMs, spec.xpMs)
    }

    @Test
    fun parseClampsOutOfRange() {
        // Juda katta qiymat ham ilovani qotirmaydi — chegaraga keltiriladi.
        val spec = MotionSpec.parse("""{"stepMs":99999,"popScale":9.0,"staggerMaxItems":500}""")
        assertNotNull(spec)
        assertEquals(MotionSpec.MAX_MS, spec!!.stepMs)
        assertTrue(spec.popScale <= 1.3f)
        assertTrue(spec.staggerMaxItems <= 24)
    }

    @Test
    fun malformedFieldDisablesWholeManifest() {
        // Yarim sozlangan holat qolmasin: chaqiruvchi `defaults()` ga qaytadi.
        assertNull(MotionSpec.parse("""{"stepMs":"tez"}"""))
        assertNull(MotionSpec.parse("""{"popScale":"katta"}"""))
        assertNull(MotionSpec.parse("[]"))
        assertNull(MotionSpec.parse("{"))
    }

    @Test
    fun toJsonRoundTrip() {
        val d = MotionSpec.defaults()
        val back = MotionSpec.parse(MotionSpec.toJson(d).toString())
        assertEquals(d, back)
    }

    /** Tebranish byudjeti DULO sxemasiga mos: `.hla` `Duration` ms + amplitude. */
    @Test
    fun defaultsStayWithinShortDurations() {
        val d = MotionSpec.defaults()
        for (v in listOf(d.stepMs, d.outcomeMs, d.popMs, d.staggerMs, d.xpMs, d.chainMs)) {
            assertTrue("bu son foydalanuvçini kutdirmaydi: $v", v in MotionSpec.MIN_MS..MotionSpec.MAX_MS)
        }
        assertTrue(d.staggerMaxItems in 1..24)
    }
}
