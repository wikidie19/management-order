import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

/** shadcn/ui native select: uses the OS picker, which works best on mobile. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className={cn('relative w-full', className)} data-slot="native-select-wrapper">
      <select
        data-slot="native-select"
        className={cn(
          'flex h-11 w-full appearance-none rounded-md border border-input bg-card py-2 pr-9 pl-3 text-base shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:h-10 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export { NativeSelect }
