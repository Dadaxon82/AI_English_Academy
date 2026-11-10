/**
 * Sozlamalar — reja, tema, AI holati, sinxronizatsiya, xavf zonasi.
 *
 * Har bir tugma haqiqiy ish bajaradi: sinxronizatsiya navigatsiyani
 * tashqariga chiqarmaydi, o'chirish ma'lumotlarni haqiqatan o'chiradi.
 */

import { setImmersion, useImmersion } from '../lib/prefs'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthActions } from '../lib/authContext'
import { Button, Card, Chip, Field, InfoBanner, Modal, StatTile, SuccessBanner, inputCls } from '../components/ui'
import { aiRuntimeEnabled } from '../lib/ai'
import { useStore } from '../lib/storeContext'
import { skillLabelUz, daysUntil } from '../lib/planning'
import { loadCacheMeta, loadQueue, purgeUserData, storageBackend } from '../lib/storage'
import { MOTION, motionAllowed } from '../lib/motionManifest'
import { GameIcon } from '../components/icons'
import { BET_COST_GEMS, BET_DAYS, BET_STREAK_DAYS, BET_WIN_GEMS, GOAL_GEM_REWARD, HEARTS_COST_WRONG, HEARTS_MAX, HEART_COMBO_STREAK, HEART_PRACTICE_REVIEWS, HEART_REFILL_MINUTES, MAX_FREEZES, XP_GOAL_TIERS } from '../lib/gameConfig'
import { supabaseConfigured, safeErrorMessage } from '../lib/supabase'
import { deleteRemoteData } from '../lib/sync'
import { LOADED_LEVELS } from '../content'
import { CEFR_LEVELS, type Skill } from '../content/types'
import type { OfflineCache } from '../lib/storage'

const SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking']

/**
 * Imtihon sanasi haqida izoh — `computeAllocation` qoidasi bilan BIR XIL
 * (30 kunlik oyna), shuning uchun foydalanuvchi ko'rgan son bilan taqsimot
 * bir-biriga zid kelmaydi.
 */
function examHint(examLeft: number | null): string {
  if (examLeft === null) return 'Imtihon sanasi kiritilsa (30 kun ichida) reja avtomatik moslashadi.'
  if (examLeft < 0) return 'Sana o‘tib ketgan — reja o‘zgarmaydi.'
  if (examLeft > 30) return `${examLeft} kun qoldi — 30 kundan boshlab O‘qish va Yozish kuchaytiriladi.`
  return `${examLeft} kun qoldi — O‘qish va Yozish kuchaytirildi.`
}

