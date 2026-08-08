import {
  EXPORT_CONFIGS,
  filterNonEmptyColumns,
  getRecordValue,
  generateCSV,
  generateExcel,
  generatePDF,
} from '../services/exportService.js';
import { supabaseService } from '../services/supabaseService.js';
import { supabase } from '../config/supabase.js';

/**
 * Fetch authorized section records from Supabase database with resilience fallbacks
 */
export const fetchSectionDataset = async (section, clientData = []) => {
  const config = EXPORT_CONFIGS[section];
  if (!config) return Array.isArray(clientData) ? clientData : [];

  let dbData = [];

  try {
    if (section === 'users-rbac' || section === 'rbac') {
      try {
        const userAccounts = await supabaseService.selectAll('user_accounts');
        let roster = [];
        try {
          roster = await supabaseService.selectAll('team');
        } catch (_) {}

        if (Array.isArray(userAccounts) && userAccounts.length > 0) {
          const rosterMap = new Map((roster || []).map((m) => [m.id, m]));
          dbData = userAccounts.map((acc) => {
            const m = rosterMap.get(acc.team_member_id) || {};
            return {
              id: acc.id,
              team_member_id: acc.team_member_id,
              name: m.name || acc.name || 'User Account',
              email: acc.email || m.email || '',
              employee_id: m.employee_id || (m.id ? `ZNM-${m.id.substring(0, 5).toUpperCase()}` : ''),
              designation: m.designation || 'Specialist',
              department: m.department || 'Engineering',
              role: acc.role || 'team_member',
              status: acc.status || 'active',
              email_access: acc.email_access ? 'Granted' : 'Restricted',
              created_at: acc.created_at || m.created_at || new Date().toISOString(),
            };
          });
        }
      } catch (e) {}
    } else if (section === 'team-directory' || section === 'directory') {
      try {
        dbData = await supabaseService.selectAll('team_directory', 'created_at', false);
      } catch (e) {
        try {
          dbData = await supabaseService.selectAll('team', 'position', true);
        } catch (e2) {}
      }
    } else if (section === 'team-roster' || section === 'team') {
      try {
        dbData = await supabaseService.selectAll('team', 'position', true);
      } catch (e) {
        try {
          dbData = await supabaseService.selectAll('team_roster', 'created_at', false);
        } catch (e2) {}
      }
    } else if (section === 'newsletter' || section === 'subscribers') {
      try {
        dbData = await supabaseService.selectAll('newsletter_subscribers', 'created_at', false);
      } catch (e) {
        try {
          dbData = await supabaseService.selectAll('subscribers', 'created_at', false);
        } catch (e2) {}
      }
    } else if (section === 'contact-inquiries' || section === 'inquiries') {
      try {
        dbData = await supabaseService.selectAll('contact_inquiries', 'created_at', false);
      } catch (e) {
        try {
          dbData = await supabaseService.selectAll('contacts', 'created_at', false);
        } catch (e2) {}
      }
    }
  } catch (err) {
    console.warn(`[Export Dataset Fetch Warning for ${section}]:`, err.message);
  }

  // Fallback to client-passed active dataset if DB returns empty
  if (!Array.isArray(dbData) || dbData.length === 0) {
    if (Array.isArray(clientData) && clientData.length > 0) {
      return clientData;
    }
  }

  return Array.isArray(dbData) && dbData.length > 0 ? dbData : (Array.isArray(clientData) ? clientData : []);
};

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
      dataset = await fetchSectionDataset(section, data);
    }

    if (!Array.isArray(dataset)) dataset = [];

    // 3. Dynamic Column Inspection & Empty Column Filtering
    let candidateColumns = config.defaultColumns;
    const nonEmptyCandidateCols = filterNonEmptyColumns(dataset, candidateColumns);

    let selectedColumns = nonEmptyCandidateCols;
    if (Array.isArray(columns) && columns.length > 0) {
      const colKeySet = new Set(columns);
      selectedColumns = nonEmptyCandidateCols.filter((col) => colKeySet.has(col.key));
    }

    if (selectedColumns.length === 0) {
      selectedColumns = config.defaultColumns;
    }

    // 4. File Naming Construction
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
