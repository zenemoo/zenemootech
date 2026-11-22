import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { toBrandedCdnUrl, toCloudinaryDirectUrl } from '../utils/cdnHelper.js';

const xmlEscape = (str = '') => {
  if (!str) return '';
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const getSlugFromName = (name = '') => {
  if (!name) return 'team-member';
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Express handler for GET /cdn/*
 * Edge-cached proxy that streams optimized Cloudinary images under the branded domain https://www.zenemoo.in/cdn/...
 */
export const proxyCdnImage = async (req, res) => {
  try {
    const rawPath = req.params[0] || req.query.path || '';
    const cleanPath = String(rawPath).replace(/^\/+/, '').replace(/\.\.\//g, '');

    if (!cleanPath) {
      return res.status(400).json({ error: 'Asset path is required' });
    }

    const cloudinaryUrl = `https://res.cloudinary.com/rwoe0mm9/image/upload/f_auto,q_auto/${cleanPath}`;

    const upstream = await axios.get(cloudinaryUrl, {
      responseType: 'stream',
      validateStatus: (status) => status < 400,
      timeout: 15000,
    });

    const contentType = upstream.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Robots-Tag', 'all');

    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }
    if (upstream.headers['etag']) {
      res.setHeader('ETag', upstream.headers['etag']);
    }

    upstream.data.pipe(res);
  } catch (err) {
    console.error('[CDN Proxy Controller Error]:', err.message);
    return res.status(404).json({ error: 'Asset not found on CDN' });
  }
};

/**
 * Express handler for GET /image-sitemap.xml
 * Dynamically queries opportunities AND team members and outputs compliant Google Image Sitemap XML
 */
export const getImageSitemap = async (req, res) => {
  try {
    let opportunities = [];
    let teamMembers = [];
    let galleryImages = [];

    if (supabase) {
      try {
        const [oppsRes, teamRes, galleryRes] = await Promise.all([
          supabase
            .from('opportunities')
            .select('id, title, public_id, poster_url, status, description, work_mode, partner_name, created_at, updated_at')
            .neq('status', 'draft')
            .order('position', { ascending: true }),
          supabase
            .from('team')
            .select('id, name, designation, department, image_url, slug, bio')
            .order('position', { ascending: true }),
          supabase
            .from('gallery_images')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
        ]);

        if (!oppsRes.error && Array.isArray(oppsRes.data)) {
          opportunities = oppsRes.data;
        }
        if (!teamRes.error && Array.isArray(teamRes.data)) {
          teamMembers = teamRes.data;
        }
        if (!galleryRes.error && Array.isArray(galleryRes.data)) {
          galleryImages = galleryRes.data;
        }
      } catch (dbErr) {
        console.warn('Supabase sitemap query warning:', dbErr.message);
      }
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

    // 2b. Official Visual Media & Image Gallery Hub (Google Image Ranking Hub)
    xml += `  <!-- 2b. Official Visual Media & Image Gallery Hub -->\n`;
    xml += `  <url>\n`;
    xml += `    <loc>https://www.zenemoo.in/images</loc>\n`;
    xml += `    <image:image>\n`;
    xml += `      <image:loc>https://www.zenemoo.in/assets/logo.png</image:loc>\n`;
    xml += `      <image:title>Zenemoo Images — Official Posters, Festival Greetings &amp; Visual Assets</image:title>\n`;
    xml += `      <image:caption>Official visual repository and image directory of Zenemoo AI Data Solutions.</image:caption>\n`;
    xml += `    </image:image>\n`;
    xml += `  </url>\n\n`;

    // 3. Dynamic Opportunity Posters & Social Cards
    xml += `  <!-- 3. Dynamic Program Opportunity Posters & Social Cards -->\n`;
    for (const opp of opportunities) {
      if (!opp.id) continue;
      const cleanId = String(opp.id).trim();
      const code = opp.public_id ? `[${opp.public_id}] ` : '';
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

    // 4. Team Directory & Member Portraits
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

    // 5. Official Zenemoo Media & Image Gallery Posters
    xml += `  <!-- 5. Official Zenemoo Media & Image Gallery Posters -->\n`;
    for (const item of galleryImages) {
      if (!item || (!item.cdn_url && !item.image_url)) continue;
      const cdnUrl = item.cdn_url || toBrandedCdnUrl(item.image_url);
      const title = item.title || 'Zenemoo Official Poster';
      const category = item.category || 'Festival & Greetings';
      const caption = item.caption || item.alt_text || `Official ${category} poster by Zenemoo`;

      xml += `  <url>\n`;
      xml += `    <loc>https://www.zenemoo.in/images</loc>\n`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${xmlEscape(cdnUrl)}</image:loc>\n`;
      xml += `      <image:title>${xmlEscape(`${title} — Official Zenemoo ${category}`)}</image:title>\n`;
      xml += `      <image:caption>${xmlEscape(caption)}</image:caption>\n`;
      xml += `    </image:image>\n`;
      xml += `  </url>\n\n`;
    }

    xml += `</urlset>\n`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'all');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('[Image Sitemap Controller Error]:', err.message);
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate image sitemap</error>');
  }
};
