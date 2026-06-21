import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Lock,
  Receipt,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { useOrderStore } from '@/stores/orderStore';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/utils/api';

interface DashboardStats {
  totalOrders: number;
  lockedOrders: number;
  todayTransactions: number;
  totalServiceFees: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { lockedOrders, fetchLockedOrders } = useOrderStore();

  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    lockedOrders: 0,
    todayTransactions: 0,
    totalServiceFees: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLockedOrders();
    api<DashboardStats>('/dashboard/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchLockedOrders]);

  const cards = [
    {
      label: '总订单数',
      value: stats.totalOrders,
      icon: Package,
      color: 'text-primary-700 bg-primary-50',
    },
    {
      label: '锁定订单',
      value: stats.lockedOrders,
      icon: Lock,
      color: 'text-red-600 bg-red-50',
    },
    {
      label: '今日交易',
      value: stats.todayTransactions,
      icon: Receipt,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: '服务费合计',
      value: `¥${stats.totalServiceFees.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  const quickLinks = [
    { to: '/admin/transactions', label: '交易记录', icon: Receipt },
    { to: '/admin/locked', label: '锁定订单', icon: Lock },
    { to: '/admin/pricing', label: '费率配置', icon: DollarSign },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">管理仪表盘</h1>
        <p className="text-sm text-slate-500">门店批量订单结算系统概览</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg bg-slate-200"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{card.label}</span>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-slate-800">
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-base font-semibold text-slate-700">
            快捷入口
          </h2>
          <div className="space-y-2">
            {quickLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <link.icon className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">
                    {link.label}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-base font-semibold text-slate-700">
            最近锁定订单
          </h2>
          {lockedOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
              暂无锁定订单
            </div>
          ) : (
            <div className="space-y-2">
              {lockedOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate('/admin/locked')}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100"
                >
                  <div>
                    <span className="font-mono text-sm font-medium text-slate-800">
                      {order.order_no}
                    </span>
                    <p className="text-xs text-slate-500">
                      {order.customer_name} · {order.customer_phone}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
