package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.media.MediaPlayer
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.ListeningTask
import com.dadaxon.aienglishacademy.data.Source
import com.dadaxon.aienglishacademy.databinding.FragmentListeningBinding
import com.dadaxon.aienglishacademy.store.AppStore

/**
 * Tinglash ekrani — ro'yxat / bitta mashg'ulot (`Nav.ARG_ID`).
 *
 * Audio: `assets/audio/<fayl>` (fayl nomi `AudioAsset.src`dan olinadi —
 * `/audio/x.wav` → `audio/x.wav`), `MediaPlayer` `assetFd` orqali. Fayl
 * bo'lmasa YALON "ijro etildi" emas — `listening_audio_missing` +
 * `listening_no_audio` halol aytiladi va transkript/mashqlar bilan ishlash
 * mumkin bo'lib qoladi.
 *
 * Transkript siyosati: `transcriptPolicy == "after-first-listen"` bo'lsa
 * matn BIR marta ijrodan keyin ochiladi (avval o'qib yuborilmasin), aks holda
 * darhol ko'rsatiladi.
 */
class ListeningFragment : Fragment() {

    private var _b: FragmentListeningBinding? = null
    private val b get() = requireNotNull(_b)

    private var player: MediaPlayer? = null
    private var prepared = false

    /** Bir marta haqiqatan ijro etilganmi — transkript siyosati shunga qaraydi. */
    private var playedOnce = false

    /** Joriy mashg'ulot (layout holati, ma'lumot manbasi emas). */
    private var current: ListeningTask? = null

    /** Umumiy davomiylik (sekund) — `MediaPlayer` yoki `AudioAsset.durationSec`. */
    private var totalSec = 0

