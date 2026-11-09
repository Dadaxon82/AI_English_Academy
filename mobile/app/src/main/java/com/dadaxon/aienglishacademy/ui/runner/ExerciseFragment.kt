package com.dadaxon.aienglishacademy.ui.runner

import android.content.Context
import android.os.Bundle
import android.os.SystemClock
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.GameConfig
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.databinding.FragmentExerciseBinding
import com.dadaxon.aienglishacademy.domain.CheckOutcome
import com.dadaxon.aienglishacademy.domain.JUMP_PASS_SCORE
import com.dadaxon.aienglishacademy.domain.checkAnswer
import com.dadaxon.aienglishacademy.domain.GameLogic
import com.dadaxon.aienglishacademy.domain.evaluateLevelPromotion
import com.dadaxon.aienglishacademy.domain.jumpPassed
import com.dadaxon.aienglishacademy.domain.jumpScore
import com.dadaxon.aienglishacademy.domain.nextExerciseIndex
import com.dadaxon.aienglishacademy.domain.sectionLabelForId
import com.dadaxon.aienglishacademy.domain.skillEvidence
import com.dadaxon.aienglishacademy.domain.xpForAttempt
import com.dadaxon.aienglishacademy.store.AppStore
import com.dadaxon.aienglishacademy.store.StoreAction
import com.dadaxon.aienglishacademy.ui.MascotDialog
import com.dadaxon.aienglishacademy.ui.MascotView
import com.dadaxon.aienglishacademy.ui.Motion
import com.dadaxon.aienglishacademy.ui.Nav
import com.dadaxon.aienglishacademy.ui.Rows
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
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

    // 2026-11-08 — yangi turlar holati
    private val msChosen = sortedSetOf<Int>()
    private var dcChoices: Array<String?> = emptyArray()
    private var currentKind: String = ""

    private var contentId: String? = null
    private var dayId: String? = null
    private var source: String = Source.PRACTICE

    /**
     * Bo'lim SAKRASH testi bo'lsa — bo'lim id'si (`Nav.ARG_SECTION_ID`).
     * Kun testi (`dayId`) bilan aralashmasligi uchun alohida: sakrashda
     * KUN ochiq berilmaydi, natija `applySectionJump`ga yoziladi.
     */
    private var jumpSectionId: String? = null

    /**
     * Sakrash testida har mashqning natijasi — veb `acc.current[ex.id]`
     * moslamasi. Pleyer `nextExerciseIndex` bilan mashqni qayta ko'rsatsa,
     * shu xarita takrorni sanamaydi (ball savol SONiga bo'linadi).
     */
    private val jumpOutcomes = LinkedHashMap<String, CheckOutcome>()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentExerciseBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        contentId = Nav.stringArg(this, Nav.ARG_CONTENT_ID)
        dayId = Nav.stringArg(this, Nav.ARG_DAY_ID)
        source = Nav.stringArg(this, Nav.ARG_SOURCE) ?: Source.PRACTICE
        jumpSectionId = Nav.stringArg(this, Nav.ARG_SECTION_ID)

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
        // Darvoza havolalari (veb: `<Link to="/vocabulary">` va `/settings`):
        // birinchi HAQIQIY takrorlash darsini ochadi (SRS navbati — yurak
        // qaytaradi), ikkinchi sozlamani ochadi (o'chirish tugmasi u yerda).
        b.heartsGatePractice.setOnClickListener {
            findNavController().navigate(R.id.vocabReviewFragment)
        }
        b.heartsGateSettings.setOnClickListener {
            findNavController().navigate(R.id.settingsFragment)
        }

        if (pool.isEmpty()) {
            b.exEmpty.visibility = View.VISIBLE
            b.exCheck.visibility = View.GONE
            b.exSkip.visibility = View.GONE
            b.exFinish.visibility = View.GONE
            // Mashq yo'q — jarayon chizig'i ham yo'q (soxta to'ldirilgan bar
            // ko'rsatilmaydi; vebda shu holatda runner umuman chizilmaydi).
            b.exBar.visibility = View.GONE
            return
        }
        showExercise(index)
    }

    /* --------------------------- yurak darvozaSI ------------------------- */

    /**
     * Yurak darvozaSI — veb `ExerciseRunner.tsx` dagi `blocked =
     * hearts.blocked && !heartFree` moslamasi.
     *
     * Qoida (foydalanuvchi tanlovi): darvoza DARS BOSHLANISHIDA tekshiriladi —
     * mock imtihon, diagnostika va bo'lim testlarida (`HEART_FREE_SOURCES`)
     * umuman ishlamaydi. Holat `GameLogic.heartsView`dan o'qiladi: sonlar
     * ixtir qilinmaydi, sozlamada yuraklar o'chirilgan bo'lsa `blocked=false`.
     */
    private fun heartsGateBlocked(): Boolean {
        val hearts = GameLogic.heartsView(container().store.state.value.data, System.currentTimeMillis())
        val blocked = hearts.blocked && !GameLogic.heartFreeSource(source)
        b.heartsGate.visibility = if (blocked) View.VISIBLE else View.GONE
        if (blocked) {
            b.heartsGateTitle.text = getString(R.string.hearts_blocked_title) +
                if (hearts.minutesLeft > 0) getString(R.string.hearts_blocked_next, hearts.minutesLeft) else ""
            b.heartsGateHint.text = getString(
                R.string.hearts_blocked_hint,
                hearts.practiceNeeded,
                GameConfig.HEART_COMBO_STREAK,
            )
        }
        return blocked
    }

    /* ------------------------------ combo ------------------------------ */

    /**
     * Combo satiri (`R.id.exCombo`) — vebdagi combo chipining moslamasi
     * (`ExerciseRunner.tsx`: `showCombo = comboTracked && combo >= 2`).
     *
     * FAQAT HAQIQIY HOLAT: son `data.game.combo`dan olinadi — bu fayl
     * `GameLogic.afterAttempt` (`val combo = if (correct) base.combo + 1 else 0`)
     * tomonidan yoziladi va bizning har tekshiruvimiz `StoreAction.Attempt`
     * bilan shu yo'ldan o'tadi. Kombozorni o'zim sanamayman.
     *
     * Mobilda `comboTracked` doim true: ExerciseFragment HAR javobni
     * `StoreAction.Attempt` bilan yozadi. Onboarding'dagi diagnostika esa
     * alohida pleyerdan foydalanadi (`OnboardingFragment`) — u yerda
     * `recordAttempt` yo'q, shuning uchun combo satiri ham yo'q.
     *
     * Yurak qaytishigacha nechta qolgani — `GameConfig.HEART_COMBO_STREAK`
     * (5) dan hisoblanadi. `combo % 5 == 0` bo'lsa yurak ALLAQACHON qaytgan
     * (afterAttempt qoidasi) — "yana N" deb aldash kerak emas.
     */
    private fun showCombo() {
        val data = container().store.state.value.data
        val combo = data.game.combo
        if (combo < 2) {
            b.exCombo.visibility = View.GONE
            b.exCombo.text = ""
            return
        }
        val hearts = GameLogic.heartsView(data, System.currentTimeMillis())
        val free = GameLogic.heartFreeSource(source)
        val toHeart = combo % GameConfig.HEART_COMBO_STREAK == 0
        val sb = StringBuilder(getString(R.string.ex_combo, combo))
        if (hearts.enabled && !free && hearts.count < GameConfig.HEARTS_MAX && !toHeart) {
            sb.append(getString(R.string.ex_combo_heart, GameConfig.HEART_COMBO_STREAK - combo % GameConfig.HEART_COMBO_STREAK))
        }
        b.exCombo.text = sb
        b.exCombo.visibility = View.VISIBLE
    }

    /* ------------------------ jarayon chizig'i -------------------------- */

    /**
     * Mashq jarayonining chizig'i (`R.id.exBar`) — DULO tepadagi siljiydigan
     * chiziqning bizdagi ko'rinishi. Vebdagi moslash: `ExerciseRunner.tsx`
     * dagi `answeredCount` / `progressPct` / `.aea-step-bar`.
     *
     * HALOLLIK: son ixtir qilinmaydi. Qoida vebdagi `answeredCount`
     * (`ExerciseRunner.tsx`: `state === 'answered' ? index + 1 : index`)
     * BILAN BIR XIL — tekshirilgunga qadar `index` ta, tekshirilgach
     * `index + 1` ta. Mashq o'tkazib yuborilsa ham joyi almashadi (navbat
     * oldinga suriladi), shuning uchun bar ham suriladi.
     * Eski `exCounter` matni (`R.string.ex_index`) yo'qolmadi: u
     * `contentDescription` bo'lib qoldi, ekranni o'qiydigan dastur shu
     * sonni o'qiydi.
     *
     * `animate` — harakat byudjeti ichida siljiydi (`LinearProgressIndicator`
     * Material'ning o'z animatsiyasi; yangi ms soni kiritilmagan). Harakat
     * o'chirilganda (`Motion.enabled` false) birdan joyiga o'tadi — vebdagi
     * `html.no-motion` qoidasi bilan BIR xil xulq.
     */
    private fun showProgress(animate: Boolean) {
        val total = pool.size
        val done = if (checked) index + 1 else index
        b.exBar.visibility = View.VISIBLE
        val pct = if (total > 0) (done.coerceIn(0, total) * 100 / total) else 0
        b.exBar.setProgressCompat(pct, animate && Motion.enabled(requireContext()))
        b.exBar.contentDescription = getString(R.string.ex_index, done, total)
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

        val gateBlocked = heartsGateBlocked()
        b.summaryCard.visibility = View.GONE
        b.exEmpty.visibility = View.GONE
        showProgress(animate = false)
        showCombo()
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
        currentKind = e.kind
        var supported = true
        when (e.kind) {
            Kinds.MULTIPLE_CHOICE -> supported = buildChoice(e)
            Kinds.TRUE_FALSE_NOTGIVEN -> supported = buildTfng(e)
            Kinds.MATCHING -> supported = buildMatching(e)
            Kinds.GAP_FILL -> buildGap(e)
            Kinds.WORD_ORDER -> supported = buildOrder(e)
            Kinds.TRANSLATION -> buildTranslation(e)
            Kinds.MULTI_SELECT -> supported = buildMultiSelect(e)
            Kinds.DROPDOWN_CLOZE -> supported = buildDropdown(e)
            Kinds.SEQUENCE -> supported = buildSequence(e)
            Kinds.CATEGORIZE -> supported = buildCategorize(e)
            Kinds.SHORT_ANSWER -> buildShortAnswer(e)
            else -> supported = false
        }
        b.exUnsupported.visibility = if (supported) View.GONE else View.VISIBLE
        // Darvoza yopiq bo'lsa TEKSHIRISH tugmasi ham o'chiriladi (veb:
        // `<Button ... disabled={!canCheck || blocked}>`), javobni tanlash
        // esa mumkin — yuraklar o'rtada tiklanishi mumkin.
        b.exCheck.visibility = if (supported && !gateBlocked) View.VISIBLE else View.GONE
        b.exNext.visibility = View.GONE
        b.exSkip.visibility = if (supported) View.VISIBLE else View.GONE
        b.exFinish.visibility = View.VISIBLE
        b.resultCard.visibility = View.GONE
        b.exMascot.setMood(MascotView.Mood.NEUTRAL)
        b.exScroll.scrollTo(0, 0)

        // Harakat: mashq bloki pastdan kiradi (DULO mashq o'tish animatsiyasining
        // mohiyati — eski mashq yo'qoladi, yangisi kiradi). O'chirilganda view
        // darhol holatida qoladi (`Motion.enabled` tekshiriladi).
        Motion.stepIn(b.exInstruction, enter = true)
        Motion.stepIn(b.exSkill, enter = true)
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
        msChosen.clear()
        dcChoices = emptyArray()
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
                pressOnTouch(this)
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

    /**
     * Bosish mikrota'siri — DULO'dagidek: tugma bosilganda seziladi.
     * Uzamlik `pressMs` (`res/raw/motion_manifest.json` = 120 ms), vebda
     * `.aea-choice` sinfi (`src/index.css`) oranq bir xil bajariladi.
     *
     * Nega `ACTION_DOWN`da emas, bosish BOSHLANGANDA: `Motion.press` masshtabni
     * 0,97 dan 1,03 orqali 1 ga qaytaradi — ya'ni "bosilib, o'sib joyiga
     * tushadi". ACTION_UPni kutish tugmani sekinlashtirardi.
     *
     * `soundEffectsEnabled = false`: Android'ning o'z "klik" ovozi O'CHiriladi
     * — u tizim ovozi (boshqa studiyaning audiosiga o'xshash noise), bizning
     * javob ovozi esa `Motion.playFeedback` orqali javob BILAN bog'langan.
     */
    private fun pressOnTouch(v: View) {
        // Kotlin'da Java `setSoundEffectsEnabled(boolean)` — `isSoundEffectsEnabled`
        // (Java-getter nomining `is` bilan qaytarilishi).
        v.isSoundEffectsEnabled = false
        v.setOnTouchListener { view, ev ->
            if (ev.actionMasked == android.view.MotionEvent.ACTION_DOWN) Motion.press(view)
            false
        }
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
                pressOnTouch(this)
            }
            b.choiceGroup.addView(rb)
        }
        // `firstOrNull` INDEKS qaytaradi (View emas!) — shuning uchun kalit so'z
        // shu ro'yxatdan indeks bo'yicha olinadi. eski yozuv `(v as? RadioButton)`
        // Edit`da abadiy null qaytarardi (xato: "cast can never succeed") va
        // javob hamisha "javob berilmagan" deb qolardi.
        b.choiceGroup.setOnCheckedChangeListener { group, checkedId ->
            val i = (0 until group.childCount)
                .firstOrNull { group.getChildAt(it).id == checkedId }
            tfAnswer = i?.let { keys[it].first }
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
            pressOnTouch(this)
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
                    pressOnTouch(this)
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
            pressOnTouch(this)
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
        val picked = orderChosen.mapNotNull { bankTokens.getOrNull(it) }
        // Ketma-ketlikda har element alohida raqamlangan qatorda; so'z tartibida — bitta gap.
        b.orderAnswer.text =
            if (currentKind == Kinds.SEQUENCE) {
                picked.mapIndexed { i, s -> "${i + 1}. $s" }.joinToString("\n")
            } else {
                picked.joinToString(" ")
            }
        val used = HashSet(orderChosen)
        // `View` sifatida: word-order'da Chip, sequence'da MaterialButton turadi.
        for (i in 0 until b.orderBank.childCount) {
            val v = b.orderBank.getChildAt(i)
            v.isEnabled = !used.contains(i)
            v.alpha = if (used.contains(i)) 0.4f else 1.0f
        }
    }

    /** translation — erkin javob (matn maydoni). */
    private fun buildTranslation(e: Exercise) {
        b.transSource.text = e.source ?: e.question ?: e.instructionUz
        b.transField.setText("")
        b.transCard.visibility = View.VISIBLE
    }

    /* ------------------- 2026-11-08: yangi turlar (veb bilan bir xil) ------------------- */

    /** multi-select — checkbox'lar (javob: tanlangan indekslar ro'yxati). */
    private fun buildMultiSelect(e: Exercise): Boolean {
        val ctx = requireContext()
        val opts = e.options ?: emptyList()
        if (opts.isEmpty()) return false
        b.choiceQuestion.text = (e.question ?: e.instructionUz) + "\n" + getString(R.string.ex_multi_hint)
        b.choiceGroup.removeAllViews()
        b.choiceGroup.setOnCheckedChangeListener(null)
        for ((i, opt) in opts.withIndex()) {
            val cb = CheckBox(ctx).apply {
                text = opt
                id = View.generateViewId()
                setPadding(0, Rows.dp(ctx, 6), 0, Rows.dp(ctx, 6))
                pressOnTouch(this)
            }
            cb.setOnCheckedChangeListener { _, isChecked -> if (isChecked) msChosen.add(i) else msChosen.remove(i) }
            b.choiceGroup.addView(cb)
        }
        b.choiceCard.visibility = View.VISIBLE
        return true
    }

    /** dropdown-cloze — har bo'shliq uchun variant chip'lari (bittasini tanlash). */
    private fun buildDropdown(e: Exercise): Boolean {
        val ctx = requireContext()
        val choices = e.choices ?: emptyList()
        if (choices.isEmpty()) return false
        dcChoices = arrayOfNulls(choices.size)
        b.gapText.text = e.text ?: ""
        b.gapFields.removeAllViews()
        b.wordBank.removeAllViews()
        b.wordBank.visibility = View.GONE
        for ((slot, opts) in choices.withIndex()) {
            val label = TextView(ctx).apply {
                text = getString(R.string.ex_gap_slot, slot + 1)
                setPadding(0, Rows.dp(ctx, 8), 0, Rows.dp(ctx, 2))
            }
            b.gapFields.addView(label)
            val group = ChipGroup(ctx).apply { isSingleSelection = true }
            for (opt in opts) {
                val chip = Chip(ctx).apply {
                    text = opt
                    isCheckable = true
                    id = View.generateViewId()
                    pressOnTouch(this)
                }
                chip.setOnCheckedChangeListener { _, isChecked ->
                    if (isChecked) dcChoices[slot] = opt else if (dcChoices[slot] == opt) dcChoices[slot] = null
                }
                group.addView(chip)
            }
            b.gapFields.addView(group)
        }
        b.gapCard.visibility = View.VISIBLE
        return true
    }

    /** sequence — word-order mexanikasi, lekin butun gaplar va raqamlangan javob. */
    private fun buildSequence(e: Exercise): Boolean {
        val shuffled = e.itemsShuffled ?: emptyList()
        if (shuffled.isEmpty()) return false
        bankTokens = shuffled
        orderChosen.clear()
        b.orderNote.text = (e.question?.let { "$it\n" } ?: "") + getString(R.string.ex_seq_hint)
        b.orderBank.removeAllViews()
        // Butun gaplar: Chip uzun matnni bir qatorda kesadi — shuning uchun
        // ko'p qatorli MaterialButton (to'liq kenglikda) ishlatiladi.
        for ((i, item) in shuffled.withIndex()) {
            val btn = outlineButton(item)
            btn.tag = i
            btn.setOnClickListener { takeToken(i) }
            b.orderBank.addView(btn)
        }
        updateOrderUi()
        b.orderCard.visibility = View.VISIBLE
        return true
    }

    /** categorize — chapda elementlar, o'ngda guruhlar (juftlik mexanikasi). */
    private fun buildCategorize(e: Exercise): Boolean {
        val ctx = requireContext()
        val items = e.sortItems ?: emptyList()
        val cats = e.categories ?: emptyList()
        if (items.isEmpty() || cats.isEmpty()) return false
        leftLabels = items.map { it.text }
        for (item in items) {
            val btn = outlineButton(item.text)
            btn.setOnClickListener {
                chosenLeft = item.text
                markLeftSelection()
            }
            b.matchLeft.addView(btn)
        }
        for (c in cats) {
            val btn = outlineButton(c)
            btn.setOnClickListener {
                val left = chosenLeft
                if (left == null) {
                    Toast.makeText(ctx, R.string.ex_match_hint, Toast.LENGTH_SHORT).show()
                } else {
                    matches[left] = c
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

    /** short-answer — bitta qisqa matn maydoni (tarjima kartasi). */
    private fun buildShortAnswer(e: Exercise) {
        b.transSource.text = e.question ?: e.instructionUz
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
        Kinds.MULTI_SELECT -> msChosen.toList()
        Kinds.DROPDOWN_CLOZE -> dcChoices.map { it ?: "" }
        Kinds.SEQUENCE -> orderChosen.mapNotNull { bankTokens.getOrNull(it) }
        Kinds.CATEGORIZE -> {
            val cats = e.categories ?: emptyList()
            matches.mapValues { (_, c) -> cats.indexOf(c) }
        }
        Kinds.SHORT_ANSWER -> b.transField.text?.toString()?.trim()
        else -> null
    }

    private fun answerEmpty(e: Exercise): Boolean = when (e.kind) {
        Kinds.MULTIPLE_CHOICE -> chosenOption < 0
        Kinds.TRUE_FALSE_NOTGIVEN -> tfAnswer == null
        Kinds.MATCHING -> matches.isEmpty()
        Kinds.GAP_FILL -> gapFields.all { (it.text?.toString() ?: "").isBlank() }
        Kinds.WORD_ORDER -> orderChosen.isEmpty()
        Kinds.TRANSLATION -> (b.transField.text?.toString() ?: "").isBlank()
        Kinds.MULTI_SELECT -> msChosen.isEmpty()
        Kinds.DROPDOWN_CLOZE -> dcChoices.any { it.isNullOrEmpty() }
        Kinds.SEQUENCE -> orderChosen.size < (e.items?.size ?: 0)
        Kinds.CATEGORIZE -> matches.size < (e.sortItems?.size ?: 0)
        Kinds.SHORT_ANSWER -> (b.transField.text?.toString() ?: "").isBlank()
        else -> true
    }

    private fun onCheck() {
        val e = pool.getOrNull(index) ?: return
        if (checked) return
        // Ikkinchi tekshiruv: foydalanuvchi javobni tanlab bo'lguniga qadar
        // yuraklar tugagan bo'lishi mumkin. Holat HOZIR qayta o'qiladi —
        // eski ekran holatiga ishonib jarima qilinmaydi.
        if (heartsGateBlocked()) {
            Toast.makeText(requireContext(), R.string.hearts_blocked_title, Toast.LENGTH_SHORT).show()
            return
        }
        if (answerEmpty(e)) {
            Toast.makeText(requireContext(), R.string.ex_answer_empty, Toast.LENGTH_SHORT).show()
            return
        }

        val out = checkAnswer(e, buildAnswer(e))
        checked = true
        results.add(out)
        // Sakrash testi: natija MASHQ ID'I bo'yicha saqlanadi (veb
        // `acc.current[ex.id]`). `nextExerciseIndex` xatoni mustahkamlash uchun
        // bir mashqni qayta ko'rsatsa, oxirgi natija yoziladi va takror
        // ballni bo'lmaydi — bo'luvchi savollar soni.
        if (jumpSectionId != null) jumpOutcomes[e.id] = out
        // Jarayon chizig'i javob bilan BIRGA siljiydi (to'g'ri/noto'g'ri farqi
        // yo'q — vebdagi kabi: `answeredCount = index + 1` har tekshiruvda).
        showProgress(animate = true)

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

        // Combo satiri DISPATCHDAN KEYIN o'qiladi: `AppStore.dispatch` sinxron
        // (`_state.value = reduceLocal(...)`), shuning uchun hozirgi qadamning
        // natijasi allaqachon hisoblangan — eski ekrandagi son qaytarilmaydi.
        showCombo()

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

        /* ---- harakat qatlami (klonlangan mexanika) ----
           1. natija kartasi kiradi (`stepIn`) — DULO natija qatlamining
              fade/slide ko'rinishi;
           2. qahramon "sakraydi" (`pop`) — `duo_perfect_*.riv` masshtabli
              qahramon animatsiyasi o'rniga;
           3. XP soni ko'tarilib so'nadi (`flyXp`) — `…xp…/score…` animatsiyalari;
           4. tebranish (`tap`) — `.hla` fayllaridagi Duration/Amplitudes juftligi.
           Byudjet `res/raw/motion_manifest.json`da; hammasi `Motion.enabled`
           orqali o'chiriladi (emulator o'lchovlarimiz uzilmasligi uchun ham). */
        val ctx = requireContext()
        Motion.stepIn(b.resultCard, enter = true)
        if (out.correct) {
            Motion.pop(b.exMascot)
            Motion.flyXp(b.exMascot, getString(R.string.path_xp_fly, xp), R.color.ok)
            Motion.tap(ctx, durationMs = 30L, amplitude = 127)
        } else {
            Motion.flyXp(b.exMascot, getString(R.string.path_xp_fly, xp), R.color.err)
            /* Noto'g'ri — karta silkitiladi (`Motion.shake`). Vebda bu
               `.aea-outcome-wrong` sinfi (`src/index.css` dagi `@keyframes shake`):
               bosqichlar (-7, +6, -4, +2 dp) ikkala tomonda BIR XIL, vaqt esa
               mavjud `outcomeMs`dan (`res/raw/motion_manifest.json`) — YANGI SON
               YO'Q. Qahramon esa "umidlanish" kayfiyatida (`moodFromCorrect`) —
               masxaralama harakati qasddan yo'q. */
            Motion.shake(b.resultCard)
        }
        /* Javob ovozi — fayl YUKLAB OLINMAGAN: vebda Web Audio (`src/lib/feedbackSound.ts`),
           mobilda `Motion.playFeedback` toza PCM (`AudioTrack`) sintez qilinadi.
           Shuning uchun `public/audio/manifest.json`dagi "fayl bo'lmasa pleyer
           ko'rsatilmaydi" qoidasi buzilmaydi (soxta audio yo'q). Note chastotalari
           va uzamliklar (`popMs / 2`, `outcomeMs`) mavjud byudjetdan. */
        Motion.playFeedback(ctx, out.correct)
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
        // Jarayon yakunlanadi: chiziq JAVOB BERILGAN mashqlar hisobiga to'ladi
        // (o'tkazib yuborilganlar hisobga kirmaydi — son ixtir qilinmaydi).
        showProgress(animate = true)

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

        // Yakuniy hisob — DULO dars yakunidagi "bayram" qatlami: qahramon
        // sakraydi, XP ko'tariladi, tebranish bir marta (foydalanuvchi
        // o'chirmaganida). Natija past bo'lsa ham qahramon quvonchi saqlanadi —
        // urinish uchun (veb: `ex_result_summary`).
        if (Motion.enabled(requireContext())) {
            Motion.stepIn(b.summaryCard, enter = true)
            Motion.pop(b.summaryMascot)
            if (xpGained > 0) Motion.flyXp(b.summaryMascot, getString(R.string.path_xp_fly, xpGained), R.color.ok)
            Motion.tap(requireContext(), durationMs = 40L, amplitude = 127)
        }

        // SAKRASH TESTI (dayId YO'Q — kun testi emas): kun belgilanmaydi,
        // natija `applySectionJump`ga yoziladi (`StoreAction.SectionJump`).
        // DARS bonusi esa beriladi — veb `JumpTest::onNext` ham
        // `actions.completeLesson(...)` chaqiradi (qoida parity).
        if (jumpSectionId == null && total > 0 && dayId != null) {
            // Dars yakuni — o'yin qatlami: bonus XP va (0 xato bo'lsa) "xatosiz
            // dars" hisobi (`GameLogic.lessonComplete`, veb:
            // `actions.completeLesson(...)` — Grammar/Listening/Reading).
            // Bo'lim testi ham DARS hisoblanadi: yurak bu manbada jarima
            // qilinmaydi (`HEART_FREE_SOURCES`), lekin bonus beriladi — shu
            // sababli `source` ga qaramasdan chaqiriladi. Xatolar soni shu
            // yerda sanaladi (`results`dan bevosita).
            store.dispatch(StoreAction.LessonComplete(total, results.count { !it.correct }))
            if (source == Source.SECTION_TEST) {
                // Bo'lim testi: natija bilan birga belgilanadi (veb: passedTests).
                store.dispatch(StoreAction.DayComplete(dayId!!, contentId, percent))
            } else {
                offerDayComplete()
            }
        }
        if (jumpSectionId != null) finishJump()
        b.exScroll.scrollTo(0, b.summaryCard.top)
    }

    /**
     * Sakrash testini yakunlash (veb `JumpTest` natija bloki).
     *
     * BALL — `domain/jumpScore`: har savolga hissa (to'g'ri = 1, aks holda
     * `partial`), bo'luvchi — savollar soni. Pleyer mashqni qayta ko'rsatsa
     * takror sanalmaydi (`jumpOutcomes` — mashq id'i bo'yicha).
     */
    private fun finishJump() {
        val id = jumpSectionId ?: return
        // Yorliq REJADAN olinadi (`sectionLabelForId`) — ekranga o'tkazilgan
        // sarlavha ixtir bo'lib qolmasin; noma'lum id bo'lsa ochiq so'z.
        val label = sectionLabelForId(id) ?: getString(R.string.sec_title)
        val score = jumpScore(pool, jumpOutcomes)
        /* DARS bonusi (veb `JumpTest::onNext` ham `completeLesson` chaqiradi):
           sonlar — JAVOB BERILGAN mashqlar (takrorlar sanalmagan) va ulardan
           noto'g'rilari. Holat `jumpOutcomes`dan, ixtir son yo'q. */
        val answered = jumpOutcomes.size
        val wrong = jumpOutcomes.values.count { !it.correct }
        if (answered > 0) container().store.dispatch(StoreAction.LessonComplete(answered, wrong))
        b.jumpResultCard.visibility = View.VISIBLE
        b.jumpSummary.text = if (jumpPassed(score)) {
            getString(R.string.sec_jump_pass, score, JUMP_PASS_SCORE, label)
        } else {
            getString(R.string.sec_jump_fail, score, JUMP_PASS_SCORE)
        }
        b.jumpGoPath.visibility = if (jumpPassed(score)) View.VISIBLE else View.GONE
        b.jumpRetry.visibility = if (jumpPassed(score)) View.GONE else View.VISIBLE
        // Ikki tugma ham haqiqiy: "yo'lga o'tish" — O'quv yo'li ekrani,
        // "qayta urinish" — testni boshidan ochadi (veb `start()`).
        b.jumpGoPath.setOnClickListener { findNavController().navigate(R.id.learningPathFragment) }
        b.jumpRetry.setOnClickListener { restartJump() }
        b.jumpClose.setOnClickListener { findNavController().popBackStack() }
        container().store.dispatch(StoreAction.SectionJump(id, score))
        if (Motion.enabled(requireContext())) Motion.stepIn(b.jumpResultCard, enter = true)
    }

    /** Sakrash testini boshidan boshlash (veb `JumpTest::start`). */
    private fun restartJump() {
        results.clear()
        jumpOutcomes.clear()
        tried.clear()
        xpGained = 0
        b.jumpResultCard.visibility = View.GONE
        // Tugmalar holatini `showExercise` o'zi belgilaydi (310–313-satrlar) —
        // burada qayta yozilmaydi: bitta manba, ikki xil xulq bo'lmasligi uchun.
        showExercise(0)
        b.exScroll.scrollTo(0, 0)
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
