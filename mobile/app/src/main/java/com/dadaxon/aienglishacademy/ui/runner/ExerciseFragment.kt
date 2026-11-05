package com.dadaxon.aienglishacademy.ui.runner

import android.content.Context
import android.os.Bundle
import android.os.SystemClock
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.databinding.FragmentExerciseBinding
import com.dadaxon.aienglishacademy.domain.CheckOutcome
import com.dadaxon.aienglishacademy.domain.checkAnswer
import com.dadaxon.aienglishacademy.domain.evaluateLevelPromotion
import com.dadaxon.aienglishacademy.domain.nextExerciseIndex
import com.dadaxon.aienglishacademy.domain.skillEvidence
import com.dadaxon.aienglishacademy.domain.xpForAttempt
import com.dadaxon.aienglishacademy.store.AppStore
import com.dadaxon.aienglishacademy.store.StoreAction
import com.dadaxon.aienglishacademy.ui.MascotDialog
import com.dadaxon.aienglishacademy.ui.MascotView
import com.dadaxon.aienglishacademy.ui.Nav
import com.dadaxon.aienglishacademy.ui.Rows
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import java.util.UUID

/**
 * Mashq pleyeri — 6 mashq turi bitta ekranda.
 *
 * MANBA: veb `src/pages/…Practice…` sahifalari + `src/lib/check.ts`. Tekshirish qoidalari
 * (`checkAnswer`) va natijaga moslash (`nextExerciseIndex`) domen qatlamidan
 * olinadi — burada faqat interfeys, hisobga olish va qaytarish bor.
 *
 * Ish tartibi:
 *  1. Arguméntdagi mashq id'lari kontentdan ochiladi (topilmagan id o'tkazib
 *     yuboriladi — sabab ekranda ochiq aytiladi, son ixtir qilinmaydi).
 *  2. Javob yig'iladi → `checkAnswer` → natija kartasi + mascot kayfiyati.
 *  3. Har tekshirish `StoreAction.Attempt` bilan saqlanadi (XP, kundalik
 *     hisob, Xatolar daftariga tushadi) va sinxron navbatiga qo'shiladi.
 *  4. Yakunda umumiy hisob, XP va (dalil yetarli bo'lsa) daraja tavsiyasi.
 */
class ExerciseFragment : Fragment() {

    private var _b: FragmentExerciseBinding? = null
    private val b get() = requireNotNull(_b)

    private var pool: List<Exercise> = emptyList()

    /** Kontentda topilmagan id'lar soni — hisobotda ochiq ko'rsatiladi. */
    private var missingCount = 0
    private var index = 0
    private val results = ArrayList<CheckOutcome>()
    private var checked = false
    private var exerciseStart = 0L
    private var xpGained = 0
    private val tried = HashSet<String>()

    // Joriy mashq interfeys holati (turiga qarab bittasi faol).
    private var chosenOption = -1
    private var tfAnswer: String? = null
    private var chosenLeft: String? = null
    private var leftLabels: List<String> = emptyList()
    private val matches = LinkedHashMap<String, String>()
    private var gapFields: List<TextInputEditText> = emptyList()
    private var bankTokens: List<String> = emptyList()
    private val orderChosen = ArrayList<Int>()

    private var contentId: String? = null
    private var dayId: String? = null
    private var source: String = Source.PRACTICE

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentExerciseBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        contentId = Nav.stringArg(this, Nav.ARG_CONTENT_ID)
        dayId = Nav.stringArg(this, Nav.ARG_DAY_ID)
        source = Nav.stringArg(this, Nav.ARG_SOURCE) ?: Source.PRACTICE

        val ids = Nav.stringListArg(this, Nav.ARG_EXERCISE_IDS)
        val cr = container().content
        val resolved = ArrayList<Exercise>(ids.size)
        var miss = 0
        for (id in ids) {
            val e = cr.findExercise(id)
            if (e == null) miss++ else resolved.add(e)
        }
        pool = resolved
        missingCount = miss

        (activity as? AppCompatActivity)?.supportActionBar?.title =
            Nav.titleArg(this, R.string.ex_title)

        b.exMascot.setMood(MascotView.Mood.NEUTRAL)
        b.summaryMascot.setMood(MascotView.Mood.CHEER)

        b.exCheck.setOnClickListener { onCheck() }
        b.exNext.setOnClickListener { onNext() }
        b.exSkip.setOnClickListener { onSkip() }
        b.exFinish.setOnClickListener { onFinish() }
        b.matchClear.setOnClickListener { clearMatches() }
        b.orderUndo.setOnClickListener { undoToken() }
        b.orderClear.setOnClickListener { clearOrder() }
        b.transGiveUp.setOnClickListener {
            val first = (pool.getOrNull(index)?.accepted ?: emptyList()).firstOrNull()
            if (first != null) b.transField.setText(first)
        }

