package com.dadaxon.aienglishacademy.ui

import android.os.Bundle
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.domain.lessonSequence

/**
 * Ekranlararo o'tish shartnomasi (bitta joyda).
 *
 * Har batafsil ekran `arguments` orqali kontent id'sini oladi — chunki
 * kontent APK asset'larida (`assets/content/…`) va hajmi katta: obyektni
 * bundle orqali tashlash o'rniga ID o'tkaziladi, ekran uni `ContentRepository`
 * dan qayta o'qiydi. Shu kalitlar grafdagi har bir manzil uchun yagona.
 */
object Nav {

    /** Mashq pleyeriga kirish: kim/ni/nima uchun ochayotgani. */
    const val ARG_EXERCISE_IDS = "exerciseIds"

    /** Qo'shimcha kontekst: tugma qaysi bo'limdan kelgani (hisobot uchun). */
    const val ARG_CONTENT_ID = "contentId"

    /** `learning_plans.day_id` tekshiruvi uchun (bo'lim testi/kun boshlanganda). */
    const val ARG_DAY_ID = "dayId"

    /** Sabab: `practice` | `section-test` | `mock-exam` (Source qiymatlari). */
    const val ARG_SOURCE = "source"

    /** Sarlavha (toolbar uchun). */
    const val ARG_TITLE = "title"

    /** Batafsil ekranlar: kontent id'si. */
    const val ARG_ID = "id"

    /**
     * Bo'lim SAKRASH testi: bo'lim id'si (`a1-2`). Alohida — chunki kun testi
     * (`ARG_DAY_ID`) natijasini `passedTests[<test id>]`ga yozadi, sakrash
     * testini esa `passedTests["jump:<bo'lim>"]`ga va kunlarni ochadi
     * (`domain/Sections.kt::applySectionJump`, veb `store.tsx::section-jump`).
     */
    const val ARG_SECTION_ID = "sectionId"

    /**
     * "1" — pleyer so'z bilan bog'liq mashq javobini SRS'ga ham yozadi
     * (Takrorlash menejeri; har mashq uchun faqat birinchi urinish).
     */
    const val ARG_GRADE_VOCAB = "gradeVocab"

    /** Barcha batafsil manzillar (orqaga qaytishda ro'yxat holati saqlanadi). */
    val DETAIL_DESTINATIONS = setOf(
        R.id.exerciseFragment,
        R.id.vocabReviewFragment,
        R.id.quickSessionFragment,
        R.id.dialoguesFragment,
        R.id.communityFragment,
        R.id.conversationFragment,
        R.id.grammarTopicFragment,
        R.id.readingFragment,
        R.id.listeningFragment,
        R.id.writingFragment,
        R.id.speakingFragment,
        R.id.errorLogFragment,
    )

    fun args(vararg pairs: Pair<String, Any?>): Bundle {
        val b = Bundle()
        for ((k, v) in pairs) {
            when (v) {
                null -> b.putString(k, null)
                is String -> b.putString(k, v)
                is Int -> b.putInt(k, v)
                is ArrayList<*> -> b.putStringArrayList(k, v as ArrayList<String>)
                else -> b.putString(k, v.toString())
            }
        }
        return b
    }

    /**
     * Mashq pleyeri — id'lar RO'YXAT BILAN beriladi (tartib muhim).
     *
     * KETMA-KETLIK: `practice` oqimida tartib `domain/lessonSequence` bilan
     * qayta quriladi (DULO `assets/hardcoded_sessions` JSON'laridagi
     * tartiblangan `challenges` massivi qoidasi: bitta tur qo'shni qadamda
     * takrorlanmaydi — o'lchangan 68.9% almashinuv; har 6-qadamda bitta
     * mashq qayta takrorlanadi).
     *
     * BO'LIM TESTI va MOCK imtihonda tartib O'ZGARMAYDI: ular baholash
     * uchun (veb kontentida savollar tartibi hujjatlangan), mashqda esa
     * biz o'qish tartibini o'zimiz belgilaymiz. Ro'yxatdagi id'lar soni
     * ham o'smaydi (takrorlar faqat `practice`da).
     */
    fun openExercises(
        f: Fragment,
        ids: List<String>,
        contentId: String?,
        dayId: String?,
        source: String,
        title: String,
        /** `false` — tartib saqlanadi (xatolar o'yini o'zi tartiblaydi). */
        reorder: Boolean = true,
        /** Javob SRS'ga ham yozilsinmi (Takrorlash menejeri). */
        gradeVocab: Boolean = false,
    ) {
        val ordered = if (reorder && source == com.dadaxon.aienglishacademy.data.Source.PRACTICE) {
            val cr = runCatching { f.requireActivity().container().content }.getOrNull()
            lessonSequence(
                dayId = dayId ?: contentId ?: "",
                orderedIds = ids,
                knownKind = { id -> runCatching { cr?.findExercise(id)?.kind }.getOrNull() },
                reinforce = true,
            )
        } else {
            ids
        }
        f.findNavController().navigate(
            R.id.exerciseFragment,
            args(
                ARG_EXERCISE_IDS to ArrayList(ordered),
                ARG_CONTENT_ID to contentId,
                ARG_DAY_ID to dayId,
                ARG_SOURCE to source,
                ARG_TITLE to title,
                ARG_GRADE_VOCAB to if (gradeVocab) "1" else null,
            ),
        )
    }

    fun open(f: Fragment, destId: Int, id: String, title: String) =
        f.findNavController().navigate(destId, args(ARG_ID to id, ARG_TITLE to title))

    /**
     * Bo'lim SAKRASH testini ochish (veb `Sections.tsx::JumpTest`).
     *
     * `ids` — test ochilganda HISOBLANGAN to'plam (`jumpPlan`); pleyerga
     * tayyor ro'yxat beriladi va tartib O'ZGARMAYDI (manba `section_test` —
     * baholash testi, mashq zanjiri emas). `dayId` BERILMAYDI: sakrashda kun
     * testi emas, bo'lim o'tish yozuvi qilinadi (`ARG_SECTION_ID`).
     */
    fun openJumpTest(
        f: Fragment,
        ids: List<String>,
        sectionId: String,
        title: String,
    ) {
        f.findNavController().navigate(
            R.id.exerciseFragment,
            args(
                ARG_EXERCISE_IDS to ArrayList(ids),
                ARG_CONTENT_ID to sectionId,
                ARG_SOURCE to com.dadaxon.aienglishacademy.data.Source.SECTION_TEST,
                ARG_TITLE to title,
                ARG_SECTION_ID to sectionId,
            ),
        )
    }

    /** Bundledagi bo'sh bo'lishi mumkin bo'lmagan kalit; yo'q bo'lsa null. */
    fun idArg(f: Fragment): String? = f.arguments?.getString(ARG_ID)?.takeIf { it.isNotBlank() }

    fun titleArg(f: Fragment, fallback: Int): String =
        f.arguments?.getString(ARG_TITLE)?.takeIf { it.isNotBlank() } ?: f.getString(fallback)

    fun stringListArg(f: Fragment, key: String): List<String> =
        f.arguments?.getStringArrayList(key) ?: emptyList()

    fun stringArg(f: Fragment, key: String): String? =
        f.arguments?.getString(key)?.takeIf { it.isNotBlank() }
}
