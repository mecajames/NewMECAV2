import { useParams } from 'react-router-dom';
import { TicketDetail } from '../../components/tickets';
import { useAuth } from '../../contexts/AuthContext';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();

  // Check if user is staff (admin or event_director)
  const isStaff = profile?.role === 'admin' || profile?.role === 'event_director';

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">Please log in to view ticket details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <TicketDetail
          ticketId={id}
          currentUserId={profile.id}
          isStaff={isStaff}
        />
      </div>
    </div>
  );
}

export default TicketDetailPage;
