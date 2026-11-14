/**
 * Murojaat yozishmasi (foydalanuvchi va admin uchun umumiy): xabarlar, ilovalar
 * (imzolangan qisqa muddatli havola), javob yozish formasi.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button, inputCls } from '../ui'
import FilePicker from './FilePicker'
import {
  BODY_MAX,
  STATUS_UZ,
  attachmentUrl,
  formatBytes,
  fmtDateTime,
  type CheckedFile,
  type SupportMessage,
  type SupportTicket,
  type TicketStatus,
} from '../../lib/support'

const STATUS_CHIP: Record<TicketStatus, string> = {
  open: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
  answered: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800',
  closed: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600',
}

export function StatusChip({ status }: { status: TicketStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[status]}`}>{STATUS_UZ[status]}</span>
}

function Attachment({ m }: { m: SupportMessage }) {
  const isImage = m.attachment_type !== 'application/pdf'
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Rasm — darhol kichik ko'rinish; PDF — bosilganda havola olinadi.
  useEffect(() => {
    if (!isImage) return
    let alive = true
    void attachmentUrl(m).then((r) => {
      if (!alive) return
      if (r.ok) setUrl(r.data)
      else setErr(r.reasonUz)
    })
    return () => {
      alive = false
    }
  }, [m, isImage])

  const openPdf = async () => {
    setBusy(true)
    setErr(null)
    const r = await attachmentUrl(m)
    setBusy(false)
    if (r.ok) window.open(r.data, '_blank', 'noopener,noreferrer')
    else setErr(r.reasonUz)
  }

  const meta = `${m.attachment_name ?? 'fayl'} · ${formatBytes(m.attachment_size ?? 0)}`
  return (
    <div className="mt-2 grid gap-1">
      {isImage ? (
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block w-fit">
            <img src={url} alt={`Ilova: ${m.attachment_name ?? 'rasm'}`} className="max-h-56 max-w-full rounded-lg border object-contain" />
          </a>
        ) : (
          !err && <span className="block h-24 w-40 animate-pulse rounded-lg bg-[var(--panel-2)]" aria-label="Rasm yuklanmoqda" />
        )
      ) : (
        <button type="button" onClick={openPdf} disabled={busy} className="inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)]">
          📄 PDF ni yuklab oliş
        </button>
      )}
      <span className="text-[11px] muted">{meta}</span>
      {err && <span className="text-[11px] text-[var(--bad)]">{err}</span>}
    </div>
  )
}

export default function TicketThread({
  ticket,
  messages,
  viewer,
  onSend,
}: {
  ticket: SupportTicket
  messages: SupportMessage[]
  viewer: 'user' | 'admin'
  /** Xato bo'lsa — sababi, aks holda null. */
  onSend: (body: string, file: CheckedFile | null) => Promise<string | null>
}) {
  const id = useId()
  const [body, setBody] = useState('')
  const [file, setFile] = useState<CheckedFile | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const canWrite = viewer === 'admin' || ticket.status !== 'closed'

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [messages.length])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return setErr('Xabar matnini yozing.')
    setBusy(true)
    setErr(null)
    const reason = await onSend(body, file)
    setBusy(false)
    if (reason) setErr(reason)
    else {
      setBody('')
      setFile(null)
    }
  }

  return (
    <div className="grid gap-3 min-w-0">
      <ol className="grid gap-2.5" aria-label="Yozişma">
        {messages.map((m) => {
          const mine = viewer === 'admin' ? m.from_admin : !m.from_admin
          return (
            <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] min-w-0 rounded-2xl border px-3.5 py-2.5 ${
                  m.from_admin ? 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800' : 'bg-[var(--panel-2)]'
                }`}
              >
                <p className="text-[11px] font-semibold muted">
                  {m.from_admin ? '🛡️ Admin' : viewer === 'admin' ? 'Foydalanuvçi' : 'Siz'} · {fmtDateTime(m.created_at)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{m.body}</p>
                {m.attachment_path && <Attachment m={m} />}
              </div>
            </li>
          )
        })}
      </ol>
      <div ref={endRef} />

      {canWrite ? (
        <form onSubmit={submit} className="grid gap-2 rounded-2xl border p-3" noValidate>
          <label htmlFor={`${id}-body`} className="text-xs font-semibold uppercase tracking-wide muted">
            {viewer === 'admin' ? 'Javob yoziş' : 'Xabar yoziş'}
          </label>
          <textarea
            id={`${id}-body`}
            className={`${inputCls} min-h-24`}
            maxLength={BODY_MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={viewer === 'admin' ? 'Foydalanuvçiga javob…' : 'Qöşimça ma’lumot…'}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilePicker value={file} onChange={setFile} disabled={busy} />
            <Button type="submit" size="sm" busy={busy} className="ml-auto">
              {viewer === 'admin' ? 'Javob yuboriş' : 'Yuboriş'}
            </Button>
          </div>
          {err && (
            <p className="text-sm text-[var(--bad)]" role="alert">
              {err}
            </p>
          )}
        </form>
      ) : (
        <p className="text-sm muted">Murojaat yopilgan. Yangi savol bölsa — yangi murojaat oçing.</p>
      )}
    </div>
  )
}
