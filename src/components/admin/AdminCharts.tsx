/**
 * Admin grafiklari (Recharts): 30 kunlik ro'yxatdan o'tish dinamikasi va
 * darajalar bo'yicha taqsimot. Har grafik yonida ekran o'quvchilari uchun
 * matnli xulosa bor (rasm — yagona ma'lumot manbai emas).
 */
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { bucketLevels, type AdminStats } from '../../lib/admin'

const INDIGO = '#6366f1'
const BUCKET_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#94a3b8']
const tick = { fill: 'var(--muted)', fontSize: 11 }
const tooltipStyle = {
  background: 'var(--panel)',
  border: '1px solid var(--border, #cbd5e1)',
  borderRadius: 12,
  color: 'var(--text)',
  fontSize: 12,
}

function shortDay(iso: string): string {
  const [, m, d] = iso.split('-')
  return m && d ? `${d}.${m}` : iso
}

export function SignupsChart({ data }: { data: AdminStats['signups_30d'] }) {
  const total = data.reduce((s, r) => s + r.count, 0)
  const peak = data.reduce((best, r) => (r.count > best.count ? r : best), { day: '', count: 0 })
  return (
    <figure className="grid gap-2">
      <figcaption className="font-semibold">Sönggi 30 kunda röyxatdan ötganlar</figcaption>
      <p className="text-xs muted">
        Jami {total} ta{peak.count > 0 ? `, eng köp — ${shortDay(peak.day)} (${peak.count} ta)` : ''}.
      </p>
      <div className="h-60" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }} accessibilityLayer={false}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
            <XAxis dataKey="day" tickFormatter={shortDay} tick={tick} interval="preserveStartEnd" minTickGap={18} />
            <YAxis allowDecimals={false} tick={tick} width={40} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => shortDay(String(l))} formatter={(v) => [v, 'Yangi']} />
            <Line type="monotone" dataKey="count" stroke={INDIGO} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

export function LevelsChart({ levels }: { levels: AdminStats['levels'] }) {
  const data = bucketLevels(levels)
  return (
    <figure className="grid gap-2">
      <figcaption className="font-semibold">Darajalar böyiça taqsimot</figcaption>
      <p className="text-xs muted">{data.map((d) => `${d.name}: ${d.value}`).join(' · ')}</p>
      <div className="h-60" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }} accessibilityLayer={false}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.12} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={tick} />
            <YAxis type="category" dataKey="name" tick={tick} width={92} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fillOpacity: 0.08 }} formatter={(v) => [v, 'Öquvçi']} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={d.name} fill={BUCKET_COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] muted">Beginner — A1–A2, Intermediate — B1–B2, Advanced — C1. Belgilanmagan — daraja hali tanlanmagan.</p>
    </figure>
  )
}
