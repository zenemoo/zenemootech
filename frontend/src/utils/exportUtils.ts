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
  // Candidate Applications (Dynamic Custom Form Answers Support)
  'candidate-applications': {
    sectionId: 'candidate-applications',
    sectionName: 'Candidate Applications',
    defaultColumns: [
      { key: 'applicant_id', label: 'Application ID' },
      { key: 'applicant_name', label: 'Applicant Name' },
      { key: 'applicant_email', label: 'Email' },
      { key: 'applicant_phone', label: 'Phone' },
      { key: 'opportunity_title', label: 'Opportunity / Program' },
      { key: 'status', label: 'Status' },
      { key: 'sync_status', label: 'Sheet Sync' },
      { key: 'admin_notes', label: 'Admin Notes' },
      { key: 'created_at', label: 'Application Date' },
    ],
  },
  applications: {
    sectionId: 'applications',
    sectionName: 'Candidate Applications',
    defaultColumns: [
      { key: 'applicant_id', label: 'Application ID' },
      { key: 'applicant_name', label: 'Applicant Name' },
      { key: 'applicant_email', label: 'Email' },
      { key: 'applicant_phone', label: 'Phone' },
      { key: 'opportunity_title', label: 'Opportunity / Program' },
      { key: 'status', label: 'Status' },
      { key: 'sync_status', label: 'Sheet Sync' },
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
 * Seamlessly resolves top-level fields, custom questions inside `answers` /
 * `custom_form_answers`, contact numbers, and nested data structures.
 */
export function formatFieldValue(row: Record<string, any>, colKey: string): string {
  if (!row || typeof row !== 'object') return '';

  // 1. Direct property lookup
  let val = row[colKey];

  // 2. Custom Form Answers lookup (if not found on root)
  if (val === undefined || val === null) {
    const answersObj =
      row.answers || row.custom_form_answers || row.customFormAnswers || row.form_answers;
    if (answersObj && typeof answersObj === 'object') {
      if (Array.isArray(answersObj)) {
        const match = answersObj.find(
          (item: any) =>
            item &&
            (item.question === colKey || item.label === colKey || item.key === colKey)
        );
        if (match) val = match.answer ?? match.value ?? match.val;
      } else {
        val = answersObj[colKey];
      }
    }
  }

  // 3. Common Schema Aliases Resolution
  if (val === undefined || val === null) {
    if (colKey === 'applicant_name' || colKey === 'name') {
      val = row.applicant_name || row.name || row.full_name || row.fullName;
    } else if (colKey === 'full_name') {
      val = row.full_name || row.name || row.applicant_name;
    } else if (colKey === 'applicant_email' || colKey === 'email') {
      val = row.applicant_email || row.email;
    } else if (colKey === 'applicant_phone' || colKey === 'phone' || colKey === 'phoneNumber') {
      val = row.applicant_phone || row.phone || row.phoneNumber;
    } else if (colKey === 'applicant_id' || colKey === 'id') {
      val =
        row.applicant_id ||
        (row.id ? (row.id.startsWith('APP-') ? row.id : `APP-2026-${row.id.substring(0, 4)}`) : '');
    } else if (colKey === 'opportunity_title' || colKey === 'role' || colKey === 'primary_role') {
      val =
        row.opportunity_title ||
        row.opportunityTitle ||
        row.primary_role ||
        row.role ||
        row.title;
    } else if (colKey === 'registration_code') {
      val = row.registration_code || row.registrationCode || row.reg_code || row.id;
    } else if (colKey === 'sync_status' || colKey === 'sheet_sync') {
      val = row.sync_status || row.sheet_sync || 'synced';
    } else if (colKey === 'work_capabilities') {
      val = row.work_capabilities || row.workCapabilities;
    } else if (colKey === 'city_district') {
      val = [row.city, row.district].filter(Boolean).join(', ');
    } else if (colKey === 'location') {
      val = [row.city_district || row.city, row.state].filter(Boolean).join(', ');
    }
  }

  if (val === undefined || val === null) return '';

  // Special Formatting: Phone Number with Country Code
  if (colKey === 'phone' || colKey === 'phoneNumber' || colKey === 'applicant_phone') {
    const countryCode = row.country_code || row.countryCode || '';
    const phoneStr = String(val).trim();
    if (!phoneStr) return '';
    if (countryCode && !phoneStr.startsWith('+')) {
      return `${countryCode} ${phoneStr}`;
    }
    return phoneStr;
  }

  // Special Formatting: Status string capitalization
  if (colKey === 'status' && typeof val === 'string') {
    return val.toUpperCase();
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

  // Special Formatting: Work Capabilities
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

  // Special Formatting: Arrays in general (e.g. multi-select answers)
  if (Array.isArray(val)) {
    return val
      .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v).trim()))
      .filter(Boolean)
      .join(', ');
  }

  // Special Formatting: Objects
  if (typeof val === 'object' && val !== null) {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join('; ');
  }

  // Booleans
  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }

  // Date strings formatting
  if (
    typeof val === 'string' &&
    (colKey.includes('date') ||
      colKey.includes('_at') ||
      colKey === 'created_at' ||
      colKey === 'updated_at' ||
      colKey === 'subscribed_at')
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
 * Dynamically discovers and filters columns for any dataset.
 * Inspects root fields and flattens custom question-and-answer containers (`answers`,
 * `custom_form_answers`, etc.) into dedicated individual columns.
 * Only columns with at least 1 non-empty value in the active dataset are returned.
 */
export function getAvailableNonEmptyColumns(
  data: Record<string, any>[],
  candidateColumns: ColumnOption[] = []
): ColumnOption[] {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return candidateColumns;
  }

  // 1. Build map of predefined standard columns
  const standardKeyMap = new Map<string, string>();
  candidateColumns.forEach((c) => {
    standardKeyMap.set(c.key, c.label);
  });

  // 2. Discover all dynamic keys (root keys + nested answers keys)
  const discoveredDynamicKeys: string[] = [];
  const seenKeys = new Set<string>();

  data.forEach((row) => {
    if (!row || typeof row !== 'object') return;

    // A. Root properties
    Object.keys(row).forEach((k) => {
      if (
        !k.startsWith('_') &&
        k !== 'password' &&
        k !== 'token' &&
        k !== 'hash' &&
        k !== 'answers' &&
        k !== 'custom_form_answers' &&
        k !== 'customFormAnswers' &&
        k !== 'form_answers'
      ) {
        if (!seenKeys.has(k)) {
          seenKeys.add(k);
          discoveredDynamicKeys.push(k);
        }
      }
    });

    // B. Nested Custom Form Answers
    const answersObj =
      row.answers || row.custom_form_answers || row.customFormAnswers || row.form_answers;
    if (answersObj && typeof answersObj === 'object') {
      if (Array.isArray(answersObj)) {
        answersObj.forEach((item: any) => {
          if (item && typeof item === 'object') {
            const qKey = item.question || item.label || item.key;
            if (qKey && !seenKeys.has(qKey)) {
              seenKeys.add(qKey);
              discoveredDynamicKeys.push(qKey);
            }
          }
        });
      } else {
        Object.keys(answersObj).forEach((qKey) => {
          if (qKey && !seenKeys.has(qKey)) {
            seenKeys.add(qKey);
            discoveredDynamicKeys.push(qKey);
          }
        });
      }
    }
  });

  // 3. Logical Column Ordering:
  // - Priority 1: Primary identification & applicant fields
  // - Priority 2: Standard predefined columns
  // - Priority 3: Discovered custom form questions
  // - Priority 4: Metadata & trailing status/date fields
  const primaryKeys = [
    'applicant_id',
    'id',
    'registration_code',
    'applicant_name',
    'full_name',
    'name',
    'applicant_email',
    'email',
    'applicant_phone',
    'phone',
    'opportunity_title',
    'primary_role',
    'role',
    'languages',
    'state',
    'city_district',
  ];

  const trailingKeys = [
    'status',
    'sync_status',
    'sheet_sync',
    'internal_scoring',
    'internal_notes',
    'admin_notes',
    'terms_accepted',
    'created_at',
    'applied_at',
    'subscribed_at',
    'updated_at',
  ];

  const orderedColumns: ColumnOption[] = [];
  const addedKeys = new Set<string>();

  // A. Add primary columns that exist or are declared
  primaryKeys.forEach((pk) => {
    if (seenKeys.has(pk) || candidateColumns.some((c) => c.key === pk)) {
      if (!addedKeys.has(pk)) {
        addedKeys.add(pk);
        const label =
          standardKeyMap.get(pk) ||
          pk
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, (char) => char.toUpperCase());
        orderedColumns.push({ key: pk, label });
      }
    }
  });

  // B. Add other predefined standard columns (excluding trailing)
  candidateColumns.forEach((c) => {
    if (!addedKeys.has(c.key) && !trailingKeys.includes(c.key)) {
      addedKeys.add(c.key);
      orderedColumns.push(c);
    }
  });

  // C. Add discovered dynamic custom form question keys
  discoveredDynamicKeys.forEach((k) => {
    if (!addedKeys.has(k) && !trailingKeys.includes(k)) {
      addedKeys.add(k);
      const label =
        standardKeyMap.get(k) ||
        (k.includes(' ') || k.includes('?')
          ? k
          : k
              .replace(/_/g, ' ')
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/\b\w/g, (char) => char.toUpperCase()));
      orderedColumns.push({ key: k, label });
    }
  });

  // D. Add trailing metadata columns
  trailingKeys.forEach((tk) => {
    if (seenKeys.has(tk) || candidateColumns.some((c) => c.key === tk)) {
      if (!addedKeys.has(tk)) {
        addedKeys.add(tk);
        const label =
          standardKeyMap.get(tk) ||
          tk
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, (char) => char.toUpperCase());
        orderedColumns.push({ key: tk, label });
      }
    }
  });

  // 4. Exclude columns that are completely empty across the active dataset
  const finalColumns = orderedColumns.filter((col) => isColumnNonEmpty(data, col.key));
  return finalColumns;
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
  sectionName: string = 'Data Export'
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
        maxLength = Math.min(val.length, 60); // Cap at 60 chars width
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
  headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  headerRow.height = 28;

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
    excelRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    excelRow.height = 22;

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
  sectionName: string = 'Data Export',
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
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ZENEMOO DATA SOLUTIONS', 12, 11);

  doc.setFontSize(8.5);
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.text(`${sectionName.toUpperCase()} — DATA EXPORT`, 12, 18);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'normal');
  const metaLine = `Scope: ${scopeText}${filterText} | Total: ${data.length} Record${data.length === 1 ? '' : 's'} | Columns: ${columns.length}`;
  const truncatedMeta = doc.getTextWidth(metaLine) > pageWidth - 24 ? metaLine.slice(0, 140) + '...' : metaLine;
  doc.text(truncatedMeta, 12, 24);

  // Right Date Stamp
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${todayStr}`, pageWidth - 12, 11, { align: 'right' });
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CONFIDENTIAL ADMINISTRATIVE DOCUMENT', pageWidth - 12, 17, { align: 'right' });

  // ── 2. Dynamic Table Sizing for Wide Column Sets ──
  const colCount = Math.max(1, columns.length);
  const dynamicFontSize = colCount > 20 ? 5 : colCount > 12 ? 6 : 7;
  const dynamicCellPadding = colCount > 20 ? 1 : colCount > 12 ? 1.5 : 2;

  const head = [columns.map((c) => c.label)];
  const body = data.map((row) =>
    columns.map((col) => formatFieldValue(row, col.key))
  );

  autoTable(doc, {
    head,
    body,
    startY: 32,
    margin: { left: 8, right: 8, top: 18, bottom: 16 },
    showHead: 'everyPage',
    styles: {
      fontSize: dynamicFontSize,
      cellPadding: dynamicCellPadding,
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
      fontSize: dynamicFontSize + 0.5,
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
        doc.rect(0, 0, pageWidth, 13, 'F');
        doc.setFillColor(6, 182, 212);
        doc.rect(0, 0, pageWidth, 1.5, 'F');

        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(`ZENEMOO — ${sectionName.toUpperCase()} (Continued)`, 12, 8.5);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${todayStr}`, pageWidth - 12, 8.5, { align: 'right' });
      }

      // ── Footer on Every Page ──
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(8, pageHeight - 11, pageWidth - 8, pageHeight - 11);

      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'ZENEMOO DATA SOLUTIONS • AI Language & Data Solutions • Confidential • Internal Administrative Export',
        12,
        pageHeight - 6
      );

      const pageNumberStr = `Page ${dataHook.pageNumber}`;
      doc.text(pageNumberStr, pageWidth - 12, pageHeight - 6, { align: 'right' });
    },
  });

  // Second pass: Calculate total page count for exact "Page X of Y" formatting
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - 36, pageHeight - 9, 28, 5, 'F');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 12, pageHeight - 6, { align: 'right' });
  }

  return doc.output('arraybuffer') as ArrayBuffer;
}

