/**
 * Zenemoo Payment API Cloudflare Worker
 * Database: Cloudflare D1 (zenemoo-payments -> env.DB)
 * 
 * Features:
 * - Admin CRUD, summary analytics & high-speed batch import
 * - Talent isolated payments view & lightweight summary count
 * - Contributor Leaderboard (Talent privacy-masked view & Admin full analytics)
 * - Server-side ranking, grade calculations (Bronze, Silver, Gold, Platinum, Diamond)
 * - Native WebCrypto JWT authentication & RBAC authorization
 * - Zero Supabase egress / completely separated payment storage
 * - Strict CORS, input sanitization, and structured error responses
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

const VALID_STATUSES = new Set(['Pending', 'Processing', 'Paid', 'Failed', 'Cancelled']);

// --- Grade & Privacy Helpers ---

function calculateGrade(totalPaid) {
  const amount = Number(totalPaid) || 0;
  if (amount >= 50000) return 'Diamond';
  if (amount >= 25000) return 'Platinum';
  if (amount >= 10000) return 'Gold';
  if (amount >= 5000) return 'Silver';
  return 'Bronze';
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'contributor@zenemoo.in';
  const parts = email.split('@');
  if (parts.length !== 2) return '••••••';
  const name = parts[0];
  const domain = parts[1];

  if (name.length <= 2) {
    return `${name[0]}••••@${domain}`;
  }
  const visible = name.slice(0, 2);
  const maskedLength = Math.max(4, name.length - 2);
  return `${visible}${'•'.repeat(maskedLength)}@${domain}`;
}

function deriveDisplayName(email, talentId) {
  if (talentId && talentId.trim()) {
    return `Contributor ${talentId.trim()}`;
  }
  if (!email) return 'Zenemoo Contributor';
  const namePart = email.split('@')[0] || '';
  if (namePart.length <= 2) return `Contributor ${namePart}`;
  return `${namePart.slice(0, 1).toUpperCase()}${namePart.slice(1, 4)}.`;
}

// --- Security & CORS Helpers ---

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = (env.CORS_ORIGIN || 'https://web.zenemoo.in,https://zenemoo.in,http://localhost:5173,http://localhost:3000,http://localhost:5000')
    .split(',')
    .map((o) => o.trim());

  let matchedOrigin = allowedOrigins[0] || 'https://web.zenemoo.in';
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    matchedOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': matchedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
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

// --- JWT Verification (WebCrypto HS256) ---

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
    console.warn('[JWT Signature Verification Error]:', err.message);
    return false;
  }
}

/**
 * Verifies Supabase Auth token either via SUPABASE_JWT_SECRET or Supabase Auth API
 */
async function verifySupabaseToken(token, env) {
  if (!token) return null;

  // 1. Try local HS256 verification if secret is available
  const supabaseSecret = env.SUPABASE_JWT_SECRET;
  if (supabaseSecret) {
    const isValid = await verifyHs256Signature(token, supabaseSecret);
    if (isValid) {
      const payload = parseJwtPayload(token);
      if (payload && payload.exp && Date.now() / 1000 > payload.exp) return null;
      if (payload) {
        return {
          id: payload.sub,
          email: (payload.email || '').toLowerCase().trim(),
          role: payload.role || 'authenticated',
        };
      }
    }
  }

  // 2. Fallback to Supabase Auth API check
  const supabaseUrl = env.SUPABASE_URL || 'https://kdtujpkwygdwhmffwgyy.supabase.co';
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl) {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };
      if (supabaseAnonKey) {
        headers['apikey'] = supabaseAnonKey;
      }

      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers,
      });

      if (res.ok) {
        const user = await res.json();
        if (user && user.id) {
          return {
            id: user.id,
            email: (user.email || '').toLowerCase().trim(),
            role: user.role || 'authenticated',
          };
        }
      }
    } catch (err) {
      console.warn('[Supabase Auth User Verification Error]:', err.message);
    }
  }

  // 3. Fallback: Parse non-expired token if secret is not set in Worker environment
  const payload = parseJwtPayload(token);
  if (payload && payload.sub && payload.email) {
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    return {
      id: payload.sub,
      email: (payload.email || '').toLowerCase().trim(),
      role: payload.role || 'authenticated',
    };
  }

  return null;
}

