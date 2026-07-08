// Admin-configurable site logo (Site Settings → Appearance → Site Logo).
// The chosen URL lives in the `site_logo_url` site setting; empty/absent means
// the built-in default. React components should use the reactive useSiteLogo()
// hook (exported from @/shared/contexts); non-React code (HTML-string builders,
// map markers, api-clients) reads the module singleton below, which the
// SiteSettingsProvider primes as soon as settings load.

export const DEFAULT_SITE_LOGO = '/meca-logo-transparent.png';

let currentSiteLogo = DEFAULT_SITE_LOGO;

/** Called by SiteSettingsProvider whenever settings load/refresh. */
export function setSiteLogo(url?: string | null): void {
  currentSiteLogo = (url || '').trim() || DEFAULT_SITE_LOGO;
}

/** Current site logo URL (relative default or absolute uploaded URL). */
export function getSiteLogo(): string {
  return currentSiteLogo;
}

/** Absolute variant for contexts that leave the page origin (print/blob HTML). */
export function getAbsoluteSiteLogo(): string {
  const logo = currentSiteLogo;
  if (logo.startsWith('http')) return logo;
  const origin = (typeof window !== 'undefined' && window.location.origin) || 'https://www.mecacaraudio.com';
  return `${origin}${logo.startsWith('/') ? '' : '/'}${logo}`;
}
