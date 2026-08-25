import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import net from 'net';

/**
 * Helper to normalize Brevo Keys (ensures missing 'xsmtpsib-' prefix is handled safely)
 */
export const getNormalizedApiKey = (rawKey) => {
  let key = (rawKey || '').trim();
  if (!key) return '';
  if (!key.startsWith('xsmtpsib-') && !key.startsWith('xkeysib-')) {
    return `xsmtpsib-${key}`;
  }
  return key;
};

/**
 * 1. Environment Variables Audit (No secrets printed)
 */
export const auditEnvironmentVariables = () => {
  const smtpKey = process.env.BREVO_SMTP_KEY || '';
  const apiKey = process.env.BREVO_API_KEY || '';

  const rawKey = smtpKey || apiKey;
  let keyFormat = 'Undefined';
  if (rawKey.startsWith('xsmtpsib-')) {
    keyFormat = 'xsmtpsib- (Valid Brevo SMTP Key)';
  } else if (rawKey.startsWith('xkeysib-')) {
    keyFormat = 'xkeysib- (Valid Brevo API Key)';
  } else if (rawKey.length > 0) {
    keyFormat = 'Raw String Missing Prefix (Auto-normalized with xsmtpsib-)';
  }

  return {
    BREVO_SMTP_KEY: smtpKey ? 'Loaded' : 'Missing',
    BREVO_API_KEY: apiKey ? 'Loaded' : 'Missing',
    BREVO_SMTP_LOGIN: process.env.BREVO_SMTP_LOGIN || 'Loaded (Default: b39046001@smtp-brevo.com)',
    BREVO_SMTP_HOST: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    BREVO_SMTP_PORT: process.env.BREVO_SMTP_PORT || '587',
    keyFormat,
  };
};

/**
 * 2. DNS Resolution Test
 */
export const runDnsTest = async (host = 'smtp-relay.brevo.com') => {
  const timestamp = new Date().toISOString();
  try {
    const addresses = await dns.resolve4(host);
    return {
      timestamp,
      host,
      status: 'DNS OK',
      addresses,
    };
  } catch (err) {
    return {
      timestamp,
      host,
      status: 'DNS Failed',
      error: err.message,
      code: err.code,
    };
  }
};

/**
 * 3. Outbound TCP Socket Connectivity Test
 */
export const runTcpConnectivityTest = (host, port, timeoutMs = 5000) => {
  return new Promise((resolve) => {
    const timestamp = new Date().toISOString();
    const startTime = Date.now();
    const socket = new net.Socket();
    let isSettled = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (isSettled) return;
      isSettled = true;
      const elapsedMs = Date.now() - startTime;
      socket.destroy();
      resolve({
        timestamp,
        host,
        port,
        status: 'Connected',
        elapsedMs,
      });
    });

    socket.on('timeout', () => {
      if (isSettled) return;
      isSettled = true;
      const elapsedMs = Date.now() - startTime;
      socket.destroy();
      resolve({
        timestamp,
        host,
        port,
        status: 'Timed out',
        elapsedMs,
        error: `Outbound TCP connection to ${host}:${port} timed out after ${timeoutMs}ms`,
      });
    });

    socket.on('error', (err) => {
      if (isSettled) return;
      isSettled = true;
      const elapsedMs = Date.now() - startTime;
      socket.destroy();
      resolve({
        timestamp,
        host,
        port,
        status: err.code === 'ECONNREFUSED' ? 'Refused' : 'Failed',
        elapsedMs,
        error: err.message,
        code: err.code,
      });
    });

    socket.connect(port, host);
  });
};

/**
 * Parse recipient inputs into cleaned, deduplicated array of email strings
 * Supports:
 * - String or Array inputs
 * - Delimiters: commas, semicolons, spaces, tabs, newlines
 * - Extracting emails from angle bracket syntax (e.g. "John Doe <john@zenemoo.in>")
 * - Automatic deduplication
 */
