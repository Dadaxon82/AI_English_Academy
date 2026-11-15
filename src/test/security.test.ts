/**
 * Xavfsizlik (2026-11-10 audit): yangi parol talabi, email tasdiq manzili, CSP.
 * Server qoidalari: `supabase/tests/security.test.sql`.
 */
import { describe, expect, it } from 'vitest'
import { authRedirectUrl, NEW_PASSWORD_MIN, validateNewPassword } from '../lib/auth'
import { cspContent } from '../lib/csp'

describe('yangi parol', () => {
  it('kamida 8 belgi, harf va raqam', () => {
    expect(NEW_PASSWORD_MIN).toBe(8)
    expect(validateNewPassword('abc12')).toMatch(/kamida 8/)
    expect(validateNewPassword('abcdefgh')).toMatch(/harf va .* raqam/)
    expect(validateNewPassword('12345678')).toMatch(/harf va .* raqam/)
    expect(validateNewPassword('salom2026')).toBeNull()
  })

  it('email tasdiq havolasi saytning öziga qaytadi (localhost:3000 emas)', () => {
    const u = authRedirectUrl()
    expect(u.startsWith(window.location.origin)).toBe(true)
    expect(u.endsWith('/')).toBe(true)
  })
})

describe('Content-Security-Policy', () => {
  it('inline skript yöq, faqat öz sayti va Supabase', () => {
    const c = cspContent('https://abc.supabase.co')
    expect(c).toContain("script-src 'self'")
    expect(c).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(c).not.toContain('unsafe-eval')
    expect(c).toContain("object-src 'none'")
    expect(c).toContain('connect-src \'self\' https://abc.supabase.co wss://abc.supabase.co')
  })

  it('noto‘g‘ri yoki bo‘sh URL — umumiy *.supabase.co (kod in’ekciyasi yo‘q)', () => {
    expect(cspContent(undefined)).toContain('https://*.supabase.co')
    expect(cspContent('https://x.supabase.co"; script-src *')).toContain('https://*.supabase.co')
  })
})
