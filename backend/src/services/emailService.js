import nodemailer from 'nodemailer';

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
 * Basic HTML Sanitizer to strip script tags and unsafe handlers
 */
export const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';

  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/\s(onerror|onclick|onload|onmouseover)=["'][^"']*["']/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '');
};

/**
 * Extract Attachment Metadata for Supabase Storage (NO binary / base64 content saved)
 * Outputs metadata indicators: image: "yes" | "no", pdf: "yes" | "no"
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
 * Normalize attachments for Nodemailer execution
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
 * 1. Primary Dispatcher: Brevo HTTPS REST API v3 (Port 443 - Bypasses Cloud Provider SMTP Blocks)
 */
const sendViaBrevoRestApi = async ({ sender, recipients, cc, bcc, subject, html, attachments }) => {
  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || '';
  if (!apiKey) {
    throw new Error('BREVO_API_KEY / BREVO_SMTP_KEY environment variable is not configured');
  }

  const parsedTo = parseRecipients(recipients);
  const parsedCc = parseRecipients(cc);
  const parsedBcc = parseRecipients(bcc);

  if (parsedTo.length === 0) {
    throw new Error('No valid recipient email address specified');
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
    throw new Error(resData?.message || `Brevo REST API error (Status ${response.status})`);
  }

  return {
    messageId: resData?.messageId || `<brevo-api-${Date.now()}@zenemoo.in>`,
    parsedTo,
    parsedCc,
    parsedBcc,
    safeHtml,
    attachmentsMeta: extractAttachmentMetadata(attachments),
  };
};

/**
 * 2. Fallback Dispatcher: Nodemailer SMTP
 */
const sendViaNodemailerSmtp = async ({ sender, recipients, cc, bcc, subject, html, attachments }) => {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_LOGIN || 'b39046001@smtp-brevo.com';
  const pass = process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY || '';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  const parsedTo = parseRecipients(recipients);
  const parsedCc = parseRecipients(cc);
  const parsedBcc = parseRecipients(bcc);

  const safeHtml = sanitizeHtml(html);
  const normalizedAttachments = normalizeAttachments(attachments);

  const info = await transporter.sendMail({
    from: sender || 'contact@zenemoo.in',
    to: parsedTo,
    cc: parsedCc.length > 0 ? parsedCc : undefined,
    bcc: parsedBcc.length > 0 ? parsedBcc : undefined,
    subject: subject || '(No Subject)',
    html: safeHtml,
    attachments: normalizedAttachments,
  });

  return {
    messageId: info.messageId,
    parsedTo,
    parsedCc,
    parsedBcc,
    safeHtml,
    attachmentsMeta: extractAttachmentMetadata(attachments),
  };
};

/**
 * Master Hybrid Email Dispatcher
 */
export const sendMailViaBrevo = async ({ sender, recipients, cc, bcc, subject, html, attachments }) => {
  // First attempt: Brevo HTTPS REST API v3 (Fast & Port 443 guaranteed on Render / Vercel)
  try {
    return await sendViaBrevoRestApi({ sender, recipients, cc, bcc, subject, html, attachments });
  } catch (apiError) {
    console.warn('⚠️ Brevo HTTPS REST API delivery failed/fallback triggered:', apiError.message);
    
    // Second attempt: Nodemailer SMTP fallback
    return await sendViaNodemailerSmtp({ sender, recipients, cc, bcc, subject, html, attachments });
  }
};
