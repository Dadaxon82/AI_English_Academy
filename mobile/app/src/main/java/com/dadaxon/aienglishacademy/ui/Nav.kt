package com.dadaxon.aienglishacademy.ui

import android.os.Bundle
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R

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

    /** Barcha batafsil manzillar (orqaga qaytishda ro'yxat holati saqlanadi). */
    val DETAIL_DESTINATIONS = setOf(
        R.id.exerciseFragment,
        R.id.vocabReviewFragment,
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

    /** Mashq pleyeri — id'lar RO'YXAT BILAN beriladi (tartib muhim). */
    fun openExercises(f: Fragment, ids: List<String>, contentId: String?, dayId: String?, source: String, title: String) {
        f.findNavController().navigate(
            R.id.exerciseFragment,
            args(
                ARG_EXERCISE_IDS to ArrayList(ids),
                ARG_CONTENT_ID to contentId,
                ARG_DAY_ID to dayId,
                ARG_SOURCE to source,
                ARG_TITLE to title,
            ),
        )
    }

    fun open(f: Fragment, destId: Int, id: String, title: String) =
        f.findNavController().navigate(destId, args(ARG_ID to id, ARG_TITLE to title))

    /** Bundledagi bo'sh bo'lishi mumkin bo'lmagan kalit; yo'q bo'lsa null. */
    fun idArg(f: Fragment): String? = f.arguments?.getString(ARG_ID)?.takeIf { it.isNotBlank() }

    fun titleArg(f: Fragment, fallback: Int): String =
        f.arguments?.getString(ARG_TITLE)?.takeIf { it.isNotBlank() } ?: f.getString(fallback)

    fun stringListArg(f: Fragment, key: String): List<String> =
        f.arguments?.getStringArrayList(key) ?: emptyList()

    fun stringArg(f: Fragment, key: String): String? =
        f.arguments?.getString(key)?.takeIf { it.isNotBlank() }
}
