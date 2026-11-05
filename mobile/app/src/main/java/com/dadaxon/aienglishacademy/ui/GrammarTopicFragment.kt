package com.dadaxon.aienglishacademy.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.CommonMistake
import com.dadaxon.aienglishacademy.data.ExampleEn
import com.dadaxon.aienglishacademy.data.GrammarForms
import com.dadaxon.aienglishacademy.data.GrammarTopic
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding

/**
 * Grammatika — ro'yxat va mavzu sahifasi (bitta fragment, ikki holat).
 *
 * MANBA: veb `src/pages/Grammar.tsx` va `GrammarTopic.tsx`. Id berilmasa
 * (`Nav.ARG_ID` bo'sh) mavzular ro'yxati ochiladi — vebda alohida sahifa;
 * mobil bitta ekranda qatorma-qator ko'rsatadi (pastki panel saqlanadi).
 *
 * Mavzu ichida: izoh, formulalar, namunalar (en/uz), fe'l shakllari
 * (tasdiq/inkor/so'roq), tez-tez qilinadigan xatolar va "Mashq qilish"
 * tugmasi — mashq pleyeri shu mavzuning mashqlari bilan ochiladi.
 * Hech qanday son ixtir qilinmaydi: bo'lim bo'sh bo'lsa `content_empty`.
 */
class GrammarTopicFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        val id = Nav.idArg(this)
        b.shellMascot.setMood(MascotView.Mood.NEUTRAL)
        if (id == null) renderList() else renderTopic(id)
    }

    /* --------------------------- mavzular ro'yxati -------------------- */

    private fun renderList() {
        val ctx = requireContext()
        (activity as? AppCompatActivity)?.supportActionBar?.title = getString(R.string.grammar_title)
        b.shellTitle.setText(R.string.grammar_title)
        b.shellSubtitle.setText(R.string.grammar_pick_hint)
        b.emptyText.visibility = View.GONE

        val level = container().store.settings().currentLevel
        val topics = runCatching { container().content.bundle(level).grammar }.getOrElse { emptyList() }
        if (topics.isEmpty()) {
            b.emptyText.setText(R.string.content_empty)
            b.emptyText.visibility = View.VISIBLE
            return
        }
        for (t in topics) {
            b.rows.addView(
                Rows.row(
                    ctx,
                    t.titleUz.ifBlank { t.titleEn },
                    getString(R.string.grammar_topic_level, t.level, t.exercises.size),
                    null,
                ).apply {
                    setOnClickListener {
                        Nav.open(
                            this@GrammarTopicFragment,
                            R.id.grammarTopicFragment,
                            t.id,
                            t.titleUz.ifBlank { t.titleEn },
                        )
                    }
                },
            )
        }
    }

    /* --------------------------- bitta mavzu --------------------------- */

    private fun renderTopic(id: String) {
        val ctx = requireContext()
        val level = container().store.settings().currentLevel
        val topic = runCatching { container().content.bundle(level).grammar.firstOrNull { it.id == id } }.getOrNull()
        if (topic == null) {
            (activity as? AppCompatActivity)?.supportActionBar?.title = getString(R.string.grammar_title)
            b.shellTitle.setText(R.string.grammar_title)
            b.emptyText.setText(R.string.content_empty)
            b.emptyText.visibility = View.VISIBLE
            return
        }

        val title = topic.titleUz.ifBlank { topic.titleEn }
        (activity as? AppCompatActivity)?.supportActionBar?.title = title
        b.shellTitle.text = title
        b.shellSubtitle.text = topic.titleEn + " · " + topic.level
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE

        if (topic.explanationUz.isEmpty()) {
            b.rows.addView(Rows.body(ctx, getString(R.string.content_empty)))
        } else {
            b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.grammar_explanation)))
            for (p in topic.explanationUz) b.rows.addView(Rows.body(ctx, p))
        }

        if (topic.formula.isNotEmpty()) {
            b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.grammar_formula)))
            for (f in topic.formula) {
                val note = f.noteUz
                b.rows.addView(Rows.row(ctx, f.form, note))
            }
        }

        if (topic.examples.isNotEmpty()) {
            b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.grammar_examples)))
            for (e in topic.examples) addExample(e)
        }

        topic.forms?.let { addForms(it) }

        val mistakes = topic.commonMistakes ?: emptyList()
        if (mistakes.isNotEmpty()) {
            b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.grammar_mistakes)))
            for (m in mistakes) addMistake(m)
        }

        // Mashq — mavzuning o'z mashqlari (bo'sh bo'lsa tugma o'chiriladi).
        if (topic.exercises.isNotEmpty()) {
            b.rows.addView(
                Rows.primaryButton(ctx, getString(R.string.grammar_practice)).apply {
                    setOnClickListener {
                        Nav.openExercises(
                            this@GrammarTopicFragment,
                            topic.exercises.map { it.id },
                            topic.id,
                            null,
                            Source.PRACTICE,
                            title,
                        )
                    }
                },
            )
        } else {
            b.rows.addView(Rows.small(ctx, getString(R.string.content_empty)))
        }
    }

    private fun addExample(e: ExampleEn) {
        val ctx = requireContext()
        val card = Rows.card(ctx)
        val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        box.addView(android.widget.TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Body)
            text = e.en
        })
        if (e.uz.isNotBlank()) box.addView(Rows.small(ctx, getString(R.string.vocab_example_uz, e.uz)))
        card.addView(box)
        b.rows.addView(card)
    }

    /** Fe'l shakllari: tasdiq / inkor / so'roq (`GrammarForms`). */
    private fun addForms(f: GrammarForms) {
        val ctx = requireContext()
        val card = Rows.card(ctx)
        val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        addFormList(box, getString(R.string.grammar_forms_aff), f.affirmative)
        addFormList(box, getString(R.string.grammar_forms_neg), f.negative)
        addFormList(box, getString(R.string.grammar_forms_ques), f.question)
        if (box.childCount == 0) return
        card.addView(box)
        b.rows.addView(card)
    }

    private fun addFormList(host: LinearLayout, label: String, lines: List<String>?) {
        val ctx = requireContext()
        if (lines.isNullOrEmpty()) return
        host.addView(Rows.small(ctx, label))
        for (l in lines) host.addView(Rows.body(ctx, l))
    }

    private fun addMistake(m: CommonMistake) {
        val ctx = requireContext()
        val errColor = androidx.core.content.ContextCompat.getColor(ctx, R.color.err)
        val okColor = androidx.core.content.ContextCompat.getColor(ctx, R.color.ok)
        val card = Rows.card(ctx)
        val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        box.addView(android.widget.TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Small)
            setTextColor(errColor)
            text = getString(R.string.grammar_wrong, m.wrong)
        })
        box.addView(android.widget.TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Small)
            setTextColor(okColor)
            text = getString(R.string.grammar_right, m.right)
        })
        if (m.whyUz.isNotBlank()) box.addView(Rows.body(ctx, m.whyUz))
        card.addView(box)
        b.rows.addView(card)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
