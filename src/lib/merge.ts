/**
 * Serverdagi holatni qurilmadagi holat bilan birlashtirish (toza funksiya).
 *
 * ESKI BUG: ilova serverdan HECH NARSA o'qimasdi, logout esa lokal keshni
 * tozalardi — qayta kirganda yoki boshqa qurilmada progress noldan boshlanardi.
 *
 * Qoidalar (qayta-qayta chaqirilsa ham natija o'zgarmaydi):
 *  - urinishlar, yozish/gapirish ishlari, mock natijalari — `id` bo'yicha birlashma;
 *  - SRS — ko'proq takrorlangan (`reps`) holat ustun, teng bo'lsa keyingisi;
 *  - kunlik faollik — har maydon bo'yicha maksimum (bir xil kun ikki marta
 *    o'qilsa ham vaqt ikki marta sanalmaydi);
 *  - sozlamalar — qurilmada hali hech narsa bo'lmasa serverdagisi, aks holda
 *    qurilmadagisi (foydalanuvchi shu yerda o'zgartirgan);
 *  - o'quv yo'li — tugatilgan kunlar birlashmasi, test ballari maksimumi.
 */

import { getBundle } from '../content'
import { normalizeGame } from './game'
import type { SrsState } from './srs'
import type { AppData, AttemptRecord, BadgeAward, DayActivity, GameState, LeagueRow, LeagueSnapshot, MockExamAttempt, SpeakingSession, UserSettings, WritingSubmission } from './types'
import { HISTORY_LIMITS, nearestXpGoal } from './types'

/** Serverdan o'qilgan holat (faqat foydalanuvchining o'z qatorlari — RLS). */
export interface RemoteSnapshot {
  settings: Partial<UserSettings> | null
  plan: {
    path?: AppData['path']
    xp?: number
    diagnostic?: AppData['diagnostic']
    onboardedAt?: number
    game?: GameState
    badges?: BadgeAward[]
    selfAssessment?: AppData['selfAssessment']
  } | null
  attempts: AttemptRecord[]
  srs: Record<string, SrsState>
  activity: Record<string, DayActivity>
  writing: WritingSubmission[]
  speaking: SpeakingSession[]
  mockAttempts: MockExamAttempt[]
  /** Liga tablasidan o'qilgan qatorlar (biznikini ham ichida). */
  league?: { weekStart: string; leagueId: string; entries: LeagueRow[] } | null
  /** `profiles.display_name` — liga uchun (o'qiladi, yozilmaydi). */
  profileName?: string
}

/** Qurilmada hali hech qanday o'quv izi yo'q (yangi qurilma yoki chiqishdan keyin). */
export function isPristine(d: AppData): boolean {
  return (
    d.attempts.length === 0 &&
    Object.keys(d.srs).length === 0 &&
    Object.keys(d.activity).length === 0 &&
    d.writing.length === 0 &&
    d.speaking.length === 0 &&
    d.mockAttempts.length === 0 &&
    d.path.completedDays.length === 0 &&
    d.diagnostic === null &&
    d.onboardedAt === null
  )
}

function unionById<T extends { id: string }>(local: readonly T[], remote: readonly T[], at: (x: T) => number, cap: number): T[] {
  const map = new Map<string, T>()
  for (const r of remote) map.set(r.id, r)
  // Lokal yozuv ustun: unda serverga yuborilmaydigan maydonlar ham bor
  // (masalan gapirish yozuvining qurilmadagi audio belgisi).
  for (const l of local) map.set(l.id, l)
  return [...map.values()].sort((a, b) => at(a) - at(b)).slice(-cap)
}

function pickSrs(local: SrsState, remote: SrsState): SrsState {
  if (local.reps !== remote.reps) return local.reps > remote.reps ? local : remote
  return (remote.lastReviewedAt ?? 0) > (local.lastReviewedAt ?? 0) ? remote : local
}

/**
 * O'yin holatini birlashtirish — ikkala qurilmada ham gemlar/questlar/yutuqlar
 * hisoblanadi, shuning uchun qoidalar "bir tomon yutadi" emas, MAYDON BO'YICHA:
 *  - gem, freeze, xatosiz darslar, questlar sanog'i, achivement darajasi —
 *    MAKSIMUM (takror sanalmaydi, chunki har bir sovg'a marta belgilangan);
 *  - yurak — `heartsAt` QAYSI TARAFFDA KECH BO'LSA O'SHA SON; tiklanish soati
 *    eng kech `heartsAt` dan davom etadi (ikki qurilma bir tiklanishni IKKI
 *    marta sanamasligi uchun);
 *  - kunlik hisoblar (`today`, `questsDay`) — `today.day` kechroq bo'lgan tara;
 *  - `frozenDays`, `chestsWeeks`, `questsDone` — BIRLASHMA (kalit bo'yicha);
 *  - liga snapshoti — eng yangi `at`;
 *  - `combo` — qurilmadagisi (bu shu moslashuvdagi ketma-ketlik, serverda
 *    ma'nosi yo'q).
 * Qayta-qaeta birlashtirilsa natija O'WGARMAYDI (idempotent).
 */
