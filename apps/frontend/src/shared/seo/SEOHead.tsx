import { Helmet } from 'react-helmet-async';
import { SITE_CONFIG } from './seo.constants';
import { generateBreadcrumbSchema } from './json-ld';
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
 * - BreadcrumbList JSON-LD (when breadcrumbs are provided)
 */
export function SEOHead({
  title,
  description,
  canonical,
  image = SITE_CONFIG.defaultImage,
  type = 'website',
  noindex = false,
  jsonLd,
  breadcrumbs,
}: SEOProps) {
  const fullUrl = canonical
    ? `${SITE_CONFIG.siteUrl}${canonical}`
    : SITE_CONFIG.siteUrl;

  // Build array of all JSON-LD blocks to render
  const jsonLdBlocks: object[] = [];

  if (jsonLd) {
    if (Array.isArray(jsonLd)) {
      jsonLdBlocks.push(...jsonLd);
    } else {
      jsonLdBlocks.push(jsonLd);
    }
  }

  if (breadcrumbs && breadcrumbs.length > 0) {
    jsonLdBlocks.push(generateBreadcrumbSchema(breadcrumbs));
  }

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
      {jsonLdBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
