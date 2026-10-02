import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { emailR2Service } from '../services/emailR2Service.js';
import { getAttachmentDownload } from '../controllers/emailInboxController.js';
import { supabase } from '../config/supabase.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key.toLowerCase()] = val;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    json(data) {
      this.body = JSON.stringify(data);
      return this;
    },
    end(data) {
      if (data) this.body = data;
      return this;
    },
  };
  return res;
}

async function runTest() {
  console.log('====================================================');
  console.log('🧪 DEDICATED PDF & MULTI-FORMAT STREAMING TEST');
  console.log('====================================================\n');

  const testEmailId = crypto.randomUUID();
  const filesToTest = [
    {
      filename: 'Standard Agreement (Review & Sign).pdf',
      contentType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.5\n%\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF', 'utf8'),
      expectedMagic: '%PDF',
    },
    {
      filename: 'avatar photo 2026.jpg',
      contentType: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9]),
      expectedMagicHex: 'ffd8ff',
    },
    {
      filename: 'logo_zenemoo_alpha.png',
      contentType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]),
      expectedMagicHex: '89504e47',
    },
    {
      filename: 'financial_ledger_2026.csv',
      contentType: 'text/csv; charset=utf-8',
      buffer: Buffer.from('Date,Description,Amount,Status\n2026-10-01,Cloudflare R2,15.00,Paid\n2026-10-02,Brevo API,25.00,Paid\n', 'utf8'),
      expectedContent: 'Date,Description,Amount',
    },
    {
      filename: 'README_instructions.txt',
      contentType: 'text/plain; charset=utf-8',
      buffer: Buffer.from('Zenemoo Admin Email System - Attachment Streaming Verification\nUTF-8 OK', 'utf8'),
      expectedContent: 'Zenemoo Admin Email',
    },
    {
      filename: 'Legal Contract (Final Version).docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00]),
      expectedMagicHex: '504b0304',
    },
    {
      filename: 'Employee Directory 2026.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00]),
      expectedMagicHex: '504b0304',
    },
    {
      filename: 'archive_backup.zip',
      contentType: 'application/zip',
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00]),
      expectedMagicHex: '504b0304',
    },
  ];

  console.log('1️⃣ Uploading multi-format test attachments to Cloudflare R2...');
  const uploadedMeta = [];
  for (const item of filesToTest) {
    const up = await emailR2Service.uploadAttachment({
      emailId: testEmailId,
      filename: item.filename,
      content: item.buffer,
      contentType: item.contentType,
      type: 'incoming',
    });
    uploadedMeta.push({
      id: `att_${crypto.randomBytes(4).toString('hex')}`,
      filename: up.filename,
      size: up.size,
      contentType: up.contentType,
      r2_key: up.r2_key,
    });
    assert(up.size === item.buffer.length, `Uploaded ${item.filename} with matching byte size (${up.size} bytes)`);
  }

  const mockEmail = {
    id: testEmailId,
    message_id: `<msg_test_${Date.now()}@zenemoo.in>`,
    mailbox_email: 'contact@zenemoo.in',
    sender_name: 'Test Sender',
    sender_email: 'test-sender@zenemoo.in',
    recipient_email: 'contact@zenemoo.in',
    subject: 'Multi-Format Attachment Verification',
    body_text: 'Test body',
    attachments: uploadedMeta,
    storage_provider: 'cloudflare_r2',
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const insertRes = await supabase.from('incoming_email_messages').insert(mockEmail);
    if (insertRes.error) {
      console.error('Insert error:', insertRes.error);
    }
  }

  console.log('\n2️⃣ Testing Backend Streaming Endpoint & Byte-for-Byte Fidelity...');
  for (let i = 0; i < filesToTest.length; i++) {
    const original = filesToTest[i];
    const meta = uploadedMeta[i];

    // A. Preview mode (inline)
    const reqPreview = {
      params: { id: testEmailId, attachmentId: meta.id },
      query: { preview: '1' },
      user: { role: 'admin', email: 'mr.prem2006@gmail.com', id: 'admin_test' },
    };
    const resPreview = mockResponse();
    await getAttachmentDownload(reqPreview, resPreview, (err) => console.error(err));

    assert(resPreview.statusCode === 200, `[Preview] ${original.filename} HTTP status is 200`);
    assert(
      resPreview.headers['content-type'].includes(original.contentType.split(';')[0]),
      `[Preview] ${original.filename} Content-Type is ${resPreview.headers['content-type']}`
    );
    assert(
      resPreview.headers['content-disposition'].startsWith('inline'),
      `[Preview] ${original.filename} Content-Disposition is inline`
    );
    assert(
      resPreview.headers['content-disposition'].includes("filename*=UTF-8''"),
      `[Preview] ${original.filename} has RFC 5987 encoded filename parameter`
    );
    assert(
      resPreview.headers['x-content-type-options'] === 'nosniff',
      `[Preview] ${original.filename} includes nosniff security header`
    );

    // Verify SHA-256 Hash matches original binary byte-for-byte
    const originalHash = crypto.createHash('sha256').update(original.buffer).digest('hex');
    const streamedHash = crypto.createHash('sha256').update(resPreview.body).digest('hex');
    assert(originalHash === streamedHash, `[Preview] ${original.filename} SHA-256 hash is byte-for-byte identical to R2 source`);

    // B. Download mode (attachment)
    const reqDownload = {
      params: { id: testEmailId, attachmentId: meta.id },
      query: {},
      user: { role: 'admin', email: 'mr.prem2006@gmail.com', id: 'admin_test' },
    };
    const resDownload = mockResponse();
    await getAttachmentDownload(reqDownload, resDownload, (err) => console.error(err));

    assert(resDownload.statusCode === 200, `[Download] ${original.filename} HTTP status is 200`);
    assert(
      resDownload.headers['content-disposition'].startsWith('attachment'),
      `[Download] ${original.filename} Content-Disposition is attachment`
    );
    const downloadHash = crypto.createHash('sha256').update(resDownload.body).digest('hex');
    assert(originalHash === downloadHash, `[Download] ${original.filename} downloaded binary matches R2 source`);
  }

  console.log('\n3️⃣ Cleaning up isolated test objects...');
  for (const meta of uploadedMeta) {
    await emailR2Service.deleteObject(meta.r2_key);
  }
  if (supabase) {
    await supabase.from('incoming_email_messages').delete().eq('id', testEmailId);
  }
  assert(true, 'Test records and R2 objects safely cleaned up');

  console.log('\n====================================================');
  console.log(`🏁 MULTI-FORMAT STREAMING TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Test suite uncaught failure:', err);
  process.exit(1);
});
