import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub project page `/AI_English_Academy/` ostida turadi. Barcha resurs
// yo'llari shu bazaga nisbatan chiqarilishi kerak — aks holda brauzer
// /assets/... ni rootдан izlaydi va 404 oladi. Custom domain / root deploy
// uchun: VITE_BASE=/ npm run build
export const APP_BASE = process.env.VITE_BASE ?? '/AI_English_Academy/'

// OG / canonical uchun MUTLAQ manzil (index.html'da %VITE_SITE_URL%). Custom domain
// bo'lsa: VITE_SITE_URL=https://example.uz/ npm run build
process.env.VITE_SITE_URL ??= `https://dadaxon82.github.io${APP_BASE}`

export default defineConfig({
  base: APP_BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'AI English Academy',
        short_name: 'AEA',
        description: "Ingliz tilini o'zbek tilida, o'yin shaklida o'rganish: CEFR yo'li (hozir A1 va A2 darslari), Mock Exam, oflayn",
        lang: 'uz',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait-primary',
        // Project page: start_url/scope bazaga nisbatan ('./' → /AI_English_Academy/)
        start_url: './',
        scope: './',
        background_color: '#0b1b34',
        theme_color: '#0b1b34',
        categories: ['education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // Do'kon / o'rnatish oynasidagi skrinshotlar — haqiqiy ilovadan (scripts/make-share-images.mjs).
        screenshots: [
          { src: 'screenshots/wide-dashboard.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide', label: 'Bosh sahifa: kunlik reja va darslar xaritasi' },
          { src: 'screenshots/wide-path.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide', label: 'O‘quv yo‘li xaritasi' },
          { src: 'screenshots/narrow-dashboard.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow', label: 'Bosh sahifa (telefon)' },
          { src: 'screenshots/narrow-path.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow', label: 'O‘quv yo‘li (telefon)' },
        ],
        shortcuts: [
          { name: 'Dashboard', url: 'dashboard', description: 'Asosiy panel' },
          { name: 'Vocabulary', url: 'vocabulary', description: "Lug'at va flashcard" },
          { name: 'Mock Exam', url: 'mock-exam', description: 'Sinov namunasi' },
        ],
      },
      workbox: {
        // WAV audio PRECACHE qilinmaydi (~16 MB — mobil internet uchun og'ir).
        // Uning o'rniga pastdagi runtimeCaching `/audio/` qoidasi birinchi
        // tinglashdan keyin faylni keshlaydi → keyingi safar offline ishlaydi.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
        // Ulashish rasmlari oflayn kerak emas — precache'ni og'irlashtirmaydi.
        // Admin panel (grafiklar ~400 KB) oflayn keshga KIRMAYDI: u faqat
        // server bilan ishlaydi va o'quvchilarga kerak emas.
        globIgnores: ['**/og-image.png', '**/screenshots/**', '**/assets/admin-vendor-*.js', '**/assets/AdminDashboard-*.js'],
        navigateFallback: `${APP_BASE}index.html`,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Statik resurslar: kesh, cheklangan offline rejim (faqat o'z sayti)
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'aea-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Ruxsat etilgan audio materiallar offline uchun saqlanadi
            // (base `/AI_English_Academy/` bo'lgani uchun endsWith emas, includes).
            // Faqat o'z saytimiz: uchinchi tomon audio/rasm keshiga tushib,
            // foydalanuvchi ma'lumoti boshqa sayt so'rovlariga aralashmasin.
            urlPattern: ({ request, url, sameOrigin }) =>
              sameOrigin && (request.destination === 'audio' || url.pathname.includes('/audio/')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'aea-audio',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            // Supabase API: faqat GET so'rovlar, network-first (eski ma'lumot xavfli)
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'aea-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Kutubxonalar alohida, kam o'zgaradigan chunk'larda — ilova kodi
        // yangilanganda brauzer/SW keshidagi vendor fayllar qayta yuklanmaydi.
        // Supabase dinamik import qilinadi (`lib/supabase.ts`) — mehmon
        // rejimida umuman yuklanmaydi.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser)\//.test(id)) return 'react'
          if (id.includes('@supabase')) return 'supabase'
          // Faqat admin panel ishlatadi — boshlang'ich yuklanishga kirmasin
          // (Recharts + uning bog'liqliklari, ikonkalar).
          if (/node_modules\/(recharts|victory-vendor|d3-[a-z-]+|internmap|@reduxjs|redux|react-redux|reselect|immer|es-toolkit|decimal\.js-light|eventemitter3|tiny-invariant|clsx|use-sync-external-store|react-is|lucide-react)\//.test(id))
            return 'admin-vendor'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
