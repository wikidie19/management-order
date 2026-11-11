import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Pencil, Trash2, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'

import { PageLoader } from '@/components/shared/page-loader'
import { PaymentStatusBadge } from '@/components/shared/payment-status-badge'
import { EmptyState, ErrorState } from '@/components/shared/state-message'
import { SummaryRow } from '@/components/shared/summary-row'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DeleteOrderDialog } from '@/features/orders/components/delete-order-dialog'
import { useOrderDetail } from '@/features/orders/hooks/use-orders'
import type { Payment } from '@/features/orders/types'
import { AddPaymentDialog } from '@/features/payments/components/add-payment-dialog'
import { useDeletePayment } from '@/features/payments/hooks/use-payments'
import { formatDate, formatDateTime, formatRupiah, getErrorMessage } from '@/lib/utils'

function toWhatsAppLink(number: string) {
  let digits = number.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  return `https://wa.me/${digits}`
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: order, isLoading, error, refetch } = useOrderDetail(id)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null)
  const deletePayment = useDeletePayment()

  if (isLoading) return <PageLoader />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!order) {
    return (
      <EmptyState
        title="Pesanan tidak ditemukan"
        description="Pesanan mungkin sudah dihapus."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/orders">Kembali ke daftar</Link>
          </Button>
        }
      />
    )
  }

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return
    try {
      await deletePayment.mutateAsync(paymentToDelete.id)
      toast.success('Pembayaran dihapus.')
      setPaymentToDelete(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus pembayaran.'))
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Kembali">
            <Link to="/admin/orders">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{order.family_name}</h1>
              <PaymentStatusBadge status={order.payment_status} />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{order.order_number}</span> · {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Button variant="outline" onClick={() => setDeleteOpen(true)} className="text-destructive">
            <Trash2 />
            Hapus
          </Button>
          <Button asChild variant="outline">
            <Link to={`/admin/orders/${order.id}/edit`}>
              <Pencil />
              Ubah
            </Link>
          </Button>
          <Button onClick={() => setPaymentOpen(true)} disabled={order.remaining_balance <= 0}>
            <Wallet />
            Bayar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Detail Kaos ({order.total_quantity})</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            <ul className="divide-y border-t md:hidden">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {item.item_no}. {item.wearer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.wearer_type} · {item.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ukuran <strong className="text-foreground">{item.size}</strong> · {item.sleeve_type}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatRupiah(item.unit_price)}</span>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">No</TableHead>
                    <TableHead>Nama Pemakai</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Ukuran</TableHead>
                    <TableHead>Lengan</TableHead>
                    <TableHead className="pr-6 text-right">Harga</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6">{item.item_no}</TableCell>
                      <TableCell className="font-semibold whitespace-normal">{item.wearer_name}</TableCell>
                      <TableCell>{item.wearer_type}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{item.sleeve_type}</TableCell>
                      <TableCell className="pr-6 text-right">{formatRupiah(item.unit_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="pl-6">
                      Total harga kaos
                    </TableCell>
                    <TableCell className="pr-6 text-right">{formatRupiah(order.subtotal)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid content-start gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pemesan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p className="font-semibold">{order.family_name}</p>
              <a
                href={toWhatsAppLink(order.whatsapp_number)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
              >
                <MessageCircle className="size-4" />
                {order.whatsapp_number}
              </a>
              {order.notes && <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground">{order.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Tagihan</CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryRow label="Total harga" value={formatRupiah(order.subtotal)} />
              <SummaryRow label="Subsidi" value={`-${formatRupiah(order.subsidy_amount)}`} />
              <SummaryRow label="Total tagihan" value={formatRupiah(order.total_amount)} />
              <SummaryRow label="Total dibayar" value={formatRupiah(order.total_paid)} />
              <SummaryRow label="Sisa pembayaran" value={formatRupiah(order.remaining_balance)} emphasis />
              <SummaryRow label="Metode" value={order.payment_method} className="mt-1" />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Riwayat Pembayaran</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)} disabled={order.remaining_balance <= 0}>
            <Wallet />
            Tambah
          </Button>
        </CardHeader>
        <CardContent className="px-0 sm:px-0">
          {order.payments.length === 0 ? (
            <p className="px-4 pb-2 text-sm text-muted-foreground sm:px-6">Belum ada pembayaran.</p>
          ) : (
            <ul className="divide-y border-t">
              {order.payments.map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{formatRupiah(payment.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(payment.payment_date)} · {payment.payment_method}
                      {payment.notes && ` · ${payment.notes}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => setPaymentToDelete(payment)}
                    aria-label="Hapus pembayaran"
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddPaymentDialog order={paymentOpen ? order : null} onOpenChange={setPaymentOpen} />
      <DeleteOrderDialog
        order={deleteOpen ? order : null}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate('/admin/orders', { replace: true })}
      />
      <AlertDialog open={Boolean(paymentToDelete)} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pembayaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Pembayaran sebesar <strong>{formatRupiah(paymentToDelete?.amount)}</strong> tanggal{' '}
              {paymentToDelete && formatDate(paymentToDelete.payment_date)} akan dihapus dan status pembayaran dihitung
              ulang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePayment.isPending}>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeletePayment} disabled={deletePayment.isPending}>
              Ya, hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
