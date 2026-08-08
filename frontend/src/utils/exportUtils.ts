import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ColumnOption {
  key: string;
  label: string;
}

export interface SectionExportMeta {
  sectionId: string;
  sectionName: string;
  defaultColumns: ColumnOption[];
}

export const EXPORT_SECTION_METADATA: Record<string, SectionExportMeta> = {
  'users-rbac': {
    sectionId: 'users-rbac',
    sectionName: 'Users, Access & RBAC',
    defaultColumns: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
      { key: 'department', label: 'Department' },
      { key: 'team_member_id', label: 'Member ID' },
      { key: 'phone', label: 'Phone' },
      { key: 'created_at', label: 'Created At' },
      { key: 'last_login', label: 'Last Login' },
    ],
  },
  'team-directory': {
    sectionId: 'team-directory',
    sectionName: 'Team Directory',
    defaultColumns: [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Job Title / Role' },
      { key: 'department', label: 'Department' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status' },
      { key: 'location', label: 'Location' },
      { key: 'employee_id', label: 'Employee ID' },
      { key: 'joining_date', label: 'Joining Date' },
      { key: 'bio', label: 'Bio / Note' },
      { key: 'created_at', label: 'Created At' },
    ],
  },
  'team-roster': {
    sectionId: 'team-roster',
    sectionName: 'Team Roster',
    defaultColumns: [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'shift', label: 'Shift / Schedule' },
      { key: 'status', label: 'Availability Status' },
      { key: 'contact_number', label: 'Contact Phone' },
      { key: 'email', label: 'Email' },
      { key: 'created_at', label: 'Logged At' },
    ],
  },
  'newsletter': {
    sectionId: 'newsletter',
    sectionName: 'Newsletter Subscribers',
    defaultColumns: [
      { key: 'email', label: 'Email Address' },
      { key: 'status', label: 'Subscription Status' },
      { key: 'subscribed_at', label: 'Subscribed At' },
      { key: 'source', label: 'Subscription Source' },
      { key: 'created_at', label: 'Created At' },
    ],
  },
  'contact-inquiries': {
    sectionId: 'contact-inquiries',
    sectionName: 'Contact Inquiries',
    defaultColumns: [
      { key: 'name', label: 'Sender Name' },
      { key: 'email', label: 'Email Address' },
      { key: 'subject', label: 'Subject / Category' },
      { key: 'message', label: 'Inquiry Message' },
      { key: 'status', label: 'Inquiry Status' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company / Org' },
      { key: 'created_at', label: 'Received At' },
    ],
  },
};

EXPORT_SECTION_METADATA['rbac'] = EXPORT_SECTION_METADATA['users-rbac'];
EXPORT_SECTION_METADATA['directory'] = EXPORT_SECTION_METADATA['team-directory'];
EXPORT_SECTION_METADATA['team'] = EXPORT_SECTION_METADATA['team-roster'];
EXPORT_SECTION_METADATA['subscribers'] = EXPORT_SECTION_METADATA['newsletter'];
EXPORT_SECTION_METADATA['inquiries'] = EXPORT_SECTION_METADATA['contact-inquiries'];

/**
 * Empty Column Detector:
 * Returns true if an entire column is empty (null, undefined, "", or whitespace-only) for every record in dataset.
 * Does NOT treat 0, false, "0", "No" as empty.
 */
export const isColumnEmpty = (dataset: any[], key: string): boolean => {
  if (!Array.isArray(dataset) || dataset.length === 0) return true;
  return dataset.every((record) => {
    const val = record[key];
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    return false;
  });
};

/**
 * Filter out completely empty columns from dataset and list of column definitions.
 */
export const getAvailableNonEmptyColumns = (dataset: any[], defaultCols: ColumnOption[]): ColumnOption[] => {
  if (!Array.isArray(dataset) || dataset.length === 0) return defaultCols;

  const filteredPredefined = defaultCols.filter((col) => !isColumnEmpty(dataset, col.key));

  const existingKeys = new Set(defaultCols.map((c) => c.key));
  const dynamicCols: ColumnOption[] = [];

  dataset.forEach((row) => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => {
        if (!existingKeys.has(k) && !k.startsWith('_') && k !== 'password' && k !== 'token') {
          if (!isColumnEmpty(dataset, k)) {
            existingKeys.add(k);
            const label = k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            dynamicCols.push({ key: k, label });
          }
        }
      });
    }
  });

  return [...filteredPredefined, ...dynamicCols];
};

