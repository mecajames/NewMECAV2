import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/auth';
import { ReCaptchaProvider } from '@/shared/recaptcha';
import { Navbar, Footer, ScrollToTop } from '@/shared/components';
// Static pages
import HomePage from '@/pages/HomePage';
import ContactPage from '@/pages/ContactPage';
import MemberSupportPage from '@/pages/MemberSupportPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsAndConditionsPage from '@/pages/TermsAndConditionsPage';
import KnowledgeBasePage from '@/pages/KnowledgeBasePage';
import CompetitionGuidesPage from '@/pages/CompetitionGuidesPage';
import MECAQuickStartGuidePage from '@/pages/MECAQuickStartGuidePage';
// Feature pages
import { LoginPage } from '@/auth';
import { EventsPage, EventDetailPage } from '@/events';
import { ResultsPage, LeaderboardPage, StandingsPage } from '@/competition-results';
import { RulebooksPage, RulebookDetailPage, RulebookArchivePage } from '@/rulebooks';
import { DashboardPage, MyMecaDashboardPage, AdminDashboardPage } from '@/dashboard';
import { ProfilePage, PublicProfilePage, MemberProfilePage, MemberDirectoryPage } from '@/profiles';
import { MembershipPage, MembershipCheckoutPage } from '@/memberships';
import { HostEventPage } from '@/event-hosting-requests';
import { ClassCalculatorPage, ClassesManagementPage } from '@/competition-classes';
import { HallOfFamePage, ChampionshipArchivesPage, ChampionshipArchiveYearPage } from '@/championship-archives';
import { BillingPage } from '@/billing';
import { MembersPage, MemberDetailPage } from '@/admin';
import { SeasonManagementPage } from '@/seasons';
import { FormatManagementPage } from '@/competition-formats';
import { MembershipTypeManagementPage } from '@/membership-type-configs';

function App() {
  return (
    <AuthProvider>
      <ReCaptchaProvider version="v2">
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1">
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
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
              <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
              <Route path="/competition-guides" element={<CompetitionGuidesPage />} />
              <Route path="/competition-guides/quick-start" element={<MECAQuickStartGuidePage />} />

              {/* Public Member Directory Routes */}
              <Route path="/members" element={<MemberDirectoryPage />} />
              <Route path="/members/:id" element={<MemberProfilePage />} />

              {/* User Routes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/mymeca" element={<MyMecaDashboardPage />} />
              <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/public-profile" element={<PublicProfilePage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/membership" element={<MembershipPage />} />
              <Route path="/membership/checkout/:membershipId" element={<MembershipCheckoutPage />} />

              {/* Admin Routes */}
              <Route path="/admin/members" element={<MembersPage />} />
              <Route path="/admin/members/:memberId" element={<MemberDetailPage />} />
              <Route path="/admin/seasons" element={<SeasonManagementPage />} />
              <Route path="/admin/classes" element={<ClassesManagementPage />} />
              <Route path="/admin/formats" element={<FormatManagementPage />} />
              <Route path="/admin/membership-types" element={<MembershipTypeManagementPage />} />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Footer />
        </div>
        </BrowserRouter>
      </ReCaptchaProvider>
    </AuthProvider>
  );
}

export default App;
