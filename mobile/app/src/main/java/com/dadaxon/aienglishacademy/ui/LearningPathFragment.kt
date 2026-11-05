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
import com.dadaxon.aienglishacademy.data.DailyPlanDay
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.data.VocabularyItem
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.buildDayTasks
import com.dadaxon.aienglishacademy.domain.computeAllocation
import com.dadaxon.aienglishacademy.domain.nextDayId
import com.dadaxon.aienglishacademy.domain.skillEvidence

/**
 * O'quv yo'li — veb `src/pages/LearningPath.tsx` ning mobil moslamasi.
 *
 * MANBA: veb `LearningPath.tsx` + `planning.ts`. Daraja bo'yicha kunlar
 * ro'yxati (bajarilgan ✓ / joriy ▼), kun bo'limlari (daqiqa hisobi bilan),
 * bo'lim testi va Mock imtihon tugmasi.
 *
 * Kunni ochish: bo'lim mashq id'lari yig'iladi va pleyer ochiladi
 * (`Nav.openExercises`, manba `practice`); bo'lim testi — manba
 * `section_test`, natija `passedTests`ga yoziladi. Yozish/Gapirish bo'limlari
 * o'z ekranlarida ochiladi (veyda ham alohida sahifalar).
 */
class LearningPathFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        (activity as? AppCompatActivity)?.supportActionBar?.title = getString(R.string.path_title)
        b.shellTitle.setText(R.string.path_title)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE
        render()
    }

    private fun render() {
        val ctx = requireContext()
        val c = container()
        val d = c.store.state.value.data
        val level = d.settings.currentLevel
        val bundle = runCatching { c.content.bundle(level) }.getOrNull()
        val days = bundle?.days ?: emptyList()

        b.shellSubtitle.text = getString(R.string.path_subtitle, level, days.size)
        if (days.isEmpty()) {
            b.emptyText.setText(R.string.dash_plan_empty)
            b.emptyText.visibility = View.VISIBLE
            return
        }

        val currentDayId = nextDayId(level, days.map { it.id }, d.path.completedDays)

        /* Umumiy xo'r: nechta kun yakunlangan. */
        b.rows.addView(
            Rows.statRow(
                ctx,
                Rows.statTile(
                    ctx,
                    "${d.path.completedDays.size}/${days.size}",
                    getString(R.string.path_completed),
                    getString(R.string.path_summary, d.path.completedDays.size, days.size),
                ),
                Rows.statTile(ctx, level, getString(R.string.settings_level_current)),
                Rows.statTile(ctx, d.settings.targetLevel, getString(R.string.settings_level_target)),
            ),
        )

        // Mock imtihon — daraja oxirida (veb: `mockExam` bo'limi).
        bundle?.mockExam?.let { spec ->
            b.rows.addView(
                Rows.row(
                    ctx,
                    getString(R.string.path_mock) + " — " + spec.titleUz,
                    spec.descriptionUz,
                    null,
                    onClick = { Nav.open(this, R.id.mockExamFragment, spec.id, spec.titleUz) },
                ),
            )
        }

        for (day in days) addDay(bundle!!, day, currentDayId)
    }

    private fun addDay(bundle: com.dadaxon.aienglishacademy.data.LevelBundle, day: DailyPlanDay, currentDayId: String) {
        val ctx = requireContext()
        val d = container().store.state.value.data
        val done = d.path.completedDays.contains(day.id)
        val isCurrent = day.id == currentDayId

        val testPassed = day.sectionTest?.let { d.path.passedTests[it.id] }
        val trailing = when {
            testPassed != null -> "✓ " + testPassed
            done -> getString(R.string.path_completed)
            isCurrent -> getString(R.string.path_current)
            else -> null
        }

        val card = Rows.row(
            ctx,
            getString(R.string.path_day_title, day.dayNumber, day.titleUz),
            day.goalUz.ifBlank { null },
            trailing,
            enabled = !done || isCurrent,
            // Ochiladigan kun: joriy yoki allaqachon ochilgan (qayta mashq uchun).
            onClick = { openDay(bundle, day) },
        )

        // Bo'limlar (qator ostida) — faqat joriy/kun ochilganda ko'rsatiladi:
        // boshqa kunlar ro'yxatda ixcham qoladi (veb: akkordeon).
        if (isCurrent || done) {
            val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
            val alloc = computeAllocation(container().store.settings(), skillEvidence(d))
            val doneMap = if (done) Skills.PLAN_ORDER.associateWith { day.id } else emptyMap()
            for (t in buildDayTasks(day, alloc, doneMap)) {
                box.addView(
                    Rows.small(
                        ctx,
                        getString(R.string.path_section_minutes, Rows.skillName(ctx, t.skill), t.minutes) +
                            if (t.done) " · " + getString(R.string.dash_task_done) else "",
                    ),
                )
            }
            // Sarlavhali kartaga bo'limlar qo'shiladi (ichki qator).
            (card.getChildAt(0) as? LinearLayout)?.let { outer ->
                val textCol = (0 until outer.childCount)
                    .map { outer.getChildAt(it) }
                    .filterIsInstance<LinearLayout>()
                    .firstOrNull()
                textCol?.addView(box)
            }
        }
        b.rows.addView(card)
    }

    /** Kunni ochish: bo'lim bo'yicha mashq pleyeri, test va yazı/gapirish. */
    private fun openDay(bundle: com.dadaxon.aienglishacademy.data.LevelBundle, day: DailyPlanDay) {
        val ctx = requireContext()
        val items = ArrayList<Pair<String, List<String>>>()
        for (sec in day.sections) {
            val ids = exerciseIdsFor(bundle, sec.skill, sec.itemIds)
            if (sec.skill == Skills.WRITING || sec.skill == Skills.SPEAKING) {
                items.add(sec.skill to emptyList())
            } else if (ids.isNotEmpty()) {
                items.add(sec.skill to ids)
            }
        }
        if (items.isEmpty()) {
            android.widget.Toast.makeText(ctx, R.string.content_empty, android.widget.Toast.LENGTH_SHORT).show()
            return
        }

        // Yorliqlar: mashqli bo'limlarda — mashq soni; yozish/gapirishda esa
        // bo'lim SARLAVHASI (bu bo'limlarda mashq soni yo'q — ular matn/ovoz
        // bilan bajariladi va tanlash ekraniga olib boradi).
        val labels = items.map { (skill, ids) ->
            val head = Rows.skillName(ctx, skill)
            when {
                ids.isNotEmpty() -> "$head · ${ids.size}"
                else -> {
                    val title = day.sections.firstOrNull { it.skill == skill }?.titleUz
                    // Bo'lim sarlavhasi ko'pincha «Yozish: …» ko'rinishida —
                    // oldiga yana «Yozish · » qo'shsak so'z takrorlanadi.
                    val clean = title?.removePrefix("${head}: ")?.trim()
                    if (!clean.isNullOrBlank()) "$head · $clean" else head
                }
            }
        }
        MaterialAlertDialogItems(labels) { i ->
            val (skill, ids) = items[i]
            val title = day.sections.firstOrNull { it.skill == skill }?.titleUz
                ?.ifBlank { null } ?: Rows.skillName(ctx, skill)
            // Birinchi kontent elementi — veb `LearningPath.tsx` bo'lim
            // sahifasiga o'tadi (`SKILL_ROUTE`), shuning uchun grammatika,
            // o'qish va tinglash O'Z ekranlarida ochiladi: nazariy tushuntirish,
            // o'qish matni va AUDIO (transkript siyosati) o'sha yerda.
            // Mashqlariga o'sha ekrandan o'tiladi.
            val firstId = day.sections.firstOrNull { it.skill == skill }?.itemIds?.firstOrNull() ?: ""
            when (skill) {
                Skills.WRITING -> Nav.open(this, R.id.writingFragment, firstId, title)
                Skills.SPEAKING -> Nav.open(this, R.id.speakingFragment, firstId, title)
                Skills.GRAMMAR -> Nav.open(this, R.id.grammarTopicFragment, firstId, title)
                Skills.READING -> Nav.open(this, R.id.readingFragment, firstId, title)
                Skills.LISTENING -> Nav.open(this, R.id.listeningFragment, firstId, title)
                // Lug'at — mobil pleyer savollarni `vocabQuizExercise` bilan
                // qayta quradi (veb `planning.ts` bilan bir xil), shuning uchun
                // bo'lim Mashq pleyerida ochiladi.
                else -> Nav.openExercises(this, ids, day.id, day.id, Source.PRACTICE, title)
            }
        }
    }

    /**
     * Ro'yxatdan element tanlash dialogi (veb: kun bo'limlari menyusi).
     *
     * `setView` + `setItems` birgalikda ishlamaydi (maxsus ko'rinish kontent
     * panelini egallaydi), shuning uchun ro'yxat `Rows.row` bilan qo'lda
     * quriladi — qahramon ham shu ko'rinishning tepasida (3-vazifa).
     */
    private fun MaterialAlertDialogItems(items: List<String>, onPick: (Int) -> Unit) {
        val ctx = requireContext()
        val box = android.widget.LinearLayout(ctx).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            val pad = ctx.resources.getDimensionPixelSize(R.dimen.screen_pad)
            setPadding(pad, 0, pad, 0)
        }
        box.addView(MascotDialog.header(ctx, MascotView.Mood.NEUTRAL))
        // Dialog oldindan o'zgaruvchiga olinadi: `Rows.row` listeneri ichida
        // `dismiss()` chaqirish shart — aks holda ekran (pleyer, grammatica)
        // ochiladi, lekin ro'yxat ustida qoladi (o'lchangan xato).
        var dialog: android.app.Dialog? = null
        items.forEachIndexed { i, label ->
            box.addView(
                Rows.row(ctx, label) {
                    dialog?.dismiss()
                    onPick(i)
                },
            )
        }
        dialog = com.google.android.material.dialog.MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.path_start_day)
            .setView(box)
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    /**
     * Bo'lim `itemIds`idan mashq id'lari (veb: `planning.ts` + `check.ts`
     * qoidasi bilan bir xil): lug'at — `vocabQuizExercise`, grammatika/
     * o'qish/tinglash — topshiriqning `exercises` ro'yxati.
     */
    private fun exerciseIdsFor(bundle: com.dadaxon.aienglishacademy.data.LevelBundle, skill: String, itemIds: List<String>): List<String> {
        val cr = container().content
        val out = ArrayList<String>()
        for (id in itemIds) {
            when (skill) {
                Skills.VOCABULARY -> {
                    val v = cr.findVocab(id) ?: continue
                    out.add(cr.vocabQuizExercise(v, quizOptions(v, bundle.vocab)).id)
                }
                Skills.GRAMMAR -> bundle.grammar.firstOrNull { it.id == id }?.exercises?.forEach { out.add(it.id) }
                Skills.READING -> bundle.reading.firstOrNull { it.id == id }?.exercises?.forEach { out.add(it.id) }
                Skills.LISTENING -> bundle.listening.firstOrNull { it.id == id }?.exercises?.forEach { out.add(it.id) }
                else -> cr.findExercise(id)?.let { out.add(it.id) }
            }
        }
        return out
    }

    /** Lug'at testiga 4 variant: to'g'ri ma'no + 3 ta boshqa so'z tarjimasi. */
    private fun quizOptions(v: VocabularyItem, pool: List<VocabularyItem>): List<String> {
        val rnd = java.util.Random(v.id.hashCode().toLong())
        val others = pool
            .filter { it.id != v.id && it.translationUz != v.translationUz }
            .shuffled(rnd)
            .take(3)
            .map { it.translationUz }
        return (listOf(v.translationUz) + others).shuffled(rnd)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
