import QRCode from 'qrcode';
import { Sale, AppSettings } from '../types';
import { formatHTG } from './formatters';

/**
 * Robust invoice printing and PDF export utilities.
 * Handles iframe restrictions, sandboxed environments, and native device printing.
 */

export interface PrintResult {
  success: boolean;
  methodUsed: 'native_dialog' | 'iframe_print' | 'pdf_download' | 'html_download';
  message: string;
}

/**
 * Formats the unique invoice verification payload for QR codes.
 * Contains invoice number, customer reference, and direct web validation link.
 */
export function getInvoiceVerificationContent(sale: Sale, baseUrl?: string): string {
  const host =
    baseUrl ||
    (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://gestion-de-ventanakayit.netlify.app');
  return `${host}/?facture=${encodeURIComponent(sale.invoiceNumber)}`;
}

/**
 * Generates high-contrast, pixel-perfect QR Code data URL for 80mm thermal receipts.
 */
export async function generateInvoiceQRCodeDataUrl(sale: Sale, baseUrl?: string): Promise<string> {
  const content = getInvoiceVerificationContent(sale, baseUrl);
  try {
    return await QRCode.toDataURL(content, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate invoice QR code data URL:', err);
    return '';
  }
}

/**
 * Generate and download a PDF document using dynamic jsPDF import.
 * Guaranteed to work on mobile, desktop, and inside iframes without browser security blocks.
 */
export async function downloadInvoicePDF(
  sale: Sale,
  settings?: AppSettings,
  format: 'ticket' | 'a4' = 'ticket'
): Promise<boolean> {
  try {
    const { jsPDF } = await import('jspdf');
    const companyName = settings?.companyName || 'OptiBoissons & Vins SAS';
    const companyAddress = settings?.companyAddress || 'Zone Industrielle Nord, Boulevard Toussaint Louverture, Port-au-Prince';
    const companySiret = settings?.companySiret || '000-482-910-3';
    const contactEmail = settings?.contactEmail || 'facturation@optiboissons.ht';
    const contactPhone = settings?.contactPhone || '+509 3700-1122';

    const saleDate = new Date(sale.date);
    const dateFormatted = saleDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatted = saleDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (format === 'ticket') {
      // =========================================================================
      const hasLogo = settings?.showLogoOnTicket !== false && !!settings?.companyLogo;
      const baseHeight = 175 + sale.items.length * 10 + (hasLogo ? 20 : 0) + 32;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, Math.max(180, baseHeight)],
      });

      let y = 8;

      // Optional Company Logo at the top of 80mm Thermal Receipt
      if (hasLogo && settings?.companyLogo) {
        try {
          const isPng = settings.companyLogo.includes('image/png');
          const imgFormat = isPng ? 'PNG' : 'JPEG';
          const logoW = 28;
          const logoH = 14;
          doc.addImage(settings.companyLogo, imgFormat, 40 - (logoW / 2), y, logoW, logoH, undefined, 'FAST');
          y += logoH + 2;
        } catch (err) {
          console.warn('Could not render logo in PDF ticket:', err);
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(companyName.toUpperCase(), 40, y, { align: 'center' });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('DISTRIBUTION BOISSONS GAZEUSES & VINS', 40, y, { align: 'center' });
      y += 4;
      doc.text(companyAddress.substring(0, 45), 40, y, { align: 'center' });
      y += 4;
      doc.text(`Tél: ${contactPhone} | NIF: ${companySiret}`, 40, y, { align: 'center' });
      y += 5;

      // Divider
      doc.setDrawColor(160, 160, 160);
      doc.line(6, y, 74, y);
      y += 5;

      // Ticket Info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`FACTURE N° : ${sale.invoiceNumber}`, 40, y, { align: 'center' });
      y += 4;
      doc.setFontSize(7.5);
      doc.text(`STATUT : ${sale.status === 'completed' ? 'PAYÉE / ACQUITTÉE' : 'EN ATTENTE'}`, 40, y, { align: 'center' });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Date : ${dateFormatted} à ${timeFormatted}`, 6, y);
      y += 4;
      doc.text(`Client : ${sale.customerName} ${sale.customerCompany ? `(${sale.customerCompany})` : ''}`, 6, y);
      y += 4;
      doc.text(`Vendeur : ${sale.sellerName}`, 6, y);
      y += 4;
      doc.text(`Paiement : ${sale.paymentMethod.toUpperCase()}`, 6, y);
      y += 4;

      doc.line(6, y, 74, y);
      y += 5;

      // Items Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('DÉSIGNATION', 6, y);
      doc.text('QTÉ', 48, y, { align: 'right' });
      doc.text('TOTAL HT', 74, y, { align: 'right' });
      y += 3;
      doc.line(6, y, 74, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      sale.items.forEach((item) => {
        const truncatedName = item.productName.length > 22 ? item.productName.substring(0, 20) + '..' : item.productName;
        doc.text(truncatedName, 6, y);
        doc.text(`${item.quantity}x`, 48, y, { align: 'right' });
        doc.text(`${item.totalPrice.toLocaleString('fr-FR')} G`, 74, y, { align: 'right' });
        y += 4.5;
      });

      y += 2;
      doc.line(6, y, 74, y);
      y += 5;

      // Totals
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Sous-Total HT :', 30, y);
      doc.text(`${sale.totalHT.toLocaleString('fr-FR')} HTG`, 74, y, { align: 'right' });
      y += 4.5;

      const tvaAmount = sale.totalTTC - sale.totalHT;
      doc.text(`TVA (${Math.round(sale.taxRate * 100)}%) :`, 30, y);
      doc.text(`${tvaAmount.toLocaleString('fr-FR')} HTG`, 74, y, { align: 'right' });
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TOTAL NET TTC :', 22, y);
      doc.text(`${sale.totalTTC.toLocaleString('fr-FR')} HTG`, 74, y, { align: 'right' });
      y += 7;

      // Unique verification QR code containing invoice number
      try {
        const qrDataUrl = await generateInvoiceQRCodeDataUrl(sale);
        if (qrDataUrl) {
          const qrSize = 25; // 25mm x 25mm centered
          doc.addImage(qrDataUrl, 'PNG', 40 - (qrSize / 2), y, qrSize, qrSize, undefined, 'FAST');
          y += qrSize + 2.5;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text(`SCANNEZ POUR VÉRIFIER`, 40, y, { align: 'center' });
          y += 3.5;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.text(`FACTURE N° ${sale.invoiceNumber}`, 40, y, { align: 'center' });
          y += 4.5;
        }
      } catch (err) {
        console.warn('Could not render QR code in PDF:', err);
      }

      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text('Merci de votre confiance !', 40, y, { align: 'center' });
      y += 4;
      doc.text('Facture thermique 80mm - Document comptable valide.', 40, y, { align: 'center' });

      doc.save(`Facture_80mm_${sale.invoiceNumber}.pdf`);
      return true;
    } else {
      // =========================================================================
      // FORMAT FACTURE COMMERCIALE A4 (210 x 297 mm)
      // =========================================================================
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Background header band (Amber / Slate theme)
      doc.setFillColor(245, 158, 11); // Amber-500
      doc.rect(14, 12, 182, 3, 'F');

      let y = 24;

      // Company Info (Left)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(companyName, 14, y);
      y += 5.5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text('DISTRIBUTION & GROSSISTE BOISSONS & EAUX', 14, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(companyAddress, 14, y);
      y += 4;
      doc.text(`NIF / SIRET : ${companySiret}`, 14, y);
      y += 4;
      doc.text(`Tél : ${contactPhone} | Email : ${contactEmail}`, 14, y);

      // Invoice Title & Status (Right)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('FACTURE COMMERCIALE', 196, 25, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(217, 119, 6); // amber-600
      doc.text(`N° ${sale.invoiceNumber}`, 196, 31, { align: 'right' });

      // Status Badge
      const statusText = sale.status === 'completed' ? 'PAYÉE / ENCAISSÉE' : sale.status === 'pending' ? 'EN ATTENTE DE PAIEMENT' : 'ANNULÉE';
      doc.setFontSize(8.5);
      if (sale.status === 'completed') {
        doc.setTextColor(16, 185, 129); // emerald-500
      } else {
        doc.setTextColor(217, 119, 6);
      }
      doc.text(`STATUT : ${statusText}`, 196, 36.5, { align: 'right' });

      // Metadata separator
      y = 48;
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(14, y, 196, y);
      y += 7;

      // Meta boxes: Client details & Transaction Details
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(14, y, 98, 26, 2, 2, 'F');
      doc.roundedRect(116, y, 80, 26, 2, 2, 'F');

      // Client Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('FACTURÉ À :', 18, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(sale.customerName, 18, y + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      if (sale.customerCompany) {
        doc.text(`Établissement : ${sale.customerCompany}`, 18, y + 16);
      }
      doc.text('Haïti (Vente en Gros & CHR)', 18, y + 21);

      // Transaction Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('DÉTAILS TRANSACTION :', 120, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Date d'émission : ${dateFormatted}`, 120, y + 10.5);
      doc.text(`Commercial : ${sale.sellerName}`, 120, y + 15.5);
      doc.text(`Mode de paiement : ${sale.paymentMethod.toUpperCase()}`, 120, y + 20.5);

      y += 33;

      // Table Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(14, y, 182, 7.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('DÉSIGNATION DE L\'ARTICLE', 18, y + 5);
      doc.text('QTÉ', 125, y + 5, { align: 'center' });
      doc.text('P.U. HT', 155, y + 5, { align: 'right' });
      doc.text('TOTAL HT', 192, y + 5, { align: 'right' });

      y += 7.5;

      // Table Items
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      sale.items.forEach((item, index) => {
        const isOdd = index % 2 === 1;
        if (isOdd) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 7, 'F');
        }

        const itemName = item.productName.length > 48 ? item.productName.substring(0, 46) + '...' : item.productName;
        doc.text(itemName, 18, y + 4.8);
        doc.text(item.quantity.toString(), 125, y + 4.8, { align: 'center' });
        doc.text(`${item.unitPrice.toLocaleString('fr-FR')} G`, 155, y + 4.8, { align: 'right' });
        doc.text(`${item.totalPrice.toLocaleString('fr-FR')} G`, 192, y + 4.8, { align: 'right' });

        doc.setDrawColor(241, 245, 249);
        doc.line(14, y + 7, 196, y + 7);
        y += 7;
      });

      y += 5;

      // Financial Summary Box (Right aligned)
      const tvaAmount = sale.totalTTC - sale.totalHT;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(110, y, 86, 32, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Sous-Total HT :', 114, y + 7);
      doc.text(`${sale.totalHT.toLocaleString('fr-FR')} HTG`, 192, y + 7, { align: 'right' });

      doc.text(`TVA (${Math.round(sale.taxRate * 100)}%) :`, 114, y + 13);
      doc.text(`${tvaAmount.toLocaleString('fr-FR')} HTG`, 192, y + 13, { align: 'right' });

      doc.setDrawColor(203, 213, 225);
      doc.line(114, y + 17, 192, y + 17);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('TOTAL NET TTC :', 114, y + 24);
      doc.setTextColor(217, 119, 6);
      doc.text(`${sale.totalTTC.toLocaleString('fr-FR')} HTG`, 192, y + 24, { align: 'right' });

      // Legal & Signature Notice (Left of totals)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Arrêté la présente facture à la somme de :', 14, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${sale.totalTTC.toLocaleString('fr-FR')} Gourdes Haïtiennes (HTG)`, 14, y + 12);

      // Signature area
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, y + 17, 85, 22, 1, 1);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Signature & Cachet de l\'Établissement :', 18, y + 22);

      y += 46;

      // Bottom footer notes
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 275, 196, 275);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Facture établie conformément à la législation fiscale en vigueur en République d\'Haïti.', 105, 280, { align: 'center' });
      doc.text(`${companyName} — Tél : ${contactPhone} — Email : ${contactEmail}`, 105, 284, { align: 'center' });

      doc.save(`Facture_${sale.invoiceNumber}.pdf`);
      return true;
    }
  } catch (error) {
    console.error('Erreur lors de la génération du PDF :', error);
    return false;
  }
}

