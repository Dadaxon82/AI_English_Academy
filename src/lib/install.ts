/**
 * Mobil ilova — PWA'ni telefon/kompyuter bosh ekraniga o'rnatish.
 *
 * Ilova allaqachon PWA (manifest + service worker): alohida APK shart emas.
 * Chromium brauzerlar (Android Chrome, kompyuterda Chrome/Edge) o'rnatish
 * oynasini `beforeinstallprompt` hodisasi orqali beradi. Hodisa sahifa
 * yuklanishi bilanoq (Dashboard ochilmasdan oldin ham) kelishi mumkin —
 * shuning uchun u ilova boshlanishida ushlab qolinadi va keyin tugma
 * bosilganda chaqiriladi. iOS Safari bu hodisani bermaydi: u yerda
 * foydalanuvchi "Ulashish → Bosh ekranga qo'shish" orqali o'rnatadi.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/**
 * - `standalone` — ilova o'rnatilgan va hozir ilova sifatida ochilgan (blok kerak emas)
 * - `installed`  — shu brauzerda hozirgina o'rnatildi
 * - `prompt`     — brauzer o'rnatish oynasini ko'rsata oladi (tugma ishlaydi)
 * - `ios`        — iPhone/iPad: qo'lda "Bosh ekranga qo'shish"
 * - `manual`     — boshqa brauzerlar: menyu orqali (tugma ko'rsatilmaydi)
 */
export type InstallKind = 'standalone' | 'installed' | 'prompt' | 'ios' | 'manual'

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
let started = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

/** Ilova boshlanishida bir marta chaqiriladi (main.tsx). */
export function initInstallPrompt(): void {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('beforeinstallprompt', (e) => {
    // Brauzerning o'z kichik banneri o'rniga Dashboard'dagi tugma ishlatiladi.
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    emit()
  })
}

function isStandalone(): boolean {
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios || window.matchMedia?.('(display-mode: standalone)').matches === true
}

function isIos(): boolean {
  // iPadOS 13+ o'zini Mac deb ko'rsatadi — sensorli ekran bilan ajratiladi.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

export function getInstallKind(): InstallKind {
  if (typeof window === 'undefined') return 'manual'
  if (isStandalone()) return 'standalone'
  if (installed) return 'installed'
  if (deferred) return 'prompt'
  return isIos() ? 'ios' : 'manual'
}

export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Brauzerning o'rnatish oynasini ochish (`prompt` holatida). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred
  if (!e) return 'unavailable'
  // Hodisani faqat bir marta ishlatish mumkin — brauzer keyin yangisini yuboradi.
  deferred = null
  emit()
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'accepted') {
    installed = true
    emit()
  }
  return outcome
}
