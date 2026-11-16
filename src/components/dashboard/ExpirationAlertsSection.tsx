import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import {
  CalendarClock,
  AlertOctagon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Search,
  Package,
  Calendar,
  Edit3,
  Check,
  X,
  Tag,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';

interface ExpirationAlertsSectionProps {
  products: Product[];
  onNavigateToStocks: () => void;
  onUpdateProduct?: (product: Product) => void;
  isAdmin?: boolean;
}

export function getDaysUntilExpiration(expirationDate?: string): number | null {
  if (!expirationDate || !expirationDate.trim()) return null;
  const parsed = new Date(expirationDate.trim() + (expirationDate.includes('T') ? '' : 'T00:00:00'));
  if (isNaN(parsed.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);

  const diffMs = parsed.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export const ExpirationAlertsSection: React.FC<ExpirationAlertsSectionProps> = ({
  products,
  onNavigateToStocks,
  onUpdateProduct,
  isAdmin = true,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expired' | 'critical' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExpiryProduct, setEditingExpiryProduct] = useState<Product | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Also allow assigning an expiration date to any product that lacks one
  const [assigningProductId, setAssigningProductId] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Enrich products with expiration delta
  const productsWithExpiry = useMemo(() => {
    return products
      .map((p) => ({
        product: p,
        daysRemaining: getDaysUntilExpiration(p.expirationDate),
      }))
      .filter((item): item is { product: Product; daysRemaining: number } => item.daysRemaining !== null);
  }, [products]);

  // Expiring within next 30 days or already expired
  const alertingItems = useMemo(() => {
    return productsWithExpiry
      .filter((item) => item.daysRemaining <= 30)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [productsWithExpiry]);

  const expiredCount = useMemo(
    () => alertingItems.filter((item) => item.daysRemaining < 0).length,
    [alertingItems]
  );

  const criticalCount = useMemo(
    () => alertingItems.filter((item) => item.daysRemaining >= 0 && item.daysRemaining <= 7).length,
    [alertingItems]
  );

  const upcomingCount = useMemo(
    () => alertingItems.filter((item) => item.daysRemaining > 7 && item.daysRemaining <= 30).length,
    [alertingItems]
  );

  const totalValueAtRisk = useMemo(() => {
    return alertingItems.reduce(
      (acc, { product }) => acc + Math.max(0, product.stock) * product.costPrice,
      0
    );
  }, [alertingItems]);

  const filteredItems = useMemo(() => {
    return alertingItems.filter(({ product, daysRemaining }) => {
      if (filterType === 'expired' && daysRemaining >= 0) return false;
      if (filterType === 'critical' && (daysRemaining < 0 || daysRemaining > 7)) return false;
      if (filterType === 'upcoming' && (daysRemaining <= 7 || daysRemaining > 30)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(q);
        const matchSku = product.sku.toLowerCase().includes(q);
        const matchBatch = (product.batchNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBatch) return false;
      }

      return true;
    });
  }, [alertingItems, filterType, searchQuery]);

  const openEditModal = (product: Product) => {
    setEditingExpiryProduct(product);
    setNewExpirationDate(product.expirationDate || '');
    setNewBatchNumber(product.batchNumber || '');
    setNewStockQty(product.stock);
  };

  const handleSaveExpiryUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpiryProduct || !onUpdateProduct) return;

    const updated: Product = {
      ...editingExpiryProduct,
      stock: Math.max(0, newStockQty),
      updatedAt: new Date().toISOString(),
    };
    if (newExpirationDate.trim()) {
      updated.expirationDate = newExpirationDate.trim();
    } else {
      delete updated.expirationDate;
    }
    if (newBatchNumber.trim()) {
      updated.batchNumber = newBatchNumber.trim().toUpperCase();
    } else {
      delete updated.batchNumber;
    }

    onUpdateProduct(updated);
    setFeedbackMsg(
      newExpirationDate
        ? `Date de péremption et lot mis à jour pour "${updated.name}" (${new Date(newExpirationDate + 'T00:00:00').toLocaleDateString('fr-FR')}).`
        : `Date de péremption retirée pour "${updated.name}".`
    );
    setEditingExpiryProduct(null);
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  const handleAssignExpiryToExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningProductId || !newExpirationDate || !onUpdateProduct) return;
    const target = products.find((p) => p.id === assigningProductId);
    if (!target) return;

    const updated: Product = {
      ...target,
      expirationDate: newExpirationDate.trim(),
      updatedAt: new Date().toISOString(),
    };
    if (newBatchNumber.trim()) {
      updated.batchNumber = newBatchNumber.trim().toUpperCase();
    } else if (!target.batchNumber) {
      delete updated.batchNumber;
    }

    onUpdateProduct(updated);
    setFeedbackMsg(`Date de péremption enregistrée pour "${updated.name}".`);
    setShowAssignModal(false);
    setAssigningProductId('');
    setNewExpirationDate('');
    setNewBatchNumber('');
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header Banner */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                expiredCount > 0 || criticalCount > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : alertingItems.length > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {expiredCount > 0 ? (
                <AlertOctagon className="w-5 h-5" />
              ) : alertingItems.length > 0 ? (
                <CalendarClock className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Suivi des Dates de Péremption &amp; Alertes (30 Jours)
                </h3>
                <span className="text-slate-300" aria-hidden="true">·</span>
                {alertingItems.length > 0 ? (
                  <span className="text-xs font-semibold font-mono tabular-nums text-rose-700">
                    {alertingItems.length} lot{alertingItems.length > 1 ? 's' : ''} à contrôler
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700">
                    Aucune expiration ≤ 30 jours
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Contrôle automatique des DLUO / DLC sur les boissons, fûts et caisses pour anticiper les démarques et prioriser la rotation FEFO.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && onUpdateProduct && (
              <button
                type="button"
                onClick={() => {
                  setAssigningProductId(products[0]?.id || '');
                  const d = new Date();
                  d.setDate(d.getDate() + 20);
                  setNewExpirationDate(d.toISOString().split('T')[0]);
                  setNewBatchNumber('');
                  setShowAssignModal(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                <span>Définir une DLUO</span>
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateToStocks}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <span>Gérer les lots en Stock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Success Notification */}
        {feedbackMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{feedbackMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 Summary KPI Strips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200/80">
          <div className="p-3 bg-white rounded-lg border border-rose-200/90 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-rose-900 block">Lots Expirés</span>
              <span className="text-xl font-bold font-mono text-rose-600 tabular-nums">
                {expiredCount}
              </span>
            </div>
            <span className="p-2 bg-rose-50 text-rose-700 rounded-lg">
              <AlertOctagon className="w-4 h-4" />
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-orange-200/90 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-orange-900 block">Critique (&le; 7 jours)</span>
              <span className="text-xl font-bold font-mono text-orange-600 tabular-nums">
                {criticalCount}
              </span>
            </div>
            <span className="p-2 bg-orange-50 text-orange-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-amber-200/90 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-amber-900 block">Sous 8 à 30 jours</span>
              <span className="text-xl font-bold font-mono text-amber-600 tabular-nums">
                {upcomingCount}
              </span>
            </div>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-600 block">Valeur Stock à Risque</span>
              <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                {formatHTG(totalValueAtRisk)}
              </span>
            </div>
            <span className="p-2 bg-slate-50 text-slate-700 rounded-lg">
              <Package className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      {alertingItems.length > 0 && (
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous &le; 30j ({alertingItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('expired')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                filterType === 'expired'
                  ? 'bg-white text-rose-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>Expirés ({expiredCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('critical')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                filterType === 'critical'
                  ? 'bg-white text-orange-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Critique &le; 7j ({criticalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('upcoming')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                filterType === 'upcoming'
                  ? 'bg-white text-amber-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>8-30 jours ({upcomingCount})</span>
            </button>
          </div>

          <div className="relative min-w-[180px] max-w-[260px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher produit, SKU, lot..."
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 text-slate-800"
            />
          </div>
        </div>
      )}

      {/* Expiring Products Grid */}
      <div className="p-5">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(({ product, daysRemaining }) => {
              const isExpired = daysRemaining < 0;
              const isCritical = daysRemaining >= 0 && daysRemaining <= 7;
              const formattedDate = product.expirationDate
                ? new Date(product.expirationDate + (product.expirationDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '-';

              const progressPct = isExpired
                ? 100
                : Math.min(100, Math.max(8, Math.round(((30 - daysRemaining) / 30) * 100)));

              return (
                <div
                  key={product.id}
                  className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                    isExpired
                      ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400 shadow-xs'
                      : isCritical
                      ? 'bg-orange-50/50 border-orange-300 hover:border-orange-400 shadow-xs'
                      : 'bg-amber-50/30 border-amber-300 hover:border-amber-400 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Urgency Badge + SKU */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
                          <AlertOctagon className="w-3 h-3" />
                          Expiré ({Math.abs(daysRemaining)}j)
                        </span>
                      ) : daysRemaining === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white">
                          Expire Aujourd&apos;hui
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-600 text-white shadow-2xs">
                          <Clock className="w-3 h-3" />
                          Urgent : J-{daysRemaining}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white shadow-2xs">
                          <CalendarClock className="w-3 h-3" />
                          Expire dans {daysRemaining} jours
                        </span>
                      )}

                      <span className="text-[11px] font-mono font-medium text-slate-500">
                        {product.sku}
                      </span>
                    </div>

                    {/* Product Name & Batch */}
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {product.name}
                    </h4>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{product.category}</span>
                      {product.volume && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-slate-700">{product.volume}</span>
                        </>
                      )}
                      {product.batchNumber && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5 font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            {product.batchNumber}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Time Proximity Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Échéance DLUO / DLC :</span>
                        <span
                          className={`font-mono font-bold ${
                            isExpired ? 'text-rose-700' : isCritical ? 'text-orange-700' : 'text-amber-800'
                          }`}
                        >
                          {formattedDate}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/90 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isExpired ? 'bg-rose-600' : isCritical ? 'bg-orange-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Stock & Value At Risk */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-200/70 text-xs">
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block">Stock Concerné</span>
                        <span className="font-mono text-sm font-bold text-slate-900 block mt-0.5 tabular-nums">
                          {product.stock} unité{product.stock > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block">Valeur Exposée (Achat)</span>
                        <span className="font-mono text-xs font-bold text-rose-700 block mt-0.5 tabular-nums">
                          {formatHTG(product.stock * product.costPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">
                      {product.isConsigne ? 'Emballage consigné' : 'Rotation FEFO recommandée'}
                    </span>
                    {isAdmin && onUpdateProduct ? (
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Renouveler Lot / DLUO</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onNavigateToStocks}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        Voir en stock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : alertingItems.length === 0 ? (
          <div className="p-7 text-center rounded-xl bg-emerald-50/70 border border-emerald-200/80 max-w-xl mx-auto my-2">
            <div className="w-11 h-11 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-emerald-950">
              Aucune date de péremption proche détectée
            </h4>
            <p className="text-xs text-emerald-800 mt-1">
              {productsWithExpiry.length > 0
                ? `${productsWithExpiry.length} référence(s) suivie(s) possèdent toutes une date de péremption supérieure à 30 jours.`
                : 'Aucune date de péremption (DLUO) n\'est encore renseignée sur vos produits.'}
            </p>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
            Aucun lot expirant ne correspond à vos filtres actuels.
          </div>
        )}
      </div>

      {/* Modal: Update Expiration Date / Batch / Stock */}
      {editingExpiryProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Mise à jour Lot & Péremption
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {editingExpiryProduct.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpiryProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpiryUpdate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nouvelle Date de Péremption (DLUO / DLC)
                </label>
                <input
                  type="date"
                  value={newExpirationDate}
                  onChange={(e) => setNewExpirationDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Numéro de Lot
                  </label>
                  <input
                    type="text"
                    value={newBatchNumber}
                    onChange={(e) => setNewBatchNumber(e.target.value.toUpperCase())}
                    placeholder="ex: LOT-2026-B"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Stock Ajusté (unités)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newStockQty}
                    onChange={(e) => setNewStockQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingExpiryProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer le Lot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign DLUO to any product */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Suivi Péremption Produit
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Définir une Date de Péremption (DLUO)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignExpiryToExisting} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Produit du Catalogue
                </label>
                <select
                  value={assigningProductId}
                  onChange={(e) => setAssigningProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) {p.expirationDate ? `[DLUO: ${p.expirationDate}]` : '[Aucune DLUO]'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Date de Péremption
                  </label>
                  <input
                    type="date"
                    value={newExpirationDate}
                    onChange={(e) => setNewExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Numéro de Lot (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={newBatchNumber}
                    onChange={(e) => setNewBatchNumber(e.target.value.toUpperCase())}
                    placeholder="ex: LOT-2026-A"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Appliquer la DLUO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
