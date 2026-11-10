package com.dadaxon.aienglishacademy.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Kontent registri testlari — HAQIQIY `app/src/main/assets/content/` JSONlari
 * `FsAssetSource` orqali o'qiladi (veb eksport skripti yozgan fayllar, o'zgarishsiz).
 *
 * MANBA: veb `src/content/index.ts` + `scripts/export-content-mobile.mjs`.
 */
class ContentRepositoryTest {
    /** Gradle unit test ishi papkasi moduldadir (`mobile/app`) — zaxira yo'llar ham sinab ko'riladi. */
    private fun assetsDir(): File {
        val candidates = listOf("src/main/assets", "app/src/main/assets", "mobile/app/src/main/assets")
        for (c in candidates) {
            val f = File(c)
            if (File(f, ContentRepository.MANIFEST_PATH).isFile) return f
        }
        // APK CI topshirishida asset'lar intermedial papkada ham bo'ladi
        throw IllegalStateException("content/manifest.json topilmadi: ${candidates.joinToString()} (pwd=${File(".").absolutePath})")
    }

    private fun repo(): ContentRepository = ContentRepository(FsAssetSource(assetsDir()))

    @Test
    fun `manifest haqiqiy sonlarni beradi A1 da 7 kun 84 so'z 246 mashq`() {
        val r = repo()
        val info = r.levelInfo(Levels.A1)
        assertNotNull(info)
        assertEquals(7, info!!.days)
        assertEquals(84, info.vocab)
        // 246 — PR #6 dan keyingi eksport (`manifest.json` 2026-11-08:
        // 5 YANGI mashq turi qo'shildi, 211 → 246). Son fayldan oladi.
        assertEquals(246, info.exercises)
        assertTrue(info.bytes > 0)
        // A2 kontenti `7df8def` da eksport qilingan (manifest: A1, A2) — test o'shanda yangilanmagan edi.
        assertEquals(listOf(Levels.A1, Levels.A2), r.levels())
    }

    @Test
    fun `bundle'dagi sonlar manifest bilan kelishadi`() {
        val r = repo()
        val b = r.bundle(Levels.A1)
        assertEquals(Levels.A1, b.level)
        assertEquals(7, b.days.size)
        assertEquals(84, b.vocab.size)
        // `allExercises` vebdagidek Mock Examni OZ ICHIGA OLMAYDI
        // (`src/content/index.ts::allExercises` — grammar/reading/listening/tests).
        // manifest 246 eksport skripti sanagan yig'indi (core + mockExam) —
        // PR #6 dan keyin (5 yangi tur: 203 → 238 core, mock 8 o'sgarisiz).
        val core = r.allExercises(Levels.A1).size
        val mock = r.mockExamExercises(Levels.A1).size
        assertEquals("core mashqlar", 238, core)
        assertEquals("Mock Exam mashqlari", 8, mock)
        assertEquals("manifest = core + mock", 246, core + mock)
    }

    @Test
    fun `har kun bo'limlari yig'indisi aniq 90 daqiqa (normalizeDayMinutes)`() {
        val r = repo()
        for (d in r.bundle(Levels.A1).days) {
            assertEquals("${d.id} — 90 daqiqa bo'lishi kerak", 90, d.sections.sumOf { it.minutes })
        }
    }

    @Test
    fun `kunlar tartibi saqlanadi`() {
        val ids = repo().bundle(Levels.A1).days.map { it.id }
        assertEquals(7, ids.size)
        assertEquals("a1-day-01", ids.first())
        assertEquals(ids.sorted(), ids)
    }

    @Test
    fun `word-order mashqlarida javob ro'yxati answers maydoniga ko'chiriladi`() {
        val r = repo()
        val wordOrder = r.allExercises(Levels.A1).filter { it.kind == Kinds.WORD_ORDER }
        assertTrue("word-order mashq topilmadi", wordOrder.isNotEmpty())
        for (e in wordOrder) {
            assertNotNull("${e.id} uchun javob ro'yxati bo'lishi kerak", e.answers)
            assertTrue(e.answers!!.isNotEmpty())
        }
        // tfng'da `answer` satr bo'lib qoladi
        val tfng = r.allExercises(Levels.A1).first { it.kind == Kinds.TRUE_FALSE_NOTGIVEN }
        assertTrue(listOf("true", "false", "notgiven").contains(tfng.answer))
    }

