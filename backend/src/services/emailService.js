import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import net from 'net';

/**
 * Helper to normalize Brevo Keys (ensures missing 'xsmtpsib-' prefix is handled safely)
 */
const getNormalizedApiKey = (rawKey) => {
  let key = (rawKey || '').trim();
  if (!key) return '';
  if (!key.startsWith('xsmtpsib-') && !key.startsWith('xkeysib-')) {
    return `xsmtpsib-${key}`;
  }
  return key;
};

/**
 * Step 1: Environment Variables Diagnostic Check
 */
export const verifyEnvironmentVariables = () => {
  const envStatus = {
    BREVO_SMTP_KEY: process.env.BREVO_SMTP_KEY ? 'Loaded' : 'Missing',
    BREVO_API_KEY: process.env.BREVO_API_KEY ? 'Loaded' : 'Missing',
    BREVO_SMTP_LOGIN: process.env.BREVO_SMTP_LOGIN ? 'Loaded' : 'Missing',
    BREVO_SMTP_HOST: process.env.BREVO_SMTP_HOST ? 'Loaded' : 'Missing',
    BREVO_SMTP_PORT: process.env.BREVO_SMTP_PORT ? 'Loaded' : 'Missing',
  };

  const rawKey = process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY || '';
  const keyType = rawKey.startsWith('xsmtpsib-')
    ? 'xsmtpsib (SMTP Key)'
    : rawKey.startsWith('xkeysib-')
    ? 'xkeysib (API Key)'
    : rawKey.length > 0
    ? 'Raw String (Prefix missing)'
    : 'None';

  console.log('--- [Step 1: Environment Variables Status] ---');
  console.log(JSON.stringify({ ...envStatus, detectedKeyType: keyType }, null, 2));

  return { envStatus, keyType };
};

/**
 * Step 5 & 7: DNS Resolution Test
 */
export const testDnsResolution = async (host) => {
  console.log(`--- [Step 5/7: Testing DNS Resolution for ${host}] ---`);
  try {
    const addresses = await dns.resolve4(host);
    console.log(`✅ DNS OK: ${host} resolved to IPv4 addresses:`, addresses);
    return { success: true, addresses };
  } catch (dnsErr) {
    console.error(`❌ DNS FAILED: Could not resolve ${host}:`, dnsErr.message);
    return { success: false, error: dnsErr.message, code: dnsErr.code };
  }
};

/**
 * Step 6: Outbound TCP Socket Connectivity Test
 */
export const testTcpPortConnectivity = (host, port, timeoutMs = 5000) => {
  return new Promise((resolve) => {
    console.log(`--- [Step 6: Testing Outbound TCP Socket to ${host}:${port}] ---`);
    const socket = new net.Socket();
    let isHandled = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (isHandled) return;
      isHandled = true;
      console.log(`✅ TCP OK: Socket connected to ${host}:${port}`);
      socket.destroy();
      resolve({ success: true, port, stage: 'TCP Connection OK' });
    });

    socket.on('timeout', () => {
      if (isHandled) return;
      isHandled = true;
      console.error(`❌ TCP TIMEOUT: ${host}:${port} did not respond within ${timeoutMs}ms`);
      socket.destroy();
      resolve({ success: false, port, stage: 'TCP Socket Timeout', error: `Outbound connection to ${host}:${port} timed out after ${timeoutMs}ms` });
    });

    socket.on('error', (err) => {
      if (isHandled) return;
      isHandled = true;
      console.error(`❌ TCP ERROR on ${host}:${port}:`, err.message);
      socket.destroy();
      resolve({ success: false, port, stage: 'TCP Connection Error', error: err.message, code: err.code });
    });

    socket.connect(port, host);
  });
};

/**
 * Parse recipient inputs into cleaned array of email strings
 */
