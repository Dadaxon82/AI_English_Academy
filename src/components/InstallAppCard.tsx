/**
 * "Mobil ilova" bloki — PWA'ni bosh ekranga o'rnatish.
 *
 * Tugma faqat brauzer haqiqatan o'rnatish oynasini bera olganda ko'rsatiladi
 * ("hech qanday tugma dekoratsiya bo'lmasin"); aks holda qo'lda o'rnatish
 * yo'riqnomasi chiqadi. Ilova o'rnatilib, ilova sifatida ochilgan bo'lsa,
 * blok umuman ko'rsatilmaydi.
 */

import { useState, useSyncExternalStore } from 'react'
import { assetUrl } from '../lib/audio'
import { getInstallKind, promptInstall, subscribeInstall } from '../lib/install'
import { Button, Card, Chip } from './ui'

export default function InstallAppCard() {
  const kind = useSyncExternalStore(subscribeInstall, getInstallKind, () => 'manual' as const)
  const [dismissed, setDismissed] = useState(false)

  if (kind === 'standalone') return null

  return (
    <Card as="section" className="flex flex-wrap items-center gap-3.5">
      <img src={assetUrl('/icons/icon-192.png')} alt="" width={52} height={52} className="rounded-2xl shrink-0" />
      <div className="flex-1 min-w-52 grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">Mobil ilova</h2>
          {kind === 'installed' && <Chip tone="ok">O‘rnatildi</Chip>}
        </div>
        <p className="text-sm muted">{describe(kind)}</p>
        {dismissed && kind === 'manual' && (
          <p className="text-xs muted">O‘rnatish bekor qilindi — keyinroq brauzer menyusidan ham o‘rnatishingiz mumkin.</p>
        )}
      </div>
      {kind === 'prompt' && (
        <Button
          onClick={() => {
            void promptInstall().then((outcome) => setDismissed(outcome === 'dismissed'))
          }}
        >
          Ilovani o‘rnatish
        </Button>
      )}
    </Card>
  )
}

function describe(kind: Exclude<ReturnType<typeof getInstallKind>, 'standalone'>): string {
  switch (kind) {
    case 'prompt':
      return 'AI English Academy’ni telefon yoki kompyuteringizga ilova sifatida o‘rnating: bosh ekrandan alohida oynada ochiladi va cheklangan offline rejimda ham ishlaydi. APK fayl shart emas.'
    case 'installed':
      return 'Ilova o‘rnatildi — uni bosh ekran yoki ilovalar ro‘yxatidan oching.'
    case 'ios':
      return 'iPhone/iPad: Safari’da «Ulashish» tugmasini (kvadrat va yuqoriga strelka) bosing, so‘ng «Bosh ekranga qo‘shish» (Add to Home Screen)ni tanlang.'
    case 'manual':
      return 'Brauzer menyusidan (⋮) «Ilovani o‘rnatish» yoki «Bosh ekranga qo‘shish»ni tanlang. Android’da Chrome, kompyuterda Chrome yoki Edge tavsiya etiladi. APK fayl shart emas.'
  }
}
