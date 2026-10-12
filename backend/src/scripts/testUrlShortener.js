import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import { kvShortenerService } from '../services/kvShortenerService.js';
import {
  getShortenerStats,
  getShortenerLinks,
  getShortenerLinkByCode,
  createShortenerLink,
  updateShortenerLink,
  toggleShortenerLinkStatus,
  deleteShortenerLink,
  exportShortenerLinksCsv,
} from '../controllers/shortenerController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

function mockReqRes(options = {}) {
  const req = {
    headers: options.headers || {},
    query: options.query || {},
    params: options.params || {},
    body: options.body || {},
    user: options.user || null,
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };

  return { req, res };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 ZENEMOO URL SHORTENER TEST SUITE');
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

  // 1. Destination URL Scheme Validation
  console.log('--- TEST 1: Destination URL Scheme & Safety Validation ---');
  assert(kvShortenerService.isValidDestinationUrl('https://zenemoo.in/talent-hub'), 'Allows valid internal HTTPS URL');
  assert(kvShortenerService.isValidDestinationUrl('https://meet.google.com/abc-defg-hij'), 'Allows Google Meet HTTPS URL');
  assert(kvShortenerService.isValidDestinationUrl('https://drive.google.com/file/d/123/view'), 'Allows Google Drive HTTPS URL');
  assert(kvShortenerService.isValidDestinationUrl('https://chat.whatsapp.com/invite123'), 'Allows WhatsApp Invite HTTPS URL');
  assert(kvShortenerService.isValidDestinationUrl('http://example.com/page?ref=test#sec'), 'Allows HTTP with query & hash');
  assert(!kvShortenerService.isValidDestinationUrl('javascript:alert(1)'), 'Blocks unsafe javascript: scheme');
  assert(!kvShortenerService.isValidDestinationUrl('data:text/html,<script>alert(1)</script>'), 'Blocks unsafe data: scheme');
  assert(!kvShortenerService.isValidDestinationUrl('file:///etc/passwd'), 'Blocks unsafe file: scheme');
  assert(!kvShortenerService.isValidDestinationUrl('vbscript:msgbox(1)'), 'Blocks unsafe vbscript: scheme');
  assert(!kvShortenerService.isValidDestinationUrl('not-a-url'), 'Blocks malformed string');

  // 2. Custom Short Code Validation
  console.log('\n--- TEST 2: Short Code Format & Collision Resistance ---');
  assert(kvShortenerService.isValidCode('meet1'), 'Validates alphanumeric short code');
  assert(kvShortenerService.isValidCode('promo-2026_go'), 'Validates hyphens and underscores');
  assert(!kvShortenerService.isValidCode('ab'), 'Rejects short codes under 3 chars');
  assert(!kvShortenerService.isValidCode('a'.repeat(35)), 'Rejects short codes over 32 chars');
  assert(!kvShortenerService.isValidCode('code/with/slashes'), 'Rejects path traversal symbols');
  assert(!kvShortenerService.isValidCode('code with space'), 'Rejects spaces');
  assert(!kvShortenerService.isValidCode('code$special!'), 'Rejects special punctuation');

  const randomCodes = new Set();
  for (let i = 0; i < 100; i++) {
    randomCodes.add(kvShortenerService.generateRandomCode(6));
  }
  assert(randomCodes.size === 100, 'Generates 100 distinct collision-resistant 6-char codes');

  // 3. RBAC Admin Authentication Verification
  console.log('\n--- TEST 3: Admin Authorization & RBAC Middleware Guards ---');
  const secret = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';
  const adminToken = jwt.sign(
    { id: 'admin_test', email: 'mr.prem2006@gmail.com', role: 'super_admin' },
    secret,
    { expiresIn: '1h' }
  );
  const userToken = jwt.sign(
    { id: 'user_test', email: 'guest@example.com', role: 'user' },
    secret,
    { expiresIn: '1h' }
  );

  // Missing token
  let authReqRes = mockReqRes();
  let nextCalled = false;
  await verifyToken(authReqRes.req, authReqRes.res, () => { nextCalled = true; });
  assert(!nextCalled && authReqRes.res.statusCode === 401, 'Denies access when token is missing');

  // Non-admin token
  authReqRes = mockReqRes({ headers: { authorization: `Bearer ${userToken}` } });
  nextCalled = false;
  await verifyToken(authReqRes.req, authReqRes.res, () => { nextCalled = true; });
  assert(nextCalled && authReqRes.req.user?.role === 'user', 'Decodes regular user JWT');

  const roleGuard = requireRole(['admin', 'super_admin']);
  let roleNextCalled = false;
  roleGuard(authReqRes.req, authReqRes.res, () => { roleNextCalled = true; });
  assert(!roleNextCalled && authReqRes.res.statusCode === 403, 'Denies regular user access to admin endpoints (403)');

  // Admin token
  authReqRes = mockReqRes({ headers: { authorization: `Bearer ${adminToken}` } });
  nextCalled = false;
  await verifyToken(authReqRes.req, authReqRes.res, () => { nextCalled = true; });
  roleNextCalled = false;
  roleGuard(authReqRes.req, authReqRes.res, () => { roleNextCalled = true; });
  assert(nextCalled && roleNextCalled, 'Allows super_admin access through verifyToken & requireRole');

  // 4. Link Lifecycle Management (CRUD)
  console.log('\n--- TEST 4: Link Creation, Lookup, Edit, Status Toggle & Deletion ---');
  const testCode = 'test_' + Date.now().toString(36);
  const testDestination = 'https://zenemoo.in/talent-hub?ref=test_suite';

  // Create
  const createReqRes = mockReqRes({
    user: { email: 'admin@zenemoo.in', role: 'super_admin' },
    body: {
      destination_url: testDestination,
      custom_code: testCode,
      title: 'Talent Hub Campaign',
      notes: 'Automated test suite link',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  await createShortenerLink(createReqRes.req, createReqRes.res, () => {});
  assert(createReqRes.res.statusCode === 201, 'Creates short link successfully (status 201)');
  assert(createReqRes.res.body?.link?.code === testCode, 'Matches requested short code');
  assert(createReqRes.res.body?.link?.status === 'active', 'Defaults to active status');
  assert(Array.isArray(createReqRes.res.body?.link?.history), 'Initializes audit history log');

  // Duplicate custom alias rejection
  const dupReqRes = mockReqRes({
    user: { email: 'admin@zenemoo.in', role: 'super_admin' },
    body: {
      destination_url: 'https://example.com',
      custom_code: testCode,
    },
  });
  await createShortenerLink(dupReqRes.req, dupReqRes.res, () => {});
  assert(dupReqRes.res.statusCode === 400, 'Rejects duplicate custom code alias');

  // Read single link
  const getReqRes = mockReqRes({ params: { code: testCode } });
  await getShortenerLinkByCode(getReqRes.req, getReqRes.res, () => {});
  assert(getReqRes.res.statusCode === 200 && getReqRes.res.body?.link?.code === testCode, 'Retrieves created link by code');

  // Status toggle
  const toggleReqRes = mockReqRes({
    user: { email: 'admin@zenemoo.in', role: 'super_admin' },
    params: { code: testCode },
  });
  await toggleShortenerLinkStatus(toggleReqRes.req, toggleReqRes.res, () => {});
  assert(toggleReqRes.res.statusCode === 200 && toggleReqRes.res.body?.link?.status === 'disabled', 'Toggles status to disabled');

  // Toggle back to active
  await toggleShortenerLinkStatus(toggleReqRes.req, toggleReqRes.res, () => {});
  assert(toggleReqRes.res.body?.link?.status === 'active', 'Toggles status back to active');

  // Update destination with audit tracking
  const updatedDestination = 'https://zenemoo.in/talent-network';
  const updateReqRes = mockReqRes({
    user: { email: 'editor@zenemoo.in', role: 'super_admin' },
    params: { code: testCode },
    body: {
      destination_url: updatedDestination,
      title: 'Updated Talent Network',
    },
  });
  await updateShortenerLink(updateReqRes.req, updateReqRes.res, () => {});
  assert(updateReqRes.res.statusCode === 200, 'Updates link destination');
  assert(updateReqRes.res.body?.link?.destination_url === updatedDestination, 'Reflects new destination');
  
  const history = updateReqRes.res.body?.link?.history || [];
  const destChangeEntry = history.find((h) => h.action === 'destination_changed');
  assert(Boolean(destChangeEntry), 'Records destination change audit trail');
  assert(destChangeEntry?.previous_destination === testDestination, 'Audit preserves previous destination');

  // List & Stats
  const statsReqRes = mockReqRes();
  await getShortenerStats(statsReqRes.req, statsReqRes.res, () => {});
  assert(statsReqRes.res.statusCode === 200, 'Calculates dashboard summary statistics');
  assert(typeof statsReqRes.res.body?.stats?.active_links === 'number', 'Includes active links metric');

  // CSV Export
  const csvReqRes = mockReqRes();
  await exportShortenerLinksCsv(csvReqRes.req, csvReqRes.res, () => {});
  assert(csvReqRes.res.headers['content-type'].includes('text/csv'), 'Generates CSV export format');
  assert(csvReqRes.res.body?.includes(testCode), 'Export includes created short link');

  // Deletion
  const delReqRes = mockReqRes({ params: { code: testCode } });
  await deleteShortenerLink(delReqRes.req, delReqRes.res, () => {});
  assert(delReqRes.res.statusCode === 200, 'Deletes short link successfully');

  // Verify deleted
  const getAfterDel = mockReqRes({ params: { code: testCode } });
  await getShortenerLinkByCode(getAfterDel.req, getAfterDel.res, () => {});
  assert(getAfterDel.res.statusCode === 404, 'Returns 404 for deleted link');

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
