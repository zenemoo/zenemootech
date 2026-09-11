import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReferralExportApplicant {
  applicant_id?: string;
  applicant_name: string;
  opportunity_title?: string;
  status?: string;
  created_at?: string;
  referral_code?: string | null;
  referrer_name?: string | null;
  referrer_email?: string | null;
  referral_source?: string | null;
  applicant_email?: string;
  applicant_phone?: string;
  admin_notes?: string;
}

export interface ReferralExportSummary {
  opportunityTitle: string;
  referrerName?: string;
  referralCode?: string;
  totalReferred: number;
  totalApplications: number;
  selectedCount: number;
  pendingCount: number;
  rejectedCount: number;
  reportType?: 'Project Referral Report' | 'Referrer Report' | 'Filtered Report' | 'Complete Referral Master Report';
  generatedAt?: string;
}

/**
 * Generates an RFC-4180 compliant CSV string with UTF-8 BOM for Microsoft Excel & Google Sheets compatibility.
 */
export function generateReferralCSV(
  summary: ReferralExportSummary,
  applicants: ReferralExportApplicant[],
  isAdmin: boolean = false
): string {
  const BOM = '\uFEFF';
  const escape = (val: any): string => {
    if (val === null || val === undefined || val === '') return '-';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const genDate = summary.generatedAt || new Date().toLocaleString('en-IN');

  const lines: string[] = [
    'ZENEMOO TALENT HUB — REFERRAL ATTRIBUTION REPORT',
    `Report Type,${escape(summary.reportType || 'Project Referral Report')}`,
    `Opportunity,${escape(summary.opportunityTitle)}`,
  ];

  if (summary.referrerName) lines.push(`Referrer Name,${escape(summary.referrerName)}`);
  if (summary.referralCode) lines.push(`Referral Code,${escape(summary.referralCode)}`);
  lines.push(`Generated Date,${escape(genDate)}`);
  lines.push('');
  lines.push('METRICS SUMMARY');
  lines.push(`Total Referred,${summary.totalReferred}`);
  lines.push(`Applications Submitted,${summary.totalApplications}`);
  lines.push(`Selected / Hired,${summary.selectedCount}`);
  lines.push(`Pending Review,${summary.pendingCount}`);
  lines.push(`Rejected,${summary.rejectedCount}`);
  lines.push('');
  lines.push('REFERRED CANDIDATE APPLICATIONS');

  const headers = isAdmin
    ? ['Application ID', 'Applicant Name', 'Applicant Email', 'Applicant Contact / Phone', 'Opportunity / Project', 'Referrer Name', 'Referral Code', 'Application Status', 'Applied Date', 'Referral Source']
    : ['Application ID', 'Applicant Name', 'Applicant Email', 'Applicant Contact / Phone', 'Opportunity / Project', 'Referrer Name', 'Referral Code', 'Application Status', 'Applied Date'];

  lines.push(headers.map(escape).join(','));

  applicants.forEach((app) => {
    const formattedDate = app.created_at
      ? new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

    const appId = app.applicant_id || '-';

    const row = isAdmin
      ? [
          appId,
          app.applicant_name || '-',
          app.applicant_email || '-',
          app.applicant_phone || '-',
          app.opportunity_title || summary.opportunityTitle,
          app.referrer_name || summary.referrerName || '-',
          app.referral_code || summary.referralCode || '-',
          (app.status || 'Pending').toUpperCase(),
          formattedDate,
          app.referral_source || 'talent_hub',
        ]
      : [
          appId,
          app.applicant_name || '-',
          app.applicant_email || '-',
          app.applicant_phone || '-',
          app.opportunity_title || summary.opportunityTitle,
          app.referrer_name || summary.referrerName || '-',
          app.referral_code || summary.referralCode || '-',
          (app.status || 'Pending').toUpperCase(),
          formattedDate,
        ];

    lines.push(row.map(escape).join(','));
  });

  return BOM + lines.join('\r\n');
}

/**
 * Generates a structured multi-sheet Excel (.xlsx) file using ExcelJS.
 */
export async function generateReferralXLSX(
  summary: ReferralExportSummary,
  applicants: ReferralExportApplicant[],
  isAdmin: boolean = false
): Promise<ArrayBuffer> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Zenemoo Talent Hub';
  workbook.lastModifiedBy = summary.referrerName || 'Zenemoo Admin Center';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ── Sheet 1: Referral Summary ──
  const summarySheet = workbook.addWorksheet('Referral Summary');
  summarySheet.columns = [
    { header: 'Attribute', key: 'attr', width: 28 },
    { header: 'Value', key: 'val', width: 45 },
  ];

  const genDate = summary.generatedAt || new Date().toLocaleString('en-IN');

  const summaryData = [
    { attr: 'Report Organization', val: 'Zenemoo Tech Solutions' },
    { attr: 'Report Type', val: summary.reportType || 'Project Referral Report' },
    { attr: 'Opportunity / Project', val: summary.opportunityTitle },
    { attr: 'Referrer Name', val: summary.referrerName || '-' },
    { attr: 'Referral Code', val: summary.referralCode || '-' },
    { attr: 'Generated Timestamp', val: genDate },
    { attr: 'Total Candidates Referred', val: summary.totalReferred },
    { attr: 'Applications Submitted', val: summary.totalApplications },
    { attr: 'Selected / Hired', val: summary.selectedCount },
    { attr: 'Pending Review', val: summary.pendingCount },
    { attr: 'Rejected', val: summary.rejectedCount },
  ];

  summaryData.forEach((row, i) => {
    const r = summarySheet.addRow(row);
    if (i < 6) {
      r.font = { name: 'Segoe UI', size: 10, bold: i === 0 || i === 2 };
    } else {
      r.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0E7490' } };
    }
  });

  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5 };
  summaryHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };

  // ── Sheet 2: Referral Applications ──
  const appSheet = workbook.addWorksheet('Referral Applications', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const appColumns = isAdmin
    ? [
        { header: 'Application ID', key: 'applicant_id', width: 22 },
        { header: 'Applicant Name', key: 'applicant_name', width: 26 },
        { header: 'Applicant Email', key: 'applicant_email', width: 28 },
        { header: 'Applicant Contact', key: 'applicant_phone', width: 20 },
        { header: 'Opportunity / Project', key: 'opportunity_title', width: 34 },
        { header: 'Application Status', key: 'status', width: 18 },
        { header: 'Applied Date', key: 'created_at', width: 18 },
        { header: 'Referrer Name', key: 'referrer_name', width: 24 },
        { header: 'Referral Code', key: 'referral_code', width: 20 },
        { header: 'Referral Source', key: 'referral_source', width: 16 },
      ]
    : [
        { header: 'Application ID', key: 'applicant_id', width: 22 },
        { header: 'Applicant Name', key: 'applicant_name', width: 26 },
        { header: 'Applicant Email', key: 'applicant_email', width: 28 },
        { header: 'Applicant Contact', key: 'applicant_phone', width: 20 },
        { header: 'Opportunity / Project', key: 'opportunity_title', width: 34 },
        { header: 'Application Status', key: 'status', width: 18 },
        { header: 'Applied Date', key: 'created_at', width: 18 },
        { header: 'Referrer Name', key: 'referrer_name', width: 24 },
        { header: 'Referral Code', key: 'referral_code', width: 20 },
      ];

  appSheet.columns = appColumns;

  const appHeaderRow = appSheet.getRow(1);
  appHeaderRow.height = 28;
  appHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  appHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };
  appHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };

  applicants.forEach((app, idx) => {
    const formattedDate = app.created_at
      ? new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

    const rowValues = {
      applicant_id: app.applicant_id || '-',
      applicant_name: app.applicant_name || '-',
      applicant_email: app.applicant_email || '-',
      applicant_phone: app.applicant_phone || '-',
      opportunity_title: app.opportunity_title || summary.opportunityTitle,
      status: app.status ? app.status.toUpperCase() : 'PENDING',
      created_at: formattedDate,
      referrer_name: app.referrer_name || summary.referrerName || '-',
      referral_code: app.referral_code || summary.referralCode || '-',
      referral_source: app.referral_source || 'talent_hub',
    };

    const addedRow = appSheet.addRow(rowValues);
    addedRow.height = 22;
    addedRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' },
    };
    addedRow.font = { color: { argb: 'FF1E293B' }, size: 9.5 };
    addedRow.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  if (applicants.length > 0) {
    appSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: applicants.length + 1, column: appColumns.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * Generates an A4 printable PDF report with Zenemoo header, stats table, and paginated applicants table.
 */
export async function generateReferralPDF(
  summary: ReferralExportSummary,
  applicants: ReferralExportApplicant[],
  isAdmin: boolean = false
): Promise<ArrayBuffer> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const todayStr = summary.generatedAt || new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // ── Header Banner ──
  const drawBanner = (isFirstPage: boolean = true) => {
    const bannerHeight = isFirstPage ? 32 : 14;
    doc.setFillColor(8, 13, 25); // Deep navy
    doc.rect(0, 0, pageWidth, bannerHeight, 'F');
    doc.setFillColor(6, 182, 212); // Cyan accent line
    doc.rect(0, 0, pageWidth, 2.5, 'F');

    if (isFirstPage) {
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('ZENEMOO TALENT HUB', 12, 12);

      doc.setFontSize(9);
      doc.setTextColor(6, 182, 212);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `REFERRAL ATTRIBUTION REPORT — ${summary.opportunityTitle.toUpperCase()}`,
        12,
        19
      );

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      const refInfo = summary.referrerName
        ? `Referrer: ${summary.referrerName} (${summary.referralCode || '-'}) • Generated: ${todayStr}`
        : `Generated: ${todayStr}`;
      doc.text(refInfo, 12, 26);

      doc.setFontSize(7);
      doc.setTextColor(203, 213, 225);
      doc.text(`Total Candidates: ${summary.totalReferred}`, pageWidth - 12, 12, { align: 'right' });
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('CONFIDENTIAL TALENT HUB DOCUMENT', pageWidth - 12, 18, { align: 'right' });
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`ZENEMOO — ${summary.opportunityTitle} (Referral List Continued)`, 12, 9);

      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(todayStr, pageWidth - 12, 9, { align: 'right' });
    }
  };

  drawBanner(true);

  // ── Metrics Summary Cards Table (First Page Only) ──
  const summaryHead = [['Total Referred', 'Applications', 'Selected / Hired', 'Pending Review', 'Rejected']];
  const summaryBody = [[
    String(summary.totalReferred),
    String(summary.totalApplications),
    String(summary.selectedCount),
    String(summary.pendingCount),
    String(summary.rejectedCount),
  ]];

  autoTable(doc, {
    head: summaryHead,
    body: summaryBody,
    startY: 36,
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      textColor: [30, 41, 59],
    },
    styles: { cellPadding: 2.5 },
  });

  const nextStartY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 50;

  // ── Section Title ──
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Referred Candidate Applications', 12, nextStartY);

  // ── Applications List Table ──
  const tableHeaders = isAdmin
    ? [['#', 'Application ID', 'Applicant Name', 'Email', 'Contact', 'Opportunity', 'Status', 'Applied Date', 'Referral Code', 'Referrer']]
    : [['#', 'Application ID', 'Applicant Name', 'Email', 'Contact', 'Opportunity', 'Status', 'Applied Date', 'Referral Code']];

  const tableBody = applicants.map((app, idx) => {
    const formattedDate = app.created_at
      ? new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

    const appId = app.applicant_id || '-';

    return isAdmin
      ? [
          String(idx + 1),
          appId,
          app.applicant_name || '-',
          app.applicant_email || '-',
          app.applicant_phone || '-',
          app.opportunity_title || summary.opportunityTitle,
          (app.status || 'pending').toUpperCase(),
          formattedDate,
          app.referral_code || summary.referralCode || '-',
          app.referrer_name || summary.referrerName || '-',
        ]
      : [
          String(idx + 1),
          appId,
          app.applicant_name || '-',
          app.applicant_email || '-',
          app.applicant_phone || '-',
          app.opportunity_title || summary.opportunityTitle,
          (app.status || 'pending').toUpperCase(),
          formattedDate,
          app.referral_code || summary.referralCode || '-',
        ];
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableBody.length > 0 ? tableBody : [[ '—', '—', 'No referred candidate applications recorded yet', '—', '—', '—', '—', '—', '—', ...(isAdmin ? ['—'] : []) ]],
    startY: nextStartY + 3,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawBanner(false);
      }

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(10, pageHeight - 10, pageWidth - 10, pageHeight - 10);

      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'ZENEMOO TECH • AI Language & Contributor Network • Confidential Referral Document',
        12,
        pageHeight - 5
      );
      doc.text(`Page ${data.pageNumber}`, pageWidth - 12, pageHeight - 5, { align: 'right' });
    },
  });

  return doc.output('arraybuffer');
}

/**
 * Triggers a browser download for a generated file.
 */
export function downloadFile(
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string
) {
  const blob = content instanceof ArrayBuffer
    ? new Blob([content], { type: mimeType })
    : new Blob([content], { type: `${mimeType};charset=utf-8` });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
