package com.dadaxon.aienglishacademy.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.RecognizerIntent
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.SpeakingAnalysis
import com.dadaxon.aienglishacademy.data.SpeakingSession
import com.dadaxon.aienglishacademy.data.SpeakingTask
import com.dadaxon.aienglishacademy.databinding.FragmentSpeakingBinding
import com.dadaxon.aienglishacademy.domain.analyzeSpeaking
import com.dadaxon.aienglishacademy.domain.analyzeSpeakingText
import com.dadaxon.aienglishacademy.domain.countWords
import com.dadaxon.aienglishacademy.store.AppStore
import com.dadaxon.aienglishacademy.store.StoreAction
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Gapirish ekrani — ro'yxat / bitta mavzu (`Nav.ARG_ID`).
 *
 * Ikki javob yo'li bir ekranda (veb bilan bir xil semantika):
 *  * **ovoz** — `MediaRecorder` qurilma xotirasida (`cacheDir`) yozadi;
 *    `audioBlobStored = false` — ovoz serverga YUBORILMAYDI (`speaking_disclosure`);
 *  * **matn** — mikrofon yoki nutqni tanib olish bo'lmasa halol muqobil
 *    (`speaking_no_speech` / `speaking_mic_denied`), bunda `analyzeSpeakingText`
 *    ravonlikni O'LMAYDI (`mode = "text"`) va plitkada "—" ko'rsatiladi.
 *
 * Nutqni tanib olish `RecognizerIntent` orqali — qurilmada vosita bo'lmasa
 * `ActivityNotFoundException` ushlanadi va matnli yo'l ochiq qoladi (son va
 * baho ixtir qilinmaydi).
 */
class SpeakingFragment : Fragment() {

    private var _b: FragmentSpeakingBinding? = null
    private val b get() = requireNotNull(_b)

    private var task: SpeakingTask? = null

    private var recorder: MediaRecorder? = null
    private var recordFile: File? = null
    private var player: MediaPlayer? = null

    /** Yozish boshlangan `elapsedRealtime` va hisoblangan sekund (o'lchangan). */
    private var recordStartedAt = 0L
    private var recordSeconds = 0

    /** Nutqdan olingan matn va maydon shu matndan to'ldimi (rejim shundan bilinadi). */
    private var recognizedText: String? = null
    private var answerFromSpeech = false
    private var fillingFromSpeech = false

    private val ticker = Handler(Looper.getMainLooper())

