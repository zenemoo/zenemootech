/**
 * Zenemoo Dynamic Image Sitemap XML Generator Utility
 */

export interface SitemapImageItem {
  pageUrl: string;
  imageUrl: string;
  title: string;
  caption: string;
}

export const buildImageSitemapXml = (images: SitemapImageItem[]): string => {
  const imageEntries = images
    .map(
      (img) => `  <url>
    <loc>${img.pageUrl}</loc>
    <image:image>
      <image:loc>${img.imageUrl}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      <image:caption>${escapeXml(img.caption)}</image:caption>
    </image:image>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

${imageEntries}

</urlset>
`;
};

const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};
