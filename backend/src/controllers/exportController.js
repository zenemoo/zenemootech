import {
  EXPORT_CONFIGS,
  filterNonEmptyColumns,
  generateCSV,
  generateExcel,
  generatePDF,
} from '../services/exportService.js';
import { supabaseService } from '../services/supabaseService.js';
import { supabase } from '../config/supabase.js';

export const handleExportData = async (req, res, next) => {
  try {
    const { section, format = 'csv', columns = [], data = [], scope = 'all' } = req.body;

    if (!section || !EXPORT_CONFIGS[section]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unsupported data export section.',
      });
    }

    const config = EXPORT_CONFIGS[section];

    // 1. RBAC Verification
    const userRole = (req.user?.role || 'admin').toLowerCase();
    const isSuperAdmin = userRole === 'super_admin' || req.user?.email === 'mr.prem2006@gmail.com';
    const isAllowed = isSuperAdmin || config.allowedRoles.includes(userRole);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: `Role "${userRole}" is not authorized to export ${config.sectionName} data.`,
      });
    }

    // 2. Fetch or Validate Dataset
    let dataset = [];
    if (scope === 'filtered' && Array.isArray(data) && data.length > 0) {
      dataset = data;
    } else {
      try {
        dataset = await supabaseService.selectAll(config.tableName, 'created_at', false);
      } catch (err) {
        console.warn(`[Export Supabase Warning] Could not fetch ${config.tableName}:`, err.message);
        // Fallback fetch without order clause
        try {
          if (supabase) {
            const { data: dbData } = await supabase.from(config.tableName).select('*');
            dataset = dbData || [];
          }
        } catch (e2) {
          dataset = Array.isArray(data) ? data : [];
        }
      }
    }

    if (!Array.isArray(dataset)) dataset = [];

    // 3. Dynamic Column Inspection & Empty Column Filtering
    // Get full list of candidate columns from config or data structure
    let candidateColumns = config.defaultColumns;
    
    // Filter out columns that are 100% empty (null, undefined, "", whitespace-only) across dataset
    const nonEmptyCandidateCols = filterNonEmptyColumns(dataset, candidateColumns);

    // If specific columns requested, filter to match those requested keys
    let selectedColumns = nonEmptyCandidateCols;
    if (Array.isArray(columns) && columns.length > 0) {
      const colKeySet = new Set(columns);
      selectedColumns = nonEmptyCandidateCols.filter((col) => colKeySet.has(col.key));
    }

    // If no valid non-empty columns selected, fallback to non-empty candidates
    if (selectedColumns.length === 0) {
      selectedColumns = nonEmptyCandidateCols;
    }

    // 4. File Naming Construction (Zenemoo - Section Name - YYYY-MM-DD.ext)
    const todayStr = new Date().toISOString().split('T')[0];
    const cleanSectionName = config.sectionName.replace(/[^a-zA-Z0-9\s&_-]/g, '').trim();
    const targetFormat = (format || 'csv').toLowerCase();

    // 5. Audit Log Registration
    try {
      const auditLog = {
        event_type: 'DATA_EXPORT',
        email: req.user?.email || 'administrator@zenemoo.in',
        ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
        user_agent: req.headers['user-agent'] || 'unknown',
        details: {
          section: config.sectionName,
          format: targetFormat,
          records_exported: dataset.length,
          columns_exported: selectedColumns.length,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      };
      if (supabase) {
        await supabase.from('admin_audit_logs').insert([auditLog]);
      }
    } catch (auditErr) {
      console.warn('[Export Audit Log Warning]:', auditErr.message);
    }

    // 6. Format Generation & File Stream Response
    if (targetFormat === 'xlsx' || targetFormat === 'excel') {
      const buffer = await generateExcel(dataset, selectedColumns, config.sectionName);
      const filename = `Zenemoo - ${cleanSectionName} - ${todayStr}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(buffer);
    } else if (targetFormat === 'pdf') {
      const buffer = generatePDF(dataset, selectedColumns, config.sectionName);
      const filename = `Zenemoo - ${cleanSectionName} - ${todayStr}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(buffer);
    } else {
      // Default to CSV
      const csvString = generateCSV(dataset, selectedColumns, config.sectionName);
      const filename = `Zenemoo - ${cleanSectionName} - ${todayStr}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(csvString);
    }
  } catch (err) {
    console.error('[Data Export Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to generate the export. Please try again.',
    });
  }
};
