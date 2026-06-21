import { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Target,
  BarChart3,
  PieChart,
  Calculator,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  trafficRatio: number;
  avgPrice: number;
  grossMargin: number;
  inventoryLossRate: number;
}

interface DiscountTier {
  id: string;
  threshold: number;
  discount: number;
}

interface CategoryResult {
  categoryId: string;
  categoryName: string;
  traffic: number;
  avgPrice: number;
  matchedTier: DiscountTier | null;
  effectiveDiscount: number;
  revenue: number;
  totalDiscount: number;
  grossProfit: number;
  inventoryLossCost: number;
  materialLossCost: number;
  netProfit: number;
}

interface SensitivityItem {
  name: string;
  label: string;
  impact: number;
  absImpact: number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultCategories: Category[] = [
  { id: generateId(), name: '生鲜水果', trafficRatio: 35, avgPrice: 45, grossMargin: 25, inventoryLossRate: 8 },
  { id: generateId(), name: '休闲零食', trafficRatio: 30, avgPrice: 28, grossMargin: 35, inventoryLossRate: 2 },
  { id: generateId(), name: '日用百货', trafficRatio: 20, avgPrice: 65, grossMargin: 20, inventoryLossRate: 1 },
  { id: generateId(), name: '饮料酒水', trafficRatio: 15, avgPrice: 12, grossMargin: 40, inventoryLossRate: 3 },
];

const defaultTiers: DiscountTier[] = [
  { id: generateId(), threshold: 0, discount: 100 },
  { id: generateId(), threshold: 100, discount: 95 },
  { id: generateId(), threshold: 200, discount: 90 },
  { id: generateId(), threshold: 400, discount: 85 },
];

export default function PromotionCalculator() {
  const [totalTraffic, setTotalTraffic] = useState<number>(1000);
  const [materialLossCost, setMaterialLossCost] = useState<number>(5000);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>(defaultTiers);

  const totalTrafficRatio = useMemo(
    () => categories.reduce((sum, c) => sum + c.trafficRatio, 0),
    [categories]
  );

  const isTrafficRatioValid = Math.abs(totalTrafficRatio - 100) < 0.01;

  const sortedTiers = useMemo(
    () => [...discountTiers].sort((a, b) => a.threshold - b.threshold),
    [discountTiers]
  );

  const matchDiscountTier = useCallback(
    (price: number): DiscountTier | null => {
      let matched: DiscountTier | null = null;
      for (const tier of sortedTiers) {
        if (price >= tier.threshold) {
          matched = tier;
        }
      }
      return matched;
    },
    [sortedTiers]
  );

  const categoryResults = useMemo<CategoryResult[]>(() => {
    return categories.map((cat) => {
      const traffic = (totalTraffic * cat.trafficRatio) / 100;
      const matchedTier = matchDiscountTier(cat.avgPrice);
      const effectiveDiscount = matchedTier ? matchedTier.discount / 100 : 1;
      const revenue = traffic * cat.avgPrice * effectiveDiscount;
      const totalDiscount = traffic * cat.avgPrice * (1 - effectiveDiscount);
      const grossProfit = revenue * (cat.grossMargin / 100);
      const inventoryLossCost = revenue * (cat.inventoryLossRate / 100);

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        traffic,
        avgPrice: cat.avgPrice,
        matchedTier,
        effectiveDiscount,
        revenue,
        totalDiscount,
        grossProfit,
        inventoryLossCost,
        materialLossCost: 0,
        netProfit: 0,
      };
    });
  }, [categories, totalTraffic, matchDiscountTier]);

  const totalRevenue = useMemo(
    () => categoryResults.reduce((sum, r) => sum + r.revenue, 0),
    [categoryResults]
  );

  const resultsWithMaterial = useMemo<CategoryResult[]>(() => {
    return categoryResults.map((r) => {
      const materialShare = totalRevenue > 0 ? (r.revenue / totalRevenue) * materialLossCost : 0;
      return {
        ...r,
        materialLossCost: materialShare,
        netProfit: r.grossProfit - r.inventoryLossCost - materialShare,
      };
    });
  }, [categoryResults, totalRevenue, materialLossCost]);

