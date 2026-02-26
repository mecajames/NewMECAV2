import { SITE_CONFIG } from '../seo.constants';

export interface LocalBusinessData {
  id: string;
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  image?: string;
  geo?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Generate JSON-LD LocalBusiness schema for retailer profile pages
 * https://schema.org/LocalBusiness
 *
 * Helps retailers appear in local search results and Google Maps.
 */
export function generateLocalBusinessSchema(business: LocalBusinessData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_CONFIG.siteUrl}/retailers/${business.id}`,
    name: business.name,
    description: business.description || `${business.name} - MECA authorized car audio retailer`,
    image: business.image || SITE_CONFIG.defaultImage,
    url: business.website || `${SITE_CONFIG.siteUrl}/retailers/${business.id}`,
    ...(business.address && {
      address: {
        '@type': 'PostalAddress',
        ...(business.address.street && { streetAddress: business.address.street }),
        ...(business.address.city && { addressLocality: business.address.city }),
        ...(business.address.state && { addressRegion: business.address.state }),
        ...(business.address.zip && { postalCode: business.address.zip }),
        addressCountry: business.address.country || 'US',
      },
    }),
    ...(business.geo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: business.geo.latitude,
        longitude: business.geo.longitude,
      },
    }),
    ...(business.phone && { telephone: business.phone }),
    ...(business.email && { email: business.email }),
    memberOf: {
      '@type': 'Organization',
      name: SITE_CONFIG.organizationName,
      url: SITE_CONFIG.siteUrl,
    },
  };
}
