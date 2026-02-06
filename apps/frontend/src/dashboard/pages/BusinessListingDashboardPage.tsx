import { useNavigate } from 'react-router-dom';
import RetailerDashboard from '../components/RetailerDashboard';

export default function BusinessListingDashboardPage() {
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'events':
        navigate('/events');
        break;
      case 'leaderboard':
        navigate('/leaderboard');
        break;
      default:
        navigate(`/${page}`);
    }
  };

  return <RetailerDashboard onNavigate={handleNavigate} />;
}
