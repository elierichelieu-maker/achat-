import React, { useState, useMemo } from 'react';
import { Product, Seller, Sale, TimeRange, ExchangeRateConfig, AppSettings, getEffectiveStockThreshold } from '../../types';
import { InteractiveRevenueChart } from '../charts/InteractiveRevenueChart';
import { SalesTrendChart } from '../charts/SalesTrendChart';
import { WeeklyRevenueChart } from '../charts/WeeklyRevenueChart';
import { LowStockAlertsSection } from './LowStockAlertsSection';
import { ExpirationAlertsSection } from './ExpirationAlertsSection';
import { TrendingUp, ShoppingBag, Package, Users, AlertTriangle, ArrowUpRight, DollarSign, ArrowRight, Wine, ArrowLeftRight, Printer, Download, Crown, Target, BellRing, X, SlidersHorizontal } from 'lucide-react';
import { formatHTG } from '../../utils/formatters';
import { downloadInvoicePDF } from '../../utils/invoicePrinter';

interface OverviewDashboardProps {
  products: Product[];
  sellers: Seller[];
  sales: Sale[];
  exchangeRates?: ExchangeRateConfig;
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
  onNavigateToSettings?: () => void;
  onOpenNewSale: () => void;
  onNavigateToStocks: () => void;
  onNavigateToSellers: () => void;
  onNavigateToSales: () => void;
  onNavigateToInvoices?: () => void;
  onNavigateToExchange?: () => void;
  onRestock?: (productId: string, quantity: number, reason?: string) => void;
  onUpdateProduct?: (product: Product) => void;
  onPrintSale?: (sale: Sale) => void;
  currentUser?: Seller | null;
  onOpenLoginModal?: () => void;
  isAdmin?: boolean;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  products,
  sellers,
  sales,
  exchangeRates,
  settings,
  onUpdateSettings,
  onNavigateToSettings,
  onOpenNewSale,
  onNavigateToStocks,
  onNavigateToSellers,
  onNavigateToSales,
  onNavigateToInvoices,
  onNavigateToExchange,
  onRestock,
  onUpdateProduct,
  onPrintSale,
  currentUser,
  onOpenLoginModal,
  isAdmin = true,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Days mapping
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  // Filter sales based on days
  const filteredSales = useMemo(() => {
    const now = new Date('2026-10-22T23:59:59Z').getTime();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return sales.filter((s) => new Date(s.date).getTime() >= cutoff);
  }, [sales, days]);

  // Aggregate KPIs (Company-wide)
  const totalRevenue = useMemo(() => filteredSales.reduce((acc, s) => acc + s.totalHT, 0), [filteredSales]);
  const totalCost = useMemo(() => filteredSales.reduce((acc, s) => acc + s.totalCost, 0), [filteredSales]);
  const netProfit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // Personal KPIs for Commercial / Seller
  const userSales = useMemo(() => {
    if (!currentUser) return filteredSales;
    return filteredSales.filter((s) => s.sellerId === currentUser.id);
  }, [filteredSales, currentUser]);
  const userRevenue = useMemo(() => userSales.reduce((acc, s) => acc + s.totalHT, 0), [userSales]);
  const userCommission = useMemo(() => Math.round(userRevenue * (currentUser?.commissionRate || 0.05)), [userRevenue, currentUser]);
  const userTargetPct = useMemo(() => {
    if (!currentUser?.targetMonthlyRevenue) return 0;
    return Math.round((userRevenue / currentUser.targetMonthlyRevenue) * 100);
  }, [userRevenue, currentUser]);

  const [dismissedAlertSig, setDismissedAlertSig] = useState<string | null>(null);
  const globalDefaultThreshold = settings?.defaultStockMinAlert ?? 15;

  // Stock stats using effective per-product threshold
  const stockStats = useMemo(() => {
    let stockValue = 0;
    let criticalItems = 0;
    let outOfStock = 0;

    products.forEach((p) => {
      const { threshold } = getEffectiveStockThreshold(p, globalDefaultThreshold);
      stockValue += p.stock * p.costPrice;
      if (p.stock === 0) outOfStock++;
      else if (p.stock <= threshold) criticalItems++;
    });

    return { stockValue, criticalItems, outOfStock };
  }, [products, globalDefaultThreshold]);

