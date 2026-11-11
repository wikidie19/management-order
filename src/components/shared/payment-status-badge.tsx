import { Badge } from '@/components/ui/badge'
import type { PaymentStatus } from '@/features/orders/types'

const variants = {
  Lunas: 'success',
  Cicil: 'warning',
  'Belum bayar': 'destructive',
} as const

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={variants[status] ?? 'secondary'}>{status}</Badge>
}
