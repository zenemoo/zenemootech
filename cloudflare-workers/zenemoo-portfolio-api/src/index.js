/**
 * Zenemoo Company Portfolio API Cloudflare Worker
 * Storage: Cloudflare R2 (zenemoo-portfolio-storage -> env.PORTFOLIO_BUCKET)
 * Database: Cloudflare D1 (zenemoo-portfolio -> env.DB)
 * 
 * Features:
 * - Direct R2 binary storage with $0 egress
 * - D1 single-row metadata lifecycle (id = 'company_portfolio_main')
 * - Safe atomic upload/replacement (upload new -> verify -> update D1 -> delete old)
 * - Soft deletion in D1 with hard removal in R2
 * - Native WebCrypto JWT authentication & RBAC authorization
 * - Strict CORS, HTTP 206 partial range streaming support
 * - Zero Render/Supabase dependencies
 */

const ALLOWED_ADMIN_EMAILS = new Set([
  'prem@zenemoo.in',
  'contact@zenemoo.in',
  'support@zenemoo.in',
  'info@zenemoo.in',
  'noreply@zenemoo.in',
  'zenemootech@gmail.com',
  'mr.prem2006@gmail.com',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

// --- CORS & JSON Helpers ---

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = (
    env.CORS_ORIGIN ||
    'https://zenemoo.in,https://www.zenemoo.in,https://web.zenemoo.in,https://app.zenemoo.in,http://localhost:5173,http://localhost:3000,http://localhost:5000'
  )
    .split(',')
    .map((o) => o.trim());

  let matchedOrigin = allowedOrigins[0] || 'https://zenemoo.in';
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    matchedOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': matchedOrigin,
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range, Accept-Ranges, X-Requested-With',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length, Content-Type, ETag',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function errorResponse(message, status = 400, headers = {}) {
  return jsonResponse({ success: false, message }, status, headers);
}

// --- JWT Verification (Native WebCrypto HS256) ---

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = new TextDecoder().decode(base64UrlDecode(parts[1]));
    return JSON.parse(payloadJson);
  } catch (_) {
    return null;
  }
}

async function verifyHs256Signature(token, secret) {
  try {
    if (!token || !secret) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const encoder = new TextEncoder();
    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2]);

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    return await crypto.subtle.verify('HMAC', key, signature, data);
  } catch (err) {
    console.warn('[Portfolio JWT Verification Error]:', err.message);
    return false;
  }
}

async function authenticateAdmin(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or malformed Authorization header', status: 401 };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { error: 'Empty bearer token', status: 401 };
  }

  const jwtSecret = env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';
  const isSignatureValid = await verifyHs256Signature(token, jwtSecret);
  const payload = parseJwtPayload(token);

  if (!payload) {
    return { error: 'Invalid token format', status: 401 };
  }

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    return { error: 'Session token has expired. Please log in again.', status: 401 };
  }

  if (env.JWT_SECRET && !isSignatureValid) {
    return { error: 'Unauthorized: Invalid token signature', status: 401 };
  }

  const email = (payload.email || '').toLowerCase().trim();
  const role = (payload.role || '').toLowerCase();

  const isAdminRole = ['admin', 'super_admin', 'administrator', 'superadmin', 'root'].includes(role);
  const isAllowedEmail = ALLOWED_ADMIN_EMAILS.has(email) || email.endsWith('@zenemoo.in');

  if (!isAdminRole && !isAllowedEmail) {
    return { error: 'Access Denied: Insufficient administrator permissions', status: 403 };
  }

  return { admin: { id: payload.id, email, role: payload.role } };
}

// --- D1 Table Initialization Helper ---

async function ensureTableInitialized(db) {
  if (!db) return;
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
    await db.prepare(createTableSql).run();
    await db.prepare(createIndexSql).run();
  } catch (err) {
    console.warn('[D1 Table Init Note]:', err.message);
  }
}

