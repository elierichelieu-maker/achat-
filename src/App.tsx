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
import { AccessDeniedView } from './components/common/AccessDeniedView';

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
import { LoginPage } from './components/auth/LoginPage';
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

  // User Space Session (Logged in user)
  // When a link is shared or opened on a new device, currentUser is null by default,
  // prompting the user with the login page.
  const [currentUser, setCurrentUser] = useState<Seller | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        // If link explicitly specifies ?auth=login, ?login=true, ?action=login, or is opened via shared link, force login screen
        if (
          urlParams.get('auth') === 'login' ||
          urlParams.get('login') === 'true' ||
          urlParams.get('action') === 'login' ||
          urlParams.has('share') ||
          urlParams.has('shared') ||
          urlParams.has('connect')
        ) {
          localStorage.removeItem('optiboissons_current_user_v2');
          return null;
        }
      }
      const stored = localStorage.getItem('optiboissons_current_user_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          return parsed;
        }
      }
      // No active session on this device or when opening a fresh shared link: show login page!
      return null;
    } catch {
      return null;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Administrative Role Check: Only administrator has access to all features
  const isAdmin = isUserAdmin(currentUser);

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

  // Full-screen Login Gate: If no active user is logged in, display the Login Page immediately
  if (!currentUser) {
    return (
      <LoginPage
        sellers={sellers}
        onLoginSuccess={handleLoginSuccess}
        isCloudConnected={isCloudConnected}
      />
    );
  }

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

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'border-amber-600 text-amber-700 font-bold'
                  : 'border-transparent'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Tableau de Bord</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'inventory' || activeTab === 'stocks'
                  ? 'border-amber-600 text-amber-700 font-bold'
                  : 'border-transparent'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Inventaire' : 'Catalogue Boissons'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'customers'
                  ? 'border-amber-600 text-amber-700 font-bold'
                  : 'border-transparent'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clients</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sales'
                  ? 'border-amber-600 text-amber-700 font-bold'
                  : 'border-transparent'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Ventes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'invoices'
                  ? 'border-amber-600 text-amber-700 font-bold'
                  : 'border-transparent'
              }`}
              title="Gestion des factures, créances et encaissements"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Factures</span>
            </button>

            {/* Administrator Only Tabs */}
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('exchange')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'exchange'
                      ? 'border-amber-600 text-amber-700 font-bold'
                      : 'border-transparent'
                  }`}
                  title="Change Dollars USD et Pesos DOP en Gourdes Haïtiennes (HTG)"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                  <span>Change USD/DOP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'reports' || activeTab === 'profitability'
                      ? 'border-amber-600 text-amber-700 font-bold'
                      : 'border-transparent'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                  <span>Rapports</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'users'
                      ? 'border-amber-600 text-amber-700 font-bold'
                      : 'border-transparent'
                  }`}
                >
                  <UserCog className="w-3.5 h-3.5 text-amber-600" />
                  <span>Utilisateurs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'settings'
                      ? 'border-amber-600 text-amber-700 font-bold'
                      : 'border-transparent'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-amber-600" />
                  <span>Paramètres</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent flex items-center gap-1 text-slate-400 hover:text-amber-700 cursor-pointer"
                title="Sections d'administration verrouillées pour les profils non-administrateurs"
              >
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Espace Admin</span>
              </button>
            )}
          </nav>

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
                        setCurrentUser(null);
                        try {
                          localStorage.removeItem('optiboissons_current_user_v2');
                        } catch (e) {
                          console.error(e);
                        }
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Se déconnecter</span>
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

        {/* Mobile / Tablet Horizontal Navigation Scroll */}
        <div className="lg:hidden flex items-center justify-around border-t border-slate-100 bg-slate-50/90 px-2 py-2 text-xs font-medium text-slate-600 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-white text-amber-700 shadow-xs font-bold' : ''
            }`}
          >
            Tableau de Bord
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'inventory' || activeTab === 'stocks' ? 'bg-white text-amber-700 shadow-xs font-bold' : ''
            }`}
          >
            Inventaire
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'customers' ? 'bg-white text-amber-700 shadow-xs font-bold' : ''
            }`}
          >
            Clients
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'sales' ? 'bg-white text-amber-700 shadow-xs font-bold' : ''
            }`}
          >
            Ventes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'invoices' ? 'bg-white text-amber-700 shadow-xs font-bold' : ''
            }`}
          >
            Factures
          </button>
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('exchange')}
                className={`px-2.5 py-1 rounded whitespace-nowrap ${
                  activeTab === 'exchange' ? 'bg-white text-amber-700 shadow-xs font-bold' : ''
                }`}
              >
                Change (USD/DOP)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`px-2.5 py-1 rounded whitespace-nowrap ${
                  activeTab === 'reports' || activeTab === 'profitability' ? 'bg-white text-amber-700 shadow-xs font-bold' : ''
                }`}
              >
                Rapports
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`px-2.5 py-1 rounded whitespace-nowrap ${
                  activeTab === 'users' ? 'bg-white text-amber-700 shadow-xs font-bold' : ''
                }`}
              >
                Utilisateurs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-2.5 py-1 rounded whitespace-nowrap ${
                  activeTab === 'settings' ? 'bg-white text-amber-700 shadow-xs font-bold' : ''
                }`}
              >
                Paramètres
              </button>
            </>
          ) : (
            <span className="px-2 py-1 text-[11px] text-slate-400 flex items-center gap-1 whitespace-nowrap font-medium">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>Admin Restreint</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <React.Suspense fallback={<ViewLoadingFallback />}>
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
              onNavigateToStocks={() => setActiveTab('inventory')}
              onNavigateToSellers={() => setActiveTab(isAdmin ? 'users' : 'dashboard')}
              onNavigateToSales={() => setActiveTab('sales')}
              onNavigateToInvoices={() => setActiveTab('invoices')}
              onNavigateToExchange={() => setActiveTab(isAdmin ? 'exchange' : 'dashboard')}
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
            isAdmin ? (
              <CurrencyExchangeView
                rates={exchangeRates}
                transactions={exchangeTransactions}
                sellers={sellers}
                onUpdateRates={handleUpdateExchangeRates}
                onAddTransaction={handleAddExchangeTransaction}
                onDeleteTransaction={handleDeleteExchangeTransaction}
              />
            ) : (
              <AccessDeniedView
                featureName="Module de Change & Taux de Devises (USD / DOP)"
                onBackToSafety={() => setActiveTab('dashboard')}
                currentUser={currentUser}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            )
          )}

          {(activeTab === 'reports' || activeTab === 'profitability') && (
            isAdmin ? (
              <FinancialReportsView
                sales={sales}
                products={products}
                sellers={sellers}
              />
            ) : (
              <AccessDeniedView
                featureName="Rapports Financiers & Rentabilité Globale"
                onBackToSafety={() => setActiveTab('dashboard')}
                currentUser={currentUser}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            )
          )}

          {(activeTab === 'users' || activeTab === 'sellers') && (
            isAdmin ? (
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
            ) : (
              <AccessDeniedView
                featureName="Gestion des Utilisateurs, Rôles & Permissions"
                onBackToSafety={() => setActiveTab('dashboard')}
                currentUser={currentUser}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            )
          )}

          {activeTab === 'settings' && (
            isAdmin ? (
              <SettingsManagementView
                settings={settings}
                sellers={sellers}
                onSaveSettings={handleSaveSettings}
                onResetAllData={handleResetAllData}
                onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
                onOpenCloudSync={() => setIsSyncCenterOpen(true)}
              />
            ) : (
              <AccessDeniedView
                featureName="Paramètres de l'Entreprise & Facturation"
                onBackToSafety={() => setActiveTab('dashboard')}
                currentUser={currentUser}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            )
          )}
        </React.Suspense>
      </main>

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
