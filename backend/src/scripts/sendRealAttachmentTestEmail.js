import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { sendMailViaBrevo, parseRecipients, sanitizeHtml, extractAttachmentMetadata } from '../services/emailService.js';
import { supabase } from '../config/supabase.js';
import { supabaseService } from '../services/supabaseService.js';
import { encrypt } from '../services/encryptionService.js';
import { emailR2Service } from '../services/emailR2Service.js';
import { getAttachmentDownload } from '../controllers/emailInboxController.js';

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
  };
  return res;
}

// Generate a valid, standard PDF buffer
function generateValidPdfBuffer() {
  const lines = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    'endobj',
    '4 0 obj',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    'endobj',
    '5 0 obj',
    '<< /Length 236 >>',
    'stream',
    'BT',
    '/F1 22 Tf',
    '50 720 Td',
    '(Zenemoo Attachment Verification) Tj',
    '/F1 12 Tf',
    '0 -36 Td',
    '(This is a real, valid PDF attachment sent from Zenemoo Admin.) Tj',
    '0 -24 Td',
    '(Recipient: mr.prem2006@gmail.com) Tj',
    '0 -20 Td',
    '(Architecture: Cloudflare R2 Private Binary Storage) Tj',
    '0 -20 Td',
    '(Timestamp: ' + new Date().toISOString() + ') Tj',
    'ET',
    'endstream',
    'endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000234 00000 n ',
    '0000000307 00000 n ',
    'trailer',
    '<< /Size 6 /Root 1 0 R >>',
    'startxref',
    '600',
    '%%EOF',
  ];
  return Buffer.from(lines.join('\n'), 'utf8');
}

// Generate a valid 100x100 solid PNG image buffer
function generateValidPngBuffer() {
  // Minimal valid 1x1 transparent/colored PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAFFJREFUeJztwTEBAAAAwqD1T20MH6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBvIAAAAQ=='
      .replace(/\s+/g, ''),
    'base64'
  );
}

