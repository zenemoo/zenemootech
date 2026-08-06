/**
 * Zenemoo Schema.org WebSite & SearchAction Builder
 */

export const buildWebSiteSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.zenemoo.in/#website',
    'name': 'Zenemoo',
    'alternateName': 'Zenemoo Data Solutions',
    'url': 'https://www.zenemoo.in/',
    'publisher': {
      '@id': 'https://www.zenemoo.in/#organization',
    },
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': 'https://www.zenemoo.in/#opportunities?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
};
