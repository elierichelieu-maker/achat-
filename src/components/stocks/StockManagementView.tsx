import React, { useState, useMemo } from 'react';
import { Product, StockMovement } from '../../types';
import { AlertTriangle, Plus, Search, ArrowDownRight, ArrowUpRight, RefreshCw, Download, CheckCircle, Package, Edit, Trash2, X, Lock, Crown, Shield, Eye } from 'lucide-react';
import { formatHTG } from '../../utils/formatters';

interface StockManagementViewProps {
  products: Product[];
  movements: StockMovement[];
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => void;
  onRestock: (productId: string, quantity: number, reason?: string) => void;
  onDeleteProduct: (productId: string) => void;
  isAdmin?: boolean;
}

export const StockManagementView: React.FC<StockManagementViewProps> = ({
  products,
  movements,
  onUpdateProduct,
  onAddProduct,
  onRestock,
  onDeleteProduct,
  isAdmin = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockReason, setRestockReason] = useState('Livraison Fournisseur');
  const [showMovementsModal, setShowMovementsModal] = useState(false);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<Product | null>(null);

  // Delete Product Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  // New Product Form State
  const [newProd, setNewProd] = useState<Omit<Product, 'id' | 'updatedAt'>>({
    sku: '',
    name: '',
    category: 'Boissons Gazeuses',
    costPrice: 15,
    salePrice: 32,
    stock: 40,
    minStockAlert: 12,
    reorderQuantity: 24,
    alcoholDegree: 0.0,
    volume: 'Pack 24×33cl',
    isConsigne: false,
  });

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Inventory value calculations
  const inventoryStats = useMemo(() => {
    let totalItems = 0;
    let totalCostVal = 0;
    let totalSaleVal = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      totalItems += p.stock;
      totalCostVal += p.stock * p.costPrice;
      totalSaleVal += p.stock * p.salePrice;
      if (p.stock === 0) {
        outOfStockCount++;
      } else if (p.stock <= p.minStockAlert) {
        lowStockCount++;
      }
    });

    const potentialMargin = totalSaleVal - totalCostVal;
    const marginRate = totalSaleVal > 0 ? Math.round((potentialMargin / totalSaleVal) * 100) : 0;

    return {
      totalItems,
      totalCostVal,
      totalSaleVal,
      potentialMargin,
      marginRate,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'out') {
        matchesStatus = p.stock === 0;
      } else if (statusFilter === 'low') {
        matchesStatus = p.stock > 0 && p.stock <= p.minStockAlert;
      } else if (statusFilter === 'healthy') {
        matchesStatus = p.stock > p.minStockAlert;
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, statusFilter]);

  // Quick Restock submit
  const handleQuickRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem || restockQty <= 0) return;
    onRestock(restockItem.id, restockQty, restockReason);
    setRestockItem(null);
    setRestockQty(10);
  };

  // Add Product submit
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.sku) return;
    onAddProduct(newProd);
    setIsAddModalOpen(false);
    setNewProd({
      sku: '',
      name: '',
      category: 'Boissons Gazeuses',
      costPrice: 15,
      salePrice: 32,
      stock: 40,
      minStockAlert: 12,
      reorderQuantity: 24,
      alcoholDegree: 0.0,
      volume: 'Pack 24×33cl',
      isConsigne: false,
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['SKU', 'Nom', 'Catégorie', 'Prix Achat (HTG)', 'Prix Vente HT (HTG)', 'Stock Actuel', 'Seuil Alerte', 'Valeur Stock Achat (HTG)'];
    const rows = products.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.costPrice,
      p.salePrice,
      p.stock,
      p.minStockAlert,
      p.stock * p.costPrice,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventaire_optivente_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toast feedback helper
  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.text === text ? null : curr));
    }, 4000);
  };

  // Edit Product Handlers
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({ ...product });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;
    if (!editFormData.name.trim() || !editFormData.sku.trim()) return;

    const updatedProd: Product = {
      ...editFormData,
      name: editFormData.name.trim(),
      sku: editFormData.sku.trim().toUpperCase(),
      volume: editFormData.volume?.trim() || 'Standard',
      updatedAt: new Date().toISOString(),
    };

    onUpdateProduct(updatedProd);
    showToast(`Produit "${updatedProd.name}" modifié avec succès.`, 'success');
    setEditingProduct(null);
    setEditFormData(null);
  };

  // Delete Product Handler
  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    const name = productToDelete.name;
    onDeleteProduct(productToDelete.id);
    showToast(`Produit "${name}" supprimé de l'inventaire.`, 'danger');
    setProductToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
            toastMessage.type === 'danger'
              ? 'bg-red-50 border-red-200 text-red-800'
              : toastMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'danger' ? (
              <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/5 rounded text-slate-500 hover:text-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Non-Admin Informational Banner */}
      {!isAdmin && (
        <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block">Mode Catalogue Commercial (Accès Vendeur)</span>
              <span className="text-[11px] text-blue-700 leading-tight">
                Seul l'administrateur a accès aux prix d'achat, aux marges confidentielles et à la modification des stocks.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-200/80 text-blue-900 px-2.5 py-1 rounded-full border border-blue-300 shrink-0">
            Lecture Seule
          </span>
        </div>
      )}

      {/* Inventory Valuation Header Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isAdmin ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block flex items-center justify-between">
              <span>Valeur Stock (Coût d'Achat)</span>
              <Crown className="w-3 h-3 text-amber-500" />
            </span>
            <span className="text-xl font-bold text-slate-900 tabular-nums font-mono mt-1 block">
              {formatHTG(inventoryStats.totalCostVal)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {inventoryStats.totalItems} articles en entrepôt
            </span>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">Catalogue Boissons</span>
            <span className="text-xl font-bold text-slate-900 tabular-nums font-mono mt-1 block">
              {products.length} références
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {inventoryStats.totalItems} unités en stock
            </span>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Valeur Marchande (Vente HT)</span>
          <span className="text-xl font-bold text-blue-700 tabular-nums font-mono mt-1 block">
            {formatHTG(inventoryStats.totalSaleVal)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Potentiel de vente global
          </span>
        </div>

        {isAdmin ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block flex items-center justify-between">
              <span>Plus-Value Potentielle</span>
              <Crown className="w-3 h-3 text-amber-500" />
            </span>
            <span className="text-xl font-bold text-emerald-700 tabular-nums font-mono mt-1 block">
              +{formatHTG(inventoryStats.potentialMargin)}
            </span>
            <span className="text-[11px] text-emerald-600 font-mono mt-1 block">
              Marge latente de {inventoryStats.marginRate}%
            </span>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">Disponibilité Rayon</span>
            <span className="text-xl font-bold text-emerald-700 tabular-nums font-mono mt-1 block">
              {products.filter((p) => p.stock > 0).length} en rayon
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Prêt pour commande client
            </span>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Alertes de Vigilance</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xl font-bold text-amber-600 tabular-nums font-mono">
              {inventoryStats.lowStockCount} bas
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xl font-bold text-red-600 tabular-nums font-mono">
              {inventoryStats.outOfStockCount} rupture
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Nécessite réapprovisionnement
          </span>
        </div>
      </div>

      {/* Critical Stock Alert Banner if any items low or out */}
      {(inventoryStats.lowStockCount > 0 || inventoryStats.outOfStockCount > 0) && (
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <strong className="font-semibold block sm:inline">
                Alerte de Stock en Temps Réel :
              </strong>{' '}
              <span>
                {inventoryStats.outOfStockCount > 0
                  ? `${inventoryStats.outOfStockCount} article(s) en rupture totale et `
                  : ''}
                {inventoryStats.lowStockCount} article(s) sous le seuil de sécurité minimum.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('low')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0"
          >
            Filtrer les urgences
          </button>
        </div>
      )}

      {/* Main Stock Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
        {/* Actions Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search & Categories */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par référence SKU, nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-400"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Toutes les catégories' : cat}
                </option>
              ))}
            </select>

            {/* Status Segmented Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('low')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === 'low'
                    ? 'bg-white text-amber-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stock Faible ({inventoryStats.lowStockCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('out')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === 'out'
                    ? 'bg-white text-red-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rupture ({inventoryStats.outOfStockCount})
              </button>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setShowMovementsModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Mouvements récents</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Produit</span>
              </button>
            ) : (
              <div
                className="px-3 py-1.5 text-xs text-slate-500 bg-slate-100 rounded-lg flex items-center gap-1.5 border border-slate-200"
                title="L'ajout et la modification des références sont réservés à l'administrateur"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Ajout réservé Admin</span>
              </div>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="py-3 px-4">Référence SKU & Produit</th>
                <th className="py-3 px-4">Catégorie</th>
                {isAdmin ? (
                  <>
                    <th className="py-3 px-4 text-right">Prix Achat HT</th>
                    <th className="py-3 px-4 text-right">Prix Vente HT</th>
                    <th className="py-3 px-4 text-right">Marge Brute</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4 text-right">Prix Vente HT</th>
                    <th className="py-3 px-4 text-right">Format</th>
                    <th className="py-3 px-4 text-right">Degré Alcool</th>
                  </>
                )}
                <th className="py-3 px-4 text-right">Stock Actuel</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const margin = p.salePrice - p.costPrice;
                const marginPct = Math.round((margin / p.salePrice) * 100);
                const isOutOfStock = p.stock === 0;
                const isLowStock = !isOutOfStock && p.stock <= p.minStockAlert;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 block text-xs">{p.name}</span>
                          {p.isConsigne && (
                            <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                              Consigne
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{p.sku}</span>
                          <span>·</span>
                          <span>{p.volume || 'Standard'}</span>
                          <span>·</span>
                          <span className={p.alcoholDegree > 0 ? 'text-amber-700 font-medium' : 'text-emerald-700'}>
                            {p.alcoholDegree > 0 ? `${p.alcoholDegree}% Vol` : 'Sans Alcool (0.0%)'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-600">{p.category}</span>
                    </td>

                    {isAdmin ? (
                      <>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {formatHTG(p.costPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                          {formatHTG(p.salePrice)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <span className="font-mono font-medium text-emerald-700">+{formatHTG(margin)}</span>
                          <span className="text-slate-400 text-[11px] block">({marginPct}%)</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {formatHTG(p.salePrice)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 font-mono text-[11px]">
                          {p.volume || 'Standard'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 font-mono text-[11px]">
                          {p.alcoholDegree > 0 ? `${p.alcoholDegree}% Vol` : '0.0%'}
                        </td>
                      </>
                    )}

                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span
                        className={`text-sm font-bold ${
                          isOutOfStock
                            ? 'text-red-600'
                            : isLowStock
                            ? 'text-amber-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {p.stock}
                      </span>
                      <span className="text-slate-400 text-[11px] block">
                        seuil min : {p.minStockAlert}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isOutOfStock ? (
                        <span className="inline-block text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          Rupture
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-block text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Stock Faible
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          En Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setRestockItem(p);
                              setRestockQty(p.reorderQuantity || 10);
                            }}
                            title="Réapprovisionner le stock"
                            className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors whitespace-nowrap flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Réappro</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            title="Modifier la fiche produit"
                            className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors whitespace-nowrap flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Edit className="w-3 h-3 text-slate-600" />
                            <span>Modifier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            title="Supprimer définitivement ce produit"
                            className="px-2 py-1 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors whitespace-nowrap flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic inline-flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-300" />
                          <span>Catalogue</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Aucun article ne correspond à vos filtres actuels.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Réapprovisionner le Stock
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Article : <strong className="text-slate-800">{restockItem.name}</strong> ({restockItem.sku})
            </p>

            <form onSubmit={handleQuickRestockSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs flex justify-between">
                <span>Stock Actuel : <strong className="font-mono text-slate-900">{restockItem.stock}</strong></span>
                <span>Nouveau Stock après ajout : <strong className="font-mono text-blue-700">{restockItem.stock + Number(restockQty)}</strong></span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantité à ajouter au stock
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
                    required
                  />
                  {/* Quick helper buttons */}
                  {[5, 10, 20].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setRestockQty(q)}
                      className="px-2.5 py-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                      +{q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motif du mouvement
                </label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="ex: Réception livraison fournisseur, Ajustement inventaire"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Confirmer le réapprovisionnement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Créer une Nouvelle Fiche Produit
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ajoutez une référence au catalogue avec ses paramètres de coûts et de marge
            </p>

            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Référence SKU
                  </label>
                  <input
                    type="text"
                    value={newProd.sku}
                    onChange={(e) => setNewProd({ ...newProd, sku: e.target.value.toUpperCase() })}
                    placeholder="ex: CLV-RGB-01"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  >
                    <option value="Boissons Gazeuses">Boissons Gazeuses (Sodas & Limonades)</option>
                    <option value="Bières & Cidres">Bières & Cidres (Fûts & Bouteilles)</option>
                    <option value="Vins & Champagnes">Vins & Champagnes</option>
                    <option value="Spiritueux">Spiritueux & Liqueurs</option>
                    <option value="Eaux & Tonics">Eaux Gazeuses & Tonics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Désignation de la Boisson
                </label>
                <input
                  type="text"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  placeholder="ex: Bière Blanche aux Écorces d'Orange"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Format / Conditionnement
                  </label>
                  <input
                    type="text"
                    value={newProd.volume}
                    onChange={(e) => setNewProd({ ...newProd, volume: e.target.value })}
                    placeholder="ex: Pack 24x33cl, Fût 30L"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Degré d'Alcool (% Vol)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newProd.alcoholDegree}
                    onChange={(e) => setNewProd({ ...newProd, alcoholDegree: parseFloat(e.target.value) || 0 })}
                    placeholder="0.0 pour softs"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={newProd.isConsigne || false}
                      onChange={(e) => setNewProd({ ...newProd, isConsigne: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>Fût/Caisse consigné</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Prix d'Achat Unitaire HT (HTG)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newProd.costPrice}
                    onChange={(e) => setNewProd({ ...newProd, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Prix de Vente HT (HTG)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newProd.salePrice}
                    onChange={(e) => setNewProd({ ...newProd, salePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
              </div>

              {/* Live preview of margin */}
              <div className="p-2.5 bg-slate-50 rounded-lg text-xs flex justify-between items-center text-slate-600">
                <span>Marge Brute Prévue :</span>
                <span className="font-mono font-semibold text-emerald-700">
                  +{formatHTG(newProd.salePrice - newProd.costPrice, { showCents: true })} (
                  {newProd.salePrice > 0
                    ? Math.round(((newProd.salePrice - newProd.costPrice) / newProd.salePrice) * 100)
                    : 0}
                  %)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Quantité Initiale en Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProd.stock}
                    onChange={(e) => setNewProd({ ...newProd, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Seuil Alerte Stock Minimum
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProd.minStockAlert}
                    onChange={(e) => setNewProd({ ...newProd, minStockAlert: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Enregistrer l'article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Movements Modal */}
      {showMovementsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Journal des Mouvements de Stock
                </h3>
                <p className="text-xs text-slate-500">
                  Historique chronologique des entrées et sorties en temps réel
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMovementsModal(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-2.5">
              {movements.map((m) => (
                <div key={m.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        m.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {m.type === 'in' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">{m.productName}</span>
                      <span className="text-slate-500 text-[11px]">{m.reason} · Par {m.operator}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold ${
                        m.type === 'in' ? 'text-emerald-700' : 'text-slate-800'
                      }`}
                    >
                      {m.type === 'in' ? '+' : '-'}{m.quantity} unités
                    </span>
                    <span className="text-slate-400 text-[11px] block tabular-nums">
                      {new Date(m.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && editFormData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-4 h-4 text-slate-700" />
                  <span>Modifier la Fiche Produit</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {editingProduct.name} ({editingProduct.sku})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setEditFormData(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Référence SKU
                  </label>
                  <input
                    type="text"
                    value={editFormData.sku}
                    onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value.toUpperCase() })}
                    placeholder="ex: CLV-RGB-01"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  >
                    <option value="Boissons Gazeuses">Boissons Gazeuses (Sodas & Limonades)</option>
                    <option value="Bières & Cidres">Bières & Cidres (Fûts & Bouteilles)</option>
                    <option value="Vins & Champagnes">Vins & Champagnes</option>
                    <option value="Spiritueux">Spiritueux & Liqueurs</option>
                    <option value="Eaux & Tonics">Eaux Gazeuses & Tonics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Désignation de la Boisson
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="ex: Bière Blanche aux Écorces d'Orange"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Format / Conditionnement
                  </label>
                  <input
                    type="text"
                    value={editFormData.volume || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, volume: e.target.value })}
                    placeholder="ex: Pack 24x33cl, Fût 30L"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Degré d'Alcool (% Vol)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editFormData.alcoholDegree}
                    onChange={(e) => setEditFormData({ ...editFormData, alcoholDegree: parseFloat(e.target.value) || 0 })}
                    placeholder="0.0 pour softs"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={editFormData.isConsigne || false}
                      onChange={(e) => setEditFormData({ ...editFormData, isConsigne: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>Fût/Caisse consigné</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Prix d'Achat Unitaire HT (HTG)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editFormData.costPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Prix de Vente HT (HTG)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editFormData.salePrice}
                    onChange={(e) => setEditFormData({ ...editFormData, salePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
              </div>

              {/* Live Preview of Margin */}
              <div className="p-2.5 bg-slate-50 rounded-lg text-xs flex justify-between items-center text-slate-600 border border-slate-100">
                <span>Marge Brute Prévue :</span>
                <span className="font-mono font-semibold text-emerald-700">
                  +{formatHTG(editFormData.salePrice - editFormData.costPrice, { showCents: true })} (
                  {editFormData.salePrice > 0
                    ? Math.round(((editFormData.salePrice - editFormData.costPrice) / editFormData.salePrice) * 100)
                    : 0}
                  %)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Stock Actuel
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.stock}
                    onChange={(e) => setEditFormData({ ...editFormData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Seuil Alerte Min
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.minStockAlert}
                    onChange={(e) => setEditFormData({ ...editFormData, minStockAlert: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Qté Réappro Conseillée
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.reorderQuantity || 10}
                    onChange={(e) => setEditFormData({ ...editFormData, reorderQuantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setEditFormData(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-full bg-red-100 text-red-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Supprimer ce produit ?
                </h3>
                <p className="text-xs text-slate-500">
                  Cette référence sera retirée définitivement de l'inventaire
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Désignation :</span>
                <span className="font-semibold text-slate-900 text-right">{productToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Référence SKU :</span>
                <span className="font-mono text-slate-800">{productToDelete.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Catégorie :</span>
                <span className="text-slate-800">{productToDelete.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stock restant :</span>
                <span className={`font-mono font-bold ${productToDelete.stock > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                  {productToDelete.stock} unités
                </span>
              </div>
            </div>

            {productToDelete.stock > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-start gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Attention :</strong> Ce produit possède encore <strong>{productToDelete.stock} unité(s)</strong> en stock dans votre entrepôt.
                </span>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-5">
              Confirmez-vous la suppression de cette référence ? Cette opération est irréversible.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