export const parseRecipients = (input) => {
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
  if (!input || typeof input !== 'string') return [];

  return input
    .split(/[,\n\r;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
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
export const extractAttachmentMetadata = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];

  return attachments.map((attachment) => {
    const filename = attachment.filename || attachment.name || 'attachment';
    const contentType = attachment.contentType || 'application/octet-stream';

    const isImage =
      (contentType && contentType.toLowerCase().includes('image')) ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
    const isPdf =
      (contentType && contentType.toLowerCase().includes('pdf')) ||
      /\.pdf$/i.test(filename);

    return {
      filename,
      contentType,
      image: isImage ? 'yes' : 'no',
      pdf: isPdf ? 'yes' : 'no',
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

    const filename = attachment.filename || attachment.name || 'file';
    let content = attachment.content;

    if (typeof content === 'string' && content.startsWith('data:')) {
      const match = content.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        content = Buffer.from(match[2], 'base64');
      }
    } else if (typeof content === 'string' && attachment.encoding === 'base64') {
      content = Buffer.from(content, 'base64');
    }

    return {
      filename,
      contentType: attachment.contentType || 'application/octet-stream',
      content,
      path: attachment.path,
    };
  });
};

/**
 * Primary Method: Brevo Transactional HTTPS REST API v3 (Port 443 - Bypasses Cloud Provider SMTP Port Blocking)
 */
const sendViaBrevoRestApi = async ({ sender, recipients, cc, bcc, subject, html, attachments }) => {
  console.log('--- [Dispatch Strategy 1: Brevo HTTPS REST API v3] ---');

  const envKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
  const apiKey = getNormalizedApiKey(envKey);

  if (!apiKey) {
    throw {
      stage: 'API Key Check',
      message: 'BREVO_API_KEY or BREVO_SMTP_KEY is missing from environment variables',
      suggestion: 'Set BREVO_API_KEY or BREVO_SMTP_KEY in environment variables.',
    };
  }

  const parsedTo = parseRecipients(recipients);
  const parsedCc = parseRecipients(cc);
  const parsedBcc = parseRecipients(bcc);

  if (parsedTo.length === 0) {
    throw {
      stage: 'Recipient Validation',
      message: 'No valid recipient email address specified',
      suggestion: 'Provide at least one valid recipient email address.',
    };
  }

  const safeHtml = sanitizeHtml(html);

  const payload = {
    sender: { email: sender || 'contact@zenemoo.in', name: 'Zenemoo Tech' },
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

  if (Array.isArray(attachments) && attachments.length > 0) {
    payload.attachment = attachments.map((att) => {
      let contentBase64 = '';
      if (typeof att.content === 'string') {
        contentBase64 = att.content.replace(/^data:.+;base64,/, '');
      } else if (Buffer.isBuffer(att.content)) {
        contentBase64 = att.content.toString('base64');
      }
      return {
        name: att.filename || att.name || 'attachment',
        content: contentBase64,
      };
    }).filter((a) => a.content);
  }

  console.log('Sending HTTPS REST API request to https://api.brevo.com/v3/smtp/email...');
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const resData = await response.json();

  if (!response.ok) {
    console.error('❌ Brevo HTTPS REST API error:', resData);
    throw {
      stage: 'Brevo REST API Delivery',
      code: response.status,
      message: resData?.message || `Brevo REST API Error ${response.status}`,
      responseCode: response.status,
      suggestion: resData?.message?.includes('Key not found')
        ? 'Verify that BREVO_API_KEY or BREVO_SMTP_KEY is a valid Brevo key.'
        : 'Verify Brevo sender authentication and quota.',
    };
  }

  console.log('✅ Brevo HTTPS REST API Delivery Succeeded:', resData.messageId);

  return {
    method: 'Brevo REST API (HTTPS Port 443)',
    messageId: resData?.messageId || `<brevo-api-${Date.now()}@zenemoo.in>`,
    parsedTo,
    parsedCc,
    parsedBcc,
    safeHtml,
    attachmentsMeta: extractAttachmentMetadata(attachments),
  };
};

/**
 * Secondary Method: Nodemailer SMTP with Full Handshake Diagnostics & Verification
 */
const sendViaNodemailerSmtp = async ({ sender, recipients, cc, bcc, subject, html, attachments }) => {
  console.log('--- [Dispatch Strategy 2: Nodemailer SMTP Handshake] ---');

  // Step 1: Environment Variables Audit
  const { envStatus } = verifyEnvironmentVariables();
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const user = process.env.BREVO_SMTP_LOGIN || 'b39046001@smtp-brevo.com';
  const pass = getNormalizedApiKey(process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY);

  if (!user || !pass) {
    throw {
      stage: 'SMTP Configuration Audit',
      message: 'SMTP Username or Password is missing in environment variables',
      suggestion: 'Ensure BREVO_SMTP_LOGIN and BREVO_SMTP_KEY are defined on Render.',
    };
  }

  // Step 5 & 7: DNS Check
  const dnsRes = await testDnsResolution(host);
  if (!dnsRes.success) {
    throw {
      stage: 'DNS Resolution',
      code: dnsRes.code,
      message: `Failed to resolve ${host}: ${dnsRes.error}`,
      suggestion: 'Check Render outbound DNS resolution settings.',
    };
  }

  // Step 6 & 8: Multi-Port TCP & TLS Socket Tests (Ports 465, 587, 2525)
  const portsToTest = [465, 587, 2525];
  let workingPort = null;
  let socketErrors = [];

  for (const p of portsToTest) {
    const tcpResult = await testTcpPortConnectivity(host, p, 5000);
    if (tcpResult.success) {
      workingPort = p;
      break;
    } else {
      socketErrors.push(tcpResult);
    }
  }

  if (!workingPort) {
    console.error('❌ Outbound TCP connections to all SMTP ports (465, 587, 2525) failed:', socketErrors);
    throw {
      stage: 'TCP Socket Connection',
      message: `Outbound connection to ${host} on ports 465, 587, 2525 timed out or was blocked by host firewall.`,
      socketErrors,
      suggestion: 'Cloud host firewall (Render) is blocking raw outbound TCP SMTP ports. Ensure Brevo HTTPS REST API mode is active.',
    };
  }

  console.log(`Using working SMTP Port: ${workingPort} (secure=${workingPort === 465})`);

  // Step 2, 8 & 9: Create & Configure Transporter
  const transporter = nodemailer.createTransport({
    host,
    port: workingPort,
    secure: workingPort === 465, // Port 465 -> secure: true, Port 587/2525 -> secure: false
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: true,
    },
  });

  // Step 3 & 14: Step-by-Step Transporter Verification
  console.log('--- [Step 3/14: Running transporter.verify()] ---');
  try {
    await transporter.verify();
    console.log('✅ SMTP Transporter Connection & Authentication Verified Successfully!');
  } catch (verifyErr) {
    console.error('❌ SMTP Transporter Verification Failed:', {
      code: verifyErr.code,
      message: verifyErr.message,
      response: verifyErr.response,
      command: verifyErr.command,
    });

    throw {
      stage: verifyErr.command || 'SMTP Authentication',
      code: verifyErr.code || 'EAUTH',
      message: verifyErr.message || 'SMTP Authentication Failed',
      response: verifyErr.response,
      responseCode: verifyErr.responseCode,
      command: verifyErr.command,
      suggestion: 'Verify BREVO_SMTP_LOGIN and BREVO_SMTP_KEY credentials in Brevo Dashboard.',
    };
  }

  // Step 4 & 16: Dispatch Mail via Verified Transporter
  const parsedTo = parseRecipients(recipients);
  const parsedCc = parseRecipients(cc);
  const parsedBcc = parseRecipients(bcc);
  const safeHtml = sanitizeHtml(html);
  const normalizedAttachments = normalizeAttachments(attachments);

  console.log('--- [Step 4/16: Executing sendMail()] ---');
  try {
    const info = await transporter.sendMail({
      from: sender || 'contact@zenemoo.in',
      to: parsedTo,
      cc: parsedCc.length > 0 ? parsedCc : undefined,
      bcc: parsedBcc.length > 0 ? parsedBcc : undefined,
      subject: subject || '(No Subject)',
      html: safeHtml,
      attachments: normalizedAttachments,
    });

    console.log('✅ Nodemailer SMTP Delivery Succeeded. Message ID:', info.messageId);

    return {
      method: `Nodemailer SMTP (Port ${workingPort})`,
      messageId: info.messageId,
      parsedTo,
      parsedCc,
      parsedBcc,
      safeHtml,
      attachmentsMeta: extractAttachmentMetadata(attachments),
    };
  } catch (sendErr) {
    console.error('❌ Nodemailer sendMail Failed:', {
      code: sendErr.code,
      message: sendErr.message,
      response: sendErr.response,
      responseCode: sendErr.responseCode,
      command: sendErr.command,
    });

    throw {
      stage: sendErr.command || 'MAIL FROM / RCPT TO / DATA',
      code: sendErr.code,
      message: sendErr.message,
      response: sendErr.response,
      responseCode: sendErr.responseCode,
      command: sendErr.command,
      suggestion: 'Check sender email authorization and Brevo account quotas.',
    };
  }
};

/**
 * Master Hybrid Email Dispatcher (Runs Diagnostics & Detailed Logging)
 */
export const sendMailViaBrevo = async ({ sender, recipients, cc, bcc, subject, html, attachments }) => {
  console.log('====================================================');
  console.log('🚀 [Email Service Engine] Initiating Dispatch Process');
  console.log('====================================================');

  // Audit environment variables at start
  verifyEnvironmentVariables();

  let apiError = null;

  // 1. Attempt Brevo HTTPS REST API v3 (Port 443 - Bypasses cloud host SMTP blocking)
  try {
    return await sendViaBrevoRestApi({ sender, recipients, cc, bcc, subject, html, attachments });
  } catch (err) {
    apiError = err;
    console.warn('⚠️ Brevo HTTPS REST API Delivery Failed:', err.message || err);
  }

  // 2. Attempt Nodemailer SMTP
  try {
    return await sendViaNodemailerSmtp({ sender, recipients, cc, bcc, subject, html, attachments });
  } catch (smtpError) {
    console.error('❌ Nodemailer SMTP Delivery Failed:', smtpError.message || smtpError);

    // Combine error details into structured failure object
    const finalFailure = {
      success: false,
      stage: apiError?.stage || smtpError?.stage || 'SMTP Delivery',
      code: smtpError?.code || apiError?.code || 'ESMTPFAILED',
      error: smtpError?.message || apiError?.message || 'Email delivery failed across all protocols',
      response: smtpError?.response || apiError?.response,
      responseCode: smtpError?.responseCode || apiError?.responseCode,
      command: smtpError?.command || apiError?.command,
      suggestion:
        smtpError?.suggestion ||
        apiError?.suggestion ||
        'Verify Brevo API/SMTP key in Render Environment Variables and ensure sender address is authorized.',
    };

    throw finalFailure;
  }
};
