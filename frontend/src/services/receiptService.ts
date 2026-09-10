import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

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

// ─── HIGH-PRECISION VECTOR DRAWING HELPERS (0 Encoding Errors) ──────────────────

/**
 * Draw crisp Indian Rupee symbol (₹) using pure vector lines
 */
function drawVectorRupee(doc: jsPDF, x: number, y: number, size: number, color: number[] = [2, 132, 199]): number {
  doc.saveGraphicsState();
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setFillColor(color[0], color[1], color[2]);
  const lw = size * 0.12;
  doc.setLineWidth(lw);

  // Top Bar
  doc.line(x, y - size * 0.75, x + size * 0.65, y - size * 0.75);
  // Second Bar
  doc.line(x, y - size * 0.45, x + size * 0.6, y - size * 0.45);
  // Vertical stem
  doc.line(x + size * 0.15, y - size * 0.75, x + size * 0.15, y - size * 0.15);
  // Upper curve (half loop)
  doc.line(x + size * 0.15, y - size * 0.75, x + size * 0.55, y - size * 0.75);
  doc.line(x + size * 0.55, y - size * 0.75, x + size * 0.55, y - size * 0.45);
  doc.line(x + size * 0.55, y - size * 0.45, x + size * 0.15, y - size * 0.45);
  // Diagonal leg
  doc.line(x + size * 0.25, y - size * 0.45, x + size * 0.65, y);

  doc.restoreGraphicsState();
  return x + size * 0.75;
}

/**
 * Draw a clean vector checkmark inside a circular badge
 */
function drawVectorCheckmarkBadge(doc: jsPDF, cx: number, cy: number, radius: number, circleColor = [34, 197, 94], checkColor = [255, 255, 255]) {
  doc.saveGraphicsState();
  doc.setFillColor(circleColor[0], circleColor[1], circleColor[2]);
  doc.circle(cx, cy, radius, 'F');

  doc.setDrawColor(checkColor[0], checkColor[1], checkColor[2]);
  doc.setLineWidth(radius * 0.35);
  doc.setLineCap(1); // round cap

  // Checkmark 2 segments
  const x1 = cx - radius * 0.45;
  const y1 = cy;
  const x2 = cx - radius * 0.1;
  const y2 = cy + radius * 0.4;
  const x3 = cx + radius * 0.5;
  const y3 = cy - radius * 0.4;

  doc.line(x1, y1, x2, y2);
  doc.line(x2, y2, x3, y3);
  doc.restoreGraphicsState();
}

/**
 * Draw vector User icon
 */
function drawVectorUserIcon(doc: jsPDF, cx: number, cy: number, size: number, color = [2, 132, 199]) {
  doc.saveGraphicsState();
  doc.setFillColor(224, 242, 254);
  doc.circle(cx, cy, size * 0.9, 'F');

  doc.setFillColor(color[0], color[1], color[2]);
  // Head
  doc.circle(cx, cy - size * 0.25, size * 0.26, 'F');
  // Body Arc
  doc.roundedRect(cx - size * 0.42, cy + size * 0.1, size * 0.84, size * 0.45, 1, 1, 'F');
  doc.restoreGraphicsState();
}

/**
 * Draw vector Document icon
 */
function drawVectorDocIcon(doc: jsPDF, cx: number, cy: number, size: number, color = [2, 132, 199]) {
  doc.saveGraphicsState();
  doc.setFillColor(224, 242, 254);
  doc.circle(cx, cy, size * 0.9, 'F');

  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setFillColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.4);

  // Document Outline
  doc.roundedRect(cx - size * 0.3, cy - size * 0.45, size * 0.6, size * 0.9, 0.5, 0.5, 'S');
  // Lines
  doc.line(cx - size * 0.18, cy - size * 0.15, cx + size * 0.18, cy - size * 0.15);
  doc.line(cx - size * 0.18, cy + size * 0.05, cx + size * 0.18, cy + size * 0.05);
  doc.line(cx - size * 0.18, cy + size * 0.25, cx + size * 0.08, cy + size * 0.25);
  doc.restoreGraphicsState();
}

/**
 * Draw vector Additional Info / List icon
 */
function drawVectorInfoIcon(doc: jsPDF, cx: number, cy: number, size: number, color = [2, 132, 199]) {
  doc.saveGraphicsState();
  doc.setFillColor(224, 242, 254);
  doc.circle(cx, cy, size * 0.9, 'F');

  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.5);
  doc.line(cx - size * 0.35, cy - size * 0.25, cx + size * 0.35, cy - size * 0.25);
  doc.line(cx - size * 0.35, cy, cx + size * 0.35, cy);
  doc.line(cx - size * 0.35, cy + size * 0.25, cx + size * 0.35, cy + size * 0.25);
  doc.restoreGraphicsState();
}

/**
 * Draw vector Shield icon
 */
