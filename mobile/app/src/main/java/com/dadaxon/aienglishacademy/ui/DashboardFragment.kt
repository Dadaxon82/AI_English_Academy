package com.dadaxon.aienglishacademy.ui

import android.os.Bundle
import android.os.CountDownTimer
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.DailyPlanDay
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.data.VocabularyItem
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.DayTask
import com.dadaxon.aienglishacademy.domain.buildDayTasks
import com.dadaxon.aienglishacademy.domain.computeAllocation
import com.dadaxon.aienglishacademy.domain.countDue
import com.dadaxon.aienglishacademy.domain.countLearned
import com.dadaxon.aienglishacademy.domain.evaluateLevelPromotion
import com.dadaxon.aienglishacademy.domain.GameLogic
import com.dadaxon.aienglishacademy.domain.lastNDays
import com.dadaxon.aienglishacademy.domain.nextDayId
import com.dadaxon.aienglishacademy.domain.pathLevel
import com.dadaxon.aienglishacademy.domain.planProgress
import com.dadaxon.aienglishacademy.domain.skillEvidence
import com.dadaxon.aienglishacademy.domain.streakOf
import com.dadaxon.aienglishacademy.store.AppStore
import com.dadaxon.aienglishacademy.store.StoreAction
import com.dadaxon.aienglishacademy.store.StoreState
import com.dadaxon.aienglishacademy.store.SyncStatus
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Boshqaruv paneli — veb `src/pages/Dashboard.tsx` ning mobil moslamasi.
 *
 * MANBA: veb `Dashboard.tsx` (reja halqasi, bugungi vazifalar, statistika
 * plitkalari, so'nggi 7 kun grafigi, ko'nikma balansi, daraja tavsiyasi,
 * oxirgi xatolar) + `store.tsx`.
 *
 * Barcha sonlar `AppStore` holati va domen funksiyalaridan
 * (`computeAllocation`, `buildDayTasks`, `planProgress`, `lastNDays`,
 * `skillEvidence`, `streakOf`, `evaluateLevelPromotion`) olinadi — ekranda
 * hech qanday son ixtir qilinmaydi. Kontent bo'lmasa `dash_plan_empty`
 * halol aytiladi.
 */
class DashboardFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    /** Taymer jonli ko'rsatiladi (1 s) — holat baribir store'da. */
    private var ticker: CountDownTimer? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.shellTitle.setText(R.string.app_name)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE
        val store = container().store
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                store.state.collect { render(it) }
            }
        }
    }

    private fun render(s: StoreState) {
        val ctx = requireContext()
        val c = container()
        val d = s.data
        val plannedMin = c.store.settings().dailyMinutes
        val doneSec = c.store.todaySeconds()

        Rows.clear(b.rows)
        ticker?.cancel()
        ticker = null

        // Joriy bo'lim banneri — veb `Dashboard.tsx` tepasidagi `SectionBanner`
        // bilan bir xil joy va bir xil ma'lumot (`currentSectionInfo`).
        SectionBannerUi.show(this, b.bannerBox)

        b.shellSubtitle.text = greeting() + " · " + d.settings.currentLevel +
            " — " + getString(R.string.dash_seconds_progress, doneSec / 60, plannedMin)
        b.shellMascot.setMood(
            when (s.syncStatus) {
                SyncStatus.ERROR, SyncStatus.OFFLINE -> MascotView.Mood.SAD
                else -> if (c.store.streakValue() > 0) MascotView.Mood.CHEER else MascotView.Mood.HAPPY
            },
        )

        /* 1) Reja halqasi va mashq taymeri */
        val ring = ProgressRingView(ctx)
        ring.setProgress(doneSec, plannedMin * 60)
        ring.layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply {
            topMargin = Rows.dp(ctx, 12)
            gravity = android.view.Gravity.CENTER_HORIZONTAL
        }
        b.rows.addView(ring)
        addTimerCard(doneSec, plannedMin)

        /* 2) Statistika plitkalari */
        val srs = d.srs.values.toList()
        b.rows.addView(
            Rows.statRow(
                ctx,
                Rows.statTile(ctx, d.xp.toString(), getString(R.string.dash_stat_xp), getString(R.string.dash_stat_xp_hint)),
                Rows.statTile(ctx, streakOf(d).toString(), getString(R.string.dash_stat_streak), getString(R.string.dash_stat_streak_hint)),
                Rows.statTile(ctx, countLearned(srs).toString(), getString(R.string.dash_stat_words), getString(R.string.dash_stat_words_hint)),
                Rows.statTile(ctx, countDue(srs).toString(), getString(R.string.dash_stat_due), getString(R.string.dash_stat_due_none)),
            ),
        )

        /* 2a) «5 daqiqa» tezkor sessiya — veb `Dashboard.tsx` kartasi. */
        addQuickCard(countDue(srs))
        b.rows.addView(
            Rows.row(ctx, getString(R.string.dlg_dash_title), getString(R.string.dlg_dash_body), null) {
                findNavController().navigate(R.id.dialoguesFragment)
            },
        )
        b.rows.addView(
            Rows.row(ctx, getString(R.string.com_title), getString(R.string.com_dash_body), null) {
                findNavController().navigate(R.id.communityFragment)
            },
        )
        b.rows.addView(
            Rows.row(ctx, getString(R.string.conv_title), getString(R.string.conv_dash_body), null) {
                findNavController().navigate(R.id.conversationFragment)
            },
        )
        b.rows.addView(
            Rows.row(ctx, getString(R.string.pron_title), getString(R.string.pron_dash_body), null) {
                findNavController().navigate(R.id.pronunciationFragment)
            },
        )

        /* 2b) O'yin qatlami plitkalari — veb `Dashboard.tsx`dagi ikkinchi
               qatorning moslamasi (yurak / kunlik XP / gem / qalqon).
               Sonlar `GameLogic.heartsView` va `goalView`dan olinadi,
               sozlamada yuraklar o'chirilgan bo'lsa plitka halol "öçiq"
               deyadi — son ixtir qilinmaydi. */
        val now = System.currentTimeMillis()
        val hearts = GameLogic.heartsView(d, now)
        val goal = GameLogic.goalView(d)
        val quests = GameLogic.questView(d)
        val questsDone = quests.count { it.done }
        b.rows.addView(
            Rows.statRow(
                ctx,
                Rows.statTile(
                    ctx,
                    if (hearts.enabled) "${hearts.count}/${hearts.max}" else getString(R.string.dash_hearts_short_off),                    getString(R.string.dash_stat_hearts),
                    when {
                        !hearts.enabled -> getString(R.string.dash_hearts_off)
                        hearts.blocked -> getString(R.string.dash_hearts_blocked, hearts.practiceNeeded)
                        hearts.minutesLeft > 0 -> getString(R.string.dash_hearts_next, hearts.minutesLeft)
                        else -> getString(R.string.dash_hearts_full)
                    },
                ),
                Rows.statTile(
                    ctx,
                    "${goal.value}/${goal.target}",
                    getString(R.string.dash_stat_goal),
                    if (goal.reached) getString(R.string.dash_goal_done) else getString(R.string.dash_goal_left, goal.left),
                ),
                Rows.statTile(
                    ctx,
                    d.game.gems.toString(),
                    getString(R.string.dash_stat_gems),
                    getString(R.string.dash_quests_done, questsDone, quests.size),
                ),
                Rows.statTile(
                    ctx,
                    d.game.freezes.toString(),
                    getString(R.string.dash_stat_freezes),
                    getString(R.string.dash_freezes_hint),
                ),
            ),
        )

        /* 2c) Bugungi questlar — kun kaliti bilan tanlangan 3 tasi
               (`GameLogic.questsForDay`), holat `questView`dan. Vebda ham
               shu 3 quest chiziladi: kun kaliti bir xil bo'lgani uchun
               ikkala qurilmada ro'yxat ham, tartib ham bir xil. */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.dash_quests_title)))
        for (q in quests) {
            val mark = if (q.claimed) getString(R.string.dash_quest_claimed)
            else if (q.done) getString(R.string.dash_quest_reward) else null
            b.rows.addView(
                Rows.row(ctx, getString(R.string.dash_quest_row, q.quest.titleUz, q.value, q.target), null, mark),
            )
            // Vebdagidek progress chizig'i — foiz ixtir qilinmaydi, `value`
            // `target`ga bo'linadi (`GameLogic.questProgressOf` sonlari).
            b.rows.addView(
                com.google.android.material.progressindicator.LinearProgressIndicator(ctx).apply {
                    setProgressCompat(
                        if (q.target <= 0) 100 else (100.0 * q.value / q.target).toInt().coerceIn(0, 100),
                        true,
                    )
                    trackThickness = Rows.dp(ctx, 6)
                    layoutParams = LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                    )
                },
            )
        }
        b.rows.addView(Rows.small(ctx, getString(R.string.dash_quests_total, d.game.questsTotal)))

        /* 3) Bugungi vazifalar */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.dash_plan_title)))
        addPlanCard()

        /* 4) So'nggi 7 kun */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.dash_week_title)))
        b.rows.addView(Rows.weekBar(ctx, lastNDays(d, 7)))

        /* 5) Ko'nikmalar balansi (dalil soni va ishonch bilan) */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.dash_skills_title)))
        for (e in skillEvidence(d)) {
            b.rows.addView(Rows.skillBar(ctx, e.skill, e.score.toInt(), e.evidenceCount, e.confidence))
        }

        /* 6) Daraja tavsiyasi — domain qoidasi (4 ko'nikma >= 72 ball) */
        val promo = evaluateLevelPromotion(d.settings.currentLevel, skillEvidence(d))
        if (promo.recommendedLevel != null) addLevelUpCard(promo.reasonUz, promo.recommendedLevel)

        /* 7) Oxirgi xatolar */
        addErrorsTeaser()

        /* 8) Sinxron holati (so'nggi qator — halol ko'rsatkich) */
        b.rows.addView(
            Rows.small(
                ctx,
                syncText(s) + " · " + getString(R.string.settings_queue_size, c.store.queueSize()),
            ),
        )
    }

    private fun syncText(s: StoreState): String = when (s.syncStatus) {
        SyncStatus.GUEST -> getString(R.string.sync_guest)
        SyncStatus.IDLE -> getString(R.string.sync_idle)
        SyncStatus.SYNCING -> getString(R.string.sync_busy)
        SyncStatus.OFFLINE -> getString(R.string.sync_offline)
        SyncStatus.ERROR -> s.lastSyncMessage ?: getString(R.string.sync_error)
    }

    /** Veb: soat bo'yicha salomlashish. */
    private fun greeting(): String {
        val hour = java.time.LocalTime.now().hour
        return getString(
            when {
                hour < 12 -> R.string.dash_greeting_good_morning
                hour < 18 -> R.string.dash_greeting_good_day
                else -> R.string.dash_greeting_good_evening
            },
        )
    }

    /* ------------------------ «5 daqiqa» kartasi ----------------------- */

    private fun addQuickCard(due: Int) {
        val ctx = requireContext()
        val card = Rows.card(ctx)
        val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        box.addView(Rows.sectionTitle(ctx, "⚡ " + getString(R.string.quick_dash_title)))
        box.addView(
            Rows.small(
                ctx,
                if (due > 0) getString(R.string.quick_dash_body, due) else getString(R.string.quick_dash_body_empty),
            ),
        )
        box.addView(
            Rows.primaryButton(ctx, getString(R.string.quick_dash_start)).apply {
                setOnClickListener { findNavController().navigate(R.id.quickSessionFragment) }
            },
        )
        card.addView(box)
        b.rows.addView(card)
    }

    /* ---------------------------- taymer kartasi ----------------------- */

    private fun addTimerCard(doneSec: Int, plannedMin: Int) {
        val ctx = requireContext()
        val store = container().store
        val card = Rows.card(ctx)
        val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }

        box.addView(Rows.sectionTitle(ctx, getString(R.string.dash_timer_title)))
        val value = android.widget.TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Number)
            text = AppStore.formatDuration(doneSec)
        }
        box.addView(value)

        val pp = planProgress(doneSec.toLong(), plannedMin)
        box.addView(
            Rows.small(
                ctx,
                getString(R.string.dash_seconds_progress, pp.doneMin, plannedMin) +
                    " · " + getString(R.string.dash_task_minutes, pp.leftMin),
            ),
        )

        val timer = store.state.value.timer
        val running = timer.startedAtRealtime != null
        if (running) box.addView(Rows.small(ctx, getString(R.string.dash_timer_resumed)))
        else if (timer.elapsedSec > 0) box.addView(Rows.small(ctx, getString(R.string.dash_timer_paused, AppStore.formatDuration(timer.elapsedSec))))

        val row = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
        val start = Rows.primaryButton(ctx, getString(R.string.dash_timer_start))
        start.isEnabled = !running
        // Taymer ko'nikma vaqtini yig'adi — vebda har bo'lim o'z skill'i bilan
        // ochiladi; panel umumiy "o'qish" sessiyasini boshlaydi (halol: tugma
        // ostida ko'rsatilgan).
        start.setOnClickListener {
            store.dispatch(StoreAction.TimerStart(UUID.randomUUID().toString(), Skills.READING))
        }
        val pause = Rows.button(ctx, getString(R.string.dash_timer_pause))
        pause.isEnabled = running
        pause.setOnClickListener { store.dispatch(StoreAction.TimerPause) }
        val stop = Rows.button(ctx, getString(R.string.dash_timer_stop))
        stop.isEnabled = true
        stop.setOnClickListener { store.dispatch(StoreAction.TimerStop) }
        for (btn in listOf(start, pause, stop)) {
            row.addView(btn)
        }
        box.addView(row)
        card.addView(box)
        b.rows.addView(card)

        if (running) {
            // Faqat taymer yurganda sikl — bosh holatda bo'sh qayta chizish yo'q.
            ticker = object : CountDownTimer(10 * 60 * 1000L, 1000L) {
                override fun onTick(ignored: Long) {
                    if (_b == null) return
                    value.text = AppStore.formatDuration(container().store.timerSeconds())
                }

                override fun onFinish() {
                    if (_b != null) render(container().store.state.value)
                }
            }.start()
        }
    }

    /* -------------------------- kun rejasi kartasi --------------------- */

    private fun addPlanCard() {
        val ctx = requireContext()
        val c = container()
        val d = c.store.state.value.data
        // O'quv yo'li darajasi (veb `pathLevel` bilan bir xil): A1 tugasa yoki A2.1 ga
        // sakralsa — A2 kunlari. Baholangan daraja (`currentLevel`) o'zgarmaydi.
        val level = pathLevel(d.path, d.settings.currentLevel) { lvl -> runCatching { c.content.bundle(lvl).days }.getOrDefault(emptyList()) }
        val bundle = runCatching { c.content.bundle(level) }.getOrNull()
        val days = bundle?.days ?: emptyList()

        val card = Rows.card(ctx)
        val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }

        // `bundle` null bo'lsa — kontent ochilmagan; kunlar ham yo'q.
        if (bundle == null || days.isEmpty()) {
            box.addView(Rows.body(ctx, getString(R.string.dash_plan_empty)))
            card.addView(box)
            b.rows.addView(card)
            return
        }

        box.addView(Rows.small(ctx, getString(R.string.path_summary, d.path.completedCount(), days.size)))

        val dayId = nextDayId(level, days.map { it.id }, d.path.completedDays)
        val day: DailyPlanDay? = days.firstOrNull { it.id == dayId }
        if (day == null) {
            box.addView(Rows.body(ctx, getString(R.string.dash_plan_all_done)))
            card.addView(box)
            b.rows.addView(card)
            return
        }

        box.addView(Rows.body(ctx, getString(R.string.path_day_title, day.dayNumber, day.titleUz)))
        if (day.goalUz.isNotBlank()) box.addView(Rows.small(ctx, getString(R.string.path_goal, day.goalUz)))
        box.addView(Rows.small(ctx, getString(R.string.path_current)))

        val alloc = computeAllocation(c.store.settings(), skillEvidence(d))
        val done = d.path.completedDays.contains(day.id)
        val tasks: List<DayTask> = buildDayTasks(day, alloc, if (done) Skills.PLAN_ORDER.associateWith { day.id } else emptyMap())

        for (t in tasks) {
            val ids = exerciseIdsFor(bundle, day, t.skill)
            val written = t.skill == Skills.WRITING || t.skill == Skills.SPEAKING
            val sub = if (written) {
                getString(R.string.path_section_minutes, Rows.skillName(ctx, t.skill), t.minutes)
            } else {
                getString(R.string.path_section_minutes, Rows.skillName(ctx, t.skill), t.minutes) + " · " + ids.size
            }
            box.addView(
                Rows.row(
                    ctx,
                    t.titleUz,
                    sub,
                    if (t.done) getString(R.string.dash_task_done) else getString(R.string.dash_task_planned),
                    enabled = written || ids.isNotEmpty(),
                    onClick = {
                        when {
                            // Grammatika / O'qish / Tinglash / Yozish / Gapirish —
                            // o'z ekranida ochiladi (veb: `SKILL_ROUTE`). Audio,
                            // o'qish matni va nazariya o'sha yerda; mashq pleyeriga
                            // o'sha ekrandan o'tiladi.
                            t.skill == Skills.WRITING -> openSkillScreen(R.id.writingFragment, day, t.skill, t.titleUz)
                            t.skill == Skills.SPEAKING -> openSkillScreen(R.id.speakingFragment, day, t.skill, t.titleUz)
                            t.skill == Skills.GRAMMAR -> openSkillScreen(R.id.grammarTopicFragment, day, t.skill, t.titleUz)
                            t.skill == Skills.READING -> openSkillScreen(R.id.readingFragment, day, t.skill, t.titleUz)
                            t.skill == Skills.LISTENING -> openSkillScreen(R.id.listeningFragment, day, t.skill, t.titleUz)
                            ids.isEmpty() -> {}
                            // Lug'at savollari pleyerda `vocabQuizExercise` bilan
                            // quriladi — bevosita pleyer ochiladi.
                            else -> Nav.openExercises(this, ids, day.id, day.id, Source.PRACTICE, t.titleUz)
                        }
                    },
                ),
            )
        }

        // Bo'lim testi — kun yakunida (veb: `DaySection` ichida `sectionTest`
        // obyekt sifatida berilgan).
        val test = day.sectionTest
        if (test != null) {
            val testIds = test.exercises.map { it.id }
            if (testIds.isNotEmpty()) {
                box.addView(
                    Rows.row(
                        ctx,
                        getString(R.string.path_open_test) + " — " + test.titleUz,
                        getString(R.string.path_test_pass, test.passScore),
                        d.path.passedTests[test.id]?.toString(),
                        onClick = { Nav.openExercises(this, testIds, test.id, day.id, Source.SECTION_TEST, test.titleUz) },
                    ),
                )
            }
        }

        card.addView(box)
        b.rows.addView(card)
    }

    /**
     * Kun bo'limi `itemIds`idan mashq id'larini yig'adi.
     * MANBA: veb `planning.ts` bo'limlari — lug'at bo'limi savollari
     * `vocabQuizExercise` bilan qayta quriladi, grammatika/o'qish/tinglash
     * topshiriqlarining `exercises` ro'yxati olinadi.
     */
    private fun exerciseIdsFor(bundle: com.dadaxon.aienglishacademy.data.LevelBundle, day: DailyPlanDay, skill: String): List<String> {
        val cr = container().content
        val sec = day.sections.firstOrNull { it.skill == skill } ?: return emptyList()
        val out = ArrayList<String>()
        for (id in sec.itemIds) {
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

    /** Lug'at testiga 4 ta variant: to'g'ri ma'no + 3 ta boshqa so'z. */
    private fun quizOptions(v: VocabularyItem, pool: List<VocabularyItem>): List<String> {
        val rnd = java.util.Random(v.id.hashCode().toLong())
        val others = pool
            .filter { it.id != v.id && it.translationUz != v.translationUz }
            .shuffled(rnd)
            .take(3)
            .map { it.translationUz }
        return (listOf(v.translationUz) + others).shuffled(rnd)
    }

    /* ------------------------ daraja tavsiyasi kartasi ----------------- */

    private fun addLevelUpCard(reasonUz: String, recommended: String) {
        val ctx = requireContext()
        val card = Rows.card(ctx)
        val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        box.addView(Rows.sectionTitle(ctx, getString(R.string.dash_levelup_title)))
        box.addView(Rows.body(ctx, reasonUz))
        box.addView(
            // Format `%1$s` — tavsiya etilgan daraja. Argument bersak tugma
            // matnida "%1$s" so'zi ko'rinib qoladi (`getString(id)` formatlamaydi).
            Rows.primaryButton(ctx, getString(R.string.dash_levelup_action, recommended)).apply {
                setOnClickListener { container().store.dispatch(StoreAction.LevelSet(recommended)) }
            },
        )
        box.addView(
            Rows.button(ctx, getString(R.string.dash_levelup_ignore)).apply {
                setOnClickListener { findNavController().navigate(R.id.progressFragment) }
            },
        )
        card.addView(box)
        b.rows.addView(card)
    }

    /* --------------------------- xatolar teaseri ----------------------- */

    private fun addErrorsTeaser() {
        val ctx = requireContext()
        val store = container().store
        val attempts = store.attempts()
        val wrong = attempts.filter { !it.correct }.takeLast(3).asReversed()
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.dash_errors_title)))
        if (wrong.isEmpty()) {
            b.rows.addView(
                Rows.small(
                    ctx,
                    getString(
                        if (attempts.isEmpty()) R.string.dash_errors_empty_no_attempts
                        else R.string.dash_errors_empty_none,
                    ),
                ),
            )
            return
        }
        for (a in wrong) {
            val ex = container().content.findExercise(a.exerciseId)
            val main = ex?.instructionUz?.take(90)?.ifBlank { null } ?: a.exerciseId
            boxRowError(a.exerciseId, main, Rows.skillName(ctx, a.skill) + " · " + a.level)
        }
        b.rows.addView(
            Rows.button(ctx, getString(R.string.dash_all_errors)).apply {
                setOnClickListener { Nav.open(this@DashboardFragment, R.id.errorLogFragment, "", getString(R.string.errlog_title)) }
            },
        )
    }

    private fun boxRowError(exerciseId: String, main: String, sub: String) {
        b.rows.addView(
            Rows.row(
                requireContext(), main, sub, null,
                onClick = {
                    Nav.openExercises(
                        this, listOf(exerciseId), null, null,
                        Source.PRACTICE, getString(R.string.errlog_retry),
                    )
                },
            ),
        )
    }

    /**
     * Bo'limni o'z ekranida ochadi (grammatika, o'qish, tinglash, yozish,
     * gapirish — veb `LearningPath.tsx::SKILL_ROUTE`): bo'limning birinchi
     * topshiriq id'si `Nav.ARG_ID` bilan beriladi (id bo'lmasa ekran barcha
     * topshiriqlar ro'yxatini ko'rsatadi).
     */
    private fun openSkillScreen(destId: Int, day: com.dadaxon.aienglishacademy.data.DailyPlanDay, skill: String, title: String) {
        val id = day.sections.firstOrNull { it.skill == skill }?.itemIds?.firstOrNull() ?: ""
        Nav.open(this, destId, id, title)
    }

    /** `AppData.path.completedDays` soni (holatdagi ro'yxat). */
    private fun com.dadaxon.aienglishacademy.data.LearningPath.completedCount(): Int = completedDays.size

    override fun onDestroyView() {
        super.onDestroyView()
        ticker?.cancel()
        ticker = null
        _b = null
    }
}
