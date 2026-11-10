/**
 * Content-Security-Policy (faqat production build). GitHub Pages HTTP sarlavha
 * qo'yishga ruxsat bermaydi, shuning uchun <meta>. Inline skript YO'Q — XSS bo'lsa
 * ham begona skript ishga tushmaydi. Dev serverda qo'yilmaydi (HMR inline skripti).
 */
export function cspContent(supabaseUrl: string | undefined): string {
  const sb = supabaseUrl && /^https:\/\/[a-z0-9.-]+$/i.test(supabaseUrl.replace(/\/+$/, '')) ? supabaseUrl.replace(/\/+$/, '') : 'https://*.supabase.co'
  const ws = sb.replace(/^https:/, 'wss:')
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${sb} ${ws}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ')
}
