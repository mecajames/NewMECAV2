import { SITE_CONFIG } from '../seo.constants';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Generate JSON-LD BreadcrumbList schema
 * https://schema.org/BreadcrumbList
 *
 * Google uses breadcrumbs to categorize page content and display
 * breadcrumb trails in search results.
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  // Always start with Home
  const allItems: BreadcrumbItem[] = [
    { name: 'Home', path: '/' },
    ...items,
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_CONFIG.siteUrl}${item.path}`,
    })),
  };
}
