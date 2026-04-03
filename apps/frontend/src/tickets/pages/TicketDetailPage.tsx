import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { CheckCircle, Mail, X } from 'lucide-react';
import { TicketDetail } from '../components/TicketDetail';
import { useAuth } from '@/auth/contexts/AuthContext';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  // Check if user is staff (admin or event_director)
  const isStaff = profile?.role === 'admin' || profile?.role === 'event_director';

  // Show success banner when navigated from ticket creation
  useEffect(() => {
    const state = location.state as { justCreated?: boolean; ticketNumber?: string } | null;
    if (state?.justCreated) {
      setShowSuccess(true);
      setTicketNumber(state.ticketNumber || null);
      // Clear the navigation state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => setShowSuccess(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

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
        {/* Success Banner */}
        {showSuccess && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-green-400 font-semibold">
                Ticket {ticketNumber ? `${ticketNumber} ` : ''}Created Successfully!
              </h3>
              <p className="text-green-300/80 text-sm mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                A confirmation email has been sent to your email address. Our support team has also been notified.
              </p>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="text-green-400/60 hover:text-green-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
