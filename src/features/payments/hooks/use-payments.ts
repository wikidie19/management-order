import { useMutation, useQueryClient } from '@tanstack/react-query'

import { orderKeys } from '@/features/orders/hooks/use-orders'

import { addPayment, deletePayment } from '../services/payments.service'

export function useAddPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addPayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  })
}
