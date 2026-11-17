/**
 * Guruh mashg'ulotlari (`group_sessions`): birgalikda o'qish, guruh musobaqasi,
 * ustoz bilan mashg'ulot. Ro'yxat, yaratish, qo'shilish, chiqish, bekor qilish.
 * Uchrashuv havolasi saqlanmaydi — tashkilotchi uni mavzu maydonida yozadi
 * (ilovada video aloqa yo'q, buni ochiq aytamiz).
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Chip, EmptyState, Field, InfoBanner, SuccessBanner, inputCls } from './ui'
import { useStore } from '../lib/storeContext'
import {
  GROUP_KIND_UZ,
  cancelGroupSession,
  createGroupSession,
  joinGroupSession,
  leaveGroupSession,
  listGroupSessions,
  validateGroupInput,
  type GroupKind,
  type GroupSession,
} from '../lib/addieRemote'

function defaultStart(): string {
  const d = new Date(Date.now() + 86_400_000)
  d.setMinutes(0, 0, 0)
  d.setHours(19)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`
}

export default function GroupSessions() {
  const { data } = useStore()
  const userId = data.userId
  const level = data.settings.currentLevel
  const [list, setList] = useState<GroupSession[] | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<GroupKind>('study')
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [startsAt, setStartsAt] = useState(defaultStart)
  const [durationMin, setDurationMin] = useState(45)
  const [capacity, setCapacity] = useState(6)

  const apply = useCallback((r: Awaited<ReturnType<typeof listGroupSessions>>) => {
    if (r.ok) setList(r.data)
    else {
      setList([])
      setMsg({ ok: false, text: r.reasonUz })
    }
  }, [])
  const load = useCallback(async () => apply(await listGroupSessions(level)), [apply, level])

  useEffect(() => {
    let alive = true
    void listGroupSessions(level).then((r) => {
      if (alive) apply(r)
    })
    return () => {
      alive = false
    }
  }, [apply, level])

  const act = async (key: string, fn: () => Promise<{ ok: boolean; reasonUz?: string }>, success: string) => {
    setBusy(key)
    setMsg(null)
    const r = await fn()
    setBusy(null)
    setMsg(r.ok ? { ok: true, text: success } : { ok: false, text: r.reasonUz ?? 'Xatolik' })
    if (r.ok) await load()
    return r.ok
  }

  const input = { title, topic, startsAt: new Date(startsAt), capacity, durationMin }
  const invalid = validateGroupInput(input)

  return (
    <Card as="section" className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-bold">Guruh maşğulotlari · {level}</h2>
        <span className="flex-1" />
        <Button size="sm" variant="secondary" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Yopiş' : 'Maşğulot yaratiş'}
        </Button>
      </div>
      <p className="text-sm muted">
        Bir xil darajadagi öquvçilar bilan vaqt belgilab, birga maşq qiling. Ilovada video aloqa yöq: uçraşuv havolasini (masalan,
        Google Meet yoki Telegram guruhi) tashkilotçi mavzu maydoniga yozadi.
      </p>

      {msg && (msg.ok ? <SuccessBanner>{msg.text}</SuccessBanner> : <InfoBanner tone="warn">{msg.text}</InfoBanner>)}

      {open && (
        <form
          className="grid gap-3 rounded-xl border p-3.5"
          onSubmit={async (e) => {
            e.preventDefault()
            const ok = await act('create', () => createGroupSession({ kind, level, ...input }), 'Maşğulot yaratildi, siz unga qöşildingiz.')
            if (ok) {
              setOpen(false)
              setTitle('')
              setTopic('')
            }
          }}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Turi" htmlFor="gs-kind">
              <select id="gs-kind" className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as GroupKind)}>
                {(Object.keys(GROUP_KIND_UZ) as GroupKind[]).map((k) => (
                  <option key={k} value={k}>
                    {GROUP_KIND_UZ[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sarlavha" htmlFor="gs-title">
              <input id="gs-title" className={inputCls} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Bozorda narx söraş" />
            </Field>
          </div>
          <Field label="Mavzu va uçraşuv havolasi" htmlFor="gs-topic" hint="500 belgigaça">
            <textarea id="gs-topic" className={`${inputCls} min-h-20`} value={topic} maxLength={500} onChange={(e) => setTopic(e.target.value)} />
          </Field>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Boşlaniş" htmlFor="gs-start">
              <input id="gs-start" type="datetime-local" className={inputCls} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </Field>
            <Field label="Davomiylik (daqiqa)" htmlFor="gs-dur">
              <input id="gs-dur" type="number" min={10} max={180} className={inputCls} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} />
            </Field>
            <Field label="Siğim (kişi)" htmlFor="gs-cap">
              <input id="gs-cap" type="number" min={2} max={30} className={inputCls} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" busy={busy === 'create'} disabled={invalid !== null}>
              Yaratiş
            </Button>
            {invalid && title.length > 0 && <span className="muted text-xs">{invalid}</span>}
          </div>
        </form>
      )}

      {list === null ? (
        <p className="muted text-sm">Yuklanmoqda…</p>
      ) : list.length === 0 ? (
        <EmptyState title="Yaqin 30 kunda maşğulot yöq" body="Birinçi bölib yarating — boşqa öquvçilar şu yerda köradi." />
      ) : (
        <ul className="grid gap-2">
          {list.map((s) => {
            const host = s.host_id === userId
            const full = s.members !== undefined && s.members >= s.capacity
            return (
              <li key={s.id} className="grid gap-1.5 rounded-xl border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="brand">{GROUP_KIND_UZ[s.kind]}</Chip>
                  <span className="font-semibold text-sm">{s.title}</span>
                  <span className="flex-1" />
                  <Chip tone={full ? 'warn' : 'default'}>
                    {s.members ?? '?'}/{s.capacity}
                  </Chip>
                </div>
                <div className="text-xs muted">
                  {new Date(s.starts_at).toLocaleString('uz')} · {s.duration_min} daqiqa
                </div>
                {s.topic && <p className="text-sm whitespace-pre-wrap break-words">{s.topic}</p>}
                <div className="flex flex-wrap gap-2">
                  {host ? (
                    <Button size="sm" variant="danger" busy={busy === `c:${s.id}`} onClick={() => act(`c:${s.id}`, () => cancelGroupSession(s.id), 'Maşğulot bekor qilindi.')}>
                      Bekor qiliş
                    </Button>
                  ) : s.joined ? (
                    <Button size="sm" variant="secondary" busy={busy === `l:${s.id}`} onClick={() => act(`l:${s.id}`, () => leaveGroupSession(s.id), 'Maşğulotdan çiqdingiz.')}>
                      Çiqiş
                    </Button>
                  ) : (
                    <Button size="sm" disabled={full} busy={busy === `j:${s.id}`} onClick={() => act(`j:${s.id}`, () => joinGroupSession(s.id), 'Siz maşğulotga qöşildingiz.')}>
                      {full ? 'Joy yöq' : 'Qöşiliş'}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
