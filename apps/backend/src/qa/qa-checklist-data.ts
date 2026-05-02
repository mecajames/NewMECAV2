/**
 * Master checklist data used to seed QA rounds.
 *
 * SCOPE & AUDIENCE
 * ----------------
 * This checklist is run by the site owners (Bud, Shannon, Salena) and signed
 * off before launch — and reused whenever the development team (Mick, James)
 * ships a meaningful new feature. Two-tiered: owners verify behaviour with
 * pass/fail/skip + comments, developers respond on failed items via the
 * "Developer Fixes" tab on the round detail page.
 *
 * GOAL
 * ----
 * Every section walks the reviewer through *both* a public/member touchpoint
 * AND its admin counterpart so the owners learn where everything lives while
 * verifying that the feature is functional. Items default to CRUD verbs
 * (View, Add, Edit, Suspend/Cancel, Delete) where the underlying surface
 * supports them — that way the review confirms not just that pages load but
 * that the destructive operations actually do the right thing.
 *
 * AUTHORING NOTES
 * ---------------
 * - `pageUrl` is optional but strongly preferred for admin items so the
 *   reviewer can click straight into the surface they're testing.
 * - Steps are intentionally short imperative sentences — owners are not
 *   developers, so avoid jargon ("MikroORM", "API", "endpoint").
 * - When you change this file, only NEW rounds pick it up. Existing rounds
 *   keep the snapshot they were seeded with so a finished round is a true
 *   record of what was reviewed.
 */
export interface ChecklistItemData {
  id: string;
  title: string;
  steps: string[];
  expectedResult: string;
  /** Direct link to the page being tested. Optional. */
  pageUrl?: string;
}

export interface ChecklistSectionData {
  id: string;
  title: string;
  description: string;
  items: ChecklistItemData[];
}

