import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLOUDINARY_REGEX = /\/image\/upload\/(?:(?:(?:[a-z]{1,3}_[a-z0-9_]+|f_auto|q_auto)(?:,[a-z0-9_,]+)*)\/)?(?:v\d+\/)?([^?#]+)/i;

function toBrandedCdnUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('https://www.zenemoo.in/cdn/') ||
    trimmed.startsWith('https://zenemoo.in/cdn/') ||
    trimmed.startsWith('/cdn/')
  ) {
    return trimmed;
  }
  if (trimmed.includes('cloudinary.com')) {
    const match = trimmed.match(CLOUDINARY_REGEX);
    if (match && match[1]) {
      const cleanPath = match[1].replace(/^\/+/, '');
      return `https://www.zenemoo.in/cdn/${cleanPath}`;
    }
  }
  return trimmed;
}

function xmlEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function run() {
  console.log('🔄 Fetching live opportunities for image-sitemap.xml generation...');
  let opportunities = [];
  try {
    const res = await fetch('https://zenemootech-api.onrender.com/api/opportunities', {
      headers: { 'User-Agent': 'Zenemoo-Build-Sitemap-Generator/1.0' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        opportunities = json.data;
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch opportunities from API for static sitemap:', err.message);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n`;

  // 1. Zenemoo Official Homepage Assets
  xml += `  <!-- 1. Zenemoo Official Homepage Assets -->\n`;
  xml += `  <url>\n`;
  xml += `    <loc>https://www.zenemoo.in/</loc>\n`;
  xml += `    <image:image>\n`;
  xml += `      <image:loc>https://www.zenemoo.in/assets/logo.png</image:loc>\n`;
  xml += `      <image:title>Zenemoo Official Logo — Enterprise AI Language &amp; Data Solutions</image:title>\n`;
  xml += `      <image:caption>Official Brand Logo for Zenemoo (Formerly QuantumCoders Data Solution)</image:caption>\n`;
  xml += `    </image:image>\n`;
  xml += `    <image:image>\n`;
  xml += `      <image:loc>https://www.zenemoo.in/assets/udyam-qr.png</image:loc>\n`;
  xml += `      <image:title>Official UDYAM Registration Certificate QR Code — Ministry of MSME, Govt of India</image:title>\n`;
  xml += `      <image:caption>Zenemoo Official Government MSME Registration Verification QR Code</image:caption>\n`;
  xml += `    </image:image>\n`;
  xml += `  </url>\n\n`;

  // 2. Program Opportunities Portal
  xml += `  <!-- 2. Program Opportunities Portal -->\n`;
  xml += `  <url>\n`;
  xml += `    <loc>https://www.zenemoo.in/opportunities</loc>\n`;
  xml += `    <image:image>\n`;
  xml += `      <image:loc>https://www.zenemoo.in/assets/logo.png</image:loc>\n`;
  xml += `      <image:title>Zenemoo Program Opportunities &amp; Careers Portal</image:title>\n`;
  xml += `      <image:caption>AI Data Annotation, Audio Recording &amp; Speech Evaluation Project Opportunities</image:caption>\n`;
  xml += `    </image:image>\n`;
  xml += `  </url>\n\n`;

  // 3. Dynamic Opportunity Posters & Social Cards
  xml += `  <!-- 3. Dynamic Program Opportunity Posters & Social Cards -->\n`;
  for (const opp of opportunities) {
    if (!opp || !opp.id) continue;
    const cleanId = String(opp.id).trim();
    const code = opp.public_id || opp.project_code ? `[${opp.public_id || opp.project_code}] ` : '';
    const title = opp.title || 'AI Data Collection Opportunity';
    const partner = opp.partner_name || 'Zenemoo';
    const workMode = opp.work_mode || 'Remote / WFH';
    const cleanDesc = (opp.description || '').replace(/\s+/g, ' ').substring(0, 180);

    xml += `  <url>\n`;
    xml += `    <loc>https://www.zenemoo.in/opportunity/${xmlEscape(cleanId)}</loc>\n`;

    // Official Poster Banner if available
    if (opp.poster_url) {
      const cdnPosterUrl = toBrandedCdnUrl(opp.poster_url);
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${xmlEscape(cdnPosterUrl)}</image:loc>\n`;
      xml += `      <image:title>${xmlEscape(`${code}${title} — Official Project Poster | Zenemoo`)}</image:title>\n`;
      xml += `      <image:caption>${xmlEscape(`Official project poster for ${title} (${partner}, Work: ${workMode}). ${cleanDesc}`)}</image:caption>\n`;
      xml += `    </image:image>\n`;
    }

    // Design 2 Social Card Image
    const cardUrl = `https://www.zenemoo.in/cdn/zenemoo/og-previews/zenemoo_opp_card_${cleanId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    xml += `    <image:image>\n`;
    xml += `      <image:loc>${xmlEscape(cardUrl)}</image:loc>\n`;
    xml += `      <image:title>${xmlEscape(`${code}${title} — Opportunity Highlights &amp; Requirements Card | Zenemoo`)}</image:title>\n`;
    xml += `      <image:caption>${xmlEscape(`Project overview card and applicant criteria for ${title}. Partner: ${partner}. Apply now on Zenemoo.`)}</image:caption>\n`;
    xml += `    </image:image>\n`;

    xml += `  </url>\n\n`;
  }

  xml += `</urlset>\n`;

  const publicDir = path.resolve(__dirname, '../public');
  const sitemapPath = path.join(publicDir, 'image-sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`✅ Generated image-sitemap.xml successfully with ${opportunities.length} opportunities at: ${sitemapPath}`);
}

run();
