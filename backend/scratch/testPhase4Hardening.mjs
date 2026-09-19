import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_hardening_suite';
const adminToken = jwt.sign(
  { id: 'test_admin_id', email: 'prem@zenemoo.in', role: 'admin', user_id: 'test_admin_id' },
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
  console.log('ZENEMOO PHASE 4 SECURITY HARDENING VERIFICATION TEST');
  console.log('====================================================\n');

  // Test Group 1: Source Code Audit for Hardcoded Secrets & CSPRNG
  console.log('--- Test Group 1: Cryptographic Randomness & Secret Sanitization ---');
  const authControllerPath = path.resolve('backend/src/controllers/authController.js');
  const authControllerCode = fs.readFileSync(authControllerPath, 'utf8');
  assert(
    authControllerCode.includes('crypto.randomInt(100000, 1000000)'),
    'authController.js uses crypto.randomInt for 6-digit OTP generation'
  );
  assert(
    !authControllerCode.includes('Math.floor(100000 + Math.random() * 900000)'),
    'authController.js eliminated Math.random() for OTP generation'
  );

  const contactControllerPath = path.resolve('backend/src/controllers/contactController.js');
  const contactControllerCode = fs.readFileSync(contactControllerPath, 'utf8');
  assert(
    !contactControllerCode.includes("'0x4AAAAAAEKG_sx7PnsrKH6dRojjixiRQWo'"),
    'contactController.js removed hardcoded Turnstile secret key fallback'
  );

  const bookingControllerPath = path.resolve('backend/src/controllers/bookingController.js');
  const bookingControllerCode = fs.readFileSync(bookingControllerPath, 'utf8');
  assert(
    !bookingControllerCode.includes("'0x4AAAAAAA...'"),
    'bookingController.js removed hardcoded Turnstile secret placeholder'
  );
  assert(
    bookingControllerCode.includes('crypto.randomInt(0, chars.length)'),
    'bookingController.js uses crypto.randomInt for booking reference codes'
  );

  const talentRegControllerPath = path.resolve('backend/src/controllers/talentRegistrationController.js');
  const talentRegControllerCode = fs.readFileSync(talentRegControllerPath, 'utf8');
  assert(
    talentRegControllerCode.includes('crypto.randomInt(0, chars.length)'),
    'talentRegistrationController.js uses crypto.randomInt for registration codes'
  );

  const oppAppControllerPath = path.resolve('backend/src/controllers/opportunityApplicationController.js');
  const oppAppControllerCode = fs.readFileSync(oppAppControllerPath, 'utf8');
  assert(
    oppAppControllerCode.includes('crypto.randomInt(1000, 10000)'),
    'opportunityApplicationController.js uses crypto.randomInt for applicant_id generation'
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // Test Group 2: CORS Origin Rejection & Allowlist
    console.log('\n--- Test Group 2: CORS Origin Security ---');
    const allowedOriginRes = await makeRequest(server, {
      path: '/api/health',
      headers: { Origin: 'https://zenemoo.in' },
    });
    assert(allowedOriginRes.status === 200, `Whitelisted origin https://zenemoo.in is allowed (Got ${allowedOriginRes.status})`);
    assert(
      allowedOriginRes.headers['access-control-allow-origin'] === 'https://zenemoo.in',
      `Access-Control-Allow-Origin header returned correctly for https://zenemoo.in`
    );

    const evilOriginRes = await makeRequest(server, {
      path: '/api/health',
      headers: { Origin: 'https://evil-attacker-website.com' },
    });
    assert(
      evilOriginRes.status === 403,
      `Unauthorized origin https://evil-attacker-website.com blocked with 403 Forbidden (Got ${evilOriginRes.status})`
    );
    assert(
      evilOriginRes.json?.code === 'CORS_NOT_ALLOWED',
      `Error code CORS_NOT_ALLOWED returned for blocked origin`
    );

    // Test Group 3: Production Error Masking & Security Headers
    console.log('\n--- Test Group 3: Security Headers & Production Error Handling ---');
    const healthRes = await makeRequest(server, { path: '/api/health' });
    assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff is set');
    assert(healthRes.headers['x-frame-options'] === 'SAMEORIGIN', 'X-Frame-Options: SAMEORIGIN is set');
    assert(!healthRes.headers['x-powered-by'], 'X-Powered-By header is stripped');

    // Test Group 4: Webhook and Scheduler Security
    console.log('\n--- Test Group 4: Webhook & Scheduled Endpoint Security ---');
    const cloudflareWebhookUnauth = await makeRequest(server, {
      path: '/api/emails/webhook/cloudflare',
      method: 'POST',
    }, { test: 'email' });
    assert(
      cloudflareWebhookUnauth.status === 401,
      `Unauthenticated Cloudflare webhook request rejected with 401 (Got ${cloudflareWebhookUnauth.status})`
    );

    const scheduledProcessUnauth = await makeRequest(server, {
      path: '/api/emails/scheduled/process',
      method: 'POST',
    }, {});
    assert(
      scheduledProcessUnauth.status === 401 || scheduledProcessUnauth.status === 500,
      `Unauthenticated scheduled email processor rejected securely (Got ${scheduledProcessUnauth.status})`
    );

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`PHASE 4 HARDENING TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
