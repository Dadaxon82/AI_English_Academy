/**
 * Adminga murojaat (0009) va parolni o'zgartirish — mijoz qatlami.
 * Server qoidalari: `supabase/tests/support.test.sql`.
 */
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MAX_FILE_BYTES,
  attachmentPath,
  attachmentUrl,
  checkAttachment,
  openTicket,
  safeFileName,
  sendMessage,
  sniffType,
  supportErrorUz,
  validateBody,
  validateSubject,
  type CheckedFile,
} from '../lib/support'
import { changePassword, requestPasswordReset, setNewPasswordAfterRecovery } from '../lib/auth'

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]
const file = (bytes: number[], name: string, type = '') => new File([new Uint8Array(bytes)], name, { type })

describe('fayl tekshiruvi', () => {
  it('turini birinçi baytlardan aniqlaydi', () => {
    expect(sniffType(new Uint8Array(PNG))).toBe('image/png')
    expect(sniffType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp')
    expect(sniffType(new Uint8Array(PDF))).toBe('application/pdf')
    expect(sniffType(new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c]))).toBeNull() // <html
  })

  it('rasm va PDF qabul qilinadi; nomi .png bölgan HTML — yöq; katta fayl — yöq', async () => {
    const ok = await checkAttachment(file(PNG, 'ekran.png', 'image/png'))
    expect(ok).toMatchObject({ ok: true, data: { type: 'image/png', name: 'ekran.png' } })
    expect(await checkAttachment(file(PDF, 'hujjat.pdf'))).toMatchObject({ ok: true, data: { type: 'application/pdf' } })
    const fake = await checkAttachment(file([0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], 'x.png', 'image/png'))
    expect(fake).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/rasm .* PDF/) })
    const big = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'big.png')
    expect(await checkAttachment(big)).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/5 MB/) })
    expect(await checkAttachment(file([], 'empty.pdf'))).toMatchObject({ ok: false })
  })

  it('fayl nomi: yöl va boşqaruv belgilari olib taşlanadi', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd')
    expect(safeFileName('C:\\Users\\a\\rasm<1>.png')).toBe('rasm1.png')
    expect(safeFileName('')).toBe('fayl')
    expect(safeFileName('a'.repeat(300) + '.pdf').length).toBe(120)
  })

  it('saqlaş yöli: egasi/murojaat/tasodifiy-uuid.kengaytma (asl nom yöqda emas)', () => {
    expect(attachmentPath('u1', 't1', 'image/jpeg', 'abc')).toBe('u1/t1/abc.jpg')
    expect(attachmentPath('u1', 't1', 'application/pdf')).toMatch(/^u1\/t1\/[0-9a-f-]{36}\.pdf$/)
  })
})

describe('matn va xatolar', () => {
  it('mavzu va xabar çegaralari', () => {
    expect(validateSubject('ab')).toMatch(/kamida 3/)
    expect(validateSubject('  Darsda xato ')).toBeNull()
    expect(validateBody('   ')).toMatch(/yozing/)
    expect(validateBody('x'.repeat(4001))).toMatch(/4000/)
  })
  it('server xatolari — tuşunarli sabab', () => {
    expect(supportErrorUz({ message: 'support_too_many' })).toMatch(/5 ta oçiq/)
    expect(supportErrorUz({ message: 'support_closed' })).toMatch(/yopilgan/)
    expect(supportErrorUz({ code: 'PGRST202', message: 'x' })).toMatch(/0009_support/)
    expect(supportErrorUz({ message: 'new row violates row-level security policy' })).toMatch(/limit/)
  })
})

/* ------------------------------ soxta Supabase mijozi ------------------------------ */

function fakeClient(uid = 'u-1') {
  const calls: { upload: [string, unknown, unknown][]; rpc: [string, Record<string, unknown>][]; insert: Record<string, unknown>[]; signed: unknown[] } = {
    upload: [],
    rpc: [],
    insert: [],
    signed: [],
  }
  const c = {
    auth: { getSession: async () => ({ data: { session: { user: { id: uid } } }, error: null }) },
    storage: {
      from: () => ({
        upload: async (p: string, f: unknown, o: unknown) => (calls.upload.push([p, f, o]), { error: null }),
        createSignedUrl: async (...a: unknown[]) => (calls.signed.push(a), { data: { signedUrl: 'https://x.supabase.co/sign/1' }, error: null }),
      }),
    },
    rpc: async (fn: string, args: Record<string, unknown>) => (calls.rpc.push([fn, args]), { data: args.p_ticket, error: null }),
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        calls.insert.push(row)
        return { select: () => ({ single: async () => ({ data: { id: 'm1', created_at: 'now', from_admin: false, ...row }, error: null }) }) }
      },
    }),
  }
  return { deps: { configured: true, getClient: async () => c as unknown as SupabaseClient }, calls }
}

const png: CheckedFile = { file: new Blob([new Uint8Array(PNG)]), name: 'ekran.png', type: 'image/png', size: 12 }

