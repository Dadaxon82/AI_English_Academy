/**
 * Sinxronlash: mahalliy ma'lumot ⇄ Supabase.
 *
 * Qoidalar:
 *  - Internet yo'qligini aniq ko'rsatish (buni ilova UI'da ko'rsatadi).
 *  - Navbat xavfsiz boshqariladi: xato bo'lsa qayta urinishlar sanaladi,
 *    ma'lumot yo'qolmaydi.
 *  - RLS: foydalanuvchi FAQAT o'z qatorini yozadi/o'qiydi (anon bilan).
 *    Shuning uchun barcha so'rovlarda user_id = sessionUserId.
 *  - Bitta "sinxronizatsiya" butun navbatni yuboradi; serverda borligi
 *    ma'lum (izi o'zgarmagan) yozuvlar qayta navbatga qo'yilmaydi.
 */


import { getSupabase, supabaseConfigured } from './supabase'
import { enqueueMany, loadQueue, loadSynced, saveSynced, updateQueue, type QueueItem } from './storage'
import { LEAGUE_BOARD_SIZE } from './gameConfig'
import type { RemoteSnapshot } from './merge'
import type { AppData } from './types'
import { networkStatus, toQueueItems } from './syncQueue'
import { OPTIONAL_COLUMNS, SchemaNotes, chunkForBulk, degradedPayload, errorMessage, fingerprint, fingerprintKey, isPermanent, isSchemaMissing, stopsRun, TABLE_REQUIRES_MIGRATION, type SyncResult } from './syncSupport'
import { isObj, rowsToSnapshot, type Row } from './syncRows'

// Ochiq API o'zgarmaydi — boshqa modullar va testlar `./sync`dan import qiladi.
export * from './syncQueue'
export * from './syncSupport'
export * from './syncRows'

/**
 * Navbatni serverga yuborish.
 *
 * ESKI BUG: har chaqiruv faqat navbat boshidagi 80 ta yozuvni olardi, tugma esa
 * oldin butun ma'lumotni qayta navbatga qo'yib, tartibni tiklardi — natijada
 * har safar O'SHA 80 ta yuborilib, qolganlari (lug'at, kunlik faollik, yozish,
 * mock…) serverga hech qachon yetmasdi. Endi butun navbat bo'shatiladi.
 */
