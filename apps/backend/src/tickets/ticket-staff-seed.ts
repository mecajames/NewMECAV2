// CANONICAL production staff / routing / custom-field configuration, captured
// 2026-06-27 from James's filled-out template. Applied by TicketStaffSetupService
// (POST /api/tickets/admin/staff-setup), gated to James (MECA 202401).
//
// Staff are matched to a prod profile by EMAIL (case-insensitive). Department
// slugs and category keys must already exist (run the config-sync first).

export interface SeedStaffMember {
  email: string;
  /** Display name used only in the setup report. */
  name: string;
  /** 1 = Staff, 2 = Supervisor, 3 = Admin. */
  permissionLevel: number;
  canBeAssignedTickets: boolean;
  receiveEmailNotifications: boolean;
}

export interface SeedDeptAssignment {
  departmentSlug: string;
  /** email -> is this person a department head (true) or a plain member (false). */
  members: Array<{ email: string; head: boolean }>;
}

export interface SeedDeptDefaultAssignee {
  departmentSlug: string;
  /** Primary auto-assignee for new tickets in this department (by email). */
  primaryEmail: string | null;
  /**
   * Informational only — the routing engine assigns ONE person. Fallbacks are
   * simply the other people on the department who can grab/reassign manually.
   */
  fallbackEmails: string[];
}

export interface SeedEventField {
  fieldKey: string;
  label: string;
  helpText: string | null;
  /** Category keys this event-picker appears under. */
  categories: string[];
  required: boolean;
}

// Email constants so the matrix below stays readable and typo-proof.
const JAMES = 'james@mecacaraudio.com';
const MICK = 'mmakhool6@gmail.com';
const BUD = 'imloud09@aol.com';
const SHANNON = 'imloud09@gmail.com';
const SALENA = 'salena.ballinger@gmail.com';

export const SEED_STAFF: SeedStaffMember[] = [
  { email: JAMES, name: 'James', permissionLevel: 3, canBeAssignedTickets: true, receiveEmailNotifications: true },
  { email: MICK, name: 'Mick', permissionLevel: 3, canBeAssignedTickets: true, receiveEmailNotifications: true },
  { email: BUD, name: 'Bud', permissionLevel: 2, canBeAssignedTickets: true, receiveEmailNotifications: true },
  { email: SHANNON, name: 'Shannon', permissionLevel: 2, canBeAssignedTickets: true, receiveEmailNotifications: true },
  { email: SALENA, name: 'Salena', permissionLevel: 2, canBeAssignedTickets: true, receiveEmailNotifications: true },
];

// Table 2 — department membership matrix. H = head, M = member.
export const SEED_DEPT_ASSIGNMENTS: SeedDeptAssignment[] = [
  {
    departmentSlug: 'membership_account', // all heads
    members: [
      { email: JAMES, head: true }, { email: MICK, head: true }, { email: BUD, head: true },
      { email: SHANNON, head: true }, { email: SALENA, head: true },
    ],
  },
  {
    departmentSlug: 'billing_payments', // James/Mick member; Bud/Shannon/Salena head
    members: [
      { email: JAMES, head: false }, { email: MICK, head: false }, { email: BUD, head: true },
      { email: SHANNON, head: true }, { email: SALENA, head: true },
    ],
  },
  {
    departmentSlug: 'shop_shipping', // all members
    members: [
      { email: JAMES, head: false }, { email: MICK, head: false }, { email: BUD, head: false },
      { email: SHANNON, head: false }, { email: SALENA, head: false },
    ],
  },
  {
    departmentSlug: 'event_operations', // all heads
    members: [
      { email: JAMES, head: true }, { email: MICK, head: true }, { email: BUD, head: true },
      { email: SHANNON, head: true }, { email: SALENA, head: true },
    ],
  },
  {
    departmentSlug: 'event_director_judge', // all heads
    members: [
      { email: JAMES, head: true }, { email: MICK, head: true }, { email: BUD, head: true },
      { email: SHANNON, head: true }, { email: SALENA, head: true },
    ],
  },
  {
    departmentSlug: 'website_technical', // James/Mick head; others member
    members: [
      { email: JAMES, head: true }, { email: MICK, head: true }, { email: BUD, head: false },
      { email: SHANNON, head: false }, { email: SALENA, head: false },
    ],
  },
  {
    departmentSlug: 'triage', // James/Mick head; others member
    members: [
      { email: JAMES, head: true }, { email: MICK, head: true }, { email: BUD, head: false },
      { email: SHANNON, head: false }, { email: SALENA, head: false },
    ],
  },
];

// Table 3 — per-department default (auto) assignee for new tickets.
export const SEED_DEPT_DEFAULT_ASSIGNEES: SeedDeptDefaultAssignee[] = [
  { departmentSlug: 'membership_account', primaryEmail: BUD, fallbackEmails: [SHANNON] },
  { departmentSlug: 'billing_payments', primaryEmail: BUD, fallbackEmails: [SHANNON] },
  { departmentSlug: 'shop_shipping', primaryEmail: SHANNON, fallbackEmails: [SALENA] },
  { departmentSlug: 'event_operations', primaryEmail: SALENA, fallbackEmails: [BUD, SHANNON] },
  { departmentSlug: 'event_director_judge', primaryEmail: BUD, fallbackEmails: [SHANNON, JAMES, MICK] },
  { departmentSlug: 'website_technical', primaryEmail: JAMES, fallbackEmails: [MICK] },
  { departmentSlug: 'triage', primaryEmail: JAMES, fallbackEmails: [MICK, BUD, SHANNON, SALENA] },
];

// Table 4 — event-picker custom field. One field of type event_reference, shown
// (and required) on the event-related categories that need an event chosen.
export const SEED_EVENT_FIELD: SeedEventField = {
  fieldKey: 'event_reference',
  label: 'Which event?',
  helpText: 'Select the event this is about (from the current season).',
  categories: ['eo_registration', 'eo_results', 'eo_dispute', 'edj_results_entry'],
  required: true,
};
