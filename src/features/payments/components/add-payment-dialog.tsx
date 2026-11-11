import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormField } from '@/components/shared/form-field'
import { SummaryRow } from '@/components/shared/summary-row'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { PAYMENT_CHANNELS } from '@/features/orders/constants'
import type { Order } from '@/features/orders/types'
import { formatRupiah, getErrorMessage, parseAmount } from '@/lib/utils'

import { useAddPayment } from '../hooks/use-payments'

function buildSchema(remaining: number) {
  return z.object({
    amount: z
      .string()
      .refine((v) => parseAmount(v) > 0, 'Jumlah pembayaran harus lebih dari 0.')
      .refine((v) => parseAmount(v) <= remaining, `Maksimal ${formatRupiah(remaining)} (sisa tagihan).`),
    paymentDate: z.string().min(1, 'Tanggal wajib diisi.'),
    paymentMethod: z.enum(PAYMENT_CHANNELS),
    notes: z.string().max(300, 'Maksimal 300 karakter.'),
  })
}

type PaymentValues = z.infer<ReturnType<typeof buildSchema>>

interface AddPaymentDialogProps {
  order: Pick<Order, 'id' | 'order_number' | 'family_name' | 'total_amount' | 'total_paid' | 'remaining_balance'> | null
  onOpenChange: (open: boolean) => void
}

export function AddPaymentDialog({ order, onOpenChange }: AddPaymentDialogProps) {
  const remaining = order?.remaining_balance ?? 0
  const addPayment = useAddPayment()

  const form = useForm<PaymentValues>({
    resolver: zodResolver(buildSchema(remaining)),
    defaultValues: { amount: '', paymentDate: '', paymentMethod: 'Tunai', notes: '' },
  })

  useEffect(() => {
    if (order) {
      form.reset({
        amount: '',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'Tunai',
        notes: '',
      })
    }
  }, [order, form])

  const onSubmit = async (values: PaymentValues) => {
    if (!order) return
    try {
      const updated = await addPayment.mutateAsync({
        orderId: order.id,
        amount: parseAmount(values.amount),
        paymentDate: values.paymentDate,
        paymentMethod: values.paymentMethod,
        notes: values.notes,
      })
      toast.success(`Pembayaran dicatat. Status: ${updated.payment_status}.`)
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal menyimpan pembayaran.'))
    }
  }

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pembayaran</DialogTitle>
          <DialogDescription>
            {order?.order_number} · {order?.family_name}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted px-4 py-2">
          <SummaryRow label="Total tagihan" value={formatRupiah(order?.total_amount)} />
          <SummaryRow label="Sudah dibayar" value={formatRupiah(order?.total_paid)} />
          <SummaryRow label="Sisa pembayaran" value={formatRupiah(remaining)} emphasis />
        </div>

        <form id="add-payment-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormField label="Jumlah pembayaran" htmlFor="pay-amount" error={errors.amount?.message} required>
            <div className="flex gap-2">
              <Input
                id="pay-amount"
                inputMode="numeric"
                placeholder="Contoh: 50000"
                aria-invalid={Boolean(errors.amount)}
                {...form.register('amount')}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => form.setValue('amount', String(remaining), { shouldValidate: true })}
              >
                Lunasi
              </Button>
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tanggal" htmlFor="pay-date" error={errors.paymentDate?.message} required>
              <Input id="pay-date" type="date" {...form.register('paymentDate')} />
            </FormField>
            <FormField label="Cara bayar" htmlFor="pay-method" required>
              <NativeSelect id="pay-method" {...form.register('paymentMethod')}>
                {PAYMENT_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField label="Catatan" htmlFor="pay-notes" error={errors.notes?.message}>
            <Input id="pay-notes" placeholder="Opsional" {...form.register('notes')} />
          </FormField>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="add-payment-form" disabled={isSubmitting || remaining <= 0}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Simpan Pembayaran
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
