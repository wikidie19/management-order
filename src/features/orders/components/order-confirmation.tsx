import { Link } from 'react-router-dom'
import { CheckCircle2, Eye, List, Plus } from 'lucide-react'

import { PaymentStatusBadge } from '@/components/shared/payment-status-badge'
import { SummaryRow } from '@/components/shared/summary-row'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/utils'

import type { SaveOrderResult } from '../types'

interface OrderConfirmationProps {
  result: SaveOrderResult
  isEdit: boolean
  onCreateAnother: () => void
}

export function OrderConfirmation({ result, isEdit, onCreateAnother }: OrderConfirmationProps) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <CheckCircle2 className="size-14 text-primary" />
        <h2 className="text-xl font-bold">{isEdit ? 'Perubahan Tersimpan!' : 'Pesanan Berhasil!'}</h2>
        <p className="text-sm text-muted-foreground">
          {isEdit ? 'Data pesanan telah diperbarui.' : 'Data pesanan sudah tersimpan.'}
        </p>
      </div>

      <div className="rounded-xl bg-muted px-4 py-3">
        <SummaryRow label="Nomor pesanan" value={<span className="font-mono">{result.order_number}</span>} />
        <SummaryRow label="Nama KK" value={result.family_name} />
        <SummaryRow label="Jumlah kaos" value={`${result.total_quantity} kaos`} />
        <SummaryRow label="Total harga" value={formatRupiah(result.subtotal)} />
        {result.subsidy_amount > 0 && <SummaryRow label="Subsidi" value={`-${formatRupiah(result.subsidy_amount)}`} />}
        <SummaryRow label="Total tagihan" value={formatRupiah(result.total_amount)} />
        <SummaryRow
          label={isEdit ? 'Total dibayar' : 'Jumlah pembayaran'}
          value={formatRupiah(isEdit ? result.total_paid : result.last_payment_amount)}
        />
        <SummaryRow label="Sisa pembayaran" value={formatRupiah(result.remaining_balance)} emphasis />
        <SummaryRow label="Status pembayaran" value={<PaymentStatusBadge status={result.payment_status} />} />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button asChild variant="outline">
          <Link to={`/admin/orders/${result.id}`}>
            <Eye />
            Lihat detail
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/orders">
            <List />
            Daftar pesanan
          </Link>
        </Button>
        {isEdit ? (
          <Button asChild>
            <Link to="/admin/orders/new">
              <Plus />
              Pesanan baru
            </Link>
          </Button>
        ) : (
          <Button onClick={onCreateAnother}>
            <Plus />
            Pesanan baru
          </Button>
        )}
      </div>
    </div>
  )
}
