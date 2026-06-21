import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Clock } from 'lucide-react';
import { useOrderStore } from '@/stores/orderStore';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/utils/api';
import type { Order } from '../../shared/types';

export default function PickupHome() {
  const [searchValue, setSearchValue] = useState('');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const { fetchOrders, orders, loading, error } = useOrderStore();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (orders.length > 0) {
      setRecentOrders(orders.slice(0, 10));
    }
  }, [orders]);

  const handleSearch = async () => {
    const q = searchValue.trim();
    if (!q) return;
    setSearching(true);
    try {
      const params = new URLSearchParams();
      params.set('orderNo', q);
      params.set('phone', q);
      const results = await api<Order[]>(
        `/orders?${params.toString()}`
      );
      if (results.length > 0) {
        navigate(`/order/${results[0].id}`);
      } else {
        setRecentOrders([]);
      }
    } catch {
      setRecentOrders([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatTime = (t: string) => {
    const d = new Date(t);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 px-6 pb-20 pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Package className="h-8 w-8 text-primary-200" />
            <h1 className="text-2xl font-bold text-white">门店批量订单取货</h1>
          </div>
          <p className="text-primary-200">输入手机号或订单号查询订单</p>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-2xl px-6">
        <div className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-lg">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-slate-50 px-4 py-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入手机号或订单号"
              className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="rounded-lg bg-primary-700 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary-800 disabled:opacity-50"
          >
            {searching ? '搜索中...' : '查询'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-700">
          <Clock className="h-4 w-4" />
          近期订单
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-slate-200"
              />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
            暂无订单记录
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/order/${order.id}`)}
                className="card-hover flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-800">
                      {order.order_no}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="text-xs text-slate-500">
                    {order.customer_name} · {order.customer_phone}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {formatTime(order.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-semibold text-slate-800">
                    ¥{order.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
