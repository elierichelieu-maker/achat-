import React, { useState, useMemo } from 'react';
import { Sale } from '../../types';
import { formatHTG } from '../../utils/formatters';

interface CategoryProfitabilityChartProps {
  sales: Sale[];
}

export const CategoryProfitabilityChart: React.FC<CategoryProfitabilityChartProps> = ({ sales }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group sales items by product category
  const categoryStats = useMemo(() => {
    const map = new Map<string, { category: string; revenue: number; cost: number; profit: number; units: number }>();

    sales.forEach((s) => {
      s.items.forEach((item) => {
        // Beverage categories classification
        let cat = 'Boissons Gazeuses';
        const nameLower = item.productName.toLowerCase();
        if (nameLower.includes('bière') || nameLower.includes('fût') || nameLower.includes('ipa') || nameLower.includes('cidre')) {
          cat = 'Bières & Cidres';
        } else if (nameLower.includes('champagne') || nameLower.includes('prosecco') || nameLower.includes('rosé') || nameLower.includes('vin') || nameLower.includes('crémant')) {
          cat = 'Vins & Champagnes';
        } else if (nameLower.includes('gin') || nameLower.includes('rhum') || nameLower.includes('whisky') || nameLower.includes('vodka')) {
          cat = 'Spiritueux';
        } else if (nameLower.includes('eau') || nameLower.includes('tonic') || nameLower.includes('ginger')) {
          cat = 'Eaux & Tonics';
        } else {
          cat = 'Boissons Gazeuses';
        }

        if (!map.has(cat)) {
          map.set(cat, { category: cat, revenue: 0, cost: 0, profit: 0, units: 0 });
        }
        const c = map.get(cat)!;
        c.revenue += item.totalPrice;
        c.cost += item.totalCost;
        c.profit += item.profit;
        c.units += item.quantity;
      });
    });

    const list = Array.from(map.values()).map((c) => ({
      ...c,
      marginPercent: c.revenue > 0 ? Math.round((c.profit / c.revenue) * 100) : 0,
    }));

    // Sort by revenue descending
    return list.sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const maxRevenue = Math.max(...categoryStats.map((c) => c.revenue), 1000);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Rentabilité & Marges par Catégorie
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyse comparative du chiffre d'affaires et du taux de marge brute
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {categoryStats.length} Catégories
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {categoryStats.map((cat) => {
          const isSelected = selectedCategory === cat.category;
          const revPercent = Math.round((cat.revenue / maxRevenue) * 100);

          return (
            <div
              key={cat.category}
              onClick={() => setSelectedCategory(isSelected ? null : cat.category)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-50 border-slate-400 shadow-xs'
                  : 'bg-white border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{cat.category}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 tabular-nums">{cat.units} unités vendues</span>
                </div>
                <div className="flex items-center gap-4 tabular-nums">
                  <span className="text-slate-600 font-medium">
                    CA : <strong className="text-slate-900">{formatHTG(cat.revenue)}</strong>
                  </span>
                  <span className="text-emerald-700 font-medium">
                    Bénéfice : <strong className="text-emerald-800">+{formatHTG(cat.profit)}</strong>
                  </span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Marge {cat.marginPercent}%
                  </span>
                </div>
              </div>

              {/* Dual bar: revenue length + margin progress indicator */}
              <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                {/* Cost portion */}
                <div
                  className="bg-slate-300 transition-all duration-300"
                  style={{ width: `${Math.round((cat.cost / maxRevenue) * 100)}%` }}
                  title={`Coût: ${formatHTG(cat.cost)}`}
                />
                {/* Profit portion */}
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.round((cat.profit / maxRevenue) * 100)}%` }}
                  title={`Profit Net: +${formatHTG(cat.profit)}`}
                />
              </div>

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Prix d'achat cumulé</span>
                    <span className="font-semibold text-slate-800 tabular-nums font-mono">
                      {formatHTG(cat.cost)}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Bénéfice brut net</span>
                    <span className="font-semibold text-emerald-700 tabular-nums font-mono">
                      +{formatHTG(cat.profit)}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Ratio Marge / CA</span>
                    <span className="font-semibold text-indigo-700 tabular-nums font-mono">
                      {cat.marginPercent}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-300" />
            <span>Coût d'achat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <span>Marge brute (Bénéfice)</span>
          </div>
        </div>
        <span className="text-slate-400">Cliquez sur une catégorie pour inspecter</span>
      </div>
    </div>
  );
};
