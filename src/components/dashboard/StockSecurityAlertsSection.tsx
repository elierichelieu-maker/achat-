import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
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
  ExternalLink,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';

interface StockSecurityAlertsSectionProps {
  products: Product[];
  onNavigateToStocks: () => void;
  onRestock?: (productId: string, quantity: number, reason?: string) => void;
}

export const StockSecurityAlertsSection: React.FC<StockSecurityAlertsSectionProps> = ({
  products,
  onNavigateToStocks,
  onRestock,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'out' | 'low'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Quick restock modal state
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(20);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);

  // Bulk restock confirmation modal
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // All alerting products (stock <= minStockAlert)
  const alertingProducts = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStockAlert);
  }, [products]);

  // Broken down counts
  const outOfStockCount = useMemo(() => {
    return alertingProducts.filter((p) => p.stock === 0).length;
  }, [alertingProducts]);

  const lowStockCount = useMemo(() => {
    return alertingProducts.filter((p) => p.stock > 0).length;
  }, [alertingProducts]);

  // Total estimated budget to reorder all alerting items
  const totalReorderBudget = useMemo(() => {
    return alertingProducts.reduce((acc, p) => acc + p.reorderQuantity * p.costPrice, 0);
  }, [alertingProducts]);

  // Categories present in alerting items
  const alertCategories = useMemo(() => {
    const set = new Set(alertingProducts.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [alertingProducts]);

  // Filtered list
  const filteredAlerts = useMemo(() => {
    return alertingProducts.filter((p) => {
      // Status filter
      if (filterType === 'out' && p.stock !== 0) return false;
      if (filterType === 'low' && p.stock === 0) return false;

      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

      // Search filter
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

  // Quick Restock submit handler
  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingProduct || restockQty <= 0) return;

    if (onRestock) {
      onRestock(
        restockingProduct.id,
        restockQty,
        `Réassort d'urgence — Alerte sécurité stock (${restockingProduct.name})`
      );
    }

    const prodName = restockingProduct.name;
    setRestockingProduct(null);
    setRestockSuccessMsg(`+${restockQty} unités réapprovisionnées pour "${prodName}".`);
    setTimeout(() => setRestockSuccessMsg(null), 4000);
  };

  // Bulk restock all alerting products
  const handleConfirmBulkRestock = () => {
    if (!onRestock) return;
    alertingProducts.forEach((p) => {
      onRestock(
        p.id,
        p.reorderQuantity,
        `Réapprovisionnement global des alertes (${p.name})`
      );
    });
    setShowBulkConfirm(false);
    setRestockSuccessMsg(
      `Réassort global validé : ${alertingProducts.length} références réapprovisionnées à leur niveau de sécurité.`
    );
    setTimeout(() => setRestockSuccessMsg(null), 5000);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header Banner */}
      <div className="p-5 border-b border-slate-200 bg-linear-to-r from-amber-50/50 via-white to-red-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              outOfStockCount > 0
                ? 'bg-red-100 text-red-700 border-red-200'
                : alertingProducts.length > 0
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}>
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
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Alertes de Sécurité des Stocks
                </h3>
                {alertingProducts.length > 0 ? (
                  <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                    {alertingProducts.length} référence{alertingProducts.length > 1 ? 's' : ''} sous le seuil
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Stocks 100% conformes
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Surveillance active en temps réel des références en rupture ou proches du seuil de rupture
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {alertingProducts.length > 0 && onRestock && (
              <button
                type="button"
                onClick={() => setShowBulkConfirm(true)}
                className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réassort Groupé Conseillé</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateToStocks}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <span>Inventaire Entrepôt</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Success toast notification */}
        {restockSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{restockSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setRestockSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900"
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
              <span className="text-[11px] font-medium text-amber-900 block">Sous Seuil de Sécurité</span>
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
              Toutes ({alertingProducts.length})
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
                placeholder="Filtrer boisson..."
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
              const deficit = Math.max(0, product.minStockAlert - product.stock);
              const percentageOfSafeStock = product.minStockAlert > 0
                ? Math.min(100, Math.round((product.stock / product.minStockAlert) * 100))
                : 0;

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
                            Seuil Critique
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

                    {/* Visual Gauge Bar */}
                    <div className="mt-3.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Niveau de sécurité :</span>
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
                        <span className="text-[10px] text-slate-500 block">Seuil Minimum Défini</span>
                        <span className="font-mono text-sm font-bold text-slate-800 block mt-0.5 tabular-nums">
                          {product.minStockAlert} unités
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block">Déficit Sécurité</span>
                        <span className="font-mono text-xs font-semibold text-red-700 block mt-0.5 tabular-nums">
                          -{deficit} unité{deficit > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block">Réassort Conseillé</span>
                        <span className="font-mono text-xs font-semibold text-slate-900 block mt-0.5 tabular-nums">
                          +{product.reorderQuantity} ({formatHTG(product.reorderQuantity * product.costPrice)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Achat: {formatHTG(product.costPrice)} HT
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRestockingProduct(product);
                          setRestockQty(product.reorderQuantity || 20);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1 whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Réassort ({product.reorderQuantity})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : alertingProducts.length === 0 ? (
          /* Zero Alert State - All stocks healthy */
          <div className="p-8 text-center rounded-xl bg-emerald-50/70 border border-emerald-200/80 max-w-xl mx-auto my-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-emerald-950">
              Aucune rupture ni niveau critique détecté
            </h4>
            <p className="text-xs text-emerald-800 mt-1">
              Toutes les références de boissons gazeuses, fûts de bière, vins et spiritueux sont strictement supérieures à leurs seuils de sécurité.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={onNavigateToStocks}
                className="px-3 py-1.5 text-xs font-medium text-emerald-900 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors shadow-xs"
              >
                Consulter l'ensemble de l'inventaire
              </button>
            </div>
          </div>
        ) : (
          /* Filtered empty state */
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
            Aucune alerte ne correspond à vos critères de recherche.
          </div>
        )}
      </div>

      {/* Quick Restock Modal for an individual alert item */}
      {restockingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Réapprovisionnement d'Urgence
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

            <form onSubmit={handleConfirmRestock} className="mt-4 space-y-4">
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
                  <span className={`font-mono font-bold ${restockingProduct.stock === 0 ? 'text-red-600' : 'text-amber-700'}`}>
                    {restockingProduct.stock} unité{restockingProduct.stock > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Seuil de Sécurité :</span>
                  <span className="font-mono font-bold text-slate-800">{restockingProduct.minStockAlert} unités</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantité de Réapprovisionnement à Ajouter :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setRestockQty(restockingProduct.reorderQuantity || 24)}
                    className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap transition-colors"
                    title="Utiliser la quantité de réassort standard"
                  >
                    Conseillé (+{restockingProduct.reorderQuantity})
                  </button>
                </div>
              </div>

              {/* Simulation of future stock level */}
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs flex items-center justify-between">
                <span className="text-emerald-900 font-medium">Nouveau stock après livraison :</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {restockingProduct.stock + restockQty} unités ({Math.round(((restockingProduct.stock + restockQty) / restockingProduct.minStockAlert) * 100)}% du seuil)
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
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmer l'Entrée en Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Restock All Alerting Items Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Réassort Global Groupé
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
                Cette opération va réapprovisionner simultanément les <strong>{alertingProducts.length} références</strong> en alerte à leur quantité optimale de commande fournisseur.
              </p>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                {alertingProducts.map((p) => (
                  <div key={p.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 block">{p.name}</span>
                      <span className="text-slate-400 text-[11px]">Stock : {p.stock} / Seuil : {p.minStockAlert}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      +{p.reorderQuantity} unités
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
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmer Tout le Réassort</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
