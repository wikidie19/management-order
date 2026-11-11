import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, MoreVertical, Pencil, Phone, Plus, Shirt, Trash2, Wallet } from 'lucide-react'

import { Pagination } from '@/components/shared/pagination'
import { PaymentStatusBadge } from '@/components/shared/payment-status-badge'
import { EmptyState, ErrorState } from '@/components/shared/state-message'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ExportButton } from '@/features/export/export-button'
import { DeleteOrderDialog } from '@/features/orders/components/delete-order-dialog'
import { OrderListToolbar } from '@/features/orders/components/order-list-toolbar'
import { PAGE_SIZE } from '@/features/orders/constants'
import { useAdminOrders } from '@/features/orders/hooks/use-orders'
import type { Order } from '@/features/orders/types'
import { AddPaymentDialog } from '@/features/payments/components/add-payment-dialog'
import { useListFilters } from '@/hooks/use-list-filters'
import { formatDate, formatRupiah } from '@/lib/utils'

export function AdminOrdersPage() {
  const { filters, setFilters } = useListFilters()
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminOrders(filters)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)

  const rows = data?.rows ?? []
  const hasFilter = Boolean(filters.search || filters.status)
  const pageIds = rows.map((r) => r.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const somePageSelected = pageIds.some((id) => selected.has(id))

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const togglePage = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of pageIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })

  const actions = { onPayment: setPaymentOrder, onDelete: setDeleteTarget }

  return (
    <div className="grid gap-4 sm:gap-6">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Kelola Pesanan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} pesanan` : 'Memuat pesanan...'}
            {selected.size > 0 && (
              <>
                {' '}
                · {selected.size} terpilih{' '}
                <button className="font-semibold text-primary hover:underline" onClick={() => setSelected(new Set())}>
                  (batalkan)
                </button>
              </>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <ExportButton filters={filters} selectedIds={[...selected]} />
          <Button asChild>
            <Link to="/admin/orders/new">
              <Plus />
              Tambah Pesanan
            </Link>
          </Button>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-3 sm:p-4">
          <OrderListToolbar filters={filters} onChange={setFilters} />
        </div>

        {isLoading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={hasFilter ? 'Pesanan tidak ditemukan' : 'Belum ada pesanan'}
            description={hasFilter ? 'Coba ubah kata kunci atau filter status.' : 'Mulai dengan menambahkan pesanan pertama.'}
            action={
              !hasFilter && (
                <Button asChild>
                  <Link to="/admin/orders/new">
                    <Plus />
                    Tambah Pesanan
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
            {/* Mobile: cards */}
            <div className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2 md:hidden">
              <Checkbox
                checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                onCheckedChange={(c) => togglePage(c === true)}
                aria-label="Pilih semua di halaman ini"
              />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Pilih semua</span>
            </div>
            <ul className="divide-y md:hidden">
              {rows.map((order) => (
                <li key={order.id} className="flex gap-3 px-4 py-3.5">
                  <Checkbox
                    className="mt-0.5"
                    checked={selected.has(order.id)}
                    onCheckedChange={(c) => toggle(order.id, c === true)}
                    aria-label={`Pilih ${order.order_number}`}
                  />
                  <div className="grid min-w-0 flex-1 gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/admin/orders/${order.id}`} className="min-w-0">
                        <p className="truncate font-semibold">{order.family_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.order_number} · {formatDate(order.created_at)}
                        </p>
                      </Link>
                      <RowActions order={order} {...actions} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Shirt className="size-3.5 text-primary" />
                        {order.total_quantity} kaos
                      </span>
                      <a href={`tel:${order.whatsapp_number}`} className="inline-flex items-center gap-1">
                        <Phone className="size-3.5" />
                        {order.whatsapp_number}
                      </a>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <PaymentStatusBadge status={order.payment_status} />
                      <span>
                        <span className="text-muted-foreground">Sisa </span>
                        <span className="font-semibold">{formatRupiah(order.remaining_balance)}</span>
                        <span className="text-muted-foreground"> / {formatRupiah(order.total_amount)}</span>
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                        onCheckedChange={(c) => togglePage(c === true)}
                        aria-label="Pilih semua di halaman ini"
                      />
                    </TableHead>
                    <TableHead>Nomor Pesanan</TableHead>
                    <TableHead>Nama KK</TableHead>
                    <TableHead>Nomor WhatsApp</TableHead>
                    <TableHead className="text-center">Jumlah Kaos</TableHead>
                    <TableHead className="text-right">Total Harga</TableHead>
                    <TableHead className="text-right">Subsidi</TableHead>
                    <TableHead className="text-right">Total Tagihan</TableHead>
                    <TableHead className="text-right">Total Dibayar</TableHead>
                    <TableHead className="text-right">Sisa Pembayaran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Aksi</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((order) => (
                    <TableRow key={order.id} data-state={selected.has(order.id) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(order.id)}
                          onCheckedChange={(c) => toggle(order.id, c === true)}
                          aria-label={`Pilih ${order.order_number}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <Link to={`/admin/orders/${order.id}`} className="font-semibold text-primary hover:underline">
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-48 truncate font-semibold">{order.family_name}</TableCell>
                      <TableCell>{order.whatsapp_number}</TableCell>
                      <TableCell className="text-center">{order.total_quantity}</TableCell>
                      <TableCell className="text-right">{formatRupiah(order.subtotal)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(order.subsidy_amount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatRupiah(order.total_amount)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(order.total_paid)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(order.remaining_balance)}</TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={order.payment_status} />
                      </TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <RowActions order={order} {...actions} />
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

      <AddPaymentDialog order={paymentOrder} onOpenChange={(open) => !open && setPaymentOrder(null)} />
      <DeleteOrderDialog
        order={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={() => deleteTarget && toggle(deleteTarget.id, false)}
      />
    </div>
  )
}

interface RowActionsProps {
  order: Order
  onPayment: (order: Order) => void
  onDelete: (order: Order) => void
}

function RowActions({ order, onPayment, onDelete }: RowActionsProps) {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-1.5 shrink-0" aria-label={`Aksi ${order.order_number}`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => navigate(`/admin/orders/${order.id}`)}>
          <Eye />
          Lihat detail
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(`/admin/orders/${order.id}/edit`)}>
          <Pencil />
          Ubah pesanan
        </DropdownMenuItem>
        <DropdownMenuItem disabled={order.remaining_balance <= 0} onSelect={() => onPayment(order)}>
          <Wallet />
          Tambah pembayaran
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(order)}>
          <Trash2 />
          Hapus pesanan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