        if (pool.isEmpty()) {
            b.exEmpty.visibility = View.VISIBLE
            b.exCheck.visibility = View.GONE
            b.exSkip.visibility = View.GONE
            b.exFinish.visibility = View.GONE
            b.exCounter.text = getString(R.string.ex_index, 0, 0)
            return
        }
        showExercise(index)
    }

    /* --------------------------- mashqni ochish ------------------------- */

    private fun showExercise(i: Int) {
        val ctx = requireContext()
        val e = pool.getOrNull(i) ?: run {
            onFinish()
            return
        }
        index = i
        checked = false
        exerciseStart = SystemClock.elapsedRealtime()

        b.summaryCard.visibility = View.GONE
        b.exEmpty.visibility = View.GONE
        b.exCounter.text = getString(R.string.ex_index, i + 1, pool.size)
        b.exTimer.text = ""
        b.exSkill.text = Rows.skillName(ctx, e.skill) + " · " + e.level
        b.exInstruction.text = e.instructionUz

        // Kontekst matni (o'qish/tinglash mashqlarida).
        val excerpt = e.passageExcerpt
        if (!excerpt.isNullOrBlank()) {
            b.exPassage.text = excerpt
            b.exPassage.visibility = View.VISIBLE
        } else {
            b.exPassage.visibility = View.GONE
        }

        hideAllInputs()
        var supported = true
        when (e.kind) {
            Kinds.MULTIPLE_CHOICE -> supported = buildChoice(e)
            Kinds.TRUE_FALSE_NOTGIVEN -> supported = buildTfng(e)
            Kinds.MATCHING -> supported = buildMatching(e)
            Kinds.GAP_FILL -> buildGap(e)
            Kinds.WORD_ORDER -> supported = buildOrder(e)
            Kinds.TRANSLATION -> buildTranslation(e)
            else -> supported = false
        }
        b.exUnsupported.visibility = if (supported) View.GONE else View.VISIBLE
        b.exCheck.visibility = if (supported) View.VISIBLE else View.GONE
        b.exNext.visibility = View.GONE
        b.exSkip.visibility = if (supported) View.VISIBLE else View.GONE
        b.exFinish.visibility = View.VISIBLE
        b.resultCard.visibility = View.GONE
        b.exMascot.setMood(MascotView.Mood.NEUTRAL)
        b.exScroll.scrollTo(0, 0)
    }

    private fun hideAllInputs() {
        chosenOption = -1
        tfAnswer = null
        chosenLeft = null
        leftLabels = emptyList()
        matches.clear()
        gapFields = emptyList()
        bankTokens = emptyList()
        orderChosen.clear()
        b.choiceCard.visibility = View.GONE
        b.matchCard.visibility = View.GONE
        b.gapCard.visibility = View.GONE
        b.orderCard.visibility = View.GONE
        b.transCard.visibility = View.GONE
        b.exUnsupported.visibility = View.GONE
        b.choiceGroup.removeAllViews()
        b.matchLeft.removeAllViews()
        b.matchRight.removeAllViews()
        b.gapFields.removeAllViews()
        b.wordBank.removeAllViews()
        b.orderBank.removeAllViews()
        b.matchStatus.text = ""
        b.orderAnswer.text = ""
        b.transField.setText("")
    }

    /** multiple-choice — variantlar ro'yxati (javob: indeks). */
    private fun buildChoice(e: Exercise): Boolean {
        val ctx = requireContext()
        val opts = e.options ?: emptyList()
        if (opts.isEmpty()) return false
        b.choiceQuestion.text = e.question ?: e.instructionUz
        b.choiceGroup.removeAllViews()
        for (opt in opts) {
            val rb = RadioButton(ctx).apply {
                text = opt
                id = View.generateViewId()
                setPadding(0, Rows.dp(ctx, 6), 0, Rows.dp(ctx, 6))
            }
            b.choiceGroup.addView(rb)
        }
        b.choiceGroup.setOnCheckedChangeListener { group, checkedId ->
            chosenOption = (0 until group.childCount)
                .firstOrNull { group.getChildAt(it).id == checkedId } ?: -1
        }
        b.choiceCard.visibility = View.VISIBLE
        return true
    }

    /** true-false-notgiven — IELTS uslubidagi uch javob (kalit so'zlar). */
    private fun buildTfng(e: Exercise): Boolean {
        val ctx = requireContext()
        b.choiceQuestion.text = e.statement ?: e.question ?: e.instructionUz
        b.choiceGroup.removeAllViews()
        val keys = listOf(
            "true" to R.string.ex_tf_true,
            "false" to R.string.ex_tf_false,
            "notgiven" to R.string.ex_tf_notgiven,
        )
        for ((key, res) in keys) {
            val rb = RadioButton(ctx).apply {
                text = getString(res)
                id = View.generateViewId()
                tag = key
                setPadding(0, Rows.dp(ctx, 6), 0, Rows.dp(ctx, 6))
            }
            b.choiceGroup.addView(rb)
        }
        b.choiceGroup.setOnCheckedChangeListener { group, checkedId ->
            val v = (0 until group.childCount)
                .firstOrNull { group.getChildAt(it).id == checkedId }
            tfAnswer = (v as? RadioButton)?.tag as? String
        }
        b.choiceCard.visibility = View.VISIBLE
        return true
    }

    /**
     * matching — chapni bosib, keyin o'ngni bosish bilan juftlik tuziladi.
     * O'ng ustun har ochilishda BIR XIL tartibda aralashtiriladi (id hash'iga
     * asoslangan) — foydalanuvchi chalg'imasligi uchun.
     */
    private fun buildMatching(e: Exercise): Boolean {
        val ctx = requireContext()
        val pairs = e.pairs ?: emptyList()
        if (pairs.isEmpty()) return false
        leftLabels = pairs.map { it.left }

        for (p in pairs) {
            val btn = outlineButton(p.left)
            btn.setOnClickListener {
                chosenLeft = p.left
                markLeftSelection()
            }
            b.matchLeft.addView(btn)
        }
        val rightOrder = pairs.indices.toList()
            .shuffled(java.util.Random(e.id.hashCode().toLong() + 17L))
        for (i in rightOrder) {
            val value = pairs[i].right
            val btn = outlineButton(value)
            btn.setOnClickListener {
                val left = chosenLeft
                if (left == null) {
                    Toast.makeText(ctx, R.string.ex_match_hint, Toast.LENGTH_SHORT).show()
                } else {
                    matches[left] = value
                    chosenLeft = null
                    markLeftSelection()
                }
            }
            b.matchRight.addView(btn)
        }
        markLeftSelection()
        b.matchCard.visibility = View.VISIBLE
        return true
    }

    private fun outlineButton(label: String): MaterialButton {
        val ctx = requireContext()
        return MaterialButton(ctx, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
            text = label
            isAllCaps = false
            textSize = 13f
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = Rows.dp(ctx, 6) }
        }
    }

    /** Chap ustundagi tugmalarda juftlik natijasini ko'rsatadi + hisob. */
    private fun markLeftSelection() {
        val total = leftLabels.size
        for (i in 0 until b.matchLeft.childCount) {
            val btn = b.matchLeft.getChildAt(i) as MaterialButton
            val label = leftLabels.getOrNull(i) ?: continue
            val paired = matches[label]
            btn.text = if (paired != null) "$label → $paired" else label
            btn.isActivated = label == chosenLeft
        }
        b.matchStatus.text = "${matches.size}/$total"
    }

    private fun clearMatches() {
        matches.clear()
        chosenLeft = null
        markLeftSelection()
    }

    /** gap-fill — har bo'shliq alohida maydon; so'z banki bosib to'ldiriladi. */
    private fun buildGap(e: Exercise) {
        val ctx = requireContext()
        val slots = (e.answers ?: emptyList()).size
        b.gapText.text = e.text ?: ""
        b.gapFields.removeAllViews()
        val fields = ArrayList<TextInputEditText>(slots)
        for (i in 0 until slots) {
            val lay = TextInputLayout(ctx, null, com.google.android.material.R.attr.textInputOutlinedStyle).apply {
                hint = getString(R.string.ex_gap_slot, i + 1)
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
                ).apply { topMargin = Rows.dp(ctx, 6) }
            }
            val f = TextInputEditText(ctx)
            f.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            lay.addView(
                f,
                LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT),
            )
            b.gapFields.addView(lay)
            fields.add(f)
        }
        gapFields = fields

        b.wordBank.removeAllViews()
        val bank = e.wordBank ?: emptyList()
        if (bank.isEmpty()) {
            b.wordBank.visibility = View.GONE
        } else {
            b.wordBank.visibility = View.VISIBLE
            for (w in bank.shuffled(java.util.Random(e.id.hashCode().toLong() + 5L))) {
                val chip = Chip(ctx).apply {
                    text = w
                    isClickable = true
                    isCheckable = false
                }
                chip.setOnClickListener { fillFirstEmptyGap(w) }
                b.wordBank.addView(chip)
            }
        }
        b.gapCard.visibility = View.VISIBLE
    }

    private fun fillFirstEmptyGap(word: String) {
        val f = gapFields.firstOrNull { (it.text?.toString() ?: "").isBlank() } ?: gapFields.lastOrNull()
        f?.setText(word)
    }

    /** word-order — bankdagi so'zlarni bosib tartib tuziladi. */
    private fun buildOrder(e: Exercise): Boolean {
        val bank = e.bank ?: emptyList()
        if (bank.isEmpty()) return false
        bankTokens = bank
        orderChosen.clear()

        b.orderNote.setText(R.string.ex_word_hint)
        b.orderBank.removeAllViews()
        for ((i, token) in bank.withIndex()) {
            val chip = orderChip(token)
            chip.tag = i
            chip.setOnClickListener { takeToken(i) }
            b.orderBank.addView(chip)
        }
        updateOrderUi()
        b.orderCard.visibility = View.VISIBLE
        return true
    }

    private fun orderChip(token: String): Chip {
        return Chip(requireContext()).apply {
            text = token
            isClickable = true
            isCheckable = false
            textSize = 13f
        }
    }

    private fun takeToken(i: Int) {
        if (orderChosen.contains(i)) return
        orderChosen.add(i)
        updateOrderUi()
    }

    private fun undoToken() {
        if (orderChosen.isEmpty()) return
        orderChosen.removeAt(orderChosen.size - 1)
        updateOrderUi()
    }

    private fun clearOrder() {
        orderChosen.clear()
        updateOrderUi()
    }

    /** Javob matnini va bankdagi chip holatini qayta yangilaydi. */
    private fun updateOrderUi() {
        b.orderAnswer.text = orderChosen.mapNotNull { bankTokens.getOrNull(it) }.joinToString(" ")
        val used = HashSet(orderChosen)
        for (i in 0 until b.orderBank.childCount) {
            val chip = b.orderBank.getChildAt(i) as Chip
            chip.isEnabled = !used.contains(i)
            chip.alpha = if (used.contains(i)) 0.4f else 1.0f
        }
    }

    /** translation — erkin javob (matn maydoni). */
    private fun buildTranslation(e: Exercise) {
        b.transSource.text = e.source ?: e.question ?: e.instructionUz
        b.transField.setText("")
        b.transCard.visibility = View.VISIBLE
    }

    /* --------------------------- tekshirish ----------------------------- */

    /** Joriy tur uchun javobni `checkAnswer` qabul qiladigan shaklda yig'adi. */
    private fun buildAnswer(e: Exercise): Any? = when (e.kind) {
        Kinds.MULTIPLE_CHOICE -> if (chosenOption < 0) null else chosenOption
        Kinds.TRUE_FALSE_NOTGIVEN -> tfAnswer
        Kinds.MATCHING -> if (matches.isEmpty()) null else LinkedHashMap(matches)
        Kinds.GAP_FILL -> gapFields.map { it.text?.toString()?.trim() ?: "" }
        Kinds.WORD_ORDER -> orderChosen.mapNotNull { bankTokens.getOrNull(it) }.joinToString(" ")
        Kinds.TRANSLATION -> b.transField.text?.toString()?.trim()
        else -> null
    }

    private fun answerEmpty(e: Exercise): Boolean = when (e.kind) {
        Kinds.MULTIPLE_CHOICE -> chosenOption < 0
        Kinds.TRUE_FALSE_NOTGIVEN -> tfAnswer == null
        Kinds.MATCHING -> matches.isEmpty()
        Kinds.GAP_FILL -> gapFields.all { (it.text?.toString() ?: "").isBlank() }
        Kinds.WORD_ORDER -> orderChosen.isEmpty()
        Kinds.TRANSLATION -> (b.transField.text?.toString() ?: "").isBlank()
        else -> true
    }

    private fun onCheck() {
        val e = pool.getOrNull(index) ?: return
        if (checked) return
        if (answerEmpty(e)) {
            Toast.makeText(requireContext(), R.string.ex_answer_empty, Toast.LENGTH_SHORT).show()
            return
        }

        val out = checkAnswer(e, buildAnswer(e))
        checked = true
        results.add(out)

        val seconds = ((SystemClock.elapsedRealtime() - exerciseStart) / 1000L).toInt().coerceAtLeast(0)
        val firstTry = tried.add(e.id)
        val gain = xpForAttempt(out.correct, e.difficulty, firstTry)
        xpGained += gain

        container().store.dispatch(
            StoreAction.Attempt(
                AttemptRecord(
                    id = UUID.randomUUID().toString(),
                    exerciseId = e.id,
                    skill = e.skill,
                    level = e.level,
                    correct = out.correct,
                    partial = out.partial,
                    difficulty = e.difficulty,
                    secondsSpent = seconds,
                    source = source,
                    answerGiven = out.given,
                    at = System.currentTimeMillis(),
                ),
            ),
        )

        b.exTimer.text = AppStore.formatDuration(seconds)
        showOutcome(out, gain)
        b.exCheck.visibility = View.GONE
        b.exSkip.visibility = View.GONE
        b.exNext.visibility = View.VISIBLE
        b.exNext.setText(if (index + 1 >= pool.size) R.string.ex_finish else R.string.ex_next)
    }

    private fun showOutcome(out: CheckOutcome, xp: Int) {
        b.resultCard.visibility = View.VISIBLE
        b.exMascot.setMood(MascotView.moodFromCorrect(out.correct, out.partial))
        b.resultTitle.text = when {
            out.correct -> getString(R.string.ex_correct)
            out.partial > 0.0 -> getString(R.string.ex_partial, (out.partial * 100).toInt(), 100)
            else -> getString(R.string.ex_wrong)
        }
        b.resultExpected.text = if (out.expected.isBlank()) "" else getString(R.string.ex_expected, out.expected)
        b.resultWhy.text = out.whyUz
        b.resultXp.text = getString(R.string.ex_result_xp, xp)
        b.exScroll.smoothScrollTo(0, b.resultCard.top)
    }

    /* --------------------------- harakatlar ----------------------------- */

    private fun onNext() {
        if (index + 1 >= pool.size) {
            onFinish()
            return
        }
        // Vebdagi moslash: oxirgi natijalarga qarab indeks tanlanadi
        // (xato -> bir oldingisini mustahkamlash, muvaffaqiyat -> oldinga).
        val next = nextExerciseIndex(index, results, pool.size)
        val safe = if (next in pool.indices && next != index) next else (index + 1).coerceAtMost(pool.size - 1)
        showExercise(safe)
    }

    private fun onSkip() {
        if (index + 1 >= pool.size) onFinish() else showExercise(index + 1)
    }

    private fun onFinish() {
        hideAllInputs()
        b.exCheck.visibility = View.GONE
        b.exNext.visibility = View.GONE
        b.exSkip.visibility = View.GONE
        b.exFinish.visibility = View.GONE
        b.resultCard.visibility = View.GONE

        val total = results.size
        val correct = results.count { it.correct }
        val percent = if (total == 0) 0 else correct * 100 / total
        val head = getString(R.string.ex_result_summary, correct, total, percent)
        b.summaryText.text = if (missingCount > 0) {
            "$head · $missingCount ${getString(R.string.content_empty)}"
        } else {
            head
        }
        b.summaryXp.text = getString(R.string.ex_result_xp, xpGained)

        // Daraja tavsiyasi — faqat DALIL YETARLI bo'lsa (domain qoidasi).
        val store = container().store
        val promo = evaluateLevelPromotion(store.settings().currentLevel, skillEvidence(store.state.value.data))
        b.summaryPromotion.text = if (promo.recommendedLevel != null) {
            getString(R.string.ex_level_up, promo.recommendedLevel)
        } else {
            promo.reasonUz
        }
        b.summaryPromotion.visibility = View.VISIBLE
        b.summaryMascot.setMood(if (percent >= 70) MascotView.Mood.CHEER else MascotView.Mood.HAPPY)
        b.summaryCard.visibility = View.VISIBLE

        if (total > 0 && dayId != null) {
            if (source == Source.SECTION_TEST) {
                // Bo'lim testi: natija bilan birga belgilanadi (veb: passedTests).
                store.dispatch(StoreAction.DayComplete(dayId!!, contentId, percent))
            } else {
                offerDayComplete()
            }
        }
        b.exScroll.scrollTo(0, b.summaryCard.top)
    }

    /** Kun yakunlandi deb belgilash — foydalanuvchi roziligi bilan. */
    private fun offerDayComplete() {
        val ctx: Context = requireContext()
        if (container().store.state.value.data.path.completedDays.contains(dayId)) return
        MaterialAlertDialogBuilder(ctx)
            .setTitle(R.string.path_day_complete_title)
            .setView(MascotDialog.header(ctx, MascotView.Mood.CHEER))
            .setMessage(R.string.path_day_complete_yes)
            .setNegativeButton(R.string.cancel, null)
            .setPositiveButton(R.string.yes) { _, _ ->
                container().store.dispatch(StoreAction.DayComplete(dayId!!, null, null))
            }
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
