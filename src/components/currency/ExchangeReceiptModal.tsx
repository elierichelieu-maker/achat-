import React, { useEffect, useState } from 'react';
import { AppSettings, ExchangeTransaction } from '../../types';
import { formatHTG } from '../../utils/formatters';
import {
  buildExchangeReceiptSummaryText,
  buildExchangeWhatsAppUrl,
  downloadExchangeReceiptPDF,
  executeExchangeReceiptPrintOrDownload,
  formatExchangeAmount,
  generateExchangeReceiptQRCodeDataUrl,
  getExchangeOperationLabel,
  getExchangeReceiptNumber,
} from '../../utils/exchangeReceiptPrinter';
import { WaterBottleLogo } from '../common/WaterBottleLogo';
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
  Phone,
  Printer,
  QrCode,
  Receipt,
  Share2,
  User,
  X,
} from 'lucide-react';

interface ExchangeReceiptModalProps {
  transaction: ExchangeTransaction | null;
  settings?: AppSettings;
  onClose: () => void;
}

/**
 * Modale Facture / Reçu Client pour les opérations de Change USD / DOP.
 * S'affiche automatiquement après chaque transaction et reste ré-ouvrable depuis le registre.
 */
export const ExchangeReceiptModal: React.FC<ExchangeReceiptModalProps> = ({
  transaction,
  settings,
  onClose,
}) => {
  const [printFormat, setPrintFormat] = useState<'ticket' | 'a4'>(
    settings?.defaultInvoiceFormat || 'ticket'
  );
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (transaction) {
      generateExchangeReceiptQRCodeDataUrl(transaction).then((url) => {
        if (active && url) setQrCodeUrl(url);
      });
    } else {
      setQrCodeUrl('');
    }
    return () => {
      active = false;
    };
  }, [transaction]);

  if (!transaction) return null;

  const receiptNumber = getExchangeReceiptNumber(transaction);
  const companyName = settings?.companyName || 'DistriBoissons & Vins SAS';
  const companyAddress =
    settings?.companyAddress || 'Zone Industrielle Nord, Port-au-Prince, Haïti';
  const companySiret = settings?.companySiret || '000-482-910-3';
  const contactPhone = settings?.contactPhone || '+509 3700-1122';
  const contactEmail = settings?.contactEmail || 'contact@distriboissons.ht';
  const showLogo = settings?.showLogoOnTicket !== false;

  const txDateFormatted = new Date(transaction.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const txTimeFormatted = new Date(transaction.date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const fromLabel = formatExchangeAmount(transaction.amountFrom, transaction.fromCurrency);
  const toLabel = formatExchangeAmount(transaction.amountTo, transaction.toCurrency);
  const hasBillDetails =
    typeof transaction.billAmountHTG === 'number' && transaction.billAmountHTG > 0;
  const whatsappUrl = buildExchangeWhatsAppUrl(transaction, settings);

  const showTempNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const handlePrint = async () => {
    setIsProcessing(true);
    try {
      const res = await executeExchangeReceiptPrintOrDownload(
        transaction,
        settings,
        printFormat,
        qrCodeUrl
      );
      showTempNotice(res.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsProcessing(true);
    try {
      const ok = await downloadExchangeReceiptPDF(transaction, settings, printFormat);
      if (ok) {
        showTempNotice(
          `Facture PDF (${printFormat === 'a4' ? 'A4' : 'Ticket 80mm'}) téléchargée.`
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopySummary = async () => {
    const summary = buildExchangeReceiptSummaryText(transaction, settings);
    try {
      await navigator.clipboard.writeText(summary);
      showTempNotice('Récapitulatif de la facture copié dans le presse-papier.');
    } catch {
      showTempNotice('Copie automatique indisponible sur ce navigateur.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre supérieure */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              {printFormat === 'a4' ? (
                <FileText className="w-5 h-5" />
              ) : (
                <Receipt className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-300 font-semibold">Opération validée</span>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-200 font-mono tabular-nums font-bold">
                  {receiptNumber}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Facture de Change Client
              </h3>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('ticket')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  printFormat === 'ticket'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ticket 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  printFormat === 'a4'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Format A4</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Fermer la facture"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message de confirmation */}
        {notice && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Barre d'actions rapides */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
          <div className="flex items-center flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 font-semibold cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copier le reçu</span>
            </button>
            <span className="text-slate-300">|</span>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Envoyer par WhatsApp</span>
            </a>
          </div>
          <span className="text-[11px] text-slate-500">
            Client : <strong className="text-slate-700">{transaction.clientOrBeneficiary || '—'}</strong>
          </span>
        </div>

        {/* Corps de la facture (Ticket 80mm ou Format A4) */}
        <div className="p-5 sm:p-6 overflow-y-auto bg-slate-50 flex justify-center">
          {printFormat === 'ticket' ? (
            <div className="bg-white w-full max-w-[340px] rounded-2xl border-2 border-slate-300 p-5 text-slate-900 shadow-md font-mono space-y-3 text-xs">
              {/* En-tête Ticket */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-400">
                {showLogo &&
                  (settings?.companyLogo ? (
                    <img
                      src={settings.companyLogo}
                      alt={companyName}
                      className="max-h-14 max-w-[140px] mx-auto object-contain mb-1"
                    />
                  ) : (
                    <div className="w-10 h-10 mx-auto rounded-xl bg-amber-600 text-white flex items-center justify-center mb-1">
                      <WaterBottleLogo className="w-6 h-6 text-white" />
                    </div>
                  ))}
                <h2 className="font-black text-sm tracking-tight text-slate-900 uppercase">
                  {companyName}
                </h2>
                <div className="inline-block px-2 py-0.5 rounded-sm bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  FACTURE DE CHANGE 80MM
                </div>
                <p className="text-[10px] text-slate-500">{companyAddress}</p>
                <p className="text-[10px] text-slate-700 font-semibold">
                  Tél : {contactPhone} | NIF : {companySiret}
                </p>
              </div>

              {/* Infos Reçu & Client (Nom -> Téléphone) */}
              <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-slate-300 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">FACTURE N° :</span>
                  <span className="font-black text-amber-700 tabular-nums">{receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date :</span>
                  <span className="font-semibold tabular-nums">
                    {txDateFormatted} · {txTimeFormatted}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Client :</span>
                  <span className="font-bold text-slate-900 text-right">
                    {transaction.clientOrBeneficiary || 'Client Comptoir'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Téléphone :</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {transaction.clientPhone || 'Non renseigné'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Caissier :</span>
                  <span className="font-medium text-slate-800">{transaction.operator}</span>
                </div>
              </div>

              {/* Détails Montants */}
              <div className="space-y-2 py-1 text-xs">
                <div className="flex justify-between items-center pb-1 border-b border-slate-300 font-bold text-slate-700">
                  <span>OPÉRATION</span>
                  <span>
                    {transaction.fromCurrency} ➔ {transaction.toCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Montant remis :</span>
                  <span className="font-bold tabular-nums text-slate-900">{fromLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Taux appliqué :</span>
                  <span className="tabular-nums text-slate-700">
                    1 {transaction.fromCurrency} = {transaction.rateApplied.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center font-black text-sm pt-2 border-t-2 border-slate-900 text-slate-900">
                  <span>CONTRE-VALEUR :</span>
                  <span className="text-amber-700 tabular-nums">{toLabel}</span>
                </div>

                {hasBillDetails && (
                  <div className="pt-2 mt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Facture réglée :</span>
                      <span className="tabular-nums font-semibold">
                        {formatHTG(transaction.billAmountHTG)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Monnaie rendue :</span>
                      <span className="tabular-nums">
                        {formatHTG(transaction.changeReturnedHTG || 0)}
                      </span>
                    </div>
                  </div>
                )}

                {transaction.notes && (
                  <div className="pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600 font-sans">
                    <span className="font-semibold">Note : </span>
                    {transaction.notes}
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="pt-2.5 border-t border-dashed border-slate-300 text-center space-y-1.5">
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1 font-sans">
                  <QrCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>JUSTIFICATIF DE CHANGE</span>
                </div>
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code ${receiptNumber}`}
                    className="w-24 h-24 mx-auto p-1 bg-white border border-slate-300 rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-24 mx-auto bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                    QR...
                  </div>
                )}
                <p className="text-[9px] text-slate-500 font-sans">
                  Merci de votre confiance · {receiptNumber}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white w-full rounded-xl border border-slate-200 p-6 sm:p-8 text-slate-900 shadow-xs space-y-6">
              {/* En-tête A4 */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-start gap-3">
                  {settings?.companyLogo ? (
                    <img
                      src={settings.companyLogo}
                      alt={companyName}
                      className="max-h-14 max-w-[140px] object-contain rounded-lg p-0.5 border border-slate-200 bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <WaterBottleLogo className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900">
                      {companyName}
                    </h1>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                      Service de Change USD / DOP &amp; Encaissement
                    </p>
                    <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                      <p>{companyAddress}</p>
                      <p>
                        NIF / SIRET : <strong>{companySiret}</strong> · Tél : {contactPhone}
                      </p>
                      <p>Email : {contactEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 block">
                    Facture de Change Client
                  </span>
                  <h2 className="text-xl font-black font-mono tabular-nums text-slate-900 mt-0.5">
                    {receiptNumber}
                  </h2>
                  <p className="text-xs text-emerald-700 font-semibold mt-1 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Opération validée</span>
                  </p>
                </div>
              </div>

              {/* Bloc Client & Détails */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <User className="w-3.5 h-3.5" />
                    <span>Client / Bénéficiaire</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">
                    {transaction.clientOrBeneficiary || 'Client Comptoir'}
                  </p>
                  <p className="text-slate-700 font-mono tabular-nums flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{transaction.clientPhone || 'Non renseigné'}</span>
                  </p>
                </div>

                <div className="space-y-1 sm:text-right">
                  <div className="text-slate-500 font-semibold">Date &amp; Caissier</div>
                  <p className="font-semibold text-slate-800 tabular-nums">
                    {txDateFormatted} à {txTimeFormatted}
                  </p>
                  <p className="text-slate-600">
                    Opérateur : <strong>{transaction.operator}</strong>
                  </p>
                </div>
              </div>

              {/* Tableau Montants */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-bold">
                      <th className="py-2.5 px-2">Nature de l&apos;opération</th>
                      <th className="py-2.5 px-2 text-right">Montant remis</th>
                      <th className="py-2.5 px-2 text-right">Taux appliqué</th>
                      <th className="py-2.5 px-2 text-right">Contre-valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 px-2 font-medium text-slate-800">
                        {getExchangeOperationLabel(transaction)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums font-bold text-slate-900">
                        {fromLabel}
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-600">
                        1 = {transaction.rateApplied.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums font-black text-amber-800">
                        {toLabel}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {hasBillDetails && (
                <div className="flex justify-end">
                  <div className="w-full sm:w-72 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-600">
                      <span>Montant Facture :</span>
                      <span className="font-bold tabular-nums text-slate-900">
                        {formatHTG(transaction.billAmountHTG)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold pt-2 border-t border-slate-200">
                      <span>Monnaie rendue :</span>
                      <span className="tabular-nums">
                        {formatHTG(transaction.changeReturnedHTG || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {transaction.notes && (
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="font-semibold text-slate-800">Observations : </span>
                  {transaction.notes}
                </div>
              )}

              {/* Pied A4 + QR */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl}
                      alt={`QR Code ${receiptNumber}`}
                      className="w-16 h-16 p-1 bg-white border border-slate-200 rounded-lg"
                    />
                  )}
                  <div className="text-[11px] text-slate-500">
                    <p className="font-semibold text-slate-700">Facture N° {receiptNumber}</p>
                    <p>Document officiel remis au client après opération de change.</p>
                  </div>
                </div>

                <div className="border border-dashed border-slate-300 rounded-lg px-6 py-3 text-center text-[11px] text-slate-500">
                  <div className="font-semibold text-slate-700">Visa &amp; Cachet Caisse</div>
                  <div className="mt-3 text-[10px] text-slate-400">{companyName}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de modale */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500">
            Reçu généré automatiquement pour le client.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isProcessing}
              className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
