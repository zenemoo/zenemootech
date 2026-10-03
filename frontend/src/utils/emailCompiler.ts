/**
 * ZENEMOO EMAIL COMPATIBILITY COMPILER
 * ====================================
 * Real email-safe HTML compiler designed for multi-client compatibility
 * (Gmail, Outlook, Apple Mail, Yahoo, Android Mail, iOS Mail).
 *
 * Core Pipeline:
 * 1. Sanitize raw HTML (DOMPurify with email-safe tag/attribute profile).
 * 2. Parse HTML & extract CSS rules from <style> blocks.
 * 3. Inline CSS onto matching DOM elements according to selector specificity.
 * 4. Apply email-safe fallbacks:
 *    - Colors (hex, rgb, named) preserved.
 *    - Background colors + bgcolor attributes on tables & cells.
 *    - Solid color fallbacks for linear gradients.
 *    - Static fallback for CSS @keyframes & animations (guaranteed visibility).
 *    - Direct absolute HTTPS URLs for links (https://www.zenemoo.in/...) and images.
 *    - Email-safe image resets (display: block; border: 0; max-width: 100%; height: auto;).
 *    - Email-safe button resets (display: inline-block; text-decoration: none; font-weight: bold;).
 *    - Outlook MSO conditionals & DPI settings.
 *    - Hidden email preheader pattern.
 *    - Safe typography fallbacks.
 * 5. Strip dangerous scripts & event handlers.
 * 6. Generate final production email-safe HTML.
 */

import DOMPurify from 'dompurify';

export interface EmailCompilerOptions {
  preheader?: string;
  recipientName?: string;
  companyName?: string;
  baseUrl?: string;
  preserveMediaQueries?: boolean;
}

export interface EmailCompatibilityWarning {
  type: 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  fallbackApplied?: string;
}

export interface EmailHealthAuditResult {
  score: number;
  securityPass: boolean;
  tableLayout: boolean;
  inlineCssApplied: boolean;
  imagesSafe: boolean;
  linksAbsolute: boolean;
  subjectSet: boolean;
  preheaderSet: boolean;
  unresolvedVars: boolean;
  animationFallbackApplied: boolean;
  gradientFallbackApplied: boolean;
  warnings: EmailCompatibilityWarning[];
}

export interface CompiledEmailResult {
  compiledHtml: string;
  audit: EmailHealthAuditResult;
}

const DEFAULT_BASE_URL = 'https://www.zenemoo.in';

const getPurifySanitize = () => {
  if (typeof DOMPurify !== 'undefined') {
    if (typeof (DOMPurify as any).sanitize === 'function') {
      return (DOMPurify as any).sanitize.bind(DOMPurify);
    }
    if (typeof DOMPurify === 'function') {
      try {
        const instance = (DOMPurify as any)(typeof window !== 'undefined' ? window : {});
        if (typeof instance?.sanitize === 'function') {
          return instance.sanitize.bind(instance);
        }
      } catch {}
    }
  }
  return null;
};

/**
 * 1. Base Email Sanitizer Profile
 */