export async function syncNow(userId: string, opts: { maxItems?: number } = {}): Promise<SyncResult> {
  const empty = { attempted: 0, done: 0, failed: 0, rejected: 0 }
  if (!supabaseConfigured) {
    return { ok: false, ...empty, reasonUz: 'Supabase sozlanmagan — ma’lumotlar qurilmada saqlanmoqda.' }
  }
  if (networkStatus() === 'offline') {
    return { ok: false, ...empty, reasonUz: 'Internet yo‘q. Navbat saqlandi, ulanish qaytganda yuboriladi.' }
  }
  const sb = await getSupabase()
  if (!sb) return { ok: false, ...empty, reasonUz: 'Supabase mijoziga ulanib bo‘lmadi.' }

  const { data: sess, error: authErr } = await sb.auth.getSession()
  if (authErr || !sess.session) {
    return { ok: false, ...empty, reasonUz: 'Tizimga kirilmagan — sinxronlash to‘xtatildi.' }
  }

  const queue = await loadQueue(userId)
  const batch = queue.slice(0, opts.maxItems ?? queue.length)
  const synced = await loadSynced(userId)
  let done = 0
  let rejected = 0
  let stopped = false
  const failures: QueueItem[] = []
  const notes = new SchemaNotes()

  /**
   * Yozuv serverga yetdi. `sent` — HAQIQIY yuborilgan qator: bazaga eski
   * sxemaga moslashtirib (ustun tushirib) yuborsak izi SHU qator bo'yicha
   * qo'yiladi. Shunda migratsiya qo'llanilgandan keyin `queueAllData` izning
   * mahalliy holat bilan mos kelmasligini ko'radi va sozlamalarni o'zi
   * qayta yuboradi (tushirilgan ustunlar endi to'ldiriladi).
   */
  const markDone = (item: QueueItem, sent?: Record<string, unknown>) => {
    done++
    const k = fingerprintKey(item.table, item.payload)
    if (k) synced[k] = fingerprint(sent ?? item.payload)
  }
  const fail = (item: QueueItem, code: string | undefined) => {
    if (stopsRun(code)) stopped = true
    if (isPermanent(code)) rejected++
    else failures.push({ ...item, tries: item.tries + 1 })
  }
  const attempt = async (table: string, payload: Record<string, unknown> | Record<string, unknown>[], bulk = false) => {
    try {
      const { error } = await sb.from(table).upsert(payload, bulk ? { defaultToNull: false } : undefined)
      return { ok: !error, code: error?.code, message: errorMessage(error) }
    } catch (err) {
      return { ok: false, code: (err as { code?: string }).code, message: errorMessage(err) }
    }
  }
  const sendOne = async (item: QueueItem) => {
    // Tarmoq/sessiya yiqilgan bo'lsa urinib o'tirmaymiz — keyingi sinxronda.
    if (stopped) {
      failures.push({ ...item, tries: item.tries + 1 })
      return
    }
    if (item.op === 'delete') {
      try {
        const { error } = await sb
          .from(item.table)
          .delete()
          .eq('user_id', userId)
          .eq('id', (item.payload as { id?: string })?.id)
        if (error) fail(item, error.code)
        else markDone(item)
      } catch (err) {
        fail(item, (err as { code?: string }).code)
      }
      return
    }

    const optional = OPTIONAL_COLUMNS[item.table]
    let payload = item.payload as Record<string, unknown>
    let res = await attempt(item.table, payload, false)
    let degraded = false

    // Baza eski: xatoda aytilgan ustunni tushirib qayta uriramiz. Har urinishda
    // PostgREST BITTA ustunni aytadi, shuning uchun sikl ustunlar soniga
    // chegaralanadi (cheksiz takrorlanmasin).
    if (optional) {
      let guard = 0
      while (!res.ok && isSchemaMissing(res.code) && guard < Object.keys(optional).length) {
        const step = degradedPayload(item.table, payload, res.message)
        if (!step.payload) break
        notes.noteColumnsDropped(item.table, step.dropped, res.message)
        payload = step.payload!
        degraded = true
        res = await attempt(item.table, payload, false)
        guard++
      }
    }

    if (res.ok) {
      // `sent` FAQAT ustun tushirilgan bo'lsa: aks holda iz asl payload bo'yicha
      // qo'yiladi (bo'sh joyna izi har sinxronda qatorni qayta yuborardi).
      markDone(item, degraded ? payload : undefined)
      return
    }
    // Jadval butunlay yo'q (`weekly_xp` → PGRST205): qator NAVBATDA qoladi —
    // izi yozilmagani uchun migratsiya qo'llanilgach avtomatik qayta yuboriladi.
    if (isSchemaMissing(res.code) && TABLE_REQUIRES_MIGRATION[item.table]) {
      notes.noteTable(item.table)
      failures.push({ ...item, tries: item.tries + 1 })
      return
    }
    fail(item, res.code)
  }

  for (const chunk of chunkForBulk(batch)) {
    if (stopped || chunk.length === 1 || chunk[0]!.op === 'delete') {
      for (const it of chunk) await sendOne(it)
      continue
    }
    const table = chunk[0]!.table
    let rows: Record<string, unknown>[] = chunk.map((it) => it.payload as Record<string, unknown>)
    let res = await attempt(table, rows, true)
    let degraded = false

    // Baza eskiligi butun bo'lakka tegishli (bir jadval), shuning uchun
    // tushirilgan ustunlar bir marta HAMMA qatorga qo'llanadi.
    if (OPTIONAL_COLUMNS[table]) {
      let guard = 0
      while (!res.ok && isSchemaMissing(res.code) && guard < Object.keys(OPTIONAL_COLUMNS[table]!).length) {
        const step = degradedPayload(table, rows[0]!, res.message)
        if (!step.payload) break
        notes.noteColumnsDropped(table, step.dropped, res.message)
        rows = rows.map((r) => degradedPayload(table, r, res.message).payload ?? r)
        degraded = true
        res = await attempt(table, rows, true)
        guard++
      }
    }

    if (res.ok) {
      chunk.forEach((it, i) => markDone(it, degraded ? rows[i] : undefined))
    } else if (stopsRun(res.code)) {
      // Tarmoq yoki sessiya xatosi: bu va qolgan bo'laklar keyingi sinxronda.
      stopped = true
      for (const it of chunk) failures.push({ ...it, tries: it.tries + 1 })
    } else if (isSchemaMissing(res.code) && TABLE_REQUIRES_MIGRATION[table]) {
      // Jadval butunlay yo'q — butun bo'lak navbatda qoladi (izi yozilmaydi).
      notes.noteTable(table)
      for (const it of chunk) failures.push({ ...it, tries: it.tries + 1 })
    } else {
      // Bo'lakda bitta yaroqsiz qator butun so'rovni yiqitadi — qatorlarni
      // alohida yuborib, faqat aybdorini ajratamiz.
      for (const it of chunk) await sendOne(it)
    }
  }

  await saveSynced(userId, synced)
  // Muvaffaqiyatsizlar navbatning oxiriga qo'yiladi (tartib saqlanadi).
  await updateQueue(userId, [...queue.slice(batch.length), ...failures])

  const failed = failures.length
  const reasons: string[] = []
  if (failed) reasons.push(`${failed} ta yozuv yuborilmadi — keyingi sinxronda qayta uriladi.`)
  if (rejected) reasons.push(`${rejected} ta yozuvni server qabul qilmadi (ma’lumot yoki ruxsat xatosi).`)
  // Sabab ochiq aytiladi: "qabul qilinmadi" yetarli emas — foydalanuvchi
  // nimani qilishi kerakligini bilishi kerak (SQL Editor'da migratsiya).
  if (!notes.empty) reasons.push(`Baza eski sxemada — ${notes.text()}. Supabase SQL Editor’ida shu skriptni bir marta bajaring.`)
  return { ok: failed === 0 && rejected === 0, attempted: batch.length, done, failed, rejected, reasonUz: reasons.length ? reasons.join(' ') : null }
}