    private val askMic = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) startRecording() else voiceUnavailable()
    }

    private val askSpeech = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val heard = res.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.takeIf { it.isNotBlank() }
        if (heard == null) {
            // Tanib olish bo'ldi, lekin matn chiqmadi — ixtir qilinmaydi.
            Toast.makeText(requireContext(), R.string.speaking_no_speech, Toast.LENGTH_SHORT).show()
        } else {
            recognizedText = heard
            fillingFromSpeech = true
            b.speakingField.setText(heard)
            fillingFromSpeech = false
            answerFromSpeech = true
            updateWords()
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentSpeakingBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.speakingMascot.setMood(MascotView.Mood.NEUTRAL)
        render()
    }

    /* ------------------------------ render ------------------------------ */

    private fun render() {
        val ctx = requireContext()
        Rows.clear(b.speakingRows)
        Rows.clear(b.speakingResultRows)
        b.speakingEmpty.visibility = View.GONE

        val id = Nav.idArg(this)
        if (id == null) {
            stopEverything()
            task = null
            b.speakingFormBox.visibility = View.GONE
            renderList(ctx)
            return
        }
        val found = taskById(id)
        if (found == null) {
            stopEverything()
            task = null
            b.speakingFormBox.visibility = View.GONE
            b.speakingTitle.setText(R.string.speaking_title)
            b.speakingSubtitle.text = ""
            b.speakingMascot.setMood(MascotView.Mood.SAD)
            b.speakingEmpty.setText(R.string.content_error)
            b.speakingEmpty.visibility = View.VISIBLE
            return
        }
        task = found
        renderTask(found, ctx)
    }

    private fun renderList(ctx: Context) {
        b.speakingTitle.setText(R.string.speaking_title)
        b.speakingSubtitle.setText(R.string.speaking_pick_hint)

        val items = tasksForCurrentLevel()
        if (items.isEmpty()) {
            b.speakingEmpty.setText(R.string.content_empty)
            b.speakingEmpty.visibility = View.VISIBLE
            b.speakingMascot.setMood(MascotView.Mood.SAD)
            return
        }
        for (t in items) {
            b.speakingRows.addView(
                Rows.row(
                    ctx,
                    t.topicUz.ifBlank { t.questionEn },
                    getString(R.string.speaking_target, t.minSeconds, t.targetSeconds),
                    trailing = t.level,
                ) { Nav.open(this, R.id.speakingFragment, t.id, t.topicUz.ifBlank { t.id }) },
            )
        }
    }

    private fun renderTask(t: SpeakingTask, ctx: Context) {
        b.speakingTitle.text = t.topicUz.ifBlank { getString(R.string.speaking_title) }
        b.speakingSubtitle.text = getString(R.string.speaking_target, t.minSeconds, t.targetSeconds)
        b.speakingMascot.setMood(MascotView.Mood.HAPPY)

        b.speakingRows.addView(Rows.body(ctx, getString(R.string.speaking_question, t.questionEn)))
        t.hintUz?.takeIf { it.isNotBlank() }?.let { b.speakingRows.addView(Rows.small(ctx, getString(R.string.speaking_hint, it))) }
        if (t.textAlternative.isNotBlank()) b.speakingRows.addView(Rows.small(ctx, t.textAlternative))

        // Qayta savollar — kontentda bor bo'lganlar, soni cheklanmaydi.
        val follow = t.followUpsEn ?: emptyList()
        for (q in follow) b.speakingRows.addView(Rows.small(ctx, "→ $q"))

        openForm(t, ctx)
        renderHistory(ctx, t.id)
    }

    /* ------------------------------- javob ------------------------------- */

    private fun openForm(t: SpeakingTask, ctx: Context) {
        b.speakingFormBox.visibility = View.VISIBLE
        b.speakingSpeechNote.text = getString(R.string.speaking_disclosure)
        b.speakingSpeechNote.visibility = View.VISIBLE

        b.speakingRecord.setOnClickListener { onRecordClick() }
        b.speakingStop.setOnClickListener { stopRecording() }
        b.speakingRecognize.setOnClickListener { onRecognizeClick() }
        b.speakingPlay.setOnClickListener { playRecording() }
        b.speakingAnalyze.setOnClickListener { analyzeAndSave() }

        b.speakingField.addTextChangedListener(watcher)
        updateWords()
    }

    private val watcher = object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) = Unit
        override fun onTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) = Unit
        override fun afterTextChanged(s: Editable?) {
            if (!fillingFromSpeech) answerFromSpeech = false
            updateWords()
        }
    }

    private fun updateWords() {
        val box = _b ?: return
        val words = countWords(box.speakingField.text?.toString() ?: "")
        box.speakingWords.text = getString(R.string.writing_words, words)
    }

    /* ------------------------------ ovoz yo'li --------------------------- */

    private fun onRecordClick() {
        val granted = runCatching {
            requireContext().checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        }.getOrDefault(false)
        if (granted) startRecording() else askMic.launch(Manifest.permission.RECORD_AUDIO)
    }

    private fun startRecording() {
        val t = task ?: return
        stopRecording()
        playRecordingStop()

        val file = File(requireContext().cacheDir, "speaking-" + t.id + "-" + shortId() + ".m4a")
        val made = MediaRecorder()
        val ok = runCatching {
            made.setAudioSource(MediaRecorder.AudioSource.MIC)
            made.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            made.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            // `setOutputFile(String)` — API 1 dan barqaror (`setOutputPath`
            // faqat API 34; minSdk 26 da ishlamaydi).
            made.setOutputFile(file.absolutePath)
            made.prepare()
            made.start()
        }.isSuccess
        if (!ok) {
            runCatching { made.release() }
            runCatching { file.delete() }
            voiceUnavailable()
            return
        }
        recorder = made
        recordFile = file
        recordSeconds = 0
        recordStartedAt = SystemClock.elapsedRealtime()

        b.speakingTime.visibility = View.VISIBLE
        b.speakingTime.text = AppStore.formatDuration(0)
        b.speakingRecord.visibility = View.GONE
        b.speakingStop.visibility = View.VISIBLE
        b.speakingAudioRow.visibility = View.GONE
        startTicker()
    }

    /** Yozishni to'xtatish — davomiylik O'LCHANGAN vaqt dan olinadi. */
    private fun stopRecording() {
        val made = recorder ?: return
        recorder = null
        recordSeconds = ((SystemClock.elapsedRealtime() - recordStartedAt) / 1000L).toInt().coerceAtLeast(0)
        val ok = runCatching { made.stop() }.isSuccess
        runCatching { made.release() }
        stopTicker()
        if (!ok) {
            // Fayl yozilmadi — "yozildi" deb ko'rsatilmaydi.
            runCatching { recordFile?.delete() }
            recordFile = null
            voiceUnavailable()
        } else {
            b.speakingAudioLabel.text = getString(R.string.speaking_playing, AppStore.formatDuration(recordSeconds))
            b.speakingAudioRow.visibility = View.VISIBLE
        }
        b.speakingTime.text = AppStore.formatDuration(recordSeconds)
        b.speakingRecord.visibility = View.VISIBLE
        b.speakingStop.visibility = View.GONE
    }

    private fun voiceUnavailable() {
        Toast.makeText(requireContext(), R.string.speaking_mic_denied, Toast.LENGTH_SHORT).show()
        _b?.let {
            it.speakingRecord.visibility = View.VISIBLE
            it.speakingStop.visibility = View.GONE
            it.speakingTime.visibility = View.GONE
        }
    }

    private fun playRecording() {
        val file = recordFile?.takeIf { it.exists() } ?: run {
            Toast.makeText(requireContext(), R.string.listening_audio_missing, Toast.LENGTH_SHORT).show()
            return
        }
        playRecordingStop()
        val made = runCatching {
            MediaPlayer.create(requireContext(), Uri.fromFile(file)).apply {
                setOnCompletionListener { _b?.speakingPlay?.setText(R.string.speaking_play) }
            }
        }.getOrNull() ?: run {
            Toast.makeText(requireContext(), R.string.listening_audio_missing, Toast.LENGTH_SHORT).show()
            return
        }
        player = made
        made.start()
        b.speakingPlay.setText(R.string.listening_pause)
    }

    private fun playRecordingStop() {
        val mp = player
        player = null
        runCatching { mp?.release() }
        _b?.speakingPlay?.setText(R.string.speaking_play)
    }

    private fun onRecognizeClick() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            task?.questionEn?.takeIf { it.isNotBlank() }?.let { putExtra(RecognizerIntent.EXTRA_PROMPT, it) }
        }
        // Mikrofonsiz tizim so'rovi ham ishlaydi (vosita o'zi ruxsat so'raydi),
        // lekin qurilmada umuman vosita bo'lmasa launch urinishdan keyin
        // `ActivityNotFoundException` beradi — halol matnli yo'l qoladi.
        val ok = runCatching { askSpeech.launch(intent) }.isSuccess
        if (!ok) {
            // Qurilmada nutqni tanib olish yo'q — matnli javob taklif qilinadi.
            b.speakingSpeechNote.text = getString(R.string.speaking_no_speech)
            b.speakingSpeechNote.visibility = View.VISIBLE
            b.speakingRecognize.visibility = View.GONE
        }
    }

    private fun startTicker() {
        stopTicker()
        ticker.postDelayed({
            if (recorder != null) {
                val sec = ((SystemClock.elapsedRealtime() - recordStartedAt) / 1000L).toInt()
                _b?.speakingTime?.text = AppStore.formatDuration(sec)
                startTicker()
            }
        }, 1000L)
    }

    private fun stopTicker() = ticker.removeCallbacksAndMessages(null)

    /* --------------------------- tahlil + saqlash ------------------------ */

    private fun analyzeAndSave() {
        val t = task ?: return
        if (recorder != null) stopRecording()

        val fieldText = b.speakingField.text?.toString()?.trim() ?: ""
        val text = fieldText.ifBlank { recognizedText ?: "" }
        if (text.isBlank() && recordSeconds == 0) {
            // Ne matn, ne ovoz — baho ixtir qilinmaydi, yo'l ko'rsatiladi.
            Toast.makeText(requireContext(), R.string.speaking_text_hint, Toast.LENGTH_SHORT).show()
            return
        }

        // Matnli javob — `analyzeSpeakingText` (mode "text", ravonlik o'lchanmaydi);
        // nutqdan olingan matn — `analyzeSpeaking` (mode "audio", wpm o'lchanadi).
        val audioPath = answerFromSpeech && text.isNotBlank() && recordSeconds > 0
        val analysis: SpeakingAnalysis = if (audioPath) {
            analyzeSpeaking(text, recordSeconds, t)
        } else if (text.isNotBlank()) {
            analyzeSpeakingText(text, t)
        } else {
            // Faqat ovoz yozildi, transkript yo'q — hajm o'lchanadi, so'zlar yo'q.
            analyzeSpeaking("", recordSeconds, t)
        }

        val session = SpeakingSession(
            id = "s-" + shortId(),
            taskId = t.id,
            // Maxfiylik kelishuvi: ovoz faqat shu qurilmada qoladi, blob saqlanmaydi.
            audioBlobStored = false,
            durationSec = recordSeconds,
            transcript = text.takeIf { it.isNotBlank() },
            transcriptionEngine = if (answerFromSpeech && text.isNotBlank()) "device-speech" else "none",
            analysis = analysis,
            textAnswer = text.takeIf { it.isNotBlank() },
            createdAt = System.currentTimeMillis(),
        )
        container().store.dispatch(StoreAction.SpeakingAdd(session))

        // Mavzu savoli va maslahat ekranda qoladi — javobni tuzatib qayta
        // yuborish mumkin, natijalar esa alohida blokka chiziladi.
        Rows.clear(b.speakingResultRows)
        renderAnalysis(requireContext(), analysis)
        renderHistory(requireContext(), t.id)
        b.speakingMascot.setMood(MascotView.Mood.CHEER)
    }

    private fun renderAnalysis(ctx: Context, a: SpeakingAnalysis) {
        val mode = if (a.mode == "text") getString(R.string.speaking_mode_text) else getString(R.string.speaking_mode_audio)
        b.speakingResultRows.addView(Rows.sectionTitle(ctx, mode))
        if (a.engine == "rule-based") b.speakingResultRows.addView(Rows.small(ctx, getString(R.string.writing_engine_rule)))

        // Ko'rsatkichlar — plitkalar; o'lchanmagan kattalik "—" (soxta 0 emas).
        val none = getString(R.string.weekbar_none)
        val fluency = if (a.wpm <= 0.0) none else a.wpm.toInt().toString()
        val grammar = if (a.mode == "text" && a.grammar <= 0.0) none else "${a.grammar.toInt()}/5"
        val length = if (a.length <= 0.0) none else "${a.length.toInt()}/5"
        b.speakingResultRows.addView(
            Rows.statRow(
                ctx,
                Rows.statTile(ctx, fluency, getString(R.string.speaking_metric_fluency), if (a.mode == "text") getString(R.string.speaking_disclosure) else null),
                Rows.statTile(ctx, a.wordCount.toString(), getString(R.string.speaking_metric_words)),
                Rows.statTile(ctx, grammar, getString(R.string.speaking_metric_grammar)),
                Rows.statTile(ctx, length, getString(R.string.speaking_metric_length)),
            ),
        )

        if (a.notesUz.isNotEmpty()) {
            b.speakingResultRows.addView(Rows.sectionTitle(ctx, getString(R.string.writing_suggestions)))
            for (n in a.notesUz) b.speakingResultRows.addView(Rows.body(ctx, "• $n"))
        }
        // Disclaimer va maxfiylik — halol chegara.
        if (a.disclaimerUz.isNotBlank()) b.speakingResultRows.addView(Rows.small(ctx, a.disclaimerUz))
        b.speakingResultRows.addView(Rows.small(ctx, getString(R.string.speaking_disclosure)))
    }

    /* ------------------------------- tarix ------------------------------- */

    private fun renderHistory(ctx: Context, taskId: String) {
        val items = runCatching { container().store.speakingAll().filter { it.taskId == taskId } }.getOrElse { emptyList() }
        b.speakingResultRows.addView(Rows.sectionTitle(ctx, getString(R.string.speaking_history)))
        if (items.isEmpty()) {
            b.speakingResultRows.addView(Rows.body(ctx, getString(R.string.speaking_history_empty)))
            return
        }
        val df = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
        for (s in items.sortedByDescending { it.createdAt }) {
            val mode = if (s.analysis?.mode == "text") getString(R.string.speaking_mode_text) else getString(R.string.speaking_mode_audio)
            val sub = mode + " · " + AppStore.formatDuration(s.durationSec) +
                " · " + getString(R.string.writing_words, s.analysis?.wordCount ?: countWords(s.textAnswer ?: ""))
            b.speakingResultRows.addView(Rows.row(ctx, df.format(Date(s.createdAt)), sub))
        }
    }

    /* ---------------------------- kontent izlovi ------------------------- */

    private fun tasksForCurrentLevel(): List<SpeakingTask> {
        val cr = container().content
        val level = runCatching { container().store.settings().currentLevel }.getOrDefault("")
        return runCatching { cr.bundle(level).speaking }.getOrElse { emptyList() }
    }

    private fun taskById(id: String): SpeakingTask? {
        val cr = container().content
        tasksForCurrentLevel().firstOrNull { it.id == id }?.let { return it }
        val levels = runCatching { cr.levels() }.getOrElse { emptyList() }
        for (lvl in levels) {
            val bundle = runCatching { cr.bundle(lvl) }.getOrNull() ?: continue
            bundle.speaking.firstOrNull { it.id == id }?.let { return it }
            // Mock imtihonning gapirish topshirig'i `mockExam.sections` ichida
            // (`mock_start` shu id bilan ochadi) — qidiruvga qo'shiladi.
            bundle.mockExam?.sections?.firstNotNullOfOrNull { sec ->
                sec.speakingTask?.takeIf { it.id == id }
            }?.let { return it }
        }
        return null
    }

    private fun shortId(): String = UUID.randomUUID().toString().replace("-", "").take(12)

    private fun stopEverything() {
        stopTicker()
        val made = recorder
        recorder = null
        if (made != null) {
            runCatching { made.stop() }
            runCatching { made.release() }
        }
        playRecordingStop()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        stopEverything()
        _b?.speakingField?.removeTextChangedListener(watcher)
        _b = null
    }
}
