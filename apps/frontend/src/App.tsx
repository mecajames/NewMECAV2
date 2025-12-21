import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ForcePasswordChangeGuard } from '@/auth';
import { ReCaptchaProvider } from '@/shared/recaptcha';
import { Navbar, Footer, ScrollToTop } from '@/shared/components';
// Static pages
import HomePage from '@/pages/HomePage';
import ContactPage from '@/pages/ContactPage';
import MemberSupportPage from '@/pages/MemberSupportPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsAndConditionsPage from '@/pages/TermsAndConditionsPage';
import CompetitionGuidesPage from '@/pages/CompetitionGuidesPage';
import MECAQuickStartGuidePage from '@/pages/MECAQuickStartGuidePage';
// Feature pages
import { LoginPage, ChangePasswordPage } from '@/auth';
import { EventsPage, EventDetailPage } from '@/events';
import { ResultsPage, LeaderboardPage, StandingsPage } from '@/competition-results';
import { RulebooksPage, RulebookDetailPage, RulebookArchivePage } from '@/rulebooks';
import { DashboardPage, MyMecaDashboardPage, AdminDashboardPage } from '@/dashboard';
import { ProfilePage, PublicProfilePage, MemberProfilePage, MemberDirectoryPage } from '@/profiles';
import { TeamDirectoryPage, TeamPublicProfilePage } from '@/teams';
import { RetailerDirectoryPage, RetailerProfilePage, ManufacturerDirectoryPage, ManufacturerProfilePage, ManufacturerPartnerInfoPage } from '@/business-listings';
import { MembershipPage } from '@/memberships';
import { HostEventPage } from '@/event-hosting-requests';
import { ClassCalculatorPage, ClassesManagementPage } from '@/competition-classes';
import { HallOfFamePage, ChampionshipArchivesPage, ChampionshipArchiveYearPage } from '@/championship-archives';
import { BillingPage } from '@/billing';
import { MembersPage, MemberDetailPage, AdminTicketsPage, EventRegistrationsPage, EventRegistrationDetailPage, BusinessListingsAdminPage } from '@/admin';
import { SeasonManagementPage } from '@/seasons';
import {
  MyRegistrationsPage,
  EventCheckInPage,
  CheckInHubPage,
} from '@/event-registrations';
import { FormatManagementPage } from '@/competition-formats';
import { MembershipTypeManagementPage } from '@/membership-type-configs';
// Ticket pages
import {
  TicketsPage,
  TicketDetailPage,
  GuestSupportPage,
  GuestTicketCreatePage,
  GuestTicketViewPage,
  GuestTicketAccessPage,
} from '@/tickets';

// Lazy load checkout pages to avoid loading Stripe until needed
const EventRegistrationCheckoutPage = lazy(() => import('@/event-registrations/pages/EventRegistrationCheckoutPage'));
const MembershipCheckoutPage = lazy(() => import('@/memberships/pages/MembershipCheckoutPage'));

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ReCaptchaProvider version="v2">
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <ForcePasswordChangeGuard>
            <div className="flex-1">
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
              <Route path="/events/:eventId/register" element={<Suspense fallback={<PageLoader />}><EventRegistrationCheckoutPage /></Suspense>} />
              <Route path="/events/:eventId/check-in" element={<EventCheckInPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/standings" element={<StandingsPage />} />
              <Route path="/rulebooks" element={<RulebooksPage />} />
              <Route path="/rulebooks/:rulebookId" element={<RulebookDetailPage />} />
              <Route path="/rulebooks/archive" element={<RulebookArchivePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/host-event" element={<HostEventPage />} />
              <Route path="/class-calculator" element={<ClassCalculatorPage />} />
              <Route path="/hall-of-fame" element={<HallOfFamePage />} />
              <Route path="/championship-archives" element={<ChampionshipArchivesPage />} />
              <Route path="/championship-archives/:year" element={<ChampionshipArchiveYearPage />} />
              <Route path="/member-support" element={<MemberSupportPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
              <Route path="/knowledge-base" element={<Navigate to="/member-support" replace />} />
              <Route path="/competition-guides" element={<CompetitionGuidesPage />} />
              <Route path="/competition-guides/quick-start" element={<MECAQuickStartGuidePage />} />

              {/* Public Member Directory Routes */}
              <Route path="/members" element={<MemberDirectoryPage />} />
              <Route path="/members/:id" element={<MemberProfilePage />} />

              {/* Public Team Directory Routes */}
              <Route path="/teams" element={<TeamDirectoryPage />} />
              <Route path="/teams/:id" element={<TeamPublicProfilePage />} />

              {/* Public Business Directory Routes */}
              <Route path="/retailers" element={<RetailerDirectoryPage />} />
              <Route path="/retailers/:id" element={<RetailerProfilePage />} />
              <Route path="/manufacturers" element={<ManufacturerDirectoryPage />} />
              <Route path="/manufacturers/:id" element={<ManufacturerProfilePage />} />
              <Route path="/manufacturer-membership" element={<ManufacturerPartnerInfoPage />} />

              {/* User Routes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/mymeca" element={<MyMecaDashboardPage />} />
              <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/public-profile" element={<PublicProfilePage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/membership" element={<MembershipPage />} />
              <Route path="/membership/checkout/:membershipId" element={<Suspense fallback={<PageLoader />}><MembershipCheckoutPage /></Suspense>} />
              <Route path="/my-registrations" element={<MyRegistrationsPage />} />

              {/* Support Ticket Routes (Authenticated) */}
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />

              {/* Guest Support Ticket Routes (No Auth Required) */}
              <Route path="/support/guest" element={<GuestSupportPage />} />
              <Route path="/support/guest/verify/:token" element={<GuestTicketCreatePage />} />
              <Route path="/support/guest/ticket/:accessToken" element={<GuestTicketViewPage />} />
              <Route path="/support/guest/access/:token" element={<GuestTicketAccessPage />} />

              {/* Admin Routes */}
              <Route path="/admin/members" element={<MembersPage />} />
              <Route path="/admin/members/:memberId" element={<MemberDetailPage />} />
              <Route path="/admin/seasons" element={<SeasonManagementPage />} />
              <Route path="/admin/classes" element={<ClassesManagementPage />} />
              <Route path="/admin/formats" element={<FormatManagementPage />} />
              <Route path="/admin/membership-types" element={<MembershipTypeManagementPage />} />
              <Route path="/admin/tickets" element={<AdminTicketsPage />} />
              <Route path="/admin/tickets/:id" element={<AdminTicketsPage />} />
              <Route path="/admin/event-registrations" element={<EventRegistrationsPage />} />
              <Route path="/admin/event-registrations/:id" element={<EventRegistrationDetailPage />} />
              <Route path="/admin/check-in" element={<CheckInHubPage />} />
              <Route path="/admin/business-listings" element={<BusinessListingsAdminPage />} />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
            </ForcePasswordChangeGuard>
          <Footer />
        </div>
        </BrowserRouter>
      </ReCaptchaProvider>
    </AuthProvider>
  );
}

export default App;
