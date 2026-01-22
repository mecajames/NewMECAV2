import { useMemo } from 'react';
import { SITE_CONFIG, PAGE_TITLES, PAGE_DESCRIPTIONS } from './seo.constants';
import { generateOrganizationSchema, generateEventSchema, generateProductSchema } from './json-ld';
import type { SEOProps, EventSEOData, ProductSEOData, ProfileSEOData } from './seo.types';

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Hook for Homepage SEO
 */
export function useHomeSEO(subtitle: string): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.home,
      description: PAGE_DESCRIPTIONS.home(subtitle),
      canonical: '/',
      type: 'website' as const,
      jsonLd: generateOrganizationSchema(),
    }),
    [subtitle]
  );
}

/**
 * Hook for Events List Page SEO
 */
export function useEventsListSEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.events,
      description: PAGE_DESCRIPTIONS.events,
      canonical: '/events',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Event Detail Page SEO
 */
export function useEventDetailSEO(event: EventSEOData | null): SEOProps | null {
  return useMemo(() => {
    if (!event) return null;

    // Generate description from event data or auto-generate
    const description = event.description
      ? truncate(event.description, 160)
      : `Join us at ${event.location.name}${event.location.city ? ` in ${event.location.city}` : ''}${event.location.state ? `, ${event.location.state}` : ''} on ${formatDate(event.date)} for this exciting car audio competition event.`;

    return {
      title: PAGE_TITLES.eventDetail(event.title),
      description,
      canonical: `/events/${event.id}`,
      image: event.image || SITE_CONFIG.defaultImage,
      type: 'event' as const,
      jsonLd: generateEventSchema(event),
    };
  }, [event]);
}

// ============ SHOP PAGES ============

/**
 * Hook for Shop Page SEO
 */
export function useShopSEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.shop,
      description: PAGE_DESCRIPTIONS.shop,
      canonical: '/shop',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Product Detail Page SEO
 */
export function useProductDetailSEO(product: ProductSEOData | null): SEOProps | null {
  return useMemo(() => {
    if (!product) return null;

    const description = product.description
      ? truncate(product.description, 160)
      : `Shop ${product.name} from the official MECA store. Quality car audio competition gear and merchandise.`;

    return {
      title: PAGE_TITLES.productDetail(product.name),
      description,
      canonical: `/shop/products/${product.id}`,
      image: product.image || SITE_CONFIG.defaultImage,
      type: 'product' as const,
      jsonLd: generateProductSchema(product),
    };
  }, [product]);
}

// ============ RESULTS & RANKINGS ============

/**
 * Hook for Results Page SEO
 */
export function useResultsSEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.results,
      description: PAGE_DESCRIPTIONS.results,
      canonical: '/results',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Leaderboard Page SEO
 */
export function useLeaderboardSEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.leaderboard,
      description: PAGE_DESCRIPTIONS.leaderboard,
      canonical: '/leaderboard',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Standings Page SEO
 */
export function useStandingsSEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.standings,
      description: PAGE_DESCRIPTIONS.standings,
      canonical: '/standings',
      type: 'website' as const,
    }),
    []
  );
}

// ============ DIRECTORIES ============

/**
 * Hook for Member Directory Page SEO
 */
export function useMemberDirectorySEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.members,
      description: PAGE_DESCRIPTIONS.members,
      canonical: '/members',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Member Profile Page SEO
 */
export function useMemberProfileSEO(profile: ProfileSEOData | null): SEOProps | null {
  return useMemo(() => {
    if (!profile) return null;

    const description = profile.description
      ? truncate(profile.description, 160)
      : `View ${profile.name}'s MECA member profile. See competition history and achievements.`;

    return {
      title: PAGE_TITLES.memberProfile(profile.name),
      description,
      canonical: `/members/${profile.id}`,
      image: profile.image || SITE_CONFIG.defaultImage,
      type: 'website' as const,
    };
  }, [profile]);
}

/**
 * Hook for Team Directory Page SEO
 */
export function useTeamDirectorySEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.teams,
      description: PAGE_DESCRIPTIONS.teams,
      canonical: '/teams',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Team Profile Page SEO
 */
export function useTeamProfileSEO(team: ProfileSEOData | null): SEOProps | null {
  return useMemo(() => {
    if (!team) return null;

    const description = team.description
      ? truncate(team.description, 160)
      : `View ${team.name} team profile. See team members, competition history, and achievements.`;

    return {
      title: PAGE_TITLES.teamProfile(team.name),
      description,
      canonical: `/teams/${team.id}`,
      image: team.image || SITE_CONFIG.defaultImage,
      type: 'website' as const,
    };
  }, [team]);
}

/**
 * Hook for Retailer Directory Page SEO
 */
export function useRetailerDirectorySEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.retailers,
      description: PAGE_DESCRIPTIONS.retailers,
      canonical: '/retailers',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Retailer Profile Page SEO
 */
