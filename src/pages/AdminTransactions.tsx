import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { useOrderStore } from '@/stores/orderStore';
import Layout from '@/components/Layout';

const typeOptions = [
  { value: '', label: '全部类型' },
  { value: 'pickup', label: '取货' },
  { value: 'overdue_fee', label: '逾期费' },
  { value: 'service_fee', label: '服务费' },
];

const typeLabels: Record<string, string> = {
  pickup: '取货',
  overdue_fee: '逾期费',
  service_fee: '服务费',
};

const typeColors: Record<string, string> = {
  pickup: 'text-green-600',
  overdue_fee: 'text-amber-600',
  service_fee: 'text-blue-600',
};

export default function AdminTransactions() {
  const { transactions, loading, fetchTransactions } = useOrderStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearch = () => {
    fetchTransactions({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      type: type || undefined,
      orderId: orderId || undefined,
    });
  };

  const formatTime = (t: string) => {
    const d = new Date(t);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">交易记录</h1>
        <p className="text-sm text-slate-500">查看所有交易流水明细</p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">类型</label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-transparent text-sm text-slate-700 outline-none"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">订单ID</label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="输入订单ID"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-primary-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-800"
        >
          <Search className="h-4 w-4" />
          搜索
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded bg-slate-200"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          暂无交易记录
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-left font-medium">交易ID</th>
                <th className="px-4 py-3 text-left font-medium">订单号</th>
                <th className="px-4 py-3 text-left font-medium">批次号</th>
                <th className="px-4 py-3 text-left font-medium">类型</th>
                <th className="px-4 py-3 text-right font-medium">金额</th>
                <th className="px-4 py-3 text-left font-medium">描述</th>
                <th className="px-4 py-3 text-left font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr
                  key={tx.id}
                  className={`border-b border-slate-100 ${
                    idx % 2 === 1 ? 'bg-slate-50/50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {tx.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {tx.order_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {tx.batch_id ? tx.batch_id.slice(0, 8) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${typeColors[tx.type] || 'text-slate-600'}`}
                    >
                      {typeLabels[tx.type] || tx.type}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-medium ${typeColors[tx.type] || 'text-slate-800'}`}
                  >
                    ¥{tx.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {tx.description}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatTime(tx.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
