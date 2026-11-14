import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Seller, Sale, Customer, ActiveTab } from './types';
import { INITIAL_SELLERS } from './data/mockData';
import { DashboardPage } from './pages/DashboardPage';
import {
  NAVIGATION_TABS,
  MOBILE_PRIMARY_TAB_IDS,
  STORAGE_KEYS,
} from './constants/navigation';
import { useAppData } from './hooks/useAppData';
import { sellersService } from './services/dataService';
import { DashboardSkeleton, ViewLoadingFallback } from './components/common/LoadingSkeleton';
import { StatusFeedbackBanner } from './components/common/StatusFeedbackBanner';
import { CollapsibleSection } from './components/common/CollapsibleSection';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { WaterBottleLogo } from './components/common/WaterBottleLogo';
import { formatHTG } from './utils/formatters';
import { smoothScrollToY, smoothScrollToElement } from './utils/smoothScroll';
import {
  PlusCircle,
  Smartphone,
  Cloud,
  Share2,
  KeyRound,
  LogOut,
  ChevronDown,
  ChevronUp,
  Crown,
  Lock,
  UserCog,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  MoveHorizontal,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Minimize2,
  Maximize2,
} from 'lucide-react';

// Chargement paresseux des pages pour optimiser le démarrage mobile et la taille du bundle
const InventoryPage = React.lazy(() =>
  import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage }))
);
const CustomersPage = React.lazy(() =>
  import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage }))
);
const SalesPage = React.lazy(() =>
  import('./pages/SalesPage').then((m) => ({ default: m.SalesPage }))
);
const InvoicesPage = React.lazy(() =>
  import('./pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage }))
);
const ExchangePage = React.lazy(() =>
  import('./pages/ExchangePage').then((m) => ({ default: m.ExchangePage }))
);
const ReportsPage = React.lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const UsersPage = React.lazy(() =>
  import('./pages/UsersPage').then((m) => ({ default: m.UsersPage }))
);
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

// Modales secondaires chargées à la demande
const NewSaleModal = React.lazy(() =>
  import('./components/sales/NewSaleModal').then((m) => ({ default: m.NewSaleModal }))
);
const InvoiceReceiptModal = React.lazy(() =>
  import('./components/invoices/InvoiceReceiptModal').then((m) => ({ default: m.InvoiceReceiptModal }))
);
const MobileDeploymentGuideModal = React.lazy(() =>
  import('./components/mobile/MobileDeploymentGuideModal').then((m) => ({
    default: m.MobileDeploymentGuideModal,
  }))
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

/**
 * Composant racine de l'application :
 * - Réunit DistriBoissons, le Menu Principal et l'ensemble des sections sur une seule page fluide.
 * - Offre un défilement vertical doux (monter/descendre) avec suivi automatique de la section active.
 * - Permet de minimiser le panneau DistriBoissons/Menu Principal, l'en-tête mobile et chaque section métier.
 */
export default function App() {
  // État centralisé des données et mutations Cloud/Local
  const {
    products,
    sellers,
    sales,
    movements,
    customers,
    settings,
    exchangeRates,
    exchangeTransactions,
    setSellers,
    isInitialLoading,
    isCloudConnected,
    lastSyncTime,
    syncError,
    clearSyncError,
    actionSuccess,
    clearActionSuccess,
    retryCloudSync,
    handleCompleteSale,
    handleRestock,
    handleAddProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleAddCustomer,
    handleUpdateCustomer,
    handleAddSeller,
    handleUpdateSeller,
    handleDeleteSeller,
    handleUpdateExchangeRates,
    handleAddExchangeTransaction,
    handleDeleteExchangeTransaction,
    handleSaveSettings,
    handleUpdateSaleStatus,
    handleResetAllData,
  } = useAppData();

  // États de navigation et modales
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSellerForSale, setSelectedSellerForSale] = useState<string | undefined>(undefined);
  const [selectedCustomerForSale, setSelectedCustomerForSale] = useState<{
    name: string;
    company: string;
  } | null>(null);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSyncCenterOpen, setIsSyncCenterOpen] = useState(false);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);

  // Mode d'affichage : Page Unique Continue par défaut (avec bascule possible vers Onglets)
  const [viewMode, setViewMode] = useState<'continuous' | 'tabs'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      return saved === 'tabs' ? 'tabs' : 'continuous';
    } catch {
      return 'continuous';
    }
  });

  // États de minimisation du panneau latéral, de l'en-tête mobile et des sections de la page
  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SIDEBAR_MINIMIZED) === 'true';
    } catch {
      return false;
    }
  });
  const [isHeaderMinimized, setIsHeaderMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.HEADER_MINIMIZED) === 'true';
    } catch {
      return false;
    }
  });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COLLAPSED_SECTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed as Record<string, boolean>;
      }
    } catch {
      // Ignore erreur de lecture
    }
    return {};
  });

  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Empêche le scroll-spy d'écraser la sélection pendant un défilement déclenché au clic
  const programmaticScrollLockRef = useRef<number>(0);

  // Session collaborateur active (accès direct sans page de blocage)
  const [currentUser, setCurrentUser] = useState<Seller>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) return parsed;
      }
      return INITIAL_SELLERS[0];
    } catch {
      return INITIAL_SELLERS[0];
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isAdmin = true;

  // Persistance des préférences d'affichage et de minimisation
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
    } catch {
      // Ignore
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_MINIMIZED, String(isSidebarMinimized));
    } catch {
      // Ignore
    }
  }, [isSidebarMinimized]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HEADER_MINIMIZED, String(isHeaderMinimized));
    } catch {
      // Ignore
    }
  }, [isHeaderMinimized]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLAPSED_SECTIONS, JSON.stringify(collapsedSections));
    } catch {
      // Ignore
    }
  }, [collapsedSections]);

  // Auto-fermeture du message de succès global après 4 secondes
  useEffect(() => {
    if (!actionSuccess) return;
    const timer = window.setTimeout(() => {
      clearActionSuccess();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [actionSuccess, clearActionSuccess]);

  // Persistance locale de l'utilisateur courant
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  // Synchronise le profil courant lorsque l'équipe se met à jour depuis le Cloud
  useEffect(() => {
    if (currentUser) {
      const fresh = sellers.find((s) => s.id === currentUser.id);
      if (fresh) {
        setCurrentUser(fresh);
      }
    }
  }, [sellers]);

  // Ouverture automatique d'une facture via QR code (?facture=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const invoiceQuery = params.get('facture') || params.get('verify') || params.get('invoice');
      if (invoiceQuery && sales.length > 0) {
        const targetQuery = decodeURIComponent(invoiceQuery).trim().toLowerCase();
        const match = sales.find(
          (s) => s.invoiceNumber.toLowerCase() === targetQuery || s.id.toLowerCase() === targetQuery
        );
        if (match) {
          setSaleToPrint(match);
        }
      }
    } catch (e) {
      console.warn('Erreur vérification QR code facture:', e);
    }
  }, [sales]);

  // Suivi fluide de la section visible au défilement en mode Page Unique Continue
  useEffect(() => {
    if (viewMode !== 'continuous' || isInitialLoading) return;

    let rafId: number | null = null;

    const updateActiveSectionFromScroll = () => {
      rafId = null;
      if (Date.now() < programmaticScrollLockRef.current) return;

      const viewportAnchor = window.innerHeight * 0.25;
      let currentBest: ActiveTab | null = null;

      for (const tab of NAVIGATION_TABS) {
        const el = document.getElementById(`section-${tab.id}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= viewportAnchor) {
          currentBest = tab.id;
        }
      }

      if (currentBest) {
        setActiveTab((prev) => (prev === currentBest ? prev : currentBest));
      }
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateActiveSectionFromScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [viewMode, isInitialLoading]);

  // Changement d'utilisateur actif
  const handleLoginSuccess = (user: Seller) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
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
    sellersService.save(updated).catch((err) => console.error('Erreur sauvegarde connexion:', err));
  };

  // Minimiser ou déplier une section individuelle
  const toggleSectionMinimized = useCallback((sectionId: ActiveTab) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // Tout réduire ou tout ouvrir d'un seul geste
  const allSectionsMinimized = NAVIGATION_TABS.every((t) => Boolean(collapsedSections[t.id]));
  const handleToggleAllSections = useCallback(() => {
    if (allSectionsMinimized) {
      setCollapsedSections({});
    } else {
      const next: Record<string, boolean> = {};
      NAVIGATION_TABS.forEach((t) => {
        next[t.id] = true;
      });
      setCollapsedSections(next);
    }
  }, [allSectionsMinimized]);

  // Navigation fluide vers une section ou un onglet (déplie automatiquement si minimisé)
  const handleTabSelect = useCallback(
    (targetTab: ActiveTab) => {
      const currentIndex = NAVIGATION_TABS.findIndex((t) => t.id === activeTab);
      const targetIndex = NAVIGATION_TABS.findIndex((t) => t.id === targetTab);
      setSlideDirection(targetIndex >= currentIndex ? 'right' : 'left');
      setActiveTab(targetTab);
      setIsMobileDrawerOpen(false);
      setIsUserMenuOpen(false);

      if (viewMode === 'continuous') {
        // S'assure que la section ciblée est ouverte avant de défiler jusqu'à elle
        setCollapsedSections((prev) => {
          if (!prev[targetTab]) return prev;
          return { ...prev, [targetTab]: false };
        });

        programmaticScrollLockRef.current = Date.now() + 650;
        window.requestAnimationFrame(() => {
          const isMobileViewport = window.innerWidth < 768;
          const offset = isMobileViewport ? (isHeaderMinimized ? 52 : 70) : 20;
          smoothScrollToElement(`section-${targetTab}`, offset, 520);
        });
      } else {
        smoothScrollToY(0, 380);
      }
    },
    [activeTab, viewMode, isHeaderMinimized]
  );

  const handleNextTab = useCallback(() => {
    const currentIndex = NAVIGATION_TABS.findIndex((t) => t.id === activeTab);
    const nextIndex = currentIndex < NAVIGATION_TABS.length - 1 ? currentIndex + 1 : 0;
    handleTabSelect(NAVIGATION_TABS[nextIndex].id);
  }, [activeTab, handleTabSelect]);

  const handlePrevTab = useCallback(() => {
    const currentIndex = NAVIGATION_TABS.findIndex((t) => t.id === activeTab);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : NAVIGATION_TABS.length - 1;
    handleTabSelect(NAVIGATION_TABS[prevIndex].id);
  }, [activeTab, handleTabSelect]);

  // Détection de glissement tactile horizontal (uniquement en mode Onglets pour ne pas gêner le scroll vertical)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewMode !== 'tabs') return;
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (viewMode !== 'tabs' || touchStartX === null || touchStartY === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      if (deltaX < 0) handleNextTab();
      else handlePrevTab();
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const scrollToTop = () => {
    programmaticScrollLockRef.current = Date.now() + 650;
    setActiveTab('dashboard');
    smoothScrollToY(0, 560);
  };

  const handleOpenSaleForSeller = (sellerId: string) => {
    setSelectedSellerForSale(sellerId);
    setSelectedCustomerForSale(null);
    setIsNewSaleOpen(true);
  };

  const handleStartSaleForCustomer = (customer: Customer) => {
    setSelectedCustomerForSale({ name: customer.name, company: customer.company });
    setSelectedSellerForSale(undefined);
    setIsNewSaleOpen(true);
  };

  const mobilePrimaryTabs = NAVIGATION_TABS.filter((t) =>
    MOBILE_PRIMARY_TAB_IDS.includes(t.id)
  );
  const isOverflowTabActive = !MOBILE_PRIMARY_TAB_IDS.includes(activeTab);

  // Résumés chiffrés sobres affichés dans les en-têtes des sections repliables
  const sectionSummaries: Partial<Record<ActiveTab, string>> = {
    dashboard: `${sales.length} ventes · ${products.length} réf.`,
    inventory: `${products.length} produits`,
    sales: `${sales.length} opérations`,
    invoices: `${sales.filter((s) => s.status === 'pending').length} en attente`,
    customers: `${customers.length} comptes CHR`,
    exchange: `${exchangeTransactions.length} opérations`,
    reports: `Analyse CA & marges`,
    users: `${sellers.length} membres`,
    settings: settings.companyName || 'Entreprise',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 text-[12px] flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* En-tête mobile compact et minimisable (masqué sur md+ car DistriBoissons et Menu Principal sont unifiés dans le panneau latéral) */}
      <header
        className={`md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-200 ${
          isHeaderMinimized ? 'h-11' : 'h-14'
        }`}
      >
        <div className="h-full px-3 flex items-center justify-between gap-2">
          {/* Logo & Identité DistriBoissons */}
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-2 min-w-0 whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            <span className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
              <WaterBottleLogo className="w-4 h-4 text-white" />
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-900 truncate max-w-[140px]">
              {settings.companyName || 'DistriBoissons Pro'}
            </span>
          </button>

          {/* Actions rapides mobile + Bouton Minimiser l'en-tête */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isHeaderMinimized && (
              <button
                type="button"
                onClick={() => setIsSyncCenterOpen(true)}
                className={`min-h-[36px] px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  isCloudConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
                title="État synchronisation Cloud"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{isCloudConnected ? 'Sync' : 'Hors-ligne'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedSellerForSale(undefined);
                setSelectedCustomerForSale(null);
                setIsNewSaleOpen(true);
              }}
              className={`px-2.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                isHeaderMinimized ? 'h-8' : 'min-h-[36px]'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Vendre</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHeaderMinimized((v) => !v)}
              className={`w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer ${
                isHeaderMinimized ? 'h-8' : 'h-9'
              }`}
              title={isHeaderMinimized ? "Agrandir l'en-tête" : "Minimiser l'en-tête"}
              aria-label={isHeaderMinimized ? "Agrandir l'en-tête" : "Minimiser l'en-tête"}
            >
              {isHeaderMinimized ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Conteneur principal unifié : DistriBoissons + Menu Principal réunis à gauche et Page Continue fluide à droite */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-24 md:pb-10 flex flex-col md:flex-row items-start gap-5 lg:gap-6">
        {/* Panneau Latéral Unifié : DistriBoissons + Menu Principal (Desktop / Tablette) */}
        <aside
          className={`hidden md:flex md:flex-col shrink-0 md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] bg-white border border-slate-200 rounded-2xl transition-[width] duration-200 ease-out overflow-hidden ${
            isSidebarMinimized ? 'w-[76px] p-2' : 'w-64 lg:w-[272px] p-3.5'
          }`}
        >
          {/* Bloc DistriBoissons intégré directement en haut du Menu Principal */}
          <div
            className={`pb-3 mb-2.5 border-b border-slate-100 flex items-center ${
              isSidebarMinimized ? 'flex-col gap-2' : 'justify-between gap-2'
            }`}
          >
            <button
              type="button"
              onClick={scrollToTop}
              className={`flex items-center gap-2.5 min-w-0 text-left cursor-pointer ${
                isSidebarMinimized ? 'justify-center' : ''
              }`}
              title={`${settings.companyName || 'DistriBoissons Pro'} · Revenir en haut`}
            >
              <span className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <WaterBottleLogo className="w-5 h-5 text-white" />
              </span>
              {!isSidebarMinimized && (
                <div className="min-w-0 leading-tight">
                  <span className="text-sm font-bold tracking-tight text-slate-900 block truncate">
                    {settings.companyName || 'DistriBoissons Pro'}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    Boissons &amp; Consignes
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarMinimized((v) => !v)}
              className="min-h-[36px] min-w-[36px] px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 text-xs font-semibold transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title={isSidebarMinimized ? 'Agrandir le menu' : 'Minimiser cette partie'}
              aria-label={isSidebarMinimized ? 'Agrandir le menu' : 'Minimiser cette partie'}
            >
              {isSidebarMinimized ? (
                <PanelLeftOpen className="w-4 h-4 text-amber-600" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>

          {/* Bouton principal Nouvelle Vente dans le même panneau */}
          <div className="mb-3">
            <button
              type="button"
              onClick={() => {
                setSelectedSellerForSale(undefined);
                setSelectedCustomerForSale(null);
                setIsNewSaleOpen(true);
              }}
              className={`w-full min-h-[42px] rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                isSidebarMinimized ? 'px-2' : 'px-3.5'
              }`}
              title="Nouvelle Vente"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              {!isSidebarMinimized && <span>Nouvelle Vente</span>}
            </button>
          </div>

          {/* Titre Menu Principal + Contrôle Tout réduire */}
          {!isSidebarMinimized && (
            <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>Menu Principal</span>
              {viewMode === 'continuous' && (
                <button
                  type="button"
                  onClick={handleToggleAllSections}
                  className="text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
                >
                  {allSectionsMinimized ? 'Tout déplier' : 'Tout réduire'}
                </button>
              )}
            </div>
          )}

          {/* Liste des sections du Menu Principal avec défilement interne sécurisé si écran court */}
          <nav
            aria-label="Navigation principale verticale"
            className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1 pr-0.5"
          >
            {NAVIGATION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-tab-id={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={`w-full min-h-[42px] rounded-xl text-xs font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap ${
                    isSidebarMinimized ? 'justify-center px-2 py-2' : 'px-3 py-2 gap-3 text-left'
                  } ${
                    isActive
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={`${tab.label} · ${tab.description}`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-amber-600'}`}
                  />
                  {!isSidebarMinimized && (
                    <div className="min-w-0 flex-1">
                      <span className="block truncate">{tab.label}</span>
                      <span
                        className={`block text-[10px] truncate ${
                          isActive ? 'text-amber-100' : 'text-slate-400 font-normal'
                        }`}
                      >
                        {tab.description}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bas du panneau unifié : Cloud Synchro & Profil Collaborateur */}
          <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsSyncCenterOpen(true)}
              className={`w-full min-h-[38px] rounded-xl border text-xs font-semibold flex items-center transition-colors cursor-pointer ${
                isSidebarMinimized ? 'justify-center px-2' : 'justify-between px-3'
              } ${
                isCloudConnected
                  ? 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-800'
              }`}
              title={`Synchronisation Cloud ${lastSyncTime ? `(${lastSyncTime})` : ''}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Cloud className="w-4 h-4 shrink-0" />
                {!isSidebarMinimized && (
                  <span className="truncate">
                    {isCloudConnected ? 'Cloud connecté' : 'Mode hors-ligne'}
                  </span>
                )}
              </span>
              {!isSidebarMinimized && lastSyncTime && (
                <span className="text-[10px] font-mono tabular-nums opacity-75">
                  {lastSyncTime}
                </span>
              )}
            </button>

            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  className={`w-full min-h-[42px] rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-slate-50 flex items-center transition-colors cursor-pointer ${
                    isSidebarMinimized ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1.5 gap-2'
                  }`}
                  title={currentUser.name}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover border border-amber-500/40 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {!isSidebarMinimized && (
                      <div className="text-left leading-tight min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {currentUser.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {currentUser.role}
                        </span>
                      </div>
                    )}
                  </div>
                  {!isSidebarMinimized && <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {currentUser.name}
                          </span>
                          {isAdmin ? (
                            <span className="text-[10px] font-semibold text-amber-700 flex items-center gap-0.5 shrink-0">
                              <Crown className="w-2.5 h-2.5" />
                              Admin
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 shrink-0">Commercial</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{currentUser.role}</div>
                      </div>
                    </div>

                    <div className="px-2 py-1.5">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleTabSelect('users');
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-amber-700 rounded-lg flex items-center gap-2 transition cursor-pointer"
                        >
                          <UserCog className="w-4 h-4 text-slate-400" />
                          <span>Gestion de l&apos;Équipe</span>
                        </button>
                      ) : (
                        <div className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50 rounded-lg flex items-center gap-2 mb-1">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Accès Commercial restreint</span>
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
                        <span>Changer d&apos;utilisateur</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentUser(INITIAL_SELLERS[0]);
                          try {
                            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
                          } catch (e) {
                            console.error(e);
                          }
                          setIsUserMenuOpen(false);
                          setIsLoginModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition font-medium cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full min-h-[40px] px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {!isSidebarMinimized && <span>Connexion</span>}
              </button>
            )}
          </div>
        </aside>

        {/* Zone de contenu active (Page Unique Continue ou Onglets) */}
        <main
          className="flex-1 min-w-0 w-full space-y-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Barre d'outils supérieure de la page unique (mode d'affichage, réduire/déplier tout, partage) */}
          <div className="bg-white border border-slate-200 rounded-2xl px-3.5 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
            {/* Fil d'activité / Section active */}
            <div className="flex items-center gap-2 min-w-0 text-xs text-slate-600">
              <span className="font-bold text-slate-900 truncate">
                {NAVIGATION_TABS.find((t) => t.id === activeTab)?.label || 'Tableau de Bord'}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-500 hidden sm:inline truncate">
                {viewMode === 'continuous'
                  ? 'Page unique continue — faites défiler librement'
                  : 'Mode onglets isolés'}
              </span>
            </div>

            {/* Contrôles rapides de la page */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Bascule Page Unique / Onglets */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('continuous')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    viewMode === 'continuous'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Page Unique</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('tabs');
                    smoothScrollToY(0, 300);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    viewMode === 'tabs'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MoveHorizontal className="w-3.5 h-3.5 text-amber-600" />
                  <span>Onglets</span>
                </button>
              </div>

              {viewMode === 'continuous' && (
                <button
                  type="button"
                  onClick={handleToggleAllSections}
                  className="min-h-[34px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title={
                    allSectionsMinimized
                      ? 'Déplier toutes les parties'
                      : 'Minimiser toutes les parties'
                  }
                >
                  {allSectionsMinimized ? (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tout déplier</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tout minimiser</span>
                    </>
                  )}
                </button>
              )}

              <div className="hidden sm:block">
                <PWAInstallButton />
              </div>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="hidden sm:flex min-h-[34px] px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Partager</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileGuideOpen(true)}
                className="hidden lg:flex min-h-[34px] px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap items-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>App Mobile</span>
              </button>
            </div>
          </div>

          {/* Bannières d'état : erreur réseau ou confirmation d'action */}
          {syncError && (
            <StatusFeedbackBanner
              type="error"
              message={syncError}
              onDismiss={clearSyncError}
              onRetry={retryCloudSync}
            />
          )}
          {actionSuccess && (
            <StatusFeedbackBanner
              type="success"
              message={actionSuccess}
              onDismiss={clearActionSuccess}
            />
          )}

          {isInitialLoading && products.length === 0 ? (
            <DashboardSkeleton />
          ) : (
            <React.Suspense fallback={<ViewLoadingFallback />}>
              {viewMode === 'tabs' ? (
                <div
                  key={activeTab}
                  className={`space-y-6 ${
                    slideDirection === 'right' ? 'animate-slide-right' : 'animate-slide-left'
                  }`}
                >
                  {activeTab === 'dashboard' && (
                    <DashboardPage
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
                      settings={settings}
                      onUpdateSettings={handleSaveSettings}
                      onNavigateToSettings={() => handleTabSelect('settings')}
                      onRestock={handleRestock}
                      onUpdateProduct={handleUpdateProduct}
                      onPrintSale={setSaleToPrint}
                      currentUser={currentUser}
                      onOpenLoginModal={() => setIsLoginModalOpen(true)}
                      isAdmin={isAdmin}
                    />
                  )}

                  {(activeTab === 'inventory' || activeTab === 'stocks') && (
                    <InventoryPage
                      products={products}
                      movements={movements}
                      customers={customers}
                      settings={settings}
                      onUpdateProduct={handleUpdateProduct}
                      onAddProduct={handleAddProduct}
                      onRestock={handleRestock}
                      onDeleteProduct={handleDeleteProduct}
                      isAdmin={isAdmin}
                    />
                  )}

                  {activeTab === 'customers' && (
                    <CustomersPage
                      customers={customers}
                      onAddCustomer={handleAddCustomer}
                      onUpdateCustomer={handleUpdateCustomer}
                      onStartSaleForCustomer={handleStartSaleForCustomer}
                    />
                  )}

                  {activeTab === 'sales' && (
                    <SalesPage
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
                    <InvoicesPage
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
                    <ExchangePage
                      rates={exchangeRates}
                      transactions={exchangeTransactions}
                      sellers={sellers}
                      onUpdateRates={handleUpdateExchangeRates}
                      onAddTransaction={handleAddExchangeTransaction}
                      onDeleteTransaction={handleDeleteExchangeTransaction}
                    />
                  )}

                  {(activeTab === 'reports' || activeTab === 'profitability') && (
                    <ReportsPage sales={sales} products={products} sellers={sellers} />
                  )}

                  {(activeTab === 'users' || activeTab === 'sellers') && (
                    <UsersPage
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
                    <SettingsPage
                      settings={settings}
                      sellers={sellers}
                      onSaveSettings={handleSaveSettings}
                      onResetAllData={handleResetAllData}
                      onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
                      onOpenCloudSync={() => setIsSyncCenterOpen(true)}
                    />
                  )}

                  {/* Barre de navigation rapide entre onglets */}
                  <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <button
                      type="button"
                      onClick={handlePrevTab}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-amber-600" />
                      <span className="truncate max-w-[140px] sm:max-w-none">
                        {
                          NAVIGATION_TABS[
                            (NAVIGATION_TABS.findIndex((t) => t.id === activeTab) -
                              1 +
                              NAVIGATION_TABS.length) %
                              NAVIGATION_TABS.length
                          ].shortLabel
                        }
                      </span>
                    </button>

                    <div className="hidden sm:flex items-center gap-1.5">
                      {NAVIGATION_TABS.map((t, idx) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTabSelect(t.id)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            activeTab === t.id
                              ? 'w-6 bg-amber-600'
                              : 'w-2 bg-slate-300 hover:bg-slate-400'
                          }`}
                          title={`${idx + 1}. ${t.label}`}
                        />
                      ))}
                      <span className="text-[11px] text-slate-500 font-mono ml-2 tabular-nums">
                        {NAVIGATION_TABS.findIndex((t) => t.id === activeTab) + 1} /{' '}
                        {NAVIGATION_TABS.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextTab}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <span className="truncate max-w-[140px] sm:max-w-none">
                        {
                          NAVIGATION_TABS[
                            (NAVIGATION_TABS.findIndex((t) => t.id === activeTab) + 1) %
                              NAVIGATION_TABS.length
                          ].shortLabel
                        }
                      </span>
                      <ChevronRight className="w-4 h-4 text-amber-200" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode Page Unique Continue : toutes les sections empilées et minimisables sur une seule page fluide */
                <div className="space-y-6">
                  {NAVIGATION_TABS.map((tab) => {
                    const isMinimized = Boolean(collapsedSections[tab.id]);
                    const isActive = activeTab === tab.id;

                    return (
                      <CollapsibleSection
                        key={tab.id}
                        id={`section-${tab.id}`}
                        title={tab.label}
                        description={tab.description}
                        summaryText={sectionSummaries[tab.id]}
                        icon={tab.icon}
                        isMinimized={isMinimized}
                        onToggleMinimize={() => toggleSectionMinimized(tab.id)}
                        isActive={isActive}
                      >
                        {tab.id === 'dashboard' && (
                          <DashboardPage
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
                            settings={settings}
                            onUpdateSettings={handleSaveSettings}
                            onNavigateToSettings={() => handleTabSelect('settings')}
                            onRestock={handleRestock}
                            onUpdateProduct={handleUpdateProduct}
                            onPrintSale={setSaleToPrint}
                            currentUser={currentUser}
                            onOpenLoginModal={() => setIsLoginModalOpen(true)}
                            isAdmin={isAdmin}
                          />
                        )}

                        {tab.id === 'inventory' && (
                          <InventoryPage
                            products={products}
                            movements={movements}
                            customers={customers}
                            settings={settings}
                            onUpdateProduct={handleUpdateProduct}
                            onAddProduct={handleAddProduct}
                            onRestock={handleRestock}
                            onDeleteProduct={handleDeleteProduct}
                            isAdmin={isAdmin}
                          />
                        )}

                        {tab.id === 'sales' && (
                          <SalesPage
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

                        {tab.id === 'invoices' && (
                          <InvoicesPage
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

                        {tab.id === 'customers' && (
                          <CustomersPage
                            customers={customers}
                            onAddCustomer={handleAddCustomer}
                            onUpdateCustomer={handleUpdateCustomer}
                            onStartSaleForCustomer={handleStartSaleForCustomer}
                          />
                        )}

                        {tab.id === 'exchange' && (
                          <ExchangePage
                            rates={exchangeRates}
                            transactions={exchangeTransactions}
                            sellers={sellers}
                            onUpdateRates={handleUpdateExchangeRates}
                            onAddTransaction={handleAddExchangeTransaction}
                            onDeleteTransaction={handleDeleteExchangeTransaction}
                          />
                        )}

                        {tab.id === 'reports' && (
                          <ReportsPage sales={sales} products={products} sellers={sellers} />
                        )}

                        {tab.id === 'users' && (
                          <UsersPage
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

                        {tab.id === 'settings' && (
                          <SettingsPage
                            settings={settings}
                            sellers={sellers}
                            onSaveSettings={handleSaveSettings}
                            onResetAllData={handleResetAllData}
                            onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
                            onOpenCloudSync={() => setIsSyncCenterOpen(true)}
                          />
                        )}
                      </CollapsibleSection>
                    );
                  })}
                </div>
              )}
            </React.Suspense>
          )}
        </main>
      </div>

      {/* Barre de navigation inférieure fixe sur Mobile (< md) */}
      <nav
        aria-label="Navigation rapide mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 flex items-center justify-around shadow-lg"
      >
        {mobilePrimaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !isMobileDrawerOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabSelect(tab.id)}
              className={`min-h-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-amber-700 bg-amber-50/80' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold truncate max-w-[64px]">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen((v) => !v)}
          className={`min-h-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
            isMobileDrawerOpen || isOverflowTabActive
              ? 'text-amber-700 bg-amber-50/80'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {isMobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span className="text-[10px] font-semibold">Menu</span>
        </button>
      </nav>

      {/* Tiroir Mobile unifié DistriBoissons + Menu Principal */}
      {isMobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="w-full max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl p-4 pb-6 shadow-2xl border-t border-slate-200 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <WaterBottleLogo className="w-4 h-4 text-white" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {settings.companyName || 'DistriBoissons Pro'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Menu Principal · {NAVIGATION_TABS.length} sections
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contrôles Vue & Minimiser tout sur Mobile */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'continuous' ? 'tabs' : 'continuous')}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Layers className="w-4 h-4 text-amber-600" />
                <span>{viewMode === 'continuous' ? 'Page Unique' : 'Vue Onglets'}</span>
              </button>
              <button
                type="button"
                onClick={handleToggleAllSections}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {allSectionsMinimized ? (
                  <>
                    <Maximize2 className="w-4 h-4 text-amber-600" />
                    <span>Tout déplier</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4 text-slate-600" />
                    <span>Tout minimiser</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {NAVIGATION_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabSelect(tab.id)}
                    className={`min-h-[46px] px-3.5 py-2 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-amber-600'}`}
                      />
                      <div>
                        <span className="text-xs font-bold block">{tab.label}</span>
                        <span
                          className={`text-[11px] block ${
                            isActive ? 'text-amber-100' : 'text-slate-500'
                          }`}
                        >
                          {tab.description}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsShareModalOpen(true);
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-amber-600" />
                <span>Partager</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsLoginModalOpen(true);
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <UserCog className="w-4 h-4 text-slate-600" />
                <span>{currentUser ? currentUser.name : 'Connexion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales chargées à la demande */}
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
            onUpdateSettings={handleSaveSettings}
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

      {/* Pied de page sobre */}
      <footer className="hidden md:block border-t border-slate-200 bg-white py-5 mt-8 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              {settings.companyName || 'DistriBoissons & Vins SAS'}
            </span>
            <span aria-hidden="true">·</span>
            <span>SIRET: {settings.companySiret || '849 231 902 00028'}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Consignes: {formatHTG(settings.kegConsignmentDepositPrice || 3000)}/fût inox
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleTabSelect('inventory')}
              className="hover:text-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              Inventaire &amp; Consignes
            </button>
            <button
              type="button"
              onClick={() => handleTabSelect('customers')}
              className="hover:text-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              Clients CHR
            </button>
            <button
              type="button"
              onClick={() => handleTabSelect('reports')}
              className="hover:text-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              Rapports
            </button>
            <button
              type="button"
              onClick={() => handleTabSelect('settings')}
              className="hover:text-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              Paramètres
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
