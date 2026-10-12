import worker from './src/index.js';

async function runWorkerTests() {
  console.log('\n======================================================');
  console.log('🧪 ZENEMOO URL SHORTENER CLOUDFLARE WORKER TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // In-memory mock KV store
  const kvData = new Map();
  const mockEnv = {
    SHORTENER_KV: {
      async get(key, opts) {
        const val = kvData.get(key);
        if (!val) return null;
        if (opts?.type === 'json') {
          return JSON.parse(val);
        }
        return val;
      },
      async put(key, val) {
        kvData.set(key, val);
      },
    },
    SHORTENER_ANALYTICS: {
      writeDataPoint() {},
    },
  };

  const mockCtx = {
    waitUntil(promise) {},
  };

  // Populate test links
  kvData.set(
    'link:active1',
    JSON.stringify({
      code: 'active1',
      destination_url: 'https://zenemoo.in/talent-hub',
      title: 'Active Link Test',
      status: 'active',
      is_active: true,
      created_at: new Date().toISOString(),
    })
  );

  kvData.set(
    'link:disabled1',
    JSON.stringify({
      code: 'disabled1',
      destination_url: 'https://zenemoo.in/opportunities',
      title: 'Disabled Link Test',
      status: 'disabled',
      is_active: false,
    })
  );

  kvData.set(
    'link:expired1',
    JSON.stringify({
      code: 'expired1',
      destination_url: 'https://zenemoo.in/team',
      title: 'Expired Link Test',
      status: 'active',
      is_active: true,
      expires_at: '2020-01-01T00:00:00.000Z',
    })
  );

  kvData.set(
    'link:unsafe1',
    JSON.stringify({
      code: 'unsafe1',
      destination_url: 'javascript:alert(document.cookie)',
      status: 'active',
    })
  );

  // 1. Health check
  console.log('--- TEST 1: Health Check Endpoint ---');
  let req = new Request('https://zenemoo.in/health');
  let res = await worker.fetch(req, mockEnv, mockCtx);
  assert(res.status === 200, 'Health check returns 200 OK');
  let body = await res.json();
  assert(body.status === 'ONLINE' && body.kv_configured === true, 'Reports ONLINE with KV configured');

  // 2. Active Link Redirection
  console.log('\n--- TEST 2: Active Link Redirection ---');
  req = new Request('https://zenemoo.in/l/active1');
  res = await worker.fetch(req, mockEnv, mockCtx);
  assert(res.status === 307, 'Returns HTTP 307 Temporary Redirect');
  assert(res.headers.get('Location') === 'https://zenemoo.in/talent-hub', 'Redirects to valid destination URL');
  assert(res.headers.get('Cache-Control')?.includes('no-cache'), 'Applies anti-caching headers for safe destination updates');

  // 3. Query string parameter merging
  console.log('\n--- TEST 3: Query Parameter Merging ---');
  req = new Request('https://zenemoo.in/l/active1?utm_source=twitter&campaign=zen26');
  res = await worker.fetch(req, mockEnv, mockCtx);
  const loc = res.headers.get('Location');
  assert(loc?.includes('utm_source=twitter') && loc?.includes('campaign=zen26'), 'Preserves incoming query parameters during redirection');

  // 4. Missing / Unknown Link (404)
  console.log('\n--- TEST 4: Unknown Link Handler ---');
  req = new Request('https://zenemoo.in/l/nonexistent_code');
  res = await worker.fetch(req, mockEnv, mockCtx);
  assert(res.status === 404, 'Returns 404 Not Found for unknown short code');
  let html = await res.text();
  assert(html.includes('ZENEMOO') && html.includes('404'), 'Renders branded Zenemoo 404 page');

  // 5. Disabled Link (403)
  console.log('\n--- TEST 5: Disabled Link Handler ---');
  req = new Request('https://zenemoo.in/l/disabled1');
  res = await worker.fetch(req, mockEnv, mockCtx);
  assert(res.status === 403, 'Returns 403 Forbidden for disabled link');
  html = await res.text();
  assert(html.includes('Disabled Link') || html.includes('Temporarily Inactive'), 'Renders branded link disabled notice');

  // 6. Expired Link (410)
  console.log('\n--- TEST 6: Expired Link Handler ---');
  req = new Request('https://zenemoo.in/l/expired1');
  res = await worker.fetch(req, mockEnv, mockCtx);
  assert(res.status === 410, 'Returns 410 Gone for expired link');
  html = await res.text();
  assert(html.includes('Expired Link') || html.includes('Link Has Expired'), 'Renders branded expired link notice');

  // 7. Security: Unsafe scheme rejection
  console.log('\n--- TEST 7: Open Redirect & Malicious Scheme Prevention ---');
  req = new Request('https://zenemoo.in/l/unsafe1');
  res = await worker.fetch(req, mockEnv, mockCtx);
  assert(res.status === 400, 'Rejects javascript: destination scheme with 400 Bad Request');

  // 8. Malformed path traversal
  console.log('\n--- TEST 8: Path Traversal Prevention ---');
  req = new Request('https://zenemoo.in/l/../../etc/passwd');
  res = await worker.fetch(req, mockEnv, mockCtx);
  assert(res.status === 404, 'Safely rejects path traversal characters');

  console.log('\n======================================================');
  console.log(`🏁 WORKER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkerTests().catch((err) => {
  console.error('Fatal worker test error:', err);
  process.exit(1);
});
