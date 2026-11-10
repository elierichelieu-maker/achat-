import React, { useState, useEffect } from 'react';
import { Product, Seller, Sale, StockMovement, Customer, AppSettings, ActiveTab, ExchangeRateConfig, ExchangeTransaction, isUserAdmin } from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SELLERS,
  generateInitialSales,
  INITIAL_MOVEMENTS,
  INITIAL_CUSTOMERS,
  DEFAULT_SETTINGS,
  DEFAULT_EXCHANGE_RATES,
  INITIAL_EXCHANGE_TRANSACTIONS,
} from './data/mockData';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';


// Dynamic lazy imports for high-performance mobile reload and reduced bundle size
const StockManagementView = React.lazy(() =>
  import('./components/stocks/StockManagementView').then((m) => ({ default: m.StockManagementView }))
);
const CustomersManagementView = React.lazy(() =>
  import('./components/customers/CustomersManagementView').then((m) => ({ default: m.CustomersManagementView }))
);
const SalesHistoryView = React.lazy(() =>
  import('./components/sales/SalesHistoryView').then((m) => ({ default: m.SalesHistoryView }))
);
const InvoicesManagementView = React.lazy(() =>
  import('./components/invoices/InvoicesManagementView').then((m) => ({ default: m.InvoicesManagementView }))
);
const CurrencyExchangeView = React.lazy(() =>
  import('./components/currency/CurrencyExchangeView').then((m) => ({ default: m.CurrencyExchangeView }))
);
const FinancialReportsView = React.lazy(() =>
  import('./components/reports/FinancialReportsView').then((m) => ({ default: m.FinancialReportsView }))
);
const UsersManagementView = React.lazy(() =>
  import('./components/users/UsersManagementView').then((m) => ({ default: m.UsersManagementView }))
);
const SettingsManagementView = React.lazy(() =>
  import('./components/settings/SettingsManagementView').then((m) => ({ default: m.SettingsManagementView }))
);
const NewSaleModal = React.lazy(() =>
  import('./components/sales/NewSaleModal').then((m) => ({ default: m.NewSaleModal }))
);
const InvoiceReceiptModal = React.lazy(() =>
  import('./components/invoices/InvoiceReceiptModal').then((m) => ({ default: m.InvoiceReceiptModal }))
);
const MobileDeploymentGuideModal = React.lazy(() =>
  import('./components/mobile/MobileDeploymentGuideModal').then((m) => ({ default: m.MobileDeploymentGuideModal }))
);
const ShareAppModal = React.lazy(() =>
  import('./components/common/ShareAppModal').then((m) => ({ default: m.ShareAppModal }))
);
const UserLoginModal = React.lazy(() =>
  import('./components/auth/UserLoginModal').then((m) => ({ default: m.UserLoginModal }))
);
const CloudSyncCenterModal = React.lazy(() =>
  import('./components/common/CloudSyncCenterModal').then((m) => ({ default: m.CloudSyncCenterModal }))
);

import { PWAInstallButton } from './components/common/PWAInstallButton';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  FileSpreadsheet,
  Settings,
  PlusCircle,
  Wine,
  UserCog,
  ArrowLeftRight,
  FileText,
  Smartphone,
  Cloud,
  RefreshCw,
  Share2,
  Copy,
  Check,
  KeyRound,
  LogOut,
  ChevronDown,
  UserCheck,
  Crown,
  Lock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Layers,
  MoveHorizontal,
} from 'lucide-react';
import {
  seedInitialDataIfEmpty,
  subscribeToProducts,
  subscribeToSellers,
  subscribeToCustomers,
  subscribeToSales,
  subscribeToMovements,
  subscribeToSettings,
  subscribeToExchangeRates,
  subscribeToExchangeTransactions,
  syncSaveProduct,
  syncDeleteProduct,
  syncSaveSeller,
  syncDeleteSeller,
  syncSaveCustomer,
  syncSaveSale,
  syncSaveMovement,
  syncSaveSettings,
  syncSaveExchangeRates,
  syncSaveExchangeTransaction,
  syncDeleteExchangeTransaction,
  syncResetAllDataToDefault,
} from './services/cloudSyncService';
import { WaterBottleLogo } from './components/common/WaterBottleLogo';

const STORAGE_KEYS = {
  PRODUCTS: 'optiboissons_products_v2',
  SELLERS: 'optiboissons_sellers_v2',
  SALES: 'optiboissons_sales_v2',
  MOVEMENTS: 'optiboissons_movements_v2',
  CUSTOMERS: 'optiboissons_customers_v2',
  SETTINGS: 'optiboissons_settings_v2',
  EXCHANGE_RATES: 'optiboissons_exchange_rates_v1',
  EXCHANGE_TRANSACTIONS: 'optiboissons_exchange_transactions_v1',
};

function ViewLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] py-12 text-center">
      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-2.5" />
      <span className="text-xs text-slate-500 font-medium">Chargement...</span>
    </div>
  );
}

