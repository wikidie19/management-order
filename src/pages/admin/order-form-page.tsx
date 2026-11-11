import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { PageLoader } from '@/components/shared/page-loader'
import { EmptyState, ErrorState } from '@/components/shared/state-message'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OrderForm } from '@/features/orders/components/order-form'
import { useOrderConfig, useOrderDetail } from '@/features/orders/hooks/use-orders'

export function OrderFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const configQuery = useOrderConfig()
  const orderQuery = useOrderDetail(id)

  const loading = configQuery.isLoading || (isEdit && orderQuery.isLoading)
  const error = configQuery.error ?? orderQuery.error

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Kembali">
          <Link to={isEdit ? `/admin/orders/${id}` : '/admin/orders'}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">{isEdit ? 'Ubah Pesanan' : 'Tambah Pesanan'}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {isEdit && orderQuery.data
              ? `${orderQuery.data.order_number} · ${orderQuery.data.family_name}`
              : 'Pemesanan Kaos RT 02 – ERTE DUA, GUYUP RUKUN'}
          </p>
        </div>
      </div>

      <Card className="overflow-visible">
        <CardContent>
          {loading ? (
            <PageLoader />
          ) : error ? (
            <ErrorState
              error={error}
              onRetry={() => {
                void configQuery.refetch()
                if (isEdit) void orderQuery.refetch()
              }}
            />
          ) : isEdit && !orderQuery.data ? (
            <EmptyState title="Pesanan tidak ditemukan" description="Pesanan mungkin sudah dihapus." />
          ) : (
            <OrderForm key={id ?? 'new'} config={configQuery.data!} order={orderQuery.data ?? undefined} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