export default function Settings() {
  const { data, actions, allocation, evidence, netOnline, promotion, hearts, goal, shop } = useStore()
  const authActions = useAuthActions()
  const nav = useNavigate()
  const s = data.settings
  const immersion = useImmersion()

  const [queueLen, setQueueLen] = useState<number | null>(null)
  const [cache, setCache] = useState<OfflineCache | null>(null)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [unsynced, setUnsynced] = useState<{ pending: number; reasonUz: string | null } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Do'kon xaridining natija xabari (muvaffaqiyat yoki sababi bilan).
  const [shopMsg, setShopMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // Garov natija xabari — xarid kabi: rad etilsa SABAB ochiq ko'rsatiladi.
  const [betMsg, setBetMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // Ochiq garov (bo'lsa) — sarlavhadagi satr shu ma'lumotdan olinadi.
  const bet = data.game.bet
  const isGuest = data.userId.startsWith('local-')
  const hasServerCopy = !isGuest && supabaseConfigured

  const deleteAll = async () => {
    setDeleting(true)
    setDeleteError(null)
    // Hisobga kirgan foydalanuvchida AVVAL serverdagi yozuvlar o'chiriladi:
    // aks holda keyingi kirishda progress serverdan qayta tiklanardi. Server
    // o'chirmasa, qurilmadagisi ham tegilmaydi — qayta urinish mumkin bo'lsin.
    if (hasServerCopy) {
      const res = await deleteRemoteData(data.userId)
      if (!res.ok) {
        setDeleting(false)
        setDeleteError(res.reasonUz)
        return
      }
    }
    try {
      await purgeUserData(data.userId)
      actions.resetAll()
      localStorage.removeItem(`aea-drafts:${data.userId}`)
      // Service Worker keshlaridagi Supabase javoblari ham tozalanadi
      // (logout'dagi kabi) — aks holda o'chirilgan ma'lumot cache'da qolardi.
      if (typeof caches !== 'undefined') {
        void caches
          .keys()
          .then((names) => Promise.all(names.filter((n) => n.startsWith('aea-')).map((n) => caches.delete(n))))
          .catch(() => undefined)
      }
      setResetDone(true)
    } catch (e) {
      setSyncMsg({ ok: false, text: safeErrorMessage(e) })
    }
    setDeleting(false)
    setConfirmReset(false)
  }

  const doSignOut = () => {
    setUnsynced(null)
    authActions?.signOut()
    void nav('/login')
  }

  // ESKI BUG: chiqishda lokal ma'lumot va navbat darhol o'chirilardi —
  // serverga yetmagan progress jimgina yo'qolardi. Endi avval sinxronlanadi,
  // yuborilmagan narsa qolsa foydalanuvchidan tasdiq so'raladi.
  const requestSignOut = async () => {
    if (isGuest || !supabaseConfigured) {
      doSignOut()
      return
    }
    setSigningOut(true)
    const res = await actions.sync()
    const q = await loadQueue(data.userId)
    setSigningOut(false)
    setQueueLen(q.length)
    if (res.ok && q.length === 0) doSignOut()
    else setUnsynced({ pending: q.length, reasonUz: res.reasonUz })
  }

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
          <Field label="Imtihon sanasi" hint={examHint(examLeft)}>
            <input
              type="date"
              value={s.examDate ?? ''}
              onChange={(e) => actions.setSettings({ examDate: e.target.value || null })}
              className={inputCls}
            />
          </Field>
          <Field
            label="Hozirgi daraja"
            hint={`Daraja faqat isbotlar asosida tavsiya qilinadi; bu yerda qo‘lda ham belgilash mumkin. Kontent hozircha: ${LOADED_LEVELS.join(', ')}.`}
          >
            {/* ESKI KAMCHILIK: kontenti yo'q darajani tanlab bo'lardi — barcha
                o'quv sahifalari bo'sh qolardi. Endi bunday daraja tanlanmaydi
                (onboarding'dagi qoida bilan bir xil). */}
            <select value={s.currentLevel} onChange={(e) => actions.setLevel(e.target.value as typeof s.currentLevel)} className={inputCls}>
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l} disabled={!LOADED_LEVELS.includes(l)}>
                  {LOADED_LEVELS.includes(l) ? l : `${l} — kontent tayyor emas`}
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
          saqlanadi; deploy paytida <code>VITE_AI_ENABLED=true</code> bayrog‘i qo‘yilib, serverless funksiya qo‘shilsagina bu
          belgi «ulangan» ga o‘zgaradi.
        </InfoBanner>
      </Card>

      {/* --- Harakat (animatsiya) holati — DULO zanjiri va harakat mantiqi --- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Harakat va darslar ketma-ketligi</h2>
          <Chip tone={motionAllowed(s.motionEnabled) ? 'ok' : 'warn'}>
            {motionAllowed(s.motionEnabled) ? 'Harakat yoqilgan' : 'Harakat o‘chirilgan'}
          </Chip>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.motionEnabled}
            onChange={(e) => actions.setSettings({ motionEnabled: e.target.checked })}
          />
          Harakatlarni yoqish (o‘tish, qahramon sakrashi, XP ko‘tarilishi, zanjir kataklari)
        </label>
        <p className="text-xs muted">Byudjet: o‘tish {MOTION.stepMs} ms, qahramon {MOTION.popMs} ms, XP {MOTION.xpMs} ms. Brauzer «kamaytirilgan harakat» so‘rovi bo‘lsa harakat avtomatik o‘chiriladi. Bu sozlama telefon ilovasi bilan ham sinxronlanadi.</p>
      </Card>

      {/* --- Immersion (tarjimasiz o'rganish) — QURILMA sozlamasi --- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Immersion rejimi</h2>
          <Chip tone={immersion ? 'brand' : 'default'}>{immersion ? 'Yoqilgan' : 'O‘chiq'}</Chip>
          {(s.currentLevel === 'A1' || s.currentLevel === 'A2') && <Chip>B1 dan tavsiya etiladi</Chip>}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={immersion} onChange={(e) => setImmersion(e.target.checked)} />
          O‘zbekcha tarjimalarni yashirish (so‘z ma’nosi inglizcha izoh va misol orqali)
        </label>
        <p className="text-xs muted">
          Lug‘at kartalari, «5 daqiqa», O‘quv yo‘li so‘zlari va Suhbatdosh maslahatlarida tarjima yashiriladi — istalgan paytda
          «Tarjimani ko‘rsatish» tugmasi bilan ochiladi. Topshiriq va izohlar o‘zbekcha qoladi. Bu sozlama faqat shu qurilmada
          saqlanadi (hisobga va telefon ilovasiga sinxronlanmaydi).
        </p>
      </Card>

      {/* --- O‘yin qatlami: yuraklar va kunlik XP maqsadi --- */}
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">O‘yin qatlami</h2>
          <Chip tone={s.heartsEnabled ? 'brand' : 'warn'}>{s.heartsEnabled ? 'Yuraklar yoqilgan' : 'Yuraklar o‘chiq'}</Chip>
          <Chip tone={goal.reached ? 'ok' : 'warn'}>
            Bugun {goal.value}/{goal.target} XP
          </Chip>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.heartsEnabled} onChange={(e) => actions.setSettings({ heartsEnabled: e.target.checked })} />
          Yuraklar tizimi (har xato javobda bitta yurak ketadi)
        </label>
        <InfoBanner tone="muted">
          Yuraklar soni <b>{HEARTS_MAX}</b> ta, har xato javob uchun <b>{HEARTS_COST_WRONG}</b> tasi ketadi va{' '}
          {HEART_REFILL_MINUTES} daqiqada bittasi qaytadi. Yuraklar tugasa <b>takrorlash darsi</b> ochiladi —{' '}
          {HEART_PRACTICE_REVIEWS} ta so‘z takrorlansa bitta yurak qaytadi. Ketma-ket {HEART_COMBO_STREAK} ta to‘g‘ri
          javob uchun ham bitta yurak qaytariladi. Mock imtihon, diagnostika va bo‘lim testlarida yurak{' '}
          <b>jarima qilinmaydi</b>. O‘chirilsa — hech qanday jarima darvozasi qolmaydi. Sozlama telefon ilovasi bilan
          ham sinxronlanadi.
        </InfoBanner>
        <div className="flex items-center gap-2 text-sm">
          <GameIcon name="heart" size={18} className="text-[var(--heart)]" title="Yuraklar" />
          <span className="font-semibold">{hearts.count}</span>
          <span className="muted">
            /{hearts.max}
            {hearts.count < hearts.max && hearts.minutesLeft > 0 ? ` · keyingi yurak: ${hearts.minutesLeft} daqiqa` : ''}
          </span>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-semibold">Kunlik XP maqsadi</span>
          <div className="flex flex-wrap gap-2">
            {XP_GOAL_TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => actions.setSettings({ xpGoalXp: t.xp })}
                className={`chip cursor-pointer ${s.xpGoalXp === t.xp ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
              >
                {t.titleUz} — {t.xp} XP
              </button>
            ))}
          </div>
          <p className="text-xs muted">
            Bosqichlar Duolingo‘ning 5 pog‘onasi (Basic/Casual/Regular/Serious/Intense) — bizning XP masshtabimizga moslab
            10 marta kattalashtirilgan. Maqsadga yetilsa {GOAL_GEM_REWARD} gem beriladi; kunlik daqiqa rejasi
            ({s.dailyMinutes} daqiqa) alohida maqsad bo‘lib qoladi.
          </p>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-semibold">Do‘kon (gemlar: {data.game.gems})</span>
          <div className="grid sm:grid-cols-2 gap-2">
            {shop.map((it) => (
              <div key={it.id} className="rounded-xl border border-[var(--line)] p-3 grid gap-1.5">
                <div className="flex items-center gap-2">
                  <GameIcon name={it.id === 'freeze' ? 'shield' : it.id === 'xpBoost' ? 'bolt' : 'heart'} size={16} className="text-[var(--accent)]" />
                  <span className="text-sm font-semibold">{it.titleUz}</span>
                  <Chip tone={data.game.gems >= it.price ? 'ok' : 'warn'}>
                    <GameIcon name="gem" size={12} /> {it.price}
                  </Chip>
                </div>
                <p className="text-xs muted">{it.noteUz}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const res = actions.buy(it.id)
                    setShopMsg({ ok: res.ok, text: res.ok ? `${it.titleUz} olindi — ${it.price} gem sarflandi.` : (res.reasonUz ?? 'Xarid qilmab bo‘lmadi.') })
                  }}
                >
                  Sotib olish
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs muted">
            Narxlar Duolingo do‘konidan olindi (yuraklarni to‘ldirish 350 gem, streak qalqoni 200 gem); bitta yurak va
            XP byusti narxi — bizning qarorimiz. Omborda eng ko‘p {MAX_FREEZES} ta qalqon saqlanadi.
          </p>
          {shopMsg && (shopMsg.ok ? <SuccessBanner>{shopMsg.text}</SuccessBanner> : <InfoBanner tone="warn">{shopMsg.text}</InfoBanner>)}
        </div>

        {/* --- "Double or Nothing" garovi (Duolingo mexanikasi: 50 gem → 100 gem) ---
            Telefon ilovasi (`SettingsFragment`) bilan bir xil; shartlar soni
            `gameConfig`dan olinadi — matnda ixtira son yo‘q. */}
        <div className="grid gap-1.5">
          <span className="text-sm font-semibold">Garov — «Double or Nothing»</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const res = actions.placeStreakBet()
                setBetMsg({
                  ok: res.ok,
                  text: res.ok ? `Garov tikildi — ${BET_COST_GEMS} gem sarflandi.` : (res.reasonUz ?? 'Garov qo‘ymas bo‘ldi.'),
                })
              }}
            >
              Garov: {BET_COST_GEMS} gem tikib, zanjirni {BET_STREAK_DAYS} kunga uzaytirsak {BET_WIN_GEMS} gem qaytadi
            </Button>
            {bet && (
              <Chip tone="brand">
                Garov ochiq: {bet.startDay} kunidan {bet.gems} gem tikilgan
              </Chip>
            )}
          </div>
          <p className="text-xs muted">
            Garov ochilgan kundan {BET_DAYS} kun o‘tsa va zanjir kamida {BET_STREAK_DAYS} kunga o‘sgan bo‘lsa{' '}
            {BET_WIN_GEMS} gem qaytadi; aks holda tikilgan gem yo‘qoladi. Qalqonlar zanjirni uzmaydi — ular ham
            garov hisobiga kiradi.
          </p>
          {betMsg && (betMsg.ok ? <SuccessBanner>{betMsg.text}</SuccessBanner> : <InfoBanner tone="warn">{betMsg.text}</InfoBanner>)}
        </div>
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
          <StatTile label="Navbatdagi yozuvlar" value={queueLen === null ? '…' : queueLen} hint="Sinxronizatsiya yoki hisobdan chiqishda yuboriladi" tone={queueLen && queueLen > 0 ? 'warn' : 'ok'} />
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
                  ? `${res.done > 0 ? `${res.done} ta yozuv yuborildi.` : 'Yuboriladigan yangi o‘zgarish yo‘q.'}${
                      res.pulled ? ' Serverdagi ma’lumotlar qurilmadagisi bilan birlashtirildi.' : ''
                    }`
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
            <Button variant="secondary" busy={signingOut} onClick={() => void requestSignOut()}>
              {isGuest ? 'Chiqish (ma’lumot saqlanadi)' : signingOut ? 'Sinxronlanmoqda…' : 'Hisobdan chiqish'}
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
          fayllardan{hasServerCopy ? ', shuningdek serverdan' : ''} o‘chiriladi.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={syncing || signingOut} onClick={() => setConfirmReset(true)}>
            Barcha ma’lumotni o‘chirish
          </Button>
        </div>
        {resetDone && <SuccessBanner>Ma’lumotlar o‘chirildi — ilova boshlang‘ich holatga qaytdi.</SuccessBanner>}
      </Card>

      <Modal open={unsynced !== null} title="Serverga yetmagan ma’lumot bor" onClose={() => setUnsynced(null)}>
        <div className="grid gap-3">
          <p className="text-sm">
            {unsynced && unsynced.pending > 0
              ? `${unsynced.pending} ta yozuv serverga yuborilmadi.`
              : 'Sinxronizatsiya to‘liq bajarilmadi.'}{' '}
            {unsynced?.reasonUz}
          </p>
          <InfoBanner tone="warn">
            Hisobdan chiqsangiz, bu qurilmadagi ma’lumotlar o‘chiriladi — serverga yetmagan qismini tiklab bo‘lmaydi.
            Internetni tekshirib, qayta urinib ko‘ring.
          </InfoBanner>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setUnsynced(null)}>
              Qolish
            </Button>
            <Button variant="danger" onClick={doSignOut}>
              Baribir chiqish
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmReset}
        title="Ma’lumotlarni o‘chirasizmi?"
        onClose={() => {
          if (deleting) return
          setDeleteError(null)
          setConfirmReset(false)
        }}
      >
        <div className="grid gap-3">
          <p className="text-sm">
            Bu amal {data.attempts.length} ta urinish, {Object.keys(data.srs).length} ta so‘z holati,
            {' '}{data.writing.length} ta yozish va {data.speaking.length} ta gapirish seansini o‘chiradi.
          </p>
          <InfoBanner tone="warn">
            {hasServerCopy
              ? 'Serverdagi barcha shaxsiy yozuvlaringiz ham o‘chiriladi (hisobning o‘zi qoladi), so‘ng shu qurilmadagi kesh tozalanadi.'
              : 'Ma’lumotlar faqat shu qurilmada saqlangan — mahalliy kesh to‘liq tozalanadi.'}
          </InfoBanner>
          {deleteError && <InfoBanner tone="warn">{deleteError} Qurilmadagi ma’lumotlar o‘zgarmadi.</InfoBanner>}
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              disabled={deleting}
              onClick={() => {
                setDeleteError(null)
                setConfirmReset(false)
              }}
            >
              Bekor qilish
            </Button>
            <Button variant="danger" busy={deleting} onClick={() => void deleteAll()}>
              Ha, o‘chirilsin
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