    @Test
    fun `mashq turlari soni (A1)`() {
        // `allExercises` — Mock Examdan tashqari (veb bilan bir). Mock sanog'i
        // alohida tekshiriladi: 238 + 8 = 246 (manifest).
        // PR #6 (2026-11-08) 5 YANGI tur qo'shdi — sonlar `a1.json`dan olindi.
        val byKind = repo().allExercises(Levels.A1).groupingBy { it.kind }.eachCount()
        assertEquals(mapOf(
            Kinds.MULTIPLE_CHOICE to 62,
            Kinds.TRUE_FALSE_NOTGIVEN to 49,
            Kinds.GAP_FILL to 37,
            Kinds.TRANSLATION to 22,
            Kinds.MATCHING to 18,
            Kinds.WORD_ORDER to 15,
            Kinds.MULTI_SELECT to 7,
            Kinds.DROPDOWN_CLOZE to 7,
            Kinds.CATEGORIZE to 7,
            Kinds.SEQUENCE to 7,
            Kinds.SHORT_ANSWER to 7,
        ), byKind)
        val mockKind = repo().mockExamExercises(Levels.A1).groupingBy { it.kind }.eachCount()
        assertEquals(mapOf(
            Kinds.MULTIPLE_CHOICE to 3,
            Kinds.TRUE_FALSE_NOTGIVEN to 3,
            Kinds.GAP_FILL to 2,
        ), mockKind)
    }

    @Test
    fun `findExercise mavjud mashqni topadi`() {
        val r = repo()
        val first = r.allExercises(Levels.A1).first()
        assertEquals(first.id, r.findExercise(first.id)?.id)
        assertNull(r.findExercise("yo'q-undok-mashq"))
    }

    @Test
    fun `findExercise lug'at testi savolini so'z idsidan qayta kuradi`() {
        val r = repo()
        val v = r.allVocab().first()
        val quiz = r.findExercise(VOCAB_QUIZ_PREFIX + v.id)
        assertNotNull(quiz)
        assertEquals(VOCAB_QUIZ_PREFIX + v.id, quiz!!.id)
        assertEquals(Kinds.MULTIPLE_CHOICE, quiz.kind)
        // Bitta variant berilganda to'g'ri javob indeksi 0
        assertEquals(0, quiz.answerIndex)
        assertEquals(v.translationUz, quiz.options!![0])
        assertTrue(quiz.instructionUz.contains(v.word))
    }

    @Test
    fun `vocabQuizExercise variantlar orasida to'g'ri javobni topadi`() {
        val r = repo()
        val v = r.allVocab().first()
        val options = listOf("boshqa-1", v.translationUz, "boshqa-2")
        val e = r.vocabQuizExercise(v, options)
        assertEquals(1, e.answerIndex)
        assertEquals(listOf("vocab quiz", v.topic), e.tags)
    }

    @Test
    fun `findVocab lug'at va glossariy bo'yicha ishlaydi`() {
        val r = repo()
        val v = r.allVocab().first()
        assertEquals(v.id, r.findVocab(v.id)?.id)
        val g = r.allGlossaryVocab()
        if (g.isNotEmpty()) assertEquals(g.first().id, r.findVocab(g.first().id)?.id)
        assertNull(r.findVocab("yo'q-so'z"))
    }

    @Test
    fun `wordKeyOf va glossaryVocabId`() {
        val r = repo()
        assertEquals("apple", r.wordKeyOf("Apple"))
        assertEquals("o silik", r.wordKeyOf("o‘ silik"))
        assertEquals("gl-apple", r.glossaryVocabId("Apple"))
        // Apostrof OLIB TASHLANADI (bo'shliqqa almashtirilmaydi) — veb
        // `/[‘’`´ʻ]/g → ''`. Shuning uchun "o‘silik" → "osilik".
        assertEquals("gl-osilik", r.glossaryVocabId("o‘silik"))
    }

    @Test
    fun `kesh bir xil obyekt qaytaradi (qayta o'qilmaydi)`() {
        val r = repo()
        assertTrue(r.bundle(Levels.A1) === r.bundle(Levels.A1))
        assertTrue(r.manifest() === r.manifest())
    }

    @Test
    fun `yo'q daraja bo'sh to'plam qaytaradi`() {
        val r = repo()
        val b = r.bundle("C1")
        assertEquals("C1", b.level)
        assertTrue(b.days.isEmpty())
        assertTrue(b.vocab.isEmpty())
    }

    @Test
    fun `init qayta chaqirilsa kesh tozalanadi`() {
        val r = repo()
        val before = r.bundle(Levels.A1)
        r.init(FsAssetSource(assetsDir()))
        assertTrue(before !== r.bundle(Levels.A1))
        assertEquals(before, r.bundle(Levels.A1))
    }

    @Test
    fun `ulanmagan registr xato beradi (kontent ixtiro qilinmaydi)`() {
        val r = ContentRepository()
        val e = runCatching { r.bundle(Levels.A1) }.exceptionOrNull()
        assertTrue(e is IllegalStateException)
        assertTrue(e!!.message!!.contains("init()"))
    }

    @Test
    fun `FsAssetSource papka va faylni farqlaydi`() {
        val src = FsAssetSource(assetsDir())
        assertTrue(src.exists(ContentRepository.MANIFEST_PATH))
        assertTrue(src.read(ContentRepository.MANIFEST_PATH).contains("levels"))
        assertTrue(!src.exists("content/yoq.json"))
        assertEquals(ContentRepository.levelPath("A1"), "content/a1.json")
    }
}