/**
 * Format field values cleanly.
 */
export const formatValue = (val: any, key = ''): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val instanceof Date) return val.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.map((v) => formatValue(v)).join(', ');
    try {
      return JSON.stringify(val);
    } catch (_) {
      return String(val);
    }
  }

  if (typeof val === 'string' && (key.includes('at') || key.includes('date'))) {
    const d = new Date(val);
    if (!isNaN(d.getTime()) && val.length > 10) {
      return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
    }
  }

  return String(val);
};

/**
 * Trigger browser file download.
 */
export const triggerFileDownload = (
  blob: Blob | ArrayBuffer | string,
  filename: string,
  mimeType = 'text/csv;charset=utf-8;'
) => {
  const blobObj = blob instanceof Blob ? blob : new Blob([blob], { type: mimeType });
  const url = URL.createObjectURL(blobObj);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Client-Side CSV Export Generator (UTF-8 BOM)
 */
export const generateClientCSV = (dataset: any[], columns: ColumnOption[], sectionTitle: string) => {
  const bom = '\uFEFF';
  const headers = columns.map((c) => c.label);

  const escapeCell = (val: any, key: string) => {
    const str = formatValue(val, key);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map((h) => escapeCell(h, '')).join(',');
  const rowLines = dataset.map((row) =>
    columns.map((c) => escapeCell(row[c.key], c.key)).join(',')
  );

  return bom + [headerLine, ...rowLines].join('\r\n');
};

/**
 * Client-Side Excel (.xlsx) Generator using ExcelJS
 */
export const generateClientExcel = async (
  dataset: any[],
  columns: ColumnOption[],
  sectionTitle: string
): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sectionTitle.substring(0, 31));

  // Metadata block
  worksheet.mergeCells('A1', `${String.fromCharCode(65 + Math.min(columns.length - 1, 10))}1`);
  const tCell = worksheet.getCell('A1');
  tCell.value = 'ZENEMOO ENTERPRISE';
  tCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF06B6D4' } };

  worksheet.mergeCells('A2', `${String.fromCharCode(65 + Math.min(columns.length - 1, 10))}2`);
  const subCell = worksheet.getCell('A2');
  subCell.value = `${sectionTitle.toUpperCase()} - DATA EXPORT`;
  subCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF334155' } };

  worksheet.mergeCells('A3', `${String.fromCharCode(65 + Math.min(columns.length - 1, 10))}3`);
  const dCell = worksheet.getCell('A3');
  const formattedDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  dCell.value = `Exported on: ${formattedDate}`;
  dCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };

  worksheet.addRow([]);

  // Header Row
  const headerLabels = columns.map((c) => c.label);
  const headerRow = worksheet.addRow(headerLabels);
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF090D16' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF06B6D4' } } };
  });

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];
  const lastColLetter = String.fromCharCode(65 + Math.max(0, columns.length - 1));
  worksheet.autoFilter = `A5:${lastColLetter}5`;

  // Data rows
  dataset.forEach((row, rIdx) => {
    const rowVals = columns.map((c) => formatValue(row[c.key], c.key));
    const addedRow = worksheet.addRow(rowVals);
    addedRow.height = 20;

    const bgPattern = rIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
    addedRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${bgPattern}` },
      };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
  });

  worksheet.columns.forEach((column, i) => {
    const colDef = columns[i];
    let maxLen = colDef ? colDef.label.length : 12;
    dataset.forEach((row) => {
      if (colDef) {
        const valStr = formatValue(row[colDef.key], colDef.key);
        if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 50);
      }
    });
    column.width = Math.max(maxLen + 4, 12);
  });

  return await workbook.xlsx.writeBuffer();
};

/**
 * Render non-ASCII text (Odia, Hindi, Bengali, Tamil, Telugu, emojis) to Canvas DataURL
 * so that jsPDF can embed it pixel-perfectly without unicode box/garbled errors.
 */
const renderTextToCanvasDataUrl = (
  text: string,
  fontSize = 10,
  textColor = '#1e293b',
  bold = false
): { dataUrl: string; width: number; height: number } => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: 0, height: 0 };

  const fontStyle = `${bold ? 'bold' : 'normal'} ${fontSize * 2}px "Noto Sans", "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.font = fontStyle;

  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width) + 8;
  const textHeight = Math.ceil(fontSize * 2.6);

  canvas.width = textWidth;
  canvas.height = textHeight;

  ctx.font = fontStyle;
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 4, textHeight / 2);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: textWidth / 2,
    height: textHeight / 2,
  };
};

