/**
 * Hamjamiyat tekshiruvi — mijoz qatlami (`src/lib/peer.ts`).
 * Server qoidalari (RLS, tayinlov, moderatsiya) alohida: `supabase/tests/peer_review.test.sql`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Call = { op: string; table?: string; payload?: unknown; filters?: unknown[] }
const calls: Call[] = []
let session: { user: { id: string } } | null = { user: { id: 'u-1' } }
let nextError: { code?: string; message: string } | null = null
let rpcRows: unknown[] = []
let selectRows: Record<string, unknown[]> = {}

function result(data: unknown) {
  const err = nextError
  nextError = null
  return Promise.resolve(err ? { data: null, error: err } : { data, error: null })
}

function builder(table: string) {
  const filters: unknown[] = []
  const b = {
    insert(payload: unknown) {
      calls.push({ op: 'insert', table, payload })
      // Haqiqiy mijoz kabi KECHIKTIRILGAN: natija faqat await qilinganda (yoki .select().single()da) olinadi.
      return {
        select: () => ({ single: () => result({ id: 's-new', ...(payload as object) }) }),
        then: <A, B>(res: (v: unknown) => A, rej?: (e: unknown) => B) => result(null).then(res, rej),
      }
    },
    select() {
      return b
    },
    eq(c: string, v: unknown) {
      filters.push([c, v])
      return b
    },
    in(c: string, v: unknown) {
      filters.push([c, v])
      calls.push({ op: 'select', table, filters })
      return result(selectRows[table] ?? [])
    },
    order() {
      return b
    },
    limit() {
      calls.push({ op: 'select', table, filters })
      return result(selectRows[table] ?? [])
    },
    delete() {
      return {
        eq(c: string, v: unknown) {
          calls.push({ op: 'delete', table, filters: [[c, v]] })
          return result(null)
        },
      }
    },
  }
  return b
}

const client = {
  auth: { getSession: async () => ({ data: { session }, error: null }) },
  from: (t: string) => builder(t),
  rpc: (fn: string, args: unknown) => {
    calls.push({ op: 'rpc', table: fn, payload: args })
    return result(rpcRows)
  },
}

let configured = true
vi.mock('../lib/supabase', () => ({
  get supabaseConfigured() {
    return configured
  },
  getSupabase: async () => (configured ? client : null),
}))

const peer = await import('../lib/peer')

beforeEach(() => {
  calls.length = 0
  session = { user: { id: 'u-1' } }
  nextError = null
  rpcRows = []
  selectRows = {}
  configured = true
})

describe('tekşiruvlar (SQL CHECK bilan bir xil çegaralar)', () => {
  it('izoh: baho 1–5, matn 10–1000', () => {
    expect(peer.validateReview(0, 'yaxşi yozilgan matn')).toMatch(/1 dan 5/)
    expect(peer.validateReview(4, 'qisqa')).toMatch(/kamida 10/)
    expect(peer.validateReview(4, 'x'.repeat(1001))).toMatch(/juda uzun/)
    expect(peer.validateReview(5, '  Juda yaxşi, rahmat!  ')).toBeNull()
  })
  it('javob: böş va 4000 dan uzun rad etiladi', () => {
    expect(peer.validateSubmissionBody('   ')).toMatch(/Böş/)
    expect(peer.validateSubmissionBody('a'.repeat(4001))).toMatch(/juda uzun/)
    expect(peer.validateSubmissionBody('Hello')).toBeNull()
  })
})

describe('xatolar → tuşunarli sabab', () => {
  it('kunlik çegara, migratsiya yöq, takror, ruxsat, internet', () => {
    expect(peer.peerErrorUz({ code: 'P0001', message: 'peer_daily_limit' })).toMatch(/kunlik çegara/)
    expect(peer.peerErrorUz({ code: 'PGRST205', message: "Could not find the table 'public.peer_submissions' in the schema cache" })).toMatch(/0006_peer_review/)
    expect(peer.peerErrorUz({ code: '23505', message: 'duplicate key' })).toMatch(/allaqaçon/)
    expect(peer.peerErrorUz({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(/ruxsat yöq/)
    expect(peer.peerErrorUz({ message: 'TypeError: Failed to fetch' })).toMatch(/Internet/)
  })
})

describe('ulaniş', () => {
  it('server sozlanmagan — sabab, sörov yuborilmaydi', async () => {
    configured = false
    const r = await peer.claimPeerSubmission()
    expect(r).toEqual({ ok: false, reasonUz: expect.stringMatching(/Supabase/) })
    expect(calls).toEqual([])
  })
  it('mehmon (sessiya yöq) — hisobga kiriş söraladi', async () => {
    session = null
    const r = await peer.submitForPeerReview({ kind: 'writing', taskId: 't', level: 'A1', prompt: '', body: 'Hello' })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.reasonUz).toMatch(/hisobingizga kiring/)
    expect(calls).toEqual([])
  })
})

describe('amallar', () => {
  it('yuboriş: matn kesiladi, muallif id’si yuborilmaydi (server auth.uid() qöyadi)', async () => {
    const r = await peer.submitForPeerReview({ kind: 'speaking', taskId: 'a1-s-01', level: 'A1', prompt: 'p'.repeat(1200), body: '  my name is Aziz  ' })
    expect(r.ok).toBe(true)
    const payload = calls[0]!.payload as Record<string, unknown>
    expect(calls[0]).toMatchObject({ op: 'insert', table: 'peer_submissions' })
    expect(payload.body).toBe('my name is Aziz')
    expect((payload.prompt as string).length).toBe(1000)
    expect(payload).not.toHaveProperty('author_id')
  })
  it('notöğri izoh serverga yuborilmaydi', async () => {
    const r = await peer.submitPeerReview('s1', 4, 'qisqa')
    expect(r.ok).toBe(false)
    expect(calls).toEqual([])
  })
  it('izoh va şikoyat töğri jadvalga', async () => {
    expect((await peer.submitPeerReview('s1', 4, 'Yaxşi, lekin gaplarni boğlang.')).ok).toBe(true)
    expect(calls[0]).toMatchObject({ op: 'insert', table: 'peer_reviews', payload: { submission_id: 's1', score: 4 } })
    expect((await peer.reportPeer({ reviewId: 'r1' }, 'offensive')).ok).toBe(true)
    expect(calls[1]).toMatchObject({ op: 'insert', table: 'peer_reports', payload: { review_id: 'r1', reason: 'offensive' } })
    expect(calls[1]!.payload).not.toHaveProperty('submission_id')
  })
  it('tayinlov: rpc peer_claim; böş natija — null', async () => {
    expect(await peer.claimPeerSubmission()).toEqual({ ok: true, data: null })
    expect(calls[0]).toMatchObject({ op: 'rpc', table: 'peer_claim', payload: { p_kind: null } })
    rpcRows = [{ id: 's9', kind: 'writing' }]
    expect(await peer.claimPeerSubmission('writing')).toEqual({ ok: true, data: { id: 's9', kind: 'writing' } })
  })
  it('server xatosi sabab bilan qaytadi', async () => {
    nextError = { code: 'P0001', message: 'peer_daily_limit' }
    const r = await peer.submitForPeerReview({ kind: 'writing', taskId: 't', level: 'A1', prompt: '', body: 'Hello' })
    expect(r).toEqual({ ok: false, reasonUz: expect.stringMatching(/kunlik çegara/) })
  })
  it('mening javoblarim: izohlar javobga biriktiriladi', async () => {
    selectRows = {
      peer_submissions: [{ id: 'a' }, { id: 'b' }],
      peer_reviews: [{ id: 'r1', submission_id: 'b', score: 5, comment: 'zör iş' }],
    }
    const r = await peer.myPeerSubmissions()
    expect(r.ok && r.data.map((x) => [x.submission.id, x.reviews.length])).toEqual([['a', 0], ['b', 1]])
    expect(calls[0]).toMatchObject({ table: 'peer_submissions', filters: [['author_id', 'u-1']] })
  })
})
