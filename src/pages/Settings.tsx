/**
 * Sozlamalar — reja, tema, AI holati, sinxronizatsiya, xavf zonasi.
 *
 * Har bir tugma haqiqiy ish bajaradi: sinxronizatsiya navigatsiyani
 * tashqariga chiqarmaydi, o'chirish ma'lumotlarni haqiqatan o'chiradi.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthActions } from '../lib/authContext'
import { Button, Card, Chip, Field, InfoBanner, Modal, StatTile, SuccessBanner, inputCls } from '../components/ui'
import { useStore } from '../lib/store'
import { skillLabelUz, daysUntil } from '../lib/planning'
import { loadCacheMeta, loadQueue, purgeUserData, storageBackend } from '../lib/storage'
import { supabaseConfigured, safeErrorMessage } from '../lib/supabase'
import type { Skill } from '../content/types'
import type { OfflineCache } from '../lib/storage'

const SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking']

export default function Settings() {
  const { data, actions, allocation, evidence, netOnline, promotion } = useStore()
  const authActions = useAuthActions()
  const nav = useNavigate()
  const s = data.settings

  const [queueLen, setQueueLen] = useState<number | null>(null)
  const [cache, setCache] = useState<OfflineCache | null>(null)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  useEffect(() => {
    let alive = true
    void Promise.all([loadQueue(data.userId), loadCacheMeta(data.userId)]).then(([q, c]) => {
      if (!alive) return
      setQueueLen(q.length)
      setCache(c)
    })
    return () => {
      alive = false
    }
  }, [data.userId, data.updatedAt])

  const examLeft = daysUntil(s.examDate)

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <h1 className="text-xl font-bold">Sozlamalar</h1>
        <p className="muted text-sm">
          Reja va ko‘rinish shu yerda boshqariladi. O‘zgarishlar darhol saqlanadi va offline holatda ham ishlaydi.
        </p>
      </Card>

      {/* --- O'quv rejasi --- */}
      <Card className="grid gap-4">
        <h2 className="font-bold">O‘quv rejasi</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={`Kunlik davomiylik: ${s.dailyMinutes} daqiqa`} hint="90 daqiqa — tavsiya etilgan boshlang‘ich reja.">
            <input
              type="range"
              min={30}
              max={180}
              step={5}
              value={s.dailyMinutes}
              onChange={(e) => actions.setSettings({ dailyMinutes: Number(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </Field>
          <Field label="Imtihon sanasi" hint={examLeft !== null ? `${examLeft} kun qoldi — tizim zaif ko‘nikmalarga ko‘proq vaqt beradi.` : 'Imtihon sanasi kiritilsa reja avtomatik moslashadi.'}>
            <input
              type="date"
              value={s.examDate ?? ''}
              onChange={(e) => actions.setSettings({ examDate: e.target.value || null })}
              className={inputCls}
            />
          </Field>
          <Field label="Hozirgi daraja" hint="Daraja faqat isbotlar asosida tavsiya qilinadi; bu yerda qo‘lda ham belgilash mumkin.">
            <select value={s.currentLevel} onChange={(e) => actions.setLevel(e.target.value as typeof s.currentLevel)} className={inputCls}>
              {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Maqsad daraja">
            <select value={s.targetLevel} onChange={(e) => actions.setSettings({ targetLevel: e.target.value as typeof s.targetLevel })} className={inputCls}>
              {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Bugungi taqsimot ({allocation.total}′)</h3>
          {SKILLS.map((k) => (
            <div key={k} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0">{skillLabelUz(k)}</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--panel-2)] overflow-hidden">
                <div className="h-full bg-navy-600 dark:bg-navy-400" style={{ width: `${(allocation.minutes[k] / allocation.total) * 100}%` }} />
              </div>
              <span className="tabular-nums w-10 text-right">{allocation.minutes[k]}′</span>
            </div>
          ))}
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold muted">Taqsimot qanday hisoblanadi?</summary>
            <ul className="mt-2 list-disc pl-5 muted">
              {allocation.reasonUz.map((r) => (
                <li key={r} className="text-sm">{r}</li>
              ))}
            </ul>
            <div className="mt-2 grid gap-1">
              {evidence.map((e) => (
                <div key={e.skill} className="flex items-center gap-2 text-xs">
                  <span className="w-24">{skillLabelUz(e.skill)}</span>
                  <span className="tabular-nums">{e.score} ball</span>
                  <Chip tone={e.score >= 72 ? 'ok' : e.score >= 50 ? 'warn' : 'bad'}>{e.evidenceCount} isbot</Chip>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] muted">{promotion.reasonUz}</p>
          </details>
        </div>
      </Card>

      {/* --- Ko'rinish --- */}
      <Card className="grid gap-3">
        <h2 className="font-bold">Ko‘rinish</h2>
        <div className="flex flex-wrap gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => actions.setSettings({ theme: t })}
              className={`chip cursor-pointer ${s.theme === t ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
            >
              {t === 'light' ? 'Yorug‘' : t === 'dark' ? 'Tungi' : 'Tizim bilan'}
            </button>
          ))}
        </div>
        <p className="text-xs muted">Tema brauzer saqlanadi va sahifa yangilanganda saqlanib qoladi.</p>
      </Card>

      {/* --- AI holati (halollik) --- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Sun’iy intellekt</h2>
          <Chip tone={aiRuntimeEnabled(s.aiEnabled, netOnline) ? 'ok' : 'warn'}>
            {aiRuntimeEnabled(s.aiEnabled, netOnline) ? 'AI xizmati ulangan' : 'AI serveri sozlanmagan — qoidaviy tahlil'}
          </Chip>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.aiEnabled} onChange={(e) => actions.setSettings({ aiEnabled: e.target.checked })} />
          AI tahlilidan foydalanish (mavjud bo‘lsa)
        </label>
        <InfoBanner tone="muted">
          AI serveri ulanmaganda yozish va gapirish tahlili <b>qoidaviy dvigatel</b> bilan bajariladi va natijada «Qoidaviy
          tahlil» deb belgilanadi. Hech qachon mavjud bo‘lmagan AI natijasi ko‘rsatilmaydi. AI kalitlari faqat serverda
          saqlanadi; server chaosida <code>VITE_AI_ENABLED=true</code> bayrog‘i va serverless funksiya qo‘shilsagina bu
          belgi «ulangan» ga o‘zgaradi.
        </InfoBanner>
      </Card>

      {/* --- Sinxronizatsiya --- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Sinxronizatsiya va offline</h2>
          <Chip tone={netOnline ? 'ok' : 'warn'}>{netOnline ? 'Onlayn' : 'Offline'}</Chip>
          <Chip>{supabaseConfigured ? 'Supabase ulangan' : 'Supabase sozlanmagan — faqat mahalliy'}</Chip>
          <Chip tone="brand">Saqlash: {storageBackend()}</Chip>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Navbatdagi yozuvlar" value={queueLen === null ? '…' : queueLen} hint="Internet chiqqanda yuboriladi" tone={queueLen && queueLen > 0 ? 'warn' : 'ok'} />
          <StatTile
            label="Offline kesh"
            value={cache ? `${cache.vocabIds.length} so‘z · ${cache.dayIds.length} kun` : '—'}
            hint={cache ? `Saqlangan: ${new Date(cache.savedAt).toLocaleString('uz')} · ${cache.level}` : 'Offline uchun hech narsa keshlanmagan'}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            busy={syncing}
            onClick={async () => {
              setSyncing(true)
              const res = await actions.sync()
              setSyncing(false)
              setSyncMsg({
                ok: res.ok,
                text: res.ok
                  ? `${res.done} ta yozuv yuborildi.`
                  : (res.reasonUz ?? 'Yuborib bo‘lmadi — navbat saqlandi.'),
              })
              const q = await loadQueue(data.userId)
              setQueueLen(q.length)
            }}
          >
            Hoziroq sinxronizatsiya qilish
          </Button>
          <Link to="/progress">
            <Button variant="ghost" size="sm">
              Progressni ko‘rish
            </Button>
          </Link>
        </div>
        {syncMsg && (syncMsg.ok ? <SuccessBanner>{syncMsg.text}</SuccessBanner> : <InfoBanner tone="warn">{syncMsg.text}</InfoBanner>)}
        {!supabaseConfigured && (
          <InfoBanner tone="warn">
            <code>.env</code> ichida <code>VITE_SUPABASE_URL</code> va <code>VITE_SUPABASE_ANON_KEY</code> bo‘lmaganligi
            sababli ilova faqat shu qurilmada ishlaydi. Serverga yuborish uchun ularni kiriting.
          </InfoBanner>
        )}
      </Card>

      {/* --- akkaunt --- */}
      <Card className="grid gap-3">
        <h2 className="font-bold">Akkaunt</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <span className="text-sm font-semibold">Hisob turi</span>
            <div className="flex flex-wrap gap-2">
              <Chip tone={data.userId.startsWith('local-') ? 'warn' : 'ok'}>
                {data.userId.startsWith('local-') ? 'Mehmon (faqat shu qurilma)' : 'Supabase hisobi'}
              </Chip>
              <Chip>Sinxron navbati: {queueLen === null ? '…' : queueLen}</Chip>
            </div>
            <p className="text-xs muted">
              {data.userId.startsWith('local-')
                ? 'Ma’lumotlar faqat shu qurilmada. Hisob yaratilsa — barcha qurilmalardan kirish mumkin bo‘ladi.'
                : 'Ma’lumotlaringiz serverda RLS bilan himoyalangan.'}
            </p>
          </div>
          <div className="grid gap-2 content-end">
            <Button
              variant="secondary"
              onClick={() => {
                authActions?.signOut()
                void nav('/login')
              }}
            >
              {data.userId.startsWith('local-') ? 'Chiqish (ma’lumot saqlanadi)' : 'Hisobdan chiqish'}
            </Button>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboardga qaytish
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* --- Xavf zonasi --- */}
      <Card className="grid gap-3 border-l-4 !border-l-[var(--bad)]">
        <h2 className="font-bold text-[var(--bad)]">Xavf zonasi</h2>
        <p className="text-sm muted">
          Quyidagi amallar qaytarib bo‘lmaydi. Ma’lumotlar shu qurilmadagi keshdan, sinxron navbatidan va offline
          fayllardan o‘chiriladi.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Barcha ma’lumotni o‘chirish
          </Button>
        </div>
        {resetDone && <SuccessBanner>Ma’lumotlar o‘chirildi — ilova boshlang‘ich holatga qaytdi.</SuccessBanner>}
      </Card>

      <Modal open={confirmReset} title="Ma’lumotlarni o‘chirasizmi?" onClose={() => setConfirmReset(false)}>
        <div className="grid gap-3">
          <p className="text-sm">
            Bu amal {data.attempts.length} ta urinish, {Object.keys(data.srs).length} ta so‘z holati,
            {' '}{data.writing.length} ta yozish va {data.speaking.length} ta gapirish seansini o‘chiradi.
          </p>
          <InfoBanner tone="warn">Serverdagi yozuvlar Supabase siyosati bo‘yicha saqlanadi; mahalliy kesh to‘liq tozalanadi.</InfoBanner>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                try {
                  void purgeUserData(data.userId)
                  actions.resetAll()
                  localStorage.removeItem(`aea-drafts:${data.userId}`)
                  // Service Worker keshlaridagi Supabase javoblari ham tozalanadi
                  // (logout'dagi kabi) — aks holda o'chirilgan ma'lumot cache'da qolardi.
                  try {
                    if (typeof caches !== 'undefined') {
                      void caches.keys().then((names) => Promise.all(names.filter((n) => n.startsWith('aea-')).map((n) => caches.delete(n))))
                    }
                  } catch {
                    /* kesh o'chirilmasa ham xavfsizlik RLS'da */
                  }
                  setResetDone(true)
                } catch (e) {
                  setSyncMsg({ ok: false, text: safeErrorMessage(e) })
                }
                setConfirmReset(false)
              }}
            >
              Ha, o‘chirilsin
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function aiRuntimeEnabled(flag: boolean, online: boolean) {
  // Halollik: AI haqiqatan ulangan Hisoblanadi FQAT deploy paytida
  // VITE_AI_ENABLED=true qo'yilgan bo'lsa (serverless funksiya mavjud
  // belgisi). Aks holda «ulangan» deyish yolg'on bo'lardi.
  const aiDeployed = (import.meta as ImportMeta).env?.VITE_AI_ENABLED === 'true'
  return flag && online && aiDeployed
}
