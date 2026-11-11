export interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'Boissons Gazeuses' | 'Bières & Cidres' | 'Vins & Champagnes' | 'Spiritueux' | 'Eaux & Tonics';
  costPrice: number; // Prix d'achat unitaire (HTG)
  salePrice: number; // Prix de vente HT unitaire (HTG)
  stock: number;
  minStockAlert: number;
  reorderQuantity: number;
  alcoholDegree: number; // ex: 0.0% pour sodas/eaux, 5.0% pour bières, 12.5% pour vins, 40% pour spiritueux
  volume: string; // ex: "Pack 24×33cl", "Fût 30L", "Carton 6×75cl", "Bouteille 70cl"
  isConsigne?: boolean; // Fûts ou casiers avec consigne
  updatedAt: string;
}

export interface Seller {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  targetMonthlyRevenue: number;
  commissionRate: number; // ex: 0.05 pour 5%
  phone: string;
  status?: 'Actif' | 'Inactif';
  lastLogin?: string;
  password?: string; // Mot de passe pour connexion espace utilisateur (par email ou téléphone)
  isAdmin?: boolean; // Accès administrateur complet à toutes les fonctionnalités
}

export function isUserAdmin(seller: Seller | null | undefined): boolean {
  if (!seller) return false;
  if (seller.isAdmin === true) return true;
  const roleLower = (seller.role || '').toLowerCase();
  if (
    roleLower.includes('admin') ||
    roleLower.includes('direct') ||
    roleLower.includes('gérant') ||
    roleLower.includes('gerant') ||
    roleLower.includes('fondateur')
  ) {
    return true;
  }
  const emailLower = (seller.email || '').toLowerCase().trim();
  if (
    emailLower === 'elierichelieu@gmail.com' ||
    emailLower === 'admin@optiboissons.fr' ||
    emailLower === 'admin@optivente.com' ||
    emailLower === 'admin@distriboissons.fr'
  ) {
    return true;
  }
  return false;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalPrice: number;
  totalCost: number;
  profit: number;
  marginPercent: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string
  dueDate?: string; // Date d'échéance
  sellerId: string;
  sellerName: string;
  customerName: string;
  customerCompany?: string;
  items: SaleItem[];
  totalHT: number;
  taxRate: number; // e.g. 0.20
  totalTTC: number;
  totalCost: number;
  netProfit: number;
  marginPercent: number;
  status: 'completed' | 'pending' | 'cancelled';
  paymentMethod: 'carte' | 'virement' | 'especes' | 'traite';
  paidAmount?: number;
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  date: string;
  operator: string;
}

export interface Customer {
  id: string;
  name: string; // Contact direct (ex: Julien Tavernier)
  company: string; // Établissement (ex: Brasserie du Port)
  type: 'Brasserie' | 'Bar / Pub' | 'Restaurant' | 'Hôtel' | 'Caviste' | 'Événementiel' | 'Autre';
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  activeKegsConsigned: number; // Fûts inox consignés en circulation chez le client
  totalSpent: number; // Total facturé cumulé (HTG)
  creditLimit: number; // Encours client autorisé (HTG)
  paymentTerms: 'Immédiat' | '30 jours fin de mois' | '45 jours' | 'Comptant à la livraison';
  notes?: string;
  createdAt: string;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companySiret: string;
  defaultTaxRate: number; // 0.20
  kegConsignmentDepositPrice: number; // ex: 3000 HTG par fût
  crateConsignmentDepositPrice: number; // ex: 500 HTG par caisse
  defaultStockMinAlert: number;
  currency: string;
  contactEmail: string;
  contactPhone: string;
  autoDeductStockOnSale: boolean;
  defaultInvoiceFormat?: 'ticket' | 'a4'; // 'ticket' = Facture Thermique 80mm (défaut), 'a4' = Facture A4
  companyLogo?: string; // Image base64 ou URL du logo d'entreprise
  showLogoOnTicket?: boolean; // Afficher le logo sur les tickets thermiques 80mm (défaut true)
  updatedAt?: string;
}

export interface ExchangeRateConfig {
  usdToHtgBuy: number; // Taux d'achat USD (ex: 131.50 HTG)
  usdToHtgSell: number; // Taux de vente USD (ex: 133.00 HTG)
  usdToHtgReference: number; // Taux officiel BRH (ex: 132.00 HTG)
  dopToHtgBuy: number; // Taux d'achat DOP (ex: 2.15 HTG)
  dopToHtgSell: number; // Taux de vente DOP (ex: 2.25 HTG)
  dopToHtgReference: number; // Taux de référence DOP (ex: 2.20 HTG)
  lastUpdated: string;
}

export interface ExchangeTransaction {
  id: string;
  date: string;
  type: 'USD_TO_HTG' | 'HTG_TO_USD' | 'DOP_TO_HTG' | 'HTG_TO_DOP' | 'USD_TO_DOP';
  fromCurrency: 'USD' | 'DOP' | 'HTG';
  toCurrency: 'HTG' | 'USD' | 'DOP';
  amountFrom: number;
  rateApplied: number;
  amountTo: number;
  clientOrBeneficiary?: string;
  operator: string;
  notes?: string;
}

export type TimeRange = '7d' | '30d' | '90d' | 'year' | 'all';

export type ActiveTab =
  | 'dashboard'
  | 'inventory'
  | 'customers'
  | 'sales'
  | 'invoices'
  | 'exchange'
  | 'reports'
  | 'users'
  | 'settings'
  | 'stocks'
  | 'sellers'
  | 'profitability';