export function useRetailerProfileSEO(retailer: ProfileSEOData | null): SEOProps | null {
  return useMemo(() => {
    if (!retailer) return null;

    const description = retailer.description
      ? truncate(retailer.description, 160)
      : `${retailer.name} - MECA authorized retailer. Professional car audio installation and equipment.`;

    return {
      title: PAGE_TITLES.retailerProfile(retailer.name),
      description,
      canonical: `/retailers/${retailer.id}`,
      image: retailer.image || SITE_CONFIG.defaultImage,
      type: 'website' as const,
    };
  }, [retailer]);
}

/**
 * Hook for Manufacturer Directory Page SEO
 */
export function useManufacturerDirectorySEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.manufacturers,
      description: PAGE_DESCRIPTIONS.manufacturers,
      canonical: '/manufacturers',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Manufacturer Profile Page SEO
 */
export function useManufacturerProfileSEO(manufacturer: ProfileSEOData | null): SEOProps | null {
  return useMemo(() => {
    if (!manufacturer) return null;

    const description = manufacturer.description
      ? truncate(manufacturer.description, 160)
      : `${manufacturer.name} - MECA partner manufacturer. Quality car audio equipment and products.`;

    return {
      title: PAGE_TITLES.manufacturerProfile(manufacturer.name),
      description,
      canonical: `/manufacturers/${manufacturer.id}`,
      image: manufacturer.image || SITE_CONFIG.defaultImage,
      type: 'website' as const,
    };
  }, [manufacturer]);
}

/**
 * Hook for Judge Directory Page SEO
 */
export function useJudgeDirectorySEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.judges,
      description: PAGE_DESCRIPTIONS.judges,
      canonical: '/judges',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Judge Profile Page SEO
 */
export function useJudgeProfileSEO(judge: ProfileSEOData | null): SEOProps | null {
  return useMemo(() => {
    if (!judge) return null;

    const description = `${judge.name} - Official MECA certified judge. View judging history and credentials.`;

    return {
      title: PAGE_TITLES.judgeProfile(judge.name),
      description,
      canonical: `/judges/${judge.id}`,
      image: judge.image || SITE_CONFIG.defaultImage,
      type: 'website' as const,
    };
  }, [judge]);
}

/**
 * Hook for Event Director Directory Page SEO
 */
export function useEventDirectorDirectorySEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.eventDirectors,
      description: PAGE_DESCRIPTIONS.eventDirectors,
      canonical: '/event-directors',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Event Director Profile Page SEO
 */
export function useEventDirectorProfileSEO(director: ProfileSEOData | null): SEOProps | null {
  return useMemo(() => {
    if (!director) return null;

    const description = `${director.name} - MECA event director. View events organized and director profile.`;

    return {
      title: PAGE_TITLES.eventDirectorProfile(director.name),
      description,
      canonical: `/event-directors/${director.id}`,
      image: director.image || SITE_CONFIG.defaultImage,
      type: 'website' as const,
    };
  }, [director]);
}

// ============ RULEBOOKS ============

/**
 * Hook for Rulebooks Page SEO
 */
export function useRulebooksSEO(): SEOProps {
  return useMemo(
    () => ({
      title: PAGE_TITLES.rulebooks,
      description: PAGE_DESCRIPTIONS.rulebooks,
      canonical: '/rulebooks',
      type: 'website' as const,
    }),
    []
  );
}

/**
 * Hook for Rulebook Detail Page SEO
 */
export function useRulebookDetailSEO(title: string | null): SEOProps | null {
  return useMemo(() => {
    if (!title) return null;

    return {
      title: PAGE_TITLES.rulebookDetail(title),
      description: `Read the ${title}. Official MECA competition rules and regulations.`,
      canonical: '/rulebooks',
      type: 'article' as const,
    };
  }, [title]);
}

// ============ STATIC PAGES ============

/**
 * Hook for static page SEO (generic)
 */
export function useStaticPageSEO(
  page: 'hallOfFame' | 'championshipArchives' | 'classCalculator' | 'membership' | 'contact' | 'hostEvent' | 'privacyPolicy' | 'termsAndConditions' | 'competitionGuides'
): SEOProps {
  return useMemo(() => {
    const canonicalMap: Record<string, string> = {
      hallOfFame: '/hall-of-fame',
      championshipArchives: '/championship-archives',
      classCalculator: '/class-calculator',
      membership: '/membership',
      contact: '/contact',
      hostEvent: '/host-event',
      privacyPolicy: '/privacy-policy',
      termsAndConditions: '/terms-and-conditions',
      competitionGuides: '/competition-guides',
    };

    return {
      title: PAGE_TITLES[page],
      description: PAGE_DESCRIPTIONS[page],
      canonical: canonicalMap[page],
      type: 'website' as const,
    };
  }, [page]);
}
