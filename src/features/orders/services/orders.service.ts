import { supabase } from '@/lib/supabase'

import { DEFAULT_MAX_SHIRTS, PAGE_SIZE } from '../constants'
import type {
  Order,
  OrderConfig,
  OrderDetail,
  OrderListFilters,
  OrderWithItems,
  PricingConfig,
  PublicOrder,
  PublicOrderDetail,
  SaveOrderPayload,
  SaveOrderResult,
} from '../types'

/** Escapes characters with special meaning in PostgREST `or` filters and LIKE patterns. */
function toIlikePattern(search: string) {
  const cleaned = search.trim().replace(/[,()*%_\\]/g, ' ').replace(/\s+/g, ' ')
  return `*${cleaned}*`
}

export async function listPublicOrders(filters: OrderListFilters) {
  const { data, error } = await supabase.rpc('list_public_orders', {
    p_search: filters.search || null,
    p_status: filters.status || null,
    p_sort: filters.sort,
    p_limit: PAGE_SIZE,
    p_offset: (filters.page - 1) * PAGE_SIZE,
  })
  if (error) throw error
  const rows = (data ?? []) as PublicOrder[]
  return { rows, total: rows[0]?.total_count ?? 0 }
}

export async function getPublicOrder(orderNumber: string) {
  const { data, error } = await supabase.rpc('get_public_order', { p_order_number: orderNumber })
  if (error) throw error
  return (data ?? null) as PublicOrderDetail | null
}

type OrdersQuery = ReturnType<ReturnType<typeof supabase.from>['select']>

function applyAdminFilters<Q extends OrdersQuery>(query: Q, filters: Pick<OrderListFilters, 'search' | 'status'>): Q {
  let q = query
  if (filters.search.trim()) {
    const pattern = toIlikePattern(filters.search)
    q = q.or(`order_number.ilike.${pattern},family_name.ilike.${pattern}`)
  }
  if (filters.status) q = q.eq('payment_status', filters.status)
  return q
}

export async function listAdminOrders(filters: OrderListFilters) {
  const from = (filters.page - 1) * PAGE_SIZE
  const query = applyAdminFilters(supabase.from('orders').select('*', { count: 'exact' }), filters)
    .order('created_at', { ascending: filters.sort === 'oldest' })
    .range(from, from + PAGE_SIZE - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { rows: (data ?? []) as Order[], total: count ?? 0 }
}

/** Fetches orders with their shirts for the production export. */
export async function listOrdersForExport(
  options: { ids: string[] } | { filters: Pick<OrderListFilters, 'search' | 'status' | 'sort'> },
) {
  const batch = 500
  const all: OrderWithItems[] = []

  for (let from = 0; ; from += batch) {
    let query = supabase.from('orders').select('*, order_items(*)')
    if ('ids' in options) {
      query = query.in('id', options.ids)
    } else {
      query = applyAdminFilters(query, options.filters)
    }
    const ascending = 'filters' in options ? options.filters.sort === 'oldest' : true
    const { data, error } = await query
      .order('created_at', { ascending })
      .order('item_no', { referencedTable: 'order_items', ascending: true })
      .range(from, from + batch - 1)
    if (error) throw error
    all.push(...((data ?? []) as OrderWithItems[]))
    if (!data || data.length < batch) break
  }

  return all
}

export async function getOrderDetail(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), payments(*)')
    .eq('id', id)
    .order('item_no', { referencedTable: 'order_items', ascending: true })
    .order('payment_date', { referencedTable: 'payments', ascending: true })
    .maybeSingle()
  if (error) throw error
  return data as OrderDetail | null
}

export async function getOrderConfig(): Promise<OrderConfig> {
  const [pricingRes, settingsRes] = await Promise.all([
    supabase.from('pricing_configs').select('*').eq('is_active', true),
    supabase.from('app_settings').select('setting_key, setting_value'),
  ])
  if (pricingRes.error) throw pricingRes.error
  if (settingsRes.error) throw settingsRes.error

  const settings = new Map(
    (settingsRes.data ?? []).map((s: { setting_key: string; setting_value: unknown }) => [s.setting_key, s.setting_value]),
  )

  return {
    maxShirts: Number(settings.get('max_shirts_per_order') ?? DEFAULT_MAX_SHIRTS),
    familySubsidy: Number(settings.get('family_subsidy_amount') ?? 0),
    pricing: (pricingRes.data ?? []) as PricingConfig[],
  }
}

export async function previewFamilySubsidy(familyName: string, orderId?: string) {
  const { data, error } = await supabase.rpc('preview_family_subsidy', {
    p_family_name: familyName,
    p_order_id: orderId ?? null,
  })
  if (error) throw error
  return Number(data ?? 0)
}

export async function saveOrder(payload: SaveOrderPayload, orderId?: string) {
  const { data, error } = await supabase.rpc('save_order', {
    p_payload: payload,
    p_order_id: orderId ?? null,
  })
  if (error) throw error
  return data as SaveOrderResult
}

export async function deleteOrder(id: string) {
  const { error, count } = await supabase.from('orders').delete({ count: 'exact' }).eq('id', id)
  if (error) throw error
  if (!count) throw new Error('Pesanan tidak ditemukan atau Anda tidak memiliki akses.')
}
