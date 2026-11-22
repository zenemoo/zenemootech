/**
 * Edge CDN Image Proxy for Zenemoo (Vercel Serverless Function)
 * Serves Cloudinary media directly under https://www.zenemoo.in/cdn/...
 * with 30-day edge caching (Cache-Control: public, s-maxage=2592000)
 */

export default async function handler(req, res) {
  try {
    const rawPath = req.query.path || '';
    const pathStr = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath);
    const cleanPath = pathStr.replace(/^\/+/, '').replace(/\.\.\//g, '');

    if (!cleanPath) {
      return res.status(400).send('Path is required');
    }

    // Cloudinary cloud: rwoe0mm9 with auto-formatting and auto-quality
    const cloudinaryUrl = `https://res.cloudinary.com/rwoe0mm9/image/upload/f_auto,q_auto/${cleanPath}`;

    const upstreamRes = await fetch(cloudinaryUrl);
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send(`Asset not found upstream: ${upstreamRes.status}`);
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const contentLength = upstreamRes.headers.get('content-length');
    const etag = upstreamRes.headers.get('etag');

    res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (etag) res.setHeader('ETag', etag);

    // 30 days edge cache, 1 day browser cache, immutable
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Robots-Tag', 'all');

    const buffer = await upstreamRes.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('[CDN Proxy Error]:', err);
    return res.status(500).send('Internal CDN Proxy Error');
  }
}
