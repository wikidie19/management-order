import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/utils'

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <div className="mb-1 rounded-full bg-accent p-3 text-primary">
        <Inbox className="size-6" />
      </div>
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center" role="alert">
      <div className="mb-1 rounded-full bg-red-50 p-3 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <p className="font-semibold">Gagal memuat data</p>
      <p className="max-w-sm text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}
