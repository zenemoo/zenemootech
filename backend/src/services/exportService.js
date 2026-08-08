import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabaseService } from './supabaseService.js';

// Centralized Export Configurations for the 5 admin sections
export const EXPORT_CONFIGS = {
  'users-rbac': {
    id: 'users-rbac',
    sectionName: 'Users, Access & RBAC',
    allowedRoles: ['super_admin', 'admin', 'administrator'],
    tableName: 'user_management',
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
    id: 'team-directory',
    sectionName: 'Team Directory',
    allowedRoles: ['super_admin', 'admin', 'administrator', 'hr'],
    tableName: 'team_directory',
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
    id: 'team-roster',
    sectionName: 'Team Roster',
    allowedRoles: ['super_admin', 'admin', 'administrator', 'hr'],
    tableName: 'team_roster',
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
    id: 'newsletter',
    sectionName: 'Newsletter Subscribers',
    allowedRoles: ['super_admin', 'admin', 'administrator'],
    tableName: 'newsletter_subscribers',
    defaultColumns: [
      { key: 'email', label: 'Email Address' },
      { key: 'status', label: 'Subscription Status' },
      { key: 'subscribed_at', label: 'Subscribed At' },
      { key: 'source', label: 'Subscription Source' },
      { key: 'created_at', label: 'Created At' },
    ],
  },
  'contact-inquiries': {
    id: 'contact-inquiries',
    sectionName: 'Contact Inquiries',
    allowedRoles: ['super_admin', 'admin', 'administrator'],
    tableName: 'contact_inquiries',
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

/**
 * Empty/Null Column Logic helper:
 * Determines if a column is considered empty across all records in dataset.
 * Empty = null, undefined, empty string "", or whitespace-only ("  ").
 * Non-empty values include 0, false, "0", "No", etc.
 */
export const isColumnEmpty = (dataset, key) => {
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
export const filterNonEmptyColumns = (dataset, columns) => {
  if (!Array.isArray(columns)) return [];
  return columns.filter((col) => !isColumnEmpty(dataset, col.key));
};

/**
 * Helper to format individual data field values for export.
 */
export const formatFieldValue = (val, key = '') => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val instanceof Date) return val.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.map((v) => formatFieldValue(v)).join(', ');
    try {
      return JSON.stringify(val);
    } catch (_) {
      return String(val);
    }
  }
  
  // Format date strings if matching date keys
  if (typeof val === 'string' && (key.includes('at') || key.includes('date'))) {
    const d = new Date(val);
    if (!isNaN(d.getTime()) && val.length > 10) {
      return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
    }
  }

  return String(val);
};

/**
 * Generate UTF-8 CSV with BOM for Excel compatibility.
 */
export const generateCSV = (dataset, selectedColumns, sectionTitle = 'Data Export') => {
  const bom = '\uFEFF'; // UTF-8 BOM
  const headers = selectedColumns.map((col) => col.label || col.key);
  
  const escapeCsvCell = (cellValue) => {
    const str = formatFieldValue(cellValue);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map((h) => escapeCsvCell(h)).join(',');
  const dataRows = dataset.map((row) =>
    selectedColumns.map((col) => escapeCsvCell(row[col.key])).join(',')
  );

  return bom + [headerRow, ...dataRows].join('\r\n');
};

/**
 * Generate Excel (.xlsx) file using ExcelJS.
 */
export const generateExcel = async (dataset, selectedColumns, sectionTitle = 'Data Export') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Zenemoo Enterprise System';
  workbook.lastModifiedBy = 'Zenemoo Admin Center';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sectionTitle.substring(0, 31));

  // Metadata block in first rows
  worksheet.mergeCells('A1', `${String.fromCharCode(65 + Math.min(selectedColumns.length - 1, 10))}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'ZENEMOO ENTERPRISE';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF06B6D4' } };

  worksheet.mergeCells('A2', `${String.fromCharCode(65 + Math.min(selectedColumns.length - 1, 10))}2`);
  const subTitleCell = worksheet.getCell('A2');
  subTitleCell.value = `${sectionTitle.toUpperCase()} - DATA EXPORT`;
  subTitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF334155' } };

  worksheet.mergeCells('A3', `${String.fromCharCode(65 + Math.min(selectedColumns.length - 1, 10))}3`);
  const dateCell = worksheet.getCell('A3');
  const formattedDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  dateCell.value = `Exported on: ${formattedDate}`;
  dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };

  // Empty row before headers
  worksheet.addRow([]);

  // Table Headers
  const headerLabels = selectedColumns.map((col) => col.label || col.key);
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
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF06B6D4' } },
    };
  });

  // Freeze header row below row 5
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];

  // Enable autofilter on header row
  const lastColLetter = String.fromCharCode(65 + Math.max(0, selectedColumns.length - 1));
  worksheet.autoFilter = `A5:${lastColLetter}5`;

  // Data rows
  dataset.forEach((row, rIdx) => {
    const rowValues = selectedColumns.map((col) => formatFieldValue(row[col.key], col.key));
    const addedRow = worksheet.addRow(rowValues);
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
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Calculate & set column widths dynamically
  worksheet.columns.forEach((column, i) => {
    const colDef = selectedColumns[i];
    let maxLength = colDef ? (colDef.label || colDef.key).length : 12;
    dataset.forEach((row) => {
      if (colDef) {
        const valStr = formatFieldValue(row[colDef.key], colDef.key);
        if (valStr.length > maxLength) {
          maxLength = Math.min(valStr.length, 50);
        }
      }
    });
    column.width = Math.max(maxLength + 4, 12);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Generate PDF file using jsPDF & autoTable.
 */
export const generatePDF = (dataset, selectedColumns, sectionTitle = 'Data Export') => {
  const isLandscape = selectedColumns.length > 5;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const formattedDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

  const tableHeaders = [selectedColumns.map((col) => col.label || col.key)];
  const tableRows = dataset.map((row) =>
    selectedColumns.map((col) => formatFieldValue(row[col.key], col.key))
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
    didDrawPage: (data) => {
      // Header on every page
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

      // Footer on every page
      const pageCount = typeof doc.getNumberOfPages === 'function' ? doc.getNumberOfPages() : (doc.internal.getNumberOfPages ? doc.internal.getNumberOfPages() : 1);
      const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

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

  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
};