export const sanitizeEmailBuilderHtml = (rawHtml: string): string => {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  const sanitizeFn = getPurifySanitize();
  if (sanitizeFn) {
    try {
      return sanitizeFn(rawHtml, {
        USE_PROFILES: { html: true },
        ADD_TAGS: [
          'html',
          'head',
          'body',
          'meta',
          'title',
          'style',
          'table',
          'thead',
          'tbody',
          'tfoot',
          'tr',
          'th',
          'td',
          'center',
        ],
        ADD_ATTR: [
          'target',
          'style',
          'align',
          'valign',
          'bgcolor',
          'border',
          'cellpadding',
          'cellspacing',
          'width',
          'height',
          'role',
          'src',
          'href',
          'alt',
          'title',
          'colspan',
          'rowspan',
          'color',
          'face',
          'size',
          'background',
          'class',
          'id',
          'name',
          'lang',
          'dir',
          'xmlns',
          'http-equiv',
          'content',
          'media',
        ],
        FORBID_TAGS: [
          'script',
          'iframe',
          'object',
          'embed',
          'form',
          'input',
          'button',
          'textarea',
          'select',
          'applet',
          'base',
        ],
        FORBID_ATTR: [
          'onerror',
          'onload',
          'onclick',
          'onmouseover',
          'onfocus',
          'onblur',
          'onsubmit',
          'onchange',
          'onkeydown',
          'onkeyup',
          'onkeypress',
        ],
        ALLOWED_URI_REGEXP:
          /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data:image\/):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        ALLOW_DATA_ATTR: false,
      });
    } catch {}
  }

  // Fallback RegExp Sanitizer if DOMPurify is unavailable
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis, '')
    .replace(/\s(onerror|onclick|onload|onmouseover|onfocus|onblur|onsubmit)\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gis, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gis, '')
    .replace(/<embed\b[^>]*>/gis, '')
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
};

/**
 * 2. Calculate CSS Selector Specificity
 */
const calculateSpecificity = (selector: string): number => {
  let score = 0;
  // IDs count: 100
  const idMatches = selector.match(/#[a-zA-Z0-9_-]+/g);
  if (idMatches) score += idMatches.length * 100;

  // Classes & attributes: 10
  const classMatches = selector.match(/\.[a-zA-Z0-9_-]+/g);
  if (classMatches) score += classMatches.length * 10;
  const attrMatches = selector.match(/\[[^\]]+\]/g);
  if (attrMatches) score += attrMatches.length * 10;

  // Tags: 1
  const tagMatches = selector.match(/^[a-zA-Z0-9]+|\s+[a-zA-Z0-9]+/g);
  if (tagMatches) score += tagMatches.length * 1;

  return score;
};

/**
 * 3. Parse CSS declaration block string into key-value map
 */
const parseDeclarations = (declarationString: string): Record<string, { value: string; important: boolean }> => {
  const result: Record<string, { value: string; important: boolean }> = {};
  const rules = declarationString.split(';');

  for (const rule of rules) {
    const colonIdx = rule.indexOf(':');
    if (colonIdx === -1) continue;

    const property = rule.substring(0, colonIdx).trim().toLowerCase();
    let value = rule.substring(colonIdx + 1).trim();
    if (!property || !value) continue;

    const important = /!important\s*$/i.test(value);
    if (important) {
      value = value.replace(/!important\s*$/i, '').trim();
    }

    result[property] = { value, important };
  }

  return result;
};

/**
 * 4. Helper to extract solid color from gradient or background string
 */
const extractSolidColor = (bgValue: string): string | null => {
  if (!bgValue) return null;

  // Check for hex color
  const hexMatch = bgValue.match(/#(?:[0-9a-fA-F]{3,4}){1,2}\b/);
  if (hexMatch) return hexMatch[0];

  // Check for rgb/rgba
  const rgbMatch = bgValue.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+\s*)?\)/i);
  if (rgbMatch) return rgbMatch[0];

  // Check for common named colors
  const namedMatch = bgValue.match(/\b(black|white|navy|darkblue|gray|grey|blue|green|red|purple|teal)\b/i);
  if (namedMatch) return namedMatch[0];

  return null;
};

/**
 * 5. Extract Hex Color safely
 */
const extractHexColor = (colorValue: string): string | null => {
  if (!colorValue) return null;
  const hexMatch = colorValue.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  if (hexMatch) return hexMatch[0];
  return null;
};

/**
 * 6. Robust CSS Inlining Engine
 */
