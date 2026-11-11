import { useMemo, useState, type FormEvent } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Info, Loader2, Plus, Send } from 'lucide-react'
import { toast } from 'sonner'

import { FormField } from '@/components/shared/form-field'
import { SummaryRow } from '@/components/shared/summary-row'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatRupiah, getErrorMessage, parseAmount } from '@/lib/utils'

import { PAYMENT_CHANNELS, PAYMENT_METHODS } from '../constants'
import { useFamilySubsidy, useSaveOrder } from '../hooks/use-orders'
import { getChildDiscount, getItemPrice, getPaymentStatus } from '../lib/pricing'
import {
  emptyItem,
  getDefaultValues,
  orderFormSchema,
  toSavePayload,
  type OrderFormValues,
} from '../schemas/order-form.schema'
import type { OrderConfig, OrderDetail, SaveOrderResult } from '../types'
import { OrderConfirmation } from './order-confirmation'
import { ShirtItemCard } from './shirt-item-card'

const STEPS = ['Data Pemesan', 'Detail Kaos', 'Pembayaran'] as const
const LUNAS = PAYMENT_METHODS[0]
const CICIL = PAYMENT_METHODS[1]

interface OrderFormProps {
  config: OrderConfig
  order?: OrderDetail
}

export function OrderForm({ config, order }: OrderFormProps) {
  const isEdit = Boolean(order)
  const [step, setStep] = useState(1)
  const [result, setResult] = useState<SaveOrderResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const saveOrder = useSaveOrder(order?.id)

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: getDefaultValues(order),
    mode: 'onTouched',
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  const items = useWatch({ control: form.control, name: 'items' })
  const familyName = useWatch({ control: form.control, name: 'family_name' })
  const method = useWatch({ control: form.control, name: 'payment_method' })
  const amountInput = useWatch({ control: form.control, name: 'payment_amount' })

  const originals = useMemo(() => new Map((order?.order_items ?? []).map((i) => [i.id, i])), [order])
  const childDiscount = getChildDiscount(config.pricing)
  const prices = items.map((item) => getItemPrice(item, config.pricing, originals))
  const subtotal = prices.reduce<number>((sum, p) => sum + (p ?? 0), 0)

  const subsidyQuery = useFamilySubsidy(familyName, order?.id, step >= 2)
  const subsidy = subsidyQuery.data ?? (order ? order.subsidy_amount : config.familySubsidy)
  const bill = Math.max(0, subtotal - subsidy)
  const alreadyPaid = order?.total_paid ?? 0
  const outstanding = bill - alreadyPaid
  const paymentNow = method === LUNAS ? Math.max(0, outstanding) : parseAmount(amountInput)
  const projectedPaid = alreadyPaid + paymentNow
  const projectedRemaining = Math.max(0, bill - projectedPaid)
  const projectedStatus = getPaymentStatus(bill, projectedPaid)

  const goToStep = (next: number) => {
    setStep(next)
    setServerError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setQuantity = (quantity: number) => {
    if (quantity > fields.length) {
      append(Array.from({ length: quantity - fields.length }, emptyItem), { shouldFocus: false })
    } else if (quantity < fields.length) {
      remove(Array.from({ length: fields.length - quantity }, (_, i) => quantity + i))
    }
  }

  const handleNext = async () => {
    if (step === 1) {
      if (await form.trigger(['family_name', 'whatsapp_number'], { shouldFocus: true })) goToStep(2)
      return
    }
    if (step === 2) {
      if (!(await form.trigger('items', { shouldFocus: true }))) {
        toast.error('Mohon lengkapi seluruh detail kaos.')
        return
      }
      if (prices.some((p) => p === null)) {
        toast.error('Harga salah satu kaos belum tersedia. Periksa pengaturan harga.')
        return
      }
      goToStep(3)
    }
  }

  const onSubmit = async (values: OrderFormValues) => {
    setServerError(null)
    const amount = parseAmount(values.payment_amount)

    if (alreadyPaid > bill) {
      setServerError(
        `Total pembayaran tercatat (${formatRupiah(alreadyPaid)}) melebihi total tagihan baru (${formatRupiah(bill)}). Hapus sebagian pembayaran di halaman detail terlebih dahulu.`,
      )
      return
    }
    if (values.payment_method === CICIL && amount > outstanding) {
      form.setError('payment_amount', {
        message: `${isEdit ? 'Pembayaran' : 'Pembayaran awal'} tidak boleh melebihi ${formatRupiah(outstanding)}.`,
      })
      return
    }

    try {
      const saved = await saveOrder.mutateAsync(toSavePayload(values, amount))
      setResult(saved)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      toast.success(isEdit ? 'Perubahan pesanan disimpan.' : 'Pesanan berhasil disimpan.')
    } catch (error) {
      const message = getErrorMessage(error, 'Terjadi kesalahan saat menyimpan pesanan.')
      setServerError(message)
      toast.error(message)
    }
  }

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (step < 3) void handleNext()
    else void form.handleSubmit(onSubmit)(event)
  }

  if (result) {
    return (
      <OrderConfirmation
        result={result}
        isEdit={isEdit}
        onCreateAnother={() => {
          form.reset(getDefaultValues())
          setResult(null)
          setStep(1)
        }}
      />
    )
  }

  const { errors, isSubmitting } = form.formState
  const paymentLabel = isEdit ? 'Pembayaran tambahan' : 'Jumlah pembayaran awal'

  return (
    <form onSubmit={handleFormSubmit} noValidate className="grid gap-5">
      {/* Progress */}
      <div>
        <div className="flex gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className={cn('h-1.5 flex-1 rounded-full', i < step ? 'bg-primary' : 'bg-secondary')} />
          ))}
        </div>
        <p className="mt-3 text-xs font-bold tracking-wide text-primary uppercase">
          Langkah {step} dari {STEPS.length}
        </p>
        <h2 className="text-lg font-bold">{STEPS[step - 1]}</h2>
      </div>

      {step === 1 && (
        <section className="grid gap-4">
          <FormField label="Nama KK / Nama Keluarga" htmlFor="family_name" error={errors.family_name?.message} required>
            <Input
              id="family_name"
              placeholder="Masukkan nama kepala keluarga"
              autoComplete="off"
              aria-invalid={Boolean(errors.family_name)}
              {...form.register('family_name')}
            />
          </FormField>
          <FormField label="Nomor WhatsApp" htmlFor="whatsapp_number" error={errors.whatsapp_number?.message} required>
            <Input
              id="whatsapp_number"
              type="tel"
              inputMode="tel"
              placeholder="Contoh: 081234567890"
              autoComplete="off"
              aria-invalid={Boolean(errors.whatsapp_number)}
              {...form.register('whatsapp_number')}
            />
          </FormField>
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-4">
          <FormField label="Jumlah kaos" htmlFor="quantity" required hint={`Maksimal ${config.maxShirts} kaos per pesanan.`}>
            <NativeSelect id="quantity" value={fields.length} onChange={(e) => setQuantity(Number(e.target.value))}>
              {Array.from({ length: Math.max(config.maxShirts, fields.length) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} kaos
                </option>
              ))}
            </NativeSelect>
          </FormField>

          {fields.map((field, index) => (
            <ShirtItemCard
              key={field.id}
              form={form}
              index={index}
              price={prices[index] ?? null}
              childDiscount={childDiscount}
              isChild={items[index]?.wearer_type === 'Anak'}
              isSnapshot={Boolean(
                items[index]?.id && prices[index] !== null && originals.get(items[index].id!)?.unit_price === prices[index],
              )}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
            />
          ))}

          {fields.length < config.maxShirts && (
            <Button type="button" variant="outline" onClick={() => append(emptyItem())}>
              <Plus />
              Tambah kaos
            </Button>
          )}

          <PriceSummary subtotal={subtotal} subsidy={subsidy} bill={bill} loading={subsidyQuery.isFetching} />
          <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Subsidi kas RT sebesar {formatRupiah(config.familySubsidy)} per KK, maksimal satu kali untuk setiap KK.
              Harga anak mendapat potongan {formatRupiah(childDiscount)} dari harga dewasa.
              {subsidyQuery.data === 0 && config.familySubsidy > 0 && (
                <strong className="mt-1 block text-amber-700">KK ini sudah menerima subsidi pada pesanan lain.</strong>
              )}
            </span>
          </p>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-4">
          <div className="rounded-xl bg-muted px-4 py-3">
            <SummaryRow label="Nama KK" value={familyName} />
            <SummaryRow label="Jumlah kaos" value={`${items.length} kaos`} />
            <SummaryRow label="Total harga kaos" value={formatRupiah(subtotal)} />
            <SummaryRow label="Subsidi kas RT" value={`-${formatRupiah(subsidy)}`} />
            <SummaryRow label="Total tagihan" value={formatRupiah(bill)} emphasis />
            {isEdit && (
              <>
                <SummaryRow label="Sudah dibayar" value={formatRupiah(alreadyPaid)} className="mt-2" />
                <SummaryRow label="Sisa sebelum pembayaran ini" value={formatRupiah(Math.max(0, outstanding))} />
              </>
            )}
          </div>

          {isEdit && alreadyPaid > bill && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-destructive" role="alert">
              Total pembayaran tercatat melebihi total tagihan baru. Hapus sebagian pembayaran di halaman detail pesanan
              sebelum menyimpan perubahan ini.
            </p>
          )}

          <FormField label="Metode pembayaran" htmlFor="payment_method" required>
            <NativeSelect id="payment_method" {...form.register('payment_method')}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          {method === CICIL ? (
            <FormField
              label={paymentLabel}
              htmlFor="payment_amount"
              error={errors.payment_amount?.message}
              hint={`Maksimal ${formatRupiah(Math.max(0, outstanding))}. Kosongkan jika belum ada pembayaran.`}
            >
              <Input
                id="payment_amount"
                inputMode="numeric"
                placeholder="Contoh: 50000"
                aria-invalid={Boolean(errors.payment_amount)}
                {...form.register('payment_amount')}
              />
            </FormField>
          ) : (
            <p className="rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground">
              {outstanding > 0
                ? `Pembayaran lunas sebesar ${formatRupiah(outstanding)} akan dicatat.`
                : 'Pesanan sudah lunas, tidak ada pembayaran baru yang dicatat.'}
            </p>
          )}

          {paymentNow > 0 && (
            <FormField label="Cara bayar" htmlFor="payment_channel">
              <NativeSelect id="payment_channel" {...form.register('payment_channel')}>
                {PAYMENT_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          )}

          <FormField label="Catatan internal" htmlFor="notes" error={errors.notes?.message} hint="Hanya terlihat oleh admin.">
            <Textarea id="notes" rows={2} placeholder="Opsional" {...form.register('notes')} />
          </FormField>

          <div className="rounded-xl border px-4 py-3">
            <SummaryRow label="Pembayaran dicatat sekarang" value={formatRupiah(paymentNow)} />
            <SummaryRow label="Total dibayar" value={formatRupiah(projectedPaid)} />
            <SummaryRow label="Sisa pembayaran" value={formatRupiah(projectedRemaining)} emphasis />
            <SummaryRow label="Status pembayaran" value={projectedStatus} />
          </div>

          {serverError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}
        </section>
      )}

      {/* Actions: sticky on mobile so they stay reachable while scrolling long forms */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-5 flex gap-2 border-t bg-card/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0">
        {step > 1 && (
          <Button type="button" variant="secondary" size="lg" onClick={() => goToStep(step - 1)}>
            <ArrowLeft />
            Kembali
          </Button>
        )}
        {step < 3 ? (
          <Button type="submit" size="lg" className="flex-1">
            Selanjutnya
            <ArrowRight />
          </Button>
        ) : (
          <Button type="submit" size="lg" className="flex-1" disabled={isSubmitting || (isEdit && alreadyPaid > bill)}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
            {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Pesanan'}
          </Button>
        )}
      </div>
    </form>
  )
}

function PriceSummary({
  subtotal,
  subsidy,
  bill,
  loading,
}: {
  subtotal: number
  subsidy: number
  bill: number
  loading: boolean
}) {
  return (
    <div className="rounded-xl bg-muted px-4 py-3">
      <SummaryRow label="Total harga kaos" value={formatRupiah(subtotal)} />
      <SummaryRow
        label="Subsidi kas RT"
        value={loading ? <Loader2 className="inline size-4 animate-spin" /> : `-${formatRupiah(subsidy)}`}
      />
      <SummaryRow label="Total tagihan" value={formatRupiah(bill)} emphasis />
    </div>
  )
}
