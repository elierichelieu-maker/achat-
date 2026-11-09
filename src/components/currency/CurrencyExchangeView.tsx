import React, { useState, useMemo } from 'react';
import { ExchangeRateConfig, ExchangeTransaction, Seller } from '../../types';
import { formatHTG, formatUSD, formatDOP } from '../../utils/formatters';
import {
  ArrowLeftRight,
  DollarSign,
  Coins,
  Receipt,
  Calculator,
  SlidersHorizontal,
  PlusCircle,
  Download,
  Calendar,
  CheckCircle2,
  Trash2,
  FileText,
  RefreshCw,
  Search,
  Filter,
  X,
  Printer,
  Sparkles,
  Layers,
} from 'lucide-react';

interface CurrencyExchangeViewProps {
  rates: ExchangeRateConfig;
  transactions: ExchangeTransaction[];
  sellers: Seller[];
  onUpdateRates: (rates: ExchangeRateConfig) => void;
  onAddTransaction: (transaction: Omit<ExchangeTransaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

type ConversionMode = 'USD_TO_HTG' | 'HTG_TO_USD' | 'DOP_TO_HTG' | 'HTG_TO_DOP' | 'USD_TO_DOP';
type RateType = 'reference' | 'buy' | 'sell' | 'custom';

export const CurrencyExchangeView: React.FC<CurrencyExchangeViewProps> = ({
  rates,
  transactions,
  sellers,
  onUpdateRates,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'calculator' | 'register' | 'grids'>('calculator');

  // Converter state
  const [conversionMode, setConversionMode] = useState<ConversionMode>('USD_TO_HTG');
  const [rateType, setRateType] = useState<RateType>('reference');
  const [customRate, setCustomRate] = useState<number>(rates.usdToHtgReference);
  const [amountInput, setAmountInput] = useState<string>('100');

  // Change / Rendu de monnaie state
  const [isCashierAssistantOpen, setIsCashierAssistantOpen] = useState(false);
  const [billAmountHTG, setBillAmountHTG] = useState<string>('10000');
  const [paidForeignAmount, setPaidForeignAmount] = useState<string>('100');
  const [paidCurrency, setPaidCurrency] = useState<'USD' | 'DOP'>('USD');

  // Modals state
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Filter & Search in Register
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'USD' | 'DOP'>('all');

  // Temporary state for editing rates
  const [editedRates, setEditedRates] = useState<ExchangeRateConfig>(rates);

  // New Transaction Form state
  const [newTxData, setNewTxData] = useState({
    type: 'USD_TO_HTG' as ConversionMode,
    amountFrom: 100,
    rateApplied: rates.usdToHtgReference,
    clientOrBeneficiary: '',
    operator: sellers[0]?.name || 'Caissier Principal',
    notes: '',
  });

  // Calculate current active rate for converter
  const currentRate = useMemo(() => {
    if (rateType === 'custom') return customRate || 1;

    switch (conversionMode) {
      case 'USD_TO_HTG':
        if (rateType === 'buy') return rates.usdToHtgBuy;
        if (rateType === 'sell') return rates.usdToHtgSell;
        return rates.usdToHtgReference;

      case 'HTG_TO_USD':
        // For buying USD with HTG, use sell rate or reference
        if (rateType === 'buy') return rates.usdToHtgSell;
        if (rateType === 'sell') return rates.usdToHtgBuy;
        return rates.usdToHtgReference;

      case 'DOP_TO_HTG':
        if (rateType === 'buy') return rates.dopToHtgBuy;
        if (rateType === 'sell') return rates.dopToHtgSell;
        return rates.dopToHtgReference;

      case 'HTG_TO_DOP':
        if (rateType === 'buy') return rates.dopToHtgSell;
        if (rateType === 'sell') return rates.dopToHtgBuy;
        return rates.dopToHtgReference;

      case 'USD_TO_DOP':
        // USD to DOP cross rate: (USD/HTG) / (DOP/HTG)
        return rates.usdToHtgReference / rates.dopToHtgReference;

      default:
        return rates.usdToHtgReference;
    }
  }, [conversionMode, rateType, customRate, rates]);

  // Converted result calculation
  const parsedAmount = parseFloat(amountInput) || 0;
  const convertedResult = useMemo(() => {
    if (parsedAmount <= 0) return 0;

    switch (conversionMode) {
      case 'USD_TO_HTG':
        return parsedAmount * currentRate;
      case 'HTG_TO_USD':
        return currentRate > 0 ? parsedAmount / currentRate : 0;
      case 'DOP_TO_HTG':
        return parsedAmount * currentRate;
      case 'HTG_TO_DOP':
        return currentRate > 0 ? parsedAmount / currentRate : 0;
      case 'USD_TO_DOP':
        return parsedAmount * currentRate;
      default:
        return 0;
    }
  }, [parsedAmount, conversionMode, currentRate]);

  // Cashier change calculation
  const cashierCalc = useMemo(() => {
    const bill = parseFloat(billAmountHTG) || 0;
    const paidForeign = parseFloat(paidForeignAmount) || 0;
    const rate = paidCurrency === 'USD' ? rates.usdToHtgReference : rates.dopToHtgReference;
    const paidInHTG = paidForeign * rate;
    const diffHTG = paidInHTG - bill;

    return {
      bill,
      paidForeign,
      rate,
      paidInHTG,
      changeHTG: diffHTG > 0 ? diffHTG : 0,
      remainingDueHTG: diffHTG < 0 ? Math.abs(diffHTG) : 0,
      changeInForeignCurrency: diffHTG > 0 ? diffHTG / rate : 0,
    };
  }, [billAmountHTG, paidForeignAmount, paidCurrency, rates]);

  // Quick denomination increments
  const handleQuickAdd = (delta: number) => {
    const current = parseFloat(amountInput) || 0;
    setAmountInput((current + delta).toString());
  };

  // Switch direction
  const handleToggleDirection = () => {
    if (conversionMode === 'USD_TO_HTG') setConversionMode('HTG_TO_USD');
    else if (conversionMode === 'HTG_TO_USD') setConversionMode('USD_TO_HTG');
    else if (conversionMode === 'DOP_TO_HTG') setConversionMode('HTG_TO_DOP');
    else if (conversionMode === 'HTG_TO_DOP') setConversionMode('DOP_TO_HTG');
  };

  // Save rates
  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRates({
      ...editedRates,
      lastUpdated: new Date().toISOString(),
    });
    setIsRatesModalOpen(false);
    showNotice('Taux de change officiels mis à jour avec succès');
  };

  // Record transaction from converter
  const handleQuickRecordFromConverter = () => {
    if (parsedAmount <= 0) return;

    let fromCurrency: 'USD' | 'DOP' | 'HTG' = 'USD';
    let toCurrency: 'USD' | 'DOP' | 'HTG' = 'HTG';

    if (conversionMode === 'USD_TO_HTG') {
      fromCurrency = 'USD';
      toCurrency = 'HTG';
    } else if (conversionMode === 'HTG_TO_USD') {
      fromCurrency = 'HTG';
      toCurrency = 'USD';
    } else if (conversionMode === 'DOP_TO_HTG') {
      fromCurrency = 'DOP';
      toCurrency = 'HTG';
    } else if (conversionMode === 'HTG_TO_DOP') {
      fromCurrency = 'HTG';
      toCurrency = 'DOP';
    } else if (conversionMode === 'USD_TO_DOP') {
      fromCurrency = 'USD';
      toCurrency = 'DOP';
    }

    onAddTransaction({
      date: new Date().toISOString(),
      type: conversionMode,
      fromCurrency,
      toCurrency,
      amountFrom: parsedAmount,
      rateApplied: currentRate,
      amountTo: convertedResult,
      clientOrBeneficiary: 'Comptoir / Client Caisse',
      operator: sellers[0]?.name || 'Caissier Principal',
      notes: `Change direct au guichet (${rateType === 'reference' ? 'Taux Référence' : rateType})`,
    });

    showNotice(`Opération de change enregistrée : ${formatAmount(parsedAmount, fromCurrency)} ➔ ${formatAmount(convertedResult, toCurrency)}`);
  };

  // Record cashier change transaction
  const handleRecordCashierSale = () => {
    if (cashierCalc.paidForeign <= 0) return;

    onAddTransaction({
      date: new Date().toISOString(),
      type: paidCurrency === 'USD' ? 'USD_TO_HTG' : 'DOP_TO_HTG',
      fromCurrency: paidCurrency,
      toCurrency: 'HTG',
      amountFrom: cashierCalc.paidForeign,
      rateApplied: cashierCalc.rate,
      amountTo: cashierCalc.paidInHTG,
      clientOrBeneficiary: 'Règlement Facture Client',
      operator: sellers[0]?.name || 'Caissier',
      notes: `Facture ${formatHTG(cashierCalc.bill)}. Reçu ${paidCurrency === 'USD' ? formatUSD(cashierCalc.paidForeign) : formatDOP(cashierCalc.paidForeign)}. Monnaie rendue: ${formatHTG(cashierCalc.changeHTG)}`,
    });

    showNotice(`Paiement de facture enregistré au registre avec rendu de ${formatHTG(cashierCalc.changeHTG)}.`);
  };

  // Add manual transaction
  const handleSaveManualTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTxData.amountFrom <= 0) return;

    let fromCurrency: 'USD' | 'DOP' | 'HTG' = 'USD';
    let toCurrency: 'USD' | 'DOP' | 'HTG' = 'HTG';
    let amountTo = 0;

    if (newTxData.type === 'USD_TO_HTG') {
      fromCurrency = 'USD';
      toCurrency = 'HTG';
      amountTo = newTxData.amountFrom * newTxData.rateApplied;
    } else if (newTxData.type === 'HTG_TO_USD') {
      fromCurrency = 'HTG';
      toCurrency = 'USD';
      amountTo = newTxData.rateApplied > 0 ? newTxData.amountFrom / newTxData.rateApplied : 0;
    } else if (newTxData.type === 'DOP_TO_HTG') {
      fromCurrency = 'DOP';
      toCurrency = 'HTG';
      amountTo = newTxData.amountFrom * newTxData.rateApplied;
    } else if (newTxData.type === 'HTG_TO_DOP') {
      fromCurrency = 'HTG';
      toCurrency = 'DOP';
      amountTo = newTxData.rateApplied > 0 ? newTxData.amountFrom / newTxData.rateApplied : 0;
    } else if (newTxData.type === 'USD_TO_DOP') {
      fromCurrency = 'USD';
      toCurrency = 'DOP';
      amountTo = newTxData.amountFrom * newTxData.rateApplied;
    }

    onAddTransaction({
      date: new Date().toISOString(),
      type: newTxData.type,
      fromCurrency,
      toCurrency,
      amountFrom: newTxData.amountFrom,
      rateApplied: newTxData.rateApplied,
      amountTo,
      clientOrBeneficiary: newTxData.clientOrBeneficiary || 'Client Divers',
      operator: newTxData.operator,
      notes: newTxData.notes,
    });

    setIsAddTransactionModalOpen(false);
    showNotice('Transaction enregistrée au registre de change.');
  };

