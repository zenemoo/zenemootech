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
      // 0. Universal D1 Gateway for Node.js Backend & Edge Services
      if ((pathname === '/api/invoices/query' || pathname === '/api/invoices/d1-query') && request.method === 'POST') {
        const secret = request.headers.get('x-zenemoo-secret') || request.headers.get('authorization');
        const expected = env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';
        if (secret !== expected && secret !== `Bearer ${expected}`) {
          return jsonResponse({ success: false, message: 'Unauthorized D1 Gateway call' }, 401);
        }

        const body = await request.json();
        const sql = String(body.sql || '').trim();
        const params = Array.isArray(body.params) ? body.params : [];

        if (!sql) {
          return jsonResponse({ success: false, message: 'Missing SQL statement' }, 400);
        }

        const stmt = env.DB.prepare(sql).bind(...params);
        if (/^\s*(SELECT|PRAGMA)/i.test(sql)) {
          const res = await stmt.all();
          return jsonResponse({
            success: true,
            results: res.results || [],
            meta: res.meta || {},
          });
        } else {
          const res = await stmt.run();
          return jsonResponse({
            success: true,
            results: res.results || [],
            meta: res.meta || {},
          });
        }
      }

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
          let row = await env.DB.prepare("SELECT * FROM invoice_settings WHERE id = 'settings_main' LIMIT 1").first();
          if (row) {
            // Auto-heal any legacy mock data
            if (row.pan_number === 'AABCP1234D' || !row.pan_number) {
              row.pan_number = 'IDWPP3025F';
            }
            if (row.udyam_registration === 'UDYAM-OD-00-1234567' || !row.udyam_registration) {
              row.udyam_registration = 'UDYAM-OD-11-0124893';
            }
            if (!row.signature_key || row.signature_key === 'signatures/sig_1792213558605_e32ac446.png') {
              row.signature_key = 'signatures/sig_1792217794390_f9e14249.png';
              row.signature_image_url = 'signatures/sig_1792217794390_f9e14249.png';
              row.signature_file_name = 'prem-signature.png';
            }
            if (!row.authorized_signatory_name || row.authorized_signatory_name === 'Prem Prasad') {
              row.authorized_signatory_name = 'Prem Prasad Pradhan';
            }
          }
          return jsonResponse({ success: true, data: row || {} });
        }
        if (request.method === 'PUT') {
          const b = await request.json();
          let pan = String(b.pan_number || '').trim().toUpperCase();
          if (pan === 'AABCP1234D' || !pan) pan = 'IDWPP3025F';

          let udyam = String(b.udyam_registration || '').trim().toUpperCase();
          if (udyam === 'UDYAM-OD-00-1234567' || !udyam) udyam = 'UDYAM-OD-11-0124893';

          const sigKey = b.signature_key || 'signatures/sig_1792217794390_f9e14249.png';
          const sigFileName = b.signature_file_name || 'prem-signature.png';

          const sql = `
            INSERT INTO invoice_settings (
              id, legal_name, display_name, registered_address, city, state, postal_code, country,
              official_email, contact_number, pan_number, udyam_registration, gstin,
              authorized_signatory_name, signature_key, signature_image_url, signature_file_name, signature_updated_at,
              default_currency, default_payment_terms, default_invoice_notes,
              default_tax_enabled, default_tax_label, default_tax_rate, updated_at, updated_by
            ) VALUES (
              'settings_main', ?, 'Zenemoo', ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, datetime('now'),
              ?, ?, ?,
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
              signature_key = COALESCE(NULLIF(excluded.signature_key, ''), invoice_settings.signature_key),
              signature_image_url = COALESCE(NULLIF(excluded.signature_image_url, ''), invoice_settings.signature_image_url),
              signature_file_name = COALESCE(NULLIF(excluded.signature_file_name, ''), invoice_settings.signature_file_name),
              signature_updated_at = COALESCE(NULLIF(excluded.signature_updated_at, ''), invoice_settings.signature_updated_at),
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
            b.registered_address || 'K. Barida, Main Road',
            b.city || 'Ganjam',
            b.state || 'Odisha',
            b.postal_code || '761031',
            b.country || 'India',
            b.official_email || 'contact@zenemoo.in',
            b.contact_number || '+91 9827775230',
            pan,
            udyam,
            b.gstin || '',
            b.authorized_signatory_name || 'Prem Prasad Pradhan',
            sigKey,
            sigKey,
            sigFileName,
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
          const { results } = await env.DB.prepare(`
            SELECT * FROM bank_accounts 
            WHERE ifsc_code NOT IN ('HDFC0001234', 'SBIN0001234')
              AND account_number NOT LIKE '%8374'
              AND id NOT IN ('7630cf65-19a1-4568-9051-4df1bdfb7e57', 'bank_acc_primary')
            ORDER BY is_default DESC, created_at ASC
          `).all();
          return jsonResponse({ success: true, data: results || [] });
        }
        if (request.method === 'POST') {
          const b = await request.json();
          const ifsc = String(b.ifsc_code || '').trim().toUpperCase();
          if (ifsc === 'HDFC0001234' || ifsc === 'SBIN0001234') {
            return jsonResponse({ success: false, message: 'Invalid bank details. Placeholder IFSC codes are prohibited.' }, 400);
          }
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
            b.account_holder_name || 'Prem Prasad Pradhan',
            b.bank_name,
            b.account_number,
            b.account_type || 'Savings',
            ifsc,
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

      // 7. Delete Invoice Endpoint
      const deleteMatch = pathname.match(/^\/api\/invoices\/([^/]+)$/);
      if (deleteMatch && request.method === 'DELETE') {
        const id = deleteMatch[1];
        await env.DB.prepare('DELETE FROM invoice_payments WHERE invoice_id = ?').bind(id).run();
        await env.DB.prepare('DELETE FROM invoices WHERE id = ? OR invoice_number = ?').bind(id, id).run();
        return jsonResponse({ success: true, message: 'Invoice deleted' });
      }

      return jsonResponse({ success: false, message: 'Endpoint not found' }, 404);
    } catch (err) {
      return jsonResponse({ success: false, message: err.message }, 500);
    }
  },
};
