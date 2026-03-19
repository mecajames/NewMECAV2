/**
 * Master checklist data used to seed QA rounds.
 * This is the single source of truth for all checklist sections and items.
 */
export interface ChecklistItemData {
  id: string;
  title: string;
  steps: string[];
  expectedResult: string;
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
      { id: 'home-page', title: '1.1 Home Page', steps: ['Open the website in your browser', 'Verify the home page loads with the MECA logo, navigation bar, and hero section', 'Check that upcoming events are displayed', 'Check that sponsor/banner ads appear correctly', 'Click through any links or buttons on the page'], expectedResult: 'Home page loads fully with all sections visible. No broken images or errors.' },
      { id: 'navigation', title: '1.2 Main Navigation', steps: ['Click each item in the top navigation bar', 'Verify each menu item takes you to the correct page', 'On mobile: tap the hamburger menu icon and verify the menu opens', 'Check that the MECA logo links back to the home page'], expectedResult: 'All navigation links work. Mobile menu opens and closes properly.' },
      { id: 'events-page', title: '1.3 Events Page', steps: ['Navigate to the Events page', 'Verify events are listed with dates, locations, and details', 'Click on an event to view its detail page', 'Verify event details show: name, date, location, description, and registration info'], expectedResult: 'Events list displays correctly. Event detail pages show complete information.' },
      { id: 'results-leaderboard', title: '1.4 Results & Leaderboard', steps: ['Navigate to the Results page', 'Verify competition results are displayed', 'Navigate to the Leaderboard page - verify rankings with points', 'Navigate to the Standings page', 'Check Team Standings and Team Leaderboard pages'], expectedResult: 'Results, leaderboard, and standings pages display data correctly.' },
      { id: 'directories', title: '1.5 Directories', steps: ['Navigate to the Members directory and verify member profiles show', 'Navigate to the Teams directory and check team listings', 'Navigate to the Retailers directory and verify retailer listings', 'Navigate to the Manufacturers directory and verify listings', 'Navigate to the Judges directory and verify judge profiles', 'Navigate to the Event Directors directory and verify ED profiles', 'Click on a profile in each directory to verify the detail page loads'], expectedResult: 'All directories load with searchable listings. Detail pages display correct info.' },
      { id: 'rulebooks', title: '1.6 Rulebooks', steps: ['Navigate to the Rulebooks page', 'Verify rulebooks are listed', 'Click on a rulebook to view or download it', 'Check the Rulebook Archive page'], expectedResult: 'Rulebooks are listed and accessible. PDFs open/download correctly.' },
      { id: 'contact', title: '1.7 Contact Page', steps: ['Navigate to the Contact page', 'Fill in the contact form with test information', 'Submit the form'], expectedResult: 'Contact form submits successfully with a confirmation message.' },
      { id: 'info-pages', title: '1.8 Information Pages', steps: ['Navigate to the Privacy Policy page and verify content displays', 'Navigate to the Terms & Conditions page and verify content displays', 'Navigate to the Member Support / Knowledge Base page', 'Navigate to the Competition Guides and Quick Start Guide'], expectedResult: 'All informational pages load with readable content.' },
      { id: 'shop', title: '1.9 MECA Shop', steps: ['Navigate to the Shop page', 'Verify products are displayed with images and prices', 'Click on a product to view its detail page', 'Add a product to the cart', 'Go to the Cart page and verify the item appears with correct total'], expectedResult: 'Shop displays products. Cart adds items and calculates totals correctly.' },
      { id: 'special-pages', title: '1.10 Special Pages', steps: ['Navigate to the Hall of Fame page', 'Navigate to the SPL World Records page', 'Navigate to the Championship Archives page and click into a specific year', 'Navigate to the Class Calculator page and try using it'], expectedResult: 'All special pages load with content. Class calculator functions.' },
      { id: 'guest-support', title: '1.11 Guest Support Ticket', steps: ['Navigate to Support > Guest Support (without logging in)', 'Fill in a test support ticket', 'Submit the ticket and check the email verification flow'], expectedResult: 'Guest can submit a support ticket and receives email verification.' },
    ],
  },
  {
    id: 'auth-account',
    title: 'Section 2: Account & Authentication',
    description: 'Test login, registration, and account management.',
    items: [
      { id: 'login', title: '2.1 Login', steps: ['Navigate to the Login page', 'Enter valid credentials and log in', 'Verify you are redirected to the Dashboard', 'Verify the navigation bar updates to show your logged-in state'], expectedResult: 'Login succeeds. Dashboard loads. Nav shows logged-in user.' },
      { id: 'profile', title: '2.2 Profile Management', steps: ['Navigate to your Profile page', 'Verify your information is displayed correctly', 'Edit a field (e.g., phone number or address)', 'Save changes and verify they persist after refresh', 'Check Public Profile settings'], expectedResult: 'Profile displays correctly. Changes save and persist.' },
      { id: 'change-password', title: '2.3 Change Password', steps: ['Navigate to Change Password', 'Enter current and new password', 'Save and log out', 'Log back in with new password'], expectedResult: 'Password changes. New password works for login.' },
      { id: 'dashboard', title: '2.4 User Dashboard', steps: ['Navigate to the Dashboard', 'Verify it shows your membership status', 'Check MyMECA dashboard section', 'Verify links to registrations, billing, and membership work'], expectedResult: 'Dashboard shows correct info and all links work.' },
    ],
  },
  {
    id: 'membership',
    title: 'Section 3: Membership System',
    description: 'Test membership purchasing, renewal, and management.',
    items: [
      { id: 'membership-page', title: '3.1 Membership Overview Page', steps: ['Navigate to the Membership page', 'Verify all membership types with names and prices', 'Click on a type to see details'], expectedResult: 'Membership types display correctly with accurate pricing.' },
      { id: 'membership-purchase', title: '3.2 Membership Purchase', steps: ['Select a membership type and proceed to checkout', 'Verify the checkout page shows the correct price', 'Complete a test payment', 'Verify membership is activated and MECA ID assigned'], expectedResult: 'Purchase completes. MECA ID assigned. Status shows active.' },
      { id: 'membership-dashboard', title: '3.3 Membership Dashboard', steps: ['Navigate to Dashboard > Membership', 'Verify membership status, MECA ID, and expiration', 'Check membership card/QR code', 'Verify auto-renewal status'], expectedResult: 'Membership dashboard shows accurate details.' },
      { id: 'team-membership', title: '3.4 Team Membership Features', steps: ['If you have a team membership, verify team members are listed', 'Check vehicle info can be updated', 'Verify team name can be updated'], expectedResult: 'Team features work for managing members.' },
    ],
  },
  {
    id: 'event-registration',
    title: 'Section 4: Event Registration',
    description: 'Test event registration and check-in.',
    items: [
      { id: 'register-event', title: '4.1 Register for an Event', steps: ['Find an upcoming event open for registration', 'Click "Register" and select competition class(es)', 'Complete registration checkout', 'Verify confirmation'], expectedResult: 'Registration completes with confirmation.' },
      { id: 'my-registrations', title: '4.2 My Registrations', steps: ['Navigate to My Registrations', 'Verify registrations are listed', 'Check event details are correct'], expectedResult: 'Registration history shows all events with correct details.' },
      { id: 'event-checkin', title: '4.3 Event Check-In', steps: ['Navigate to event check-in page', 'Verify QR scanner or manual check-in works', 'Confirm checked-in status updates'], expectedResult: 'Check-in works. Status updates.' },
    ],
  },
  {
    id: 'support-tickets',
    title: 'Section 5: Support Tickets',
    description: 'Test the support ticket system.',
    items: [
      { id: 'create-ticket', title: '5.1 Create a Support Ticket', steps: ['Navigate to Support Tickets', 'Create a new ticket with subject, category, description', 'Submit'], expectedResult: 'Ticket created. Appears in list.' },
      { id: 'view-ticket', title: '5.2 View and Comment on a Ticket', steps: ['Open existing ticket', 'Add a comment', 'Verify comment appears'], expectedResult: 'Ticket details load. Comments display.' },
    ],
  },
  {
    id: 'billing',
    title: 'Section 6: Billing & Payments',
    description: 'Verify billing information and payment history.',
    items: [
      { id: 'billing-page', title: '6.1 Billing Page', steps: ['Navigate to your Billing page', 'Verify payment history is displayed', 'Check invoices show correct amounts and dates', 'Check Stripe billing portal access if available'], expectedResult: 'Billing page shows accurate payment history and invoices.' },
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
      { id: 'admin-view-members', title: '10.1 View & Search Members', steps: ['Go to Admin Dashboard > Manage Members', 'Verify members list loads', 'Search for a member by name or email', 'Click a member to view detail page', 'Verify detail shows: profile, membership, payments, events'], expectedResult: 'Members list loads. Search works. Details complete.' },
      { id: 'admin-create-member', title: '10.2 Create a New Member', steps: ['Click "Create New Member"', 'Fill in required fields', 'Assign membership and save', 'Verify they appear in members list'], expectedResult: 'New member created with correct details.' },
      { id: 'admin-edit-member', title: '10.3 Edit a Member', steps: ['Open a member\'s detail page', 'Edit profile information', 'Save and verify changes persist'], expectedResult: 'Edits save correctly and persist.' },
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
      { id: 'admin-membership-cards', title: '11.4 Membership Cards Management', steps: ['Go to Admin > Membership Cards', 'Verify card tracking loads', 'Update a card status'], expectedResult: 'Card tracking works. Status updates save.' },
    ],
  },
  {
    id: 'admin-events',
    title: 'Section 12: Admin - Event Management',
    description: 'Test event creation and management.',
    items: [
      { id: 'admin-create-event', title: '12.1 Create an Event', steps: ['Go to Admin > Manage Events', 'Create event with name, date, location', 'Save and verify it appears in both admin and public lists'], expectedResult: 'Event created and visible everywhere.' },
      { id: 'admin-edit-event', title: '12.2 Edit an Event', steps: ['Open existing event', 'Edit details', 'Save and verify changes on public page'], expectedResult: 'Edits save and reflect publicly.' },
      { id: 'admin-results-entry', title: '12.3 Enter Competition Results', steps: ['Go to Admin > Enter Results', 'Select event and enter results', 'Save and check public Results page'], expectedResult: 'Results saved and display publicly.' },
      { id: 'admin-registrations', title: '12.4 Event Registrations & Check-In', steps: ['Go to Admin > Event Registrations', 'Verify registrations listed', 'Check QR Check-In hub'], expectedResult: 'Registration list loads. Check-in works.' },
    ],
  },
  {
    id: 'admin-judges-eds',
    title: 'Section 13: Admin - Judge & ED Management',
    description: 'Test judge and event director admin tools.',
    items: [
      { id: 'admin-judge-apps', title: '13.1 Review Judge Applications', steps: ['Go to Admin > Judge Applications', 'Verify applications listed', 'Open one to review'], expectedResult: 'Applications load. Review actions work.' },
      { id: 'admin-manage-judges', title: '13.2 Manage Judges', steps: ['Go to Admin > Manage Judges', 'Verify judges listed', 'Click a judge to view profile'], expectedResult: 'Judges list and profiles display correctly.' },
      { id: 'admin-ed-apps', title: '13.3 Review ED Applications', steps: ['Go to Admin > ED Applications', 'Verify applications listed', 'Open to review'], expectedResult: 'ED applications load.' },
      { id: 'admin-manage-eds', title: '13.4 Manage Event Directors', steps: ['Go to Admin > Manage Event Directors', 'Verify EDs listed', 'Click to view profile'], expectedResult: 'ED list and profiles work.' },
      { id: 'admin-hosting-requests', title: '13.5 Event Hosting Requests', steps: ['Go to Admin > Hosting Requests', 'Verify requests listed', 'Open to review'], expectedResult: 'Hosting requests load and can be reviewed.' },
    ],
  },
  {
    id: 'admin-competition',
    title: 'Section 14: Admin - Competition Setup',
    description: 'Verify competition configuration pages.',
    items: [
      { id: 'admin-classes', title: '14.1 Competition Classes', steps: ['Go to Admin > Classes Management', 'Verify classes listed with correct details'], expectedResult: 'Classes display correctly.' },
      { id: 'admin-formats', title: '14.2 Competition Formats', steps: ['Go to Admin > Format Management', 'Verify formats listed'], expectedResult: 'Formats display correctly.' },
      { id: 'admin-seasons', title: '14.3 Season Management', steps: ['Go to Admin > Season Management', 'Verify seasons listed with active season marked'], expectedResult: 'Seasons display with active season highlighted.' },
      { id: 'admin-rulebooks', title: '14.4 Rulebook Management', steps: ['Go to Admin > Manage Rulebooks', 'Verify rulebooks listed and accessible'], expectedResult: 'Rulebook management works.' },
      { id: 'admin-points', title: '14.5 Points Configuration', steps: ['Go to Admin > Points Configuration', 'Verify point values displayed'], expectedResult: 'Points config loads and can be edited.' },
    ],
  },
  {
    id: 'admin-billing-financial',
    title: 'Section 15: Admin - Billing & Financial',
    description: 'Test billing and revenue tools.',
    items: [
      { id: 'admin-billing-dashboard', title: '15.1 Billing Dashboard', steps: ['Go to Admin > Billing', 'Verify revenue summary loads', 'Check Orders, Invoices, Revenue sections'], expectedResult: 'Billing dashboard shows revenue, orders, invoices.' },
      { id: 'admin-orders', title: '15.2 Orders', steps: ['Navigate to Billing > Orders', 'Verify orders listed', 'Click to view details'], expectedResult: 'Orders list and details work.' },
      { id: 'admin-invoices', title: '15.3 Invoices', steps: ['Navigate to Billing > Invoices', 'Verify invoices listed', 'Click to view details'], expectedResult: 'Invoices list and details work.' },
      { id: 'admin-revenue', title: '15.4 Revenue Reports', steps: ['Navigate to Billing > Revenue', 'Verify reports/charts load'], expectedResult: 'Revenue reports display correctly.' },
    ],
  },
  {
    id: 'admin-support',
    title: 'Section 16: Admin - Support & Communication',
    description: 'Test support ticket management.',
    items: [
      { id: 'admin-tickets', title: '16.1 Manage Support Tickets', steps: ['Go to Admin > Support Tickets', 'Verify all tickets listed', 'Open and reply to a ticket', 'Change ticket status'], expectedResult: 'Ticket management works fully.' },
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
      { id: 'admin-site-settings', title: '20.1 Site Settings', steps: ['Go to Admin > Site Settings', 'Verify settings displayed'], expectedResult: 'Settings load and can be modified.' },
      { id: 'admin-audit-log', title: '20.2 Audit Log', steps: ['Go to Admin > Audit Log', 'Verify entries listed with dates'], expectedResult: 'Audit log displays recent activity.' },
      { id: 'admin-login-audit', title: '20.3 Login Audit', steps: ['Go to Admin > Login Audit Log', 'Verify login/logout events shown'], expectedResult: 'Login audit shows auth events.' },
      { id: 'admin-analytics', title: '20.4 Site Analytics', steps: ['Go to Admin > Site Analytics', 'Verify traffic data displayed'], expectedResult: 'Analytics loads with traffic data.' },
      { id: 'admin-finals-voting', title: '20.5 Finals Voting Management', steps: ['Go to Admin > Voting Sessions', 'Verify page loads'], expectedResult: 'Finals voting management loads.' },
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
  {
    id: 'final-signoff',
    title: 'Section 22: Final Sign-Off',
    description: 'Overall assessment and sign-off.',
    items: [
      { id: 'overall-look', title: '22.1 Overall Look & Feel', steps: ['Browse the entire site one more time', 'Note any visual issues', 'Note confusing features', 'Write down suggestions'], expectedResult: 'Site looks professional. No major visual issues.' },
      { id: 'overall-function', title: '22.2 Overall Functionality', steps: ['Confirm all sections above have been tested', 'Note any bugs found', 'Confirm satisfaction with core features', 'Mark as APPROVED or list remaining items'], expectedResult: 'All features function as expected. Site ready for launch OR issues documented.' },
    ],
  },
];
