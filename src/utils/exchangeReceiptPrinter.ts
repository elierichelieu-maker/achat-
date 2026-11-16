import QRCode from 'qrcode';
import { AppSettings, ExchangeTransaction } from '../types';
import { formatDOP, formatHTG, formatUSD } from './formatters';

export interface ExchangePrintResult {
  success: boolean;
  methodUsed: 'native_dialog' | 'iframe_print' | 'pdf_download' | 'html_download';
  message: string;
}

/**
 * Retourne le numéro de facture de change (généré de manière déterministe si absent).
 */
export function getExchangeReceiptNumber(tx: ExchangeTransaction): string {
  if (tx.receiptNumber && tx.receiptNumber.trim()) {
    return tx.receiptNumber.trim();
  }
  const year = new Date(tx.date).getFullYear() || new Date().getFullYear();
  const rawSuffix = tx.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0001';
  return `CHG-${year}-${rawSuffix}`;
}

/**
 * Formate un montant dans sa devise d'origine (USD, DOP ou HTG).
 */
export function formatExchangeAmount(
  amount: number,
  currency: 'USD' | 'DOP' | 'HTG'
): string {
  if (currency === 'USD') return formatUSD(amount);
  if (currency === 'DOP') return formatDOP(amount);
  return formatHTG(amount, { showCents: true });
}

/**
 * Libellé lisible du type d'opération de change.
 */
export function getExchangeOperationLabel(tx: ExchangeTransaction): string {
  switch (tx.type) {
    case 'USD_TO_HTG':
      return 'Achat / Conversion USD ➔ HTG';
    case 'HTG_TO_USD':
      return 'Vente / Décaissement HTG ➔ USD';
    case 'DOP_TO_HTG':
      return 'Achat / Conversion DOP ➔ HTG';
    case 'HTG_TO_DOP':
      return 'Vente / Décaissement HTG ➔ DOP';
    case 'USD_TO_DOP':
      return 'Change Croisé USD ➔ DOP';
    default:
      return `${tx.fromCurrency} ➔ ${tx.toCurrency}`;
  }
}

