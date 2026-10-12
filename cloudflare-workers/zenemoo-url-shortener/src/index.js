/**
 * ZENEMOO URL SHORTENER — CLOUDFLARE WORKER ENGINE
 * 
 * High-performance, zero-database-hit redirect engine powered by Workers KV.
 * Handles /l/{code} redirections within Cloudflare free-tier quotas (100k reads/day).
 * Strictly enforces HTTP/HTTPS scheme security and prevents open redirects.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Strict code validation: 3 to 32 alphanumeric, hyphen, or underscore characters
const CODE_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

/**
 * Returns a beautiful, responsive Zenemoo-branded HTML status page for errors/notices
 */
function renderBrandedHtmlPage(title, subtitle, description, statusBadge, returnUrl = 'https://zenemoo.in') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Zenemoo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #06070b;
      --card-bg: rgba(15, 18, 28, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --cyan: #22d3ee;
      --cyan-glow: rgba(34, 211, 238, 0.15);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background-image: 
        radial-gradient(ellipse at 50% -20%, rgba(34, 211, 238, 0.12), transparent 70%),
        radial-gradient(ellipse at 80% 80%, rgba(99, 102, 241, 0.08), transparent 60%);
    }
    .card {
      width: 100%;
      max-width: 480px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 2.25rem 2rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
      text-align: center;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 800;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
      color: #fff;
      margin-bottom: 1.75rem;
    }
    .brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--cyan);
      box-shadow: 0 0 10px var(--cyan);
    }
    .badge {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      margin-bottom: 1.25rem;
    }
    .badge.warning {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.3);
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #fff;
      letter-spacing: -0.02em;
    }
    p {
      color: var(--text-muted);
      font-size: 0.925rem;
      line-height: 1.55;
      margin-bottom: 1.75rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.875rem;
      text-decoration: none;
      color: #06070b;
      background: var(--cyan);
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px var(--cyan-glow);
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(34, 211, 238, 0.3);
    }
    .footer {
      margin-top: 1.75rem;
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <span class="brand-dot"></span>
      ZENEMOO
    </div>
    <div class="badge ${statusBadge.toLowerCase().includes('expired') || statusBadge.toLowerCase().includes('disabled') ? 'warning' : ''}">
      ${statusBadge}
    </div>
    <h1>${subtitle}</h1>
    <p>${description}</p>
    <a href="${returnUrl}" class="btn">Return to Zenemoo</a>
    <div class="footer">Zenemoo Secure Link Gateway</div>
  </div>
</body>
</html>`;
}

/**
 * Validates destination URL format and schemes
 */
function isValidDestination(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Merges query parameters from short link into the destination URL
 */
function mergeQueryParams(destinationUrl, incomingUrl) {
  try {
    const dest = new URL(destinationUrl);
    const inc = new URL(incomingUrl);
    
    // Copy incoming query parameters that do not overwrite existing destination params
    for (const [key, value] of inc.searchParams.entries()) {
      if (!dest.searchParams.has(key)) {
        dest.searchParams.set(key, value);
      }
    }
    return dest.toString();
  } catch (_) {
    return destinationUrl;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ONLINE',
          service: 'Zenemoo URL Shortener Worker',
          timestamp: new Date().toISOString(),
          kv_configured: Boolean(env.SHORTENER_KV),
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // Direct KV Sync API (Server-to-Worker)
    if (url.pathname === '/api/sync' || url.pathname === '/api/links') {
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          if (!body || !body.code || !body.destination_url) {
            return new Response(JSON.stringify({ success: false, message: 'Missing code or destination_url' }), {
              status: 400,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
          }
          if (env.SHORTENER_KV) {
            await env.SHORTENER_KV.put(`link:${body.code}`, JSON.stringify(body));
          }
          return new Response(JSON.stringify({ success: true, message: 'Synced to Cloudflare KV', code: body.code }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return new Response(JSON.stringify({ success: false, message: e.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
      }

      if (request.method === 'DELETE') {
        const codeParam = url.searchParams.get('code');
        if (codeParam && env.SHORTENER_KV) {
          await env.SHORTENER_KV.delete(`link:${codeParam}`);
        }
        return new Response(JSON.stringify({ success: true, message: 'Removed from Cloudflare KV' }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // Extract code from /l/{code} or /{code}
    let code = '';
    const path = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    
    if (path.startsWith('l/')) {
      code = path.substring(2);
    } else if (path && !path.includes('/') && path !== 'health' && path !== 'favicon.ico') {
      code = path;
    }

    // If no short code was provided or code contains invalid characters, return 404
    if (!code || !CODE_REGEX.test(code)) {
      return new Response(
        renderBrandedHtmlPage(
          'Page Not Found',
          'Invalid or Missing Link',
          'The short link code is invalid or does not match any active Zenemoo destination.',
          '404 Not Found'
        ),
        {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // Verify KV namespace is bound
    if (!env.SHORTENER_KV) {
      return new Response(
        renderBrandedHtmlPage(
          'Service Notice',
          'Shortener KV Inactive',
          'The short link storage service is currently initializing. Please try again in a few moments.',
          '503 Initializing'
        ),
        {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    try {
      // 1. High-speed lookup in Workers KV (Free tier: 100k reads/day)
      const rawData = await env.SHORTENER_KV.get(`link:${code}`, { type: 'json' });

      if (!rawData) {
        return new Response(
          renderBrandedHtmlPage(
            'Link Not Found',
            'Short Link Not Found',
            'The link you are attempting to visit does not exist or may have been deleted by the administrator.',
            '404 Link Missing'
          ),
          {
            status: 404,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }

      // 2. Check disabled status
      if (rawData.status === 'disabled' || rawData.status === 'inactive' || rawData.is_active === false) {
        return new Response(
          renderBrandedHtmlPage(
            'Link Disabled',
            'Link Temporarily Inactive',
            'This Zenemoo short link has been disabled by an administrator and cannot redirect at this time.',
            'Disabled Link'
          ),
          {
            status: 403,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }

      // 3. Check expiration
      if (rawData.expires_at) {
        const expiryTime = new Date(rawData.expires_at).getTime();
        if (!isNaN(expiryTime) && expiryTime <= Date.now()) {
          return new Response(
            renderBrandedHtmlPage(
              'Link Expired',
              'Link Has Expired',
              'This short link had an active expiration timestamp that has now passed.',
              'Expired Link'
            ),
            {
              status: 410,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
        }
      }

      // 4. Validate destination URL (Disallow javascript:, data:, file:, etc.)
      const destinationUrl = rawData.destination_url || rawData.url;
      if (!destinationUrl || !isValidDestination(destinationUrl)) {
        return new Response(
          renderBrandedHtmlPage(
            'Security Notice',
            'Unsafe Link Blocked',
            'This link points to an invalid or disallowed destination protocol.',
            'Security Block'
          ),
          {
            status: 400,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }

      // 5. Merge incoming query parameters into destination safely
      const finalDestination = mergeQueryParams(destinationUrl, request.url);

      // 6. Optional Zero-Cost / Bounded Analytics Event
      // To strictly protect Cloudflare KV free-tier (1,000 writes/day), WE NEVER PERFORM A KV WRITE ON REDIRECT.
      // If Cloudflare Analytics Engine is bound, record zero-cost telemetry
      if (env.SHORTENER_ANALYTICS && typeof env.SHORTENER_ANALYTICS.writeDataPoint === 'function') {
        try {
          ctx.waitUntil(
            env.SHORTENER_ANALYTICS.writeDataPoint({
              blobs: [code, rawData.title || 'untitled'],
              doubles: [1],
              indexes: [code],
            })
          );
        } catch (_) {}
      }

      // 7. Temporary redirect (307) so destination updates take effect without permanent browser caching
      return new Response(null, {
        status: 307,
        headers: {
          Location: finalDestination,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      });
    } catch (err) {
      return new Response(
        renderBrandedHtmlPage(
          'Error',
          'Redirection Error',
          'An unexpected error occurred while resolving the short link. Please try again.',
          '500 Server Error'
        ),
        {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }
  },
};
