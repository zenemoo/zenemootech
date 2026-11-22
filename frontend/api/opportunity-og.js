export default async function handler(req, res) {
  const { id } = req.query;
  const oppId = String(id || '').trim();
  const pageUrl = `https://www.zenemoo.in/opportunity/${oppId}`;
  
  // Direct Cloudinary preview image fallback
  let ogImageUrl = `https://res.cloudinary.com/rwoe0mm9/image/upload/zenemoo/og-previews/zenemoo_opp_card_${oppId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

  let title = 'Zenemoo Program Opportunity';
  let desc = 'Explore and apply for enterprise AI data and language opportunities on Zenemoo.';

  try {
    const apiRes = await fetch(`https://zenemootech-api.onrender.com/api/opportunities/${oppId}/share-card`);
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && json.data) {
        const item = json.data;
        const code = item.project_code ? ` [${item.project_code}]` : '';
        title = `${item.title}${code} — Zenemoo Opportunity`;
        desc = `Partner: ${item.partner_name || 'Zenemoo'} • Work: ${(item.work_mode || 'Remote').toUpperCase()} WFH • Apply on Zenemoo`;
        if (item.og_image_url) {
          ogImageUrl = item.og_image_url;
        }
      }
    }
  } catch (_) {}

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  
  <!-- Open Graph / WhatsApp / Facebook / LinkedIn (Direct 200 OK CDN Image URL) -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Zenemoo">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:secure_url" content="${ogImageUrl}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${title}">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ZenemooAI">
  <meta name="twitter:url" content="${pageUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${ogImageUrl}">

  <!-- Human fallback redirect -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head>
<body style="background:#09090b;color:#ffffff;font-family:sans-serif;padding:2rem;">
  <h2>${title}</h2>
  <p>${desc}</p>
  <p><a href="${pageUrl}" style="color:#22d3ee;">Click here to view this opportunity on Zenemoo</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return res.status(200).send(html);
}
