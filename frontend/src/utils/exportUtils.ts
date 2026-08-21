// exportUtils.ts — Zenemoo multi-format data export engine
// Heavy libraries (exceljs, jspdf, jspdf-autotable) are dynamically imported
// so they are excluded from the main bundle and only loaded on-demand.

// ── Types ────────────────────────────────────────────────────────────────────

export interface ColumnOption {
  key: string;
  label: string;
}

export interface SectionMeta {
  sectionId: string;
  sectionName: string;
  defaultColumns: ColumnOption[];
}

// ── Section Metadata Registry ─────────────────────────────────────────────────

export const EXPORT_SECTION_METADATA: Record<string, SectionMeta> = {
  applications: {
    sectionId: 'applications',
    sectionName: 'Applications',
    defaultColumns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'location', label: 'Location' },
      { key: 'experience', label: 'Experience' },
      { key: 'languages', label: 'Languages' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Applied At' },
    ],
  },
  opportunities: {
    sectionId: 'opportunities',
    sectionName: 'Opportunities',
    defaultColumns: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'location', label: 'Location' },
      { key: 'deadline', label: 'Deadline' },
      { key: 'created_at', label: 'Created At' },
    ],
  },
  subscribers: {
    sectionId: 'subscribers',
    sectionName: 'Subscribers',
    defaultColumns: [
      { key: 'id', label: 'ID' },
      { key: 'email', label: 'Email' },
      { key: 'subscribed_at', label: 'Subscribed At' },
    ],
  },
  contacts: {
    sectionId: 'contacts',
    sectionName: 'Contact Inquiries',
    defaultColumns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company' },
      { key: 'message', label: 'Message' },
      { key: 'created_at', label: 'Date' },
    ],
  },
  team: {
    sectionId: 'team',
    sectionName: 'Team Members',
    defaultColumns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
    ],
  },
  talent: {
    sectionId: 'talent',
    sectionName: 'Talent Pool',
    defaultColumns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'languages', label: 'Languages' },
      { key: 'experience', label: 'Experience' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Registered At' },
    ],
  },
  notifications: {
    sectionId: 'notifications',
    sectionName: 'Notifications',
    defaultColumns: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'body', label: 'Body' },
      { key: 'type', label: 'Type' },
      { key: 'created_at', label: 'Sent At' },
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Filters a column list to only those columns that have at least one non-empty
 * value in the given dataset. This keeps exports clean.
 */
export function getAvailableNonEmptyColumns(
  data: Record<string, any>[],
  columns: ColumnOption[]
): ColumnOption[] {
  if (!data || data.length === 0) return columns;
  return columns.filter((col) =>
    data.some((row) => {
      const v = row[col.key];
      return v !== null && v !== undefined && v !== '';
    })
  );
}

/**
 * Triggers a browser file download from a string or ArrayBuffer payload.
 */
export function triggerFileDownload(
  data: string | ArrayBuffer,
  filename: string,
  mimeType: string
): void {
  const blob =
    typeof data === 'string'
      ? new Blob([data], { type: mimeType })
      : new Blob([data], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// ── CSV Export (no external library needed) ───────────────────────────────────

export function generateClientCSV(
  data: Record<string, any>[],
  columns: ColumnOption[],
  _sectionName: string
): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const headers = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');

  const rows = data
    .map((row) =>
      columns
        .map((col) => {
          const val = row[col.key];
          if (val === null || val === undefined) return '""';
          const str = Array.isArray(val) ? val.join('; ') : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\r\n');

  return BOM + headers + '\r\n' + rows;
}

// ── Excel Export (dynamic import of exceljs) ──────────────────────────────────

export async function generateClientExcel(
  data: Record<string, any>[],
  columns: ColumnOption[],
  sectionName: string
): Promise<ArrayBuffer> {
  const ExcelJS = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Zenemoo Data Solutions';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sectionName.slice(0, 31));

  // Header row
  sheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: Math.max(col.label.length + 4, 16),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 22;

  // Data rows
  data.forEach((row, idx) => {
    const rowData: Record<string, any> = {};
    columns.forEach((col) => {
      const v = row[col.key];
      rowData[col.key] = Array.isArray(v) ? v.join(', ') : v ?? '';
    });
    const excelRow = sheet.addRow(rowData);
    excelRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx % 2 === 0 ? 'FF0F1B2D' : 'FF0B1426' },
    };
    excelRow.font = { color: { argb: 'FFCBD5E1' }, name: 'Calibri', size: 10 };
    excelRow.height = 18;
  });

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return arrayBuffer as ArrayBuffer;
}

// ── PDF Export (dynamic import of jspdf + jspdf-autotable) ───────────────────

export async function generateClientPDF(
  data: Record<string, any>[],
  columns: ColumnOption[],
  sectionName: string
): Promise<ArrayBuffer> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFillColor(9, 13, 22);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setFontSize(13);
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.text(`ZENEMOO — ${sectionName.toUpperCase()} EXPORT`, 14, 13);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 13, { align: 'right' });

  const head = [columns.map((c) => c.label)];
  const body = data.map((row) =>
    columns.map((col) => {
      const v = row[col.key];
      if (v === null || v === undefined) return '';
      return Array.isArray(v) ? v.join(', ') : String(v);
    })
  );

  autoTable(doc, {
    head,
    body,
    startY: 25,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      overflow: 'linebreak',
      font: 'helvetica',
      textColor: [203, 213, 225],
      fillColor: [9, 13, 22],
      lineColor: [30, 41, 59],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [6, 182, 212],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [15, 23, 42],
    },
    tableLineColor: [30, 41, 59],
    tableLineWidth: 0.2,
  });

  return doc.output('arraybuffer') as ArrayBuffer;
}
