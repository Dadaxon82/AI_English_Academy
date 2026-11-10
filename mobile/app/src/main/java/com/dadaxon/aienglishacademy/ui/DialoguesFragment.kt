package com.dadaxon.aienglishacademy.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.Dialogue
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.dialogueExerciseId
import com.dadaxon.aienglishacademy.domain.dialogueProgress
import com.dadaxon.aienglishacademy.domain.dialoguesFor
import com.dadaxon.aienglishacademy.domain.filledLine
import com.dadaxon.aienglishacademy.domain.gapLineIndexes
import com.dadaxon.aienglishacademy.store.StoreState
import kotlinx.coroutines.launch

/**
 * Real hayot suhbatlari (2-bosqich) — veb `src/pages/Dialogues.tsx`.
 *
 * Ro'yxat → suhbat sahifasi: vaziyat, replikalar (o'quvchi replikasidagi
 * bo'shliq `___`), tarjima tugmasi, «Bo'shliqlarni to'ldirish» — mavjud mashq
 * pleyeri `dlg-…` id'lari bilan ochiladi (XP, yuraklar, Xatolar daftari
 * odatdagidek). Pastda «Nega shunday?» izohi va to'liq suhbat.
 *
 * Holat (nechta bo'shliq to'g'ri) urinishlar tarixidan hisoblanadi
 * (`dialogueProgress`) — alohida saqlanmaydi. Ekranda faqat interfeys
 * holati: tanlangan daraja, ochiq suhbat, tarjima ko'rinishi.
 */
class DialoguesFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    private var level: String = Levels.A1
    private var openId: String? = null
    private var showUz = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        level = container().store.settings().currentLevel.takeIf { it == Levels.A1 || it == Levels.A2 } ?: Levels.A1
        openId = saved?.getString("openId")
        b.shellTitle.setText(R.string.dlg_title)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE
        val store = container().store
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                store.state.collect { render(it) }
            }
        }
    }

    override fun onSaveInstanceState(out: Bundle) {
        super.onSaveInstanceState(out)
        out.putString("openId", openId)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }

    private fun all(): List<Dialogue> = runCatching { container().content.dialogues() }.getOrElse { emptyList() }

    private fun render(s: StoreState) {
        if (_b == null) return
        Rows.clear(b.rows)
        val d = openId?.let { id -> all().firstOrNull { it.id == id } }
        if (d == null) renderList(s) else renderDialogue(s, d)
    }

    private fun renderList(s: StoreState) {
        val ctx = requireContext()
        b.shellSubtitle.setText(R.string.dlg_intro)
        val row = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
        for (l in listOf(Levels.A1, Levels.A2)) {
            val btn = if (l == level) Rows.primaryButton(ctx, l) else Rows.button(ctx, l)
            btn.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                if (l == Levels.A1) marginEnd = Rows.dp(ctx, 8)
            }
            btn.setOnClickListener {
                level = l
                render(container().store.state.value)
            }
            row.addView(btn)
        }
        b.rows.addView(row)

        val list = dialoguesFor(all(), level)
        if (list.isEmpty()) {
            b.rows.addView(Rows.empty(ctx, getString(R.string.content_empty)))
            return
        }
        for (d in list) {
            val p = dialogueProgress(d, s.data.attempts)
            val state = if (p.tried == 0) getString(R.string.dlg_not_started) else getString(R.string.dlg_progress, p.correct, p.total)
            b.rows.addView(
                Rows.row(ctx, getString(R.string.dlg_day, d.dayNumber) + " · " + d.titleUz, d.situationUz + "\n" + state, null) {
                    openId = d.id
                    showUz = false
                    render(container().store.state.value)
                    b.shellScroll.scrollTo(0, 0)
                }.apply { contentDescription = d.titleUz + ". " + state },
            )
        }
    }

    private fun renderDialogue(s: StoreState, d: Dialogue) {
        val ctx = requireContext()
        b.shellSubtitle.text = d.titleUz
        b.rows.addView(
            Rows.button(ctx, getString(R.string.dlg_back)).apply {
                setOnClickListener {
                    openId = null
                    render(container().store.state.value)
                }
            },
        )
        b.rows.addView(Rows.body(ctx, d.situationUz))
        b.rows.addView(Rows.small(ctx, getString(R.string.dlg_you_are, d.roles.b)))
        b.rows.addView(
            Rows.button(ctx, getString(if (showUz) R.string.dlg_hide_uz else R.string.dlg_show_uz)).apply {
                setOnClickListener {
                    showUz = !showUz
                    render(container().store.state.value)
                }
            },
        )
        addLines(d, filled = false)

        val ids = gapLineIndexes(d).map { dialogueExerciseId(d, it) }
        val p = dialogueProgress(d, s.data.attempts)
        if (p.tried > 0) b.rows.addView(Rows.small(ctx, getString(R.string.dlg_progress, p.correct, p.total)))
        b.rows.addView(
            Rows.primaryButton(ctx, getString(R.string.dlg_start, ids.size)).apply {
                isEnabled = ids.isNotEmpty()
                setOnClickListener {
                    UsageTracker.track(requireContext(), "dialogue", started = true)
                    // Tartib saqlanadi (suhbat ketma-ketligi), qayta tartiblanmaydi.
                    Nav.openExercises(this@DialoguesFragment, ids, contentId = "dialogue:${d.id}", dayId = null, source = Source.PRACTICE, title = d.titleUz, reorder = false)
                }
            },
        )

        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.dlg_note_title, d.note.titleUz)))
        for (pt in d.note.pointsUz) b.rows.addView(Rows.body(ctx, "• $pt"))
        for (ex in d.note.examples) b.rows.addView(Rows.row(ctx, ex.en, ex.uz, null))
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.dlg_full)))
        addLines(d, filled = true)
    }

    /** Replikalar: o'quvchiniki «Siz» belgisi bilan; tarjima faqat tugma bosilganda. */
    private fun addLines(d: Dialogue, filled: Boolean) {
        val ctx = requireContext()
        for (l in d.lines) {
            val who = if (l.speaker == "b") d.roles.b else d.roles.a
            val text = if (filled) filledLine(l) else l.en
            b.rows.addView(Rows.row(ctx, "$who: $text", if (showUz) l.uz else null, null))
        }
    }
}
