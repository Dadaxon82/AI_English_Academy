package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.checkAnswer
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Xatolar kundaligi — `correct == false` bo'lgan barcha urinishlar, sababi
 * bilan (vebdagi "error log" moslamasi).
 *
 * To'g'ri javob `AttemptRecord`da SAQLANMAYDI (faqat `answerGiven`), shuning
 * uchun u kontentdagi mashqdan `domain/AnswerChecker.checkAnswer` bilan
 * qayta olinadi — pleyerda ko'rsatilgan `ex_expected` bilan bir xil matn,
 * ixtir qilinmaydi. Mashq kontentda topilmasa (fayl boshqa) izoh ham,
 * `errlog_retry` tugmasi ham ko'rsatilmaydi.
 *
 * Filtr: `ChipGroup` — `vocab_filter_all` (hammasi) + 6 ko'nikma
 * (`errlog_filter_skill` sarlavhasi bilan).
 */
class ErrorLogFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    /** Faol filtr; `null` — barcha ko'nikmalar. */
    private var filterSkill: String? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.shellMascot.setMood(MascotView.Mood.NEUTRAL)
        render()
    }

    /* ------------------------------ render ------------------------------ */

    private fun render() {
        val ctx = requireContext()
        Rows.clear(b.rows)
        b.emptyText.visibility = View.GONE
        b.shellTitle.setText(R.string.errlog_title)
        b.shellSubtitle.setText(R.string.errlog_hint)

        val wrong = runCatching { container().store.attempts().filter { !it.correct } }
            .getOrElse { emptyList() }
            .sortedByDescending { it.at }

        if (wrong.isEmpty()) {
            b.shellMascot.setMood(MascotView.Mood.HAPPY)
            b.emptyText.setText(R.string.errlog_empty)
            b.emptyText.visibility = View.VISIBLE
            return
        }

        renderFilters(ctx, wrong)

        val shown = filterSkill?.let { skill -> wrong.filter { it.skill == skill } } ?: wrong
        b.rows.addView(Rows.small(ctx, getString(R.string.errlog_count, shown.size)))
        if (shown.isEmpty()) {
            // Filtr bo'yicha yozuv yo'q — umumiy soni yashirilmaydi (yuqorida).
            b.rows.addView(Rows.body(ctx, getString(R.string.empty_generic)))
            return
        }

        val df = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
        for (a in shown) renderEntry(ctx, a, df)
    }

    /** Ko'nikma filtri — bitta tanlov (`ChipGroup` bir tanlovli). */
    private fun renderFilters(ctx: Context, wrong: List<AttemptRecord>) {
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.errlog_filter_skill)))
        val group = ChipGroup(ctx).apply {
            isSingleSelection = true
            isSingleLine = false
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }

        val ids = LinkedHashMap<Int, String?>()
        val all = Chip(ctx).apply {
            text = getString(R.string.vocab_filter_all)
            isCheckable = true
            id = View.generateViewId()
        }
        ids[all.id] = null
        group.addView(all)

        // 6 ko'nikma — reja tartibida (`Skills.PLAN_ORDER`), soni yonida.
        for (skill in Skills.PLAN_ORDER) {
            val chip = Chip(ctx).apply {
                text = Rows.skillName(ctx, skill) + " (" + wrong.count { it.skill == skill } + ")"
                isCheckable = true
                id = View.generateViewId()
            }
            ids[chip.id] = skill
            group.addView(chip)
        }

        // Tanlangan chip avval belgilanadi (tinglovchi keyin ulanadi — aksi
        // holda dasturiy belgilash qayta render chaqirardi).
        val target = ids.entries.firstOrNull { it.value == filterSkill }?.key
        if (target != null) group.check(target)

        group.setOnCheckedStateChangeListener { _, checked ->
            val id = checked.firstOrNull()
            filterSkill = if (id == null) null else ids[id]
            render()
        }
        b.rows.addView(group)
    }

    /** Bitta yozuv: ko'nikma · sana, berilgan/to'g'ri javob, izoh, qayta urinish. */
    private fun renderEntry(ctx: Context, a: AttemptRecord, df: SimpleDateFormat) {
        val ex: Exercise? = runCatching { container().content.findExercise(a.exerciseId) }.getOrNull()

        // `AttemptRecord`da to'g'ri javob saqlanmagan — u kontentdagi mashqdan
        // `checkAnswer` orqali qaytariladi (`expected` maydoni turidan qat'iy
        // nazar to'g'ri javob matni). Mashq topilmasa ixtir qilinmaydi.
        val expected = ex?.let { runCatching { checkAnswer(it, a.answerGiven).expected }.getOrDefault("") }
            ?.takeIf { it.isNotBlank() } ?: getString(R.string.empty_generic)
        val given = a.answerGiven.takeIf { it.isNotBlank() } ?: getString(R.string.empty_generic)

        b.rows.addView(
            Rows.row(
                ctx,
                Rows.skillName(ctx, a.skill) + " · " + df.format(Date(a.at)),
                getString(R.string.errlog_given, given) + "\n" + getString(R.string.errlog_expected, expected),
            ),
        )

        // Izoh — kontentda yozilgan tushuntirish (ixtiyoriy maydon bo'sh bo'lsa
        // tekshiruvning o'zi sababni satrga qo'shgan bo'ladi).
        val why = checkWhy(ex, a)
        if (why.isNotBlank()) {
            b.rows.addView(Rows.small(ctx, getString(R.string.ex_explanation) + ": " + why))
        }

        if (ex != null) {
            b.rows.addView(
                Rows.button(ctx, getString(R.string.errlog_retry)).apply {
                    setOnClickListener {
                        Nav.openExercises(
                            this@ErrorLogFragment,
                            listOf(a.exerciseId),
                            null,
                            null,
                            Source.PRACTICE,
                            ex.instructionUz.ifBlank { getString(R.string.errlog_title) },
                        )
                    }
                },
            )
        }
    }

    /**
     * Xato sababi. Avval kontentdagi `explanationUz` (urinishda saqlanmagan,
     * lekin mashqda yozilgan); u bo'sh bo'lsa tekshiruvning `whyUz`i. Ikkalasi
     * bo'sh bo'lsa satr umuman ko'rsatilmaydi.
     */
    private fun checkWhy(ex: Exercise?, a: AttemptRecord): String {
        if (ex == null) return ""
        return ex.explanationUz.ifBlank { runCatching { checkAnswer(ex, a.answerGiven).whyUz }.getOrDefault("") }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
