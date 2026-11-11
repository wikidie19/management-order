import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { PageLoader } from '@/components/shared/page-loader'
import { useAuthStore } from '@/stores/auth-store'

export function RequireAdmin() {
  const { status, session, isAdmin } = useAuthStore()
  const location = useLocation()

  if (status === 'loading') return <PageLoader />
  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
