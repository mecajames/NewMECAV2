import { Helmet } from 'react-helmet-async';
import { SITE_CONFIG } from './seo.constants';
import type { SEOProps } from './seo.types';

/**
 * SEOHead Component
 *
 * Renders all SEO-related meta tags including:
 * - Basic meta tags (title, description)
 * - Canonical URL
 * - Open Graph tags for social sharing
 * - Twitter Card tags
 * - JSON-LD structured data
 */
export function SEOHead({
  title,
  description,
  canonical,
  image = SITE_CONFIG.defaultImage,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOProps) {
  const fullUrl = canonical
    ? `${SITE_CONFIG.siteUrl}${canonical}`
    : SITE_CONFIG.siteUrl;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={fullUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_CONFIG.siteName} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {SITE_CONFIG.twitterHandle && (
        <meta name="twitter:site" content={SITE_CONFIG.twitterHandle} />
      )}

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