export const parseRecipients = (input) => {
  if (input === null || input === undefined) return [];

  let rawTokens = [];
  if (Array.isArray(input)) {
    rawTokens = input.flatMap((item) => String(item).split(/[,\s\n\r;]+/));
  } else if (typeof input === 'string') {
    rawTokens = input.split(/[,\s\n\r;]+/);
  } else {
    return [];
  }

  const cleanedEmails = [];
  const seen = new Set();

  for (let token of rawTokens) {
    if (!token) continue;
    let str = token.trim();

    // Extract email from angle brackets if present: "Name <email@domain.com>"
    const angleMatch = str.match(/<([^>]+)>/);
    if (angleMatch) {
      str = angleMatch[1].trim();
    }

    // Clean surrounding quotes or brackets
    str = str.replace(/^["'<\(\[]+|["'>\)\],.]+$/g, '').trim();

    if (str && validateEmail(str)) {
      const lower = str.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        cleanedEmails.push(str);
      }
    }
  }

  return cleanedEmails;
};

/**
 * Validate single email syntax
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Basic HTML Sanitizer
 */
export const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';

  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/\s(onerror|onclick|onload|onmouseover)=["'][^"']*["']/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '');
};

/**
 * Extract Attachment Metadata for Supabase Storage (NO binary content saved)
 */
export const getMimeTypeFromFilename = (filename = '') => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'zip':
      return 'application/zip';
    case 'rar':
      return 'application/vnd.rar';
    default:
      return 'application/octet-stream';
  }
};

export const extractAttachmentMetadata = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];

  return attachments.map((attachment) => {
    const filename = attachment.filename || attachment.name || 'attachment';
    const contentType = attachment.contentType || attachment.type || getMimeTypeFromFilename(filename);

    const isImage =
      (contentType && contentType.toLowerCase().includes('image')) ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
    const isPdf =
      (contentType && contentType.toLowerCase().includes('pdf')) ||
      /\.pdf$/i.test(filename);
    const isDoc = /\.(doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip)$/i.test(filename);

    return {
      filename,
      contentType,
      image: isImage ? 'yes' : 'no',
      pdf: isPdf ? 'yes' : 'no',
      doc: isDoc ? 'yes' : 'no',
      size: attachment.size || 0,
    };
  });
};

/**
 * Normalize attachments for Nodemailer & Brevo REST API
 */
export const normalizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];

  return attachments.map((attachment) => {
    if (!attachment || typeof attachment !== 'object') return attachment;

    const filename = attachment.filename || attachment.name || 'attachment';
    const contentType = attachment.contentType || attachment.type || getMimeTypeFromFilename(filename);
    let content = attachment.content;

    if (typeof content === 'string') {
      const base64Clean = content.replace(/^data:[^;]+;base64,/, '');
      content = Buffer.from(base64Clean, 'base64');
    }

    return {
      filename,
      contentType,
      content,
      path: attachment.path,
    };
  });
};

/**
 * 4. Primary Delivery Method: Brevo HTTPS REST API v3
 */
