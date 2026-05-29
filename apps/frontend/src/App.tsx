import { Suspense } from 'react';
import { lazyWithReload as lazy } from '@/shared/lazyWithReload';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, ForcePasswordChangeGuard, ExpiredMembershipGuard, IdleTimeoutGuard, MaintenanceModeGuard, BillingRestrictedGuard } from '@/auth';
import { ReCaptchaProvider } from '@/shared/recaptcha';
import { SiteSettingsProvider, SeasonsProvider } from '@/shared/contexts';
import { Navbar, Footer, ScrollToTop, ImpersonationBanner, StagingNoIndex } from '@/shared/components';
import { usePageTracking } from '@/shared/hooks/usePageTracking';
import { useMemberPageTracking } from '@/shared/hooks/useMemberPageTracking';
// Static pages — kept static for first-paint critical routes only.
// Everything else is lazy-loaded below to shrink the main bundle.
import HomePage from '@/pages/HomePage';
import { LoginPage } from '@/auth';
import { EventsPage } from '@/events';
import { ResultsPage } from '@/competition-results';
import { MembershipPage } from '@/memberships';
// Shop (cart context must be static)
import { CartProvider } from '@/shop/context/CartContext';
import { PayPalProvider } from '@/shared/components/PayPalProvider';
import { ShopPage } from '@/shop/pages/ShopPage';

