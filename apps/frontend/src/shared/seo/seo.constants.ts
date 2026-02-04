/**
 * SEO Configuration Constants
 */

export const SITE_CONFIG = {
  siteName: 'MECA Car Audio',
  siteUrl: 'https://mecacaraudio.com',
  defaultImage: 'https://mecacaraudio.com/og-image.png',
  defaultDescription:
    'The Premier Platform for Car Audio Competition Management. Browse events, view results, and join the MECA community.',
  twitterHandle: '@mecacaraudio',
  organizationName: 'Mobile Electronics Competition Association',
  logoUrl: 'https://mecacaraudio.com/logo.png',
  socialLinks: {
    facebook: 'https://www.facebook.com/mecacaraudio',
    instagram: 'https://www.instagram.com/mecacaraudio',
    youtube: 'https://www.youtube.com/@mecacaraudio',
  },
};

export const PAGE_TITLES = {
  home: 'MECA Car Audio | Car Audio Competitions',
  events: 'Competition Events | MECA Car Audio',
  eventDetail: (title: string) => `${title} | MECA Event`,
  // Shop
  shop: 'MECA Shop | Official Merchandise & Gear',
  productDetail: (name: string) => `${name} | MECA Shop`,
  // Results & Rankings
  results: 'Competition Results | MECA Car Audio',
  leaderboard: 'Leaderboard Rankings | MECA Car Audio',
  standings: 'Season Standings | MECA Car Audio',
  teamStandings: 'Team Standings | MECA Car Audio',
  teamLeaderboard: 'Top 10 Teams | MECA Car Audio',
  // Directories
  members: 'Member Directory | MECA Car Audio',
  memberProfile: (name: string) => `${name} | MECA Member`,
  teams: 'Team Directory | MECA Car Audio',
  teamProfile: (name: string) => `${name} | MECA Team`,
  retailers: 'Retailer Directory | MECA Car Audio',
  retailerProfile: (name: string) => `${name} | MECA Retailer`,
  manufacturers: 'Manufacturer Directory | MECA Car Audio',
  manufacturerProfile: (name: string) => `${name} | MECA Manufacturer`,
  judges: 'Judge Directory | MECA Car Audio',
  judgeProfile: (name: string) => `${name} | MECA Judge`,
  eventDirectors: 'Event Director Directory | MECA Car Audio',
  eventDirectorProfile: (name: string) => `${name} | MECA Event Director`,
  // Rulebooks
  rulebooks: 'Rulebooks | MECA Car Audio',
  rulebookDetail: (title: string) => `${title} | MECA Rulebook`,
  // Other public pages
  hallOfFame: 'Hall of Fame | MECA Car Audio',
  championshipArchives: 'Championship Archives | MECA Car Audio',
  classCalculator: 'Class Calculator | MECA Car Audio',
  membership: 'Membership | MECA Car Audio',
  contact: 'Contact Us | MECA Car Audio',
  hostEvent: 'Host an Event | MECA Car Audio',
  privacyPolicy: 'Privacy Policy | MECA Car Audio',
  termsAndConditions: 'Terms and Conditions | MECA Car Audio',
  competitionGuides: 'Competition Guides | MECA Car Audio',
};

export const PAGE_DESCRIPTIONS = {
  home: (subtitle: string) => subtitle || SITE_CONFIG.defaultDescription,
  events:
    'Browse upcoming and past car audio competition events. Find SPL, SQL, and Show & Shine events near you. Register for MECA sanctioned competitions.',
  // Shop
  shop: 'Shop official MECA merchandise, apparel, and competition gear. Support the car audio community with quality products.',
  // Results & Rankings
  results: 'View competition results from MECA sanctioned car audio events. See scores, placements, and detailed breakdowns.',
  leaderboard: 'Check the current MECA leaderboard rankings. See who leads in SPL, SQL, and overall points standings.',
  standings: 'View current season standings for MECA competitors. Track points, rankings, and championship positions.',
  teamStandings: 'View team standings for MECA car audio competitions. See which teams are leading in total points this season.',
  teamLeaderboard: 'View the top 10 teams in MECA car audio competitions. See which teams are leading in total points this season.',
  // Directories
  members: 'Browse the MECA member directory. Find competitors, enthusiasts, and community members.',
  teams: 'Discover MECA competition teams. Browse team profiles and see their achievements.',
  retailers: 'Find MECA authorized retailers near you. Connect with professional car audio installers and shops.',
  manufacturers: 'Explore MECA partner manufacturers. Discover the brands that support car audio competition.',
  judges: 'Meet the official MECA judges. Certified professionals who score competitions across the country.',
  eventDirectors: 'Find MECA event directors. The professionals who organize and run sanctioned competitions.',
  // Rulebooks
  rulebooks: 'Access official MECA rulebooks for SPL, SQL, and Show & Shine competitions. Learn the rules and regulations.',
  // Other public pages
  hallOfFame: 'Celebrate MECA legends in our Hall of Fame. Honoring outstanding achievements in car audio competition.',
  championshipArchives: 'Explore MECA championship history. View past winners, records, and memorable moments.',
  classCalculator: 'Calculate your MECA competition class. Determine the right category for your vehicle and equipment.',
  membership: 'Join MECA and unlock exclusive benefits. Compete in sanctioned events and connect with the community.',
  contact: 'Contact MECA for questions, support, or inquiries. We are here to help the car audio community.',
  hostEvent: 'Host a MECA sanctioned event at your location. Partner with us to bring car audio competitions to your area.',
  privacyPolicy: 'Read the MECA privacy policy. Learn how we protect and handle your personal information.',
  termsAndConditions: 'Review MECA terms and conditions. Understand the rules governing use of our platform and services.',
  competitionGuides: 'Learn how to compete in MECA events. Guides for beginners and experienced competitors alike.',
};
