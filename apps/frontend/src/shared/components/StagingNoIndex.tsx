import { Helmet } from 'react-helmet-async';

/**
 * Adds noindex, nofollow meta tags when running on staging environment.
 * This prevents search engines from indexing the staging site while
 * allowing production to be indexed normally.
 */
export function StagingNoIndex() {
  const isStaging = typeof window !== 'undefined' && (
    window.location.hostname === 'stage.mecacaraudio.com' ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1')
  );

  if (!isStaging) {
    return null;
  }

  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />
    </Helmet>
  );
}

export default StagingNoIndex;
