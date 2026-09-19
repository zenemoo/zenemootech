import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { memoryUserAccounts } from '../src/controllers/userManagementController.js';
import { invalidateUserRoleCache } from '../src/middleware/rbacMiddleware.js';

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

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_hardening_suite';

const adminToken = jwt.sign(
  { id: 'usr_admin', email: 'prem@zenemoo.in', role: 'admin', email_access: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const memberToken = jwt.sign(
  { id: 'usr_member_test', email: 'regular_user@example.com', role: 'team_member', email_access: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

function makeRequest(server, options, postData) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    let bodyData = null;
    if (postData) {
      bodyData = typeof postData === 'string' ? postData : JSON.stringify(postData);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body, json });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('ZENEMOO FINAL SECURITY REMEDIATION VERIFICATION TEST');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Server listening on port ${port}\n`);

  try {
    // ----------------------------------------------------
    // Test Group 1: R-2 Protection of AI Analytics & Diagnostics
    // ----------------------------------------------------
    console.log('--- Test Group 1: R-2 AI Analytics & Diagnostics RBAC Protection ---');

    // 1. Unauthenticated AI Analytics -> 401
    const res1 = await makeRequest(server, { path: '/api/ai/analytics', method: 'GET' });
    assert(res1.status === 401, `Unauthenticated GET /api/ai/analytics returns 401 (Got ${res1.status})`);
    assert(res1.json?.code === 'UNAUTHORIZED_MISSING_TOKEN', 'Unauthenticated AI analytics returns UNAUTHORIZED_MISSING_TOKEN code');

    // 2. Normal User AI Analytics -> 403
    const res2 = await makeRequest(server, {
      path: '/api/ai/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(res2.status === 403, `Normal User (team_member) GET /api/ai/analytics returns 403 Forbidden (Got ${res2.status})`);
    assert(res2.json?.code === 'FORBIDDEN_INSUFFICIENT_ROLE', 'Non-admin returns FORBIDDEN_INSUFFICIENT_ROLE');

    // 3. Admin AI Analytics -> 200
    const res3 = await makeRequest(server, {
      path: '/api/ai/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res3.status === 200, `Admin GET /api/ai/analytics returns 200 OK (Got ${res3.status})`);
    assert(res3.json?.success === true, 'Admin AI analytics response has success: true');
    assert(res3.headers['x-new-token'] !== undefined, 'Sliding session X-New-Token header issued on valid request');

    // 4. Unauthenticated Diagnostics -> 401
    const res4 = await makeRequest(server, { path: '/api/ai/diagnostics', method: 'GET' });
    assert(res4.status === 401, `Unauthenticated GET /api/ai/diagnostics returns 401 (Got ${res4.status})`);

    // 5. Normal User Diagnostics -> 403
    const res5 = await makeRequest(server, {
      path: '/api/ai/diagnostics',
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(res5.status === 403, `Normal User (team_member) GET /api/ai/diagnostics returns 403 Forbidden (Got ${res5.status})`);

    // 6. Admin Diagnostics -> 200
    const res6 = await makeRequest(server, {
      path: '/api/ai/diagnostics',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res6.status === 200, `Admin GET /api/ai/diagnostics returns 200 OK (Got ${res6.status})`);
    assert(res6.json?.success === true, 'Admin diagnostics response has success: true');

    // 7. AI Chat Public Availability & Rate Limiting Preservation
    const res7 = await makeRequest(server, {
      path: '/api/ai/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { messages: [{ role: 'user', content: 'Hello' }] });
    assert(res7.status === 200 || res7.status === 429, `POST /api/ai/chat remains accessible without 401/403 (Got ${res7.status})`);

    // ----------------------------------------------------
    // Test Group 2: R-1 JWT Role & Account Re-verification
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: R-1 Dynamic Role & Revocation Re-Verification ---');

    // Setup an active account in memory store for dynamic testing
    const testUserId = 'usr_dynamic_test_1';
    const testEmail = 'dynamic_test_user@zenemoo.in';
    
    // Initial state: user has 'admin' role in token and active status in DB/store
    const testAccount = {
      id: testUserId,
      email: testEmail,
      role: 'admin',
      status: 'active',
      email_access: true,
    };
    memoryUserAccounts.push(testAccount);

    const initialToken = jwt.sign(
      { id: testUserId, email: testEmail, role: 'admin', email_access: true },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    // Initial check: Admin access granted
    invalidateUserRoleCache(testUserId);
    const res8 = await makeRequest(server, {
      path: '/api/ai/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${initialToken}` },
    });
    assert(res8.status === 200, `User with initial admin account granted access (Got ${res8.status})`);

    // Dynamic Scenario A: Admin changes user role from 'admin' to 'team_member'
    // User STILL sends the OLD token that claims role: 'admin'
    testAccount.role = 'team_member';
    invalidateUserRoleCache(testUserId);

    const res9 = await makeRequest(server, {
      path: '/api/ai/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${initialToken}` },
    });
    assert(
      res9.status === 403,
      `Old token with claimed role 'admin' rejected with 403 after account role downgraded to 'team_member' in store (Got ${res9.status})`
    );
    assert(res9.json?.code === 'FORBIDDEN_INSUFFICIENT_ROLE', 'Response code is FORBIDDEN_INSUFFICIENT_ROLE');

    // Dynamic Scenario B: Account is deactivated/revoked (status: 'revoked' or 'inactive')
    testAccount.status = 'revoked';
    invalidateUserRoleCache(testUserId);

    const res10 = await makeRequest(server, {
      path: '/api/team/private-profile/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${initialToken}` },
    });
    assert(
      res10.status === 403,
      `Request with valid token rejected with 403 Forbidden after account revoked (Got ${res10.status})`
    );
    assert(
      res10.json?.code === 'FORBIDDEN_ACCOUNT_REVOKED',
      'Response code is FORBIDDEN_ACCOUNT_REVOKED'
    );

    // Dynamic Scenario C: Clean up test account & verify standard admin is untouched
    const idx = memoryUserAccounts.findIndex((u) => u.id === testUserId);
    if (idx !== -1) memoryUserAccounts.splice(idx, 1);
    invalidateUserRoleCache(testUserId);

    const res11 = await makeRequest(server, {
      path: '/api/ai/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res11.status === 200, `Standard admin account retains access unchanged (Got ${res11.status})`);

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`REMEDIATION TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
