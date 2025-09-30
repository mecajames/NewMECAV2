import { useEffect, useState } from 'react';
import { Users, Calendar, Trophy, Plus, CreditCard as Edit, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import EventManagement from '../admin/EventManagement';
import ResultsEntry from '../admin/ResultsEntry';

interface AdminDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

type AdminView = 'overview' | 'events' | 'results' | 'users' | 'memberships';

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [currentView, setCurrentView] = useState<AdminView>('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    totalMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [users, events, registrations, members] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('event_registrations').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('membership_status', 'active'),
    ]);

    setStats({
      totalUsers: users.count || 0,
      totalEvents: events.count || 0,
      totalRegistrations: registrations.count || 0,
      totalMembers: members.count || 0,
    });

    setLoading(false);
  };

  const adminActions = [
    {
      icon: Calendar,
      title: 'Manage Events',
      description: 'Create, edit, and manage competition events',
      action: 'events' as AdminView,
      color: 'orange',
    },
    {
      icon: Trophy,
      title: 'Enter Results',
      description: 'Add and manage competition results',
      action: 'results' as AdminView,
      color: 'yellow',
    },
    {
      icon: Users,
      title: 'Manage Users',
      description: 'View and manage user accounts and roles',
      action: 'users' as AdminView,
      color: 'blue',
    },
    {
      icon: DollarSign,
      title: 'Memberships',
      description: 'Manage membership purchases and renewals',
      action: 'memberships' as AdminView,
      color: 'green',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: string } = {
      orange: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
      yellow: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
      blue: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      green: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
    };
    return colors[color] || colors.orange;
  };

  const renderView = () => {
    switch (currentView) {
      case 'events':
        return <EventManagement />;
      case 'results':
        return <ResultsEntry />;
      case 'users':
        return (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">User Management</h3>
            <p className="text-gray-400">User management interface coming soon</p>
          </div>
        );
      case 'memberships':
        return (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <DollarSign className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">Membership Management</h3>
            <p className="text-gray-400">Membership management interface coming soon</p>
          </div>
        );
      default:
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-white font-semibold text-2xl">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Events</p>
                    <p className="text-white font-semibold text-2xl">{stats.totalEvents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Registrations</p>
                    <p className="text-white font-semibold text-2xl">
                      {stats.totalRegistrations}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Active Members</p>
                    <p className="text-white font-semibold text-2xl">{stats.totalMembers}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {adminActions.map((action) => (
                  <button
                    key={action.action}
                    onClick={() => setCurrentView(action.action)}
                    className={`bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full ${getColorClasses(
                        action.color
                      )} flex items-center justify-center mb-4`}
                    >
                      <action.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {action.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{action.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Full Administrative Control
              </h3>
              <p className="text-gray-400 mb-6">
                As an administrator, you have complete access to all system features and
                data. Use the quick actions above or the navigation menu to manage your
                platform.
              </p>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Complete system management and oversight</p>
          </div>
          {currentView !== 'overview' && (
            <button
              onClick={() => setCurrentView('overview')}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              ← Back to Overview
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : (
          renderView()
        )}
      </div>
    </div>
  );
}
