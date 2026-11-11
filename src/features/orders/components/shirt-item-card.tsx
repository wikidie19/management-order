import { type UseFormReturn } from 'react-hook-form'
import { Trash2 } from 'lucide-react'

import { FormField } from '@/components/shared/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { cn, formatRupiah } from '@/lib/utils'

import { CATEGORIES, SIZES, SLEEVE_TYPES, WEARER_TYPES } from '../constants'
import type { OrderFormValues } from '../schemas/order-form.schema'

interface ShirtItemCardProps {
  form: UseFormReturn<OrderFormValues>
  index: number
  price: number | null
  childDiscount: number
  isChild: boolean
  isSnapshot: boolean
  canRemove: boolean
  onRemove: () => void
}

export function ShirtItemCard({
  form,
  index,
  price,
  childDiscount,
  isChild,
  isSnapshot,
  canRemove,
  onRemove,
}: ShirtItemCardProps) {
  const errors = form.formState.errors.items?.[index]
  const id = (field: string) => `items-${index}-${field}`

  return (
    <div className="rounded-xl border bg-[#fcfdfc] p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-bold">Kaos {index + 1}</h3>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" className="-mr-2 text-destructive" onClick={onRemove}>
            <Trash2 />
            Hapus
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nama pemakai"
          htmlFor={id('name')}
          error={errors?.wearer_name?.message}
          required
          className="sm:col-span-2"
        >
          <Input
            id={id('name')}
            placeholder="Nama pemakai kaos"
            autoComplete="off"
            aria-invalid={Boolean(errors?.wearer_name)}
            {...form.register(`items.${index}.wearer_name`)}
          />
        </FormField>

        <FormField label="Tipe pemakai" htmlFor={id('type')} required>
          <NativeSelect id={id('type')} {...form.register(`items.${index}.wearer_type`)}>
            {WEARER_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <FormField label="Kategori" htmlFor={id('category')} error={errors?.category?.message} required>
          <NativeSelect
            id={id('category')}
            aria-invalid={Boolean(errors?.category)}
            {...form.register(`items.${index}.category`)}
          >
            <option value="">Pilih kategori</option>
            {CATEGORIES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <FormField label="Ukuran" htmlFor={id('size')} error={errors?.size?.message} required>
          <NativeSelect id={id('size')} aria-invalid={Boolean(errors?.size)} {...form.register(`items.${index}.size`)}>
            <option value="">Pilih ukuran</option>
            {SIZES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <FormField label="Jenis lengan" htmlFor={id('sleeve')} error={errors?.sleeve_type?.message} required>
          <NativeSelect
            id={id('sleeve')}
            aria-invalid={Boolean(errors?.sleeve_type)}
            {...form.register(`items.${index}.sleeve_type`)}
          >
            <option value="">Pilih jenis lengan</option>
            {SLEEVE_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      <div
        className={cn(
          'mt-4 rounded-lg px-3 py-2.5 text-sm font-semibold',
          price === null ? 'bg-muted text-muted-foreground' : 'bg-accent text-accent-foreground',
        )}
      >
        {price === null
          ? 'Harga: menunggu pilihan ukuran dan jenis lengan'
          : `${isChild ? `Harga anak (potongan ${formatRupiah(childDiscount)})` : 'Harga dewasa'}: ${formatRupiah(price)}`}
        {price !== null && isSnapshot && (
          <span className="block text-xs font-normal text-muted-foreground">Harga tersimpan saat pemesanan</span>
        )}
      </div>
    </div>
  )
}
