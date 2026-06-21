import { useMemo } from 'react';
import type { OverdueCalculation, PricingTier } from '../../shared/types';

interface OverduePanelProps {
  calculation: OverdueCalculation;
  tiers: PricingTier[];
}

export default function OverduePanel({ calculation, tiers }: OverduePanelProps) {
  const sortedTiers = useMemo(
    () => [...tiers].sort((a, b) => a.sort_order - b.sort_order),
    [tiers]
  );

  const getTierData = (idx: number) => {
    if (idx === 0) return { hours: calculation.tier1Hours, fee: calculation.tier1Fee };
    if (idx === 1) return { hours: calculation.tier2Hours, fee: calculation.tier2Fee };
    if (idx === 2) return { hours: calculation.tier3Hours, fee: calculation.tier3Fee };
    return { hours: 0, fee: 0 };
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-amber-800">
          逾期费用明细
        </span>
        <span className="font-mono text-lg font-semibold text-amber-700">
          ¥{calculation.totalFee.toFixed(2)}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-amber-200 text-amber-700">
            <th className="pb-2 text-left font-medium">时段</th>
            <th className="pb-2 text-right font-medium">费率/时</th>
            <th className="pb-2 text-right font-medium">小时数</th>
            <th className="pb-2 text-right font-medium">费用</th>
          </tr>
        </thead>
        <tbody>
          {sortedTiers.map((tier, idx) => {
            const prevMax = idx > 0 ? sortedTiers[idx - 1].max_hours : 0;
            const { hours, fee } = getTierData(idx);
            const isCurrentTier = hours > 0;
            return (
              <tr
                key={tier.id}
                className={`border-b border-amber-100 last:border-0 ${
                  isCurrentTier ? 'bg-amber-100/50 font-medium' : ''
                }`}
              >
                <td className="py-1.5">
                  {prevMax}h - {tier.max_hours >= 999 ? '∞' : `${tier.max_hours}h`}
                </td>
                <td className="py-1.5 text-right font-mono">
                  ¥{tier.rate_per_hour.toFixed(2)}
                </td>
                <td className="py-1.5 text-right font-mono">
                  {hours.toFixed(1)}
                </td>
                <td className="py-1.5 text-right font-mono">
                  ¥{fee.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-2 text-xs text-amber-600">
        逾期时长：{calculation.overdueHours.toFixed(1)} 小时
      </div>
    </div>
  );
}
