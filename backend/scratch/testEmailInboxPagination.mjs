import { getIncomingEmails, getSentEmails, getAttachmentDownload } from '../src/controllers/emailInboxController.js';
import { supabase } from '../src/config/supabase.js';

async function runEmailInboxTests() {
  console.log('🧪 Starting Admin Email Inbox Backend Tests...');

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
      send(data) {
        this.sentData = data;
        return this;
      },
      redirect(url) {
        this.redirectUrl = url;
        return this;
      }
    };
    return res;
  };

  // Test 1: Fetch Incoming with Default Pagination (pageSize: 20)
  {
    const req = { query: {} };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next err:', err); };

    await getIncomingEmails(req, res, next);
    const body = res.jsonData;
    console.log('Test 1 (Incoming Default Pagination):', {
      success: body?.success,
      total: body?.total,
      unreadCount: body?.unreadCount,
      page: body?.page,
      pageSize: body?.pageSize,
      totalPages: body?.totalPages,
      emailCount: body?.emails?.length,
    });

    if (!body?.success || typeof body?.total !== 'number' || typeof body?.unreadCount !== 'number') {
      throw new Error('Test 1 failed: invalid response structure');
    }
    if (body.pageSize !== 20) {
      throw new Error(`Test 1 failed: expected pageSize 20, got ${body.pageSize}`);
    }
    if (body.emails.length > 20) {
      throw new Error(`Test 1 failed: returned ${body.emails.length} items > 20`);
    }

    // Verify list items do not contain heavy body_html
    if (body.emails.length > 0) {
      const first = body.emails[0];
      if (first.body_html !== undefined) {
        throw new Error('Test 1 failed: body_html was included in list query');
      }
    }
  }

  // Test 2: Custom PageSize & Page Capping
  {
    const req = { query: { page: 1, pageSize: 5 } };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next err:', err); };

    await getIncomingEmails(req, res, next);
    const body = res.jsonData;
    console.log('Test 2 (PageSize=5):', {
      pageSize: body?.pageSize,
      emailsLength: body?.emails?.length,
    });

    if (body.pageSize !== 5) {
      throw new Error(`Test 2 failed: expected pageSize 5, got ${body.pageSize}`);
    }

    // Test max cap of 100
    const reqMax = { query: { pageSize: 500 } };
    const resMax = createMockRes();
    await getIncomingEmails(reqMax, resMax, next);
    if (resMax.jsonData?.pageSize > 100) {
      throw new Error(`Test 2 failed: pageSize ${resMax.jsonData?.pageSize} exceeds max 100`);
    }
  }

  // Test 3: Search Query
  {
    const req = { query: { search: 'zenemoo', page: 1, pageSize: 10 } };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next err:', err); };

    await getIncomingEmails(req, res, next);
    const body = res.jsonData;
    console.log('Test 3 (Search "zenemoo"):', {
      success: body?.success,
      total: body?.total,
      emailsLength: body?.emails?.length,
    });

    if (!body?.success) {
      throw new Error('Test 3 failed: search failed');
    }
  }

  // Test 4: View Filter (unread, starred, archived, trash)
  {
    const req = { query: { view: 'unread', page: 1, pageSize: 10 } };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next err:', err); };

    await getIncomingEmails(req, res, next);
    const body = res.jsonData;
    console.log('Test 4 (View "unread"):', {
      success: body?.success,
      total: body?.total,
      emailsLength: body?.emails?.length,
    });

    if (!body?.success) {
      throw new Error('Test 4 failed');
    }
  }

  // Test 5: Sent Emails Pagination
  {
    const req = { query: { page: 1, pageSize: 20 } };
    const res = createMockRes();
    const next = (err) => { if (err) console.error('Next err:', err); };

    await getSentEmails(req, res, next);
    const body = res.jsonData;
    console.log('Test 5 (Sent Emails Pagination):', {
      success: body?.success,
      total: body?.total,
      page: body?.page,
      pageSize: body?.pageSize,
      emailsLength: body?.emails?.length,
    });

    if (!body?.success || typeof body?.total !== 'number') {
      throw new Error('Test 5 failed: invalid sent emails response');
    }
  }

  console.log('✅ ALL EMAIL INBOX BACKEND TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runEmailInboxTests().catch((err) => {
  console.error('❌ Email Inbox Test Failed:', err);
  process.exit(1);
});
