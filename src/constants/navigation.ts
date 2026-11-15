import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  FileSpreadsheet,
  Settings,
  UserCog,
  ArrowLeftRight,
  FileText,
} from 'lucide-react';
import { ActiveTab } from '../types';

/**
 * Configuration d'un onglet de navigation principal.
 */
export interface NavTabConfig {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

/**
 * Liste ordonnée des sections principales (de Tableau de Bord jusqu'à Paramètres).
 */
export const NAVIGATION_TABS: NavTabConfig[] = [
  { id: 'dashboard', label: 'Tableau de Bord', shortLabel: 'Accueil', icon: LayoutDashboard, description: 'KPI & Aperçu' },
  { id: 'inventory', label: 'Inventaire Boissons', shortLabel: 'Stocks', icon: Package, description: 'Stocks & Consignes' },
  { id: 'sales', label: 'Ventes & Commandes', shortLabel: 'Ventes', icon: ShoppingBag, description: 'Caisse & POS' },
  { id: 'invoices', label: 'Factures & Règlements', shortLabel: 'Factures', icon: FileText, description: 'Créances' },
  { id: 'customers', label: 'Clients & Consignes', shortLabel: 'Clients', icon: Users, description: 'Comptes CHR' },
  { id: 'exchange', label: 'Change USD / DOP', shortLabel: 'Change', icon: ArrowLeftRight, description: 'Devises HTG' },
  { id: 'reports', label: 'Rapports Financiers', shortLabel: 'Rapports', icon: FileSpreadsheet, description: 'Marges & CA' },
  { id: 'users', label: 'Utilisateurs & Équipe', shortLabel: 'Équipe', icon: UserCog, description: 'Vendeurs' },
  { id: 'settings', label: 'Paramètres', shortLabel: 'Config', icon: Settings, description: 'Configuration' },
];

/**
 * Raccourcis affichés directement dans la barre de navigation inférieure sur mobile.
 */
export const MOBILE_PRIMARY_TAB_IDS: ActiveTab[] = [
  'dashboard',
  'inventory',
  'sales',
  'invoices',
];

/**
 * Clés de persistance locale (cache hors-ligne / démarrage instantané).
 */
export const STORAGE_KEYS = {
  PRODUCTS: 'optiboissons_products_v2',
  SELLERS: 'optiboissons_sellers_v2',
  SALES: 'optiboissons_sales_v2',
  MOVEMENTS: 'optiboissons_movements_v2',
  CUSTOMERS: 'optiboissons_customers_v2',
  SETTINGS: 'optiboissons_settings_v2',
  EXCHANGE_RATES: 'optiboissons_exchange_rates_v1',
  EXCHANGE_TRANSACTIONS: 'optiboissons_exchange_transactions_v1',
  CURRENT_USER: 'optiboissons_current_user_v2',
  SIDEBAR_MINIMIZED: 'optiboissons_sidebar_minimized_v1',
  HEADER_MINIMIZED: 'optiboissons_header_minimized_v1',
  COLLAPSED_SECTIONS: 'optiboissons_collapsed_sections_v1',
  VIEW_MODE: 'optiboissons_view_mode_v2',
} as const;

/**
 * Tailles de page standard pour la pagination des tableaux.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
