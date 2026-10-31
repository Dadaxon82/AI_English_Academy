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

export async function loadAudioManifest(): Promise<Record<string, AudioManifestItem> | null> {
  if (cached) return cached
  if (loading) return loading
  loading = (async () => {
    try {
      const res = await fetch('/audio/manifest.json', { cache: 'no-cache' })
      if (!res.ok) {
        cached = null
        return null
      }
      const json = (await res.json()) as { items?: AudioManifestItem[] }
      const map: Record<string, AudioManifestItem> = {}
      for (const it of json.items ?? []) map[it.id] = it
      cached = map
      return map
    } catch {
      cached = null
      return null
    }
  })()
  return loading
}

/** Manifestni tekshirish uchun kutish kerak — shu funksiyaga manifestOk beriladi. */
export function hasAudio(manifestOk: boolean | null, audio: { id: string; fileAvailable: boolean }): boolean {
  if (!audio.fileAvailable) return false
  if (manifestOk === null) return true // hali tekshirilmagan — optimistic
  if (manifestOk === false) return false
  return true
}

export function audioItem(id: string): AudioManifestItem | null {
  return cached?.[id] ?? null
}
