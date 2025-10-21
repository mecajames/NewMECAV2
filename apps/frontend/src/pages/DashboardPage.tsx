import { useAuth } from '../contexts/AuthContext';
import UserDashboard from '../components/dashboards/UserDashboard';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import EventDirectorDashboard from '../components/dashboards/EventDirectorDashboard';
import RetailerDashboard from '../components/dashboards/RetailerDashboard';

interface DashboardPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Please sign in to view your dashboard</p>
          <button
            onClick={() => onNavigate('login')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  switch (profile.role) {
    case 'admin':
      return <AdminDashboard onNavigate={onNavigate} />;
    case 'event_director':
      return <EventDirectorDashboard onNavigate={onNavigate} />;
    case 'retailer':
      return <RetailerDashboard onNavigate={onNavigate} />;
    default:
      return <UserDashboard onNavigate={onNavigate} />;
  }
}
