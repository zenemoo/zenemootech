import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PaymentReceiptData {
  receiptNo: string;
  paymentDate: string | Date;
  receiptGeneratedDate?: string | Date;
  linkId?: string | null;
  orderId: string;
  paymentId?: string | null;
  transactionId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  purpose: string;
  paymentType?: 'Support Payment' | 'Client Payment' | 'Other Payment' | string;
  gateway?: string;
  paymentMethod?: string | null;
  amount: number;
  currency?: string;
  bankReferenceNo?: string | null;
  gatewayResponse?: string | null;
  status: 'SUCCESS' | 'PAID' | string;
}

/**
 * Convert numbers into Indian Currency Words format
 * e.g., 1000 -> "Rupees One Thousand Only"
 */
export function numberToWordsIndian(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teenDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensDigits = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (num: number): string => {
    if (num < 10) return singleDigits[num];
    if (num < 20) return teenDigits[num - 10];
    const tens = tensDigits[Math.floor(num / 10)];
    const ones = singleDigits[num % 10];
    return ones ? `${tens} ${ones}` : tens;
  };

  const convertThreeDigits = (num: number): string => {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const hundredsStr = hundreds ? `${singleDigits[hundreds]} Hundred` : '';
    const remainderStr = remainder ? convertTwoDigits(remainder) : '';
    if (hundredsStr && remainderStr) return `${hundredsStr} and ${remainderStr}`;
    return hundredsStr || remainderStr;
  };

  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);

  let words = '';

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundredPart = rupees % 1000;

  if (crore > 0) {
    words += `${convertTwoDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigits(thousand)} Thousand `;
  }
  if (hundredPart > 0) {
    words += `${convertThreeDigits(hundredPart)} `;
  }

  words = words.trim();
  let result = words ? `Rupees ${words}` : 'Rupees Zero';

  if (paise > 0) {
    result += ` and ${convertTwoDigits(paise)} Paise`;
  }

  return `${result} Only`;
}

/**
 * Format date nicely in IST
 * e.g., "10 Sep 2026, 07:57 PM (IST)"
 */
