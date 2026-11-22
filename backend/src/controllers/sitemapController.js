import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { toBrandedCdnUrl, toCloudinaryDirectUrl } from '../utils/cdnHelper.js';

const xmlEscape = (str = '') => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
 * Dynamically queries all opportunities and outputs compliant Google Image Sitemap XML
 */
export const getImageSitemap = async (req, res) => {
  try {
    let opportunities = [];

    if (supabase) {
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, title, public_id, poster_url, status, description, work_mode, partner_name, created_at, updated_at')
        .neq('status', 'draft')
        .order('position', { ascending: true });

      if (!error && Array.isArray(data)) {
        opportunities = data;
      }
    }

    // Static / Brand assets
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
      if (!opp.id) continue;
      const cleanId = String(opp.id).trim();
      const code = opp.public_id ? `[${opp.public_id}] ` : '';
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

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'all');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('[Image Sitemap Controller Error]:', err.message);
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate image sitemap</error>');
  }
};
