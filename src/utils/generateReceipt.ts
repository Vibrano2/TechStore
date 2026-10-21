import { formatPrice } from './formatPrice';
import type { SavedOrder } from '../pages/Checkout';

export interface ReceiptData {
  id?: string;
  orderNumber: string;
  date?: string;
  items: Array<{
    name: string;
    brand?: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  vatAmount: number;
  total: number;
  paymentMethod: string;
  customer: {
    firstName?: string;
    lastName?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    email: string;
  };
}

export interface CustomReceiptBankDetails {
  beneficiary?: string;
  bankName?: string;
  iban?: string;
  ibanFormatted?: string;
  bic?: string;
}

/**
 * Generates an official, printable German receipt / order confirmation document
 * and opens the native print / save as PDF dialog.
 */
export function printOrDownloadReceipt(
  order: SavedOrder | ReceiptData,
  bankDetails?: CustomReceiptBankDetails
): void {
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) {
    alert('Bitte erlauben Sie Pop-ups für diese Seite, um die Quittung auszudrucken.');
    return;
  }

  const dateStr = order.date || new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const orderNum = order.orderNumber || order.id || 'TW-2026';
  const receiptNum = `KB-${orderNum.replace(/^TW-/, '')}`;
  const isBankTransfer = order.paymentMethod.toLowerCase().includes('überweis') || 
                         order.paymentMethod.toLowerCase().includes('bank') ||
                         order.paymentMethod === 'bank_transfer';

  const bBeneficiary = bankDetails?.beneficiary || 'Edeltraud Liesbeth Buhs';
  const bBank = bankDetails?.bankName || 'Deutsche Bank';
  const bIban = bankDetails?.ibanFormatted || bankDetails?.iban || 'DE96 7607 0324 0086 9081 00';
  const bBic = bankDetails?.bic || 'DEUTDEDBP15';

  const customerName = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'Kunde';
  const customerAddress = order.customer.street 
    ? `${order.customer.street}<br>${order.customer.postalCode || ''} ${order.customer.city || ''}`
    : 'Lieferadresse gem. Kundenkonto';

