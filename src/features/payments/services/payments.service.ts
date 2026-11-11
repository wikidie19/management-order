import { supabase } from '@/lib/supabase'
import type { Order, PaymentChannel } from '@/features/orders/types'

export interface AddPaymentInput {
  orderId: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentChannel
  notes: string
}

export async function addPayment(input: AddPaymentInput) {
  const { data, error } = await supabase.rpc('add_payment', {
    p_order_id: input.orderId,
    p_amount: input.amount,
    p_payment_date: input.paymentDate,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes || null,
  })
  if (error) throw error
  return data as Order
}

export async function deletePayment(paymentId: string) {
  const { data, error } = await supabase.rpc('delete_payment', { p_payment_id: paymentId })
  if (error) throw error
  return data as Order
}
