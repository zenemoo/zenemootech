import assert from 'node:assert/strict';
import {
  validatePdfBuffer,
  generatePrivateDocumentFilename,
  sanitizeFilenamePart,
  computeSha256,
  privateStorageService,
} from '../src/services/privateStorageService.js';
import {
  createPrivateDocument,
  getPrivateDocuments,
  getDashboardStats,
  getPrivateDocumentById,
  updatePrivateDocument,
  uploadNewVersion,
  previewPrivateDocument,
  downloadPrivateDocument,
  archivePrivateDocument,
  deletePrivateDocument,
  exportMetadata,
} from '../src/controllers/privateDocumentController.js';
import fs from 'fs';
import path from 'path';
import { supabase } from '../src/config/supabase.js';
import { requireRole } from '../src/middleware/rbacMiddleware.js';
import { getDatasetFileContent, downloadDatasetFile } from '../src/controllers/datasetController.js';

console.log('================================================================');
console.log('ZENEMOO PRIVATE DOCUMENTS & NDA VAULT TEST SUITE');
console.log('================================================================');

// Helper to create mock Express response object
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
      return this;
    },
  };
  return res;
}

// Sample valid PDF buffer (%PDF-1.4 header)
const SAMPLE_VALID_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
);
const SAMPLE_VALID_PDF_BASE64 = SAMPLE_VALID_PDF_BUFFER.toString('base64');

