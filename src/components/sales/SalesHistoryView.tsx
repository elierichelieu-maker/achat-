import React, { useState, useMemo } from 'react';
import { Sale, Seller, Product, Customer, SaleItem } from '../../types';
import {
  Search,
  Download,
  FileText,
  X,
  Printer,
  ShoppingCart,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Wine,
  Beer,
  Sparkles,
  Flame,
  GlassWater,
  AlertCircle,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle2,
  Store,
  Layers,
  ArrowRight,
  User,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';
import { downloadInvoicePDF } from '../../utils/invoicePrinter';

interface SalesHistoryViewProps {
  sales: Sale[];
  sellers: Seller[];
  products: Product[];
  customers: Customer[];
  onCompleteSale: (sale: Sale) => void;
  onOpenNewSale?: () => void;
  onPrintSale?: (sale: Sale) => void;
  defaultTaxRate?: number;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales,
  sellers,
  products,
  customers,
  onCompleteSale,
  onOpenNewSale,
  onPrintSale,
  defaultTaxRate = 0,
}) => {
  // Navigation mode: 'pos' (Caisse avec Panier à droite & Cartes Carrées) vs 'history' (Factures & Table)
  const [activeMode, setActiveMode] = useState<'pos' | 'history'>('pos');

  // ================= POS / PANIER STATE =================
  const [cartItems, setCartItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [customerName, setCustomerName] = useState('Client Comptoir');
  const [customerCompany, setCustomerCompany] = useState('');
  const [sellerId, setSellerId] = useState(sellers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('especes');
  const [taxRate, setTaxRate] = useState<number>(defaultTaxRate !== undefined ? defaultTaxRate : 0);
  
  // POS Catalogue filters
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState<string>('all');
  const [posOnlyInStock, setPosOnlyInStock] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saleSuccessInvoice, setSaleSuccessInvoice] = useState<Sale | null>(null);

  // Sync taxRate when defaultTaxRate changes
  React.useEffect(() => {
    if (defaultTaxRate !== undefined) setTaxRate(defaultTaxRate);
  }, [defaultTaxRate]);

  // ================= HISTORY STATE =================
  const [historySearch, setHistorySearch] = useState('');
  const [historySellerFilter, setHistorySellerFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered products for POS square grid
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(posSearch.toLowerCase());
      const matchCat = posCategory === 'all' || p.category === posCategory;
      const matchStock = posOnlyInStock ? p.stock > 0 : true;
      return matchSearch && matchCat && matchStock;
    });
  }, [products, posSearch, posCategory, posOnlyInStock]);

  // Calculated items currently in cart
  const calculatedCartItems: SaleItem[] = useMemo(() => {
    return cartItems
      .map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) return null;
        const qty = Math.max(1, item.quantity);
        const totalPrice = prod.salePrice * qty;
        const totalCost = prod.costPrice * qty;
        const profit = totalPrice - totalCost;
        const marginPercent = totalPrice > 0 ? Math.round((profit / totalPrice) * 100) : 0;

        return {
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitCost: prod.costPrice,
          unitPrice: prod.salePrice,
          totalPrice,
          totalCost,
          profit,
          marginPercent,
        };
      })
      .filter((item): item is SaleItem => item !== null);
  }, [cartItems, products]);

  // Cart financial summary
  const cartTotalHT = calculatedCartItems.reduce((acc, it) => acc + it.totalPrice, 0);
  const cartTotalCost = calculatedCartItems.reduce((acc, it) => acc + it.totalCost, 0);
  const cartNetProfit = cartTotalHT - cartTotalCost;
  const cartMarginPercent = cartTotalHT > 0 ? Math.round((cartNetProfit / cartTotalHT) * 100) : 0;
  const cartTotalTTC = Math.round(cartTotalHT * (1 + taxRate) * 100) / 100;
  const totalCartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  // Add product to cart (or increment if present)
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setValidationError(null);

    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setValidationError(`Stock maximum atteint (${product.stock} unités) pour "${product.name}".`);
          return prev;
        }
        return prev.map((ci) =>
          ci.productId === product.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });
  };

  // Decrement product in cart
  const handleDecrementCart = (productId: string) => {
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.productId === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((ci) => ci.productId !== productId);
      }
      return prev.map((ci) =>
        ci.productId === productId ? { ...ci, quantity: ci.quantity - 1 } : ci
      );
    });
  };

  // Remove specific item from cart
  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.productId !== productId));
  };

  // Clear entire cart
  const handleClearCart = () => {
    setCartItems([]);
    setValidationError(null);
  };

  // Customer dropdown selection
  const handleCustomerChange = (val: string) => {
    setSelectedCustomerId(val);
    if (val === 'walk-in') {
      setCustomerName('Client Comptoir');
      setCustomerCompany('');
    } else if (val === 'custom') {
      setCustomerName('');
      setCustomerCompany('');
    } else {
      const cust = customers.find((c) => c.id === val);
      if (cust) {
        setCustomerName(cust.name);
        setCustomerCompany(cust.company);
      }
    }
  };

  // Validate sale submission
  const handleValidateSale = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (cartItems.length === 0) {
      setValidationError('Votre panier est vide. Veuillez cliquer sur au moins une boisson.');
      return;
    }

    if (!customerName.trim()) {
      setValidationError('Veuillez spécifier le nom du client.');
      return;
    }

    // Verify stocks
    for (const item of cartItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;
      if (prod.stock < item.quantity) {
        setValidationError(`Stock insuffisant pour "${prod.name}" (Stock : ${prod.stock}, Demandé : ${item.quantity}).`);
        return;
      }
    }

    const seller = sellers.find((s) => s.id === sellerId) || sellers[0];
    const invoiceNum = `FAC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: invoiceNum,
      date: new Date().toISOString(),
      sellerId: seller?.id || 'seller-1',
      sellerName: seller?.name || 'Vendeur Comptoir',
      customerName: customerName.trim(),
      customerCompany: customerCompany.trim() || undefined,
      items: calculatedCartItems,
      totalHT: cartTotalHT,
      taxRate,
      totalTTC: cartTotalTTC,
      totalCost: cartTotalCost,
      netProfit: cartNetProfit,
      marginPercent: cartMarginPercent,
      status: 'completed',
      paymentMethod,
    };

    onCompleteSale(newSale);
    setCartItems([]);
    setSaleSuccessInvoice(newSale);
  };

  // Helper icons and colors for beverage categories
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Bières & Cidres':
        return <Beer className="w-4 h-4 text-amber-600" />;
      case 'Vins & Champagnes':
        return <Wine className="w-4 h-4 text-rose-600" />;
      case 'Spiritueux':
        return <Flame className="w-4 h-4 text-orange-600" />;
      case 'Eaux & Tonics':
        return <GlassWater className="w-4 h-4 text-cyan-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-600" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Bières & Cidres':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Vins & Champagnes':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Spiritueux':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Eaux & Tonics':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  // ================= HISTORY DATA LOGIC =================
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
        s.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
        (s.customerCompany && s.customerCompany.toLowerCase().includes(historySearch.toLowerCase()));

      const matchSeller = historySellerFilter === 'all' || s.sellerId === historySellerFilter;
      return matchSearch && matchSeller;
    });
  }, [sales, historySearch, historySellerFilter]);

  const historyTotals = useMemo(() => {
    const totalHT = filteredSales.reduce((acc, s) => acc + s.totalHT, 0);
    const totalProfit = filteredSales.reduce((acc, s) => acc + s.netProfit, 0);
    const avgMargin = totalHT > 0 ? Math.round((totalProfit / totalHT) * 100) : 0;
    return { totalHT, totalProfit, avgMargin, count: filteredSales.length };
  }, [filteredSales]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Numéro Facture',
      'Date',
      'Client',
      'Entreprise',
      'Commercial',
      'Mode de Règlement',
      'Détail Articles',
      'Total HT (HTG)',
      'TVA 20% (HTG)',
      'Total TTC (HTG)',
      'Coût Achat (HTG)',
      'Bénéfice Net (HTG)',
      'Marge (%)',
      'Statut',
    ];

    const rows = filteredSales.map((s) => {
      const itemsSummary = s.items
        .map((it) => `${it.quantity}x ${it.productName}`)
        .join(' | ');

      return [
        s.invoiceNumber,
        new Date(s.date).toISOString().replace('T', ' ').substring(0, 19),
        `"${s.customerName.replace(/"/g, '""')}"`,
        `"${(s.customerCompany || '').replace(/"/g, '""')}"`,
        `"${s.sellerName.replace(/"/g, '""')}"`,
        s.paymentMethod,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        s.totalHT.toFixed(2),
        (s.totalHT * s.taxRate).toFixed(2),
        s.totalTTC.toFixed(2),
        s.totalCost.toFixed(2),
        s.netProfit.toFixed(2),
        `${s.marginPercent}%`,
        s.status,
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport_ventes_optivente_${now}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Header Mode Toggle */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Espace Ventes & Encaissement Boissons
            </h2>
            <p className="text-xs text-slate-500">
              Prise de commande au comptoir, caisse avec panier et suivi des factures
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveMode('pos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeMode === 'pos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
            <span>Point de Vente & Caisse</span>
            {totalCartCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                {totalCartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeMode === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Historique des Factures ({sales.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          MODE 1: POINT DE VENTE (PRODUITS EN CARRÉ + PANIER À DROITE)
          ======================================================== */}
      {activeMode === 'pos' && (
        <div className="flex flex-col md:flex-row gap-5 items-start w-full">
          {/* LEFT AREA: Catalog presented as SQUARE CARDS */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            {/* Filter Bar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher une boisson par nom, SKU..."
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                  {posSearch && (
                    <button
                      type="button"
                      onClick={() => setPosSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={posOnlyInStock}
                      onChange={(e) => setPosOnlyInStock(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>Disponibles uniquement</span>
                  </label>
                  <span className="text-xs text-slate-400 font-mono">
                    ({filteredProducts.length} référence{filteredProducts.length > 1 ? 's' : ''})
                  </span>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => {
                  const isSelected = posCategory === cat;
                  const label = cat === 'all' ? 'Toutes les Boissons' : cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPosCategory(cat)}
                      className={`px-3 py-1 rounded-lg border font-medium whitespace-nowrap transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message if any */}
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{validationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* SQUARE CARDS GRID ("présenter les en forme de carré") */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cartItems.find((ci) => ci.productId === p.id);
                const inCartQty = inCart?.quantity || 0;
                const isOutOfStock = p.stock <= 0;
                const isLowStock = !isOutOfStock && p.stock <= p.minStockAlert;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!isOutOfStock) handleAddToCart(p);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (!isOutOfStock) handleAddToCart(p);
                      }
                    }}
                    className={`aspect-square p-3 rounded-xl border flex flex-col justify-between text-left transition-all relative select-none group shadow-2xs ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-55 cursor-not-allowed'
                        : inCartQty > 0
                        ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs cursor-pointer hover:border-blue-600'
                        : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-xs cursor-pointer'
                    }`}
                  >
                    {/* Top Row: Category & Stock badge */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border truncate max-w-[110px] ${getCategoryBadgeClass(
                          p.category
                        )}`}
                      >
                        {p.category}
                      </span>

                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shrink-0">
                          Rupture
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                          {p.stock} restant{p.stock > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                          {p.stock}
                        </span>
                      )}
                    </div>

                    {/* Middle: Icon, Beverage Name & Specs */}
                    <div className="my-auto py-1">
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          {getCategoryIcon(p.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight line-clamp-2">
                            {p.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                            {p.sku} · {p.volume}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={
                            p.alcoholDegree > 0
                              ? 'text-amber-700 font-semibold'
                              : 'text-emerald-700 font-semibold'
                          }
                        >
                          {p.alcoholDegree > 0 ? `${p.alcoholDegree}% Vol` : 'Sans alcool'}
                        </span>
                        {p.isConsigne && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-200 px-1 rounded text-[9px] font-semibold">
                            Consigne
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Price & Quantity Badge / Add button */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-bold font-mono tabular-nums text-slate-900 block">
                          {formatHTG(p.salePrice)}
                        </span>
                        <span className="text-[9px] text-slate-400 block -mt-0.5">Prix vente HT</span>
                      </div>

                      {inCartQty > 0 ? (
                        <div className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-2 py-1 text-xs font-bold shadow-2xs">
                          <span>x{inCartQty}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2 py-1 transition-colors">
                          <Plus className="w-3 h-3" />
                          <span>Ajouter</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-700">Aucune boisson trouvée</p>
                <p className="text-xs text-slate-400 mt-1">
                  Essayez de modifier votre recherche ou le filtre de catégorie.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT AREA: LE PANIER DE COMMANDE A DROITE */}
          <div id="pos-cart-panel" className="w-full md:w-[360px] lg:w-[400px] xl:w-[430px] shrink-0 sticky top-20">
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-md flex flex-col overflow-hidden">
              {/* Cart Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Panier de Commande
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {totalCartCount} article{totalCartCount > 1 ? 's' : ''} au panier
                    </span>
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    title="Vider le panier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vider</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="p-3 max-h-[300px] overflow-y-auto space-y-2 border-b border-slate-100 divide-y divide-slate-100">
                {cartItems.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">Le panier est vide</p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                      Cliquez sur les carrés de boissons à gauche pour ajouter des articles.
                    </p>
                  </div>
                ) : (
                  cartItems.map((ci) => {
                    const prod = products.find((p) => p.id === ci.productId);
                    if (!prod) return null;
                    const lineTotal = prod.salePrice * ci.quantity;

                    return (
                      <div key={ci.productId} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-900 block truncate">
                            {prod.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatHTG(prod.salePrice)} / unité · Stock: {prod.stock}
                          </span>
                        </div>

                        {/* Stepper buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDecrementCart(prod.id)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-mono font-bold text-slate-900 tabular-nums">
                            {ci.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={ci.quantity >= prod.stock}
                            onClick={() => handleAddToCart(prod)}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-colors font-bold ${
                              ci.quantity >= prod.stock
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Line Total & Remove */}
                        <div className="text-right shrink-0 min-w-[70px]">
                          <span className="font-mono font-bold text-slate-900 tabular-nums block">
                            {formatHTG(lineTotal)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(prod.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Supprimer la ligne"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Customer, Seller & Payment Form */}
              <form onSubmit={handleValidateSale} className="p-4 space-y-3.5">
                {/* Client Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Client Facturé</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Requis</span>
                  </label>

                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white mb-1.5"
                  >
                    <option value="walk-in">Client Comptoir (Vente Directe)</option>
                    <option value="custom">Saisir un autre nom...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>

                  {(selectedCustomerId === 'custom' || selectedCustomerId === 'walk-in') && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Nom du client"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-400"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Entreprise / Établissement (optionnel)"
                        value={customerCompany}
                        onChange={(e) => setCustomerCompany(e.target.value)}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  )}
                </div>

                {/* Seller Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Commercial / Opérateur
                  </label>
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white"
                  >
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method Pills */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Mode de Règlement
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: 'especes', label: 'Espèces', icon: Banknote },
                      { key: 'carte', label: 'Carte', icon: CreditCard },
                      { key: 'virement', label: 'Virement', icon: Building2 },
                      { key: 'traite', label: 'Traite', icon: FileText },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSel = paymentMethod === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setPaymentMethod(m.key as any)}
                          className={`py-1.5 px-1 rounded-lg border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                            isSel
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total HT :</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatHTG(cartTotalHT)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 text-xs">
                    <span className="flex items-center gap-1 font-medium">
                      <span>TVA ({Math.round(taxRate * 100)}%) :</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="font-mono tabular-nums font-semibold text-slate-800 mr-1">
                        {formatHTG(cartTotalHT * taxRate)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTaxRate(0)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          taxRate === 0
                            ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-600'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="0% TVA (Sans taxe)"
                      >
                        0%
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxRate(0.1)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          Math.round(taxRate * 100) === 10
                            ? 'bg-amber-500 text-slate-950 font-bold ring-1 ring-amber-600'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="10% TVA"
                      >
                        10%
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxRate(0.2)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          Math.round(taxRate * 100) === 20
                            ? 'bg-amber-500 text-slate-950 font-bold ring-1 ring-amber-600'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="20% TVA"
                      >
                        20%
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                    <span>Total Net TTC :</span>
                    <span className="tabular-nums text-blue-700 font-bold">
                      {formatHTG(cartTotalTTC)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 text-[11px] pt-1 border-t border-slate-200/60 font-semibold">
                    <span>Marge Estimée :</span>
                    <span className="tabular-nums">
                      +{formatHTG(cartNetProfit)} ({cartMarginPercent}%)
                    </span>
                  </div>
                </div>

                {/* Validation Button */}
                <button
                  type="submit"
                  disabled={cartItems.length === 0}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                    cartItems.length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Valider la Vente ({formatHTG(cartTotalTTC)})
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Mobile Quick Cart Floating Trigger */}
          {totalCartCount > 0 && (
            <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
              <button
                type="button"
                onClick={() => {
                  const cartEl = document.getElementById('pos-cart-panel');
                  cartEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-xl flex items-center justify-between transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Panier ({totalCartCount} article{totalCartCount > 1 ? 's' : ''})</span>
                </div>
                <span className="font-mono text-xs bg-blue-700 px-2.5 py-1 rounded-lg">
                  {formatHTG(cartTotalTTC)}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODE 2: HISTORIQUE DES FACTURES & STATISTIQUES
          ======================================================== */}
      {activeMode === 'history' && (
        <div className="space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Total Facturé HT</span>
              <span className="text-xl font-bold text-slate-900 tabular-nums font-mono mt-1 block">
                {formatHTG(historyTotals.totalHT)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {historyTotals.count} ventes enregistrées
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Bénéfice Net Global</span>
              <span className="text-xl font-bold text-emerald-700 tabular-nums font-mono mt-1 block">
                +{formatHTG(historyTotals.totalProfit)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Après déduction des coûts d'achat
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Taux de Marge Moyen</span>
              <span className="text-xl font-bold text-indigo-700 tabular-nums font-mono mt-1 block">
                {historyTotals.avgMargin}%
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Marge brute commerciale
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Panier Moyen HT</span>
              <span className="text-xl font-bold text-slate-900 tabular-nums font-mono mt-1 block">
                {formatHTG(historyTotals.count > 0 ? Math.round(historyTotals.totalHT / historyTotals.count) : 0)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Par commande client
              </span>
            </div>
          </div>

          {/* Main Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
            {/* Table Filters Header */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[220px] flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="N° facture, nom de client, entreprise..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <select
                  value={historySellerFilter}
                  onChange={(e) => setHistorySellerFilter(e.target.value)}
                  className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-400"
                >
                  <option value="all">Tous les commerciaux</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                  title="Exporter les ventes affichées au format CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Exporter CSV ({filteredSales.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('pos')}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Ouvrir la Caisse</span>
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="py-3 px-4">Facture & Date</th>
                    <th className="py-3 px-4">Client & Entreprise</th>
                    <th className="py-3 px-4">Commercial</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Total HT</th>
                    <th className="py-3 px-4 text-right">Profit Net</th>
                    <th className="py-3 px-4 text-right">Marge %</th>
                    <th className="py-3 px-4 text-center">Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-slate-900 block">{sale.invoiceNumber}</span>
                        <span className="text-slate-400 text-[11px] tabular-nums">
                          {new Date(sale.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{sale.customerName}</span>
                        {sale.customerCompany && (
                          <span className="text-slate-500 text-[11px] block">{sale.customerCompany}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">{sale.sellerName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-slate-500 text-[11px]">{sale.paymentMethod}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatHTG(sale.totalHT)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-emerald-700">
                        +{formatHTG(sale.netProfit)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-indigo-700">
                        {sale.marginPercent}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => downloadInvoicePDF(sale, undefined, 'a4')}
                            className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Télécharger directement la facture en format PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onPrintSale) onPrintSale(sale);
                              else setSelectedInvoice(sale);
                            }}
                            className="px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Imprimer la facture ou le reçu"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-700" />
                            <span className="hidden sm:inline">Imprimer</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(sale)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Détails de la facture"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Aucune transaction trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          POPUP 1: FACTURE APRES VALIDATION REUSSIE D'UNE VENTE
          ======================================================== */}
      {saleSuccessInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-emerald-700 mb-4 pb-3 border-b border-emerald-100">
              <div className="p-2 bg-emerald-100 rounded-full">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Vente Enregistrée avec Succès !</h3>
                <span className="text-xs text-slate-500 font-mono">Facture {saleSuccessInvoice.invoiceNumber}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Client :</span>
                <span className="font-semibold text-slate-900">
                  {saleSuccessInvoice.customerName} {saleSuccessInvoice.customerCompany ? `(${saleSuccessInvoice.customerCompany})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Commercial :</span>
                <span className="text-slate-800">{saleSuccessInvoice.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Règlement :</span>
                <span className="capitalize text-slate-800 font-medium">{saleSuccessInvoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Encaissé TTC :</span>
                <span className="text-emerald-700 font-mono">{formatHTG(saleSuccessInvoice.totalTTC)}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-5">
              <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                Articles vendus ({saleSuccessInvoice.items.length})
              </div>
              <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {saleSuccessInvoice.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between text-xs">
                    <div>
                      <span className="font-medium text-slate-800 block">{it.productName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {it.quantity} × {formatHTG(it.unitPrice)}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatHTG(it.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => downloadInvoicePDF(saleSuccessInvoice, undefined, 'ticket')}
                className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Télécharger le ticket de caisse en format PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onPrintSale) {
                    onPrintSale(saleSuccessInvoice);
                  } else {
                    handlePrint();
                  }
                }}
                className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer le reçu</span>
              </button>
              <button
                type="button"
                onClick={() => setSaleSuccessInvoice(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Nouvelle Commande</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          POPUP 2: CONSULTATION D'UNE FACTURE D'HISTORIQUE
          ======================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Facture Commerciale
                </span>
                <h3 className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                  {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadInvoicePDF(selectedInvoice, undefined, 'a4')}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Télécharger la Facture en format PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onPrintSale) {
                      onPrintSale(selectedInvoice);
                    } else {
                      handlePrint();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Imprimer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Meta Grid */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-100">
              <div>
                <span className="text-slate-400 block mb-0.5">Facturé à :</span>
                <span className="font-semibold text-slate-900 block">{selectedInvoice.customerName}</span>
                {selectedInvoice.customerCompany && (
                  <span className="text-slate-600 block">{selectedInvoice.customerCompany}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-400 block mb-0.5">Date d'émission :</span>
                <span className="font-medium text-slate-800 tabular-nums">
                  {new Date(selectedInvoice.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Vendeur : {selectedInvoice.sellerName}
                </span>
              </div>
            </div>

            {/* Line items */}
            <div className="py-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-center">Qté</th>
                    <th className="pb-2 text-right">P.U. HT</th>
                    <th className="pb-2 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {selectedInvoice.items.map((it, idx) => (
                    <tr key={idx} className="py-2">
                      <td className="py-2.5 font-sans font-medium text-slate-800">{it.productName}</td>
                      <td className="py-2.5 text-center text-slate-700">{it.quantity}</td>
                      <td className="py-2.5 text-right text-slate-700">{formatHTG(it.unitPrice)}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">{formatHTG(it.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-1.5 text-xs font-mono border border-slate-200/80">
              <div className="flex justify-between text-slate-600">
                <span>Total HT :</span>
                <span className="tabular-nums font-semibold">{formatHTG(selectedInvoice.totalHT)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>TVA (20%) :</span>
                <span className="tabular-nums">{formatHTG(selectedInvoice.totalHT * selectedInvoice.taxRate)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total TTC :</span>
                <span className="tabular-nums">{formatHTG(selectedInvoice.totalTTC)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 pt-1 text-[11px] font-semibold">
                <span>Marge Brute Réalisée :</span>
                <span className="tabular-nums">
                  +{formatHTG(selectedInvoice.netProfit)} ({selectedInvoice.marginPercent}%)
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
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
