/** Skeleton loader'lar — ma'lumot kelguncha joy egallaydi (sakrash bo'lmaydi). */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/60 ${className}`} />
}

export function KpiSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="panel p-4 grid gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="panel p-4 lg:col-span-2 grid gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="panel p-4 grid gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="grid gap-1.5 flex-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-20 hidden sm:block" />
          <Skeleton className="h-6 w-16 hidden md:block" />
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton({ label }: { label: string }) {
  return (
    <div className="grid gap-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-56" />
      <KpiSkeleton />
      <ChartSkeleton />
    </div>
  )
}
