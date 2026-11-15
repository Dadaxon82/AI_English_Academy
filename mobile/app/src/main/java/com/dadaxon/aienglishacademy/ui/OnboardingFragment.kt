package com.dadaxon.aienglishacademy.ui

import android.os.Bundle
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatDelegate
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.ApkAssetSource
import com.dadaxon.aienglishacademy.data.DiagnosticLoader
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.THEME_DARK
import com.dadaxon.aienglishacademy.data.THEME_LIGHT
import com.dadaxon.aienglishacademy.data.THEME_SYSTEM
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.data.clampDailyMinutes
import com.dadaxon.aienglishacademy.databinding.FragmentOnboardingBinding
import com.dadaxon.aienglishacademy.domain.DiagnosticOutcome
import com.dadaxon.aienglishacademy.domain.diagnose
import com.dadaxon.aienglishacademy.store.StoreAction
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import kotlin.math.roundToInt

/**
 * Onboarding — 5 bosqich: salom → daraja (hozirgi/maqsad) → maqsad+vaqt+mavzu →
 * diagnostika → tayyor.
 *
 * Diagnostika `assets/content/diagnostic.json` dagi 12 HAQIQIY savol bilan
 * o'tkaziladi; natija `domain/Diagnostic.kt::diagnose` qoidasi bilan
 * baholanadi (veb `src/content/diagnostic.ts` bilan bir xil). Fayl bo'lmasa
 * yoki buzilgan bo'lsa — ekran buni halol aytadi va darajani foydalanuvchi
 * o'zi tanlaydi (raqam ixtiro qilinmaydi).
 */
class OnboardingFragment : Fragment() {

    private var _b: FragmentOnboardingBinding? = null
    private val b get() = requireNotNull(_b)

    /** Bosqichlar tartibi (layoutdagi kursaklar bilan bir xil). */
    private enum class Step { WELCOME, LEVEL, PREFS, DIAGNOSTIC, READY }

    private val order = listOf(Step.WELCOME, Step.LEVEL, Step.PREFS, Step.DIAGNOSTIC, Step.READY)
    private var step = Step.WELCOME

    private var currentLevel = Levels.A1
    private var targetLevel = Levels.C1
    private var minutes = 90
    private var theme = THEME_SYSTEM

    /** Diagnostika holati. */
    private var diagQuestions: List<Exercise> = emptyList()

    /** Materialda o'qib bo'lmagan savollar soni (halol ko'rsatiladi). */
    private var diagSkipped = 0
    private var diagIndex = 0
    private val diagAnswers = LinkedHashMap<String, Boolean>()
    private var diagRunning = false

    /** Kontenti HAQIQIY mavjud darajalar (veb `LOADED_LEVELS`). */
    private var contentLevels: List<String> = Levels.ALL

    /** Diagnostika bahosi — `commit()` da store'ga yoziladi (ixtiyoriy). */
    private var diagOutcome: DiagnosticOutcome? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentOnboardingBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        val c = container()
        val asset = DiagnosticLoader.load(ApkAssetSource(requireContext().assets))
        diagQuestions = asset?.exercises ?: emptyList()
        diagSkipped = asset?.skipped ?: 0

        b.onbMascot.setMood(MascotView.Mood.HAPPY)
        b.welcomeMascot.setMood(MascotView.Mood.CHEER)

        // Daraja chipslari — kontentda HAQIQATAN mavjud darajalar.
        val available = runCatching { c.content.levels() }.getOrElse { Levels.ALL }
        contentLevels = available
        for (lvl in Levels.ALL) {
            b.levelChips.addView(makeChip(lvl, available.contains(lvl)) { currentLevel = lvl })
            b.targetChips.addView(makeChip(lvl, available.contains(lvl)) { targetLevel = lvl })
        }
        (b.levelChips.getChildAt(0) as? Chip)?.isChecked = true
        (b.targetChips.getChildAt(minOf(Levels.ALL.indexOf(targetLevel), b.targetChips.childCount - 1)) as? Chip)
            ?.isChecked = true

