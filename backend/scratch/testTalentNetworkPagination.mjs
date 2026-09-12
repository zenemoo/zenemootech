import { getRegistrationsAdmin } from '../src/controllers/talentRegistrationController.js';
import { getSubscribers } from '../src/controllers/subscriberController.js';
import { getApplications } from '../src/controllers/opportunityApplicationController.js';

let passedCount = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Starting Server-Side Pagination & Egress Optimization Tests...\n');

  // Test 1: Talent Network pagination default page 1 with 25 records
  {
    let responseData = null;
    const req = {
      query: { page: '1', pageSize: '25' }
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await getRegistrationsAdmin(req, res);
    assert(responseData && responseData.success === true, 'Talent Network getRegistrationsAdmin returns success');
    assert(responseData && responseData.page === 1, 'Talent Network page is 1');
    assert(responseData && responseData.pageSize === 25, 'Talent Network default pageSize is 25');
    assert(responseData && typeof responseData.total === 'number', 'Talent Network returns true total count metadata');
    assert(responseData && responseData.stats && typeof responseData.stats.total === 'number', 'Talent Network returns stats object with DB counts');
    assert(responseData && Array.isArray(responseData.data) && responseData.data.length <= 25, 'Talent Network data array is bounded by pageSize');
  }

  // Test 2: Talent Network Page 2 requests next page
  {
    let responseData = null;
    const req = {
      query: { page: '2', pageSize: '25' }
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await getRegistrationsAdmin(req, res);
    assert(responseData && responseData.page === 2, 'Talent Network page 2 returns page 2');
  }

  // Test 3: Talent Network pageSize safety capping at 100
  {
    let responseData = null;
    const req = {
      query: { page: '1', pageSize: '1000' } // Should be capped at 100
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await getRegistrationsAdmin(req, res);
    assert(responseData && responseData.pageSize === 100, 'Talent Network pageSize capped safely at 100 max');
  }

  // Test 4: Talent Network server-side search filter
  {
    let responseData = null;
    const req = {
      query: { search: 'Chandan', page: '1', pageSize: '25' }
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await getRegistrationsAdmin(req, res);
    assert(responseData && responseData.success === true, 'Talent Network server-side search executes cleanly');
  }

  // Test 5: Subscribers pagination & count metadata
  {
    let responseData = null;
    const req = {
      query: { page: '1', pageSize: '25' }
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await getSubscribers(req, res, () => {});
    assert(responseData && responseData.success === true, 'Subscribers getSubscribers returns success');
    assert(responseData && responseData.page === 1, 'Subscribers page is 1');
    assert(responseData && responseData.pageSize === 25, 'Subscribers pageSize is 25');
    assert(responseData && typeof responseData.total === 'number', 'Subscribers returns total count');
    assert(responseData && typeof responseData.activeCount === 'number', 'Subscribers returns true activeCount');
  }

  // Test 6: Opportunity Applications server-side pagination
  {
    let responseData = null;
    const req = {
      query: { page: '1', pageSize: '25' }
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await getApplications(req, res);
    assert(responseData && responseData.status === 'success', 'Opportunity Applications getApplications returns success');
    assert(responseData && responseData.page === 1, 'Opportunity Applications page is 1');
    assert(responseData && responseData.pageSize === 25, 'Opportunity Applications pageSize is 25');
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passedCount}/${totalTests} tests passed`);
  console.log(`========================================\n`);

  if (passedCount === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