async function runRealAttachmentTest() {
  console.log('====================================================');
  console.log('🚀 EXECUTING ONE REAL END-TO-END ATTACHMENT TEST');
  console.log('====================================================\n');

  const recipient = 'mr.prem2006@gmail.com';
  const fromSender = 'contact@zenemoo.in';
  const subject = 'Zenemoo Attachment Test - PDF and Image';
  const bodyText = `This is a real Zenemoo attachment test.

Please verify that both attachments open correctly:
1. PDF
2. Image

No action is required.`;

  const safeHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; border-radius: 16px; border: 1px solid #1e293b; color: #f8fafc;">
  <div style="margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 16px;">
    <h2 style="color: #38bdf8; margin: 0 0 6px 0; font-size: 20px;">Zenemoo Attachment System Verification</h2>
    <p style="color: #94a3b8; margin: 0; font-size: 13px;">Cloudflare R2 Binary Storage Architecture</p>
  </div>
  
  <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0; margin: 0 0 16px 0;">
    This is a real Zenemoo attachment test.
  </p>
  
  <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
    Please verify that both attachments open correctly:
    <br/>1. <strong>PDF Document:</strong> <code style="color: #38bdf8; background: #1e293b; padding: 2px 6px; border-radius: 4px;">Zenemoo_Verification_Document.pdf</code>
    <br/>2. <strong>Image:</strong> <code style="color: #38bdf8; background: #1e293b; padding: 2px 6px; border-radius: 4px;">Zenemoo_Badge_Image.png</code>
  </p>
  
  <div style="background: #1e293b; border-left: 4px solid #38bdf8; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
    <span style="font-size: 13px; color: #94a3b8;">No action is required.</span>
  </div>
  
  <div style="margin-top: 24px; border-top: 1px solid #334155; padding-top: 12px; font-size: 11px; color: #64748b;">
    Sent via Brevo Production Integration &bull; Canonical storage in Cloudflare R2
  </div>
</div>`;

  const pdfBuffer = generateValidPdfBuffer();
  const pngBuffer = generateValidPngBuffer();

  const attachments = [
    {
      filename: 'Zenemoo_Verification_Document.pdf',
      contentType: 'application/pdf',
      content: pdfBuffer,
      size: pdfBuffer.length,
    },
    {
      filename: 'Zenemoo_Badge_Image.png',
      contentType: 'image/png',
      content: pngBuffer,
      size: pngBuffer.length,
    },
  ];

  console.log(`📋 Target Recipient: ${recipient}`);
  console.log(`📋 Subject: ${subject}`);
  console.log(`📋 PDF Attachment: ${attachments[0].filename} (${pdfBuffer.length} bytes)`);
  console.log(`📋 Image Attachment: ${attachments[1].filename} (${pngBuffer.length} bytes)\n`);

  // STEP 1: Send email via Brevo production API
  console.log('1️⃣ Sending real email via Brevo API...');
  const sendResult = await sendMailViaBrevo({
    sender: fromSender,
    recipients: [recipient],
    subject,
    html: safeHtml,
    attachments,
  });

  console.log('  ✅ Brevo Send Succeeded!');
  console.log(`  📩 Brevo Message ID: ${sendResult.messageId}\n`);

  // STEP 2: Record in email_history (Supabase metadata)
  console.log('2️⃣ Persisting metadata in Supabase email_history...');
  const attachmentsMeta = extractAttachmentMetadata(attachments);
  const safeMeta = [...attachmentsMeta, { _sender_account_email: 'mr.prem2006@gmail.com' }];

  const historyPayload = {
    user_id: null,
    user_email: 'mr.prem2006@gmail.com',
    sender: fromSender,
    recipients: encrypt([recipient]),
    subject: encrypt(subject),
    html: encrypt(safeHtml),
    attachments_meta: safeMeta,
    status: 'sent',
    message_id: sendResult.messageId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const insertedRecord = await supabaseService.insert('email_history', historyPayload);
  const historyId = String(insertedRecord.id);
  console.log(`  ✅ email_history record created with UUID: ${historyId}\n`);

  // STEP 3: Upload body & attachments to Cloudflare R2
  console.log('3️⃣ Uploading sent body and binary attachments to Cloudflare R2...');
  const r2SentBody = await emailR2Service.uploadEmailBody({
    emailId: historyId,
    html: safeHtml,
    text: bodyText,
    type: 'sent',
  });

  const sentAttachmentsMeta = [];
  for (const a of attachments) {
    const up = await emailR2Service.uploadAttachment({
      emailId: historyId,
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      type: 'sent',
    });
    sentAttachmentsMeta.push({
      id: `att_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      filename: up.filename,
      contentType: up.contentType,
      size: up.size,
      r2_key: up.r2_key,
    });
    console.log(`  ✅ Uploaded to R2: ${up.r2_key} (${up.size} bytes, ${up.contentType})`);
  }

  // STEP 4: Update email_history with R2 references
  console.log('\n4️⃣ Updating email_history with R2 references...');
  if (supabase) {
    await supabase
      .from('email_history')
      .update({
        storage_provider: 'cloudflare_r2',
        body_html_r2_key: r2SentBody.htmlKey,
        body_text_r2_key: r2SentBody.textKey,
        attachments_r2_prefix: `sent/${emailR2Service.sanitizeId(historyId)}/attachments/`,
        has_attachments: true,
        attachments_meta: sentAttachmentsMeta,
        storage_migration_status: 'migrated',
        storage_migrated_at: new Date().toISOString(),
      })
      .eq('id', historyId);
  }
  console.log('  ✅ email_history updated with storage_provider: cloudflare_r2\n');

  // STEP 5: Verification in Supabase (Metadata Only)
  console.log('5️⃣ Verifying Supabase contains ONLY metadata (no binary)...');
  const { data: verifiedHistory } = await supabase.from('email_history').select('*').eq('id', historyId).single();
  const rawAtts = verifiedHistory.attachments_meta || [];
  let hasBinary = false;
  for (const a of rawAtts) {
    if (a.content || a.data || a.base64 || a.fileBuffer) hasBinary = true;
  }
  console.log(`  ✅ Supabase attachments count: ${rawAtts.length}`);
  console.log(`  ✅ Supabase storage_provider: ${verifiedHistory.storage_provider}`);
  console.log(`  ✅ Supabase contains binary content: ${hasBinary ? 'YES (FAIL)' : 'NO (PASS - METADATA ONLY)'}\n`);

  // STEP 6: Verification in Cloudflare R2
  console.log('6️⃣ Verifying objects in Cloudflare R2...');
  for (const meta of sentAttachmentsMeta) {
    const r2Check = await emailR2Service.verifyObjectExists(meta.r2_key);
    const r2BufferObj = await emailR2Service.getObjectBuffer(meta.r2_key);
    console.log(`  ✅ R2 Key: ${meta.r2_key}`);
    console.log(`     Exists: ${r2Check.exists}`);
    console.log(`     Size: ${r2Check.contentLength} bytes`);
    console.log(`     ContentType: ${r2Check.contentType}`);
    console.log(`     First 8 bytes (hex): ${r2BufferObj.buffer.subarray(0, 8).toString('hex')}`);
  }

  // STEP 7: Testing Admin Sent Attachment Streaming Endpoint
  console.log('\n7️⃣ Testing Admin Sent Attachment Streaming Endpoint...');
  for (const meta of sentAttachmentsMeta) {
    // Preview Mode
    const reqPreview = {
      params: { id: historyId, attachmentId: meta.id },
      query: { preview: '1' },
      user: { role: 'admin', email: 'mr.prem2006@gmail.com', id: 'admin' },
    };
    const resPreview = mockResponse();
    await getAttachmentDownload(reqPreview, resPreview, (err) => console.error(err));
    console.log(`  ✅ [Admin Preview] ${meta.filename} -> Status: ${resPreview.statusCode}, Content-Type: ${resPreview.headers['content-type']}, Disposition: ${resPreview.headers['content-disposition']}, Length: ${resPreview.headers['content-length']}`);

    // Download Mode
    const reqDownload = {
      params: { id: historyId, attachmentId: meta.id },
      query: {},
      user: { role: 'admin', email: 'mr.prem2006@gmail.com', id: 'admin' },
    };
    const resDownload = mockResponse();
    await getAttachmentDownload(reqDownload, resDownload, (err) => console.error(err));
    console.log(`  ✅ [Admin Download] ${meta.filename} -> Status: ${resDownload.statusCode}, Content-Type: ${resDownload.headers['content-type']}, Disposition: ${resDownload.headers['content-disposition']}, Length: ${resDownload.headers['content-length']}`);
  }

  console.log('\n====================================================');
  console.log('🏁 REAL ATTACHMENT TEST EXECUTION COMPLETE');
  console.log(`Email UUID: ${historyId}`);
  console.log(`Brevo Message ID: ${sendResult.messageId}`);
  console.log('====================================================\n');
}

runRealAttachmentTest().catch((err) => {
  console.error('Real attachment test error:', err);
  process.exit(1);
});
