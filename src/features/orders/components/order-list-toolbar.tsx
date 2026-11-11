import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'

import { PAYMENT_STATUSES } from '../constants'
import type { OrderListFilters, PaymentStatus, SortOrder } from '../types'

interface OrderListToolbarProps {
  filters: OrderListFilters
  onChange: (patch: Partial<OrderListFilters>) => void
}

export function OrderListToolbar({ filters, onChange }: OrderListToolbarProps) {
  const [search, setSearch] = useState(filters.search)
  const [syncedSearch, setSyncedSearch] = useState(filters.search)

  // Pick up external URL changes (e.g. back/forward navigation).
  if (syncedSearch !== filters.search) {
    setSyncedSearch(filters.search)
    setSearch(filters.search)
  }

  useEffect(() => {
    if (search === filters.search) return
    const timer = setTimeout(() => onChange({ search }), 350)
    return () => clearTimeout(timer)
  }, [search, filters.search, onChange])

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          inputMode="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor pesanan atau nama KK"
          className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
          aria-label="Cari pesanan"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onClick={() => setSearch('')}
            aria-label="Hapus pencarian"
          >
            <X />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:contents">
        <NativeSelect
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as PaymentStatus | '' })}
          aria-label="Filter status pembayaran"
          className="sm:w-44"
        >
          <option value="">Semua status</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortOrder })}
          aria-label="Urutkan"
          className="sm:w-40"
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
        </NativeSelect>
      </div>
    </div>
  )
}
