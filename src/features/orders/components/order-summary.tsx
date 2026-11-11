import type { ReactNode } from 'react'
import { ChevronDown, ClipboardList, HandCoins, Receipt, Ruler, Wallet } from 'lucide-react'

import { ErrorState } from '@/components/shared/state-message'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatRupiah } from '@/lib/utils'

import { PAYMENT_STATUSES, SIZES, SLEEVE_TYPES, WEARER_TYPES } from '../constants'
import { useOrderSummary } from '../hooks/use-orders'
import type { SizeMatrix } from '../lib/summary'
import type { PaymentStatus } from '../types'

const STATUS_COLORS: Record<PaymentStatus, string> = {
  Lunas: 'bg-primary',
  Cicil: 'bg-amber-400',
  'Belum bayar': 'bg-red-400',
}

const SLEEVE_LABELS: Record<(typeof SLEEVE_TYPES)[number], string> = {
  'Lengan pendek': 'Pendek',
  'Lengan panjang': 'Panjang',
  'Lengan panjang 7/8': '7/8',
}

function StatCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="gap-1 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
        <span className="text-primary [&_svg]:size-4">{icon}</span>
        {label}
      </div>
      <p className="truncate text-lg font-bold sm:text-xl">{value}</p>
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

function SizeTable({ title, matrix, total }: { title: string; matrix: SizeMatrix; total: number }) {
  const rows = SIZES.map((size) => ({
    size,
    counts: SLEEVE_TYPES.map((sleeve) => matrix[size][sleeve]),
  })).filter((row) => row.counts.some((c) => c > 0))

  return (
    <section className="overflow-hidden rounded-lg border">
      <h3 className="flex items-center justify-between border-b bg-muted/50 px-4 py-2 text-sm font-semibold">
        {title}
        <span className="font-normal text-muted-foreground">{total} kaos</span>
      </h3>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Belum ada kaos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Ukuran</TableHead>
              {SLEEVE_TYPES.map((sleeve) => (
                <TableHead key={sleeve} className="text-center">
                  {SLEEVE_LABELS[sleeve]}
                </TableHead>
              ))}
              <TableHead className="pr-4 text-center">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.size}>
                <TableCell className="pl-4 font-semibold">{row.size}</TableCell>
                {row.counts.map((count, i) => (
                  <TableCell key={SLEEVE_TYPES[i]} className={count ? 'text-center' : 'text-center text-muted-foreground'}>
                    {count || '-'}
                  </TableCell>
                ))}
                <TableCell className="pr-4 text-center font-semibold">{row.counts.reduce((a, b) => a + b, 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="pl-4">Total</TableCell>
              {SLEEVE_TYPES.map((sleeve) => (
                <TableCell key={sleeve} className="text-center">
                  {SIZES.reduce((sum, size) => sum + matrix[size][sleeve], 0)}
                </TableCell>
              ))}
              <TableCell className="pr-4 text-center">{total}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </section>
  )
}

export function OrderSummaryPanel() {
  const { data: summary, isLoading, isError, error, refetch } = useOrderSummary()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError || !summary) {
    return (
      <Card className="py-0">
        <ErrorState error={error} onRetry={() => refetch()} />
      </Card>
    )
  }

  const paidPercent = summary.billed > 0 ? Math.round((summary.paid / summary.billed) * 100) : 0
  const unpaidOrders = summary.statusCounts.Cicil + summary.statusCounts['Belum bayar']

  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<ClipboardList />}
          label="Pesanan"
          value={`${summary.orderCount} pesanan`}
          hint={`${summary.shirtCount} kaos`}
        />
        <StatCard
          icon={<Receipt />}
          label="Total Tagihan"
          value={formatRupiah(summary.billed)}
          hint={`Subsidi ${formatRupiah(summary.subsidy)}`}
        />
        <StatCard
          icon={<Wallet />}
          label="Sudah Dibayar"
          value={formatRupiah(summary.paid)}
          hint={`${paidPercent}% dari tagihan`}
        />
        <StatCard
          icon={<HandCoins />}
          label="Sisa Pembayaran"
          value={formatRupiah(summary.remaining)}
          hint={`${unpaidOrders} pesanan belum lunas`}
        />
      </div>

      <Card className="gap-3 px-4 py-4 sm:px-5">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          {PAYMENT_STATUSES.map((status) =>
            summary.statusCounts[status] > 0 ? (
              <div
                key={status}
                className={STATUS_COLORS[status]}
                style={{ width: `${(summary.statusCounts[status] / summary.orderCount) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {PAYMENT_STATUSES.map((status) => (
            <span key={status} className="inline-flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${STATUS_COLORS[status]}`} />
              {status}
              <span className="font-semibold">{summary.statusCounts[status]}</span>
            </span>
          ))}
        </div>

        <details className="group border-t pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <Ruler className="size-4 text-primary" />
            Rekap ukuran untuk produksi
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {WEARER_TYPES.map((type) => (
              <SizeTable key={type} title={type} matrix={summary.sizes[type]} total={summary.wearerTotals[type]} />
            ))}
          </div>
        </details>
      </Card>
    </div>
  )
}
