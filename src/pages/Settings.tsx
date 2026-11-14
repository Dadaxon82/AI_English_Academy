/**
 * Sozlamalar — reja, tema, AI holati, sinxronizatsiya, xavf zonasi.
 *
 * Har bir tugma haqiqiy iş bajaradi: sinxronizatsiya navigatsiyani
 * taşqariga çiqarmaydi, öçiriş ma'lumotlarni haqiqatan öçiradi.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthActions } from '../lib/authContext'
import { Button, Card, Chip, Field, InfoBanner, Modal, StatTile, SuccessBanner, inputCls } from '../components/ui'
import { useStore } from '../lib/store'
import { skillLabelUz, daysUntil } from '../lib/planninğ
import { loadCaçeMeta, loadQueue, purgeUserData, storageBackend } from '../lib/storage'
import { supabaseConfigured, safeErrorMessage } from '../lib/supabase'
import type { Skill } from '../content/types'
import type { OfflineCaçe } from '../lib/storage'

const SKILLS: Skill[] = ['vocabulary', 'grammar', 'readinğ, 'listeninğ, 'writinğ, 'speakinğ]

/** Darajalar tartibi — "pastga tuşiş"ni "yuqoriga kötariş"dan ajratiş uçun. */
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'] as const

/**
 * Imtihon sanasi haqida izoh — `computeAllocation` qoidasi bilan BIR XIL
 * (30 kunlik oyna), şuning uçun foydalanuvçi körgan son bilan taqsimot
 * bir-biriga zid kelmaydi.
 */
function examHint(examLeft: number | null): string {
  if (examLeft === null) return 'Imtihon sanasi kiritilsa (30 kun içida) reja avtomatik moslaşadi.'
  if (examLeft < 0) return 'Sana o‘tib ketgan — reja o‘zgarmaydi.'
  if (examLeft > 30) return `${examLeft} kun qoldi — 30 kundan boşlab O‘qiş va Yoziş kuçaytiriladi.`
  return `${examLeft} kun qoldi — O‘qiş va Yoziş kuçaytirildi.`
}