  const showNotice = (msg: string) => {
    setNotification({ message: msg, type: 'success' });
    setTimeout(() => setNotification(null), 4000);
  };

  // Format currency value based on currency symbol
  const formatAmount = (val: number, curr: 'USD' | 'DOP' | 'HTG') => {
    if (curr === 'USD') return formatUSD(val);
    if (curr === 'DOP') return formatDOP(val);
    return formatHTG(val);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.clientOrBeneficiary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (typeFilter === 'USD') {
        return tx.fromCurrency === 'USD' || tx.toCurrency === 'USD';
      }
      if (typeFilter === 'DOP') {
        return tx.fromCurrency === 'DOP' || tx.toCurrency === 'DOP';
      }
      return true;
    });
  }, [transactions, searchQuery, typeFilter]);

  // Totals in transactions
  const totals = useMemo(() => {
    let totalUsdCollected = 0;
    let totalDopCollected = 0;
    let totalHtgDisbursedOrExchanged = 0;

    transactions.forEach((tx) => {
      if (tx.fromCurrency === 'USD') totalUsdCollected += tx.amountFrom;
      if (tx.fromCurrency === 'DOP') totalDopCollected += tx.amountFrom;
      if (tx.toCurrency === 'HTG') totalHtgDisbursedOrExchanged += tx.amountTo;
    });

    return { totalUsdCollected, totalDopCollected, totalHtgDisbursedOrExchanged };
  }, [transactions]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Devise Depart', 'Montant Depart', 'Taux Applique', 'Devise Arrivee', 'Montant Arrivee (HTG)', 'Client/Beneficiaire', 'Operateur', 'Notes'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      new Date(tx.date).toLocaleString('fr-FR'),
      tx.type,
      tx.fromCurrency,
      tx.amountFrom,
      tx.rateApplied,
      tx.toCurrency,
      tx.amountTo,
      `"${tx.clientOrBeneficiary || ''}"`,
      `"${tx.operator}"`,
      `"${tx.notes || ''}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `registre_change_optiboissons_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick lookup matrices for USD and DOP
  const usdQuickTable = [1, 5, 10, 20, 50, 100, 200, 500, 1000];
  const dopQuickTable = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{notification.message}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Bureau de Change & Devises
                </h1>
                <p className="text-xs text-slate-500">
                  Conversion Dollars Américains (USD) et Pesos Dominicains (DOP) en Gourdes Haïtiennes (HTG)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditedRates(rates);
                setIsRatesModalOpen(true);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Modifier les Taux Officiels</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewTxData({
                  type: 'USD_TO_HTG',
                  amountFrom: 100,
                  rateApplied: rates.usdToHtgReference,
                  clientOrBeneficiary: '',
                  operator: sellers[0]?.name || 'Caissier',
                  notes: '',
                });
                setIsAddTransactionModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Enregistrer Opération</span>
            </button>
          </div>
        </div>

        {/* Live Rates Overview Banner */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-slate-100">
          {/* USD Card */}
          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dollar US (USD)</span>
              </span>
              <span className="font-mono text-[11px] bg-emerald-100/70 text-emerald-900 px-1.5 py-0.5 rounded">
                1 USD
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-950 mt-1">
              {formatHTG(rates.usdToHtgReference, { showCents: true })}
            </div>
            <div className="mt-2 text-[11px] text-emerald-700/80 flex items-center justify-between font-mono">
              <span>Achat: {rates.usdToHtgBuy.toFixed(2)} G</span>
              <span>·</span>
              <span>Vente: {rates.usdToHtgSell.toFixed(2)} G</span>
            </div>
          </div>

          {/* DOP Card */}
          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
            <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-blue-600" />
                <span>Peso Dominicain (DOP)</span>
              </span>
              <span className="font-mono text-[11px] bg-blue-100/70 text-blue-900 px-1.5 py-0.5 rounded">
                1 DOP
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-blue-950 mt-1">
              {formatHTG(rates.dopToHtgReference, { showCents: true })}
            </div>
            <div className="mt-2 text-[11px] text-blue-700/80 flex items-center justify-between font-mono">
              <span>Achat: {rates.dopToHtgBuy.toFixed(2)} G</span>
              <span>·</span>
              <span>Vente: {rates.dopToHtgSell.toFixed(2)} G</span>
            </div>
          </div>

          {/* Cross Rate USD / DOP */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Parité USD ⇄ DOP</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Croisé
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {formatDOP(rates.usdToHtgReference / rates.dopToHtgReference)}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-mono">
              Pour 1.00 USD en République Dominicaine
            </div>
          </div>

          {/* Transactions Summary */}
          <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                <span>Devises Traitées en Caisse</span>
              </span>
              <span className="font-mono text-[11px] text-amber-700">
                {transactions.length} ops
              </span>
            </div>
            <div className="text-base font-bold font-mono text-amber-950 mt-1 truncate">
              {formatHTG(totals.totalHtgDisbursedOrExchanged, { compact: true })}
            </div>
            <div className="mt-2 text-[11px] text-amber-800/80 flex items-center justify-between font-mono">
              <span>{formatUSD(totals.totalUsdCollected)}</span>
              <span>·</span>
              <span>{formatDOP(totals.totalDopCollected)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Selection */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('calculator')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'calculator'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Convertisseur & Rendu Monnaie</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('register')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'register'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Registre des Opérations ({filteredTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('grids')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'grids'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Grilles & Barèmes de Change</span>
        </button>
      </div>

      {/* Sub Tab 1: Interactive Converter */}
      {activeSubTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Converter Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Calculateur de Change Instantané
                </span>
              </div>

              {/* Pair Switcher Dropdown / Segmented */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setConversionMode('USD_TO_HTG')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    conversionMode === 'USD_TO_HTG' || conversionMode === 'HTG_TO_USD'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  USD ⇄ HTG
                </button>
                <button
                  type="button"
                  onClick={() => setConversionMode('DOP_TO_HTG')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    conversionMode === 'DOP_TO_HTG' || conversionMode === 'HTG_TO_DOP'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  DOP ⇄ HTG
                </button>
                <button
                  type="button"
                  onClick={() => setConversionMode('USD_TO_DOP')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    conversionMode === 'USD_TO_DOP'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  USD ⇄ DOP
                </button>
              </div>
            </div>

            {/* Rate Choice Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Type de taux appliqué :
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setRateType('reference')}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    rateType === 'reference'
                      ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Officiel BRH</div>
                  <div className="text-xs font-mono font-bold mt-0.5">
                    {conversionMode.includes('USD') ? `${rates.usdToHtgReference} G` : `${rates.dopToHtgReference} G`}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRateType('buy')}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    rateType === 'buy'
                      ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Taux Achat</div>
                  <div className="text-xs font-mono font-bold mt-0.5">
                    {conversionMode.includes('USD') ? `${rates.usdToHtgBuy} G` : `${rates.dopToHtgBuy} G`}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRateType('sell')}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    rateType === 'sell'
                      ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Taux Vente</div>
                  <div className="text-xs font-mono font-bold mt-0.5">
                    {conversionMode.includes('USD') ? `${rates.usdToHtgSell} G` : `${rates.dopToHtgSell} G`}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRateType('custom')}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    rateType === 'custom'
                      ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Personnalisé</div>
                  <div className="text-xs font-mono font-bold mt-0.5">Manuel</div>
                </button>
              </div>

              {rateType === 'custom' && (
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Taux appliqué :</span>
                    <input
                      type="number"
                      step="0.01"
                      value={customRate}
                      onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded font-mono w-28 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-mono">HTG pour 1 unité étrangère</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input & Output Block */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
              {/* Source Input */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Montant de départ :</span>
                  <span className="font-semibold text-slate-800">
                    {conversionMode === 'USD_TO_HTG' && 'Dollars Américains (USD)'}
                    {conversionMode === 'HTG_TO_USD' && 'Gourdes Haïtiennes (HTG)'}
                    {conversionMode === 'DOP_TO_HTG' && 'Pesos Dominicains (DOP)'}
                    {conversionMode === 'HTG_TO_DOP' && 'Gourdes Haïtiennes (HTG)'}
                    {conversionMode === 'USD_TO_DOP' && 'Dollars Américains (USD)'}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-4 pr-16 py-3 text-2xl font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {conversionMode === 'USD_TO_HTG' && 'USD'}
                    {conversionMode === 'HTG_TO_USD' && 'HTG'}
                    {conversionMode === 'DOP_TO_HTG' && 'DOP'}
                    {conversionMode === 'HTG_TO_DOP' && 'HTG'}
                    {conversionMode === 'USD_TO_DOP' && 'USD'}
                  </div>
                </div>

                {/* Quick denomination helpers */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono mr-1">Ajouter:</span>
                  {(conversionMode.startsWith('USD') ? [10, 20, 50, 100, 500] : conversionMode.startsWith('DOP') ? [100, 500, 1000, 2000, 5000] : [500, 1000, 5000, 10000]).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleQuickAdd(num)}
                      className="px-2 py-0.5 text-[11px] font-mono bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-700 text-slate-600 rounded transition-colors whitespace-nowrap"
                    >
                      +{num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmountInput('0')}
                    className="px-2 py-0.5 text-[11px] text-rose-600 hover:bg-rose-50 rounded ml-auto transition-colors"
                  >
                    Effacer
                  </button>
                </div>
              </div>

              {/* Inversion Button */}
              <div className="flex justify-center -my-2 relative z-10">
                <button
                  type="button"
                  onClick={handleToggleDirection}
                  className="p-2 rounded-full bg-white border border-slate-300 hover:border-amber-500 text-slate-600 hover:text-amber-600 shadow-xs transition-colors"
                  title="Inverser les devises"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              {/* Converted Target Output */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Contre-valeur calculée :</span>
                  <span className="font-semibold text-slate-800">
                    {conversionMode === 'USD_TO_HTG' && 'Gourdes Haïtiennes (HTG)'}
                    {conversionMode === 'HTG_TO_USD' && 'Dollars Américains (USD)'}
                    {conversionMode === 'DOP_TO_HTG' && 'Gourdes Haïtiennes (HTG)'}
                    {conversionMode === 'HTG_TO_DOP' && 'Pesos Dominicains (DOP)'}
                    {conversionMode === 'USD_TO_DOP' && 'Pesos Dominicains (DOP)'}
                  </span>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-950">
                      {conversionMode.endsWith('HTG')
                        ? formatHTG(convertedResult, { showCents: true })
                        : conversionMode.endsWith('USD')
                        ? formatUSD(convertedResult)
                        : formatDOP(convertedResult)}
                    </div>
                    <div className="text-xs text-amber-800/80 font-mono mt-0.5">
                      Taux appliqué : 1 = {currentRate.toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickRecordFromConverter}
                    disabled={parsedAmount <= 0}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Assistant Caisse & Monnaie à Rendre */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Assistant Caisse & Rendu Monnaie
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Pour les clients qui paient en devises étrangères
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {/* Facture Montant en HTG */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Montant de la Facture (en Gourdes HTG) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={billAmountHTG}
                    onChange={(e) => setBillAmountHTG(e.target.value)}
                    placeholder="ex: 15000"
                    className="w-full px-3 py-2 text-sm font-bold font-mono text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Devise Reçue */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Devise & Montant remis par le client :</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPaidCurrency('USD')}
                        className={`px-2 py-0.5 text-xs rounded font-medium ${
                          paidCurrency === 'USD'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        USD ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidCurrency('DOP')}
                        className={`px-2 py-0.5 text-xs rounded font-medium ${
                          paidCurrency === 'DOP'
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        DOP (RD$)
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={paidForeignAmount}
                      onChange={(e) => setPaidForeignAmount(e.target.value)}
                      placeholder="Montant remis..."
                      className="w-full pl-3 pr-14 py-2 text-sm font-bold font-mono text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-slate-500">
                      {paidCurrency}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    Équivaut à : {formatHTG(cashierCalc.paidInHTG)} au cours de {cashierCalc.rate.toFixed(2)} HTG
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Total Facture Client :</span>
                    <span className="font-bold font-mono text-slate-900">{formatHTG(cashierCalc.bill)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Montant Reçu :</span>
                    <span className="font-bold font-mono text-slate-900">
                      {paidCurrency === 'USD' ? formatUSD(cashierCalc.paidForeign) : formatDOP(cashierCalc.paidForeign)} ({formatHTG(cashierCalc.paidInHTG)})
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    {cashierCalc.changeHTG > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-emerald-800">
                          Monnaie exacte à rendre au client :
                        </div>
                        <div className="text-2xl font-black font-mono text-emerald-700">
                          {formatHTG(cashierCalc.changeHTG, { showCents: true })}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-mono">
                          Ou équivalent en {paidCurrency} : {paidCurrency === 'USD' ? formatUSD(cashierCalc.changeInForeignCurrency) : formatDOP(cashierCalc.changeInForeignCurrency)}
                        </div>
                      </div>
                    ) : cashierCalc.remainingDueHTG > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-rose-700">
                          Montant insuffisant ! Reste à payer :
                        </div>
                        <div className="text-xl font-bold font-mono text-rose-600">
                          {formatHTG(cashierCalc.remainingDueHTG)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-slate-700">
                        Compte exact. Aucune monnaie à rendre.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRecordCashierSale}
              disabled={cashierCalc.paidForeign <= 0 || cashierCalc.remainingDueHTG > 0}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Valider & Enregistrer dans la Caisse</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub Tab 2: Register of Exchange Operations */}
      {activeSubTab === 'register' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-4 p-5">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher client, opérateur, note..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Currency Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    typeFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Tous ({transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('USD')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    typeFilter === 'USD' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('DOP')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    typeFilter === 'DOP' ? 'bg-white text-blue-800 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  DOP (RD$)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exporter CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddTransactionModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Nouvelle Opération</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date & Heure</th>
                  <th className="py-2.5 px-3">Opération</th>
                  <th className="py-2.5 px-3 text-right">Montant Départ</th>
                  <th className="py-2.5 px-3 text-right">Taux Appliqué</th>
                  <th className="py-2.5 px-3 text-right">Contre-valeur (HTG)</th>
                  <th className="py-2.5 px-3">Client / Bénéficiaire</th>
                  <th className="py-2.5 px-3">Opérateur</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Aucune transaction de change trouvée pour cette sélection.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {tx.fromCurrency === 'USD' && <DollarSign className="w-3.5 h-3.5 text-emerald-600" />}
                          {tx.fromCurrency === 'DOP' && <Coins className="w-3.5 h-3.5 text-blue-600" />}
                          {tx.fromCurrency === 'HTG' && <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />}
                          <span className="text-slate-800 font-semibold">
                            {tx.fromCurrency} ➔ {tx.toCurrency}
                          </span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                        {formatAmount(tx.amountFrom, tx.fromCurrency)}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-600 text-right whitespace-nowrap">
                        1 = {tx.rateApplied.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-amber-900 text-right whitespace-nowrap">
                        {formatHTG(tx.amountTo)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 max-w-[160px] truncate">
                        {tx.clientOrBeneficiary || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {tx.operator}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[200px] truncate">
                        {tx.notes || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Voulez-vous supprimer cette écriture de change ?')) {
                              onDeleteTransaction(tx.id);
                              showNotice('Transaction supprimée');
                            }
                          }}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Tab 3: Quick Grids & Barèmes */}
      {activeSubTab === 'grids' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 border border-slate-200 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Barèmes et Grilles Officielles pour Caisse & Équipe Commerciale
              </h3>
              <p className="text-xs text-slate-500">
                Valeurs directes calculées aux cours du jour pour accélérer les encaissements en tournée
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer la Fiche</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dollar US Quick Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    $
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Barème Dollar Américain (USD)</h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Référence: {rates.usdToHtgReference.toFixed(2)} G · Achat: {rates.usdToHtgBuy.toFixed(2)} G
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left">Billet USD</th>
                      <th className="py-2 px-3 text-right">Taux Achat ({rates.usdToHtgBuy.toFixed(2)})</th>
                      <th className="py-2 px-3 text-right font-bold text-slate-900">Taux Réf. ({rates.usdToHtgReference.toFixed(2)})</th>
                      <th className="py-2 px-3 text-right">Taux Vente ({rates.usdToHtgSell.toFixed(2)})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {usdQuickTable.map((amount) => (
                      <tr key={amount} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-bold text-emerald-800">
                          {formatUSD(amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {formatHTG(amount * rates.usdToHtgBuy)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-900 bg-amber-50/40">
                          {formatHTG(amount * rates.usdToHtgReference)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {formatHTG(amount * rates.usdToHtgSell)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Peso Dominicain Quick Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                    RD$
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Barème Peso Dominicain (DOP)</h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Référence: {rates.dopToHtgReference.toFixed(2)} G · Achat: {rates.dopToHtgBuy.toFixed(2)} G
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left">Billet DOP</th>
                      <th className="py-2 px-3 text-right">Taux Achat ({rates.dopToHtgBuy.toFixed(2)})</th>
                      <th className="py-2 px-3 text-right font-bold text-slate-900">Taux Réf. ({rates.dopToHtgReference.toFixed(2)})</th>
                      <th className="py-2 px-3 text-right">Taux Vente ({rates.dopToHtgSell.toFixed(2)})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {dopQuickTable.map((amount) => (
                      <tr key={amount} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-bold text-blue-800">
                          {formatDOP(amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {formatHTG(amount * rates.dopToHtgBuy)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-900 bg-amber-50/40">
                          {formatHTG(amount * rates.dopToHtgReference)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {formatHTG(amount * rates.dopToHtgSell)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Exchange Rates */}
      {isRatesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Modifier les Taux Officiels du Jour
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRatesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="p-5 space-y-4">
              {/* Dollar Section */}
              <div className="space-y-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Dollar Américain (USD / HTG)</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Taux Achat</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editedRates.usdToHtgBuy}
                      onChange={(e) =>
                        setEditedRates({ ...editedRates, usdToHtgBuy: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Taux Réf. (BRH)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editedRates.usdToHtgReference}
                      onChange={(e) =>
                        setEditedRates({ ...editedRates, usdToHtgReference: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 bg-amber-50/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Taux Vente</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editedRates.usdToHtgSell}
                      onChange={(e) =>
                        setEditedRates({ ...editedRates, usdToHtgSell: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* DOP Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Peso Dominicain (DOP / HTG)</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Taux Achat</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editedRates.dopToHtgBuy}
                      onChange={(e) =>
                        setEditedRates({ ...editedRates, dopToHtgBuy: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Taux Réf.</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editedRates.dopToHtgReference}
                      onChange={(e) =>
                        setEditedRates({ ...editedRates, dopToHtgReference: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 bg-blue-50/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Taux Vente</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editedRates.dopToHtgSell}
                      onChange={(e) =>
                        setEditedRates({ ...editedRates, dopToHtgSell: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRatesModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                >
                  Sauvegarder les Taux
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Manual Transaction */}
      {isAddTransactionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-slate-900" />
                <h3 className="font-bold text-sm text-slate-900">
                  Enregistrer une Opération de Change
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTransactionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualTransaction} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Type d'opération :</label>
                <select
                  value={newTxData.type}
                  onChange={(e) => {
                    const t = e.target.value as ConversionMode;
                    let defaultRate = rates.usdToHtgReference;
                    if (t === 'DOP_TO_HTG' || t === 'HTG_TO_DOP') defaultRate = rates.dopToHtgReference;
                    else if (t === 'USD_TO_DOP') defaultRate = rates.usdToHtgReference / rates.dopToHtgReference;
                    setNewTxData({ ...newTxData, type: t, rateApplied: defaultRate });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                >
                  <option value="USD_TO_HTG">USD ➔ HTG (Achat / Encaissement Dollars)</option>
                  <option value="HTG_TO_USD">HTG ➔ USD (Vente / Décaissement Dollars)</option>
                  <option value="DOP_TO_HTG">DOP ➔ HTG (Achat / Encaissement Pesos)</option>
                  <option value="HTG_TO_DOP">HTG ➔ DOP (Vente / Décaissement Pesos)</option>
                  <option value="USD_TO_DOP">USD ➔ DOP (Échange Dollars vers Pesos)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Montant Départ :</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    value={newTxData.amountFrom}
                    onChange={(e) => setNewTxData({ ...newTxData, amountFrom: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Taux Appliqué :</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTxData.rateApplied}
                    onChange={(e) => setNewTxData({ ...newTxData, rateApplied: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Client ou Bénéficiaire :</label>
                <input
                  type="text"
                  placeholder="ex: Brasserie du Port, Chauffeur..."
                  value={newTxData.clientOrBeneficiary}
                  onChange={(e) => setNewTxData({ ...newTxData, clientOrBeneficiary: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Opérateur / Caissier :</label>
                <select
                  value={newTxData.operator}
                  onChange={(e) => setNewTxData({ ...newTxData, operator: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                >
                  {sellers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Motif / Notes :</label>
                <textarea
                  rows={2}
                  placeholder="ex: Facture #2026-081 payée en espèces..."
                  value={newTxData.notes}
                  onChange={(e) => setNewTxData({ ...newTxData, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTransactionModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
