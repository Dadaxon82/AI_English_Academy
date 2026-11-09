import { describe, expect, it } from 'vitest'
import { getSupabase, supabaseConfigured } from '../lib/supabase'

describe('getSupabase (dinamik yuklash)', () => {
  it('sozlanmagan bo‘lsa — null, kutubxona yuklanmaydi', async () => {
    expect(supabaseConfigured).toBe(false)
    await expect(getSupabase()).resolves.toBeNull()
  })
})
