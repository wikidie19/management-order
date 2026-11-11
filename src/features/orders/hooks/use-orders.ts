import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteOrder,
  getOrderConfig,
  getOrderDetail,
  getOrderSummary,
  getPublicOrder,
  listAdminOrders,
  listPublicOrders,
  previewFamilySubsidy,
  saveOrder,
} from '../services/orders.service'
import type { OrderListFilters, SaveOrderPayload } from '../types'

export const orderKeys = {
  all: ['orders'] as const,
  public: (filters: OrderListFilters) => ['orders', 'public', filters] as const,
  admin: (filters: OrderListFilters) => ['orders', 'admin', filters] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  summary: ['orders', 'summary'] as const,
  publicDetail: (orderNumber: string) => ['orders', 'public-detail', orderNumber] as const,
  config: ['order-config'] as const,
  subsidy: (family: string, orderId?: string) => ['order-subsidy', family, orderId ?? null] as const,
}

export function usePublicOrders(filters: OrderListFilters) {
  return useQuery({
    queryKey: orderKeys.public(filters),
    queryFn: () => listPublicOrders(filters),
    placeholderData: keepPreviousData,
  })
}

export function usePublicOrderDetail(orderNumber: string | null) {
  return useQuery({
    queryKey: orderKeys.publicDetail(orderNumber ?? ''),
    queryFn: () => getPublicOrder(orderNumber!),
    enabled: Boolean(orderNumber),
  })
}

export function useAdminOrders(filters: OrderListFilters) {
  return useQuery({
    queryKey: orderKeys.admin(filters),
    queryFn: () => listAdminOrders(filters),
    placeholderData: keepPreviousData,
  })
}

export function useOrderSummary() {
  return useQuery({
    queryKey: orderKeys.summary,
    queryFn: getOrderSummary,
  })
}

export function useOrderDetail(id: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: () => getOrderDetail(id!),
    enabled: Boolean(id),
  })
}

export function useOrderConfig() {
  return useQuery({
    queryKey: orderKeys.config,
    queryFn: getOrderConfig,
    staleTime: 5 * 60 * 1000,
  })
}

export function useFamilySubsidy(familyName: string, orderId: string | undefined, enabled: boolean) {
  const family = familyName.trim()
  return useQuery({
    queryKey: orderKeys.subsidy(family.toLowerCase(), orderId),
    queryFn: () => previewFamilySubsidy(family, orderId),
    enabled: enabled && family.length > 0,
    staleTime: 0,
  })
}

export function useSaveOrder(orderId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveOrderPayload) => saveOrder(payload, orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  })
}
