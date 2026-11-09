/** Sinxron navbati: mahalliy holat → jadval yozuvlari (snake_case, DB CHECK bilan mos). */

import { type QueueItem } from './storage'
import { leagueWeek } from './game'
import type { AppData, MockExamAttempt, SpeakingSession, WritingSubmission } from './types'
import { clampDailyMinutes, nearestXpGoal } from './types'

export type NetState = 'online' | 'offline' | 'unknown'

export function networkStatus(): NetState {
  if (typeof navigator === 'undefined') return 'unknown'
  return navigator.onLine ? 'online' : 'offline'
}

/** AppData'ni DB yozuvlariga aylantirish (table, op, payload). */
export function toQueueItems(data: AppData): Omit<QueueItem, 'id' | 'tries'>[] {
  const uid = data.userId
  const items: Omit<QueueItem, 'id' | 'tries'>[] = []

  // Diqqat: PostgREST ustun nomlarini SNAKE_case kutadi. `...data.settings`
  // (camelCase) yuborilsa so'rov "column not found" bilan qaytadi va navbat
  // hech qachon tozalanmaydi — shuning uchun maydonlar bittalab aylantiriladi.
  items.push({
    table: 'user_settings',
    op: 'upsert',
    at: Date.now(),
    payload: {
      user_id: uid,
      // DB CHECK (30..240) bilan bir xil chegara: eski keshdagi 15–25 daqiqa
      // qiymati yozuvni abadiy rad ettirardi.
      daily_minutes: clampDailyMinutes(data.settings.dailyMinutes),
      current_level: data.settings.currentLevel,
      target_level: data.settings.targetLevel,
      exam_date: data.settings.examDate,
      allocation: data.settings.allocation,
      theme: data.settings.theme,
      ai_enabled: data.settings.aiEnabled,
      // Harakat (animatsiya) holati — `motion_enabled` ustuni
      // `supabase/migrations/0003_motion.sql`da qo'shilgan. Bu maydon
      // yuborilmasa boshqa qurilmada (mobil ilovada) yoqilgan/o'chirilgan
      // holat yo'qolardi — ikki tomonlama sinxron shart.
      motion_enabled: data.settings.motionEnabled,
      // O'yin qatlami sozlamalari — `supabase/migrations/0004_weekly_xp.sql`da
      // qo'shilgan ustunlar. `xp_goal_xp` FAQAT bosqich qiymati (DB CHECK ham
      // shuni tekshiradi), `hearts_enabled` — yuraklar tizimi.
      xp_goal_xp: nearestXpGoal(data.settings.xpGoalXp),
      hearts_enabled: data.settings.heartsEnabled,
    },
  })

  // O'quv yo'li (tugatilgan kunlar, test ballari), XP va diagnostika serverda
  // boshqa joyda saqlanmaydi — `plan` jsonb ustuniga yoziladi, aks holda
  // boshqa qurilmada yoki qayta kirganda yo'qolardi. Shuning uchun diagnostika
  // topshirilmagan bo'lsa ham yuboriladi.
  items.push({
    table: 'learning_plans',
    op: 'upsert',
    at: Date.now(),
    payload: {
      // PK default UUID bo'lgani uchun payload'da id bo'lmasa upsert har
      // safar yangi qator qo'shardi. Foydalanuvchiga bitta faol reja —
      // id'ni foydalanuvchi id'si bilan bir xil qilamiz (deterministik).
      id: uid,
      user_id: uid,
      current_level: data.settings.currentLevel,
      target_level: data.settings.targetLevel,
      diagnostic_level: data.diagnostic?.level ?? null,
      // `plan` — qurilmalar orasidagi yagona holat tashuvchisi:
      //   path/xp/diagnostic/onboardedAt (eski) + game (o'yin qatlami) +
      //   badges (yutuq nishonlari). `game.league` SAQLANMAYDI — liga jadvali
      //   `weekly_xp`dan o'qiladi (qator katta bo'lib, har yozuvda ko'chib
      //   yurmasin).
      plan: {
        path: data.path,
        xp: data.xp,
        diagnostic: data.diagnostic,
        onboardedAt: data.onboardedAt,
        badges: data.badges,
        selfAssessment: data.selfAssessment,
        game: { ...data.game, league: null },
      },
    },
  })

  // ---- Haftalik XP qatori (liga) — `0004_weekly_xp.sql` ----
  // Son `weeklyXp()`dan: urinishlardan aniq hisoblanadi, shuning uchun ikkala
  // mijoz BIR XIL son yuboradi (XP byusti va dars bonuslari KIRMAYDI — ular
  // qurilmaga bog'liq, liga jadvaliga aralashmaydi).
  {
    const wk = leagueWeek(data)
    items.push({
      table: 'weekly_xp',
      op: 'upsert',
      at: Date.now(),
      payload: {
        user_id: uid,
        week_start: wk.weekStart,
        xp: wk.xp,
        league_id: wk.leagueId,
        display_name: (data.profileName || '').slice(0, 60),
      },
    })
  }

  for (const a of data.attempts.slice(-500)) {
    items.push({
      table: 'exercise_attempts',
      op: 'upsert',
      at: a.at,
      payload: {
        id: a.id,
        user_id: uid,
        exercise_id: a.exerciseId,
        skill: a.skill,
        level: a.level,
        correct: a.correct,
        partial_score: a.partial,
        difficulty: a.difficulty,
        seconds_spent: a.secondsSpent,
        source: a.source,
        answer_text: a.answerGiven.slice(0, 2000),
        created_at: new Date(a.at).toISOString(),
      },
    })
  }

  for (const v of Object.entries(data.srs)) {
    items.push({
      table: 'user_vocabulary',
      op: 'upsert',
      at: Date.now(),
      payload: {
        user_id: uid,
        vocabulary_id: v[0],
        learned_at: v[1].learnedAt ? new Date(v[1].learnedAt).toISOString() : null,
        due_at: new Date(v[1].dueAt).toISOString(),
        interval_days: v[1].intervalDays,
        ease: v[1].ease,
        reps: v[1].reps,
        lapses: v[1].lapses,
        // Oxirgi takror vaqti — boshqa qurilmadagi holat bilan solishtirishda kerak.
        updated_at: new Date(v[1].lastReviewedAt ?? v[1].dueAt).toISOString(),
      },
    })
  }

  for (const [date, act] of Object.entries(data.activity)) {
    items.push({
      table: 'daily_activity',
      op: 'upsert',
      at: Date.now(),
      payload: {
        user_id: uid,
        day: date,
        seconds: act.seconds,
        attempts: act.attempts,
        correct: act.correct,
        new_words: act.newWords,
        reviewed_words: act.reviewedWords,
        skills: act.skills,
      },
    })
  }

  for (const w of data.writing.slice(-100)) pushWriting(items, uid, w)
  for (const s of data.speaking.slice(-100)) pushSpeaking(items, uid, s)
  for (const m of data.mockAttempts.slice(-20)) pushMock(items, uid, m)

  return items
}

