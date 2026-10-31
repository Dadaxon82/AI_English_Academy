/**
 * UI kompozitsiyasi — premium, minimalist, dark/light.
 * Loading / empty / success / error holatlari uchun alohida komponentlar.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

// ------------------------------ Tugmalar ------------------------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

export function Button({
  variant = 'primary',
  size = 'md',
  busy = false,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; busy?: boolean }) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 select-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-base px-5 py-3' }
  const variants: Record<Variant, string> = {
    primary: 'bg-navy-700 text-white hover:bg-navy-600 shadow-sm dark:bg-navy-500 dark:hover:bg-navy-400 dark:text-navy-950',
    secondary:
      'bg-white text-navy-900 border hover:bg-slate-50 dark:bg-[var(--panel)] dark:text-[var(--text)] dark:hover:bg-[var(--panel-2)]',
    ghost: 'bg-transparent text-[var(--text)] hover:bg-[var(--panel-2)]',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500',
  }
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {busy && <Spinner size={14} />}
      {children}
    </button>
  )
}

// ------------------------------ Kartalar ------------------------------
export function Card({ children, className = '', as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <As className={`panel p-4 sm:p-5 animate-[var(--animate-slide-up)] ${className}`}>{children}</As>
}

export function StatTile({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'ok' | 'warn' | 'bad' }) {
  const tones = {
    default: 'text-[var(--text)]',
    ok: 'text-[var(--ok)]',
    warn: 'text-[var(--warn)]',
    bad: 'text-[var(--bad)]',
  }
  return (
    <div className="panel p-3.5 flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider muted">{label}</span>
      <span className={`text-xl sm:text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</span>
      {hint && <span className="text-[11px] muted">{hint}</span>}
    </div>
  )
}

export function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'ok' | 'warn' | 'bad' | 'brand' }) {
  const map = {
    default: '',
    ok: '!text-[var(--ok)] !border-[var(--ok)]/30',
    warn: '!text-[var(--warn)] !border-[var(--warn)]/30',
    bad: '!text-[var(--bad)] !border-[var(--bad)]/30',
    brand: '!text-navy-700 dark:!text-navy-300 !border-navy-300/40',
  }
  return <span className={`chip ${map[tone]}`}>{children}</span>
}

export function ProgressRing({ value, size = 88, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-bold tabular-nums">{Math.round(pct * 100)}%</div>
        {label && <div className="text-[10px] muted">{label}</div>}
      </div>
    </div>
  )
}

export function BarChart({ data, height = 140 }: { data: { label: string; value: number; max?: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.max ?? d.value))
  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="text-[10px] tabular-nums muted">{d.value > 0 ? fmtCompact(d.value) : ''}</div>
            <div
              className="w-full rounded-t-md bg-navy-600/85 dark:bg-navy-400/85 transition-[height] duration-500"
              style={{ height: `${Math.max(d.value > 0 ? 4 : 1, (d.value / max) * 100)}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 sm:gap-2 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] muted truncate">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function fmtCompact(n: number) {
  return n >= 3600 ? `${(n / 3600).toFixed(1)}s` : n >= 60 ? `${Math.round(n / 60)}d` : `${n}`
}

// ------------------------- Holat komponentlari -------------------------
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function LoadingBlock({ label = 'Yuklanmoqda…' }: { label?: string }) {
  return (
    <div className="panel p-8 grid place-items-center gap-3 animate-[var(--animate-fade-in)]" role="status" aria-live="polite">
      <Spinner size={26} />
      <p className="muted text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="panel p-8 text-center grid gap-2 place-items-center">
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.4" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M8 10h8M8 14h5" />
      </svg>
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="muted text-sm max-w-sm">{body}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="panel p-5 border-l-4 !border-l-[var(--bad)] grid gap-2" role="alert">
      <strong className="text-[var(--bad)]">Xatolik</strong>
      <p className="text-sm">{message}</p>
      {retry && (
        <Button variant="secondary" size="sm" onClick={retry}>
          Qayta urinish
        </Button>
      )}
    </div>
  )
}

export function SuccessBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-300/50 px-4 py-3 text-sm animate-[var(--animate-pop)]" role="status">
      {children}
    </div>
  )
}

export function InfoBanner({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'muted' }) {
  const map = {
    info: 'bg-navy-50 dark:bg-navy-900/30 border-navy-200 dark:border-navy-700',
    warn: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300/60',
    muted: 'bg-[var(--panel-2)] border-[var(--border)]',
  }
  return <div className={`rounded-xl border px-4 py-3 text-sm ${map[tone]}`}>{children}</div>
}

// --------------------------- Modal / tasdiq ---------------------------
export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    ref.current?.focus()
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="panel relative p-5 w-full max-w-md max-h-[90vh] overflow-auto animate-[var(--animate-pop)]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-bold text-lg">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Yopish">
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ----------------------------- Form elementlari -----------------------------
export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] muted">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-xl border bg-[var(--panel)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] transition-colors'

// --------------------------- audio talaffuz ---------------------------
/**
 * So'z talaffuzi. Brauzer TTS bo'lmasa tugma KO'RSATILMAYDI
 * ("hech qanday tugma dekoratsiya bo'lmasin").
 */
export function SpeakButton({ text, label, size = 'sm' }: { text: string; label?: string; size?: 'sm' | 'md' }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)
  if (!supported) return null
  return (
    <Button
      variant="secondary"
      size={size}
      onClick={() => {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'en-US'
        u.rate = 0.92
        u.onstart = () => setSpeaking(true)
        u.onend = () => setSpeaking(false)
        u.onerror = () => setSpeaking(false)
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
      }}
      aria-label={label ?? `Talaffuz: ${text}`}
      title="Talaffuzni eshitish"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {speaking ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
      </svg>
      {label ?? 'Aytish'}
    </Button>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border bg-[var(--panel-2)] text-[10px] font-mono">{children}</kbd>
  )
}
