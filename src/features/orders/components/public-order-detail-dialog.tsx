import { Shirt } from 'lucide-react'

import { PaymentStatusBadge } from '@/components/shared/payment-status-badge'
import { EmptyState, ErrorState } from '@/components/shared/state-message'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

import { usePublicOrderDetail } from '../hooks/use-orders'

interface PublicOrderDetailDialogProps {
  orderNumber: string | null
  onOpenChange: (open: boolean) => void
}

export function PublicOrderDetailDialog({ orderNumber, onOpenChange }: PublicOrderDetailDialogProps) {
  const { data: order, isLoading, isError, error, refetch } = usePublicOrderDetail(orderNumber)

  return (
    <Dialog open={Boolean(orderNumber)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{order?.family_name ?? 'Detail Pesanan'}</DialogTitle>
            {order && <PaymentStatusBadge status={order.payment_status} />}
          </div>
          <DialogDescription>
            <span className="font-mono">{orderNumber}</span>
            {order && ` · ${formatDate(order.created_at)}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !order ? (
          <EmptyState title="Pesanan tidak ditemukan" description="Pesanan mungkin sudah dihapus." />
        ) : (
          <div className="grid gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Shirt className="size-4 text-primary" />
              {order.total_quantity} kaos
            </p>
            <ul className="divide-y rounded-lg border">
              {order.items.map((item) => (
                <li key={item.item_no} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {item.item_no}. {item.wearer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.wearer_type} · {item.category} · {item.sleeve_type}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-sm font-semibold">{item.size}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
