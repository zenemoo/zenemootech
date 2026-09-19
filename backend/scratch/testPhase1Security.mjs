import http from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FAIL: JWT_SECRET must be set in backend/.env for test run');
  process.exit(1);
}

// Import express app
const { default: app } = await import('../src/app.js');

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const baseUrl = `http://localhost:${port}`;

console.log(`\n==================================================`);
console.log(`ZENEMOO PHASE 1 SECURITY AUTOMATED TEST SUITE`);
console.log(`Ephemeral Server running at: ${baseUrl}`);
console.log(`==================================================\n`);

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

// Generate test tokens
const adminToken = jwt.sign(
  { id: 'usr_admin', email: 'prem@zenemoo.in', role: 'admin', email_access: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const hrToken = jwt.sign(
  { id: 'usr_hr', email: 'hr@zenemoo.in', role: 'hr', email_access: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const memberToken = jwt.sign(
  { id: 'usr_member', email: 'member@zenemoo.in', role: 'team_member', email_access: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const expiredToken = jwt.sign(
  { id: 'usr_expired', email: 'expired@zenemoo.in', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '-10s' }
);

const forgedSecretToken = jwt.sign(
  { id: 'usr_hacker', email: 'hacker@evil.com', role: 'admin' },
  'wrong_secret_key_123',
  { expiresIn: '1h' }
);

// None algorithm token
const unsignedToken = jwt.sign(
  { id: 'usr_hacker', email: 'hacker@evil.com', role: 'admin' },
  '',
  { algorithm: 'none' }
);

try {
  // TEST 1: Anonymous -> Protected Admin Endpoints -> Expect 401
  const endpointsToTest401 = [
    { method: 'GET', url: '/api/opportunity-applications' },
    { method: 'POST', url: '/api/team', body: { name: 'Test' } },
    { method: 'POST', url: '/api/opportunities', body: { title: 'Test' } },
    { method: 'GET', url: '/api/contact' },
    { method: 'GET', url: '/api/subscribers' },
    { method: 'POST', url: '/api/services', body: { title: 'Test' } },
    { method: 'POST', url: '/api/partners', body: { name: 'Test' } },
    { method: 'PUT', url: '/api/settings', body: { site_name: 'Hacked' } },
    { method: 'POST', url: '/api/portfolio', body: { title: 'Test' } },
    { method: 'POST', url: '/api/blog', body: { title: 'Test' } },
    { method: 'POST', url: '/api/upload', body: {} },
    { method: 'GET', url: '/api/talent-registration/admin/list' },
    { method: 'GET', url: '/api/bookings/admin/list' },
    { method: 'POST', url: '/api/branding/logo', body: {} },
    { method: 'POST', url: '/api/datasets', body: { title: 'Test' } },
    { method: 'GET', url: '/api/auth/audit-logs' },
    { method: 'POST', url: '/api/admin-hr-ai/generate', body: {} },
    { method: 'GET', url: '/api/email/diagnose' },
  ];

  for (const ep of endpointsToTest401) {
    const res = await fetch(`${baseUrl}${ep.url}`, {
      method: ep.method,
      headers: ep.body ? { 'Content-Type': 'application/json' } : {},
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert(res.status === 401, `Anonymous ${ep.method} ${ep.url} returns 401`, `Received ${res.status}`);
  }

  // TEST 2: Normal Team Member -> Admin-only Endpoints -> Expect 403
  const adminOnlyEndpoints = [
    { method: 'POST', url: '/api/team', body: { name: 'New' } },
    { method: 'POST', url: '/api/opportunities', body: { title: 'New' } },
    { method: 'DELETE', url: '/api/opportunity-applications/app_123' },
    { method: 'GET', url: '/api/contact' },
    { method: 'GET', url: '/api/subscribers' },
    { method: 'POST', url: '/api/services', body: { title: 'New' } },
    { method: 'PUT', url: '/api/settings', body: { title: 'New' } },
    { method: 'GET', url: '/api/bookings/admin/list' },
    { method: 'POST', url: '/api/branding/logo', body: {} },
    { method: 'POST', url: '/api/datasets', body: {} },
    { method: 'GET', url: '/api/auth/audit-logs' },
    { method: 'GET', url: '/api/email/diagnose' },
    { method: 'DELETE', url: '/api/talent-registration/admin/delete/123' },
  ];

  for (const ep of adminOnlyEndpoints) {
    const res = await fetch(`${baseUrl}${ep.url}`, {
      method: ep.method,
      headers: {
        Authorization: `Bearer ${memberToken}`,
        ...(ep.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert(res.status === 403, `Team Member ${ep.method} ${ep.url} returns 403 Forbidden`, `Received ${res.status}`);
  }

  // TEST 3: HR User -> Allowed on HR endpoints, Denied on Admin-Only Endpoints
  // HR allowed on:
  const hrAllowedRes = await fetch(`${baseUrl}/api/opportunity-applications`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  assert(hrAllowedRes.status !== 401 && hrAllowedRes.status !== 403, `HR User allowed on /api/opportunity-applications`, `Status: ${hrAllowedRes.status}`);

  // HR denied on admin-only:
  const hrDeniedRes = await fetch(`${baseUrl}/api/settings`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${hrToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ site_name: 'Denied' }),
  });
  assert(hrDeniedRes.status === 403, `HR User denied on admin-only PUT /api/settings`, `Status: ${hrDeniedRes.status}`);

  // TEST 4: Forged JWT -> Expect 401
  const forgedRes = await fetch(`${baseUrl}/api/team`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${forgedSecretToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Hacker' }),
  });
  assert(forgedRes.status === 401, `Forged JWT rejected with 401`, `Received ${forgedRes.status}`);

  // TEST 5: Unsigned / Algorithm 'none' JWT -> Expect 401
  const unsignedRes = await fetch(`${baseUrl}/api/team`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${unsignedToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Hacker' }),
  });
  assert(unsignedRes.status === 401, `Unsigned JWT rejected with 401`, `Received ${unsignedRes.status}`);

  // TEST 6: Expired JWT -> Expect 401
  const expiredRes = await fetch(`${baseUrl}/api/team`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${expiredToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Expired' }),
  });
  assert(expiredRes.status === 401, `Expired JWT rejected with 401`, `Received ${expiredRes.status}`);

  // TEST 7: supportRoutes optionalAuth -> Unsafe jwt.decode removed
  // Sending a forged token to supportRoutes/my-contributions must NOT populate req.user or return data for forged identity
  const forgedSupportRes = await fetch(`${baseUrl}/api/support/my-contributions`, {
    headers: { Authorization: `Bearer ${forgedSecretToken}` },
  });
  const supportData = await forgedSupportRes.json().catch(() => ({}));
  assert(
    forgedSupportRes.status === 401 || (supportData && supportData.success === false),
    `Forged token to /api/support/my-contributions is rejected/empty`,
    `Status: ${forgedSupportRes.status}, data: ${JSON.stringify(supportData)}`
  );

  // TEST 8: Public Endpoints Intact
  const publicEndpoints = [
    { method: 'GET', url: '/api/team' },
    { method: 'GET', url: '/api/opportunities' },
    { method: 'GET', url: '/api/services' },
    { method: 'GET', url: '/api/partners' },
    { method: 'GET', url: '/api/settings' },
    { method: 'GET', url: '/api/portfolio' },
    { method: 'GET', url: '/api/blog' },
    { method: 'GET', url: '/api/health' },
    { method: 'GET', url: '/api/talent-registration/supported-languages' },
  ];

  for (const ep of publicEndpoints) {
    const res = await fetch(`${baseUrl}${ep.url}`);
    assert(res.status === 200, `Public endpoint ${ep.method} ${ep.url} remains 200 OK`, `Received ${res.status}`);
  }

  // TEST 9: Cloudflare Webhook Authorization Check
  const cfNoAuth = await fetch(`${baseUrl}/api/emails/webhook/cloudflare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: 'test' }),
  });
  assert(cfNoAuth.status === 401, `Cloudflare webhook without auth header returns 401`, `Received ${cfNoAuth.status}`);

  process.env.CLOUDFLARE_WEBHOOK_SECRET = 'valid_test_secret_for_suite';
  const cfWrongAuth = await fetch(`${baseUrl}/api/emails/webhook/cloudflare`, {
    method: 'POST',
    headers: {
      'x-cloudflare-webhook-secret': 'wrong_secret_123',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message_id: 'test' }),
  });
  assert(cfWrongAuth.status === 401, `Cloudflare webhook with wrong secret returns 401`, `Received ${cfWrongAuth.status}`);

  // TEST 10: Admin User Access Allowed
  const adminAllowedRes = await fetch(`${baseUrl}/api/auth/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminAllowedRes.status === 200, `Admin Token allowed on /api/auth/audit-logs`, `Received ${adminAllowedRes.status}`);

} finally {
  server.close();
}

console.log(`\n==================================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`==================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
