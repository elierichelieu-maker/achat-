import React, { useState, useMemo } from 'react';
import { Product, AppSettings } from '../../types';
import {
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Package,
  Layers,
  Search,
  Check,
  X,
  Settings,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';

interface LowStockAlertsSectionProps {
  products: Product[];
  settings?: AppSettings;
  onNavigateToStocks: () => void;
  onNavigateToSettings?: () => void;
  onRestock?: (productId: string, quantity: number, reason?: string) => void;
  onUpdateSettings?: (settings: AppSettings) => void;
}

export const LowStockAlertsSection: React.FC<LowStockAlertsSectionProps> = ({
  products,
  settings,
  onNavigateToStocks,
  onNavigateToSettings,
  onRestock,
  onUpdateSettings,
}) => {
  // Threshold defined in the parameters (defaults to 15 if not configured)
  const threshold = settings?.defaultStockMinAlert ?? 15;

  const [filterType, setFilterType] = useState<'all' | 'out' | 'low'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick restock modal state for an individual item
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(24);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);

  // Bulk restock confirmation modal
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Inline threshold adjustment modal
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [tempThreshold, setTempThreshold] = useState<number>(threshold);

  // Products whose stock level is less than or equal to the threshold defined in the settings
  // (Also includes any product whose stock is below its individual minStockAlert if set)
  const alertingProducts = useMemo(() => {
    return products.filter((p) => {
      const effectiveMin = p.minStockAlert > 0 ? Math.max(p.minStockAlert, threshold) : threshold;
      return p.stock <= effectiveMin;
    });
  }, [products, threshold]);

  // Out of stock (0 units)
  const outOfStockCount = useMemo(() => {
    return alertingProducts.filter((p) => p.stock === 0).length;
  }, [alertingProducts]);

  // Low stock (0 < stock <= threshold)
  const lowStockCount = useMemo(() => {
    return alertingProducts.filter((p) => p.stock > 0).length;
  }, [alertingProducts]);

  // Total estimated budget to reorder all alerting items to safe levels
  const totalReorderBudget = useMemo(() => {
    return alertingProducts.reduce((acc, p) => {
      const qty = p.reorderQuantity || 24;
      return acc + qty * p.costPrice;
    }, 0);
  }, [alertingProducts]);

  // Categories present in alerting items
  const alertCategories = useMemo(() => {
    const set = new Set(alertingProducts.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [alertingProducts]);

  // Filtered list based on active filter, category and search
  const filteredAlerts = useMemo(() => {
    return alertingProducts.filter((p) => {
      if (filterType === 'out' && p.stock !== 0) return false;
      if (filterType === 'low' && p.stock === 0) return false;
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchSku = p.sku.toLowerCase().includes(query);
        const matchCat = p.category.toLowerCase().includes(query);
        if (!matchName && !matchSku && !matchCat) return false;
      }

      return true;
    });
  }, [alertingProducts, filterType, selectedCategory, searchQuery]);

  // Fast 1-click restock handler (no modal needed)
  const handleQuickRestockImmediate = (product: Product, quantity: number) => {
    if (!onRestock) return;
    onRestock(
      product.id,
      quantity,
      `Réapprovisionnement rapide — Alerte Stock Faible (${product.name})`
    );
    setRestockSuccessMsg(
      `+${quantity} unités ajoutées avec succès pour "${product.name}". Nouveau stock : ${product.stock + quantity} unités.`
    );
    setTimeout(() => setRestockSuccessMsg(null), 4500);
  };

  // Restock modal submit handler
  const handleConfirmRestockModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingProduct || restockQty <= 0) return;

    if (onRestock) {
      onRestock(
        restockingProduct.id,
        restockQty,
        `Réapprovisionnement d'urgence — Alerte Stock Faible (${restockingProduct.name})`
      );
    }

    const prodName = restockingProduct.name;
    const finalStock = restockingProduct.stock + restockQty;
    setRestockingProduct(null);
    setRestockSuccessMsg(
      `+${restockQty} unités réapprovisionnées pour "${prodName}". Nouveau stock disponible : ${finalStock} unités.`
    );
    setTimeout(() => setRestockSuccessMsg(null), 4500);
  };

  // Bulk restock all alerting products
  const handleConfirmBulkRestock = () => {
    if (!onRestock) return;
    alertingProducts.forEach((p) => {
      const qty = p.reorderQuantity || 24;
      onRestock(
        p.id,
        qty,
        `Réapprovisionnement global des alertes stock faible (${p.name})`
      );
    });
    setShowBulkConfirm(false);
    setRestockSuccessMsg(
      `Réapprovisionnement global validé : ${alertingProducts.length} références remises à niveau avec succès.`
    );
    setTimeout(() => setRestockSuccessMsg(null), 5000);
  };

  // Save new threshold to settings
  const handleSaveThreshold = (newVal: number) => {
    if (!settings || !onUpdateSettings) {
      setShowThresholdModal(false);
      return;
    }
    const updated: AppSettings = {
      ...settings,
      defaultStockMinAlert: newVal,
      updatedAt: new Date().toISOString(),
    };
    onUpdateSettings(updated);
    setShowThresholdModal(false);
    setRestockSuccessMsg(
      `Seuil d'alerte stock faible mis à jour : ${newVal} unités. L'affichage s'adapte automatiquement.`
    );
    setTimeout(() => setRestockSuccessMsg(null), 4000);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header Banner */}
      <div className="p-5 border-b border-slate-200 bg-linear-to-r from-amber-50/60 via-white to-red-50/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                outOfStockCount > 0
                  ? 'bg-red-100 text-red-700 border-red-200 shadow-2xs'
                  : alertingProducts.length > 0
                  ? 'bg-amber-100 text-amber-800 border-amber-200 shadow-2xs'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-2xs'
              }`}
            >
              {outOfStockCount > 0 ? (
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              ) : alertingProducts.length > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Alertes Stock Faible</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 hidden sm:inline-block" />
                </h3>

                {alertingProducts.length > 0 ? (
                  <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                    {alertingProducts.length} produit{alertingProducts.length > 1 ? 's' : ''} sous le seuil
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Stocks 100% conformes
                  </span>
                )}

                {/* Active Threshold Indicator Badge */}
                <button
                  type="button"
                  onClick={() => {
                    setTempThreshold(threshold);
                    setShowThresholdModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  title="Modifier le seuil d'alerte configuré dans les paramètres"
                >
                  <SlidersHorizontal className="w-3 h-3 text-amber-600" />
                  <span>Seuil : <strong>{threshold} unités</strong></span>
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                Surveillance automatique des références dont le stock est inférieur ou égal au seuil de{' '}
                <strong className="text-slate-700 font-mono">{threshold} unités</strong> défini dans les paramètres.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {alertingProducts.length > 0 && onRestock && (
              <button
                type="button"
                onClick={() => setShowBulkConfirm(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 border border-amber-500/30 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réapprovisionner Tout le Stock Faible</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateToStocks}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <span>Inventaire Entrepôt</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Success toast notification */}
        {restockSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{restockSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setRestockSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3 Status KPI Strips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200/80">
          <div className="p-3 bg-white rounded-lg border border-red-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-red-900 block">Ruptures Totales (Stock 0)</span>
              <span className="text-xl font-bold font-mono text-red-600 tabular-nums">
                {outOfStockCount}
              </span>
            </div>
            <span className="p-2 bg-red-50 text-red-700 rounded-lg">
              <AlertOctagon className="w-4 h-4" />
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-amber-900 block">
                Stock Faible (&le; {threshold} u.)
              </span>
              <span className="text-xl font-bold font-mono text-amber-600 tabular-nums">
                {lowStockCount}
              </span>
            </div>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-600 block">Budget Réassort Recommandé</span>
              <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                {formatHTG(totalReorderBudget)} HT
              </span>
            </div>
            <span className="p-2 bg-slate-50 text-slate-700 rounded-lg">
              <Package className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {alertingProducts.length > 0 && (
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({alertingProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('out')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                filterType === 'out'
                  ? 'bg-white text-red-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>Ruptures ({outOfStockCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('low')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                filterType === 'low'
                  ? 'bg-white text-amber-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Sous Seuil ({lowStockCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            {/* Category Dropdown */}
            {alertCategories.length > 2 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none"
              >
                {alertCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'Toutes catégories' : cat}
                  </option>
                ))}
              </select>
            )}

            {/* Quick Search */}
            <div className="relative min-w-[160px] max-w-[240px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer boisson en alerte..."
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Alerts Grid */}
      <div className="p-5">
        {filteredAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAlerts.map((product) => {
              const isOut = product.stock === 0;
              const productThreshold = product.minStockAlert > 0
                ? Math.max(product.minStockAlert, threshold)
                : threshold;
              const deficit = Math.max(0, productThreshold - product.stock);
              const percentageOfSafeStock = productThreshold > 0
                ? Math.min(100, Math.round((product.stock / productThreshold) * 100))
                : 0;
              const defaultReorder = product.reorderQuantity || 24;

              return (
                <div
                  key={product.id}
                  className={`rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                    isOut
                      ? 'bg-red-50/40 border-red-300 hover:border-red-400 shadow-xs'
                      : 'bg-amber-50/30 border-amber-300 hover:border-amber-400 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Top Status & Badge Line */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-red-600 text-white shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            Rupture Totale
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-600 text-white shadow-xs">
                            <AlertTriangle className="w-3 h-3" />
                            Stock Faible
                          </span>
                        )}

                        {product.isConsigne && (
                          <span className="text-[10px] font-semibold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-1.5 py-0.5 rounded">
                            Fût Consigné
                          </span>
                        )}

                        {product.alcoholDegree !== undefined && product.alcoholDegree > 0 && (
                          <span className="text-[10px] font-semibold text-purple-800 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded">
                            {product.alcoholDegree}% vol
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono font-medium text-slate-500">
                        {product.sku}
                      </span>
                    </div>

                    {/* Product Name & Format */}
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {product.name}
                    </h4>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>{product.category}</span>
                      {product.volume && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-slate-700">{product.volume}</span>
                        </>
                      )}
                    </div>

                    {/* Visual Gauge Bar relative to threshold */}
                    <div className="mt-3.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Niveau de sécurité ({productThreshold} u.) :</span>
                        <span className="font-mono font-bold text-slate-800 tabular-nums">
                          {percentageOfSafeStock}% du seuil
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/90 rounded-full h-2 overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOut
                              ? 'bg-red-600 w-0'
                              : percentageOfSafeStock <= 35
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${percentageOfSafeStock}%` }}
                        />
                      </div>
                    </div>

                    {/* Detailed Metrics Table */}
                    <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-200/80 text-xs">
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block">Stock Disponible</span>
                        <span
                          className={`font-mono text-sm font-bold block mt-0.5 tabular-nums ${
                            isOut ? 'text-red-600' : 'text-amber-700'
                          }`}
                        >
                          {product.stock} unité{product.stock > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block">Seuil d'Alerte</span>
                        <span className="font-mono text-sm font-bold text-slate-800 block mt-0.5 tabular-nums">
                          {productThreshold} unités
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block">Déficit de Stock</span>
                        <span className="font-mono text-xs font-semibold text-red-700 block mt-0.5 tabular-nums">
                          -{deficit} unité{deficit > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block">Réassort Conseillé</span>
                        <span className="font-mono text-xs font-semibold text-slate-900 block mt-0.5 tabular-nums">
                          +{defaultReorder} ({formatHTG(defaultReorder * product.costPrice)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar with Quick Restock Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2">
                    {/* Quick 1-click preset badges */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Ajout rapide en 1 clic :</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickRestockImmediate(product, 12)}
                          className="px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                          title="Ajouter immédiatement 12 unités"
                        >
                          +12 u.
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickRestockImmediate(product, 24)}
                          className="px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                          title="Ajouter immédiatement 24 unités (1 caisse standard)"
                        >
                          +24 u.
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickRestockImmediate(product, 48)}
                          className="px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors"
                          title="Ajouter immédiatement 48 unités"
                        >
                          +48 u.
                        </button>
                      </div>
                    </div>

                    {/* Main "Réapprovisionner rapidement" Button */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 font-mono">
                        P.U. : {formatHTG(product.costPrice)} HT
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setRestockingProduct(product);
                          setRestockQty(defaultReorder);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        title="Ouvrir la saisie de réapprovisionnement pour ce produit"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Réapprovisionner rapidement (+{defaultReorder})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : alertingProducts.length === 0 ? (
          /* Zero Alert State - All stocks healthy above threshold */
          <div className="p-8 text-center rounded-xl bg-emerald-50/70 border border-emerald-200/80 max-w-xl mx-auto my-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-emerald-950">
              Aucun produit en alerte de stock faible
            </h4>
            <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
              Toutes les références de boissons gazeuses, bières, fûts et vins possèdent actuellement un niveau de stock supérieur au seuil de{' '}
              <strong className="font-mono">{threshold} unités</strong> configuré dans vos paramètres.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTempThreshold(threshold);
                  setShowThresholdModal(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Ajuster le seuil d'alerte ({threshold} u.)
              </button>
              <button
                type="button"
                onClick={onNavigateToStocks}
                className="px-3 py-1.5 text-xs font-medium text-emerald-900 bg-emerald-100/80 border border-emerald-300 rounded-lg hover:bg-emerald-200/80 transition-colors shadow-2xs"
              >
                Consulter tout l'inventaire
              </button>
            </div>
          </div>
        ) : (
          /* Filtered empty state */
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
            Aucun produit en stock faible ne correspond à vos filtres actuels.
          </div>
        )}
      </div>

      {/* Modal: Réapprovisionnement Rapide d'un Produit */}
      {restockingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Réapprovisionnement Rapide
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {restockingProduct.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestockingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestockModal} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Référence SKU :</span>
                  <span className="font-mono font-medium text-slate-800">{restockingProduct.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Format / Volume :</span>
                  <span className="font-medium text-slate-800">{restockingProduct.volume || 'Format standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stock Actuel :</span>
                  <span
                    className={`font-mono font-bold ${
                      restockingProduct.stock === 0 ? 'text-red-600' : 'text-amber-700'
                    }`}
                  >
                    {restockingProduct.stock} unité{restockingProduct.stock > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Seuil Paramètres :</span>
                  <span className="font-mono font-bold text-slate-800">{threshold} unités</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantité à ajouter au stock :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setRestockQty(restockingProduct.reorderQuantity || 24)}
                    className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap transition-colors"
                    title="Quantité de réassort standard"
                  >
                    Conseillé (+{restockingProduct.reorderQuantity || 24})
                  </button>
                </div>
              </div>

              {/* Simulation of future stock level */}
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs flex items-center justify-between">
                <span className="text-emerald-900 font-medium">Nouveau stock après livraison :</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {restockingProduct.stock + restockQty} unités ({Math.round(((restockingProduct.stock + restockQty) / threshold) * 100)}% du seuil)
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockingProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmer le Réapprovisionnement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Restock All Alerting Items */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Réapprovisionnement Global
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Commander les réassorts conseillés
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Cette opération va réapprovisionner simultanément les{' '}
                <strong>{alertingProducts.length} références</strong> en alerte sous le seuil de{' '}
                <strong>{threshold} unités</strong>.
              </p>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                {alertingProducts.map((p) => (
                  <div key={p.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 block">{p.name}</span>
                      <span className="text-slate-400 text-[11px]">
                        Stock : {p.stock} / Seuil : {threshold}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      +{p.reorderQuantity || 24} unités
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">
                <span>Coût total estimé des commandes :</span>
                <span className="font-mono font-bold text-sm">
                  {formatHTG(totalReorderBudget)} HT
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkRestock}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmer Tout le Réapprovisionnement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Threshold Setting from Dashboard */}
      {showThresholdModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <SlidersHorizontal className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Seuil d'Alerte Stock Faible
                  </h3>
                  <p className="text-[11px] text-slate-500">Paramètre d'inventaire global</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowThresholdModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Définissez la quantité minimale en deçà de laquelle une boisson entre automatiquement dans la section « Alertes Stock Faible » :
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Seuil minimal d'alerte (unités) :
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={tempThreshold}
                  onChange={(e) => setTempThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1.5">Valeurs courantes recommandées :</span>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15, 20, 30].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTempThreshold(val)}
                      className={`px-2 py-1 rounded text-xs font-mono font-bold transition-colors ${
                        tempThreshold === val
                          ? 'bg-amber-500 text-slate-950 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {val} u.
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowThresholdModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleSaveThreshold(tempThreshold)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Enregistrer le Seuil</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// Also export alias for backward compatibility
export const StockSecurityAlertsSection = LowStockAlertsSection;