// Lazy-loaded pages - Static/legal pages (rarely visited, never on first paint)
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const MemberSupportPage = lazy(() => import('@/pages/MemberSupportPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsAndConditionsPage = lazy(() => import('@/pages/TermsAndConditionsPage'));
const CompetitionGuidesPage = lazy(() => import('@/pages/CompetitionGuidesPage'));
const MECAQuickStartGuidePage = lazy(() => import('@/pages/MECAQuickStartGuidePage'));

// Lazy-loaded pages - Auth flows (rare)
const ChangePasswordPage = lazy(() => import('@/auth/pages/ChangePasswordPage'));
const AuthCallbackPage = lazy(() => import('@/auth/pages/AuthCallbackPage'));

// Lazy-loaded pages - Event detail (heavy: maps, registration UI)
const EventDetailPage = lazy(() => import('@/events/pages/EventDetailPage'));

// Lazy-loaded pages - Secondary results/standings views
const LeaderboardPage = lazy(() => import('@/competition-results/pages/LeaderboardPage'));
const StandingsPage = lazy(() => import('@/competition-results/pages/StandingsPage'));
const MemberResultsPage = lazy(() => import('@/competition-results/pages/MemberResultsPage'));
const TeamStandingsPage = lazy(() => import('@/competition-results/pages/TeamStandingsPage'));
const TeamLeaderboardPage = lazy(() => import('@/competition-results/pages/TeamLeaderboardPage'));

// Lazy-loaded pages - Rulebooks
const RulebooksPage = lazy(() => import('@/rulebooks/pages/RulebooksPage'));
const RulebookDetailPage = lazy(() => import('@/rulebooks/pages/RulebookDetailPage'));
const RulebookArchivePage = lazy(() => import('@/rulebooks/pages/RulebookArchivePage'));

// Lazy-loaded pages - Profiles (auth-gated or detail views)
const ProfilePage = lazy(() => import('@/profiles/pages/ProfilePage'));
const PublicProfilePage = lazy(() => import('@/profiles/pages/PublicProfilePage'));
const MemberProfilePage = lazy(() => import('@/profiles/pages/MemberProfilePage'));
const MemberDirectoryPage = lazy(() => import('@/profiles/pages/MemberDirectoryPage'));
const MemberGalleryPage = lazy(() => import('@/profiles/pages/MemberGalleryPage'));

// Lazy-loaded pages - Team directory
const TeamDirectoryPage = lazy(() => import('@/teams/pages/TeamDirectoryPage'));
const TeamPublicProfilePage = lazy(() => import('@/teams/pages/TeamPublicProfilePage'));

// Lazy-loaded pages - Business directories
const RetailerDirectoryPage = lazy(() => import('@/business-listings/pages/RetailerDirectoryPage'));
const RetailerProfilePage = lazy(() => import('@/business-listings/pages/RetailerProfilePage'));
const ManufacturerDirectoryPage = lazy(() => import('@/business-listings/pages/ManufacturerDirectoryPage'));
const ManufacturerProfilePage = lazy(() => import('@/business-listings/pages/ManufacturerProfilePage'));
const ManufacturerPartnerInfoPage = lazy(() => import('@/business-listings/pages/ManufacturerPartnerInfoPage'));

// Lazy-loaded pages - Other public pages
const HostEventPage = lazy(() => import('@/event-hosting-requests/pages/HostEventPage'));
const ClassCalculatorPage = lazy(() => import('@/competition-classes/pages/ClassCalculatorPage'));
const HallOfFamePage = lazy(() => import('@/championship-archives/pages/HallOfFamePage'));
const HallOfFameInducteeDetailPage = lazy(() => import('@/championship-archives/pages/HallOfFameInducteeDetailPage'));
const ChampionshipArchivesPage = lazy(() => import('@/championship-archives/pages/ChampionshipArchivesPage'));
const ChampionshipArchiveYearPage = lazy(() => import('@/championship-archives/pages/ChampionshipArchiveYearPage'));
const JudgesDirectoryPage = lazy(() => import('@/judges/pages/JudgesDirectoryPage'));
const JudgeProfilePage = lazy(() => import('@/judges/pages/JudgeProfilePage'));
const EventDirectorsDirectoryPage = lazy(() => import('@/event-directors/pages/EventDirectorsDirectoryPage'));
const EventDirectorProfilePage = lazy(() => import('@/event-directors/pages/EventDirectorProfilePage'));

// Lazy-loaded pages - Auth-gated registration views
const MyRegistrationsPage = lazy(() => import('@/event-registrations/pages/MyRegistrationsPage'));
const MyRegistrationDetailPage = lazy(() => import('@/event-registrations/pages/MyRegistrationDetailPage'));

// Lazy-loaded pages - Tickets
const TicketsPage = lazy(() => import('@/tickets/pages/TicketsPage'));
const TicketDetailPage = lazy(() => import('@/tickets/pages/TicketDetailPage'));
const GuestSupportPage = lazy(() => import('@/tickets/pages/GuestSupportPage'));
const GuestTicketCreatePage = lazy(() => import('@/tickets/pages/GuestTicketCreatePage'));
const GuestTicketViewPage = lazy(() => import('@/tickets/pages/GuestTicketViewPage'));
const GuestTicketAccessPage = lazy(() => import('@/tickets/pages/GuestTicketAccessPage'));

// Lazy-loaded pages - Shop secondary pages
const ProductDetailPage = lazy(() => import('@/shop/pages/ProductDetailPage'));
const CartPage = lazy(() => import('@/shop/pages/CartPage'));

// Lazy-loaded pages - Dashboard & user pages (loaded after login)
const DashboardPage = lazy(() => import('@/dashboard/pages/DashboardPage'));
const MyMecaDashboardPage = lazy(() => import('@/dashboard/pages/MyMecaDashboardPage'));
const AdminDashboardPage = lazy(() => import('@/dashboard/pages/AdminDashboardPage'));
const BusinessListingDashboardPage = lazy(() => import('@/dashboard/pages/BusinessListingDashboardPage'));
const MembershipDashboardPage = lazy(() => import('@/dashboard/pages/MembershipDashboardPage'));
const BillingPage = lazy(() => import('@/billing/pages/BillingPage'));
const InvoicePaymentPage = lazy(() => import('@/billing/pages/InvoicePaymentPage'));
const InvoiceViewPage = lazy(() => import('@/billing/pages/InvoiceViewPage'));
const MembershipReceiptPage = lazy(() => import('@/billing/pages/MembershipReceiptPage'));

// Lazy-loaded pages - Checkout pages (Stripe loaded on demand)
const EventRegistrationCheckoutPage = lazy(() => import('@/event-registrations/pages/EventRegistrationCheckoutPage'));
const MembershipCheckoutPage = lazy(() => import('@/memberships/pages/MembershipCheckoutPage'));
const RenewTokenPage = lazy(() => import('@/memberships/pages/RenewTokenPage'));
const RenewExpiredPage = lazy(() => import('@/memberships/pages/RenewExpiredPage'));
const CheckoutPage = lazy(() => import('@/shop/pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('@/shop/pages/OrderConfirmationPage'));
const OrderHistoryPage = lazy(() => import('@/shop/pages/OrderHistoryPage'));
const ShopOrderDetailPage = lazy(() => import('@/shop/pages/OrderDetailPage'));

// Lazy-loaded pages - Reference Verification
const VerifyReferencePage = lazy(() => import('@/verification/pages/VerifyReferencePage'));

// Lazy-loaded pages - Judge & Event Director applications
const JudgeApplicationPage = lazy(() => import('@/judges/pages/JudgeApplicationPage'));
const JudgeAssignmentsPage = lazy(() => import('@/judges/pages/JudgeAssignmentsPage'));
const EventDirectorApplicationPage = lazy(() => import('@/event-directors/pages/EventDirectorApplicationPage'));
const EventDirectorAssignmentsPage = lazy(() => import('@/event-directors/pages/EventDirectorAssignmentsPage'));
const EDHostingRequestsPage = lazy(() => import('@/event-directors/pages/EDHostingRequestsPage'));
const EDSubmitEventPage = lazy(() => import('@/event-directors/pages/EDSubmitEventPage'));
const EDEventManagementPage = lazy(() => import('@/event-directors/pages/EDEventManagementPage'));

// Lazy-loaded pages - Event registrations & check-in
const EventCheckInPage = lazy(() => import('@/event-registrations/pages/EventCheckInPage'));
const CheckInHubPage = lazy(() => import('@/event-registrations/pages/CheckInHubPage'));

// Lazy-loaded pages - Admin (only admins access these)
const MembersPage = lazy(() => import('@/admin/pages/MembersPage'));
const MemberDetailPage = lazy(() => import('@/admin/pages/MemberDetailPage'));
const AdminTicketsPage = lazy(() => import('@/admin/pages/AdminTicketsPage'));
const StaffSignatureSettingsPage = lazy(() => import('@/tickets/pages/admin/StaffSignatureSettingsPage'));
const CannedResponsesSettingsPage = lazy(() => import('@/tickets/pages/admin/CannedResponsesSettingsPage'));
const EventRegistrationsPage = lazy(() => import('@/admin/pages/EventRegistrationsPage'));
const EventRegistrationDetailPage = lazy(() => import('@/admin/pages/EventRegistrationDetailPage'));
const BusinessListingsAdminPage = lazy(() => import('@/admin/pages/BusinessListingsAdminPage'));
const JudgeApplicationsAdminPage = lazy(() => import('@/admin/pages/JudgeApplicationsAdminPage'));
const JudgeApplicationDetailPage = lazy(() => import('@/admin/pages/JudgeApplicationDetailPage'));
const EventDirectorApplicationsAdminPage = lazy(() => import('@/admin/pages/EventDirectorApplicationsAdminPage'));
const EventDirectorApplicationDetailPage = lazy(() => import('@/admin/pages/EventDirectorApplicationDetailPage'));
const JudgesAdminPage = lazy(() => import('@/admin/pages/JudgesAdminPage'));
const AdminJudgeDetailPage = lazy(() => import('@/admin/pages/JudgeDetailPage'));
const EventDirectorsAdminPage = lazy(() => import('@/admin/pages/EventDirectorsAdminPage'));
const AdminEventDirectorDetailPage = lazy(() => import('@/admin/pages/EventDirectorDetailPage'));
const RatingsAdminPage = lazy(() => import('@/admin/pages/RatingsAdminPage'));
const NotificationsAdminPage = lazy(() => import('@/admin/pages/NotificationsAdminPage'));
const EmailTestingPage = lazy(() => import('@/admin/pages/EmailTestingPage'));
const WorldFinalsAdminPage = lazy(() => import('@/admin/pages/WorldFinalsAdminPage'));
const WorldFinalsPreRegisterPage = lazy(() => import('@/world-finals/pages/WorldFinalsPreRegisterPage'));
const AchievementsAdminPage = lazy(() => import('@/achievements/pages/AchievementsAdminPage'));
const AuditLogAdminPage = lazy(() => import('@/admin/pages/AuditLogAdminPage'));
const SeasonManagementPage = lazy(() => import('@/seasons/pages/SeasonManagementPage'));
const ClassesManagementPage = lazy(() => import('@/competition-classes/pages/ClassesManagementPage'));
const FormatManagementPage = lazy(() => import('@/competition-formats/pages/FormatManagementPage'));
const MembershipTypeManagementPage = lazy(() => import('@/membership-type-configs/pages/MembershipTypeManagementPage'));
const PointsConfigurationPage = lazy(() => import('@/admin/pages/PointsConfigurationPage'));
const AdvertisersAdminPage = lazy(() => import('@/admin/pages/AdvertisersAdminPage'));
const ManagePermissionsPage = lazy(() => import('@/admin/pages/ManagePermissionsPage'));
const BannersAdminPage = lazy(() => import('@/admin/pages/BannersAdminPage'));
const BannerAnalyticsPage = lazy(() => import('@/admin/pages/BannerAnalyticsPage'));
const AdminShopProductsPage = lazy(() => import('@/admin/pages/AdminShopProductsPage'));
const CouponsAdminPage = lazy(() => import('@/admin/pages/CouponsAdminPage'));
const AdminShopOrdersPage = lazy(() => import('@/admin/pages/AdminShopOrdersPage'));
const MembershipCardsAdminPage = lazy(() => import('@/admin/pages/MembershipCardsAdminPage'));
const FinalsVotingAdminPage = lazy(() => import('@/admin/pages/FinalsVotingAdminPage'));
const CardRedirectPage = lazy(() => import('@/memberships/pages/CardRedirectPage'));
const MembershipCardPage = lazy(() => import('@/memberships/pages/MembershipCardPage'));
const MembershipBillingPage = lazy(() => import('@/dashboard/pages/MembershipBillingPage'));
const FinalsVotingPage = lazy(() => import('@/finals-voting/pages/FinalsVotingPage'));
const VotingResultsPage = lazy(() => import('@/finals-voting/pages/VotingResultsPage'));
const AnalyticsPage = lazy(() => import('@/admin/pages/AnalyticsPage'));
const MemberActivityDashboardPage = lazy(() => import('@/admin/pages/MemberActivityDashboardPage'));
const SearchConsolePage = lazy(() => import('@/admin/pages/SearchConsolePage'));
const SEOSettingsPage = lazy(() => import('@/admin/pages/SEOSettingsPage'));
const WorldRecordsPage = lazy(() => import('@/spl-world-records/pages/WorldRecordsPage'));
const WorldRecordsAdminPage = lazy(() => import('@/spl-world-records/pages/WorldRecordsAdminPage'));
const HallOfFameAdminPage = lazy(() => import('@/hall-of-fame/pages/HallOfFameAdminPage'));
const MecaIdReassignPage = lazy(() => import('@/admin/pages/MecaIdReassignPage'));
const ForeverMembersPage = lazy(() => import('@/forever-members/pages/ForeverMembersPage'));
const ForeverMemberDetailPage = lazy(() => import('@/forever-members/pages/ForeverMemberDetailPage'));
const ForeverMembersAdminPage = lazy(() => import('@/forever-members/pages/ForeverMembersAdminPage'));
const LoginAuditPage = lazy(() => import('@/admin/pages/LoginAuditPage'));
const AdminAuditPage = lazy(() => import('@/admin/pages/AdminAuditPage'));
const ResultsNeedingClassPage = lazy(() => import('@/admin/pages/ResultsNeedingClassPage'));
const QAChecklistPage = lazy(() => import('@/admin/pages/QAChecklistPage'));
const QARoundDetailPage = lazy(() => import('@/admin/pages/QARoundDetailPage'));
const QAReviewPage = lazy(() => import('@/admin/pages/QAReviewPage'));
const ScoreSheetEditorPage = lazy(() => import('@/admin/pages/ScoreSheetEditorPage'));

// Lazy-loaded pages - Admin billing
const BillingDashboardPage = lazy(() => import('@/admin/billing/pages/BillingDashboardPage'));
const AdminOrdersPage = lazy(() => import('@/admin/billing/pages/OrdersPage'));
const AdminInvoicesPage = lazy(() => import('@/admin/billing/pages/InvoicesPage'));
const RevenueReportsPage = lazy(() => import('@/admin/billing/pages/RevenueReportsPage'));
const RecurringInvoicesPage = lazy(() => import('@/admin/billing/pages/RecurringInvoicesPage'));
const OrderDetailPage = lazy(() => import('@/admin/billing/pages/OrderDetailPage'));
const InvoiceDetailPage = lazy(() => import('@/admin/billing/pages/InvoiceDetailPage'));
const CreateInvoicePage = lazy(() => import('@/admin/billing/pages/CreateInvoicePage'));
const FailedPaymentsPage = lazy(() => import('@/admin/billing/pages/FailedPaymentsPage'));
const AllPaymentsPage = lazy(() => import('@/admin/billing/pages/AllPaymentsPage'));
const SubscriptionsPage = lazy(() => import('@/admin/billing/pages/SubscriptionsPage'));

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
  </div>
);

// Helper to wrap lazy components in Suspense
const L = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

// Null-rendering component that tracks page views.
//   - usePageTracking — Google Analytics 4 (anonymous + authed alike)
//   - useMemberPageTracking — first-party per-member tracking; only fires
//     when a member is signed in and hasn't opted out via account settings
function PageTracker() {
  usePageTracking();
  useMemberPageTracking();
  return null;
}

function App() {
  return (
    <HelmetProvider>
      <StagingNoIndex />
      <AuthProvider>
        <BrowserRouter>
        <MaintenanceModeGuard>
        <SiteSettingsProvider>
          <SeasonsProvider>
            <CartProvider>
              <PayPalProvider>
              <ReCaptchaProvider version="v2">
                  <ScrollToTop />
                  <PageTracker />
          <ImpersonationBanner />
          <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <IdleTimeoutGuard>
            <ForcePasswordChangeGuard>
            <BillingRestrictedGuard>
            <ExpiredMembershipGuard>
            <div className="flex-1">
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<L><AuthCallbackPage /></L>} />
              <Route path="/change-password" element={<L><ChangePasswordPage /></L>} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:eventId" element={<L><EventDetailPage /></L>} />
              <Route path="/events/:eventId/register" element={<L><EventRegistrationCheckoutPage /></L>} />
              <Route path="/events/:eventId/check-in" element={<L><EventCheckInPage /></L>} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/results/member/:mecaId" element={<L><MemberResultsPage /></L>} />
              <Route path="/leaderboard" element={<L><LeaderboardPage /></L>} />
              <Route path="/standings" element={<L><StandingsPage /></L>} />
              <Route path="/team-standings" element={<L><TeamStandingsPage /></L>} />
              <Route path="/team-leaderboard" element={<L><TeamLeaderboardPage /></L>} />
              <Route path="/rulebooks" element={<L><RulebooksPage /></L>} />
              <Route path="/rulebooks/:rulebookId" element={<L><RulebookDetailPage /></L>} />
              <Route path="/rulebooks/archive" element={<L><RulebookArchivePage /></L>} />
              <Route path="/contact" element={<L><ContactPage /></L>} />
              <Route path="/host-event" element={<L><HostEventPage /></L>} />
              <Route path="/class-calculator" element={<L><ClassCalculatorPage /></L>} />
              <Route path="/hall-of-fame" element={<L><HallOfFamePage /></L>} />
              <Route path="/hall-of-fame/:id" element={<L><HallOfFameInducteeDetailPage /></L>} />
              <Route path="/world-finals/register" element={<L><WorldFinalsPreRegisterPage /></L>} />
              <Route path="/forever-members" element={<L><ForeverMembersPage /></L>} />
              <Route path="/forever-members/:id" element={<L><ForeverMemberDetailPage /></L>} />
              <Route path="/championship-archives" element={<L><ChampionshipArchivesPage /></L>} />
              <Route path="/championship-archives/:year" element={<L><ChampionshipArchiveYearPage /></L>} />
              <Route path="/member-support" element={<L><MemberSupportPage /></L>} />
              <Route path="/privacy-policy" element={<L><PrivacyPolicyPage /></L>} />
              <Route path="/terms-and-conditions" element={<L><TermsAndConditionsPage /></L>} />
              <Route path="/knowledge-base" element={<Navigate to="/member-support" replace />} />
              <Route path="/competition-guides" element={<L><CompetitionGuidesPage /></L>} />
              <Route path="/competition-guides/quick-start" element={<L><MECAQuickStartGuidePage /></L>} />

              {/* Reference Verification (public, tokenized) */}
              <Route path="/verify-reference" element={<L><VerifyReferencePage /></L>} />

              {/* Public Invoice Payment Route */}
              <Route path="/pay/invoice/:invoiceId" element={<L><InvoicePaymentPage /></L>} />

              {/* Public Member Directory Routes */}
              <Route path="/members" element={<L><MemberDirectoryPage /></L>} />
              <Route path="/members/:id" element={<L><MemberProfilePage /></L>} />

              {/* Public Team Directory Routes */}
              <Route path="/teams" element={<L><TeamDirectoryPage /></L>} />
              <Route path="/teams/:id" element={<L><TeamPublicProfilePage /></L>} />

              {/* Public Business Directory Routes */}
              <Route path="/retailers" element={<L><RetailerDirectoryPage /></L>} />
              <Route path="/retailers/:id" element={<L><RetailerProfilePage /></L>} />
              <Route path="/manufacturers" element={<L><ManufacturerDirectoryPage /></L>} />
              <Route path="/manufacturers/:id" element={<L><ManufacturerProfilePage /></L>} />
              <Route path="/manufacturer-membership" element={<L><ManufacturerPartnerInfoPage /></L>} />

              {/* Public Judges Directory Routes */}
              <Route path="/judges" element={<L><JudgesDirectoryPage /></L>} />
              <Route path="/judges/apply" element={<L><JudgeApplicationPage /></L>} />
              <Route path="/judges/assignments" element={<L><JudgeAssignmentsPage /></L>} />
              <Route path="/judges/:id" element={<L><JudgeProfilePage /></L>} />

              {/* Public Event Directors Directory Routes */}
              <Route path="/event-directors" element={<L><EventDirectorsDirectoryPage /></L>} />
              <Route path="/event-directors/apply" element={<L><EventDirectorApplicationPage /></L>} />
              <Route path="/event-directors/assignments" element={<L><EventDirectorAssignmentsPage /></L>} />
              <Route path="/event-directors/hosting-requests" element={<L><EDHostingRequestsPage /></L>} />
              <Route path="/event-directors/submit-event" element={<L><EDSubmitEventPage /></L>} />
              <Route path="/event-directors/event/:eventId" element={<L><EDEventManagementPage /></L>} />
              <Route path="/event-directors/:id" element={<L><EventDirectorProfilePage /></L>} />

              {/* User Routes */}
              <Route path="/dashboard" element={<L><DashboardPage /></L>} />
              <Route path="/dashboard/mymeca" element={<L><MyMecaDashboardPage /></L>} />
              <Route path="/dashboard/business-listing" element={<L><BusinessListingDashboardPage /></L>} />
              <Route path="/dashboard/membership" element={<L><MembershipDashboardPage /></L>} />
              <Route path="/dashboard/admin" element={<L><AdminDashboardPage /></L>} />
              <Route path="/profile" element={<L><ProfilePage /></L>} />
              <Route path="/public-profile" element={<L><PublicProfilePage /></L>} />
              <Route path="/member-profile-gallery" element={<L><MemberGalleryPage /></L>} />
              <Route path="/billing" element={<L><BillingPage /></L>} />
              <Route path="/invoice/:invoiceId" element={<L><InvoiceViewPage /></L>} />
              <Route path="/membership/:membershipId/receipt" element={<L><MembershipReceiptPage /></L>} />
              <Route path="/membership" element={<MembershipPage />} />
              <Route path="/membership/checkout/:membershipId" element={<L><MembershipCheckoutPage /></L>} />
              <Route path="/renew/:token" element={<L><RenewTokenPage /></L>} />
              <Route path="/renew-expired" element={<L><RenewExpiredPage /></L>} />
              <Route path="/apply/judge" element={<L><JudgeApplicationPage /></L>} />
              <Route path="/apply/event-director" element={<L><EventDirectorApplicationPage /></L>} />
              <Route path="/my-registrations" element={<L><MyRegistrationsPage /></L>} />
              <Route path="/my-registrations/:registrationId" element={<L><MyRegistrationDetailPage /></L>} />
              <Route path="/membership-billing" element={<L><MembershipBillingPage /></L>} />
              <Route path="/membership/card" element={<L><MembershipCardPage /></L>} />

              {/* Support Ticket Routes (Authenticated) */}
              <Route path="/tickets" element={<L><TicketsPage /></L>} />
              <Route path="/tickets/:id" element={<L><TicketDetailPage /></L>} />

              {/* Guest Support Ticket Routes (No Auth Required) */}
              <Route path="/support/guest" element={<L><GuestSupportPage /></L>} />
              <Route path="/support/guest/verify/:token" element={<L><GuestTicketCreatePage /></L>} />
              <Route path="/support/guest/ticket/:accessToken" element={<L><GuestTicketViewPage /></L>} />
              <Route path="/support/guest/access/:token" element={<L><GuestTicketAccessPage /></L>} />

              {/* Admin Routes */}
              <Route path="/admin/members" element={<L><MembersPage /></L>} />
              <Route path="/admin/members/:memberId" element={<L><MemberDetailPage /></L>} />
              <Route path="/admin/seasons" element={<L><SeasonManagementPage /></L>} />
              <Route path="/admin/classes" element={<L><ClassesManagementPage /></L>} />
              <Route path="/admin/formats" element={<L><FormatManagementPage /></L>} />
              <Route path="/admin/membership-types" element={<L><MembershipTypeManagementPage /></L>} />
              <Route path="/admin/tickets" element={<L><AdminTicketsPage /></L>} />
              <Route path="/admin/tickets/:id" element={<L><AdminTicketsPage /></L>} />
              <Route path="/admin/settings/signature" element={<L><StaffSignatureSettingsPage /></L>} />
              <Route path="/admin/settings/canned-responses" element={<L><CannedResponsesSettingsPage /></L>} />
              <Route path="/admin/event-registrations" element={<L><EventRegistrationsPage /></L>} />
              <Route path="/admin/event-registrations/:id" element={<L><EventRegistrationDetailPage /></L>} />
              <Route path="/admin/check-in" element={<L><CheckInHubPage /></L>} />
              <Route path="/admin/business-listings" element={<L><BusinessListingsAdminPage /></L>} />
              <Route path="/admin/judge-applications" element={<L><JudgeApplicationsAdminPage /></L>} />
              <Route path="/admin/judge-applications/:id" element={<L><JudgeApplicationDetailPage /></L>} />
              <Route path="/admin/event-director-applications" element={<L><EventDirectorApplicationsAdminPage /></L>} />
              <Route path="/admin/event-director-applications/:id" element={<L><EventDirectorApplicationDetailPage /></L>} />
              <Route path="/admin/judges" element={<L><JudgesAdminPage /></L>} />
              <Route path="/admin/judges/:id" element={<L><AdminJudgeDetailPage /></L>} />
              <Route path="/admin/event-directors" element={<L><EventDirectorsAdminPage /></L>} />
              <Route path="/admin/event-directors/:id" element={<L><AdminEventDirectorDetailPage /></L>} />
              <Route path="/admin/ratings" element={<L><RatingsAdminPage /></L>} />
              <Route path="/admin/notifications" element={<L><NotificationsAdminPage /></L>} />
              <Route path="/admin/email-testing" element={<L><EmailTestingPage /></L>} />
              <Route path="/admin/world-finals" element={<L><WorldFinalsAdminPage /></L>} />
              <Route path="/admin/achievements" element={<L><AchievementsAdminPage /></L>} />
              <Route path="/admin/audit-log" element={<L><AuditLogAdminPage /></L>} />

              {/* Admin Billing Routes */}
              <Route path="/admin/billing" element={<L><BillingDashboardPage /></L>} />
              <Route path="/admin/billing/orders" element={<L><AdminOrdersPage /></L>} />
              <Route path="/admin/billing/orders/:id" element={<L><OrderDetailPage /></L>} />
              <Route path="/admin/billing/invoices" element={<L><AdminInvoicesPage /></L>} />
              <Route path="/admin/billing/invoices/new" element={<L><CreateInvoicePage /></L>} />
              <Route path="/admin/billing/invoices/:id" element={<L><InvoiceDetailPage /></L>} />
              <Route path="/admin/billing/revenue" element={<L><RevenueReportsPage /></L>} />
              <Route path="/admin/billing/recurring" element={<L><RecurringInvoicesPage /></L>} />
              <Route path="/admin/billing/failed-payments" element={<L><FailedPaymentsPage /></L>} />
              <Route path="/admin/billing/payments" element={<L><AllPaymentsPage /></L>} />
              <Route path="/admin/billing/subscriptions" element={<L><SubscriptionsPage /></L>} />

              {/* Shop Routes */}
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/products/:id" element={<L><ProductDetailPage /></L>} />
              <Route path="/shop/cart" element={<L><CartPage /></L>} />
              <Route path="/shop/checkout" element={<L><CheckoutPage /></L>} />
              <Route path="/shop/orders" element={<L><OrderHistoryPage /></L>} />
              <Route path="/shop/orders/:id" element={<L><ShopOrderDetailPage /></L>} />
              <Route path="/shop/orders/:id/confirmation" element={<L><OrderConfirmationPage /></L>} />

              {/* Admin Shop Routes */}
              <Route path="/admin/shop/products" element={<L><AdminShopProductsPage /></L>} />
              <Route path="/admin/shop/orders" element={<L><AdminShopOrdersPage /></L>} />
              <Route path="/admin/coupons" element={<L><CouponsAdminPage /></L>} />

              {/* Admin Permissions */}
              <Route path="/admin/permissions" element={<L><ManagePermissionsPage /></L>} />

              {/* Admin Banner Routes */}
              <Route path="/admin/advertisers" element={<L><AdvertisersAdminPage /></L>} />
              <Route path="/admin/banners" element={<L><BannersAdminPage /></L>} />
              <Route path="/admin/banners/analytics" element={<L><BannerAnalyticsPage /></L>} />

              {/* Admin Points Configuration */}
              <Route path="/admin/points-configuration" element={<L><PointsConfigurationPage /></L>} />

              {/* Admin Analytics */}
              <Route path="/admin/analytics" element={<L><AnalyticsPage /></L>} />
              <Route path="/admin/member-activity" element={<L><MemberActivityDashboardPage /></L>} />
              <Route path="/admin/search-console" element={<L><SearchConsolePage /></L>} />
              <Route path="/admin/seo-settings" element={<L><SEOSettingsPage /></L>} />

              {/* Admin Membership Cards */}
              <Route path="/admin/membership-cards" element={<L><MembershipCardsAdminPage /></L>} />

              {/* Admin Finals Voting */}
              <Route path="/admin/finals-voting" element={<L><FinalsVotingAdminPage /></L>} />

              {/* Admin SPL World Records */}
              <Route path="/admin/world-records" element={<L><WorldRecordsAdminPage /></L>} />

              {/* Admin Hall of Fame */}
              <Route path="/admin/hall-of-fame" element={<L><HallOfFameAdminPage /></L>} />
              <Route path="/admin/meca-id-reassign" element={<L><MecaIdReassignPage /></L>} />
              <Route path="/admin/forever-members" element={<L><ForeverMembersAdminPage /></L>} />

              {/* Admin Login Audit */}
              <Route path="/admin/login-audit" element={<L><LoginAuditPage /></L>} />
              <Route path="/admin/admin-audit" element={<L><AdminAuditPage /></L>} />
              <Route path="/admin/results-needing-class" element={<L><ResultsNeedingClassPage /></L>} />

              {/* Admin QA Checklist */}
              <Route path="/admin/qa-checklist" element={<L><QAChecklistPage /></L>} />
              <Route path="/admin/qa-checklist/rounds/:roundId" element={<L><QARoundDetailPage /></L>} />
              <Route path="/admin/qa-checklist/review/:assignmentId" element={<L><QAReviewPage /></L>} />
              <Route path="/admin/score-sheet-editor" element={<L><ScoreSheetEditorPage /></L>} />

              {/* Card QR Code Redirect */}
              <Route path="/card/:membershipId" element={<L><CardRedirectPage /></L>} />

              {/* Finals Voting (Member) */}
              <Route path="/finals-voting" element={<L><FinalsVotingPage /></L>} />

              {/* SPL World Records (Public) */}
              <Route path="/world-records" element={<L><WorldRecordsPage /></L>} />

              {/* Voting Results (Public) */}
              <Route path="/voting-results/:sessionId" element={<L><VotingResultsPage /></L>} />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
            </ExpiredMembershipGuard>
            </BillingRestrictedGuard>
            </ForcePasswordChangeGuard>
            </IdleTimeoutGuard>
          <Footer />
        </div>
              </ReCaptchaProvider>
              </PayPalProvider>
            </CartProvider>
          </SeasonsProvider>
        </SiteSettingsProvider>
        </MaintenanceModeGuard>
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
