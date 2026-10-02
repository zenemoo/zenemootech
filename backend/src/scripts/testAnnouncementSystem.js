import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import { announcementD1Service } from '../services/announcementD1Service.js';
import {
  getActiveAnnouncements,
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncementStatus,
  reorderAnnouncements,
  deleteAnnouncement,
  isValidAnnouncementUrl,
  sanitizeText,
} from '../controllers/announcementController.js';

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
  console.log('🧪 ZENEMOO ANNOUNCEMENT / TICKER SYSTEM TEST SUITE');
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

  // --- 1. Security & URL Validation Tests ---
  console.log('--- 1. Security & URL Validation ---');
  assert(isValidAnnouncementUrl('/opportunities') === true, 'Accepts internal relative route /opportunities');
  assert(isValidAnnouncementUrl('/talent-registration') === true, 'Accepts internal relative route /talent-registration');
  assert(isValidAnnouncementUrl('https://www.zenemoo.in/30min') === true, 'Accepts secure https URL');
  assert(isValidAnnouncementUrl('http://localhost:3000/review') === true, 'Accepts http URL');
  assert(isValidAnnouncementUrl('javascript:alert(1)') === false, 'Rejects dangerous javascript: URI');
  assert(isValidAnnouncementUrl('data:text/html;base64,PHNjcmlwdD4=') === false, 'Rejects dangerous data: URI');
  assert(isValidAnnouncementUrl('vbscript:msgbox(1)') === false, 'Rejects dangerous vbscript: URI');

  const dirtyText = '<script>alert("hacked")</script><b>Special Offer</b>';
  assert(sanitizeText(dirtyText) === 'Special Offer', 'HTML and script tags are completely stripped');

  // --- 2. Public Active Endpoint Tests ---
  console.log('\n--- 2. Public Active Announcement Endpoint ---');
  const { req: pReq, res: pRes } = mockReqRes();
  await getActiveAnnouncements(pReq, pRes);
  assert(pRes.statusCode === 200, 'Public active endpoint returns HTTP 200');
  assert(pRes.body?.success === true, 'Response body success is true');
  assert(Array.isArray(pRes.body?.data), 'Response data is an array');
  assert(pRes.body?.data.length > 0, 'Returns active announcements');

  const firstPub = pRes.body?.data[0];
  assert(firstPub && typeof firstPub.message === 'string', 'Public item has message string');
  assert(firstPub && firstPub.createdBy === undefined, 'Public item does NOT expose createdBy');
  assert(firstPub && firstPub.created_by === undefined, 'Public item does NOT expose created_by');

  // --- 3. Admin CRUD & Status Lifecycle Tests ---
  console.log('\n--- 3. Admin CRUD & Lifecycle ---');
  const adminUser = { email: 'admin@zenemoo.in', role: 'admin' };

  // 3a. Create Active Announcement
  const { req: cReq1, res: cRes1 } = mockReqRes({
    user: adminUser,
    body: {
      title: 'Test Active Announcement',
      message: 'Exclusive AI datasets available for research',
      linkUrl: '/datasets',
      linkText: 'Explore Datasets →',
      icon: '✦',
      priority: 50,
      active: true,
    },
  });
  await createAnnouncement(cReq1, cRes1);
  assert(cRes1.statusCode === 201, 'Admin can create announcement (HTTP 201)');
  const createdActiveId = cRes1.body?.data?.id;
  assert(Boolean(createdActiveId), `Created announcement has ID: ${createdActiveId}`);

  // 3b. Create Scheduled (Future) Announcement
  const futureIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { req: cReq2, res: cRes2 } = mockReqRes({
    user: adminUser,
    body: {
      title: 'Future Scheduled Promo',
      message: 'Upcoming hackathon next week',
      linkUrl: '/opportunities',
      linkText: 'Register →',
      active: true,
      startAt: futureIso,
    },
  });
  await createAnnouncement(cReq2, cRes2);
  assert(cRes2.statusCode === 201, 'Admin can create scheduled announcement');
  const futureId = cRes2.body?.data?.id;

  // 3c. Create Expired Announcement
  const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const olderPastIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { req: cReq3, res: cRes3 } = mockReqRes({
    user: adminUser,
    body: {
      title: 'Past Expired Promo',
      message: 'Expired webinar',
      linkUrl: '/30min',
      active: true,
      startAt: olderPastIso,
      endAt: pastIso,
    },
  });
  await createAnnouncement(cReq3, cRes3);
  assert(cRes3.statusCode === 201, 'Admin can create expired announcement');
  const expiredId = cRes3.body?.data?.id;

  // 3d. Create Disabled Announcement
  const { req: cReq4, res: cRes4 } = mockReqRes({
    user: adminUser,
    body: {
      title: 'Disabled Announcement',
      message: 'This is disabled by default',
      active: false,
    },
  });
  await createAnnouncement(cReq4, cRes4);
  assert(cRes4.statusCode === 201, 'Admin can create disabled announcement');
  const disabledId = cRes4.body?.data?.id;

  // 3e. Verify Public Active Filter excludes future, expired, and disabled
  announcementD1Service.invalidateCache();
  const { req: pReq2, res: pRes2 } = mockReqRes();
  await getActiveAnnouncements(pReq2, pRes2);
  const activeIds = (pRes2.body?.data || []).map((x) => x.id);

  assert(activeIds.includes(createdActiveId), 'Public active results INCLUDE active announcement');
  assert(!activeIds.includes(futureId), 'Public active results EXCLUDE future scheduled announcement');
  assert(!activeIds.includes(expiredId), 'Public active results EXCLUDE expired announcement');
  assert(!activeIds.includes(disabledId), 'Public active results EXCLUDE disabled announcement');

  // --- 4. Admin Update, Toggle, Reorder, Delete ---
  console.log('\n--- 4. Admin Update, Toggle, Reorder, Delete ---');

  // Edit
  const { req: uReq, res: uRes } = mockReqRes({
    user: adminUser,
    params: { id: createdActiveId },
    body: {
      message: 'Updated: High accuracy speech datasets available',
      priority: 99,
    },
  });
  await updateAnnouncement(uReq, uRes);
  assert(uRes.statusCode === 200, 'Admin can update announcement (HTTP 200)');
  assert(uRes.body?.data?.message.includes('Updated:'), 'Message updated correctly');
  assert(uRes.body?.data?.priority === 99, 'Priority updated correctly');

  // Toggle status
  const { req: tReq, res: tRes } = mockReqRes({
    user: adminUser,
    params: { id: createdActiveId },
    body: { active: false },
  });
  await toggleAnnouncementStatus(tReq, tRes);
  assert(tRes.statusCode === 200, 'Admin can toggle active status');
  assert(tRes.body?.data?.active === false, 'Status toggled to false');

  // Reorder
  const { req: rReq, res: rRes } = mockReqRes({
    user: adminUser,
    body: { orderedIds: [futureId, createdActiveId, expiredId, disabledId] },
  });
  await reorderAnnouncements(rReq, rRes);
  assert(rRes.statusCode === 200, 'Admin can reorder announcements');

  // Delete test records
  for (const tid of [createdActiveId, futureId, expiredId, disabledId]) {
    const { req: dReq, res: dRes } = mockReqRes({
      user: adminUser,
      params: { id: tid },
    });
    await deleteAnnouncement(dReq, dRes);
    assert(dRes.statusCode === 200, `Admin can delete test record ${tid}`);
  }

  // --- 5. Status Filters in Admin List ---
  console.log('\n--- 5. Admin Filter Queries ---');
  const { req: fReqAll, res: fResAll } = mockReqRes({ user: adminUser, query: { status: 'all' } });
  await getAdminAnnouncements(fReqAll, fResAll);
  assert(fResAll.statusCode === 200, 'Admin filter [all] returns HTTP 200');
  assert(Array.isArray(fResAll.body?.data), 'Admin filter [all] returns array');

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
