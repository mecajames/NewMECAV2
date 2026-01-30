import { SITE_CONFIG } from '../seo.constants';

/**
 * Generate JSON-LD Organization schema for the homepage
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.organizationName,
    alternateName: 'MECA',
    url: SITE_CONFIG.siteUrl,
    logo: SITE_CONFIG.logoUrl,
    description: SITE_CONFIG.defaultDescription,
    sameAs: [
      SITE_CONFIG.socialLinks.facebook,
      SITE_CONFIG.socialLinks.instagram,
      SITE_CONFIG.socialLinks.youtube,
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: `${SITE_CONFIG.siteUrl}/contact`,
    },
  };
}