const sendViaBrevoRestApi = async ({ requestId, sender, recipients, cc, bcc, subject, html, attachments, headers, inReplyTo, references }) => {
  console.log(`[${requestId}] 🌐 [Stage 1/2] Attempting Brevo HTTPS REST API v3 (Port 443)...`);

  const rawKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
  const apiKey = getNormalizedApiKey(rawKey);

  if (!apiKey) {
    throw {
      requestId,
      stage: 'API Key Check',
      code: 'EMISSINGKEY',
      message: 'BREVO_API_KEY or BREVO_SMTP_KEY is missing from environment variables',
      suggestion: 'Set BREVO_API_KEY or BREVO_SMTP_KEY in Render Environment Variables.',
    };
  }

  const parsedTo = parseRecipients(recipients);
  const parsedCc = parseRecipients(cc);
  const parsedBcc = parseRecipients(bcc);

  if (parsedTo.length === 0) {
    throw {
      requestId,
      stage: 'Recipient Validation',
      code: 'EINVALIDRECIPIENT',
      message: 'No valid recipient email address specified',
      suggestion: 'Provide at least one valid recipient email address.',
    };
  }

  const safeHtml = sanitizeHtml(html);

  let senderObject = { email: 'contact@zenemoo.in', name: 'Zenemoo AI Network' };
  if (typeof sender === 'string') {
    const match = sender.match(/^(?:"?([^"]*)"?\s)?<([^>]+)>$/);
    if (match) {
      senderObject = { name: match[1] || 'Zenemoo AI Network', email: match[2] };
    } else {
      senderObject = { email: sender, name: 'Zenemoo AI Network' };
    }
  } else if (sender && typeof sender === 'object' && sender.email) {
    senderObject = { email: sender.email, name: sender.name || 'Zenemoo AI Network' };
  }

  const payload = {
    sender: senderObject,
    to: parsedTo.map((email) => ({ email })),
    subject: subject || '(No Subject)',
    htmlContent: safeHtml || '<p>Zenemoo System Message</p>',
  };

  if (parsedCc.length > 0) {
    payload.cc = parsedCc.map((email) => ({ email }));
  }
  if (parsedBcc.length > 0) {
    payload.bcc = parsedBcc.map((email) => ({ email }));
  }

  if (headers && typeof headers === 'object') {
    payload.headers = headers;
  } else if (inReplyTo || references) {
    payload.headers = {};
    if (inReplyTo) payload.headers['In-Reply-To'] = inReplyTo;
    if (references) payload.headers['References'] = references;
  }

  if (Array.isArray(attachments) && attachments.length > 0) {
    payload.attachment = attachments.map((att) => {
      let contentBase64 = '';
      if (typeof att.content === 'string') {
        contentBase64 = att.content.replace(/^data:[^;]+;base64,/, '');
      } else if (Buffer.isBuffer(att.content)) {
        contentBase64 = att.content.toString('base64');
      }
      return {
        name: att.filename || att.name || 'attachment',
        content: contentBase64,
      };
    }).filter((a) => a.content && a.content.trim() !== '');
  }

  const startTime = Date.now();
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const elapsedTimeMs = Date.now() - startTime;
  const resData = await response.json();
  const brevoRequestId = response.headers.get('x-request-id') || response.headers.get('request-id') || null;

  if (!response.ok) {
    console.error(`[${requestId}] ❌ Brevo HTTPS REST API Failed (Status ${response.status}):`, resData);
    throw {
      requestId,
      stage: 'Brevo REST API Delivery',
      code: `HTTP_${response.status}`,
      status: response.status,
      message: resData?.message || `Brevo REST API Error Status ${response.status}`,
      brevoRequestId,
      responseBody: resData,
      suggestion: resData?.message?.includes('Key not found')
        ? 'Brevo API key prefix was invalid. Key auto-normalization applied.'
        : 'Verify Brevo sender authentication and quota.',
    };
  }

  console.log(`[${requestId}] ✅ Brevo HTTPS REST API Succeeded in ${elapsedTimeMs}ms. Message ID: ${resData.messageId}`);

  return {
    requestId,
    executionPath: 'Brevo REST API v3 (HTTPS Port 443)',
    elapsedTimeMs,
    httpStatus: response.status,
    messageId: resData?.messageId || `<brevo-api-${Date.now()}@zenemoo.in>`,
    brevoRequestId,
    parsedTo,
    parsedCc,
    parsedBcc,
    safeHtml,
    attachmentsMeta: extractAttachmentMetadata(attachments),
  };
};

/**
 * 5. Secondary Fallback Method: Nodemailer SMTP with Full Stage Handshake Tracing
 */
