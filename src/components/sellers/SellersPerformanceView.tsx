import React, { useState, useMemo } from 'react';
import { Seller, Sale } from '../../types';
import { Award, TrendingUp, DollarSign, Target, ChevronRight, X, Phone, Mail, ShoppingCart, BarChart3, LayoutGrid } from 'lucide-react';
import { HorizontalSellersChart } from '../charts/HorizontalSellersChart';
import { formatHTG } from '../../utils/formatters';

interface SellersPerformanceViewProps {
  sellers: Seller[];
  sales: Sale[];
  onOpenNewSaleForSeller?: (sellerId: string) => void;
}

type SortCriteria = 'revenue' | 'profit' | 'margin' | 'target';
type ViewLayout = 'both' | 'horizontal' | 'cards';

export const SellersPerformanceView: React.FC<SellersPerformanceViewProps> = ({
  sellers,
  sales,
  onOpenNewSaleForSeller,
}) => {
  const [sortBy, setSortBy] = useState<SortCriteria>('revenue');
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [layoutMode, setLayoutMode] = useState<ViewLayout>('both');

  // Compute performance metrics for each seller
  const sellerStats = useMemo(() => {
    return sellers.map((seller) => {
      const sellerSales = sales.filter((s) => s.sellerId === seller.id && s.status === 'completed');
      const totalRevenue = sellerSales.reduce((acc, s) => acc + s.totalHT, 0);
      const totalCost = sellerSales.reduce((acc, s) => acc + s.totalCost, 0);
      const totalProfit = totalRevenue - totalCost;
      const marginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
      const salesCount = sellerSales.length;
      const averageBasket = salesCount > 0 ? Math.round(totalRevenue / salesCount) : 0;
      const targetAchievement = Math.round((totalRevenue / seller.targetMonthlyRevenue) * 100);
      const commissionEarned = Math.round(totalRevenue * seller.commissionRate);

      return {
        seller,
        totalRevenue,
        totalProfit,
        marginPercent,
        salesCount,
        averageBasket,
        targetAchievement,
        commissionEarned,
        recentSales: sellerSales.slice(0, 5),
      };
    });
  }, [sellers, sales]);

  // Sort based on selected criteria
  const sortedStats = useMemo(() => {
    return [...sellerStats].sort((a, b) => {
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'profit') return b.totalProfit - a.totalProfit;
      if (sortBy === 'margin') return b.marginPercent - a.marginPercent;
      if (sortBy === 'target') return b.targetAchievement - a.targetAchievement;
      return 0;
    });
  }, [sellerStats, sortBy]);

  const maxRevenue = Math.max(...sellerStats.map((s) => s.totalRevenue), 1);

  // Selected seller details
  const activeSellerStat = useMemo(() => {
    if (!selectedSeller) return null;
    return sellerStats.find((s) => s.seller.id === selectedSeller.id) || null;
  }, [selectedSeller, sellerStats]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Performance de l'Équipe Commerciale
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi du chiffre d'affaires, de la rentabilité par vendeur et du respect des marges
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Layout Mode (Horizontal vs Cards) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setLayoutMode('horizontal')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                layoutMode === 'horizontal'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Barres Horizontales</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('cards')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                layoutMode === 'cards'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Fiches</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('both')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                layoutMode === 'both'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vue Complète
            </button>
          </div>

          {/* Sort Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSortBy('revenue')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                sortBy === 'revenue'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CA
            </button>
            <button
              type="button"
              onClick={() => setSortBy('profit')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                sortBy === 'profit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bénéfice Net
            </button>
            <button
              type="button"
              onClick={() => setSortBy('margin')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                sortBy === 'margin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Marge %
            </button>
            <button
              type="button"
              onClick={() => setSortBy('target')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                sortBy === 'target'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              % Objectif
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart View */}
      {(layoutMode === 'horizontal' || layoutMode === 'both') && (
        <HorizontalSellersChart
          sellers={sellers}
          sales={sales}
          onSelectSeller={(s) => setSelectedSeller(s)}
        />
      )}

      {/* Sellers Grid Cards */}
      {(layoutMode === 'cards' || layoutMode === 'both') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedStats.map((item, index) => {
          const { seller, totalRevenue, totalProfit, marginPercent, salesCount, averageBasket, targetAchievement, commissionEarned } = item;
          const isTopPerformer = index === 0;

          return (
            <div
              key={seller.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Bar of card */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <img
                        src={seller.avatar}
                        alt={seller.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs"
                      />
                      {isTopPerformer && (
                        <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-xs" title="Top Vendeur">
                          <Award className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm">{seller.name}</h3>
                        <span className="text-xs text-slate-400 font-mono">#{index + 1}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{seller.role}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSeller(seller)}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Détails</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Key KPIs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">CA Généré HT</span>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums font-mono block mt-0.5">
                      {totalRevenue.toLocaleString('fr-FR')} €
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Profit Dégagé</span>
                    <span className="text-sm font-semibold text-emerald-700 tabular-nums font-mono block mt-0.5">
                      +{totalProfit.toLocaleString('fr-FR')} €
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Marge Moyenne</span>
                    <span className="text-sm font-semibold text-indigo-700 tabular-nums font-mono block mt-0.5">
                      {marginPercent}%
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Panier Moyen</span>
                    <span className="text-sm font-semibold text-slate-800 tabular-nums font-mono block mt-0.5">
                      {averageBasket.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                </div>

                {/* Monthly Target Progress Bar */}
                <div className="space-y-1.5 mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-slate-400" />
                      Objectif Mensuel ({seller.targetMonthlyRevenue.toLocaleString('fr-FR')} €)
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums font-mono">
                      {targetAchievement}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        targetAchievement >= 100
                          ? 'bg-emerald-500'
                          : targetAchievement >= 70
                          ? 'bg-blue-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(targetAchievement, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Card Action */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  {salesCount} transaction{salesCount > 1 ? 's' : ''} conclue{salesCount > 1 ? 's' : ''} · Commission : <strong className="text-slate-700 font-mono tabular-nums">{commissionEarned.toLocaleString('fr-FR')} €</strong>
                </span>
                {onOpenNewSaleForSeller && (
                  <button
                    type="button"
                    onClick={() => onOpenNewSaleForSeller(seller.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    + Assigner une vente
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Seller Detail Drawer / Modal */}
      {selectedSeller && activeSellerStat && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <img
                  src={selectedSeller.avatar}
                  alt={selectedSeller.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-xs"
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedSeller.name}</h3>
                  <p className="text-xs text-slate-500">{selectedSeller.role}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {selectedSeller.email}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedSeller.phone}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeller(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Performance Summary in Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Total CA HT</span>
                <span className="text-base font-bold text-slate-900 tabular-nums font-mono mt-0.5 block">
                  {activeSellerStat.totalRevenue.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Bénéfice Net</span>
                <span className="text-base font-bold text-emerald-700 tabular-nums font-mono mt-0.5 block">
                  +{activeSellerStat.totalProfit.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Marge Commerciale</span>
                <span className="text-base font-bold text-indigo-700 tabular-nums font-mono mt-0.5 block">
                  {activeSellerStat.marginPercent}%
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Commission ({selectedSeller.commissionRate * 100}%)</span>
                <span className="text-base font-bold text-slate-800 tabular-nums font-mono mt-0.5 block">
                  {activeSellerStat.commissionEarned.toLocaleString('fr-FR')} €
                </span>
              </div>
            </div>

            {/* Target gauge */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 mb-6">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-800">
                  Progression vers l'objectif de {selectedSeller.targetMonthlyRevenue.toLocaleString('fr-FR')} €
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {activeSellerStat.targetAchievement}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(activeSellerStat.targetAchievement, 100)}%` }}
                />
              </div>
            </div>

            {/* Recent Deals Table */}
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Dernières Transactions Conclues
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Réf / Date</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3 text-right">Montant HT</th>
                    <th className="py-2.5 px-3 text-right">Profit</th>
                    <th className="py-2.5 px-3 text-right">Marge %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeSellerStat.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-medium text-slate-900 block">{sale.invoiceNumber}</span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(sale.date).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-800 block">{sale.customerName}</span>
                        <span className="text-slate-400 text-[11px]">{sale.customerCompany}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium tabular-nums text-slate-900">
                        {sale.totalHT.toLocaleString('fr-FR')} €
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium tabular-nums text-emerald-700">
                        +{sale.netProfit.toLocaleString('fr-FR')} €
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-indigo-700">
                        {sale.marginPercent}%
                      </td>
                    </tr>
                  ))}
                  {activeSellerStat.recentSales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Aucune vente enregistrée pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSeller(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