  const summary = useMemo(() => {
    const totalDiscount = resultsWithMaterial.reduce((sum, r) => sum + r.totalDiscount, 0);
    const totalGrossProfit = resultsWithMaterial.reduce((sum, r) => sum + r.grossProfit, 0);
    const totalInventoryLoss = resultsWithMaterial.reduce((sum, r) => sum + r.inventoryLossCost, 0);
    const totalNetProfit = resultsWithMaterial.reduce((sum, r) => sum + r.netProfit, 0);

    return {
      totalRevenue,
      totalDiscount,
      totalGrossProfit,
      totalInventoryLoss,
      totalMaterialLoss: materialLossCost,
      totalNetProfit,
    };
  }, [resultsWithMaterial, totalRevenue, materialLossCost]);

  const breakEvenDiscount = useMemo(() => {
    if (!isTrafficRatioValid || totalRevenue === 0) return null;

    let low = 0;
    let high = 100;
    let mid = 0;

    for (let i = 0; i < 100; i++) {
      mid = (low + high) / 2;
      const discountRatio = mid / 100;

      let totalGross = 0;
      let totalInvLoss = 0;

      for (const cat of categories) {
        const traffic = (totalTraffic * cat.trafficRatio) / 100;
        const rev = traffic * cat.avgPrice * discountRatio;
        totalGross += rev * (cat.grossMargin / 100);
        totalInvLoss += rev * (cat.inventoryLossRate / 100);
      }

      const netProfit = totalGross - totalInvLoss - materialLossCost;

      if (Math.abs(netProfit) < 0.01) break;
      if (netProfit > 0) {
        high = mid;
      } else {
        low = mid;
      }
    }

    return mid;
  }, [categories, totalTraffic, materialLossCost, isTrafficRatioValid, totalRevenue]);

