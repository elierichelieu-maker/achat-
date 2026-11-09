import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  executePrintOrDownload,
  downloadInvoicePDF,
  downloadPrintableHTML,
  shareInvoiceViaWhatsApp,
} from '../../utils/invoicePrinter';

interface InvoiceReceiptModalProps {
  sale: Sale | null;
  settings?: AppSettings;
  onClose: () => void;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  sale,
  settings,
  onClose,
}) => {
  const [printFormat, setPrintFormat] = useState<'a4' | 'ticket'>('a4');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  if (!sale) return null;

  const showNotice = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackNotice({ type, text });
    setTimeout(() => setFeedbackNotice(null), 4500);
  };

  // 1. Direct Print with automatic fallback
  const handlePrint = async () => {
    setIsProcessing(true);
    setFeedbackNotice({ type: 'info', text: 'Préparation de l\'impression...' });
    try {
      const res = await executePrintOrDownload(sale, settings, printFormat);
      if (res.methodUsed === 'pdf_download') {
        showNotice('Impression navigateur restreinte : la facture PDF a été téléchargée automatiquement sur votre appareil !', 'success');
      } else {
        showNotice(res.message, 'success');
      }
    } catch (e) {
      console.error(e);
      // Fallback: download PDF directly
      await downloadInvoicePDF(sale, settings, printFormat);
      showNotice('La facture a été exportée en PDF sur votre appareil.', 'success');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Direct PDF Download
  const handleDownloadPDF = async () => {
    setIsProcessing(true);
    try {
      const success = await downloadInvoicePDF(sale, settings, printFormat);
      if (success) {
        showNotice(`Fichier PDF (${printFormat === 'a4' ? 'Facture A4' : 'Ticket 80mm'}) téléchargé avec succès !`, 'success');
      } else {
        downloadPrintableHTML(sale, settings, printFormat);
        showNotice('Document imprimable HTML téléchargé sur votre appareil.', 'info');
      }
    } catch (e) {
      console.error(e);
      downloadPrintableHTML(sale, settings, printFormat);
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
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  printFormat === 'a4' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Format A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('ticket')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  printFormat === 'ticket' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Ticket 80mm
              </button>
            </div>

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
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs ring-1 ring-amber-600/30 shrink-0">
                    <WaterBottleLogo className="w-6 h-6 text-white" />
                  </div>
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
              FORMAT 2 : TICKET DE CAISSE THERMIQUE 80MM
              ======================================================== */}
          {printFormat === 'ticket' && (
            <div className="printable-document bg-white w-full max-w-sm rounded-xl border border-slate-300 p-6 text-slate-900 shadow-sm font-mono space-y-4 text-xs">
              
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                <div className="w-8 h-8 mx-auto rounded-lg bg-amber-600 text-white flex items-center justify-center mb-1">
                  <WaterBottleLogo className="w-5 h-5 text-white" />
                </div>
                <h2 className="font-bold text-sm tracking-tight">{companyName}</h2>
                <p className="text-[11px] text-slate-600">Distribution Boissons & Eaux</p>
                <p className="text-[10px] text-slate-500">{companyAddress}</p>
                <p className="text-[10px] text-slate-500">Tél : {contactPhone} | NIF: {companySiret}</p>
              </div>

              {/* Ticket Meta */}
              <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ticket N° :</span>
                  <span className="font-bold">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date :</span>
                  <span>{saleDateFormatted} {saleTimeFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client :</span>
                  <span className="font-semibold">{sale.customerName}</span>
                </div>
                {sale.customerCompany && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Société :</span>
                    <span>{sale.customerCompany}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendeur :</span>
                  <span>{sale.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paiement :</span>
                  <span className="font-bold capitalize">{sale.paymentMethod}</span>
                </div>
              </div>

              {/* Ticket Items */}
              <div className="space-y-2 py-1">
                {sale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs">
                    <div className="pr-2">
                      <div className="font-semibold text-slate-900">{it.productName}</div>
                      <div className="text-[11px] text-slate-500">
                        {it.quantity} x {formatHTG(it.unitPrice)}
                      </div>
                    </div>
                    <div className="font-bold shrink-0">{formatHTG(it.totalPrice)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Total HT :</span>
                  <span>{formatHTG(sale.totalHT)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA {sale.taxRate > 0 ? `(${Math.round(sale.taxRate * 100)}%)` : '(0%)'} :</span>
                  <span>{formatHTG(sale.totalHT * sale.taxRate)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300">
                  <span>TOTAL TTC :</span>
                  <span>{formatHTG(sale.totalTTC)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-0.5">
                <p className="font-bold text-slate-700">*** MERCI DE VOTRE VISITE ***</p>
                <p>Conservez ce ticket comme justificatif</p>
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
    </div>
  );
};
