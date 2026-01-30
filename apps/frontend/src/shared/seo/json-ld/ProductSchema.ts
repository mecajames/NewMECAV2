import { SITE_CONFIG } from '../seo.constants';
import type { ProductSEOData } from '../seo.types';

/**
 * Generate JSON-LD Product schema for product detail pages
 */
export function generateProductSchema(product: ProductSEOData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image || SITE_CONFIG.defaultImage,
    brand: {
      '@type': 'Organization',
      name: SITE_CONFIG.organizationName,
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${SITE_CONFIG.siteUrl}/shop/products/${product.id}`,
      seller: {
        '@type': 'Organization',
        name: SITE_CONFIG.organizationName,
      },
    },
    ...(product.sku && { sku: product.sku }),
  };
}
