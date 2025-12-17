import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketList } from '../components/TicketList';
import { CreateTicketForm } from '../components/CreateTicketForm';
import { useAuth } from '@/auth';
import { Ticket as TicketType } from '../tickets.api-client';

export function TicketsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleTicketCreated = (ticket: TicketType) => {
    setShowCreateForm(false);
    // Navigate to the new ticket
    navigate(`/tickets/${ticket.id}`);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">Please log in to view your tickets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4">
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
