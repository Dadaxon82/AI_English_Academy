import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub project page `/AI_English_Academy/` ostida turadi. Barcha resurs
// yo'llari shu bazaga nisbatan chiqarilishi kerak — aks holda brauzer
// /assets/... ni rootдан izlaydi va 404 oladi. Custom domain / root deploy
// uchun: VITE_BASE=/ npm run build
export const APP_BASE = process.env.VITE_BASE ?? '/AI_English_Academy/'

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
        description: "Ingliz tilini A1 dan C1 gacha o'rganish platformasi",
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
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
