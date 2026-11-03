/**
 * Testlar uchun Supabase mijozining kichik in-memory nusxasi: auth sessiyasi,
 * upsert (bitta yoki bulk) va select zanjiri. Faqat sinxronlash ishlatadigan
 * qismlar bor. Ulash: `vi.mock('../lib/supabase', …)` ichida `client`ni qaytaring.
 */

type Row = Record<string, unknown>
type DbError = { message: string; details: string; hint: string; code: string }

const pkOf = (table: string, r: Row): string => {
  if (table === 'user_settings') return String(r.user_id)
  if (table === 'user_vocabulary') return `${String(r.user_id)}|${String(r.vocabulary_id)}`
  if (table === 'daily_activity') return `${String(r.user_id)}|${String(r.day)}`
  return String(r.id)
}

const networkError: DbError = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' }

export const server = {
  /** Sessiya egasi */
  userId: 'u-test',
  tables: new Map<string, Map<string, Row>>(),
  calls: [] as { table: string; op: 'upsert' | 'select'; rows: number }[],
  /** true — har so'rov tarmoq xatosi bilan qaytadi */
  network: false,
  /** Qatorni rad etish (SQLSTATE kodi) — null bo'lsa qabul */
  failRow: null as ((table: string, row: Row) => string | null) | null,
  reset(userId = 'u-test') {
    this.userId = userId
    this.tables = new Map()
    this.calls = []
    this.network = false
    this.failRow = null
  },
  rows(table: string): Row[] {
    return [...(this.tables.get(table)?.values() ?? [])]
  },
}

function select(table: string) {
  let single = false
  const builder = {
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => {
      single = true
      return builder
    },
    then<A, B = never>(
      resolve: (v: { data: unknown; error: DbError | null }) => A | PromiseLike<A>,
      reject?: (e: unknown) => B | PromiseLike<B>,
    ): Promise<A | B> {
      server.calls.push({ table, op: 'select', rows: 0 })
      const rows = server.rows(table)
      const res = server.network
        ? { data: null, error: networkError }
        : { data: single ? (rows[0] ?? null) : rows, error: null }
      return Promise.resolve(res).then(resolve, reject)
    },
  }
  return builder
}

export const client = {
  auth: {
    getSession: async () => ({ data: { session: { user: { id: server.userId } } }, error: null }),
    signOut: async () => ({ error: null }),
  },
  from(table: string) {
    return {
      select: () => select(table),
      upsert: async (values: Row | Row[]): Promise<{ error: DbError | null }> => {
        const rows = Array.isArray(values) ? values : [values]
        server.calls.push({ table, op: 'upsert', rows: rows.length })
        if (server.network) return { error: networkError }
        for (const r of rows) {
          const code = server.failRow?.(table, r)
          if (code) return { error: { message: 'rejected', details: '', hint: '', code } }
        }
        const t = server.tables.get(table) ?? new Map<string, Row>()
        for (const r of rows) t.set(pkOf(table, r), { ...(t.get(pkOf(table, r)) ?? {}), ...r })
        server.tables.set(table, t)
        return { error: null }
      },
    }
  },
}