    private val ticker = Handler(Looper.getMainLooper())

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentListeningBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.listeningMascot.setMood(MascotView.Mood.NEUTRAL)
        // Audio tugmalari — listener BIR marta biriktiriladi (`render()` har
        // safar qayta chaqiriladi, ikkinchi marta qo'ysak qo'shaloq bo'lardi).
        b.listeningPlayPause.setOnClickListener { togglePlay() }
        b.listeningReplay.setOnClickListener { replay() }
        render()
    }

    /* ------------------------------ render ------------------------------ */

    private fun render() {
        val ctx = requireContext()
        Rows.clear(b.listeningRows)
        Rows.clear(b.listeningTranscriptRows)
        b.listeningEmpty.visibility = View.GONE

        val id = Nav.idArg(this)
        if (id == null) {
            releasePlayer()
            current = null
            renderList()
            return
        }
        val task = taskById(id)
        if (task == null) {
            releasePlayer()
            current = null
            b.listeningTitle.setText(R.string.listening_title)
            b.listeningSubtitle.text = ""
            b.listeningMascot.setMood(MascotView.Mood.SAD)
            b.listeningEmpty.setText(R.string.content_error)
            b.listeningEmpty.visibility = View.VISIBLE
            hideAudioUi()
            return
        }
        renderTask(task, ctx)
    }

    private fun renderList() {
        val ctx = requireContext()
        b.listeningTitle.setText(R.string.listening_title)
        b.listeningSubtitle.setText(R.string.listening_pick_hint)
        hideAudioUi()

        val items = tasksForCurrentLevel()
        if (items.isEmpty()) {
            b.listeningEmpty.setText(R.string.content_empty)
            b.listeningEmpty.visibility = View.VISIBLE
            b.listeningMascot.setMood(MascotView.Mood.SAD)
            return
        }
        for (t in items) {
            val meta = if (t.audio.fileAvailable) {
                getString(R.string.listening_source, t.audio.source)
            } else {
                getString(R.string.listening_no_audio)
            }
            b.listeningRows.addView(
                Rows.row(
                    ctx,
                    t.title,
                    meta,
                    trailing = getString(R.string.listening_exercises) + " · " + t.exercises.size,
                ) { Nav.open(this, R.id.listeningFragment, t.id, t.title) },
            )
        }
    }

    private fun renderTask(task: ListeningTask, ctx: Context) {
        current = task
        b.listeningTitle.text = task.title
        b.listeningSubtitle.text = getString(R.string.listening_exercises) + " · " + task.exercises.size
        b.listeningMascot.setMood(MascotView.Mood.HAPPY)

        releasePlayer()
        prepared = false
        totalSec = task.audio.durationSec?.takeIf { it.isFinite() }?.toInt() ?: 0

        // Manba va litsenziya — kontentda yozilgan, ixtir qilinmaydi.
        b.listeningRows.addView(Rows.small(ctx, getString(R.string.listening_source, task.audio.source)))
        if (task.audio.license.isNotBlank()) {
            b.listeningRows.addView(Rows.small(ctx, getString(R.string.listening_license, task.audio.license)))
        }
        if (task.audio.attribution.isNotBlank()) b.listeningRows.addView(Rows.small(ctx, task.audio.attribution))

        openAudio(task)
        renderTranscript(task)

        // Mashqlar bo'limi + boshlash tugmasi.
        b.listeningRows.addView(Rows.sectionTitle(ctx, getString(R.string.listening_exercises)))
        if (task.exercises.isEmpty()) {
            b.listeningRows.addView(Rows.small(ctx, getString(R.string.ex_exercises_empty)))
            b.listeningStart.visibility = View.GONE
        } else {
            b.listeningStart.visibility = View.VISIBLE
            b.listeningStart.setOnClickListener {
                Nav.openExercises(
                    this@ListeningFragment,
                    task.exercises.map { it.id },
                    task.id,
                    null,
                    Source.PRACTICE,
                    task.title,
                )
            }
        }
    }

    /* ------------------------------- audio ------------------------------- */

    /** `AudioAsset`dan `MediaPlayer` ochish — fayl bo'lmasa halol xabar. */
    private fun openAudio(task: ListeningTask) {
        val audio = task.audio
        if (!audio.fileAvailable || audio.src.isBlank()) {
            hideAudioUi()
            b.listeningNoAudio.visibility = View.VISIBLE
            return
        }
        // `src` veb yo'li (`/audio/a.wav`) — APK asset'i `audio/a.wav`.
        val assetPath = "audio/" + audio.src.trimEnd('/').substringAfterLast('/')
        try {
            val fd = requireContext().assets.openFd(assetPath)
            val made = MediaPlayer()
            try {
                made.setDataSource(fd.fileDescriptor, fd.startOffset, fd.length)
                made.prepare()
                prepared = true
            } finally {
                fd.close()
            }
            totalSec = made.duration / 1000
            made.setOnCompletionListener { onFinished() }
            made.setOnErrorListener { _, _, _ ->
                onFinished()
                true
            }
            player = made
            b.listeningNoAudio.visibility = View.GONE
            b.listeningAudioRow.visibility = View.VISIBLE
            b.listeningTime.visibility = View.VISIBLE
            b.listeningPlayPause.setText(R.string.listening_play)
            // Hozirgi holat — hali o'qilmagan: 00:00 / <umumiy>.
            showTime()
        } catch (err: Exception) {
            // Fayl yo'q yoki buzilgan — son/jarayon ixtir qilinmaydi.
            releasePlayer()
            b.listeningAudioRow.visibility = View.GONE
            b.listeningTime.visibility = View.GONE
            b.listeningNoAudio.visibility = View.VISIBLE
            Toast.makeText(requireContext(), R.string.listening_audio_missing, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showTime() {
        val box = _b ?: return
        if (!prepared && player == null) return
        box.listeningTime.text = getString(
            R.string.listening_time,
            AppStore.formatDuration(player?.currentPosition?.div(1000)?.toInt() ?: 0),
            AppStore.formatDuration(totalSec),
        )
    }

    private fun togglePlay() {
        val mp = player ?: run {
            Toast.makeText(requireContext(), R.string.listening_audio_missing, Toast.LENGTH_SHORT).show()
            return
        }
        if (mp.isPlaying) {
            mp.pause()
            stopTicker()
            b.listeningPlayPause.setText(R.string.listening_play)
            showTime()
        } else {
            // Ijro "birinchi tinglash" hisoblanadi — transkript shundan keyin ochiladi.
            playedOnce = true
            renderTranscript(current)
            mp.start()
            b.listeningPlayPause.setText(R.string.listening_pause)
            showTime()
            startTicker()
        }
    }

    private fun replay() {
        val mp = player ?: run {
            Toast.makeText(requireContext(), R.string.listening_audio_missing, Toast.LENGTH_SHORT).show()
            return
        }
        playedOnce = true
        renderTranscript(current)
        mp.seekTo(0)
        mp.start()
        b.listeningPlayPause.setText(R.string.listening_pause)
        showTime()
        startTicker()
    }

    /** Ijro tugadi/pauzaga olindi: tugma holati va vaqt yangilanadi. */
    private fun onFinished() {
        stopTicker()
        _b?.listeningPlayPause?.setText(R.string.listening_play)
        showTime()
    }

    private fun startTicker() {
        stopTicker()
        ticker.postDelayed({
            if (player?.isPlaying == true) {
                showTime()
                startTicker()
            }
        }, 500L)
    }

    private fun stopTicker() = ticker.removeCallbacksAndMessages(null)

    private fun hideAudioUi() {
        _b?.let {
            it.listeningAudioRow.visibility = View.GONE
            it.listeningTime.visibility = View.GONE
            it.listeningTime.text = ""
        }
    }

    private fun releasePlayer() {
        stopTicker()
        val mp = player
        player = null
        prepared = false
        runCatching { mp?.release() }
    }

    /* ---------------------------- transkript ----------------------------- */

    /**
     * Transkript ko'rsatish qoidasi: `after-first-listen` siyosatida matn faqat
     * BIR marta ijrodan keyin ochiladi; audio umuman bo'lmasa o'qish yagona
     * yo'l — shuning uchun darhol ochiladi.
     */
    private fun renderTranscript(task: ListeningTask?) {
        val box = _b ?: return
        if (task == null) {
            box.listeningTranscriptBox.visibility = View.GONE
            box.listeningTranscriptButton.visibility = View.GONE
            return
        }
        val noAudio = !task.audio.fileAvailable || task.audio.src.isBlank()
        val unlocked = playedOnce || task.transcriptPolicy != POLICY_AFTER_FIRST || noAudio

        box.listeningTranscriptButton.visibility = if (unlocked) View.GONE else View.VISIBLE
        box.listeningTranscriptButton.setOnClickListener {
            playedOnce = true
            renderTranscript(task)
            box.listeningScroll.smoothScrollTo(0, box.listeningTranscriptBox.top)
        }

        val segments = task.audio.transcript
        if (!unlocked) {
            box.listeningTranscriptBox.visibility = View.GONE
            return
        }
        Rows.clear(box.listeningTranscriptRows)
        box.listeningTranscriptTitle.setText(R.string.listening_transcript)
        box.listeningTranscriptNote.setText(R.string.listening_transcript_after)
        if (segments.isEmpty()) {
            // Siyosat ruxsat berdi, lekin kontentda transkript yo'q — halol aytamiz.
            box.listeningTranscriptRows.addView(Rows.small(requireContext(), getString(R.string.empty_generic)))
            box.listeningTranscriptBox.visibility = View.VISIBLE
            return
        }
        for (seg in segments) {
            box.listeningTranscriptRows.addView(
                Rows.small(
                    requireContext(),
                    AppStore.formatDuration((seg.start.coerceAtLeast(0.0)).toInt()) + " — " + seg.text,
                ),
            )
        }
        box.listeningTranscriptBox.visibility = View.VISIBLE
    }

    /* ---------------------------- kontent izlovi ------------------------- */

    private fun tasksForCurrentLevel(): List<ListeningTask> {
        val cr = container().content
        val level = runCatching { container().store.settings().currentLevel }.getOrDefault("")
        return runCatching { cr.bundle(level).listening }.getOrElse { emptyList() }
    }

    private fun taskById(id: String): ListeningTask? {
        val cr = container().content
        tasksForCurrentLevel().firstOrNull { it.id == id }?.let { return it }
        val levels = runCatching { cr.levels() }.getOrElse { emptyList() }
        for (lvl in levels) {
            val hit = runCatching { cr.bundle(lvl).listening }.getOrElse { emptyList() }.firstOrNull { it.id == id }
            if (hit != null) return hit
        }
        return null
    }

    override fun onDestroyView() {
        super.onDestroyView()
        releasePlayer()
        _b = null
    }

    companion object {
        /** Kontentdagi siyosat kaliti (`ListeningTask.transcriptPolicy`). */
        private const val POLICY_AFTER_FIRST = "after-first-listen"
    }
}
