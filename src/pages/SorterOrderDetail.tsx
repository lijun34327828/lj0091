import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  CircleCheck,
  Clock,
  Timer,
} from 'lucide-react';
import { useOrderStore } from '@/stores/orderStore';
import StatusBadge from '@/components/StatusBadge';
import OverduePanel from '@/components/OverduePanel';
import Layout from '@/components/Layout';
import ConfirmModal from '@/components/ConfirmModal';
import { useState } from 'react';

export default function SorterOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    orderDetail,
    pricingTiers,
    loading,
    error,
    fetchOrderDetail,
    fetchPricingTiers,
    markPrepared,
    clearOrderDetail,
  } = useOrderStore();

  const [prepareConfirm, setPrepareConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrderDetail(id);
      fetchPricingTiers();
    }
    return () => clearOrderDetail();
  }, [id, fetchOrderDetail, fetchPricingTiers, clearOrderDetail]);

  const handleMarkPrepared = async (batchId: string) => {
    await markPrepared(batchId);
    setPrepareConfirm(null);
    if (id) fetchOrderDetail(id);
  };

  const formatTime = (t: string) => {
    const d = new Date(t);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getOverdueHours = (arrivedAt: string) => {
    const hours = (Date.now() - new Date(arrivedAt).getTime()) / 3600000;
    return Math.max(0, hours);
  };

  const statusIcon = (status: string, size = 'h-6 w-6') => {
    switch (status) {
      case 'arrived':
        return <Package className={`${size} text-slate-400`} />;
      case 'prepared':
        return <CheckCircle className={`${size} text-primary-600`} />;
      case 'picked':
        return <CircleCheck className={`${size} text-green-500`} />;
      default:
        return <Package className={`${size} text-slate-400`} />;
    }
  };

  if (loading && !orderDetail) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-700 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => navigate('/sorter')}
            className="rounded-lg bg-primary-700 px-4 py-2 text-sm text-white hover:bg-primary-800"
          >
            返回列表
          </button>
        </div>
      </Layout>
    );
  }

  if (!orderDetail) return null;

  const { order, batches, overdueCalculations } = orderDetail;

  return (
    <Layout>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/sorter')}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative space-y-0">
            {batches.map((batch, idx) => {
              const calc = overdueCalculations.find(
                (c) => c.batchId === batch.id
              );
              const overdueH = getOverdueHours(batch.arrived_at);
              const isLast = idx === batches.length - 1;

              return (
                <div key={batch.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
                      {statusIcon(batch.status)}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-slate-200" />
                    )}
                  </div>

                  <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            第 {batch.batch_no} 批
                          </span>
                          <StatusBadge status={batch.status} />
                        </div>
                        {batch.status === 'arrived' && overdueH > 0 && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Timer className="h-3 w-3" />
                            {overdueH.toFixed(1)}h
                          </span>
                        )}
                      </div>

                      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          到店：{formatTime(batch.arrived_at)}
                        </span>
                        {batch.prepared_at && (
                          <span>备货：{formatTime(batch.prepared_at)}</span>
                        )}
                        {batch.picked_at && (
                          <span>取货：{formatTime(batch.picked_at)}</span>
                        )}
                      </div>

                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500">
                            <th className="pb-1 text-left font-medium">商品</th>
                            <th className="pb-1 text-right font-medium">数量</th>
                            <th className="pb-1 text-right font-medium">单价</th>
                            <th className="pb-1 text-right font-medium">小计</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batch.items.map((item) => (
                            <tr key={item.id} className="border-t border-slate-50">
                              <td className="py-1 text-slate-700">
                                {item.product_name}
                              </td>
                              <td className="py-1 text-right font-mono text-slate-600">
                                {item.quantity}
                              </td>
                              <td className="py-1 text-right font-mono text-slate-600">
                                ¥{item.unit_price.toFixed(2)}
                              </td>
                              <td className="py-1 text-right font-mono text-slate-800">
                                ¥{item.subtotal.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {batch.status === 'arrived' && (
                        <button
                          onClick={() => setPrepareConfirm(batch.id)}
                          className="mt-3 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-800"
                        >
                          标记备货完成
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              逾期费用预览
            </h3>
            {overdueCalculations.length === 0 ? (
              <p className="text-sm text-slate-400">暂无逾期费用</p>
            ) : (
              <div className="space-y-3">
                {overdueCalculations.map((calc) => (
                  <OverduePanel
                    key={calc.batchId}
                    calculation={calc}
                    tiers={pricingTiers}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={prepareConfirm !== null}
        title="确认备货完成"
        message="请确认该批次所有商品已备货完成，确认后客户可以前来取货。"
        confirmLabel="确认备货"
        onConfirm={() =>
          prepareConfirm && handleMarkPrepared(prepareConfirm)
        }
        onCancel={() => setPrepareConfirm(null)}
      />
    </Layout>
  );
}
