import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Package,
  CheckCircle,
  CircleCheck,
  ShoppingBag,
} from 'lucide-react';
import { useOrderStore } from '@/stores/orderStore';
import StatusBadge from '@/components/StatusBadge';
import OverduePanel from '@/components/OverduePanel';
import ConfirmModal from '@/components/ConfirmModal';

export default function PickupOrder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    orderDetail,
    pricingTiers,
    loading,
    error,
    fetchOrderDetail,
    fetchPricingTiers,
    pickupBatch,
    clearOrderDetail,
  } = useOrderStore();

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [pickupConfirm, setPickupConfirm] = useState<string | null>(null);
  const [pickupSlide, setPickupSlide] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrderDetail(id);
      fetchPricingTiers();
    }
    return () => clearOrderDetail();
  }, [id, fetchOrderDetail, fetchPricingTiers, clearOrderDetail]);

  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  const handlePickup = async (batchId: string) => {
    await pickupBatch(batchId);
    setPickupConfirm(null);
    setPickupSlide(null);
    if (id) fetchOrderDetail(id);
  };

  const formatTime = (t: string) => {
    const d = new Date(t);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'arrived':
        return <Package className="h-5 w-5 text-slate-400" />;
      case 'prepared':
        return <CheckCircle className="h-5 w-5 text-primary-600" />;
      case 'picked':
        return <CircleCheck className="h-5 w-5 text-green-500" />;
      default:
        return <Package className="h-5 w-5 text-slate-400" />;
    }
  };

  if (loading && !orderDetail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-700 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm text-white hover:bg-primary-800"
        >
          返回首页
        </button>
      </div>
    );
  }

  if (!orderDetail) return null;

  const { order, batches, overdueCalculations, totalServiceFee } = orderDetail;
  const totalGoods = batches.reduce(
    (s, b) => s + b.items.reduce((is, i) => is + i.subtotal, 0),
    0
  );
  const grandTotal = totalGoods + totalServiceFee;

  const getOverdueCalc = (batchId: string) =>
    overdueCalculations.find((c) => c.batchId === batchId);

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              {order.order_no}
            </h1>
            <p className="text-sm text-slate-500">
              {order.customer_name} · {order.customer_phone}
            </p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        {batches.map((batch) => {
          const expanded = expandedBatches.has(batch.id);
          const calc = getOverdueCalc(batch.id);

          return (
            <div
              key={batch.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <button
                onClick={() => toggleBatch(batch.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
              >
                {statusIcon(batch.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      第 {batch.batch_no} 批
                    </span>
                    <StatusBadge status={batch.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    到店：{formatTime(batch.arrived_at)}
                  </div>
                </div>
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {expanded && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500">
                        <th className="pb-2 text-left font-medium">商品</th>
                        <th className="pb-2 text-right font-medium">数量</th>
                        <th className="pb-2 text-right font-medium">单价</th>
                        <th className="pb-2 text-right font-medium">小计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-slate-50"
                        >
                          <td className="py-2 text-slate-700">
                            {item.product_name}
                          </td>
                          <td className="py-2 text-right font-mono text-slate-600">
                            {item.quantity}
                          </td>
                          <td className="py-2 text-right font-mono text-slate-600">
                            ¥{item.unit_price.toFixed(2)}
                          </td>
                          <td className="py-2 text-right font-mono font-medium text-slate-800">
                            ¥{item.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {calc && calc.overdueHours > 0 && (
                    <div className="mt-3">
                      <OverduePanel
                        calculation={calc}
                        tiers={pricingTiers}
                      />
                    </div>
                  )}

                  {batch.status === 'prepared' && (
                    <button
                      onClick={() => setPickupConfirm(batch.id)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-800"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      取货
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-4 py-4 shadow-lg">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>商品合计</span>
              <span className="font-mono">¥{totalGoods.toFixed(2)}</span>
            </div>
            {totalServiceFee > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>逾期服务费</span>
                <span className="font-mono">¥{totalServiceFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-800">
              <span>合计</span>
              <span className="font-mono">¥{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={pickupConfirm !== null}
        title="确认取货"
        message="请确认您已收到该批次的所有商品，取货后将生成取货记录。"
        confirmLabel="确认取货"
        onConfirm={() => pickupConfirm && handlePickup(pickupConfirm)}
        onCancel={() => setPickupConfirm(null)}
      />
    </div>
  );
}
