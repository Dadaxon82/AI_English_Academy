package com.dadaxon.aienglishacademy.ui

import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.domain.CurrentSectionInfo
import com.dadaxon.aienglishacademy.domain.currentSectionInfo

/**
 * Joriy bo'lim bannerini ekranga chizish — veb `src/components/SectionBanner.tsx`
 * ikki sahifada (Dashboard va O'quv yo'li) ishlatiladi; mobilда ham aynan
 * shu ikki ekranda (`b.bannerBox`). Shuning uchun mantik bu yerda BIR marta.
 *
 * MA'LUMOT `domain/currentSectionInfo()`dan (vebda ham shu funksiya) — son
 * ixtir EMAS. Kontent umuman yo'q bo'lsa banner chizilmaydi (`null`), veb'dagi
 * `if (!info) return null` qoidasi bilan bir xil.
 *
 * NIMA UCHUN BottomNavigationView'ga qo'shilmadi: Material'ning pastki paneli
 * 5 banddan ko'pini ko'tarmaydi (o'lchangan: `IllegalArgumentException`).
 * Shuning uchun Bo'limlarga kirish — banner tugmasi va O'quv yo'lidagi
 * "Barcha bo'limlar" havolasi (vebda ham banner + havola bor).
 */
object SectionBannerUi {

    /** Banner konteynerini to'ldiradi yoki (ma'lumot bo'lmasa) yashiradi. */
    fun show(f: Fragment, host: ViewGroup) {
        Rows.clear(host)
        val info = infoFor(f) ?: run {
            host.visibility = View.GONE
            return
        }
        host.visibility = View.VISIBLE
        host.addView(
            Rows.sectionBanner(f.requireContext(), info) {
                f.findNavController().navigate(R.id.sectionsFragment)
            },
        )
    }

    /** Banner ma'lumoti — kontent provayderlari `ContentRepository`dan. */
    fun infoFor(f: Fragment): CurrentSectionInfo? {
        val cr = runCatching { f.container().content }.getOrNull() ?: return null
        val path = runCatching { f.container().store.state.value.data.path }.getOrNull() ?: return null
        return runCatching {
            currentSectionInfo(
                path,
                { lvl -> runCatching { cr.bundle(lvl).days }.getOrDefault(emptyList()) },
                { lvl -> runCatching { cr.bundle(lvl).vocab }.getOrDefault(emptyList()) },
            )
        }.getOrNull()
    }
}