/**
 * Butun holatni navbatga qo'yish — lekin serverda allaqachon AYNAN shu
 * ko'rinishda bor yozuvlar (izi mos) qayta qo'yilmaydi.
 */
export async function queueAllData(data: AppData): Promise<number> {
  const all = toQueueItems(data)
  const synced = await loadSynced(data.userId)
  const pending = all.filter((it) => {
    const k = fingerprintKey(it.table, it.payload)
    return k === null || synced[k] !== fingerprint(it.payload)
  })
  // Endi holatda yo'q yozuvlar izini tozalaymiz (masalan 500 tadan eski urinishlar).
  const live = new Set(all.map((it) => fingerprintKey(it.table, it.payload)))
  const kept = Object.entries(synced).filter(([k]) => live.has(k))
  if (kept.length !== Object.keys(synced).length) await saveSynced(data.userId, Object.fromEntries(kept))
  const stamp = Date.now()
  await enqueueMany(
    data.userId,
    pending.map((it, i) => ({ ...it, id: `${it.table}:${stamp}:${i}` })),
  )
  return pending.length
}

/* ------------------------------ o'chirish ------------------------------ */

/** Foydalanuvchining shaxsiy jadvallari ("Barcha ma'lumotni o'chirish" shularni tozalaydi). */
const PERSONAL_TABLES = [
  'exercise_attempts',
  'user_vocabulary',
  'daily_activity',
  'writing_submissions',
  'speaking_sessions',
  'mock_exam_attempts',
  'learning_plans',
  'user_settings',
  'weekly_xp',
] as const

