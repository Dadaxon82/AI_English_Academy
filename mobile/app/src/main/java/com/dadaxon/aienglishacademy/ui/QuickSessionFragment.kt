package com.dadaxon.aienglishacademy.ui

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.CountDownTimer
import android.speech.tts.TextToSpeech
import android.util.TypedValue
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.VocabEmoji
import com.dadaxon.aienglishacademy.data.VocabularyItem
import com.dadaxon.aienglishacademy.data.todayKey
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.QuickSession
import com.dadaxon.aienglishacademy.domain.SrsGrade
import com.dadaxon.aienglishacademy.store.AppStore
import com.dadaxon.aienglishacademy.store.StoreAction
import com.dadaxon.aienglishacademy.store.StoreState
import com.google.android.material.progressindicator.LinearProgressIndicator
import kotlinx.coroutines.launch
import java.util.Locale

/**
 * «5 daqiqa» — tezkor kunlik sessiya.
 *
 * MANBA: veb `src/pages/QuickSession.tsx` — bosqichlar, matnlar va qoidalar
 * BIR XIL; navbat `domain/QuickSession.kt::buildDeck` (veb `buildQuickDeck`).
 *
 * Bosqich ekrandagi holatdan HOSIL qilinadi (veb bilan bir xil):
 *  - taymer shu sessiyaniki (`quick-<kun>`), navbat hali tuzilmagan → «davom etish»;
 *  - taymer shu sessiyaniki, navbat bor → ish holati;
 *  - taymer to'xtagan, sessiya shu ekranda boshlangan → natija;
 *  - aks holda → kirish.
 *
 * Vaqt mavjud store taymeri bilan (`StoreAction.TimerStart/Pause/Stop`)
 * o'lchanadi — ilova yopilsa ham saqlanadi. Ekran ko'rinmay qolsa (`onPause`)
 * taymer PAUZA qilinadi: ko'rilmagan vaqt sanalmaydi. Vaqt yoki kartalar
 * tugasa taymer to'xtaydi va haqiqiy sekundlar kunlik faollikka yoziladi.
 *
 * Ekrandagi holat FAQAT interfeys holati (navbat snapshot'i, o'rin, burilish,
 * shu seans hisobi) — `UI_KONTRAKTI.md`dagi ruxsat etilgan istisno.
 */
class QuickSessionFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    private data class LogEntry(val word: String, val grade: SrsGrade, val isNew: Boolean)

    /** Navbat snapshot'i (null — hali tuzilmagan). */
    private var queue: MutableList<QuickSession.Card>? = null
    private var pos = 0
    private var flipped = false
    /** Immersion rejimida joriy kartaning tarjimasi ochildimi. */
    private var revealUz = false
    private var startedHere = false
    private val log = ArrayList<LogEntry>()

    private var ticker: CountDownTimer? = null
    private var timerText: TextView? = null
    private var progress: LinearProgressIndicator? = null

    private var tts: TextToSpeech? = null
    private var ttsReady = false

    private val sid: String get() = QuickSession.sessionId(todayKey())

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.shellTitle.setText(R.string.quick_title)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE
        initTts()
        val store = container().store
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                store.state.collect { render(it) }
            }
        }
    }

    /** Ekran ko'rinmay qolsa — taymer pauzaga (ko'rilmagan vaqt sanalmaydi). */
    override fun onPause() {
        super.onPause()
        val store = container().store
        val t = store.state.value.timer
        if (t.sessionId == sid && t.startedAtRealtime != null) store.dispatch(StoreAction.TimerPause)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        ticker?.cancel()
        ticker = null
        timerText = null
        progress = null
        runCatching { tts?.stop() }
        runCatching { tts?.shutdown() }
        tts = null
        ttsReady = false
        _b = null
    }

    /* ------------------------------ holat ------------------------------ */

    private enum class Phase { INTRO, RESUME, RUN, DONE }

    private fun mine(s: StoreState) = s.timer.sessionId == sid
    private fun running(s: StoreState) = mine(s) && s.timer.startedAtRealtime != null
    private fun elapsed(s: StoreState) = if (mine(s)) container().store.timerSeconds(s.timer) else 0

    private fun phaseOf(s: StoreState): Phase = when {
        mine(s) -> if (queue == null) Phase.RESUME else Phase.RUN
        startedHere -> Phase.DONE
        else -> Phase.INTRO
    }

    /** Takror havuzi — Lug'at bilan bir xil (asosiy + glossariy); yangi so'zlar — asosiydan. */
    private fun pools(level: String): Pair<List<VocabularyItem>, List<VocabularyItem>> {
        val cr = container().content
        val main = runCatching { cr.bundle(level).vocab }.getOrElse { emptyList() }
        val base = if (main.isNotEmpty()) main else runCatching { cr.allVocab() }.getOrElse { emptyList() }
        val gloss = runCatching { cr.allGlossaryVocab() }.getOrElse { emptyList() }.filter { it.level == level }
        return Pair(base + gloss, base)
    }

    private fun deckNow(s: StoreState): QuickSession.Deck {
        val (pool, main) = pools(s.data.settings.currentLevel)
        return QuickSession.buildDeck(pool, s.data.srs, System.currentTimeMillis(), newPool = main)
    }

    /* ------------------------------ amallar ----------------------------- */

    /** Foydalanish o'lchovi: sessiya tabiiy yakunlandi (bir marta). */
    private var doneTracked = false

    private fun trackDone() {
        if (doneTracked || !startedHere) return
        doneTracked = true
        UsageTracker.track(requireContext(), "quick", started = false)
    }

    private fun begin(fresh: Boolean) {
        if (fresh) {
            doneTracked = false
            UsageTracker.track(requireContext(), "quick", started = true)
        }
        val store = container().store
        queue = deckNow(store.state.value).cards.toMutableList()
        pos = 0
        flipped = false
        if (fresh) log.clear()
        startedHere = true
        store.dispatch(StoreAction.TimerStart(sid, Skills.VOCABULARY))
    }

    private fun stop() {
        val store = container().store
        if (mine(store.state.value)) store.dispatch(StoreAction.TimerStop) else render(store.state.value)
    }

    private fun grade(g: SrsGrade) {
        val store = container().store
        val q = queue ?: return
        val card = q.getOrNull(pos) ?: return
        if (!running(store.state.value)) return
        log.add(LogEntry(card.item.word, g, card.isNew))
        // «Yana» — karta navbat oxiriga qaytadi (sessiya ichida mustahkamlanadi).
        if (g == SrsGrade.AGAIN) q.add(QuickSession.Card(card.item, false))
        pos += 1
        flipped = false
        revealUz = false
        b.shellMascot.setMood(if (g == SrsGrade.GOOD) MascotView.Mood.HAPPY else MascotView.Mood.NEUTRAL)
        if (g == SrsGrade.GOOD) Motion.pop(b.shellMascot)
        // Dispatch oxirida: store yangi holatni chiqaradi va ekran qayta chiziladi.
        store.dispatch(StoreAction.Srs(card.item.id, g))
    }

    /* ------------------------------ render ------------------------------ */

    private fun render(s: StoreState) {
        if (_b == null) return
        ticker?.cancel()
        ticker = null
        timerText = null
        progress = null
        Rows.clear(b.rows)

        when (phaseOf(s)) {
            Phase.INTRO -> renderIntro(s)
            Phase.RESUME -> renderResume(s)
            Phase.RUN -> renderRun(s)
            Phase.DONE -> renderDone()
        }
    }

    private fun renderIntro(s: StoreState) {
        val ctx = requireContext()
        val deck = deckNow(s)
        b.shellSubtitle.setText(R.string.quick_dash_title)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.rows.addView(Rows.body(ctx, getString(R.string.quick_intro)))
        b.rows.addView(Rows.small(ctx, getString(R.string.quick_counts, deck.dueCount, deck.newCount, s.data.settings.currentLevel)))
        deck.newTopic?.let { b.rows.addView(Rows.small(ctx, getString(R.string.quick_topic, it))) }
        b.rows.addView(Rows.small(ctx, getString(R.string.quick_note, s.data.settings.dailyMinutes)))
        if (deck.cards.isEmpty()) {
            b.shellMascot.setMood(MascotView.Mood.SAD)
            b.rows.addView(Rows.empty(ctx, getString(R.string.quick_empty)))
            b.rows.addView(
                Rows.button(ctx, getString(R.string.nav_vocab)).apply {
                    setOnClickListener { findNavController().navigate(R.id.vocabularyFragment) }
                },
            )
            return
        }
        b.rows.addView(
            Rows.primaryButton(ctx, getString(R.string.quick_start, AppStore.formatDuration(QuickSession.SESSION_SEC))).apply {
                setOnClickListener { begin(true) }
            },
        )
    }

    private fun renderResume(s: StoreState) {
        val ctx = requireContext()
        val left = QuickSession.remaining(elapsed(s))
        b.shellSubtitle.setText(R.string.quick_resume_title)
        b.shellMascot.setMood(MascotView.Mood.NEUTRAL)
        b.rows.addView(Rows.body(ctx, getString(R.string.quick_resume_body, AppStore.formatDuration(left))))
        b.rows.addView(
            Rows.primaryButton(ctx, getString(R.string.quick_resume)).apply {
                isEnabled = left > 0
                setOnClickListener { begin(false) }
            },
        )
        b.rows.addView(Rows.button(ctx, getString(R.string.quick_finish)).apply { setOnClickListener { stop() } })
    }

    private fun renderRun(s: StoreState) {
        val ctx = requireContext()
        val q = queue ?: return
        val left = QuickSession.remaining(elapsed(s))
        val card = q.getOrNull(pos)
        // Vaqt yoki kartalar tugadi — taymer to'xtatiladi (natija keyingi render'da).
        if (card == null || left <= 0) {
            b.root.post { trackDone(); stop() }
            return
        }
        val isRunning = running(s)
        b.shellSubtitle.text = getString(R.string.ex_index, pos + 1, q.size)

        /* Vaqt va chiziq */
        val time = TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Number)
            text = AppStore.formatDuration(left)
            contentDescription = getString(R.string.quick_time_left, AppStore.formatDuration(left))
        }
        b.rows.addView(time)
        timerText = time
        val bar = LinearProgressIndicator(ctx).apply {
            max = QuickSession.SESSION_SEC
            this.progress = QuickSession.SESSION_SEC - left
            trackThickness = Rows.dp(ctx, 6)
            contentDescription = getString(R.string.quick_time_left, AppStore.formatDuration(left))
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
                .apply { topMargin = Rows.dp(ctx, 4) }
        }
        b.rows.addView(bar)
        progress = bar

        if (!isRunning) {
            b.rows.addView(Rows.small(ctx, getString(R.string.quick_paused)))
            b.rows.addView(
                Rows.primaryButton(ctx, getString(R.string.quick_resume)).apply {
                    setOnClickListener { container().store.dispatch(StoreAction.TimerStart(sid, Skills.VOCABULARY)) }
                },
            )
            b.rows.addView(Rows.button(ctx, getString(R.string.quick_finish)).apply { setOnClickListener { stop() } })
        }

        /* Karta */
        b.rows.addView(
            Rows.small(
                ctx,
                (if (card.isNew) getString(R.string.quick_badge_new) else getString(R.string.quick_badge_review)) +
                    (card.item.topic.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""),
            ),
        )
        val cardView = Rows.card(ctx)
        val box = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            minimumHeight = resources.getDimensionPixelSize(R.dimen.mascot_hero)
            setPadding(0, Rows.dp(ctx, 12), 0, Rows.dp(ctx, 12))
        }
        VocabEmoji.of(card.item.word)?.let { e ->
            box.addView(
                TextView(ctx).apply {
                    text = e
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 56f)
                    gravity = Gravity.CENTER
                    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
                },
            )
        }
        box.addView(centered(ctx, card.item.word, R.style.Text_Aea_Number))
        card.item.ipa?.takeIf { it.isNotBlank() }?.let { box.addView(centered(ctx, it, R.style.Text_Aea_Small)) }
        if (flipped) {
            if (DevicePrefs.immersion(ctx) && !revealUz) box.addView(centered(ctx, card.item.explanationEn, R.style.Text_Aea_Small))
            else box.addView(centered(ctx, card.item.translationUz, R.style.Text_Aea_Section))
            card.item.exampleEn.takeIf { it.isNotBlank() }?.let {
                box.addView(centered(ctx, getString(R.string.vocab_example, it), R.style.Text_Aea_Small))
            }
        } else {
            box.addView(centered(ctx, getString(R.string.quick_flip), R.style.Text_Aea_Small))
        }
        cardView.addView(box)
        cardView.isEnabled = isRunning
        cardView.contentDescription = card.item.word + " — " + getString(R.string.quick_flip)
        cardView.setOnClickListener {
            flipped = !flipped
            render(container().store.state.value)
        }
        attachSwipe(cardView)
        b.rows.addView(cardView)
        Motion.stepIn(cardView)

        if (flipped && DevicePrefs.immersion(ctx) && !revealUz) {
            b.rows.addView(
                Rows.button(ctx, getString(R.string.imm_reveal)).apply {
                    setOnClickListener {
                        revealUz = true
                        render(container().store.state.value)
                    }
                },
            )
        }
        b.rows.addView(Rows.small(ctx, getString(R.string.quick_swipe_hint)))
        b.rows.addView(
            Rows.button(ctx, getString(R.string.vocab_speak)).apply {
                setOnClickListener { speak(card.item) }
            },
        )

        val row = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
        val again = Rows.button(ctx, getString(R.string.quick_again)).apply {
            isEnabled = isRunning
            setOnClickListener { grade(SrsGrade.AGAIN) }
        }
        val good = Rows.primaryButton(ctx, getString(R.string.quick_good)).apply {
            isEnabled = isRunning
            setOnClickListener { grade(SrsGrade.GOOD) }
        }
        for ((i, btn) in listOf(again, good).withIndex()) {
            btn.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                topMargin = Rows.dp(ctx, 8)
                if (i == 0) marginEnd = Rows.dp(ctx, 8)
            }
            row.addView(btn)
        }
        b.rows.addView(row)

        if (isRunning) startTicker()
    }

    private fun renderDone() {
        val ctx = requireContext()
        val known = log.count { it.grade == SrsGrade.GOOD }
        val again = log.size - known
        val fresh = log.count { it.isNew && it.grade == SrsGrade.GOOD }
        b.shellSubtitle.setText(R.string.quick_done_title)
        b.shellMascot.setMood(if (log.isEmpty()) MascotView.Mood.NEUTRAL else MascotView.Mood.CHEER)
        if (log.isNotEmpty()) Motion.pop(b.shellMascot)
        b.rows.addView(
            Rows.body(
                ctx,
                if (log.isEmpty()) getString(R.string.quick_done_none)
                else getString(R.string.quick_done_summary, log.size, known, again, fresh),
            ),
        )
        b.rows.addView(Rows.small(ctx, getString(R.string.quick_streak, container().store.streakValue())))
        if (log.isNotEmpty()) {
            b.rows.addView(Rows.small(ctx, log.joinToString(" · ") { (if (it.grade == SrsGrade.GOOD) "✓ " else "↺ ") + it.word }))
        }
        val hasCards = deckNow(container().store.state.value).cards.isNotEmpty()
        b.rows.addView(
            Rows.primaryButton(ctx, getString(R.string.quick_more)).apply {
                isEnabled = hasCards
                setOnClickListener { begin(true) }
            },
        )
        b.rows.addView(
            Rows.button(ctx, getString(R.string.quick_home)).apply {
                setOnClickListener { findNavController().navigate(R.id.dashboardFragment) }
            },
        )
    }

    private fun centered(ctx: android.content.Context, value: CharSequence, style: Int) = TextView(ctx).apply {
        setTextAppearance(style)
        text = value
        gravity = Gravity.CENTER
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            .apply { topMargin = Rows.dp(ctx, 4) }
    }

    /** Har soniyada faqat vaqt matni va chiziq yangilanadi (butun ekran emas). */
    private fun startTicker() {
        ticker = object : CountDownTimer(QuickSession.SESSION_SEC * 1000L + 2000L, 1000L) {
            override fun onTick(ignored: Long) {
                if (_b == null) return
                val s = container().store.state.value
                val left = QuickSession.remaining(elapsed(s))
                timerText?.text = AppStore.formatDuration(left)
                progress?.progress = QuickSession.SESSION_SEC - left
                if (left <= 0) {
                    cancel()
                    trackDone()
                    stop()
                }
            }

            override fun onFinish() {
                if (_b != null) render(container().store.state.value)
            }
        }.start()
    }

    /* ------------------------------ surish ------------------------------ */

    /**
     * Surish: karta barmoq bilan siljiydi; qo'yib yuborilganda chegaradan
     * o'tgan bo'lsa baholanadi (`QuickSession.swipeGrade`), aks holda joyiga
     * qaytadi. Kichik siljish — oddiy bosish (kartani ochish). Har harakatning
     * tugma muqobili bor (TalkBack foydalanuvchilari uchun ham).
     */
    @SuppressLint("ClickableViewAccessibility")
    private fun attachSwipe(v: View) {
        val slop = ViewConfiguration.get(v.context).scaledTouchSlop
        val minPx = Rows.dp(v.context, QuickSession.SWIPE_MIN_DP).toFloat()
        var downX = 0f
        var dragging = false
        v.setOnTouchListener { view, e ->
            if (!view.isEnabled) return@setOnTouchListener false
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = e.rawX
                    dragging = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - downX
                    if (!dragging && Math.abs(dx) > slop) {
                        dragging = true
                        view.parent?.requestDisallowInterceptTouchEvent(true)
                    }
                    if (dragging) {
                        view.translationX = dx
                        view.rotation = dx / 30f
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    val dx = e.rawX - downX
                    if (!dragging) {
                        view.performClick()
                    } else {
                        val g = QuickSession.swipeGrade(dx, view.width.toFloat(), minPx)
                        if (g != null) grade(g) else settle(view)
                    }
                    dragging = false
                    true
                }
                MotionEvent.ACTION_CANCEL -> {
                    dragging = false
                    settle(view)
                    true
                }
                else -> false
            }
        }
    }

    private fun settle(view: View) {
        if (Motion.enabled(view.context)) {
            view.animate().translationX(0f).rotation(0f).setDuration(Motion.spec(view.context).pressMs).start()
        } else {
            view.translationX = 0f
            view.rotation = 0f
        }
    }

    /* ------------------------------ talaffuz ---------------------------- */

    private fun initTts() {
        if (tts != null) return
        tts = TextToSpeech(requireContext().applicationContext) { status -> ttsReady = status == TextToSpeech.SUCCESS }
    }

    /** TTS bo'lmasa `vocab_tts_missing` halol aytiladi (ovoz ixtiro qilinmaydi). */
    private fun speak(v: VocabularyItem) {
        val engine = tts
        val langOk = engine != null && ttsReady && runCatching { engine.setLanguage(Locale.ENGLISH) }.getOrNull().let {
            it != null && it != TextToSpeech.LANG_MISSING_DATA && it != TextToSpeech.LANG_NOT_SUPPORTED
        }
        if (engine == null || !langOk) {
            Toast.makeText(requireContext(), R.string.vocab_tts_missing, Toast.LENGTH_SHORT).show()
            return
        }
        val text = v.pronunciation?.ttsText?.takeIf { it.isNotBlank() } ?: v.word
        val ok = runCatching { engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "quick-" + v.id) }.getOrDefault(-1)
        if (ok != TextToSpeech.SUCCESS) Toast.makeText(requireContext(), R.string.vocab_tts_missing, Toast.LENGTH_SHORT).show()
    }
}
