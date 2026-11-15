package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.ExerciseResult
import com.dadaxon.aienglishacademy.data.MockExamAttempt
import com.dadaxon.aienglishacademy.data.MockExamSectionSpec
import com.dadaxon.aienglishacademy.data.MockExamSpec
import com.dadaxon.aienglishacademy.data.MockSectionResult
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.data.SpeakingSession
import com.dadaxon.aienglishacademy.data.WritingSubmission
import com.dadaxon.aienglishacademy.databinding.FragmentMockExamBinding
import com.dadaxon.aienglishacademy.domain.speakingScore
import com.dadaxon.aienglishacademy.store.AppStore
import com.dadaxon.aienglishacademy.store.StoreAction
import java.text.SimpleDateFormat
import java.util.Date
import java.util.LinkedHashSet
import java.util.Locale
import java.util.UUID

/**
 * Mock imtihon ekrani — bo'limlar ro'yxati, bitta bo'limni ochish va yakuniy
 * natija.
 *
 * Natijalar YANGI manbadan o'qilmaydi: mavjud `container().store.attempts()`
 * (`source == Source.MOCK_EXAM`) va yozish/gapirish yuborishlari bo'lim
 * kontenti bilan bog'lanadi — shuning uchun pleyerda qo'shimcha holat
 * saqlash shart emas va sonlar haqiqiy urinishlardan keladi.
 *
 * `mock_reset` — `StoreAction.Reset` EMMAS: u faqat shu ekrandagi oraliq
 * holatni (tanlangan bo'lim) tozalaydi, foydalanuvchi ma'lumotini o'chirmaydi.
 */
class MockExamFragment : Fragment() {

    private var _b: FragmentMockExamBinding? = null
    private val b get() = requireNotNull(_b)