function buildPublicUrl(env, r2Key) {
  const cdnBase = (env.PUBLIC_CDN_BASE_URL || 'https://cdn.zenemoo.in').replace(/\/+$/, '');
  const cleanKey = (r2Key || '').replace(/^\/+/, '');
  return `${cdnBase}/${cleanKey}`;
}

function formatPortfolioPayload(row, env) {
  if (!row || row.status === 'deleted') return null;
  const fileSize = Number(row.file_size_bytes) || 0;

  return {
    id: row.id || 'company_portfolio_main',
    title: 'Zenemoo Official Company Portfolio',
    filename: row.filename || 'zenemoo-company-portfolio.pdf',
    original_filename: row.filename || 'zenemoo-company-portfolio.pdf',
    file_size_bytes: fileSize,
    file_size_formatted: formatBytes(fileSize),
    public_url: row.public_url || buildPublicUrl(env, row.r2_key),
    r2_key: row.r2_key,
    storage_provider: 'cloudflare_r2',
    is_published: row.status === 'active',
    status: row.status || 'active',
    page_count: Number(row.page_count) || 0,
    last_action: row.last_action || 'uploaded',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    deleted_at: row.deleted_at || null,
    deleted_by: row.deleted_by || null,
  };
}

// --- Main Worker Fetch Handler ---

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = getCorsHeaders(request, env);

    // 1. Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    try {
      // 2. Health check
      if (pathname === '/health' || pathname === '/api/health') {
        await ensureTableInitialized(env.DB);
        return jsonResponse(
          {
            status: 'ok',
            service: 'zenemoo-portfolio-api',
            storage: 'Cloudflare R2 (zenemoo-portfolio-storage)',
            database: 'Cloudflare D1 (zenemoo-portfolio)',
            timestamp: new Date().toISOString(),
          },
          200,
          corsHeaders
        );
      }

      // Ensure D1 and R2 bindings exist
      if (!env.DB || !env.PORTFOLIO_BUCKET) {
        console.error('[Configuration Error] env.DB or env.PORTFOLIO_BUCKET binding missing');
        return errorResponse('Internal Server Error: Cloudflare R2 or D1 binding not configured', 500, corsHeaders);
      }

      // ==========================================
      // PUBLIC ENDPOINTS
      // ==========================================

      // 3. GET / or GET /portfolio or GET /api/portfolio — Fetch active published portfolio metadata
      if ((pathname === '/' || pathname === '/portfolio' || pathname === '/api/portfolio') && request.method === 'GET') {
        await ensureTableInitialized(env.DB);

        const sql = `
          SELECT id, filename, r2_key, public_url, file_size_bytes, page_count, status, created_at, updated_at, deleted_at, deleted_by, last_action
          FROM company_portfolio
          WHERE id = 'company_portfolio_main' AND status = 'active'
          LIMIT 1;
        `;

        const row = await env.DB.prepare(sql).first();
        if (row && row.status === 'active') {
          return jsonResponse({ success: true, data: formatPortfolioPayload(row, env) }, 200, corsHeaders);
        }

        return jsonResponse({ success: true, data: null }, 200, corsHeaders);
      }

      // 4. GET /stream/:key — Direct streaming with range request support fallback
      if (pathname.startsWith('/stream/') && (request.method === 'GET' || request.method === 'HEAD')) {
        const key = decodeURIComponent(pathname.replace(/^\/stream\//, ''));
        if (!key) return errorResponse('Object key is required', 400, corsHeaders);

        const rangeHeader = request.headers.get('Range');
        const object = await env.PORTFOLIO_BUCKET.get(key, {
          range: rangeHeader || undefined,
          onlyIf: request.headers,
        });

        if (!object) {
          return new Response('Portfolio PDF object not found', { status: 404, headers: corsHeaders });
        }

        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Content-Type', 'application/pdf');
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        const status = object.range ? 206 : 200;
        return new Response(request.method === 'HEAD' ? null : object.body, {
          status,
          headers,
        });
      }

      // ==========================================
      // ADMIN ENDPOINTS
      // ==========================================

      // 5. GET /admin or GET /api/portfolio/admin — Fetch current state for Admin Dashboard
      if ((pathname === '/admin' || pathname === '/api/portfolio/admin') && request.method === 'GET') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        await ensureTableInitialized(env.DB);

        const sql = `
          SELECT id, filename, r2_key, public_url, file_size_bytes, page_count, status, created_at, updated_at, deleted_at, deleted_by, last_action
          FROM company_portfolio
          WHERE id = 'company_portfolio_main'
          LIMIT 1;
        `;

        const row = await env.DB.prepare(sql).first();
        if (row) {
          const fileSize = Number(row.file_size_bytes) || 0;
          return jsonResponse(
            {
              success: true,
              data: {
                id: row.id || 'company_portfolio_main',
                title: 'Zenemoo Official Company Portfolio',
                filename: row.filename,
                original_filename: row.filename,
                file_size_bytes: fileSize,
                file_size_formatted: formatBytes(fileSize),
                public_url: row.public_url || buildPublicUrl(env, row.r2_key),
                r2_key: row.r2_key,
                storage_provider: 'cloudflare_r2',
                is_published: row.status === 'active',
                status: row.status,
                page_count: Number(row.page_count) || 0,
                last_action: row.last_action,
                created_at: row.created_at,
                updated_at: row.updated_at,
                deleted_at: row.deleted_at,
                deleted_by: row.deleted_by,
              },
            },
            200,
            corsHeaders
          );
        }

        return jsonResponse({ success: true, data: null }, 200, corsHeaders);
      }

      // 6. POST /upload or POST /api/portfolio/upload — Safe Atomic Upload/Replace
      if (
        (pathname === '/upload' || pathname === '/api/portfolio/upload' || pathname === '/api/portfolio' || pathname === '/') &&
        (request.method === 'POST' || request.method === 'PUT')
      ) {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        await ensureTableInitialized(env.DB);

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
          return errorResponse('Please provide a valid PDF file to upload (maximum 15 MB).', 400, corsHeaders);
        }

        const fileName = file.name || 'zenemoo-company-portfolio.pdf';
        const fileMime = (file.type || '').toLowerCase();
        const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
        const fileExt = extMatch ? extMatch[1].toLowerCase() : '';

        if (fileExt !== 'pdf' && !ALLOWED_MIME_TYPES.has(fileMime)) {
          return errorResponse('Invalid file format. Only PDF files (.pdf) are accepted.', 400, corsHeaders);
        }

        const fileBuffer = await file.arrayBuffer();
        if (fileBuffer.byteLength > MAX_FILE_SIZE) {
          return errorResponse('File exceeds maximum limit of 15 MB.', 400, corsHeaders);
        }

        // Check if previous record exists to determine if replacement
        const existingRow = await env.DB.prepare(
          "SELECT r2_key, status FROM company_portfolio WHERE id = 'company_portfolio_main' LIMIT 1"
        ).first();

        const oldR2Key = existingRow && existingRow.status === 'active' ? existingRow.r2_key : null;
        const isReplacement = Boolean(oldR2Key);

        const timestamp = Date.now();
        const newR2Key = `company/portfolio/zenemoo-company-portfolio-${timestamp}.pdf`;
        const publicUrl = buildPublicUrl(env, newR2Key);

        // Step 1: Upload to R2 Bucket
        await env.PORTFOLIO_BUCKET.put(newR2Key, fileBuffer, {
          httpMetadata: {
            contentType: 'application/pdf',
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });

        // Step 2: Verify uploaded object
        const head = await env.PORTFOLIO_BUCKET.head(newR2Key);
        if (!head || head.size !== fileBuffer.byteLength) {
          await env.PORTFOLIO_BUCKET.delete(newR2Key);
          return errorResponse('Cloudflare R2 object verification failed after upload.', 500, corsHeaders);
        }

        const now = new Date().toISOString();
        const lastAction = isReplacement ? 'replaced' : 'uploaded';
        const pageCount = parseInt(formData.get('page_count') || '0', 10) || 0;

        // Step 3: Upsert single D1 row
        const upsertSql = `
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

        try {
          await env.DB.prepare(upsertSql)
            .bind(fileName, newR2Key, publicUrl, fileBuffer.byteLength, pageCount, now, now, lastAction)
            .run();
        } catch (d1Err) {
          // Cleanup newly uploaded R2 object on D1 error
          await env.PORTFOLIO_BUCKET.delete(newR2Key);
          return errorResponse(`Failed to update portfolio metadata in D1: ${d1Err.message}`, 500, corsHeaders);
        }

        // Step 4: Safely delete previous R2 object only after new upload and D1 succeed
        if (oldR2Key && oldR2Key !== newR2Key) {
          try {
            await env.PORTFOLIO_BUCKET.delete(oldR2Key);
          } catch (delErr) {
            console.warn('[Portfolio] Previous R2 object cleanup note:', delErr.message);
          }
        }

        const responsePayload = {
          id: 'company_portfolio_main',
          title: 'Zenemoo Official Company Portfolio',
          filename: fileName,
          original_filename: fileName,
          file_size_bytes: fileBuffer.byteLength,
          file_size_formatted: formatBytes(fileBuffer.byteLength),
          public_url: publicUrl,
          r2_key: newR2Key,
          storage_provider: 'cloudflare_r2',
          is_published: true,
          status: 'active',
          page_count: pageCount,
          last_action: lastAction,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
        };

        return jsonResponse(
          {
            success: true,
            message: `Company portfolio PDF ${isReplacement ? 'replaced' : 'uploaded'} and published successfully.`,
            data: responsePayload,
          },
          200,
          corsHeaders
        );
      }

      // 7. PATCH /status or PATCH /api/portfolio/status — Toggle published status
      if ((pathname === '/status' || pathname === '/api/portfolio/status') && request.method === 'PATCH') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const body = await request.json().catch(() => ({}));
        const isPublished = Boolean(body?.is_published ?? body?.isPublished);
        const nextStatus = isPublished ? 'active' : 'deleted';
        const now = new Date().toISOString();

        await env.DB.prepare(
          "UPDATE company_portfolio SET status = ?, updated_at = ? WHERE id = 'company_portfolio_main'"
        )
          .bind(nextStatus, now)
          .run();

        return jsonResponse(
          {
            success: true,
            message: `Portfolio is now ${isPublished ? 'Published' : 'Unpublished'}.`,
            is_published: isPublished,
            status: nextStatus,
          },
          200,
          corsHeaders
        );
      }

      // 8. DELETE / or DELETE /api/portfolio — Soft delete in D1 & hard delete in R2
      if ((pathname === '/' || pathname === '/portfolio' || pathname === '/api/portfolio') && request.method === 'DELETE') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const row = await env.DB.prepare(
          "SELECT r2_key FROM company_portfolio WHERE id = 'company_portfolio_main' LIMIT 1"
        ).first();

        if (row && row.r2_key) {
          try {
            await env.PORTFOLIO_BUCKET.delete(row.r2_key);
          } catch (r2Err) {
            console.warn('[Portfolio] R2 delete object note:', r2Err.message);
          }
        }

        const now = new Date().toISOString();
        const adminEmail = auth.admin.email || 'admin@zenemoo.in';

        await env.DB.prepare(
          "UPDATE company_portfolio SET status = 'deleted', last_action = 'deleted', deleted_at = ?, deleted_by = ?, updated_at = ? WHERE id = 'company_portfolio_main'"
        )
          .bind(now, adminEmail, now)
          .run();

        return jsonResponse(
          {
            success: true,
            message: 'Company portfolio removed successfully from public website.',
            data: null,
          },
          200,
          corsHeaders
        );
      }

      return jsonResponse({ success: false, message: `Endpoint ${pathname} not found` }, 404, corsHeaders);
    } catch (err) {
      console.error('[Portfolio Worker Unhandled Error]:', err.message);
      return errorResponse(err.message || 'Internal Server Error', 500, corsHeaders);
    }
  },
};
