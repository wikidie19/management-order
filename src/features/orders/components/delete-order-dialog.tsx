import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/utils'

import { useDeleteOrder } from '../hooks/use-orders'
import type { Order } from '../types'

interface DeleteOrderDialogProps {
  order: Pick<Order, 'id' | 'order_number' | 'family_name'> | null
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteOrderDialog({ order, onOpenChange, onDeleted }: DeleteOrderDialogProps) {
  const deleteOrder = useDeleteOrder()

  const handleDelete = async () => {
    if (!order) return
    try {
      await deleteOrder.mutateAsync(order.id)
      toast.success(`Pesanan ${order.order_number} telah dihapus.`)
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal menghapus pesanan.'))
    }
  }

  return (
    <AlertDialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus pesanan?</AlertDialogTitle>
          <AlertDialogDescription>
            Pesanan <strong>{order?.order_number}</strong> atas nama <strong>{order?.family_name}</strong> beserta
            seluruh detail kaos dan riwayat pembayarannya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteOrder.isPending}>Batal</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteOrder.isPending}>
            {deleteOrder.isPending && <Loader2 className="animate-spin" />}
            Ya, hapus
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