/**
 * Generate full self-contained printable HTML document
 */
export function generatePrintableHTML(
  sale: Sale,
  settings?: AppSettings,
  format: 'ticket' | 'a4' = 'ticket',
  qrCodeDataUrl?: string
): string {
  const companyName = settings?.companyName || 'OptiBoissons & Vins SAS';
  const companyAddress = settings?.companyAddress || 'Zone Industrielle Nord, Boulevard Toussaint Louverture, Port-au-Prince';
  const companySiret = settings?.companySiret || '000-482-910-3';
  const contactEmail = settings?.contactEmail || 'facturation@optiboissons.ht';
  const contactPhone = settings?.contactPhone || '+509 3700-1122';

  const saleDate = new Date(sale.date);
  const dateFormatted = saleDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = saleDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const tvaAmount = sale.totalTTC - sale.totalHT;

  if (format === 'ticket') {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture 80mm ${sale.invoiceNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm 3mm; }
    html, body {
      font-family: 'Courier New', Courier, monospace;
      width: 74mm;
      max-width: 74mm;
      margin: 0 auto;
      padding: 3mm 0;
      color: #000;
      font-size: 11px;
      line-height: 1.35;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .title { font-size: 13.5px; font-weight: 900; margin-bottom: 2px; }
    .badge { display: inline-block; background: #000; color: #fff; padding: 2px 6px; font-size: 9.5px; font-weight: bold; margin: 2px 0 4px 0; }
    .divider { border-bottom: 1px dashed #444; margin: 6px 0; }
    .divider-thick { border-bottom: 2px dashed #000; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th { border-bottom: 1px solid #000; padding: 3px 0; text-transform: uppercase; font-size: 9.5px; }
    td { padding: 3px 0; vertical-align: top; }
    .item-name { font-weight: bold; }
    .item-sub { font-size: 9.5px; color: #333; }
    .total-row { font-size: 13px; font-weight: 900; border-top: 2px solid #000; padding-top: 4px; }
    .barcode { font-size: 9px; letter-spacing: 2px; text-align: center; margin-top: 6px; }
    @media print {
      body { width: 100%; margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="text-center">
    ${
      settings?.showLogoOnTicket !== false && settings?.companyLogo
        ? `<div style="margin-bottom: 6px;"><img src="${settings.companyLogo}" alt="Logo Entreprise" style="max-height: 48px; max-width: 140px; object-fit: contain; filter: grayscale(100%) contrast(140%);" /></div>`
        : ''
    }
    <div class="title">${companyName.toUpperCase()}</div>
    <div class="badge">FACTURE D'ENCAISSEMENT 80MM</div>
    <div>Distribution Boissons Gazeuses & Vins</div>
    <div>${companyAddress}</div>
    <div>Tél: ${contactPhone} | NIF: ${companySiret}</div>
  </div>

  <div class="divider"></div>

  <div><strong>FACTURE N° :</strong> ${sale.invoiceNumber}</div>
  <div><strong>Date & Heure :</strong> ${dateFormatted} ${timeFormatted}</div>
  <div><strong>Client :</strong> ${sale.customerName}</div>
  ${sale.customerCompany ? `<div><strong>Établissement :</strong> ${sale.customerCompany}</div>` : ''}
  <div><strong>Vendeur / Caisse :</strong> ${sale.sellerName}</div>
  <div><strong>Paiement :</strong> ${sale.paymentMethod.toUpperCase()}</div>
  <div><strong>Statut :</strong> ${sale.status === 'completed' ? 'PAYÉE / ACQUITTÉE' : 'EN ATTENTE'}</div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Désignation</th>
        <th style="text-align: center;">Qté</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items
        .map(
          (item) => `<tr>
            <td>
              <div class="item-name">${item.productName}</div>
              <div class="item-sub">${item.quantity} × ${item.unitPrice.toLocaleString('fr-FR')} HTG</div>
            </td>
            <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
            <td style="text-align: right; font-weight: bold;">${item.totalPrice.toLocaleString('fr-FR')} G</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="divider-thick"></div>

  <table>
    <tr>
      <td>Sous-Total HT :</td>
      <td class="text-right">${sale.totalHT.toLocaleString('fr-FR')} HTG</td>
    </tr>
    <tr>
      <td>TVA (${Math.round(sale.taxRate * 100)}%) :</td>
      <td class="text-right">${tvaAmount.toLocaleString('fr-FR')} HTG</td>
    </tr>
    <tr class="total-row">
      <td style="padding-top: 4px;">TOTAL NET TTC :</td>
      <td class="text-right" style="padding-top: 4px;">${sale.totalTTC.toLocaleString('fr-FR')} HTG</td>
    </tr>
  </table>

  <div class="divider"></div>

  <!-- Unique Verification QR Code -->
  <div class="text-center" style="margin: 6px 0;">
    <div class="bold" style="font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
      VÉRIFICATION COMMANDE & PAIEMENT
    </div>
    ${
      qrCodeDataUrl
        ? `<img src="${qrCodeDataUrl}" alt="QR Code Facture ${sale.invoiceNumber}" style="width: 105px; height: 105px; margin: 2px auto; display: block; image-rendering: pixelated;" />`
        : `<div class="barcode">||| | ||||| |||| || |||||| ||||| ||| ||||</div>`
    }
    <div style="font-family: 'Courier New', Courier, monospace; font-size: 10px; font-weight: bold; margin-top: 3px;">
      FACTURE N° ${sale.invoiceNumber}
    </div>
    <div style="font-size: 8px; color: #444; margin-top: 1px;">
      Scannez ce QR code pour authentifier la facture
    </div>
  </div>

  <div class="text-center" style="font-size: 9px; margin-top: 8px; line-height: 1.3;">
    <div class="bold">*** MERCI DE VOTRE CONFIANCE ! ***</div>
    <div>Facture simplifiée 80mm - Document comptable valide</div>
    <div>Marchandise livrée et acceptée</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;
  }

  // A4 Format HTML
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${sale.invoiceNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      font-size: 12px;
      line-height: 1.4;
    }
    .header-bar { height: 4px; background: #f59e0b; margin-bottom: 20px; border-radius: 2px; }
    .flex { display: flex; justify-content: space-between; }
    .company-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
    .company-sub { font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; }
    .invoice-title { font-size: 20px; font-weight: 800; color: #0f172a; text-align: right; margin: 0; }
    .invoice-num { font-size: 14px; font-weight: 700; color: #d97706; text-align: right; }
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 4px; }
    .status-completed { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .box-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #0f172a; color: #ffffff; padding: 8px 10px; font-size: 11px; text-transform: uppercase; font-weight: 600; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }
    .totals-box { width: 280px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11.5px; color: #475569; }
    .totals-final { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #0f172a; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 6px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 10px; color: #94a3b8; font-style: italic; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header-bar"></div>
  <div class="flex">
    <div>
      ${settings?.companyLogo ? `<img src="${settings.companyLogo}" alt="Logo Entreprise" style="max-height: 46px; max-width: 170px; object-fit: contain; margin-bottom: 8px; display: block;" />` : ''}
      <h1 class="company-title">${companyName}</h1>
      <div class="company-sub">Distribution & Grossiste Boissons & Eaux</div>
      <div style="font-size: 11px; color: #475569; margin-top: 6px;">
        <div>${companyAddress}</div>
        <div>NIF / SIRET : <strong>${companySiret}</strong></div>
        <div>Tél : ${contactPhone} | Email : ${contactEmail}</div>
      </div>
    </div>
    <div style="text-align: right;">
      <h2 class="invoice-title">FACTURE COMMERCIALE</h2>
      <div class="invoice-num">N° ${sale.invoiceNumber}</div>
      <div>
        <span class="status-badge ${sale.status === 'completed' ? 'status-completed' : ''}">
          ${sale.status === 'completed' ? 'PAYÉE / ENCAISSÉE' : sale.status === 'pending' ? 'EN ATTENTE' : 'ANNULÉE'}
        </span>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="box">
      <div class="box-title">Facturé à :</div>
      <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${sale.customerName}</div>
      ${sale.customerCompany ? `<div style="color: #475569; font-size: 11.5px;">Établissement : ${sale.customerCompany}</div>` : ''}
      <div style="color: #64748b; font-size: 11px;">Client CHR / Grossiste Haïti</div>
    </div>
    <div class="box">
      <div class="box-title">Détails Règlement :</div>
      <div><strong>Date d'émission :</strong> ${dateFormatted}</div>
      <div><strong>Commercial :</strong> ${sale.sellerName}</div>
      <div><strong>Mode de Paiement :</strong> ${sale.paymentMethod.toUpperCase()}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Désignation Article</th>
        <th class="text-center">Qté</th>
        <th class="text-right">P.U. HT</th>
        <th class="text-right">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items
        .map(
          (item) => `<tr>
            <td style="font-weight: 500;">${item.productName}</td>
            <td class="text-center font-mono">${item.quantity}</td>
            <td class="text-right font-mono">${item.unitPrice.toLocaleString('fr-FR')} HTG</td>
            <td class="text-right font-mono font-bold">${item.totalPrice.toLocaleString('fr-FR')} HTG</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="totals-row">
        <span>Sous-Total HT :</span>
        <span class="bold">${sale.totalHT.toLocaleString('fr-FR')} HTG</span>
      </div>
      <div class="totals-row">
        <span>TVA (${Math.round(sale.taxRate * 100)}%) :</span>
        <span>${tvaAmount.toLocaleString('fr-FR')} HTG</span>
      </div>
      <div class="totals-final">
        <span>TOTAL NET TTC :</span>
        <span style="color: #d97706;">${sale.totalTTC.toLocaleString('fr-FR')} HTG</span>
      </div>
    </div>
  </div>

  <div style="margin-top: 25px; font-size: 11px; color: #64748b;">
    Arrêté la présente facture à la somme de : <strong>${sale.totalTTC.toLocaleString('fr-FR')} Gourdes Haïtiennes (HTG)</strong>
  </div>

  <div class="footer">
    Facture établie par ${companyName} — Tél : ${contactPhone} — Document officiel
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;
}

/**
 * Universal print handler:
 * 1. Tries hidden iframe printing (which bypasses parent CSS and doesn't close active modals)
 * 2. If browser blocks iframe print, triggers direct PDF download fallback so user ALWAYS gets the invoice!
 */
export async function executePrintOrDownload(
  sale: Sale,
  settings?: AppSettings,
  format: 'ticket' | 'a4' = 'ticket',
  pregeneratedQrDataUrl?: string
): Promise<PrintResult> {
  const qrCodeDataUrl = pregeneratedQrDataUrl || (await generateInvoiceQRCodeDataUrl(sale));
  const html = generatePrintableHTML(sale, settings, format, qrCodeDataUrl);

  // Method 1: Try printing via clean hidden iframe
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

      await new Promise((r) => setTimeout(r, 400));

      let printTriggered = false;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        printTriggered = true;
      } catch (err) {
        console.warn('Iframe print blocked by browser sandbox:', err);
      }

      // Cleanup iframe after a short delay
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 3000);

      if (printTriggered) {
        return {
          success: true,
          methodUsed: 'iframe_print',
          message: 'Boîte de dialogue d\'impression ouverte avec succès.',
        };
      }
    }
  } catch (e) {
    console.warn('Erreur iframe print:', e);
  }

  // Method 2: Try native window.print()
  try {
    window.focus();
    window.print();
    return {
      success: true,
      methodUsed: 'native_dialog',
      message: 'Impression système lancée.',
    };
  } catch (e) {
    console.warn('Native window.print failed:', e);
  }

  // Method 3 (Fail-safe): Generate and download crisp PDF directly
  const pdfDownloaded = await downloadInvoicePDF(sale, settings, format);
  if (pdfDownloaded) {
    return {
      success: true,
      methodUsed: 'pdf_download',
      message: 'La facture PDF a été téléchargée directement sur votre appareil.',
    };
  }

  // Method 4: Standalone HTML download as absolute emergency backup
  await downloadPrintableHTML(sale, settings, format, qrCodeDataUrl);
  return {
    success: true,
    methodUsed: 'html_download',
    message: 'Le fichier de facture imprimable a été téléchargé.',
  };
}

/**
 * Downloads standalone HTML file that opens and prints in any browser
 */
export async function downloadPrintableHTML(
  sale: Sale,
  settings?: AppSettings,
  format: 'ticket' | 'a4' = 'ticket',
  pregeneratedQrDataUrl?: string
) {
  const qrCodeDataUrl = pregeneratedQrDataUrl || (await generateInvoiceQRCodeDataUrl(sale));
  const html = generatePrintableHTML(sale, settings, format, qrCodeDataUrl);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${format === 'ticket' ? 'Ticket' : 'Facture'}_${sale.invoiceNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Share invoice summary formatted for WhatsApp or SMS
 */
export function shareInvoiceViaWhatsApp(sale: Sale, settings?: AppSettings) {
  const companyName = settings?.companyName || 'OptiBoissons & Vins SAS';
  const tvaAmount = sale.totalTTC - sale.totalHT;

  let text = `*${companyName.toUpperCase()}*\n`;
  text += `*Facture N° : ${sale.invoiceNumber}*\n`;
  text += `Date : ${new Date(sale.date).toLocaleDateString('fr-FR')}\n`;
  text += `Client : ${sale.customerName} ${sale.customerCompany ? `(${sale.customerCompany})` : ''}\n`;
  text += `Statut : ${sale.status === 'completed' ? 'PAYÉE' : 'EN ATTENTE'}\n`;
  text += `--------------------------\n`;
  sale.items.forEach((it) => {
    text += `• ${it.quantity}x ${it.productName} = ${it.totalPrice.toLocaleString('fr-FR')} HTG\n`;
  });
  text += `--------------------------\n`;
  text += `Total HT : ${sale.totalHT.toLocaleString('fr-FR')} HTG\n`;
  text += `TVA : ${tvaAmount.toLocaleString('fr-FR')} HTG\n`;
  text += `*TOTAL TTC : ${sale.totalTTC.toLocaleString('fr-FR')} HTG*\n`;
  text += `Paiement : ${sale.paymentMethod.toUpperCase()}\n`;
  text += `Merci de votre confiance !`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