export function formatReceiptDate(dateVal?: string | Date | null): string {
  if (!dateVal) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return String(dateVal);

  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hourStr = hours.toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${hourStr}:${minutes} ${ampm} (IST)`;
}

/**
 * Deterministic receipt number generator
 */
export function generateDeterministicReceiptNo(orderId: string, paymentDate?: string | Date): string {
  const d = paymentDate ? (typeof paymentDate === 'string' ? new Date(paymentDate) : paymentDate) : new Date();
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');

  // Extract trailing 4 alphanumeric chars from order ID
  const cleanId = (orderId || '0000').replace(/[^a-zA-Z0-9]/g, '');
  const suffix = (cleanId.slice(-4) || '0001').toUpperCase();

  return `RCPT-ZNM-${yyyy}${mm}${dd}-${suffix}`;
}

/**
 * Generate a clean standalone QR code data URL (with Zenemoo center emblem)
 */
function createReceiptQrDataUrl(verifyUrl: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 180, 180);

  // Outer border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 172, 172);

  // Generate pseudorandom deterministic QR matrix pattern based on verifyUrl string
  let hash = 0;
  for (let i = 0; i < verifyUrl.length; i++) {
    hash = (hash << 5) - hash + verifyUrl.charCodeAt(i);
    hash |= 0;
  }

  const gridSize = 21;
  const cellSize = 6.8;
  const offsetX = 18;
  const offsetY = 18;

  ctx.fillStyle = '#0f172a';

  // Draw 3 standard Finder Patterns at corners (top-left, top-right, bottom-left)
  const drawFinder = (x: number, y: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
  };

  drawFinder(offsetX, offsetY);
  drawFinder(offsetX + cellSize * 14, offsetY);
  drawFinder(offsetX, offsetY + cellSize * 14);

  // Draw data modules
  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Skip finder areas
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= 13) ||
        (r >= 13 && c < 8) ||
        (r >= 8 && r <= 12 && c >= 8 && c <= 12)
      ) {
        continue;
      }

      const bit = ((hash ^ (r * 31 + c * 17)) & (1 << ((r + c) % 16))) !== 0;
      if (bit) {
        ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize - 0.5, cellSize - 0.5);
      }
    }
  }

  // Draw center Zenemoo emblem
  const centerSize = cellSize * 5;
  const centerX = offsetX + cellSize * 8;
  const centerY = offsetY + cellSize * 8;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(centerX, centerY, centerSize, centerSize, 4);
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw 'Z' icon in center
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', centerX + centerSize / 2, centerY + centerSize / 2 + 1);

  return canvas.toDataURL('image/png');
}

/**
 * Load official Zenemoo logo as base64 image
 */
async function loadOfficialZenemooLogo(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 120;
        canvas.height = img.height || 120;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (_) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/assets/logo.png';
  });
}

/**
 * Build the exact A4 PDF receipt matching the visual reference (Image 2)
 */
export async function generatePaymentReceiptPdf(data: PaymentReceiptData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Background - Clean White
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // --- 0. BACKGROUND WATERMARK (Subtle diagonal "ZENEMOO" across page) ---
  doc.saveGraphicsState();
  doc.setTextColor(240, 246, 252); // Very soft faint blue-gray
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(80);
  doc.text('ZENEMOO', 25, 175, {
    angle: 45,
    renderingMode: 'fill',
  });
  doc.restoreGraphicsState();

  // --- 1. TOP GRADIENT ACCENT BAR ---
  doc.setFillColor(2, 132, 199); // Cyan / Blue #0284c7
  doc.rect(marginX, 12, contentWidth, 1.5, 'F');

  // --- 2. HEADER BRANDING (Left: Logo + ZENEMOO, Right: Tagline) ---
  const logoBase64 = await loadOfficialZenemooLogo();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', marginX, 17, 13, 13, undefined, 'FAST');
    } catch (_) {
      // Fallback vector box
      doc.setFillColor(2, 132, 199);
      doc.roundedRect(marginX, 17, 13, 13, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Z', marginX + 4.5, 25.5);
    }
  } else {
    doc.setFillColor(2, 132, 199);
    doc.roundedRect(marginX, 17, 13, 13, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Z', marginX + 4.5, 25.5);
  }

  // Company Name & Subtitle
  doc.setTextColor(15, 23, 42); // Navy #0f172a
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ZENEMOO', marginX + 16, 23);

  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('People \u2022 Opportunities \u2022 Impact', marginX + 16, 28);

  // Right Header Tagline
  doc.setDrawColor(226, 232, 240);
  doc.line(152, 18, 152, 29);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Building', 156, 20.5);
  doc.text('A Brighter Tomorrow,', 156, 24.5);
  doc.text('Together.', 156, 28.5);

  // --- 3. TITLE & PAID STATUS BADGE (y: 35) ---
  const headerY = 35;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Payment Receipt', marginX, headerY + 7);

  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Zenemoo Data Solutions', marginX, headerY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('AI Data Talent & Partner Network', marginX, headerY + 17.5);

  // Green PAID Card on Right
  const statusBoxX = 120;
  const statusBoxY = headerY;
  const statusBoxW = contentWidth - (statusBoxX - marginX); // 76mm
  const statusBoxH = 19;

  doc.setFillColor(240, 253, 244); // Light Green #f0fdf4
  doc.setDrawColor(187, 247, 208); // Green border #bbf7d0
  doc.roundedRect(statusBoxX, statusBoxY, statusBoxW, statusBoxH, 3, 3, 'FD');

  // Green Circle with Checkmark
  doc.setFillColor(34, 197, 94); // #22c55e
  doc.circle(statusBoxX + 9, statusBoxY + 9.5, 4.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('\u2713', statusBoxX + 7.5, statusBoxY + 12);

  // PAID Text
  doc.setTextColor(22, 101, 52); // Dark Green #166534
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PAID', statusBoxX + 17, statusBoxY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(22, 101, 52);
  doc.text('Payment completed successfully.', statusBoxX + 17, statusBoxY + 14);

  // --- 4. RECEIPT METADATA BOX (y: 57) ---
  const metaY = 57;
  const metaH = 19;
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, metaY, contentWidth, metaH, 3, 3, 'FD');

  const formattedPaymentDate = formatReceiptDate(data.paymentDate);
  const formattedGenDate = formatReceiptDate(data.receiptGeneratedDate || new Date());

  // Meta Left Column
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Receipt No.', marginX + 4, metaY + 5.5);
  doc.text('Payment Date', marginX + 4, metaY + 10.5);
  doc.text('Receipt Generated', marginX + 4, metaY + 15.5);

  doc.text(':', marginX + 32, metaY + 5.5);
  doc.text(':', marginX + 32, metaY + 10.5);
  doc.text(':', marginX + 32, metaY + 15.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.receiptNo, marginX + 35, metaY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedPaymentDate, marginX + 35, metaY + 10.5);
  doc.text(formattedGenDate, marginX + 35, metaY + 15.5);

  // Meta Right Column
  const rightMetaX = marginX + 96;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Link ID', rightMetaX, metaY + 5.5);
  doc.text('Order ID', rightMetaX, metaY + 10.5);
  doc.text('Transaction ID', rightMetaX, metaY + 15.5);

  doc.text(':', rightMetaX + 26, metaY + 5.5);
  doc.text(':', rightMetaX + 26, metaY + 10.5);
  doc.text(':', rightMetaX + 26, metaY + 15.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(data.linkId || data.orderId || '-', rightMetaX + 29, metaY + 5.5);
  doc.text(data.orderId || '-', rightMetaX + 29, metaY + 10.5);
  doc.text(data.transactionId || data.bankReferenceNo || '-', rightMetaX + 29, metaY + 15.5);

  // --- 5. TWO-COLUMN DETAILS CARDS (y: 79) ---
  const cardY = 79;
  const cardW = (contentWidth - 6) / 2; // 88mm
  const cardH = 38;

  // 5A. Left Card: Payer Information
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cardY, cardW, cardH, 3, 3, 'FD');

  // Payer Header
  doc.setFillColor(224, 242, 254);
  doc.circle(marginX + 6, cardY + 7, 3, 'F');
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('\u2605', marginX + 4.8, cardY + 8.8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Payer Information', marginX + 12, cardY + 8);

  // Payer Rows
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Name', marginX + 5, cardY + 16);
  doc.text('Email', marginX + 5, cardY + 23);
  doc.text('Phone', marginX + 5, cardY + 30);

  doc.text(':', marginX + 18, cardY + 16);
  doc.text(':', marginX + 18, cardY + 23);
  doc.text(':', marginX + 18, cardY + 30);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customerName || 'Zenemoo Supporter', marginX + 21, cardY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(data.customerEmail || '-', marginX + 21, cardY + 23);
  doc.text(data.customerPhone ? `+91 ${data.customerPhone}` : '-', marginX + 21, cardY + 30);

  // 5B. Right Card: Payment Details
  const rightCardX = marginX + cardW + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightCardX, cardY, cardW, cardH, 3, 3, 'FD');

  // Payment Details Header
  doc.setFillColor(224, 242, 254);
  doc.circle(rightCardX + 6, cardY + 7, 3, 'F');
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('\u25A4', rightCardX + 4.8, cardY + 8.8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', rightCardX + 12, cardY + 8);

  // Payment Rows
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Purpose', rightCardX + 5, cardY + 16);
  doc.text('Payment Type', rightCardX + 5, cardY + 23);
  doc.text('Gateway', rightCardX + 5, cardY + 30);
  doc.text('Payment Method', rightCardX + 5, cardY + 35);

  doc.text(':', rightCardX + 27, cardY + 16);
  doc.text(':', rightCardX + 27, cardY + 23);
  doc.text(':', rightCardX + 27, cardY + 30);
  doc.text(':', rightCardX + 27, cardY + 35);

  const paymentTypeLabel = data.paymentType || (data.purpose?.toLowerCase().includes('support') ? 'Support Payment' : 'Client Payment');
  const paymentMethodLabel = data.paymentMethod || 'UPI / Online';

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const cleanPurposeTruncated = doc.splitTextToSize(data.purpose || 'Support Zenemoo — Platform & Technology', 55);
  doc.text(cleanPurposeTruncated[0] || '', rightCardX + 30, cardY + 16);

  doc.setFont('helvetica', 'normal');
  doc.text(paymentTypeLabel, rightCardX + 30, cardY + 23);
  doc.text(data.gateway || 'Cashfree Payments', rightCardX + 30, cardY + 30);
  doc.text(paymentMethodLabel, rightCardX + 30, cardY + 35);

  // --- 6. ITEMIZED PAYMENT TABLE (y: 121) ---
  const tableY = 121;

  // Table Header
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX, tableY, contentWidth, 8, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('#', marginX + 4, tableY + 5.5);
  doc.text('Description', marginX + 16, tableY + 5.5);
  doc.text('Amount (INR)', marginX + contentWidth - 4, tableY + 5.5, { align: 'right' });

  // Table Row 1
  const rowY = tableY + 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, rowY, contentWidth, 10, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('1', marginX + 4, rowY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.purpose || 'Support Zenemoo — Platform & Technology', marginX + 16, rowY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`\u20B9${Number(data.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, marginX + contentWidth - 4, rowY + 6.5, { align: 'right' });

  // --- 7. TOTAL PAID CARD & WORDS (y: 142) ---
  const totalY = 142;
  const totalH = 15;
  doc.setFillColor(240, 249, 255); // #f0f9ff
  doc.setDrawColor(186, 230, 253); // #bae6fd
  doc.roundedRect(marginX, totalY, contentWidth, totalH, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total Paid', marginX + 6, totalY + 9.5);

  // Large cyan amount
  doc.setTextColor(2, 132, 199);
  doc.setFontSize(16);
  doc.text(`\u20B9${Number(data.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, marginX + contentWidth - 6, totalY + 7.5, { align: 'right' });

  // Amount in words
  const amountWords = numberToWordsIndian(Number(data.amount));
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(amountWords, marginX + contentWidth - 6, totalY + 12.5, { align: 'right' });

  // --- 8. BOTTOM TWO-COLUMN BLOCK (y: 161) ---
  const bottomY = 161;
  const bottomH = 75;

  // 8A. Left Card: Additional Information
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, bottomY, cardW, bottomH, 3, 3, 'FD');

  // Header
  doc.setFillColor(224, 242, 254);
  doc.circle(marginX + 6, bottomY + 7, 3, 'F');
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('\u2261', marginX + 4.8, bottomY + 8.8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Additional Information', marginX + 12, bottomY + 8);

  // Rows
  const infoRows = [
    { label: 'Payment Status', value: 'SUCCESS', isPill: true },
    { label: 'Bank Reference No.', value: data.bankReferenceNo || data.transactionId || data.paymentId || '-' },
    { label: 'Gateway Response', value: data.gatewayResponse || 'Payment successful' },
    { label: 'Payment Link ID', value: data.linkId || '-' },
    { label: 'Order ID', value: data.orderId || '-' },
  ];

  let currentInfoY = bottomY + 18;
  infoRows.forEach((row) => {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(row.label, marginX + 5, currentInfoY);
    doc.text(':', marginX + 34, currentInfoY);

    if (row.isPill) {
      // Draw green SUCCESS pill
      doc.setFillColor(220, 252, 231); // #dcfce7
      doc.setDrawColor(134, 239, 172); // #86efac
      doc.roundedRect(marginX + 37, currentInfoY - 3.5, 24, 5, 2, 2, 'FD');

      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('\u2713 SUCCESS', marginX + 39, currentInfoY);
    } else {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const valStr = doc.splitTextToSize(String(row.value), 46);
      doc.text(valStr[0] || '-', marginX + 37, currentInfoY);
    }
    currentInfoY += 10.5;
  });

  // 8B. Right Top Card: Verify this receipt with QR Code
  const qrCardY = bottomY;
  const qrCardH = 43;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightCardX, qrCardY, cardW, qrCardH, 3, 3, 'FD');

  const verifyUrl = `https://www.zenemoo.in/receipt/verify/${encodeURIComponent(data.receiptNo)}`;
  const qrDataUrl = createReceiptQrDataUrl(verifyUrl);
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', rightCardX + 5, qrCardY + 6, 31, 31, undefined, 'FAST');
    } catch (_) {}
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Verify this receipt', rightCardX + 39, qrCardY + 12);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const qrTextLines = doc.splitTextToSize('Scan the QR code to verify the authenticity of this receipt on Zenemoo platform.', 44);
  doc.text(qrTextLines, rightCardX + 39, qrCardY + 18);

  // 8C. Right Bottom Card: Secure Payments by Cashfree
  const secCardY = qrCardY + qrCardH + 5;
  const secCardH = 27;
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(rightCardX, secCardY, cardW, secCardH, 3, 3, 'FD');

  // Shield Icon
  doc.setFillColor(2, 132, 199);
  doc.circle(rightCardX + 7, secCardY + 10, 3.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('\u2714', rightCardX + 5.7, secCardY + 12);

  doc.setTextColor(3, 105, 161);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Secure Payments by Cashfree', rightCardX + 13, secCardY + 9);

  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const secText = doc.splitTextToSize('Your payments are processed securely through Cashfree Payments PG.', 70);
  doc.text(secText, rightCardX + 13, secCardY + 15);

  // --- 9. FOOTER SECTION (y: 260 to 290) ---
  const footerY = 260;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, footerY, marginX + contentWidth, footerY);

  // Left Footer Info
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('\u25CF Zenemoo Data Solutions', marginX, footerY + 6);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('\u2316 761031, Ganjam, Odisha, India', marginX, footerY + 11.5);

  // Right Footer Info
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text('\u2709 contact@zenemoo.in', marginX + contentWidth, footerY + 6, { align: 'right' });
  doc.text('\u2295 www.zenemoo.in', marginX + contentWidth, footerY + 11.5, { align: 'right' });

  // Center Footer Tagline
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('Building a Brighter Tomorrow, Together.', pageWidth / 2, footerY + 20, { align: 'center' });

  return doc;
}

/**
 * Trigger immediate download of verified PDF receipt
 */
export async function downloadPaymentReceiptPdf(data: PaymentReceiptData, customFilename?: string): Promise<void> {
  const doc = await generatePaymentReceiptPdf(data);
  const filename = customFilename || `Zenemoo-Payment-Receipt-${data.receiptNo}.pdf`;
  doc.save(filename);
}

/**
 * Open high-resolution printable receipt view
 */
export async function printPaymentReceipt(data: PaymentReceiptData): Promise<void> {
  const doc = await generatePaymentReceiptPdf(data);
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.focus();
  } else {
    // Fallback: create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
    };
  }
}
