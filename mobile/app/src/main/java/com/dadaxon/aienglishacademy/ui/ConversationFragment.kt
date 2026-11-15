package com.dadaxon.aienglishacademy.ui

import android.content.Intent
import android.os.Bundle
import android.speech.RecognizerIntent
import android.text.InputFilter
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.dadaxon.aienglishacademy.BuildConfig
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.Dialogue
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.RoleplayClient
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.ModelCompare
import com.dadaxon.aienglishacademy.domain.RoleplayCorrection
import com.dadaxon.aienglishacademy.domain.RoleplayLine
import com.dadaxon.aienglishacademy.domain.RoleplayWord
import com.dadaxon.aienglishacademy.domain.Script
import com.dadaxon.aienglishacademy.domain.compareWithModel
import com.dadaxon.aienglishacademy.domain.dialoguesFor
import com.dadaxon.aienglishacademy.domain.matchVocab
import com.dadaxon.aienglishacademy.domain.roleplayFixId
import com.dadaxon.aienglishacademy.domain.roleplayRequestJson
import com.dadaxon.aienglishacademy.domain.scriptTurns
import com.dadaxon.aienglishacademy.store.StoreAction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * AI SUHBATDOSH (4-bosqich) — veb `src/pages/Conversation.tsx`.
 *
 * Dvigatel ekranda doim yoziladi: AI (`ai-roleplay`, `BuildConfig.AI_ENABLED`
 * + sozlama + hisob + internet) yoki oldindan yozilgan stsenariy (javob
 * namuna bilan solishtiriladi — baho emas). AI xatosida replika qaytariladi,
 * sabab ko'rsatiladi va stsenariyga o'tish taklif qilinadi.
 *
 * Yakunda AI tuzatishlari `rpfix-` mashqlariga aylanadi (mavjud pleyerda
 * ishlanadi; suhbat xatosi yurak olmaydi), lug'atimizda bor so'zlar SRS'ga.
 * Gapirish — tizim nutqni tanish oynasi (`RecognizerIntent`); audio yuborilmaydi.
 */
class ConversationFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    private data class ChatLine(
        val speaker: String,
        val text: String,
        val corrections: List<RoleplayCorrection>? = null,
        val compare: Pair<String, ModelCompare>? = null,
    )

    private var level: String = Levels.A1
    private var dlg: Dialogue? = null
    private var engineAi = false
    private var script: Script? = null
    private val lines = ArrayList<ChatLine>()
    private var pos = 0
    private var draft = ""
    private var busy = false
    private var error: String? = null
    private var finished = false
    private val words = ArrayList<RoleplayWord>()
    private var savedWords = false
    private var input: EditText? = null

    private val askSpeech = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val heard = res.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.takeIf { it.isNotBlank() }
        if (heard == null) {
            Toast.makeText(requireContext(), R.string.speaking_no_speech, Toast.LENGTH_SHORT).show()
        } else {
            draft = listOf(input?.text?.toString().orEmpty(), heard).filter { it.isNotBlank() }.joinToString(" ")
            render()
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        level = container().store.settings().currentLevel.takeIf { it == Levels.A1 || it == Levels.A2 } ?: Levels.A1
        b.shellTitle.setText(R.string.conv_title)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE
        render()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        input = null
        _b = null
    }

    /** AI ishlatiladimi (veb `aiRuntimeEnabled` bilan bir xil shartlar). */
    private fun aiOn(): Boolean {
        val c = container()
        return BuildConfig.AI_ENABLED && c.store.settings().aiEnabled && c.network.isOnline() && c.supabase != null && !c.auth.isGuest()
    }

    private fun start(d: Dialogue, ai: Boolean) {
        val s = scriptTurns(d)
        dlg = d
        engineAi = ai
        script = s
        lines.clear()
        lines += s.turns.firstOrNull()?.partner.orEmpty().map { ChatLine("partner", it) }
        pos = 0
        draft = ""
        error = null
        finished = false
        words.clear()
        savedWords = false
        UsageTracker.track(requireContext(), "conversation", started = true)
        render()
    }

    private fun finish() {
        if (!finished) UsageTracker.track(requireContext(), "conversation", started = false)
        finished = true
        render()
    }

    private fun send() {
        val text = (input?.text?.toString() ?: draft).trim()
        if (text.isEmpty() || busy || finished) return
        draft = ""
        if (engineAi) sendAi(text) else sendScript(text)
    }

    private fun sendScript(text: String) {
        val s = script ?: return
        val turn = s.turns.getOrNull(pos) ?: return
        lines += ChatLine("learner", text, compare = turn.modelEn to compareWithModel(text, turn.modelEn))
        val next = s.turns.getOrNull(pos + 1)
        if (next != null) lines += next.partner.map { ChatLine("partner", it) } else lines += s.closing.map { ChatLine("partner", it) }
        pos += 1
        if (next == null) finish() else render()
    }

    private fun sendAi(text: String) {
        val d = dlg ?: return
        lines += ChatLine("learner", text)
        busy = true
        error = null
        render()
        val body = roleplayRequestJson(d.level, d.situationUz, d.roles.a, d.roles.b, lines.map { RoleplayLine(it.speaker, it.text) })
        viewLifecycleOwner.lifecycleScope.launch {
            val r = withContext(Dispatchers.IO) { container().roleplay.request(body) }
            if (_b == null) return@launch
            busy = false
            when (r) {
                is RoleplayClient.Result.Fail -> {
                    lines.removeAt(lines.lastIndex)
                    draft = text
                    error = r.reasonUz
                    render()
                }
                is RoleplayClient.Result.Ok -> {
                    lines[lines.lastIndex] = ChatLine("learner", text, corrections = r.turn.corrections)
                    lines += ChatLine("partner", r.turn.reply)
                    for (w in r.turn.newWords) if (words.none { it.word.equals(w.word, ignoreCase = true) }) words += w
                    if (r.turn.done || lines.count { it.speaker == "learner" } >= MAX_LEARNER_TURNS) finish() else render()
                }
            }
        }
    }

    private fun render() {
        if (_b == null) return
        val ctx = requireContext()
        Rows.clear(b.rows)
        val d = dlg
        if (d == null) {
            b.shellSubtitle.setText(R.string.conv_intro)
            b.rows.addView(Rows.small(ctx, getString(if (aiOn()) R.string.conv_ai_on else R.string.conv_ai_off)))
            val row = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
            for (l in listOf(Levels.A1, Levels.A2)) {
                val btn = if (l == level) Rows.primaryButton(ctx, l) else Rows.button(ctx, l)
                btn.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { if (l == Levels.A1) marginEnd = Rows.dp(ctx, 8) }
                btn.setOnClickListener { level = l; render() }
                row.addView(btn)
            }
            b.rows.addView(row)
            val all = runCatching { container().content.dialogues() }.getOrElse { emptyList() }
            for (dl in dialoguesFor(all, level)) {
                b.rows.addView(Rows.row(ctx, dl.titleUz, dl.situationUz + "\n" + getString(R.string.conv_roles, dl.roles.a, dl.roles.b), null) { start(dl, aiOn()) })
            }
            return
        }

        b.shellSubtitle.text = d.titleUz
        b.rows.addView(Rows.small(ctx, getString(if (engineAi) R.string.conv_engine_ai else R.string.conv_engine_script) + " · " + d.situationUz))
        b.rows.addView(Rows.button(ctx, getString(R.string.conv_back)).apply { setOnClickListener { dlg = null; render() } })
        for (l in lines) {
            val who = if (l.speaker == "learner") d.roles.b else d.roles.a
            val sub = buildString {
                l.corrections?.let { cs ->
                    if (cs.isEmpty()) append(getString(R.string.conv_no_errors))
                    else cs.forEach { append("✗ ${it.original} → ✓ ${it.corrected}\n${it.whyUz}\n") }
                }
                l.compare?.let { (model, cmp) ->
                    append(getString(R.string.conv_model, model))
                    append("\n")
                    append(getString(R.string.conv_compare, cmp.matched.size, cmp.matched.size + cmp.missing.size))
                    if (cmp.missing.isNotEmpty()) append(" · " + cmp.missing.joinToString(", "))
                }
            }.trim()
            b.rows.addView(Rows.row(ctx, "$who: ${l.text}", sub.ifEmpty { null }, null))
        }
        if (busy) b.rows.addView(Rows.small(ctx, getString(R.string.conv_typing, d.roles.a)))

        if (!finished) {
            script?.turns?.getOrNull(pos)?.takeIf { !engineAi }?.let { b.rows.addView(Rows.small(ctx, getString(R.string.conv_hint, it.modelUz))) }
            val field = EditText(ctx).apply {
                setText(draft)
                hint = getString(R.string.conv_input)
                contentDescription = getString(R.string.conv_input)
                minLines = 2
                filters = arrayOf(InputFilter.LengthFilter(400))
            }
            input = field
            b.rows.addView(field)
            b.rows.addView(Rows.primaryButton(ctx, getString(R.string.conv_send)).apply { isEnabled = !busy; setOnClickListener { send() } })
            b.rows.addView(
                Rows.button(ctx, getString(R.string.conv_speak)).apply {
                    isEnabled = !busy
                    setOnClickListener {
                        draft = field.text.toString()
                        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
                            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                        }
                        if (runCatching { askSpeech.launch(intent) }.isFailure) {
                            Toast.makeText(ctx, R.string.speaking_no_speech, Toast.LENGTH_LONG).show()
                        }
                    }
                },
            )
            b.rows.addView(
                Rows.button(ctx, getString(R.string.conv_finish)).apply {
                    isEnabled = lines.any { it.speaker == "learner" }
                    setOnClickListener { finish() }
                },
            )
            error?.let { msg ->
                b.rows.addView(Rows.body(ctx, msg))
                b.rows.addView(Rows.button(ctx, getString(R.string.conv_to_script)).apply { setOnClickListener { start(d, false) } })
            }
            return
        }

        /* ---- yakun ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.conv_done)))
        if (!engineAi) {
            b.rows.addView(Rows.body(ctx, getString(R.string.conv_done_script)))
        } else {
            val corrections = lines.flatMap { it.corrections.orEmpty() }
            val ids = corrections.mapNotNull { roleplayFixId(it, d.level) }
            b.rows.addView(Rows.body(ctx, if (corrections.isEmpty()) getString(R.string.conv_done_clean) else getString(R.string.conv_done_fixes, corrections.size)))
            if (ids.isNotEmpty()) {
                b.rows.addView(
                    Rows.primaryButton(ctx, getString(R.string.conv_fix_lesson, ids.size)).apply {
                        setOnClickListener {
                            Nav.openExercises(this@ConversationFragment, ids, contentId = "roleplay:${d.id}", dayId = null, source = Source.PRACTICE, title = getString(R.string.conv_title), reorder = false)
                        }
                    },
                )
            }
            if (words.isNotEmpty()) {
                val pool = runCatching { container().content.allVocab() + container().content.allGlossaryVocab() }.getOrElse { emptyList() }
                val known = matchVocab(words, pool)
                b.rows.addView(Rows.small(ctx, words.joinToString(" · ") { "${it.word} — ${it.translationUz}" }))
                if (known.isEmpty()) {
                    b.rows.addView(Rows.small(ctx, getString(R.string.conv_words_none)))
                } else {
                    b.rows.addView(
                        Rows.button(ctx, getString(if (savedWords) R.string.conv_words_saved else R.string.conv_words_save, known.size)).apply {
                            isEnabled = !savedWords
                            setOnClickListener {
                                for (v in known) container().store.dispatch(StoreAction.SrsAdd(v.id))
                                savedWords = true
                                render()
                            }
                        },
                    )
                }
            }
        }
        b.rows.addView(Rows.button(ctx, getString(R.string.conv_again)).apply { setOnClickListener { start(d, aiOn()) } })
    }

    companion object {
        /** AI rejimida o'quvchining eng ko'p navbati (veb bilan bir xil). */
        const val MAX_LEARNER_TURNS = 10
    }
}
