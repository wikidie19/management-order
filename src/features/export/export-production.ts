import { CATEGORIES, SIZES, SLEEVE_TYPES, WEARER_TYPES } from '@/features/orders/constants'
import type { OrderWithItems } from '@/features/orders/types'
import { formatDateTime } from '@/lib/utils'

export const PRODUCTION_FILE_NAME = 'detail-produksi-kaos-RT02.xlsx'

type Cell = string | number | null

function countBy<T extends string>(values: T[], keys: readonly T[]) {
  const counts = new Map<T, number>(keys.map((k) => [k, 0]))
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return counts
}

export function buildProductionSheets(orders: OrderWithItems[]) {
  const items = orders.flatMap((order) =>
    [...order.order_items]
      .sort((a, b) => a.item_no - b.item_no)
      .map((item) => ({ order, item })),
  )

  const detailRows: Cell[][] = [
    ['No', 'Nomor Pesanan', 'Nama KK', 'Nama Pemakai', 'Tipe Pemakai', 'Kategori', 'Ukuran', 'Jenis Lengan', 'Harga'],
    ...items.map(({ order, item }, index) => [
      index + 1,
      order.order_number,
      order.family_name,
      item.wearer_name,
      item.wearer_type,
      item.category,
      item.size,
      item.sleeve_type,
      item.unit_price,
    ]),
  ]

  const all = items.map(({ item }) => item)
  const bySize = countBy(all.map((i) => i.size), SIZES)
  const bySleeve = countBy(all.map((i) => i.sleeve_type), SLEEVE_TYPES)
  const byCategory = countBy(all.map((i) => i.category), CATEGORIES)
  const byWearer = countBy(all.map((i) => i.wearer_type), WEARER_TYPES)

  const summaryRows: Cell[][] = [
    ['Ringkasan Produksi Kaos RT 02 – ERTE DUA, GUYUP RUKUN'],
    [`Dibuat: ${formatDateTime(new Date())}`],
    [],
    ['Total pesanan', orders.length],
    ['Total kaos', all.length],
    [],
    ['Jumlah per Ukuran'],
    ['Ukuran', 'Jumlah'],
    ...SIZES.map((s) => [s, bySize.get(s) ?? 0]),
    [],
    ['Jumlah per Jenis Lengan'],
    ['Jenis Lengan', 'Jumlah'],
    ...SLEEVE_TYPES.map((s) => [s, bySleeve.get(s) ?? 0]),
    [],
    ['Jumlah per Kategori Pemakai'],
    ['Kategori', 'Jumlah'],
    ...CATEGORIES.map((c) => [c, byCategory.get(c) ?? 0]),
    [],
    ['Jumlah per Tipe Pemakai'],
    ['Tipe Pemakai', 'Jumlah'],
    ...WEARER_TYPES.map((w) => [w, byWearer.get(w) ?? 0]),
    [],
    ['Jumlah per Ukuran dan Jenis Lengan'],
    ['Ukuran', ...SLEEVE_TYPES, 'Total'],
    ...SIZES.map((size) => {
      const counts = SLEEVE_TYPES.map(
        (sleeve) => all.filter((i) => i.size === size && i.sleeve_type === sleeve).length,
      )
      return [size, ...counts, counts.reduce((a, b) => a + b, 0)]
    }),
    ['Total', ...SLEEVE_TYPES.map((s) => bySleeve.get(s) ?? 0), all.length],
  ]

  return { detailRows, summaryRows, totalShirts: all.length }
}

export async function exportProductionToExcel(orders: OrderWithItems[]) {
  const XLSX = await import('xlsx')
  const { detailRows, summaryRows, totalShirts } = buildProductionSheets(orders)

  const detailSheet = XLSX.utils.aoa_to_sheet(detailRows)
  detailSheet['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 26 },
    { wch: 26 },
    { wch: 13 },
    { wch: 22 },
    { wch: 8 },
    { wch: 20 },
    { wch: 12 },
  ]
  detailSheet['!autofilter'] = { ref: `A1:I${Math.max(detailRows.length, 1)}` }
  for (let r = 2; r <= detailRows.length; r++) {
    const cell = detailSheet[`I${r}`]
    if (cell) cell.z = '"Rp"#,##0'
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 10 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Produksi')
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Produksi')
  XLSX.writeFile(workbook, PRODUCTION_FILE_NAME, { compression: true })

  return { totalShirts, totalOrders: orders.length }
}
