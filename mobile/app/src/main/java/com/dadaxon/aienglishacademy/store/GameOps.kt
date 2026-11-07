package com.dadaxon.aienglishacademy.store

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.GameConfig
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.domain.GameLogic

/**
 * O'yin qatlami bilan BIRGALASHTIRILGAN doiraviy amallar — [AppStore] ning
 * harakatlari shu funksiyalarni chaqiradi (mantiq ikki marta yozilmaydi).
 *
 * Nima uchun alohida fayl: [AppStore] Android `Context` talab qiladi, shuning
 * uchun unit testda qurilmaydi. Bu yerda esa SOF funksiqlar yozilgan —
 * `store/GameOpsTest.kt` ularni INTERNETSIZ tekshiradi.
 *
 * MANBA: veb `src/lib/store.tsx` (`reducer`: `attempt`, `srs`, `settings`,
 * `lesson-complete`, `game-buy`, `game-bet`, `game-settle` bandlari). Qoidalar
 * so'zma-so'z shu yerda: avval `settle()` (kun/yurak/sovg'alarni yig'adi),
 * keyin yangi natija yoziladi, oxirida yana `settle()`.
 */
object GameOps {

    /**
     * Veb: `settled(state)` — idempotent yig'uvchi. Hech narsa o'zgarmasa
     * SAYO BILAN BIR XIL obyekt qaytadi, shuning uchun chaqiruvchi keraksiz
     * saqlash/sinxron navbatini qo'zg'atmaydi.
     */
    fun settle(data: AppData, now: Long, key: String): AppData = GameLogic.settle(data, now, key)

    /**
     * Veb: `case 'attempt'`. `xp` ENDI `xpGain` orqali (byust faol bo'lsa ×2),
     * shuning uchun umumiy `xp` bilan `game.today.xp` BIR XIL o'sadi — aksi
     * holda quest/maqsad hisobi ekran ko'rsatgan XP dan orqada qolardi.
     *
     * `timerCoversSkill` — vebdagi `timerCoversThisSkill`: taymer yurarida
     * vaqt allaqachon devor-soat bo'yicha hisoblangan, ikki marta sanalmaydi.
     */
    fun attempt(
        data: AppData,
        r: AttemptRecord,
        key: String,
        timerCoversSkill: Boolean,
        now: Long,
    ): AppData {
        // Avval kun/yurak holati yangilanadi (kecha qolib ketgan `today` hisobi
        // bugungi mashqqa yozilib qolmasin — veb izohi bilan bir xil).
        val fresh = settle(data, now, key)
        val gained = GameLogic.xpGain(fresh.game, r.correct, r.difficulty, now)
        val game = GameLogic.afterAttempt(fresh.game, r.correct, r.source, gained, now)
        val cur = fresh.activity[key] ?: DayActivity(date = key)
        val secs = r.secondsSpent.coerceAtLeast(0)
        val skills = LinkedHashMap(cur.skills)
        if (!timerCoversSkill) {
            skills[r.skill] = (skills[r.skill] ?: 0) + secs
        } else if (skills[r.skill] == null) {
            skills[r.skill] = 0
        }
        val act = cur.copy(
            attempts = cur.attempts + 1,
            correct = cur.correct + (if (r.correct) 1 else 0),
            seconds = if (timerCoversSkill) cur.seconds else cur.seconds + secs,
            skills = skills,
        )
        val built = fresh.copy(
            attempts = (fresh.attempts + r).takeLast(AppData.LIMIT_ATTEMPTS),
            xp = fresh.xp + gained,
            game = game,
            activity = LinkedHashMap(fresh.activity).apply { put(key, act) },
        )
        return settle(built, now, key)
    }

    /**
     * Veb: `case 'srs'`. `reviewed` — HAQIQIY takror (birinchi marta
     * o'rganilgan so'z takror sanalmaydi), shu hisob `HEART_PRACTICE_REVIEWS`
     * yetganda bitta yurak qaytaradi va quest mezoniga yoziladi.
     */
    fun srs(
        data: AppData,
        vocabId: String,
        next: SrsState,
        firstLearn: Boolean,
        reviewed: Boolean,
        key: String,
        now: Long,
    ): AppData {
        val fresh = settle(data, now, key)
        val cur = fresh.activity[key] ?: DayActivity(date = key)
        val act = cur.copy(
            newWords = cur.newWords + (if (firstLearn) 1 else 0),
            reviewedWords = cur.reviewedWords + (if (firstLearn) 0 else 1),
        )
        val built = fresh.copy(
            srs = LinkedHashMap(fresh.srs).apply { put(vocabId, next) },
            game = GameLogic.afterReview(fresh.game, reviewed, now),
            activity = LinkedHashMap(fresh.activity).apply { put(key, act) },
        )
        return settle(built, now, key)
    }

    /**
     * Veb: `case 'settings'`. XP maqsadi FAQAT bosqich qiymati — ro'yxatdan
     * tashqari son ENG YAQIN bosqichga qaytadi (`GameConfig.nearestXpGoal`),
     * chunki DB `CHECK (50,100,200,300,500)` boshqa sonni rad etadi.
     */
    fun settings(data: AppData, patch: UserSettings): AppData =
        data.copy(
            settings = patch.copy(xpGoalXp = GameConfig.nearestXpGoal(patch.xpGoalXp)),
        )

    /** Veb: `case 'lesson-complete'` — dars bonusi va (0 xato bo'lsa) "xatosiz dars". */
    fun lesson(data: AppData, exercises: Int, mistakes: Int, key: String, now: Long): AppData =
        settle(GameLogic.lessonComplete(data, exercises, mistakes), now, key)

    /** Veb: `case 'game-buy'`. Sabab (`reasonUz`) ochiq qaytadi — ekranda ko'rsatiladi. */
    fun buy(data: AppData, item: String, key: String, now: Long): GameLogic.BuyOutcome {
        val res = GameLogic.buy(data, item, now)
        return if (res.ok) GameLogic.BuyOutcome(settle(res.data, now, key), true, null) else res
    }

    /** Veb: `case 'game-bet'` — "Double or Nothing". */
    fun bet(data: AppData, key: String, now: Long): GameLogic.BuyOutcome {
        val streak = GameLogic.streakWithFreezes(data, key)
        val res = GameLogic.placeBet(data, streak)
        return if (res.ok) GameLogic.BuyOutcome(settle(res.data, now, key), true, null) else res
    }
}
