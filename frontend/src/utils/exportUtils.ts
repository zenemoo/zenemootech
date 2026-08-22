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

export interface ExportPDFOptions {
  filterSummary?: string;
  scopeLabel?: string;
}

// ── Section Metadata Registry ─────────────────────────────────────────────────

export const EXPORT_SECTION_METADATA: Record<string, SectionMeta> = {
  // Talent Network / AI Data Network & Resource Manager
  'talent-network': {
    sectionId: 'talent-network',
    sectionName: 'AI Data Network & Resource Manager',
    defaultColumns: [
      { key: 'registration_code', label: 'Registration ID' },
      { key: 'full_name', label: 'Candidate Name' },
      { key: 'email', label: 'Email Address' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'primary_role', label: 'Primary Role' },
      { key: 'languages', label: 'Languages & Capacity' },
      { key: 'state', label: 'State' },
      { key: 'city_district', label: 'City / District' },
      { key: 'work_capabilities', label: 'Work Capabilities' },
      { key: 'availability', label: 'Availability' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'gender', label: 'Gender' },
      { key: 'age_group', label: 'Age Group' },
      { key: 'preferred_contact', label: 'Preferred Contact' },
      { key: 'experiences', label: 'Past Experience' },
      { key: 'equipment_resources', label: 'Equipment & Resources' },
      { key: 'status', label: 'Status' },
      { key: 'internal_scoring', label: 'Score / Rating' },
      { key: 'internal_notes', label: 'Admin Notes' },
      { key: 'created_at', label: 'Registration Date' },
    ],
  },
  'talent-roster': {
    sectionId: 'talent-roster',
    sectionName: 'Talent Roster',
    defaultColumns: [
      { key: 'registration_code', label: 'Registration ID' },
      { key: 'full_name', label: 'Candidate Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'primary_role', label: 'Role' },
      { key: 'languages', label: 'Languages' },
      { key: 'state', label: 'State' },
      { key: 'city_district', label: 'City / District' },
      { key: 'work_capabilities', label: 'Work Capabilities' },
      { key: 'availability', label: 'Availability' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Registered Date' },
    ],
  },
  talent: {
    sectionId: 'talent',
    sectionName: 'Talent Network',
    defaultColumns: [
      { key: 'registration_code', label: 'Registration ID' },
      { key: 'full_name', label: 'Candidate Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'primary_role', label: 'Role' },
      { key: 'languages', label: 'Languages' },
      { key: 'state', label: 'State' },
      { key: 'city_district', label: 'City / District' },
      { key: 'work_capabilities', label: 'Work Capabilities' },
      { key: 'availability', label: 'Availability' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Registered Date' },
    ],
  },

  // Applications & Job Postings
  'candidate-applications': {
    sectionId: 'candidate-applications',
    sectionName: 'Candidate Applications',
    defaultColumns: [
      { key: 'id', label: 'Application ID' },
      { key: 'name', label: 'Applicant Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Applied Role' },
      { key: 'location', label: 'Location' },
      { key: 'experience', label: 'Experience' },
      { key: 'languages', label: 'Languages' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Applied Date' },
    ],
  },
  applications: {
    sectionId: 'applications',
    sectionName: 'Applications',
    defaultColumns: [
      { key: 'id', label: 'Application ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Role' },
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
      { key: 'id', label: 'Opportunity ID' },
      { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'location', label: 'Location' },
      { key: 'deadline', label: 'Deadline' },
      { key: 'created_at', label: 'Created At' },
    ],
  },

  // RBAC Users & Team
  'users-rbac': {
    sectionId: 'users-rbac',
    sectionName: 'RBAC Users Registry',
    defaultColumns: [
      { key: 'id', label: 'User ID' },
      { key: 'name', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Assigned Role' },
      { key: 'status', label: 'Account Status' },
      { key: 'created_at', label: 'Created Date' },
    ],
  },
  'team-roster': {
    sectionId: 'team-roster',
    sectionName: 'Team Roster',
    defaultColumns: [
      { key: 'id', label: 'Member ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
    ],
  },
  'team-directory': {
    sectionId: 'team-directory',
    sectionName: 'Enterprise Team Directory',
    defaultColumns: [
      { key: 'id', label: 'Member ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Designation' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
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

  // Contacts & Newsletter
  'contact-inquiries': {
    sectionId: 'contact-inquiries',
    sectionName: 'Contact Inquiries',
    defaultColumns: [
      { key: 'id', label: 'Inquiry ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company' },
      { key: 'message', label: 'Message' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Date Received' },
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
  newsletter: {
    sectionId: 'newsletter',
    sectionName: 'Newsletter Subscribers',
    defaultColumns: [
      { key: 'id', label: 'Subscriber ID' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status' },
      { key: 'subscribed_at', label: 'Subscribed Date' },
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
  notifications: {
    sectionId: 'notifications',
    sectionName: 'System Notifications',
    defaultColumns: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'body', label: 'Body' },
      { key: 'type', label: 'Type' },
      { key: 'created_at', label: 'Sent At' },
    ],
  },
};

// ── Intelligent Value Extraction & Formatting ─────────────────────────────────

/**
 * Extracts and formats a field value from a dataset row for clean export.
 * Handles nested objects, language arrays, contact numbers, and past experience structures.
 */
export function formatFieldValue(row: Record<string, any>, colKey: string): string {
  if (!row || typeof row !== 'object') return '';

  // Direct value lookup with common aliases
  let val = row[colKey];

  if (val === undefined || val === null) {
    if (colKey === 'full_name' && row.name) val = row.name;
    else if (colKey === 'name' && row.full_name) val = row.full_name;
    else if (colKey === 'primary_role' && row.role) val = row.role;
    else if (colKey === 'role' && row.primary_role) val = row.primary_role;
    else if (colKey === 'registration_code' && (row.registrationCode || row.reg_code || row.id)) {
      val = row.registration_code || row.registrationCode || row.reg_code || row.id;
    } else if (colKey === 'work_capabilities' && row.workCapabilities) {
      val = row.workCapabilities;
    } else if (colKey === 'city_district' && (row.city || row.district)) {
      val = [row.city, row.district].filter(Boolean).join(', ');
    } else if (colKey === 'location' && (row.state || row.city_district)) {
      val = [row.city_district, row.state].filter(Boolean).join(', ');
    }
  }

  if (val === undefined || val === null) return '';

  // Special Formatting: Phone Number with Country Code
  if (colKey === 'phone' || colKey === 'phoneNumber') {
    const countryCode = row.country_code || row.countryCode || '';
    const phoneStr = String(val).trim();
    if (!phoneStr) return '';
    if (countryCode && !phoneStr.startsWith('+')) {
      return `${countryCode} ${phoneStr}`;
    }
    return phoneStr;
  }

  // Special Formatting: Languages List
  if (colKey === 'languages' || colKey === 'language_skills') {
    if (Array.isArray(val)) {
      if (val.length === 0) return '';
      return val
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const name = item.language || item.name || '';
            const prof = item.proficiency ? ` (${item.proficiency})` : '';
            const cap = item.capacity && Number(item.capacity) > 1 ? ` [cap: ${item.capacity}]` : '';
            const dialect = item.dialect ? ` [dialect: ${item.dialect}]` : '';
            return `${name}${prof}${cap}${dialect}`.trim();
          }
          return String(item);
        })
        .filter(Boolean)
        .join('; ');
    }
  }

  // Special Formatting: Work Capabilities / Work Types
  if (colKey === 'work_capabilities' || colKey === 'workCapabilities' || colKey === 'work_types') {
    if (Array.isArray(val)) {
      return val.map((v) => (typeof v === 'string' ? v.trim() : String(v))).filter(Boolean).join(', ');
    }
  }

  // Special Formatting: Experiences
  if (colKey === 'experiences' || colKey === 'experience') {
    if (Array.isArray(val)) {
      if (val.length === 0) return '';
      return val
        .map((exp: any) => {
          if (typeof exp === 'string') return exp;
          if (typeof exp === 'object' && exp !== null) {
            const title = exp.project_company_name || exp.projectName || exp.company || '';
            const workType = exp.type_of_work || exp.typeOfWork || '';
            const desc = exp.description ? `: ${exp.description}` : '';
            return [title, workType ? `(${workType})` : '', desc].filter(Boolean).join(' ');
          }
          return String(exp);
        })
        .filter(Boolean)
        .join(' | ');
    }
  }

  // Special Formatting: Equipment / Resources / Additional Info
  if (colKey === 'equipment_resources' || colKey === 'role_details' || colKey === 'additional_info') {
    if (typeof val === 'object' && val !== null) {
      if (Array.isArray(val)) return val.join(', ');
      return Object.entries(val)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .join('; ');
    }
  }

  // Arrays in general
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
  }

  // Objects
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  // Booleans
  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }

  // Date strings formatting
  if (
    typeof val === 'string' &&
    (colKey.includes('date') || colKey.includes('_at') || colKey === 'created_at' || colKey === 'updated_at')
  ) {
    const parsed = Date.parse(val);
    if (!isNaN(parsed) && val.length >= 10 && (val.includes('-') || val.includes('T'))) {
      try {
        const d = new Date(val);
        return d.toISOString().split('T')[0];
      } catch (e) {
        return val;
      }
    }
  }

  return String(val).trim();
}

/**
 * Checks if a column has at least one non-empty value in the given dataset.
 */
export function isColumnNonEmpty(data: Record<string, any>[], colKey: string): boolean {
  if (!data || !Array.isArray(data) || data.length === 0) return false;
  return data.some((row) => {
    const formatted = formatFieldValue(row, colKey);
    return formatted !== '' && formatted !== 'null' && formatted !== 'undefined';
  });
}

/**
 * Filters a column list to only those columns that have at least one non-empty
 * value in the given dataset. If no default columns match or columns list is empty,
 * it introspects available record keys dynamically.
 */
export function getAvailableNonEmptyColumns(
  data: Record<string, any>[],
  candidateColumns: ColumnOption[] = []
): ColumnOption[] {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return candidateColumns;
  }

  // 1. If candidate columns are provided, filter them to non-empty ones
  if (candidateColumns && candidateColumns.length > 0) {
    const validCols = candidateColumns.filter((col) => isColumnNonEmpty(data, col.key));
    if (validCols.length > 0) {
      return validCols;
    }
  }

  // 2. Fallback / Dynamic Introspection: Scan dataset keys
  const keySet = new Set<string>();
  data.forEach((row) => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => {
        // Skip internal/binary fields
        if (!k.startsWith('_') && k !== 'password' && k !== 'token' && k !== 'hash') {
          keySet.add(k);
        }
      });
    }
  });

  const discoveredCols: ColumnOption[] = Array.from(keySet)
    .filter((k) => isColumnNonEmpty(data, k))
    .map((k) => ({
      key: k,
      label: k
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    }));

  return discoveredCols;
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
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 300);
}

// ── CSV Export ────────────────────────────────────────────────────────────────

export function generateClientCSV(
  data: Record<string, any>[],
  columns: ColumnOption[],
  _sectionName: string = 'Export'
): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Microsoft Excel & Google Sheets compatibility
  
  // RFC-4180 Escaping: quotes enclosed, internal quotes doubled
  const escapeCsvCell = (val: string): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerRow = columns.map((c) => escapeCsvCell(c.label)).join(',');

  const rows = data
    .map((row) =>
      columns
        .map((col) => {
          const val = formatFieldValue(row, col.key);
          return escapeCsvCell(val);
        })
        .join(',')
    )
    .join('\r\n');

  return BOM + headerRow + '\r\n' + rows;
}

// ── Excel Export (dynamic import of exceljs) ──────────────────────────────────

export async function generateClientExcel(
  data: Record<string, any>[],
  columns: ColumnOption[],
  sectionName: string = 'Talent Network'
): Promise<ArrayBuffer> {
  const ExcelJS = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Zenemoo Data Solutions';
  workbook.lastModifiedBy = 'Zenemoo Admin System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Clean sheet name (max 31 characters, no special chars)
  const safeSheetName = sectionName.replace(/[:\\/?*\[\]]/g, '').slice(0, 30) || 'Data Export';
  const sheet = workbook.addWorksheet(safeSheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Calculate dynamic column widths based on label and data sample
  sheet.columns = columns.map((col) => {
    let maxLength = col.label.length;
    // Sample up to first 50 rows for performance
    const sample = data.slice(0, 50);
    sample.forEach((row) => {
      const val = formatFieldValue(row, col.key);
      if (val && val.length > maxLength) {
        maxLength = Math.min(val.length, 50); // Cap at 50 chars width
      }
    });

    return {
      header: col.label,
      key: col.key,
      width: Math.max(maxLength + 4, 14),
    };
  });

  // Style Header Row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI', size: 10 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0E7490' }, // Cyan-700 enterprise accent
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
  headerRow.height = 24;

  // Add Data Rows with Alternating Colors
  data.forEach((row, idx) => {
    const rowData: Record<string, any> = {};
    columns.forEach((col) => {
      rowData[col.key] = formatFieldValue(row, col.key);
    });

    const excelRow = sheet.addRow(rowData);
    const isEven = idx % 2 === 0;
    excelRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' }, // Clean slate-50 / white stripe
    };
    excelRow.font = { color: { argb: 'FF1E293B' }, name: 'Segoe UI', size: 9.5 };
    excelRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    excelRow.height = 20;

    // Subtle cell borders
    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      };
    });
  });

  // Enable Auto-Filter on All Columns
  if (columns.length > 0 && data.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.length + 1, column: columns.length },
    };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return arrayBuffer as ArrayBuffer;
}

