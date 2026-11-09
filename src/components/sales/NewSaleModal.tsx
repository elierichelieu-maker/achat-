import React, { useState, useMemo, useEffect } from 'react';
import { Product, Seller, Sale, SaleItem } from '../../types';
import {
  X,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Wine,
  Beer,
  Sparkles,
  Flame,
  GlassWater,
  AlertCircle,
  CreditCard,
  Banknote,
  Building2,
  FileText,
  User,
  Printer,
  Download,
  ArrowRight,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';
import { downloadInvoicePDF } from '../../utils/invoicePrinter';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  sellers: Seller[];
  onCompleteSale: (sale: Sale) => void;
  initialSellerId?: string;
  initialCustomerName?: string;
  initialCustomerCompany?: string;
  onPrintSale?: (sale: Sale) => void;
  defaultTaxRate?: number;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  products,
  sellers,
  onCompleteSale,
  initialSellerId,
  initialCustomerName,
  initialCustomerCompany,
  onPrintSale,
  defaultTaxRate = 0,
}) => {
  if (!isOpen) return null;

  const [sellerId, setSellerId] = useState(initialSellerId || sellers[0]?.id || '');
  const [customerName, setCustomerName] = useState(initialCustomerName || 'Client Comptoir');
  const [customerCompany, setCustomerCompany] = useState(initialCustomerCompany || '');
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('especes');
  const [taxRate, setTaxRate] = useState<number>(defaultTaxRate !== undefined ? defaultTaxRate : 0);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Cart items
  const [cartItems, setCartItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialCustomerName !== undefined) setCustomerName(initialCustomerName);
    if (initialCustomerCompany !== undefined) setCustomerCompany(initialCustomerCompany);
    if (initialSellerId !== undefined) setSellerId(initialSellerId);
    if (defaultTaxRate !== undefined) setTaxRate(defaultTaxRate);
  }, [initialCustomerName, initialCustomerCompany, initialSellerId, defaultTaxRate]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filter products for square grid
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchStock = onlyInStock ? p.stock > 0 : true;
      return matchSearch && matchCat && matchStock;
    });
  }, [products, search, selectedCategory, onlyInStock]);

  // Calculate items in cart
  const calculatedItems: SaleItem[] = useMemo(() => {
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

  const totalHT = calculatedItems.reduce((acc, it) => acc + it.totalPrice, 0);
  const totalCost = calculatedItems.reduce((acc, it) => acc + it.totalCost, 0);
  const netProfit = totalHT - totalCost;
  const marginPercent = totalHT > 0 ? Math.round((netProfit / totalHT) * 100) : 0;
  const totalTTC = Math.round(totalHT * (1 + taxRate) * 100) / 100;
  const totalItemsCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  // Cart operations
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setErrorMsg(null);

    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setErrorMsg(`Stock maximum atteint (${product.stock} unités) pour "${product.name}".`);
          return prev;
        }
        return prev.map((ci) =>
          ci.productId === product.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });
  };

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

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.productId !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setErrorMsg(null);
  };

  // Helper icons and colors
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

  // Submit sale
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (cartItems.length === 0) {
      setErrorMsg('Veuillez ajouter au moins un produit au panier.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Veuillez renseigner le nom du client.');
      return;
    }

    for (const item of cartItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;
      if (prod.stock < item.quantity) {
        setErrorMsg(`Stock insuffisant pour "${prod.name}" (Disponible : ${prod.stock}, Demandé : ${item.quantity}).`);
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
      sellerName: seller?.name || 'Vendeur',
      customerName: customerName.trim(),
      customerCompany: customerCompany.trim() || undefined,
      items: calculatedItems,
      totalHT,
      taxRate,
      totalTTC,
      totalCost,
      netProfit,
      marginPercent,
      status: 'completed',
      paymentMethod,
    };

    onCompleteSale(newSale);
    setCartItems([]);
    setCompletedSale(newSale);
  };

  // If sale was just validated, show the Success & Print/Receipt Choice Screen
  if (completedSale) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-900">
          <div className="flex items-center gap-3 text-emerald-700 pb-4 border-b border-emerald-100">
            <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-700 shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Encaissement Validé
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Vente Enregistrée avec Succès !
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Facture N° {completedSale.invoiceNumber}
              </p>
            </div>
          </div>

          <div className="my-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Client :</span>
              <span className="font-semibold text-slate-900">
                {completedSale.customerName} {completedSale.customerCompany ? `(${completedSale.customerCompany})` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Commercial :</span>
              <span className="text-slate-800">{completedSale.sellerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Règlement :</span>
              <span className="capitalize font-semibold text-slate-900">{completedSale.paymentMethod}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Réglé TTC :</span>
              <span className="text-emerald-700 font-mono tabular-nums">{formatHTG(completedSale.totalTTC)}</span>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs mb-5 flex items-start gap-2.5">
            <Printer className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Imprimer la facture ou le reçu ?</span>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Même si vous choisissez de fermer sans imprimer maintenant, vous pourrez <strong>toujours réimprimer cette facture à tout moment</strong> depuis l'onglet <strong>Ventes</strong> ou <strong>Factures</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                downloadInvoicePDF(completedSale, undefined, 'a4');
              }}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              title="Télécharger la facture officielle en fichier PDF"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onPrintSale) {
                  onPrintSale(completedSale);
                } else {
                  window.print();
                }
                setCompletedSale(null);
                onClose();
              }}
              className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / Visualiser</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCompletedSale(null);
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Terminer sans imprimer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Nouvelle Vente au Comptoir</h2>
              <p className="text-xs text-slate-500">
                Sélectionnez les articles carrés à gauche · Panier et validation à droite
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Main Body (2 Columns: Square Products Grid on LEFT, Cart on RIGHT) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* LEFT: Square Product Tiles */}
          <div className="lg:col-span-7 xl:col-span-8 p-4 flex flex-col h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200">
            {/* Search & Categories Bar */}
            <div className="space-y-2.5 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher une boisson..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>En stock</span>
                </label>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => {
                  const isSel = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg border font-medium whitespace-nowrap transition-all text-xs ${
                        isSel
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {cat === 'all' ? 'Toutes' : cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Square Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
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
                      className={`aspect-square p-2.5 rounded-xl border flex flex-col justify-between text-left transition-all relative select-none group shadow-2xs ${
                        isOutOfStock
                          ? 'bg-slate-50 border-slate-200 opacity-55 cursor-not-allowed'
                          : inCartQty > 0
                          ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs cursor-pointer hover:border-blue-600'
                          : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-xs cursor-pointer'
                      }`}
                    >
                      {/* Top: Category & Stock indicator */}
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border truncate max-w-[95px] ${getCategoryBadgeClass(
                            p.category
                          )}`}
                        >
                          {p.category}
                        </span>

                        {isOutOfStock ? (
                          <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 px-1 py-0.2 rounded shrink-0">
                            Rupture
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded shrink-0">
                            {p.stock}
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded shrink-0">
                            {p.stock}
                          </span>
                        )}
                      </div>

                      {/* Middle: Icon, Title & Format */}
                      <div className="my-auto py-1">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                            {getCategoryIcon(p.category)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 text-xs leading-tight line-clamp-2">
                              {p.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                              {p.volume}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom: Price & Add/Count */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-xs font-bold font-mono tabular-nums text-slate-900 block">
                            {formatHTG(p.salePrice)}
                          </span>
                        </div>

                        {inCartQty > 0 ? (
                          <div className="bg-blue-600 text-white rounded-md px-1.5 py-0.5 text-[11px] font-bold">
                            x{inCartQty}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
                            <Plus className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Panier à droite */}
          <div className="lg:col-span-5 xl:col-span-4 p-4 flex flex-col h-full overflow-hidden bg-slate-50/50">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span>Panier ({totalItemsCount})</span>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Vider</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
              {cartItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-medium text-slate-600">Panier vide</p>
                  <p className="text-[10px] text-slate-400">Cliquez sur un carré de boisson pour ajouter</p>
                </div>
              ) : (
                cartItems.map((ci) => {
                  const prod = products.find((p) => p.id === ci.productId);
                  if (!prod) return null;
                  const lineTotal = prod.salePrice * ci.quantity;

                  return (
                    <div key={ci.productId} className="pt-1.5 first:pt-0 flex items-center justify-between gap-1.5 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-900 block truncate text-[11px]">
                          {prod.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatHTG(prod.salePrice)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDecrementCart(prod.id)}
                          className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-slate-900 text-xs">
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={ci.quantity >= prod.stock}
                          onClick={() => handleAddToCart(prod)}
                          className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-40"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <div className="text-right shrink-0 min-w-[55px]">
                        <span className="font-mono font-bold text-slate-900 text-xs tabular-nums block">
                          {formatHTG(lineTotal)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(prod.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Form Bottom Panel */}
            <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-200 space-y-2.5 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                    Client
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nom du client"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                    Établissement (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    placeholder="Bar, Restaurant..."
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                    Commercial
                  </label>
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-slate-400"
                  >
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                    Règlement
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-slate-400"
                  >
                    <option value="especes">Espèces</option>
                    <option value="carte">Carte</option>
                    <option value="virement">Virement</option>
                    <option value="traite">Traite</option>
                  </select>
                </div>
              </div>

              {/* Financial Recap */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Total HT :</span>
                  <span className="tabular-nums font-semibold">{formatHTG(totalHT)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-700 text-[11px] pt-1 border-t border-slate-100">
                  <span className="font-medium">TVA ({Math.round(taxRate * 100)}%) :</span>
                  <div className="flex items-center gap-1 font-sans">
                    <span className="font-mono tabular-nums font-semibold text-slate-800 mr-1">
                      {formatHTG(totalHT * taxRate)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTaxRate(0)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        taxRate === 0
                          ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="20% TVA"
                    >
                      20%
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-slate-900 font-bold text-xs pt-1 border-t border-slate-100">
                  <span>Total Net TTC :</span>
                  <span className="tabular-nums text-blue-700">{formatHTG(totalTTC)}</span>
                </div>
              </div>

              {/* Validate Button */}
              <button
                type="submit"
                disabled={cartItems.length === 0}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                  cartItems.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider la Vente ({formatHTG(totalTTC)})</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
