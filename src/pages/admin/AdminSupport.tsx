/**
 * ADMIN — murojaatlar: ro'yxat (holat bo'yicha), to'liq yozishma, ilova bilan
 * javob, yopish / qayta ochish, o'chirish. Kirish: `AdminRoute`.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Inbox, RefreshCw, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, ErrorState, Modal } from '../../components/ui'
import { TableSkeleton } from '../../components/admin/Skeleton'
import { ToastStack } from '../../components/admin/Toasts'
import { useToasts } from '../../components/admin/useToasts'
import TicketThread, { StatusChip } from '../../components/support/TicketThread'
import {
  STATUS_UZ,
  adminDeleteTicket,
  adminListTickets,
  fmtDateTime,
  loadThread,
  sendMessage,
  setTicketStatus,
  type AdminTicketRow,
  type CheckedFile,
  type SupportMessage,
  type SupportResult,
  type SupportTicket,
  type TicketStatus,
} from '../../lib/support'

const FILTERS: { id: TicketStatus | null; label: string }[] = [
  { id: 'open', label: STATUS_UZ.open },
  { id: 'answered', label: STATUS_UZ.answered },
  { id: 'closed', label: STATUS_UZ.closed },
  { id: null, label: 'Barçasi' },
]

export default function AdminSupport() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('t')
  const [filter, setFilter] = useState<TicketStatus | null>('open')
  const [reload, setReload] = useState(0)
  const listKey = `${filter ?? 'all'}:${reload}`
  const [listState, setListState] = useState<{ key: string; r: SupportResult<AdminTicketRow[]> } | null>(null)
  const list = listState?.key === listKey ? listState.r : null
  type Thread = SupportResult<{ ticket: SupportTicket; messages: SupportMessage[] }>
  const [loaded, setLoaded] = useState<{ id: string; r: Thread } | null>(null)
  const thread = selected && loaded?.id === selected ? loaded.r : null
  const setThread = (r: Thread) => selected && setLoaded({ id: selected, r })
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const toasts = useToasts()

  const refreshList = useCallback(() => setReload((n) => n + 1), [])

  useEffect(() => {
    let alive = true
    void adminListTickets(filter).then((r) => alive && setListState({ key: listKey, r }))
    return () => {
      alive = false
    }
  }, [filter, listKey])

  useEffect(() => {
    if (!selected) return
    let alive = true
    void loadThread(selected).then((r) => alive && setLoaded({ id: selected, r }))
    return () => {
      alive = false
    }
  }, [selected])

  const row = list?.ok ? list.data.find((r) => r.id === selected) : undefined

  const send = async (body: string, file: CheckedFile | null): Promise<string | null> => {
    if (!thread?.ok) return 'Murojaat yuklanmagan.'
    const t = thread.data.ticket
    const r = await sendMessage({ ticketId: t.id, ownerId: t.user_id, body, file })
    if (!r.ok) return r.reasonUz
    setThread({ ok: true, data: { ticket: { ...t, status: 'answered', last_message_at: r.data.created_at }, messages: [...thread.data.messages, r.data] } })
    toasts.push('ok', 'Javob yuborildi.')
    refreshList()
    return null
  }

  const changeStatus = async (status: TicketStatus) => {
    if (!thread?.ok) return
    setBusy(true)
    const r = await setTicketStatus(thread.data.ticket.id, status)
    setBusy(false)
    if (!r.ok) return toasts.push('error', r.reasonUz)
    setThread({ ok: true, data: { ...thread.data, ticket: { ...thread.data.ticket, status } } })
    toasts.push('ok', status === 'closed' ? 'Murojaat yopildi.' : 'Murojaat qayta oçildi.')
    refreshList()
  }

  const remove = async () => {
    if (!thread?.ok) return
    setBusy(true)
    const r = await adminDeleteTicket(thread.data.ticket)
    setBusy(false)
    setConfirmDelete(false)
    if (!r.ok) return toasts.push('error', r.reasonUz)
    toasts.push('ok', 'Murojaat öçirildi.')
    setParams({})
    refreshList()
  }

  return (
    <div className="grid gap-5 content-start min-w-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline">
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" /> Admin panel
          </Link>
          <h1 className="text-2xl font-bold">Murojaatlar</h1>
          <p className="text-sm muted">Foydalanuvçilar yozgan savollar, ilovalar va javoblar.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refreshList} busy={!list}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" /> Yangilaş
        </Button>
      </header>

      <div role="tablist" aria-label="Holat bö‘yiça" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              filter === f.id ? 'bg-violet-700 text-white border-violet-700 dark:bg-violet-300 dark:text-violet-950 dark:border-violet-300' : 'hover:bg-[var(--panel-2)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] items-start">
        <section aria-label="Murojaatlar röyxati" className="min-w-0">
          {!list ? (
            <TableSkeleton />
          ) : !list.ok ? (
            <ErrorState message={list.reasonUz} retry={refreshList} />
          ) : list.data.length === 0 ? (
            <EmptyState title="Murojaat yöq" body="Bu holatda murojaat topilmadi." />
          ) : (
            <ul className="grid gap-2">
              {list.data.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setParams({ t: t.id })}
                    aria-current={selected === t.id ? 'true' : undefined}
                    className={`panel w-full text-left p-3 grid gap-1 hover:border-violet-500 ${selected === t.id ? 'border-violet-500 ring-1 ring-violet-500' : ''}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm break-words min-w-0">{t.subject}</span>
                      <StatusChip status={t.status} />
                    </span>
                    <span className="text-xs muted truncate">{t.full_name || t.email || 'Foydalanuvçi'}{t.full_name && t.email ? ` · ${t.email}` : ''}</span>
                    {t.last_preview && (
                      <span className="text-xs line-clamp-2 break-words">
                        {t.last_from_admin ? '🛡️ ' : ''}
                        {t.last_preview}
                      </span>
                    )}
                    <span className="text-[11px] muted">
                      {fmtDateTime(t.last_message_at)} · {t.messages} ta xabar
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Yozişma" className="min-w-0">
          {!selected ? (
            <div className="panel p-8 grid place-items-center gap-2 text-center">
              <Inbox aria-hidden="true" className="h-10 w-10 muted" />
              <p className="font-semibold">Murojaatni tanlang</p>
              <p className="text-sm muted">Röyxatdan murojaatni oçib, javob yozing.</p>
            </div>
          ) : !thread ? (
            <TableSkeleton />
          ) : !thread.ok ? (
            <ErrorState message={thread.reasonUz} />
          ) : (
            <Card className="grid gap-3 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold break-words">{thread.data.ticket.subject}</h2>
                  <p className="text-xs muted break-words">
                    {row ? `${row.full_name || 'Ismsiz'} · ${row.email ?? '—'} · ` : ''}Oçilgan: {fmtDateTime(thread.data.ticket.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={thread.data.ticket.status} />
                  {thread.data.ticket.status === 'closed' ? (
                    <Button variant="secondary" size="sm" onClick={() => changeStatus('open')} busy={busy}>
                      Qayta oçiş
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => changeStatus('closed')} busy={busy}>
                      Yopiş
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} aria-label="Murojaatni öçiriş" disabled={busy}>
                    <Trash2 aria-hidden="true" className="h-4 w-4 text-[var(--bad)]" />
                  </Button>
                </div>
              </div>
              <TicketThread ticket={thread.data.ticket} messages={thread.data.messages} viewer="admin" onSend={send} />
            </Card>
          )}
        </section>
      </div>

      <Modal open={confirmDelete} title="Murojaatni öçirasizmi?" onClose={() => !busy && setConfirmDelete(false)}>
        <div className="grid gap-3">
          <p className="text-sm">Yozişma va barça ilovalar butunlay öçiriladi. Bu amal qaytarilmaydi.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Bekor qiliş
            </Button>
            <Button variant="danger" onClick={remove} busy={busy}>
              Öçiriş
            </Button>
          </div>
        </div>
      </Modal>
      <ToastStack items={toasts.items} onDismiss={toasts.dismiss} />
    </div>
  )
}
