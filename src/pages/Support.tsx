/**
 * ADMINGA MUROJAAT — foydalanuvchi o'z murojaatlarini ochadi, rasm/PDF ilova
 * qiladi va admin javobini shu yerda ko'radi. Ma'lumot faqat serverdan.
 */
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Card, EmptyState, ErrorState, Field, InfoBanner, LoadingBlock, inputCls } from '../components/ui'
import FilePicker from '../components/support/FilePicker'
import TicketThread, { StatusChip } from '../components/support/TicketThread'
import { useAuthActions } from '../lib/authContext'
import {
  BODY_MAX,
  SUBJECT_MAX,
  fmtDateTime,
  listMyTickets,
  loadThread,
  openTicket,
  sendMessage,
  setTicketStatus,
  type CheckedFile,
  type SupportMessage,
  type SupportResult,
  type SupportTicket,
} from '../lib/support'

function NewTicketForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const id = useId()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<CheckedFile | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const res = await openTicket({ subject, body, file })
    setBusy(false)
    if (res.ok) onCreated(res.data)
    else setErr(res.reasonUz)
  }

  return (
    <Card className="grid gap-3">
      <h2 className="font-bold">Yangi murojaat</h2>
      <form className="grid gap-3" onSubmit={submit} noValidate>
        <Field label="Mavzu" htmlFor={`${id}-s`}>
          <input id={`${id}-s`} className={inputCls} maxLength={SUBJECT_MAX} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Masalan: darsda xato topdim" />
        </Field>
        <Field label="Xabar" htmlFor={`${id}-b`} hint="Muammoni batafsil yozing. Kerak bölsa skrinşot yoki PDF ilova qiling.">
          <textarea id={`${id}-b`} className={`${inputCls} min-h-32`} maxLength={BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <FilePicker value={file} onChange={setFile} disabled={busy} />
        {err && (
          <p className="text-sm text-[var(--bad)]" role="alert">
            {err}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Bekor qiliş
          </Button>
          <Button type="submit" busy={busy}>
            Yuboriş
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default function Support() {
  const userId = useAuthActions()?.userId ?? null
  const [params, setParams] = useSearchParams()
  const selected = params.get('t')
  const [list, setList] = useState<SupportResult<SupportTicket[]> | null>(null)
  type Thread = SupportResult<{ ticket: SupportTicket; messages: SupportMessage[] }>
  const [loaded, setLoaded] = useState<{ id: string; r: Thread } | null>(null)
  const thread = selected && loaded?.id === selected ? loaded.r : null
  const setThread = (r: Thread) => selected && setLoaded({ id: selected, r })
  const [creating, setCreating] = useState(false)
  const [closing, setClosing] = useState(false)

  const refreshList = useCallback(() => {
    void listMyTickets().then(setList)
  }, [])

  useEffect(() => {
    if (userId) refreshList()
  }, [userId, refreshList])

  useEffect(() => {
    if (!selected) return
    let alive = true
    void loadThread(selected).then((r) => alive && setLoaded({ id: selected, r }))
    return () => {
      alive = false
    }
  }, [selected])

  const select = (id: string | null) => {
    setCreating(false)
    setParams(id ? { t: id } : {}, { replace: false })
  }

  if (!userId) {
    return (
      <div className="grid gap-4 content-start max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold">Adminga murojaat</h1>
        <InfoBanner>Murojaat yuboriş uçun hisobingizga kiring — javob şu hisobga keladi.</InfoBanner>
        <Link to="/login">
          <Button>Kiriş</Button>
        </Link>
      </div>
    )
  }

  const send = async (body: string, file: CheckedFile | null): Promise<string | null> => {
    if (!thread?.ok) return 'Murojaat yuklanmagan.'
    const t = thread.data.ticket
    const r = await sendMessage({ ticketId: t.id, ownerId: t.user_id, body, file })
    if (!r.ok) return r.reasonUz
    setThread({ ok: true, data: { ticket: { ...t, status: 'open', last_message_at: r.data.created_at }, messages: [...thread.data.messages, r.data] } })
    refreshList()
    return null
  }

  const close = async () => {
    if (!thread?.ok) return
    setClosing(true)
    const r = await setTicketStatus(thread.data.ticket.id, 'closed')
    setClosing(false)
    if (r.ok) {
      setThread({ ok: true, data: { ...thread.data, ticket: { ...thread.data.ticket, status: 'closed' } } })
      refreshList()
    }
  }

  return (
    <div className="grid gap-4 content-start max-w-5xl mx-auto w-full min-w-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Adminga murojaat</h1>
          <p className="text-sm muted">Savol, xato yoki taklif yozing — admin javobi şu yerda körinadi.</p>
        </div>
        <Button size="sm" onClick={() => { select(null); setCreating(true) }}>
          + Yangi murojaat
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] items-start">
        <section aria-label="Murojaatlarim" className="grid gap-2 min-w-0">
          {!list ? (
            <LoadingBlock />
          ) : !list.ok ? (
            <ErrorState message={list.reasonUz} retry={refreshList} />
          ) : list.data.length === 0 ? (
            <EmptyState title="Hali murojaat yöq" body="Birinçi murojaatingizni yozing." />
          ) : (
            <ul className="grid gap-2">
              {list.data.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => select(t.id)}
                    aria-current={selected === t.id ? 'true' : undefined}
                    className={`panel w-full text-left p-3 grid gap-1 hover:border-[var(--accent)] ${selected === t.id ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : ''}`}
                  >
                    <span className="font-semibold text-sm break-words">{t.subject}</span>
                    <span className="flex flex-wrap items-center gap-2 text-[11px] muted">
                      <StatusChip status={t.status} /> {fmtDateTime(t.last_message_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Murojaat" className="min-w-0">
          {creating ? (
            <NewTicketForm
              onCancel={() => setCreating(false)}
              onCreated={(id) => {
                refreshList()
                select(id)
              }}
            />
          ) : !selected ? (
            <EmptyState title="Murojaatni tanlang" body="Çapdagi röyxatdan murojaatni oçing yoki yangisini yozing." />
          ) : !thread ? (
            <LoadingBlock />
          ) : !thread.ok ? (
            <ErrorState message={thread.reasonUz} />
          ) : (
            <Card className="grid gap-3 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold break-words">{thread.data.ticket.subject}</h2>
                  <p className="text-[11px] muted">Oçilgan: {fmtDateTime(thread.data.ticket.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={thread.data.ticket.status} />
                  {thread.data.ticket.status !== 'closed' && (
                    <Button variant="ghost" size="sm" onClick={close} busy={closing}>
                      Yopiş
                    </Button>
                  )}
                </div>
              </div>
              <TicketThread ticket={thread.data.ticket} messages={thread.data.messages} viewer="user" onSend={send} />
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
