import { useState } from 'react'
import { Check, ChevronDown, ImageOff, Ruler } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { WEARER_TYPES } from '@/features/orders/constants'
import { cn } from '@/lib/utils'

import { DESIGN_NOTES, DESIGN_VIEWS, SIZE_CHARTS, SIZE_TOLERANCE, type DesignView } from '../constants'

function DesignImage({ view, className }: { view: DesignView; className?: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/50 p-2 text-center text-muted-foreground',
          className,
        )}
      >
        <ImageOff className="size-6" />
        <span className="text-xs">Gambar belum tersedia</span>
      </div>
    )
  }

  return (
    <img
      src={view.src}
      alt={`Desain kaos tampak ${view.label.toLowerCase()}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('rounded-lg bg-muted object-contain', className)}
    />
  )
}

export function DesignShowcase() {
  const [selected, setSelected] = useState<DesignView | null>(null)
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Desain Kaos</CardTitle>
        <CardDescription>Ketuk gambar untuk memperbesar.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className={cn('grid items-center gap-4', DESIGN_VIEWS.length === 1 && 'sm:grid-cols-[240px_1fr]')}>
          <div
            className={cn(
              'mx-auto grid w-full gap-2 sm:gap-4',
              DESIGN_VIEWS.length === 1 ? 'max-w-60' : 'max-w-2xl grid-cols-3',
            )}
          >
            {DESIGN_VIEWS.map((view) => (
              <button
                key={view.key}
                type="button"
                onClick={() => setSelected(view)}
                className="grid gap-1.5 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <DesignImage view={view} className="aspect-[7/8] w-full transition-opacity hover:opacity-90" />
                <span className="text-center text-xs font-medium sm:text-sm">{view.label}</span>
              </button>
            ))}
          </div>
          <ul className="grid gap-2 text-sm">
            {DESIGN_NOTES.map((note) => (
              <li key={note} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <details className="group rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <Ruler className="size-4 text-primary" />
            Tabel ukuran
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 border-t p-4 md:grid-cols-2">
            {WEARER_TYPES.map((type) => (
              <section key={type} className="overflow-hidden rounded-lg border">
                <h3 className="border-b bg-muted/50 px-4 py-2 text-sm font-semibold">{type}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Ukuran</TableHead>
                      <TableHead className="text-center">Lebar dada (cm)</TableHead>
                      <TableHead className="pr-4 text-center">Panjang badan (cm)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SIZE_CHARTS[type].map((row) => (
                      <TableRow key={row.size}>
                        <TableCell className="pl-4 font-semibold">{row.size}</TableCell>
                        <TableCell className="text-center">{row.width}</TableCell>
                        <TableCell className="pr-4 text-center">{row.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            ))}
            <p className="text-xs text-muted-foreground md:col-span-2">{SIZE_TOLERANCE}</p>
          </div>
        </details>
      </CardContent>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Desain Kaos · {selected?.label}</DialogTitle>
          </DialogHeader>
          {selected && <DesignImage key={selected.key} view={selected} className="max-h-[75dvh] min-h-48 w-full" />}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
