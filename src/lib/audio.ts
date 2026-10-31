/**
 * Audio manifesti — "Audio topilmasa, soxta audio yoki ishlamaydigan
 * tugma ko'rsatmaslik" talabi uchun yagona manba.
 *
 * public/audio/manifest.json `npm run audio:build` bilan yaratiladi.
 * Manifest bo'lmasa yoki item.available === false bo'lsa pleyer
 * ko'rsatilmaydi.
 */

export interface AudioManifestItem {
  id: string
  src: string
  title: string
  durationSec: number
  license: string
  attribution: string
  available: boolean
}

let cached: Record<string, AudioManifestItem> | null = null
let loading: Promise<Record<string, AudioManifestItem> | null> | null = null

/**
 * Vite `base` (GitHub project page uchun `/AI_English_Academy/`) bilan
 * boshlanadigan yo'lni bog'lash. Manifestdagi `/audio/...` kabi mutlaq
 * yo'llarini sahifaga moslash uchun ishlatiladi.
 */
export function assetUrl(p: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const clean = p.replace(/^\/+/, '')
  return base.replace(/\/+$/, '/') + clean
}

export async function loadAudioManifest(): Promise<Record<string, AudioManifestItem> | null> {
  if (cached) return cached
  if (loading) return loading
  loading = (async () => {
    try {
      const res = await fetch(assetUrl('/audio/manifest.json'), { cache: 'no-cache' })
      if (!res.ok) return null
      const json = (await res.json()) as { items?: AudioManifestItem[] }
      const map: Record<string, AudioManifestItem> = {}
      for (const it of json.items ?? []) {
        // src'ni base bilan moslashtiramiz (manifest `/audio/...` deb yozilgan)
        map[it.id] = { ...it, src: assetUrl(it.src) }
      }
      cached = map
      return map
    } catch {
      return null
    }
  })()
  const out = await loading
  // MUBOHIM xato: oldin muvaffaqiyatsizlik ham doimiy "kesh" bo'lib qolardi —
  // bir marta (masalan tarmaq uzilgan paytda) barbod bo'lgan manifest biror
  // marta ham qayta o'qilmay, butun seansi audio'siz qoldirardi (refresh'gacha).
  if (out === null) loading = null
  return loading ?? out
}

/**
 * Audio haqiqatan mavjudmi (soxta pleyer ko'rsatmaslik uchun asosiy darvoza).
 *
 * Eski versiyada `manifestOk === true` bo'lsa elementning o'zi tekshirilmasdi
 * — manifestda umuman yo'q (yoki available:false) item uchun ham `true`
 * qaytardi va "Audio fayl topilmadi" haqido yozuv ko'rinmasdi.
 *
 * @param manifestOk null — manifest hali yuklanmoqda (optimistik true)
 *                   false — manifest o'qib bo'lmadi (har qanday audio yo'q)
 *                   true  — manifest yuklandi, element xaritasiga qaraymiz
 */
export function hasAudio(manifestOk: boolean | null, audio: { id: string; fileAvailable: boolean }): boolean {
  if (!audio.fileAvailable) return false
  if (manifestOk === null) return true // hali tekshirilmagan — optimistic
  if (manifestOk === false) return false
  const item = cached?.[audio.id]
  if (!item) return false // manifestda yo'q
  return item.available === true
}

export function audioItem(id: string): AudioManifestItem | null {
  return cached?.[id] ?? null
}
