import React, { useState, useMemo } from 'react';
import { Product, Sale } from '../../types';
import { InteractiveRevenueChart } from '../charts/InteractiveRevenueChart';
import { CategoryProfitabilityChart } from '../charts/CategoryProfitabilityChart';
import { TrendingUp, Percent, DollarSign, Calculator, Layers, HelpCircle } from 'lucide-react';
import { formatHTG } from '../../utils/formatters';

interface ProfitabilityViewProps {
  products: Product[];
  sales: Sale[];
}

export const ProfitabilityView: React.FC<ProfitabilityViewProps> = ({ products, sales }) => {
  const [simulationPriceChange, setSimulationPriceChange] = useState<number>(0); // % change
  const [simulationCostReduction, setSimulationCostReduction] = useState<number>(0); // % reduction

  // Financial aggregates
  const totalRevenue = useMemo(() => sales.reduce((acc, s) => acc + s.totalHT, 0), [sales]);
  const totalCost = useMemo(() => sales.reduce((acc, s) => acc + s.totalCost, 0), [sales]);
  const totalProfit = totalRevenue - totalCost;
  const globalMarginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  // Margin tiers distribution across products catalog
  const marginTiers = useMemo(() => {
    let tierHigh = 0; // > 50%
    let tierMid = 0;  // 30% - 50%
    let tierLow = 0;  // < 30%

    products.forEach((p) => {
      const margin = ((p.salePrice - p.costPrice) / p.salePrice) * 100;
      if (margin >= 50) tierHigh++;
      else if (margin >= 30) tierMid++;
      else tierLow++;
    });

    return { tierHigh, tierMid, tierLow, total: products.length };
  }, [products]);

  // Product Quadrant (BCG / Margin matrix)
  const productQuadrant = useMemo(() => {
    // calculate sold units per product
    const soldMap = new Map<string, number>();
    sales.forEach((s) => {
      s.items.forEach((it) => {
        soldMap.set(it.productId, (soldMap.get(it.productId) || 0) + it.quantity);
      });
    });

    return products.map((p) => {
      const sold = soldMap.get(p.id) || 0;
      const marginPct = Math.round(((p.salePrice - p.costPrice) / p.salePrice) * 100);
      const isHighVolume = sold >= 8;
      const isHighMargin = marginPct >= 45;

      let categoryTag = 'Niche Spécifique';
      if (isHighVolume && isHighMargin) categoryTag = 'Produit Phare (Étoile)';
      else if (isHighVolume && !isHighMargin) categoryTag = 'Volume / Rotation Rapide';
      else if (!isHighVolume && !isHighMargin) categoryTag = 'À Optimiser';

      return {
        product: p,
        sold,
        marginPct,
        categoryTag,
      };
    });
  }, [products, sales]);

  // What-If Simulation
  const simulatedRevenue = Math.round(totalRevenue * (1 + simulationPriceChange / 100));
  const simulatedCost = Math.round(totalCost * (1 - simulationCostReduction / 100));
  const simulatedProfit = simulatedRevenue - simulatedCost;
  const simulatedMarginPercent = simulatedRevenue > 0 ? Math.round((simulatedProfit / simulatedRevenue) * 100) : 0;
  const profitDelta = simulatedProfit - totalProfit;

  return (
    <div className="space-y-6">
      {/* Top Margin KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Marge Brute Globale</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-mono font-semibold">
              Rentabilité Saine
            </span>
          </div>
          <span className="text-2xl font-bold text-emerald-700 tabular-nums font-mono mt-2 block">
            {globalMarginPercent}%
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            Ratio Bénéfice Brut / CA
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Bénéfice Net Réalisé</span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-2 block">
            +{formatHTG(totalProfit)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            Sur un CA total de {formatHTG(totalRevenue)} HT
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Coût des Marchandises (COGS)</span>
          <span className="text-2xl font-bold text-slate-700 tabular-nums font-mono mt-2 block">
            {formatHTG(totalCost)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {(100 - globalMarginPercent)}% du chiffre d'affaires
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Catalogue Haute Marge (&gt;50%)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-indigo-700 tabular-nums font-mono">
              {marginTiers.tierHigh}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {marginTiers.total} articles
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Articles prioritaires pour les commerciaux
          </span>
        </div>
      </div>

      {/* Main Interactive Chart */}
      <InteractiveRevenueChart sales={sales} days={30} />

      {/* Category breakdown */}
      <CategoryProfitabilityChart sales={sales} />

      {/* What-If Financial Sensitivity Simulator */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Simulateur d'Optimisation des Marges (Sensibilité & Impact)
            </h3>
            <p className="text-xs text-slate-500">
              Modélisez l'effet d'une hausse tarifaire ou d'une renégociation des coûts fournisseurs sur votre résultat
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-slate-700">Ajustement des Prix de Vente</span>
                <span className="font-mono tabular-nums font-bold text-blue-600">
                  {simulationPriceChange > 0 ? `+${simulationPriceChange}%` : `${simulationPriceChange}%`}
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="25"
                step="1"
                value={simulationPriceChange}
                onChange={(e) => setSimulationPriceChange(parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>-15% (Remises agressives)</span>
                <span>0% (Actuel)</span>
                <span>+25% (Positionnement Premium)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-slate-700">Économie Fournisseur sur Coûts d'Achat</span>
                <span className="font-mono tabular-nums font-bold text-emerald-600">
                  {simulationCostReduction > 0 ? `-${simulationCostReduction}%` : '0%'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={simulationCostReduction}
                onChange={(e) => setSimulationCostReduction(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>0% (Tarifs standard)</span>
                <span>10% (Remise volume)</span>
                <span>20% (Négociation grossiste)</span>
              </div>
            </div>
          </div>

          {/* Simulated Outcome Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-2">
                Projection Financière Modélisée
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Nouveau CA Projeté</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                    {formatHTG(simulatedRevenue)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Nouveau Coût Global</span>
                  <span className="font-mono font-medium text-slate-700 tabular-nums text-sm">
                    {formatHTG(simulatedCost)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Bénéfice Simulé</span>
                  <span className="font-mono font-bold text-emerald-700 tabular-nums text-sm">
                    +{formatHTG(simulatedProfit)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Nouveau Taux de Marge</span>
                  <span className="font-mono font-bold text-indigo-700 tabular-nums text-sm">
                    {simulatedMarginPercent}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-600 font-medium">Gain Net Additionnel :</span>
              <span className={`font-mono font-bold tabular-nums text-sm ${profitDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {profitDelta >= 0 ? `+${formatHTG(profitDelta)}` : formatHTG(profitDelta)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Profitability Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Matrice Rentabilité Catalogue & Classification Stratégique
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Identifier les articles à fort levier de marge et ceux dont la rentabilité doit être redressée
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="py-2.5 px-3">Produit & Réf</th>
                <th className="py-2.5 px-3">Catégorie</th>
                <th className="py-2.5 px-3 text-right">Prix Achat</th>
                <th className="py-2.5 px-3 text-right">Prix Vente HT</th>
                <th className="py-2.5 px-3 text-right">Marge Brute</th>
                <th className="py-2.5 px-3 text-right">Taux de Marge</th>
                <th className="py-2.5 px-3 text-center">Diagnostic Stratégique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {productQuadrant.map(({ product: p, marginPct, categoryTag, sold }) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-sans">
                    <span className="font-medium text-slate-900 block">{p.name}</span>
                    <span className="font-mono text-slate-400 text-[11px]">{p.sku}</span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-600">{p.category}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">{formatHTG(p.costPrice)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-900 font-medium tabular-nums">{formatHTG(p.salePrice)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 font-medium tabular-nums">
                    +{formatHTG(p.salePrice - p.costPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums text-indigo-700">
                    {marginPct}%
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <span
                      className={`inline-block text-[11px] px-2 py-0.5 rounded font-medium ${
                        marginPct >= 50
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : marginPct >= 35
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {categoryTag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
