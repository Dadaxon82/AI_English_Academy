package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.WritingAnalysis
import com.dadaxon.aienglishacademy.data.WritingSubmission
import com.dadaxon.aienglishacademy.data.WritingTask
import com.dadaxon.aienglishacademy.databinding.FragmentWritingBinding
import com.dadaxon.aienglishacademy.domain.analyzeWriting
import com.dadaxon.aienglishacademy.domain.countWords
import com.dadaxon.aienglishacademy.domain.criterionLabelUz
import com.dadaxon.aienglishacademy.store.AppStore
import com.dadaxon.aienglishacademy.store.StoreAction
import java.util.UUID

/**
 * Yozish ekrani — ro'yxat / bitta topshiriq (`Nav.ARG_ID`).
 *
 * Tahlil `domain/Analyze.kt` (qoidaviy dvigatel) bilan MAHHALIY hisoblanadi:
 * tahlil tez, shuning uchun sekin IO talab qilinmaydi va `analysis.engine`
 * halol ko'rsatiladi (`writing_engine_rule`) — AI ulanganda `writing_engine_ai`.
 *
 * Yuborishda eski javob saqlanadi, Yangi yozuv unga `supersedesId` bilan
 * bog'lanadi (veb semantikasi — tarix yo'qolmaydi, "oldingisini almashtiradi"
 * degan izoh shu sababli ko'rsatiladi).
 */
class WritingFragment : Fragment() {

    private var _b: FragmentWritingBinding? = null
    private val b get() = requireNotNull(_b)

    private var task: WritingTask? = null

    /** Javob yozila boshlangan payt — `secondsSpent` shundan olinadi (ixtiro emas). */
    private var startedAt = 0L

