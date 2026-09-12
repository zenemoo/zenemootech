/**
 * Centralized Email Encoding, Quoted-Printable Decoding & Content Normalization Helper
 * Built for Zenemoo Production Email Inbox
 */
import DOMPurify from 'dompurify';

/**
 * Normalizes common Mojibake character corruptions resulting from incorrect UTF-8 / Windows-1252 / ISO-8859-1 decoding.
 */
export function normalizeMojibake(text: string): string {
  if (!text) return '';

  return text
    // Double-encoded UTF-8 Sequences (Ã¢â‚¬...)
    .replace(/Ã¢â‚¬â„¢/g, '’')
    .replace(/Ã¢â‚¬â€œ/g, '–')
    .replace(/Ã¢â‚¬â€”/g, '—')
    .replace(/Ã¢â‚¬Å“/g, '“')
    .replace(/Ã¢â‚¬Â/g, '”')
    .replace(/Ã¢â‚¬Â/g, '”')
    .replace(/Ã¢â‚¬Â/g, '”')

    // Single Mojibake Corruptions (â€...)
    .replace(/â€™/g, '’')
    .replace(/â€˜/g, '‘')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€œ/g, '“')
    .replace(/â€ /g, '”')
    .replace(/â€/g, '”')
    .replace(/â€¦/g, '…')
    .replace(/â€¢/g, '•')
    .replace(/â„¢/g, '™')
    .replace(/Â®/g, '®')
    .replace(/Â©/g, '©')

    // Common Accented Latin Characters
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã /g, 'à')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã¼/g, 'ü')

    // Stray non-breaking space Artifacts
    .replace(/Â\s/g, ' ')
    .replace(/\sÂ/g, ' ');
}

/**
 * Unescapes HTML entities if content was stored as &lt;html&gt; ... &lt;/html&gt;
 */
export function unescapeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Decodes Quoted-Printable (QP) encoded text and HTML strings.
 * Handles =XX byte sequences, soft line breaks (=\r\n or =\n), and =3D -> =.
 */