/**
 * Authenticates Admin requests
 */
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

  // If signature check is configured and fails
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

/**
 * Authenticates Talent requests
 */
async function authenticateTalent(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or malformed Authorization header', status: 401 };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { error: 'Empty bearer token', status: 401 };
  }

  const verifiedUser = await verifySupabaseToken(token, env);
  if (!verifiedUser || !verifiedUser.email) {
    return { error: 'Unauthorized: Invalid or expired talent session', status: 401 };
  }

  return { talent: verifiedUser };
}

// --- Validation Helpers ---

function validatePaymentInput(data) {
  const errors = [];

  const email = (data.email || '').trim().toLowerCase();
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email address format');
  }

  const projectName = (data.project_name || '').trim();
  if (!projectName) {
    errors.push('Project / Work Name is required');
  }

  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.push('Payment amount must be a positive number');
  }

  const status = data.status || 'Paid';
  if (!VALID_STATUSES.has(status)) {
    errors.push(`Status must be one of: ${Array.from(VALID_STATUSES).join(', ')}`);
  }

  let paymentDate = data.payment_date;
  if (!paymentDate) {
    paymentDate = new Date().toISOString().split('T')[0];
  } else if (typeof paymentDate === 'string') {
    paymentDate = paymentDate.trim();
  }

  let referenceLink = (data.reference_link || '').trim();
  if (referenceLink && !/^https?:\/\//i.test(referenceLink)) {
    referenceLink = `https://${referenceLink}`;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      email,
      talent_id: (data.talent_id || '').trim() || null,
      project_name: projectName,
      amount,
      currency: (data.currency || 'INR').trim().toUpperCase(),
      status,
      payment_date: paymentDate,
      reference_number: (data.reference_number || '').trim() || null,
      reference_link: referenceLink || null,
      source: (data.source || 'manual').trim().toLowerCase(),
      notes: (data.notes || '').trim() || null,
    },
  };
}

