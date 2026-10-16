/**
 * Zenemoo Cloudflare Worker — Native D1 & R2 Invoicing Backend
 * Bindings:
 * - env.DB: Cloudflare D1 Database (SQLite)
 * - env.INVOICE_BUCKET: Cloudflare R2 Bucket (Private PDF Storage)
 * - env.JWT_SECRET: JWT secret for admin token validation
 */

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

function handleCors() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleCors();
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\/api\/admin\/invoices/, '/api/invoices');

    // Health check
    if (pathname === '/health' || pathname === '/api/invoices/health') {
      return jsonResponse({
        status: 'healthy',
        service: 'zenemoo-invoice-worker',
        timestamp: new Date().toISOString(),
        d1Bound: Boolean(env.DB),
        r2Bound: Boolean(env.INVOICE_BUCKET),
      });
    }

    try {
      // 1. Metrics
      if (pathname === '/api/invoices/metrics' && request.method === 'GET') {
        const stmt = env.DB.prepare('SELECT status, total_amount, amount_paid, outstanding_balance, due_date FROM invoices');
        const { results } = await stmt.all();
        const rows = results || [];

        const today = new Date().toISOString().split('T')[0];
        let drafts = 0, issued = 0, paid = 0, cancelled = 0, overdue = 0;
        let totalRevenue = 0, totalOutstanding = 0;

        for (const inv of rows) {
          const total = Number(inv.total_amount) || 0;
          const amtPaid = Number(inv.amount_paid) || 0;
          const balance = Number(inv.outstanding_balance ?? (total - amtPaid));

          if (inv.status === 'draft') drafts++;
          else if (inv.status === 'issued' || inv.status === 'partially_paid') {
            issued++;
            totalOutstanding += Math.max(0, balance);
            totalRevenue += amtPaid;
            if (inv.due_date && inv.due_date < today && balance > 0) overdue++;
          } else if (inv.status === 'paid') {
            paid++;
            totalRevenue += total;
          } else if (inv.status === 'cancelled') {
            cancelled++;
          }
        }

        return jsonResponse({
          success: true,
          data: {
            totalInvoices: rows.length,
            drafts,
            issued,
            paid,
            cancelled,
            overdue,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalOutstanding: Math.round(totalOutstanding * 100) / 100,
          },
        });
      }

      // 2. Settings
      if (pathname === '/api/invoices/settings') {
        if (request.method === 'GET') {
          const row = await env.DB.prepare("SELECT * FROM invoice_settings WHERE id = 'settings_main' LIMIT 1").first();
          return jsonResponse({ success: true, data: row || {} });
        }
        if (request.method === 'PUT') {
          const b = await request.json();
          const sql = `
            INSERT INTO invoice_settings (
              id, legal_name, display_name, registered_address, city, state, postal_code, country,
              official_email, contact_number, pan_number, udyam_registration, gstin,
              authorized_signatory_name, default_currency, default_payment_terms, default_invoice_notes,
              default_tax_enabled, default_tax_label, default_tax_rate, updated_at, updated_by
            ) VALUES (
              'settings_main', ?, 'Zenemoo', ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, datetime('now'), ?
            )
            ON CONFLICT(id) DO UPDATE SET
              legal_name = excluded.legal_name,
              registered_address = excluded.registered_address,
              city = excluded.city,
              state = excluded.state,
              postal_code = excluded.postal_code,
              country = excluded.country,
              official_email = excluded.official_email,
              contact_number = excluded.contact_number,
              pan_number = excluded.pan_number,
              udyam_registration = excluded.udyam_registration,
              gstin = excluded.gstin,
              authorized_signatory_name = excluded.authorized_signatory_name,
              default_currency = excluded.default_currency,
              default_payment_terms = excluded.default_payment_terms,
              default_invoice_notes = excluded.default_invoice_notes,
              default_tax_enabled = excluded.default_tax_enabled,
              default_tax_label = excluded.default_tax_label,
              default_tax_rate = excluded.default_tax_rate,
              updated_at = datetime('now'),
              updated_by = excluded.updated_by;
          `;
          await env.DB.prepare(sql).bind(
            b.legal_name || 'Zenemoo',
            b.registered_address || '',
            b.city || '',
            b.state || '',
            b.postal_code || '',
            b.country || 'India',
            b.official_email || 'contact@zenemoo.in',
            b.contact_number || '',
            b.pan_number || '',
            b.udyam_registration || '',
            b.gstin || '',
            b.authorized_signatory_name || 'Prem Prasad',
            b.default_currency || 'INR',
            b.default_payment_terms || 'Net 15 Days',
            b.default_invoice_notes || '',
            b.default_tax_enabled ? 1 : 0,
            b.default_tax_label || 'GST',
            Number(b.default_tax_rate) || 0,
            'admin'
          ).run();

          const updated = await env.DB.prepare("SELECT * FROM invoice_settings WHERE id = 'settings_main'").first();
          return jsonResponse({ success: true, data: updated, message: 'Settings saved' });
        }
      }

      // 3. Banks
      if (pathname === '/api/invoices/banks') {
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM bank_accounts ORDER BY is_default DESC, created_at DESC').all();
          return jsonResponse({ success: true, data: results || [] });
        }
        if (request.method === 'POST') {
          const b = await request.json();
          const id = crypto.randomUUID();
          if (b.is_default) {
            await env.DB.prepare('UPDATE bank_accounts SET is_default = 0').run();
          }
          const sql = `
            INSERT INTO bank_accounts (
              id, account_display_name, account_holder_name, bank_name, account_number,
              account_type, ifsc_code, branch_name, branch_address, swift_bic_code,
              payment_instructions, is_active, is_default, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'));
          `;
          await env.DB.prepare(sql).bind(
            id,
            b.account_display_name,
            b.account_holder_name || 'Zenemoo',
            b.bank_name,
            b.account_number,
            b.account_type || 'Current',
            b.ifsc_code,
            b.branch_name || '',
            b.branch_address || '',
            b.swift_bic_code || '',
            b.payment_instructions || '',
            b.is_active !== false ? 1 : 0,
            b.is_default ? 1 : 0
          ).run();

          const created = await env.DB.prepare('SELECT * FROM bank_accounts WHERE id = ?').bind(id).first();
          return jsonResponse({ success: true, data: created, message: 'Bank account created' });
        }
      }

      // 4. Clients
      if (pathname === '/api/invoices/clients') {
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM invoice_clients ORDER BY company_name ASC').all();
          return jsonResponse({ success: true, data: results || [] });
        }
        if (request.method === 'POST') {
          const b = await request.json();
          const id = b.id || crypto.randomUUID();
          const sql = `
            INSERT INTO invoice_clients (
              id, company_name, contact_person, billing_email, phone, address,
              city, state, postal_code, country, pan_number, gstin, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              company_name = excluded.company_name,
              contact_person = excluded.contact_person,
              billing_email = excluded.billing_email,
              phone = excluded.phone,
              address = excluded.address,
              city = excluded.city,
              state = excluded.state,
              postal_code = excluded.postal_code,
              country = excluded.country,
              pan_number = excluded.pan_number,
              gstin = excluded.gstin,
              notes = excluded.notes,
              updated_at = datetime('now');
          `;
          await env.DB.prepare(sql).bind(
            id,
            b.company_name,
            b.contact_person || '',
            b.billing_email,
            b.phone || '',
            b.address || '',
            b.city || '',
            b.state || '',
            b.postal_code || '',
            b.country || 'India',
            b.pan_number || '',
            b.gstin || '',
            b.notes || ''
          ).run();

          const saved = await env.DB.prepare('SELECT * FROM invoice_clients WHERE id = ?').bind(id).first();
          return jsonResponse({ success: true, data: saved, message: 'Client details saved' });
        }
      }

      // 5. Invoices List
      if (pathname === '/api/invoices' && request.method === 'GET') {
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get('pageSize') || '15', 10)));
        const offset = (page - 1) * pageSize;
        const status = url.searchParams.get('status');

        let sql = 'SELECT * FROM invoices';
        let countSql = 'SELECT COUNT(*) as total FROM invoices';
        const params = [];

        if (status && status !== 'all') {
          sql += ' WHERE status = ?';
          countSql += ' WHERE status = ?';
          params.push(status);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const countRes = await env.DB.prepare(countSql).bind(...params).first();
        const total = countRes?.total || 0;

        const { results } = await env.DB.prepare(sql).bind(...params, pageSize, offset).all();
        const items = (results || []).map((row) => ({
          ...row,
          line_items: JSON.parse(row.line_items || '[]'),
          client_snapshot: JSON.parse(row.client_snapshot || '{}'),
          company_snapshot: JSON.parse(row.company_snapshot || '{}'),
          bank_snapshot: JSON.parse(row.bank_snapshot || '{}'),
        }));

        return jsonResponse({
          success: true,
          data: items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        });
      }

      // 6. PDF Retrieval from R2
      const pdfMatch = pathname.match(/^\/api\/invoices\/([^/]+)\/pdf$/);
      if (pdfMatch && request.method === 'GET') {
        const id = pdfMatch[1];
        const invoice = await env.DB.prepare('SELECT * FROM invoices WHERE id = ? OR invoice_number = ? LIMIT 1').bind(id, id).first();
        if (!invoice) {
          return jsonResponse({ success: false, message: 'Invoice not found' }, 404);
        }

        const storageKey = invoice.pdf_storage_key || `invoices/${invoice.invoice_number}.pdf`;
        const object = await env.INVOICE_BUCKET.get(storageKey);

        if (!object) {
          return jsonResponse({ success: false, message: 'PDF not found in R2 storage' }, 404);
        }

        return new Response(object.body, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return jsonResponse({ success: false, message: 'Endpoint not found' }, 404);
    } catch (err) {
      return jsonResponse({ success: false, message: err.message }, 500);
    }
  },
};