        b.minutesSlider.addOnChangeListener { _, value, _ ->
            minutes = clampDailyMinutes(value.roundToInt())
            b.minutesText.text = getString(R.string.onb_minutes_hint, minutes)
        }
        b.minutesText.text = getString(R.string.onb_minutes_hint, minutes)

        b.themeGroup.check(R.id.themeSystem)
        b.themeGroup.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (!isChecked) return@addOnButtonCheckedListener
            theme = when (checkedId) {
                R.id.themeLight -> THEME_LIGHT
                R.id.themeDark -> THEME_DARK
                else -> THEME_SYSTEM
            }
        }

        // Bitta tugma ikki vazifa bajaradi: boshlash ↔ keyingi savol
        // (`showDiagNext` matnni almashtiradi).
        b.diagStartButton.setOnClickListener {
            if (diagRunning) {
                if (!diagChecked) return@setOnClickListener
                diagIndex++
                if (diagIndex >= diagQuestions.size) {
                    finishDiagnostic(diagnose(diagAnswers))
                } else {
                    renderQuestion()
                }
            } else {
                startDiagnostic()
            }
        }
        b.diagSkipButton.setOnClickListener { finishDiagnostic(null) }
        b.primaryButton.setOnClickListener { onNext() }
        b.secondaryButton.setOnClickListener { onBack() }

        if (diagQuestions.isEmpty()) {
            // Material yo'q — buni halol aytamiz va boshlash tugmasini o'chiramiz.
            b.diagHint.setText(R.string.content_error)
            b.diagStartButton.isEnabled = false
        } else {
            val base = getString(R.string.onb_diag_hint, diagQuestions.size)
            // Biror savol o'qilmagan bo'lsa — buni yashirmaymiz.
            b.diagHint.text =
                if (diagSkipped > 0) "$base ${getString(R.string.onb_diag_skipped, diagSkipped)}" else base
        }

        show()
    }

    private fun makeChip(label: String, enabled: Boolean, onPick: () -> Unit): Chip {
        val chip = Chip(requireContext())
        chip.text = label
        chip.isCheckable = true
        chip.isEnabled = enabled
        chip.id = View.generateViewId()
        chip.setOnCheckedChangeListener { _, checked -> if (checked) onPick() }
        if (!enabled) chip.alpha = 0.4f
        return chip
    }

    /* --------------------------- bosqich boshqaruvi --------------------- */

    private fun show() {
        val index = order.indexOf(step)
        b.stepText.text = getString(R.string.onb_step_of, index + 1, order.size)
        b.stepWelcome.visibility = if (step == Step.WELCOME) View.VISIBLE else View.GONE
        b.stepLevel.visibility = if (step == Step.LEVEL) View.VISIBLE else View.GONE
        b.stepPrefs.visibility = if (step == Step.PREFS) View.VISIBLE else View.GONE
        b.stepDiagnostic.visibility = if (step == Step.DIAGNOSTIC) View.VISIBLE else View.GONE
        b.stepReady.visibility = if (step == Step.READY) View.VISIBLE else View.GONE

        b.primaryButton.setText(if (step == Step.READY) R.string.onb_begin else R.string.next)
        // Diagnostika bosqichida oldinga tugma — ekrandagi "Boshlash/O‘tkazish".
        b.primaryButton.visibility = if (step == Step.DIAGNOSTIC) View.GONE else View.VISIBLE
        b.secondaryButton.visibility = if (step == Step.WELCOME) View.GONE else View.VISIBLE

        if (step == Step.DIAGNOSTIC && !diagRunning) {
            b.diagResultBox.visibility = View.GONE
            b.diagStartButton.visibility = View.VISIBLE
            b.diagStartButton.setText(R.string.onb_diag_start)
            b.diagStartButton.isEnabled = diagQuestions.isNotEmpty()
            b.diagSkipButton.visibility = View.VISIBLE
            b.diagCounter.text = ""
            b.diagQuestion.text = ""
            b.diagOptions.removeAllViews()
        }
        if (step == Step.READY) renderReady()
        b.onbScroll.scrollTo(0, 0)
    }

    private fun onNext() {
        when (step) {
            Step.WELCOME -> step = Step.LEVEL
            Step.LEVEL -> step = Step.PREFS
            Step.PREFS -> step = Step.DIAGNOSTIC
            //_DIAGNOSTIC tugaganda `finishDiagnostic` chaqiriladi.
            Step.DIAGNOSTIC -> if (!diagRunning) step = Step.READY
            Step.READY -> {
                commit()
                findNavController().navigate(R.id.dashboardFragment)
                return
            }
        }
        show()
    }

    private fun onBack() {
        val i = order.indexOf(step)
        if (i == 0) {
            findNavController().navigate(R.id.authFragment)
            return
        }
        step = order[i - 1]
        if (step == Step.DIAGNOSTIC) diagRunning = false
        show()
    }

    /* ------------------------------ diagnostika ------------------------ */

    /**
     * Joriy savolning interfeys holati (turiga qarab bittasi ishlatiladi).
     * `ExerciseFragment`dagi pleyerning yengil nusxasi — diagnostikada XP va
     * xatolar daftari yozilmaydi, faqat daraja baholanadi.
     */
    private var diagGapFields: List<android.widget.EditText> = emptyList()
    private val diagMatches = LinkedHashMap<String, String>()
    private var diagLeftPick: String? = null
    private var diagChecked = false

    private fun startDiagnostic() {
        if (diagQuestions.isEmpty()) return
        diagRunning = true
        diagIndex = 0
        diagAnswers.clear()
        renderQuestion()
    }

    private fun renderQuestion() {
        val q = diagQuestions.getOrNull(diagIndex) ?: run { finishDiagnostic(null); return }
        diagChecked = false
        diagGapFields = emptyList()
        diagMatches.clear()
        diagLeftPick = null

        b.diagCounter.text = getString(R.string.onb_diag_question, diagIndex + 1, diagQuestions.size)
        // Savol matni: yo'riqnoma + asosiy gap + (bor bo'lsa) matn uzindisi.
        val stem = listOf(q.question, q.text, q.statement, q.source).firstOrNull { !it.isNullOrBlank() }
        b.diagQuestion.text = buildString {
            if (q.instructionUz.isNotBlank()) append(q.instructionUz).append("\n")
            if (stem != null) append(stem)
            val excerpt = q.passageExcerpt
            if (!excerpt.isNullOrBlank()) {
                if (length > 0) append("\n")
                append("“").append(excerpt).append("”")
            }
        }
        b.diagOptions.removeAllViews()

        // Bankdagi so'zlar chip ko'rinishida — qaysi savol ekanligini bilish
        // uchun `kind` bo'yicha yuramiz (veb `ExerciseRunner` ham shunday).
        when (q.kind) {
            com.dadaxon.aienglishacademy.data.Kinds.MULTIPLE_CHOICE,
            com.dadaxon.aienglishacademy.data.Kinds.TRUE_FALSE_NOTGIVEN,
            -> buildDiagChoice(q)

            com.dadaxon.aienglishacademy.data.Kinds.GAP_FILL -> buildDiagGap(q)
            com.dadaxon.aienglishacademy.data.Kinds.TRANSLATION -> buildDiagTranslation(q)
            com.dadaxon.aienglishacademy.data.Kinds.WORD_ORDER -> buildDiagOrder(q)
            com.dadaxon.aienglishacademy.data.Kinds.MATCHING -> buildDiagMatching(q)
            else -> {
                // Turi noma'lum — javob talab qilinmaydi, keyingiga o'tamiz.
                b.diagOptions.addView(Rows.small(requireContext(), getString(R.string.ex_unsupported)))
                diagAnswers.remove(q.id)
                showDiagNext()
            }
        }

        // Boshlash tugmasi savol davomida "Keyingi" vazifasini bajaradi.
        b.diagStartButton.setText(R.string.onb_diag_start)
        b.diagStartButton.isEnabled = diagChecked
        b.onbMascot.setMood(MascotView.Mood.NEUTRAL)
        b.onbScroll.scrollTo(0, 0)
    }

    /** Variantli savollar — bosilganda darhol tekshiriladi. */
    private fun buildDiagChoice(q: Exercise) {
        val ctx = requireContext()
        val tfng = q.kind == com.dadaxon.aienglishacademy.data.Kinds.TRUE_FALSE_NOTGIVEN
        val choices: List<Pair<String, String>> =
            if (tfng) {
                listOf(
                    "true" to getString(R.string.ex_tf_true),
                    "false" to getString(R.string.ex_tf_false),
                    "notgiven" to getString(R.string.ex_tf_notgiven),
                )
            } else {
                (q.options ?: emptyList()).mapIndexed { i, o -> i.toString() to o }
            }
        if (choices.isEmpty()) {
            b.diagOptions.addView(Rows.small(ctx, getString(R.string.ex_unsupported)))
            showDiagNext()
            return
        }
        for ((value, label) in choices) {
            val btn = outlineChipButton(label)
            btn.setOnClickListener {
                if (diagChecked) return@setOnClickListener
                val answer: Any? = if (tfng) value else value.toIntOrNull()
                submitDiag(q, answer)
            }
            b.diagOptions.addView(btn)
        }
    }

    /** gap-fill — har bo'shliq alohida maydon. */
    private fun buildDiagGap(q: Exercise) {
        val ctx = requireContext()
        val slots = q.answers?.size ?: 0
        if (slots == 0) {
            b.diagOptions.addView(Rows.small(ctx, getString(R.string.ex_unsupported)))
            showDiagNext()
            return
        }
        val fields = ArrayList<android.widget.EditText>(slots)
        for (i in 0 until slots) {
            val f = editText(ctx, getString(R.string.ex_gap_slot, i + 1), 1)
            b.diagOptions.addView(f)
            fields.add(f)
        }
        diagGapFields = fields
        addDiagCheckButton(q) { fields.map { it.text?.toString()?.trim() ?: "" } }
    }

    /** translation — bitta erkin javob. */
    private fun buildDiagTranslation(q: Exercise) {
        val ctx = requireContext()
        val f = editText(ctx, getString(R.string.ex_translation_hint), 3)
        b.diagOptions.addView(f)
        addDiagCheckButton(q) { f.text?.toString()?.trim() }
    }

    /**
     * word-order — bankdagi so'zlarni bosib tanlanadi (qayta bosilsa olinadi).
     * Javob `checkAnswer`ga satr ko'rinishida beriladi (u tokenlarga ajratadi).
     */
    private fun buildDiagOrder(q: Exercise) {
        val ctx = requireContext()
        val bank = q.bank ?: emptyList()
        if (bank.isEmpty()) {
            b.diagOptions.addView(Rows.small(ctx, getString(R.string.ex_unsupported)))
            showDiagNext()
            return
        }
        b.diagOptions.addView(Rows.small(ctx, getString(R.string.ex_word_hint)))
        val answerLine = Rows.body(ctx, "")
        b.diagOptions.addView(answerLine)
        // `LinkedHashSet` — BO'RICH TARTIBINI saqlaydi. Indekslarni
        // `sorted()` bilan tartiblash xato edi: javob bank tartibida
        // yig'ilar edi ("she had Never…"), tanlash tartibi esa emas.
        val chosen = LinkedHashSet<Int>()
        bank.forEachIndexed { i, token ->
            val chip = Chip(ctx).apply {
                text = token
                isCheckable = true
                textSize = 13f
            }
            chip.setOnCheckedChangeListener { _, on ->
                if (on) chosen.add(i) else chosen.remove(i)
                answerLine.text = chosen.mapNotNull { bank.getOrNull(it) }.joinToString(" ")
            }
            b.diagOptions.addView(chip)
        }
        addDiagCheckButton(q) { chosen.mapNotNull { bank.getOrNull(it) }.joinToString(" ") }
    }

    /** matching — chapni, keyin o'ngni bosish bilan juftlik tuziladi. */
    private fun buildDiagMatching(q: Exercise) {
        val ctx = requireContext()
        val pairs = q.pairs ?: emptyList()
        if (pairs.isEmpty()) {
            b.diagOptions.addView(Rows.small(ctx, getString(R.string.ex_unsupported)))
            showDiagNext()
            return
        }
        b.diagOptions.addView(Rows.small(ctx, getString(R.string.ex_match_hint)))
        val statusLine = Rows.small(ctx, "")
        val columns = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT,
            )
        }
        val leftCol = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        val rightCol = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        // O'ng ustun savol id'siga bog'liq holda aralashtiriladi — har safar
        // bir xil (foydalanuvchi chalg'imasligi uchun).
        val rightOrder = pairs.indices.toList().shuffled(java.util.Random(q.id.hashCode().toLong() + 17L))
        for (p in pairs) {
            val btn = outlineChipButton(p.left)
            btn.setOnClickListener {
                diagLeftPick = p.left
                refreshMatchButtons(leftCol, pairs, statusLine)
            }
            leftCol.addView(btn)
        }
        for (i in rightOrder) {
            val value = pairs[i].right
            val btn = outlineChipButton(value)
            btn.setOnClickListener {
                val left = diagLeftPick
                if (left == null) {
                    statusLine.setText(R.string.ex_match_hint)
                } else {
                    diagMatches[left] = value
                    diagLeftPick = null
                    refreshMatchButtons(leftCol, pairs, statusLine)
                }
            }
            rightCol.addView(btn)
        }
        columns.addView(leftCol)
        columns.addView(rightCol)
        b.diagOptions.addView(columns)
        b.diagOptions.addView(statusLine)
        refreshMatchButtons(leftCol, pairs, statusLine)
        addDiagCheckButton(q) { LinkedHashMap(diagMatches) }
    }

    private fun refreshMatchButtons(leftCol: LinearLayout, pairs: List<com.dadaxon.aienglishacademy.data.Pair2>, statusLine: android.widget.TextView) {
        for (i in 0 until leftCol.childCount) {
            val btn = leftCol.getChildAt(i) as MaterialButton
            val left = pairs.getOrNull(i)?.left ?: continue
            val paired = diagMatches[left]
            btn.text = if (paired != null) "$left → $paired" else left
            btn.isActivated = left == diagLeftPick
        }
        statusLine.text = "${diagMatches.size}/${pairs.size}"
    }

    private fun outlineChipButton(label: String): MaterialButton {
        val ctx = requireContext()
        return MaterialButton(ctx, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
            text = label
            isAllCaps = false
            textSize = 13f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = resources.getDimensionPixelSize(R.dimen.gap_s) }
        }
    }

    private fun editText(ctx: android.content.Context, hint: String, lines: Int): android.widget.EditText =
        android.widget.EditText(ctx).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            this.hint = hint
            minLines = lines
            maxLines = lines + 2
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = resources.getDimensionPixelSize(R.dimen.gap_s) }
        }

    /** Inputli turlar uchun «Tekshirish» tugmasi (javob shu payt yig'iladi). */
    private fun addDiagCheckButton(q: Exercise, answer: () -> Any?) {
        val btn = MaterialButton(requireContext()).apply {
            setText(R.string.ex_check)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = resources.getDimensionPixelSize(R.dimen.gap_s) }
        }
        btn.setOnClickListener {
            if (diagChecked) return@setOnClickListener
            submitDiag(q, answer())
        }
        b.diagOptions.addView(btn)
    }

    /** Javobni domen qoidasi bilan tekshirish — `checkAnswer` (veb bilan bir xil). */
    private fun submitDiag(q: Exercise, answer: Any?) {
        val outcome = com.dadaxon.aienglishacademy.domain.checkAnswer(q, answer)
        diagAnswers[q.id] = outcome.correct
        diagChecked = true
        b.onbMascot.setMood(MascotView.moodFromCorrect(outcome.correct, outcome.partial))

        val ctx = requireContext()
        // Maydonlar/banklar o'qib bo'ladigan holatda qoladi, faqat yangi
        // qatorlar qo'shiladi (foydalanuvchi o'z javobini ko'ra olsin).
        b.diagOptions.addView(
            Rows.body(
                ctx,
                getString(if (outcome.correct) R.string.ex_correct else R.string.ex_wrong),
            ).apply { setTypeface(typeface, android.graphics.Typeface.BOLD) },
        )
        if (outcome.expected.isNotBlank()) {
            b.diagOptions.addView(Rows.small(ctx, getString(R.string.ex_expected, outcome.expected)))
        }
        if (outcome.partial in 0.001..0.999) {
            b.diagOptions.addView(
                Rows.small(
                    ctx,
                    getString(R.string.ex_partial, (outcome.partial * (q.answers?.size ?: 1)).roundToInt(), q.answers?.size ?: 1),
                ),
            )
        }
        if (outcome.whyUz.isNotBlank()) b.diagOptions.addView(Rows.small(ctx, outcome.whyUz))
        showDiagNext()
    }

    /** Tekshirilgandan keyin «Keyingi» tugmasi yoqiladi. */
    private fun showDiagNext() {
        diagChecked = true
        b.diagStartButton.setText(R.string.ex_next)
        b.diagStartButton.isEnabled = true
        b.diagSkipButton.visibility = View.GONE
    }


    /**
     * Diagnostikani yakunlash. `outcome == null` — foydalanuvchi o'tkazib
     * yubordi yoki javoblar yetishmadi: daraja tanlangan holda qoladi.
     */
    private fun finishDiagnostic(outcome: com.dadaxon.aienglishacademy.domain.DiagnosticOutcome?) {
        diagRunning = false
        diagChecked = false
        diagOutcome = outcome
        b.diagOptions.removeAllViews()
        // Natijani ochiq ko'rsatamiz: nechta savolga to'g'ri javob berilgani.
        b.diagCounter.text = if (diagAnswers.isEmpty()) {
            ""
        } else {
            getString(R.string.onb_diag_score, diagAnswers.values.count { it }, diagQuestions.size)
        }
        b.diagQuestion.text = ""
        b.diagStartButton.visibility = View.GONE
        b.diagSkipButton.visibility = View.GONE
        b.diagResultBox.visibility = View.VISIBLE

        val lvl = outcome?.level
        if (lvl != null) {
            // Veb bilan bir xil: diagnostika NATIJA SIFATIDA qayd etiladi
            // (`StoreAction.Diagnostic`), `settings.currentLevel` o'zgarishi
            // uchun esa SHU daraja kontenti HAQIQIY mavjud bo'lishi kerak
            // (`Progress.tsx`: «…kontenti hali tayyor emas — o‘tish tugmasi
            // kontent yuklangandan keyin ishlaydi»). Aks holda foydalanuvchi
            // bo'sh darajada qolardi (dashboard'da «reja tayyor emas»).
            if (contentLevels.contains(lvl)) {
                currentLevel = lvl
                if (Levels.ALL.indexOf(targetLevel) <= Levels.ALL.indexOf(lvl)) targetLevel = lv1After(lvl)
                // Chipslar 2-bosqichda tuzilgan — tanlov endi o'zgarganini
                // ko'rsatish uchun belgini qayta yangilaymiz.
                syncChips()
            }
            b.diagResult.text = getString(R.string.onb_diag_result, lvl)
            b.diagConfidence.text = getString(R.string.onb_diag_confidence, (outcome.confidence * 100).roundToInt())
            b.diagNote.text =
                if (contentLevels.contains(lvl)) {
                    outcome.labelUz
                } else {
                    // Halol izoh: baho saqlanadi, lekin kontent yo'q — foydalanuvchi
                    // qaysi darajada davom etayotgani ochiq aytiladi.
                    outcome.labelUz + "\n\n" +
                        getString(R.string.onb_diag_no_content, lvl, currentLevel)
                }
            b.onbMascot.setMood(MascotView.Mood.CHEER)
        } else {
            b.diagResult.setText(R.string.onb_diag_skip)
            b.diagConfidence.text = outcome?.labelUz ?: ""
            b.diagNote.setText(R.string.onb_level_hint)
        }
        if (_b != null) b.primaryButton.visibility = View.VISIBLE
    }

    /** Maqsad darajasi tavsiya darajasidan past qolmasin. */
    private fun lv1After(lvl: String): String = Levels.next(lvl) ?: lvl

    /**
     * Chip belgilarini joriy tanlovga moslaydi. Diagnostika darajani 4-bosqichda
     * o'zgartiradi, chipslar esa 2-bosqichda tuzilgan — shuning uchun `isChecked`
     * ni bu yerdan yangilaymiz (aks holda 5-bosqichda eski belgi qolardi).
     */
    private fun syncChips() {
        fun paint(group: ChipGroup, lvl: String) {
            val idx = Levels.ALL.indexOf(lvl)
            if (idx < 0 || idx >= group.childCount) return
            (group.getChildAt(idx) as? Chip)?.isChecked = true
        }
        paint(b.levelChips, currentLevel)
        paint(b.targetChips, targetLevel)
    }

    private fun renderReady() {
        b.readyMascot.setMood(MascotView.Mood.CHEER)
        b.readySummary.text = buildString {
            append(currentLevel)
            append(" → ")
            append(targetLevel)
            append(" · ")
            append(getString(R.string.onb_minutes_hint, minutes))
        }
    }

    /** Tanlovlar store'ga yoziladi (mavzu darhol qo'llanadi). */
    private fun commit() {
        val c = container()
        val base = c.store.settings()
        val patched = UserSettings(
            dailyMinutes = clampDailyMinutes(minutes),
            // O'yin sozlamalari onboarding'da YO'QOTILADI — foydalanuvchi
            // Sozlamalar'da tanlagan XP maqsadi va yurak kaliti saqlanadi
            // (veb `updateSettings` qisman yangilanish qiladi).
            xpGoalXp = base.xpGoalXp,
            heartsEnabled = base.heartsEnabled,
            currentLevel = currentLevel,
            targetLevel = targetLevel,
            examDate = base.examDate,
            allocation = base.allocation,
            theme = theme,
            aiEnabled = base.aiEnabled,
        )
        c.store.dispatch(StoreAction.Settings(patched))
        // Diagnostika natijasi ham saqlanadi va sinxronlanadi
        // (`SyncProtocol` uni `learning_plans.plan` jsonb ichidagi `diagnostic`
        // maydoniga yuboradi) — veb `actions.setDiagnostic(...)` bilan bir xil.
        diagOutcome?.let {
            c.store.dispatch(
                StoreAction.Diagnostic(System.currentTimeMillis(), it.level, it.labelUz, it.confidence)
            )
        }
        c.store.dispatch(StoreAction.LevelSet(currentLevel))
        c.store.dispatch(StoreAction.Onboarded(System.currentTimeMillis()))
        c.store.flushSave()
        // Mavzu darhol qo'llanadi (MainActivity onCreate'dagi kabi — DayNight).
        AppCompatDelegate.setDefaultNightMode(
            when (theme) {
                THEME_LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
                THEME_DARK -> AppCompatDelegate.MODE_NIGHT_YES
                else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
            },
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
