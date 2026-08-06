/**
 * Zenemoo Schema.org ImageObject Builder (Expanded Enterprise Specification)
 */

import { CloudinaryService } from '../services/CloudinaryService';

export interface ImageObjectSchemaOptions {
  url: string;
  name: string;
  description?: string;
  caption?: string;
  creditText?: string;
  copyrightNotice?: string;
  creator?: string;
  license?: string;
  acquireLicensePage?: string;
  representativeOfPage?: boolean;
}

export const buildImageObjectSchema = (options: ImageObjectSchemaOptions) => {
  const canonicalUrl = CloudinaryService.optimize(options.url);
  const thumbnailUrl = CloudinaryService.thumbnail(options.url, 150);
  const titleName = options.name || 'Zenemoo AI Data Solution';
  const desc = options.description || `${titleName} provided by Zenemoo Data Solutions.`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    'url': canonicalUrl,
    'contentUrl': canonicalUrl,
    'thumbnailUrl': thumbnailUrl,
    'name': titleName,
    'description': desc,
    'caption': options.caption || desc,
    'encodingFormat': 'image/jpeg',
    'creditText': options.creditText || 'Zenemoo Data Solutions',
    'creator': {
      '@type': 'Organization',
      'name': options.creator || 'Zenemoo',
    },
    'copyrightNotice': options.copyrightNotice || '© Zenemoo',
    'license': options.license || 'https://www.zenemoo.in/#terms',
    'acquireLicensePage': options.acquireLicensePage || 'https://www.zenemoo.in/#contact',
    'representativeOfPage': options.representativeOfPage ?? false,
  };
};
