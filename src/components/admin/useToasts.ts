/** Toast holati (navbat + avtomatik yopilish). Ko'rinish — `Toasts.tsx`. */
import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastTone = 'ok' | 'error'
export interface Toast {
  id: number
  tone: ToastTone
  text: string
}

export const TOAST_MS = 4000

export function useToasts() {
  const [items, setItems] = useState<Toast[]>([])
  const seq = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (tone: ToastTone, text: string) => {
      const id = ++seq.current
      setItems((xs) => [...xs.slice(-3), { id, tone, text }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_MS),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => {
      for (const t of map.values()) clearTimeout(t)
      map.clear()
    }
  }, [])

  return { items, push, dismiss }
}
