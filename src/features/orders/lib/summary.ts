import { PAYMENT_STATUSES, SIZES, SLEEVE_TYPES, WEARER_TYPES } from '../constants'
import type { Order, OrderItem, PaymentStatus, Size, SleeveType, WearerType } from '../types'

export type SummaryOrderRow = Pick<
  Order,
  'total_quantity' | 'subtotal' | 'subsidy_amount' | 'total_amount' | 'total_paid' | 'remaining_balance' | 'payment_status'
> & {
  order_items: Pick<OrderItem, 'size' | 'wearer_type' | 'sleeve_type'>[]
}

export type SizeMatrix = Record<Size, Record<SleeveType, number>>

export interface OrderSummary {
  orderCount: number
  shirtCount: number
  subtotal: number
  subsidy: number
  billed: number
  paid: number
  remaining: number
  statusCounts: Record<PaymentStatus, number>
  sizes: Record<WearerType, SizeMatrix>
  wearerTotals: Record<WearerType, number>
}

function emptyMatrix(): SizeMatrix {
  return Object.fromEntries(
    SIZES.map((size) => [size, Object.fromEntries(SLEEVE_TYPES.map((sleeve) => [sleeve, 0]))]),
  ) as SizeMatrix
}

export function buildOrderSummary(rows: SummaryOrderRow[]): OrderSummary {
  const summary: OrderSummary = {
    orderCount: rows.length,
    shirtCount: 0,
    subtotal: 0,
    subsidy: 0,
    billed: 0,
    paid: 0,
    remaining: 0,
    statusCounts: Object.fromEntries(PAYMENT_STATUSES.map((s) => [s, 0])) as Record<PaymentStatus, number>,
    sizes: Object.fromEntries(WEARER_TYPES.map((w) => [w, emptyMatrix()])) as Record<WearerType, SizeMatrix>,
    wearerTotals: Object.fromEntries(WEARER_TYPES.map((w) => [w, 0])) as Record<WearerType, number>,
  }

  for (const order of rows) {
    summary.shirtCount += order.total_quantity
    summary.subtotal += order.subtotal
    summary.subsidy += order.subsidy_amount
    summary.billed += order.total_amount
    summary.paid += order.total_paid
    summary.remaining += order.remaining_balance
    summary.statusCounts[order.payment_status] += 1

    for (const item of order.order_items) {
      summary.sizes[item.wearer_type][item.size][item.sleeve_type] += 1
      summary.wearerTotals[item.wearer_type] += 1
    }
  }

  return summary
}