export function decodeQuotedPrintable(input: string): string {
  if (!input) return '';

  // 1. Remove QP soft line breaks (=\r\n or =\n)
  let cleaned = input.replace(/=\r?\n/g, '');

  // 2. Decode multi-byte UTF-8 byte sequences encoded as =XX=XX=XX
  // Match consecutive =XX sequences and convert byte arrays back to UTF-8
  cleaned = cleaned.replace(/((?:=[0-9A-Fa-f]{2})+)/g, (match) => {
    try {
      const hexPairs = match.match(/[0-9A-Fa-f]{2}/g);
      if (!hexPairs) return match;
      const bytes = new Uint8Array(hexPairs.map((h) => parseInt(h, 16)));
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch (_) {
      return match;
    }
  });

  // 3. Catch any remaining individual =3D or =20
  cleaned = cleaned.replace(/=3D/gi, '=').replace(/=20/g, ' ').replace(/=09/g, '\t');

  return cleaned;
}

/**
 * Strips Microsoft Outlook / MSO conditional comments and XML artifacts
 * e.g. <!--[if mso]>...<![endif]-->
 */
export function stripMsoArtifacts(html: string): string {
  if (!html) return '';

  return html
    .replace(/<!--\[if\s+mso\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if\s+!mso\]><!-->([\s\S]*?)<!--<!\[endif\]-->/gi, '$1')
    .replace(/<!--\[if\s+gt\s+mso\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if\s+gte\s+mso\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if\s+lt\s+mso\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if\s+lte\s+mso\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
    .replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '');
}

/**
 * Checks if a string contains HTML markup
 */
export function isHtmlString(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<body') ||
    trimmed.startsWith('<?xml')
  ) {
    return true;
  }
  // Check for common HTML tags
  return /<([a-z][a-z0-9]*)\b[^>]*>[\s\S]*?<\/\1>/i.test(str) ||
    /<(br|hr|img|input|link|meta)\b[^>]*\/?>/i.test(str) ||
    /<(div|p|table|tr|td|span|h[1-6]|ul|ol|li|a)\b/i.test(str);
}

export interface NormalizedEmailBody {
  isHtml: boolean;
  sanitizedHtml?: string;
  plainText: string;
  hasQuotedPrintable: boolean;
}

/**
 * Robust Presentation-Layer Email Normalizer:
 * 1. Checks if body_html or body_text contains quoted-printable or HTML
 * 2. Decodes quoted-printable =3D, =\n, etc.
 * 3. Strips MSO artifacts
 * 4. Sanitizes HTML with DOMPurify
 * 5. Handles plain text with clean formatting
 */
export function normalizeEmailBody(bodyText?: string, bodyHtml?: string): NormalizedEmailBody {
  const rawHtml = (bodyHtml || '').trim();
  const rawText = (bodyText || '').trim();

  let targetContent = '';
  let isHtml = false;
  let hasQuotedPrintable = false;

  // Check for Quoted-Printable signals (=3D, soft break =\n)
  if (rawHtml.includes('=3D') || /=\r?\n/.test(rawHtml) || rawText.includes('=3D') || /=\r?\n/.test(rawText)) {
    hasQuotedPrintable = true;
  }

  if (rawHtml) {
    targetContent = rawHtml;
    isHtml = true;
  } else if (rawText) {
    // If body_html is empty, inspect body_text
    // It might be HTML or escaped HTML stored in body_text
    let candidate = rawText;
    if (candidate.includes('&lt;html') || candidate.includes('&lt;div') || candidate.includes('&lt;p')) {
      candidate = unescapeHtmlEntities(candidate);
    }

    if (isHtmlString(candidate)) {
      targetContent = candidate;
      isHtml = true;
    } else {
      targetContent = rawText;
      isHtml = false;
    }
  }

  if (hasQuotedPrintable || targetContent.includes('=3D') || /=\r?\n/.test(targetContent)) {
    targetContent = decodeQuotedPrintable(targetContent);
  }

  // Normalize Mojibake
  targetContent = normalizeMojibake(targetContent);

  if (isHtml) {
    // Strip MSO Outlook conditional comments
    targetContent = stripMsoArtifacts(targetContent);

    // Sanitize with DOMPurify
    const cleanHtml = DOMPurify.sanitize(targetContent, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'rel', 'style', 'class', 'align', 'valign', 'bgcolor', 'color', 'width', 'height'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base', 'meta', 'link', 'applet'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
      ALLOW_DATA_ATTR: false,
    });

    try {
      if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanHtml, 'text/html');

        // Force external links to open safely
        const links = doc.querySelectorAll('a');
        links.forEach((a) => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          a.classList.add('text-cyan-400', 'hover:underline');
          const href = a.getAttribute('href') || '';
          if (/^(javascript|vbscript|data):/i.test(href)) {
            a.setAttribute('href', '#blocked-link');
          }
        });

        // Make all images responsive with lazy loading & safe styling
        const images = doc.querySelectorAll('img');
        images.forEach((img) => {
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.objectFit = 'contain';
          img.setAttribute('loading', 'lazy');
          img.classList.add('rounded-lg', 'my-2', 'max-w-full');
        });

        // Wrap tables in responsive horizontal scroll wrappers
        const tables = doc.querySelectorAll('table');
        tables.forEach((table) => {
          table.style.maxWidth = '100%';
          table.style.display = 'block';
          table.style.overflowX = 'auto';
        });

        return {
          isHtml: true,
          sanitizedHtml: doc.body.innerHTML,
          plainText: doc.body.textContent || '',
          hasQuotedPrintable,
        };
      }
    } catch (_) {}

    return {
      isHtml: true,
      sanitizedHtml: cleanHtml,
      plainText: rawText || targetContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      hasQuotedPrintable,
    };
  }

  // Plain Text Content
  return {
    isHtml: false,
    plainText: targetContent,
    hasQuotedPrintable,
  };
}

/**
 * Decodes RFC 2047 MIME encoded-word strings (e.g. =?UTF-8?Q?...?= or =?UTF-8?B?...?=)
 */
