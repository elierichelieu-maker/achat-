import React, { useState, useMemo } from 'react';
import { Product, StockMovement, Customer, AppSettings, getEffectiveStockThreshold } from '../../types';
import { AlertTriangle, Plus, Search, ArrowDownRight, ArrowUpRight, RefreshCw, Download, CheckCircle, Package, Edit, Trash2, X, Lock, Crown, Shield, CalendarClock, SlidersHorizontal, BellRing, RotateCcw } from 'lucide-react';
import { formatHTG, formatDateFR } from '../../utils/formatters';
import { validateProductInput } from '../../utils/validators';
import { useTableControls } from '../../hooks/useTableControls';
import { SortableHeader } from '../common/SortableHeader';
import { TablePagination } from '../common/TablePagination';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { getDaysUntilExpiration } from '../dashboard/ExpirationAlertsSection';

interface StockManagementViewProps {
  products: Product[];
  movements: StockMovement[];
  customers?: Customer[];
  settings?: AppSettings;
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => void;
  onRestock: (productId: string, quantity: number, reason?: string) => void;
  onDeleteProduct: (productId: string) => void;
  isAdmin?: boolean;
}

export const StockManagementView: React.FC<StockManagementViewProps> = ({
  products,
  movements,
  customers = [],
  settings,
  onUpdateProduct,
  onAddProduct,
  onRestock,
  onDeleteProduct,
  isAdmin = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'expiring' | 'healthy'>('all');
  
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

  // Custom Alert Threshold Modal State
  const [thresholdModalProduct, setThresholdModalProduct] = useState<Product | null>(null);
  const [customThresholdInput, setCustomThresholdInput] = useState<number>(15);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  // Erreurs de validation des formulaires
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  const globalDefaultThreshold = settings?.defaultStockMinAlert ?? 15;

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
    expirationDate: '',
    batchNumber: '',
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
    let expiringSoonCount = 0;
    let customThresholdCount = 0;

    products.forEach((p) => {
      const { threshold, isCustom } = getEffectiveStockThreshold(p, globalDefaultThreshold);
      if (isCustom) customThresholdCount++;
      totalItems += p.stock;
      totalCostVal += p.stock * p.costPrice;
      totalSaleVal += p.stock * p.salePrice;
      if (p.stock === 0) {
        outOfStockCount++;
      } else if (p.stock <= threshold) {
        lowStockCount++;
      }
      const daysLeft = getDaysUntilExpiration(p.expirationDate);
      if (daysLeft !== null && daysLeft <= 30) {
        expiringSoonCount++;
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
      expiringSoonCount,
      customThresholdCount,
    };
  }, [products, globalDefaultThreshold]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const { threshold } = getEffectiveStockThreshold(p, globalDefaultThreshold);
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.batchNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'out') {
        matchesStatus = p.stock === 0;
      } else if (statusFilter === 'low') {
        matchesStatus = p.stock > 0 && p.stock <= threshold;
      } else if (statusFilter === 'expiring') {
        const daysLeft = getDaysUntilExpiration(p.expirationDate);
        matchesStatus = daysLeft !== null && daysLeft <= 30;
      } else if (statusFilter === 'healthy') {
        matchesStatus = p.stock > threshold;
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, statusFilter, globalDefaultThreshold]);

  // Tri multi-colonnes et pagination du tableau inventaire
  type ProductSortField = 'name' | 'category' | 'costPrice' | 'salePrice' | 'margin' | 'stock' | 'expirationDate';
  const {
    sortField,
    sortDirection,
    toggleSort,
    page,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems: paginatedProducts,
    setPage,
    setPageSize,
  } = useTableControls<Product, ProductSortField>({
    items: filteredProducts,
    defaultSortField: 'name',
    defaultSortDirection: 'asc',
    defaultPageSize: 10,
    getSortValue: (p, field) => {
      switch (field) {
        case 'margin':
          return p.salePrice - p.costPrice;
        case 'expirationDate':
          return p.expirationDate ? new Date(p.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
        default:
          return p[field];
      }
    },
  });

  // Quick Restock submit
  const handleQuickRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem || restockQty <= 0) return;
    onRestock(restockItem.id, restockQty, restockReason);
    setRestockItem(null);
    setRestockQty(10);
  };

  // Add Product submit avec validation stricte
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateProductInput(newProd);
    if (!validation.valid) {
      setAddFormErrors(validation.errors);
      return;
    }
    setAddFormErrors({});

    const payload: Omit<Product, 'id' | 'updatedAt'> = {
      ...newProd,
      name: newProd.name.trim(),
      sku: newProd.sku.trim().toUpperCase(),
    };
    if (newProd.expirationDate?.trim()) {
      payload.expirationDate = newProd.expirationDate.trim();
    } else {
      delete payload.expirationDate;
    }
    if (newProd.batchNumber?.trim()) {
      payload.batchNumber = newProd.batchNumber.trim().toUpperCase();
    } else {
      delete payload.batchNumber;
    }
    onAddProduct(payload);
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
      expirationDate: '',
      batchNumber: '',
    });
  };

  // Export CSV (Admin-only comprehensive warehouse stocks + consignments + expiry export)
  const handleExportCSV = () => {
    if (!isAdmin) return;

    const kegDeposit = settings?.kegConsignmentDepositPrice ?? 3000;
    const crateDeposit = settings?.crateConsignmentDepositPrice ?? 500;

    const escapeCsv = (val: string | number | boolean | undefined) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'SKU',
      'Nom du Produit',
      'Catégorie',
      'Format / Volume',
      'Degré Alcool (%)',
      'Consigné',
      'Type Consigne',
      'Caution Consigne Unitaire (HTG)',
      'Stock Actuel',
      'Seuil Alerte Effectif',
      'Seuil Personnalisé',
      'Qté Réappro Conseillée',
      'Statut Stock',
      'Date de Péremption (DLUO)',
      'Jours Avant Expiration',
      'Numéro de Lot',
      'Prix Achat HT (HTG)',
      'Prix Vente HT (HTG)',
      'Marge Unitaire (HTG)',
      'Valeur Stock Achat (HTG)',
      'Valeur Consignes Entrepôt (HTG)',
    ];

    let totalConsignedUnitsInStock = 0;
    let totalConsignedValueInStock = 0;
    let consignedSkuCount = 0;

    const rows = products.map((p) => {
      const isKeg = p.volume.toLowerCase().includes('fût') || p.volume.toLowerCase().includes('fut');
      const consigneType = p.isConsigne ? (isKeg ? 'Fût Consigné' : 'Caisse Consignée') : 'Emballage Perdu';
      const consigneUnitPrice = p.isConsigne ? (isKeg ? kegDeposit : crateDeposit) : 0;
      const consigneStockVal = p.stock * consigneUnitPrice;

      if (p.isConsigne) {
        consignedSkuCount++;
        totalConsignedUnitsInStock += p.stock;
        totalConsignedValueInStock += consigneStockVal;
      }

      const { threshold: effectiveThreshold, isCustom } = getEffectiveStockThreshold(p, globalDefaultThreshold);
      const stockStatus = p.stock === 0 ? 'Rupture' : p.stock <= effectiveThreshold ? 'Stock Faible' : 'En Stock';
      const daysLeft = getDaysUntilExpiration(p.expirationDate);
      const daysLeftLabel = daysLeft === null ? 'N/A' : daysLeft < 0 ? `Expiré (${daysLeft}j)` : `${daysLeft}j`;

      return [
        escapeCsv(p.sku),
        escapeCsv(p.name),
        escapeCsv(p.category),
        escapeCsv(p.volume || 'Standard'),
        p.alcoholDegree,
        p.isConsigne ? 'Oui' : 'Non',
        escapeCsv(consigneType),
        consigneUnitPrice,
        p.stock,
        effectiveThreshold,
        isCustom ? 'Oui' : 'Non',
        p.reorderQuantity,
        escapeCsv(stockStatus),
        escapeCsv(p.expirationDate || 'Non définie'),
        escapeCsv(daysLeftLabel),
        escapeCsv(p.batchNumber || '-'),
        p.costPrice,
        p.salePrice,
        Number((p.salePrice - p.costPrice).toFixed(2)),
        Number((p.stock * p.costPrice).toFixed(2)),
        consigneStockVal,
      ].join(',');
    });

    const lines: string[] = [
      headers.join(','),
      ...rows,
      '',
      'RÉSUMÉ ÉTAT DES STOCKS & CONSIGNES',
      `Références Totales,${products.length}`,
      `Unités en Stock Entrepôt,${inventoryStats.totalItems}`,
      `Valeur Totale Stock (Achat HTG),${inventoryStats.totalCostVal.toFixed(2)}`,
      `Valeur Marchande Potentielle (Vente HT HTG),${inventoryStats.totalSaleVal.toFixed(2)}`,
      `Références Consignées,${consignedSkuCount}`,
      `Unités Consignées en Entrepôt,${totalConsignedUnitsInStock}`,
      `Valeur Consignes en Entrepôt (HTG),${totalConsignedValueInStock.toFixed(2)}`,
    ];

    // Add active consigned containers in circulation with CHR customers
    const activeConsignCustomers = customers.filter((c) => c.activeKegsConsigned > 0);
    if (activeConsignCustomers.length > 0) {
      const totalCirculation = activeConsignCustomers.reduce((acc, c) => acc + c.activeKegsConsigned, 0);
      lines.push(`Fûts / Contenants Consignés en Circulation Clients,${totalCirculation}`);
      lines.push(`Valeur Cautions Clients en Circulation (HTG),${(totalCirculation * kegDeposit).toFixed(2)}`);
      lines.push('');
      lines.push('DÉTAIL DES CONSIGNES EN CIRCULATION PAR CLIENT');
      lines.push('Établissement,Contact,Type Client,Téléphone,Contenants Consignés Actifs,Valeur Caution Estimée (HTG)');
      activeConsignCustomers.forEach((c) => {
        lines.push(
          [
            escapeCsv(c.company),
            escapeCsv(c.name),
            escapeCsv(c.type),
            escapeCsv(c.phone),
            c.activeKegsConsigned,
            c.activeKegsConsigned * kegDeposit,
          ].join(',')
        );
      });
    }

    const csvString = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `etat_stocks_consignes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(
      `Export CSV téléchargé : ${products.length} références (${consignedSkuCount} consignées).`,
      'success'
    );
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
    setEditFormErrors({});
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;
    const validation = validateProductInput(editFormData);
    if (!validation.valid) {
      setEditFormErrors(validation.errors);
      return;
    }
    setEditFormErrors({});

    const updatedProd: Product = {
      ...editFormData,
      name: editFormData.name.trim(),
      sku: editFormData.sku.trim().toUpperCase(),
      volume: editFormData.volume?.trim() || 'Standard',
      updatedAt: new Date().toISOString(),
    };
    if (editFormData.expirationDate?.trim()) {
      updatedProd.expirationDate = editFormData.expirationDate.trim();
    } else {
      delete updatedProd.expirationDate;
    }
    if (editFormData.batchNumber?.trim()) {
      updatedProd.batchNumber = editFormData.batchNumber.trim().toUpperCase();
    } else {
      delete updatedProd.batchNumber;
    }
    if (
      typeof editFormData.customAlertThreshold === 'number' &&
      !isNaN(editFormData.customAlertThreshold) &&
      editFormData.customAlertThreshold > 0
    ) {
      updatedProd.customAlertThreshold = editFormData.customAlertThreshold;
      updatedProd.minStockAlert = editFormData.customAlertThreshold;
    } else {
      delete updatedProd.customAlertThreshold;
    }

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

  // Custom Threshold Modal Handlers
  const openThresholdModal = (product: Product) => {
    const { threshold } = getEffectiveStockThreshold(product, globalDefaultThreshold);
    setThresholdModalProduct(product);
    setCustomThresholdInput(threshold);
  };

  const handleSaveCustomThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholdModalProduct) return;
    const safeVal = Math.max(1, Math.round(customThresholdInput || 1));
    const updated: Product = {
      ...thresholdModalProduct,
      customAlertThreshold: safeVal,
      minStockAlert: safeVal,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProduct(updated);
    showToast(
      `Seuil d'alerte personnalisé défini pour "${thresholdModalProduct.name}" : ${safeVal} unités.`,
      'success'
    );
    setThresholdModalProduct(null);
  };

  const handleResetCustomThreshold = () => {
    if (!thresholdModalProduct) return;
    const updated: Product = {
      ...thresholdModalProduct,
      minStockAlert: globalDefaultThreshold,
      updatedAt: new Date().toISOString(),
    };
    delete updated.customAlertThreshold;
    onUpdateProduct(updated);
    showToast(
      `Seuil standard (${globalDefaultThreshold} unités) restauré pour "${thresholdModalProduct.name}".`,
      'info'
    );
    setThresholdModalProduct(null);
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
          <span className="text-xs font-semibold text-blue-800 shrink-0">
            Accès en lecture seule
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
              <button
                type="button"
                onClick={() => setStatusFilter('expiring')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  statusFilter === 'expiring'
                    ? 'bg-white text-rose-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarClock className="w-3 h-3 text-rose-500" />
                <span>Péremption &le;30j ({inventoryStats.expiringSoonCount})</span>
              </button>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setShowMovementsModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Mouvements récents</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleExportCSV}
                title="Télécharger l'état complet des stocks et consignes en format CSV (Réservé Admin)"
                className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Exporter en CSV</span>
              </button>
            )}
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
                <SortableHeader label="Référence SKU & Produit" field="name" activeField={sortField} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Catégorie" field="category" activeField={sortField} direction={sortDirection} onSort={toggleSort} />
                {isAdmin ? (
                  <>
                    <SortableHeader label="Prix Achat HT" field="costPrice" activeField={sortField} direction={sortDirection} onSort={toggleSort} align="right" />
                    <SortableHeader label="Prix Vente HT" field="salePrice" activeField={sortField} direction={sortDirection} onSort={toggleSort} align="right" />
                    <SortableHeader label="Marge Brute" field="margin" activeField={sortField} direction={sortDirection} onSort={toggleSort} align="right" />
                  </>
                ) : (
                  <>
                    <SortableHeader label="Prix Vente HT" field="salePrice" activeField={sortField} direction={sortDirection} onSort={toggleSort} align="right" />
                    <th className="py-3 px-4 text-right">Format</th>
                    <th className="py-3 px-4 text-right">Degré Alcool</th>
                  </>
                )}
                <SortableHeader label="Stock Actuel" field="stock" activeField={sortField} direction={sortDirection} onSort={toggleSort} align="right" />
                <SortableHeader label="Péremption (DLUO)" field="expirationDate" activeField={sortField} direction={sortDirection} onSort={toggleSort} align="center" />
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((p) => {
                const margin = p.salePrice - p.costPrice;
                const marginPct = Math.round((margin / p.salePrice) * 100);
                const { threshold: effectiveThreshold, isCustom: isCustomThreshold } = getEffectiveStockThreshold(
                  p,
                  globalDefaultThreshold
                );
                const isOutOfStock = p.stock === 0;
                const isLowStock = !isOutOfStock && p.stock <= effectiveThreshold;
                const daysUntilExp = getDaysUntilExpiration(p.expirationDate);
                const expFormatted = p.expirationDate
                  ? new Date(p.expirationDate + (p.expirationDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                    })
                  : null;

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
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 flex-wrap">
                          <span>{p.sku}</span>
                          <span>·</span>
                          <span>{p.volume || 'Standard'}</span>
                          <span>·</span>
                          <span className={p.alcoholDegree > 0 ? 'text-amber-700 font-medium' : 'text-emerald-700'}>
                            {p.alcoholDegree > 0 ? `${p.alcoholDegree}% Vol` : 'Sans Alcool (0.0%)'}
                          </span>
                          {p.batchNumber && (
                            <>
                              <span>·</span>
                              <span className="text-slate-500">{p.batchNumber}</span>
                            </>
                          )}
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
                      <div className="mt-0.5 flex justify-end">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => openThresholdModal(p)}
                            title={
                              isCustomThreshold
                                ? `Seuil personnalisé actif (${effectiveThreshold} u.) — Cliquer pour ajuster`
                                : `Seuil standard (${effectiveThreshold} u.) — Cliquer pour définir un seuil personnalisé`
                            }
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                              isCustomThreshold
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100 font-semibold'
                                : 'text-slate-500 border-transparent hover:border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isCustomThreshold && <BellRing className="w-2.5 h-2.5 text-indigo-600" />}
                            <span>
                              {isCustomThreshold
                                ? `Seuil perso : ${effectiveThreshold}`
                                : `seuil min : ${effectiveThreshold}`}
                            </span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] block">
                            {isCustomThreshold
                              ? `seuil perso : ${effectiveThreshold}`
                              : `seuil min : ${effectiveThreshold}`}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {expFormatted && daysUntilExp !== null ? (
                        daysUntilExp < 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-mono">
                              Expiré ({Math.abs(daysUntilExp)}j)
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{expFormatted}</span>
                          </div>
                        ) : daysUntilExp <= 30 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded font-mono">
                              J-{daysUntilExp}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{expFormatted}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-600">{expFormatted}</span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Non définie</span>
                      )}
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
                            onClick={() => openThresholdModal(p)}
                            title="Définir un seuil d'alerte personnalisé pour ce produit"
                            className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap flex items-center gap-1 shadow-2xs cursor-pointer ${
                              isCustomThreshold
                                ? 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
                                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                            }`}
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Seuil</span>
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
              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Aucun article ne correspond à vos filtres actuels.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Barre de pagination du tableau stocks */}
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="produits"
        />
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
              {Object.keys(addFormErrors).length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <strong className="font-bold block">Veuillez corriger les champs suivants :</strong>
                  {Object.values(addFormErrors).map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date de Péremption (DLUO)
                  </label>
                  <input
                    type="date"
                    value={newProd.expirationDate || ''}
                    onChange={(e) => setNewProd({ ...newProd, expirationDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Numéro de Lot (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={newProd.batchNumber || ''}
                    onChange={(e) => setNewProd({ ...newProd, batchNumber: e.target.value.toUpperCase() })}
                    placeholder="ex: LOT-2026-A"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
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
              {Object.keys(editFormErrors).length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <strong className="font-bold block">Veuillez corriger les champs suivants :</strong>
                  {Object.values(editFormErrors).map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date de Péremption (DLUO)
                  </label>
                  <input
                    type="date"
                    value={editFormData.expirationDate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, expirationDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Numéro de Lot
                  </label>
                  <input
                    type="text"
                    value={editFormData.batchNumber || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, batchNumber: e.target.value.toUpperCase() })}
                    placeholder="ex: LOT-2026-A"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {/* Optional Custom Alert Threshold inside Edit Modal */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Seuil d'Alerte Personnalisé (Optionnel)</span>
                  </label>
                  {editFormData.customAlertThreshold ? (
                    <button
                      type="button"
                      onClick={() => {
                        const copy = { ...editFormData };
                        delete copy.customAlertThreshold;
                        setEditFormData(copy);
                      }}
                      className="text-[11px] font-medium text-indigo-700 hover:underline cursor-pointer"
                    >
                      Réinitialiser (standard {globalDefaultThreshold} u.)
                    </button>
                  ) : (
                    <span className="text-[10px] text-indigo-700">Prioritaire sur le seuil global</span>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={editFormData.customAlertThreshold ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) {
                      const copy = { ...editFormData };
                      delete copy.customAlertThreshold;
                      setEditFormData(copy);
                    } else {
                      const val = Math.max(1, parseInt(raw) || 1);
                      setEditFormData({
                        ...editFormData,
                        customAlertThreshold: val,
                        minStockAlert: val,
                      });
                    }
                  }}
                  placeholder={`Par défaut : ${globalDefaultThreshold} unités`}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg font-mono focus:outline-none focus:border-indigo-500"
                />
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

      {/* Confirmation unifiée avant suppression d'un produit */}
      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        title="Supprimer ce produit ?"
        description={
          productToDelete && productToDelete.stock > 0
            ? `Attention : ce produit possède encore ${productToDelete.stock} unité(s) en stock dans votre entrepôt. Cette suppression est irréversible.`
            : "Cette référence sera retirée définitivement de l'inventaire. Cette opération est irréversible."
        }
        itemDetail={
          productToDelete
            ? `${productToDelete.name} (${productToDelete.sku}) · ${productToDelete.category}`
            : undefined
        }
        confirmLabel="Supprimer définitivement"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
      />

      {/* Custom Per-Product Alert Threshold Modal */}
      {thresholdModalProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Seuil d'Alerte Personnalisé
                  </h3>
                  <p className="text-xs text-slate-500">
                    {thresholdModalProduct.name} ({thresholdModalProduct.sku})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setThresholdModalProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomThreshold} className="mt-4 space-y-4">
              {/* Current status summary */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Stock Actuel</span>
                  <span className="text-base font-mono font-bold text-slate-900">
                    {thresholdModalProduct.stock} unités
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Seuil Global Standard</span>
                  <span className="text-base font-mono font-bold text-slate-700">
                    {globalDefaultThreshold} unités
                  </span>
                </div>
              </div>

              {/* Live alert simulation */}
              {thresholdModalProduct.stock <= customThresholdInput ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2">
                  <BellRing className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">ALERTE DÉCLENCHÉE IMMÉDIATEMENT</strong>
                    <span className="text-[11px] text-amber-800">
                      Le stock actuel ({thresholdModalProduct.stock} u.) est &le; au seuil défini ({customThresholdInput} u.). Une notification visuelle s'affichera dans le tableau de bord.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Stock conforme à ce seuil</strong>
                    <span className="text-[11px] text-emerald-800">
                      Une alerte visuelle apparaîtra dès que le stock descendra à {customThresholdInput} unités ou moins.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Définir le seuil personnalisé pour ce produit (unités)
                </label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={customThresholdInput}
                  onChange={(e) => setCustomThresholdInput(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  required
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-slate-500 mr-1">Raccourcis :</span>
                  {[5, 10, 15, 25, 40, 60].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCustomThresholdInput(val)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                        customThresholdInput === val
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {val} u.
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetCustomThreshold}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Supprimer le seuil personnalisé et revenir au seuil global des paramètres"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Utiliser standard ({globalDefaultThreshold} u.)</span>
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setThresholdModalProduct(null)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Enregistrer Seuil</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
