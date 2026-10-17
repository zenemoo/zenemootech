import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAmountInWords } from './currencyWordsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Font resolution & in-memory caching
const regularFontPath = path.resolve(__dirname, '../assets/fonts/NotoSans-Regular.ttf');
const boldFontPath = path.resolve(__dirname, '../assets/fonts/NotoSans-Bold.ttf');

let cachedRegBase64 = null;
let cachedBoldBase64 = null;

function getEmbeddedFonts() {
  if (!cachedRegBase64) {
    try {
      if (fs.existsSync(regularFontPath)) {
        cachedRegBase64 = fs.readFileSync(regularFontPath).toString('base64');
      }
    } catch (e) {
      console.warn('Could not read NotoSans-Regular.ttf:', e.message);
    }
  }

  if (!cachedBoldBase64) {
    try {
      if (fs.existsSync(boldFontPath)) {
        cachedBoldBase64 = fs.readFileSync(boldFontPath).toString('base64');
      }
    } catch (e) {
      console.warn('Could not read NotoSans-Bold.ttf:', e.message);
    }
  }

  return { regBase64: cachedRegBase64, boldBase64: cachedBoldBase64 };
}

/**
 * Robust currency formatter supporting INR (₹) and international currencies
 */
export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount || 0);
  const curr = String(currency || 'INR').toUpperCase().trim();

  if (curr === 'INR') {
    const formatted = num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `₹ ${formatted}`;
  }

  if (curr === 'USD') {
    return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (curr === 'EUR') {
    return `€ ${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (curr === 'GBP') {
    return `£ ${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${curr} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Zenemoo Executive Enterprise Invoice PDF Document Generator
 * Renders pristine corporate A4 invoices with mathematical alignment,
 * TrueType Unicode Rupee symbols, and multi-page safety.
 */
export function generateInvoicePdfDoc(invoice, options = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Register TrueType Fonts for native Unicode & Rupee glyphs
  const { regBase64, boldBase64 } = getEmbeddedFonts();
  let fontName = 'helvetica';

  if (regBase64) {
    try {
      doc.addFileToVFS('NotoSans-Regular.ttf', regBase64);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      if (boldBase64) {
        doc.addFileToVFS('NotoSans-Bold.ttf', boldBase64);
        doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
      }
      fontName = 'NotoSans';
    } catch (err) {
      console.warn('Error registering NotoSans in jsPDF, falling back to helvetica:', err.message);
      fontName = 'helvetica';
    }
  }

  doc.setFont(fontName, 'normal');

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180 mm exact

  const company = invoice.company_snapshot || {};
  const client = invoice.client_snapshot || {};
  const bank = invoice.bank_snapshot || {};
  const currency = invoice.currency || 'INR';

  // Executive Corporate Palette
  const colorPrimary = [15, 23, 42];      // Deep Slate Navy (#0F172A)
  const colorAccent = [30, 58, 138];      // Corporate Navy Blue (#1E3A8A)
  const colorTextDark = [30, 41, 59];     // Dark Charcoal (#1E293B)
  const colorTextMuted = [100, 116, 139]; // Slate Grey (#64748B)
  const colorBorder = [226, 232, 240];    // Hairline Slate (#E2E8F0)
  const colorCardBg = [248, 250, 252];    // Off-White Surface (#F8FAFC)
  const colorWhite = [255, 255, 255];

  let currentY = margin;

  // 1. BRAND HEADER & INVOICE METADATA (Two-Column Fixed Grid)
  const colLeftWidth = 105;
  const colRightX = margin + colLeftWidth + 5; // 125 mm
  const colRightWidth = contentWidth - colLeftWidth - 5; // 70 mm

  // Left: Zenemoo Brand Typography
  doc.setFont(fontName, 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...colorPrimary);
  doc.text('Zenemoo', margin, currentY + 7);

  // Corporate Subtitle
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...colorTextMuted);
  doc.text('AI DATA SOLUTIONS & ENTERPRISE SERVICES', margin, currentY + 12);

  // Registered Address & Contacts
  let compY = currentY + 17;
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...colorTextDark);

  const compAddressLines = [];
  if (company.registered_address) compAddressLines.push(company.registered_address);
  const cityStateZip = [company.city, company.state, company.postal_code].filter(Boolean).join(', ');
  if (cityStateZip) compAddressLines.push(cityStateZip);
  if (company.country) compAddressLines.push(company.country);
  if (company.official_email) compAddressLines.push(`Email: ${company.official_email}`);
  if (company.contact_number) compAddressLines.push(`Phone: ${company.contact_number}`);

  for (const line of compAddressLines) {
    doc.text(line, margin, compY);
    compY += 3.8;
  }

  // Legal Identifiers (PAN, Udyam, GSTIN)
  const legalBadges = [];
  if (company.pan_number) legalBadges.push(`PAN: ${company.pan_number}`);
  if (company.udyam_registration) legalBadges.push(`Udyam: ${company.udyam_registration}`);
  if (company.gstin) legalBadges.push(`GSTIN: ${company.gstin}`);
  if (legalBadges.length > 0) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...colorTextMuted);
    doc.text(legalBadges.join('   |   '), margin, compY + 0.5);
    compY += 4.5;
  }

  // Right: Document Title & Metadata
  doc.setFont(fontName, 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...colorPrimary);
  doc.text('INVOICE', pageWidth - margin, currentY + 6.5, { align: 'right' });

  // Invoice Number
  doc.setFont(fontName, 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...colorAccent);
  doc.text(invoice.invoice_number || 'ZEN-INV-DRAFT', pageWidth - margin, currentY + 12.5, { align: 'right' });

  // Metadata Table Rows
  let metaY = currentY + 18;
  const metaRows = [
    { label: 'Invoice Date:', value: invoice.invoice_date || '-' },
    { label: 'Payment Due:', value: invoice.due_date || '-' },
  ];

  if (invoice.service_period_start && invoice.service_period_end) {
    metaRows.push({
      label: 'Service Period:',
      value: `${invoice.service_period_start} to ${invoice.service_period_end}`,
    });
  }

  if (invoice.po_reference) {
    metaRows.push({ label: 'PO Reference:', value: invoice.po_reference });
  }

  const statusText = (invoice.status || 'DRAFT').toUpperCase();
  metaRows.push({ label: 'Status:', value: statusText });

  for (const row of metaRows) {
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(...colorTextMuted);
    doc.text(row.label, colRightX, metaY);

    doc.setFont(fontName, 'bold');
    if (row.label === 'Status:') {
      const isPaid = statusText === 'PAID';
      const isCancelled = statusText === 'CANCELLED';
      doc.setTextColor(
        isPaid ? 22 : isCancelled ? 220 : colorAccent[0],
        isPaid ? 101 : isCancelled ? 38 : colorAccent[1],
        isPaid ? 52 : isCancelled ? 38 : colorAccent[2]
      );
    } else {
      doc.setTextColor(...colorTextDark);
    }
    doc.text(String(row.value), pageWidth - margin, metaY, { align: 'right' });
    metaY += 4.4;
  }

  currentY = Math.max(compY, metaY) + 5;

  // Thin Dividing Line
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // 2. BILLING & PROJECT CARDS (Two Equal 87mm Panels)
  const cardWidth = (contentWidth - 6) / 2; // 87 mm
  const cardHeight = 36;
  const cardRightX = margin + cardWidth + 6;

  // Left Card: BILLED TO
  doc.setFillColor(...colorCardBg);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...colorAccent);
  doc.text('BILLED TO', margin + 4, currentY + 5.5);

  doc.setFont(fontName, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colorPrimary);
  const clientName = client.company_name || 'Client Company';
  const splitClientName = doc.splitTextToSize(clientName, cardWidth - 8);
  doc.text(splitClientName, margin + 4, currentY + 10.5);

  let cY = currentY + 11 + splitClientName.length * 3.8;
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colorTextDark);

  if (client.contact_person) {
    doc.text(`Attn: ${client.contact_person}`, margin + 4, cY);
    cY += 3.8;
  }

  const clientAddress = [client.address, client.city, client.state, client.postal_code, client.country]
    .filter(Boolean)
    .join(', ');
  if (clientAddress) {
    const splitAddr = doc.splitTextToSize(clientAddress, cardWidth - 8);
    doc.text(splitAddr, margin + 4, cY);
    cY += Math.min(splitAddr.length, 2) * 3.6;
  }

  if (client.billing_email) {
    doc.text(`Email: ${client.billing_email}`, margin + 4, cY);
    cY += 3.8;
  }

  const clientTaxIds = [];
  if (client.pan_number) clientTaxIds.push(`PAN: ${client.pan_number}`);
  if (client.gstin) clientTaxIds.push(`GSTIN: ${client.gstin}`);
  if (clientTaxIds.length > 0) {
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colorTextMuted);
    doc.text(clientTaxIds.join(' | '), margin + 4, cY);
  }

  // Right Card: PROJECT & TERMS
  doc.setFillColor(...colorCardBg);
  doc.roundedRect(cardRightX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(...colorBorder);
  doc.roundedRect(cardRightX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...colorAccent);
  doc.text('PROJECT & TERMS', cardRightX + 4, currentY + 5.5);

  doc.setFont(fontName, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colorPrimary);
  const projName = invoice.project_name || 'Service Engagement';
  const splitProjName = doc.splitTextToSize(projName, cardWidth - 8);
  doc.text(splitProjName, cardRightX + 4, currentY + 10.5);

  let pY = currentY + 11 + splitProjName.length * 3.8;
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colorTextDark);

  if (invoice.project_description) {
    const splitDesc = doc.splitTextToSize(invoice.project_description, cardWidth - 8);
    doc.text(splitDesc, cardRightX + 4, pY);
    pY += Math.min(splitDesc.length, 2) * 3.6;
  }

  doc.text(`Payment Terms: ${invoice.payment_terms || 'Net 15 Days'}`, cardRightX + 4, pY);
  pY += 3.8;
  doc.text(
    `Billing Currency: ${currency} (${currency === 'INR' ? 'Indian Rupee - ₹' : currency === 'USD' ? 'US Dollar - $' : currency})`,
    cardRightX + 4,
    pY
  );
  pY += 3.8;

  if (invoice.invoice_period) {
    doc.text(`Invoice Period: ${invoice.invoice_period}`, cardRightX + 4, pY);
  }

  currentY += cardHeight + 6;

  // 3. ITEMIZED SERVICES TABLE (autoTable)
  const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const tableBody = items.map((item, idx) => {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.rate || 0);
    const amount = Number(item.amount || qty * rate);

    const qtyStr =
      qty.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + (item.unit ? ` ${item.unit}` : '');
    const rateStr = formatCurrency(rate, currency);
    const amountStr = formatCurrency(amount, currency);

    return [
      idx + 1,
      item.description || '',
      qtyStr,
      rateStr,
      amountStr,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Service Description', 'Qty / Unit', 'Rate', 'Amount']],
    body: tableBody,
    theme: 'plain',
    showHead: 'everyPage',
    headStyles: {
      fillColor: colorPrimary,
      textColor: colorWhite,
      font: fontName,
      fontStyle: 'bold',
      fontSize: 8.2,
      cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 86, halign: 'left' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    styles: {
      font: fontName,
      fontSize: 8.2,
      textColor: colorTextDark,
      cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
      lineColor: colorBorder,
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    didDrawCell: (data) => {
      // Crisp horizontal rule under each body row
      if (data.section === 'body') {
        doc.setDrawColor(...colorBorder);
        doc.setLineWidth(0.2);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // Prevent awkward orphan summary block: if remaining height < 68mm, break page
  if (currentY + 68 > pageHeight - margin - 10) {
    doc.addPage();
    currentY = margin + 5;
  }

  // 4. SUMMARY & TOTALS SECTION
  const totalsBoxWidth = 76;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const leftDetailsWidth = contentWidth - totalsBoxWidth - 6; // 98 mm

  const subtotal = Number(invoice.subtotal || 0);
  const discountAmount = Number(invoice.discount_amount || 0);
  const taxAmount = Number(invoice.tax_amount || 0);
  const totalAmount = Number(invoice.total_amount || 0);

  // A. Left Side: Amount in Words Card
  const amountWords = invoice.amount_in_words || getAmountInWords(totalAmount, currency);
  doc.setFillColor(...colorCardBg);
  doc.roundedRect(margin, currentY, leftDetailsWidth, 16, 1.5, 1.5, 'F');
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, currentY, leftDetailsWidth, 16, 1.5, 1.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...colorAccent);
  doc.text('AMOUNT IN WORDS', margin + 3.5, currentY + 4.5);

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(...colorPrimary);
  const wordsSplit = doc.splitTextToSize(amountWords, leftDetailsWidth - 7);
  doc.text(wordsSplit, margin + 3.5, currentY + 9);

  // B. Left Side: Bank Remittance Details
  let bankBoxY = currentY + 19;
  let bankBoxBottom = bankBoxY;
  if (bank.bank_name || bank.account_number) {
    const wantsQr = Boolean(invoice.include_payment_qr && (options.qrDataUrl || invoice.payment_qr_data_url));
    const wantsLink = Boolean(invoice.include_payment_link && invoice.payment_link_url);
    const remitExtras = [];
    if (bank.branch_name) remitExtras.push(`Branch: ${bank.branch_name}`);
    if (bank.swift_bic_code) remitExtras.push(`SWIFT: ${bank.swift_bic_code}`);

    const cardH = (wantsLink && remitExtras.length > 0)
      ? 35
      : (wantsLink ? 30 : (remitExtras.length > 0 ? 29 : 25));

    doc.setFillColor(...colorCardBg);
    doc.roundedRect(margin, bankBoxY, leftDetailsWidth, cardH, 1.5, 1.5, 'F');
    doc.setDrawColor(...colorBorder);
    doc.roundedRect(margin, bankBoxY, leftDetailsWidth, cardH, 1.5, 1.5, 'S');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...colorAccent);
    doc.text('BANK REMITTANCE DETAILS', margin + 3.5, bankBoxY + 4.5);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...colorTextDark);

    doc.text(`Bank Name: ${bank.bank_name || '-'}`, margin + 3.5, bankBoxY + 9);
    doc.text(`Account Holder: ${bank.account_holder_name || company.legal_name || 'Zenemoo'}`, margin + 3.5, bankBoxY + 13);
    doc.text(`Account Number: ${bank.account_number || '-'} (${bank.account_type || 'Current'})`, margin + 3.5, bankBoxY + 17);
    doc.text(`IFSC Code: ${bank.ifsc_code || '-'}`, margin + 3.5, bankBoxY + 21);

    if (remitExtras.length > 0) {
      doc.text(remitExtras.join('   |   '), margin + 3.5, bankBoxY + 25);
    }

    // Optional Clickable Payment URL
    if (wantsLink) {
      const linkY = remitExtras.length > 0 ? bankBoxY + 29.5 : bankBoxY + 25.5;
      doc.setFont(fontName, 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...colorAccent);
      doc.textWithLink('Pay Online: ' + invoice.payment_link_url, margin + 3.5, linkY, { url: invoice.payment_link_url });
    }

    // Optional Crisp QR Code
    if (wantsQr) {
      try {
        const qrImg = options.qrDataUrl || invoice.payment_qr_data_url;
        if (qrImg) {
          const qrSize = 18;
          const qrX = margin + leftDetailsWidth - qrSize - 3.5;
          const qrY = bankBoxY + 4;
          doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
          doc.setFont(fontName, 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(...colorAccent);
          doc.text('Scan to Pay', qrX + qrSize / 2, qrY + qrSize + 2.5, { align: 'center' });
        }
      } catch (qrErr) {
        console.warn('[invoicePdfService] QR code embed note:', qrErr.message);
      }
    }
    bankBoxBottom = bankBoxY + cardH;
  }

  // C. Right Side: Financial Breakdown
  let tY = currentY;
  const totalsRows = [
    { label: 'Subtotal:', val: formatCurrency(subtotal, currency) },
  ];

  if (discountAmount > 0) {
    const discLabel = invoice.discount_type === 'percentage'
      ? `Discount (${invoice.discount_value}%):`
      : 'Discount:';
    totalsRows.push({ label: discLabel, val: `-${formatCurrency(discountAmount, currency)}` });
  }

  if (invoice.tax_enabled && (taxAmount > 0 || invoice.tax_rate > 0)) {
    const tLabel = `${invoice.tax_label || 'GST'} (${invoice.tax_rate || 0}%):`;
    totalsRows.push({ label: tLabel, val: formatCurrency(taxAmount, currency) });
  }

  for (const row of totalsRows) {
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...colorTextMuted);
    doc.text(row.label, totalsBoxX, tY + 4);

    doc.setFont(fontName, 'bold');
    doc.setTextColor(...colorTextDark);
    doc.text(row.val, pageWidth - margin, tY + 4, { align: 'right' });
    tY += 5.5;
  }

  // TOTAL DUE Banner
  doc.setFillColor(...colorPrimary);
  doc.roundedRect(totalsBoxX, tY + 1.5, totalsBoxWidth, 11, 1.5, 1.5, 'F');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colorWhite);
  doc.text('TOTAL DUE:', totalsBoxX + 3.5, tY + 8);

  doc.setFontSize(10.5);
  doc.setTextColor(...colorWhite);
  doc.text(formatCurrency(totalAmount, currency), pageWidth - margin - 3.5, tY + 8, { align: 'right' });

  // Partial Payment and Remaining Balance (if applicable)
  const amountPaid = Number(invoice.amount_paid || 0);
  const outstanding = Number(invoice.outstanding_balance ?? (totalAmount - amountPaid));

  if (amountPaid > 0) {
    tY += 15;
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colorTextMuted);
    doc.text('Amount Paid:', totalsBoxX, tY + 3);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(22, 101, 52); // Green
    doc.text(formatCurrency(amountPaid, currency), pageWidth - margin, tY + 3, { align: 'right' });

    tY += 4.5;
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...colorTextMuted);
    doc.text('Balance Due:', totalsBoxX, tY + 3);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(...colorPrimary);
    doc.text(formatCurrency(outstanding, currency), pageWidth - margin, tY + 3, { align: 'right' });
  }

  const totalsBoxBottom = tY + 13 + (amountPaid > 0 ? 10 : 0);
  currentY = Math.max(totalsBoxBottom + 6, bankBoxBottom + 7);

  // 5. INVOICE NOTES & AUTHORIZED SIGNATURE
  const notesWidth = contentWidth - 62;
  const sigX = pageWidth - margin - 52;

  // Notes
  const notesText = invoice.invoice_notes || company.default_invoice_notes;
  if (notesText) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...colorAccent);
    doc.text('NOTES & TERMS', margin, currentY);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colorTextMuted);
    const splitNotes = doc.splitTextToSize(notesText, notesWidth);
    doc.text(splitNotes, margin, currentY + 4);
  }

  // Signature Block (Right)
  const signatory = company.authorized_signatory_name || 'Prem Prasad';
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...colorTextMuted);
  doc.text('For Zenemoo', sigX, currentY + 2);

  // Genuine handwritten signature integration
  const wantsSignature = Boolean(invoice.include_signature ?? company.include_signature);
  const rawSig =
    options.signatureDataUrl ||
    options.signatureBuffer ||
    invoice.signature_data_url ||
    company.signature_data_url;

  let hasValidSignature = false;
  let lineY = currentY + 12;

  if (wantsSignature && rawSig) {
    try {
      const imgProps = doc.getImageProperties(rawSig);
      if (imgProps && imgProps.width > 0 && imgProps.height > 0) {
        const aspect = imgProps.width / imgProps.height;
        const maxW = 40;
        const maxH = 12;
        let rW = maxW;
        let rH = maxW / aspect;
        if (rH > maxH) {
          rH = maxH;
          rW = maxH * aspect;
        }

        const sigImgY = currentY + 3.5;
        doc.addImage(rawSig, imgProps.fileType || 'PNG', sigX, sigImgY, rW, rH, undefined, 'FAST');
        hasValidSignature = true;
        lineY = sigImgY + rH + 1.5;
      }
    } catch (err) {
      console.warn('[invoicePdfService] Note: Signature embedding bypassed:', err.message);
    }
  }

  // Signature line
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.3);
  doc.line(sigX, lineY, pageWidth - margin, lineY);

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(...colorPrimary);
  doc.text(signatory, sigX, lineY + 4);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...colorTextMuted);
  doc.text('Authorized Signatory', sigX, lineY + 7.5);

  // 6. MULTI-PAGE SAFE FOOTER
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...colorTextMuted);

    doc.text('This is an authentic computer-generated invoice issued by Zenemoo.', margin, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  return doc;
}

/**
 * Returns a Node.js binary Buffer of the authoritative PDF
 */
export function generateInvoicePdfBuffer(invoice, options = {}) {
  const doc = generateInvoicePdfDoc(invoice, options);
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
