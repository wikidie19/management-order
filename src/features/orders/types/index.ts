import type {
  CATEGORIES,
  PAYMENT_CHANNELS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SIZES,
  SLEEVE_TYPES,
  WEARER_TYPES,
} from '../constants'

export type Size = (typeof SIZES)[number]
export type SleeveType = (typeof SLEEVE_TYPES)[number]
export type Category = (typeof CATEGORIES)[number]
export type WearerType = (typeof WEARER_TYPES)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number]

export interface Order {
  id: string
  order_number: string
  family_name: string
  family_key: string
  whatsapp_number: string
  total_quantity: number
  subtotal: number
  subsidy_amount: number
  total_amount: number
  total_paid: number
  remaining_balance: number
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  item_no: number
  wearer_name: string
  wearer_type: WearerType
  category: Category
  size: Size
  sleeve_type: SleeveType
  unit_price: number
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  payment_date: string
  payment_method: PaymentChannel
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

export interface OrderDetail extends OrderWithItems {
  payments: Payment[]
}

export interface PublicOrder {
  order_number: string
  family_name: string
  total_quantity: number
  size_summary: string | null
  created_at: string
  payment_status: PaymentStatus
  total_count: number
}

export type PublicOrderItem = Pick<OrderItem, 'item_no' | 'wearer_name' | 'wearer_type' | 'category' | 'size' | 'sleeve_type'>

export interface PublicOrderDetail
  extends Pick<PublicOrder, 'order_number' | 'family_name' | 'total_quantity' | 'created_at' | 'payment_status'> {
  items: PublicOrderItem[]
}

export interface PricingConfig {
  id: string
  size_group: string
  sizes: Size[]
  sleeve_type: SleeveType
  adult_price: number
  child_discount: number
  is_active: boolean
}

export interface OrderConfig {
  maxShirts: number
  familySubsidy: number
  pricing: PricingConfig[]
}

export type SortOrder = 'newest' | 'oldest'

export interface OrderListFilters {
  search: string
  status: PaymentStatus | ''
  sort: SortOrder
  page: number
}

export interface SaveOrderPayload {
  family_name: string
  whatsapp_number: string
  notes: string | null
  payment_method: PaymentMethod
  payment_amount: number
  payment_channel: PaymentChannel
  items: {
    id: string | null
    wearer_name: string
    wearer_type: WearerType
    category: Category
    size: Size
    sleeve_type: SleeveType
  }[]
}

export type SaveOrderResult = Order & { last_payment_amount: number }