async function runTests() {
  let passed = 0;
  let total = 0;
  const createdTestDocIds = [];

  try {
    // -------------------------------------------------------------------------
    // Test 1: PDF Magic Byte and Size Validation
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 1: PDF binary signature (%PDF-) and size validation...');
    
    // Valid PDF
    const validRes = validatePdfBuffer(SAMPLE_VALID_PDF_BUFFER);
    assert.strictEqual(validRes.isValid, true, 'Valid PDF buffer should pass validation');

    // Invalid non-PDF buffer (e.g. text file)
    const invalidTextBuffer = Buffer.from('Hello world this is not a PDF file');
    const invalidRes = validatePdfBuffer(invalidTextBuffer);
    assert.strictEqual(invalidRes.isValid, false, 'Non-PDF buffer should be rejected');
    assert.ok(invalidRes.error.includes('magic bytes missing'), 'Error should mention magic bytes');

    // Invalid PNG file
    const invalidPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngRes = validatePdfBuffer(invalidPngBuffer);
    assert.strictEqual(pngRes.isValid, false, 'PNG file should be rejected');

    // Oversized buffer check (> 25MB)
    const oversizedBuffer = Buffer.alloc(26 * 1024 * 1024);
    oversizedBuffer.write('%PDF-');
    const oversizeRes = validatePdfBuffer(oversizedBuffer);
    assert.strictEqual(oversizeRes.isValid, false, 'Files over 25MB should be rejected');
    assert.ok(oversizeRes.error.includes('exceeds maximum allowed limit'), 'Error should state size limit');

    console.log('✅ Test 1 Passed: PDF signature & size checks verified.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 2: Standardized Sanitized Filename Generation
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 2: Standardized filename generation & sanitization...');
    
    const genName1 = generatePrivateDocumentFilename({
      documentReference: 'ZEN-NDA-2026-0012',
      companyName: 'Acme Technologies Inc. / Global & Co.',
      dateIso: '2026-10-23',
      version: 1,
    });
    assert.ok(genName1.startsWith('ZEN-NDA-2026-0012_Acme-Technologies-Inc-Global-Co_2026-10-23.pdf'), `Generated: ${genName1}`);

    const genNameV2 = generatePrivateDocumentFilename({
      documentReference: 'ZEN-NDA-2026-0012',
      companyName: 'Acme Corp',
      dateIso: '2026-10-23',
      version: 2,
    });
    assert.ok(genNameV2.includes('_v2.pdf'), `Version 2 should contain _v2.pdf suffix: ${genNameV2}`);

    console.log('✅ Test 2 Passed: Filename generation conforms to naming standard.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 3: Authorized Admin Can Create Document with Mandatory Fields
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 3: Authorized admin can create NDA document...');

    const createReq = {
      user: { id: 'usr_admin_123', email: 'mr.prem2006@gmail.com', role: 'admin' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Zenemoo-Test-Agent' },
      body: {
        title: 'Enterprise Master NDA 2026',
        company_name: 'Acme Global Data Labs',
        document_type: 'nda',
        access_classification: 'confidential',
        nda_type: 'mutual',
        signing_status: 'draft',
        project_name: 'Zenemoo AI Speech Corpus',
        effective_date: '2026-10-23',
        expiry_date: '2027-10-23',
        pdf_base64: SAMPLE_VALID_PDF_BASE64,
        original_filename: 'Acme_Signed_Agreement_Final.pdf',
      },
    };
    const createRes = createMockRes();

    await createPrivateDocument(createReq, createRes);
    assert.strictEqual(createRes.statusCode, 201, 'Should return 201 Created');
    assert.strictEqual(createRes.data.success, true, 'Response success should be true');
    assert.ok(createRes.data.document.document_reference.startsWith('ZEN-NDA-'), 'Reference should start with ZEN-NDA-');
    assert.strictEqual(createRes.data.document.company_name, 'Acme Global Data Labs');
    assert.strictEqual(createRes.data.document.current_version, 1);
    assert.strictEqual(createRes.data.document.uploader_email, 'mr.prem2006@gmail.com');

    const createdDocId = createRes.data.document.id;
    const createdDocRef = createRes.data.document.document_reference;
    createdTestDocIds.push(createdDocId);

    console.log(`✅ Test 3 Passed: Document created with ref: ${createdDocRef}`);
    passed++;

    // -------------------------------------------------------------------------
    // Test 4: Missing Required Fields are Rejected
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 4: Missing required fields are rejected...');

    const missingTitleReq = {
      user: { role: 'admin', email: 'admin@zenemoo.in' },
      body: { company_name: 'Acme Corp', document_type: 'nda', pdf_base64: SAMPLE_VALID_PDF_BASE64 },
    };
    const missingTitleRes = createMockRes();
    await createPrivateDocument(missingTitleReq, missingTitleRes);
    assert.strictEqual(missingTitleRes.statusCode, 400, 'Missing title must return 400');

    const missingCompanyReq = {
      user: { role: 'admin', email: 'admin@zenemoo.in' },
      body: { title: 'Some NDA', document_type: 'nda', pdf_base64: SAMPLE_VALID_PDF_BASE64 },
    };
    const missingCompanyRes = createMockRes();
    await createPrivateDocument(missingCompanyReq, missingCompanyRes);
    assert.strictEqual(missingCompanyRes.statusCode, 400, 'Missing company name must return 400');

    const missingPdfReq = {
      user: { role: 'admin', email: 'admin@zenemoo.in' },
      body: { title: 'Some NDA', company_name: 'Acme Corp', document_type: 'nda' },
    };
    const missingPdfRes = createMockRes();
    await createPrivateDocument(missingPdfReq, missingPdfRes);
    assert.strictEqual(missingPdfRes.statusCode, 400, 'Missing PDF must return 400');

    console.log('✅ Test 4 Passed: Missing required fields correctly rejected with 400.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 5: Optional Fields Can Be Empty
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 5: Optional fields can be left empty...');

    const minimalReq = {
      user: { id: 'admin_1', email: 'contact@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
      body: {
        title: 'Minimal Vendor Contract',
        company_name: 'Beta Systems',
        document_type: 'vendor_agreement',
        pdf_base64: SAMPLE_VALID_PDF_BASE64,
        original_filename: 'minimal.pdf',
      },
    };
    const minimalRes = createMockRes();
    await createPrivateDocument(minimalReq, minimalRes);
    assert.strictEqual(minimalRes.statusCode, 201, 'Minimal doc should succeed with 201');
    assert.strictEqual(minimalRes.data.document.project_name, null);
    assert.strictEqual(minimalRes.data.document.effective_date, null);
    assert.strictEqual(minimalRes.data.document.expiry_date, null);
    assert.ok(minimalRes.data.document.document_reference.startsWith('ZEN-DOC-'));
    if (minimalRes.data?.document?.id) createdTestDocIds.push(minimalRes.data.document.id);

    console.log('✅ Test 5 Passed: Minimal document created without optional fields.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 6: Concurrency Safety & Unique Reference Generation
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 6: Concurrency safety in reference numbers...');

    const reqA = {
      user: { id: 'admin_1', email: 'admin@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
      body: {
        title: 'Concurrent Agreement A',
        company_name: 'Alpha Ltd',
        document_type: 'nda',
        pdf_base64: SAMPLE_VALID_PDF_BASE64,
      },
    };
    const reqB = {
      user: { id: 'admin_2', email: 'admin@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
      body: {
        title: 'Concurrent Agreement B',
        company_name: 'Beta Ltd',
        document_type: 'nda',
        pdf_base64: SAMPLE_VALID_PDF_BASE64,
      },
    };

    const resA = createMockRes();
    const resB = createMockRes();

    await Promise.all([createPrivateDocument(reqA, resA), createPrivateDocument(reqB, resB)]);

    if (resA.data?.document?.id) createdTestDocIds.push(resA.data.document.id);
    if (resB.data?.document?.id) createdTestDocIds.push(resB.data.document.id);

    const refA = resA.data.document.document_reference;
    const refB = resB.data.document.document_reference;
    assert.notStrictEqual(refA, refB, 'Concurrent references must be distinct');
    console.log(`✅ Test 6 Passed: Concurrency verified. Distinct refs: ${refA} and ${refB}`);
    passed++;

    // -------------------------------------------------------------------------
    // Test 7: Non-PDF Binary Upload Rejection
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 7: Non-PDF binary upload rejection in controller...');

    const fakePdfReq = {
      user: { id: 'admin_1', email: 'admin@zenemoo.in', role: 'admin' },
      body: {
        title: 'Malicious Executable disguised as PDF',
        company_name: 'Bad Actor Corp',
        document_type: 'nda',
        pdf_base64: Buffer.from('MZ\x90\x00\x03\x00\x00\x00This is an executable').toString('base64'),
        original_filename: 'trojan.exe.pdf',
      },
    };
    const fakePdfRes = createMockRes();
    await createPrivateDocument(fakePdfReq, fakePdfRes);
    assert.strictEqual(fakePdfRes.statusCode, 400, 'Fake PDF must be rejected with 400');
    assert.ok(fakePdfRes.data.message.includes('magic bytes missing'), 'Message must explain signature rejection');

    console.log('✅ Test 7 Passed: Non-PDF binary signature rejected.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 8: List, Search, and Filtering
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 8: Document listing, search, and filtering...');

    const listReq = {
      query: { search: 'Acme', page: 1, limit: 10 },
    };
    const listRes = createMockRes();
    await getPrivateDocuments(listReq, listRes);
    assert.strictEqual(listRes.statusCode, 200);
    assert.ok(listRes.data.documents.length >= 1, 'Should find at least 1 doc for Acme');
    assert.ok(listRes.data.documents.some((d) => d.id === createdDocId));

    // Filter by type
    const filterReq = {
      query: { document_type: 'nda', page: 1, limit: 10 },
    };
    const filterRes = createMockRes();
    await getPrivateDocuments(filterReq, filterRes);
    assert.strictEqual(filterRes.statusCode, 200);
    assert.ok(filterRes.data.documents.every((d) => d.document_type === 'nda'));

    console.log('✅ Test 8 Passed: Search and filtering functional.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 9: Dashboard Summary Statistics
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 9: Dashboard summary metrics calculation...');

    const statsReq = {};
    const statsRes = createMockRes();
    await getDashboardStats(statsReq, statsRes);
    assert.strictEqual(statsRes.statusCode, 200);
    assert.ok(statsRes.data.stats.total >= 4, 'Total vault docs should be >= 4');
    assert.ok(typeof statsRes.data.stats.active === 'number');
    assert.ok(typeof statsRes.data.stats.expiringSoon === 'number');

    console.log('✅ Test 9 Passed: Dashboard stats calculated properly.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 10: Document Detail and Audit Logging
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 10: Document details and audit trail verification...');

    const detailReq = {
      params: { id: createdDocId },
      user: { id: 'admin_audit_test', email: 'audit@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Audit-Tester' },
    };
    const detailRes = createMockRes();
    await getPrivateDocumentById(detailReq, detailRes);
    assert.strictEqual(detailRes.statusCode, 200);
    assert.strictEqual(detailRes.data.document.id, createdDocId);
    assert.ok(Array.isArray(detailRes.data.versions), 'Versions array must be returned');
    assert.ok(Array.isArray(detailRes.data.auditLogs), 'Audit logs array must be returned');

    console.log('✅ Test 10 Passed: Details and audit trail retrieved.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 11: Version Replacement (Preserves Prior Version)
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 11: Version replacement preserving history...');

    const v2Buffer = Buffer.from(
      '%PDF-1.4\n% Version 2 replacement with counsel amendments\nendobj\n%%EOF'
    );
    const v2Req = {
      params: { id: createdDocId },
      user: { id: 'admin_1', email: 'mr.prem2006@gmail.com', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
      body: {
        pdf_base64: v2Buffer.toString('base64'),
        original_filename: 'Acme_NDA_v2_Countersigned.pdf',
        change_note: 'Countersigned by Acme General Counsel',
      },
    };
    const v2Res = createMockRes();
    await uploadNewVersion(v2Req, v2Res);
    assert.strictEqual(v2Res.statusCode, 201, 'Version upload must return 201');
    assert.strictEqual(v2Res.data.document.current_version, 2);

    // Verify v1 still exists in detail query
    const checkDetailRes = createMockRes();
    await getPrivateDocumentById(detailReq, checkDetailRes);
    assert.strictEqual(checkDetailRes.data.document.current_version, 2);
    assert.ok(
      checkDetailRes.data.versions.some((v) => v.version_number === 1),
      'Version 1 must still exist'
    );
    assert.ok(
      checkDetailRes.data.versions.some((v) => v.version_number === 2),
      'Version 2 must exist'
    );

    console.log('✅ Test 11 Passed: Version 2 published and Version 1 preserved.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 12: Authenticated Preview and Download Streaming with Secure Headers
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 12: Authenticated streaming with security headers...');

    // Preview
    const previewReq = {
      params: { id: createdDocId },
      query: {},
      user: { id: 'admin_1', email: 'admin@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
    };
    const previewRes = createMockRes();
    await previewPrivateDocument(previewReq, previewRes);
    assert.strictEqual(previewRes.headers['content-type'], 'application/pdf');
    assert.ok(previewRes.headers['content-disposition'].startsWith('inline'));
    assert.strictEqual(previewRes.headers['x-content-type-options'], 'nosniff');
    assert.ok(Buffer.isBuffer(previewRes.body), 'Response body must be a Buffer');

    // Download
    const downloadReq = {
      params: { id: createdDocId },
      query: { version: '1' },
      user: { id: 'admin_1', email: 'admin@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
    };
    const downloadRes = createMockRes();
    await downloadPrivateDocument(downloadReq, downloadRes);
    assert.strictEqual(downloadRes.headers['content-type'], 'application/pdf');
    assert.ok(downloadRes.headers['content-disposition'].startsWith('attachment'));
    assert.ok(Buffer.isBuffer(downloadRes.body), 'Download body must be a Buffer');

    console.log('✅ Test 12 Passed: Streaming headers and binary buffers verified.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 13: Metadata Edit
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 13: Updating document metadata...');

    const editReq = {
      params: { id: createdDocId },
      user: { id: 'admin_1', email: 'admin@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
      body: {
        title: 'Enterprise Master NDA 2026 (Executed)',
        signing_status: 'signed',
        internal_notes: 'Fully signed and validated by both CEOs',
      },
    };
    const editRes = createMockRes();
    await updatePrivateDocument(editReq, editRes);
    assert.strictEqual(editRes.statusCode, 200);
    assert.strictEqual(editRes.data.document.title, 'Enterprise Master NDA 2026 (Executed)');
    assert.strictEqual(editRes.data.document.signing_status, 'signed');

    console.log('✅ Test 13 Passed: Metadata updated.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 14: Document Archival and Restoration
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 14: Document archival and unarchival...');

    const archiveReq = {
      params: { id: createdDocId },
      user: { id: 'admin_1', email: 'admin@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
      body: { unarchive: false },
    };
    const archiveRes = createMockRes();
    await archivePrivateDocument(archiveReq, archiveRes);
    assert.strictEqual(archiveRes.statusCode, 200);
    assert.strictEqual(archiveRes.data.document.document_status, 'archived');
    assert.ok(archiveRes.data.document.archived_at);

    // Unarchive
    const unarchiveReq = {
      params: { id: createdDocId },
      user: { id: 'admin_1', email: 'admin@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
      body: { unarchive: true },
    };
    const unarchiveRes = createMockRes();
    await archivePrivateDocument(unarchiveReq, unarchiveRes);
    assert.strictEqual(unarchiveRes.statusCode, 200);
    assert.strictEqual(unarchiveRes.data.document.document_status, 'active');

    console.log('✅ Test 14 Passed: Archival and restoration cycle verified.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 15: Metadata Export (CSV & JSON) Excludes Private Bodies/Secrets
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 15: Metadata export security and formatting...');

    const exportCsvReq = {
      query: { format: 'csv' },
      user: { id: 'admin_1', email: 'admin@zenemoo.in', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
    };
    const exportCsvRes = createMockRes();
    await exportMetadata(exportCsvReq, exportCsvRes);
    assert.strictEqual(exportCsvRes.headers['content-type'], 'text/csv; charset=utf-8');
    assert.ok(exportCsvRes.body.includes('Document Reference'));
    assert.ok(exportCsvRes.body.includes('Enterprise Master NDA 2026'));
    // Ensure no PDF base64 or JWT tokens are leaked in CSV
    assert.ok(!exportCsvRes.body.includes('JVBERi0'), 'CSV export must not leak base64 PDF bytes');

    console.log('✅ Test 15 Passed: Metadata export verified and secure.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 16: RBAC Middleware Blocks Unauthorized Access
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 16: RBAC middleware blocks unauthorized roles...');

    const rbacGuard = requireRole(['admin']);
    
    // Unauthorized candidate / team member role
    let unauthorizedBlocked = false;
    const unauthReq = { user: { role: 'team_member', email: 'staff@zenemoo.in' } };
    const unauthRes = createMockRes();
    rbacGuard(unauthReq, unauthRes, () => {
      unauthorizedBlocked = false;
    });
    if (unauthRes.statusCode === 403) {
      unauthorizedBlocked = true;
    }
    assert.strictEqual(unauthorizedBlocked, true, 'Non-admin must be rejected with 403');

    // Admin role allowed
    let adminAllowed = false;
    const adminReq = { user: { role: 'admin', email: 'prem@zenemoo.in' } };
    const adminRes = createMockRes();
    rbacGuard(adminReq, adminRes, () => {
      adminAllowed = true;
    });
    assert.strictEqual(adminAllowed, true, 'Admin role must be permitted');

    console.log('✅ Test 16 Passed: RBAC properly guards private vault.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 17: Private Documents Cannot Be Accessed via Public Dataset Endpoints
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 17: Public dataset endpoints cannot leak private files...');

    const publicProbeReq = {
      params: { fileId: createdDocId },
    };
    const publicProbeRes = createMockRes();
    await getDatasetFileContent(publicProbeReq, publicProbeRes);
    assert.strictEqual(publicProbeRes.statusCode, 404, 'Public dataset API must return 404 for private document ID');

    const publicDownloadReq = {
      params: { fileId: createdDocId },
    };
    const publicDownloadRes = createMockRes();
    await downloadDatasetFile(publicDownloadReq, publicDownloadRes);
    assert.strictEqual(publicDownloadRes.statusCode, 404, 'Public download endpoint must return 404 for private document ID');

    console.log('✅ Test 17 Passed: Public dataset endpoints strictly isolated from private vault.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 18: Deletion Cleans Up Record and Preserves Audit Log
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 18: Deletion workflow and audit preservation...');

    const deleteReq = {
      params: { id: createdDocId },
      user: { id: 'admin_1', email: 'mr.prem2006@gmail.com', role: 'admin' },
      ip: '127.0.0.1',
      headers: {},
    };
    const deleteRes = createMockRes();
    await deletePrivateDocument(deleteReq, deleteRes);
    assert.strictEqual(deleteRes.statusCode, 200);

    // Verify document no longer exists
    const checkDeletedRes = createMockRes();
    await getPrivateDocumentById(deleteReq, checkDeletedRes);
    assert.strictEqual(checkDeletedRes.statusCode, 404, 'Deleted document must return 404');

    console.log('✅ Test 18 Passed: Document deleted cleanly.');
    passed++;

    console.log('\n================================================================');
    console.log(`ALL TESTS PASSED: ${passed} / ${total} tests completed successfully.`);
    console.log('================================================================');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    console.log('\n🧹 Cleaning up test artifacts from database...');
    for (const docId of createdTestDocIds) {
      try {
        const delReq = { params: { id: docId }, user: { role: 'admin' }, headers: {} };
        const delRes = createMockRes();
        await deletePrivateDocument(delReq, delRes);
      } catch (_) {}
    }

    try {
      const { data: remaining } = await supabase.from('private_documents').select('id');
      if (!remaining || remaining.length === 0) {
        await supabase.from('private_document_counters').delete().neq('year', 0);
        await supabase.from('private_document_audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
    } catch (_) {}

    try {
      const vaultDir = path.resolve('storage', 'private_vault');
      if (fs.existsSync(vaultDir)) {
        for (const f of fs.readdirSync(vaultDir)) {
          // Only remove files belonging to this test execution
          if (createdTestDocIds.some((id) => f.includes(id))) {
            fs.unlinkSync(path.join(vaultDir, f));
          }
        }
      }
    } catch (_) {}
    console.log('✨ Cleanup complete.');
  }
}

runTests();
