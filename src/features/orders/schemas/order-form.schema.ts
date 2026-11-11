import { z } from 'zod'

import {
  CATEGORIES,
  PAYMENT_CHANNELS,
  PAYMENT_METHODS,
  SIZES,
  SLEEVE_TYPES,
  WEARER_TYPES,
  WHATSAPP_PATTERN,
} from '../constants'
import type { OrderDetail, SaveOrderPayload } from '../types'

const requiredChoice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z
    .union([z.enum(values), z.literal('')])
    .refine((v) => v !== '', message)

export const orderItemSchema = z.object({
  id: z.string().nullable(),
  wearer_name: z
    .string()
    .trim()
    .min(1, 'Nama pemakai wajib diisi.')
    .max(120, 'Maksimal 120 karakter.'),
  wearer_type: z.enum(WEARER_TYPES),
  category: requiredChoice(CATEGORIES, 'Pilih kategori.'),
  size: requiredChoice(SIZES, 'Pilih ukuran.'),
  sleeve_type: requiredChoice(SLEEVE_TYPES, 'Pilih jenis lengan.'),
})

export const orderFormSchema = z.object({
  family_name: z
    .string()
    .trim()
    .min(1, 'Nama KK wajib diisi.')
    .max(120, 'Maksimal 120 karakter.'),
  whatsapp_number: z
    .string()
    .trim()
    .min(1, 'Nomor WhatsApp wajib diisi.')
    .regex(WHATSAPP_PATTERN, 'Nomor WhatsApp tidak valid (8–20 digit).'),
  items: z.array(orderItemSchema).min(1, 'Minimal 1 kaos.'),
  payment_method: z.enum(PAYMENT_METHODS),
  payment_amount: z.string().refine((v) => v.trim() === '' || /^[\d.\s]+$/.test(v.replace(/^Rp/i, '')), {
    message: 'Masukkan nominal angka yang valid.',
  }),
  payment_channel: z.enum(PAYMENT_CHANNELS),
  notes: z.string().max(500, 'Maksimal 500 karakter.'),
})

export type OrderFormValues = z.input<typeof orderFormSchema>
export type OrderItemValues = OrderFormValues['items'][number]

export const emptyItem = (): OrderItemValues => ({
  id: null,
  wearer_name: '',
  wearer_type: 'Dewasa',
  category: '',
  size: '',
  sleeve_type: '',
})

export function getDefaultValues(order?: OrderDetail): OrderFormValues {
  if (!order) {
    return {
      family_name: '',
      whatsapp_number: '',
      items: [emptyItem()],
      payment_method: 'Bayar langsung (lunas)',
      payment_amount: '',
      payment_channel: 'Tunai',
      notes: '',
    }
  }

  return {
    family_name: order.family_name,
    whatsapp_number: order.whatsapp_number,
    items: [...order.order_items]
      .sort((a, b) => a.item_no - b.item_no)
      .map((item) => ({
        id: item.id,
        wearer_name: item.wearer_name,
        wearer_type: item.wearer_type,
        category: item.category,
        size: item.size,
        sleeve_type: item.sleeve_type,
      })),
    payment_method: order.payment_method,
    payment_amount: '',
    payment_channel: 'Tunai',
    notes: order.notes ?? '',
  }
}

export function toSavePayload(values: OrderFormValues, paymentAmount: number): SaveOrderPayload {
  return {
    family_name: values.family_name.trim(),
    whatsapp_number: values.whatsapp_number.trim(),
    notes: values.notes.trim() || null,
    payment_method: values.payment_method,
    payment_amount: values.payment_method === 'Cicil terlebih dahulu' ? paymentAmount : 0,
    payment_channel: values.payment_channel,
    items: values.items.map((item) => ({
      id: item.id,
      wearer_name: item.wearer_name.trim(),
      wearer_type: item.wearer_type,
      category: item.category as SaveOrderPayload['items'][number]['category'],
      size: item.size as SaveOrderPayload['items'][number]['size'],
      sleeve_type: item.sleeve_type as SaveOrderPayload['items'][number]['sleeve_type'],
    })),
  }
}
