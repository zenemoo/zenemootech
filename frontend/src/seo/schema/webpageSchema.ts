/**
 * Zenemoo Schema.org WebPage Builder
 */

export interface WebPageSchemaOptions {
  name: string;
  description: string;
  url: string;
}

export const buildWebPageSchema = (options: WebPageSchemaOptions) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${options.url}/#webpage`,
    'url': options.url,
    'name': options.name,
    'description': options.description,
    'isPartOf': {
      '@id': 'https://www.zenemoo.in/#website',
    },
    'about': {
      '@id': 'https://www.zenemoo.in/#organization',
    },
    'primaryImageOfPage': {
      '@id': 'https://www.zenemoo.in/#logo',
    },
    'inLanguage': 'en-US',
  };
};
