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
 * Split recipient string into address tokens without breaking display names with spaces or quoted commas
 */
export const splitAddressTokens = (raw) => {
  if (!raw || typeof raw !== 'string') return [];
  const tokens = [];
  let current = '';
  let inAngle = false;
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === '<') {
      inAngle = true;
      current += char;
    } else if (char === '>') {
      inAngle = false;
      current += char;
    } else if ((char === ',' || char === ';' || char === '\n' || char === '\r') && !inAngle && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }
  return tokens;
};

/**
 * Parse recipient inputs into cleaned, deduplicated array of email strings
 * Supports:
 * - String or Array inputs
 * - Delimiters: commas, semicolons, tabs, newlines
 * - Extracting emails from display names (e.g. "Jane Doe <jane@zenemoo.in>", "Doe, Jane <jane@zenemoo.in>")
 * - Automatic deduplication case-insensitively
 */
export const parseRecipients = (input) => {
  if (input === null || input === undefined) return [];

  let rawList = [];
  if (Array.isArray(input)) {
    rawList = input.flatMap((item) => splitAddressTokens(String(item)));
  } else if (typeof input === 'string') {
    rawList = splitAddressTokens(input);
  } else {
    return [];
  }

  const cleanedEmails = [];
  const seen = new Set();

  for (let item of rawList) {
    if (!item) continue;
    let str = item.trim();

    // Extract email from angle brackets: "Jane Doe <jane@domain.com>"
    const angleMatch = str.match(/<([^>]+)>/);
    if (angleMatch) {
      str = angleMatch[1].trim();
    } else if (str.includes(' ') && !str.includes('<')) {
      // Space-separated list of bare emails (e.g. "a@b.com c@d.com")
      const subTokens = str.split(/\s+/);
      for (const st of subTokens) {
        const cleanSt = st.replace(/^["'<\(\[]+|["'>\)\],.]+$/g, '').trim();
        if (cleanSt && validateEmail(cleanSt)) {
          const lower = cleanSt.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            cleanedEmails.push(cleanSt);
          }
        }
      }
      continue;
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
 * Convert HTML to clean, readable plain text for multipart email delivery
 */
export const htmlToPlainText = (html) => {
  if (!html || typeof html !== 'string') return '';

  let text = html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gis, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis, '')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gis, '');

  // Handle blockquote quotes
  text = text.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gis, (_m, content) => {
    const lines = htmlToPlainText(content).split('\n');
    return '\n' + lines.map((line) => `> ${line}`).join('\n') + '\n';
  });

  // Handle list items
  text = text.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gis, (_m, content) => {
    const itemText = content.replace(/<[^>]+>/g, '').trim();
    return `\n• ${itemText}`;
  });

  // Handle links: <a href="url">text</a> -> text (url)
  text = text.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gis, (_m, href, content) => {
    const linkText = content.replace(/<[^>]+>/g, '').trim();
    if (!href || href.startsWith('javascript:') || href === '#') return linkText;
    if (linkText && linkText !== href) {
      return `${linkText} (${href})`;
    }
    return href;
  });

  // Structural line breaks
  text = text
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|table|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
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
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis, '')
    .replace(/\s(onerror|onclick|onload|onmouseover|onfocus|onblur|onsubmit)\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gis, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gis, '')
    .replace(/<embed\b[^>]*>/gis, '')
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
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
const sendViaBrevoRestApi = async ({ requestId, sender, recipients, cc, bcc, subject, html, text, attachments, headers, inReplyTo, references }) => {
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

  // Brevo REST API v3 requires an API key (xkeysib-). If key has SMTP prefix (xsmtpsib-), fast-fallback to SMTP Relay
  if (apiKey.startsWith('xsmtpsib-')) {
    throw {
      requestId,
      stage: 'REST API Format Guard',
      code: 'ESMTPKEY_NOT_REST',
      message: 'Configured Brevo key uses SMTP prefix (xsmtpsib-). Bypassing REST API to invoke SMTP Relay directly.',
      suggestion: 'Provide an xkeysib- API key for Brevo REST v3, or use SMTP Relay.',
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
  const plainText = text || htmlToPlainText(safeHtml);

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
    textContent: plainText || 'Zenemoo System Message',
  };

  if (parsedCc.length > 0) {
    payload.cc = parsedCc.map((email) => ({ email }));
  }
  if (parsedBcc.length > 0) {
    payload.bcc = parsedBcc.map((email) => ({ email }));
  }

  const mergedHeaders = headers && typeof headers === 'object' ? { ...headers } : {};
  if (inReplyTo) mergedHeaders['In-Reply-To'] = inReplyTo;
  if (references) mergedHeaders['References'] = references;
  if (Object.keys(mergedHeaders).length > 0) {
    payload.headers = mergedHeaders;
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
const sendViaNodemailerSmtp = async ({ requestId, sender, recipients, cc, bcc, subject, html, text, attachments, headers, inReplyTo, references }) => {
  console.log(`[${requestId}] ⚡ [Stage 2/2] Attempting Nodemailer SMTP Fallback...`);

  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const user = process.env.BREVO_SMTP_LOGIN || 'b39046001@smtp-brevo.com';
  const pass = getNormalizedApiKey(process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY);

  const configuredPort = parseInt(process.env.BREVO_SMTP_PORT, 10) || 587;
  const fallbackPorts = [587, 465, 2525];
  const portsToTest = [configuredPort, ...fallbackPorts.filter((p) => p !== configuredPort)];
  let workingPort = null;
  const tcpLog = [];

  for (const port of portsToTest) {
    const res = await runTcpConnectivityTest(host, port, 3000);
    tcpLog.push(res);
    if (res.status === 'Connected') {
      workingPort = port;
      break;
    }
  }

  if (!workingPort) {
    console.error(`[${requestId}] ❌ TCP Connection Failed on all ports (${portsToTest.join(', ')}):`, tcpLog);
    throw {
      requestId,
      stage: 'TCP Socket Connection',
      code: 'ETIMEDOUT',
      message: `Outbound TCP connection to ${host} timed out on all tested ports (${portsToTest.join(', ')}).`,
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

  let fromAddress = 'Zenemoo Security <contact@zenemoo.in>';
  if (typeof sender === 'string' && sender.trim()) {
    fromAddress = sender.trim();
  } else if (sender && typeof sender === 'object') {
    if (sender.name && sender.email) {
      fromAddress = `"${sender.name}" <${sender.email}>`;
    } else if (sender.email) {
      fromAddress = sender.email;
    } else if (sender.address) {
      fromAddress = sender.name ? `"${sender.name}" <${sender.address}>` : sender.address;
    }
  }

  const parsedTo = parseRecipients(recipients || to);
  const parsedCc = parseRecipients(cc);
  const parsedBcc = parseRecipients(bcc);
  const safeHtml = sanitizeHtml(html);
  const plainText = text || htmlToPlainText(safeHtml);
  const normalizedAttachments = normalizeAttachments(attachments);

  const mergedHeaders = headers && typeof headers === 'object' ? { ...headers } : {};
  if (inReplyTo && !mergedHeaders['In-Reply-To']) mergedHeaders['In-Reply-To'] = inReplyTo;
  if (references && !mergedHeaders['References']) mergedHeaders['References'] = references;

  const startTime = Date.now();
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: parsedTo,
      cc: parsedCc.length > 0 ? parsedCc : undefined,
      bcc: parsedBcc.length > 0 ? parsedBcc : undefined,
      subject: subject || '(No Subject)',
      text: plainText,
      html: safeHtml,
      attachments: normalizedAttachments,
      inReplyTo,
      references,
      headers: Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined,
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
export const sendMailViaBrevo = async ({ sender, recipients, to, cc, bcc, subject, html, text, attachments, headers, inReplyTo, references }) => {
  const targetRecipients = recipients || to;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();

  console.log(`\n====================================================`);
  console.log(`🚀 [${requestId}] Starting Email Dispatch Task at ${new Date().toISOString()}`);
  console.log(`====================================================`);

  let apiError = null;

  // 1. Attempt Primary REST API
  try {
    const res = await sendViaBrevoRestApi({ requestId, sender, recipients: targetRecipients, cc, bcc, subject, html, text, attachments, headers, inReplyTo, references });
    console.log(`🎯 [${requestId}] Execution Finished. Total Elapsed Time: ${Date.now() - startTime}ms`);
    return res;
  } catch (err) {
    apiError = err;
    console.warn(`⚠️ [${requestId}] Brevo REST API Failed. Attempting Nodemailer SMTP Fallback...`);
  }

  // 2. Attempt SMTP Fallback ONLY if REST API fails
  try {
    const res = await sendViaNodemailerSmtp({ requestId, sender, recipients: targetRecipients, cc, bcc, subject, html, text, attachments, headers, inReplyTo, references });
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
