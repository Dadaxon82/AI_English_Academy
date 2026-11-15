package com.dadaxon.aienglishacademy.ui

import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.DailyPlanDay
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.data.VocabularyItem
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.ChainState
import com.dadaxon.aienglishacademy.domain.DayChain
import com.dadaxon.aienglishacademy.domain.buildChain
import com.dadaxon.aienglishacademy.domain.buildDayTasks
import com.dadaxon.aienglishacademy.domain.chainAudit
import com.dadaxon.aienglishacademy.domain.computeAllocation
import com.dadaxon.aienglishacademy.domain.lessonSequence
import com.dadaxon.aienglishacademy.domain.nextDayId
import com.dadaxon.aienglishacademy.domain.pathLevel
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
        // O'quv yo'li darajasi (veb `pathLevel` bilan bir xil): A1 tugasa yoki A2.1 ga
        // sakralsa — A2 kunlari. Baholangan daraja (`currentLevel`) o'zgarmaydi.
        val level = pathLevel(d.path, d.settings.currentLevel) { lvl -> runCatching { c.content.bundle(lvl).days }.getOrDefault(emptyList()) }
        val bundle = runCatching { c.content.bundle(level) }.getOrNull()
        val days = bundle?.days ?: emptyList()

        b.shellSubtitle.text = getString(R.string.path_subtitle, level, days.size)
        if (days.isEmpty()) {
            b.emptyText.setText(R.string.dash_plan_empty)
            b.emptyText.visibility = View.VISIBLE
            return
        }

        // `days` bo'sh bo'lmasa `bundle` ham yo'q emas (yuqoridagi `?:`
        // bir joydan keladi) — shuning uchun bu yerda null tekshiruvi takroriy
        // va `!!` shart emas.
        val bundleSafe = bundle ?: return
        val currentDayId = nextDayId(level, days.map { it.id }, d.path.completedDays)

        // Joriy bo'lim banneri — veb `LearningPath.tsx` tepasidagi
        // `SectionBanner` bilan bir xil joy (`currentSectionInfo` ma'lumoti).
        SectionBannerUi.show(this, b.bannerBox)

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

        // "Barcha bo'limlar (A1.1 … C1.2)" — veb'dagi havola bilan bir xil
        // joy (statistika plitkalari ostida).
        b.rows.addView(
            Rows.button(ctx, getString(R.string.sec_link_all)).apply {
                setOnClickListener { findNavController().navigate(R.id.sectionsFragment) }
            },
        )

        /* ---- darslar KETMA-KETLIGI (zanjir kartasi) ----
           Namunaviy ilova dars tartibini `assets/hardcoded_sessions/` ichidagi
           JSON'lardagi tartiblangan `challenges` massivi bilan beradi
           (o'lchangan: 18 fayl; `math_lesson.json` — 15 mashq / 10 tur —
           `domain/LessonChain.kt` izohida va `tools/dulo_scan/DULO_FAKTLAR.json`).
           Bu karta shu tartibni ko'rsatadi: har kun bo'limlari qadam qatorida. */
        addChainCard(bundleSafe, days, currentDayId, d.path.completedDays)

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

        for (day in days) addDay(bundleSafe, day, currentDayId)
    }

    /**
     * Zanjir kartasi: har kun bo'limlari qadam qatorida (to'ldirilgan katak
     * = bajarilgan bo'lim). Harakat `Motion.fillChainCell` orqali bosqichma-
     * bosqich to'ladi — DULO'ning "o'quv yo'li kataklari birma-bir yonadi"
     * xulqining bizdagi ko'rinishi (tizim animatsiyalari o'chirilgan bo'lsa
     * kataklar darhol to'la chiziladi).
     *
     * BYUDJET: kunlar soni daraja hajmi bilan chegaralanadi (o'lchangan:
     * A1 — 7 kun; har kun 6 bo'lim + test = 7 qadam; jami 49 katak) —
     * `UI_KONTRAKTI.md`dagi bo'laklab chizish qoidasi buzilmaydi.
     */
    private fun addChainCard(
        bundle: com.dadaxon.aienglishacademy.data.LevelBundle,
        days: List<DailyPlanDay>,
        currentDayId: String,
        completedDays: List<String>,
    ) {
        val ctx = requireContext()
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.path_chain_title)))
        b.rows.addView(Rows.small(ctx, getString(R.string.path_chain_hint)))
        val chains = days.map { day ->
            buildChain(
                day = day,
                exerciseIdsBySkill = day.sections.associate { sec ->
                    sec.skill to exerciseIdsFor(bundle, sec.skill, sec.itemIds)
                },
                dayIndex = days.indexOf(day),
                isCurrent = day.id == currentDayId,
                isDone = completedDays.contains(day.id),
            ).also { b.rows.addView(chainCard(ctx, it)) }
        }
        // Ketma-ketlik auditi — BUTUN zanjir bo'yicha BIR marta (veb
        // `LearningPath.tsx::ChainOverview` bilan bir xil joy va bir xil son).
        // Raqamlar ixtira EMAS: `chainAudit` kontentdan hisoblaydi.
        val audit = chainAudit(chains) { id -> container().content.findExercise(id)?.kind }
        if (audit.rotationSteps > 0 || audit.reinforcement > 0) {
            b.rows.addView(
                Rows.small(
                    ctx,
                    getString(
                        R.string.path_chain_audit,
                        audit.rotationSteps,
                        audit.reinforcement,
                        audit.sameNeighbours,
                        audit.unavoidable,
                        audit.minGap,
                    ),
                ),
            )
        }
    }

    /** Bitta kun zanjiri: sarlavha + qadam kataklari + qadamlar ro'yxati. */
    private fun chainCard(ctx: android.content.Context, chain: DayChain): com.google.android.material.card.MaterialCardView {
        val card = Rows.card(ctx)
        val col = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }

        col.addView(
            android.widget.TextView(ctx).apply {
                setTextAppearance(R.style.Text_Aea_Body)
                text = getString(R.string.path_day_title, chain.day.dayNumber, chain.day.titleUz) +
                    " · " + getString(R.string.path_chain_steps, chain.steps.size)
            },
        )

        // Qadam kataklari — har biri bo'limni bildiredi.
        // Rang mavzuga mos tanlanadi (`values-night` HTML ranglari `colors.xml`da
        // alohida nomlangan — `ring_track_dark`), shuning uchun tungi mavzuda
        // katak fonga erib ketmaydi.
        val dark = (ctx.resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
            android.content.res.Configuration.UI_MODE_NIGHT_YES
        val row = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
        chain.steps.forEachIndexed { i, step ->
            val st = chain.stepState(i)
            val filled = st != ChainState.LOCKED
            val cell = View(ctx).apply {
                background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dp(ctx, 6).toFloat()
                    setColor(
                        when (st) {
                            ChainState.DONE -> ctx.getColor(R.color.ok)
                            ChainState.CURRENT -> ctx.getColor(R.color.accent)
                            else -> ctx.getColor(if (dark) R.color.ring_track_dark else R.color.ring_track_light)
                        },
                    )
                    setStroke(dp(ctx, 1), ctx.getColor(if (dark) R.color.text_secondary_dark else R.color.text_secondary_light))
                }
                contentDescription = stepTitle(ctx, step)
            }
            val lp = LinearLayout.LayoutParams(dp(ctx, 18), dp(ctx, 18))
            lp.marginEnd = dp(ctx, 4)
            row.addView(cell, lp)
            Motion.fillChainCell(cell, filled, i)
        }
        col.addView(row)

        // Qadamlar ro'yxati: nom + daqiqa + holat (matn versiyasi — katakka
        // qarab rangni o'qib bo'lmaydi, screen reader uchun ham kerak).
        chain.steps.forEachIndexed { i, step ->
            val st = chain.stepState(i)
            val label = StringBuilder(stepTitle(ctx, step))
            if (step.minutes > 0) label.append(" · ").append(getString(R.string.path_chain_minutes, step.minutes))
            label.append(" · ").append(
                when (st) {
                    ChainState.DONE -> getString(R.string.path_chain_state_done)
                    ChainState.CURRENT -> getString(R.string.path_chain_state_current)
                    else -> getString(R.string.path_chain_state_locked)
                },
            )
            col.addView(Rows.small(ctx, label))
        }

        // Ketma-ketlik auditi kun kartasida EMAS — butun zanjir bo'yicha bir
        // marta chiziladi (`addChainCard` oxiri), veb `ChainOverview` bilan
        // bir xil. Shunda "bir xil tur qo'shni" soni har kun uchun 17 deb
        // takrorlanmaydi va yagona turli bo'lim (lug'at testi majburiy
        // qo'shni) alohida sanaladi.

        card.addView(col)
        Motion.stepIn(card, enter = true)
        return card
    }

    /** Bo'lim yorliqi: testda alohida so'z, aks holda bo'lim sarlavhasi. */
    private fun stepTitle(ctx: android.content.Context, step: com.dadaxon.aienglishacademy.domain.ChainStep): String =
        if (step.isTest) getString(R.string.path_chain_test)
        else step.titleUz.ifBlank { Rows.skillName(ctx, step.skill) }

    private fun dp(ctx: android.content.Context, v: Int): Int =
        (v * ctx.resources.displayMetrics.density).toInt()

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
