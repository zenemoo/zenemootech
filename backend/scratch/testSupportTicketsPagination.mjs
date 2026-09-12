import { getSupportTickets } from '../src/controllers/supportController.js';
import { supabase } from '../src/config/supabase.js';

async function runTests() {
  console.log('🧪 Starting Support Tickets Pagination & Query Tests...');

  // Mock res helper
  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };
    return res;
  };

  // Test 1: Fetch with default pagination (pageSize: 25)
  {
    const req = { query: {} };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next called with error:', err); };

    await getSupportTickets(req, res, next);
    const body = res.jsonData;
    console.log('Test 1 (Default Pagination):', {
      success: body?.success,
      total: body?.total,
      openCount: body?.openCount,
      count: body?.count,
      page: body?.page,
      pageSize: body?.pageSize,
      totalPages: body?.totalPages,
      dataLength: body?.data?.length,
    });

    if (!body?.success || typeof body?.total !== 'number' || typeof body?.openCount !== 'number') {
      throw new Error('Test 1 failed: invalid response structure');
    }
    if (body.data.length > 25) {
      throw new Error(`Test 1 failed: returned ${body.data.length} items which exceeds pageSize 25`);
    }
  }

  // Test 2: Fetch with custom pageSize=2
  {
    const req = { query: { page: 1, pageSize: 2 } };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next called with error:', err); };

    await getSupportTickets(req, res, next);
    const body = res.jsonData;
    console.log('Test 2 (PageSize=2):', {
      success: body?.success,
      total: body?.total,
      openCount: body?.openCount,
      count: body?.count,
      page: body?.page,
      pageSize: body?.pageSize,
      totalPages: body?.totalPages,
      dataLength: body?.data?.length,
    });

    if (body.pageSize !== 2) {
      throw new Error(`Test 2 failed: expected pageSize 2, got ${body.pageSize}`);
    }
  }

  // Test 3: Search filter
  {
    const req = { query: { search: 'test', page: 1, pageSize: 10 } };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next called with error:', err); };

    await getSupportTickets(req, res, next);
    const body = res.jsonData;
    console.log('Test 3 (Search "test"):', {
      success: body?.success,
      total: body?.total,
      openCount: body?.openCount,
      count: body?.count,
    });

    if (!body?.success) {
      throw new Error('Test 3 failed');
    }
  }

  // Test 4: Status filter
  {
    const req = { query: { status: 'Open', page: 1, pageSize: 10 } };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next called with error:', err); };

    await getSupportTickets(req, res, next);
    const body = res.jsonData;
    console.log('Test 4 (Status "Open"):', {
      success: body?.success,
      total: body?.total,
      count: body?.count,
    });

    if (!body?.success) {
      throw new Error('Test 4 failed');
    }
  }

  console.log('✅ ALL SUPPORT TICKETS CONTROLLER TESTS PASSED!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
