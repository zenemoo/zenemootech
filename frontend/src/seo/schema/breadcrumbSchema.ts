/**
 * Zenemoo Schema.org BreadcrumbList Builder
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export const buildBreadcrumbSchema = (items: BreadcrumbItem[]) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'name': item.name,
      'item': item.url.startsWith('http') ? item.url : `https://www.zenemoo.in${item.url}`,
    })),
  };
};
