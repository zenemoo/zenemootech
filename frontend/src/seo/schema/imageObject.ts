/**
 * Zenemoo Schema.org ImageObject Builder
 * Generates Google Rich Results compliant ImageObject JSON-LD structures.
 */

import { getOptimizedCloudinaryUrl } from '../helpers/cloudinary';

export interface ImageObjectSchemaOptions {
  url: string;
  name: string;
  description?: string;
  caption?: string;
  creditText?: string;
  copyrightNotice?: string;
  license?: string;
  acquireLicensePage?: string;
  representativeOfPage?: boolean;
}

export const buildImageObjectSchema = (options: ImageObjectSchemaOptions) => {
  const canonicalUrl = getOptimizedCloudinaryUrl(options.url);
  const titleName = options.name || 'Zenemoo AI Data Solution';
  const desc = options.description || `${titleName} provided by Zenemoo Data Solutions.`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    'url': canonicalUrl,
    'contentUrl': canonicalUrl,
    'name': titleName,
    'description': desc,
    'caption': options.caption || desc,
    'creditText': options.creditText || 'Zenemoo Data Solutions',
    'copyrightNotice': options.copyrightNotice || '© Zenemoo',
    'license': options.license || 'https://www.zenemoo.in/#terms',
    'acquireLicensePage': options.acquireLicensePage || 'https://www.zenemoo.in/#contact',
    'representativeOfPage': options.representativeOfPage ?? false,
  };
};
