import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function SummaryRow({
  label,
  value,
  emphasis = false,
  className,
}: {
  label: ReactNode
  value: ReactNode
  emphasis?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 py-1.5 text-sm',
        emphasis && 'mt-2 border-t pt-3 text-base font-bold text-accent-foreground',
        className,
      )}
    >
      <span className={cn(!emphasis && 'text-muted-foreground')}>{label}</span>
      <span className={cn('text-right', !emphasis && 'font-semibold')}>{value}</span>
    </div>
  )
}
