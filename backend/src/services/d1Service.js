import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cloudflare D1 HTTP REST Service
 * Communicates directly with Cloudflare D1 database: zenemoo-portfolio
 * Uses parameterized queries with zero SQL injection risk and explicit column selection.
 */

class D1Service {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || '';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
  }

  getEndpoint() {
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = this.databaseId || process.env.CLOUDFLARE_D1_DATABASE_ID;
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  }

  getHeaders() {
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    return {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  isConfigured() {
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = this.databaseId || process.env.CLOUDFLARE_D1_DATABASE_ID;
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    return Boolean(accountId && databaseId && apiToken);
  }

  /**
   * Executes a parameterized SQL statement against Cloudflare D1
   * @param {string} sql - Parameterized SQL query
   * @param {Array<any>} params - Array of parameter values
   * @returns {Promise<{ results: Array<any>, meta: Object, success: boolean }>}
   */
  async execute(sql, params = []) {
    if (!this.isConfigured()) {
      console.warn('[D1Service] Cloudflare D1 credentials not fully configured in environment (ACCOUNT_ID, D1_DATABASE_ID, API_TOKEN).');
      return { results: [], meta: {}, success: false };
    }

    try {
      const endpoint = this.getEndpoint();
      const headers = this.getHeaders();

      const response = await axios.post(
        endpoint,
        {
          sql,
          params,
        },
        {
          headers,
          timeout: 10000,
        }
      );

      const data = response.data;
      if (data && data.success && Array.isArray(data.result) && data.result.length > 0) {
        const queryResult = data.result[0];
        return {
          results: queryResult.results || [],
          meta: queryResult.meta || {},
          success: true,
        };
      }

      if (data && !data.success) {
        const errMsg = data.errors?.map((e) => e.message).join('; ') || 'D1 API returned unsuccessful response';
        throw new Error(errMsg);
      }

      return { results: [], meta: {}, success: true };
    } catch (err) {
      console.error('[D1Service Query Error]:', err.response?.data || err.message);
      throw err;
    }
  }

  /**
   * Initializes the company_portfolio table if not exists
   */
  async initTable() {
    if (!this.isConfigured()) return;

    const createTableSql = `
      CREATE TABLE IF NOT EXISTS company_portfolio (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        r2_key TEXT NOT NULL,
        public_url TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        page_count INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        deleted_by TEXT,
        last_action TEXT NOT NULL DEFAULT 'uploaded' CHECK (last_action IN ('uploaded', 'replaced', 'deleted'))
      );
    `;

    const createIndexSql = `
      CREATE INDEX IF NOT EXISTS idx_company_portfolio_status ON company_portfolio(status);
    `;

    try {
      await this.execute(createTableSql);
      await this.execute(createIndexSql);
      console.log('✅ [D1Service] company_portfolio table verified/initialized in Cloudflare D1.');
    } catch (err) {
      console.warn('⚠️ [D1Service initTable Note]:', err.message);
    }
  }

  /**
   * Fetch active published portfolio for public visitors
   */
  async getActivePortfolio() {
    const sql = `
      SELECT id, filename, r2_key, public_url, file_size_bytes, page_count, status, created_at, updated_at, deleted_at, deleted_by, last_action
      FROM company_portfolio
      WHERE id = 'company_portfolio_main' AND status = 'active'
      LIMIT 1;
    `;

    const { results } = await this.execute(sql);
    return results && results.length > 0 ? results[0] : null;
  }

  /**
   * Fetch current portfolio for Admin Dashboard regardless of status
   */
  async getAdminPortfolio() {
    const sql = `
      SELECT id, filename, r2_key, public_url, file_size_bytes, page_count, status, created_at, updated_at, deleted_at, deleted_by, last_action
      FROM company_portfolio
      WHERE id = 'company_portfolio_main'
      LIMIT 1;
    `;

    const { results } = await this.execute(sql);
    return results && results.length > 0 ? results[0] : null;
  }

  /**
   * Atomically upserts portfolio record in D1 single-row architecture
   */
  async upsertPortfolio({ filename, r2Key, publicUrl, fileSizeBytes, pageCount = 0, lastAction = 'uploaded' }) {
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO company_portfolio (
        id, filename, r2_key, public_url, file_size_bytes, page_count, status, created_at, updated_at, deleted_at, deleted_by, last_action
      ) VALUES (
        'company_portfolio_main', ?, ?, ?, ?, ?, 'active', ?, ?, NULL, NULL, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        filename = excluded.filename,
        r2_key = excluded.r2_key,
        public_url = excluded.public_url,
        file_size_bytes = excluded.file_size_bytes,
        page_count = excluded.page_count,
        status = 'active',
        updated_at = excluded.updated_at,
        deleted_at = NULL,
        deleted_by = NULL,
        last_action = excluded.last_action;
    `;

    await this.execute(sql, [
      filename,
      r2Key,
      publicUrl,
      fileSizeBytes,
      pageCount,
      now,
      now,
      lastAction,
    ]);

    return this.getAdminPortfolio();
  }

  /**
   * Marks portfolio as deleted in D1 without removing the database row
   */
  async markDeleted({ adminEmail = 'admin@zenemoo.in' } = {}) {
    const now = new Date().toISOString();

    const sql = `
      UPDATE company_portfolio SET
        status = 'deleted',
        last_action = 'deleted',
        deleted_at = ?,
        deleted_by = ?,
        updated_at = ?
      WHERE id = 'company_portfolio_main';
    `;

    await this.execute(sql, [now, adminEmail, now]);
    return this.getAdminPortfolio();
  }

  /**
   * Toggles active / unpublished status
   */
  async updateStatus(status) {
    const now = new Date().toISOString();
    const sql = `
      UPDATE company_portfolio SET
        status = ?,
        updated_at = ?
      WHERE id = 'company_portfolio_main';
    `;

    await this.execute(sql, [status, now]);
    return this.getAdminPortfolio();
  }
}

export const d1Service = new D1Service();
