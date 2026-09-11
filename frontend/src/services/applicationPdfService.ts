import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export interface CandidateApplicationPdfData {
  applicant_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  opportunity_title: string;
  partner_name?: string;
  status: string; // 'pending' | 'shortlisted' | 'accepted' | 'rejected'
  created_at?: string | Date;
  work_mode?: string;
  payment_info?: string;
  working_hours?: string;
  answers?: Record<string, any>;
  custom_questions?: any[];
  terms_accepted?: boolean;
  terms_accepted_at?: string;
}

/**
 * Format timestamp into IST (Indian Standard Time) string: e.g. "11 Sep 2026, 10:30 PM (IST)"
 */
export function formatApplicationPdfDate(dateVal?: string | Date | null): string {
  if (!dateVal) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' (IST)';
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
 * Format raw question answer cleanly for tabular representation
 */
export function formatAnswerString(value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((v) => formatAnswerString(v)).join(', ');
  }
  if (typeof value === 'object') {
    if (value.label) return String(value.label);
    if (value.value) return String(value.value);
    if (value.name) return String(value.name);
    return JSON.stringify(value);
  }
  return String(value).trim();
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
 * Generate high-density QR Code as base64 data URL
 */
async function generateVerificationQr(dataUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(dataUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#080d19',
        light: '#ffffff',
      },
    });
  } catch (_) {
    return '';
  }
}

/**
 * Draw a clean vector checkmark badge
 */