function drawVectorShieldIcon(doc: jsPDF, cx: number, cy: number, size: number, color = [2, 132, 199]) {
  doc.saveGraphicsState();
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(cx, cy, size * 0.9, 'F');

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.setLineCap(1);
  doc.line(cx - size * 0.3, cy - size * 0.05, cx - size * 0.05, cy + size * 0.25);
  doc.line(cx - size * 0.05, cy + size * 0.25, cx + size * 0.35, cy - size * 0.25);
  doc.restoreGraphicsState();
}

/**
 * Draw vector Location Pin icon
 */
function drawVectorPinIcon(doc: jsPDF, x: number, y: number, size: number, color = [100, 116, 139]) {
  doc.saveGraphicsState();
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x, y - size * 0.2, size * 0.35, 'F');
  doc.triangle(x - size * 0.3, y - size * 0.1, x + size * 0.3, y - size * 0.1, x, y + size * 0.4, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(x, y - size * 0.2, size * 0.12, 'F');
  doc.restoreGraphicsState();
}

/**
 * Draw vector Mail icon
 */
function drawVectorMailIcon(doc: jsPDF, x: number, y: number, size: number, color = [100, 116, 139]) {
  doc.saveGraphicsState();
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(x - size * 0.45, y - size * 0.3, size * 0.9, size * 0.6, 0.4, 0.4, 'S');
  doc.line(x - size * 0.45, y - size * 0.3, x, y + size * 0.05);
  doc.line(x + size * 0.45, y - size * 0.3, x, y + size * 0.05);
  doc.restoreGraphicsState();
}

/**
 * Draw vector Globe / Web icon
 */
function drawVectorGlobeIcon(doc: jsPDF, x: number, y: number, size: number, color = [100, 116, 139]) {
  doc.saveGraphicsState();
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.35);
  doc.circle(x, y, size * 0.35, 'S');
  doc.line(x - size * 0.35, y, x + size * 0.35, y);
  doc.line(x, y - size * 0.35, x, y + size * 0.35);
  doc.restoreGraphicsState();
}

/**
 * Generate a certified ISO/IEC 18004 QR code data URL (100% scannable by mobile cameras)
 */
