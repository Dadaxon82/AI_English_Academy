/**
 * HAMJAMIYAT TEKSHIRUVI (g'oya: Busuu; qoidalar va dizayn bizniki).
 *
 *  1) Yuborish — o'z yozma javobingiz yoki nutq MATNINI (audio emas) rozilik
 *     bilan boshqa o'quvchiga yuborasiz.
 *  2) Mening javoblarim — kelgan baho va izohlar; noo'rin izohga shikoyat.
 *  3) Boshqalarni tekshirish — server sizga bitta javob TAYINLAYDI (o'zingiz
 *     tanlamaysiz), baho (1–5) va izoh yozasiz yoki shikoyat qilasiz.
 *
 * Mehmon rejimida yoki server ulanmaganda sahifa ishlamaydi va SABABI ochiq
 * yoziladi (soxta ro'yxat ko'rsatilmaydi). Hammasi `src/lib/peer.ts` orqali.
 */

import { trackUsage } from '../lib/usage'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Chip, EmptyState, InfoBanner, LoadingBlock, SuccessBanner, inputCls } from '../components/ui'
import { LOADED_LEVELS, getBundle } from '../content'
import type { CefrLevel } from '../content/types'
import {
  PEER_LIMITS,
  PEER_REPORT_REASONS,
  claimPeerSubmission,
  deletePeerSubmission,
  myPeerSubmissions,
  peerReady,
  reportPeer,
  submitForPeerReview,
  submitPeerReview,
  type PeerKind,
  type PeerReportReason,
  type PeerReview,
  type PeerSubmission,
} from '../lib/peer'
import { useStore } from '../lib/storeContext'

interface Candidate {
  key: string
  kind: PeerKind
  taskId: string
  level: CefrLevel
  prompt: string
  body: string
  at: number
}

function useCandidates(): Candidate[] {
  const { data } = useStore()
  return useMemo(() => {
    const writingTasks = LOADED_LEVELS.flatMap((l) => getBundle(l).writing)
    const speakingTasks = LOADED_LEVELS.flatMap((l) => getBundle(l).speaking)
    const out: Candidate[] = []
    for (const w of data.writing) {
      const t = writingTasks.find((x) => x.id === w.taskId)
      if (!w.text.trim()) continue
      out.push({ key: `w:${w.id}`, kind: 'writing', taskId: w.taskId, level: t?.level ?? data.settings.currentLevel, prompt: t?.promptEn ?? '', body: w.text, at: w.createdAt })
    }
    for (const s of data.speaking) {
      const text = (s.transcript ?? s.textAnswer ?? '').trim()
      if (!text) continue
      const t = speakingTasks.find((x) => x.id === s.taskId)
      out.push({ key: `s:${s.id}`, kind: 'speaking', taskId: s.taskId, level: t?.level ?? data.settings.currentLevel, prompt: t?.questionEn ?? '', body: text, at: s.createdAt })
    }
    return out.sort((a, b) => b.at - a.at).slice(0, 10)
  }, [data.writing, data.speaking, data.settings.currentLevel])
}