describe('murojaat yuboriş', () => {
  it('yangi murojaat: avval fayl (öz papkasiga), keyin support_open bir tranzaksiyada', async () => {
    const { deps, calls } = fakeClient('u-1')
    const r = await openTicket({ subject: ' Xato ', body: ' Rasmga qarang ', file: png }, deps)
    expect(r.ok).toBe(true)
    const [path, , opts] = calls.upload[0]!
    const [fn, args] = calls.rpc[0]!
    expect(fn).toBe('support_open')
    expect(path).toBe(`u-1/${args.p_ticket}/${String(path).split('/')[2]}`)
    expect(path).toMatch(/\.png$/)
    expect(opts).toMatchObject({ contentType: 'image/png', upsert: false })
    expect(args).toMatchObject({ p_subject: 'Xato', p_body: 'Rasmga qarang', p_attachment_path: path, p_attachment_name: 'ekran.png', p_attachment_type: 'image/png', p_attachment_size: 12 })
  })

  it('notöğri mavzu — serverga hech narsa yuborilmaydi', async () => {
    const { deps, calls } = fakeClient()
    const r = await openTicket({ subject: 'a', body: 'matn', file: png }, deps)
    expect(r).toMatchObject({ ok: false })
    expect(calls.upload).toHaveLength(0)
    expect(calls.rpc).toHaveLength(0)
  })

  it('admin javobi fayli murojaat EGASI papkasiga tuşadi (egasi köra olsin); admin belgisini mijoz yubormaydi', async () => {
    const { deps, calls } = fakeClient('admin-1')
    const r = await sendMessage({ ticketId: 't-9', ownerId: 'owner-7', body: 'Javob', file: png }, deps)
    expect(r.ok).toBe(true)
    expect(calls.upload[0]![0]).toMatch(/^owner-7\/t-9\/[0-9a-f-]{36}\.png$/)
    expect(calls.insert[0]).not.toHaveProperty('from_admin')
    expect(calls.insert[0]).not.toHaveProperty('author_id')
  })

  it('PDF ilova — yuklab oliş sifatida (brauzerda oçilmaydi), havola 10 daqiqa', async () => {
    const { deps, calls } = fakeClient()
    const r = await attachmentUrl({ attachment_path: 'a/b/c.pdf', attachment_name: 'hujjat.pdf', attachment_type: 'application/pdf' }, deps)
    expect(r).toEqual({ ok: true, data: 'https://x.supabase.co/sign/1' })
    expect(calls.signed[0]).toEqual(['a/b/c.pdf', 600, { download: 'hujjat.pdf' }])
  })

  it('server ulanmagan — halol sabab', async () => {
    const r = await openTicket({ subject: 'Mavzu', body: 'x', file: null }, { configured: false, getClient: async () => null })
    expect(r).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/ulanmagan/) })
  })
})

describe('parolni özgartiriş', () => {
  it('server qayta tasdiqlaşni sörasa — kod bilan saqlanadi', async () => {
    const updateUser = vi
      .fn()
      .mockResolvedValueOnce({ error: { code: 'reauthentication_needed', message: 'Password update requires reauthentication' } })
      .mockResolvedValueOnce({ error: null })
    const client = async () => ({ auth: { updateUser, reauthenticate: vi.fn() } }) as never
    expect(await changePassword('yangi2026', undefined, client)).toEqual({ ok: false, needsCode: true })
    expect(await changePassword('yangi2026', ' 123456 ', client)).toEqual({ ok: true })
    expect(updateUser).toHaveBeenLastCalledWith({ password: 'yangi2026', nonce: '123456' })
  })

  it('oddiy parol serverga yuborilmaydi; eski parol bilan bir xil — sabab', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: { code: 'same_password', message: 'x' } })
    const client = async () => ({ auth: { updateUser, reauthenticate: vi.fn() } }) as never
    expect(await changePassword('qisqa1', undefined, client)).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/kamida 8/) })
    expect(updateUser).not.toHaveBeenCalled()
    expect(await changePassword('salom2026', undefined, client)).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/farq/) })
  })
})

describe('parolni tiklaş (unutilgan parol)', () => {
  it('töğri email uçun tiklaş havolasi sörasa — saytga qaytadigan redirectTo bilan', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null })
    const client = async () => ({ auth: { resetPasswordForEmail } }) as never
    expect(await requestPasswordReset('sardor@example.com', client)).toEqual({ ok: true })
    expect(resetPasswordForEmail).toHaveBeenCalledWith('sardor@example.com', { redirectTo: expect.any(String) })
  })

  it('notöğri email formatida serverga murojaat qilinmaydi', async () => {
    const resetPasswordForEmail = vi.fn()
    const client = async () => ({ auth: { resetPasswordForEmail } }) as never
    expect(await requestPasswordReset('notöğri', client)).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/notöğri/) })
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('server xato qaytarsa — sabab özbekçe körinadi', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: { status: 429, message: 'rate limit' } })
    const client = async () => ({ auth: { resetPasswordForEmail } }) as never
    expect(await requestPasswordReset('sardor@example.com', client)).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/Juda köp/) })
  })

  it('tiklaş sessiyasida yangi parolni saqlaydi', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null })
    const client = async () => ({ auth: { updateUser, signOut: vi.fn() } }) as never
    expect(await setNewPasswordAfterRecovery('yangi2026', client)).toEqual({ ok: true })
    expect(updateUser).toHaveBeenCalledWith({ password: 'yangi2026' })
  })

  it('zaif yangi parol serverga yuborilmaydi', async () => {
    const updateUser = vi.fn()
    const client = async () => ({ auth: { updateUser, signOut: vi.fn() } }) as never
    expect(await setNewPasswordAfterRecovery('qisqa1', client)).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/kamida 8/) })
    expect(updateUser).not.toHaveBeenCalled()
  })
})
