import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cloudinary } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory CDN URL Cache (TTL 1 hour)
const ogImageCache = new Map();
const OG_CACHE_TTL = 60 * 60 * 1000;

function escapeXml(unsafe = '') {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(str = '', maxLen = 60) {
  const clean = String(str || '').trim().replace(/\s+/g, ' ');
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1).trim() + '…';
}

function wrapTitle(title = '', maxCharsPerLine = 36) {
  const words = String(title || '').trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= 2) break;
    }
  }
  if (currentLine && lines.length < 2) {
    lines.push(currentLine);
  }
  return lines;
}

let cachedLogoBase64 = null;
function getLogoBase64() {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const candidatePaths = [
      path.resolve(__dirname, '../assets/logo.png'),
      path.resolve(__dirname, '../../../frontend/public/assets/logo.png'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        cachedLogoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
        return cachedLogoBase64;
      }
    }
  } catch (err) {
    console.warn('[opportunityOgImageService] Logo load warning:', err.message);
  }
  return '';
}

/**
 * Builds the Design 2 Minimalist Obsidian Dark 1200x630 SVG
 */
export function generateOpportunitySvg(opp = {}) {
  const logoDataUri = getLogoBase64();
  const rawCode = opp.project_code || opp.public_id || 'ZEN-OPP-001';
  const projectCode = escapeXml(rawCode.toUpperCase());

  const rawTitle = opp.title || 'Zenemoo Program Opportunity';
  const titleLines = wrapTitle(rawTitle, 40);

  const rawDesc = opp.about_project || opp.description || 'Enterprise AI data collection and annotation opportunity on Zenemoo.';
  const cleanDesc = escapeXml(truncateText(rawDesc.split('\n')[0], 90));

  const partnerName = escapeXml(truncateText(opp.partner_name || 'Zenemoo', 24));
  const workMode = escapeXml(truncateText(opp.work_mode ? `${opp.work_mode.toUpperCase()} WFH` : 'REMOTE WFH', 20));
  
  let rawPay = opp.payment_info || 'Project-based compensation';
  if (rawPay.toLowerCase().includes('compensation')) {
    rawPay = 'Project-Based Pay';
  }
  const compensation = escapeXml(truncateText(rawPay, 26));

  const category = escapeXml(truncateText(opp.badge || 'AI DATA OPPORTUNITY', 26).toUpperCase());
  const oppId = escapeXml(opp.id || '');

  // Calculate dynamic line positions for title
  const titleLine1 = escapeXml(titleLines[0] || 'Zenemoo Opportunity');
  const titleLine2 = titleLines[1] ? escapeXml(titleLines[1]) : null;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style>
      .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    </style>
  </defs>

  <!-- Solid Obsidian Dark Background -->
  <rect width="1200" height="630" fill="#09090b"/>

  <!-- Crisp 1px Outer Frame -->
  <rect x="1" y="1" width="1198" height="628" rx="8" fill="none" stroke="#27272a" stroke-width="2"/>

  <!-- TOP HEADER -->
  ${logoDataUri ? `<image href="${logoDataUri}" x="70" y="48" width="60" height="60" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <text x="145" y="74" fill="#ffffff" class="font-sans" font-size="26" font-weight="800" letter-spacing="1.5">ZENEMOO</text>
  <text x="145" y="98" fill="#a1a1aa" class="font-sans" font-size="12" font-weight="600" letter-spacing="1">ENTERPRISE AI DATA PLATFORM</text>

  <!-- Top Right: Monotonic Project ID Pill -->
  <rect x="910" y="50" width="220" height="56" rx="8" fill="#18181b" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="1020" y="86" text-anchor="middle" fill="#22d3ee" class="font-mono" font-size="22" font-weight="700" letter-spacing="1">${projectCode}</text>

  <!-- Clean Horizontal Divider -->
  <line x1="70" y1="135" x2="1130" y2="135" stroke="#27272a" stroke-width="1.5"/>

  <!-- BADGES -->
  <!-- Category Pill -->
  <rect x="70" y="165" width="250" height="34" rx="6" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="85" y="187" fill="#d4d4d8" class="font-sans" font-size="12" font-weight="700" letter-spacing="0.5">${category}</text>

  <!-- Open / Active Status Pill -->
  <rect x="330" y="165" width="95" height="34" rx="6" fill="#0f291a" stroke="#15803d" stroke-width="1"/>
  <text x="377" y="187" text-anchor="middle" fill="#4ade80" class="font-sans" font-size="12" font-weight="700" letter-spacing="0.5">OPEN</text>

  <!-- MAIN PROJECT TITLE -->
  ${titleLine2 ? `
    <text x="70" y="245" fill="#ffffff" class="font-sans" font-size="40" font-weight="800" letter-spacing="-0.5">${titleLine1}</text>
    <text x="70" y="295" fill="#ffffff" class="font-sans" font-size="40" font-weight="800" letter-spacing="-0.5">${titleLine2}</text>
    <text x="70" y="335" fill="#a1a1aa" class="font-sans" font-size="18" font-weight="400">${cleanDesc}</text>
  ` : `
    <text x="70" y="255" fill="#ffffff" class="font-sans" font-size="44" font-weight="800" letter-spacing="-0.5">${titleLine1}</text>
    <text x="70" y="305" fill="#a1a1aa" class="font-sans" font-size="20" font-weight="400">${cleanDesc}</text>
  `}

  <!-- THREE MINIMAL SPEC CARDS -->
  <!-- Card 1: Partner -->
  <rect x="70" y="365" width="335" height="110" rx="10" fill="#141417" stroke="#27272a" stroke-width="1"/>
  <text x="95" y="398" fill="#71717a" class="font-sans" font-size="12" font-weight="700" letter-spacing="0.5">ORGANIZATION</text>
  <text x="95" y="440" fill="#ffffff" class="font-sans" font-size="21" font-weight="700">${partnerName}</text>

  <!-- Card 2: Work Mode -->
  <rect x="430" y="365" width="335" height="110" rx="10" fill="#141417" stroke="#27272a" stroke-width="1"/>
  <text x="455" y="398" fill="#71717a" class="font-sans" font-size="12" font-weight="700" letter-spacing="0.5">WORK TYPE</text>
  <text x="455" y="440" fill="#ffffff" class="font-sans" font-size="21" font-weight="700">${workMode}</text>

  <!-- Card 3: Payout -->
  <rect x="790" y="365" width="340" height="110" rx="10" fill="#141417" stroke="#27272a" stroke-width="1"/>
  <text x="815" y="398" fill="#71717a" class="font-sans" font-size="12" font-weight="700" letter-spacing="0.5">COMPENSATION</text>
  <text x="815" y="440" fill="#22d3ee" class="font-sans" font-size="20" font-weight="700">${compensation}</text>

  <!-- BOTTOM FOOTER -->
  <line x1="70" y1="505" x2="1130" y2="505" stroke="#27272a" stroke-width="1.5"/>
  <text x="70" y="542" fill="#a1a1aa" class="font-mono" font-size="15" font-weight="500">Apply: zenemoo.in/opportunity/${oppId ? oppId.slice(0, 18) + '...' : ''}</text>
  <text x="1130" y="542" text-anchor="end" fill="#ffffff" class="font-sans" font-size="15" font-weight="700">Zenemoo Verified &#x2713;</text>
</svg>`;
}

/**
 * Gets or generates the Cloudinary CDN PNG URL for this opportunity
 */
export async function getOrGenerateOpportunityOgImageUrl(opp = {}) {
  const oppId = opp.id;
  if (!oppId) return 'https://www.zenemoo.in/assets/logo.png';

  const cacheKey = `opp_${oppId}_${opp.updated_at || ''}`;
  const cached = ogImageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < OG_CACHE_TTL) {
    return cached.url;
  }

  try {
    const svgContent = generateOpportunitySvg(opp);
    const b64DataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgContent, 'utf8').toString('base64');
    
    // Cloudinary automatically renders SVG to high-res PNG
    const publicId = `zenemoo_opp_card_${oppId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const result = await cloudinary.uploader.upload(b64DataUri, {
      folder: 'zenemoo/og-previews',
      public_id: publicId,
      format: 'png',
      overwrite: true,
      resource_type: 'image',
    });

    if (result && result.secure_url) {
      ogImageCache.set(cacheKey, { url: result.secure_url, timestamp: Date.now() });
      return result.secure_url;
    }
  } catch (err) {
    console.error('[opportunityOgImageService] Cloudinary generation failed:', err.message);
  }

  return 'https://www.zenemoo.in/assets/logo.png';
}
