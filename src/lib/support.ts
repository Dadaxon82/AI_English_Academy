/**
 * ADMINGA MUROJAAT — mijoz qatlami.
 *
 * Server: `supabase/migrations/0009_support.sql`. Himoya SERVERDA (RLS,
 * trigger'lar, yopiq `support` bucket'i). Bu modul:
 *  - faylni yuborishdan OLDIN tekshiradi: turi (kengaytma + birinchi baytlar —
 *    nomi `.png` qilib qo'yilgan boshqa fayl o'tmaydi), hajmi ≤ 5 MB;
 *  - faylni tasodifiy nom bilan `<egasi>/<murojaat>/<uuid>.<ext>` ga yuklaydi
 *    (asl nomi faqat matn sifatida saqlanadi);
 *  - ilovani qisqa muddatli imzolangan havola bilan ochadi (PDF — yuklab olish).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase, supabaseConfigured } from './supabase'

export type TicketStatus = 'open' | 'answered' | 'closed'
export type AttachmentType = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf'

export const SUBJECT_MIN = 3
export const SUBJECT_MAX = 120
export const BODY_MAX = 4000
export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const BUCKET = 'support'
/** Imzolangan havola muddati (soniya). */
export const SIGNED_URL_TTL = 600

export const FILE_ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf'

const EXT: Record<AttachmentType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export const STATUS_UZ: Record<TicketStatus, string> = {
  open: 'Javob kutilmoqda',
  answered: 'Javob berildi',
  closed: 'Yopilgan',
}

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  status: TicketStatus
  created_at: string
  last_message_at: string
}

export interface SupportMessage {
  id: string
  ticket_id: string
  author_id: string | null
  from_admin: boolean
  body: string
  attachment_path: string | null
  attachment_name: string | null
  attachment_type: AttachmentType | null
  attachment_size: number | null
  created_at: string
}

export interface AdminTicketRow extends SupportTicket {
  email: string | null
  full_name: string
  messages: number
  last_preview: string | null
  last_from_admin: boolean | null
}

export interface CheckedFile {
  file: Blob
  name: string
  type: AttachmentType
  size: number
}

export type SupportResult<T> = { ok: true; data: T } | { ok: false; reasonUz: string }

/* ------------------------------ sof yordamchilar ------------------------------ */

export function validateSubject(s: string): string | null {
  const t = s.trim()
  if (t.length < SUBJECT_MIN) return `Mavzu kamida ${SUBJECT_MIN} belgi bölsin.`
  if (t.length > SUBJECT_MAX) return `Mavzu juda uzun (köpi bilan ${SUBJECT_MAX} belgi).`
  return null
}

export function validateBody(s: string): string | null {
  const t = s.trim()
  if (t.length === 0) return 'Xabar matnini yozing.'
  if (t.length > BODY_MAX) return `Xabar juda uzun (köpi bilan ${BODY_MAX} belgi).`
  return null
}

/** Faylning HAQIQIY turi — birinchi baytlardan (kengaytmaga ishonmaymiz). */
export function sniffType(b: Uint8Array): AttachmentType | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x)
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf'
  return null
}

/** Ko'rsatish uchun nom: yo'l belgilari va boshqaruv belgilarisiz, ≤ 120 belgi. */
export function safeFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const base = (name.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').trim()
  return (base || 'fayl').slice(-120)
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

async function headBytes(f: Blob): Promise<Uint8Array> {
  const part = f.slice(0, 16)
  const buf = typeof part.arrayBuffer === 'function' ? await part.arrayBuffer() : await new Response(part).arrayBuffer()
  return new Uint8Array(buf)
}

/** Ilova tekshiruvi: faqat PNG/JPEG/WebP rasm yoki PDF, ≤ 5 MB. */
export async function checkAttachment(file: File): Promise<SupportResult<CheckedFile>> {
  if (file.size === 0) return { ok: false, reasonUz: 'Fayl böş.' }
  if (file.size > MAX_FILE_BYTES) return { ok: false, reasonUz: `Fayl juda katta (${formatBytes(file.size)}). Köpi bilan 5 MB.` }
  const type = sniffType(await headBytes(file))
  if (!type) return { ok: false, reasonUz: 'Faqat rasm (PNG, JPG, WebP) yoki PDF fayl yuboriş mumkin.' }
  return { ok: true, data: { file, name: safeFileName(file.name), type, size: file.size } }
}

export function attachmentPath(ownerId: string, ticketId: string, type: AttachmentType, id: string = crypto.randomUUID()): string {
  return `${ownerId}/${ticketId}/${id}.${EXT[type]}`
}

/** Server xatosi → tushunarli sabab (SQL matni chiqmaydi). */
export function supportErrorUz(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string; statusCode?: string | number }
  const msg = (e.message ?? '').toLowerCase()
  if (msg.includes('support_too_many')) return 'Sizda 5 ta oçiq murojaat bor. Avval ulardan birini yoping yoki javobni kuting.'
  if (msg.includes('support_rate')) return 'Juda köp xabar yuborildi. Bir soatdan keyin qayta yozing.'
  if (msg.includes('support_closed')) return 'Bu murojaat yopilgan. Yangi murojaat oçing.'
  if (msg.includes('support_not_found')) return 'Murojaat topilmadi.'
  if (msg.includes('support_bad_path') || msg.includes('row-level security') || msg.includes('unauthorized'))
    return 'Faylni yuklab bölmadi: ruxsat yöq yoki soatlik limit (10 ta fayl) tugadi.'
  if (msg.includes('account_blocked') || msg.includes('support_forbidden') || e.code === '42501') return 'Bu amal uçun ruxsat yöq (hisob bloklangan bölişi mumkin).'
  if (msg.includes('admin_only')) return 'Bu amal faqat admin uçun.'
  if (msg.includes('mime') || msg.includes('payload too large') || msg.includes('exceeded the maximum')) return 'Fayl turi yoki hajmi ruxsat etilmagan (rasm yoki PDF, ≤ 5 MB).'
  if (e.code === 'PGRST202' || e.code === 'PGRST205' || e.code === '42883' || e.code === '42P01' || msg.includes('schema cache') || msg.includes('bucket not found'))
    return 'Serverda murojaat bölimi hali yöq: `supabase/migrations/0009_support.sql` migratsiyasini qöllang.'
  if (e.code === '23514') return 'Matn uzunligi yoki fayl ruxsat etilgan çegaradan taşqarida.'
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Internet aloqasi yöq. Ulanişni tekşirib, qayta urinib köring.'
  return 'Server xatosi. Birozdan keyin qayta urinib köring.'
}