function escapeHtml(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Génère un QR code d'authentification pour la facture de change client.
 */
export async function generateExchangeReceiptQRCodeDataUrl(
  tx: ExchangeTransaction
): Promise<string> {
  const receiptNumber = getExchangeReceiptNumber(tx);
  const payload = [
    `FACTURE CHANGE: ${receiptNumber}`,
    `CLIENT: ${tx.clientOrBeneficiary || 'Client Comptoir'}`,
    `TEL: ${tx.clientPhone || 'N/A'}`,
    `OP: ${formatExchangeAmount(tx.amountFrom, tx.fromCurrency)} -> ${formatExchangeAmount(tx.amountTo, tx.toCurrency)}`,
    `TAUX: ${tx.rateApplied.toFixed(2)}`,
    `DATE: ${new Date(tx.date).toLocaleString('fr-FR')}`,
  ].join(' | ');

  try {
    return await QRCode.toDataURL(payload, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Erreur génération QR code reçu change:', err);
    return '';
  }
}

/**
 * Génère et télécharge la facture de change client au format PDF (Ticket 80mm ou Format A4).
 */
export async function downloadExchangeReceiptPDF(
  tx: ExchangeTransaction,
  settings?: AppSettings,
  format: 'ticket' | 'a4' = 'ticket'
): Promise<boolean> {
  try {
    const { jsPDF } = await import('jspdf');
    const receiptNumber = getExchangeReceiptNumber(tx);
    const companyName = settings?.companyName || 'DistriBoissons & Vins SAS';
    const companyAddress =
      settings?.companyAddress || 'Zone Industrielle Nord, Port-au-Prince, Haïti';
    const companySiret = settings?.companySiret || '000-482-910-3';
    const contactPhone = settings?.contactPhone || '+509 3700-1122';
    const contactEmail = settings?.contactEmail || 'contact@distriboissons.ht';

    const txDate = new Date(tx.date);
    const dateFormatted = txDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatted = txDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const clientName = tx.clientOrBeneficiary || 'Client Comptoir';
    const clientPhone = tx.clientPhone || 'Non renseigné';
    const fromLabel = formatExchangeAmount(tx.amountFrom, tx.fromCurrency);
    const toLabel = formatExchangeAmount(tx.amountTo, tx.toCurrency);
    const qrDataUrl = await generateExchangeReceiptQRCodeDataUrl(tx);

    if (format === 'ticket') {
      const hasLogo = settings?.showLogoOnTicket !== false && Boolean(settings?.companyLogo);
      const hasBillDetails = typeof tx.billAmountHTG === 'number' && tx.billAmountHTG > 0;
      const ticketHeight = 185 + (hasLogo ? 18 : 0) + (hasBillDetails ? 14 : 0) + (tx.notes ? 12 : 0);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, Math.max(190, ticketHeight)],
      });

      let y = 8;

      if (hasLogo && settings?.companyLogo) {
        try {
          const imgFormat = settings.companyLogo.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(settings.companyLogo, imgFormat, 26, y, 28, 14, undefined, 'FAST');
          y += 16;
        } catch (err) {
          console.warn('Logo non rendu sur PDF change 80mm:', err);
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(companyName.toUpperCase(), 40, y, { align: 'center' });
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('BUREAU DE CHANGE & ENCAISSEMENT', 40, y, { align: 'center' });
      y += 4;
      doc.text(companyAddress.substring(0, 46), 40, y, { align: 'center' });
      y += 4;
      doc.text(`Tél : ${contactPhone} | NIF : ${companySiret}`, 40, y, { align: 'center' });
      y += 4.5;

      doc.setDrawColor(150, 150, 150);
      doc.line(6, y, 74, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`FACTURE CHANGE N° ${receiptNumber}`, 40, y, { align: 'center' });
      y += 4;
      doc.setFontSize(7.5);
      doc.text('STATUT : OPÉRATION VALIDÉE', 40, y, { align: 'center' });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Date : ${dateFormatted} à ${timeFormatted}`, 6, y);
      y += 4;
      doc.text(`Opérateur : ${tx.operator}`, 6, y);
      y += 4.5;

      // Bloc Client (Nom -> Téléphone)
      doc.line(6, y, 74, y);
      y += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Client : ${clientName.substring(0, 34)}`, 6, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.text(`Téléphone : ${clientPhone}`, 6, y);
      y += 4.5;

      doc.line(6, y, 74, y);
      y += 5;

      // Détail financier
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`Opération : ${tx.fromCurrency} -> ${tx.toCurrency}`, 6, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.text('Montant remis :', 6, y);
      doc.setFont('helvetica', 'bold');
      doc.text(fromLabel, 74, y, { align: 'right' });
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.text('Taux appliqué :', 6, y);
      doc.text(`1 ${tx.fromCurrency} = ${tx.rateApplied.toFixed(2)}`, 74, y, { align: 'right' });
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('CONTRE-VALEUR :', 6, y);
      doc.text(toLabel, 74, y, { align: 'right' });
      y += 5.5;

      if (hasBillDetails) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('Facture client (HTG) :', 6, y);
        doc.text(formatHTG(tx.billAmountHTG), 74, y, { align: 'right' });
        y += 4;

        doc.setFont('helvetica', 'bold');
        doc.text('Monnaie rendue :', 6, y);
        doc.text(formatHTG(tx.changeReturnedHTG || 0), 74, y, { align: 'right' });
        y += 5;
      }

      if (tx.notes) {
        doc.line(6, y, 74, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const noteLines = doc.splitTextToSize(`Note : ${tx.notes}`, 68);
        doc.text(noteLines, 6, y);
        y += noteLines.length * 3.5 + 2;
      }

      if (qrDataUrl) {
        doc.line(6, y, 74, y);
        y += 3;
        doc.addImage(qrDataUrl, 'PNG', 28, y, 24, 24, undefined, 'FAST');
        y += 26.5;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('MERCI DE VOTRE CONFIANCE', 40, y, { align: 'center' });
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.text('Reçu officiel de change - Ticket 80mm', 40, y, { align: 'center' });

      doc.save(`Facture_Change_80mm_${receiptNumber}.pdf`);
      return true;
    }

    // Format A4
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFillColor(217, 119, 6);
    doc.rect(14, 12, 182, 3, 'F');

    let y = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(companyName, 14, y);
    y += 5.5;

    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    doc.text('SERVICE DE CHANGE USD / DOP & ENCAISSEMENT CLIENT', 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(companyAddress, 14, y);
    y += 4;
    doc.text(`NIF / SIRET : ${companySiret} | Tél : ${contactPhone}`, 14, y);
    y += 4;
    doc.text(`Email : ${contactEmail}`, 14, y);

    // Numéro facture à droite
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('FACTURE DE CHANGE', 196, 24, { align: 'right' });
    doc.setFontSize(13);
    doc.setTextColor(180, 83, 9);
    doc.text(receiptNumber, 196, 31, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date : ${dateFormatted} à ${timeFormatted}`, 196, 37, { align: 'right' });
    doc.text(`Caissier : ${tx.operator}`, 196, 42, { align: 'right' });

    y = 54;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, 182, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('CLIENT / BÉNÉFICIAIRE', 19, y + 7);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(clientName, 19, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Téléphone : ${clientPhone}`, 19, y + 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text('OPÉRATION VALIDÉE', 191, y + 14, { align: 'right' });

    y += 36;

    // Tableau récapitulatif
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('OPÉRATION', 18, y + 6);
    doc.text('MONTANT REMIS', 105, y + 6, { align: 'right' });
    doc.text('TAUX APPLIQUÉ', 142, y + 6, { align: 'right' });
    doc.text('CONTRE-VALEUR', 192, y + 6, { align: 'right' });

    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(getExchangeOperationLabel(tx), 18, y);
    doc.setFont('helvetica', 'bold');
    doc.text(fromLabel, 105, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`1 = ${tx.rateApplied.toFixed(2)}`, 142, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(toLabel, 192, y, { align: 'right' });

    y += 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, 196, y);
    y += 10;

    if (typeof tx.billAmountHTG === 'number' && tx.billAmountHTG > 0) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(110, y, 86, 24, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Montant Facture :', 115, y + 8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatHTG(tx.billAmountHTG), 191, y + 8, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(5, 150, 105);
      doc.text('Monnaie rendue :', 115, y + 17);
      doc.setFont('helvetica', 'bold');
      doc.text(formatHTG(tx.changeReturnedHTG || 0), 191, y + 17, { align: 'right' });
      y += 32;
    }

    if (tx.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Motif / Observations :', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(tx.notes, 182);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 8;
    }

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 14, Math.max(y, 180), 28, 28, undefined, 'FAST');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Code de vérification : ${receiptNumber}`, 46, Math.max(y, 180) + 12);
      doc.text('Document justificatif officiel émis après validation de caisse.', 46, Math.max(y, 180) + 18);
    }

    doc.save(`Facture_Change_A4_${receiptNumber}.pdf`);
    return true;
  } catch (err) {
    console.error('Erreur génération PDF reçu de change:', err);
    return false;
  }
}

function generatePrintableExchangeHTML(
  tx: ExchangeTransaction,
  settings?: AppSettings,
  format: 'ticket' | 'a4' = 'ticket',
  qrCodeDataUrl?: string
): string {
  const receiptNumber = escapeHtml(getExchangeReceiptNumber(tx));
  const companyName = escapeHtml(settings?.companyName || 'DistriBoissons & Vins SAS');
  const companyAddress = escapeHtml(
    settings?.companyAddress || 'Zone Industrielle Nord, Port-au-Prince, Haïti'
  );
  const companySiret = escapeHtml(settings?.companySiret || '000-482-910-3');
  const contactPhone = escapeHtml(settings?.contactPhone || '+509 3700-1122');

  const dateFormatted = escapeHtml(
    new Date(tx.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  );
  const timeFormatted = escapeHtml(
    new Date(tx.date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  const clientName = escapeHtml(tx.clientOrBeneficiary || 'Client Comptoir');
  const clientPhone = escapeHtml(tx.clientPhone || 'Non renseigné');
  const operatorName = escapeHtml(tx.operator);
  const notesHtml = tx.notes ? escapeHtml(tx.notes) : '';
  const fromLabel = escapeHtml(formatExchangeAmount(tx.amountFrom, tx.fromCurrency));
  const toLabel = escapeHtml(formatExchangeAmount(tx.amountTo, tx.toCurrency));
  const hasBillDetails = typeof tx.billAmountHTG === 'number' && tx.billAmountHTG > 0;
  const hasLogo = settings?.showLogoOnTicket !== false && Boolean(settings?.companyLogo);

  if (format === 'ticket') {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Facture Change ${receiptNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 74mm;
      margin: 0 auto;
      padding: 6px;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.4;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .divider { border-top: 1px dashed #64748b; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
    .total { font-size: 14px; font-weight: 800; margin-top: 6px; padding-top: 6px; border-top: 2px solid #0f172a; }
    .logo { max-height: 44px; max-width: 120px; margin: 0 auto 6px; display: block; object-fit: contain; }
  </style>
</head>
<body>
  <div class="center">
    ${hasLogo && settings?.companyLogo ? `<img src="${settings.companyLogo}" alt="${companyName}" class="logo" />` : ''}
    <div class="bold" style="font-size: 14px;">${companyName}</div>
    <div style="font-size: 10px;">FACTURE DE CHANGE CLIENT</div>
    <div style="font-size: 9px; color: #475569;">${companyAddress}</div>
    <div style="font-size: 9px;">Tél : ${contactPhone} · NIF : ${companySiret}</div>
  </div>
  <div class="divider"></div>
  <div class="row"><span class="bold">FACTURE N° :</span><span class="bold">${receiptNumber}</span></div>
  <div class="row"><span>Date :</span><span>${dateFormatted} ${timeFormatted}</span></div>
  <div class="row"><span>Caissier :</span><span>${operatorName}</span></div>
  <div class="divider"></div>
  <div class="row"><span>Client :</span><span class="bold">${clientName}</span></div>
  <div class="row"><span>Téléphone :</span><span class="bold">${clientPhone}</span></div>
  <div class="divider"></div>
  <div class="row"><span>Opération :</span><span class="bold">${tx.fromCurrency} ➔ ${tx.toCurrency}</span></div>
  <div class="row"><span>Montant remis :</span><span class="bold">${fromLabel}</span></div>
  <div class="row"><span>Taux appliqué :</span><span>1 = ${tx.rateApplied.toFixed(2)}</span></div>
  <div class="row total"><span>CONTRE-VALEUR :</span><span>${toLabel}</span></div>
  ${
    hasBillDetails
      ? `<div class="divider"></div>
         <div class="row"><span>Facture HTG :</span><span>${escapeHtml(formatHTG(tx.billAmountHTG))}</span></div>
         <div class="row bold"><span>Monnaie rendue :</span><span>${escapeHtml(formatHTG(tx.changeReturnedHTG || 0))}</span></div>`
      : ''
  }
  ${notesHtml ? `<div class="divider"></div><div style="font-size: 10px;">Note : ${notesHtml}</div>` : ''}
  ${
    qrCodeDataUrl
      ? `<div class="divider"></div><div class="center"><img src="${qrCodeDataUrl}" alt="QR" style="width: 84px; height: 84px;" /></div>`
      : ''
  }
  <div class="divider"></div>
  <div class="center" style="font-size: 10px;">
    <div class="bold">MERCI DE VOTRE CONFIANCE</div>
    <div>Reçu officiel de change client</div>
  </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Facture Change ${receiptNumber}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 11px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 10px; }
    .right { text-align: right; font-family: monospace; font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 18px; font-weight: 800;">${companyName}</div>
      <div style="color: #b45309; font-weight: 700; font-size: 11px;">BUREAU DE CHANGE &amp; DEVISES</div>
      <div style="color: #64748b; font-size: 11px; margin-top: 4px;">${companyAddress}<br/>NIF : ${companySiret} · Tél : ${contactPhone}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 11px; color: #64748b; font-weight: 700;">FACTURE DE CHANGE CLIENT</div>
      <div style="font-size: 18px; font-weight: 800; font-family: monospace;">${receiptNumber}</div>
      <div style="color: #475569; margin-top: 4px;">${dateFormatted} à ${timeFormatted}<br/>Caissier : ${operatorName}</div>
    </div>
  </div>
  <div class="box">
    <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Client / Bénéficiaire</div>
    <div style="font-size: 15px; font-weight: 800; margin-top: 4px;">${clientName}</div>
    <div style="font-size: 12px; color: #334155; margin-top: 2px; font-family: monospace;">Téléphone : ${clientPhone}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Opération</th>
        <th style="text-align: right;">Montant remis</th>
        <th style="text-align: right;">Taux appliqué</th>
        <th style="text-align: right;">Contre-valeur</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(getExchangeOperationLabel(tx))}</td>
        <td class="right">${fromLabel}</td>
        <td class="right">1 = ${tx.rateApplied.toFixed(2)}</td>
        <td class="right" style="color: #b45309;">${toLabel}</td>
      </tr>
    </tbody>
  </table>
  ${
    hasBillDetails
      ? `<div class="box" style="margin-top: 16px;">
           <div>Facture réglée (HTG) : <strong>${escapeHtml(formatHTG(tx.billAmountHTG))}</strong></div>
           <div style="margin-top: 4px;">Monnaie rendue au client : <strong>${escapeHtml(formatHTG(tx.changeReturnedHTG || 0))}</strong></div>
         </div>`
      : ''
  }
  ${notesHtml ? `<p style="color: #475569; margin-top: 14px;"><strong>Observations :</strong> ${notesHtml}</p>` : ''}
  ${
    qrCodeDataUrl
      ? `<div style="margin-top: 24px; display: flex; align-items: center; gap: 14px;">
           <img src="${qrCodeDataUrl}" alt="QR" style="width: 84px; height: 84px; border: 1px solid #cbd5e1; padding: 4px;" />
           <div style="font-size: 11px; color: #64748b;">Facture officielle N° ${receiptNumber}</div>
         </div>`
      : ''
  }
</body>
</html>`;
}

/**
 * Imprime via iframe caché ou télécharge directement le PDF si le navigateur restreint l'impression.
 */
export async function executeExchangeReceiptPrintOrDownload(
  tx: ExchangeTransaction,
  settings?: AppSettings,
  format: 'ticket' | 'a4' = 'ticket',
  pregeneratedQrDataUrl?: string
): Promise<ExchangePrintResult> {
  const qrCodeDataUrl =
    pregeneratedQrDataUrl || (await generateExchangeReceiptQRCodeDataUrl(tx));
  const html = generatePrintableExchangeHTML(tx, settings, format, qrCodeDataUrl);

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      await new Promise((r) => setTimeout(r, 350));

      let printTriggered = false;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        printTriggered = true;
      } catch (err) {
        console.warn('Iframe print blocked:', err);
      }

      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {
          // ignore
        }
      }, 3000);

      if (printTriggered) {
        return {
          success: true,
          methodUsed: 'iframe_print',
          message: "Boîte de dialogue d'impression ouverte.",
        };
      }
    }
  } catch (err) {
    console.warn('Erreur impression iframe change:', err);
  }

  const pdfOk = await downloadExchangeReceiptPDF(tx, settings, format);
  if (pdfOk) {
    return {
      success: true,
      methodUsed: 'pdf_download',
      message: 'La facture PDF a été téléchargée sur votre appareil.',
    };
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Facture_Change_${getExchangeReceiptNumber(tx)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    success: true,
    methodUsed: 'html_download',
    message: 'Le fichier imprimable de la facture a été téléchargé.',
  };
}