export const pushWriting = (items: Omit<QueueItem, 'id' | 'tries'>[], uid: string, w: WritingSubmission) =>
  items.push({
    table: 'writing_submissions',
    op: 'upsert',
    at: w.createdAt,
    payload: {
      id: w.id,
      user_id: uid,
      task_id: w.taskId,
      text: w.text.slice(0, 20_000),
      word_count: w.wordCount,
      seconds_spent: w.secondsSpent,
      analysis: w.analysis,
      supersedes_id: w.supersedesId,
      created_at: new Date(w.createdAt).toISOString(),
    },
  })

export const pushSpeaking = (items: Omit<QueueItem, 'id' | 'tries'>[], uid: string, s: SpeakingSession) =>
  items.push({
    table: 'speaking_sessions',
    op: 'upsert',
    at: s.createdAt,
    payload: {
      id: s.id,
      user_id: uid,
      task_id: s.taskId,
      duration_sec: s.durationSec,
      // Ovoz fayli rozilikisiz serverga yuborilmaydi:
      audio_stored: false,
      transcript: s.transcript,
      transcription_engine: s.transcriptionEngine,
      analysis: s.analysis,
      text_answer: s.textAnswer,
      created_at: new Date(s.createdAt).toISOString(),
    },
  })

export const pushMock = (items: Omit<QueueItem, 'id' | 'tries'>[], uid: string, m: MockExamAttempt) =>
  items.push({
    table: 'mock_exam_attempts',
    op: 'upsert',
    at: m.completedAt,
    payload: {
      id: m.id,
      user_id: uid,
      exam_id: m.examId,
      sections: m.sections,
      total_score: m.totalScore,
      speaking_advisory: m.speakingAdvisory,
      completed_at: new Date(m.completedAt).toISOString(),
    },
  })