    /** Ekrandagi oraliq holat — `mock_start` shu bo'limni ochadi. */
    private var selectedSectionId: String? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentMockExamBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.mockMascot.setMood(MascotView.Mood.NEUTRAL)
        if (Nav.idArg(this) != null) selectedSectionId = Nav.idArg(this)
        render()
    }

    /* ------------------------------ render ------------------------------ */

    private fun render() {
        val ctx = requireContext()
        Rows.clear(b.mockRows)
        b.mockEmpty.visibility = View.GONE
        b.mockTotal.visibility = View.GONE
        b.mockTotal.text = ""

        val spec = specForCurrentLevel()
        if (spec == null || spec.sections.isEmpty()) {
            // Material tayyor emas — baho/bo'lim ixtir qilinmaydi.
            b.mockTitle.setText(R.string.mock_title)
            b.mockSubtitle.setText(R.string.mock_intro)
            b.mockMascot.setMood(MascotView.Mood.SAD)
            b.mockEmpty.setText(R.string.mock_not_ready)
            b.mockEmpty.visibility = View.VISIBLE
            b.mockFinish.visibility = View.GONE
            b.mockReset.visibility = View.GONE
            return
        }

        b.mockTitle.text = spec.titleUz.ifBlank { getString(R.string.mock_title) }
        b.mockSubtitle.text = spec.descriptionUz.ifBlank { getString(R.string.mock_intro) }
        b.mockMascot.setMood(MascotView.Mood.HAPPY)
        b.mockRows.addView(Rows.body(ctx, getString(R.string.mock_intro)))
        // namunaviy format — halol ogohlantirish (kontentda yozilgan).
        if (spec.disclaimerUz.isNotBlank()) b.mockRows.addView(Rows.small(ctx, spec.disclaimerUz))

        val attempts = runCatching { container().store.attempts() }.getOrElse { emptyList() }
        val writing = runCatching { container().store.writingAll() }.getOrElse { emptyList() }
        val speaking = runCatching { container().store.speakingAll() }.getOrElse { emptyList() }

        b.mockRows.addView(Rows.sectionTitle(ctx, getString(R.string.path_mock)))
        for (s in spec.sections) {
            val meta = getString(R.string.mock_section_meta, Rows.skillName(ctx, s.skill), s.minutes) +
                " · " + getString(R.string.mock_time_left, AppStore.formatDuration(s.minutes * 60))
            val chosen = selectedSectionId == s.id
            b.mockRows.addView(
                Rows.row(
                    ctx,
                    (if (chosen) "• " else "") + s.titleUz.ifBlank { s.titleEn },
                    meta,
                    trailing = getString(R.string.mock_start),
                ) { selectedSectionId = s.id; render() },
            )
            if (s.formatNote.isNotBlank()) b.mockRows.addView(Rows.small(ctx, s.formatNote))
            if (chosen) {
                b.mockRows.addView(
                    Rows.primaryButton(ctx, getString(R.string.mock_start)).apply {
                        setOnClickListener { openSection(s) }
                    },
                )
            }
        }

        // Yakuniy natija — saqlangan urinishlardan hisoblanadi.
        renderResults(ctx, spec, attempts, writing, speaking)
        renderHistory(ctx)

        b.mockFinish.visibility = View.VISIBLE
        b.mockFinish.setOnClickListener { finish(spec, attempts, writing, speaking) }
        b.mockReset.visibility = if (selectedSectionId == null) View.GONE else View.VISIBLE
        b.mockReset.setOnClickListener {
            // Faqat ekrandagi tanlov tozalanadi (`StoreAction.Reset` ishlatilmaydi).
            selectedSectionId = null
            render()
        }
    }

    /* --------------------------- bo'limni ochish ------------------------- */

    /**
     * `mock_start` bitta bo'limni ochadi: mashqlar bo'lsa — pleyer
     * (`Source.MOCK_EXAM`), bo'lmasa yozish/gapirish topshirig'i.
     */
    private fun openSection(s: MockExamSectionSpec) {
        if (s.exercises.isNotEmpty()) {
            Nav.openExercises(
                this,
                s.exercises.map { it.id },
                s.id,
                null,
                Source.MOCK_EXAM,
                s.titleUz.ifBlank { s.titleEn },
            )
            return
        }
        s.writingTask?.let { Nav.open(this, R.id.writingFragment, it.id, it.promptEn.ifBlank { it.id }); return }
        s.speakingTask?.let { Nav.open(this, R.id.speakingFragment, it.id, it.topicUz.ifBlank { it.id }); return }
        b.mockEmpty.setText(R.string.ex_exercises_empty)
        b.mockEmpty.visibility = View.VISIBLE
    }

    /* ------------------------------ natijalar ---------------------------- */

    private fun renderResults(
        ctx: Context,
        spec: MockExamSpec,
        attempts: List<AttemptRecord>,
        writing: List<WritingSubmission>,
        speaking: List<SpeakingSession>,
    ) {
        val results = spec.sections.map { sectionOutcome(it, attempts, writing, speaking) }
        val scored = results.mapNotNull { it.score }

        b.mockRows.addView(Rows.sectionTitle(ctx, getString(R.string.mock_result_title)))
        if (results.all { it.answered == 0 }) {
            // Hali hech narsa bajarilmagan — baho "0" emas, "yo'q" deb ko'rsatiladi.
            b.mockRows.addView(Rows.body(ctx, getString(R.string.empty_generic)))
            return
        }

        if (scored.isEmpty()) {
            b.mockTotal.text = getString(R.string.mock_total_score, getString(R.string.mock_score_na))
        } else {
            val total = Math.round(scored.average()).toDouble()
            b.mockTotal.text = getString(R.string.mock_total_score, getString(R.string.skillbar_percent, total.toInt()))
        }
        b.mockTotal.visibility = View.VISIBLE

        for ((i, r) in results.withIndex()) {
            val spec1 = spec.sections[i]
            b.mockRows.addView(
                Rows.row(
                    ctx,
                    getString(
                        R.string.mock_section_score,
                        spec1.titleUz.ifBlank { spec1.titleEn },
                        r.numerator(),
                        r.total,
                    ),
                    getString(
                        R.string.skillbar_minutes,
                        ((r.secondsUsed ?: 0) / 60).toInt(),
                        spec1.minutes,
                    ),
                    trailing = if (r.score == null) getString(R.string.mock_score_na) else getString(R.string.skillbar_percent, r.score!!.toInt()),
                ),
            )
            if (spec1.writingTask != null || spec1.speakingTask != null) {
                b.mockRows.addView(Rows.small(ctx, getString(R.string.mock_speaking_advisory, spec.disclaimerUz)))
            }
        }
    }

    /* ------------------------------ yakunlash ---------------------------- */

    private fun finish(
        spec: MockExamSpec,
        attempts: List<AttemptRecord>,
        writing: List<WritingSubmission>,
        speaking: List<SpeakingSession>,
    ) {
        val ctx = requireContext()
        val results = spec.sections.map { sectionOutcome(it, attempts, writing, speaking) }
            .filter { it.answered > 0 }
        if (results.isEmpty()) {
            b.mockEmpty.setText(R.string.mock_history_empty)
            b.mockEmpty.visibility = View.VISIBLE
            return
        }
        val scored = results.mapNotNull { it.score }
        val attempt = MockExamAttempt(
            id = "m-" + UUID.randomUUID().toString().replace("-", "").take(12),
            examId = spec.id,
            sections = results,
            totalScore = if (scored.isEmpty()) null else Math.round(scored.average()).toDouble(),
            speakingAdvisory = spec.disclaimerUz,
            completedAt = System.currentTimeMillis(),
        )
        container().store.dispatch(StoreAction.MockAdd(attempt))

        // Mockda sarflangan vaqt kundalik hisobga yoziladi (skill → sekund).
        val times = LinkedHashMap<String, Int>()
        for (r in results) {
            val used = r.secondsUsed ?: 0
            if (used > 0) times[r.skill] = (times[r.skill] ?: 0) + used
        }
        if (times.isNotEmpty()) container().store.dispatch(StoreAction.MockTime(times))

        Toast.makeText(ctx, R.string.mock_saved, Toast.LENGTH_SHORT).show()
        b.mockMascot.setMood(MascotView.Mood.CHEER)
        // `render()` tarixni ham qayta chizadi — ikki marta qo'shilmasin.
        render()
    }

    /**
     * Bo'lim natijasi — haqiqiy yozuvlardan: mashqlar `attempts`dan,
     * yozish/gapirish esa yuborishlardan. Baho 0..100 (`skillEvidence`dagi
     * mock dalili bilan bir xil shkala).
     */
    private fun sectionOutcome(
        s: MockExamSectionSpec,
        attempts: List<AttemptRecord>,
        writing: List<WritingSubmission>,
        speaking: List<SpeakingSession>,
    ): MockSectionResult {
        val skill = if (Skills.CORE.contains(s.skill)) s.skill else Skills.READING

        // --- Mashqli bo'lim: har mashq bo'yicha SO'NGGI urinish olinadi. ---
        val ids = LinkedHashSet(s.exercises.map { it.id })
        val latest = attempts
            .filter { it.source == Source.MOCK_EXAM && ids.contains(it.exerciseId) }
            .groupBy { it.exerciseId }
            .mapNotNull { (_, list) -> list.maxByOrNull { a -> a.at } }
        if (latest.isNotEmpty() || (s.exercises.isNotEmpty() && s.writingTask == null && s.speakingTask == null)) {
            val results = LinkedHashMap<String, ExerciseResult>()
            for (a in latest) results[a.exerciseId] = ExerciseResult(a.correct, a.answerGiven)
            val correct = latest.count { it.correct }
            val total = s.exercises.size
            return MockSectionResult(
                sectionId = s.id,
                skill = skill,
                answered = latest.size,
                total = total,
                score = if (total == 0 || latest.isEmpty()) null else Math.round(correct * 100.0 / total).toDouble(),
                startedAt = latest.minOfOrNull { it.at } ?: 0L,
                finishedAt = latest.maxOfOrNull { it.at } ?: 0L,
                secondsUsed = latest.sumOf { it.secondsSpent.coerceAtLeast(0) },
                exerciseResults = results,
            )
        }

        // --- Yozish bo'limi — `writing_analysis` mezonlari 0..5 dan 0..100 ga. ---
        s.writingTask?.let { task ->
            val subs = writing.filter { it.taskId == task.id }.sortedBy { it.createdAt }
            val last = subs.lastOrNull()
            val avg = last?.analysis?.criteriaScores?.values?.sum()?.div(5) ?: 0.0
            return MockSectionResult(
                sectionId = s.id,
                skill = skill,
                answered = if (last == null) 0 else 1,
                total = 1,
                score = if (last?.analysis == null) null else Math.round((avg / 5.0) * 100.0).toDouble(),
                startedAt = last?.createdAt ?: 0L,
                finishedAt = last?.createdAt ?: 0L,
                secondsUsed = subs.sumOf { it.secondsSpent.coerceAtLeast(0) },
            )
        }

        // --- Gapirish bo'limi — `speakingScore` (matnli javobda ravonlik hisobga
        //     olinmaydi, shuning uchun baho halol pasayadi). ---
        s.speakingTask?.let { task ->
            val sessions = speaking.filter { it.taskId == task.id }.sortedBy { it.createdAt }
            val last = sessions.lastOrNull()
            return MockSectionResult(
                sectionId = s.id,
                skill = skill,
                answered = if (last == null) 0 else 1,
                total = 1,
                score = last?.analysis?.let { speakingScore(it).toDouble() },
                startedAt = last?.createdAt ?: 0L,
                finishedAt = last?.createdAt ?: 0L,
                secondsUsed = sessions.sumOf { it.durationSec.coerceAtLeast(0) },
            )
        }

        return MockSectionResult(s.id, skill, 0, s.exercises.size, null, 0L, 0L, 0)
    }

    /**
     * `mock_section_score`ningchap tomoni: mashq bo'limida — to'g'ri javoblar
     * soni, yozish/gapirish bo'limida — bajarilgan topshiriq soni (0 yoki 1).
     */
    private fun MockSectionResult.numerator(): Int =
        if (exerciseResults.isNotEmpty()) exerciseResults.values.count { it.correct } else answered

    /* ------------------------------- tarix ------------------------------- */

    private fun renderHistory(ctx: Context) {
        val items = runCatching { container().store.mocksAll() }.getOrElse { emptyList() }
        b.mockRows.addView(Rows.sectionTitle(ctx, getString(R.string.mock_history)))
        if (items.isEmpty()) {
            b.mockRows.addView(Rows.body(ctx, getString(R.string.mock_history_empty)))
            return
        }
        val df = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
        for (m in items.sortedByDescending { it.completedAt }) {
            val score = m.totalScore?.let { getString(R.string.skillbar_percent, it.toInt()) } ?: getString(R.string.mock_score_na)
            b.mockRows.addView(
                Rows.row(
                    ctx,
                    df.format(Date(m.completedAt)),
                    getString(R.string.mock_section_meta, getString(R.string.mock_result_title), m.sections.size),
                    trailing = score,
                ),
            )
        }
    }

    /* ---------------------------- kontent izlovi ------------------------- */

    private fun specForCurrentLevel(): MockExamSpec? {
        val cr = container().content
        val level = runCatching { container().store.settings().currentLevel }.getOrDefault("")
        runCatching { cr.bundle(level).mockExam }.getOrNull()?.let { return it }
        // Daraja almashtirilgan bo'lishi mumkin — boshqa to'plamlarda qidiriladi.
        for (lvl in runCatching { cr.levels() }.getOrElse { emptyList() }) {
            val hit = runCatching { cr.bundle(lvl).mockExam }.getOrNull()
            if (hit != null) return hit
        }
        return null
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
