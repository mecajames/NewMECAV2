/**
 * Curated list of common MECA site links that support techs can drop
 * into a ticket reply with one click (the "Insert link" dropdown in
 * TicketDetail). Inserted as "Label: URL" since ticket replies are
 * rendered as plain text.
 *
 * This is intentionally a hardcoded constant — editing the list is a
 * one-line change here. If it ever needs to be admin-managed, promote
 * it to a backed entity + settings UI.
 */
export interface TicketQuickLink {
  label: string;
  url: string;
  group: string;
}

const SITE_BASE = 'https://mecacaraudio.com';

const path = (p: string) => `${SITE_BASE}${p}`;

export const TICKET_QUICK_LINKS: TicketQuickLink[] = [
  // Support & help
  { label: 'Help Center', url: path('/member-support'), group: 'Support' },
  { label: 'Knowledge Base', url: path('/knowledge-base'), group: 'Support' },
  { label: 'Competition Guides', url: path('/competition-guides'), group: 'Support' },
  { label: 'Contact Us', url: path('/contact'), group: 'Support' },

  // Competition
  { label: 'Events Calendar', url: path('/events'), group: 'Competition' },
  { label: 'Results', url: path('/results'), group: 'Competition' },
  { label: 'Standings', url: path('/standings'), group: 'Competition' },
  { label: 'Team Standings', url: path('/team-standings'), group: 'Competition' },
  { label: 'World Records', url: path('/world-records'), group: 'Competition' },
  { label: 'Rulebooks', url: path('/rulebooks'), group: 'Competition' },

  // Directories
  { label: 'Member Directory', url: path('/members'), group: 'Directories' },
  { label: 'Team Directory', url: path('/teams'), group: 'Directories' },
  { label: 'Retailer Directory', url: path('/retailers'), group: 'Directories' },
  { label: 'Manufacturer Directory', url: path('/manufacturers'), group: 'Directories' },

  // Membership & account
  { label: 'Membership / Join / Renew', url: path('/membership'), group: 'Membership' },
  { label: 'Hall of Fame', url: path('/hall-of-fame'), group: 'Membership' },
];
