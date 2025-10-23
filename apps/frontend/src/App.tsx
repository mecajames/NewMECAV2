import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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
import MembersPage from './pages/admin/MembersPage';
import MemberDetailPage from './pages/admin/MemberDetailPage';
import SeasonManagementPage from './pages/admin/SeasonManagementPage';
import ClassesManagementPage from './pages/admin/ClassesManagementPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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

              {/* User Routes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/membership" element={<MembershipPage />} />

              {/* Admin Routes */}
              <Route path="/admin/members" element={<MembersPage />} />
              <Route path="/admin/members/:memberId" element={<MemberDetailPage />} />
              <Route path="/admin/seasons" element={<SeasonManagementPage />} />
              <Route path="/admin/classes" element={<ClassesManagementPage />} />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
