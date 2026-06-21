import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import type { Order } from '../../shared/types';

interface OrderCardProps {
  order: Order;
  basePath?: string;
}

export default function OrderCard({ order, basePath = '/order' }: OrderCardProps) {
  const navigate = useNavigate();

  const statusColorMap: Record<string, string> = {
    pending: 'bg-amber-400',
    partial_picked: 'bg-blue-400',
    completed: 'bg-green-400',
    locked: 'bg-red-400',
  };

  return (
    <div
      onClick={() => navigate(`${basePath}/${order.id}`)}
      className="card-hover flex cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className={`w-1.5 shrink-0 ${statusColorMap[order.status] || 'bg-slate-300'}`} />

      <div className="flex-1 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-sm font-semibold text-slate-800">
            {order.order_no}
          </span>
          <StatusBadge status={order.status} />
        </div>

        <div className="mb-1 text-sm text-slate-600">
          {order.customer_name} · {order.customer_phone}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>¥{order.total_amount.toFixed(2)}</span>
          {order.locked === 1 && (
            <span className="flex items-center gap-1 text-red-500">
              <Clock className="h-3 w-3" />
              已锁定
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