/* ------------------------------ ulanish ------------------------------ */

export interface SupportDeps {
  getClient(): Promise<SupabaseClient | null>
  configured: boolean
}

const defaultDeps: SupportDeps = { getClient: getSupabase, configured: supabaseConfigured }

async function withClient<T>(fn: (c: SupabaseClient, uid: string) => Promise<SupportResult<T>>, deps: SupportDeps): Promise<SupportResult<T>> {
  if (!deps.configured) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan — murojaat faqat server orqali yuboriladi.' }
  const c = await deps.getClient()
  if (!c) return { ok: false, reasonUz: 'Server (Supabase) ulanmagan.' }
  try {
    const { data, error } = await c.auth.getSession()
    if (error) return { ok: false, reasonUz: supportErrorUz(error) }
    const uid = data.session?.user?.id
    if (!uid) return { ok: false, reasonUz: 'Murojaat yuboriş uçun hisobingizga kiring.' }
    return await fn(c, uid)
  } catch (err) {
    return { ok: false, reasonUz: supportErrorUz(err) }
  }
}

async function upload(c: SupabaseClient, path: string, f: CheckedFile): Promise<string | null> {
  const { error } = await c.storage.from(BUCKET).upload(path, f.file, { contentType: f.type, upsert: false, cacheControl: '0' })
  return error ? supportErrorUz(error) : null
}

function attachmentCols(path: string | null, f: CheckedFile | null) {
  return {
    attachment_path: f ? path : null,
    attachment_name: f ? f.name : null,
    attachment_type: f ? f.type : null,
    attachment_size: f ? f.size : null,
  }
}

const TICKET_COLS = 'id,user_id,subject,status,created_at,last_message_at'
const MESSAGE_COLS = 'id,ticket_id,author_id,from_admin,body,attachment_path,attachment_name,attachment_type,attachment_size,created_at'

/* ------------------------------ foydalanuvchi ------------------------------ */

export function listMyTickets(deps: SupportDeps = defaultDeps): Promise<SupportResult<SupportTicket[]>> {
  return withClient(async (c, uid) => {
    const { data, error } = await c.from('support_tickets').select(TICKET_COLS).eq('user_id', uid).order('last_message_at', { ascending: false })
    if (error) return { ok: false, reasonUz: supportErrorUz(error) }
    return { ok: true, data: (data ?? []) as SupportTicket[] }
  }, deps)
}

export function loadThread(ticketId: string, deps: SupportDeps = defaultDeps): Promise<SupportResult<{ ticket: SupportTicket; messages: SupportMessage[] }>> {
  return withClient(async (c) => {
    const [t, m] = await Promise.all([
      c.from('support_tickets').select(TICKET_COLS).eq('id', ticketId).maybeSingle(),
      c.from('support_messages').select(MESSAGE_COLS).eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    ])
    if (t.error) return { ok: false, reasonUz: supportErrorUz(t.error) }
    if (m.error) return { ok: false, reasonUz: supportErrorUz(m.error) }
    if (!t.data) return { ok: false, reasonUz: 'Murojaat topilmadi.' }
    return { ok: true, data: { ticket: t.data as SupportTicket, messages: (m.data ?? []) as SupportMessage[] } }
  }, deps)
}

