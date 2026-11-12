import React, { useState, useEffect } from 'react';
import { Sale, AppSettings } from '../../types';
import { formatHTG } from '../../utils/formatters';
import { WaterBottleLogo } from '../common/WaterBottleLogo';
import {
  X,
  Printer,
  FileText,
  Receipt,
  CheckCircle2,
  Calendar,
  User,
  CreditCard,
  Building2,
  Clock,
  Download,
  Share2,
  FileDown,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
  QrCode,
  Upload,
  Trash2,
  Check,
  Settings,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react';
import {
  executePrintOrDownload,
  downloadInvoicePDF,
  downloadPrintableHTML,
  shareInvoiceViaWhatsApp,
  generateInvoiceQRCodeDataUrl,
} from '../../utils/invoicePrinter';
import { syncSaveSettings } from '../../services/cloudSyncService';

interface InvoiceReceiptModalProps {
  sale: Sale | null;
  settings?: AppSettings;
  onClose: () => void;
  onUpdateSettings?: (settings: AppSettings) => void;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  sale,
  settings,
  onClose,
  onUpdateSettings,
}) => {
  // Defaults directly to Ticket 80mm ("un facture de 80mm je veux")
  const [printFormat, setPrintFormat] = useState<'ticket' | 'a4'>(
    settings?.defaultInvoiceFormat || 'ticket'
  );
  const [includeLogoOnTicket, setIncludeLogoOnTicket] = useState<boolean>(
    settings?.showLogoOnTicket !== false
  );
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>(settings?.companyLogo || '');
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [inputLogoUrl, setInputLogoUrl] = useState<string>(settings?.companyLogo || '');
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoPreviewStatus, setLogoPreviewStatus] = useState<'idle' | 'valid' | 'error'>('idle');

  // Keep local logo in sync when settings change
  useEffect(() => {
    if (settings?.companyLogo !== undefined) {
      setCurrentLogoUrl(settings.companyLogo || '');
      setInputLogoUrl(settings.companyLogo || '');
    }
  }, [settings?.companyLogo]);

  // Generate unique verification QR Code containing the invoice number
  useEffect(() => {
    let isMounted = true;
    if (sale?.invoiceNumber) {
      generateInvoiceQRCodeDataUrl(sale).then((url) => {
        if (isMounted && url) {
          setQrCodeUrl(url);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [sale?.invoiceNumber, sale?.id]);

  if (!sale) return null;

  const effectiveSettings: AppSettings | undefined = settings
    ? {
        ...settings,
        companyLogo: currentLogoUrl,
        showLogoOnTicket: includeLogoOnTicket,
      }
    : undefined;

  const showNotice = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackNotice({ type, text });
    setTimeout(() => setFeedbackNotice(null), 4500);
  };

  // Define and store company logo URL permanently
  const handleSaveLogo = async (urlToSave: string) => {
    if (!settings) return;
    setIsSavingLogo(true);
    const cleanUrl = urlToSave.trim();
    const updatedSettings: AppSettings = {
      ...settings,
      companyLogo: cleanUrl,
      showLogoOnTicket: true,
      updatedAt: new Date().toISOString(),
    };

    try {
      // 1. Update component local state for immediate dynamic re-rendering
      setCurrentLogoUrl(cleanUrl);
      setIncludeLogoOnTicket(true);

      // 2. Notify parent App component
      if (onUpdateSettings) {
        onUpdateSettings(updatedSettings);
      }

      // 3. Persist to Firebase Cloud Firestore and localStorage
      await syncSaveSettings(updatedSettings);
      try {
        localStorage.setItem('optiboissons_settings_v2', JSON.stringify(updatedSettings));
      } catch {}

      setIsLogoModalOpen(false);
      showNotice(
        cleanUrl
          ? "Logo de l'entreprise enregistré avec succès ! Il s'affiche désormais dynamiquement sur vos tickets 80mm."
          : "Logo personnalisé retiré.",
        'success'
      );
    } catch (err) {
      console.error('Erreur sauvegarde logo:', err);
      showNotice("Erreur lors de la sauvegarde du logo. Veuillez réessayer.", 'error');
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("L'image est trop volumineuse (maximum 2 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setInputLogoUrl(base64);
        setLogoPreviewStatus('valid');
      }
    };
  };

  // 1. Direct Print with automatic fallback
  const handlePrint = async () => {
    setIsProcessing(true);
    setFeedbackNotice({ type: 'info', text: 'Préparation de l\'impression...' });
    try {
      const res = await executePrintOrDownload(sale, effectiveSettings, printFormat, qrCodeUrl);
      if (res.methodUsed === 'pdf_download') {
        showNotice('Impression navigateur restreinte : la facture PDF a été téléchargée automatiquement sur votre appareil !', 'success');
      } else {
        showNotice(res.message, 'success');
      }
    } catch (e) {
      console.error(e);
      // Fallback: download PDF directly
      await downloadInvoicePDF(sale, effectiveSettings, printFormat);
      showNotice('La facture a été exportée en PDF sur votre appareil.', 'success');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Direct PDF Download
  const handleDownloadPDF = async () => {
    setIsProcessing(true);
    try {
      const success = await downloadInvoicePDF(sale, effectiveSettings, printFormat);
      if (success) {
        showNotice(`Fichier PDF (${printFormat === 'a4' ? 'Facture A4' : 'Ticket 80mm'}) téléchargé avec succès !`, 'success');
      } else {
        await downloadPrintableHTML(sale, effectiveSettings, printFormat, qrCodeUrl);
        showNotice('Document imprimable HTML téléchargé sur votre appareil.', 'info');
      }
    } catch (e) {
      console.error(e);
      await downloadPrintableHTML(sale, effectiveSettings, printFormat, qrCodeUrl);
      showNotice('Document téléchargé.', 'info');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Share WhatsApp
  const handleWhatsApp = () => {
    shareInvoiceViaWhatsApp(sale, settings);
    showNotice('Ouverture de WhatsApp avec le récapitulatif...', 'info');
  };

  // 4. Download Standalone HTML
  const handleDownloadHTML = () => {
    downloadPrintableHTML(sale, settings, printFormat);
    showNotice('Fichier HTML autonome téléchargé.', 'success');
  };

  const saleDateFormatted = new Date(sale.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const saleTimeFormatted = new Date(sale.date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const companyName = settings?.companyName || 'OptiBoissons & Vins SAS';
  const companyAddress = settings?.companyAddress || 'Zone Industrielle Nord, Port-au-Prince, Haïti';
  const companySiret = settings?.companySiret || '000-482-910-3';
  const contactEmail = settings?.contactEmail || 'contact@optiboissons.ht';
  const contactPhone = settings?.contactPhone || '+509 3700-1122';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden my-auto animate-in fade-in duration-150">
        
        {/* Modal Top Actions (Hidden in print) */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              {printFormat === 'a4' ? <FileText className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {sale.status === 'completed' ? 'Vente Finalisée' : sale.status === 'pending' ? 'En attente' : 'Annulée'}
                </span>
                <span className="text-xs text-slate-300 font-mono font-semibold">
                  {sale.invoiceNumber}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Facture & Reçu d'Encaissement
              </h3>
            </div>
          </div>

          {/* Format Toggle & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('ticket')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  printFormat === 'ticket' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ticket 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  printFormat === 'a4' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Format A4</span>
              </button>
            </div>

            {/* Quick Logo Toggle */}
            <button
              type="button"
              onClick={() => setIncludeLogoOnTicket(!includeLogoOnTicket)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                includeLogoOnTicket
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Activer ou désactiver l'impression du logo sur le document"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Logo :</span>
              <span className="font-bold">{includeLogoOnTicket ? 'Inclus' : 'Masqué'}</span>
            </button>

            {/* Define and Store Logo URL Button */}
            <button
              type="button"
              onClick={() => {
                setInputLogoUrl(currentLogoUrl);
                setLogoPreviewStatus(currentLogoUrl ? 'valid' : 'idle');
                setIsLogoModalOpen(true);
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Définir et stocker une URL d'image pour le logo de l'entreprise"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Définir Logo</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Lancer l'impression directe"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Télécharger directement en fichier PDF"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedbackNotice && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2 border-b no-print ${
              feedbackNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : feedbackNotice.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-current" />
            <span>{feedbackNotice.text}</span>
          </div>
        )}

        {/* Quick Export Bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 no-print">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Actions rapides :</span>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-semibold underline underline-offset-2"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Télécharger le PDF ({printFormat === 'a4' ? 'A4' : 'Ticket 80mm'})</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Partager sur WhatsApp</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleDownloadHTML}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold underline underline-offset-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Exporter HTML</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Garanti compatible Mobile, Tablette & Ordinateur
          </span>
        </div>

        {/* Modal Printable Scroll Content */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex justify-center">
          
          {/* ========================================================
              FORMAT 1 : FACTURE STANDARD A4
              ======================================================== */}
          {printFormat === 'a4' && (
            <div className="printable-document bg-white w-full rounded-xl border border-slate-200 p-6 sm:p-8 text-slate-900 shadow-xs space-y-6">
              
              {/* Header: Company + Water Bottle Logo */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-start gap-3">
                  {currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt={companyName}
                      className="max-h-14 max-w-[140px] object-contain rounded-lg p-0.5 border border-slate-200 bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs ring-1 ring-amber-600/30 shrink-0">
                      <WaterBottleLogo className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900">
                      {companyName}
                    </h1>
                    <p className="text-xs font-semibold text-amber-700 tracking-wide uppercase">
                      Distribution & Grossiste Boissons & Eaux
                    </p>
                    <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                      <p>{companyAddress}</p>
                      <p>NIF / SIRET : <strong>{companySiret}</strong></p>
                      <p>Email : {contactEmail} | Tél : {contactPhone}</p>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 block">
                    Document Comptable Officiel
                  </span>
                  <h2 className="text-xl font-black font-mono text-slate-900 mt-0.5">
                    {sale.invoiceNumber}
                  </h2>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                      sale.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {sale.status === 'completed' ? 'Facture Acquittée / Payée' : 'Facture En Attente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meta Grid: Client & Sale Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <User className="w-3.5 h-3.5" />
                    <span>Facturé à :</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{sale.customerName}</p>
                  {sale.customerCompany && (
                    <p className="text-slate-600 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sale.customerCompany}</span>
                    </p>
                  )}
                  <p className="text-slate-500 text-[11px]">Client CHR / Grossiste Partenaire</p>
                </div>

                <div className="space-y-1 sm:text-right">
                  <div className="flex items-center sm:justify-end gap-1.5 text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Date d'émission :</span>
                  </div>
                  <p className="font-semibold text-slate-800">{saleDateFormatted}</p>
                  <p className="text-slate-500 text-[11px] flex items-center sm:justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{saleTimeFormatted}</span>
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Commercial : <strong>{sale.sellerName}</strong>
                  </p>
                  <p className="text-slate-600 text-[11px] flex items-center sm:justify-end gap-1">
                    <CreditCard className="w-3 h-3 text-slate-400" />
                    <span>Règlement : <strong className="capitalize">{sale.paymentMethod}</strong></span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-bold">
                      <th className="py-2.5 px-2">Désignation</th>
                      <th className="py-2.5 px-2 text-center">Quantité</th>
                      <th className="py-2.5 px-2 text-right">Prix Unitaire HT</th>
                      <th className="py-2.5 px-2 text-right">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sale.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-2">
                          <span className="font-medium text-slate-800">{it.productName}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-700">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                          {formatHTG(it.unitPrice)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                          {formatHTG(it.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 space-y-1 max-w-xs">
                  <p className="font-semibold text-slate-700">Conditions de règlement :</p>
                  <p>Marchandises vendues sous réserve de propriété. Tout retard entraîne l'exigibilité immédiate de l'encours.</p>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Arrêté la présente facture à la somme de : <strong>{formatHTG(sale.totalTTC)}</strong>
                  </p>
                </div>

                <div className="w-full sm:w-64 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Brut HT :</span>
                    <span className="font-semibold text-slate-800">{formatHTG(sale.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>TVA {sale.taxRate > 0 ? `(${Math.round(sale.taxRate * 100)}%)` : '(0% - Sans TVA)'} :</span>
                    <span>{formatHTG(sale.totalHT * sale.taxRate)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t-2 border-slate-300">
                    <span>TOTAL TTC :</span>
                    <span className="text-amber-700">{formatHTG(sale.totalTTC)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Footer Notice */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-xs text-slate-500">
                <div className="border border-dashed border-slate-300 rounded-lg p-4 h-24 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Visa & Cachet Client</span>
                  <span className="text-[10px] text-slate-400">Pour acceptation de la facture</span>
                </div>
                <div className="border border-dashed border-slate-300 rounded-lg p-4 h-24 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Service Facturation & Logistique</span>
                  <span className="text-[10px] text-slate-400">{companyName}</span>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              FORMAT 2 : TICKET DE CAISSE THERMIQUE 80MM (RECOMMANDÉ)
              ======================================================== */}
          {printFormat === 'ticket' && (
            <div className="printable-document printable-ticket-80mm bg-white w-full max-w-[340px] rounded-2xl border-2 border-slate-300 p-5 text-slate-900 shadow-md font-mono space-y-3 text-xs">
              
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-400">
                {includeLogoOnTicket && (
                  <div className="space-y-1">
                    {currentLogoUrl ? (
                      <div className="py-1">
                        <img
                          src={currentLogoUrl}
                          alt="Logo entreprise"
                          className="max-h-14 max-w-[150px] mx-auto object-contain mb-1"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 mx-auto rounded-xl bg-amber-600 text-white flex items-center justify-center mb-1 shadow-xs">
                        <WaterBottleLogo className="w-6 h-6 text-white" />
                      </div>
                    )}
                    
                    {/* Quick interactive shortcut to set/change logo right from the 80mm preview (hidden during printing) */}
                    <div className="no-print pt-0.5 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          setInputLogoUrl(currentLogoUrl);
                          setLogoPreviewStatus(currentLogoUrl ? 'valid' : 'idle');
                          setIsLogoModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium text-amber-800 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-200/80 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                        title="Configurer l'image du logo pour le ticket 80mm"
                      >
                        <Settings className="w-3 h-3 text-amber-700" />
                        <span>{currentLogoUrl ? "Modifier l'URL du logo" : "Définir l'URL du logo 80mm"}</span>
                      </button>
                    </div>
                  </div>
                )}
                <h2 className="font-black text-sm tracking-tight text-slate-900">{companyName.toUpperCase()}</h2>
                <div className="inline-block px-2 py-0.5 rounded-sm bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  FACTURE D'ENCAISSEMENT 80MM
                </div>
                <p className="text-[10px] text-slate-600 font-medium">Distribution Boissons Gazeuses & Vins</p>
                <p className="text-[10px] text-slate-500">{companyAddress}</p>
                <p className="text-[10px] text-slate-700 font-semibold">Tél : {contactPhone} | NIF: {companySiret}</p>
              </div>

              {/* Ticket Meta */}
              <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-300 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">FACTURE N° :</span>
                  <span className="font-black text-amber-700 font-mono text-xs">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Heure :</span>
                  <span className="font-semibold">{saleDateFormatted} à {saleTimeFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client :</span>
                  <span className="font-bold text-slate-900">{sale.customerName}</span>
                </div>
                {sale.customerCompany && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Établissement :</span>
                    <span className="font-semibold text-slate-800">{sale.customerCompany}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendeur / Caisse :</span>
                  <span className="font-medium text-slate-800">{sale.sellerName}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-600 font-semibold">Paiement :</span>
                  <span className="font-bold uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 text-[10px]">
                    {sale.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Statut :</span>
                  <span className={`font-bold uppercase text-[10px] ${sale.status === 'completed' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {sale.status === 'completed' ? '✓ ACQUITTÉE / PAYÉE' : 'EN ATTENTE'}
                  </span>
                </div>
              </div>

              {/* Ticket Items Header */}
              <div className="space-y-1.5 py-1">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex justify-between pb-1 border-b border-slate-400">
                  <span>DÉSIGNATION</span>
                  <div className="flex gap-4">
                    <span>QTÉ</span>
                    <span>TOTAL</span>
                  </div>
                </div>
                {sale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-100 pb-1">
                    <div className="pr-2 flex-1">
                      <div className="font-bold text-slate-900 leading-tight">{it.productName}</div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {it.quantity} × {formatHTG(it.unitPrice)}
                      </div>
                    </div>
                    <div className="font-bold shrink-0 text-right tabular-nums text-slate-900">
                      {formatHTG(it.totalPrice)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Section */}
              <div className="pt-2 border-t-2 border-dashed border-slate-400 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Brut HT :</span>
                  <span className="tabular-nums font-semibold">{formatHTG(sale.totalHT)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>TVA {sale.taxRate > 0 ? `(${Math.round(sale.taxRate * 100)}%)` : '(0%)'} :</span>
                  <span className="tabular-nums font-semibold">{formatHTG(sale.totalHT * sale.taxRate)}</span>
                </div>
                <div className="flex justify-between items-center font-black text-sm pt-2 border-t-2 border-slate-900 text-slate-900">
                  <span className="uppercase">TOTAL NET TTC :</span>
                  <span className="text-base text-amber-700 tabular-nums font-black">{formatHTG(sale.totalTTC)}</span>
                </div>
              </div>

              {/* Unique Verification QR Code */}
              <div className="pt-2.5 border-t border-dashed border-slate-300 text-center space-y-1.5">
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1 font-sans">
                  <QrCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>VÉRIFICATION COMMANDE & PAIEMENT</span>
                </div>
                {qrCodeUrl ? (
                  <div className="py-1">
                    <img
                      src={qrCodeUrl}
                      alt={`QR Code Facture ${sale.invoiceNumber}`}
                      className="w-24 h-24 mx-auto p-1 bg-white border-2 border-slate-300 rounded-lg shadow-2xs image-rendering-pixelated"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 mx-auto bg-slate-100 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 text-[10px]">
                    Génération QR...
                  </div>
                )}
                <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold tracking-wide">
                    FACTURE N° {sale.invoiceNumber}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 font-sans leading-tight">
                  Scannez ce QR code pour authentifier la facture et le bon de livraison
                </p>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600 space-y-0.5">
                <p className="font-bold text-slate-800">*** MERCI DE VOTRE CONFIANCE ! ***</p>
                <p className="text-[9px] text-slate-500">Facture thermique 80mm - Document comptable valide</p>
                <p className="text-[9px] text-slate-400">Marchandise livrée et acceptée</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer (Hidden in print) */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 no-print shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Téléchargement direct disponible si l'imprimante est bloquée par votre navigateur.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isProcessing}
              className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>Lancer Impression</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>

      {/* Sub-modal: Définir & Stocker le Logo de l'Entreprise pour le Ticket 80mm */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Logo de l'Entreprise (Ticket 80mm)</h3>
                  <p className="text-[11px] text-slate-400">Définissez et stockez l'URL du logo pour l'impression thermique</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Option 1: URL input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  URL de l'image du logo (HTTPS / PNG / JPG / SVG)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={inputLogoUrl}
                    onChange={(e) => {
                      setInputLogoUrl(e.target.value);
                      if (!e.target.value) {
                        setLogoPreviewStatus('idle');
                      }
                    }}
                    placeholder="https://example.com/logo-distriboissons.png"
                    className="w-full pl-9 pr-24 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 bg-white"
                  />
                  {inputLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputLogoUrl('');
                        setLogoPreviewStatus('idle');
                      }}
                      className="absolute inset-y-0 right-2 px-2 text-[10px] font-semibold text-slate-400 hover:text-slate-700 my-auto h-6 flex items-center"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Entrez l'URL publique directe d'hébergement de votre logo ou importez un fichier ci-dessous.
                </p>
              </div>

              {/* Option 2: Upload local image */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ou importer une image locale (convertie automatiquement)
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors text-xs font-medium">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Choisir un fichier image (PNG, JPG, max 2 Mo)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Live Preview on 80mm receipt simulation */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Aperçu sur Ticket 80mm
                  </span>
                  {inputLogoUrl ? (
                    logoPreviewStatus === 'valid' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Image valide
                      </span>
                    ) : logoPreviewStatus === 'error' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-100 font-semibold px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> URL inaccessible
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Prêt</span>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-400">Aucun logo défini</span>
                  )}
                </div>

                <div className="w-full bg-white border border-slate-200 rounded-lg p-3 text-center flex flex-col items-center justify-center min-h-[90px]">
                  {inputLogoUrl ? (
                    <img
                      src={inputLogoUrl}
                      alt="Aperçu logo"
                      className="max-h-16 max-w-[180px] object-contain"
                      onLoad={() => setLogoPreviewStatus('valid')}
                      onError={() => setLogoPreviewStatus('error')}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-1 py-2">
                      <WaterBottleLogo className="w-8 h-8 text-slate-300" />
                      <span className="text-[11px] italic">Icône bouteille par défaut utilisée</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div>
                {currentLogoUrl && (
                  <button
                    type="button"
                    onClick={() => handleSaveLogo('')}
                    disabled={isSavingLogo}
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 border border-rose-200"
                    title="Supprimer le logo personnalisé"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retirer Logo</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  disabled={isSavingLogo}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveLogo(inputLogoUrl)}
                  disabled={isSavingLogo || logoPreviewStatus === 'error'}
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {isSavingLogo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Enregistrer et Appliquer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