export const CHECKLIST_SECTIONS: ChecklistSectionData[] = [
  {
    id: 'public-pages',
    title: 'Section 1: Public Pages & Navigation',
    description: 'Verify all public-facing pages load correctly and navigation works.',
    items: [
      { id: 'home-page', title: '1.1 Home Page', steps: ['Open the website in your browser', 'Verify the home page loads with the MECA logo, navigation bar, and hero section', 'Check that upcoming events are displayed', 'Check that sponsor/banner ads appear correctly', 'Click through any links or buttons on the page'], expectedResult: 'Home page loads fully with all sections visible. No broken images or errors.', pageUrl: '/' },
      { id: 'navigation', title: '1.2 Main Navigation', steps: ['Click each item in the top navigation bar', 'Verify each menu item takes you to the correct page', 'On mobile: tap the hamburger menu icon and verify the menu opens', 'Check that the MECA logo links back to the home page'], expectedResult: 'All navigation links work. Mobile menu opens and closes properly.' },
      { id: 'events-page', title: '1.3 Events Page', steps: ['Navigate to the Events page', 'Verify events are listed with dates, locations, and details', 'Click on an event to view its detail page', 'Verify event details show: name, date, location, description, and registration info'], expectedResult: 'Events list displays correctly. Event detail pages show complete information.', pageUrl: '/events' },
      { id: 'results-leaderboard', title: '1.4 Results & Leaderboard', steps: ['Navigate to the Results page', 'Verify competition results are displayed', 'Navigate to the Leaderboard page - verify rankings with points', 'Navigate to the Standings page', 'Check Team Standings and Team Leaderboard pages'], expectedResult: 'Results, leaderboard, and standings pages display data correctly.', pageUrl: '/results' },
      { id: 'directories', title: '1.5 Directories', steps: ['Navigate to the Members directory and verify member profiles show', 'Navigate to the Teams directory and check team listings', 'Navigate to the Retailers directory and verify retailer listings', 'Navigate to the Manufacturers directory and verify listings', 'Navigate to the Judges directory and verify judge profiles', 'Navigate to the Event Directors directory and verify ED profiles', 'Click on a profile in each directory to verify the detail page loads'], expectedResult: 'All directories load with searchable listings. Detail pages display correct info.' },
      { id: 'rulebooks', title: '1.6 Rulebooks', steps: ['Navigate to the Rulebooks page', 'Verify rulebooks are listed', 'Click on a rulebook to view or download it', 'Check the Rulebook Archive page'], expectedResult: 'Rulebooks are listed and accessible. PDFs open/download correctly.', pageUrl: '/rulebooks' },
      { id: 'contact', title: '1.7 Contact Page', steps: ['Navigate to the Contact page', 'Fill in the contact form with test information', 'Submit the form'], expectedResult: 'Contact form submits successfully with a confirmation message.', pageUrl: '/contact' },
      { id: 'info-pages', title: '1.8 Information Pages', steps: ['Navigate to the Privacy Policy page and verify content displays', 'Navigate to the Terms & Conditions page and verify content displays', 'Navigate to the Member Support / Knowledge Base page', 'Navigate to the Competition Guides and Quick Start Guide'], expectedResult: 'All informational pages load with readable content.' },
      { id: 'shop', title: '1.9 MECA Shop', steps: ['Navigate to the Shop page', 'Verify products are displayed with images and prices', 'Click on a product to view its detail page', 'Add a product to the cart', 'Go to the Cart page and verify the item appears with correct total'], expectedResult: 'Shop displays products. Cart adds items and calculates totals correctly.', pageUrl: '/shop' },
      { id: 'special-pages', title: '1.10 Special Pages', steps: ['Navigate to the Hall of Fame page', 'Navigate to the SPL World Records page', 'Navigate to the Championship Archives page and click into a specific year', 'Navigate to the Class Calculator page and try using it'], expectedResult: 'All special pages load with content. Class calculator functions.' },
      { id: 'guest-support', title: '1.11 Guest Support Ticket', steps: ['Navigate to Support > Guest Support (without logging in)', 'Fill in a test support ticket', 'Submit the ticket and check the email verification flow'], expectedResult: 'Guest can submit a support ticket and receives email verification.', pageUrl: '/support/guest' },
    ],
  },
  {
    id: 'auth-account',
    title: 'Section 2: Account & Authentication',
    description: 'Test login, registration, and account management.',
    items: [
      { id: 'login', title: '2.1 Login', steps: ['Navigate to the Login page', 'Enter valid credentials and log in', 'Verify you are redirected to the Dashboard', 'Verify the navigation bar updates to show your logged-in state'], expectedResult: 'Login succeeds. Dashboard loads. Nav shows logged-in user.', pageUrl: '/login' },
      { id: 'profile', title: '2.2 Profile Management', steps: ['Navigate to your Profile page', 'Verify your information is displayed correctly', 'Edit a field (e.g., phone number or address)', 'Save changes and verify they persist after refresh', 'Check Public Profile settings'], expectedResult: 'Profile displays correctly. Changes save and persist.', pageUrl: '/profile' },
      { id: 'change-password', title: '2.3 Change Password', steps: ['Navigate to Change Password', 'Enter current and new password', 'Save and log out', 'Log back in with new password'], expectedResult: 'Password changes. New password works for login.' },
      { id: 'dashboard', title: '2.4 User Dashboard', steps: ['Navigate to the Dashboard', 'Verify it shows your membership status', 'Check MyMECA dashboard section', 'Verify links to registrations, billing, and membership work'], expectedResult: 'Dashboard shows correct info and all links work.', pageUrl: '/dashboard' },
    ],
  },
  {
    id: 'membership',
    title: 'Section 3: Membership System',
    description: 'Test membership purchasing, renewal, and management.',
    items: [
      { id: 'membership-page', title: '3.1 Membership Overview Page', steps: ['Navigate to the Membership page', 'Verify all membership types with names and prices', 'Click on a type to see details'], expectedResult: 'Membership types display correctly with accurate pricing.', pageUrl: '/membership' },
      { id: 'membership-purchase', title: '3.2 Membership Purchase', steps: ['Select a membership type and proceed to checkout', 'Verify the checkout page shows the correct price', 'Complete a test payment', 'Verify membership is activated and MECA ID assigned'], expectedResult: 'Purchase completes. MECA ID assigned. Status shows active.' },
      { id: 'membership-paypal', title: '3.3 PayPal Checkout (alternative payment)', steps: ['Start a membership purchase', 'On the checkout step, choose PayPal as the payment method', 'Complete the PayPal sandbox flow', 'Verify the membership activates and the order shows in your billing history'], expectedResult: 'PayPal payment processes and the membership becomes active.' },
      { id: 'membership-coupon', title: '3.4 Coupon / Discount Code', steps: ['Start a membership or shop purchase', 'On the checkout step, enter a known coupon code', 'Confirm the discount applies to the total', 'Try an invalid code and confirm it is rejected'], expectedResult: 'Valid codes apply the discount; invalid codes show a clear error.' },
      { id: 'membership-dashboard', title: '3.5 Membership Dashboard', steps: ['Navigate to Dashboard > Membership', 'Verify membership status, MECA ID, and expiration', 'Check membership card/QR code', 'Verify auto-renewal status'], expectedResult: 'Membership dashboard shows accurate details.' },
      { id: 'membership-card-print', title: '3.6 Print Digital Membership Card', steps: ['Open My Membership Card from your dashboard', 'Click Print Card', 'Verify the printed/preview card shows your name, MECA ID, member since date, expiration date, and QR code in the correct positions'], expectedResult: 'Print preview matches the on-screen card layout with no missing fields.', pageUrl: '/membership-card' },
      { id: 'membership-history', title: '3.7 Membership History', steps: ['Open the My MECA dashboard', 'Find the Membership History table', 'Confirm the table lists current and prior memberships with dates and types'], expectedResult: 'History table shows full membership timeline accurately.', pageUrl: '/dashboard/my-meca' },
      { id: 'team-membership', title: '3.8 Team Membership Features', steps: ['If you have a team membership, verify team members are listed', 'Check vehicle info can be updated', 'Verify team name can be updated'], expectedResult: 'Team features work for managing members.' },
    ],
  },
  {
    id: 'event-registration',
    title: 'Section 4: Event Registration',
    description: 'Test event registration and check-in.',
    items: [
      { id: 'register-event', title: '4.1 Register for an Event', steps: ['Find an upcoming event open for registration', 'Click "Register" and select competition class(es)', 'Complete registration checkout', 'Verify confirmation'], expectedResult: 'Registration completes with confirmation.' },
      { id: 'my-registrations', title: '4.2 My Registrations', steps: ['Navigate to My Registrations', 'Verify registrations are listed', 'Check event details are correct'], expectedResult: 'Registration history shows all events with correct details.', pageUrl: '/my-registrations' },
      { id: 'event-checkin', title: '4.3 Event Check-In', steps: ['Navigate to event check-in page', 'Verify QR scanner or manual check-in works', 'Confirm checked-in status updates'], expectedResult: 'Check-in works. Status updates.' },
    ],
  },
  {
    id: 'support-tickets',
    title: 'Section 5: Support Tickets',
    description: 'Test the support ticket system.',
    items: [
      { id: 'create-ticket', title: '5.1 Create a Support Ticket', steps: ['Navigate to Support Tickets', 'Create a new ticket with subject, category, description', 'Submit'], expectedResult: 'Ticket created. Appears in list.', pageUrl: '/tickets' },
      { id: 'view-ticket', title: '5.2 View and Comment on a Ticket', steps: ['Open existing ticket', 'Add a comment', 'Verify comment appears'], expectedResult: 'Ticket details load. Comments display.' },
    ],
  },
  {
    id: 'billing',
    title: 'Section 6: Billing & Payments',
    description: 'Verify billing information and payment history.',
    items: [
      { id: 'billing-page', title: '6.1 Billing Page', steps: ['Navigate to your Billing page', 'Verify payment history is displayed', 'Check invoices show correct amounts and dates', 'Check Stripe billing portal access if available'], expectedResult: 'Billing page shows accurate payment history and invoices.', pageUrl: '/billing' },
      { id: 'unified-transactions', title: '6.2 Unified Transactions View', steps: ['Open the Billing page', 'Switch to the Transactions / Activity tab', 'Confirm membership payments, shop orders, event registrations, and refunds all appear in one chronological list', 'Click an entry and confirm the detail drawer or page opens correctly'], expectedResult: 'A single feed shows every kind of charge or credit with consistent formatting.' },
      { id: 'shop-orders-link', title: '6.3 Shop Orders Tab', steps: ['Open the Billing page', 'Click the Shop Orders tab', 'Click any order to open its detail page', 'On the order detail page, click "Contact Support →" and confirm it opens the Member Support page (NOT the home page)'], expectedResult: 'Shop orders are listed; the support link from the order detail goes to /member-support.' },
    ],
  },
  {
    id: 'shop-checkout',
    title: 'Section 7: Shop & Checkout',
    description: 'Test the full shopping experience.',
    items: [
      { id: 'shop-purchase', title: '7.1 Complete a Shop Purchase', steps: ['Add items to cart', 'Go to Cart - verify items and totals', 'Proceed to Checkout', 'Complete test payment', 'Verify order confirmation page', 'Check Order History'], expectedResult: 'Purchase flow completes. Order appears in history.' },
    ],
  },
  {
    id: 'judge-ed',
    title: 'Section 8: Judge & Event Director Applications',
    description: 'Test application processes.',
    items: [
      { id: 'judge-application', title: '8.1 Judge Application', steps: ['Navigate to Judges > Apply', 'Fill in application form', 'Add references if required', 'Submit'], expectedResult: 'Application submits with confirmation.' },
      { id: 'ed-application', title: '8.2 Event Director Application', steps: ['Navigate to Event Directors > Apply', 'Fill in application', 'Submit'], expectedResult: 'Application submits with confirmation.' },
    ],
  },
  {
    id: 'host-event',
    title: 'Section 9: Event Hosting Request',
    description: 'Test event hosting request form.',
    items: [
      { id: 'host-event-form', title: '9.1 Submit a Hosting Request', steps: ['Navigate to "Host an Event"', 'Fill in venue details', 'Submit form'], expectedResult: 'Hosting request submits. Confirmation displayed.' },
    ],
  },
  {
    id: 'admin-members',
    title: 'Section 10: Admin - Member Management',
    description: 'Test admin tools for managing members.',
    items: [
      { id: 'admin-view-members', title: '10.1 View & Search Members', steps: ['Go to Admin Dashboard > Manage Members', 'Verify members list loads', 'Search for a member by name or email', 'Click a member to view detail page', 'Verify detail shows: profile, membership, payments, events'], expectedResult: 'Members list loads. Search works. Details complete.', pageUrl: '/admin/members' },
      { id: 'admin-create-member', title: '10.2 Create a New Member', steps: ['Click "Create New Member"', 'Fill in required fields', 'Assign membership and save', 'Verify they appear in members list'], expectedResult: 'New member created with correct details.' },
      { id: 'admin-edit-member', title: '10.3 Edit a Member', steps: ['Open a member\'s detail page', 'Edit profile information', 'Save and verify changes persist'], expectedResult: 'Edits save correctly and persist.' },
      { id: 'admin-bulk-membership-actions', title: '10.4 Bulk Refund / Cancel Memberships', steps: ['On the Members page, tick the checkbox next to two test members with active memberships', 'Click "Cancel at renewal" and follow the prompt', 'Click "Cancel now" on another selection', 'Verify the affected memberships move to the correct state and audit entries appear'], expectedResult: 'Bulk cancel/refund actions complete and the rows reflect the new state.' },
      { id: 'admin-impersonate', title: '10.5 Impersonate a Member', steps: ['Open a member detail page', 'Click the Impersonate button', 'Verify a magic link opens the site as that user', 'Log out of the impersonation and confirm you return to the admin account'], expectedResult: 'Impersonation works and is reversible without losing the admin session.' },
      { id: 'admin-delete-member', title: '10.6 Delete a Test Member', steps: ['Open a test member who has no real data', 'Use the Delete option on the detail page', 'Confirm the warning and proceed', 'Verify the user is removed from the members list and the auth system'], expectedResult: 'Member is fully removed from both profiles and auth.' },
    ],
  },
  {
    id: 'admin-memberships',
    title: 'Section 11: Admin - Membership Management',
    description: 'Test admin membership tools.',
    items: [
      { id: 'admin-membership-types', title: '11.1 Membership Types Configuration', steps: ['Go to Admin > Memberships', 'Verify types listed with correct prices', 'Edit a type and save'], expectedResult: 'Types display correctly. Edits save.' },
      { id: 'admin-assign-membership', title: '11.2 Assign Membership to a Member', steps: ['Open member detail', 'Use admin tools to create/assign membership', 'Select payment method', 'Verify membership created with MECA ID'], expectedResult: 'Membership assigned with correct type and payment.' },
      { id: 'admin-cancel-membership', title: '11.3 Cancel/Refund a Membership', steps: ['Open membership details', 'Use cancel option', 'Verify status updates', 'Process refund if applicable'], expectedResult: 'Cancellation works. Refund processes.' },
      { id: 'admin-membership-cards', title: '11.4 Membership Cards Management', steps: ['Go to Admin > Membership Cards', 'Verify card tracking loads', 'Update a card status'], expectedResult: 'Card tracking works. Status updates save.', pageUrl: '/admin/membership-cards' },
      { id: 'admin-dunning', title: '11.5 Dunning / Failed Payment Recovery', steps: ['Locate a member with a failed renewal (or simulate one in a test environment)', 'Verify the member appears in the dunning queue with the current step number', 'Confirm the dunning emails for that step have been sent (check the email log)'], expectedResult: 'Dunning queue shows failed renewals and escalates through the configured steps.' },
    ],
  },
  {
    id: 'admin-events',
    title: 'Section 12: Admin - Event Management',
    description: 'Test event creation and management.',
    items: [
      { id: 'admin-create-event', title: '12.1 Create an Event', steps: ['Go to Admin > Manage Events', 'Create event with name, date, location', 'Save and verify it appears in both admin and public lists'], expectedResult: 'Event created and visible everywhere.', pageUrl: '/admin/events' },
      { id: 'admin-edit-event', title: '12.2 Edit an Event', steps: ['Open existing event', 'Edit details', 'Save and verify changes on public page'], expectedResult: 'Edits save and reflect publicly.' },
      { id: 'admin-results-entry', title: '12.3 Enter Competition Results', steps: ['Go to Admin > Enter Results', 'Select event and enter results', 'Save and check public Results page'], expectedResult: 'Results saved and display publicly.' },
      { id: 'admin-registrations', title: '12.4 Event Registrations & Check-In', steps: ['Go to Admin > Event Registrations', 'Verify registrations listed', 'Check QR Check-In hub'], expectedResult: 'Registration list loads. Check-in works.' },
      { id: 'admin-delete-event', title: '12.5 Delete a Test Event', steps: ['Create a clearly-named test event', 'Open it from the admin events list', 'Use the Delete action and confirm', 'Verify the event no longer appears on the public events page or admin list'], expectedResult: 'Test event is removed everywhere.' },
    ],
  },
  {
    id: 'admin-judges-eds',
    title: 'Section 13: Admin - Judge & ED Management',
    description: 'Test judge and event director admin tools.',
    items: [
      { id: 'admin-judge-apps', title: '13.1 Review Judge Applications', steps: ['Go to Admin > Judge Applications', 'Verify applications listed', 'Open one to review'], expectedResult: 'Applications load. Review actions work.', pageUrl: '/admin/judge-applications' },
      { id: 'admin-manage-judges', title: '13.2 Manage Judges', steps: ['Go to Admin > Manage Judges', 'Verify judges listed', 'Click a judge to view profile'], expectedResult: 'Judges list and profiles display correctly.', pageUrl: '/admin/judges' },
      { id: 'admin-judge-permission', title: '13.3 Grant or Revoke Judge Permission', steps: ['Open a member detail page', 'Use the Judge permission toggle in the Permissions section', 'Set an expiration date and save', 'Confirm the change is recorded in the audit log'], expectedResult: 'Permission flips correctly and the audit log captures who/when.' },
      { id: 'admin-ed-apps', title: '13.4 Review ED Applications', steps: ['Go to Admin > ED Applications', 'Verify applications listed', 'Open to review'], expectedResult: 'ED applications load.' },
      { id: 'admin-manage-eds', title: '13.5 Manage Event Directors', steps: ['Go to Admin > Manage Event Directors', 'Verify EDs listed', 'Click to view profile'], expectedResult: 'ED list and profiles work.' },
      { id: 'admin-hosting-requests', title: '13.6 Event Hosting Requests', steps: ['Go to Admin > Hosting Requests', 'Verify requests listed', 'Open to review'], expectedResult: 'Hosting requests load and can be reviewed.' },
    ],
  },
  {
    id: 'admin-competition',
    title: 'Section 14: Admin - Competition Setup',
    description: 'Verify competition configuration pages.',
    items: [
      { id: 'admin-classes', title: '14.1 Competition Classes', steps: ['Go to Admin > Classes Management', 'Verify classes listed with correct details'], expectedResult: 'Classes display correctly.', pageUrl: '/admin/classes' },
      { id: 'admin-formats', title: '14.2 Competition Formats', steps: ['Go to Admin > Format Management', 'Verify formats listed'], expectedResult: 'Formats display correctly.', pageUrl: '/admin/formats' },
      { id: 'admin-seasons', title: '14.3 Season Management', steps: ['Go to Admin > Season Management', 'Verify seasons listed with active season marked'], expectedResult: 'Seasons display with active season highlighted.', pageUrl: '/admin/seasons' },
      { id: 'admin-rulebooks', title: '14.4 Rulebook Management', steps: ['Go to Admin > Manage Rulebooks', 'Verify rulebooks listed and accessible'], expectedResult: 'Rulebook management works.', pageUrl: '/admin/rulebooks' },
      { id: 'admin-points', title: '14.5 Points Configuration', steps: ['Go to Admin > Points Configuration', 'Verify point values displayed'], expectedResult: 'Points config loads and can be edited.' },
    ],
  },
  {
    id: 'admin-billing-financial',
    title: 'Section 15: Admin - Billing & Financial',
    description: 'Test billing and revenue tools.',
    items: [
      { id: 'admin-billing-dashboard', title: '15.1 Billing Dashboard', steps: ['Go to Admin > Billing', 'Verify revenue summary loads', 'Check Orders, Invoices, Revenue sections'], expectedResult: 'Billing dashboard shows revenue, orders, invoices.', pageUrl: '/admin/billing' },
      { id: 'admin-orders', title: '15.2 Orders', steps: ['Navigate to Billing > Orders', 'Verify orders listed', 'Click to view details'], expectedResult: 'Orders list and details work.' },
      { id: 'admin-invoices', title: '15.3 Invoices', steps: ['Navigate to Billing > Invoices', 'Verify invoices listed', 'Click to view details'], expectedResult: 'Invoices list and details work.' },
      { id: 'admin-revenue', title: '15.4 Revenue Reports', steps: ['Navigate to Billing > Revenue', 'Verify reports/charts load'], expectedResult: 'Revenue reports display correctly.' },
      { id: 'admin-coupons', title: '15.5 Coupons & Discount Codes', steps: ['Go to Admin > Coupons', 'Create a new coupon (percent or fixed amount)', 'Set scope (memberships, shop, both) and an expiration', 'Save and verify it can be redeemed at checkout', 'Disable a coupon and verify it stops working'], expectedResult: 'Coupons can be created, scoped, expired, and disabled.' },
      { id: 'admin-quickbooks', title: '15.6 QuickBooks Sync', steps: ['Go to Admin > QuickBooks', 'Verify connection status is healthy', 'Check that recent invoices are mirrored in QuickBooks'], expectedResult: 'QuickBooks integration shows connected and recent transactions sync.' },
    ],
  },
  {
    id: 'admin-support',
    title: 'Section 16: Admin - Support & Communication',
    description: 'Test support ticket management.',
    items: [
      { id: 'admin-tickets', title: '16.1 Manage Support Tickets', steps: ['Go to Admin > Support Tickets', 'Verify all tickets listed', 'Open and reply to a ticket', 'Change ticket status'], expectedResult: 'Ticket management works fully.', pageUrl: '/admin/tickets' },
      { id: 'admin-notifications', title: '16.2 Notifications Center', steps: ['Go to Admin > Notifications', 'Verify notifications listed'], expectedResult: 'Notifications load.' },
    ],
  },
  {
    id: 'admin-content',
    title: 'Section 17: Admin - Content Management',
    description: 'Test content management features.',
    items: [
      { id: 'admin-business-listings', title: '17.1 Business Listings', steps: ['Go to Admin > Business Listings', 'Verify listings shown'], expectedResult: 'Business listings load.' },
      { id: 'admin-hall-of-fame', title: '17.2 Hall of Fame', steps: ['Go to Admin > Hall of Fame', 'Verify entries listed'], expectedResult: 'Hall of Fame management works.' },
      { id: 'admin-world-records', title: '17.3 SPL World Records', steps: ['Go to Admin > SPL World Records', 'Verify records listed'], expectedResult: 'World records management works.' },
      { id: 'admin-achievements', title: '17.4 Achievements / dB Clubs', steps: ['Go to Admin > Achievements', 'Verify badges listed'], expectedResult: 'Achievements page loads.' },
      { id: 'admin-media', title: '17.5 Media Library', steps: ['Go to Admin > Media Library', 'Verify files displayed'], expectedResult: 'Media library loads. Files viewable.' },
    ],
  },
  {
    id: 'admin-shop',
    title: 'Section 18: Admin - Shop Management',
    description: 'Test shop product and order management.',
    items: [
      { id: 'admin-shop-products', title: '18.1 Manage Products', steps: ['Go to Admin > Manage Products', 'Verify products listed with names, prices, stock'], expectedResult: 'Product management works.' },
      { id: 'admin-shop-orders', title: '18.2 Shop Orders', steps: ['Go to Admin > Shop Orders', 'Verify orders listed', 'Click to view details'], expectedResult: 'Shop orders load with details.' },
    ],
  },
  {
    id: 'admin-advertising',
    title: 'Section 19: Admin - Advertising & Banners',
    description: 'Test banner and advertising management.',
    items: [
      { id: 'admin-advertisers', title: '19.1 Advertisers', steps: ['Go to Admin > Advertisers', 'Verify contacts listed'], expectedResult: 'Advertiser list loads.' },
      { id: 'admin-banners', title: '19.2 Banner Ads', steps: ['Go to Admin > Banner Ads', 'Verify banners listed', 'Check a banner displays on the site'], expectedResult: 'Banner management works. Banners display on site.' },
      { id: 'admin-banner-analytics', title: '19.3 Banner Analytics', steps: ['Go to Admin > Banner Analytics', 'Verify engagement data displayed'], expectedResult: 'Analytics shows engagement data.' },
    ],
  },
  {
    id: 'admin-tools',
    title: 'Section 20: Admin - System Tools & Monitoring',
    description: 'Test monitoring and system tools.',
    items: [
      { id: 'admin-site-settings', title: '20.1 Site Settings', steps: ['Go to Admin > Site Settings', 'Verify settings displayed'], expectedResult: 'Settings load and can be modified.', pageUrl: '/admin/site-settings' },
      { id: 'admin-audit-log', title: '20.2 Audit Log', steps: ['Go to Admin > Audit Log', 'Verify entries listed with dates'], expectedResult: 'Audit log displays recent activity.' },
      { id: 'admin-login-audit', title: '20.3 Login Audit', steps: ['Go to Admin > Login Audit Log', 'Verify login/logout events shown'], expectedResult: 'Login audit shows auth events.' },
      { id: 'admin-analytics', title: '20.4 Site Analytics', steps: ['Go to Admin > Site Analytics', 'Verify traffic data displayed'], expectedResult: 'Analytics loads with traffic data.' },
      { id: 'admin-finals-voting', title: '20.5 Finals Voting Management', steps: ['Go to Admin > Voting Sessions', 'Verify page loads'], expectedResult: 'Finals voting management loads.', pageUrl: '/admin/finals-voting' },
      { id: 'admin-world-finals', title: '20.6 World Finals', steps: ['Go to Admin > World Finals', 'Verify page loads'], expectedResult: 'World finals page loads.' },
    ],
  },
  {
    id: 'mobile-responsive',
    title: 'Section 21: Mobile & Responsive Design',
    description: 'Test the site on a phone or by resizing your browser window.',
    items: [
      { id: 'mobile-nav', title: '21.1 Mobile Navigation', steps: ['Open the site on your phone (or make browser narrow)', 'Tap the hamburger menu', 'Verify menu opens and links work', 'Verify menu closes properly'], expectedResult: 'Mobile nav works smoothly.' },
      { id: 'mobile-pages', title: '21.2 Page Layout on Mobile', steps: ['Browse Home, Events, Members, Results, Shop on mobile', 'Verify content is readable and not cut off', 'Verify buttons are easy to tap', 'Check tables scroll if needed', 'Verify forms work on mobile'], expectedResult: 'All pages look good. Content readable. Elements interactive.' },
    ],
  },
  // ============================================================================
  // Sections below were added as the platform grew. They cover features that
  // didn't exist when the original 22-section checklist was written.
  // ============================================================================
  {
    id: 'notifications',
    title: 'Section 22: Notifications',
    description: 'Verify the in-app notification system both for what members receive and how admins broadcast.',
    items: [
      { id: 'notifications-receive', title: '22.1 Receive Notifications', steps: ['Trigger an action that should notify you (e.g. an admin sends you a test message)', 'Click the bell icon in the top navigation', 'Confirm the new notification appears with title, message, and timestamp', 'Click the notification and confirm it deep-links to the correct page'], expectedResult: 'New notifications appear in the bell menu and clicking them navigates to the right place.' },
      { id: 'notifications-mark-read', title: '22.2 Mark Read / Clear', steps: ['Open the notifications panel', 'Mark one notification as read and confirm the unread count decreases', 'Use Mark All Read', 'Refresh the page and confirm the read state persists'], expectedResult: 'Read state updates immediately and survives a refresh.' },
      { id: 'notifications-admin-send', title: '22.3 Send a Notification (Admin)', steps: ['Go to Admin > Members and open a test member', 'Use the "Send Message" action', 'Enter a subject and body, send', 'Log in as that test member (or impersonate) and confirm the notification was received'], expectedResult: 'Admin-sent message arrives in the recipient\'s notification panel.', pageUrl: '/admin/members' },
      { id: 'notifications-admin-center', title: '22.4 Admin Notifications Center', steps: ['Go to Admin > Notifications', 'Confirm recent system notifications are listed', 'Filter or search if available'], expectedResult: 'Admin notifications page lists system events accurately.' },
    ],
  },
  {
    id: 'email-system',
    title: 'Section 23: Email System',
    description: 'Make sure the system actually delivers transactional and marketing email correctly.',
    items: [
      { id: 'email-account-verify', title: '23.1 Account Email Verification', steps: ['Sign up a new test account with a real inbox you control', 'Look for the verification email within a few minutes', 'Click the link and confirm the account becomes verified'], expectedResult: 'Verification email arrives and the link activates the account.' },
      { id: 'email-password-reset', title: '23.2 Password Reset Email', steps: ['On the Login page, use Forgot Password', 'Enter the email of an existing test account', 'Confirm the reset email arrives', 'Click the link and set a new password', 'Log in with the new password'], expectedResult: 'Password reset round-trip works end-to-end.' },
      { id: 'email-purchase-receipt', title: '23.3 Purchase Receipts', steps: ['Complete a test membership or shop order', 'Within a few minutes, confirm a receipt email arrives', 'Verify the receipt shows the correct line items, amounts, and order number'], expectedResult: 'Receipt emails are sent for every purchase with accurate details.' },
      { id: 'email-event-reminder', title: '23.4 Event Reminder Email', steps: ['Register for a test event whose date is approaching', 'Wait for (or trigger) the reminder send', 'Confirm the reminder email arrives with the event date, location, and check-in info'], expectedResult: 'Event reminder is sent on schedule.' },
      { id: 'email-contact-form', title: '23.5 Contact Form Delivery', steps: ['Submit the public Contact Us form with a unique test message', 'Confirm the recipient inbox (info@mecacaraudio.com or wherever it routes) receives the message'], expectedResult: 'Contact form emails reach the configured recipient.' },
      { id: 'email-constant-contact', title: '23.6 Constant Contact Sync', steps: ['Sign up a new test member', 'Wait for the sync window (or trigger manually)', 'Verify the new member appears in the Constant Contact list'], expectedResult: 'New members are pushed to Constant Contact for newsletter emails.' },
    ],
  },
  {
    id: 'finals-voting-flow',
    title: 'Section 24: Finals Voting (Member + Admin)',
    description: 'Cover the full finals voting lifecycle, including the new admin Suspend/Cancel/Delete controls.',
    items: [
      { id: 'voting-public-card', title: '24.1 Public Voting Card on Homepage', steps: ['When a voting session is open, visit the homepage as a logged-in member', 'Confirm the voting card appears with the season name and a link to vote', 'When voting is closed but not finalized, confirm the card shows "Voting has ended"', 'When the session is suspended in admin, confirm the card disappears'], expectedResult: 'Card visibility tracks the session lifecycle and the suspended flag correctly.', pageUrl: '/' },
      { id: 'voting-cast-ballot', title: '24.2 Cast a Ballot', steps: ['When a session is open, click Vote from the homepage card', 'Step through each category and pick an answer for every question', 'Submit', 'Refresh and confirm you cannot vote twice'], expectedResult: 'Ballot submits, all answers are saved, duplicate voting is blocked.', pageUrl: '/finals-voting' },
      { id: 'voting-results', title: '24.3 View Finalized Results', steps: ['After an admin finalizes a session, visit the public results page for that session', 'Confirm the winners and vote counts display per category'], expectedResult: 'Finalized results render publicly with correct totals.' },
      { id: 'voting-admin-overview', title: '24.4 Admin Accordion View', steps: ['Go to /admin/finals-voting', 'Confirm sessions are bucketed under Creating, Pending, Live, Disabled, Canceled, Completed', 'Expand and collapse each accordion'], expectedResult: 'All six accordion buckets render and contain the right sessions.', pageUrl: '/admin/finals-voting' },
      { id: 'voting-admin-create', title: '24.5 Admin: Create + Build Session', steps: ['Click New Session', 'Pick a season, set dates, save', 'Add categories and questions (or use the 2023 template)', 'Confirm the session appears under Pending once it has categories'], expectedResult: 'Session moves from Creating to Pending after categories are added.' },
      { id: 'voting-admin-suspend', title: '24.6 Admin: Suspend a Live Session', steps: ['Find a Live session', 'Click the Pause icon (or Suspend in detail view)', 'Confirm the session moves to Disabled bucket', 'Visit the homepage and confirm the voting card is hidden', 'Click Resume — confirm the session returns to Live and the card reappears'], expectedResult: 'Suspending hides the session everywhere; resuming restores normal visibility.' },
      { id: 'voting-admin-cancel', title: '24.7 Admin: Cancel a Session', steps: ['Open a draft or non-finalized session', 'Click Cancel and confirm', 'Confirm the session moves to the Canceled bucket and is hidden from public surfaces'], expectedResult: 'Canceled sessions are hidden from members but preserved for admin reference.' },
      { id: 'voting-admin-delete', title: '24.8 Admin: Delete a Test Session', steps: ['Cancel a clearly-named test session', 'From its row or detail view, click Delete', 'Confirm both confirmation prompts', 'Verify the session no longer appears in any accordion bucket'], expectedResult: 'Test sessions can be permanently removed; any cast votes are also cleared.' },
    ],
  },
  {
    id: 'world-finals',
    title: 'Section 25: World Finals & Pre-Registration',
    description: 'Test the World Finals member-facing surfaces and admin pre-registration tools.',
    items: [
      { id: 'wf-public-page', title: '25.1 World Finals Public Page', steps: ['Navigate to the World Finals page', 'Confirm event dates, schedule, hotel info, and registration links display'], expectedResult: 'Public World Finals page loads with current information.', pageUrl: '/world-finals' },
      { id: 'wf-prereg-member', title: '25.2 Member Pre-Registration', steps: ['As an active member, navigate to World Finals Pre-Registration', 'Pick a t-shirt size, choose extra t-shirts if applicable, fill any custom labels', 'Submit and confirm a pre-registration record appears under your account'], expectedResult: 'Member can pre-register with size and add-on selections; submission is saved.', pageUrl: '/world-finals/pre-register' },
      { id: 'wf-admin-config', title: '25.3 Admin: Configure Pre-Reg', steps: ['Go to Admin > World Finals', 'Adjust available t-shirt sizes, extra t-shirt rules, custom labels, hotel info, and dates', 'Upload a hero image if applicable', 'Save and confirm the public page reflects the changes'], expectedResult: 'Admin edits propagate to the public pre-reg page.' },
      { id: 'wf-admin-list', title: '25.4 Admin: View Pre-Reg List', steps: ['Open the pre-registration list view in admin', 'Confirm registrations show member, size selections, and submission timestamp', 'Try exporting or sorting if available'], expectedResult: 'Pre-reg list is accurate and exportable.' },
    ],
  },
  {
    id: 'achievements',
    title: 'Section 26: Achievements / dB Clubs',
    description: 'Verify the achievements/badges system on both the member and admin side.',
    items: [
      { id: 'achievements-member', title: '26.1 View My Achievements', steps: ['As a member with at least one earned achievement, open your profile or dashboard', 'Confirm earned achievements display with name, description, and earned date'], expectedResult: 'Earned achievements are visible to the owning member.' },
      { id: 'achievements-public', title: '26.2 Public Achievement Display', steps: ['Navigate to a public profile that has earned achievements', 'Confirm badges display'], expectedResult: 'Public profiles show achievement badges.' },
      { id: 'achievements-admin', title: '26.3 Admin: Manage Achievements', steps: ['Go to Admin > Achievements', 'Verify the catalog of badges with their criteria', 'Edit or add a test badge and save'], expectedResult: 'Badge catalog can be edited.' },
    ],
  },
  {
    id: 'class-management',
    title: 'Section 27: Class Management (Admin)',
    description: 'Full CRUD for competition classes.',
    items: [
      { id: 'class-list', title: '27.1 List Classes', steps: ['Go to Admin > Classes Management', 'Confirm classes are grouped by format and season', 'Use any filter / search controls'], expectedResult: 'Class list loads completely and is filterable.', pageUrl: '/admin/classes' },
      { id: 'class-create', title: '27.2 Create a Class', steps: ['Click New Class', 'Fill in name, abbreviation, format, season, wattage rules, display order', 'Save', 'Verify it appears in the list'], expectedResult: 'New class is saved and visible.' },
      { id: 'class-edit', title: '27.3 Edit a Class', steps: ['Open an existing class', 'Change a field (e.g., display order)', 'Save and confirm the change persists'], expectedResult: 'Edits persist correctly.' },
      { id: 'class-deactivate', title: '27.4 Deactivate / Delete a Class', steps: ['Pick a test class', 'Mark it inactive (or delete if no results reference it)', 'Confirm the class is removed from registration choices'], expectedResult: 'Inactive/deleted classes no longer appear in registration flows.' },
    ],
  },
  {
    id: 'format-management',
    title: 'Section 28: Format Management (Admin)',
    description: 'CRUD for competition formats (SPL, SQL, Show & Shine, Dueling Demos, etc.).',
    items: [
      { id: 'format-list', title: '28.1 List Formats', steps: ['Go to Admin > Format Management', 'Confirm formats listed with status'], expectedResult: 'All formats load.', pageUrl: '/admin/formats' },
      { id: 'format-edit', title: '28.2 Edit a Format', steps: ['Open a format', 'Change a setting (display name, scoring style, etc.)', 'Save and verify on the public side'], expectedResult: 'Format edits propagate to the public site.' },
    ],
  },
  {
    id: 'rulebook-management',
    title: 'Section 29: Rulebook Management (Admin)',
    description: 'Upload, version, and retire rulebooks.',
    items: [
      { id: 'rulebook-upload', title: '29.1 Upload a New Rulebook', steps: ['Go to Admin > Manage Rulebooks', 'Upload a PDF rulebook for a specific format/season', 'Save and verify it appears on the public Rulebooks page'], expectedResult: 'New rulebook is uploaded and downloadable publicly.', pageUrl: '/admin/rulebooks' },
      { id: 'rulebook-replace', title: '29.2 Replace / Update an Existing Rulebook', steps: ['Open an existing rulebook entry', 'Upload a replacement PDF or update metadata', 'Save and confirm the public page serves the new version'], expectedResult: 'Updates surface immediately on the public page.' },
      { id: 'rulebook-archive', title: '29.3 Archive an Old Rulebook', steps: ['Move a prior-season rulebook to the archive', 'Verify the public Rulebook Archive page shows it'], expectedResult: 'Archive correctly preserves historical rulebooks.' },
    ],
  },
  {
    id: 'business-listings',
    title: 'Section 30: Retailer & Manufacturer Listings (Admin + Public)',
    description: 'CRUD for the retailer/manufacturer business directory.',
    items: [
      { id: 'business-public-directory', title: '30.1 Public Retailer & Manufacturer Directory', steps: ['Visit the Retailers directory and Manufacturers directory pages', 'Search and filter listings', 'Click into a listing to confirm contact info, location, and logo display'], expectedResult: 'Public directory pages are searchable and detail pages render fully.' },
      { id: 'business-admin-list', title: '30.2 Admin: Listings Catalog', steps: ['Go to Admin > Business Listings', 'Confirm both retailer and manufacturer listings are visible', 'Filter by approval status (active vs pending)'], expectedResult: 'Admin sees the full catalog and can filter by status.' },
      { id: 'business-admin-approve', title: '30.3 Admin: Approve a Listing', steps: ['Find a pending listing', 'Open it and approve', 'Verify it appears in the public directory'], expectedResult: 'Approval flips the listing live within a refresh.' },
      { id: 'business-admin-edit-delete', title: '30.4 Admin: Edit / Delete a Listing', steps: ['Open an existing listing', 'Edit name, address, image, and save', 'Delete a clearly-named test listing', 'Confirm the change reflects on the public directory'], expectedResult: 'Edits and deletes propagate publicly.' },
    ],
  },
  {
    id: 'analytics',
    title: 'Section 31: Analytics & Reporting (Admin)',
    description: 'Verify analytics dashboards and engagement reporting.',
    items: [
      { id: 'analytics-traffic', title: '31.1 Site Traffic', steps: ['Go to Admin > Site Analytics', 'Confirm visitor / pageview / unique-user counts render', 'Switch between time-range filters'], expectedResult: 'Analytics dashboard responds to date filters with reasonable data.' },
      { id: 'analytics-banner', title: '31.2 Banner / Ad Engagement', steps: ['Go to Admin > Banner Analytics', 'Confirm impressions and clicks per banner are listed'], expectedResult: 'Banner analytics show engagement counts per ad.' },
      { id: 'analytics-search-console', title: '31.3 Search Console (SEO)', steps: ['Go to Admin > Search Console (or SEO Dashboard)', 'Confirm impressions, clicks, and top queries display'], expectedResult: 'SEO dashboard shows Google Search Console data.' },
    ],
  },
  {
    id: 'support-desk-admin',
    title: 'Section 32: Support Desk (Member + Admin)',
    description: 'Test the full support ticket lifecycle from creation through resolution.',
    items: [
      { id: 'support-member-create', title: '32.1 Member: Create Ticket', steps: ['As a member, go to Support / Tickets', 'Create a new ticket with category, subject, description', 'Attach a screenshot if supported', 'Submit and confirm the ticket appears in your list with status Open'], expectedResult: 'Members can file tickets with attachments.', pageUrl: '/tickets' },
      { id: 'support-member-comment', title: '32.2 Member: Comment on Ticket', steps: ['Open one of your tickets', 'Add a comment / reply', 'Confirm the comment appears immediately'], expectedResult: 'Members can converse on their tickets.' },
      { id: 'support-admin-view', title: '32.3 Admin: View All Tickets', steps: ['Go to Admin > Support Tickets', 'Confirm all tickets across users are listed with status, owner, and last update', 'Filter by status'], expectedResult: 'Admin sees the full ticket queue.', pageUrl: '/admin/tickets' },
      { id: 'support-admin-reply', title: '32.4 Admin: Reply and Change Status', steps: ['Open a ticket', 'Reply to the member', 'Change status (in progress, resolved, closed)', 'Verify the member sees the reply and status change'], expectedResult: 'Admin replies and status changes are visible to the member.' },
      { id: 'support-guest', title: '32.5 Guest Support Verification', steps: ['Submit a guest ticket without logging in', 'Receive the verification email', 'Use the access link and confirm you can view and reply to the ticket'], expectedResult: 'Guest support flow works end-to-end via email-based access tokens.', pageUrl: '/support/guest' },
    ],
  },
  {
    id: 'banner-advertising',
    title: 'Section 33: Banner Advertising (Admin)',
    description: 'CRUD for site banners and the advertiser contact list.',
    items: [
      { id: 'ads-create-banner', title: '33.1 Create a Banner', steps: ['Go to Admin > Banner Ads', 'Click New Banner', 'Upload an image, set link URL, placement, start/end dates', 'Save and verify it appears on the configured placement'], expectedResult: 'New banners render in the chosen placement.' },
      { id: 'ads-edit-banner', title: '33.2 Edit a Banner', steps: ['Open an existing banner', 'Change the image or destination link', 'Save and verify the live banner reflects the change'], expectedResult: 'Banner edits go live immediately.' },
      { id: 'ads-suspend-delete', title: '33.3 Suspend / Delete a Banner', steps: ['Mark a banner inactive or delete it', 'Verify it no longer renders on the site'], expectedResult: 'Inactive/deleted banners disappear from public surfaces.' },
      { id: 'ads-advertisers', title: '33.4 Advertiser Contacts', steps: ['Go to Admin > Advertisers', 'Add a test advertiser contact with email, phone, notes', 'Edit the entry and confirm changes save'], expectedResult: 'Advertiser CRM stores and edits contacts.' },
    ],
  },
  {
    id: 'scoresheets',
    title: 'Section 34: Scoresheets',
    description: 'Verify scoresheet generation, download, and entry.',
    items: [
      { id: 'scoresheet-download', title: '34.1 Download a Scoresheet', steps: ['Go to an event\'s admin page (or scoresheets section)', 'Generate / download a scoresheet for a class', 'Open the file and confirm class, judges, and competitor slots are correct'], expectedResult: 'Scoresheet PDF is generated with correct structure.' },
      { id: 'scoresheet-entry', title: '34.2 Enter Scores from a Sheet', steps: ['Use the admin scoring entry surface', 'Enter scores for several competitors', 'Save and confirm scores appear in the event results'], expectedResult: 'Score entry persists and feeds into results.' },
    ],
  },
  {
    id: 'qr-checkin',
    title: 'Section 35: QR Check-In',
    description: 'Verify QR-based event check-in for both staff and competitors.',
    items: [
      { id: 'qr-member-card', title: '35.1 Member Card QR Code', steps: ['Open My Membership Card on a phone', 'Scan the QR code with another phone', 'Confirm it opens the public profile / verification page'], expectedResult: 'Member-card QR resolves to the right verification page.', pageUrl: '/membership-card' },
      { id: 'qr-checkin-page', title: '35.2 Event Check-In Hub', steps: ['Navigate to the Event Check-In page for an event', 'Use the QR scanner (or manual MECA ID entry) to check someone in', 'Verify their status flips to Checked-In', 'Try checking the same person in again — confirm it does not duplicate'], expectedResult: 'Check-in works via QR or manual entry, idempotent on repeated scans.' },
    ],
  },
  {
    id: 'records-management',
    title: 'Section 36: Records Management',
    description: 'Verify SPL World Records and championship archives.',
    items: [
      { id: 'records-public', title: '36.1 Public SPL World Records Page', steps: ['Navigate to the SPL World Records page', 'Confirm records are listed by class with score, holder, date', 'Click a record to view detail if available'], expectedResult: 'Public records page is accurate and complete.' },
      { id: 'records-admin-add', title: '36.2 Admin: Add / Edit a Record', steps: ['Go to Admin > SPL World Records', 'Add a new record with class, score, member, event, date', 'Save and confirm it appears publicly'], expectedResult: 'New records propagate to the public records page.' },
      { id: 'records-archive', title: '36.3 Championship Archives', steps: ['Visit the Championship Archives page', 'Pick a prior year and confirm winners and category breakdowns display'], expectedResult: 'Archive page renders historical championship data accurately.' },
    ],
  },
  {
    id: 'login-control',
    title: 'Section 37: Login Access Control (Admin)',
    description: 'Verify the per-member login control buttons added during the launch sweep.',
    items: [
      { id: 'login-allow-maintenance', title: '37.1 Allow Maintenance Login', steps: ['On Admin > Members, tick a test member', 'Click "Allow Maintenance Login"', 'Verify the row badge updates to "Maint."', 'Turn maintenance mode ON and confirm that user can still sign in', 'Click "Revoke Maintenance Login" and confirm the badge disappears'], expectedResult: 'Maintenance bypass flag works in both directions.', pageUrl: '/admin/members' },
      { id: 'login-ban', title: '37.2 Ban a Member Login', steps: ['On Admin > Members, tick a test member (NOT yourself or a super admin)', 'Click "Ban Login"', 'Enter a reason (≥5 chars) and confirm', 'Verify the "Banned" badge appears on the row', 'Have that user try to sign in — confirm they are blocked, and any active sessions get kicked within ~1 minute'], expectedResult: 'Ban kicks active sessions and blocks future sign-ins; badge is visible.' },
      { id: 'login-unban', title: '37.3 Unban a Member', steps: ['Tick the previously-banned member', 'Click "Unban Login" (only visible when at least one selection is banned)', 'Confirm the badge disappears', 'Confirm the user can sign in again'], expectedResult: 'Unban restores normal sign-in.' },
      { id: 'login-audit', title: '37.4 Audit Trail', steps: ['Go to Admin > Audit Log', 'Filter or search for login_ban / login_unban / login_allow_maintenance / login_revoke_maintenance', 'Confirm each ban / maintenance toggle from above is recorded with admin, target, and reason'], expectedResult: 'All login control actions are captured in the admin audit log.' },
    ],
  },
  {
    id: 'maintenance-mode',
    title: 'Section 38: Maintenance Mode',
    description: 'Verify the site-wide maintenance toggle and its banner.',
    items: [
      { id: 'maint-toggle-on', title: '38.1 Turn On Maintenance Mode', steps: ['Go to Admin > Site Settings', 'Toggle Maintenance Mode ON', 'Refresh the site and confirm the orange "MAINTENANCE MODE ACTIVE" banner appears at the top of every page'], expectedResult: 'Banner is visible site-wide while maintenance is on.', pageUrl: '/admin/site-settings' },
      { id: 'maint-non-admin-blocked', title: '38.2 Non-Admin Users Are Blocked', steps: ['While maintenance is on, sign in as a non-admin member without the maintenance bypass', 'Try to access the dashboard or shop', 'Confirm the system shows the maintenance message and prevents access'], expectedResult: 'Non-admin users cannot access the app while maintenance is on.' },
      { id: 'maint-admin-allowed', title: '38.3 Admins Can Still Access', steps: ['Sign in as an admin while maintenance is on', 'Navigate the dashboard and confirm everything is reachable'], expectedResult: 'Admins remain unaffected by maintenance mode.' },
      { id: 'maint-toggle-off', title: '38.4 Turn Off Maintenance Mode', steps: ['Toggle Maintenance Mode OFF in Site Settings', 'Refresh and confirm the banner disappears', 'Confirm a non-admin member can now access the site again'], expectedResult: 'Toggling off removes the banner and restores normal access.' },
    ],
  },
  {
    id: 'qa-tooling',
    title: 'Section 39: QA Tooling Itself',
    description: 'Verify the QA Checklist admin tools — useful before relying on this checklist for the next release.',
    items: [
      { id: 'qa-create-round', title: '39.1 Create a New Round', steps: ['Go to Admin > QA Testing Rounds', 'Click New QA Round', 'Provide a title and description, save', 'Confirm the new round shows the seeded checklist items'], expectedResult: 'New rounds are created with the latest master checklist.', pageUrl: '/admin/qa-checklist' },
      { id: 'qa-edit-round', title: '39.2 Edit Round Metadata', steps: ['Open any round', 'Click Edit', 'Change title or description, save', 'Confirm the change shows on the round detail and round list'], expectedResult: 'Round metadata is editable.' },
      { id: 'qa-suspend-resume', title: '39.3 Suspend and Resume a Round', steps: ['Open an active round', 'Click Suspend and confirm', 'Confirm a Paused badge appears and the warning banner shows', 'As an assigned reviewer, try submitting a response — confirm it is rejected with a clear message', 'Click Resume and confirm submissions work again'], expectedResult: 'Suspending blocks responses and developer fixes; resuming restores them.' },
      { id: 'qa-delete-round', title: '39.4 Delete a Test Round', steps: ['Create a clearly-named test round', 'Open it and click Delete', 'Confirm both prompts (the second only appears if responses exist)', 'Verify the round disappears from the QA Rounds list'], expectedResult: 'Test rounds can be permanently deleted along with all responses and fixes.' },
    ],
  },
  {
    id: 'final-signoff',
    title: 'Section 40: Final Sign-Off',
    description: 'Overall assessment and sign-off.',
    items: [
      { id: 'overall-look', title: '40.1 Overall Look & Feel', steps: ['Browse the entire site one more time', 'Note any visual issues', 'Note confusing features', 'Write down suggestions'], expectedResult: 'Site looks professional. No major visual issues.' },
      { id: 'overall-function', title: '40.2 Overall Functionality', steps: ['Confirm all sections above have been tested', 'Note any bugs found', 'Confirm satisfaction with core features', 'Mark as APPROVED or list remaining items'], expectedResult: 'All features function as expected. Site ready for launch OR issues documented.' },
    ],
  },
];
