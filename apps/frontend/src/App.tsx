import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ReCaptchaProvider } from './shared/recaptcha';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import StandingsPage from './pages/StandingsPage';
import RulebooksPage from './pages/RulebooksPage';
import RulebookDetailPage from './pages/RulebookDetailPage';
import RulebookArchivePage from './pages/RulebookArchivePage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import MembershipPage from './pages/MembershipPage';
import MembershipCheckoutPage from './pages/MembershipCheckoutPage';
import ContactPage from './pages/ContactPage';
import HostEventPage from './pages/HostEventPage';
import ClassCalculatorPage from './pages/ClassCalculatorPage';
import HallOfFamePage from './pages/HallOfFamePage';
import ChampionshipArchivesPage from './pages/ChampionshipArchivesPage';
import ChampionshipArchiveYearPage from './pages/ChampionshipArchiveYearPage';
import MemberSupportPage from './pages/MemberSupportPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import CompetitionGuidesPage from './pages/CompetitionGuidesPage';
import MECAQuickStartGuidePage from './pages/MECAQuickStartGuidePage';
import PublicProfilePage from './pages/PublicProfilePage';
import MemberDirectoryPage from './pages/MemberDirectoryPage';
import MemberProfilePage from './pages/MemberProfilePage';
import BillingPage from './pages/BillingPage';
import MembersPage from './pages/admin/MembersPage';
import MemberDetailPage from './pages/admin/MemberDetailPage';
import SeasonManagementPage from './pages/admin/SeasonManagementPage';
import ClassesManagementPage from './pages/admin/ClassesManagementPage';
import FormatManagementPage from './pages/admin/FormatManagementPage';
import MembershipTypeManagementPage from './pages/admin/MembershipTypeManagementPage';
import MyMecaDashboardPage from './pages/MyMecaDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

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