/** Yangi murojaat: (fayl bo'lsa avval yuklanadi) → murojaat + birinchi xabar bitta tranzaksiyada. */
export function openTicket(
  input: { subject: string; body: string; file: CheckedFile | null },
  deps: SupportDeps = defaultDeps,
): Promise<SupportResult<string>> {
  return withClient(async (c, uid) => {
    const bad = validateSubject(input.subject) ?? validateBody(input.body)
    if (bad) return { ok: false, reasonUz: bad }
    const ticketId = crypto.randomUUID()
    const path = input.file ? attachmentPath(uid, ticketId, input.file.type) : null
    if (input.file && path) {
      const err = await upload(c, path, input.file)
      if (err) return { ok: false, reasonUz: err }
    }
    const a = attachmentCols(path, input.file)
    const { data, error } = await c.rpc('support_open', {
      p_ticket: ticketId,
      p_subject: input.subject.trim(),
      p_body: input.body.trim(),
      p_attachment_path: a.attachment_path,
      p_attachment_name: a.attachment_name,
      p_attachment_type: a.attachment_type,
      p_attachment_size: a.attachment_size,
    })
    if (error) return { ok: false, reasonUz: supportErrorUz(error) }
    return { ok: true, data: String(data ?? ticketId) }
  }, deps)
}

/**
 * Xabar (foydalanuvchi yoki admin). `ownerId` — murojaat EGASI: fayl doim
 * uning papkasiga tushadi (admin javobi ham), shunda egasi o'z faylini ko'radi.
 */
export function sendMessage(
  input: { ticketId: string; ownerId: string; body: string; file: CheckedFile | null },
  deps: SupportDeps = defaultDeps,
): Promise<SupportResult<SupportMessage>> {
  return withClient(async (c) => {
    const bad = validateBody(input.body)
    if (bad) return { ok: false, reasonUz: bad }
    const path = input.file ? attachmentPath(input.ownerId, input.ticketId, input.file.type) : null
    if (input.file && path) {
      const err = await upload(c, path, input.file)
      if (err) return { ok: false, reasonUz: err }
    }
    const { data, error } = await c
      .from('support_messages')
      .insert({ ticket_id: input.ticketId, body: input.body.trim(), ...attachmentCols(path, input.file) })
      .select(MESSAGE_COLS)
      .single()
    if (error) return { ok: false, reasonUz: supportErrorUz(error) }
    return { ok: true, data: data as SupportMessage }
  }, deps)
}

/** Egasi — faqat yopadi; admin — istalgan holat (server tekshiradi). */
export function setTicketStatus(ticketId: string, status: TicketStatus, deps: SupportDeps = defaultDeps): Promise<SupportResult<true>> {
  return withClient(async (c) => {
    const { error } = await c.rpc('support_set_status', { p_ticket: ticketId, p_status: status })
    if (error) return { ok: false, reasonUz: supportErrorUz(error) }
    return { ok: true, data: true }
  }, deps)
}

/** Ilova havolasi (10 daqiqa). PDF — yuklab olish sifatida (brauzerda bajarilmaydi). */
export function attachmentUrl(m: Pick<SupportMessage, 'attachment_path' | 'attachment_name' | 'attachment_type'>, deps: SupportDeps = defaultDeps): Promise<SupportResult<string>> {
  return withClient(async (c) => {
    if (!m.attachment_path) return { ok: false, reasonUz: 'Ilova yöq.' }
    const opts = m.attachment_type === 'application/pdf' ? { download: m.attachment_name || 'fayl.pdf' } : undefined
    const { data, error } = await c.storage.from(BUCKET).createSignedUrl(m.attachment_path, SIGNED_URL_TTL, opts)
    if (error || !data?.signedUrl) return { ok: false, reasonUz: supportErrorUz(error) }
    return { ok: true, data: data.signedUrl }
  }, deps)
}

/* ------------------------------ admin ------------------------------ */

export function adminListTickets(status: TicketStatus | null, deps: SupportDeps = defaultDeps): Promise<SupportResult<AdminTicketRow[]>> {
  return withClient(async (c) => {
    const { data, error } = await c.rpc('admin_support_tickets', { p_status: status })
    if (error) return { ok: false, reasonUz: supportErrorUz(error) }
    const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      user_id: String(r.user_id),
      email: (r.email as string | null) ?? null,
      full_name: String(r.full_name ?? ''),
      subject: String(r.subject ?? ''),
      status: r.status as TicketStatus,
      created_at: String(r.created_at),
      last_message_at: String(r.last_message_at),
      messages: Number(r.messages) || 0,
      last_preview: (r.last_preview as string | null) ?? null,
      last_from_admin: (r.last_from_admin as boolean | null) ?? null,
    }))
    return { ok: true, data: rows }
  }, deps)
}

/** Admin: murojaatni (fayllari bilan) o'chirish. */
export function adminDeleteTicket(t: Pick<SupportTicket, 'id' | 'user_id'>, deps: SupportDeps = defaultDeps): Promise<SupportResult<true>> {
  return withClient(async (c) => {
    const folder = `${t.user_id}/${t.id}`
    const { data: files } = await c.storage.from(BUCKET).list(folder, { limit: 100 })
    if (files?.length) await c.storage.from(BUCKET).remove(files.map((f) => `${folder}/${f.name}`))
    const { error } = await c.from('support_tickets').delete().eq('id', t.id)
    if (error) return { ok: false, reasonUz: supportErrorUz(error) }
    return { ok: true, data: true }
  }, deps)
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