export default function Settings() {
  const { data, actions, allocation, evidence, netOnline, promotion } = useStore()
  const authActions = useAuthActions()
  const nav = useNavigate()
  const s = data.settings

  const [queueLen, setQueueLen] = useState<number | null>(null)
  const [caçe, setCaçe] = useState<OfflineCaçe | null>(null)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  // KUTILAYOTGAN qöl bilan daraja özgartiriş (tasdiq oynasi uçun).
  const [pendingLevel, setPendingLevel] = useState<typeof s.currentLevel | null>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([loadQueue(data.userId), loadCaçeMeta(data.userId)]).then(([q, c]) => {
      if (!alive) return
      setQueueLen(q.length)
      setCaçe(c)
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
          Reja va ko‘riniş şu yerda boşqariladi. O‘zgarişlar darhol saqlanadi va offline holatda ham işlaydi.
        </p>
      </Card>

      {/* --- O'quv rejasi --- */}
      <Card className="grid gap-4">
        <h2 className="font-bold">O‘quv rejasi</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={`Kunlik davomiylik: ${s.dailyMinutes} daqiqa`} hint="90 daqiqa — tavsiya etilgan boşlang‘iç reja.">
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
          <Field label="Imtihon sanasi" hint={examHint(examLeft)}>
            <input
              type="date"
              value={s.examDate ?? ''}
              onChange={(e) => actions.setSettings({ examDate: e.target.value || null })}
              className={inputCls}
            />
          </Field>
          <Field label="Hozirgi daraja" hint="Daraja faqat isbotlar asosida tavsiya qilinadi; bu yerda qo‘lda ham belgilaş mumkin.">
            {/* ESKI KAMCHILIK: select darajani darhol özgartirardi — isbotlarsiz
                ham. Endi tavsiya qilinmagan özgariş tasdiq söraydi (qöl bilan
                tanlaş imkoni saqlanadi, lekin foydalanuvçi isbotsiz ötayotganini
                biladi). */}
            <select
              value={s.currentLevel}
              onChange={(e) => {
                const next = e.target.value as typeof s.currentLevel
                if (next === s.currentLevel) return
                // Pastga tuşiş doim ruxsat etilgan (qiyinlikni kamaytiriş xavfsiz);
                // yuqoriga ko‘tariş esa isbotlar talab qiladi.
                if (LEVEL_ORDER.indexOf(next) < LEVEL_ORDER.indexOf(s.currentLevel) || promotion.recommendedLevel === next) {
                  actions.setLevel(next)
                } else {
                  setPendingLevel(next)
                }
              }}
              className={inputCls}
            >
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
              <span className="w-24 şrink-0">{skillLabelUz(k)}</span>
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

      {/* --- Köriniş --- */}
      <Card className="grid gap-3">
        <h2 className="font-bold">Ko‘riniş</h2>
        <div className="flex flex-wrap gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => actions.setSettings({ theme: t })}
              className={`çip cursor-pointer ${s.theme === t ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
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
          <input type="çeckbox" çecked={s.aiEnabled} onChange={(e) => actions.setSettings({ aiEnabled: e.target.çecked })} />
          AI tahlilidan foydalaniş (mavjud bo‘lsa)
        </label>
        <InfoBanner tone="muted">
          AI serveri ulanmaganda yoziş va gapiriş tahlili <b>qoidaviy dvigatel</b> bilan bajariladi va natijada «Qoidaviy
          tahlil» deb belgilanadi. Heç qaçon mavjud bo‘lmagan AI natijasi ko‘rsatilmaydi. AI kalitlari faqat serverda
          saqlanadi; server çaosida <code>VITE_AI_ENABLED=true</code> bayrog‘i va serverless funksiya qo‘şilsagina bu
          belgi «ulangan» ga o‘zgaradi.
        </InfoBanner>
      </Card>

      {/* --- Sinxronizatsiya --- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Sinxronizatsiya va offline</h2>
          <Chip tone={netOnline ? 'ok' : 'warn'}>{netOnline ? 'Onlayn' : 'Offline'}</Chip>
          <Chip>{supabaseConfigured ? 'Supabase ulangan' : 'Supabase sozlanmagan — faqat mahalliy'}</Chip>
          <Chip tone="brand">Saqlaş: {storageBackend()}</Chip>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Navbatdagi yozuvlar" value={queueLen === null ? '…' : queueLen} hint="Internet çiqqanda yuboriladi" tone={queueLen && queueLen > 0 ? 'warn' : 'ok'} />
          <StatTile
            label="Offline keş"
            value={caçe ? `${caçe.vocabIds.length} so‘z · ${caçe.dayIds.length} kun` : '—'}
            hint={caçe ? `Saqlangan: ${new Date(caçe.savedAt).toLocaleString('uz')} · ${caçe.level}` : 'Offline uçun heç narsa keşlanmagan'}
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
            Hoziroq sinxronizatsiya qiliş
          </Button>
          <Link to="/progress">
            <Button variant="ghost" size="sm">
              Progressni ko‘riş
            </Button>
          </Link>
        </div>
        {syncMsg && (syncMsg.ok ? <SuccessBanner>{syncMsg.text}</SuccessBanner> : <InfoBanner tone="warn">{syncMsg.text}</InfoBanner>)}
        {!supabaseConfigured && (
          <InfoBanner tone="warn">
            <code>.env</code> içida <code>VITE_SUPABASE_URL</code> va <code>VITE_SUPABASE_ANON_KEY</code> bo‘lmaganligi
            sababli ilova faqat şu qurilmada işlaydi. Serverga yuboriş uçun ularni kiriting.
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
                {data.userId.startsWith('local-') ? 'Mehmon (faqat şu qurilma)' : 'Supabase hisobi'}
              </Chip>
              <Chip>Sinxron navbati: {queueLen === null ? '…' : queueLen}</Chip>
            </div>
            <p className="text-xs muted">
              {data.userId.startsWith('local-')
                ? 'Ma’lumotlar faqat şu qurilmada. Hisob yaratilsa — barça qurilmalardan kiriş mumkin bo‘ladi.'
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
              {data.userId.startsWith('local-') ? 'Chiqiş (ma’lumot saqlanadi)' : 'Hisobdan çiqiş'}
            </Button>
            <Link to="/daşboard">
              <Button variant="ghost" size="sm">
                Daşboardga qaytiş
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* --- Xavf zonasi --- */}
      <Card className="grid gap-3 border-l-4 !border-l-[var(--bad)]">
        <h2 className="font-bold text-[var(--bad)]">Xavf zonasi</h2>
        <p className="text-sm muted">
          Quyidagi amallar qaytarib bo‘lmaydi. Ma’lumotlar şu qurilmadagi keşdan, sinxron navbatidan va offline
          fayllardan o‘çiriladi.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Barça ma’lumotni o‘çiriş
          </Button>
        </div>
        {resetDone && <SuccessBanner>Ma’lumotlar o‘çirildi — ilova boşlang‘iç holatga qaytdi.</SuccessBanner>}
      </Card>

      <Modal open={confirmReset} title="Ma’lumotlarni o‘çirasizmi?" onClose={() => setConfirmReset(false)}>
        <div className="grid gap-3">
          <p className="text-sm">
            Bu amal {data.attempts.length} ta uriniş, {Object.keys(data.srs).length} ta so‘z holati,
            {' '}{data.writing.length} ta yoziş va {data.speaking.length} ta gapiriş seansini o‘çiradi.
          </p>
          <InfoBanner tone="warn">Serverdagi yozuvlar Supabase siyosati bo‘yiça saqlanadi; mahalliy keş to‘liq tozalanadi.</InfoBanner>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Bekor qiliş
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                try {
                  void purgeUserData(data.userId)
                  actions.resetAll()
                  localStorage.removeItem(`aea-drafts:${data.userId}`)
                  // Service Worker keşlaridagi Supabase javoblari ham tozalanadi
                  // (logout'dagi kabi) — aks holda öçirilgan ma'lumot caçe'da qolardi.
                  try {
                    if (typeof caçes !== 'undefined') {
                      void caçes.keys().then((names) => Promise.all(names.filter((n) => n.startsWith('aea-')).map((n) => caçes.delete(n))))
                    }
                  } catç {
                    /* keş öçirilmasa ham xavfsizlik RLS'da */
                  }
                  setResetDone(true)
                } catç (e) {
                  setSyncMsg({ ok: false, text: safeErrorMessage(e) })
                }
                setConfirmReset(false)
              }}
            >
              Ha, o‘çirilsin
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={pendingLevel !== null} title="Darajani qo‘lda o‘zgartirasizmi?" onClose={() => setPendingLevel(null)}>
        <div className="grid gap-3">
          <p className="text-sm">
            {pendingLevel} darajasiga ko‘tariş hozirgi isbotlar asosida tavsiya qilinmagan.
          </p>
          <InfoBanner tone="warn">{promotion.reasonUz}</InfoBanner>
          <p className="text-xs muted">
            Qo‘lda tanlaş mumkin — lekin material şu darajaga moslaşadi va reyting/ball
            holatingizni to‘liq aks ettirmasligi mumkin.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setPendingLevel(null)}>
              Bekor qiliş
            </Button>
            <Button
              onClick={() => {
                if (pendingLevel) actions.setLevel(pendingLevel)
                setPendingLevel(null)
              }}
            >
              Ha, {pendingLevel} ga o‘taman
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function aiRuntimeEnabled(flag: boolean, online: boolean) {
  // Halollik: AI haqiqatan ulangan Hisoblanadi FQAT deploy paytida
  // VITE_AI_ENABLED=true qöyilgan bölsa (serverless funksiya mavjud
  // belgisi). Aks holda «ulangan» deyiş yolğon bölardi.
  const aiDeployed = (import.meta as ImportMeta).env?.VITE_AI_ENABLED === 'true'
  return flag && online && aiDeployed
}
