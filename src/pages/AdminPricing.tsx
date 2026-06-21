import { useEffect, useState, useMemo } from 'react';
import { Save, Play, BarChart3 } from 'lucide-react';
import { useOrderStore } from '@/stores/orderStore';
import Layout from '@/components/Layout';
import type { PricingTier, SimulateRequest } from '../../shared/types';

export default function AdminPricing() {
  const {
    pricingTiers,
    simulateResult,
    loading,
    fetchPricingTiers,
    updatePricingTiers,
    simulateOverdue,
  } = useOrderStore();

  const [editTiers, setEditTiers] = useState<PricingTier[]>([]);
  const [simForm, setSimForm] = useState<SimulateRequest>({
    arrivedAt: '',
    hours: 48,
    itemCount: 5,
    pricePerItem: 100,
  });

  useEffect(() => {
    fetchPricingTiers();
  }, [fetchPricingTiers]);

  useEffect(() => {
    setEditTiers(pricingTiers);
  }, [pricingTiers]);

  const sortedTiers = useMemo(
    () => [...editTiers].sort((a, b) => a.sort_order - b.sort_order),
    [editTiers]
  );

  const handleTierChange = (
    id: string,
    field: keyof PricingTier,
    value: string | number
  ) => {
    setEditTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = async () => {
    await updatePricingTiers(editTiers);
  };

  const handleSimulate = async () => {
    await simulateOverdue(simForm);
  };

  const maxHours = useMemo(
    () => Math.max(...sortedTiers.map((t) => t.max_hours), 1),
    [sortedTiers]
  );

  const tierColors = [
    'bg-primary-200',
    'bg-amber-200',
    'bg-red-200',
    'bg-purple-200',
    'bg-blue-200',
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">费率配置</h1>
        <p className="text-sm text-slate-500">管理逾期费率阶梯及模拟计算</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-700">
              <BarChart3 className="h-4 w-4 text-primary-600" />
              阶梯费率图
            </h2>
            <div className="flex items-end gap-2" style={{ height: 160 }}>
              {sortedTiers.map((tier, idx) => {
                const heightPct = (tier.max_hours / maxHours) * 100;
                return (
                  <div key={tier.id} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-mono text-slate-600">
                      ¥{tier.rate_per_hour}/h
                    </span>
                    <div
                      className={`w-full rounded-t-md ${tierColors[idx % tierColors.length]}`}
                      style={{ height: `${Math.max(heightPct, 10)}%` }}
                    />
                    <span className="text-xs text-slate-500">
                      ≤{tier.max_hours}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-700">
              费率编辑
            </h2>

            <div className="space-y-3">
              {sortedTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                >
                  <span className="text-sm font-medium text-slate-600">
                    {tier.label}
                  </span>
                  <div className="flex flex-1 items-center gap-2">
                    <label className="text-xs text-slate-500">最大小时</label>
                    <input
                      type="number"
                      value={tier.max_hours}
                      onChange={(e) =>
                        handleTierChange(
                          tier.id,
                          'max_hours',
                          Number(e.target.value)
                        )
                      }
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-sm font-mono outline-none focus:border-primary-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">费率/时</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tier.rate_per_hour}
                      onChange={(e) =>
                        handleTierChange(
                          tier.id,
                          'rate_per_hour',
                          Number(e.target.value)
                        )
                      }
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-sm font-mono outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              保存费率
            </button>
          </div>
        </div>

        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-700">
              费用模拟
            </h2>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">到店时间</label>
                <input
                  type="datetime-local"
                  value={simForm.arrivedAt}
                  onChange={(e) =>
                    setSimForm((prev) => ({
                      ...prev,
                      arrivedAt: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">模拟小时数</label>
                <input
                  type="number"
                  value={simForm.hours}
                  onChange={(e) =>
                    setSimForm((prev) => ({
                      ...prev,
                      hours: Number(e.target.value),
                    }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-primary-500"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-slate-500">商品数量</label>
                  <input
                    type="number"
                    value={simForm.itemCount}
                    onChange={(e) =>
                      setSimForm((prev) => ({
                        ...prev,
                        itemCount: Number(e.target.value),
                      }))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-primary-500"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-slate-500">商品单价</label>
                  <input
                    type="number"
                    step="0.01"
                    value={simForm.pricePerItem}
                    onChange={(e) =>
                      setSimForm((prev) => ({
                        ...prev,
                        pricePerItem: Number(e.target.value),
                      }))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSimulate}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                模拟计算
              </button>
            </div>

            {simulateResult && (
              <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-primary-800">
                  模拟结果
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>商品总额</span>
                    <span className="font-mono">
                      ¥{simulateResult.totalGoodsAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>服务费</span>
                    <span className="font-mono">
                      ¥{simulateResult.totalServiceFee.toFixed(2)}
                    </span>
                  </div>
                  {simulateResult.batches.map((b) => (
                    <div
                      key={b.batchId}
                      className="flex justify-between text-amber-600"
                    >
                      <span>
                        第{b.batchNo}批逾期费 ({b.overdueHours.toFixed(1)}h)
                      </span>
                      <span className="font-mono">
                        ¥{b.totalFee.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-primary-200 pt-1 text-base font-semibold text-slate-800">
                    <span>合计</span>
                    <span className="font-mono">
                      ¥{simulateResult.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
