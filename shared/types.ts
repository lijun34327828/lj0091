export interface Order {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string
  status: 'pending' | 'partial_picked' | 'completed' | 'locked'
  total_amount: number
  total_service_fee: number
  locked: number
  locked_reason: string | null
  created_at: string
  updated_at: string
}

export interface OrderBatch {
  id: string
  order_id: string
  batch_no: number
  arrived_at: string
  prepared_at: string | null
  picked_at: string | null
  status: 'arrived' | 'prepared' | 'picked'
}

export interface OrderBatchItem {
  id: string
  batch_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface PricingTier {
  id: string
  max_hours: number
  rate_per_hour: number
  label: string
  sort_order: number
}

export interface OverdueCalculation {
  batchId: string
  batchNo: number
  arrivedAt: string
  overdueHours: number
  tier1Hours: number
  tier2Hours: number
  tier3Hours: number
  tier1Fee: number
  tier2Fee: number
  tier3Fee: number
  totalFee: number
}

export interface Transaction {
  id: string
  order_id: string
  batch_id: string | null
  type: 'pickup' | 'overdue_fee' | 'service_fee'
  amount: number
  description: string
  created_at: string
}

export interface PickupRecord {
  id: string
  order_id: string
  batch_id: string
  picked_at: string
  goods_amount: number
  overdue_fee: number
  total_amount: number
}

export interface OrderDetail {
  order: Order
  batches: (OrderBatch & { items: OrderBatchItem[] })[]
  overdueCalculations: OverdueCalculation[]
  totalServiceFee: number
}

export interface CreateOrderRequest {
  customerName: string
  customerPhone: string
  batches: {
    items: {
      productName: string
      quantity: number
      unitPrice: number
    }[]
  }[]
}

export interface SimulateRequest {
  arrivedAt: string
  hours: number
  itemCount: number
  pricePerItem: number
}

export interface SimulateResult {
  scenario: string
  batches: OverdueCalculation[]
  totalServiceFee: number
  totalGoodsAmount: number
  grandTotal: number
}
