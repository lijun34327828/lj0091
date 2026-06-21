import { create } from 'zustand';
import { api } from '@/utils/api';
import type {
  Order,
  OrderDetail,
  Transaction,
  PricingTier,
  SimulateRequest,
  SimulateResult,
  CreateOrderRequest,
} from '../../shared/types';

interface OrderFilters {
  search?: string;
  status?: string;
}

interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  orderId?: string;
}

interface OrderState {
  orders: Order[];
  orderDetail: OrderDetail | null;
  transactions: Transaction[];
  lockedOrders: Order[];
  pricingTiers: PricingTier[];
  simulateResult: SimulateResult | null;
  loading: boolean;
  error: string | null;

  fetchOrders: (filters?: OrderFilters) => Promise<void>;
  fetchOrderDetail: (id: string) => Promise<void>;
  createOrder: (data: CreateOrderRequest) => Promise<Order>;
  lockOrder: (id: string, locked: boolean, reason?: string) => Promise<void>;
  markPrepared: (batchId: string) => Promise<void>;
  pickupBatch: (batchId: string) => Promise<void>;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  fetchLockedOrders: () => Promise<void>;
  resolveLockedOrder: (id: string, action: string) => Promise<void>;
  fetchPricingTiers: () => Promise<void>;
  updatePricingTiers: (tiers: PricingTier[]) => Promise<void>;
  simulateOverdue: (data: SimulateRequest) => Promise<void>;
  clearError: () => void;
  clearOrderDetail: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  orderDetail: null,
  transactions: [],
  lockedOrders: [],
  pricingTiers: [],
  simulateResult: null,
  loading: false,
  error: null,

  fetchOrders: async (filters) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters?.search) {
        params.set('orderNo', filters.search);
        params.set('phone', filters.search);
      }
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      const orders = await api<Order[]>(`/orders${qs ? `?${qs}` : ''}`);
      set({ orders, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchOrderDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const orderDetail = await api<OrderDetail>(`/orders/${id}`);
      set({ orderDetail, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createOrder: async (data) => {
    set({ loading: true, error: null });
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set({ loading: false });
      return order;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  lockOrder: async (id, locked, reason) => {
    set({ loading: true, error: null });
    try {
      await api(`/orders/${id}/lock`, {
        method: 'PATCH',
        body: JSON.stringify({ locked, reason }),
      });
      set({ loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  markPrepared: async (batchId) => {
    set({ loading: true, error: null });
    try {
      await api(`/batches/${batchId}/prepare`, { method: 'POST' });
      set({ loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  pickupBatch: async (batchId) => {
    set({ loading: true, error: null });
    try {
      await api(`/batches/${batchId}/pickup`, { method: 'POST' });
      set({ loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchTransactions: async (filters) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      if (filters?.type) params.set('type', filters.type);
      if (filters?.orderId) params.set('orderId', filters.orderId);
      const qs = params.toString();
      const transactions = await api<Transaction[]>(
        `/transactions${qs ? `?${qs}` : ''}`
      );
      set({ transactions, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchLockedOrders: async () => {
    set({ loading: true, error: null });
    try {
      const lockedOrders = await api<Order[]>('/admin/locked-orders');
      set({ lockedOrders, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  resolveLockedOrder: async (id, action) => {
    set({ loading: true, error: null });
    try {
      await api(`/admin/locked-orders/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      set({ loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchPricingTiers: async () => {
    set({ loading: true, error: null });
    try {
      const pricingTiers = await api<PricingTier[]>('/admin/pricing');
      set({ pricingTiers, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  updatePricingTiers: async (tiers) => {
    set({ loading: true, error: null });
    try {
      const updated = await api<PricingTier[]>('/admin/pricing', {
        method: 'PUT',
        body: JSON.stringify({ tiers }),
      });
      set({ pricingTiers: updated, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  simulateOverdue: async (data) => {
    set({ loading: true, error: null });
    try {
      const simulateResult = await api<SimulateResult>('/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set({ simulateResult, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
  clearOrderDetail: () => set({ orderDetail: null }),
}));
