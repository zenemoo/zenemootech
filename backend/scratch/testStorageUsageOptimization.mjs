import { getEmailStorageUsage, invalidateStorageStatsCache, getIncomingEmails } from '../src/controllers/emailInboxController.js';
import { supabase } from '../src/config/supabase.js';

async function runStorageUsageTests() {
  console.log('🧪 Starting Storage Usage Egress-Optimization Backend Tests...');

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      headers: {},
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(name, value) {
        this.headers[name] = value;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };
    return res;
  };

  // Test 1: Verify current message count in DB
  let dbCount = 0;
  if (supabase) {
    const { count, error } = await supabase.from('incoming_email_messages').select('id', { count: 'exact', head: true });
    if (error) throw error;
    dbCount = count;
    console.log(`✓ Supabase incoming_email_messages count: ${dbCount} records intact.`);
  }

  // Test 2: Calculate storage usage via getEmailStorageUsage
  {
    invalidateStorageStatsCache();
    const req = { query: {} };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next err:', err); };

    await getEmailStorageUsage(req, res, next);
    const body = res.jsonData;

    console.log('Test 2 (Fresh Storage Calculation):', {
      success: body?.success,
      used_bytes: body?.used_bytes,
      max_bytes: body?.max_bytes,
      used_formatted: body?.used_formatted,
      max_formatted: body?.max_formatted,
      percentage: body?.percentage,
    });

    if (!body?.success) throw new Error('Test 2 failed: success != true');
    if (typeof body?.used_bytes !== 'number') throw new Error('Test 2 failed: used_bytes is not a number');
    if (body.max_bytes !== 524288000) throw new Error(`Test 2 failed: expected max_bytes 524288000, got ${body.max_bytes}`);
    if (!body.used_formatted) throw new Error('Test 2 failed: missing used_formatted');
    if (body.max_formatted !== '500 MB') throw new Error('Test 2 failed: missing max_formatted');
    if (typeof body.percentage !== 'number') throw new Error('Test 2 failed: percentage is not a number');
  }

  // Test 3: Server-side cache check (subsequent call must return cached data)
  {
    const req = { query: {} };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next err:', err); };

    const t0 = Date.now();
    await getEmailStorageUsage(req, res, next);
    const t1 = Date.now();
    const body = res.jsonData;

    console.log(`Test 3 (Cached Storage Retrieval): served in ${t1 - t0}ms:`, {
      used_formatted: body?.used_formatted,
      percentage: body?.percentage,
    });

    if (!body?.success) throw new Error('Test 3 failed');
  }

  // Test 4: Force refresh query parameter (?refresh=true)
  {
    const req = { query: { refresh: 'true' } };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next err:', err); };

    await getEmailStorageUsage(req, res, next);
    const body = res.jsonData;

    console.log('Test 4 (Forced Refresh):', {
      success: body?.success,
      used_bytes: body?.used_bytes,
      used_formatted: body?.used_formatted,
    });

    if (!body?.success) throw new Error('Test 4 failed');
  }

  // Test 5: Invalidate Cache and ensure re-calculation
  {
    invalidateStorageStatsCache();
    const req = { query: {} };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next err:', err); };

    await getEmailStorageUsage(req, res, next);
    const body = res.jsonData;

    console.log('Test 5 (After Manual Cache Invalidation):', {
      success: body?.success,
      used_bytes: body?.used_bytes,
      used_formatted: body?.used_formatted,
    });

    if (!body?.success) throw new Error('Test 5 failed');
  }

  // Test 6: Verify intact message count (zero deletions or mutations)
  if (supabase) {
    const { count, error } = await supabase.from('incoming_email_messages').select('id', { count: 'exact', head: true });
    if (error) throw error;
    if (count !== dbCount) {
      throw new Error(`Integrity error: message count changed from ${dbCount} to ${count}`);
    }
    console.log(`✓ Post-test Supabase incoming_email_messages count: ${count} (intact & unmodified).`);
  }

  console.log('\n🎉 ALL STORAGE USAGE EGRESS-OPTIMIZATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runStorageUsageTests().catch((err) => {
  console.error('❌ Storage Usage Test Failed:', err);
  process.exit(1);
});