/**
 * Construit le texte récapitulatif et le lien WhatsApp pour le client.
 */
export function buildExchangeReceiptSummaryText(
  tx: ExchangeTransaction,
  settings?: AppSettings
): string {
  const companyName = settings?.companyName || 'DistriBoissons & Vins SAS';
  const receiptNumber = getExchangeReceiptNumber(tx);
  const lines = [
    `*${companyName.toUpperCase()}*`,
    `*Facture de Change N° : ${receiptNumber}*`,
    `Date : ${new Date(tx.date).toLocaleString('fr-FR')}`,
    `Client : ${tx.clientOrBeneficiary || 'Client Comptoir'}`,
    `Téléphone : ${tx.clientPhone || 'Non renseigné'}`,
    `--------------------------`,
    `Opération : ${tx.fromCurrency} ➔ ${tx.toCurrency}`,
    `Montant remis : ${formatExchangeAmount(tx.amountFrom, tx.fromCurrency)}`,
    `Taux appliqué : 1 ${tx.fromCurrency} = ${tx.rateApplied.toFixed(2)}`,
    `*Contre-valeur : ${formatExchangeAmount(tx.amountTo, tx.toCurrency)}*`,
  ];

  if (typeof tx.billAmountHTG === 'number' && tx.billAmountHTG > 0) {
    lines.push(`Facture HTG : ${formatHTG(tx.billAmountHTG)}`);
    lines.push(`Monnaie rendue : ${formatHTG(tx.changeReturnedHTG || 0)}`);
  }

  lines.push(`Caissier : ${tx.operator}`);
  lines.push(`Merci de votre confiance !`);
  return lines.join('\n');
}

export function buildExchangeWhatsAppUrl(
  tx: ExchangeTransaction,
  settings?: AppSettings
): string {
  const text = buildExchangeReceiptSummaryText(tx, settings);
  const digits = (tx.clientPhone || '').replace(/[^\d]/g, '');
  const base = digits.length >= 8 ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}
