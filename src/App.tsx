import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import StandingsPage from './pages/StandingsPage';
import RulebooksPage from './pages/RulebooksPage';
import DashboardPage from './pages/DashboardPage';

type Page = 'home' | 'login' | 'signup' | 'events' | 'event-detail' | 'results' | 'leaderboard' | 'standings' | 'rulebooks' | 'dashboard';

interface PageData {
  eventId?: string;
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
        return <RulebooksPage />;
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-900">
        <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
        {renderPage()}
      </div>
    </AuthProvider>
  );
}

export default App;
