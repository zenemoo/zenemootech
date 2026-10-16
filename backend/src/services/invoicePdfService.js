import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAmountInWords } from './currencyWordsService.js';

/**
 * Zenemoo High-Fidelity Professional Invoice PDF Generator
 * Renders executive A4 print documents with clean typography,
 * aligned currency columns, company snapshot, and payment instructions.
 */

export function generateInvoicePdfBuffer(invoice) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const company = invoice.company_snapshot || {};
  const client = invoice.client_snapshot || {};
  const bank = invoice.bank_snapshot || {};
  const currency = invoice.currency || 'INR';
  const currSymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;

  // Palette
  const primaryColor = [15, 23, 42]; // Slate 900
  const secondaryColor = [37, 99, 235]; // Blue 600
  const mutedText = [100, 116, 139]; // Slate 500
  const darkText = [30, 41, 59]; // Slate 800
  const borderColor = [226, 232, 240]; // Slate 200
  const cardBg = [248, 250, 252]; // Slate 50

  let currentY = margin;

  // 1. TOP HEADER ACCENT BAR
  doc.setFillColor(...secondaryColor);
  doc.rect(margin, currentY, contentWidth, 3, 'F');
  currentY += 8;

  // 2. COMPANY HEADER & INVOICE TITLE
  // Left: Company Display Name (Strictly "Zenemoo")
  const displayName = company.display_name || 'Zenemoo';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text(displayName, margin, currentY + 6);

  // Right: INVOICE BADGE & NUMBER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...secondaryColor);
  doc.text('INVOICE', pageWidth - margin, currentY + 6, { align: 'right' });

  currentY += 12;

  // Invoice Number under title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text(invoice.invoice_number || 'ZEN-INV-DRAFT', pageWidth - margin, currentY, { align: 'right' });

  // Company Address / Details (Left)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedText);

  let compLines = [];
  if (company.registered_address) compLines.push(company.registered_address);
  const cityState = [company.city, company.state, company.postal_code].filter(Boolean).join(', ');
  if (cityState) compLines.push(cityState);
  if (company.country) compLines.push(company.country);
  if (company.official_email) compLines.push(`Email: ${company.official_email}`);
  if (company.contact_number) compLines.push(`Tel: ${company.contact_number}`);

  // Legal Identifiers (PAN, Udyam, GSTIN)
  const legalIds = [];
  if (company.pan_number) legalIds.push(`PAN: ${company.pan_number}`);
  if (company.udyam_registration) legalIds.push(`Udyam: ${company.udyam_registration}`);
  if (company.gstin) legalIds.push(`GSTIN: ${company.gstin}`);
  if (legalIds.length > 0) compLines.push(legalIds.join(' | '));

  let leftY = currentY;
  for (const line of compLines) {
    doc.text(line, margin, leftY);
    leftY += 4.2;
  }

  // Invoice Metadata (Right)
  let rightY = currentY + 5;
  const metaLabels = [
    { label: 'Issue Date:', val: invoice.invoice_date || '' },
    { label: 'Due Date:', val: invoice.due_date || '' },
  ];
  if (invoice.service_period_start && invoice.service_period_end) {
    metaLabels.push({
      label: 'Service Period:',
      val: `${invoice.service_period_start} to ${invoice.service_period_end}`,
    });
  }
  if (invoice.po_reference) {
    metaLabels.push({ label: 'PO / Ref:', val: invoice.po_reference });
  }

  // Status Badge
  const statusUpper = (invoice.status || 'DRAFT').toUpperCase();
  metaLabels.push({ label: 'Status:', val: statusUpper });

  for (const item of metaLabels) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkText);
    doc.text(item.label, pageWidth - margin - 50, rightY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...(item.label === 'Status:' ? secondaryColor : darkText));
    doc.text(String(item.val), pageWidth - margin, rightY, { align: 'right' });
    rightY += 4.5;
  }

  currentY = Math.max(leftY, rightY) + 6;

  // Divider
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // 3. BILL TO & PROJECT DETAILS SECTION (Two Clean Cards)
  const colWidth = (contentWidth - 6) / 2;

  // Left Card: BILL TO
  doc.setFillColor(...cardBg);
  doc.roundedRect(margin, currentY, colWidth, 38, 2, 2, 'F');
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, colWidth, 38, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text('BILLED TO', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text(client.company_name || 'Client Name', margin + 4, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkText);
  let billY = currentY + 17;
  if (client.contact_person) {
    doc.text(`Attn: ${client.contact_person}`, margin + 4, billY);
    billY += 4;
  }
  const clientAddr = [client.address, client.city, client.state, client.postal_code, client.country]
    .filter(Boolean)
    .join(', ');
  if (clientAddr) {
    const splitAddr = doc.splitTextToSize(clientAddr, colWidth - 8);
    doc.text(splitAddr, margin + 4, billY);
    billY += splitAddr.length * 4;
  }
  if (client.billing_email) {
    doc.text(`Email: ${client.billing_email}`, margin + 4, billY);
    billY += 4;
  }
  const clientLegal = [];
  if (client.pan_number) clientLegal.push(`PAN: ${client.pan_number}`);
  if (client.gstin) clientLegal.push(`GSTIN: ${client.gstin}`);
  if (clientLegal.length > 0) {
    doc.text(clientLegal.join(' | '), margin + 4, billY);
  }

  // Right Card: PROJECT & PAYMENT SPECIFICATIONS
  const rightCardX = margin + colWidth + 6;
  doc.setFillColor(...cardBg);
  doc.roundedRect(rightCardX, currentY, colWidth, 38, 2, 2, 'F');
  doc.setDrawColor(...borderColor);
  doc.roundedRect(rightCardX, currentY, colWidth, 38, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text('PROJECT & TERMS', rightCardX + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text(invoice.project_name || 'Service Engagement', rightCardX + 4, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkText);
  let projY = currentY + 17;

  if (invoice.project_description) {
    const descLines = doc.splitTextToSize(invoice.project_description, colWidth - 8);
    doc.text(descLines, rightCardX + 4, projY);
    projY += Math.min(descLines.length, 2) * 4;
  }
  doc.text(`Payment Terms: ${invoice.payment_terms || 'Net 15 Days'}`, rightCardX + 4, projY);
  projY += 4;
  doc.text(`Billing Currency: ${currency}`, rightCardX + 4, projY);
  projY += 4;
  if (invoice.invoice_period) {
    doc.text(`Invoice Period: ${invoice.invoice_period}`, rightCardX + 4, projY);
  }

  currentY += 43;

  // 4. LINE ITEMS TABLE (autoTable)
  const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const tableRows = items.map((item, idx) => [
    idx + 1,
    item.description || '',
    Number(item.quantity || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) +
      (item.unit ? ` ${item.unit}` : ''),
    `${currSymbol}${Number(item.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `${currSymbol}${Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Service Description', 'Qty / Unit', 'Rate', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 36, halign: 'right' },
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: darkText,
      lineColor: borderColor,
      lineWidth: 0.25,
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // Check if summary section fits on current page (needs approx 65mm)
  if (currentY + 65 > pageHeight - margin) {
    doc.addPage();
    currentY = margin + 5;
  }

  // 5. SUMMARY & TOTALS SECTION
  const summaryBoxWidth = 85;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  // Summary Rows
  const subtotal = Number(invoice.subtotal || 0);
  const discountAmount = Number(invoice.discount_amount || 0);
  const taxAmount = Number(invoice.tax_amount || 0);
  const totalAmount = Number(invoice.total_amount || 0);

  const summaryItems = [
    {
      label: 'Subtotal:',
      val: `${currSymbol}${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
  ];

  if (discountAmount > 0) {
    summaryItems.push({
      label: `Discount (${invoice.discount_type === 'percentage' ? `${invoice.discount_value}%` : 'Fixed'}):`,
      val: `-${currSymbol}${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    });
  }

  if (invoice.tax_enabled && (taxAmount > 0 || invoice.tax_rate > 0)) {
    summaryItems.push({
      label: `${invoice.tax_label || 'Tax'} (${invoice.tax_rate || 0}%):`,
      val: `${currSymbol}${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    });
  }

  let sY = currentY;
  for (const s of summaryItems) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...darkText);
    doc.text(s.label, summaryX, sY + 4);

    doc.setFont('helvetica', 'bold');
    doc.text(s.val, pageWidth - margin, sY + 4, { align: 'right' });
    sY += 6;
  }

  // Total Due Highlight Banner
  doc.setFillColor(...primaryColor);
  doc.roundedRect(summaryX, sY + 2, summaryBoxWidth, 12, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL DUE:', summaryX + 4, sY + 9.5);

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${currSymbol}${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin - 4,
    sY + 9.5,
    { align: 'right' }
  );

  // Left of Summary: AMOUNT IN WORDS & BANK DETAILS
  const leftBoxWidth = contentWidth - summaryBoxWidth - 6;

  // Amount in Words
  const amountWords = invoice.amount_in_words || getAmountInWords(totalAmount, currency);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('AMOUNT IN WORDS:', margin, currentY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  const wordsLines = doc.splitTextToSize(amountWords, leftBoxWidth);
  doc.text(wordsLines, margin, currentY + 9);

  let bY = currentY + 12 + wordsLines.length * 4;

  // Bank & Remittance Instructions Box
  if (bank.bank_name || bank.account_number) {
    doc.setFillColor(...cardBg);
    doc.roundedRect(margin, bY, leftBoxWidth, 32, 2, 2, 'F');
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin, bY, leftBoxWidth, 32, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    doc.text('BANK REMITTANCE DETAILS', margin + 3, bY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...darkText);

    doc.text(`Bank Name: ${bank.bank_name || ''}`, margin + 3, bY + 10);
    doc.text(`A/C Holder: ${bank.account_holder_name || company.legal_name || 'Zenemoo'}`, margin + 3, bY + 14);
    doc.text(`A/C Number: ${bank.account_number || ''} (${bank.account_type || 'Current'})`, margin + 3, bY + 18);
    doc.text(`IFSC Code: ${bank.ifsc_code || ''}`, margin + 3, bY + 22);

    let extraRemit = [];
    if (bank.branch_name) extraRemit.push(`Branch: ${bank.branch_name}`);
    if (bank.swift_bic_code) extraRemit.push(`SWIFT: ${bank.swift_bic_code}`);
    if (extraRemit.length > 0) {
      doc.text(extraRemit.join(' | '), margin + 3, bY + 26);
    }
  }

  currentY = Math.max(sY + 18, bY + 36);

  // 6. INVOICE NOTES & AUTHORIZED SIGNATURE
  const notesWidth = contentWidth - 65;
  const sigX = pageWidth - margin - 55;

  if (invoice.invoice_notes || company.default_invoice_notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    doc.text('NOTES & INSTRUCTIONS', margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedText);
    const notesText = invoice.invoice_notes || company.default_invoice_notes || '';
    const splitNotes = doc.splitTextToSize(notesText, notesWidth);
    doc.text(splitNotes, margin, currentY + 4);
  }

  // Authorized Signatory
  const signatory = company.authorized_signatory_name || 'Authorized Signatory';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text(`For ${displayName}`, sigX, currentY + 12);

  doc.setDrawColor(...borderColor);
  doc.line(sigX, currentY + 20, pageWidth - margin, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text(signatory, sigX, currentY + 24);

  // 7. FOOTER & PAGE NUMBERS (Multi-page safe)
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedText);

    // Left: Official computer generated notice
    doc.text(
      'This is a computer-generated invoice issued by Zenemoo. All rights reserved.',
      margin,
      pageHeight - 8
    );

    // Right: Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  // Return Node Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
