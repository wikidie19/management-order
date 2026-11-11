import { clsx, type ClassValue } from 'clsx'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
})

/** Formats a number as `Rp60.000`. */
export function formatRupiah(value: number | null | undefined) {
  const amount = Number(value ?? 0)
  const sign = amount < 0 ? '-' : ''
  return `${sign}Rp${rupiahFormatter.format(Math.abs(amount))}`
}

export function formatDate(value: string | Date, pattern = 'd MMM yyyy') {
  return format(typeof value === 'string' ? parseISO(value) : value, pattern, { locale: localeId })
}

export function formatDateTime(value: string | Date) {
  return formatDate(value, 'd MMM yyyy, HH.mm')
}

/** Parses free-form amount input such as "Rp50.000" or "50000" into an integer. */
export function parseAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 0
  const digits = String(value).replace(/[^\d]/g, '')
  return Number(digits) || 0
}

export function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}
