package com.dadaxon.aienglishacademy.ui

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.StrikethroughSpan
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.PronunciationResult
import com.dadaxon.aienglishacademy.domain.comparePronunciation
import com.dadaxon.aienglishacademy.domain.pronunciationSentences
import java.util.Locale

/**
 * TALAFFUZ MASHQI (5-bosqich) — veb `src/pages/Pronunciation.tsx`.
 *
 * Namunani tinglash (TTS) → aytish (tizim nutqni tanish oynasi) → tanilgan
 * matn so'zma-so'z solishtiriladi: yashil — tanildi, qizil (ustidan chizilgan)
 * — tanilmadi. Ball «taxminiy moslik» — rasmiy talaffuz bahosi emas. Tizimda
 * nutqni tanish bo'lmasa sabab aytiladi, ball chiqmaydi. Audio yuborilmaydi.
 */
class PronunciationFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    private var level = Levels.A1
    private var idx = 0
    private var result: PronunciationResult? = null
    private var heard: String? = null
    private var confidence: Float? = null
    private var tries = 0
    private var sum = 0
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    private val askSpeech = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val text = res.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.takeIf { it.isNotBlank() }
        val target = sentences().getOrNull(idx)
        if (text == null || target == null) {
            Toast.makeText(requireContext(), R.string.speaking_no_speech, Toast.LENGTH_SHORT).show()
            return@registerForActivityResult
        }
        val r = comparePronunciation(target.en, text)
        heard = text
        confidence = res.data?.getFloatArrayExtra(RecognizerIntent.EXTRA_CONFIDENCE_SCORES)?.firstOrNull()?.takeIf { it > 0f }
        result = r
        tries += 1
        sum += r.score
        UsageTracker.track(requireContext(), "pronunciation", started = true)
        if (r.score >= 80) UsageTracker.track(requireContext(), "pronunciation", started = false)
        render()
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        level = container().store.settings().currentLevel.takeIf { it == Levels.A1 || it == Levels.A2 } ?: Levels.A1
        b.shellTitle.setText(R.string.pron_title)
        b.shellSubtitle.setText(R.string.pron_intro)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE
        tts = TextToSpeech(requireContext().applicationContext) { status -> ttsReady = status == TextToSpeech.SUCCESS }
        render()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        runCatching { tts?.stop() }
        runCatching { tts?.shutdown() }
        tts = null
        _b = null
    }

    private fun sentences() = pronunciationSentences(runCatching { container().content.dialogues() }.getOrElse { emptyList() }, level)

    private fun go(n: Int) {
        val size = sentences().size
        if (size == 0) return
        idx = ((n % size) + size) % size
        result = null
        heard = null
        confidence = null
        render()
    }

    private fun speak(text: String) {
        val e = tts
        val ok = e != null && ttsReady && runCatching { e.setLanguage(Locale.ENGLISH) }.getOrNull().let {
            it != null && it != TextToSpeech.LANG_MISSING_DATA && it != TextToSpeech.LANG_NOT_SUPPORTED
        } && runCatching { e!!.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pron-$idx") }.getOrDefault(-1) == TextToSpeech.SUCCESS
        if (!ok) Toast.makeText(requireContext(), R.string.vocab_tts_missing, Toast.LENGTH_SHORT).show()
    }

    private fun render() {
        if (_b == null) return
        val ctx = requireContext()
        Rows.clear(b.rows)
        val row = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
        for (l in listOf(Levels.A1, Levels.A2)) {
            val btn = if (l == level) Rows.primaryButton(ctx, l) else Rows.button(ctx, l)
            btn.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { if (l == Levels.A1) marginEnd = Rows.dp(ctx, 8) }
            btn.setOnClickListener { level = l; go(0) }
            row.addView(btn)
        }
        b.rows.addView(row)
        if (tries > 0) b.rows.addView(Rows.small(ctx, getString(R.string.pron_tally, tries, Math.round(sum.toDouble() / tries).toInt())))

        val list = sentences()
        val target = list.getOrNull(idx)
        if (target == null) {
            b.rows.addView(Rows.empty(ctx, getString(R.string.content_empty)))
            return
        }
        b.rows.addView(Rows.small(ctx, getString(R.string.ex_index, idx + 1, list.size)))

        // Namuna gap — natija bo'lsa so'zlar rangli (yashil: tanildi, qizil + chiziq: tanilmadi).
        val r = result
        val shown = if (r == null) SpannableStringBuilder(target.en) else SpannableStringBuilder().apply {
            for (w in r.words) {
                val start = length
                append(w.text)
                val color = if (w.ok) Color.rgb(4, 120, 87) else Color.rgb(190, 18, 60)
                setSpan(ForegroundColorSpan(color), start, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                if (!w.ok) setSpan(StrikethroughSpan(), start, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                append(' ')
            }
        }
        b.rows.addView(android.widget.TextView(ctx).apply { setTextAppearance(R.style.Text_Aea_Section); text = shown })
        if (DevicePrefs.immersion(ctx)) {
            b.rows.addView(
                Rows.small(ctx, getString(R.string.imm_reveal)).apply {
                    isClickable = true
                    setOnClickListener { text = target.uz; isClickable = false }
                },
            )
        } else {
            b.rows.addView(Rows.small(ctx, target.uz))
        }

        b.rows.addView(Rows.button(ctx, getString(R.string.pron_listen)).apply { setOnClickListener { speak(target.en) } })
        b.rows.addView(
            Rows.primaryButton(ctx, getString(if (r == null) R.string.pron_say else R.string.pron_say_again)).apply {
                setOnClickListener {
                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
                        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                        putExtra(RecognizerIntent.EXTRA_PROMPT, target.en)
                    }
                    if (runCatching { askSpeech.launch(intent) }.isFailure) {
                        Toast.makeText(ctx, R.string.pron_unsupported, Toast.LENGTH_LONG).show()
                    }
                }
            },
        )
        val nav = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
        for ((label, delta) in listOf(R.string.pron_prev to -1, R.string.pron_next to 1)) {
            val btn = Rows.button(ctx, getString(label))
            btn.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { if (delta < 0) marginEnd = Rows.dp(ctx, 8) }
            btn.setOnClickListener { go(idx + delta) }
            nav.addView(btn)
        }
        b.rows.addView(nav)

        if (r != null && heard != null) {
            val conf = confidence?.let { " · " + getString(R.string.pron_confidence, Math.round(it * 100)) } ?: ""
            b.rows.addView(Rows.body(ctx, getString(R.string.pron_score, r.score) + conf))
            b.rows.addView(Rows.small(ctx, getString(R.string.pron_heard, heard)))
            if (r.extra.isNotEmpty()) b.rows.addView(Rows.small(ctx, getString(R.string.pron_extra, r.extra.joinToString(", "))))
            b.rows.addView(Rows.small(ctx, getString(R.string.pron_tip)))
        }
    }
}
