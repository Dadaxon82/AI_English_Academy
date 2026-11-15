/**
 * Toast xabarnomalari: amal natijasi (rol o'zgardi, xato…) qisqa vaqt
 * ko'rinadi. Ekran o'quvchilari uchun `aria-live` hududida e'lon qilinadi.
 */
import type { Toast } from './useToasts'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

export function ToastStack({ items, onDismiss }: { items: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed z-[60] bottom-20 md:bottom-6 right-4 left-4 sm:left-auto grid gap-2 sm:w-96" role="status" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`panel flex items-start gap-3 p-3 shadow-lg border-l-4 animate-[var(--animate-slide-up)] ${
            t.tone === 'ok' ? 'border-l-emerald-600' : 'border-l-rose-600'
          }`}
        >
          {t.tone === 'ok' ? (
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
          ) : (
            <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-700 dark:text-rose-400" />
          )}
          <p className="text-sm flex-1">{t.text}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="rounded-md p-1 muted hover:bg-[var(--panel-2)]"
            aria-label="Xabarni yopiş"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