  const sensitivityAnalysis = useMemo<SensitivityItem[]>(() => {
    if (!isTrafficRatioValid) return [];

    const baseNetProfit = summary.totalNetProfit;
    const delta = 0.01;

    const calculateWithTraffic = () => {
      const newTraffic = totalTraffic * (1 + delta);
      let totalGross = 0;
      let totalInvLoss = 0;
      for (const cat of categories) {
        const traffic = (newTraffic * cat.trafficRatio) / 100;
        const matchedTier = matchDiscountTier(cat.avgPrice);
        const effectiveDiscount = matchedTier ? matchedTier.discount / 100 : 1;
        const rev = traffic * cat.avgPrice * effectiveDiscount;
        totalGross += rev * (cat.grossMargin / 100);
        totalInvLoss += rev * (cat.inventoryLossRate / 100);
      }
      return totalGross - totalInvLoss - materialLossCost;
    };

    const calculateWithPrice = () => {
      let totalGross = 0;
      let totalInvLoss = 0;
      for (const cat of categories) {
        const traffic = (totalTraffic * cat.trafficRatio) / 100;
        const newPrice = cat.avgPrice * (1 + delta);
        const matchedTier = matchDiscountTier(newPrice);
        const effectiveDiscount = matchedTier ? matchedTier.discount / 100 : 1;
        const rev = traffic * newPrice * effectiveDiscount;
        totalGross += rev * (cat.grossMargin / 100);
        totalInvLoss += rev * (cat.inventoryLossRate / 100);
      }
      return totalGross - totalInvLoss - materialLossCost;
    };

    const calculateWithMargin = () => {
      let totalGross = 0;
      let totalInvLoss = 0;
      for (const cat of categories) {
        const traffic = (totalTraffic * cat.trafficRatio) / 100;
        const matchedTier = matchDiscountTier(cat.avgPrice);
        const effectiveDiscount = matchedTier ? matchedTier.discount / 100 : 1;
        const rev = traffic * cat.avgPrice * effectiveDiscount;
        const newMargin = cat.grossMargin * (1 + delta);
        totalGross += rev * (newMargin / 100);
        totalInvLoss += rev * (cat.inventoryLossRate / 100);
      }
      return totalGross - totalInvLoss - materialLossCost;
    };

    const calculateWithInvLoss = () => {
      let totalGross = 0;
      let totalInvLoss = 0;
      for (const cat of categories) {
        const traffic = (totalTraffic * cat.trafficRatio) / 100;
        const matchedTier = matchDiscountTier(cat.avgPrice);
        const effectiveDiscount = matchedTier ? matchedTier.discount / 100 : 1;
        const rev = traffic * cat.avgPrice * effectiveDiscount;
        totalGross += rev * (cat.grossMargin / 100);
        const newInvLoss = cat.inventoryLossRate * (1 + delta);
        totalInvLoss += rev * (newInvLoss / 100);
      }
      return totalGross - totalInvLoss - materialLossCost;
    };

    const calculateWithMaterial = () => {
      const newMaterial = materialLossCost * (1 + delta);
      let totalGross = 0;
      let totalInvLoss = 0;
      for (const cat of categories) {
        const traffic = (totalTraffic * cat.trafficRatio) / 100;
        const matchedTier = matchDiscountTier(cat.avgPrice);
        const effectiveDiscount = matchedTier ? matchedTier.discount / 100 : 1;
        const rev = traffic * cat.avgPrice * effectiveDiscount;
        totalGross += rev * (cat.grossMargin / 100);
        totalInvLoss += rev * (cat.inventoryLossRate / 100);
      }
      return totalGross - totalInvLoss - newMaterial;
    };

    const items: SensitivityItem[] = [
      { name: 'totalTraffic', label: '总客流量', impact: calculateWithTraffic() - baseNetProfit, absImpact: 0 },
      { name: 'avgPrice', label: '品类均价', impact: calculateWithPrice() - baseNetProfit, absImpact: 0 },
      { name: 'grossMargin', label: '毛利率', impact: calculateWithMargin() - baseNetProfit, absImpact: 0 },
      { name: 'inventoryLoss', label: '库存损耗率', impact: calculateWithInvLoss() - baseNetProfit, absImpact: 0 },
      { name: 'materialCost', label: '物料损耗成本', impact: calculateWithMaterial() - baseNetProfit, absImpact: 0 },
    ];

    return items
      .map((item) => ({ ...item, absImpact: Math.abs(item.impact) }))
      .sort((a, b) => b.absImpact - a.absImpact);
  }, [summary, categories, totalTraffic, materialLossCost, isTrafficRatioValid, matchDiscountTier]);