export function mergeGame(local: GameState, remoteRaw: GameState | undefined | null): GameState {
  if (!remoteRaw) return local
  const r = normalizeGame(remoteRaw, local.today.day)
  const heartsNewer = r.heartsAt > local.heartsAt
  const remoteDayNewer = r.today.day > local.today.day
  const questsDone = [...r.questsDone]
  const qSeen = new Set(questsDone.map((q) => q.id))
  for (const q of local.questsDone) if (!qSeen.has(q.id)) questsDone.push(q)
  const achievementLevels: Record<string, number> = { ...local.achievementLevels }
  for (const [k, v] of Object.entries(r.achievementLevels)) achievementLevels[k] = Math.max(achievementLevels[k] ?? 0, Number(v) || 0)
  // Garov: ikkalasi bo'lsa — yangiroq boshlangan saqlanadi (eski garov allaqachon
  // yakunlangan bo'lishi ehtimoli kuchli).
  const bet = !local.bet ? r.bet : !r.bet ? local.bet : r.bet.startDay > local.bet.startDay ? r.bet : local.bet
  return {
    ...local,
    hearts: heartsNewer ? r.hearts : local.hearts,
    heartsAt: Math.max(local.heartsAt, r.heartsAt),
    practiceReviews: Math.max(local.practiceReviews, r.practiceReviews),
    gems: Math.max(local.gems, r.gems),
    freezes: Math.max(local.freezes, r.freezes),
    boostUntil: Math.max(local.boostUntil, r.boostUntil),
    bet,
    frozenDays: [...new Set([...local.frozenDays, ...r.frozenDays])],
    today: remoteDayNewer ? r.today : local.today,
    questsDay: remoteDayNewer ? r.questsDay : local.questsDay,
    questsDone,
    questsTotal: Math.max(local.questsTotal, r.questsTotal),
    goalRewardedDay: r.goalRewardedDay > local.goalRewardedDay ? r.goalRewardedDay : local.goalRewardedDay,
    achievementLevels,
    perfectLessonsTotal: Math.max(local.perfectLessonsTotal, r.perfectLessonsTotal),
    chestsWeeks: [...new Set([...local.chestsWeeks, ...r.chestsWeeks])],
    league: validLeague(r.league) ?? (!local.league ? null : local.league.at >= (r.league?.at ?? 0) ? local.league : r.league),
  }
}

/** Liga snapshoti HAQIQIY jadvalmi (bo'sh bo'lmasa) — aks holda null. */
function validLeague(s: LeagueSnapshot | null): LeagueSnapshot | null {
  return s && Array.isArray(s.entries) && s.entries.length > 0 ? s : null
}

/** Ikki qurilmadagi BIR XIL kun: har maydon bo'yicha maksimum (takror sanalmaydi). */
function mergeDay(local: DayActivity, remote: DayActivity): DayActivity {
  const skills: DayActivity['skills'] = { ...local.skills }
  for (const [k, v] of Object.entries(remote.skills)) {
    const key = k as keyof DayActivity['skills']
    skills[key] = Math.max(skills[key] ?? 0, v ?? 0)
  }
  return {
    date: local.date,
    seconds: Math.max(local.seconds, remote.seconds),
    attempts: Math.max(local.attempts, remote.attempts),
    correct: Math.max(local.correct, remote.correct),
    newWords: Math.max(local.newWords, remote.newWords),
    reviewedWords: Math.max(local.reviewedWords, remote.reviewedWords),
    skills,
  }
}

