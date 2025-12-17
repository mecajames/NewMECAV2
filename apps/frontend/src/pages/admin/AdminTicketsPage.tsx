import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Ticket,
  Users,
  Building2,
  Route,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { TicketManagement } from '../../components/admin/TicketManagement';
import { TicketDetail } from '../../components/tickets';
import {
  TicketDepartmentManagement,
  TicketStaffManagement,
  TicketRoutingRules,
  TicketSystemSettings,
} from '../../components/admin/tickets';
import { useAuth } from '../../contexts/AuthContext';

type TabId = 'tickets' | 'staff' | 'departments' | 'routing' | 'settings';

const tabs: { id: TabId; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'tickets', label: 'Ticket Queue', icon: <Ticket className="w-4 h-4" /> },
  { id: 'staff', label: 'Staff', icon: <Users className="w-4 h-4" />, adminOnly: true },
  { id: 'departments', label: 'Departments', icon: <Building2 className="w-4 h-4" />, adminOnly: true },
  { id: 'routing', label: 'Routing', icon: <Route className="w-4 h-4" />, adminOnly: true },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, adminOnly: true },
];

export function AdminTicketsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam || 'tickets');

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">Please log in to access ticket management.</p>
        </div>
      </div>
    );
  }

  // Check if user is admin or event director
  if (profile.role !== 'admin' && profile.role !== 'event_director') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-red-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // If viewing a specific ticket, show the detail view
  if (id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <TicketDetail
            ticketId={id}
            currentUserId={profile.id}
            isStaff={true}
          />
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tickets':
        return <TicketManagement currentUserId={profile.id} />;
      case 'staff':
        return <TicketStaffManagement />;
      case 'departments':
        return <TicketDepartmentManagement />;
      case 'routing':
        return <TicketRoutingRules />;
      case 'settings':
        return <TicketSystemSettings />;
      default:
        return <TicketManagement currentUserId={profile.id} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Support Tickets</h1>
            <p className="text-gray-400">Manage and respond to support tickets</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-slate-700">
          <nav className="flex items-center gap-1 overflow-x-auto pb-px">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}

export default AdminTicketsPage;
