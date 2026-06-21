import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, AlertTriangle, Bell } from 'lucide-react';
import { useOrderStore } from '@/stores/orderStore';
import Layout from '@/components/Layout';
import ConfirmModal from '@/components/ConfirmModal';
import StatusBadge from '@/components/StatusBadge';

interface ResolveAction {
  orderId: string;
  action: 'unlock' | 'force_settle' | 'notify';
}

export default function AdminLocked() {
  const { lockedOrders, loading, fetchLockedOrders, resolveLockedOrder } =
    useOrderStore();
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState<ResolveAction | null>(
    null
  );

  useEffect(() => {
    fetchLockedOrders();
  }, [fetchLockedOrders]);

  const getDaysSinceArrival = (dateStr: string) => {
    return ((Date.now() - new Date(dateStr).getTime()) / 86400000).toFixed(1);
  };

  const actionLabels: Record<string, { label: string; message: string; variant: 'primary' | 'danger' }> = {
    unlock: {
      label: '解锁订单',
      message: '确认解锁该订单？解锁后客户可以继续取货操作。',
      variant: 'primary',
    },
    force_settle: {
      label: '强制结算',
      message: '确认强制结算该订单？此操作不可撤销，将按当前逾期费率结算。',
      variant: 'danger',
    },
    notify: {
      label: '通知客户',
      message: '确认向客户发送取货提醒通知？',
      variant: 'primary',
    },
  };

  const handleResolve = async () => {
    if (!confirmAction) return;
    await resolveLockedOrder(confirmAction.orderId, confirmAction.action);
    setConfirmAction(null);
    fetchLockedOrders();
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">锁定订单</h1>
        <p className="text-sm text-slate-500">管理因逾期未取货而被锁定的订单</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-slate-200"
            />
          ))}
        </div>
      ) : lockedOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          暂无锁定订单
        </div>
      ) : (
        <div className="space-y-4">
          {lockedOrders.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-lg border-2 border-red-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-5 py-3">
                <Lock className="h-5 w-5 text-red-500" />
                <span className="font-mono text-sm font-semibold text-slate-800">
                  {order.order_no}
                </span>
                <StatusBadge status={order.status} />
                <div className="ml-auto flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-mono text-lg font-bold">
                    {getDaysSinceArrival(order.created_at)}
                  </span>
                  <span className="text-xs">天</span>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    {order.customer_name} · {order.customer_phone}
                  </div>
                  <span className="font-mono text-base font-semibold text-slate-800">
                    ¥{order.total_amount.toFixed(2)}
                  </span>
                </div>

                {order.locked_reason && (
                  <p className="mb-3 text-xs text-red-500">
                    锁定原因：{order.locked_reason}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setConfirmAction({
                        orderId: order.id,
                        action: 'unlock',
                      })
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-primary-800"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    解锁订单
                  </button>
                  <button
                    onClick={() =>
                      setConfirmAction({
                        orderId: order.id,
                        action: 'force_settle',
                      })
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    强制结算
                  </button>
                  <button
                    onClick={() =>
                      setConfirmAction({
                        orderId: order.id,
                        action: 'notify',
                      })
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    通知客户
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmAction !== null}
        title={confirmAction ? actionLabels[confirmAction.action].label : ''}
        message={confirmAction ? actionLabels[confirmAction.action].message : ''}
        confirmLabel="确认"
        variant={confirmAction?.action === 'force_settle' ? 'danger' : 'primary'}
        onConfirm={handleResolve}
        onCancel={() => setConfirmAction(null)}
      />
    </Layout>
  );
}