/**
 * Serverdagi barcha shaxsiy yozuvlarni o'chirish (RLS: faqat o'z qatorlari).
 * `profiles` qatori qoldiriladi — u hisobning o'zi (auth bilan bog'langan).
 *
 * ESKI KAMCHILIK: "Barcha ma'lumotni o'chirish" faqat qurilmani tozalardi;
 * endi hisobga kirganda progress serverdan tiklangani uchun serverdagi
 * yozuvlar qolsa, o'chirilgan ma'lumot keyingi kirishda qaytib kelardi.
 */
export async function deleteRemoteData(userId: string): Promise<{ ok: boolean; reasonUz: string | null }> {
  if (!supabaseConfigured) return { ok: true, reasonUz: null }
  if (networkStatus() === 'offline') return { ok: false, reasonUz: 'Internet yo‘q — serverdagi ma’lumot o‘chirilmadi.' }
  const sb = await getSupabase()
  if (!sb) return { ok: false, reasonUz: 'Supabase mijoziga ulanib bo‘lmadi.' }
  const { data: sess, error: authErr } = await sb.auth.getSession()
  if (authErr || !sess.session || sess.session.user.id !== userId) {
    return { ok: false, reasonUz: 'Tizimga kirilmagan — serverdagi ma’lumot o‘chirilmadi.' }
  }
  // 2026-11-08: `weekly_xp` jadvali bazada bo'lmasa (0004 qo'llanmagan) DELETE
  // 404 PGRST205 beradi — chaqiruvchi buni "o'chirib bo'lmadi" deb Butun
  // amalni to'xtatardi va foydalanuvchi ma'lumotini O'CHIRA OLMASDI. Jadval
  // yo'q bo'lsa o'chiriladigan yozuv ham yo'q: unday jadval o'tkazib
  // yuboriladi, sababi esa halol aytiladi.
  const notes = new SchemaNotes()
  for (const table of PERSONAL_TABLES) {
    try {
      const { error } = await sb.from(table).delete().eq('user_id', userId)
      if (!error) continue
      if (isSchemaMissing(error.code) && TABLE_REQUIRES_MIGRATION[table]) {
        notes.noteTable(table)
        continue
      }
      return { ok: false, reasonUz: 'Serverdagi ma’lumotni o‘chirib bo‘lmadi. Keyinroq qayta urinib ko‘ring.' }
    } catch (err) {
      const code = (err as { code?: string }).code
      if (isSchemaMissing(code) && TABLE_REQUIRES_MIGRATION[table]) {
        notes.noteTable(table)
        continue
      }
      return { ok: false, reasonUz: 'Serverdagi ma’lumotni o‘chirib bo‘lmadi. Internetni tekshiring.' }
    }
  }
  if (notes.empty) return { ok: true, reasonUz: null }
  return {
    ok: true,
    reasonUz: `Ma’lumot o‘chirildi, lekin baza eski sxemada — ${notes.text()}. O‘chiriladigan yozuv bu jadvalda yo‘q edi.`,
  }
}

export interface PullResult {
  ok: boolean
  snapshot: RemoteSnapshot | null
  reasonUz: string | null
}

