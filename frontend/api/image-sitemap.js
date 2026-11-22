/**
 * Dynamic Google Image Sitemap Generator (Vercel Serverless Function)
 * Serves https://www.zenemoo.in/image-sitemap.xml
 * Fully complies with Google Image Sitemap XML specifications
 */

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
    .replace(/&amp;/g, '&')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getSlugFromName(name) {
  if (!name) return 'team-member';
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function handler(req, res) {
  try {
    let opportunities = [];
    let teamMembers = [];

    // Fetch live opportunities and team members from backend API
    try {
      const [oppRes, teamRes] = await Promise.all([
        fetch('https://zenemootech-api.onrender.com/api/opportunities', {
          headers: { 'User-Agent': 'Zenemoo-Sitemap-Generator/1.0' },
        }),
        fetch('https://zenemootech-api.onrender.com/api/team', {
          headers: { 'User-Agent': 'Zenemoo-Sitemap-Generator/1.0' },
        }),
      ]);

      if (oppRes.ok) {
        const json = await oppRes.json();
        if (json && Array.isArray(json.data)) opportunities = json.data;
      }
      if (teamRes.ok) {
        const json = await teamRes.json();
        if (json && Array.isArray(json.data)) teamMembers = json.data;
      }
    } catch (e) {
      console.warn('[Image Sitemap API Fetch Warning]:', e.message);
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

      if (opp.poster_url) {
        const cdnPosterUrl = toBrandedCdnUrl(opp.poster_url);
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${xmlEscape(cdnPosterUrl)}</image:loc>\n`;
        xml += `      <image:title>${xmlEscape(`${code}${title} — Official Project Poster | Zenemoo`)}</image:title>\n`;
        xml += `      <image:caption>${xmlEscape(`Official project poster for ${title} (${partner}, Work: ${workMode}). ${cleanDesc}`)}</image:caption>\n`;
        xml += `    </image:image>\n`;
      }

      const cardUrl = `https://www.zenemoo.in/cdn/zenemoo/og-previews/zenemoo_opp_card_${cleanId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${xmlEscape(cardUrl)}</image:loc>\n`;
      xml += `      <image:title>${xmlEscape(`${code}${title} — Opportunity Highlights &amp; Requirements Card | Zenemoo`)}</image:title>\n`;
      xml += `      <image:caption>${xmlEscape(`Project overview card and applicant criteria for ${title}. Partner: ${partner}. Apply now on Zenemoo.`)}</image:caption>\n`;
      xml += `    </image:image>\n`;

      xml += `  </url>\n\n`;
    }

    // 4. Team Directory & Individual Member Profiles
    xml += `  <!-- 4. Team Directory & Individual Member Profiles -->\n`;
    xml += `  <url>\n`;
    xml += `    <loc>https://www.zenemoo.in/team-directory</loc>\n`;
    xml += `    <image:image>\n`;
    xml += `      <image:loc>https://www.zenemoo.in/assets/logo.png</image:loc>\n`;
    xml += `      <image:title>Zenemoo Official Team Directory — Specialized AI Language &amp; Data Team</image:title>\n`;
    xml += `      <image:caption>Executive leadership, language consultants, and specialized AI data collection team at Zenemoo.</image:caption>\n`;
    xml += `    </image:image>\n`;
    xml += `  </url>\n\n`;

    for (const member of teamMembers) {
      if (!member || (!member.image_url && !member.image)) continue;
      const rawImage = member.image_url || member.image;
      const cdnImageUrl = toBrandedCdnUrl(rawImage);
      const name = member.name || 'Team Member';
      const role = member.designation || 'Specialist';
      const dept = member.department || 'Data Operations';
      const cleanSlug = member.slug || getSlugFromName(member.name);
      const bio = (member.bio || '').replace(/\s+/g, ' ').substring(0, 160);

      xml += `  <url>\n`;
      xml += `    <loc>https://www.zenemoo.in/team/${xmlEscape(cleanSlug)}</loc>\n`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${xmlEscape(cdnImageUrl)}</image:loc>\n`;
      xml += `      <image:title>${xmlEscape(`${name} — ${role} | Zenemoo Language & Data Solutions`)}</image:title>\n`;
      xml += `      <image:caption>${xmlEscape(`Official portrait of ${name}, ${role} (${dept}) at Zenemoo. ${bio}`)}</image:caption>\n`;
      xml += `    </image:image>\n`;
      xml += `  </url>\n\n`;
    }

    xml += `</urlset>\n`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'all');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('[Image Sitemap Function Error]:', err);
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal Image Sitemap Error</error>');
  }
}
