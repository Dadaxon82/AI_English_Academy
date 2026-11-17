package com.dadaxon.aienglishacademy.data

/**
 * So'z rasmlari — tizim emoji belgilari (rasm fayli yo'q, tarmoq kerak emas).
 *
 * MANBA: veb `src/content/vocabEmoji.ts` (`VOCAB_EMOJI`) — ro'yxat BIR XIL.
 * Faqat ANIQ tasvirlanadigan so'zlar (narsa, joy, harakat) bor; mavhum
 * so'zlarga rasm ixtiro qilinmaydi. Paritet: `domain/QuickSessionTest`
 * veb faylini o'qib, har juftlikni solishtiradi.
 *
 * Kalit — `VocabularyItem.word` (kichik harfda).
 */
object VocabEmoji {
    val MAP: Map<String, String> = linkedMapOf(
        "hello" to "👋",
        "morning" to "🌅",
        "student" to "🧑‍🎓",
        "teacher" to "🧑‍🏫",
        "book" to "📕",
        "pen" to "🖊️",
        "pencil" to "✏️",
        "number" to "🔢",
        "happy" to "😊",
        "family" to "👨‍👩‍👧",
        "sister" to "👧",
        "brother" to "👦",
        "grandmother" to "👵",
        "grandfather" to "👴",
        "hair" to "💇",
        "quiet" to "🤫",
        "wake up" to "⏰",
        "breakfast" to "🥞",
        "brush" to "🪥",
        "lunch" to "🍱",
        "homework" to "📝",
        "o’clock" to "🕗",
        "dinner" to "🍲",
        "sleep" to "😴",
        "house" to "🏡",
        "kitchen" to "🍳",
        "bathroom" to "🛁",
        "window" to "🪟",
        "chair" to "🪑",
        "bed" to "🛏️",
        "wall" to "🧱",
        "lamp" to "💡",
        "sofa" to "🛋️",
        "bread" to "🍞",
        "rice" to "🍚",
        "egg" to "🥚",
        "apple" to "🍎",
        "cheese" to "🧀",
        "milk" to "🥛",
        "water" to "💧",
        "meat" to "🥩",
        "eat" to "🍽️",
        "drink" to "🥤",
        "cook" to "👩‍🍳",
        "market" to "🛒",
        "salad" to "🥗",
        "swim" to "🏊",
        "football" to "⚽",
        "basketball" to "🏀",
        "ride a bike" to "🚴",
        "bike" to "🚲",
        "dance" to "💃",
        "sing" to "🎤",
        "guitar" to "🎸",
        "cinema" to "🎬",
        "park" to "🏞️",
        "hills" to "⛰️",
        "bus" to "🚌",
        "metro" to "🚇",
        "train" to "🚆",
        "ticket" to "🎫",
        "airport" to "🛫",
        "drive" to "🚗",
        "left" to "⬅️",
        "right" to "➡️",
        "bridge" to "🌉",
        "railway station" to "🚉",
        "building" to "🏢",
        "museum" to "🏛️",
    )

    /** So'z rasmi (bo'lmasa null). Veb `vocabEmoji(word)`. */
    fun of(word: String): String? = MAP[word.trim().lowercase()]
}