export function mergeRemote(local: AppData, remote: RemoteSnapshot): AppData {
  const pristine = isPristine(local)
  const settings: UserSettings = pristine && remote.settings ? { ...local.settings, ...remote.settings } : { ...local.settings }
  // O'yin sozlamalari (XP maqsadi) serverdan ham eski/bugriq son kelishi
  // mumkin — FAQAT bosqich qiymati qoladi.
  settings.xpGoalXp = nearestXpGoal(settings.xpGoalXp)

  const srs = { ...local.srs }
  for (const [id, st] of Object.entries(remote.srs)) {
    const mine = srs[id]
    srs[id] = mine ? pickSrs(mine, st) : st
  }

  const activity = { ...local.activity }
  for (const [day, act] of Object.entries(remote.activity)) {
    const mine = activity[day]
    activity[day] = mine ? mergeDay(mine, act) : act
  }

  const rp = remote.plan?.path
  const completedDays = [...local.path.completedDays]
  for (const d of rp?.completedDays ?? []) if (!completedDays.includes(d)) completedDays.push(d)
  const passedTests = { ...local.path.passedTests }
  for (const [k, v] of Object.entries(rp?.passedTests ?? {})) passedTests[k] = Math.max(passedTests[k] ?? 0, v)
  const fallbackDay = pristine && rp ? rp.currentDayId : local.path.currentDayId
  const currentDayId = getBundle(settings.currentLevel).days.find((d) => !completedDays.includes(d.id))?.id ?? fallbackDay

  // Nishonlar (yutuqlar) serverda `plan.badges` da yuradi — `id` bo'yicha
  // birlashma: ikkala qurilma ham yangi yutuq ochgan bo'lsa, ikkalasi ham qoladi.
  const badgeMap = new Map<string, BadgeAward>()
  for (const b of remote.plan?.badges ?? []) if (b && typeof b.id === 'string') badgeMap.set(b.id, b)
  for (const b of local.badges) badgeMap.set(b.id, b)
  const badges = [...badgeMap.values()].sort((a, b) => a.at - b.at)

  // O'z-o'zini baholash — har da'vo bo'yicha eng keyingi (`at`) baho qoladi.
  const selfAssessment = mergeSelfAssessment(local.selfAssessment ?? {}, remote.plan?.selfAssessment ?? {})

  const ld = local.diagnostic
  const rd = remote.plan?.diagnostic ?? null
  const diagnostic = !rd ? ld : !ld ? rd : rd.at > ld.at ? rd : ld
  // Onboarding bir marta (istalgan qurilmada) yakunlangan bo'lsa yetarli — eng birinchisi.
  const ro = remote.plan?.onboardedAt ?? null
  const onboardedAt = local.onboardedAt === null ? ro : ro === null ? local.onboardedAt : Math.min(local.onboardedAt, ro)

  return {
    ...local,
    settings,
    srs,
    activity,
    attempts: unionById(local.attempts, remote.attempts, (a) => a.at, HISTORY_LIMITS.attempts),
    writing: unionById(local.writing, remote.writing, (w) => w.createdAt, HISTORY_LIMITS.writing),
    speaking: unionById(local.speaking, remote.speaking, (s) => s.createdAt, HISTORY_LIMITS.speaking),
    mockAttempts: unionById(local.mockAttempts, remote.mockAttempts, (m) => m.completedAt, HISTORY_LIMITS.mockAttempts),
    xp: Math.max(local.xp, remote.plan?.xp ?? 0),
    path: { completedDays, passedTests, currentDayId },
    diagnostic,
    onboardedAt,
    badges,
    selfAssessment,
    // Profil nomi faqat serverdan o'qiladi (`profiles.display_name`); bo'sh
    // kelsa lokal qiymat saqlanadi — ism ixtir qilinmaydi.
    profileName: remote.profileName ? remote.profileName : local.profileName,
    game: applyLeagueSnapshot(mergeGame(local.game, remote.plan?.game), remote.league, local.userId),
  }
}

/**
 * O'qilgan liga tablasini holatga kiritish.
 *
 *  - Tablo bo'sh bo'lsa OLDINKI snapshot saqlanadi (internet bo'lmasa ekranda
 *    oxirgi holat ko'rsatiladi — "eski sana" bilan ochiq aytiladi).
 *  - Eski haftaning sovg'asi hali OLINMAGAN bo'lsa (`prizeClaimed: false`)
 *    snapshot ALMASHIRILMAYDI — aks holda pull yakunlangan haftani bosib
 *    ketadi va sovg'a abadiy yo'qoladi. `settleLeaguePrize()` sovg'ani berib,
 *    `prizeClaimed: true` qiladi — keyingi o'qish yangi haftani qabul qiladi.
 */
export function applyLeagueSnapshot(g: GameState, read: RemoteSnapshot['league'], userId: string, at = Date.now()): GameState {
  if (!read || read.entries.length === 0) return g
  const cur = g.league
  if (cur && !cur.prizeClaimed && cur.weekStart < read.weekStart) return g
  const sorted = [...read.entries].sort((a, b) => b.xp - a.xp).slice(0, HISTORY_LIMITS.leagueEntries)
  const idx = sorted.findIndex((e) => e.userId === userId)
  return {
    ...g,
    league: {
      weekStart: read.weekStart,
      leagueId: read.leagueId,
      rank: idx === -1 ? 0 : idx + 1,
      boardSize: sorted.length,
      at,
      entries: sorted,
      prizeClaimed: false,
    },
  }
}

/** O'z-o'zini baholash birlashmasi: kalit bo'yicha eng keyingi baho (teng bo'lsa — lokal). */
export function mergeSelfAssessment(
  local: AppData['selfAssessment'],
  remote: AppData['selfAssessment'],
): AppData['selfAssessment'] {
  const out: AppData['selfAssessment'] = { ...local }
  for (const [k, v] of Object.entries(remote)) {
    const cur = out[k]
    if (!cur || v.at > cur.at) out[k] = v
  }
  return out
}
