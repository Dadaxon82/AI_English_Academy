/**
 * Foydalanuvchini tahrirlash modali: ism, rasm havolasi, rol va holat.
 *
 * XP, streak va daraja FAQAT o'qish uchun: ular o'quvchining haqiqiy
 * urinishlaridan hisoblanadi (loyiha qoidasi — dalilsiz ball/daraja yo'q;
 * qo'lda yozilgan son ilovadagi hisob bilan zid bo'lib qolardi).
 *
 * Xavfli zona: hisobni butunlay o'chirish — email qayta yozilgandagina.
 */
import { useId, useState } from 'react'
import { Flame, Sparkles, GraduationCap, Trash2 } from 'lucide-react'
import { Button, Field, Modal, inputCls } from '../ui'
import {
  ROLES,
  STATUSES,
  FULL_NAME_MAX,
  deleteUser,
  levelBucket,
  updateUser,
  validateAvatarUrl,
  validateFullName,
  type AdminRole,
  type AdminUser,
  type UserStatus,
} from '../../lib/admin'

export interface UserManagementModalProps {
  user: AdminUser
  currentUserId: string | null
  onClose(): void
  onSaved(message: string, saved: { role: AdminRole }): void
  onDeleted(message: string): void
  onError(message: string): void
}

export default function UserManagementModal({ user, currentUserId, onClose, onSaved, onDeleted, onError }: UserManagementModalProps) {
  const id = useId()
  const [fullName, setFullName] = useState(user.full_name)
  const [avatar, setAvatar] = useState(user.avatar_url ?? '')
  const [role, setRole] = useState<AdminRole>(user.role)
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [busy, setBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const isSelf = user.id === currentUserId

  const nameErr = validateFullName(fullName)
  const avatarErr = validateAvatarUrl(avatar)
  const changed =
    fullName.trim() !== user.full_name || avatar.trim() !== (user.avatar_url ?? '') || role !== user.role || status !== user.status
  const confirmTarget = user.email ?? user.id
  const canDelete = !isSelf && user.role !== 'admin' && confirmText.trim() === confirmTarget

  const save = async () => {
    setBusy(true)
    const r = await updateUser(user.id, { full_name: fullName, avatar_url: avatar, role, status })
    setBusy(false)
    if (r.ok) onSaved(`«${fullName.trim()}» ma’lumotlari saqlandi.`, { role })
    else onError(r.reasonUz)
  }

  const remove = async () => {
    setDeleting(true)
    const r = await deleteUser(user.id)
    setDeleting(false)
    if (r.ok) onDeleted(`«${user.full_name || confirmTarget}» hisobi o‘chirildi.`)
    else onError(r.reasonUz)
  }

  return (
    <Modal open title="Foydalanuvchini tahrirlash" onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!nameErr && !avatarErr && changed && !busy) void save()
        }}
      >
        <p className="text-sm muted break-all">{user.email ?? 'Email yo‘q'}</p>

        <Field label="Ism" htmlFor={`${id}-name`} hint={nameErr ?? `${fullName.trim().length}/${FULL_NAME_MAX}`}>
          <input
            id={`${id}-name`}
            className={inputCls}
            value={fullName}
            maxLength={FULL_NAME_MAX + 20}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={Boolean(nameErr)}
          />
        </Field>

        <Field label="Rasm havolasi (ixtiyoriy)" htmlFor={`${id}-avatar`} hint={avatarErr ?? 'https:// bilan boshlanadigan rasm manzili'}>
          <input
            id={`${id}-avatar`}
            className={inputCls}
            value={avatar}
            inputMode="url"
            placeholder="https://…"
            onChange={(e) => setAvatar(e.target.value)}
            aria-invalid={Boolean(avatarErr)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Rol" htmlFor={`${id}-role`}>
            <select id={`${id}-role`} className={inputCls} value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.labelUz}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Holat" htmlFor={`${id}-status`} hint={isSelf ? 'O‘zingizni bloklay olmaysiz' : undefined}>
            <select
              id={`${id}-status`}
              className={inputCls}
              value={status}
              disabled={isSelf}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labelUz}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {status === 'blocked' && (
          <p className="text-xs rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 p-2.5">
            Bloklangan foydalanuvchi hamjamiyatga javob/izoh yubora olmaydi va AI xizmatidan foydalana olmaydi. Shaxsiy o‘quv
            ma’lumoti o‘chirilmaydi.
          </p>
        )}

        <div className="grid gap-2 rounded-xl bg-[var(--panel-2)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide muted">O‘quv ko‘rsatkichlari (faqat ko‘rish)</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles aria-hidden="true" className="h-4 w-4 text-violet-700 dark:text-violet-300" />
              <span className="tabular-nums font-semibold">{user.xp.toLocaleString('uz-UZ')}</span> XP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flame aria-hidden="true" className="h-4 w-4 text-orange-700 dark:text-orange-300" />
              <span className="tabular-nums font-semibold">{user.streak}</span> kun
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap aria-hidden="true" className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
              <span className="font-semibold">{user.level ?? '—'}</span>
            </span>
          </div>
          <p className="text-[11px] muted">
            {levelBucket(user.level)}. XP, streak va daraja o‘quvchining haqiqiy mashqlaridan hisoblanadi — qo‘lda o‘zgartirilmaydi.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" busy={busy} disabled={Boolean(nameErr || avatarErr) || !changed}>
            Saqlash
          </Button>
        </div>
      </form>

      {!isSelf && user.role !== 'admin' && (
        <details className="mt-5 rounded-xl border border-rose-300/60 dark:border-rose-800/60 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-rose-700 dark:text-rose-300">Xavfli zona: hisobni o‘chirish</summary>
          <div className="grid gap-2 mt-3">
            <p className="text-xs muted">
              Hisob va unga tegishli barcha ma’lumot (progress, yozuvlar, hamjamiyat javoblari) butunlay o‘chadi. Qaytarib bo‘lmaydi.
            </p>
            <Field label={`Tasdiqlash uchun yozing: ${confirmTarget}`} htmlFor={`${id}-confirm`}>
              <input id={`${id}-confirm`} className={inputCls} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
            </Field>
            <Button type="button" variant="danger" busy={deleting} disabled={!canDelete} onClick={() => void remove()}>
              <Trash2 aria-hidden="true" className="h-4 w-4" /> Butunlay o‘chirish
            </Button>
          </div>
        </details>
      )}
    </Modal>
  )
}
