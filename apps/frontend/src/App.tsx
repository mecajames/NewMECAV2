import { useState } from 'react';
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
import MembershipPage from './pages/MembershipPage';

type Page = 'home' | 'login' | 'signup' | 'events' | 'event-detail' | 'results' | 'leaderboard' | 'standings' | 'rulebooks' | 'rulebook-detail' | 'rulebook-archive' | 'dashboard' | 'membership';

interface PageData {
  eventId?: string;
  rulebookId?: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [pageData, setPageData] = useState<PageData>({});

  const handleNavigate = (page: string, data?: any) => {
    setCurrentPage(page as Page);
    setPageData(data || {});
    window.scrollTo(0, 0);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />;
      case 'signup':
        return <SignUpPage onNavigate={handleNavigate} />;
      case 'events':
        return <EventsPage onNavigate={handleNavigate} />;
      case 'event-detail':
        return pageData.eventId ? (
          <EventDetailPage eventId={pageData.eventId} onNavigate={handleNavigate} />
        ) : (
          <EventsPage onNavigate={handleNavigate} />
        );
      case 'results':
        return <ResultsPage onNavigate={handleNavigate} />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'standings':
        return <StandingsPage />;
      case 'rulebooks':
        return <RulebooksPage onNavigate={handleNavigate} />;
      case 'rulebook-detail':
        return pageData.rulebookId ? (
          <RulebookDetailPage rulebookId={pageData.rulebookId} />
        ) : (
          <RulebooksPage onNavigate={handleNavigate} />
        );
      case 'rulebook-archive':
        return <RulebookArchivePage onNavigate={handleNavigate} />;
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'membership':
        return <MembershipPage onNavigate={handleNavigate} />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
        <div className="flex-1">
          {renderPage()}
        </div>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
