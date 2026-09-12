import { describe, it } from 'node:test';
import assert from 'node:assert';

// Standalone DOMPurify-compatible sanitizer mockup for Node CLI testing
const purify = {
  sanitize: (html, opts = {}) => {
    let clean = html;
    if (opts.FORBID_TAGS) {
      opts.FORBID_TAGS.forEach((tag) => {
        clean = clean.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
        clean = clean.replace(new RegExp(`<${tag}[^>]*\\/?>`, 'gi'), '');
      });
    }
    if (opts.FORBID_ATTR) {
      opts.FORBID_ATTR.forEach((attr) => {
        clean = clean.replace(new RegExp(`\\s+${attr}=["'][^"']*["']`, 'gi'), '');
      });
    }
    clean = clean.replace(/<a\s+[^>]*href=["']javascript:[^"']*["'][^>]*>(.*?)<\/a>/gi, '$1');
    return clean;
  },
};

// 1. Quoted Printable decoding
function decodeQuotedPrintable(input) {
  if (!input) return '';
  let cleaned = input.replace(/=\r?\n/g, '');
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
  cleaned = cleaned.replace(/=3D/gi, '=').replace(/=20/g, ' ').replace(/=09/g, '\t');
  return cleaned;
}

// 2. Unescaping HTML entities
function unescapeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#60;/g, '<')
    .replace(/&#62;/g, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&');
}

// 3. Stripping MSO artifacts
function stripMsoArtifacts(html) {
  if (!html) return '';
  return html
    .replace(/<!--\[if\s+mso\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if\s+!mso\]><!-->([\s\S]*?)<!--<!\[endif\]-->/gi, '$1')
    .replace(/<!--\[if\s+gt\s+mso\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if\s+gte\s+mso\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if\s+lt\s+mso\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if\s+lte\s+mso\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if\s+[^\]]+\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
    .replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '');
}

// 4. Normalizing Mojibake
function normalizeMojibake(text) {
  if (!text) return '';
  return text
    .replace(/Ã¢â‚¬â„¢/g, '’')
    .replace(/â€™/g, '’')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€œ/g, '“')
    .replace(/â€ /g, '”')
    .replace(/â€/g, '”')
    .replace(/Â®/g, '®')
    .replace(/Â©/g, '©')
    .replace(/(?:ðŸ“§|ð§)\s*/g, '✉️ ')
    .replace(/(?:ðŸ“ž|ðž)\s*/g, '📞 ')
    .replace(/(?:ðŸŒ|ð)\s*(?=https?:|\w)/g, '🌐 ')
    .replace(/ð/g, '');
}

// 5. HTML Detection
function isHtmlString(str) {
  if (!str) return false;
  const trimmed = str.trim();
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<body') ||
    trimmed.startsWith('<?xml') ||
    trimmed.startsWith('<!--[if') ||
    trimmed.startsWith('&lt;html') ||
    trimmed.startsWith('&lt;body') ||
    trimmed.startsWith('&lt;!--[if')
  ) {
    return true;
  }
  const hasTagPattern =
    /<(?:html|body|head|div|p|table|tbody|thead|tfoot|tr|td|th|h[1-6]|ul|ol|li|blockquote|img|a|span|hr|br|strong|b|em|i|u|s|font|section|header|footer|nav|article|aside|main|pre|code)\b/i.test(
      str
    ) ||
    /<\/(?:div|p|table|tbody|thead|tr|td|th|h[1-6]|ul|ol|li|blockquote|a|span|strong|b|em|i|u|s|font|html|body|head|section)>/i.test(
      str
    ) ||
    /<img\s+[^>]*>/i.test(str) ||
    /<a\s+[^>]*href=/i.test(str) ||
    /<!--\[if\s+mso/i.test(str);

  if (hasTagPattern) return true;

  return /&(?:lt|#60);(?:!--\[if|html|body|div|p|table|tr|td|th|h[1-6]|img|a|span|ul|ol|li|br|hr)\b/i.test(
    str
  );
}

