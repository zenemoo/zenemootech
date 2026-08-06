import React, { useEffect } from 'react';
import { CloudinaryService } from '../services/CloudinaryService';

export interface SeoOpenGraphProps {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  imageAlt?: string;
  type?: string;
}

export const SeoOpenGraph: React.FC<SeoOpenGraphProps> = ({
  title,
  description,
  url = 'https://www.zenemoo.in/',
  imageUrl = 'https://www.zenemoo.in/assets/logo.png',
  imageAlt = 'Zenemoo Enterprise AI Language & Data Solutions',
  type = 'website',
}) => {
  useEffect(() => {
    const cleanImageUrl = CloudinaryService.optimize(imageUrl);

    const setPropertyMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setNameMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // OpenGraph
    setPropertyMeta('og:type', type);
    setPropertyMeta('og:title', title);
    setPropertyMeta('og:description', description);
    setPropertyMeta('og:url', url);
    setPropertyMeta('og:image', cleanImageUrl);
    setPropertyMeta('og:image:alt', imageAlt);

    // Twitter
    setNameMeta('twitter:card', 'summary_large_image');
    setNameMeta('twitter:title', title);
    setNameMeta('twitter:description', description);
    setNameMeta('twitter:image', cleanImageUrl);
    setNameMeta('twitter:image:alt', imageAlt);
  }, [title, description, url, imageUrl, imageAlt, type]);

  return null;
};
