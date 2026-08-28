/**
 * Centralized Email Encoding & Character Normalization Helper for Zenemoo Email Inbox
 */

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
    .replace(/â€/g, '”')
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
 * Decodes RFC 2047 MIME encoded-word strings (e.g. =?UTF-8?Q?Re:_Zenemoo_=E2=80=93_Vendor_Capabilities?= or =?UTF-8?B?...?=)
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