    /** So'nggi yuborilgan yozuv (ekran qayta ko'rsatilganda tarixdan o'qiladi). */
    private var lastSubmission: WritingSubmission? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentWritingBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.writingMascot.setMood(MascotView.Mood.NEUTRAL)
        startedAt = System.currentTimeMillis()
        render()
    }

    /* ------------------------------ render ------------------------------ */

    private fun render() {
        val ctx = requireContext()
        Rows.clear(b.writingRows)
        Rows.clear(b.writingResultRows)
        b.writingEmpty.visibility = View.GONE

        val id = Nav.idArg(this)
        if (id == null) {
            task = null
            b.writingFormBox.visibility = View.GONE
            renderList(ctx)
            return
        }
        val found = taskById(id)
        if (found == null) {
            task = null
            b.writingFormBox.visibility = View.GONE
            b.writingTitle.setText(R.string.writing_title)
            b.writingSubtitle.text = ""
            b.writingMascot.setMood(MascotView.Mood.SAD)
            b.writingEmpty.setText(R.string.content_error)
            b.writingEmpty.visibility = View.VISIBLE
            return
        }
        task = found
        renderTask(found, ctx)
    }

    private fun renderList(ctx: Context) {
        b.writingTitle.setText(R.string.writing_title)
        b.writingSubtitle.setText(R.string.writing_pick_hint)

        val items = tasksForCurrentLevel()
        if (items.isEmpty()) {
            b.writingEmpty.setText(R.string.content_empty)
            b.writingEmpty.visibility = View.VISIBLE
            b.writingMascot.setMood(MascotView.Mood.SAD)
            return
        }
        for (t in items) {
            b.writingRows.addView(
                Rows.row(
                    ctx,
                    t.instructionUz.ifBlank { t.promptEn },
                    getString(R.string.writing_task_meta, t.level, t.minWords, t.maxWords, t.minutes),
                    trailing = getString(R.string.writing_submit),
                ) { Nav.open(this, R.id.writingFragment, t.id, t.promptEn.ifBlank { t.id }) },
            )
        }
    }

    private fun renderTask(t: WritingTask, ctx: Context) {
        b.writingTitle.text = t.promptEn.ifBlank { getString(R.string.writing_title) }
        b.writingSubtitle.text = getString(R.string.writing_task_meta, t.level, t.minWords, t.maxWords, t.minutes)
        b.writingMascot.setMood(MascotView.Mood.HAPPY)

        // Vazifa — inglizcha prompt + o'zbekcha yo'riqnoma.
        b.writingRows.addView(Rows.body(ctx, getString(R.string.writing_prompt, t.promptEn)))
        if (t.instructionUz.isNotBlank()) b.writingRows.addView(Rows.body(ctx, t.instructionUz))

        // Tekshiruv ro'yxati.
        val checklist = t.checklistUz ?: emptyList()
        if (checklist.isNotEmpty()) {
            b.writingRows.addView(Rows.sectionTitle(ctx, getString(R.string.writing_checklist)))
            for (line in checklist) b.writingRows.addView(Rows.body(ctx, "• $line"))
        }

        // Shartlar (mustInclude) — naqsh + sabab.
        val must = t.mustInclude ?: emptyList()
        if (must.isNotEmpty()) {
            b.writingRows.addView(Rows.sectionTitle(ctx, getString(R.string.writing_criteria)))
            for (m in must) {
                b.writingRows.addView(Rows.small(ctx, getString(R.string.writing_must_include, m.pattern) + " — " + m.whyUz))
            }
        }

        // Namuna javob — tugma bosilganda ochiladi (avval o'qib nusxa olinmasin).
        val model = t.modelAnswerEn
        if (!model.isNullOrBlank()) {
            val button = Rows.button(ctx, getString(R.string.writing_model_show))
            button.setOnClickListener {
                b.writingRows.addView(Rows.sectionTitle(ctx, getString(R.string.writing_model)))
                b.writingRows.addView(Rows.body(ctx, model))
                button.visibility = View.GONE
            }
            b.writingRows.addView(button)
        }

        // Forma + jonli so'z soni.
        b.writingFormBox.visibility = View.VISIBLE
        b.writingField.setText(lastSubmission?.text ?: "")
        b.writingField.addTextChangedListener(watcher)
        updateWords()

        // Saqlangan javob bo'lsa — qayta topshirish tugmasi ham ko'rinadi.
        b.writingSubmit.setOnClickListener { submit() }
        b.writingResubmit.setOnClickListener { submit() }

        // Tarix — shu topshiriq bo'yicha avvalgi yuborishlar.
        renderHistory(ctx, t.id)
    }

    private val watcher = object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) = Unit
        override fun onTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) = Unit
        override fun afterTextChanged(s: Editable?) = updateWords()
    }

    /** Jonli son + hajm ogohlantirishi (yuborishga to'siq qilmaydi). */
    private fun updateWords() {
        val box = _b ?: return
        val t = task ?: return
        val words = countWords(box.writingField.text?.toString() ?: "")
        box.writingWords.text = getString(R.string.writing_words, words)
        if (words < t.minWords) {
            box.writingWarn.text = getString(R.string.writing_min_words, t.minWords)
            box.writingWarn.visibility = View.VISIBLE
        } else {
            box.writingWarn.visibility = View.GONE
        }
    }

    /* ----------------------------- yuborish ------------------------------ */

    private fun submit() {
        val ctx = requireContext()
        val t = task ?: return
        val text = b.writingField.text?.toString() ?: ""

        // Qoidaviy tahlil mahalliy va tez — to'g'ridan-to'g'ri chaqiriladi.
        val analysis = analyzeWriting(text, t)

        // Oldingi javob (shu topshiriq bo'yicha eng so'nggi) — almashtirish izi.
        val previous = submissionsFor(t.id).maxByOrNull { it.createdAt }
        val sub = WritingSubmission(
            id = "w-" + UUID.randomUUID().toString().replace("-", "").take(16),
            taskId = t.id,
            text = text,
            wordCount = analysis.wordCount,
            secondsSpent = ((System.currentTimeMillis() - startedAt) / 1000L).coerceIn(0L, 24L * 3600L).toInt(),
            analysis = analysis,
            supersedesId = previous?.id,
            createdAt = System.currentTimeMillis(),
        )
        container().store.dispatch(StoreAction.WritingAdd(sub))
        lastSubmission = sub

        // Topshiriq bloki (prompt, tekshiruv ro'yxati, namuna) o'rnida qoladi —
        // foydalanuvchi javobini tuzatib qayta yuborishi uchun.
        Rows.clear(b.writingResultRows)
        renderAnalysis(ctx, analysis, sub)
        renderHistory(ctx, t.id)
        b.writingResubmit.visibility = View.VISIBLE
        b.writingMascot.setMood(MascotView.Mood.CHEER)
    }

    /* ---------------------------- tahlil kartasi ------------------------- */

    private fun renderAnalysis(ctx: Context, a: WritingAnalysis, sub: WritingSubmission) {
        val engine = if (a.engine == "ai") getString(R.string.writing_engine_ai) else getString(R.string.writing_engine_rule)
        b.writingResultRows.addView(Rows.sectionTitle(ctx, engine))
        b.writingResultRows.addView(Rows.small(ctx, getString(R.string.writing_words, a.wordCount)))
        if (sub.supersedesId != null) b.writingResultRows.addView(Rows.small(ctx, getString(R.string.writing_superseded)))

        // Mezonlar — 5lik shkala.
        b.writingResultRows.addView(Rows.sectionTitle(ctx, getString(R.string.writing_criteria)))
        for ((key, value) in a.criteriaScores) {
            b.writingResultRows.addView(
                Rows.row(ctx, criterionLabelUz(key), null, trailing = scoreText(value)),
            )
        }

        textBlock(ctx, R.string.writing_strengths, a.strengthsUz)
        textBlock(ctx, R.string.writing_weaknesses, a.weaknessesUz)
        textBlock(ctx, R.string.writing_suggestions, a.suggestionsUz)

        // Xatolar — tuzatish + sabab.
        b.writingResultRows.addView(Rows.sectionTitle(ctx, getString(R.string.writing_errors)))
        if (a.errors.isEmpty()) {
            b.writingResultRows.addView(Rows.body(ctx, getString(R.string.writing_errors_none)))
        }
        for (e in a.errors) {
            b.writingResultRows.addView(
                Rows.row(
                    ctx,
                    getString(R.string.writing_correction, e.correction),
                    (if (e.excerpt.isNotBlank()) "${e.excerpt} — " else "") + e.whyUz,
                ),
            )
        }
    }

    private fun textBlock(ctx: Context, titleRes: Int, lines: List<String>) {
        if (lines.isEmpty()) return
        b.writingResultRows.addView(Rows.sectionTitle(ctx, getString(titleRes)))
        for (line in lines) b.writingResultRows.addView(Rows.body(ctx, "• $line"))
    }

    /** Ball — butun son bo'lsa "4/5", aks holda o'nlik ham halol ko'rsatiladi. */
    private fun scoreText(value: Double): String =
        if (value == Math.floor(value)) "${value.toInt()}/5" else String.format("%.1f/5", value)

    /* ------------------------------- tarix ------------------------------- */

    private fun renderHistory(ctx: Context, taskId: String) {
        val items = submissionsFor(taskId)
        b.writingResultRows.addView(Rows.sectionTitle(ctx, getString(R.string.writing_history)))
        if (items.isEmpty()) {
            b.writingResultRows.addView(Rows.body(ctx, getString(R.string.writing_history_empty)))
            return
        }
        for (s in items.sortedByDescending { it.createdAt }) {
            val note = getString(R.string.writing_words, s.wordCount) +
                " · " + AppStore.formatDuration(s.secondsSpent) +
                " · " + s.text.take(60)
            b.writingResultRows.addView(Rows.row(ctx, s.createdAtText(), note))
        }
    }

    private fun WritingSubmission.createdAtText(): String =
        java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date(createdAt))

    /* ---------------------------- kontent izlovi ------------------------- */

    private fun tasksForCurrentLevel(): List<WritingTask> {
        val cr = container().content
        val level = runCatching { container().store.settings().currentLevel }.getOrDefault("")
        return runCatching { cr.bundle(level).writing }.getOrElse { emptyList() }
    }

    private fun taskById(id: String): WritingTask? {
        val cr = container().content
        tasksForCurrentLevel().firstOrNull { it.id == id }?.let { return it }
        val levels = runCatching { cr.levels() }.getOrElse { emptyList() }
        for (lvl in levels) {
            val bundle = runCatching { cr.bundle(lvl) }.getOrNull() ?: continue
            bundle.writing.firstOrNull { it.id == id }?.let { return it }
            // Mock imtihon topshiriqlari `mockExam.sections` ichida — ular ham
            // shu ekran orqali ochiladi (`mock_start`), shuning uchun qidiruvga
            // qo'shiladi, aks holda "material topilmardi" deb qolardi.
            bundle.mockExam?.sections?.firstNotNullOfOrNull { sec ->
                sec.writingTask?.takeIf { it.id == id }
            }?.let { return it }
        }
        return null
    }

    private fun submissionsFor(taskId: String): List<WritingSubmission> =
        runCatching { container().store.writingAll().filter { it.taskId == taskId } }.getOrElse { emptyList() }

    override fun onDestroyView() {
        super.onDestroyView()
        _b?.writingField?.removeTextChangedListener(watcher)
        _b = null
    }
}
