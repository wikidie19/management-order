import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { PAYMENT_STATUSES } from '@/features/orders/constants'
import type { OrderListFilters, PaymentStatus } from '@/features/orders/types'

/** Stores list filters in the URL so they survive refreshes and can be shared. */
export function useListFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<OrderListFilters>(() => {
    const status = params.get('status') ?? ''
    const page = Number(params.get('page') ?? 1)
    return {
      search: params.get('q') ?? '',
      status: (PAYMENT_STATUSES as readonly string[]).includes(status) ? (status as PaymentStatus) : '',
      sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
      page: Number.isInteger(page) && page > 0 ? page : 1,
    }
  }, [params])

  const setFilters = useCallback(
    (patch: Partial<OrderListFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const merged = { ...filters, page: 1, ...patch }
          const entries: [string, string][] = [
            ['q', merged.search],
            ['status', merged.status],
            ['sort', merged.sort === 'newest' ? '' : merged.sort],
            ['page', merged.page > 1 ? String(merged.page) : ''],
          ]
          for (const [key, value] of entries) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          return next
        },
        { replace: true },
      )
    },
    [filters, setParams],
  )

  return { filters, setFilters }
}
