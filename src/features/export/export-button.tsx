import { useState } from 'react'
import { ChevronDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { listOrdersForExport } from '@/features/orders/services/orders.service'
import type { OrderListFilters } from '@/features/orders/types'
import { getErrorMessage } from '@/lib/utils'

import { exportProductionToExcel } from './export-production'

interface ExportButtonProps {
  filters: OrderListFilters
  selectedIds: string[]
  className?: string
}

export function ExportButton({ filters, selectedIds, className }: ExportButtonProps) {
  const [busy, setBusy] = useState(false)
  const hasFilter = Boolean(filters.search || filters.status)

  const run = async (mode: 'all' | 'filtered' | 'selected') => {
    setBusy(true)
    try {
      const orders = await listOrdersForExport(
        mode === 'selected'
          ? { ids: selectedIds }
          : { filters: mode === 'all' ? { search: '', status: '', sort: 'oldest' } : filters },
      )
      if (orders.length === 0) {
        toast.info('Tidak ada pesanan untuk diekspor.')
        return
      }
      const result = await exportProductionToExcel(orders)
      toast.success(`Berhasil mengekspor ${result.totalShirts} kaos dari ${result.totalOrders} pesanan.`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal mengekspor data.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy} className={className}>
          {busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
          Ekspor Excel
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Detail produksi untuk konveksi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run('all')}>Semua pesanan</DropdownMenuItem>
        <DropdownMenuItem disabled={!hasFilter} onSelect={() => run('filtered')}>
          Sesuai filter saat ini
        </DropdownMenuItem>
        <DropdownMenuItem disabled={selectedIds.length === 0} onSelect={() => run('selected')}>
          Pesanan terpilih ({selectedIds.length})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
