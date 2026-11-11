import type { OrderItem, PaymentStatus, PricingConfig } from '../types'

interface PriceableItem {
  id?: string | null
  size: string
  sleeve_type: string
  wearer_type: string
}

/**
 * Mirrors `public.calc_item_price` so the form can preview prices.
 * The database remains the source of truth when the order is saved.
 */
export function getShirtPrice(item: PriceableItem, pricing: PricingConfig[]) {
  if (!item.size || !item.sleeve_type) return null
  const config = pricing.find(
    (p) => p.is_active && p.sleeve_type === item.sleeve_type && p.sizes.includes(item.size as PricingConfig['sizes'][number]),
  )
  if (!config) return null
  return item.wearer_type === 'Anak' ? Math.max(0, config.adult_price - config.child_discount) : config.adult_price
}

/** Uses the stored price snapshot when the price-relevant fields of an existing item are unchanged. */
export function getItemPrice(item: PriceableItem, pricing: PricingConfig[], originals: Map<string, OrderItem>) {
  const original = item.id ? originals.get(item.id) : undefined
  if (
    original &&
    original.size === item.size &&
    original.sleeve_type === item.sleeve_type &&
    original.wearer_type === item.wearer_type
  ) {
    return original.unit_price
  }
  return getShirtPrice(item, pricing)
}

export function getPaymentStatus(totalAmount: number, totalPaid: number): PaymentStatus {
  const remaining = totalAmount - totalPaid
  if (remaining <= 0) return 'Lunas'
  if (totalPaid > 0) return 'Cicil'
  return 'Belum bayar'
}

export function getChildDiscount(pricing: PricingConfig[]) {
  return pricing.find((p) => p.is_active)?.child_discount ?? 0
}
