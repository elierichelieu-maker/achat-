import React, { useState, useMemo } from 'react';
import { Sale, Seller, Product, Customer, AppSettings, ExchangeRateConfig } from '../../types';
import { formatHTG, formatUSD, formatDOP } from '../../utils/formatters';
import { WaterBottleLogo } from '../common/WaterBottleLogo';
import {
  FileText,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PlusCircle,
  Building2,
  User,
  CreditCard,
  Banknote,
  Calendar,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileCheck,
  Eye,
  ArrowUpDown,
  RefreshCw,
  Landmark,
} from 'lucide-react';
import { executePrintOrDownload, downloadInvoicePDF } from '../../utils/invoicePrinter';

interface InvoicesManagementViewProps {
  sales: Sale[];
  sellers: Seller[];
  products: Product[];
  customers: Customer[];
  settings: AppSettings;
  exchangeRates: ExchangeRateConfig;
  onUpdateSaleStatus: (saleId: string, newStatus: 'completed' | 'pending' | 'cancelled', paymentMethod?: Sale['paymentMethod']) => void;
  onOpenNewSale: () => void;
  onPrintSale?: (sale: Sale) => void;
}

export const InvoicesManagementView: React.FC<InvoicesManagementViewProps> = ({
  sales,
  sellers,
  products,
  customers,
  settings,
  exchangeRates,
  onUpdateSaleStatus,
  onOpenNewSale,
  onPrintSale,
}) => {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'overdue' | 'cancelled'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7d' | '30d' | 'this_year'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Selected invoice for detail/print modal
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);

  // Status update confirmation toast or feedback
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Helper: check if invoice is overdue (e.g. pending and older than 30 days)
  const isInvoiceOverdue = (sale: Sale): boolean => {
    if (sale.status !== 'pending') return false;
    const saleDate = new Date(sale.date);
    const dueDate = sale.dueDate ? new Date(sale.dueDate) : new Date(saleDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    return new Date() > dueDate;
  };

  // Helper: get due date string
  const getDueDate = (sale: Sale): string => {
    if (sale.dueDate) {
      return new Date(sale.dueDate).toLocaleDateString('fr-FR');
    }
    const d = new Date(sale.date);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('fr-FR');
  };

  // Calculate filtered sales
  const filteredInvoices = useMemo(() => {
    return sales.filter((sale) => {
      // 1. Text search (Invoice number, Customer name, Company, Seller)
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        sale.invoiceNumber.toLowerCase().includes(term) ||
        sale.customerName.toLowerCase().includes(term) ||
        (sale.customerCompany && sale.customerCompany.toLowerCase().includes(term)) ||
        sale.sellerName.toLowerCase().includes(term);

      // 2. Status filter
      let matchStatus = true;
      if (statusFilter === 'completed') {
        matchStatus = sale.status === 'completed';
      } else if (statusFilter === 'pending') {
        matchStatus = sale.status === 'pending' && !isInvoiceOverdue(sale);
      } else if (statusFilter === 'overdue') {
        matchStatus = isInvoiceOverdue(sale);
      } else if (statusFilter === 'cancelled') {
        matchStatus = sale.status === 'cancelled';
      }

      // 3. Payment method filter
      const matchPayment = paymentMethodFilter === 'all' || sale.paymentMethod === paymentMethodFilter;

      // 4. Period filter
      let matchPeriod = true;
      if (periodFilter !== 'all') {
        const saleDate = new Date(sale.date).getTime();
        const now = Date.now();
        if (periodFilter === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          matchPeriod = saleDate >= startOfToday.getTime();
        } else if (periodFilter === '7d') {
          matchPeriod = now - saleDate <= 7 * 24 * 60 * 60 * 1000;
        } else if (periodFilter === '30d') {
          matchPeriod = now - saleDate <= 30 * 24 * 60 * 60 * 1000;
        } else if (periodFilter === 'this_year') {
          const currentYear = new Date().getFullYear();
          matchPeriod = new Date(sale.date).getFullYear() === currentYear;
        }
      }

      return matchSearch && matchStatus && matchPayment && matchPeriod;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount_desc') return b.totalTTC - a.totalTTC;
      if (sortBy === 'amount_asc') return a.totalTTC - b.totalTTC;
      return 0;
    });
  }, [sales, searchTerm, statusFilter, paymentMethodFilter, periodFilter, sortBy]);

  // Financial KPI totals calculated across all active sales (excluding cancelled for revenue)
  const totalInvoicedTTC = useMemo(() => {
    return sales
      .filter((s) => s.status !== 'cancelled')
      .reduce((sum, s) => sum + s.totalTTC, 0);
  }, [sales]);

  const totalCollectedTTC = useMemo(() => {
    return sales
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + s.totalTTC, 0);
  }, [sales]);

  const totalPendingTTC = useMemo(() => {
    return sales
      .filter((s) => s.status === 'pending')
      .reduce((sum, s) => sum + s.totalTTC, 0);
  }, [sales]);

  const overdueCount = useMemo(() => {
    return sales.filter((s) => isInvoiceOverdue(s)).length;
  }, [sales]);

  const collectionRate = totalInvoicedTTC > 0 ? Math.round((totalCollectedTTC / totalInvoicedTTC) * 100) : 0;

  // Handle CSV export of invoices
  const handleExportCSV = () => {
    const headers = [
      'N° Facture',
      'Date Émission',
      'Date Échéance',
      'Client',
      'Établissement',
      'Commercial',
      'Mode Paiement',
      'Statut',
      'Total HT (HTG)',
      'TVA (HTG)',
      'Total TTC (HTG)',
      'Équivalent USD',
    ];

    const rows = filteredInvoices.map((inv) => {
      const isOverdue = isInvoiceOverdue(inv);
      const displayStatus =
        inv.status === 'completed'
          ? 'Payée'
          : isOverdue
          ? 'En retard'
          : inv.status === 'pending'
          ? 'En attente'
          : 'Annulée';

      const eqUsd = exchangeRates.usdToHtgReference > 0 ? (inv.totalTTC / exchangeRates.usdToHtgReference).toFixed(2) : '0';

      return [
        `"${inv.invoiceNumber}"`,
        `"${new Date(inv.date).toLocaleDateString('fr-FR')}"`,
        `"${getDueDate(inv)}"`,
        `"${inv.customerName.replace(/"/g, '""')}"`,
        `"${(inv.customerCompany || '').replace(/"/g, '""')}"`,
        `"${inv.sellerName.replace(/"/g, '""')}"`,
        `"${inv.paymentMethod}"`,
        `"${displayStatus}"`,
        inv.totalHT,
        Math.round((inv.totalTTC - inv.totalHT) * 100) / 100,
        inv.totalTTC,
        eqUsd,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Factures_OptiBoissons_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick status update with feedback
  const handleSetStatus = (saleId: string, newStatus: 'completed' | 'pending' | 'cancelled') => {
    onUpdateSaleStatus(saleId, newStatus);
    const label = newStatus === 'completed' ? 'marquée comme Payée / Encaissée' : newStatus === 'pending' ? 'marquée En attente' : 'Annulée';
    setStatusNotice(`Facture mise à jour avec succès : ${label}.`);
    setTimeout(() => setStatusNotice(null), 3500);

    // If modal is currently open with this invoice, update it too
    if (selectedInvoice && selectedInvoice.id === saleId) {
      setSelectedInvoice({ ...selectedInvoice, status: newStatus });
    }
  };

  // Print function
  const handlePrint = async () => {
    if (selectedInvoice) {
      if (onPrintSale) {
        onPrintSale(selectedInvoice);
      } else {
        await executePrintOrDownload(selectedInvoice, settings, settings?.defaultInvoiceFormat || 'ticket');
      }
    }
  };

  // Direct PDF download
  const handleDownloadPDF = async () => {
    if (selectedInvoice) {
      await downloadInvoicePDF(selectedInvoice, settings, settings?.defaultInvoiceFormat || 'ticket');
      setStatusNotice(`Facture ${selectedInvoice.invoiceNumber} téléchargée en PDF.`);
      setTimeout(() => setStatusNotice(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-700 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Factures & Facturation</h1>
              <p className="text-xs text-slate-500">
                Gestion des créances clients, règlements, bordereaux et encaissements multi-devises (HTG / USD / DOP)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewSale}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nouvelle Facture</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {statusNotice && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg text-xs font-medium text-emerald-800 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusNotice}</span>
          </div>
          <button type="button" onClick={() => setStatusNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturé */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Total Facturé (TTC)</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatHTG(totalInvoicedTTC)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{sales.filter((s) => s.status !== 'cancelled').length} factures émises</span>
            <span className="font-mono text-slate-600">
              ≈ {formatUSD(exchangeRates.usdToHtgReference > 0 ? totalInvoicedTTC / exchangeRates.usdToHtgReference : 0)}
            </span>
          </div>
        </div>

        {/* Factures Encaissées */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Factures Encaissées</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-700">{formatHTG(totalCollectedTTC)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Taux recouvrement: <strong className="text-emerald-700">{collectionRate}%</strong></span>
            <span>{sales.filter((s) => s.status === 'completed').length} payées</span>
          </div>
        </div>

        {/* En Attente de Règlement */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">En Attente de Paiement</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-700">{formatHTG(totalPendingTTC)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Créances à percevoir</span>
            <span>{sales.filter((s) => s.status === 'pending').length} en attente</span>
          </div>
        </div>

        {/* Factures en Retard */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Factures en Retard</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-md">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-700">
            {overdueCount} <span className="text-xs font-normal text-rose-600">facture(s) échue(s)</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Relance prioritaire</span>
            <span className="text-rose-600 font-medium">{overdueCount > 0 ? 'À relancer' : 'À jour'}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par n° de facture (FAC-...), client, bar/resto, commercial..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            >
              <option value="all">Tous les Statuts</option>
              <option value="completed">Payée (Encaissée)</option>
              <option value="pending">En attente (Non échue)</option>
              <option value="overdue">En retard (Échue)</option>
              <option value="cancelled">Annulée</option>
            </select>

            {/* Payment Method */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            >
              <option value="all">Tous les Règlements</option>
              <option value="especes">Espèces (Cash)</option>
              <option value="virement">Virement bancaire</option>
              <option value="carte">Carte bancaire</option>
              <option value="traite">Traite / Chèque</option>
            </select>

            {/* Period */}
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            >
              <option value="all">Toutes périodes</option>
              <option value="today">Aujourd'hui</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="this_year">Cette année</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            >
              <option value="date_desc">Date récente d'abord</option>
              <option value="date_asc">Date ancienne d'abord</option>
              <option value="amount_desc">Montant le plus élevé</option>
              <option value="amount_asc">Montant le plus faible</option>
            </select>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Affichage de <strong className="text-slate-800">{filteredInvoices.length}</strong> facture(s) sur{' '}
            {sales.length} au total
          </div>
          {(searchTerm || statusFilter !== 'all' || paymentMethodFilter !== 'all' || periodFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPaymentMethodFilter('all');
                setPeriodFilter('all');
              }}
              className="text-amber-700 hover:text-amber-800 font-medium hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Réinitialiser filtres
            </button>
          )}
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4">N° Facture</th>
                <th className="py-3 px-4">Date & Échéance</th>
                <th className="py-3 px-4">Client / Établissement</th>
                <th className="py-3 px-4">Commercial</th>
                <th className="py-3 px-4">Règlement</th>
                <th className="py-3 px-4 text-right">Montant HT</th>
                <th className="py-3 px-4 text-right">Montant TTC</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">Aucune facture ne correspond à ces critères</p>
                    <p className="text-xs text-slate-400 mt-1">Modifiez vos filtres ou effectuez une nouvelle vente.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((sale) => {
                  const overdue = isInvoiceOverdue(sale);
                  const dueDate = getDueDate(sale);
                  const isCompleted = sale.status === 'completed';
                  const isCancelled = sale.status === 'cancelled';
                  const eqUsd = exchangeRates.usdToHtgReference > 0 ? sale.totalTTC / exchangeRates.usdToHtgReference : 0;

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      {/* N° Facture */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(sale)}
                          className="hover:text-amber-700 flex items-center gap-1.5 transition-colors"
                          title="Cliquer pour afficher la facture officielle"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
                          <span>{sale.invoiceNumber}</span>
                        </button>
                      </td>

                      {/* Date & Due Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">
                          {new Date(sale.date).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-[11px] flex items-center gap-1 mt-0.5">
                          {overdue ? (
                            <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Échue ({dueDate})
                            </span>
                          ) : (
                            <span className="text-slate-400">Échéance: {dueDate}</span>
                          )}
                        </div>
                      </td>

                      {/* Customer & Company */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                          {sale.customerName}
                        </div>
                        {sale.customerCompany && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-[200px]">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{sale.customerCompany}</span>
                          </div>
                        )}
                      </td>

                      {/* Seller */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sale.sellerName}</span>
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded capitalize">
                          {sale.paymentMethod === 'especes' && <Banknote className="w-3 h-3 text-emerald-600" />}
                          {sale.paymentMethod === 'virement' && <Landmark className="w-3 h-3 text-blue-600" />}
                          {sale.paymentMethod === 'carte' && <CreditCard className="w-3 h-3 text-purple-600" />}
                          {sale.paymentMethod === 'traite' && <Receipt className="w-3 h-3 text-amber-600" />}
                          {sale.paymentMethod}
                        </span>
                      </td>

                      {/* Montant HT */}
                      <td className="py-3 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                        {formatHTG(sale.totalHT)}
                      </td>

                      {/* Montant TTC */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatHTG(sale.totalTTC)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatUSD(eqUsd)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Payée
                          </span>
                        )}
                        {sale.status === 'pending' && !overdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            En attente
                          </span>
                        )}
                        {overdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            En retard
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <XCircle className="w-3 h-3" />
                            Annulée
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => downloadInvoicePDF(sale, settings, 'a4')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors shadow-2xs"
                            title="Télécharger directement la Facture en format PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onPrintSale ? onPrintSale(sale) : setSelectedInvoice(sale)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded border border-slate-300 transition-colors shadow-2xs"
                            title="Imprimer ou visualiser la Facture / Reçu"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-600" />
                            <span>Imprimer</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(sale)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors"
                            title="Consulter et Imprimer la Facture"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {sale.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleSetStatus(sale.id, 'completed')}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                              title="Encaisser et marquer payée"
                            >
                              Encaisser
                            </button>
                          )}

                          {sale.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleSetStatus(sale.id, 'pending')}
                              className="px-1.5 py-1 text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              title="Remettre en attente"
                            >
                              En attente
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE OFFICIAL INVOICE MODAL                                          */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Action Header (Excluded from Print) */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-sm">
                  Facture Officielle : {selectedInvoice.invoiceNumber}
                </span>
                {selectedInvoice.status === 'completed' ? (
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-medium">
                    Payée
                  </span>
                ) : selectedInvoice.status === 'pending' ? (
                  <span className="text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-medium">
                    En attente de paiement
                  </span>
                ) : (
                  <span className="text-[11px] bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded font-medium">
                    Annulée
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-xs"
                  title="Télécharger directement la facture en PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Section */}
            <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible text-slate-900" id="printable-invoice">
              {/* Invoice Header: Company & Title */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                      <WaterBottleLogo className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-900">
                        {settings.companyName || 'OptiBoissons & Vins SAS'}
                      </h2>
                      <p className="text-[11px] text-amber-700 font-semibold tracking-wide uppercase">
                        Distribution & Grossiste Boissons Haïti
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5 mt-2">
                    <p>{settings.companyAddress || 'Zone Industrielle Nord, Boulevard Toussaint Louverture, Port-au-Prince'}</p>
                    <p>NIF / SIRET : <strong>{settings.companySiret || '000-482-910-3'}</strong></p>
                    <p>Email : {settings.contactEmail || 'facturation@optiboissons.ht'} | Tél : {settings.contactPhone || '+509 3700-1122'}</p>
                  </div>
                </div>

                <div className="sm:text-right bg-slate-50 p-4 rounded-xl border border-slate-200/80 min-w-[220px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                    Facture de Vente
                  </span>
                  <div className="text-lg font-mono font-black text-slate-900">
                    {selectedInvoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                    <p>
                      Date : <strong>{new Date(selectedInvoice.date).toLocaleDateString('fr-FR')}</strong>
                    </p>
                    <p>
                      Échéance : <strong>{getDueDate(selectedInvoice)}</strong>
                    </p>
                    <p>
                      Vendeur : <strong>{selectedInvoice.sellerName}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Info Box */}
              <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                    Facturé à :
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedInvoice.customerName}
                  </h3>
                  {selectedInvoice.customerCompany && (
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3" />
                      {selectedInvoice.customerCompany}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Réseau : CHR & Distributeurs Partenaires
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                    Modalités de Règlement :
                  </span>
                  <p>
                    Mode convenu : <strong className="capitalize">{selectedInvoice.paymentMethod}</strong>
                  </p>
                  <p>
                    Statut actuel :{' '}
                    <strong
                      className={
                        selectedInvoice.status === 'completed'
                          ? 'text-emerald-700'
                          : selectedInvoice.status === 'pending'
                          ? 'text-amber-700'
                          : 'text-slate-600'
                      }
                    >
                      {selectedInvoice.status === 'completed'
                        ? 'Encaissée / Payée'
                        : selectedInvoice.status === 'pending'
                        ? 'En attente d\'encaissement'
                        : 'Annulée'}
                    </strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Banque partenaire : Unibank / Sogebank Port-au-Prince
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Article / Boisson</th>
                      <th className="py-2.5 px-3 text-center">Qté</th>
                      <th className="py-2.5 px-3 text-right">Prix Unitaire HT</th>
                      <th className="py-2.5 px-3 text-right">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items.map((item, idx) => {
                      const prod = products.find((p) => p.id === item.productId);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{item.productName}</div>
                            {prod?.volume && (
                              <div className="text-[10px] text-slate-500">
                                Format: {prod.volume} {prod.alcoholDegree > 0 ? `• ${prod.alcoholDegree}% vol` : '• Sans alcool'}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                            {formatHTG(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            {formatHTG(item.totalPrice)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals & Currency Equivalence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                {/* Multi-currency equivalent notes */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-xs space-y-2">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-amber-700" />
                    <span>Règlement Multi-Devises Autorisé</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Conformément aux directives de caisse, ce montant peut être réglé en Gourdes, Dollars USD ou Pesos DOP :
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                    <div className="bg-white p-2 rounded border border-amber-200">
                      <span className="text-[10px] block text-slate-400">Équivalent USD (Taux BRH)</span>
                      <strong className="text-slate-900 font-bold">
                        {formatUSD(exchangeRates.usdToHtgReference > 0 ? selectedInvoice.totalTTC / exchangeRates.usdToHtgReference : 0)}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded border border-amber-200">
                      <span className="text-[10px] block text-slate-400">Équivalent DOP (Pesos)</span>
                      <strong className="text-slate-900 font-bold">
                        {formatDOP(exchangeRates.dopToHtgReference > 0 ? selectedInvoice.totalTTC / exchangeRates.dopToHtgReference : 0)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Final Totals */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Brut Hors Taxes (HT)</span>
                    <span className="font-mono font-medium">{formatHTG(selectedInvoice.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>TVA (20.00%)</span>
                    <span className="font-mono font-medium">
                      {formatHTG(Math.round((selectedInvoice.totalTTC - selectedInvoice.totalHT) * 100) / 100)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-300 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-sm">Net à Payer (TTC)</span>
                    <span className="font-mono font-black text-lg text-amber-700">
                      {formatHTG(selectedInvoice.totalTTC)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal Footer & Signatures */}
              <div className="mt-8 pt-6 border-t border-slate-200 text-[11px] text-slate-500 space-y-4">
                <div className="flex justify-between items-end gap-4">
                  <div>
                    <p className="font-semibold text-slate-700">Conditions de règlement :</p>
                    <p>Paiement exigible à la date d'échéance convenue. Aucun escompte pour paiement anticipé.</p>
                    <p>En cas de retard de paiement, pénalité légale de 3 fois le taux d'intérêt légal.</p>
                  </div>
                  <div className="w-48 text-center pt-8 border-t border-dashed border-slate-400 text-slate-600">
                    <span className="block font-medium">Cachet & Signature</span>
                    <span className="text-[10px] text-slate-400">Pour la Direction OptiBoissons</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions (Excluded from print) */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                {selectedInvoice.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => handleSetStatus(selectedInvoice.id, 'completed')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marquer Payée / Encaissée</span>
                  </button>
                )}

                {selectedInvoice.status === 'completed' && (
                  <button
                    type="button"
                    onClick={() => handleSetStatus(selectedInvoice.id, 'pending')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Remettre en Attente</span>
                  </button>
                )}

                {selectedInvoice.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => handleSetStatus(selectedInvoice.id, 'cancelled')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Annuler Facture</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-xs"
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