/** Foydalanuvchining serverdagi ma'lumotini o'qish (RLS: faqat o'z qatorlari). */
export async function pullRemote(userId: string): Promise<PullResult> {
  if (!supabaseConfigured) return { ok: false, snapshot: null, reasonUz: 'Supabase sozlanmagan.' }
  if (networkStatus() === 'offline') return { ok: false, snapshot: null, reasonUz: 'Internet yo‘q.' }
  const sb = await getSupabase()
  if (!sb) return { ok: false, snapshot: null, reasonUz: 'Supabase mijoziga ulanib bo‘lmadi.' }
  const { data: sess, error: authErr } = await sb.auth.getSession()
  // Boshqa foydalanuvchining sessiyasi bilan o'qilgan ma'lumot bu holatga aralashmasin.
  if (authErr || !sess.session || sess.session.user.id !== userId) {
    return { ok: false, snapshot: null, reasonUz: 'Tizimga kirilmagan.' }
  }
  const failRead: PullResult = { ok: false, snapshot: null, reasonUz: 'Serverdagi ma’lumotni o‘qib bo‘lmadi.' }
  try {
    const own = (table: string) => sb.from(table).select('*').eq('user_id', userId)
    const [settings, plan, attempts, vocabulary, activity, writing, speaking, mocks, profile, ownWeekly] = await Promise.all([
      own('user_settings').maybeSingle(),
      own('learning_plans').order('updated_at', { ascending: false }).limit(1),
      own('exercise_attempts').order('created_at', { ascending: false }).limit(500),
      own('user_vocabulary'),
      own('daily_activity').order('day', { ascending: false }).limit(400),
      own('writing_submissions').order('created_at', { ascending: false }).limit(100),
      own('speaking_sessions').order('created_at', { ascending: false }).limit(100),
      own('mock_exam_attempts').order('completed_at', { ascending: false }).limit(20),
      // Profil nomi — liga tablasida o'z ismimiz ko'rinishi uchun (RLS: o'z qatori).
      sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
      // O'z haftalik XP qatorlarimiz — qaysi hafta/lichamizni shundan bilamiz.
      own('weekly_xp').order('week_start', { ascending: false }).limit(2),
    ])
    if ([settings, plan, attempts, vocabulary, activity, writing, speaking, mocks].some((r) => r.error)) return failRead
    const list = (v: unknown): Row[] => (Array.isArray(v) ? v.filter(isObj) : [])
    const ownWeeklyRows = list(ownWeekly.data)
    // Liga tablasini o'qish IKKINCHI QADAM: hafta va liga id'si yuqoridagi
    // o'qishdan keladi (boshqa qurilmada yuborilgan hafta ham shu yerda).
    // So'rov xato bo'lsa — `leagueRows` bo'sh qoladi: snapshotning eski qiymati
    // saqlanadi,.son ixtir QILINMAYDI (hisobda "ko'rsatilgan holat" ko'rinadi).
    let leagueRows: Row[] = []
    if (ownWeeklyRows.length > 0 && !ownWeekly.error) {
      const latest = ownWeeklyRows.reduce((a, b) => (String(b.week_start) > String(a.week_start) ? b : a))
      if (typeof latest.week_start === 'string' && typeof latest.league_id === 'string') {
        const board = await sb
          .from('weekly_xp')
          .select('*')
          .eq('week_start', latest.week_start)
          .eq('league_id', latest.league_id)
          .order('xp', { ascending: false })
          .limit(LEAGUE_BOARD_SIZE)
        leagueRows = board.error ? [] : list(board.data)
      }
    }
    return {
      ok: true,
      reasonUz: null,
      snapshot: rowsToSnapshot({
        settings: isObj(settings.data) ? settings.data : null,
        plan: list(plan.data)[0] ?? null,
        attempts: list(attempts.data),
        vocabulary: list(vocabulary.data),
        activity: list(activity.data),
        writing: list(writing.data),
        speaking: list(speaking.data),
        mocks: list(mocks.data),
        profile: isObj(profile.data) ? profile.data : null,
        leagueRows,
        ownWeekly: ownWeeklyRows,
      }),
    }
  } catch {
    return failRead
  }
}

/**
 * Profil nomi — snapshotdan. `mergeRemote` bu maydonni birlashtirmaydi (u
 * faqat serverdan o'qiladi, qurilmada o'zgartirilmaydi), shuning uchun
 * alohida funksiya: bo'sh satr bo'lsa lokal qiymat saqlanadi.
 */
export function profileNameFromSnapshot(snap: RemoteSnapshot): string {
  return snap.profileName ?? ''
}
