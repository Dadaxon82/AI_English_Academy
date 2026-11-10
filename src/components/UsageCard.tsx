/**
 * Yangi funksiyalardan foydalanish (6-bosqich) — faqat shu qurilmadagi sonlar.
 * Qaysi funksiya ishlatilmayotgani yoki yarim yo'lda tashlanayotgani ko'rinadi.
 */

import { FEATURES, clearUsage, completionPct, useUsageStats } from '../lib/usage'
import { Button, Card, Chip } from './ui'

export default function UsageCard() {
  const stats = useUsageStats()
  const any = FEATURES.some((f) => (stats[f.id]?.started ?? 0) > 0)
  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-bold">Yangi funksiyalardan foydalanish</h2>
        <Chip>faqat shu qurilmada</Chip>
        <span className="flex-1" />
        <Button size="sm" variant="ghost" disabled={!any} onClick={clearUsage}>
          Tozalash
        </Button>
      </div>
      <p className="text-xs muted">
        Sonlar hech qayerga yuborilmaydi va javoblaringiz saqlanmaydi — faqat necha marta boshlangan va oxirigacha yetkazilgani.
        «Yakunlangan»ning ma’nosi har qatorda yozilgan.
      </p>
      {/* Tor ekranda jadval gorizontal aylanadi — klaviatura bilan ham aylantirish uchun fokuslanadigan hudud (axe: scrollable-region-focusable). */}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Funksiyalardan foydalanish jadvali">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs muted">
              <th className="py-1.5 pr-2 font-semibold">Funksiya</th>
              <th className="py-1.5 pr-2 font-semibold tabular-nums">Boshlangan</th>
              <th className="py-1.5 pr-2 font-semibold tabular-nums">Yakunlangan</th>
              <th className="py-1.5 font-semibold tabular-nums">Foiz</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => {
              const s = stats[f.id]
              const pct = completionPct(s)
              return (
                <tr key={f.id} className="border-t" data-testid={`usage-${f.id}`}>
                  <td className="py-1.5 pr-2">
                    <span className="font-semibold">{f.titleUz}</span>
                    <span className="block text-[11px] muted">
                      yakunlangan = {f.finishedUz}
                      {s?.lastAt ? ` · oxirgi: ${new Date(s.lastAt).toLocaleDateString('uz-UZ')}` : ''}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{s?.started ?? 0}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{s?.finished ?? 0}</td>
                  <td className="py-1.5 tabular-nums">{pct === null ? '—' : `${pct}%`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