interface NavTabConfig {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAVIGATION_TABS: NavTabConfig[] = [
  { id: 'dashboard', label: 'Tableau de Bord', shortLabel: 'Dashboard', icon: LayoutDashboard, description: 'KPI & Aperçu' },
  { id: 'inventory', label: 'Inventaire Boissons', shortLabel: 'Stocks', icon: Package, description: 'Stocks & Consignes' },
  { id: 'sales', label: 'Ventes & Commandes', shortLabel: 'Ventes', icon: ShoppingBag, description: 'Commandes' },
  { id: 'invoices', label: 'Factures & Règlements', shortLabel: 'Factures', icon: FileText, description: 'Créances' },
  { id: 'customers', label: 'Clients & Consignes', shortLabel: 'Clients', icon: Users, description: 'Comptes' },
  { id: 'exchange', label: 'Change USD / DOP', shortLabel: 'Change', icon: ArrowLeftRight, description: 'Devises en HTG' },
  { id: 'reports', label: 'Rapports Financiers', shortLabel: 'Rapports', icon: FileSpreadsheet, description: 'Marges & CA' },
  { id: 'users', label: 'Utilisateurs & Équipe', shortLabel: 'Équipe', icon: UserCog, description: 'Vendeurs' },
  { id: 'settings', label: 'Paramètres', shortLabel: 'Config', icon: Settings, description: 'Configuration' },
];

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSellerForSale, setSelectedSellerForSale] = useState<string | undefined>(undefined);
  const [selectedCustomerForSale, setSelectedCustomerForSale] = useState<{ name: string; company: string } | null>(null);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSyncCenterOpen, setIsSyncCenterOpen] = useState(false);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);

  // Single-Page View Modes & Fluid Navigation
  // 'tabs' = Vue interactive avec navigation fluide Gauche ⇄ Droite (swipe & boutons)
  // 'continuous' = Vue continue Monter ↕ Descendre (toutes les sections sur 1 seule page)
  const [viewMode, setViewMode] = useState<'tabs' | 'continuous'>('tabs');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const navTrackRef = React.useRef<HTMLDivElement>(null);

  // User Space Session: Default directly to Élie Richelieu (INITIAL_SELLERS[0], Administrateur Général)
  // Direct access: No separate login barrier page ("ne fait pas la page double accès").
  const [currentUser, setCurrentUser] = useState<Seller>(() => {
    try {
      const stored = localStorage.getItem('optiboissons_current_user_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          return parsed;
        }
      }
      return INITIAL_SELLERS[0];
    } catch {
      return INITIAL_SELLERS[0];
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Administrative Role Check (Full access across the entire app)
  const isAdmin = true;

  // Fluid Navigation Handlers: Left to Right ("Aller de gauche à droite")
  const handleTabSelect = (targetTab: ActiveTab) => {
    const currentIndex = NAVIGATION_TABS.findIndex((t) => t.id === activeTab);
    const targetIndex = NAVIGATION_TABS.findIndex((t) => t.id === targetTab);
    setSlideDirection(targetIndex >= currentIndex ? 'right' : 'left');
    setActiveTab(targetTab);

    if (viewMode === 'continuous') {
      const el = document.getElementById(`section-${targetTab}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (navTrackRef.current) {
      const el = navTrackRef.current.querySelector(`[data-tab-id="${targetTab}"]`) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  const handleNextTab = () => {
    const currentIndex = NAVIGATION_TABS.findIndex((t) => t.id === activeTab);
    const nextIndex = currentIndex < NAVIGATION_TABS.length - 1 ? currentIndex + 1 : 0;
    handleTabSelect(NAVIGATION_TABS[nextIndex].id);
  };

  const handlePrevTab = () => {
    const currentIndex = NAVIGATION_TABS.findIndex((t) => t.id === activeTab);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : NAVIGATION_TABS.length - 1;
    handleTabSelect(NAVIGATION_TABS[prevIndex].id);
  };

  const handleScrollNavLeft = () => {
    if (navTrackRef.current) {
      navTrackRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const handleScrollNavRight = () => {
    if (navTrackRef.current) {
      navTrackRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  // Touch Swipe Handlers for mobile & tablet (Left ⇄ Right swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Minimum swipe threshold: 45px horizontally and predominately horizontal
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      if (deltaX < 0) {
        // Swiped left -> move to next tab (right)
        handleNextTab();
      } else {
        // Swiped right -> move to previous tab (left)
        handlePrevTab();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Smooth Scroll Handlers: Up and Down ("Monter descendre plus fluide")
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  // Core Data loaded from localStorage or seeded
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].category) {
          return parsed;
        }
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [sellers, setSellers] = useState<Seller[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SELLERS);
      return stored ? JSON.parse(stored) : INITIAL_SELLERS;
    } catch {
      return INITIAL_SELLERS;
    }
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SALES);
      return stored ? JSON.parse(stored) : generateInitialSales();
    } catch {
      return generateInitialSales();
    }
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      return stored ? JSON.parse(stored) : INITIAL_MOVEMENTS;
    } catch {
      return INITIAL_MOVEMENTS;
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return stored ? JSON.parse(stored) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.companyName) {
          return parsed;
        }
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [exchangeRates, setExchangeRates] = useState<ExchangeRateConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES);
      return stored ? JSON.parse(stored) : DEFAULT_EXCHANGE_RATES;
    } catch {
      return DEFAULT_EXCHANGE_RATES;
    }
  });

  const [exchangeTransactions, setExchangeTransactions] = useState<ExchangeTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXCHANGE_TRANSACTIONS);
      return stored ? JSON.parse(stored) : INITIAL_EXCHANGE_TRANSACTIONS;
    } catch {
      return INITIAL_EXCHANGE_TRANSACTIONS;
    }
  });

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error(e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELLERS, JSON.stringify(sellers));
    } catch (e) {
      console.error(e);
    }
  }, [sellers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch (e) {
      console.error(e);
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
    } catch (e) {
      console.error(e);
    }
  }, [movements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch (e) {
      console.error(e);
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(exchangeRates));
    } catch (e) {
      console.error(e);
    }
  }, [exchangeRates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_TRANSACTIONS, JSON.stringify(exchangeTransactions));
    } catch (e) {
      console.error(e);
    }
  }, [exchangeTransactions]);

  // Persist Current User Session
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('optiboissons_current_user_v2', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('optiboissons_current_user_v2');
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  // Keep currentUser in sync when sellers list updates from Cloud Firestore
  useEffect(() => {
    if (currentUser) {
      const fresh = sellers.find((s) => s.id === currentUser.id);
      if (fresh) {
        setCurrentUser(fresh);
      }
    }
  }, [sellers]);

  // User Login Success Handler
  const handleLoginSuccess = (user: Seller) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('optiboissons_current_user_v2', JSON.stringify(user));
      if (typeof window !== 'undefined' && window.location.search) {
        const url = new URL(window.location.href);
        url.searchParams.delete('auth');
        url.searchParams.delete('login');
        url.searchParams.delete('action');
        window.history.replaceState({}, '', url.pathname + (url.search || ''));
      }
    } catch (e) {
      console.error(e);
    }
    const updated: Seller = {
      ...user,
      lastLogin: new Date().toISOString(),
    };
    setSellers((prev) => prev.map((s) => (s.id === user.id ? updated : s)));
    syncSaveSeller(updated);
  };

  // Real-time Cloud Synchronization across Computer, Phone, and Tablet
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    // 1. Initial check & seed if Firestore database is fresh
    seedInitialDataIfEmpty();

    // 2. Real-time listeners for live multi-device synchronization
    const unsubProducts = subscribeToProducts((prods) => {
      setProducts(prods);
      setIsCloudConnected(true);
      setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    });

    const unsubSellers = subscribeToSellers((sels) => {
      setSellers(sels);
      setIsCloudConnected(true);
    });

    const unsubCustomers = subscribeToCustomers((custs) => {
      setCustomers(custs);
      setIsCloudConnected(true);
    });

    const unsubSales = subscribeToSales((sls) => {
      setSales(sls);
      setIsCloudConnected(true);
      setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    });

    const unsubMovements = subscribeToMovements((movs) => {
      setMovements(movs);
      setIsCloudConnected(true);
    });

    const unsubSettings = subscribeToSettings((sett) => {
      setSettings((prev) => {
        if (prev && prev.updatedAt && sett.updatedAt) {
          const prevTime = new Date(prev.updatedAt).getTime();
          const settTime = new Date(sett.updatedAt).getTime();
          if (prevTime > settTime) {
            // Local settings are newer than incoming cloud snapshot, preserve local and sync
            syncSaveSettings(prev);
            return prev;
          }
        }
        return sett;
      });
      setIsCloudConnected(true);
    });

    const unsubRates = subscribeToExchangeRates((rates) => {
      setExchangeRates(rates);
      setIsCloudConnected(true);
    });

    const unsubTxs = subscribeToExchangeTransactions((txs) => {
      setExchangeTransactions(txs);
      setIsCloudConnected(true);
    });

    return () => {
      unsubProducts();
      unsubSellers();
      unsubCustomers();
      unsubSales();
      unsubMovements();
      unsubSettings();
      unsubRates();
      unsubTxs();
    };
  }, []);

  // Handler: Complete a new sale (deducts stock immediately & logs movement)
  const handleCompleteSale = (newSale: Sale) => {
    // 1. Add sale to top of sales list & push to cloud
    setSales((prev) => [newSale, ...prev]);
    syncSaveSale(newSale);

    // 2. Decrement stock for all items
    const newMovements: StockMovement[] = [];
    setProducts((prevProds) => {
      return prevProds.map((prod) => {
        const itemSold = newSale.items.find((it) => it.productId === prod.id);
        if (itemSold) {
          const prevStock = prod.stock;
          const nextStock = Math.max(0, prod.stock - itemSold.quantity);

          const mov: StockMovement = {
            id: `mov-${Date.now()}-${prod.id}`,
            productId: prod.id,
            productName: prod.name,
            type: 'out',
            quantity: itemSold.quantity,
            previousStock: prevStock,
            newStock: nextStock,
            reason: `Livraison ${newSale.invoiceNumber} (${newSale.customerName})`,
            date: new Date().toISOString(),
            operator: newSale.sellerName,
          };

          newMovements.push(mov);
          syncSaveMovement(mov);

          const updatedProd = {
            ...prod,
            stock: nextStock,
            updatedAt: new Date().toISOString(),
          };
          syncSaveProduct(updatedProd);

          return updatedProd;
        }
        return prod;
      });
    });

    // 3. Append movements
    if (newMovements.length > 0) {
      setMovements((prev) => [...newMovements, ...prev]);
    }

    // 4. Update customer accumulated stats if existing
    setCustomers((prevCusts) => {
      return prevCusts.map((c) => {
        const matchCompany =
          newSale.customerCompany &&
          c.company.toLowerCase().trim() === newSale.customerCompany.toLowerCase().trim();
        const matchName =
          c.name.toLowerCase().trim() === newSale.customerName.toLowerCase().trim();

        if (matchCompany || matchName) {
          // Count consigned items (kegs/crates)
          const kegsCount = newSale.items.reduce((sum, it) => {
            const prod = products.find((p) => p.id === it.productId);
            return sum + (prod?.isConsigne ? it.quantity : 0);
          }, 0);

          const updatedCust = {
            ...c,
            totalSpent: c.totalSpent + newSale.totalHT,
            activeKegsConsigned: c.activeKegsConsigned + kegsCount,
          };
          syncSaveCustomer(updatedCust);

          return updatedCust;
        }
        return c;
      });
    });
  };

  // Handler: Restock an item
  const handleRestock = (productId: string, quantity: number, reason = 'Réapprovisionnement Brasserie/Fournisseur') => {
    let targetProdName = '';
    let prevStock = 0;
    let nextStock = 0;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          targetProdName = p.name;
          prevStock = p.stock;
          nextStock = p.stock + quantity;
          const updated = {
            ...p,
            stock: nextStock,
            updatedAt: new Date().toISOString(),
          };
          syncSaveProduct(updated);
          return updated;
        }
        return p;
      })
    );

    const mov: StockMovement = {
      id: `mov-${Date.now()}`,
      productId,
      productName: targetProdName,
      type: 'in',
      quantity,
      previousStock: prevStock,
      newStock: nextStock,
      reason,
      date: new Date().toISOString(),
      operator: 'Gestionnaire Entrepôt Boissons',
    };
    setMovements((prev) => [mov, ...prev]);
    syncSaveMovement(mov);
  };

  // Handler: Add a brand new product
  const handleAddProduct = (newProd: Omit<Product, 'id' | 'updatedAt'>) => {
    const id = `prod-${Date.now()}`;
    const product: Product = {
      ...newProd,
      id,
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [product, ...prev]);
    syncSaveProduct(product);

    if (newProd.stock > 0) {
      const mov: StockMovement = {
        id: `mov-${Date.now()}`,
        productId: id,
        productName: newProd.name,
        type: 'in',
        quantity: newProd.stock,
        previousStock: 0,
        newStock: newProd.stock,
        reason: 'Réception initiale brasserie/embouteilleur',
        date: new Date().toISOString(),
        operator: 'Direction des Approvisionnements',
      };
      setMovements((prev) => [mov, ...prev]);
      syncSaveMovement(mov);
    }
  };

  // Handler: Update product
  const handleUpdateProduct = (updated: Product) => {
    // If stock changed directly, log a movement
    const prev = products.find((p) => p.id === updated.id);
    if (prev && prev.stock !== updated.stock) {
      const diff = updated.stock - prev.stock;
      const mov: StockMovement = {
        id: `mov-${Date.now()}`,
        productId: updated.id,
        productName: updated.name,
        type: diff > 0 ? 'in' : 'out',
        quantity: Math.abs(diff),
        previousStock: prev.stock,
        newStock: updated.stock,
        reason: 'Ajustement manuel inventaire',
        date: new Date().toISOString(),
        operator: 'Responsable Stock',
      };
      setMovements((prevMovs) => [mov, ...prevMovs]);
      syncSaveMovement(mov);
    }
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    syncSaveProduct(updated);
  };

  // Handler: Delete product
  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    syncDeleteProduct(productId);
  };

  // Handler: Add Customer
  const handleAddCustomer = (newCust: Omit<Customer, 'id' | 'createdAt' | 'totalSpent'>) => {
    const id = `cust-${Date.now()}`;
    const cust: Customer = {
      ...newCust,
      id,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [cust, ...prev]);
    syncSaveCustomer(cust);
  };

  // Handler: Update Customer
  const handleUpdateCustomer = (updated: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    syncSaveCustomer(updated);
  };

  // Handler: Add Seller / User
  const handleAddSeller = (newSeller: Omit<Seller, 'id'>) => {
    const id = `sel-${Date.now()}`;
    const seller: Seller = {
      ...newSeller,
      id,
      status: newSeller.status || 'Actif',
      lastLogin: new Date().toISOString(),
    };
    setSellers((prev) => [...prev, seller]);
    syncSaveSeller(seller);
  };

  // Handler: Update Seller / User
  const handleUpdateSeller = (updatedSeller: Seller) => {
    setSellers((prev) => prev.map((s) => (s.id === updatedSeller.id ? updatedSeller : s)));
    syncSaveSeller(updatedSeller);
  };

  // Handler: Delete Seller / User
  const handleDeleteSeller = (sellerId: string) => {
    setSellers((prev) => prev.filter((s) => s.id !== sellerId));
    syncDeleteSeller(sellerId);
  };

  // Handler: Update Exchange Rates
  const handleUpdateExchangeRates = (newRates: ExchangeRateConfig) => {
    setExchangeRates(newRates);
    syncSaveExchangeRates(newRates);
  };

  // Handler: Add Exchange Transaction
  const handleAddExchangeTransaction = (newTx: Omit<ExchangeTransaction, 'id'>) => {
    const id = `exc-${Date.now()}`;
    const tx: ExchangeTransaction = { ...newTx, id };
    setExchangeTransactions((prev) => [tx, ...prev]);
    syncSaveExchangeTransaction(tx);
  };

  // Handler: Delete Exchange Transaction
  const handleDeleteExchangeTransaction = (id: string) => {
    setExchangeTransactions((prev) => prev.filter((tx) => tx.id !== id));
    syncDeleteExchangeTransaction(id);
  };

  // Handler: Save Settings
  const handleSaveSettings = async (newSettings: AppSettings) => {
    const stampedSettings: AppSettings = {
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    setSettings(stampedSettings);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(stampedSettings));
    } catch (e) {
      console.error(e);
    }
    await syncSaveSettings(stampedSettings);
  };

  // Handler: Update Sale / Invoice status
  const handleUpdateSaleStatus = (
    saleId: string,
    newStatus: 'completed' | 'pending' | 'cancelled',
    paymentMethod?: Sale['paymentMethod']
  ) => {
    setSales((prev) =>
      prev.map((s) => {
        if (s.id === saleId) {
          const updated: Sale = {
            ...s,
            status: newStatus,
            ...(paymentMethod ? { paymentMethod } : {}),
          };
          syncSaveSale(updated);
          return updated;
        }
        return s;
      })
    );
  };

  // Reset demo data
  const handleResetAllData = () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SELLERS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.EXCHANGE_RATES);
    localStorage.removeItem(STORAGE_KEYS.EXCHANGE_TRANSACTIONS);
    setProducts(INITIAL_PRODUCTS);
    setSellers(INITIAL_SELLERS);
    setSales(generateInitialSales());
    setMovements(INITIAL_MOVEMENTS);
    setCustomers(INITIAL_CUSTOMERS);
    setSettings(DEFAULT_SETTINGS);
    setExchangeRates(DEFAULT_EXCHANGE_RATES);
    setExchangeTransactions(INITIAL_EXCHANGE_TRANSACTIONS);
    syncResetAllDataToDefault();
  };

  // Quick sale for specific seller
  const handleOpenSaleForSeller = (sellerId: string) => {
    setSelectedSellerForSale(sellerId);
    setSelectedCustomerForSale(null);
    setIsNewSaleOpen(true);
  };

  // Quick sale for specific customer
  const handleStartSaleForCustomer = (customer: Customer) => {
    setSelectedCustomerForSale({
      name: customer.name,
      company: customer.company,
    });
    setSelectedSellerForSale(undefined);
    setIsNewSaleOpen(true);
  };

  // Render Workspace directly without any login barrier ("ne fait pas la page double accès")
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Official Single Link Notice Banner */}
      {typeof window !== 'undefined' &&
        !window.location.hostname.includes('gestion-de-ventanakayit.netlify.app') &&
        !window.location.hostname.includes('localhost') && (
          <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white px-3 sm:px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold text-amber-300">Lien Officiel Unique :</span>
              <a
                href="https://gestion-de-ventanakayit.netlify.app/"
                className="font-mono font-bold text-white hover:text-amber-200 underline"
              >
                https://gestion-de-ventanakayit.netlify.app/
              </a>
              <span className="text-slate-300 text-[11px] hidden md:inline">
                (Tous les autres liens sont inactifs pour assurer un travail unique)
              </span>
            </div>
            <a
              href="https://gestion-de-ventanakayit.netlify.app/"
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md text-[11px] transition shadow-xs whitespace-nowrap ml-auto"
            >
              Basculer sur le lien officiel →
            </a>
          </div>
        )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Brand Wordmark & Single Official Link */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs ring-1 ring-amber-600/30 shrink-0 hover:scale-105 transition-transform"
                title="Distribution de Boissons & Eaux"
              >
                <WaterBottleLogo className="w-5 h-5 text-white drop-shadow-xs" />
              </span>
              <div className="leading-tight">
                <span className="text-base font-bold tracking-tight text-slate-900 block">
                  {settings.companyName || 'DistriBoissons Pro'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Boissons Gazeuses & Alcoolisées
                </span>
              </div>
            </div>

            {/* Single Official Link Badge */}
            <a
              href="https://gestion-de-ventanakayit.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-[11px] font-mono text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
              title="Lien officiel unique (Tous les autres liens sont inactifs)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">gestion-de-ventanakayit.netlify.app</span>
              <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold uppercase">
                Actif
              </span>
            </a>
          </div>

          {/* View Mode Switcher: Onglets (Gauche ⇄ Droite) vs Page Continue (Monter ↕ Descendre) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('tabs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'tabs'
                  ? 'bg-white text-amber-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Navigation fluide d'un onglet à l'autre (Aller de gauche à droite)"
            >
              <MoveHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Onglets Fluides</span>
              <span className="sm:hidden">Onglets</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('continuous');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'continuous'
                  ? 'bg-white text-amber-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Afficher toutes les sections sur une seule page continue (Monter et descendre de façon fluide)"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Page Continue</span>
              <span className="sm:hidden">1 Page</span>
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* User Space Session & Login Profile */}
            <div className="relative">
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/50 shadow-2xs transition-all cursor-pointer"
                  title="Mon Espace Collaborateur - Cliquer pour changer de compte ou voir les détails"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-amber-500/40"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="text-left hidden xl:block leading-tight max-w-[120px]">
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {currentUser.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Connexion avec Email ou Téléphone et mot de passe"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Connexion</span>
                </button>
              )}

              {/* User Dropdown */}
              {isUserMenuOpen && currentUser && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</span>
                        {isAdmin ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-0.5 shrink-0">
                            <Crown className="w-2.5 h-2.5 text-amber-600" />
                            Admin
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 shrink-0">
                            Commercial
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.role}</div>
                      <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5">{currentUser.email}</div>
                      {currentUser.phone && (
                        <div className="text-[10px] text-slate-400 truncate font-mono">{currentUser.phone}</div>
                      )}
                    </div>
                  </div>

                  <div className="px-2 py-1.5">
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setActiveTab('users');
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-amber-700 rounded-lg flex items-center gap-2 transition cursor-pointer"
                      >
                        <UserCog className="w-4 h-4 text-slate-400" />
                        <span>Gestion de l'Équipe & Rôles</span>
                      </button>
                    ) : (
                      <div className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50 rounded-lg flex items-center gap-2 mb-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Accès Commercial restreint (Ventes & Factures)</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLoginModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-amber-700 rounded-lg flex items-center gap-2 transition cursor-pointer"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                      <span>Changer d'utilisateur (Email / Tél)</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 px-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentUser(INITIAL_SELLERS[0]);
                        try {
                          localStorage.removeItem('optiboissons_current_user_v2');
                        } catch (e) {
                          console.error(e);
                        }
                        setIsUserMenuOpen(false);
                        setIsLoginModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Changer d'utilisateur / Profil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PWA Direct Mobile Install Button */}
            <PWAInstallButton />

            {/* Real-time Cloud Sync Badge & Center Opener */}
            <button
              type="button"
              onClick={() => setIsSyncCenterOpen(true)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                isCloudConnected
                  ? 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-300 text-emerald-800'
                  : 'bg-amber-50 hover:bg-amber-100/80 border-amber-300 text-amber-800'
              }`}
              title={`Données connectées au Cloud Firestore en temps réel. Cliquez pour ouvrir le Centre de Synchronisation Netlify & GitHub. ${lastSyncTime ? `Dernière synchro : ${lastSyncTime}` : ''}`}
            >
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Cloud Synchro</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Obtenir le lien de partage pour permettre aux utilisateurs de se connecter"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Partager</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileGuideOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Guide de lancement mobile : Google Play et Apple App Store"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">App Store & Play</span>
              <span className="sm:hidden">Mobile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedSellerForSale(undefined);
                setSelectedCustomerForSale(null);
                setIsNewSaleOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nouvelle Vente</span>
            </button>
          </div>
        </div>

        {/* Universal Horizontal Navigation Track: Left ⇄ Right ("Aller de gauche à droite") */}
        <div className="border-t border-slate-200 bg-slate-50/95 backdrop-blur-md px-2 sm:px-4 py-2 flex items-center gap-1.5 shadow-2xs">
          <button
            type="button"
            onClick={handleScrollNavLeft}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shadow-2xs shrink-0 cursor-pointer"
            title="Faire défiler la barre vers la gauche"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={navTrackRef}
            className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
          >
            {NAVIGATION_TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-tab-id={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                  title={`${tab.label} : ${tab.description}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-amber-600'}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleScrollNavRight}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shadow-2xs shrink-0 cursor-pointer"
            title="Faire défiler la barre vers la droite"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Workspace (Single Page, Fluid Navigation) */}
      <main
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <React.Suspense fallback={<ViewLoadingFallback />}>
          {viewMode === 'tabs' ? (
            /* Mode 1: Navigation Onglets Fluides (Gauche ⇄ Droite avec Swipe & Animation) */
            <div
              key={activeTab}
              className={`space-y-6 ${
                slideDirection === 'right' ? 'animate-slide-right' : 'animate-slide-left'
              }`}
            >
              {activeTab === 'dashboard' && (
                <OverviewDashboard
                  products={products}
                  sellers={sellers}
                  sales={sales}
                  onOpenNewSale={() => {
                    setSelectedSellerForSale(currentUser?.id || undefined);
                    setSelectedCustomerForSale(null);
                    setIsNewSaleOpen(true);
                  }}
                  onNavigateToStocks={() => handleTabSelect('inventory')}
                  onNavigateToSellers={() => handleTabSelect('users')}
                  onNavigateToSales={() => handleTabSelect('sales')}
                  onNavigateToInvoices={() => handleTabSelect('invoices')}
                  onNavigateToExchange={() => handleTabSelect('exchange')}
                  exchangeRates={exchangeRates}
                  onRestock={handleRestock}
                  onPrintSale={setSaleToPrint}
                  currentUser={currentUser}
                  onOpenLoginModal={() => setIsLoginModalOpen(true)}
                  isAdmin={isAdmin}
                />
              )}

              {(activeTab === 'inventory' || activeTab === 'stocks') && (
                <StockManagementView
                  products={products}
                  movements={movements}
                  onUpdateProduct={handleUpdateProduct}
                  onAddProduct={handleAddProduct}
                  onRestock={handleRestock}
                  onDeleteProduct={handleDeleteProduct}
                  isAdmin={isAdmin}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersManagementView
                  customers={customers}
                  onAddCustomer={handleAddCustomer}
                  onUpdateCustomer={handleUpdateCustomer}
                  onStartSaleForCustomer={handleStartSaleForCustomer}
                />
              )}

              {activeTab === 'sales' && (
                <SalesHistoryView
                  sales={sales}
                  sellers={sellers}
                  products={products}
                  customers={customers}
                  onCompleteSale={handleCompleteSale}
                  onOpenNewSale={() => {
                    setSelectedSellerForSale(currentUser?.id || undefined);
                    setSelectedCustomerForSale(null);
                    setIsNewSaleOpen(true);
                  }}
                  onPrintSale={setSaleToPrint}
                  defaultTaxRate={settings.defaultTaxRate}
                />
              )}

              {activeTab === 'invoices' && (
                <InvoicesManagementView
                  sales={sales}
                  sellers={sellers}
                  products={products}
                  customers={customers}
                  settings={settings}
                  exchangeRates={exchangeRates}
                  onUpdateSaleStatus={handleUpdateSaleStatus}
                  onOpenNewSale={() => {
                    setSelectedSellerForSale(currentUser?.id || undefined);
                    setSelectedCustomerForSale(null);
                    setIsNewSaleOpen(true);
                  }}
                  onPrintSale={setSaleToPrint}
                />
              )}

              {activeTab === 'exchange' && (
                <CurrencyExchangeView
                  rates={exchangeRates}
                  transactions={exchangeTransactions}
                  sellers={sellers}
                  onUpdateRates={handleUpdateExchangeRates}
                  onAddTransaction={handleAddExchangeTransaction}
                  onDeleteTransaction={handleDeleteExchangeTransaction}
                />
              )}

              {(activeTab === 'reports' || activeTab === 'profitability') && (
                <FinancialReportsView
                  sales={sales}
                  products={products}
                  sellers={sellers}
                />
              )}

              {(activeTab === 'users' || activeTab === 'sellers') && (
                <UsersManagementView
                  sellers={sellers}
                  sales={sales}
                  onAddSeller={handleAddSeller}
                  onUpdateSeller={handleUpdateSeller}
                  onDeleteSeller={handleDeleteSeller}
                  onOpenNewSaleForSeller={handleOpenSaleForSeller}
                  currentUser={currentUser}
                  onSelectCurrentUser={(u) => handleLoginSuccess(u)}
                  onOpenLoginModal={() => setIsLoginModalOpen(true)}
                  isAdmin={isAdmin}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsManagementView
                  settings={settings}
                  sellers={sellers}
                  onSaveSettings={handleSaveSettings}
                  onResetAllData={handleResetAllData}
                  onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
                  onOpenCloudSync={() => setIsSyncCenterOpen(true)}
                />
              )}

              {/* Bottom Horizontal Stepper: Left ⇄ Right Navigation */}
              <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={handlePrevTab}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-amber-600" />
                  <span>
                    Précédent :{' '}
                    {
                      NAVIGATION_TABS[
                        (NAVIGATION_TABS.findIndex((t) => t.id === activeTab) - 1 + NAVIGATION_TABS.length) %
                          NAVIGATION_TABS.length
                      ].label
                    }
                  </span>
                </button>

                {/* Progress Dots Indicator */}
                <div className="flex items-center gap-1.5">
                  {NAVIGATION_TABS.map((t, idx) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTabSelect(t.id)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeTab === t.id ? 'w-6 bg-amber-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                      }`}
                      title={`${idx + 1}. ${t.label}`}
                    />
                  ))}
                  <span className="text-[11px] text-slate-500 font-mono ml-2">
                    {NAVIGATION_TABS.findIndex((t) => t.id === activeTab) + 1} / {NAVIGATION_TABS.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextTab}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <span>
                    Suivant :{' '}
                    {
                      NAVIGATION_TABS[
                        (NAVIGATION_TABS.findIndex((t) => t.id === activeTab) + 1) % NAVIGATION_TABS.length
                      ].label
                    }
                  </span>
                  <ChevronRight className="w-4 h-4 text-amber-200" />
                </button>
              </div>
            </div>
          ) : (
            /* Mode 2: Vue Continue 1 Seule Page (Monter ↕ Descendre de façon fluide) */
            <div className="space-y-16">
              {/* Section 1: Dashboard */}
              <section id="section-dashboard" className="scroll-mt-32 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-amber-600" />
                        <span>Tableau de Bord Global & Indicateurs Clés</span>
                      </h2>
                      <p className="text-xs text-slate-500">Chiffre d'affaires, stocks critiques et performances</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs text-amber-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Haut ↑</span>
                  </button>
                </div>
                <OverviewDashboard
                  products={products}
                  sellers={sellers}
                  sales={sales}
                  onOpenNewSale={() => {
                    setSelectedSellerForSale(currentUser?.id || undefined);
                    setSelectedCustomerForSale(null);
                    setIsNewSaleOpen(true);
                  }}
                  onNavigateToStocks={() => handleTabSelect('inventory')}
                  onNavigateToSellers={() => handleTabSelect('users')}
                  onNavigateToSales={() => handleTabSelect('sales')}
                  onNavigateToInvoices={() => handleTabSelect('invoices')}
                  onNavigateToExchange={() => handleTabSelect('exchange')}
                  exchangeRates={exchangeRates}
                  onRestock={handleRestock}
                  onPrintSale={setSaleToPrint}
                  currentUser={currentUser}
                  onOpenLoginModal={() => setIsLoginModalOpen(true)}
                  isAdmin={isAdmin}
                />
              </section>

              {/* Section 2: Inventaire Boissons */}
              <section id="section-inventory" className="scroll-mt-32 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-amber-600" />
                        <span>Inventaire des Boissons, Fûts & Casiers</span>
                      </h2>
                      <p className="text-xs text-slate-500">Gestion des stocks en temps réel et réapprovisionnements</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs text-amber-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Haut ↑</span>
                  </button>
                </div>
                <StockManagementView
                  products={products}
                  movements={movements}
                  onUpdateProduct={handleUpdateProduct}
                  onAddProduct={handleAddProduct}
                  onRestock={handleRestock}
                  onDeleteProduct={handleDeleteProduct}
                  isAdmin={isAdmin}
                />
              </section>

              {/* Section 3: Ventes */}
              <section id="section-sales" className="scroll-mt-32 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      3
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-amber-600" />
                        <span>Historique & Commandes de Ventes</span>
                      </h2>
                      <p className="text-xs text-slate-500">Ventes directes, livraisons et tickets de caisse</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs text-amber-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Haut ↑</span>
                  </button>
                </div>
                <SalesHistoryView
                  sales={sales}
                  sellers={sellers}
                  products={products}
                  customers={customers}
                  onCompleteSale={handleCompleteSale}
                  onOpenNewSale={() => {
                    setSelectedSellerForSale(currentUser?.id || undefined);
                    setSelectedCustomerForSale(null);
                    setIsNewSaleOpen(true);
                  }}
                  onPrintSale={setSaleToPrint}
                  defaultTaxRate={settings.defaultTaxRate}
                />
              </section>

              {/* Section 4: Factures */}
              <section id="section-invoices" className="scroll-mt-32 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      4
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <span>Facturation, Créances & Règlements Clients</span>
                      </h2>
                      <p className="text-xs text-slate-500">Statuts de paiement, encaissements et suivi des échéances</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs text-amber-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Haut ↑</span>
                  </button>
                </div>
                <InvoicesManagementView
                  sales={sales}
                  sellers={sellers}
                  products={products}
                  customers={customers}
                  settings={settings}
                  exchangeRates={exchangeRates}
                  onUpdateSaleStatus={handleUpdateSaleStatus}
                  onOpenNewSale={() => {
                    setSelectedSellerForSale(currentUser?.id || undefined);
                    setSelectedCustomerForSale(null);
                    setIsNewSaleOpen(true);
                  }}
                  onPrintSale={setSaleToPrint}
                />
              </section>

              {/* Section 5: Clients & Consignes */}
              <section id="section-customers" className="scroll-mt-32 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      5
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-600" />
                        <span>Répertoire Clients & Suivi des Consignes</span>
                      </h2>
                      <p className="text-xs text-slate-500">Fûts inox en circulation, coordonnées et encours autorisés</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs text-amber-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Haut ↑</span>
                  </button>
                </div>
                <CustomersManagementView
                  customers={customers}
                  onAddCustomer={handleAddCustomer}
                  onUpdateCustomer={handleUpdateCustomer}
                  onStartSaleForCustomer={handleStartSaleForCustomer}
                />
              </section>

              {/* Section 6: Change Devises */}
              <section id="section-exchange" className="scroll-mt-32 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      6
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-amber-600" />
                        <span>Bureau de Change Multi-Devises (USD / DOP en Gourdes)</span>
                      </h2>
                      <p className="text-xs text-slate-500">Taux d'achat et de vente, conversion automatique en caisse</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs text-amber-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Haut ↑</span>
                  </button>
                </div>
                <CurrencyExchangeView
                  rates={exchangeRates}
                  transactions={exchangeTransactions}
                  sellers={sellers}
                  onUpdateRates={handleUpdateExchangeRates}
                  onAddTransaction={handleAddExchangeTransaction}
                  onDeleteTransaction={handleDeleteExchangeTransaction}
                />
              </section>

              {/* Section 7: Rapports Financiers */}
              <section id="section-reports" className="scroll-mt-32 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      7
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                        <span>Rapports Financiers & Rentabilité Globale</span>
                      </h2>
                      <p className="text-xs text-slate-500">Marges brutes, statistiques et analyse de rentabilité</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs text-amber-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Haut ↑</span>
                  </button>
                </div>
                <FinancialReportsView
                  sales={sales}
                  products={products}
                  sellers={sellers}
                />
              </section>

              {/* Section 8: Utilisateurs & Équipe */}
              <section id="section-users" className="scroll-mt-32 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      8
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-amber-600" />
                        <span>Utilisateurs, Vendeurs & Objectifs Commerciaux</span>
                      </h2>
                      <p className="text-xs text-slate-500">Gestion de l'équipe commerciale et commissions</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs text-amber-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Haut ↑</span>
                  </button>
                </div>
                <UsersManagementView
                  sellers={sellers}
                  sales={sales}
                  onAddSeller={handleAddSeller}
                  onUpdateSeller={handleUpdateSeller}
                  onDeleteSeller={handleDeleteSeller}
                  onOpenNewSaleForSeller={handleOpenSaleForSeller}
                  currentUser={currentUser}
                  onSelectCurrentUser={(u) => handleLoginSuccess(u)}
                  onOpenLoginModal={() => setIsLoginModalOpen(true)}
                  isAdmin={isAdmin}
                />
              </section>

              {/* Section 9: Paramètres */}
              <section id="section-settings" className="scroll-mt-32 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      9
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-amber-600" />
                        <span>Paramètres de l'Entreprise, Facturation & Synchronisation</span>
                      </h2>
                      <p className="text-xs text-slate-500">Coordonnées, consignes, taxes et protection des données</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs text-amber-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Haut ↑</span>
                  </button>
                </div>
                <SettingsManagementView
                  settings={settings}
                  sellers={sellers}
                  onSaveSettings={handleSaveSettings}
                  onResetAllData={handleResetAllData}
                  onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
                  onOpenCloudSync={() => setIsSyncCenterOpen(true)}
                />
              </section>
            </div>
          )}
        </React.Suspense>
      </main>

      {/* Floating Quick Navigation & Scroll Bar: Monter ↕ Descendre et Gauche ⇄ Droite */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-1 bg-slate-900/90 hover:bg-slate-900 text-white p-1.5 rounded-2xl shadow-xl backdrop-blur-md border border-slate-700/60 transition-transform">
        <button
          type="button"
          onClick={handlePrevTab}
          className="p-2 hover:bg-white/15 rounded-xl transition text-slate-300 hover:text-white cursor-pointer"
          title="Onglet précédent (Gauche ←)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={scrollToTop}
          className="px-2.5 py-1.5 hover:bg-white/15 rounded-xl transition text-slate-300 hover:text-white flex items-center gap-1 text-xs font-semibold cursor-pointer"
          title="Monter en haut de page (Fluide ↑)"
        >
          <ArrowUp className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Haut</span>
        </button>
        <button
          type="button"
          onClick={scrollToBottom}
          className="px-2.5 py-1.5 hover:bg-white/15 rounded-xl transition text-slate-300 hover:text-white flex items-center gap-1 text-xs font-semibold cursor-pointer"
          title="Descendre en bas de page (Fluide ↓)"
        >
          <ArrowDown className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Bas</span>
        </button>
        <button
          type="button"
          onClick={handleNextTab}
          className="p-2 hover:bg-white/15 rounded-xl transition text-slate-300 hover:text-white cursor-pointer"
          title="Onglet suivant (Droite →)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Lazy Modals loaded on-demand */}
      <React.Suspense fallback={null}>
        {isNewSaleOpen && (
          <NewSaleModal
            isOpen={isNewSaleOpen}
            onClose={() => setIsNewSaleOpen(false)}
            products={products}
            sellers={sellers}
            onCompleteSale={handleCompleteSale}
            initialSellerId={selectedSellerForSale || currentUser?.id}
            initialCustomerName={selectedCustomerForSale?.name}
            initialCustomerCompany={selectedCustomerForSale?.company}
            onPrintSale={setSaleToPrint}
            defaultTaxRate={settings.defaultTaxRate}
          />
        )}

        {saleToPrint && (
          <InvoiceReceiptModal
            sale={saleToPrint}
            settings={settings}
            onClose={() => setSaleToPrint(null)}
          />
        )}

        {isMobileGuideOpen && (
          <MobileDeploymentGuideModal
            isOpen={isMobileGuideOpen}
            onClose={() => setIsMobileGuideOpen(false)}
          />
        )}

        {isShareModalOpen && (
          <ShareAppModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
          />
        )}

        {isLoginModalOpen && (
          <UserLoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            sellers={sellers}
            currentUser={currentUser}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {isSyncCenterOpen && (
          <CloudSyncCenterModal
            isOpen={isSyncCenterOpen}
            onClose={() => setIsSyncCenterOpen(false)}
            fullData={{
              products,
              sellers,
              customers,
              sales,
              movements,
              settings,
              exchangeRates,
              exchangeTransactions,
            }}
            lastSyncTime={lastSyncTime}
            isCloudConnected={isCloudConnected}
          />
        )}
      </React.Suspense>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              {settings.companyName || 'DistriBoissons & Vins SAS'}
            </span>
            <span>·</span>
            <span>SIRET: {settings.companySiret || '849 231 902 00028'}</span>
            <span>·</span>
            <span>Consignes: {settings.kegConsignmentDepositPrice || 3000} HTG/fût inox</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="hover:text-slate-800 transition-colors"
            >
              Inventaire & Consignes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className="hover:text-slate-800 transition-colors"
            >
              Clients CHR
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="hover:text-slate-800 transition-colors"
            >
              Rapports
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="hover:text-slate-800 transition-colors"
            >
              Paramètres
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
