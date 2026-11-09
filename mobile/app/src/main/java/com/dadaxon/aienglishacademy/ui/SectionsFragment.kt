package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.JUMP_PASS_SCORE
import com.dadaxon.aienglishacademy.domain.SectionCard
import com.dadaxon.aienglishacademy.domain.SectionStatus
import com.dadaxon.aienglishacademy.domain.buildSections
import com.dadaxon.aienglishacademy.domain.jumpKey
import com.dadaxon.aienglishacademy.domain.jumpPlan
import com.dadaxon.aienglishacademy.domain.levelLabel
import com.google.android.material.card.MaterialCardView

/**
 * BO'LIMLAR ekrani — veb `src/pages/Sections.tsx` ning mobil moslamasi:
 * A1.1 … C1.2 kartalari, progress va sakrash testi.
 *
 * MANBA: veb sahifa + `domain/Sections.kt` (qoidalar bir xil, testlar ham
 * bir xil da'volarni tekshiradi: `SectionsTest.kt` ↔ `src/test/sections.test.ts`).
 * Duolingo'dan faqat MEXANIKA olinadi (bo'limlar ro'yxati, holat, progress,
 * sakrash testi); matn va dizayn — bizniki.
 *
 * HAR TUGMA HAQIQIY (veb izohi bilan bir xil):
 *  - "Davom etish" / "Takrorlash" → O'quv yo'li ekrani (`learningPathFragment`);
 *  - "Sakrash testi" → shu bo'limning HAQIQIY testi (`exerciseFragment`, manba
 *    `section_test`, yuraklar sarflanmaydi — `HEART_FREE_SOURCES`);
 *  - "Batafsil" kartani ochadi (bo'lim nimani o'rgatadi + kunlari);
 *  - kontenti yo'q bo'limda TUGMA YO'Q — ochiq "tayyorlanmoqda" yozuvi.
 *
 * Sonlar ixtir EMAS: `buildSections` kontent (`ContentRepository`) va
 * `path` holatidan (`completedDays`/`passedTests`) hisoblaydi.
 */
class SectionsFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    /** Ochilgan ("Batafsil") kartalar — qayta chizilganda ham saqlanadi. */
    private val expanded = HashSet<String>()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        (activity as? AppCompatActivity)?.supportActionBar?.title = getString(R.string.sec_title)
        b.shellTitle.setText(R.string.sec_title)
        b.shellMascot.setMood(MascotView.Mood.NEUTRAL)
        b.emptyText.visibility = View.GONE
        renderList()
    }

    override fun onResume() {
        super.onResume()
        // Sakrash testidan qaytgach natija KO'RINADI: pleyer `passedTests` va
        // `completedDays`ni yangiladi — kartalar shu holatdan qayta hisoblanadi.
        renderList()
    }

    private fun daysOf(level: String) =
        runCatching { container().content.bundle(level).days }.getOrDefault(emptyList())

    private fun vocabOf(level: String) =
        runCatching { container().content.bundle(level).vocab }.getOrDefault(emptyList())

    private fun renderList() {
        if (_b == null) return
        val ctx = requireContext()
        val path = container().store.state.value.data.path
        val cards = buildSections(path, ::daysOf, ::vocabOf)

        val withContent = cards.filter { it.status != SectionStatus.EMPTY }
        val done = withContent.count { it.status == SectionStatus.DONE }
        // Izoh + o'ngdagi hisob (veb sahifasi bilan bir xil ma'no).
        b.shellSubtitle.text = getString(R.string.sec_subtitle) +
            "\n" + getString(R.string.sec_done_count, done, withContent.size)

        Rows.clear(b.rows)
        if (withContent.isEmpty()) {
            b.emptyText.setText(R.string.dash_plan_empty)
            b.emptyText.visibility = View.VISIBLE
            return
        }
        for (card in cards) b.rows.addView(cardView(ctx, card, path.passedTests[jumpKey(card.id)]))
    }

    /** Bitta bo'lim kartasi — veb `SectionCardView` tartibi bilan. */
    private fun cardView(ctx: Context, s: SectionCard, jumpScore: Int?): MaterialCardView {
        val card = Rows.card(ctx)
        val col = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }

        col.addView(Rows.small(ctx, getString(R.string.sec_level_line, s.level, levelLabel(s.level).titleUz)))
        col.addView(
            TextView(ctx).apply {
                setTextAppearance(R.style.Text_Aea_Section)
                text = getString(R.string.sec_card_title, s.label)
            },
        )
        col.addView(Rows.small(ctx, statusText(ctx, s.status)))

        if (s.status == SectionStatus.DONE) {
            col.addView(
                Rows.small(
                    ctx,
                    if (jumpScore != null && jumpScore >= JUMP_PASS_SCORE) {
                        getString(R.string.sec_done_jump_line, s.days.size, jumpScore)
                    } else {
                        getString(R.string.sec_done_line, s.days.size)
                    },
                ),
            )
        }
        if (s.status == SectionStatus.CURRENT || s.status == SectionStatus.LOCKED) {
            col.addView(progressBar(ctx, s))
        }
        if (s.status == SectionStatus.LOCKED) {
            val q = StringBuilder(getString(R.string.sec_jump_question, s.label))
            if (jumpScore != null) q.append(" ").append(getString(R.string.sec_jump_last, jumpScore))
            col.addView(Rows.small(ctx, q))
        }
        if (s.status == SectionStatus.EMPTY) {
            col.addView(Rows.small(ctx, getString(R.string.sec_empty_line)))
        }

        // "Batafsil" — veb'dagi akkordeon (kontentli bo'limlarda).
        if (s.status != SectionStatus.EMPTY) {
            val open = expanded.contains(s.id)
            col.addView(
                Rows.button(
                    ctx,
                    getString(if (open) R.string.sec_details_close else R.string.sec_details),
                ).apply {
                    setOnClickListener {
                        if (expanded.contains(s.id)) expanded.remove(s.id) else expanded.add(s.id)
                        renderList()
                    }
                },
            )
            if (open) {
                if (s.summaryUz.isNotBlank()) col.addView(Rows.body(ctx, s.summaryUz))
                for (d in s.days) {
                    col.addView(Rows.small(ctx, getString(R.string.sec_days_line, d.dayNumber, d.titleUz)))
                }
            }
        }

        // Namunaviy ibora — KONTEKTDAN (ixtiro emas); yo'q bo'lsa chizilmaydi.
        if (!s.sampleEn.isNullOrBlank()) {
            val box = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                contentDescription = getString(R.string.sec_sample_alt)
            }
            box.addView(
                TextView(ctx).apply {
                    setTextAppearance(R.style.Text_Aea_Body)
                    text = s.sampleEn
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                },
            )
            if (!s.sampleUz.isNullOrBlank()) box.addView(Rows.small(ctx, s.sampleUz))
            col.addView(box)
        }

        // Tugmalar — veb'dagi uch holat (kontenti yo'q bo'limda tugma yo'q).
        when {
            s.status == SectionStatus.CURRENT -> col.addView(
                Rows.primaryButton(ctx, getString(R.string.sec_btn_continue)).apply {
                    setOnClickListener { goPath() }
                },
            )
            s.status == SectionStatus.DONE -> col.addView(
                Rows.button(ctx, getString(R.string.sec_btn_revise)).apply {
                    setOnClickListener { goPath() }
                },
            )
            s.canJump -> col.addView(
                Rows.primaryButton(ctx, getString(R.string.sec_btn_jump, s.label)).apply {
                    setOnClickListener { startJump(s) }
                },
            )
        }

        card.addView(col)
        Motion.stepIn(card, enter = true)
        return card
    }

    /** Holat matni — veb `STATUS_CHIP` bilan bir xil to'rt holat. */
    private fun statusText(ctx: Context, st: SectionStatus): String = ctx.getString(
        when (st) {
            SectionStatus.DONE -> R.string.sec_status_done
            SectionStatus.CURRENT -> R.string.sec_status_current
            SectionStatus.LOCKED -> R.string.sec_status_locked
            SectionStatus.EMPTY -> R.string.sec_status_empty
        },
    )

    /** Kunlar progressi (veb: to'la adlanadigan chiziq + "%d / %d kun"). */
    private fun progressBar(ctx: Context, s: SectionCard): LinearLayout {
        val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        box.addView(
            com.google.android.material.progressindicator.LinearProgressIndicator(ctx).apply {
                max = s.days.size
                progress = s.daysDone
                setTrackColor(ctx.getColor(if (isDark(ctx)) R.color.ring_track_dark else R.color.ring_track_light))
                setIndicatorColor(ctx.getColor(R.color.ok))
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                )
            },
        )
        box.addView(Rows.small(ctx, getString(R.string.sec_progress, s.daysDone, s.days.size)))
        return box
    }

    private fun isDark(ctx: Context): Boolean =
        (ctx.resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
            android.content.res.Configuration.UI_MODE_NIGHT_YES

    /** "Davom etish"/"Takrorlash" — veb `nav('/path')` (`/path` — O'quv yo'li). */
    private fun goPath() = findNavController().navigate(R.id.learningPathFragment)

    /**
     * Sakrash testi (veb `JumpTest`): ochilishda test TO'PLAMI QOTIRILADI —
     * natija yozilgach o'tkazilgan kunlar `completedDays`ga qo'shiladi va
     * qayta hisob bo'sh ro'yxat berardi (veb izohi bilan bir xil sabab).
     */
    private fun startJump(s: SectionCard) {
        val ctx = requireContext()
        val plan = jumpPlan(s.id, container().store.state.value.data.path, ::daysOf)
        if (plan.exercises.isEmpty()) {
            // Veb: InfoBanner (warn). Mobil: dialog — sabab ochiq aytiladi.
            com.google.android.material.dialog.MaterialAlertDialogBuilder(ctx)
                .setTitle(getString(R.string.sec_jump_title, s.label))
                .setView(MascotDialog.header(ctx, MascotView.Mood.NEUTRAL))
                .setMessage(R.string.sec_jump_no_items)
                .setPositiveButton(android.R.string.ok, null)
                .show()
            return
        }

        val intro = getString(
            R.string.sec_jump_intro,
            plan.exercises.size,
            plan.skippedDays,
            JUMP_PASS_SCORE,
            s.label,
        )
        val ids = plan.exercises.map { it.id }
        // Qahramon + izoh (`setView(header)` + `setMessage`) — mavjud
        // `offerDayComplete` uslubi: qatorlar `Rows.row` bilan qurulmaydi,
        // tugmalar `setPositiveButton` orqali keladi (dialog o'zi yopiladi).
        com.google.android.material.dialog.MaterialAlertDialogBuilder(ctx)
            .setTitle(getString(R.string.sec_jump_title, s.label))
            .setView(MascotDialog.header(ctx, MascotView.Mood.NEUTRAL))
            .setMessage(intro)
            .setNegativeButton(R.string.cancel) { d, _ -> d.dismiss() }
            .setPositiveButton(R.string.sec_jump_start) { d, _ ->
                d.dismiss()
                Nav.openJumpTest(this, ids, s.id, getString(R.string.sec_jump_title, s.label))
            }
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
