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
          {kind === 'installed' && <Chip tone="ok">Örnatildi</Chip>}
        </div>
        <p className="text-sm muted">{describe(kind)}</p>
        {dismissed && kind === 'manual' && (
          <p className="text-xs muted">Örnatiş bekor qilindi — keyinroq brauzer menyusidan ham örnatişingiz mumkin.</p>
        )}
      </div>
      {kind === 'prompt' && (
        <Button
          onClick={() => {
            void promptInstall().then((outcome) => setDismissed(outcome === 'dismissed'))
          }}
        >
          Ilovani örnatiş
        </Button>
      )}
    </Card>
  )
}

function describe(kind: Exclude<ReturnType<typeof getInstallKind>, 'standalone'>): string {
  switch (kind) {
    case 'prompt':
      return 'AI English Academy’ni telefon yoki kompyuteringizga ilova sifatida örnating: boş ekrandan alohida oynada oçiladi va çeklangan offline rejimda ham işlaydi. APK fayl şart emas.'
    case 'installed':
      return 'Ilova örnatildi — uni boş ekran yoki ilovalar röyxatidan oçing.'
    case 'ios':
      return 'iPhone/iPad: Safari’da «Ulaşiş» tugmasini (kvadrat va yuqoriga strelka) bosing, söng «Boş ekranga qöşiş» (Add to Home Screen)ni tanlang.'
    case 'manual':
      return 'Brauzer menyusidan (⋮) «Ilovani örnatiş» yoki «Boş ekranga qöşiş»ni tanlang. Android’da Chrome, kompyuterda Chrome yoki Edge tavsiya etiladi. APK fayl şart emas.'
  }
}