/**
 * Multilingual Client-Side PDF Generator
 */
export const generateClientPDF = async (
  dataset: any[],
  columns: ColumnOption[],
  sectionTitle: string
): Promise<ArrayBuffer> => {
  const isLandscape = columns.length > 5;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const formattedDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

  const tableHeaders = [columns.map((c) => c.label)];
  const tableRows = dataset.map((row) => columns.map((c) => formatValue(row[c.key], c.key)));

  // Detect if dataset contains non-ASCII characters (Indian scripts, Odia, Hindi, emojis, etc.)
  const hasNonAscii = dataset.some((row) =>
    columns.some((c) => /[^\x00-\x7F]/.test(formatValue(row[c.key], c.key)))
  );

  autoTable(doc, {
    head: tableHeaders,
    body: tableRows,
    startY: 75,
    margin: { top: 75, right: 30, bottom: 40, left: 30 },
    theme: 'grid',
    headStyles: {
      fillColor: [9, 13, 22],
      textColor: [56, 189, 248],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 8,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 6,
    },
    didDrawCell: (cellData) => {
      // If cell contains non-ASCII text, render via Canvas image to ensure Odia/Hindi/Telugu/Tamil render perfectly
      if (hasNonAscii && cellData.section === 'body' && cellData.cell.raw) {
        const textVal = String(cellData.cell.raw);
        if (/[^\x00-\x7F]/.test(textVal)) {
          try {
            const { dataUrl, width, height } = renderTextToCanvasDataUrl(textVal, 8, '#1e293b');
            if (dataUrl && width > 0) {
              // Clear cell default text area and draw crisp canvas image
              doc.setFillColor(cellData.row.index % 2 === 0 ? 255 : 248, cellData.row.index % 2 === 0 ? 255 : 250, cellData.row.index % 2 === 0 ? 255 : 252);
              doc.rect(cellData.cell.x + 2, cellData.cell.y + 2, cellData.cell.width - 4, cellData.cell.height - 4, 'F');

              const drawW = Math.min(width, cellData.cell.width - 6);
              const drawH = Math.min(height, cellData.cell.height - 4);
              const posY = cellData.cell.y + (cellData.cell.height - drawH) / 2;

              doc.addImage(dataUrl, 'PNG', cellData.cell.x + 4, posY, drawW, drawH);
            }
          } catch (_) {}
        }
      }
    },
    didDrawPage: (data) => {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(6, 182, 212);
      doc.text('ZENEMOO', 30, 30);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`${sectionTitle.toUpperCase()} - DATA EXPORT`, 30, 45);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Exported on: ${formattedDate}`, 30, 58);

      const pageCount =
        typeof doc.getNumberOfPages === 'function'
          ? doc.getNumberOfPages()
          : (doc.internal as any).getNumberOfPages
          ? (doc.internal as any).getNumberOfPages()
          : 1;

      const pageWidth = (doc.internal.pageSize as any).width || doc.internal.pageSize.getWidth();
      const pageHeight = (doc.internal.pageSize as any).height || doc.internal.pageSize.getHeight();

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Zenemoo • Confidential Administrative Data • Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
    },
  });

  return doc.output('arraybuffer');
};
