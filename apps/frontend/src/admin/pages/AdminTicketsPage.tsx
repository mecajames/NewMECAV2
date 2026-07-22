import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Ticket,
  Users,
  UserCheck,
  Building2,
  Route,
  Settings,
  ArrowLeft,
  Wrench,
  ListChecks,
  Tags,
  BookOpen,
} from 'lucide-react';
import {
  TicketManagement,
  TicketDetail,
  TicketDepartmentManagement,
  TicketStaffArea,
  TicketRoutingRules,
  TicketAssignments,
  TicketCategoriesManagement,
  TicketCustomFields,
  TicketSystemSettings,
  MyTicketTools,
} from '@/tickets';
import { useAuth } from '@/auth/contexts/AuthContext';
import { isAdminUser } from '@/auth/isAdminUser';

type TabId = 'tickets' | 'mytools' | 'staff' | 'assignments' | 'departments' | 'categories' | 'routing' | 'custom-fields' | 'settings' | 'setup';

// Top row stays short so it never needs a horizontal scrollbar; all the
// configuration screens live in a sub-menu under Settings. Old ?tab= deep
// links (e.g. ?tab=routing) keep working — those ids are now sub-tabs.
const tabs: { id: TabId; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'tickets', label: 'Ticket Queue', icon: <Ticket className="w-4 h-4" /> },
  // Per-tech personal settings (signature + canned responses). Available to
  // every support tech, not just admins.
  { id: 'mytools', label: 'My Tools', icon: <Wrench className="w-4 h-4" /> },
  { id: 'staff', label: 'Staff', icon: <Users className="w-4 h-4" />, adminOnly: true },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, adminOnly: true },
];

const settingsSubTabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'assignments', label: 'Assignments', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'departments', label: 'Departments', icon: <Building2 className="w-4 h-4" /> },
  { id: 'categories', label: 'Categories', icon: <Tags className="w-4 h-4" /> },
  { id: 'custom-fields', label: 'Custom Fields', icon: <ListChecks className="w-4 h-4" /> },
  { id: 'routing', label: 'Routing', icon: <Route className="w-4 h-4" /> },
  { id: 'settings', label: 'General', icon: <Settings className="w-4 h-4" /> },
  { id: 'setup', label: 'Setup Guide', icon: <BookOpen className="w-4 h-4" /> },
];

const settingsTabIds = new Set<TabId>(settingsSubTabs.map((t) => t.id));

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
            onReplied={() => navigate('/admin/tickets')}
          />
        </div>
      </div>
    );
  }

  const isAdmin = isAdminUser(profile);
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tickets':
        return <TicketManagement currentUserId={profile.id} />;
      case 'mytools':
        return <MyTicketTools />;
      case 'staff':
        return <TicketStaffArea />;
      case 'assignments':
        return <TicketAssignments />;
      case 'departments':
        return <TicketDepartmentManagement />;
      case 'categories':
        return <TicketCategoriesManagement />;
      case 'routing':
        return <TicketRoutingRules />;
      case 'custom-fields':
        return <TicketCustomFields />;
      case 'settings':
        return <TicketSystemSettings />;
      case 'setup':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Support Ticket System — Setup Guide</h2>
                <p className="text-sm text-gray-400">
                  Step-by-step instructions for configuring departments, categories, conditional custom fields,
                  refunds, and auto-close. Written for non-technical admins.
                </p>
              </div>
              <a
                href="/docs/Admin-Support-Tickets-Setup-Guide.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Open Full Guide in New Tab
              </a>
            </div>
            <div className="bg-white rounded-xl overflow-hidden border border-slate-700" style={{ height: '75vh' }}>
              <iframe
                src="/docs/Admin-Support-Tickets-Setup-Guide.html"
                title="Support Ticket Setup Guide"
                className="w-full h-full"
                style={{ border: 'none' }}
              />
            </div>
          </div>
        );
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Support Tickets</h1>
            <p className="text-gray-400">Manage and respond to support tickets</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-slate-700">
          <nav className="flex items-center gap-1 flex-wrap">
            {visibleTabs.map((tab) => {
              const isActive =
                activeTab === tab.id ||
                (tab.id === 'settings' && settingsTabIds.has(activeTab));
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Sub-menu */}
        {isAdmin && settingsTabIds.has(activeTab) && (
          <div className="mb-6 -mt-2 flex items-center gap-2 flex-wrap">
            {settingsSubTabs.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleTabChange(sub.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === sub.id
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/40'
                    : 'bg-slate-800 text-gray-400 border border-slate-700 hover:text-white hover:border-slate-500'
                }`}
              >
                {sub.icon}
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}

export default AdminTicketsPage;