// ── PDF Export (dynamic import of jspdf + jspdf-autotable) ───────────────────

export async function generateClientPDF(
  data: Record<string, any>[],
  columns: ColumnOption[],
  sectionName: string = 'Talent Network',
  options: ExportPDFOptions = {}
): Promise<ArrayBuffer> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  // Orientation: Landscape A4 for wide table layouts
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const scopeText = options.scopeLabel || (data.length > 0 ? `${data.length} Records` : 'All Records');
  const filterText = options.filterSummary ? ` • Filters: ${options.filterSummary}` : '';

  // ── 1. Page Header (First Page Top Banner) ──
  doc.setFillColor(9, 13, 22); // Enterprise Dark Navy
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Top Accent Bar
  doc.setFillColor(6, 182, 212); // Cyan accent line
  doc.rect(0, 0, pageWidth, 2, 'F');

  // Title & Brand
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ZENEMOO DATA SOLUTIONS', 14, 11);

  doc.setFontSize(9);
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.text(`AI DATA NETWORK & RESOURCE MANAGER — ${sectionName.toUpperCase()} EXPORT`, 14, 18);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'normal');
  const metaLine = `Scope: ${scopeText}${filterText} | Total: ${data.length} Record${data.length === 1 ? '' : 's'} | Columns: ${columns.length}`;
  // Truncate if too wide
  const truncatedMeta = doc.getTextWidth(metaLine) > pageWidth - 30 ? metaLine.slice(0, 140) + '...' : metaLine;
  doc.text(truncatedMeta, 14, 24);

  // Right Date Stamp
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${todayStr}`, pageWidth - 14, 11, { align: 'right' });
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CONFIDENTIAL ADMINISTRATIVE DOCUMENT', pageWidth - 14, 17, { align: 'right' });

  // ── 2. Data Table ──
  const head = [columns.map((c) => c.label)];
  const body = data.map((row) =>
    columns.map((col) => formatFieldValue(row, col.key))
  );

  autoTable(doc, {
    head,
    body,
    startY: 32,
    margin: { left: 10, right: 10, top: 20, bottom: 18 },
    showHead: 'everyPage',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [14, 116, 144], // Cyan-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50 alternating
    },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.15,
    didDrawPage: (dataHook) => {
      // ── Repeat Page Header on Subsequent Pages ──
      if (dataHook.pageNumber > 1) {
        doc.setFillColor(9, 13, 22);
        doc.rect(0, 0, pageWidth, 14, 'F');
        doc.setFillColor(6, 182, 212);
        doc.rect(0, 0, pageWidth, 1.5, 'F');

        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(`ZENEMOO — ${sectionName.toUpperCase()} (Continued)`, 14, 9);

        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${todayStr}`, pageWidth - 14, 9, { align: 'right' });
      }

      // ── Footer on Every Page ──
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);

      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'ZENEMOO DATA SOLUTIONS • AI Language & Data Solutions • Confidential • Internal Administrative Export',
        14,
        pageHeight - 7
      );

      const pageNumberStr = `Page ${dataHook.pageNumber}`;
      doc.text(pageNumberStr, pageWidth - 14, pageHeight - 7, { align: 'right' });
    },
  });

  // Second pass: Calculate total page count for exact "Page X of Y" formatting
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    // Clear previous page label area and replace with exact "Page i of totalPages"
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - 40, pageHeight - 10, 30, 6, 'F');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  return doc.output('arraybuffer') as ArrayBuffer;
}
