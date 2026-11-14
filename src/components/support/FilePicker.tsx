/** Ilova tanlash: rasm (PNG/JPG/WebP) yoki PDF, ≤ 5 MB — tanlanganda darhol tekshiriladi. */
import { useId, useRef, useState } from 'react'
import { FILE_ACCEPT, checkAttachment, formatBytes, type CheckedFile } from '../../lib/support'

export default function FilePicker({ value, onChange, disabled }: { value: CheckedFile | null; onChange: (f: CheckedFile | null) => void; disabled?: boolean }) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    setErr(null)
    if (!file) return
    const res = await checkAttachment(file)
    if (res.ok) onChange(res.data)
    else {
      onChange(null)
      setErr(res.reasonUz)
    }
    if (ref.current) ref.current.value = ''
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={id}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)] ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          📎 Fayl ilova qiliş
        </label>
        <input
          ref={ref}
          id={id}
          type="file"
          accept={FILE_ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        {value ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--panel-2)] px-2.5 py-1 text-xs">
            {value.type === 'application/pdf' ? '📄' : '🖼️'} <span className="max-w-[12rem] truncate">{value.name}</span> · {formatBytes(value.size)}
            <button type="button" className="rounded px-1 font-bold" aria-label="Ilovani olib taşlaş" onClick={() => onChange(null)} disabled={disabled}>
              ✕
            </button>
          </span>
        ) : (
          <span className="text-[11px] muted">Rasm (PNG, JPG, WebP) yoki PDF, 5 MB gaça</span>
        )}
      </div>
      {err && (
        <p className="text-xs text-[var(--bad)]" role="alert">
          {err}
        </p>
      )}
    </div>
  )
}
