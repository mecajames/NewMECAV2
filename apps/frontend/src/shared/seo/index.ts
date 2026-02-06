// Components
export { SEOHead } from './SEOHead';

// Hooks
export {
  useHomeSEO,
  useEventsListSEO,
  useEventDetailSEO,
  useShopSEO,
  useProductDetailSEO,
  useResultsSEO,
  useLeaderboardSEO,
  useStandingsSEO,
  useTeamStandingsSEO,
  useTeamLeaderboardSEO,
  useMemberDirectorySEO,
  useMemberProfileSEO,
  useTeamDirectorySEO,
  useTeamProfileSEO,
  useRetailerDirectorySEO,
  useRetailerProfileSEO,
  useManufacturerDirectorySEO,
  useManufacturerProfileSEO,
  useJudgeDirectorySEO,
  useJudgeProfileSEO,
  useEventDirectorDirectorySEO,
  useEventDirectorProfileSEO,
  useRulebooksSEO,
  useRulebookDetailSEO,
  useStaticPageSEO,
} from './useSEO';

// Types
export type { SEOProps, EventSEOData, ProductSEOData, ProfileSEOData } from './seo.types';

// Constants
export { SITE_CONFIG, PAGE_TITLES, PAGE_DESCRIPTIONS } from './seo.constants';

// JSON-LD Generators
export { generateOrganizationSchema, generateEventSchema, generateProductSchema } from './json-ld';
