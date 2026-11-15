/**
 * QURILMA sozlamalari (hisobga sinxronlanmaydi): hozircha faqat Immersion
 * rejimi (g'oya: Rosetta Stone «tarjimasiz o'rganish»).
 *
 * Nega qurilmada: hisob sozlamalari `user_settings` ustunlariga yoziladi va
 * mobil ilova bilan ham bo'lishiladi — yangi ustun migratsiya va mobil
 * paritetini talab qiladi. Bu rejim — o'qish uslubi, shuning uchun qurilmada
 * qoladi va Sozlamalarda shunday deb yoziladi.
 *
 * localStorage bloklangan bo'lsa (xususiy oyna) — standart qiymat, xato yo'q.
 */

import { useSyncExternalStore } from 'react'

const KEY = 'aea-immersion'
const EVENT = 'aea-prefs'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setImmersion(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    /* saqlab bo'lmadi — joriy oynada baribir yangilanadi */
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb()
  }
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

/** Immersion rejimi yoqilganmi (qurilma sozlamasi). */
export function useImmersion(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