async function createReceiptQrDataUrl(verifyUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR generation error:', err);
    return '';
  }
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
        canvas.width = img.naturalWidth || 120;
        canvas.height = img.naturalHeight || 120;
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
  doc.setTextColor(243, 246, 250); // Ultra soft faint blue-gray
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
      doc.addImage(logoBase64, 'PNG', marginX, 16.5, 13, 13, undefined, 'FAST');
    } catch (_) {
      doc.setFillColor(2, 132, 199);
      doc.roundedRect(marginX, 16.5, 13, 13, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Z', marginX + 4.5, 25);
    }
  } else {
    doc.setFillColor(2, 132, 199);
    doc.roundedRect(marginX, 16.5, 13, 13, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Z', marginX + 4.5, 25);
  }

  // Company Name & Subtitle
  doc.setTextColor(15, 23, 42); // Navy #0f172a
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ZENEMOO', marginX + 16, 22.5);

  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('People \u2022 Opportunities \u2022 Impact', marginX + 16, 27.5);

  // Right Header Tagline
  doc.setDrawColor(226, 232, 240);
  doc.line(152, 17.5, 152, 28.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Building', 156, 20);
  doc.text('A Brighter Tomorrow,', 156, 24);
  doc.text('Together.', 156, 28);

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

  // Vector Checkmark Badge
  drawVectorCheckmarkBadge(doc, statusBoxX + 9, statusBoxY + 9.5, 4.5, [34, 197, 94], [255, 255, 255]);

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
  const cardH = 41;

  // 5A. Left Card: Payer Information
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cardY, cardW, cardH, 3, 3, 'FD');

  // Payer Header
  drawVectorUserIcon(doc, marginX + 7, cardY + 7, 3.5, [2, 132, 199]);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Payer Information', marginX + 13, cardY + 8);

  // Payer Rows
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Name', marginX + 5, cardY + 16);
  doc.text('Email', marginX + 5, cardY + 24);
  doc.text('Phone', marginX + 5, cardY + 32);

  doc.text(':', marginX + 18, cardY + 16);
  doc.text(':', marginX + 18, cardY + 24);
  doc.text(':', marginX + 18, cardY + 32);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customerName || 'Zenemoo Supporter', marginX + 21, cardY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(data.customerEmail || '-', marginX + 21, cardY + 24);
  doc.text(data.customerPhone ? `+91 ${data.customerPhone}` : '-', marginX + 21, cardY + 32);

  // 5B. Right Card: Payment Details
  const rightCardX = marginX + cardW + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightCardX, cardY, cardW, cardH, 3, 3, 'FD');

  // Payment Details Header
  drawVectorDocIcon(doc, rightCardX + 7, cardY + 7, 3.5, [2, 132, 199]);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', rightCardX + 13, cardY + 8);

  // Payment Rows
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Purpose', rightCardX + 5, cardY + 16);
  doc.text('Payment Type', rightCardX + 5, cardY + 24);
  doc.text('Gateway', rightCardX + 5, cardY + 31);
  doc.text('Payment Method', rightCardX + 5, cardY + 37);

  doc.text(':', rightCardX + 27, cardY + 16);
  doc.text(':', rightCardX + 27, cardY + 24);
  doc.text(':', rightCardX + 27, cardY + 31);
  doc.text(':', rightCardX + 27, cardY + 37);

  const paymentTypeLabel = data.paymentType || (data.purpose?.toLowerCase().includes('support') ? 'Support Payment' : 'Client Payment');
  const paymentMethodLabel = data.paymentMethod || 'UPI / Cashfree';

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const cleanPurposeLines = doc.splitTextToSize(data.purpose || 'Support Zenemoo — Platform & Technology', 56);
  doc.text(cleanPurposeLines[0] || '', rightCardX + 30, cardY + 16);

  doc.setFont('helvetica', 'normal');
  doc.text(paymentTypeLabel, rightCardX + 30, cardY + 24);
  doc.text(data.gateway || 'Cashfree Payments', rightCardX + 30, cardY + 31);
  doc.text(paymentMethodLabel, rightCardX + 30, cardY + 37);

  // --- 6. ITEMIZED PAYMENT TABLE (y: 124) ---
  const tableY = 124;

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

  // Draw formatted currency amount
  const formattedAmtStr = Number(data.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(formattedAmtStr, marginX + contentWidth - 4, rowY + 6.5, { align: 'right' });
  const textWidth = doc.getTextWidth(formattedAmtStr);
  drawVectorRupee(doc, marginX + contentWidth - 4 - textWidth - 4, rowY + 6.5, 3.5, [15, 23, 42]);

  // --- 7. TOTAL PAID CARD & WORDS (y: 145) ---
  const totalY = 145;
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
  doc.text(formattedAmtStr, marginX + contentWidth - 6, totalY + 7.5, { align: 'right' });
  const largeTextWidth = doc.getTextWidth(formattedAmtStr);
  drawVectorRupee(doc, marginX + contentWidth - 6 - largeTextWidth - 5.5, totalY + 7.5, 5.5, [2, 132, 199]);

  // Amount in words
  const amountWords = numberToWordsIndian(Number(data.amount));
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(amountWords, marginX + contentWidth - 6, totalY + 12.5, { align: 'right' });

  // --- 8. BOTTOM TWO-COLUMN BLOCK (y: 164) ---
  const bottomY = 164;
  const bottomH = 75;

  // 8A. Left Card: Additional Information
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, bottomY, cardW, bottomH, 3, 3, 'FD');

  // Header
  drawVectorInfoIcon(doc, marginX + 7, bottomY + 7, 3.5, [2, 132, 199]);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Additional Information', marginX + 13, bottomY + 8);

  // Rows
  const infoRows = [
    { label: 'Payment Status', value: 'SUCCESS', isPill: true },
    { label: 'Bank Reference No.', value: data.bankReferenceNo || data.transactionId || data.paymentId || '-' },
    { label: 'Gateway Response', value: data.gatewayResponse || 'Payment completed successfully' },
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
      doc.roundedRect(marginX + 37, currentInfoY - 3.5, 26, 5, 2, 2, 'FD');

      drawVectorCheckmarkBadge(doc, marginX + 40, currentInfoY - 1, 1.6, [34, 197, 94], [255, 255, 255]);
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('SUCCESS', marginX + 43.5, currentInfoY);
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
  const qrDataUrl = await createReceiptQrDataUrl(verifyUrl);
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

  // Vector Shield
  drawVectorShieldIcon(doc, rightCardX + 7, secCardY + 9, 3.5, [2, 132, 199]);

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

  // Left Footer Info with Vector Icons
  doc.setFillColor(2, 132, 199);
  doc.circle(marginX + 1.5, footerY + 5.5, 1.2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Zenemoo Data Solutions', marginX + 4.5, footerY + 6);

  drawVectorPinIcon(doc, marginX + 1.5, footerY + 11.5, 2.5, [100, 116, 139]);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('761031, Ganjam, Odisha, India', marginX + 4.5, footerY + 12);

  // Right Footer Info with Vector Icons
  drawVectorMailIcon(doc, marginX + contentWidth - 45, footerY + 5.5, 2.5, [100, 116, 139]);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text('contact@zenemoo.in', marginX + contentWidth - 40, footerY + 6);

  drawVectorGlobeIcon(doc, marginX + contentWidth - 45, footerY + 11.5, 2.5, [100, 116, 139]);
  doc.text('www.zenemoo.in', marginX + contentWidth - 40, footerY + 12);

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