  // Top Sellers of period
  const topSellers = useMemo(() => {
    const map = new Map<string, { seller: Seller; revenue: number; profit: number; count: number }>();
    sellers.forEach((s) => map.set(s.id, { seller: s, revenue: 0, profit: 0, count: 0 }));

    filteredSales.forEach((s) => {
      if (map.has(s.sellerId)) {
        const item = map.get(s.sellerId)!;
        item.revenue += s.totalHT;
        item.profit += s.netProfit;
        item.count += 1;
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }, [sellers, filteredSales]);

  // Alerted stock items (sorted: out of stock first, then custom thresholds, then lowest ratio)
  const alertedProductsList = useMemo(() => {
    return products
      .map((product) => {
        const { threshold, isCustom } = getEffectiveStockThreshold(product, globalDefaultThreshold);
        return {
          product,
          threshold,
          isCustom,
          isOutOfStock: product.stock === 0,
        };
      })
      .filter((item) => item.product.stock <= item.threshold)
      .sort((a, b) => {
        if (a.isOutOfStock !== b.isOutOfStock) return a.isOutOfStock ? -1 : 1;
        if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
        return a.product.stock / a.threshold - b.product.stock / b.threshold;
      });
  }, [products, globalDefaultThreshold]);

  const customThresholdAlertCount = useMemo(
    () => alertedProductsList.filter((i) => i.isCustom).length,
    [alertedProductsList]
  );

  const alertSignature = useMemo(
    () => alertedProductsList.map((i) => `${i.product.id}:${i.product.stock}:${i.threshold}`).join('|'),
    [alertedProductsList]
  );

  // Category & Consignments breakdown
  const categoryStockSummary = useMemo(() => {
    const cats = ['Boissons Gazeuses', 'Bières & Cidres', 'Vins & Champagnes', 'Spiritueux', 'Eaux & Tonics'] as const;
    let totalConsignes = 0;
    const items = cats.map((cat) => {
      const inCat = products.filter((p) => p.category === cat);
      const units = inCat.reduce((sum, p) => sum + p.stock, 0);
      const val = inCat.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
      const consignes = inCat.filter((p) => p.isConsigne).reduce((sum, p) => sum + p.stock, 0);
      totalConsignes += consignes;
      return { cat, units, val, count: inCat.length, consignes };
    });
    return { items, totalConsignes };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* En-tête exécutif unifié : profil actif, titre analytique et sélecteur de période */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {currentUser && (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {currentUser ? `Bonjour, ${currentUser.name}` : 'Tableau de Bord'}
              </h2>
              {currentUser && (
                <span className="text-xs font-medium text-slate-500">
                  · {currentUser.role} · {isAdmin ? 'Administrateur' : 'Commercial'}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Pilotage des ventes, stocks, consignes CHR et marges nettes</span>
              {currentUser && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Objectif mensuel :{' '}
                    <strong className="text-slate-800 font-mono tabular-nums">
                      {formatHTG(currentUser.targetMonthlyRevenue)}
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Sélecteur de période */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/70">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                timeRange === '7d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Jours
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                timeRange === '30d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Jours
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('90d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                timeRange === '90d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trimestre
            </button>
          </div>

          {onOpenLoginModal && (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Changer de compte
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateToSellers}
            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer"
          >
            <span>Performance équipe</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenNewSale}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span>Nouvelle Vente</span>
          </button>
        </div>
      </div>

      {/* Quick Currency Rates Strip */}
      {exchangeRates && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 text-xs">
            <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold text-white">Cours du Jour (Caisse & Devises) :</span>
              <span className="font-mono text-emerald-400">
                1 USD = <strong className="text-white">{exchangeRates.usdToHtgReference.toFixed(2)} HTG</strong>
                <span className="text-slate-400 text-[11px] ml-1.5">(Achat {exchangeRates.usdToHtgBuy.toFixed(2)} / Vente {exchangeRates.usdToHtgSell.toFixed(2)})</span>
              </span>
              <span className="text-slate-600 hidden md:inline">|</span>
              <span className="font-mono text-blue-400">
                1 DOP = <strong className="text-white">{exchangeRates.dopToHtgReference.toFixed(2)} HTG</strong>
                <span className="text-slate-400 text-[11px] ml-1.5">(Achat {exchangeRates.dopToHtgBuy.toFixed(2)} / Vente {exchangeRates.dopToHtgSell.toFixed(2)})</span>
              </span>
            </div>
          </div>

          {onNavigateToExchange && (
            <button
              type="button"
              onClick={onNavigateToExchange}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 shrink-0 self-end sm:self-auto cursor-pointer"
            >
              <span>Convertisseur & Monnaie</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Visual Notification Banner for Low Stock & Custom Per-Product Thresholds */}
      {alertedProductsList.length > 0 && dismissedAlertSig !== alertSignature && (
        <div
          role="alert"
          className={`rounded-xl border p-4 transition-colors ${
            stockStats.outOfStock > 0
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg border shrink-0 ${
                  stockStats.outOfStock > 0
                    ? 'bg-white text-rose-700 border-rose-200'
                    : 'bg-white text-amber-700 border-amber-200'
                }`}
              >
                <BellRing className="w-4 h-4" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm font-bold ${
                      stockStats.outOfStock > 0 ? 'text-red-950' : 'text-amber-950'
                    }`}
                  >
                    Notification Seuil d'Alerte : {alertedProductsList.length} produit
                    {alertedProductsList.length > 1 ? 's' : ''} sous le seuil
                  </span>

                  {customThresholdAlertCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                      <SlidersHorizontal className="w-3 h-3 text-indigo-600" />
                      {customThresholdAlertCount} seuil{customThresholdAlertCount > 1 ? 's' : ''} personnalisé
                      {customThresholdAlertCount > 1 ? 's' : ''} déclenché{customThresholdAlertCount > 1 ? 's' : ''}
                    </span>
                  )}

                  {stockStats.outOfStock > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white">
                      {stockStats.outOfStock} rupture{stockStats.outOfStock > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Product Badges under threshold */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {alertedProductsList.slice(0, 6).map(({ product, threshold, isCustom, isOutOfStock }) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        document.getElementById('low-stock-alerts-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                        isOutOfStock
                          ? 'bg-white text-red-800 border-red-300 hover:bg-red-50'
                          : isCustom
                          ? 'bg-white text-indigo-900 border-indigo-300 hover:bg-indigo-50'
                          : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <span className="font-semibold truncate max-w-[160px]">{product.name}</span>
                      <span className="font-mono font-bold">
                        {product.stock}/{threshold} u.
                      </span>
                      {isCustom && (
                        <span className="text-[9px] font-bold uppercase px-1 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                          Perso
                        </span>
                      )}
                    </button>
                  ))}
                  {alertedProductsList.length > 6 && (
                    <span className="text-[11px] font-semibold text-slate-600 px-1.5">
                      +{alertedProductsList.length - 6} autre{alertedProductsList.length - 6 > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('low-stock-alerts-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs whitespace-nowrap cursor-pointer"
              >
                Réapprovisionner
              </button>
              <button
                type="button"
                onClick={onNavigateToStocks}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ajuster seuils</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissedAlertSig(alertSignature)}
                title="Masquer cette notification pour la session"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue (Company for Admin, Personal for Seller) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>{isAdmin ? "Chiffre d'Affaires Global HT" : "Mon Chiffre d'Affaires HT"}</span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-md">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-2 block">
            {formatHTG(isAdmin ? totalRevenue : userRevenue)}
          </span>
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            {isAdmin ? (
              <>
                <span className="text-slate-700 font-medium tabular-nums">{filteredSales.length} ventes</span>
                <span>·</span>
                <span>Panier : {formatHTG(filteredSales.length > 0 ? Math.round(totalRevenue / filteredSales.length) : 0)}</span>
              </>
            ) : (
              <>
                <span className="text-blue-700 font-semibold tabular-nums">{userSales.length} commandes conclues</span>
                <span>·</span>
                <span>Sur {days} jours</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Profit (Company net profit for Admin, Personal commission for Seller) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>{isAdmin ? "Bénéfice Net Global Entreprise" : "Mes Commissions Personnelles"}</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-bold text-emerald-700 tabular-nums font-mono mt-2 block">
            +{formatHTG(isAdmin ? netProfit : userCommission)}
          </span>
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            {isAdmin ? (
              <>
                <span>Marge commerciale :</span>
                <strong className="text-emerald-700 font-semibold font-mono">{marginPercent}%</strong>
              </>
            ) : (
              <>
                <span>Taux de commission :</span>
                <strong className="text-emerald-700 font-semibold font-mono">
                  {Math.round((currentUser?.commissionRate || 0.05) * 100)}% du CA
                </strong>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Stock Valuation (Admin) or Target/Ready Stock (Seller) */}
        {isAdmin ? (
          <div
            onClick={onNavigateToStocks}
            className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="flex items-center gap-1.5">
                <span>Valeur du Stock Actuel</span>
                <Crown className="w-3 h-3 text-amber-500" />
              </span>
              <span className="p-1.5 bg-slate-100 text-slate-700 rounded-md">
                <Package className="w-4 h-4" />
              </span>
            </div>
            <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-2 block">
              {formatHTG(stockStats.stockValue)}
            </span>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <span>{products.length} références actives</span>
              <span>·</span>
              <span className="text-blue-600 font-medium">Gérer l'inventaire →</span>
            </div>
          </div>
        ) : (
          <div
            onClick={onNavigateToStocks}
            className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Disponibilité Rayon</span>
              <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
                <Package className="w-4 h-4" />
              </span>
            </div>
            <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-2 block">
              {products.filter((p) => p.stock > 0).length} / {products.length} réf.
            </span>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <span className="text-emerald-700 font-medium">En stock pour vente</span>
              <span>·</span>
              <span className="text-blue-600 font-medium">Voir catalogue →</span>
            </div>
          </div>
        )}

        {/* Card 4: Stock Alerts or Target Quota */}
        {isAdmin ? (
          <div
            onClick={onNavigateToStocks}
            className={`p-5 rounded-xl border transition-colors cursor-pointer shadow-2xs ${
              stockStats.criticalItems > 0 || stockStats.outOfStock > 0
                ? 'bg-amber-50/50 border-amber-200'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className={stockStats.criticalItems > 0 ? 'text-amber-900 font-medium' : 'text-slate-500'}>
                Vigilance & Ruptures
              </span>
              <span className="p-1.5 bg-amber-100 text-amber-800 rounded-md">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-amber-600 tabular-nums font-mono">
                {stockStats.criticalItems}
              </span>
              <span className="text-xs text-slate-400">bas</span>
              <span className="text-slate-300">/</span>
              <span className="text-2xl font-bold text-red-600 tabular-nums font-mono">
                {stockStats.outOfStock}
              </span>
              <span className="text-xs text-slate-400">rupture</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-800">
              <span>Fûts & casiers sous seuil min</span>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Mon Objectif Quota</span>
              <span className="p-1.5 bg-amber-50 text-amber-700 rounded-md">
                <Target className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-indigo-700 tabular-nums font-mono">
                {userTargetPct}%
              </span>
              <span className="text-xs text-slate-500">
                sur {formatHTG(currentUser?.targetMonthlyRevenue || 35000)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, userTargetPct)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section Alertes Stock Faible avec seuil défini dans les paramètres et réapprovisionnement rapide */}
      <LowStockAlertsSection
        products={products}
        settings={settings}
        onNavigateToStocks={onNavigateToStocks}
        onNavigateToSettings={onNavigateToSettings}
        onRestock={onRestock}
        onUpdateSettings={onUpdateSettings}
      />

      {/* Section Alertes Dates de Péremption (30 prochains jours) */}
      <ExpirationAlertsSection
        products={products}
        onNavigateToStocks={onNavigateToStocks}
        onUpdateProduct={onUpdateProduct}
        isAdmin={isAdmin}
      />

      {/* Dedicated Recharts Daily Sales Trend Visualizer */}
      <SalesTrendChart sales={sales} />

      {/* Graphique Linéaire de l'Évolution Hebdomadaire du Chiffre d'Affaires (4 Dernières Semaines) */}
      <WeeklyRevenueChart sales={sales} />

      {/* Main Interactive Revenue & Margin Chart */}
      <InteractiveRevenueChart sales={filteredSales} days={days} />

      {/* 2-Column Split: Seller Leaderboard + Live Stock Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sellers Widget */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Top Commerciaux (Période Active)
                </h3>
                <p className="text-xs text-slate-500">
                  Performance en chiffre d'affaires et marge générée
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToSellers}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <span>Voir équipe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {topSellers.map((item, idx) => {
                const sellerMargin = item.revenue > 0 ? Math.round((item.profit / item.revenue) * 100) : 0;

                return (
                  <div
                    key={item.seller.id}
                    className="p-3 bg-slate-50 rounded-lg text-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-4">
                          #{idx + 1}
                        </span>
                        <img
                          src={item.seller.avatar}
                          alt={item.seller.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">{item.seller.name}</span>
                          <span className="text-slate-500 text-[11px]">{item.seller.role}</span>
                        </div>
                      </div>

                      <div className="text-right tabular-nums">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatHTG(item.revenue)} HT
                        </span>
                        <div className="flex items-center justify-end gap-1.5 text-[11px]">
                          <span className="text-emerald-700 font-medium font-mono">+{formatHTG(item.profit)}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-indigo-700 font-mono font-semibold">{sellerMargin}% marge</span>
                        </div>
                      </div>
                    </div>

                    {/* Horizontal visual progress bar */}
                    <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            4,
                            Math.round((item.revenue / Math.max(...topSellers.map((s) => s.revenue), 1)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Commission et classements calculés en temps réel</span>
            <button
              type="button"
              onClick={onNavigateToSellers}
              className="text-xs text-slate-700 hover:text-slate-900 font-medium"
            >
              Classement complet →
            </button>
          </div>
        </div>

        {/* Inventory Distribution & Consignments */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Répartition des Stocks & Consignes CHR
                </h3>
                <p className="text-xs text-slate-500">
                  Volumes d'inventaire et fûts inox consignés
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToStocks}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <span>Inventaire ({products.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Consignment Banner */}
            <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded">
                  <Package className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-semibold text-amber-950 block">Contenants & Fûts Consignés</span>
                  <span className="text-amber-800 text-[11px]">Fûts inox 30L/20L et casiers verre en rotation</span>
                </div>
              </div>
              <span className="font-mono font-bold text-amber-900 text-sm tabular-nums">
                {categoryStockSummary.totalConsignes} fûts/casiers
              </span>
            </div>

            {/* Category Bars */}
            <div className="mt-3 space-y-2.5">
              {categoryStockSummary.items.map((catItem) => {
                const totalStockAll = products.reduce((sum, p) => sum + p.stock, 0);
                const percent = totalStockAll > 0 ? Math.round((catItem.units / totalStockAll) * 100) : 0;

                return (
                  <div key={catItem.cat} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800">{catItem.cat}</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {catItem.units} unités · {formatHTG(catItem.val)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Rotation suivie en temps réel</span>
            <button
              type="button"
              onClick={onNavigateToStocks}
              className="text-xs text-slate-700 hover:text-slate-900 font-medium"
            >
              Voir détails par référence →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Sales Mini-Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Dernières Transactions Enregistrées
            </h3>
            <p className="text-xs text-slate-500">
              Flux en direct des ventes avec calcul de marge unitaire
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onNavigateToInvoices && (
              <button
                type="button"
                onClick={onNavigateToInvoices}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
              >
                <span>Factures & Règlements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateToSales}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <span>Historique Ventes ({sales.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">N° Facture</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Commercial</th>
                <th className="py-2.5 px-3 text-right">Montant HT</th>
                <th className="py-2.5 px-3 text-right">Profit Net</th>
                <th className="py-2.5 px-3 text-right">Marge %</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.slice(0, 5).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{s.invoiceNumber}</td>
                  <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                    {new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {s.customerName} {s.customerCompany ? `(${s.customerCompany})` : ''}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{s.sellerName}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                    {formatHTG(s.totalHT)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-emerald-700">
                    +{formatHTG(s.netProfit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-indigo-700">
                    {s.marginPercent}%
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadInvoicePDF(s, undefined, 'a4')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors shadow-2xs"
                        title="Télécharger directement la facture en PDF"
                      >
                        <Download className="w-3 h-3 text-blue-600" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      {onPrintSale && (
                        <button
                          type="button"
                          onClick={() => onPrintSale(s)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded border border-slate-300 transition-colors shadow-2xs"
                          title="Imprimer directement le Reçu ou Facture"
                        >
                          <Printer className="w-3 h-3 text-amber-600" />
                          <span>Imprimer</span>
                        </button>
                      )}
                    </div>
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
