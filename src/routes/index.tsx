import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Link, Navigate } from 'react-router-dom'

import { AppLayout } from '@/components/layout/app-layout'
import { EmptyState } from '@/components/shared/state-message'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/shared/page-loader'
import { PublicOrdersPage } from '@/pages/public/public-orders-page'

import { RequireAdmin } from './require-admin'

const AdminLoginPage = lazy(() => import('@/pages/admin/admin-login-page').then((m) => ({ default: m.AdminLoginPage })))
const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/admin-orders-page').then((m) => ({ default: m.AdminOrdersPage })),
)
const OrderDetailPage = lazy(() =>
  import('@/pages/admin/order-detail-page').then((m) => ({ default: m.OrderDetailPage })),
)
const OrderFormPage = lazy(() => import('@/pages/admin/order-form-page').then((m) => ({ default: m.OrderFormPage })))

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>
}

function NotFound() {
  return (
    <EmptyState
      title="Halaman tidak ditemukan"
      description="Alamat yang Anda buka tidak tersedia."
      action={
        <Button asChild variant="outline">
          <Link to="/orders">Ke daftar pesanan</Link>
        </Button>
      }
    />
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/orders" replace /> },
  {
    element: <AppLayout variant="public" />,
    children: [
      { path: '/orders', element: <PublicOrdersPage /> },
      { path: '/admin/login', element: withSuspense(<AdminLoginPage />) },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AppLayout variant="admin" />,
        children: [
          { path: '/admin', element: <Navigate to="/admin/orders" replace /> },
          { path: '/admin/orders', element: withSuspense(<AdminOrdersPage />) },
          { path: '/admin/orders/new', element: withSuspense(<OrderFormPage />) },
          { path: '/admin/orders/:id', element: withSuspense(<OrderDetailPage />) },
          { path: '/admin/orders/:id/edit', element: withSuspense(<OrderFormPage />) },
        ],
      },
    ],
  },
  {
    element: <AppLayout variant="public" />,
    children: [{ path: '*', element: <NotFound /> }],
  },
])