export function decodeMimeHeader(text: string): string {
  if (!text) return '';
  let str = text;

  // Regex to match RFC 2047 encoded words: =?charset?encoding?encoded_text?=
  const rfc2047Regex = /=\?([^?]+)\?([QBqb])\?([^?]*)\?=/g;

  str = str.replace(rfc2047Regex, (match, charset, encoding, encodedText) => {
    const enc = encoding.toUpperCase();
    try {
      if (enc === 'Q') {
        // Quoted-printable decoding: '_' becomes space, '=XX' becomes byte XX
        const normalized = encodedText.replace(/_/g, ' ');
        const bytes: number[] = [];
        for (let i = 0; i < normalized.length; i++) {
          if (normalized[i] === '=' && i + 2 < normalized.length) {
            const hex = normalized.substring(i + 1, i + 3);
            if (/^[0-9a-fA-F]{2}$/.test(hex)) {
              bytes.push(parseInt(hex, 16));
              i += 2;
              continue;
            }
          }
          bytes.push(normalized.charCodeAt(i));
        }
        return new TextDecoder(charset || 'utf-8', { fatal: false }).decode(new Uint8Array(bytes));
      } else if (enc === 'B') {
        // Base64 decoding
        const cleanB64 = encodedText.replace(/\s/g, '');
        const binary = atob(cleanB64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder(charset || 'utf-8', { fatal: false }).decode(bytes);
      }
    } catch (e) {
      console.warn('Failed to decode MIME word:', match, e);
      return encodedText;
    }
    return match;
  });

  return normalizeMojibake(str);
}

/**
 * Format subject line for Reply mode (Re: Original Subject) without duplicating Re:
 */
export function formatReplySubject(rawSubject?: string): string {
  const decoded = decodeMimeHeader(rawSubject || '');
  const clean = decoded.trim();
  if (!clean) return 'Re: (No Subject)';

  if (/^re:\s*/i.test(clean)) {
    return clean;
  }
  return `Re: ${clean}`;
}

/**
 * Format subject line for Forward mode (Fwd: Original Subject) without duplicating Fwd:
 */
export function formatForwardSubject(rawSubject?: string): string {
  const decoded = decodeMimeHeader(rawSubject || '');
  const clean = decoded.trim();
  if (!clean) return 'Fwd: (No Subject)';

  if (/^(fwd|fw):\s*/i.test(clean)) {
    return clean;
  }
  return `Fwd: ${clean}`;
}

/**
 * Verified Sender Signatures Configured in Zenemoo Application
 */
export interface EmailSignatureOption {
  id: string;
  name: string;
  senderEmail: string;
  signatureText: string;
  htmlSignatureText?: string;
}

export const SIGNATURE_PRESETS: EmailSignatureOption[] = [
  {
    id: 'contact',
    name: 'Zenemoo Business Team',
    senderEmail: 'contact@zenemoo.in',
    signatureText: `Best regards,
Zenemoo Business Operations
Zenemoo Enterprise AI Language & Data Solutions
contact@zenemoo.in
www.zenemoo.in`,
  },
  {
    id: 'prem',
    name: 'Prem Prasad Pradhan (Founder & CEO)',
    senderEmail: 'prem@zenemoo.in',
    signatureText: `Best regards,
Prem Prasad Pradhan
Founder & CEO | Zenemoo Data Solutions
prem@zenemoo.in
www.zenemoo.in`,
  },
  {
    id: 'support',
    name: 'Zenemoo Customer Support',
    senderEmail: 'support@zenemoo.in',
    signatureText: `Best regards,
Zenemoo Customer Support Team
Client Partner Operations
support@zenemoo.in
www.zenemoo.in`,
  },
  {
    id: 'sangita',
    name: 'Sangita Sahoo (HR & QA Lead)',
    senderEmail: 'sangita@zenemoo.in',
    signatureText: `Best regards,
Sangita Sahoo
HR & Quality Assurance Lead
sangita@zenemoo.in
www.zenemoo.in`,
  },
  {
    id: 'hemanta',
    name: 'Hemanta Kumar Sahu (Tech Ops)',
    senderEmail: 'hemanta@zenemoo.in',
    signatureText: `Best regards,
Hemanta Kumar Sahu
Technical Operations
hemanta@zenemoo.in
www.zenemoo.in`,
  },
  {
    id: 'info',
    name: 'Zenemoo Information Desk',
    senderEmail: 'info@zenemoo.in',
    signatureText: `Best regards,
Zenemoo Information Desk
info@zenemoo.in
www.zenemoo.in`,
  },
];

/**
 * Get signature text for selected sender email
 */
export function getSignatureForSender(senderEmail: string, signatureId?: string): EmailSignatureOption | null {
  if (signatureId === 'none') return null;

  if (signatureId && signatureId !== 'auto') {
    const found = SIGNATURE_PRESETS.find((s) => s.id === signatureId);
    if (found) return found;
  }

  // Check saved custom admin signature in localStorage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('zenemoo_admin_ai_signature');
      if (saved && signatureId === 'custom') {
        const parsed = JSON.parse(saved);
        return {
          id: 'custom',
          name: parsed.name || 'Admin Signature',
          senderEmail: parsed.email || senderEmail,
          signatureText: `Best regards,\n${parsed.name || ''}\n${parsed.designation || ''} ${parsed.company || 'Zenemoo'}\n${parsed.email || senderEmail}\n${parsed.website || 'www.zenemoo.in'}`,
        };
      }
    } catch (_) {}
  }

  // Match by sender email
  const cleanEmail = (senderEmail || '').toLowerCase().trim();
  const matched = SIGNATURE_PRESETS.find((s) => s.senderEmail.toLowerCase() === cleanEmail);
  return matched || SIGNATURE_PRESETS[0];
}