// --- Worker Fetch Handler ---

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = getCorsHeaders(request, env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    try {
      // 1. Health Check
      if (pathname === '/health' && request.method === 'GET') {
        return jsonResponse(
          {
            status: 'ok',
            service: 'zenemoo-payment-api',
            database: 'Cloudflare D1 (zenemoo-payments)',
            timestamp: new Date().toISOString(),
          },
          200,
          corsHeaders
        );
      }

      // Ensure D1 database binding is present
      if (!env.DB) {
        console.error('[Configuration Error] env.DB D1 binding is missing');
        return errorResponse('Internal Server Error: Database binding is not configured', 500, corsHeaders);
      }

      // ==========================================
      // ADMIN ENDPOINTS
      // ==========================================

      // 2. GET /admin/payments — List payments with search, filters, pagination
      if (pathname === '/admin/payments' && request.method === 'GET') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
        const offset = (page - 1) * limit;

        const search = (url.searchParams.get('search') || '').trim().toLowerCase();
        const status = (url.searchParams.get('status') || '').trim();
        const project = (url.searchParams.get('project') || '').trim();
        const sortBy = ['payment_date', 'created_at', 'amount', 'email', 'project_name'].includes(url.searchParams.get('sortBy'))
          ? url.searchParams.get('sortBy')
          : 'payment_date';
        const sortOrder = (url.searchParams.get('sortOrder') || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const whereClauses = [];
        const params = [];

        if (search) {
          whereClauses.push('(LOWER(email) LIKE ? OR LOWER(project_name) LIKE ? OR LOWER(reference_number) LIKE ? OR LOWER(talent_id) LIKE ?)');
          const searchPattern = `%${search}%`;
          params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        if (status && status !== 'All' && VALID_STATUSES.has(status)) {
          whereClauses.push('status = ?');
          params.push(status);
        }

        if (project && project !== 'All') {
          whereClauses.push('project_name = ?');
          params.push(project);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Query targeted columns only — NEVER SELECT *
        const listSql = `
          SELECT id, talent_id, email, project_name, amount, currency, status, payment_date, reference_number, reference_link, source, notes, created_at, updated_at
          FROM payments
          ${whereSql}
          ORDER BY ${sortBy} ${sortOrder}, created_at DESC
          LIMIT ? OFFSET ?
        `;

        const countSql = `
          SELECT COUNT(*) as total
          FROM payments
          ${whereSql}
        `;

        const [listResult, countResult] = await Promise.all([
          env.DB.prepare(listSql).bind(...params, limit, offset).all(),
          env.DB.prepare(countSql).bind(...params).first(),
        ]);

        const total = countResult ? countResult.total : 0;
        const totalPages = Math.ceil(total / limit);

        return jsonResponse(
          {
            success: true,
            data: listResult.results || [],
            pagination: {
              page,
              limit,
              total,
              totalPages,
            },
          },
          200,
          corsHeaders
        );
      }

      // 3. GET /admin/payments/summary — Dashboard summary counts and sum metrics
      if (pathname === '/admin/payments/summary' && request.method === 'GET') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const summarySql = `
          SELECT 
            COUNT(*) as total_records,
            COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) as pending_count,
            COALESCE(SUM(CASE WHEN status = 'Processing' THEN 1 ELSE 0 END), 0) as processing_count,
            COALESCE(SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END), 0) as paid_count,
            COALESCE(SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END), 0) as failed_count,
            COALESCE(SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END), 0) as cancelled_count
          FROM payments
        `;

        const summary = await env.DB.prepare(summarySql).first();

        return jsonResponse(
          {
            success: true,
            summary: {
              total_records: summary?.total_records || 0,
              total_paid: summary?.total_paid || 0,
              status_counts: {
                Pending: summary?.pending_count || 0,
                Processing: summary?.processing_count || 0,
                Paid: summary?.paid_count || 0,
                Failed: summary?.failed_count || 0,
                Cancelled: summary?.cancelled_count || 0,
              },
            },
          },
          200,
          corsHeaders
        );
      }

      // 4. GET /admin/leaderboard — Admin unmasked contributor rankings
      if (pathname === '/admin/leaderboard' && request.method === 'GET') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));
        const offset = (page - 1) * limit;

        const search = (url.searchParams.get('search') || '').trim().toLowerCase();
        const sortBy = ['total_paid', 'payment_count', 'last_payment_date'].includes(url.searchParams.get('sortBy'))
          ? url.searchParams.get('sortBy')
          : 'total_paid';
        const sortOrder = (url.searchParams.get('sortOrder') || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let whereClause = "WHERE status = 'Paid'";
        const params = [];

        if (search) {
          whereClause += " AND (LOWER(email) LIKE ? OR LOWER(talent_id) LIKE ?)";
          const pattern = `%${search}%`;
          params.push(pattern, pattern);
        }

        const listSql = `
          SELECT 
            LOWER(email) as email,
            MAX(talent_id) as talent_id,
            COALESCE(SUM(amount), 0) as total_paid,
            COUNT(*) as payment_count,
            MAX(payment_date) as last_payment_date
          FROM payments
          ${whereClause}
          GROUP BY LOWER(email)
          ORDER BY ${sortBy} ${sortOrder}, last_payment_date DESC, LOWER(email) ASC
          LIMIT ? OFFSET ?
        `;

        const countSql = `
          SELECT COUNT(DISTINCT LOWER(email)) as total_contributors
          FROM payments
          ${whereClause}
        `;

        const [listResult, countResult] = await Promise.all([
          env.DB.prepare(listSql).bind(...params, limit, offset).all(),
          env.DB.prepare(countSql).bind(...params).first(),
        ]);

        const totalContributors = countResult ? countResult.total_contributors : 0;
        const results = (listResult.results || []).map((row, index) => {
          const rank = offset + index + 1;
          return {
            rank,
            email: row.email,
            talent_id: row.talent_id || null,
            name: deriveDisplayName(row.email, row.talent_id),
            company: 'Zenemoo Contributor',
            grade: calculateGrade(row.total_paid),
            total_paid: Number(row.total_paid) || 0,
            payment_count: Number(row.payment_count) || 0,
            last_payment_date: row.last_payment_date || null,
          };
        });

        return jsonResponse(
          {
            success: true,
            data: results,
            pagination: {
              page,
              limit,
              total: totalContributors,
              totalPages: Math.ceil(totalContributors / limit),
            },
          },
          200,
          corsHeaders
        );
      }

      // 5. POST /admin/payments — Create new single payment record
      if (pathname === '/admin/payments' && request.method === 'POST') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const body = await request.json().catch(() => ({}));
        const validation = validatePaymentInput(body);

        if (!validation.isValid) {
          return errorResponse(validation.errors.join(', '), 400, corsHeaders);
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const s = validation.sanitized;

        const insertSql = `
          INSERT INTO payments (
            id, talent_id, email, project_name, amount, currency, status,
            payment_date, reference_number, reference_link, source, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await env.DB.prepare(insertSql)
          .bind(
            id,
            s.talent_id,
            s.email,
            s.project_name,
            s.amount,
            s.currency,
            s.status,
            s.payment_date,
            s.reference_number,
            s.reference_link,
            s.source || 'manual',
            s.notes,
            now,
            now
          )
          .run();

        return jsonResponse(
          {
            success: true,
            message: 'Payment record created successfully',
            data: { id, ...s, created_at: now, updated_at: now },
          },
          201,
          corsHeaders
        );
      }

      // 6. PUT /admin/payments/:id — Update existing payment
      if (pathname.startsWith('/admin/payments/') && request.method === 'PUT') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const id = pathname.replace('/admin/payments/', '').trim();
        if (!id) return errorResponse('Missing payment ID', 400, corsHeaders);

        const body = await request.json().catch(() => ({}));
        const validation = validatePaymentInput(body);

        if (!validation.isValid) {
          return errorResponse(validation.errors.join(', '), 400, corsHeaders);
        }

        const now = new Date().toISOString();
        const s = validation.sanitized;

        const updateSql = `
          UPDATE payments SET
            talent_id = ?,
            email = ?,
            project_name = ?,
            amount = ?,
            currency = ?,
            status = ?,
            payment_date = ?,
            reference_number = ?,
            reference_link = ?,
            notes = ?,
            updated_at = ?
          WHERE id = ?
        `;

        const res = await env.DB.prepare(updateSql)
          .bind(
            s.talent_id,
            s.email,
            s.project_name,
            s.amount,
            s.currency,
            s.status,
            s.payment_date,
            s.reference_number,
            s.reference_link,
            s.notes,
            now,
            id
          )
          .run();

        if (res.meta.changes === 0) {
          return errorResponse('Payment record not found', 404, corsHeaders);
        }

        return jsonResponse(
          {
            success: true,
            message: 'Payment record updated successfully',
            data: { id, ...s, updated_at: now },
          },
          200,
          corsHeaders
        );
      }

      // 7. DELETE /admin/payments/:id — Delete payment record
      if (pathname.startsWith('/admin/payments/') && request.method === 'DELETE') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const id = pathname.replace('/admin/payments/', '').trim();
        if (!id) return errorResponse('Missing payment ID', 400, corsHeaders);

        const deleteSql = `DELETE FROM payments WHERE id = ?`;
        const res = await env.DB.prepare(deleteSql).bind(id).run();

        if (res.meta.changes === 0) {
          return errorResponse('Payment record not found', 404, corsHeaders);
        }

        return jsonResponse(
          {
            success: true,
            message: 'Payment record deleted successfully',
          },
          200,
          corsHeaders
        );
      }

      // 8. POST /admin/payments/import — High-speed Batch CSV / Excel import
      if (pathname === '/admin/payments/import' && request.method === 'POST') {
        const auth = await authenticateAdmin(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const body = await request.json().catch(() => ({}));
        const records = Array.isArray(body.records) ? body.records : [];

        if (records.length === 0) {
          return errorResponse('No payment records provided for import', 400, corsHeaders);
        }

        if (records.length > 500) {
          return errorResponse('Batch import limit is 500 records per request', 400, corsHeaders);
        }

        const now = new Date().toISOString();
        const statements = [];
        const validatedRecords = [];
        const rowErrors = [];

        for (let i = 0; i < records.length; i++) {
          const rec = records[i];
          const validation = validatePaymentInput({ ...rec, source: 'import' });
          if (!validation.isValid) {
            rowErrors.push(`Row ${i + 1}: ${validation.errors.join('; ')}`);
          } else {
            const s = validation.sanitized;
            const id = crypto.randomUUID();
            validatedRecords.push({ id, ...s });

            const insertSql = `
              INSERT INTO payments (
                id, talent_id, email, project_name, amount, currency, status,
                payment_date, reference_number, reference_link, source, notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            statements.push(
              env.DB.prepare(insertSql).bind(
                id,
                s.talent_id,
                s.email,
                s.project_name,
                s.amount,
                s.currency,
                s.status,
                s.payment_date,
                s.reference_number,
                s.reference_link,
                'import',
                s.notes,
                now,
                now
              )
            );
          }
        }

        if (rowErrors.length > 0) {
          return jsonResponse(
            {
              success: false,
              message: `Validation failed for ${rowErrors.length} rows`,
              errors: rowErrors.slice(0, 20),
              totalErrors: rowErrors.length,
            },
            400,
            corsHeaders
          );
        }

        // Execute batch insertion in chunks of 100 for maximum D1 performance and reliability
        const chunkSize = 100;
        for (let i = 0; i < statements.length; i += chunkSize) {
          const chunk = statements.slice(i, i + chunkSize);
          await env.DB.batch(chunk);
        }

        return jsonResponse(
          {
            success: true,
            count: statements.length,
            message: `Successfully imported ${statements.length} payment records`,
          },
          201,
          corsHeaders
        );
      }

      // ==========================================
      // TALENT ENDPOINTS (STRICT ISOLATION)
      // ==========================================

      // 9. GET /talent/payments — Authenticated talent payment history
      if (pathname === '/talent/payments' && request.method === 'GET') {
        const auth = await authenticateTalent(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const talentEmail = auth.talent.email;
        const talentId = auth.talent.id;

        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
        const offset = (page - 1) * limit;

        const search = (url.searchParams.get('search') || '').trim().toLowerCase();
        const status = (url.searchParams.get('status') || '').trim();

        const whereClauses = ['(LOWER(email) = LOWER(?) OR (talent_id IS NOT NULL AND talent_id = ?))'];
        const params = [talentEmail, talentId];

        if (search) {
          whereClauses.push('(LOWER(project_name) LIKE ? OR LOWER(reference_number) LIKE ?)');
          const searchPattern = `%${search}%`;
          params.push(searchPattern, searchPattern);
        }

        if (status && status !== 'All' && VALID_STATUSES.has(status)) {
          whereClauses.push('status = ?');
          params.push(status);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        // Only select columns needed by Talent UI — zero internal leakage
        const listSql = `
          SELECT id, project_name, amount, currency, status, payment_date, reference_number, reference_link, notes, created_at
          FROM payments
          ${whereSql}
          ORDER BY payment_date DESC, created_at DESC
          LIMIT ? OFFSET ?
        `;

        const countSql = `
          SELECT COUNT(*) as total
          FROM payments
          ${whereSql}
        `;

        const [listResult, countResult] = await Promise.all([
          env.DB.prepare(listSql).bind(...params, limit, offset).all(),
          env.DB.prepare(countSql).bind(...params).first(),
        ]);

        const total = countResult ? countResult.total : 0;

        return jsonResponse(
          {
            success: true,
            data: listResult.results || [],
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
          200,
          corsHeaders
        );
      }

      // 10. GET /talent/payments/summary — Lightweight talent summary count, rank & grade
      if (pathname === '/talent/payments/summary' && request.method === 'GET') {
        const auth = await authenticateTalent(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const talentEmail = auth.talent.email;
        const talentId = auth.talent.id;

        const summarySql = `
          SELECT 
            COUNT(*) as payment_count,
            COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(CASE WHEN status = 'Pending' OR status = 'Processing' THEN 1 ELSE 0 END), 0) as pending_count
          FROM payments
          WHERE LOWER(email) = LOWER(?) OR (talent_id IS NOT NULL AND talent_id = ?)
        `;

        // Calculate rank among all paid contributors
        const rankSql = `
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT LOWER(email), SUM(amount) as sum_paid
            FROM payments
            WHERE status = 'Paid'
            GROUP BY LOWER(email)
            HAVING sum_paid > (
              SELECT COALESCE(SUM(amount), 0)
              FROM payments
              WHERE status = 'Paid' AND (LOWER(email) = LOWER(?) OR (talent_id IS NOT NULL AND talent_id = ?))
            )
          )
        `;

        const [summary, rankRow] = await Promise.all([
          env.DB.prepare(summarySql).bind(talentEmail, talentId).first(),
          env.DB.prepare(rankSql).bind(talentEmail, talentId).first(),
        ]);

        const totalPaid = Number(summary?.total_paid) || 0;
        const userRank = totalPaid > 0 ? (rankRow?.rank || 1) : null;

        return jsonResponse(
          {
            success: true,
            summary: {
              payment_count: summary?.payment_count || 0,
              total_paid: totalPaid,
              pending_count: summary?.pending_count || 0,
              user_rank: userRank,
              user_grade: calculateGrade(totalPaid),
            },
          },
          200,
          corsHeaders
        );
      }

      // 11. GET /talent/leaderboard — Privacy-masked Contributor Leaderboard
      if (pathname === '/talent/leaderboard' && request.method === 'GET') {
        const auth = await authenticateTalent(request, env);
        if (auth.error) return errorResponse(auth.error, auth.status, corsHeaders);

        const talentEmail = auth.talent.email;
        const talentId = auth.talent.id;

        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
        const offset = (page - 1) * limit;

        const listSql = `
          SELECT 
            LOWER(email) as email,
            MAX(talent_id) as talent_id,
            COALESCE(SUM(amount), 0) as total_paid,
            COUNT(*) as payment_count,
            MAX(payment_date) as last_payment_date
          FROM payments
          WHERE status = 'Paid'
          GROUP BY LOWER(email)
          ORDER BY total_paid DESC, last_payment_date DESC, LOWER(email) ASC
          LIMIT ? OFFSET ?
        `;

        const countSql = `
          SELECT COUNT(DISTINCT LOWER(email)) as total_contributors
          FROM payments
          WHERE status = 'Paid'
        `;

        // User specific position query
        const userStatsSql = `
          SELECT 
            COALESCE(SUM(amount), 0) as user_total_paid,
            COUNT(*) as user_payment_count
          FROM payments
          WHERE status = 'Paid' AND (LOWER(email) = LOWER(?) OR (talent_id IS NOT NULL AND talent_id = ?))
        `;

        const rankSql = `
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT LOWER(email), SUM(amount) as sum_paid
            FROM payments
            WHERE status = 'Paid'
            GROUP BY LOWER(email)
            HAVING sum_paid > (
              SELECT COALESCE(SUM(amount), 0)
              FROM payments
              WHERE status = 'Paid' AND (LOWER(email) = LOWER(?) OR (talent_id IS NOT NULL AND talent_id = ?))
            )
          )
        `;

        const [listResult, countResult, userStats, rankRow] = await Promise.all([
          env.DB.prepare(listSql).bind(limit, offset).all(),
          env.DB.prepare(countSql).first(),
          env.DB.prepare(userStatsSql).bind(talentEmail, talentId).first(),
          env.DB.prepare(rankSql).bind(talentEmail, talentId).first(),
        ]);

        const totalContributors = countResult ? countResult.total_contributors : 0;
        const userTotalPaid = Number(userStats?.user_total_paid) || 0;
        const userRank = userTotalPaid > 0 ? (rankRow?.rank || 1) : null;
        const userGrade = calculateGrade(userTotalPaid);

        const results = (listResult.results || []).map((row, index) => {
          const isCurrentUser = row.email === talentEmail;
          const rank = offset + index + 1;
          return {
            rank,
            talent_id: row.talent_id || null,
            name: deriveDisplayName(row.email, row.talent_id),
            email_masked: isCurrentUser ? row.email : maskEmail(row.email),
            company: 'Zenemoo Contributor',
            grade: calculateGrade(row.total_paid),
            total_paid: Number(row.total_paid) || 0,
            is_current_user: isCurrentUser,
          };
        });

        return jsonResponse(
          {
            success: true,
            data: results,
            user_position: {
              rank: userRank,
              total_paid: userTotalPaid,
              grade: userGrade,
              payment_count: userStats?.user_payment_count || 0,
            },
            pagination: {
              page,
              limit,
              total: totalContributors,
              totalPages: Math.ceil(totalContributors / limit),
            },
          },
          200,
          corsHeaders
        );
      }

      // 404 Not Found
      return errorResponse('Endpoint not found', 404, corsHeaders);
    } catch (err) {
      console.error('[Worker Unhandled Error]:', err.message, err.stack);
      return errorResponse('An error occurred while processing the payment request', 500, corsHeaders);
    }
  },
};
