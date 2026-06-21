import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { useOrderStore } from '@/stores/orderStore';
import Layout from '@/components/Layout';
import OrderCard from '@/components/OrderCard';

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待取货' },
  { value: 'partial_picked', label: '部分取货' },
  { value: 'completed', label: '已完成' },
  { value: 'locked', label: '已锁定' },
];

export default function SorterOrders() {
  const { orders, loading, fetchOrders } = useOrderStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchOrders({ search: undefined, status: undefined });
  }, [fetchOrders]);

  const handleSearch = () => {
    fetchOrders({
      search: search || undefined,
      status: status || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">分拣订单</h1>
        <p className="text-sm text-slate-500">管理门店批量订单的分拣与备货</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索订单号、客户姓名或手机号"
            className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-transparent text-sm text-slate-700 outline-none"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSearch}
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-800"
        >
          搜索
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg bg-slate-200"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          暂无订单
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} basePath="/sorter/order" />
          ))}
        </div>
      )}
    </Layout>
  );
}
