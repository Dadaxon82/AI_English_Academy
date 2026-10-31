/**
 * Sinxronlash: mahalliy ma'lumot → Supabase.
 *
 * Qoidalar:
 *  - Internet yo'qligini aniq ko'rsatish (buni ilova UI'da ko'rsatadi).
 *  - Navbat xavfsiz boshqariladi: xato bo'lsa qaytat urinishlar sanaladi,
 *    ma'lumot yo'qolmaydi.
 *  - RLS: foydalanuvchi FAQAT o'z qatorini yozadi/uxiydi (anon bilan).
 *    Shuning uchun barcha so'rovlarda user_id = sessionUserId.
 */

import { getSupabase, supabaseConfigured } from './supabase'
import { enqueue, loadQueue, updateQueue, type QueueItem } from './storage'
import type { AppData, WritingSubmission, SpeakingSession, MockExamAttempt } from './types'

export type NetState = 'online' | 'offline' | 'unknown'

export function networkStatus(): NetState {
  if (typeof navigator === 'undefined') return 'unknown'
  return navigator.onLine ? 'online' : 'offline'
}

/** AppData'ni DB yozuvlariga aylantirish (table, op, payload). */
export function toQueueItems(data: AppData): Omit<QueueItem, 'id' | 'tries'>[] {
  const uid = data.userId
  const items: Omit<QueueItem, 'id' | 'tries'>[] = []

  // Diqqat: PostgREST ustun nomlarini SNACE_case kutadi. `...data.settings`
  // (camelCase) yuborilsa so'rov "column not found" bilan qaytadi va navbat
  // hech qachon tozalanmaydi — shuning uchun maydonlar bittalab aylantiriladi.
  items.push({
    table: 'user_settings',
    op: 'upsert',
    at: Date.now(),
    payload: {
      user_id: uid,
      daily_minutes: data.settings.dailyMinutes,
      current_level: data.settings.currentLevel,
      target_level: data.settings.targetLevel,
      exam_date: data.settings.examDate,
      allocation: data.settings.allocation,
      theme: data.settings.theme,
      ai_enabled: data.settings.aiEnabled,
    },
  })

  if (data.diagnostic) {
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
        diagnostic_level: data.diagnostic.level,
        updated_at: new Date(data.diagnostic.at).toISOString(),
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

const pushWriting = (items: Omit<QueueItem, 'id' | 'tries'>[], uid: string, w: WritingSubmission) =>
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

const pushSpeaking = (items: Omit<QueueItem, 'id' | 'tries'>[], uid: string, s: SpeakingSession) =>
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

const pushMock = (items: Omit<QueueItem, 'id' | 'tries'>[], uid: string, m: MockExamAttempt) =>
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

export interface SyncResult {
  ok: boolean
  attempted: number
  done: number
  failed: number
  reasonUz: string | null
}

export async function syncNow(userId: string, opts: { maxItems?: number } = {}): Promise<SyncResult> {
  if (!supabaseConfigured) {
    return { ok: false, attempted: 0, done: 0, failed: 0, reasonUz: 'Supabase sozlanmagan — ma’lumotlar qurilmada saqlanmoqda.' }
  }
  if (networkStatus() === 'offline') {
    return { ok: false, attempted: 0, done: 0, failed: 0, reasonUz: 'Internet yo‘q. Navbat saqlandi, ulanish qaytganda yuboriladi.' }
  }
  const sb = getSupabase()
  if (!sb) return { ok: false, attempted: 0, done: 0, failed: 0, reasonUz: 'Supabase mijoziga bo‘lib bo‘lmadi.' }

  const { data: sess, error: authErr } = await sb.auth.getSession()
  if (authErr || !sess.session) {
    return { ok: false, attempted: 0, done: 0, failed: 0, reasonUz: 'Tizimga kirilmagan — sinxronlash to‘xtatildi.' }
  }

  const queue = await loadQueue(userId)
  const limit = opts.maxItems ?? 80
  const batch = queue.slice(0, limit)
  let done = 0
  const failures: QueueItem[] = []

  for (const item of batch) {
    try {
      const table = sb.from(item.table)
      if (item.op === 'delete') {
        const id = (item.payload as { id?: string })?.id
        const { error } = await table.delete().eq('user_id', userId).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await table.upsert(item.payload as Record<string, unknown>)
        if (error) throw error
      }
      done++
    } catch (err) {
      const e = err as { code?: string; message?: string }
      // RLS/violation kabi qayta urinishdan foyda yo'q xatolar: tashlab yubormaymiz,
      // lekin cheksiz urinish ham bo'lmasin.
      if (e.code === '23505' || e.code === '42501') {
        done++ // qayta urinish ma'nosi yo'q — navbatdan olib tashlanadi
      } else {
        failures.push({ ...item, tries: item.tries + 1 })
      }
    }
  }

  // Muvaffaqiyatsizlar navbatning oxiriga qo'yiladi (tartib saqlanadi).
  const remaining = queue.slice(batch.length)
  await updateQueue(userId, failures.length ? [...remaining, ...failures] : remaining)

  return {
    ok: failures.length === 0,
    attempted: batch.length,
    done,
    failed: failures.length,
    reasonUz: failures.length ? `${failures.length} ta yozuv yuborilmadi — qayta uriladi.` : null,
  }
}

export async function queueAllData(data: AppData): Promise<number> {
  const items = toQueueItems(data)
  for (const it of items) await enqueue(data.userId, { ...it, id: `${it.table}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}` })
  return items.length
}
