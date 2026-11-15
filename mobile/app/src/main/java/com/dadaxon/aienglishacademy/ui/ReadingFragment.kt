package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.ReadingPassage
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.databinding.FragmentReadingBinding

/**
 * O'qish ekrani — ikki holatli (`Nav.ARG_ID` yo'q → ro'yxat, bor → matn).
 *
 * Kontent `container().content.bundle(level).reading` dan o'qiladi: obyektni
 * bundle orqali tashlamaymiz, faqat id o'tadi (`UI_KONTRAKTI.md`). Shuning
 * uchun batafsil holatda matn id bo'yicha qaytop quriladi — ilova qayta
 * ochilsa yoki jarayon tiklansa ham ekran to'g'ri ko'rinadi.
 *
 * Halol qoida: matn yo'q bo'lsa mavjud string (`content_empty`) ishlatiladi,
 * son/matn ixtiro qilinmaydi.
 */
class ReadingFragment : Fragment() {

    private var _b: FragmentReadingBinding? = null
    private val b get() = requireNotNull(_b)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentReadingBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.readingMascot.setMood(MascotView.Mood.NEUTRAL)
        render()
    }

    /* ------------------------------ render ------------------------------ */

    private fun render() {
        val ctx = requireContext()
        Rows.clear(b.readingRows)
        b.readingEmpty.visibility = View.GONE

        val id = Nav.idArg(this)
        if (id == null) {
            renderList()
        } else {
            val passage = passageById(id)
            if (passage == null) {
                // Id topilmadi — sabab ochiq aytiladi (fayl buzilgan bo'lishi mumkin).
                b.readingTitle.setText(R.string.reading_title)
                b.readingSubtitle.text = ""
                b.readingMascot.setMood(MascotView.Mood.SAD)
                b.readingEmpty.setText(R.string.content_error)
                b.readingEmpty.visibility = View.VISIBLE
                return
            }
            renderPassage(passage, ctx)
        }
    }

    /** Ro'yxat holati — daraja to'plamidagi barcha matnlar. */
    private fun renderList() {
        val ctx = requireContext()
        b.readingTitle.setText(R.string.reading_title)
        b.readingSubtitle.setText(R.string.reading_pick_hint)

        val items = passagesForCurrentLevel()
        if (items.isEmpty()) {
            b.readingEmpty.setText(R.string.content_empty)
            b.readingEmpty.visibility = View.VISIBLE
            b.readingMascot.setMood(MascotView.Mood.SAD)
            return
        }
        for (p in items) {
            b.readingRows.addView(
                Rows.row(
                    ctx,
                    p.title,
                    getString(R.string.reading_meta, p.level, p.estMinutes, p.exercises.size),
                    trailing = getString(R.string.reading_open),
                ) { Nav.open(this, R.id.readingFragment, p.id, p.title) },
            )
        }
    }

    /** Batafsil holat — sarlavha, meta, manba, paragraflar, glossariy, tugma. */
    private fun renderPassage(passage: ReadingPassage, ctx: Context) {
        b.readingTitle.text = passage.title
        b.readingSubtitle.text = getString(
            R.string.reading_meta,
            passage.level,
            passage.estMinutes,
            passage.exercises.size,
        )
        b.readingMascot.setMood(MascotView.Mood.HAPPY)

        // Provenance — matn qayerdan kelgani (loyihada "original").
        b.readingRows.addView(Rows.small(ctx, getString(R.string.reading_source, passage.provenance)))

        // Paragraflar — o'qish matni.
        if (passage.paragraphs.isEmpty()) {
            b.readingRows.addView(Rows.small(ctx, getString(R.string.content_empty)))
        }
        for (par in passage.paragraphs) b.readingRows.addView(Rows.body(ctx, par))

        // Glossariy — sarlavha ostida HAMMA juftlik (soni cheklanmaydi).
        val gloss = passage.glossary ?: emptyList()
        if (gloss.isNotEmpty()) {
            b.readingRows.addView(Rows.sectionTitle(ctx, getString(R.string.reading_glossary)))
            for (g in gloss) b.readingRows.addView(Rows.body(ctx, "${g.word} — ${g.uz}"))
        }

        // Mashqlarga o'tish — pleyer id'lar RO'YXATI bilan ochiladi.
        if (passage.exercises.isEmpty()) {
            b.readingRows.addView(Rows.small(ctx, getString(R.string.ex_exercises_empty)))
        } else {
            b.readingRows.addView(
                Rows.primaryButton(ctx, getString(R.string.reading_start)).apply {
                    setOnClickListener {
                        Nav.openExercises(
                            this@ReadingFragment,
                            passage.exercises.map { it.id },
                            passage.id,
                            null,
                            Source.PRACTICE,
                            passage.title,
                        )
                    }
                },
            )
        }
    }

    /* ---------------------------- kontent izlovi ------------------------- */

    /** Joriy daraja to'plamidagi matnlar (`settings.currentLevel`). */
    private fun passagesForCurrentLevel(): List<ReadingPassage> {
        val cr = container().content
        val level = runCatching { container().store.settings().currentLevel }.getOrDefault("")
        return runCatching { cr.bundle(level).reading }.getOrElse { emptyList() }
    }

    /**
     * Id bo'yicha izlash. Avval joriy daraja — so'ng boshqa darajalar
     * (foydalanuvchi darajani almashtirsa ham matn topiladi, yagona
     * "topilmadi" xabari esa halol qoladi).
     */
    private fun passageById(id: String): ReadingPassage? {
        val cr = container().content
        val level = runCatching { container().store.settings().currentLevel }.getOrDefault("")
        passagesForCurrentLevel().firstOrNull { it.id == id }?.let { return it }
        val levels = runCatching { cr.levels() }.getOrElse { emptyList() }
        for (lvl in levels) {
            val hit = runCatching { cr.bundle(lvl).reading }.getOrElse { emptyList() }.firstOrNull { it.id == id }
            if (hit != null) return hit
        }
        return null
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