const sendViaNodemailerSmtp = async ({ requestId, sender, recipients, cc, bcc, subject, html, attachments, headers, inReplyTo, references }) => {
  console.log(`[${requestId}] ⚡ [Stage 2/2] Attempting Nodemailer SMTP Fallback...`);

  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const user = process.env.BREVO_SMTP_LOGIN || 'b39046001@smtp-brevo.com';
  const pass = getNormalizedApiKey(process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY);

  const portsToTest = [465, 587, 2525];
  let workingPort = null;
  const tcpLog = [];

  for (const port of portsToTest) {
    const res = await runTcpConnectivityTest(host, port, 5000);
    tcpLog.push(res);
    if (res.status === 'Connected') {
      workingPort = port;
      break;
    }
  }

  if (!workingPort) {
    console.error(`[${requestId}] ❌ TCP Connection Failed on all ports (465, 587, 2525):`, tcpLog);
    throw {
      requestId,
      stage: 'TCP Socket Connection',
      code: 'ETIMEDOUT',
      message: `Outbound TCP connection to ${host} timed out on all ports (465, 587, 2525).`,
      tcpLog,
      suggestion: 'Cloud host outbound firewall (Render) blocks TCP SMTP ports. Ensure Brevo REST API mode is used.',
    };
  }

  console.log(`[${requestId}] Using active SMTP port ${workingPort} (secure=${workingPort === 465})`);

  const transporter = nodemailer.createTransport({
    host,
    port: workingPort,
    secure: workingPort === 465,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  // Verification step
  console.log(`[${requestId}] Running transporter.verify()...`);
  try {
    await transporter.verify();
    console.log(`[${requestId}] ✅ SMTP transporter.verify() Passed`);
  } catch (verifyErr) {
    console.error(`[${requestId}] ❌ SMTP transporter.verify() Failed:`, verifyErr);
    throw {
      requestId,
      stage: verifyErr.command || 'SMTP Authentication',
      code: verifyErr.code || 'EAUTH',
      command: verifyErr.command,
      message: verifyErr.message,
      response: verifyErr.response,
      responseCode: verifyErr.responseCode,
      stack: verifyErr.stack,
      suggestion: 'Verify BREVO_SMTP_LOGIN and BREVO_SMTP_KEY in Render settings.',
    };
  }

  const parsedTo = parseRecipients(recipients);
  const parsedCc = parseRecipients(cc);
  const parsedBcc = parseRecipients(bcc);
  const safeHtml = sanitizeHtml(html);
  const normalizedAttachments = normalizeAttachments(attachments);

  const startTime = Date.now();
  try {
    const info = await transporter.sendMail({
      from: sender || 'contact@zenemoo.in',
      to: parsedTo,
      cc: parsedCc.length > 0 ? parsedCc : undefined,
      bcc: parsedBcc.length > 0 ? parsedBcc : undefined,
      subject: subject || '(No Subject)',
      html: safeHtml,
      attachments: normalizedAttachments,
      inReplyTo,
      references,
      headers,
    });

    const elapsedTimeMs = Date.now() - startTime;
    console.log(`[${requestId}] ✅ Nodemailer SMTP Delivery Succeeded in ${elapsedTimeMs}ms. Message ID: ${info.messageId}`);

    return {
      requestId,
      executionPath: `Nodemailer SMTP (Port ${workingPort})`,
      elapsedTimeMs,
      messageId: info.messageId,
      parsedTo,
      parsedCc,
      parsedBcc,
      safeHtml,
      attachmentsMeta: extractAttachmentMetadata(attachments),
    };
  } catch (sendErr) {
    console.error(`[${requestId}] ❌ Nodemailer sendMail() Failed:`, sendErr);
    throw {
      requestId,
      stage: sendErr.command || 'MAIL FROM / RCPT TO / DATA',
      code: sendErr.code || 'ESENDMAILFAILED',
      command: sendErr.command,
      message: sendErr.message,
      response: sendErr.response,
      responseCode: sendErr.responseCode,
      stack: sendErr.stack,
      suggestion: 'Verify sender email authorization and Brevo quotas.',
    };
  }
};

/**
 * Master Dispatcher with Request ID Tracking & Stage Logs
 */
export const sendMailViaBrevo = async ({ sender, recipients, cc, bcc, subject, html, attachments, headers, inReplyTo, references }) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();

  console.log(`\n====================================================`);
  console.log(`🚀 [${requestId}] Starting Email Dispatch Task at ${new Date().toISOString()}`);
  console.log(`====================================================`);

  let apiError = null;

  // 1. Attempt Primary REST API
  try {
    const res = await sendViaBrevoRestApi({ requestId, sender, recipients, cc, bcc, subject, html, attachments, headers, inReplyTo, references });
    console.log(`🎯 [${requestId}] Execution Finished. Total Elapsed Time: ${Date.now() - startTime}ms`);
    return res;
  } catch (err) {
    apiError = err;
    console.warn(`⚠️ [${requestId}] Brevo REST API Failed. Attempting Nodemailer SMTP Fallback...`);
  }

  // 2. Attempt SMTP Fallback ONLY if REST API fails
  try {
    const res = await sendViaNodemailerSmtp({ requestId, sender, recipients, cc, bcc, subject, html, attachments, headers, inReplyTo, references });
    console.log(`🎯 [${requestId}] Execution Finished (SMTP Fallback). Total Elapsed Time: ${Date.now() - startTime}ms`);
    return res;
  } catch (smtpError) {
    const totalElapsedMs = Date.now() - startTime;
    console.error(`💥 [${requestId}] All Dispatch Protocols Failed in ${totalElapsedMs}ms`);

    throw {
      requestId,
      totalElapsedMs,
      stage: apiError?.stage || smtpError?.stage || 'Email Dispatch',
      code: smtpError?.code || apiError?.code || 'EALLFAILED',
      message: smtpError?.message || apiError?.message || 'Email dispatch failed across both REST API and SMTP protocols',
      response: smtpError?.response || apiError?.response,
      responseCode: smtpError?.responseCode || apiError?.status || apiError?.responseCode,
      command: smtpError?.command || apiError?.command,
      stack: smtpError?.stack || apiError?.stack,
      suggestion:
        smtpError?.suggestion ||
        apiError?.suggestion ||
        'Verify BREVO_API_KEY / BREVO_SMTP_KEY in Render Environment Variables.',
    };
  }
};

/**
 * Production Diagnostic Suite (Live Engine Probe for /api/email/diagnose)
 */
export const runFullEmailDiagnostics = async () => {
  const requestId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';

  console.log(`\n--- [${requestId}] Running Live System Diagnostic Probe ---`);

  const envAudit = auditEnvironmentVariables();
  const dnsRes = await runDnsTest(host);

  const tcpPorts = [465, 587, 2525];
  const tcpResults = [];
  for (const p of tcpPorts) {
    const tcpRes = await runTcpConnectivityTest(host, p, 4000);
    tcpResults.push(tcpRes);
  }

  let verifyResult = null;
  const user = process.env.BREVO_SMTP_LOGIN || 'b39046001@smtp-brevo.com';
  const pass = getNormalizedApiKey(process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
    await transporter.verify();
    verifyResult = { status: 'Verify OK (Port 465 SSL)' };
  } catch (vErr) {
    verifyResult = {
      status: 'Verify Failed',
      stage: vErr.command || 'SMTP Auth',
      code: vErr.code,
      message: vErr.message,
      command: vErr.command,
      response: vErr.response,
      responseCode: vErr.responseCode,
    };
  }

  const elapsedTimeMs = Date.now() - startTime;

  return {
    requestId,
    timestamp: new Date().toISOString(),
    elapsedTimeMs,
    envAudit,
    dnsCheck: dnsRes,
    tcpPortConnectivity: tcpResults,
    transporterVerify: verifyResult,
  };
};
