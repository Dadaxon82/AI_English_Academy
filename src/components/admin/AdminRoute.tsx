/**
 * ProtectedRoute: admin panelga faqat tizimga kirgan va serverda roli `admin`
 * (status `active`) bo'lgan foydalanuvchi kiradi. Boshqalar Dashboard'ga
 * yo'naltiriladi. Bu faqat UI darvozasi — haqiqiy himoya serverda (RLS va
 * `is_admin()` tekshiruvi), shuning uchun bu yerni chetlab o'tish hech
 * qanday ma'lumot bermaydi.
 */
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthActions } from '../../lib/authContext'
import { useIsAdmin } from '../../lib/admin'
import { DashboardSkeleton } from './Skeleton'

export default function AdminRoute({ children }: { children: ReactNode }) {
  const userId = useAuthActions()?.userId ?? null
  const check = useIsAdmin(userId)
  if (check === 'checking') return <DashboardSkeleton label="Ruxsat tekşirilmoqda…" />
  if (check !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
