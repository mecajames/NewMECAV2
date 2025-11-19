import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ReCaptchaProvider } from './shared/recaptcha';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
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
import MembersPage from './pages/admin/MembersPage';
import MemberDetailPage from './pages/admin/MemberDetailPage';
import SeasonManagementPage from './pages/admin/SeasonManagementPage';
import ClassesManagementPage from './pages/admin/ClassesManagementPage';
import FormatManagementPage from './pages/admin/FormatManagementPage';

function App() {
  return (
    <AuthProvider>
      <ReCaptchaProvider version="v2">
        <BrowserRouter>
          <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1">
              <Routes>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-slate-900 flex flex-col">
          <Navbar />
          <div className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
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

              {/* User Routes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/membership" element={<MembershipPage />} />

              {/* Admin Routes */}
              <Route path="/admin/members" element={<MembersPage />} />
              <Route path="/admin/members/:memberId" element={<MemberDetailPage />} />
              <Route path="/admin/seasons" element={<SeasonManagementPage />} />
              <Route path="/admin/classes" element={<ClassesManagementPage />} />
              <Route path="/admin/formats" element={<FormatManagementPage />} />

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