const KIND_UZ: Record<PeerKind, string> = { writing: 'Yozish', speaking: 'Gapirish (matn)' }

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} / 5`} className="tabular-nums font-bold">
      {'★'.repeat(n)}
      <span className="muted">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function ReportForm({ onSend, busy }: { onSend: (r: PeerReportReason) => void; busy: boolean }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<PeerReportReason>('offensive')
  const id = useId()
  if (!open)
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Shikoyat qilish
      </Button>
    )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs font-semibold" htmlFor={id}>
        Sabab
      </label>
      <select id={id} className={`${inputCls} !w-auto`} value={reason} onChange={(e) => setReason(e.target.value as PeerReportReason)}>
        {PEER_REPORT_REASONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.labelUz}
          </option>
        ))}
      </select>
      <Button size="sm" variant="danger" busy={busy} onClick={() => onSend(reason)}>
        Yuborish
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Bekor qilish
      </Button>
    </div>
  )
}

export default function Community() {
  const { ready } = useStore()
  const candidates = useCandidates()
  const [gate, setGate] = useState<{ ok: boolean; reasonUz: string } | null>(null)
  const [mine, setMine] = useState<{ submission: PeerSubmission; reviews: PeerReview[] }[] | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [task, setTask] = useState<PeerSubmission | null | undefined>(undefined)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')

  const loadMine = useCallback(async () => {
    const r = await myPeerSubmissions()
    if (r.ok) setMine(r.data)
    else setMsg({ ok: false, text: r.reasonUz })
  }, [])

  useEffect(() => {
    let alive = true
    void peerReady().then((r) => {
      if (!alive) return
      setGate(r.ok ? { ok: true, reasonUz: '' } : { ok: false, reasonUz: r.reasonUz })
      if (r.ok) void loadMine()
    })
    return () => {
      alive = false
    }
  }, [loadMine])

  const act = async (key: string, fn: () => Promise<{ ok: boolean; reasonUz?: string }>, success: string) => {
    setBusy(key)
    setMsg(null)
    const r = await fn()
    setBusy(null)
    setMsg(r.ok ? { ok: true, text: success } : { ok: false, text: r.reasonUz ?? 'Xatolik' })
    return r.ok
  }

  if (!ready || gate === null) return <LoadingBlock label="Hamjamiyat tekshirilmoqda…" />

  const sentKeys = new Set((mine ?? []).map((m) => `${m.submission.kind}:${m.submission.task_id}:${m.submission.body.trim()}`))

  return (
    <div className="grid content-start gap-4">
      <Card className="grid gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold">Hamjamiyat tekshiruvi</h1>
        <p className="text-sm muted">
          Yozma javobingizni yoki nutqingiz matnini boshqa o‘quvchiga yuboring — u baho (1–5) va izoh yozadi. Siz ham boshqalarning
          javobini tekshirasiz: server sizga bittasini tayinlaydi. Ismingiz ko‘rsatilmaydi, audio hech qachon yuborilmaydi. Noo‘rin
          javob yoki izohga shikoyat qiling: javobga 2 ta shikoyat yoki izohga muallif shikoyati tushsa, u avtomatik yashiriladi.
        </p>
      </Card>

      {!gate.ok && (
        <InfoBanner tone="warn">
          <div className="grid gap-1.5">
            <span className="text-sm">{gate.reasonUz}</span>
            <Link to="/login" className="text-sm font-semibold underline">
              Hisobga kirish
            </Link>
          </div>
        </InfoBanner>
      )}

      {msg && (msg.ok ? <SuccessBanner>{msg.text}</SuccessBanner> : <InfoBanner tone="warn">{msg.text}</InfoBanner>)}

      {gate.ok && (
        <>
          {/* -------------------- 1) Yuborish -------------------- */}
          <Card as="section" className="grid gap-3">
            <h2 className="font-bold">Javobimni tekshiruvga yuborish</h2>
            {candidates.length === 0 ? (
              <EmptyState
                title="Yuboriladigan javob yo‘q"
                body="Avval Yozish yoki Gapirish bo‘limida topshiriq bajaring — so‘nggi 10 ta javobingiz shu yerda chiqadi."
              />
            ) : (
              <>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>
                    Roziman: tanlagan matnim (ismimsiz) boshqa o‘quvchiga ko‘rsatiladi. Shaxsiy ma’lumot (telefon, manzil) yozmaganman.
                    Kuniga ko‘pi bilan {PEER_LIMITS.dailySubmissions} ta.
                  </span>
                </label>
                <ul className="grid gap-2">
                  {candidates.map((c) => {
                    const sent = sentKeys.has(`${c.kind}:${c.taskId}:${c.body.trim()}`)
                    return (
                      <li key={c.key} className="rounded-xl border p-3 grid gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Chip>{KIND_UZ[c.kind]}</Chip>
                          <Chip>{c.level}</Chip>
                          {sent && <Chip tone="ok">Yuborilgan</Chip>}
                        </div>
                        {c.prompt && <p className="text-xs muted">{c.prompt}</p>}
                        <p className="text-sm line-clamp-3">{c.body}</p>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            disabled={!consent || sent}
                            busy={busy === c.key}
                            onClick={async () => {
                              trackUsage('community_submit', 'started')
                              const ok = await act(
                                c.key,
                                () => submitForPeerReview({ kind: c.kind, taskId: c.taskId, level: c.level, prompt: c.prompt, body: c.body }),
                                'Javob tekshiruvga yuborildi. Izohlar kelganda «Mening javoblarim»da ko‘rinadi.',
                              )
                              if (ok) {
                                trackUsage('community_submit', 'finished')
                                void loadMine()
                              }
                            }}
                          >
                            Yuborish
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </Card>

          {/* -------------------- 2) Mening javoblarim -------------------- */}
          <Card as="section" className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold">Mening javoblarim</h2>
              <span className="flex-1" />
              <Button size="sm" variant="secondary" onClick={() => void loadMine()}>
                Yangilash
              </Button>
            </div>
            {mine === null ? (
              <LoadingBlock label="Yuklanmoqda…" />
            ) : mine.length === 0 ? (
              <p className="text-sm muted">Hali javob yubormagansiz.</p>
            ) : (
              <ul className="grid gap-2.5">
                {mine.map(({ submission: s, reviews }) => (
                  <li key={s.id} className="rounded-xl border p-3 grid gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip>{KIND_UZ[s.kind]}</Chip>
                      <Chip>{s.level}</Chip>
                      {s.status === 'hidden' ? (
                        <Chip tone="bad">Shikoyatlar sababli yashirildi</Chip>
                      ) : (
                        <Chip tone={reviews.length > 0 ? 'ok' : 'default'}>
                          {reviews.length}/{PEER_LIMITS.reviewsPerSubmission} izoh
                        </Chip>
                      )}
                      <span className="flex-1" />
                      <Button
                        size="sm"
                        variant="ghost"
                        busy={busy === `del:${s.id}`}
                        onClick={async () => {
                          const ok = await act(`del:${s.id}`, () => deletePeerSubmission(s.id), 'Javob o‘chirildi.')
                          if (ok) void loadMine()
                        }}
                      >
                        O‘chirish
                      </Button>
                    </div>
                    <p className="text-sm line-clamp-3">{s.body}</p>
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-lg bg-[var(--panel-2)] p-2.5 grid gap-1.5">
                        <Stars n={r.score} />
                        <p className="text-sm">{r.comment}</p>
                        <ReportForm
                          busy={busy === `rep:${r.id}`}
                          onSend={async (reason) => {
                            const ok = await act(`rep:${r.id}`, () => reportPeer({ reviewId: r.id }, reason), 'Shikoyat qabul qilindi — izoh yashirildi.')
                            if (ok) void loadMine()
                          }}
                        />
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* -------------------- 3) Boshqalarni tekshirish -------------------- */}
          <Card as="section" className="grid gap-3">
            <h2 className="font-bold">Boshqalarni tekshirish</h2>
            {task === undefined ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  busy={busy === 'claim'}
                  onClick={async () => {
                    setBusy('claim')
                    setMsg(null)
                    const r = await claimPeerSubmission()
                    setBusy(null)
                    if (r.ok) {
                      if (r.data) trackUsage('community_review', 'started')
                      setTask(r.data)
                      setScore(0)
                      setComment('')
                    } else setMsg({ ok: false, text: r.reasonUz })
                  }}
                >
                  Tekshirish uchun javob olish
                </Button>
              </div>
            ) : task === null ? (
              <div className="grid gap-2">
                <p className="text-sm muted">Hozircha tekshiriladigan javob yo‘q — keyinroq qayta urinib ko‘ring.</p>
                <div>
                  <Button size="sm" variant="secondary" onClick={() => setTask(undefined)}>
                    Qayta urinish
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip>{KIND_UZ[task.kind]}</Chip>
                  <Chip>{task.level}</Chip>
                </div>
                {task.prompt && <p className="text-xs muted">Topshiriq: {task.prompt}</p>}
                <blockquote className="rounded-xl border-2 bg-[var(--panel-2)] p-3 text-sm whitespace-pre-wrap">{task.body}</blockquote>
                <div className="grid gap-1.5">
                  <span className="text-sm font-semibold" id="peer-score-label">
                    Baho
                  </span>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="peer-score-label">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={score === n}
                        aria-label={`${n} / 5`}
                        onClick={() => setScore(n)}
                        className={`chip cursor-pointer ${score === n ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="grid gap-1.5 text-sm font-semibold" htmlFor="peer-comment">
                  Izoh ({comment.trim().length}/{PEER_LIMITS.commentMax}, kamida {PEER_LIMITS.commentMin})
                  <textarea
                    id="peer-comment"
                    className={`${inputCls} min-h-24 font-normal`}
                    value={comment}
                    maxLength={PEER_LIMITS.commentMax}
                    placeholder="Nimasi yaxshi? Qaysi xatoni qanday tuzatish kerak? Hurmat bilan yozing."
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    busy={busy === 'review'}
                    onClick={async () => {
                      const ok = await act('review', () => submitPeerReview(task.id, score, comment), 'Rahmat! Izohingiz muallifga yetkaziladi.')
                      if (ok) {
                        trackUsage('community_review', 'finished')
                        setTask(undefined)
                      }
                    }}
                  >
                    Izohni yuborish
                  </Button>
                  <span className="flex-1" />
                  <ReportForm
                    busy={busy === `rep:${task.id}`}
                    onSend={async (reason) => {
                      const ok = await act(`rep:${task.id}`, () => reportPeer({ submissionId: task.id }, reason), 'Shikoyat qabul qilindi.')
                      if (ok) setTask(undefined)
                    }}
                  />
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
