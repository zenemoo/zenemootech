import nodemailer from 'nodemailer';

// Brevo SMTP Transporter Initialization
const getTransporter = () => {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_LOGIN || 'b39046001@smtp-brevo.com';
  const pass = process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY || '';

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
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
 * Main Nodemailer Email Sending Helper via Brevo SMTP
 */
export const sendMailViaBrevo = async ({ sender, recipients, cc, bcc, subject, html, attachments }) => {
  const transporter = getTransporter();
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
