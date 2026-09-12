import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing Subscriber Server-Side Pagination & Egress Minimization...\n');

const subscriberControllerPath = path.resolve('src/controllers/subscriberController.js');
const subscriberCode = fs.readFileSync(subscriberControllerPath, 'utf8');

// Test 1: Zero select('*') in subscriber controller
const hasSelectAll = subscriberCode.includes("from('subscribers').select('*'");
assert.strictEqual(hasSelectAll, false, 'Should NOT use select(*) on subscribers table');
console.log('✅ [PASS] 1. Zero select(*) in subscriber controller');

// Test 2: Specific lightweight columns selected
assert.strictEqual(
  subscriberCode.includes("const LIST_COLUMNS = 'id, email, status, subscribed_at, unsubscribed_at, created_at, updated_at'"),
  true,
  'Must select only required lightweight columns'
);
console.log('✅ [PASS] 2. Specific lightweight columns selected (id, email, status, subscribed_at, etc.)');

// Test 3: Range query used with limits
assert.strictEqual(subscriberCode.includes('.range(from, to)'), true, 'Must use range(from, to)');
console.log('✅ [PASS] 3. Database range() pagination query applied');

// Test 4: Head-only count queries for minimal Supabase egress
assert.strictEqual(
  subscriberCode.includes("{ count: 'exact', head: true }"),
  true,
  'Must use head: true for zero-row egress on count queries'
);
console.log('✅ [PASS] 4. Count queries use { count: "exact", head: true } (zero row body egress)');

// Test 5: Returns totalCount, activeCount, unsubscribedCount
assert.strictEqual(subscriberCode.includes('const activeCount = activeRes?.count'), true, 'Must calculate activeCount');
assert.strictEqual(subscriberCode.includes('const unsubscribedCount = unsubscribedRes?.count'), true, 'Must calculate unsubscribedCount');
assert.strictEqual(subscriberCode.includes('totalCount,'), true, 'Must return totalCount in json');
console.log('✅ [PASS] 5. Returns totalCount, activeCount, and unsubscribedCount metadata');

// Test 6: Default page size is 25 and max is 100
assert.strictEqual(subscriberCode.includes('pageSize = 25'), true, 'Default pageSize must be 25');
assert.strictEqual(subscriberCode.includes('Math.min(100'), true, 'Max pageSize must be capped at 100');
console.log('✅ [PASS] 6. Default pageSize is 25 and capped at 100 max');

// Test 7: Frontend api.ts passes params
const apiPath = path.resolve('../frontend/src/services/api.ts');
const apiCode = fs.readFileSync(apiPath, 'utf8');
assert.strictEqual(
  apiCode.includes("getAll: (params?: { page?: number; pageSize?: number"),
  true,
  'frontend subscriberApi.getAll must accept pagination params'
);
console.log('✅ [PASS] 7. frontend subscriberApi.getAll accepts pagination params');

// Test 8: Frontend AdminDashboard has server-side pagination controls
const adminDashboardPath = path.resolve('../frontend/src/components/AdminDashboard.tsx');
const adminDashboardCode = fs.readFileSync(adminDashboardPath, 'utf8');
assert.strictEqual(
  adminDashboardCode.includes('subCurrentPage') && adminDashboardCode.includes('subTotalPages'),
  true,
  'AdminDashboard must track subCurrentPage and subTotalPages'
);
assert.strictEqual(
  adminDashboardCode.includes('Page {subCurrentPage} of {Math.max(1, subTotalPages)}'),
  true,
  'AdminDashboard must render Page X of Y'
);
assert.strictEqual(
  adminDashboardCode.includes('All ({subTotalCount})'),
  true,
  'AdminDashboard must render total database count in All tab'
);
assert.strictEqual(
  adminDashboardCode.includes('Active ({subActiveCount})'),
  true,
  'AdminDashboard must render total database active count in Active tab'
);
console.log('✅ [PASS] 8. AdminDashboard has full server-side pagination UI and exact metadata counts');

console.log('\n========================================');
console.log('🎯 Subscriber Pagination Tests: 8/8 Passed!');
console.log('========================================\n');
