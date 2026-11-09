import React, { useState, useMemo } from 'react';
import { Sale, Product, Seller, TimeRange } from '../../types';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Layers,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  Calculator,
  Percent,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';
import { InteractiveRevenueChart } from '../charts/InteractiveRevenueChart';
import { CategoryProfitabilityChart } from '../charts/CategoryProfitabilityChart';
import { HorizontalSellersChart } from '../charts/HorizontalSellersChart';

interface FinancialReportsViewProps {
  sales: Sale[];
  products: Product[];
  sellers: Seller[];
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  sales,
  products,
  sellers,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeSection, setActiveSection] = useState<'all' | 'tables' | 'charts'>('all');

  // Simulation state for margin optimization
  const [simulationPriceChange, setSimulationPriceChange] = useState<number>(0);
  const [simulationCostReduction, setSimulationCostReduction] = useState<number>(0);

  // Days mapping
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;

  // Filter sales
  const filteredSales = useMemo(() => {
    const now = new Date('2026-10-22T23:59:59Z').getTime();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return sales.filter((s) => new Date(s.date).getTime() >= cutoff);
  }, [sales, days]);

  // Overall Financial KPIs
  const financials = useMemo(() => {
    const totalHT = filteredSales.reduce((acc, s) => acc + s.totalHT, 0);
    const totalCost = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
    const totalTVA = filteredSales.reduce((acc, s) => acc + s.totalHT * s.taxRate, 0);
    const totalTTC = filteredSales.reduce((acc, s) => acc + s.totalTTC, 0);
    const grossProfit = totalHT - totalCost;
    const avgMarginPercent = totalHT > 0 ? Math.round((grossProfit / totalHT) * 100) : 0;
    const count = filteredSales.length;
    const avgBasket = count > 0 ? Math.round(totalHT / count) : 0;

    return {
      totalHT,
      totalCost,
      totalTVA,
      totalTTC,
      grossProfit,
      avgMarginPercent,
      count,
      avgBasket,
    };
  }, [filteredSales]);

  // Breakdown by Category
  const categoryReports = useMemo(() => {
    const categories: Product['category'][] = [
      'Boissons Gazeuses',
      'Bières & Cidres',
      'Vins & Champagnes',
      'Spiritueux',
      'Eaux & Tonics',
    ];

    const totalHT = financials.totalHT || 1;

    return categories.map((cat) => {
      let revenue = 0;
      let cost = 0;
      let unitsSold = 0;

      filteredSales.forEach((s) => {
        s.items.forEach((it) => {
          const prod = products.find((p) => p.id === it.productId);
          if (prod && prod.category === cat) {
            revenue += it.totalPrice;
            cost += it.totalCost;
            unitsSold += it.quantity;
          }
        });
      });

      const profit = revenue - cost;
      const marginRate = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      const shareOfTotal = Math.round((revenue / totalHT) * 100);

      return {
        category: cat,
        revenue,
        cost,
        profit,
        marginRate,
        unitsSold,
        shareOfTotal,
      };
    });
  }, [filteredSales, products, financials.totalHT]);

  // Breakdown by Payment Method
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; count: number; total: number }>();
    map.set('virement', { label: 'Virement bancaire CHR', count: 0, total: 0 });
    map.set('traite', { label: 'Traite / LCR à terme', count: 0, total: 0 });
    map.set('carte', { label: 'Carte Bancaire Pro', count: 0, total: 0 });
    map.set('especes', { label: 'Espèces / Comptant', count: 0, total: 0 });

    filteredSales.forEach((s) => {
      const entry = map.get(s.paymentMethod);
      if (entry) {
        entry.count += 1;
        entry.total += s.totalTTC;
      }
    });

    return Array.from(map.values());
  }, [filteredSales]);

  // Top Most Profitable Products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; category: string; units: number; profit: number; revenue: number }>();

    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        const existing = map.get(it.productId) || {
          name: it.productName,
          category: products.find((p) => p.id === it.productId)?.category || '',
          units: 0,
          profit: 0,
          revenue: 0,
        };
        existing.units += it.quantity;
        existing.profit += it.profit;
        existing.revenue += it.totalPrice;
        map.set(it.productId, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.profit - a.profit).slice(0, 6);
  }, [filteredSales, products]);

  // What-If Simulation calculations
  const simulatedRevenue = Math.round(financials.totalHT * (1 + simulationPriceChange / 100));
  const simulatedCost = Math.round(financials.totalCost * (1 - simulationCostReduction / 100));
  const simulatedProfit = simulatedRevenue - simulatedCost;
  const simulatedMarginPercent = simulatedRevenue > 0 ? Math.round((simulatedProfit / simulatedRevenue) * 100) : 0;
  const profitDelta = simulatedProfit - financials.grossProfit;

  // Export Comprehensive Report CSV
  const handleExportCSV = () => {
    const headers = [
      'Categorie',
      'Unites Vendues',
      'Chiffre Affaires HT (HTG)',
      'Cout Achats (HTG)',
      'Marge Brute (HTG)',
      'Taux Marge (%)',
      'Part CA (%)',
    ];

    const rows = categoryReports.map((c) => [
      `"${c.category}"`,
      c.unitsSold,
      c.revenue.toFixed(2),
      c.cost.toFixed(2),
      c.profit.toFixed(2),
      `${c.marginRate}%`,
      `${c.shareOfTotal}%`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_financier_boissons_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Rapports Financiers & Rentabilité Commerciale
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bilan d'activité, marges par famille de boisson, fiscalité et visualisations graphiques
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Section Selector: All vs Tables vs Charts */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSection === 'all'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vue Complète
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('tables')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSection === 'tables'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bilan Chiffré
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('charts')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeSection === 'charts'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Graphiques</span>
            </button>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === '7d' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7J
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === '30d' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30J
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('90d')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === '90d' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trimestre
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('year')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === 'year' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Année
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          PARTIE 1: LE RAPPORT FINANCIER & BILAN CHIFFRE
          ======================================================== */}
      {(activeSection === 'all' || activeSection === 'tables') && (
        <div className="space-y-6">
          {/* 4 Financial Strips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Chiffre d'Affaires HT</span>
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1 block">
                {formatHTG(financials.totalHT)}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                {financials.count} commandes traitées
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Marge Brute Réalisée</span>
              <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1 block">
                +{formatHTG(financials.grossProfit)}
              </span>
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                <span>Taux de marge :</span>
                <strong className="text-emerald-700 font-mono font-bold">{financials.avgMarginPercent}%</strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">TVA Collectée (20%)</span>
              <span className="text-2xl font-bold font-mono text-indigo-700 tabular-nums mt-1 block">
                {formatHTG(financials.totalTVA)}
              </span>
              <span className="text-xs text-slate-500 mt-1 block font-mono">
                Total TTC : {formatHTG(financials.totalTTC)}
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Panier Moyen Commande</span>
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1 block">
                {formatHTG(financials.avgBasket)} HT
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Coût moyen d'achat : {formatHTG(financials.count > 0 ? Math.round(financials.totalCost / financials.count) : 0)}
              </span>
            </div>
          </div>

          {/* Category Rentability Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Rentabilité Détaillée par Catégorie de Boisson
                </h3>
                <p className="text-xs text-slate-500">
                  Contribution au chiffre d'affaires et taux de marge nette par famille de produit
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {categoryReports.length} catégories analysées
              </span>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Catégorie</th>
                    <th className="py-2.5 px-3 text-center">Unités Livrées</th>
                    <th className="py-2.5 px-3 text-right">CA Réalisé HT</th>
                    <th className="py-2.5 px-3 text-right">Coût d'Achat</th>
                    <th className="py-2.5 px-3 text-right">Marge Brute</th>
                    <th className="py-2.5 px-3 text-right">Taux de Marge</th>
                    <th className="py-2.5 px-3 text-right">Part du CA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {categoryReports.map((c) => (
                    <tr key={c.category} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-sans font-semibold text-slate-900">
                        {c.category}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">
                        {c.unitsSold}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatHTG(c.revenue)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                        {formatHTG(c.cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700 tabular-nums">
                        +{formatHTG(c.profit)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        <span className={`font-bold ${c.marginRate >= 50 ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {c.marginRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-medium text-slate-600">
                        {c.shareOfTotal}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2-Columns: Top Most Profitable Products + Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  Top Références par Marge Nette Générée
                </h3>
                <p className="text-xs text-slate-500">
                  Boissons contribuant le plus au bénéfice net de la période
                </p>
              </div>

              <div className="mt-3 space-y-2.5">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 block">{p.name}</span>
                      <span className="text-slate-500 text-[11px] font-sans">
                        {p.category} · {p.units} unités vendues
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-700 text-xs block tabular-nums">
                        +{formatHTG(p.profit)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        CA: {formatHTG(p.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  Modes de Règlement & Encaissements
                </h3>
                <p className="text-xs text-slate-500">
                  Répartition des encaissements TTC par canal de paiement
                </p>
              </div>

              <div className="mt-3 space-y-3">
                {paymentBreakdown.map((pm, idx) => {
                  const totalAllTTC = financials.totalTTC || 1;
                  const percent = Math.round((pm.total / totalAllTTC) * 100);

                  return (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-slate-800">{pm.label}</span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {formatHTG(pm.total)} TTC ({pm.count} factures)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                        {percent}% des flux totaux
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PARTIE 2: RAPPORT GENERAL AVEC DES GRAPHIQUES (APRES RAPPORT)
          ======================================================== */}
      {(activeSection === 'all' || activeSection === 'charts') && (
        <div id="general-report-charts" className="space-y-6 pt-6 border-t-2 border-slate-200">
          {/* Section Banner Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 block">
                  Rapport Général & Analytics
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Graphiques d'Activité & Trajectoires Financières
                </h3>
                <p className="text-xs text-slate-300">
                  Courbes d'évolution, rentabilité par familles de boissons, quotas commerciaux et simulateur d'optimisation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold">
                Marge Période : {financials.avgMarginPercent}%
              </span>
            </div>
          </div>

          {/* Graphique 1: Trajectoire Temporelle des Ventes & Bénéfice Net */}
          <InteractiveRevenueChart sales={filteredSales} days={days} />

          {/* Grid of 2 Charts: Category Profitability + Sellers Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique 2: Category Profitability Bars */}
            <CategoryProfitabilityChart sales={filteredSales} />

            {/* Graphique 3: Sellers Quota & Performance Bars */}
            <HorizontalSellersChart sellers={sellers} sales={filteredSales} />
          </div>

          {/* Graphique 4: Simulateur d'Optimisation des Marges (What-If Analysis) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Simulateur d'Optimisation des Marges (Sensibilité & Impact)
                </h3>
                <p className="text-xs text-slate-500">
                  Modélisez l'effet d'une hausse tarifaire ou d'une renégociation des coûts d'achat sur vos bénéfices
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
              {/* Sliders */}
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-700">Ajustement des Prix de Vente HT</span>
                    <span className="font-mono tabular-nums font-bold text-blue-600">
                      {simulationPriceChange > 0 ? `+${simulationPriceChange}%` : `${simulationPriceChange}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="20"
                    step="1"
                    value={simulationPriceChange}
                    onChange={(e) => setSimulationPriceChange(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>-10% (Promo)</span>
                    <span>0% (Actuel)</span>
                    <span>+20% (Hausse)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-700">Renégociation Coûts Fournisseurs (COGS)</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-600">
                      -{simulationCostReduction}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={simulationCostReduction}
                    onChange={(e) => setSimulationCostReduction(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>0% (Inchangé)</span>
                    <span>-10% (Volume)</span>
                    <span>-20% (Grossiste)</span>
                  </div>
                </div>

                {(simulationPriceChange !== 0 || simulationCostReduction !== 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSimulationPriceChange(0);
                      setSimulationCostReduction(0);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Réinitialiser les paramètres de simulation
                  </button>
                )}
              </div>

              {/* Simulation Results Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs font-mono">
                <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider font-sans">
                  Projection du Résultat Simulé
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>Chiffre d'Affaires Projeté :</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatHTG(simulatedRevenue)} HT
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Coût d'Achat Projeté :</span>
                  <span className="tabular-nums">{formatHTG(simulatedCost)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Bénéfice Net Projeté :</span>
                  <span className="text-emerald-700 tabular-nums font-bold">
                    +{formatHTG(simulatedProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 pt-1 text-[11px]">
                  <span>Nouveau Taux de Marge :</span>
                  <span className="font-bold text-indigo-700 tabular-nums">
                    {simulatedMarginPercent}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-100/60 border border-emerald-200 text-emerald-900 flex justify-between items-center text-xs mt-2">
                  <span className="font-semibold font-sans">Gain Net Supplémentaire :</span>
                  <span className="font-bold font-mono">
                    {profitDelta >= 0 ? `+${formatHTG(profitDelta)}` : formatHTG(profitDelta)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