  const itemsHtml = order.items.map((item, idx) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 12px;">${idx + 1}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-weight: 600; color: #111827; font-size: 13px;">
        ${item.name}
        ${item.brand ? `<div style="font-size: 11px; color: #6B7280; font-weight: normal;">Marke: ${item.brand}</div>` : ''}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #111827; font-size: 13px;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #111827; font-size: 13px;">${formatPrice(item.price)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 700; color: #111827; font-size: 13px;">${formatPrice(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Kaufbeleg & Quittung #${receiptNum} - TechnikWelt</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #FFFFFF;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #D97706;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #0B1F33;
      letter-spacing: -0.5px;
    }
    .brand-title span { color: #D97706; }
    .company-details {
      font-size: 11px;
      color: #6B7280;
      text-align: right;
      line-height: 1.4;
    }
    .doc-title-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-left: 4px solid #D97706;
      padding: 14px 18px;
      border-radius: 8px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .doc-title {
      font-size: 16px;
      font-weight: 800;
      color: #0B1F33;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-badge {
      background: #FEF3C7;
      color: #92400E;
      font-weight: 700;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid #FDE68A;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
      font-size: 12px;
    }
    .meta-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 14px;
    }
    .meta-card h4 {
      margin: 0 0 8px 0;
      font-size: 11px;
      text-transform: uppercase;
      color: #9CA3AF;
      letter-spacing: 0.5px;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    table.items-table th {
      background: #F3F4F6;
      color: #374151;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 10px 12px;
      border-bottom: 2px solid #E5E7EB;
    }
    .totals-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .totals-table {
      width: 320px;
      border-collapse: collapse;
      font-size: 13px;
    }
    .totals-table td {
      padding: 6px 10px;
    }
    .totals-table .total-row {
      font-size: 16px;
      font-weight: 800;
      border-top: 2px solid #0B1F33;
      color: #0B1F33;
    }
    .bank-box {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 12px;
    }
    .bank-box h4 {
      margin: 0 0 6px 0;
      color: #92400E;
      font-size: 13px;
    }
    .footer-note {
      font-size: 11px;
      color: #9CA3AF;
      border-top: 1px solid #E5E7EB;
      padding-top: 16px;
      text-align: center;
      line-height: 1.5;
    }
    .print-btn-bar {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .print-btn {
      background: #D97706;
      color: #FFFFFF;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .print-btn:hover { background: #B45309; }
    @media print {
      .print-btn-bar { display: none !important; }
      body { padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button class="print-btn" onclick="window.print()">🖨️ Quittung jetzt ausdrucken / PDF speichern</button>
  </div>

  <div class="header-bar">
    <div>
      <div class="brand-title">TechnikWelt<span>.</span></div>
      <div style="font-size: 12px; color: #4B5563; font-weight: 500; margin-top: 2px;">
        Deutscher Fachhandel für Premium-Elektronik & Smart Home
      </div>
    </div>
    <div class="company-details">
      <strong>TechnikWelt GmbH</strong><br>
      Maximilianstraße 35 • 80539 München<br>
      Amtsgericht München HRB 284910<br>
      USt-IdNr.: DE 362 891 042<br>
      info@technikwelt.shop • www.technikwelt.shop
    </div>
  </div>

  <div class="doc-title-box">
    <div>
      <div class="doc-title">Kaufbeleg & Bestellquittung</div>
      <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">
        Beleg-Nr.: <strong>${receiptNum}</strong> • Ausgestellt am: <strong>${dateStr}, ${timeStr} Uhr</strong>
      </div>
    </div>
    <div class="doc-badge">
      ${isBankTransfer ? 'Vorkasse / Nachweis erforderlich' : 'Zahlung bestätigt (Stripe)'}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <h4>Rechnungs- & Lieferadresse</h4>
      <strong style="color: #111827; font-size: 13px;">${customerName}</strong><br>
      <div style="color: #4B5563; margin-top: 4px;">${customerAddress}</div>
      <div style="color: #6B7280; margin-top: 4px;">E-Mail: ${order.customer.email}</div>
    </div>
    <div class="meta-card">
      <h4>Bestellungsdetails</h4>
      <div>Bestellnummer: <strong style="font-family: monospace;">#${orderNum}</strong></div>
      <div style="margin-top: 4px;">Bestelldatum: ${dateStr}</div>
      <div style="margin-top: 4px;">Zahlungsart: <strong>${order.paymentMethod}</strong></div>
      <div style="margin-top: 4px;">Versandart: <strong>${(order as any).shippingMethod || (order.shipping > 5 ? 'DHL Expressversand (2-5 Werktage)' : 'DHL Standardversand (3-15 Werktage)')}</strong></div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">Pos.</th>
        <th style="text-align: left;">Artikelbezeichnung</th>
        <th style="width: 70px; text-align: center;">Menge</th>
        <th style="width: 100px; text-align: right;">Einzelpreis</th>
        <th style="width: 110px; text-align: right;">Gesamtpreis</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals-container">
    <table class="totals-table">
      <tr>
        <td style="color: #6B7280;">Nettobetrag:</td>
        <td style="text-align: right; font-family: monospace;">${formatPrice(order.subtotal - order.vatAmount)}</td>
      </tr>
      <tr>
        <td style="color: #6B7280;">Inkl. 19 % MwSt.:</td>
        <td style="text-align: right; font-family: monospace;">${formatPrice(order.vatAmount)}</td>
      </tr>
      <tr>
        <td style="color: #6B7280;">Versandkosten (DHL):</td>
        <td style="text-align: right; font-family: monospace;">${order.shipping === 0 ? '0,00 € (Kostenlos)' : formatPrice(order.shipping)}</td>
      </tr>
      <tr class="total-row">
        <td>Gesamtbetrag (EUR):</td>
        <td style="text-align: right; font-family: monospace; color: #D97706;">${formatPrice(order.total)}</td>
      </tr>
    </table>
  </div>

  ${isBankTransfer ? `
  <div class="bank-box">
    <h4>Bankverbindung für Ihre Überweisung (Vorkasse)</h4>
    <p style="margin: 0 0 8px 0; color: #78350F;">
      Bitte überweisen Sie den Gesamtbetrag von <strong>${formatPrice(order.total)}</strong> unter Angabe des Verwendungszwecks auf folgendes Bankkonto:
    </p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: monospace; font-size: 12px; background: #FFFFFF; padding: 10px; border-radius: 6px; border: 1px solid #FDE68A;">
      <div><strong>Empfänger:</strong> ${bBeneficiary}</div>
      <div><strong>Bank:</strong> ${bBank}</div>
      <div><strong>IBAN:</strong> ${bIban}</div>
      <div><strong>BIC:</strong> ${bBic}</div>
      <div style="grid-column: span 2; border-top: 1px dashed #FDE68A; padding-top: 6px; margin-top: 4px;">
        <strong>Verwendungszweck (Pflichtangabe):</strong> <span style="background: #FEF3C7; padding: 2px 6px; border-radius: 4px;">${orderNum}</span>
      </div>
    </div>
    <p style="margin: 8px 0 0 0; font-size: 11px; color: #92400E;">
      <strong>Zahlungsnachweis:</strong> Laden Sie nach der Ausführung bitte Ihren Überweisungsbeleg im Kundenportal oder direkt nach der Bestellung hoch, um den Versand sofort freizugeben.
    </p>
  </div>
  ` : `
  <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #065F46;">
    <strong>Zahlungsstatus:</strong> Die Zahlung über <strong>${order.paymentMethod}</strong> wurde erfolgreich autorisiert. Ihre Bestellung geht direkt in den Versand.
  </div>
  `}

  <div class="footer-note">
    TechnikWelt GmbH • Geschäftsführer: Dr. Markus Lindemann • Registergericht: Amtsgericht München HRB 284910 • USt-IdNr.: DE 362 891 042<br>
    Dieser Kaufbeleg wurde maschinell erstellt und dient als rechtsgültige Bestätigung über den Vertragsschluss gemäß §§ 312i, 368 BGB.
  </div>

  <script>
    // Automatically trigger print dialog on desktop
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
