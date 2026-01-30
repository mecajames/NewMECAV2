import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TicketList } from '../components/TicketList';
import { CreateTicketForm } from '../components/CreateTicketForm';
import { useAuth } from '@/auth';
import { Ticket as TicketType } from '../tickets.api-client';

export function TicketsPage() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleTicketCreated = (ticket: TicketType) => {
    setShowCreateForm(false);
    // Navigate to the new ticket
    navigate(`/tickets/${ticket.id}`);
  };

  // Redirect unauthenticated users to guest support (wait for auth to load first)
  useEffect(() => {
    if (!loading && !profile) {
      navigate('/support/guest', { replace: true });
    }
  }, [profile, loading, navigate]);

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">Redirecting to guest support...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">Support</h2>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        <TicketList
          userId={profile.id}
          mode="my-tickets"
          showFilters={false}
          showCreateButton={true}
          onCreateClick={() => setShowCreateForm(true)}
        />

        <CreateTicketForm
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleTicketCreated}
          reporterId={profile.id}
        />
      </div>
    </div>
  );
}

export default TicketsPage;