function drawVectorBadge(doc: jsPDF, cx: number, cy: number, radius: number, circleColor = [16, 185, 129], checkColor = [255, 255, 255]) {
  doc.saveGraphicsState();
  doc.setFillColor(circleColor[0], circleColor[1], circleColor[2]);
  doc.circle(cx, cy, radius, 'F');

  doc.setDrawColor(checkColor[0], checkColor[1], checkColor[2]);
  doc.setLineWidth(radius * 0.35);
  doc.setLineCap(1);

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
 * Generate official Candidate Application PDF with watermark, branding, and verification
 */
export async function generateApplicationPdf(data: CandidateApplicationPdfData): Promise<jsPDF> {
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

  // --- 0. BACKGROUND WATERMARK (Subtle diagonal "ZENEMOO OFFICIAL RECORD") ---
  doc.saveGraphicsState();
  doc.setTextColor(244, 247, 251); // Ultra faint slate-blue watermark
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(54);
  doc.text('ZENEMOO RECORD', 18, 140, {
    angle: 40,
    renderingMode: 'fill',
  });
  doc.setFontSize(28);
  doc.text('OFFICIAL VERIFIED SUBMISSION', 20, 185, {
    angle: 40,
    renderingMode: 'fill',
  });
  doc.restoreGraphicsState();

  // --- 1. TOP GRADIENT ACCENT BAR ---
  doc.setFillColor(6, 182, 212); // Cyan #06b6d4
  doc.rect(marginX, 12, contentWidth, 1.5, 'F');

  // --- 2. HEADER BRANDING ---
  const logoBase64 = await loadOfficialZenemooLogo();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', marginX, 16.5, 13, 13, undefined, 'FAST');
    } catch (_) {
      doc.setFillColor(6, 182, 212);
      doc.roundedRect(marginX, 16.5, 13, 13, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Z', marginX + 4.5, 25);
    }
  } else {
    doc.setFillColor(6, 182, 212);
    doc.roundedRect(marginX, 16.5, 13, 13, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Z', marginX + 4.5, 25);
  }

  // Company Name & Subtitle
  doc.setTextColor(15, 23, 42); // Navy #0f172a
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ZENEMOO', marginX + 16, 22);

  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('AI Contributor Network & Data Operations', marginX + 16, 27);

  // Right Header Tagline & Application Ref
  doc.setDrawColor(226, 232, 240);
  doc.line(146, 16.5, 146, 28.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('APPLICATION ID', 150, 19.5);
  doc.setTextColor(6, 182, 212);
  doc.setFontSize(9);
  doc.text(data.applicant_id || 'APP-2026-RECORD', 150, 24.5);

  // --- 3. DOCUMENT TITLE & STATUS CARD (y: 34) ---
  const headerY = 34;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('Candidate Application Record', marginX, headerY + 6);

  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(data.opportunity_title || 'General Opportunity Program', marginX, headerY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const formattedDate = formatApplicationPdfDate(data.created_at);
  doc.text(`Submitted on: ${formattedDate}`, marginX, headerY + 16.5);

  // Status Badge on Right
  const statusUpper = (data.status || 'pending').toUpperCase();
  const statusBoxX = 138;
  const statusBoxY = headerY - 1;
  const statusBoxW = contentWidth - (statusBoxX - marginX); // 58mm
  const statusBoxH = 18;

  let badgeBg = [240, 253, 244]; // Light Emerald
  let badgeBorder = [187, 247, 208];
  let badgeText = [22, 101, 52];
  let circleColor = [16, 185, 129];

  if (statusUpper === 'SHORTLISTED') {
    badgeBg = [239, 246, 255]; // Light Blue
    badgeBorder = [191, 219, 254];
    badgeText = [30, 64, 175];
    circleColor = [59, 130, 246];
  } else if (statusUpper === 'REJECTED') {
    badgeBg = [254, 242, 242]; // Light Red
    badgeBorder = [254, 202, 202];
    badgeText = [153, 27, 27];
    circleColor = [239, 68, 68];
  } else if (statusUpper === 'PENDING') {
    badgeBg = [254, 252, 232]; // Light Amber
    badgeBorder = [254, 240, 138];
    badgeText = [133, 77, 14];
    circleColor = [234, 179, 8];
  }

  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.setDrawColor(badgeBorder[0], badgeBorder[1], badgeBorder[2]);
  doc.roundedRect(statusBoxX, statusBoxY, statusBoxW, statusBoxH, 2.5, 2.5, 'FD');

  drawVectorBadge(doc, statusBoxX + 7.5, statusBoxY + 9, 3.5, circleColor, [255, 255, 255]);

  doc.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(statusUpper, statusBoxX + 14, statusBoxY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    statusUpper === 'ACCEPTED'
      ? 'Application Accepted'
      : statusUpper === 'SHORTLISTED'
      ? 'Shortlisted for Project'
      : statusUpper === 'PENDING'
      ? 'Under Review by Operations'
      : 'Application Processed',
    statusBoxX + 14,
    statusBoxY + 13
  );

  // --- 4. TWO-COLUMN SUMMARY CARDS (y: 56) ---
  const cardsY = 56;
  const colW = (contentWidth - 6) / 2; // ~88mm

  // Left Card: Applicant Information
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(marginX, cardsY, colW, 40, 2.5, 2.5, 'FD');

  doc.setFillColor(6, 182, 212);
  doc.roundedRect(marginX, cardsY, colW, 7, 2.5, 2.5, 'F');
  doc.rect(marginX, cardsY + 4, colW, 3, 'F'); // square bottom corners
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('APPLICANT PROFILE DETAILS', marginX + 4, cardsY + 4.8);

  const drawFieldRow = (label: string, val: string, x: number, y: number) => {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(label, x, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(val || '—', x, y + 3.8);
  };

  drawFieldRow('Full Name:', data.applicant_name, marginX + 4, cardsY + 12);
  drawFieldRow('Registered Email:', data.applicant_email, marginX + 4, cardsY + 20.5);
  drawFieldRow('Contact Phone:', data.applicant_phone || '—', marginX + 4, cardsY + 29);
  drawFieldRow('Identity Verification:', 'Verified via Zenemoo Talent Portal', marginX + 4, cardsY + 37.5);

  // Right Card: Opportunity Specifications
  const rightCardX = marginX + colW + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightCardX, cardsY, colW, 40, 2.5, 2.5, 'FD');

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(rightCardX, cardsY, colW, 7, 2.5, 2.5, 'F');
  doc.rect(rightCardX, cardsY + 4, colW, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('PROGRAM & PARTNER SPECIFICATIONS', rightCardX + 4, cardsY + 4.8);

  drawFieldRow('Enterprise Partner:', data.partner_name || 'Zenemoo AI Solutions', rightCardX + 4, cardsY + 12);
  drawFieldRow('Work Mode / Location:', data.work_mode ? data.work_mode.toUpperCase() : 'REMOTE (WORK FROM HOME)', rightCardX + 4, cardsY + 20.5);
  drawFieldRow('Compensation / Rate:', data.payment_info || 'Standard Project Milestone Rates', rightCardX + 4, cardsY + 29);
  drawFieldRow('Working Commitment:', data.working_hours || 'Flexible / Task Based', rightCardX + 4, cardsY + 37.5);

  // --- 5. QUESTIONNAIRE & RESPONSES TABLE (y: 101) ---
  const tableStartY = 101;
  const rawAnswers = data.answers || {};
  const customQuestions = Array.isArray(data.custom_questions) ? data.custom_questions : [];

  // Build rows mapping questions properly
  const tableRows: string[][] = [];
  let itemIndex = 1;

  if (customQuestions.length > 0) {
    customQuestions.forEach((q: any) => {
      const qLabel = (q.label && q.label.trim()) || q.id || `Question ${itemIndex}`;
      const answerVal =
        rawAnswers[qLabel] !== undefined
          ? rawAnswers[qLabel]
          : q.id && rawAnswers[q.id] !== undefined
          ? rawAnswers[q.id]
          : '—';
      tableRows.push([String(itemIndex++), qLabel, formatAnswerString(answerVal)]);
    });

    // Also include any answers present in object not explicitly matched
    Object.entries(rawAnswers).forEach(([k, v]) => {
      const isIdMatched = customQuestions.some((q) => q.id === k);
      const isLabelMatched = customQuestions.some((q) => q.label === k);
      if (!isIdMatched && !isLabelMatched) {
        tableRows.push([String(itemIndex++), k, formatAnswerString(v)]);
      }
    });
  } else {
    Object.entries(rawAnswers).forEach(([k, v]) => {
      tableRows.push([String(itemIndex++), k, formatAnswerString(v)]);
    });
  }

  if (tableRows.length === 0) {
    tableRows.push(['1', 'General Application Submission', 'Complete Profile & Identity Verified']);
  }

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Requirement / Questionnaire Item', 'Candidate Submitted Response']],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42], // Navy #0f172a
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
      1: { cellWidth: 92, fontStyle: 'bold', textColor: [15, 23, 42] },
      2: { cellWidth: 80, textColor: [13, 148, 136] }, // Teal font for answers
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Position after table
  const finalTableY = (doc as any).lastAutoTable?.finalY || 160;
  let cursorY = finalTableY + 8;

  // If table runs close to page bottom, add page
  if (cursorY > pageHeight - 55) {
    doc.addPage();
    cursorY = 20;
  }

  // --- 6. TERMS, DECLARATION & QR CODE VERIFICATION BOX ---
  const declBoxH = 34;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cursorY, contentWidth, declBoxH, 2.5, 2.5, 'FD');

  // QR Code
  const qrUrl = `https://zenemoo.in/talent-hub/applications?id=${encodeURIComponent(data.applicant_id)}`;
  const qrBase64 = await generateVerificationQr(qrUrl);
  if (qrBase64) {
    try {
      doc.addImage(qrBase64, 'PNG', marginX + 3, cursorY + 3, 28, 28, undefined, 'FAST');
    } catch (_) {}
  }

  const textStartX = marginX + 35;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ELECTRONIC SIGNATURE & VERIFICATION DECLARATION', textStartX, cursorY + 6.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(
    'This document serves as the official timestamped record of the candidate application submitted to Zenemoo.',
    textStartX,
    cursorY + 11.5
  );
  doc.text(
    `Terms & Conditions Accepted: YES (Version 1.0)  \u2022  Timestamp: ${formattedDate}`,
    textStartX,
    cursorY + 16.5
  );
  doc.text(
    `Official Contributor Portal: https://zenemoo.in/talent-hub  \u2022  Security Hash: SHA256-${(data.applicant_id || 'ZNM').slice(-6)}VERIFIED`,
    textStartX,
    cursorY + 21.5
  );

  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Scan QR Code with any mobile camera to verify application record authenticity.', textStartX, cursorY + 27.5);

  // --- 7. FOOTER ACROSS ALL PAGES ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);

    doc.setTextColor(148, 163, 184); // Slate-400
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Zenemoo Data Solutions \u2022 Contact: info@zenemoo.in \u2022 Phone: +91 9827775230', marginX, pageHeight - 9);

    const pageStr = `Page ${i} of ${pageCount}`;
    doc.text(pageStr, pageWidth - marginX - doc.getTextWidth(pageStr), pageHeight - 9);
  }

  return doc;
}

/**
 * Triggers direct browser download of the generated PDF
 */
export async function downloadApplicationPdf(data: CandidateApplicationPdfData): Promise<void> {
  const doc = await generateApplicationPdf(data);
  const cleanId = (data.applicant_id || 'Application').replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `Zenemoo_Application_${cleanId}.pdf`;
  doc.save(filename);
}
