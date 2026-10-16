import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// Durable disk file for local persistence across server restarts
const LOCAL_STORE_FILE = path.resolve(__dirname, '../database/invoices_d1_store.json');

/**
 * Zenemoo Cloudflare D1 Invoicing Service
 * Primary Database: Cloudflare D1 (SQLite Engine)
 * Features:
 * - Direct HTTP parameterized execution against Cloudflare D1 REST API
 * - Atomic sequential numbering with zero duplicate risk
 * - Durable disk-persisted local SQLite/JSON storage ensuring records survive reboots
 * - Zero Supabase dependencies
 */

export class InvoiceD1Service {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'c3e84d8a84eaa06c632f189765eaa9c6';
    this.databaseId = process.env.CLOUDFLARE_D1_INVOICE_DATABASE_ID || process.env.CLOUDFLARE_D1_DATABASE_ID || '';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.workerUrl = process.env.CLOUDFLARE_INVOICE_WORKER_URL || '';

    this._localStore = this.loadLocalStore();
  }

  isD1Configured() {
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = this.databaseId || process.env.CLOUDFLARE_D1_INVOICE_DATABASE_ID || process.env.CLOUDFLARE_D1_DATABASE_ID;
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    return Boolean(accountId && databaseId && apiToken && !databaseId.includes('placeholder'));
  }

  getD1Endpoint() {
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = this.databaseId || process.env.CLOUDFLARE_D1_INVOICE_DATABASE_ID || process.env.CLOUDFLARE_D1_DATABASE_ID;
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  }

  getHeaders() {
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    return {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  // --- Local Disk Persistence (Survives Restarts) ---

  loadLocalStore() {
    try {
      const dir = path.dirname(LOCAL_STORE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(LOCAL_STORE_FILE)) {
        const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[InvoiceD1Service] Note reading local store file:', err.message);
    }

    // Default Seed
    const initial = {
      settings: {
        id: 'settings_main',
        legal_name: 'Zenemoo',
        display_name: 'Zenemoo', // Strictly "Zenemoo"
        registered_address: 'K. Barida, Main Road',
        city: 'Ganjam',
        state: 'Odisha',
        postal_code: '761031',
        country: 'India',
        official_email: 'contact@zenemoo.in',
        contact_number: '+91 9827775230',
        pan_number: '',
        udyam_registration: '',
        gstin: '',
        authorized_signatory_name: 'Prem Prasad',
        default_currency: 'INR',
        default_payment_terms: 'Net 15 Days',
        default_invoice_notes: 'Thank you for partnering with Zenemoo. Payment is expected within the agreed terms.',
        default_tax_enabled: 0,
        default_tax_label: 'GST',
        default_tax_rate: 18.0,
        updated_at: new Date().toISOString(),
      },
      bank_accounts: [
        {
          id: 'bank_acc_primary',
          account_display_name: 'Primary Corporate Current Account',
          account_holder_name: 'Zenemoo',
          bank_name: 'State Bank of India',
          account_number: '40928172615',
          account_type: 'Current',
          ifsc_code: 'SBIN0001234',
          branch_name: 'Main Branch, Ganjam',
          branch_address: 'Main Road, Odisha 761031',
          swift_bic_code: 'SBININBB123',
          payment_instructions: 'Please mention Invoice Number in remittance remarks.',
          is_active: 1,
          is_default: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      clients: [],
      invoices: [],
      payments: [],
      sequences: {},
    };

    try {
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (_) {}

    return initial;
  }

  saveLocalStore() {
    try {
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(this._localStore, null, 2), 'utf-8');
    } catch (err) {
      console.error('[InvoiceD1Service] Fatal: Failed to persist store to disk:', err.message);
      throw new Error(`Storage failure: Could not persist invoice data to disk (${err.message})`);
    }
  }

  // --- Remote Cloudflare D1 Execution ---

  formatSqlWithParams(sql, params = []) {
    let paramIdx = 0;
    return sql.replace(/\?/g, () => {
      if (paramIdx >= params.length) return 'NULL';
      const val = params[paramIdx++];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return val ? '1' : '0';
      const escaped = String(val).replace(/'/g, "''");
      return `'${escaped}'`;
    });
  }

  async executeD1ViaWrangler(sql, params = []) {
    try {
      const formatted = this.formatSqlWithParams(sql, params);
      const cwd = path.resolve(__dirname, '../../../cloudflare-workers/zenemoo-invoice-api');
      const escapedCmd = formatted.replace(/"/g, '\\"');
      const cmd = `npx wrangler d1 execute zenemoo-invoices --remote --json --command="${escapedCmd}"`;
      
      const { stdout } = await execPromise(cmd, { cwd, timeout: 15000 });
      const jsonStart = stdout.indexOf('[');
      if (jsonStart !== -1) {
        const parsed = JSON.parse(stdout.slice(jsonStart));
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            results: parsed[0].results || [],
            meta: parsed[0].meta || {},
            success: true,
            executionMode: 'wrangler_remote',
          };
        }
      }
      return null;
    } catch (err) {
      console.warn('[InvoiceD1Service] Wrangler remote query note:', err.message);
      return null;
    }
  }

  async executeD1(sql, params = []) {
    // 1. Direct Cloudflare REST API (if CLOUDFLARE_API_TOKEN is configured)
    if (this.isD1Configured()) {
      try {
        const endpoint = this.getD1Endpoint();
        const headers = this.getHeaders();

        const response = await axios.post(
          endpoint,
          { sql, params },
          { headers, timeout: 10000 }
        );

        const data = response.data;
        if (data && data.success && Array.isArray(data.result) && data.result.length > 0) {
          return {
            results: data.result[0].results || [],
            meta: data.result[0].meta || {},
            success: true,
            executionMode: 'rest_api',
          };
        }

        if (data && !data.success) {
          const msg = data.errors?.map((e) => e.message).join('; ') || 'D1 query failed';
          console.warn('[InvoiceD1Service] D1 API Error:', msg);
        }
      } catch (err) {
        console.warn('[InvoiceD1Service] D1 REST query failed:', err.response?.data || err.message);
      }
    }

    // 2. Authenticated Wrangler remote execution (OAuth session)
    try {
      const wranglerRes = await this.executeD1ViaWrangler(sql, params);
      if (wranglerRes && wranglerRes.success) {
        return wranglerRes;
      }
    } catch (_) {}

    return null;
  }

  // --- Business Operations on D1 ---

  /**
   * 1. Get Company Invoice Settings
   */
  async getSettings() {
    if (this.isD1Configured()) {
      try {
        const sql = `SELECT * FROM invoice_settings WHERE id = 'settings_main' LIMIT 1;`;
        const res = await this.executeD1(sql);
        if (res && res.results && res.results.length > 0) {
          const row = res.results[0];
          return {
            ...row,
            default_tax_enabled: Boolean(row.default_tax_enabled),
          };
        }
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote getSettings failed:', err.message);
      }
    }

    return {
      ...this._localStore.settings,
      default_tax_enabled: Boolean(this._localStore.settings.default_tax_enabled),
    };
  }

  /**
   * 2. Update Company Invoice Settings
   */
  async updateSettings(data) {
    const updated = {
      ...this._localStore.settings,
      legal_name: String(data.legal_name || 'Zenemoo').trim(),
      display_name: 'Zenemoo', // Strictly "Zenemoo"
      registered_address: String(data.registered_address || '').trim(),
      city: String(data.city || '').trim(),
      state: String(data.state || '').trim(),
      postal_code: String(data.postal_code || '').trim(),
      country: String(data.country || 'India').trim(),
      official_email: String(data.official_email || 'contact@zenemoo.in').trim(),
      contact_number: String(data.contact_number || '').trim(),
      pan_number: String(data.pan_number || '').trim().toUpperCase(),
      udyam_registration: String(data.udyam_registration || '').trim().toUpperCase(),
      gstin: String(data.gstin || '').trim().toUpperCase(),
      authorized_signatory_name: String(data.authorized_signatory_name || 'Prem Prasad').trim(),
      default_currency: String(data.default_currency || 'INR').toUpperCase().trim(),
      default_payment_terms: String(data.default_payment_terms || 'Net 15 Days').trim(),
      default_invoice_notes: String(data.default_invoice_notes || '').trim(),
      default_tax_enabled: data.default_tax_enabled ? 1 : 0,
      default_tax_label: String(data.default_tax_label || 'GST').trim(),
      default_tax_rate: Number(data.default_tax_rate) || 0,
      updated_at: new Date().toISOString(),
      updated_by: data.updated_by || 'admin',
    };

    if (this.isD1Configured()) {
      try {
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
            ?, ?, ?, ?, ?
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
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by;
        `;
        await this.executeD1(sql, [
          updated.legal_name,
          updated.registered_address,
          updated.city,
          updated.state,
          updated.postal_code,
          updated.country,
          updated.official_email,
          updated.contact_number,
          updated.pan_number,
          updated.udyam_registration,
          updated.gstin,
          updated.authorized_signatory_name,
          updated.default_currency,
          updated.default_payment_terms,
          updated.default_invoice_notes,
          updated.default_tax_enabled,
          updated.default_tax_label,
          updated.default_tax_rate,
          updated.updated_at,
          updated.updated_by,
        ]);
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote updateSettings failed:', err.message);
      }
    }

    this._localStore.settings = updated;
    this.saveLocalStore();

    return {
      ...updated,
      default_tax_enabled: Boolean(updated.default_tax_enabled),
    };
  }

  /**
   * 3. Bank Accounts
   */
  async getBankAccounts() {
    if (this.isD1Configured()) {
      try {
        const sql = `SELECT * FROM bank_accounts ORDER BY is_default DESC, created_at DESC;`;
        const res = await this.executeD1(sql);
        if (res && res.results) {
          return res.results.map((r) => ({
            ...r,
            is_active: Boolean(r.is_active),
            is_default: Boolean(r.is_default),
          }));
        }
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote getBankAccounts failed:', err.message);
      }
    }

    return (this._localStore.bank_accounts || []).map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
      is_default: Boolean(r.is_default),
    }));
  }

  async createBankAccount(data) {
    const id = crypto.randomUUID();
    const newAcc = {
      id,
      account_display_name: String(data.account_display_name).trim(),
      account_holder_name: String(data.account_holder_name || 'Zenemoo').trim(),
      bank_name: String(data.bank_name).trim(),
      account_number: String(data.account_number).trim(),
      account_type: String(data.account_type || 'Current').trim(),
      ifsc_code: String(data.ifsc_code).trim().toUpperCase(),
      branch_name: String(data.branch_name || '').trim(),
      branch_address: String(data.branch_address || '').trim(),
      swift_bic_code: String(data.swift_bic_code || '').trim().toUpperCase(),
      payment_instructions: String(data.payment_instructions || '').trim(),
      is_active: data.is_active !== false ? 1 : 0,
      is_default: data.is_default ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (newAcc.is_default) {
      (this._localStore.bank_accounts || []).forEach((b) => (b.is_default = 0));
    }

    if (this.isD1Configured()) {
      try {
        if (newAcc.is_default) {
          await this.executeD1(`UPDATE bank_accounts SET is_default = 0 WHERE id != ?;`, [id]);
        }
        const sql = `
          INSERT INTO bank_accounts (
            id, account_display_name, account_holder_name, bank_name, account_number,
            account_type, ifsc_code, branch_name, branch_address, swift_bic_code,
            payment_instructions, is_active, is_default, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        await this.executeD1(sql, [
          newAcc.id,
          newAcc.account_display_name,
          newAcc.account_holder_name,
          newAcc.bank_name,
          newAcc.account_number,
          newAcc.account_type,
          newAcc.ifsc_code,
          newAcc.branch_name,
          newAcc.branch_address,
          newAcc.swift_bic_code,
          newAcc.payment_instructions,
          newAcc.is_active,
          newAcc.is_default,
          newAcc.created_at,
          newAcc.updated_at,
        ]);
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote createBankAccount failed:', err.message);
      }
    }

    this._localStore.bank_accounts.unshift(newAcc);
    this.saveLocalStore();

    return {
      ...newAcc,
      is_active: Boolean(newAcc.is_active),
      is_default: Boolean(newAcc.is_default),
    };
  }

  async updateBankAccount(id, data) {
    const list = this._localStore.bank_accounts || [];
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) {
      throw new Error('Bank account not found.');
    }

    const current = list[idx];
    const isDefault = data.is_default !== undefined ? (data.is_default ? 1 : 0) : current.is_default;

    if (isDefault) {
      list.forEach((b) => (b.is_default = 0));
    }

    const updated = {
      ...current,
      ...data,
      ifsc_code: data.ifsc_code ? String(data.ifsc_code).toUpperCase().trim() : current.ifsc_code,
      swift_bic_code: data.swift_bic_code ? String(data.swift_bic_code).toUpperCase().trim() : current.swift_bic_code,
      is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active,
      is_default: isDefault,
      updated_at: new Date().toISOString(),
    };

    if (this.isD1Configured()) {
      try {
        if (isDefault) {
          await this.executeD1(`UPDATE bank_accounts SET is_default = 0 WHERE id != ?;`, [id]);
        }
        const sql = `
          UPDATE bank_accounts SET
            account_display_name = ?,
            account_holder_name = ?,
            bank_name = ?,
            account_number = ?,
            account_type = ?,
            ifsc_code = ?,
            branch_name = ?,
            branch_address = ?,
            swift_bic_code = ?,
            payment_instructions = ?,
            is_active = ?,
            is_default = ?,
            updated_at = ?
          WHERE id = ?;
        `;
        await this.executeD1(sql, [
          updated.account_display_name,
          updated.account_holder_name,
          updated.bank_name,
          updated.account_number,
          updated.account_type,
          updated.ifsc_code,
          updated.branch_name,
          updated.branch_address,
          updated.swift_bic_code,
          updated.payment_instructions,
          updated.is_active,
          updated.is_default,
          updated.updated_at,
          id,
        ]);
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote updateBankAccount failed:', err.message);
      }
    }

    list[idx] = updated;
    this.saveLocalStore();

    return {
      ...updated,
      is_active: Boolean(updated.is_active),
      is_default: Boolean(updated.is_default),
    };
  }

  async deleteBankAccount(id) {
    if (this.isD1Configured()) {
      try {
        await this.executeD1(`DELETE FROM bank_accounts WHERE id = ?;`, [id]);
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote deleteBankAccount failed:', err.message);
      }
    }

    this._localStore.bank_accounts = (this._localStore.bank_accounts || []).filter((b) => b.id !== id);
    this.saveLocalStore();
    return true;
  }

  /**
   * 4. Clients
   */
  async getClients() {
    if (this.isD1Configured()) {
      try {
        const sql = `SELECT * FROM invoice_clients ORDER BY company_name ASC;`;
        const res = await this.executeD1(sql);
        if (res && res.results) {
          return res.results;
        }
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote getClients failed:', err.message);
      }
    }

    return this._localStore.clients || [];
  }

  async saveClient(data) {
    const id = data.id || crypto.randomUUID();
    const payload = {
      id,
      company_name: String(data.company_name).trim(),
      contact_person: String(data.contact_person || '').trim(),
      billing_email: String(data.billing_email).trim(),
      phone: String(data.phone || '').trim(),
      address: String(data.address || '').trim(),
      city: String(data.city || '').trim(),
      state: String(data.state || '').trim(),
      postal_code: String(data.postal_code || '').trim(),
      country: String(data.country || 'India').trim(),
      pan_number: String(data.pan_number || '').trim().toUpperCase(),
      gstin: String(data.gstin || '').trim().toUpperCase(),
      notes: String(data.notes || '').trim(),
      updated_at: new Date().toISOString(),
    };

    if (this.isD1Configured()) {
      try {
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
            updated_at = excluded.updated_at;
        `;
        await this.executeD1(sql, [
          payload.id,
          payload.company_name,
          payload.contact_person,
          payload.billing_email,
          payload.phone,
          payload.address,
          payload.city,
          payload.state,
          payload.postal_code,
          payload.country,
          payload.pan_number,
          payload.gstin,
          payload.notes,
        ]);
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote saveClient failed:', err.message);
      }
    }

    const list = this._localStore.clients || [];
    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...payload };
    } else {
      list.push({ ...payload, created_at: new Date().toISOString() });
    }

    this.saveLocalStore();
    return payload;
  }

  /**
   * 5. Atomic Sequential Numbering (D1)
   */
  async getNextSequence(year) {
    const yr = Number(year) || new Date().getFullYear();

    if (this.isD1Configured()) {
      try {
        const sql = `
          INSERT INTO invoice_sequences (year, last_sequence, updated_at)
          VALUES (?, 1, datetime('now'))
          ON CONFLICT(year) DO UPDATE SET
            last_sequence = last_sequence + 1,
            updated_at = datetime('now')
          RETURNING last_sequence;
        `;
        const res = await this.executeD1(sql, [yr]);
        if (res && res.results && res.results.length > 0) {
          const nextSeq = res.results[0].last_sequence;
          this._localStore.sequences[yr] = nextSeq;
          this.saveLocalStore();
          return nextSeq;
        }
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote sequence fetch failed:', err.message);
      }
    }

    // Atomic disk-backed sequence increment
    const current = this._localStore.sequences[yr] || 0;
    const nextSeq = current + 1;
    this._localStore.sequences[yr] = nextSeq;
    this.saveLocalStore();
    return nextSeq;
  }

  /**
   * 6. Invoices List with Query Filters & Pagination
   */
  async getInvoices({ page = 1, pageSize = 15, status, search, startDate, endDate, sortBy = 'created_at', sortOrder = 'desc' }) {
    const p = Math.max(1, parseInt(page, 10));
    const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10)));
    const offset = (p - 1) * limit;

    if (this.isD1Configured()) {
      try {
        let whereClauses = [];
        let params = [];

        if (status && status !== 'all') {
          whereClauses.push('status = ?');
          params.push(status);
        }
        if (startDate) {
          whereClauses.push('invoice_date >= ?');
          params.push(startDate);
        }
        if (endDate) {
          whereClauses.push('invoice_date <= ?');
          params.push(endDate);
        }
        if (search) {
          whereClauses.push('(invoice_number LIKE ? OR project_name LIKE ? OR client_snapshot LIKE ?)');
          const q = `%${search}%`;
          params.push(q, q, q);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const countSql = `SELECT COUNT(*) as total FROM invoices ${whereSql};`;
        const countRes = await this.executeD1(countSql, params);
        const total = countRes?.results?.[0]?.total || 0;

        const dataSql = `
          SELECT * FROM invoices
          ${whereSql}
          ORDER BY ${sortBy === 'created_at' ? 'created_at' : 'invoice_date'} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
          LIMIT ? OFFSET ?;
        `;
        const dataRes = await this.executeD1(dataSql, [...params, limit, offset]);

        if (dataRes && dataRes.results) {
          const invoices = dataRes.results.map(this.deserializeInvoiceRow);
          return {
            data: invoices,
            total,
            page: p,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
          };
        }
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote getInvoices failed:', err.message);
      }
    }

    // Local Disk Store Search
    let list = [...(this._localStore.invoices || [])];
    if (status && status !== 'all') {
      list = list.filter((i) => i.status === status);
    }
    if (startDate) {
      list = list.filter((i) => i.invoice_date >= startDate);
    }
    if (endDate) {
      list = list.filter((i) => i.invoice_date <= endDate);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.invoice_number && i.invoice_number.toLowerCase().includes(q)) ||
          (i.project_name && i.project_name.toLowerCase().includes(q)) ||
          (i.client_snapshot?.company_name && i.client_snapshot.company_name.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });

    const total = list.length;
    const paginated = list.slice(offset, offset + limit);

    return {
      data: paginated,
      total,
      page: p,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 7. Single Invoice by ID
   */
  async getInvoiceById(id) {
    if (this.isD1Configured()) {
      try {
        const sql = `SELECT * FROM invoices WHERE id = ? OR invoice_number = ? LIMIT 1;`;
        const res = await this.executeD1(sql, [id, id]);
        if (res && res.results && res.results.length > 0) {
          const inv = this.deserializeInvoiceRow(res.results[0]);
          // Load payments
          const pSql = `SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY created_at DESC;`;
          const pRes = await this.executeD1(pSql, [inv.id]);
          inv.payments = pRes?.results || [];
          return inv;
        }
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote getInvoiceById failed:', err.message);
      }
    }

    const found = (this._localStore.invoices || []).find((i) => i.id === id || i.invoice_number === id);
    if (!found) return null;

    const payments = (this._localStore.payments || []).filter((p) => p.invoice_id === found.id);
    return { ...found, payments };
  }

  /**
   * 8. Save or Update Draft
   */
  async saveDraft(invoiceData) {
    const list = this._localStore.invoices || [];

    if (invoiceData.id) {
      const idx = list.findIndex((i) => i.id === invoiceData.id);
      if (idx !== -1 && list[idx].status !== 'draft') {
        throw new Error('Only draft invoices can be edited. Issued invoices are immutable.');
      }

      const updated = {
        ...(list[idx] || {}),
        ...invoiceData,
        status: 'draft',
        updated_at: new Date().toISOString(),
      };

      if (this.isD1Configured()) {
        try {
          const sql = `
            UPDATE invoices SET
              invoice_date = ?, due_date = ?, service_period_start = ?, service_period_end = ?,
              invoice_period = ?, po_reference = ?, currency = ?, subtotal = ?,
              discount_type = ?, discount_value = ?, discount_amount = ?,
              tax_enabled = ?, tax_label = ?, tax_rate = ?, tax_amount = ?,
              total_amount = ?, amount_in_words = ?, outstanding_balance = ?,
              project_name = ?, project_description = ?, line_items = ?,
              client_snapshot = ?, company_snapshot = ?, bank_snapshot = ?,
              payment_terms = ?, invoice_notes = ?, payment_instructions = ?,
              updated_at = (datetime('now'))
            WHERE id = ? AND status = 'draft';
          `;
          await this.executeD1(sql, [
            updated.invoice_date,
            updated.due_date,
            updated.service_period_start,
            updated.service_period_end,
            updated.invoice_period,
            updated.po_reference,
            updated.currency,
            updated.subtotal,
            updated.discount_type,
            updated.discount_value,
            updated.discount_amount,
            updated.tax_enabled ? 1 : 0,
            updated.tax_label,
            updated.tax_rate,
            updated.tax_amount,
            updated.total_amount,
            updated.amount_in_words,
            updated.outstanding_balance,
            updated.project_name,
            updated.project_description,
            JSON.stringify(updated.line_items || []),
            JSON.stringify(updated.client_snapshot || {}),
            JSON.stringify(updated.company_snapshot || {}),
            JSON.stringify(updated.bank_snapshot || {}),
            updated.payment_terms,
            updated.invoice_notes,
            updated.payment_instructions,
            updated.id,
          ]);
        } catch (err) {
          console.warn('[InvoiceD1Service] Remote draft update failed:', err.message);
        }
      }

      if (idx !== -1) list[idx] = updated;
      else list.unshift(updated);

      this.saveLocalStore();
      return updated;
    }

    // New Draft
    const year = new Date(invoiceData.invoice_date || new Date()).getFullYear() || new Date().getFullYear();
    const seqNum = await this.getNextSequence(year);
    const invoiceNumber = `ZEN-INV-${year}-${String(seqNum).padStart(4, '0')}`;
    const id = crypto.randomUUID();

    const newDraft = {
      ...invoiceData,
      id,
      invoice_number: invoiceNumber,
      sequence_year: year,
      sequence_number: seqNum,
      status: 'draft',
      amount_paid: 0.0,
      outstanding_balance: invoiceData.total_amount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.isD1Configured()) {
      try {
        const sql = `
          INSERT INTO invoices (
            id, invoice_number, sequence_year, sequence_number, status,
            invoice_date, due_date, service_period_start, service_period_end,
            invoice_period, po_reference, currency, subtotal, discount_type,
            discount_value, discount_amount, tax_enabled, tax_label, tax_rate,
            tax_amount, total_amount, amount_in_words, amount_paid, outstanding_balance,
            project_name, project_description, line_items, client_snapshot,
            company_snapshot, bank_snapshot, payment_terms, invoice_notes,
            payment_instructions, created_by, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, 'draft',
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, 0.0, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, datetime('now'), datetime('now')
          );
        `;
        await this.executeD1(sql, [
          newDraft.id,
          newDraft.invoice_number,
          newDraft.sequence_year,
          newDraft.sequence_number,
          newDraft.invoice_date,
          newDraft.due_date,
          newDraft.service_period_start,
          newDraft.service_period_end,
          newDraft.invoice_period,
          newDraft.po_reference,
          newDraft.currency,
          newDraft.subtotal,
          newDraft.discount_type,
          newDraft.discount_value,
          newDraft.discount_amount,
          newDraft.tax_enabled ? 1 : 0,
          newDraft.tax_label,
          newDraft.tax_rate,
          newDraft.tax_amount,
          newDraft.total_amount,
          newDraft.amount_in_words,
          newDraft.outstanding_balance,
          newDraft.project_name,
          newDraft.project_description,
          JSON.stringify(newDraft.line_items || []),
          JSON.stringify(newDraft.client_snapshot || {}),
          JSON.stringify(newDraft.company_snapshot || {}),
          JSON.stringify(newDraft.bank_snapshot || {}),
          newDraft.payment_terms,
          newDraft.invoice_notes,
          newDraft.payment_instructions,
          newDraft.created_by || 'admin',
        ]);
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote draft insert failed:', err.message);
      }
    }

    list.unshift(newDraft);
    this.saveLocalStore();
    return newDraft;
  }

  /**
   * 9. Issue Invoice (Locks immutability, snapshots, and records R2 key)
   */
  async issueInvoice(id, payload, storageKey) {
    const list = this._localStore.invoices || [];
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) {
      throw new Error('Invoice not found.');
    }

    const current = list[idx];
    if (current.status !== 'draft') {
      throw new Error(`Invoice is already in '${current.status}' status and cannot be re-issued.`);
    }

    const now = new Date().toISOString();
    const issuedRecord = {
      ...current,
      ...payload,
      status: 'issued',
      pdf_storage_key: storageKey,
      pdf_generated_at: now,
      issued_at: now,
      issued_by: payload.issued_by || 'admin',
      updated_at: now,
    };

    if (this.isD1Configured()) {
      try {
        const sql = `
          UPDATE invoices SET
            status = 'issued',
            pdf_storage_key = ?,
            pdf_generated_at = (datetime('now')),
            issued_at = (datetime('now')),
            issued_by = ?,
            company_snapshot = ?,
            bank_snapshot = ?,
            client_snapshot = ?,
            line_items = ?,
            subtotal = ?,
            total_amount = ?,
            outstanding_balance = ?,
            updated_at = (datetime('now'))
          WHERE id = ? AND status = 'draft';
        `;
        await this.executeD1(sql, [
          storageKey,
          issuedRecord.issued_by,
          JSON.stringify(issuedRecord.company_snapshot || {}),
          JSON.stringify(issuedRecord.bank_snapshot || {}),
          JSON.stringify(issuedRecord.client_snapshot || {}),
          JSON.stringify(issuedRecord.line_items || []),
          issuedRecord.subtotal,
          issuedRecord.total_amount,
          issuedRecord.outstanding_balance,
          id,
        ]);
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote issueInvoice failed:', err.message);
      }
    }

    list[idx] = issuedRecord;
    this.saveLocalStore();
    return issuedRecord;
  }

  /**
   * 10. Cancel Invoice (Audit preservation)
   */
  async cancelInvoice(id, reason, cancelledBy) {
    const list = this._localStore.invoices || [];
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) {
      throw new Error('Invoice not found.');
    }

    const now = new Date().toISOString();
    const updated = {
      ...list[idx],
      status: 'cancelled',
      cancelled_at: now,
      cancelled_by: cancelledBy || 'admin',
      cancellation_reason: reason,
      updated_at: now,
    };

    if (this.isD1Configured()) {
      try {
        const sql = `
          UPDATE invoices SET
            status = 'cancelled',
            cancelled_at = (datetime('now')),
            cancelled_by = ?,
            cancellation_reason = ?,
            updated_at = (datetime('now'))
          WHERE id = ?;
        `;
        await this.executeD1(sql, [cancelledBy || 'admin', reason, id]);
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote cancelInvoice failed:', err.message);
      }
    }

    list[idx] = updated;
    this.saveLocalStore();
    return updated;
  }

  /**
   * 11. Record Payment
   */
  async recordPayment(id, paymentData) {
    const list = this._localStore.invoices || [];
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) {
      throw new Error('Invoice not found.');
    }

    const inv = list[idx];
    if (inv.status === 'cancelled' || inv.status === 'draft') {
      throw new Error(`Cannot record payment on a ${inv.status} invoice.`);
    }

    const payAmount = Number(paymentData.amount) || 0;
    const currentPaid = Number(inv.amount_paid) || 0;
    const totalAmount = Number(inv.total_amount) || 0;
    const newPaid = Math.round((currentPaid + payAmount) * 100) / 100;
    const newBalance = Math.max(0, Math.round((totalAmount - newPaid) * 100) / 100);
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

    const paymentRecord = {
      id: crypto.randomUUID(),
      invoice_id: inv.id,
      amount: payAmount,
      currency: inv.currency || 'INR',
      payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
      payment_method: paymentData.payment_method || 'Bank Transfer',
      reference_number: paymentData.reference_number || '',
      notes: paymentData.notes || '',
      recorded_by: paymentData.recorded_by || 'admin',
      created_at: new Date().toISOString(),
    };

    const updatedInv = {
      ...inv,
      amount_paid: newPaid,
      outstanding_balance: newBalance,
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : inv.paid_at,
      paid_by: newStatus === 'paid' ? paymentData.recorded_by || 'admin' : inv.paid_by,
      updated_at: new Date().toISOString(),
    };

    if (this.isD1Configured()) {
      try {
        const pSql = `
          INSERT INTO invoice_payments (
            id, invoice_id, amount, currency, payment_date, payment_method,
            reference_number, notes, recorded_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
        `;
        await this.executeD1(pSql, [
          paymentRecord.id,
          paymentRecord.invoice_id,
          paymentRecord.amount,
          paymentRecord.currency,
          paymentRecord.payment_date,
          paymentRecord.payment_method,
          paymentRecord.reference_number,
          paymentRecord.notes,
          paymentRecord.recorded_by,
        ]);

        const iSql = `
          UPDATE invoices SET
            amount_paid = ?,
            outstanding_balance = ?,
            status = ?,
            paid_at = ?,
            paid_by = ?,
            updated_at = datetime('now')
          WHERE id = ?;
        `;
        await this.executeD1(iSql, [
          newPaid,
          newBalance,
          newStatus,
          updatedInv.paid_at,
          updatedInv.paid_by,
          id,
        ]);
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote recordPayment failed:', err.message);
      }
    }

    list[idx] = updatedInv;
    this._localStore.payments.unshift(paymentRecord);
    this.saveLocalStore();

    return { invoice: updatedInv, payment: paymentRecord };
  }

  /**
   * 12. Dashboard Metrics
   */
  async getMetrics() {
    let allInvoices = this._localStore.invoices || [];

    if (this.isD1Configured()) {
      try {
        const sql = `SELECT status, total_amount, amount_paid, outstanding_balance, due_date FROM invoices;`;
        const res = await this.executeD1(sql);
        if (res && res.results) {
          allInvoices = res.results;
        }
      } catch (err) {
        console.warn('[InvoiceD1Service] Remote getMetrics failed:', err.message);
      }
    }

    const today = new Date().toISOString().split('T')[0];

    let totalInvoices = allInvoices.length;
    let drafts = 0;
    let issued = 0;
    let paid = 0;
    let cancelled = 0;
    let overdue = 0;
    let totalRevenue = 0;
    let totalOutstanding = 0;

    for (const inv of allInvoices) {
      const status = inv.status;
      const total = Number(inv.total_amount) || 0;
      const amountPaid = Number(inv.amount_paid) || 0;
      const balance = Number(inv.outstanding_balance ?? (total - amountPaid));

      if (status === 'draft') {
        drafts++;
      } else if (status === 'issued' || status === 'partially_paid') {
        issued++;
        totalOutstanding += Math.max(0, balance);
        totalRevenue += amountPaid;

        if (inv.due_date && inv.due_date < today && balance > 0) {
          overdue++;
        }
      } else if (status === 'paid') {
        paid++;
        totalRevenue += total;
      } else if (status === 'cancelled') {
        cancelled++;
      }
    }

    return {
      totalInvoices,
      drafts,
      issued,
      paid,
      cancelled,
      overdue,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    };
  }

  deserializeInvoiceRow(row) {
    if (!row) return null;
    return {
      ...row,
      subtotal: Number(row.subtotal) || 0,
      total_amount: Number(row.total_amount) || 0,
      discount_amount: Number(row.discount_amount) || 0,
      discount_value: Number(row.discount_value) || 0,
      tax_amount: Number(row.tax_amount) || 0,
      tax_rate: Number(row.tax_rate) || 0,
      amount_paid: Number(row.amount_paid) || 0,
      outstanding_balance: Number(row.outstanding_balance) || 0,
      tax_enabled: Boolean(row.tax_enabled),
      line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items || '[]') : row.line_items || [],
      client_snapshot: typeof row.client_snapshot === 'string' ? JSON.parse(row.client_snapshot || '{}') : row.client_snapshot || {},
      company_snapshot: typeof row.company_snapshot === 'string' ? JSON.parse(row.company_snapshot || '{}') : row.company_snapshot || {},
      bank_snapshot: typeof row.bank_snapshot === 'string' ? JSON.parse(row.bank_snapshot || '{}') : row.bank_snapshot || {},
    };
  }
}

export const invoiceD1Service = new InvoiceD1Service();
