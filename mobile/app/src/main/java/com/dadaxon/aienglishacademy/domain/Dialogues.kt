package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.Dialogue
import com.dadaxon.aienglishacademy.data.DialogueLine
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.Levels

/**
 * Real hayot suhbatlari (2-bosqich) — veb `src/content/dialogues.ts` va
 * `src/lib/lessons.ts::dialogueProgress` ning mobil nusxasi.
 *
 * Bo'shliq → tanlov mashqi `dlg-<suhbat>-<qator>`. Id va har maydon veb bilan
 * AYNAN bir xil (`DialoguesParityTest` eksport qilingan veb mashqlari bilan
 * solishtiradi) — vebdagi xato mobil Xatolar daftarida ham tiklanadi.
 */

const val DIALOGUE_PREFIX = "dlg-"

fun dialoguesFor(all: List<Dialogue>, level: String): List<Dialogue> =
    all.filter { it.level == level }.sortedBy { it.dayNumber }

fun gapLineIndexes(d: Dialogue): List<Int> = d.lines.indices.filter { d.lines[it].gap != null }

fun dialogueExerciseId(d: Dialogue, lineIndex: Int): String = "$DIALOGUE_PREFIX${d.id}-$lineIndex"

fun filledLine(line: DialogueLine): String = line.gap?.let { line.en.replaceFirst("___", it.answer) } ?: line.en

private fun role(d: Dialogue, speaker: String): String = if (speaker == "b") d.roles.b else d.roles.a

fun dialogueExercise(d: Dialogue, lineIndex: Int): Exercise? {
    val line = d.lines.getOrNull(lineIndex) ?: return null
    val gap = line.gap ?: return null
    val prev = if (lineIndex > 0) d.lines[lineIndex - 1] else null
    return Exercise(
        id = dialogueExerciseId(d, lineIndex),
        kind = Kinds.MULTIPLE_CHOICE,
        instructionUz = "Suhbatni davom ettiring: böş joyga mos variantni tanlang.",
        level = d.level,
        skill = gap.skill,
        explanationUz = "${gap.whyUz} Töliq: “${filledLine(line)}” — ${line.uz}",
        difficulty = if (d.level == Levels.A1) 1 else 2,
        tags = listOf("dialogue", d.id),
        passageExcerpt = prev?.let { "${role(d, it.speaker)}: ${it.en}" },
        question = "${role(d, line.speaker)}: ${line.en}",
        options = gap.options,
        answerIndex = gap.options.indexOf(gap.answer),
    )
}

/** `dlg-<suhbat id>-<qator>` → mashq; noma'lum yoki bo'shliqsiz qator — null. */
fun findDialogueExercise(id: String, all: List<Dialogue>): Exercise? {
    if (!id.startsWith(DIALOGUE_PREFIX)) return null
    val m = Regex("""^(.*)-(\d+)$""").find(id.removePrefix(DIALOGUE_PREFIX)) ?: return null
    val d = all.firstOrNull { it.id == m.groupValues[1] } ?: return null
    return dialogueExercise(d, m.groupValues[2].toInt())
}

data class DialogueProgress(val correct: Int, val tried: Int, val total: Int)

/** Har bo'shliqning ENG OXIRGI urinishi bo'yicha (holat alohida saqlanmaydi). */
fun dialogueProgress(d: Dialogue, attempts: List<AttemptRecord>): DialogueProgress {
    val ids = gapLineIndexes(d).map { dialogueExerciseId(d, it) }.toSet()
    val last = HashMap<String, AttemptRecord>()
    for (a in attempts) {
        if (a.exerciseId !in ids) continue
        val prev = last[a.exerciseId]
        if (prev == null || a.at >= prev.at) last[a.exerciseId] = a
    }
    return DialogueProgress(last.values.count { it.correct }, last.size, ids.size)
}
