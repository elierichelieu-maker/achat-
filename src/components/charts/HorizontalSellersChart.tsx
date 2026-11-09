import React, { useState, useMemo } from 'react';
import { Seller, Sale } from '../../types';
import { Award, Target, TrendingUp, DollarSign } from 'lucide-react';
import { formatHTG } from '../../utils/formatters';

interface HorizontalSellersChartProps {
  sellers: Seller[];
  sales: Sale[];
  onSelectSeller?: (seller: Seller) => void;
}

export const HorizontalSellersChart: React.FC<HorizontalSellersChartProps> = ({
  sellers,
  sales,
  onSelectSeller,
}) => {
  const [metric, setMetric] = useState<'revenue' | 'profit' | 'target'>('revenue');
  const [hoveredSellerId, setHoveredSellerId] = useState<string | null>(null);

  // Compute stats per seller
  const stats = useMemo(() => {
    return sellers.map((seller) => {
      const sellerSales = sales.filter((s) => s.sellerId === seller.id && s.status === 'completed');
      const revenue = sellerSales.reduce((acc, s) => acc + s.totalHT, 0);
      const cost = sellerSales.reduce((acc, s) => acc + s.totalCost, 0);
      const profit = revenue - cost;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      const targetPct = Math.round((revenue / seller.targetMonthlyRevenue) * 100);
      const salesCount = sellerSales.length;

      return {
        seller,
        revenue,
        cost,
        profit,
        margin,
        targetPct,
        salesCount,
      };
    });
  }, [sellers, sales]);

  // Sort based on active metric
  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      if (metric === 'revenue') return b.revenue - a.revenue;
      if (metric === 'profit') return b.profit - a.profit;
      return b.targetPct - a.targetPct;
    });
  }, [stats, metric]);

  const maxVal = useMemo(() => {
    if (metric === 'revenue') {
      return Math.max(...stats.map((s) => s.revenue), 1000);
    }
    if (metric === 'profit') {
      return Math.max(...stats.map((s) => s.profit), 1000);
    }
    return Math.max(...stats.map((s) => s.targetPct), 100);
  }, [stats, metric]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              Graphique Comparatif Horizontal des Vendeurs
            </h3>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-mono">
              {sellers.length} Commerciaux
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Comparaison visuelle en barres horizontales proportionnelles
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              metric === 'revenue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chiffre d'Affaires
          </button>
          <button
            type="button"
            onClick={() => setMetric('profit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              metric === 'profit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bénéfice Net
          </button>
          <button
            type="button"
            onClick={() => setMetric('target')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              metric === 'target'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            % Objectif
          </button>
        </div>
      </div>

      {/* Horizontal Bar Chart Rows */}
      <div className="mt-5 space-y-4">
        {sortedStats.map((item, index) => {
          const { seller, revenue, profit, margin, targetPct, salesCount } = item;
          const isHovered = hoveredSellerId === seller.id;

          let barWidth = 0;
          let displayVal = '';
          let subText = '';

          if (metric === 'revenue') {
            barWidth = Math.min(100, Math.round((revenue / maxVal) * 100));
            displayVal = `${formatHTG(revenue)} HT`;
            subText = `Profit : +${formatHTG(profit)} (${margin}% marge)`;
          } else if (metric === 'profit') {
            barWidth = Math.min(100, Math.round((profit / maxVal) * 100));
            displayVal = `+${formatHTG(profit)} Net`;
            subText = `Sur ${formatHTG(revenue)} CA (${salesCount} ventes)`;
          } else {
            barWidth = Math.min(100, Math.round((targetPct / Math.max(100, maxVal)) * 100));
            displayVal = `${targetPct}%`;
            subText = `Obj : ${formatHTG(seller.targetMonthlyRevenue)} (${formatHTG(revenue)} atteints)`;
          }

          return (
            <div
              key={seller.id}
              onMouseEnter={() => setHoveredSellerId(seller.id)}
              onMouseLeave={() => setHoveredSellerId(null)}
              onClick={() => onSelectSeller && onSelectSeller(seller)}
              className={`p-3 rounded-xl border transition-all ${
                onSelectSeller ? 'cursor-pointer' : ''
              } ${
                isHovered
                  ? 'bg-slate-50/80 border-slate-300 shadow-xs'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
                {/* Seller info */}
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-400 text-xs w-5">
                    #{index + 1}
                  </span>
                  <img
                    src={seller.avatar}
                    alt={seller.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 text-sm block">
                      {seller.name}
                    </span>
                    <span className="text-slate-500 text-[11px]">{seller.role}</span>
                  </div>
                </div>

                {/* Metric value and subtext */}
                <div className="text-left sm:text-right font-mono tabular-nums">
                  <span
                    className={`font-bold text-sm block ${
                      metric === 'profit'
                        ? 'text-emerald-700'
                        : metric === 'target'
                        ? 'text-indigo-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {displayVal}
                  </span>
                  <span className="text-slate-500 text-[11px] font-sans">{subText}</span>
                </div>
              </div>

              {/* Horizontal Bar */}
              <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metric === 'profit'
                      ? 'bg-emerald-500'
                      : metric === 'target'
                      ? targetPct >= 100
                        ? 'bg-emerald-500'
                        : targetPct >= 70
                        ? 'bg-blue-600'
                        : 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.max(barWidth, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>Chiffre d'Affaires</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Bénéfice Net</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Objectif en cours</span>
          </div>
        </div>
        <span className="text-slate-400">Classement temps réel</span>
      </div>
    </div>
  );
};
