import React, { useEffect } from 'react';

export interface SeoMetaProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  robots?: string;
}

export const SeoMeta: React.FC<SeoMetaProps> = ({
  title,
  description,
  canonicalUrl = 'https://www.zenemoo.in/',
  robots = 'index, follow, max-image-preview:large',
}) => {
  useEffect(() => {
    document.title = title;

    const setMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMetaTag('description', description);
    setMetaTag('robots', robots);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [title, description, canonicalUrl, robots]);

  return null;
};