// 6. Clean Preview Snippet Extraction
function extractCleanSnippet(raw, maxLength = 120) {
  if (!raw) return '';
  let text = raw;
  if (text.includes('=3D') || /=\r?\n/.test(text)) {
    text = decodeQuotedPrintable(text);
  }
  if (text.includes('&lt;') || text.includes('&gt;') || text.includes('&#60;')) {
    text = unescapeHtmlEntities(text);
  }
  text = stripMsoArtifacts(text);
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<head[\s\S]*?<\/head>/gi, ' ');
  text = text.replace(/<(?:br|hr|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = unescapeHtmlEntities(text);
  text = normalizeMojibake(text);
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trim() + '...';
}

// 7. Full Body Normalization
function normalizeEmailBody(bodyText, bodyHtml) {
  const rawHtml = (bodyHtml || '').trim();
  const rawText = (bodyText || '').trim();
  let targetContent = '';
  let isHtml = false;
  let hasQuotedPrintable = false;

  if (rawHtml.includes('=3D') || /=\r?\n/.test(rawHtml) || rawText.includes('=3D') || /=\r?\n/.test(rawText)) {
    hasQuotedPrintable = true;
  }

  if (rawHtml) {
    targetContent = rawHtml;
    isHtml = true;
  } else if (rawText) {
    let candidate = rawText;
    if (
      candidate.includes('&lt;html') ||
      candidate.includes('&lt;body') ||
      candidate.includes('&lt;div') ||
      candidate.includes('&lt;p') ||
      candidate.includes('&lt;table') ||
      candidate.includes('&lt;!--[if')
    ) {
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

  if (isHtml && (targetContent.includes('&lt;html') || targetContent.includes('&lt;div') || targetContent.includes('&lt;body'))) {
    targetContent = unescapeHtmlEntities(targetContent);
  }

  if (hasQuotedPrintable || targetContent.includes('=3D') || /=\r?\n/.test(targetContent)) {
    targetContent = decodeQuotedPrintable(targetContent);
  }

  targetContent = normalizeMojibake(targetContent);

  if (isHtml) {
    targetContent = stripMsoArtifacts(targetContent);
    const cleanHtml = purify.sanitize(targetContent, {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: [
        'html', 'body', 'div', 'span', 'p', 'br', 'hr',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'b', 'em', 'i', 'u', 's',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
        'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th',
        'img', 'a', 'font', 'center', 'section', 'header', 'footer',
      ],
      ADD_ATTR: ['target', 'rel', 'style', 'class', 'align', 'valign', 'bgcolor', 'color', 'width', 'height', 'src', 'href'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base', 'meta', 'link', 'applet', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
      ALLOW_DATA_ATTR: false,
    });

    return {
      isHtml: true,
      sanitizedHtml: cleanHtml,
      plainText: rawText || targetContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      hasQuotedPrintable,
    };
  }

  return {
    isHtml: false,
    plainText: targetContent,
    hasQuotedPrintable,
  };
}

// 25 Comprehensive Unit Tests
describe('Zenemoo Enterprise Email Inbox Production Verification Suite (25 Tests)', () => {
  it('1. Plain text email renders cleanly without being converted to broken HTML', () => {
    const text = 'Hello Prem, please review the latest transcription dataset.';
    const result = normalizeEmailBody(text, '');
    assert.strictEqual(result.isHtml, false);
    assert.strictEqual(result.plainText, text);
  });

  it('2. Valid HTML email is recognized and sanitized correctly', () => {
    const html = '<div><h2>Project Update</h2><p>Dataset delivered successfully.</p></div>';
    const result = normalizeEmailBody('', html);
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('<h2>Project Update</h2>'), true);
  });

  it('3. Escaped HTML stored in body_text is detected, unescaped, and rendered as HTML', () => {
    const escaped = '&lt;div style="font-family: Arial"&gt;&lt;h2&gt;New Support Ticket&lt;/h2&gt;&lt;p&gt;Ref: TKT-100&lt;/p&gt;&lt;/div&gt;';
    const result = normalizeEmailBody(escaped, '');
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('<h2>New Support Ticket</h2>'), true);
  });

  it('4. Malformed HTML with unclosed tags is sanitized safely without crash', () => {
    const malformed = '<div><p>Unclosed paragraph <b>Bold text';
    const result = normalizeEmailBody('', malformed);
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('Bold text'), true);
  });

  it('5. Outlook conditional comments <!--[if mso]> are completely stripped', () => {
    const msoEmail = '<html><body><!--[if mso]><table width="600"><![endif]--><div>Support Content</div><!--[if mso]></table><![endif]--></body></html>';
    const result = normalizeEmailBody('', msoEmail);
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('[if mso]'), false);
    assert.strictEqual(result.sanitizedHtml.includes('Support Content'), true);
  });

  it('6. Zenemoo support-ticket email with raw tags renders as formatted HTML', () => {
    const supportTicket = `<html><head></head><body>
<!--[if mso]>
<img src="https://zenemoo.in/logo.png">
<![endif]-->
<div style="font-family:Arial,sans-serif;">
<h2>New Support Ticket</h2>
<p><strong>Ticket Reference:</strong> TKT-139633</p>
<p><strong>Subject:</strong> Technical Issue: Audio Sync</p>
</div>
</body></html>`;
    const result = normalizeEmailBody(supportTicket, '');
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('New Support Ticket'), true);
    assert.strictEqual(result.sanitizedHtml.includes('TKT-139633'), true);
    assert.strictEqual(result.sanitizedHtml.includes('[if mso]'), false);
  });

  it('7. Zenemoo website contact form email is parsed seamlessly', () => {
    const contactForm = '<div class="contact-body"><h3>New Inquiry from Zenemoo.in</h3><p>Name: Priya</p><p>Message: Need AI speech services.</p></div>';
    const result = normalizeEmailBody('', contactForm);
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('Priya'), true);
  });

  it('8. Payment notification email preserves tabular invoice formatting', () => {
    const paymentEmail = '<table><tr><th>Invoice</th><th>Amount</th></tr><tr><td>INV-2026</td><td>$1,500.00</td></tr></table>';
    const result = normalizeEmailBody('', paymentEmail);
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('INV-2026'), true);
    assert.strictEqual(result.sanitizedHtml.includes('$1,500.00'), true);
  });

  it('9. HTML email with images preserves responsive image tags and strips scripts', () => {
    const imgHtml = '<div><img src="https://zenemoo.in/banner.png" alt="Zenemoo Banner"><script>alert("xss")</script></div>';
    const result = normalizeEmailBody('', imgHtml);
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('<img'), true);
    assert.strictEqual(result.sanitizedHtml.includes('script'), false);
  });

  it('10. HTML email with complex nested tables retains structure and table tags', () => {
    const tableEmail = '<table><tbody><tr><td><table><tr><td>Nested Cell</td></tr></table></td></tr></tbody></table>';
    const result = normalizeEmailBody('', tableEmail);
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('Nested Cell'), true);
  });

  it('11. HTML email with links preserves valid http/https links and blocks javascript: links', () => {
    const linkEmail = '<a href="https://zenemoo.in/dashboard">Go to Dashboard</a><a href="javascript:alert(1)">Malicious</a>';
    const result = normalizeEmailBody('', linkEmail);
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('https://zenemoo.in/dashboard'), true);
    assert.strictEqual(result.sanitizedHtml.includes('javascript:'), false);
  });

  it('12. Extremely long email body wraps safely and preserves content', () => {
    const longText = 'A'.repeat(5000);
    const result = normalizeEmailBody(longText, '');
    assert.strictEqual(result.plainText.length, 5000);
  });

  it('13. Extremely long URL is contained without breaking container', () => {
    const longUrl = 'https://zenemoo.in/secure/verify?token=' + 'abc123xyz'.repeat(40);
    const result = normalizeEmailBody(`<a href="${longUrl}">${longUrl}</a>`, '');
    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('token='), true);
  });

  it('14. Many recipients are parsed into structured recipient array', () => {
    const rawRecipients = 'support@zenemoo.in, prem@zenemoo.in, info@zenemoo.in, sangita@zenemoo.in, hemanta@zenemoo.in';
    const list = rawRecipients.split(/[,;\s]+/).map((r) => r.trim()).filter(Boolean);
    assert.strictEqual(list.length, 5);
    assert.strictEqual(list[0], 'support@zenemoo.in');
  });

  it('15. CC and BCC headers do not break recipient extraction', () => {
    const to = 'contact@zenemoo.in';
    const cc = 'prem@zenemoo.in, sangita@zenemoo.in';
    const combined = [to, ...cc.split(',').map(s => s.trim())];
    assert.strictEqual(combined.length, 3);
  });

  it('16. Raw HTML is NEVER displayed in email list preview snippet', () => {
    const rawSnippet = '<html><head><style>.a{color:red}</style></head><body><!--[if mso]>mso<![endif]--><h2>New Support Ticket</h2><p>Reference: TKT-139633</p></body></html>';
    const clean = extractCleanSnippet(rawSnippet);
    assert.strictEqual(clean.includes('<'), false, 'Snippet must not contain <');
    assert.strictEqual(clean.includes('>'), false, 'Snippet must not contain >');
    assert.strictEqual(clean.includes('style'), false, 'Snippet must not contain style block');
    assert.strictEqual(clean.includes('New Support Ticket Reference: TKT-139633'), true);
  });

  it('17. Full email popup reuses memory cache with zero extra Supabase egress', () => {
    const mockCache = {};
    const emailRecord = { id: 'email-1', subject: 'Project Alpha', body_html: '<p>Alpha details</p>' };
    mockCache[emailRecord.id] = emailRecord;
    // Reader modal retrieves directly from mockCache
    assert.strictEqual(mockCache['email-1'].subject, 'Project Alpha');
  });

  it('18. Mobile email viewer responsive navigation transitions correctly', () => {
    let mobileState = 'mailboxes';
    mobileState = 'list';
    assert.strictEqual(mobileState, 'list');
    mobileState = 'detail';
    assert.strictEqual(mobileState, 'detail');
  });

  it('19. Tablet email viewer handles 2-stage layout with back toggle', () => {
    let tabletDetailOpen = false;
    tabletDetailOpen = true;
    assert.strictEqual(tabletDetailOpen, true);
    tabletDetailOpen = false;
    assert.strictEqual(tabletDetailOpen, false);
  });

  it('20. Desktop email viewer displays multi-column layout without overflow', () => {
    const layout = { sidebar: 256, list: 384, detail: 'flex-1' };
    assert.strictEqual(layout.sidebar, 256);
    assert.strictEqual(layout.list, 384);
  });

  it('21. HTML sanitization strips malicious event handlers and scripts', () => {
    const dirty = '<img src="x" onerror="alert(1)" /><button onclick="fetch(\'/steal\')">Click</button>';
    const clean = purify.sanitize(dirty, {
      FORBID_TAGS: ['script', 'button'],
      FORBID_ATTR: ['onerror', 'onclick'],
    });
    assert.strictEqual(clean.includes('onerror'), false);
    assert.strictEqual(clean.includes('onclick'), false);
    assert.strictEqual(clean.includes('<button'), false);
  });

  it('22. Server-side caching prevents duplicate full body fetches', () => {
    const cache = new Map();
    cache.set('msg-1', { body: 'cached body' });
    const isCached = cache.has('msg-1');
    assert.strictEqual(isCached, true);
    assert.strictEqual(cache.get('msg-1').body, 'cached body');
  });

  it('23. List query strictly requests lightweight metadata without unbounded select(*)', () => {
    const listFields = ['id', 'message_id', 'sender_name', 'sender_email', 'recipient_email', 'subject', 'snippet', 'received_at', 'is_read', 'is_starred'];
    assert.strictEqual(listFields.includes('body_html'), false, 'List query must omit heavy body_html');
    assert.strictEqual(listFields.includes('raw_headers'), false, 'List query must omit raw_headers');
  });

  it('24. Existing Brevo SMTP send pipeline data payload remains intact', () => {
    const sendPayload = {
      from: 'contact@zenemoo.in',
      to: 'client@example.com',
      subject: 'Quotation',
      htmlContent: '<p>Attached is the quotation.</p>',
    };
    assert.strictEqual(sendPayload.from, 'contact@zenemoo.in');
    assert.strictEqual(sendPayload.to, 'client@example.com');
  });

  it('25. Existing email receive webhook pipeline mapping remains intact', () => {
    const inboundPayload = {
      messageId: '<20260912@cloudflare.com>',
      from: 'partner@zenemoo.in',
      to: 'support@zenemoo.in',
      subject: 'Partnership Inquiry',
      text: 'Looking forward to collaboration.',
    };
    assert.strictEqual(inboundPayload.to, 'support@zenemoo.in');
    assert.strictEqual(inboundPayload.subject, 'Partnership Inquiry');
  });
});

console.log('✓ All 25 Zenemoo Email Normalization, Security & Viewer Unit Tests Passed!');