  const handleCategoryChange = (id: string, field: keyof Category, value: number | string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      {
        id: generateId(),
        name: `新品类${prev.length + 1}`,
        trafficRatio: 10,
        avgPrice: 50,
        grossMargin: 25,
        inventoryLossRate: 5,
      },
    ]);
  };

  const removeCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleTierChange = (id: string, field: keyof DiscountTier, value: number) => {
    setDiscountTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const addTier = () => {
    const maxThreshold = Math.max(...discountTiers.map((t) => t.threshold), 0);
    setDiscountTiers((prev) => [
      ...prev,
      { id: generateId(), threshold: maxThreshold + 100, discount: 80 },
    ]);
  };

  const removeTier = (id: string) => {
    if (discountTiers.length <= 1) return;
    setDiscountTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const formatMoney = (val: number) => `¥${val.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">促销损益测算系统</h1>
          <p className="text-sm text-slate-500">参数配置 · 实时联动测算</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-700">
                <Calculator className="h-4 w-4 text-primary-600" />
                基础参数
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">总客流量（人次）</label>
                  <input
                    type="number"
                    value={totalTraffic}
                    onChange={(e) => setTotalTraffic(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-primary-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">物料损耗总成本（元）</label>
                  <input
                    type="number"
                    value={materialLossCost}
                    onChange={(e) => setMaterialLossCost(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-700">
                  <PieChart className="h-4 w-4 text-primary-600" />
                  商品品类列表
                </h2>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium',
                      isTrafficRatioValid ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {isTrafficRatioValid ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}
                    客流占比合计: {totalTrafficRatio.toFixed(1)}%
                  </span>
                  <button
                    onClick={addCategory}
                    className="flex items-center gap-1 rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加品类
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {categories.map((cat, idx) => {
                const result = resultsWithMaterial.find((r) => r.categoryId === cat.id);
                return (
                  <div
                    key={cat.id}
                    className={cn(
                      'rounded-lg border bg-slate-50 p-4',
                      isTrafficRatioValid
                        ? 'border-slate-200'
                        : 'border-red-300 bg-red-50'
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                          {idx + 1}
                        </div>
                        <input
                          type="text"
                          value={cat.name}
                          onChange={(e) => handleCategoryChange(cat.id, 'name', e.target.value)}
                          className="rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-700 outline-none hover:border-slate-200 focus:border-primary-500 focus:bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {result?.matchedTier && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            命中{result.matchedTier.threshold > 0 ? `满${result.matchedTier.threshold}` : '基础档'} · {(result.effectiveDiscount * 100).toFixed(0)}折
                          </span>
                        )}
                        <button
                          onClick={() => removeCategory(cat.id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">客流占比 (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={cat.trafficRatio}
                          onChange={(e) =>
                            handleCategoryChange(cat.id, 'trafficRatio', Number(e.target.value))
                          }
                          className={cn(
                            'rounded-lg border px-2 py-1.5 text-sm font-mono outline-none',
                            isTrafficRatioValid
                              ? 'border-slate-200 focus:border-primary-500'
                              : 'border-red-300 bg-red-50 focus:border-red-500'
                          )}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">品类均价（元）</label>
                        <input
                          type="number"
                          step="0.01"
                          value={cat.avgPrice}
                          onChange={(e) =>
                            handleCategoryChange(cat.id, 'avgPrice', Number(e.target.value))
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono outline-none focus:border-primary-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">毛利率 (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={cat.grossMargin}
                          onChange={(e) =>
                            handleCategoryChange(cat.id, 'grossMargin', Number(e.target.value))
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono outline-none focus:border-primary-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">库存损耗率 (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={cat.inventoryLossRate}
                          onChange={(e) =>
                            handleCategoryChange(cat.id, 'inventoryLossRate', Number(e.target.value))
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono outline-none focus:border-primary-500"
                        />
                      </div>
                    </div>
                    {result && (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-xs md:grid-cols-5">
                        <div>
                          <span className="text-slate-500">品类客流：</span>
                          <span className="font-mono text-slate-700">{result.traffic.toFixed(0)}人</span>
                        </div>
                        <div>
                          <span className="text-slate-500">活动营收：</span>
                          <span className="font-mono text-slate-700">{formatMoney(result.revenue)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">活动让利：</span>
                          <span className="font-mono text-amber-600">{formatMoney(result.totalDiscount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">库存损耗：</span>
                          <span className="font-mono text-red-500">{formatMoney(result.inventoryLossCost)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">品类净收益：</span>
                          <span className={cn(
                            'font-mono font-medium',
                            result.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            {formatMoney(result.netProfit)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-700">
                  <BarChart3 className="h-4 w-4 text-primary-600" />
                  阶梯折扣规则
                </h2>
                <button
                  onClick={addTier}
                  className="flex items-center gap-1 rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加档位
                </button>
              </div>
              <div className="space-y-2">
                {sortedTiers.map((tier, idx) => (
                  <div
                    key={tier.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <span className="text-sm font-medium text-slate-600">第{idx + 1}档</span>
                    <div className="flex flex-1 items-center gap-2">
                      <label className="text-xs text-slate-500">消费门槛</label>
                      <input
                        type="number"
                        value={tier.threshold}
                        onChange={(e) =>
                          handleTierChange(tier.id, 'threshold', Number(e.target.value))
                        }
                        className="w-24 rounded border border-slate-200 px-2 py-1 text-sm font-mono outline-none focus:border-primary-500"
                      />
                      <span className="text-xs text-slate-500">元</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500">折扣率</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tier.discount}
                        onChange={(e) =>
                          handleTierChange(tier.id, 'discount', Number(e.target.value))
                        }
                        className="w-20 rounded border border-slate-200 px-2 py-1 text-sm font-mono outline-none focus:border-primary-500"
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                    <div className="text-sm font-medium text-amber-600">
                      {(tier.discount / 10).toFixed(1)}折
                    </div>
                    {sortedTiers.length > 1 && (
                      <button
                        onClick={() => removeTier(tier.id)}
                        className="ml-auto rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-700">
                <Target className="h-4 w-4 text-primary-600" />
                保本折扣测算
              </h2>
              {breakEvenDiscount !== null && isTrafficRatioValid ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">临界保本折扣率</span>
                    <span className="text-lg font-bold text-amber-600">
                      {breakEvenDiscount.toFixed(2)}%（{(breakEvenDiscount / 10).toFixed(2)}折）
                    </span>
                  </div>
                  <div className="relative h-12 w-full">
                    <div className="absolute inset-x-0 top-3 flex items-center">
                      <div className="h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                          style={{ width: `${breakEvenDiscount}%` }}
                        />
                      </div>
                    </div>
                    <div
                      className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                      style={{ left: `${breakEvenDiscount}%` }}
                    >
                      <div className="h-8 w-1 rounded bg-amber-500" />
                      <span className="mt-1 text-xs font-medium text-amber-600">
                        保本点
                      </span>
                    </div>
                    <div className="absolute bottom-0 flex w-full justify-between text-xs text-slate-500">
                      <span>0折</span>
                      <span>50折</span>
                      <span>100折</span>
                    </div>
                  </div>
                  <p className="pt-4 text-xs text-slate-500">
                    <span className="text-emerald-600">●</span> 折扣率高于保本点时盈利 &nbsp;&nbsp;
                    <span className="text-red-500">●</span> 折扣率低于保本点时亏损
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  请先确保客流占比合计为100%
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-700">
                <TrendingUp className="h-4 w-4 text-primary-600" />
                敏感度分析（边际影响排序）
              </h2>
              {isTrafficRatioValid ? (
                <div className="space-y-3">
                  {sensitivityAnalysis.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {idx + 1}
                      </div>
                      <div className="w-24 text-sm text-slate-600">{item.label}</div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className={cn(
                              'h-2 rounded-full',
                              item.impact >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                            )}
                            style={{
                              width: `${Math.min(
                                (item.absImpact / (sensitivityAnalysis[0]?.absImpact || 1)) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          'w-28 text-right text-sm font-mono font-medium',
                          item.impact >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}
                      >
                        {item.impact >= 0 ? '+' : ''}
                        {formatMoney(item.impact)}
                      </div>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-slate-500">
                    * 基于各参数变动1%时对净收益的边际影响，按绝对值降序排列
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  请先确保客流占比合计为100%
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-slate-700">测算汇总</h2>
                {!isTrafficRatioValid && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>客流占比合计不为100%，测算结果仅供参考</span>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">活动总营收</span>
                    <span className="font-mono font-medium text-slate-800">
                      {formatMoney(summary.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">活动总让利</span>
                    <span className="font-mono text-amber-600">
                      {formatMoney(summary.totalDiscount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">总毛利</span>
                    <span className="font-mono text-emerald-600">
                      {formatMoney(summary.totalGrossProfit)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">库存损耗成本</span>
                      <span className="font-mono text-red-500">
                        -{formatMoney(summary.totalInventoryLoss)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">物料损耗成本</span>
                    <span className="font-mono text-red-500">
                      -{formatMoney(summary.totalMaterialLoss)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-semibold text-slate-800">净收益</span>
                      <span
                        className={cn(
                          'text-lg font-bold font-mono',
                          summary.totalNetProfit >= 0
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        )}
                      >
                        {summary.totalNetProfit >= 0 ? '+' : ''}
                        {formatMoney(summary.totalNetProfit)}
                      </span>
                    </div>
                    {isTrafficRatioValid ? (
                      <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        测算有效
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        客流占比异常
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-slate-700">品类营收占比</h2>
                <div className="space-y-2">
                  {resultsWithMaterial.map((r) => {
                    const ratio = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={r.categoryId} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">{r.categoryName}</span>
                          <span className="font-mono text-slate-500">{ratio.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-primary-500"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