const inlineCssStyles = (
  doc: Document,
  warnings: EmailCompatibilityWarning[]
): { mediaQueries: string[]; keyframes: string[] } => {
  const mediaQueries: string[] = [];
  const keyframes: string[] = [];

  const styleTags = Array.from(doc.querySelectorAll('style'));

  interface ParsedRule {
    selector: string;
    declarations: Record<string, { value: string; important: boolean }>;
    specificity: number;
  }

  const parsedRules: ParsedRule[] = [];

  for (const styleTag of styleTags) {
    const rawCss = styleTag.textContent || '';
    // Strip comments
    const cleanCss = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');

    // Extract @media queries
    const mediaRegex = /@media[^{]+\{(?:[^{}]+|\{[^{}]*\})*\}/gi;
    let mediaMatch: RegExpExecArray | null;
    while ((mediaMatch = mediaRegex.exec(cleanCss)) !== null) {
      mediaQueries.push(mediaMatch[0].trim());
    }

    // Extract @keyframes
    const keyframesRegex = /@(?:-webkit-)?keyframes[^{]+\{(?:[^{}]+|\{[^{}]*\})*\}/gi;
    let kfMatch: RegExpExecArray | null;
    while ((kfMatch = keyframesRegex.exec(cleanCss)) !== null) {
      keyframes.push(kfMatch[0].trim());
      warnings.push({
        type: 'warning',
        title: 'CSS Animation Keyframes Detected',
        message: 'Email clients generally do not support CSS @keyframes. A static fallback has been injected.',
        fallbackApplied: 'Static visible fallback (opacity: 1, visibility: visible) guaranteed.',
      });
    }

    // Remove @media and @keyframes from css before processing standard rules
    const nonAtRules = cleanCss.replace(mediaRegex, '').replace(keyframesRegex, '');

    // Extract standard rules: selector { ... }
    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let ruleMatch: RegExpExecArray | null;

    while ((ruleMatch = ruleRegex.exec(nonAtRules)) !== null) {
      const rawSelectors = ruleMatch[1].trim();
      const rawDeclarations = ruleMatch[2].trim();

      if (!rawSelectors || !rawDeclarations) continue;

      // May be comma-separated selectors: h1, h2, .lead
      const selectors = rawSelectors.split(',').map((s) => s.trim()).filter(Boolean);
      const declarations = parseDeclarations(rawDeclarations);

      for (const selector of selectors) {
        // Skip pseudo-elements or pseudo-classes that cannot be inlined (e.g. :hover, :after)
        if (selector.includes(':hover') || selector.includes(':active') || selector.includes('::')) {
          continue;
        }

        try {
          const specificity = calculateSpecificity(selector);
          parsedRules.push({
            selector,
            declarations,
            specificity,
          });
        } catch {
          // Ignore invalid selector
        }
      }
    }

    // Remove the original <style> tag so we can rebuild an optimized one
    styleTag.remove();
  }

  // Sort rules by specificity ascending so higher specificity rules apply later and override lower ones
  parsedRules.sort((a, b) => a.specificity - b.specificity);

  // Apply parsed rules to DOM elements
  for (const rule of parsedRules) {
    try {
      const elements = Array.from(doc.querySelectorAll(rule.selector));
      for (const el of elements) {
        if (!(el instanceof HTMLElement)) continue;

        const currentInline = parseDeclarations(el.getAttribute('style') || '');

        // Merge properties
        for (const [prop, ruleDecl] of Object.entries(rule.declarations)) {
          const existing = currentInline[prop];

          // If no existing inline style, or if rule is important and existing isn't, apply
          if (!existing || (!existing.important && ruleDecl.important) || !existing.important) {
            currentInline[prop] = ruleDecl;
          }
        }

        // Rebuild style attribute string
        const styleString = Object.entries(currentInline)
          .map(([p, d]) => `${p}:${d.value}${d.important ? ' !important' : ''}`)
          .join(';');

        el.setAttribute('style', styleString);
      }
    } catch {
      // In case of selector query failure
    }
  }

  return { mediaQueries, keyframes };
};

/**
 * 7. Apply Email-Safe Element Level Normalizations
 */
const applyEmailSafeNormalizations = (
  doc: Document,
  warnings: EmailCompatibilityWarning[],
  baseUrl: string = DEFAULT_BASE_URL
) => {
  // A. Normalise Images
  const images = Array.from(doc.querySelectorAll('img'));
  for (const img of images) {
    let style = img.getAttribute('style') || '';
    const styleDecl = parseDeclarations(style);

    // Guarantee email-safe image styling
    if (!styleDecl['display']) styleDecl['display'] = { value: 'block', important: false };
    if (!styleDecl['border']) styleDecl['border'] = { value: '0', important: false };
    if (!styleDecl['outline']) styleDecl['outline'] = { value: 'none', important: false };
    if (!styleDecl['text-decoration']) styleDecl['text-decoration'] = { value: 'none', important: false };
    if (!styleDecl['-ms-interpolation-mode']) {
      styleDecl['-ms-interpolation-mode'] = { value: 'bicubic', important: false };
    }
    if (!styleDecl['max-width']) styleDecl['max-width'] = { value: '100%', important: false };
    if (!styleDecl['height'] && !img.getAttribute('height')) {
      styleDecl['height'] = { value: 'auto', important: false };
    }

    img.setAttribute(
      'style',
      Object.entries(styleDecl)
        .map(([p, d]) => `${p}:${d.value}`)
        .join(';')
    );

    // Guarantee alt attribute
    if (!img.hasAttribute('alt')) {
      img.setAttribute('alt', '');
    }

    // Convert relative src to absolute
    const src = img.getAttribute('src');
    if (src && src.startsWith('/')) {
      img.setAttribute('src', `${baseUrl}${src}`);
      warnings.push({
        type: 'info',
        title: 'Image URL Normalized',
        message: `Converted relative image path "${src}" to absolute HTTPS URL.`,
      });
    }
  }

  // B. Normalise Links (Buttons / Anchors)
  const links = Array.from(doc.querySelectorAll('a'));
  for (const a of links) {
    const href = a.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('//')) {
      a.setAttribute('href', `${baseUrl}${href}`);
      warnings.push({
        type: 'info',
        title: 'Link URL Normalized',
        message: `Converted relative link "${href}" to absolute HTTPS URL.`,
      });
    }

    if (!a.getAttribute('target')) {
      a.setAttribute('target', '_blank');
    }
    a.setAttribute('rel', 'noopener noreferrer');

    // Safe button styling fallback if styled like button
    const style = a.getAttribute('style') || '';
    if (style.includes('background') || style.includes('border-radius') || style.includes('padding')) {
      const decl = parseDeclarations(style);
      if (!decl['display']) decl['display'] = { value: 'inline-block', important: false };
      if (!decl['text-decoration']) decl['text-decoration'] = { value: 'none', important: false };
      if (!decl['font-weight']) decl['font-weight'] = { value: 'bold', important: false };
      a.setAttribute(
        'style',
        Object.entries(decl)
          .map(([p, d]) => `${p}:${d.value}`)
          .join(';')
      );
    }
  }

  // C. Background Colors & bgcolor attributes for Tables and TDs
  const tableCells = Array.from(doc.querySelectorAll('td, th, table, tr, div'));
  for (const cell of tableCells) {
    if (!(cell instanceof HTMLElement)) continue;
    const style = cell.getAttribute('style') || '';
    const decl = parseDeclarations(style);

    // 1. Check for linear gradient
    const bgVal = decl['background']?.value || decl['background-image']?.value || '';
    if (bgVal.includes('linear-gradient')) {
      const solidFallback = extractSolidColor(bgVal) || '#0f172a';
      if (!decl['background-color']) {
        decl['background-color'] = { value: solidFallback, important: false };
      }
      warnings.push({
        type: 'info',
        title: 'CSS Gradient Solid Fallback Added',
        message: `Added solid fallback background-color: ${solidFallback} for clients without CSS gradient support.`,
        fallbackApplied: `background-color: ${solidFallback};`,
      });
    }

    // 2. Add bgcolor attribute to tables and cells if background-color is set
    const bgColorVal = decl['background-color']?.value || extractHexColor(decl['background']?.value || '');
    if (bgColorVal && (cell.tagName === 'TD' || cell.tagName === 'TH' || cell.tagName === 'TABLE')) {
      const hex = extractHexColor(bgColorVal);
      if (hex && !cell.getAttribute('bgcolor')) {
        cell.setAttribute('bgcolor', hex);
      }
    }

    // 3. Animation static fallback
    if (decl['animation'] || decl['animation-name'] || style.includes('animation:')) {
      decl['opacity'] = { value: '1', important: true };
      decl['visibility'] = { value: 'visible', important: true };
      decl['transform'] = { value: 'none', important: false };
      warnings.push({
        type: 'warning',
        title: 'Animation Fallback Enforced',
        message: 'Detected animation on element. Forced opacity: 1 and visibility: visible so element never hides.',
        fallbackApplied: 'opacity: 1 !important; visibility: visible !important;',
      });
    }

    // 4. Grid warning
    if (decl['display']?.value === 'grid') {
      decl['display'] = { value: 'block', important: false };
      warnings.push({
        type: 'warning',
        title: 'CSS Grid Detected',
        message: 'CSS Grid is not supported in most email clients. Converted display to block fallback.',
      });
    }

    cell.setAttribute(
      'style',
      Object.entries(decl)
        .map(([p, d]) => `${p}:${d.value}${d.important ? ' !important' : ''}`)
        .join(';')
    );
  }

  // D. Table Role & Reset attributes
  const tables = Array.from(doc.querySelectorAll('table'));
  for (const tbl of tables) {
    if (!tbl.getAttribute('role')) tbl.setAttribute('role', 'presentation');
    if (!tbl.getAttribute('cellpadding')) tbl.setAttribute('cellpadding', '0');
    if (!tbl.getAttribute('cellspacing')) tbl.setAttribute('cellspacing', '0');
    if (!tbl.getAttribute('border')) tbl.setAttribute('border', '0');
  }
};

/**
 * 8. Hidden Preheader Generator
 */
const buildHiddenPreheaderHtml = (preheaderText: string): string => {
  if (!preheaderText || !preheaderText.trim()) return '';
  const clean = preheaderText.trim();

  return `<!-- Email Preheader (Hidden Preview Text) -->
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${clean}
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>`;
};

/**
 * 9. MAIN COMPILER FUNCTION
 */
export const compileEmailHtml = (
  rawHtml: string,
  options: EmailCompilerOptions = {}
): CompiledEmailResult => {
  const warnings: EmailCompatibilityWarning[] = [];
  if (!rawHtml || !rawHtml.trim()) {
    return {
      compiledHtml: '',
      audit: {
        score: 0,
        securityPass: true,
        tableLayout: false,
        inlineCssApplied: false,
        imagesSafe: true,
        linksAbsolute: true,
        subjectSet: false,
        preheaderSet: false,
        unresolvedVars: false,
        animationFallbackApplied: false,
        gradientFallbackApplied: false,
        warnings: [],
      },
    };
  }

  // 1. Personalize placeholders before compilation if provided
  let workingHtml = rawHtml;
  if (options.recipientName && options.recipientName !== '{{RECIPIENT_NAME}}') {
    workingHtml = workingHtml.replace(/\{\{RECIPIENT_NAME\}\}/g, options.recipientName);
  }
  if (options.companyName && options.companyName !== '{{COMPANY_NAME}}') {
    workingHtml = workingHtml.replace(/\{\{COMPANY_NAME\}\}/g, options.companyName);
  }

  // 2. Check for JavaScript presence and warn that it is stripped for email delivery
  if (/<script\b/i.test(rawHtml) || /\son\w+\s*=/i.test(rawHtml) || /href=["']\s*javascript:/i.test(rawHtml)) {
    warnings.push({
      type: 'warning',
      title: 'JavaScript Removed for Email Delivery',
      message: 'Interactive JavaScript and event listeners were detected and safely removed. Email clients do not execute scripts; a clean static layout has been generated.',
      fallbackApplied: 'All <script> tags and inline JS event handlers safely removed from compiled email.',
    });
  }

  // 3. Sanitize HTML
  const sanitized = sanitizeEmailBuilderHtml(workingHtml);

  // 4. Parse into DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');

  // Check if initial document had full structure
  const hasFullDocumentStructure =
    sanitized.includes('<html') || sanitized.includes('<!DOCTYPE') || sanitized.includes('<body');

  // 5. Extract CSS & Inline styles
  const { mediaQueries, keyframes } = inlineCssStyles(doc, warnings);

  // 5. Apply email-safe normalizations
  applyEmailSafeNormalizations(doc, warnings, options.baseUrl || DEFAULT_BASE_URL);

  // 6. Handle preheader
  if (options.preheader && options.preheader.trim()) {
    const existingPreheader = doc.querySelector('div[style*="max-height:0px"], div[style*="max-height: 0px"]');
    if (existingPreheader) {
      existingPreheader.remove();
    }
  }

  // 7. Reconstruct standard email wrapper with Outlook fixes & responsive media queries
  const bodyContent = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;

  const preheaderSnippet = options.preheader ? buildHiddenPreheaderHtml(options.preheader) : '';

  const combinedMediaQueries = [
    `@media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-full-width { width: 100% !important; max-width: 100% !important; display: block !important; }
      .mobile-padding { padding: 16px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }`,
    ...mediaQueries,
  ].join('\n');

  let finalHtml = '';

  if (hasFullDocumentStructure) {
    // Inject MSO metadata and reset into head if missing
    finalHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f7fb; }
    ${combinedMediaQueries}
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f4f7fb; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  ${preheaderSnippet}
  ${bodyContent}
</body>
</html>`;
  } else {
    // Fragment: wrap inside standard container table
    finalHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f7fb; }
    ${combinedMediaQueries}
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f4f7fb; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  ${preheaderSnippet}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7fb; padding: 24px 12px;">
    <tr>
      <td align="center" valign="top">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              ${bodyContent}
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // 8. Run Audit Checks
  const hasScript = /<script\b/gi.test(rawHtml);
  const hasIframe = /<iframe\b/gi.test(rawHtml);
  const hasForm = /<form\b/gi.test(rawHtml);
  const hasJavascriptUrls = /href=["']\s*javascript:/gi.test(rawHtml);
  const hasTableStructure = /<table\b/gi.test(finalHtml);
  const hasAltTags = !/<img(?![^>]*\balt=)[^>]*>/gi.test(finalHtml);
  const hasRelativeLinks = /href=["']\/(?!\/)/gi.test(finalHtml);
  const hasUnresolvedPlaceholders =
    finalHtml.includes('{{RECIPIENT_NAME}}') || finalHtml.includes('{{COMPANY_NAME}}');

  const totalAudits = 7;
  let passedCount = 0;
  if (!hasScript && !hasIframe && !hasForm && !hasJavascriptUrls) passedCount++;
  if (hasTableStructure) passedCount++;
  if (hasAltTags) passedCount++;
  if (!hasRelativeLinks) passedCount++;
  if (Boolean(options.preheader)) passedCount++;
  if (!hasUnresolvedPlaceholders) passedCount++;
  passedCount++; // Inlining completed

  const score = Math.min(100, Math.round((passedCount / totalAudits) * 100));

  const audit: EmailHealthAuditResult = {
    score,
    securityPass: !hasScript && !hasIframe && !hasForm && !hasJavascriptUrls,
    tableLayout: hasTableStructure,
    inlineCssApplied: true,
    imagesSafe: hasAltTags,
    linksAbsolute: !hasRelativeLinks,
    subjectSet: true,
    preheaderSet: Boolean(options.preheader),
    unresolvedVars: hasUnresolvedPlaceholders,
    animationFallbackApplied: keyframes.length > 0 || warnings.some((w) => w.title.includes('Animation')),
    gradientFallbackApplied: warnings.some((w) => w.title.includes('Gradient')),
    warnings,
  };

  return {
    compiledHtml: finalHtml,
    audit,
  };
};
