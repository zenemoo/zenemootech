import http from 'http';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';

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

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_signing';
const adminToken = jwt.sign(
  { id: 'test_admin_id', email: 'prem@zenemoo.in', role: 'admin', user_id: 'test_admin_id' },
  JWT_SECRET,
  { expiresIn: '1h' }
);
const unauthorizedToken = jwt.sign(
  { id: 'test_user_id', email: 'candidate@example.com', role: 'candidate', user_id: 'test_user_id' },
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
  console.log('ZENEMOO PHASE 3A RLS COMPATIBILITY VERIFICATION TEST');
  console.log('====================================================\n');

  // Test 1: Migration Identity Policy Verification
  console.log('--- Test Group 1: Migration File RLS Hardening ---');
  const migrationPath = path.resolve('supabase/migrations/20260919_phase2_rls_hardening.sql');
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  const talentRegSection = migrationContent.split('4. TALENT REGISTRATIONS')[1]?.split('5. TALENT LANGUAGES')[0] || '';
  assert(
    !talentRegSection.includes("id::text = (auth.jwt() ->> 'sub')"),
    'Redundant id::text = sub comparison removed from talent_registrations policies'
  );
  assert(
    talentRegSection.includes("email = (auth.jwt() ->> 'email')"),
    'Talent registration policy uses email identity comparison'
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // Test Group 2: Opportunity Management Authorization
    console.log('\n--- Test Group 2: Opportunity Management Authorization ---');
    const oppUnauth = await makeRequest(server, { path: '/api/opportunities', method: 'POST' }, { title: 'Unauthorized Opp' });
    assert(oppUnauth.status === 401, `Unauthenticated POST /api/opportunities returns 401 (Got ${oppUnauth.status})`);

    const oppCandidate = await makeRequest(
      server,
      {
        path: '/api/opportunities',
        method: 'POST',
        headers: { Authorization: `Bearer ${unauthorizedToken}` },
      },
      { title: 'Candidate Opp' }
    );
    assert(oppCandidate.status === 403, `Non-admin POST /api/opportunities returns 403 Forbidden (Got ${oppCandidate.status})`);

    const oppGetPublic = await makeRequest(server, { path: '/api/opportunities', method: 'GET' });
    assert(oppGetPublic.status === 200, `Public GET /api/opportunities returns 200 OK (Got ${oppGetPublic.status})`);
    assert(
      Array.isArray(oppGetPublic.json?.data) &&
        oppGetPublic.json.data.every((o) => ['active', 'coming_soon'].includes(o.status)),
      'Public GET /api/opportunities exposes ONLY active and coming_soon statuses'
    );

    const oppAdminUnauth = await makeRequest(server, { path: '/api/opportunities/admin/all', method: 'GET' });
    assert(oppAdminUnauth.status === 401, `Unauthenticated GET /api/opportunities/admin/all returns 401 (Got ${oppAdminUnauth.status})`);

    const oppAdminCandidate = await makeRequest(server, {
      path: '/api/opportunities/admin/all',
      method: 'GET',
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
    });
    assert(oppAdminCandidate.status === 403, `Non-admin GET /api/opportunities/admin/all returns 403 Forbidden (Got ${oppAdminCandidate.status})`);

    const oppAdminAuthorized = await makeRequest(server, {
      path: '/api/opportunities/admin/all',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(oppAdminAuthorized.status === 200, `Admin GET /api/opportunities/admin/all returns 200 OK (Got ${oppAdminAuthorized.status})`);
    assert(
      Array.isArray(oppAdminAuthorized.json?.data) &&
        oppAdminAuthorized.json.data.some((o) => o.status === 'stopped'),
      'Admin GET /api/opportunities/admin/all returns complete opportunity list including stopped/closed'
    );

    // Test Group 3: Opportunity Applications Authorization & Validation
    console.log('\n--- Test Group 3: Opportunity Applications Flow ---');
    const appUnauth = await makeRequest(server, { path: '/api/opportunity-applications', method: 'GET' });
    assert(appUnauth.status === 401, `Unauthenticated GET /api/opportunity-applications returns 401 (Got ${appUnauth.status})`);

    const appCandidate = await makeRequest(
      server,
      {
        path: '/api/opportunity-applications',
        method: 'GET',
        headers: { Authorization: `Bearer ${unauthorizedToken}` },
      },
    );
    assert(appCandidate.status === 403, `Non-admin GET /api/opportunity-applications returns 403 (Got ${appCandidate.status})`);

    const appAdminGet = await makeRequest(
      server,
      {
        path: '/api/opportunity-applications?include_answers=false',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert(appAdminGet.status === 200, `Admin GET /api/opportunity-applications returns 200 (Got ${appAdminGet.status})`);

    // Candidate Submission Validation
    const invalidCandidateSubmit = await makeRequest(
      server,
      { path: '/api/opportunity-applications', method: 'POST' },
      { applicant_name: 'Test' }
    );
    assert(
      invalidCandidateSubmit.status === 400,
      `Incomplete candidate submission correctly rejected with 400 (Got ${invalidCandidateSubmit.status})`
    );

    // Test Group 4: Reviews Public and Admin Endpoints
    console.log('\n--- Test Group 4: Reviews Public & Admin Moderation Endpoints ---');
    const revPublicGet = await makeRequest(server, { path: '/api/reviews', method: 'GET' });
    assert(revPublicGet.status === 200, `Public GET /api/reviews returns 200 OK (Got ${revPublicGet.status})`);

    const revAdminUnauth = await makeRequest(server, { path: '/api/reviews/admin/all', method: 'GET' });
    assert(revAdminUnauth.status === 401, `Unauthenticated GET /api/reviews/admin/all returns 401 (Got ${revAdminUnauth.status})`);

    const revAdminForbidden = await makeRequest(
      server,
      {
        path: '/api/reviews/admin/all',
        method: 'GET',
        headers: { Authorization: `Bearer ${unauthorizedToken}` },
      }
    );
    assert(revAdminForbidden.status === 403, `Non-admin GET /api/reviews/admin/all returns 403 (Got ${revAdminForbidden.status})`);

    const revAdminAllowed = await makeRequest(
      server,
      {
        path: '/api/reviews/admin/all',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    assert(revAdminAllowed.status === 200, `Admin GET /api/reviews/admin/all returns 200 OK (Got ${revAdminAllowed.status})`);

    // Test Group 5: Authorized Admin Emails Management
    console.log('\n--- Test Group 5: Authorized Admin Emails Management ---');
    const authEmailsUnauth = await makeRequest(server, { path: '/api/auth/authorized-emails', method: 'GET' });
    assert(authEmailsUnauth.status === 401, `Unauthenticated GET /api/auth/authorized-emails returns 401 (Got ${authEmailsUnauth.status})`);

    const authEmailsForbidden = await makeRequest(
      server,
      {
        path: '/api/auth/authorized-emails',
        method: 'GET',
        headers: { Authorization: `Bearer ${unauthorizedToken}` },
      }
    );
    assert(authEmailsForbidden.status === 403, `Non-admin GET /api/auth/authorized-emails returns 403 (Got ${authEmailsForbidden.status})`);

    const authEmailsAllowed = await makeRequest(
      server,
      {
        path: '/api/auth/authorized-emails',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    assert(authEmailsAllowed.status === 200, `Admin GET /api/auth/authorized-emails returns 200 OK (Got ${authEmailsAllowed.status})`);

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`PHASE 3A COMPATIBILITY TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
