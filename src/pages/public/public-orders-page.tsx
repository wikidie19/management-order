import { useState } from 'react'
import { ChevronRight, Shirt } from 'lucide-react'

import { Pagination } from '@/components/shared/pagination'
import { PaymentStatusBadge } from '@/components/shared/payment-status-badge'
import { EmptyState, ErrorState } from '@/components/shared/state-message'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DesignShowcase } from '@/features/design/components/design-showcase'
import { OrderListToolbar } from '@/features/orders/components/order-list-toolbar'
import { PublicOrderDetailDialog } from '@/features/orders/components/public-order-detail-dialog'
import { PAGE_SIZE } from '@/features/orders/constants'
import { usePublicOrders } from '@/features/orders/hooks/use-orders'
import { useListFilters } from '@/hooks/use-list-filters'
import { formatDate } from '@/lib/utils'

export function PublicOrdersPage() {
  const { filters, setFilters } = useListFilters()
  const { data, isLoading, isError, error, refetch, isFetching } = usePublicOrders(filters)
  const rows = data?.rows ?? []
  const hasFilter = Boolean(filters.search || filters.status)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)

  return (
    <div className="grid gap-4 sm:gap-6">
      <div className="px-1">
        <h1 className="text-xl font-bold sm:text-2xl">Daftar Pesanan Kaos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rekap pemesanan kaos warga RT 02. Hubungi pengurus RT untuk pemesanan atau perubahan data.
        </p>
      </div>

      <DesignShowcase />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-3 sm:p-4">
          <OrderListToolbar filters={filters} onChange={setFilters} />
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={hasFilter ? 'Pesanan tidak ditemukan' : 'Belum ada pesanan'}
            description={hasFilter ? 'Coba ubah kata kunci atau filter status.' : 'Pesanan yang masuk akan tampil di sini.'}
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
            {/* Mobile: cards */}
            <ul className="divide-y md:hidden">
              {rows.map((order) => (
                <li key={order.order_number}>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order.order_number)}
                    className="grid w-full gap-2 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{order.family_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.order_number} · {formatDate(order.created_at)}
                        </p>
                      </div>
                      <PaymentStatusBadge status={order.payment_status} />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shirt className="size-4 shrink-0 text-primary" />
                      <span className="font-medium">{order.total_quantity} kaos</span>
                      {order.size_summary && (
                        <span className="truncate text-muted-foreground">· {order.size_summary}</span>
                      )}
                      <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Pesanan</TableHead>
                    <TableHead>Nama KK</TableHead>
                    <TableHead className="text-center">Jumlah Kaos</TableHead>
                    <TableHead>Ringkasan Ukuran</TableHead>
                    <TableHead>Tanggal Pemesanan</TableHead>
                    <TableHead>Status Pembayaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((order) => (
                    <TableRow
                      key={order.order_number}
                      tabIndex={0}
                      onClick={() => setSelectedOrder(order.order_number)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedOrder(order.order_number)
                        }
                      }}
                      className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                    >
                      <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                      <TableCell className="font-semibold whitespace-normal">{order.family_name}</TableCell>
                      <TableCell className="text-center">{order.total_quantity}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{order.size_summary ?? '-'}</TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={order.payment_status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              page={filters.page}
              pageSize={PAGE_SIZE}
              total={data?.total ?? 0}
              onPageChange={(page) => setFilters({ page })}
            />
          </div>
        )}
      </Card>

      <PublicOrderDetailDialog orderNumber={selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)} />
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}
