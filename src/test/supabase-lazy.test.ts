import { describe, expect, it } from 'vitest'
import { getSupabase, supabaseConfigured } from '../lib/supabase'

describe('getSupabase (dinamik yuklaş)', () => {
  it('sozlanmagan bölsa — null, kutubxona yuklanmaydi', async () => {
    expect(supabaseConfigured).toBe(false)
    await expect(getSupabase()).resolves.toBeNull()
  })
})
