import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Trophy, Plus, CreditCard as Edit, DollarSign, BookOpen, Image as ImageIcon, Settings, CalendarCheck, Award, Tags, Mail, Link2 } from 'lucide-react';
import EventManagement from '../admin/EventManagement';
import ResultsEntry from '../admin/ResultsEntryNew';
import RulebookManagement from '../admin/RulebookManagement';
import MediaLibrary from '../admin/MediaLibrary';
import SiteSettings from '../admin/SiteSettings';
import EventHostingRequestsManagement from '../admin/EventHostingRequestsManagement';
import ClassNameMappingManagement from '../admin/ClassNameMappingManagement';
import { profilesApi } from '../../api-client/profiles.api-client';
import { eventsApi } from '../../api-client/events.api-client';
import { eventRegistrationsApi } from '../../api-client/event-registrations.api-client';

type AdminView = 'overview' | 'events' | 'results' | 'users' | 'memberships' | 'rulebooks' | 'media' | 'settings' | 'hosting-requests' | 'class-mappings';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<AdminView>('overview');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
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
    try {
      const [profileStats, eventStats, registrationStats] = await Promise.all([
        profilesApi.getStats(),
        eventsApi.getStats(),
        eventRegistrationsApi.getStats(),
      ]);

      setStats({
        totalUsers: profileStats.totalUsers,
        totalEvents: eventStats.totalEvents,
        totalRegistrations: registrationStats.totalRegistrations,
        totalMembers: profileStats.totalMembers,
      });
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      setStats({
        totalUsers: 0,
        totalEvents: 0,
        totalRegistrations: 0,
        totalMembers: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const adminActions = [
    {
      icon: Calendar,
      title: 'Manage Events',
      description: 'Create, edit, and manage competition events',
      action: 'events' as AdminView,
      color: 'orange',
      navigateTo: undefined,
    },
    {
      icon: Trophy,
      title: 'Enter Results',
      description: 'Add and manage competition results',
      action: 'results' as AdminView,
      color: 'yellow',
      navigateTo: undefined,
    },
    {
      icon: BookOpen,
      title: 'Manage Rulebooks',
      description: 'Upload and manage rulebook PDFs',
      action: 'rulebooks' as AdminView,
      color: 'purple',
      navigateTo: undefined,
    },
    {
      icon: ImageIcon,
      title: 'Media Library',
      description: 'Manage images, videos, and documents',
      action: 'media' as AdminView,
      color: 'pink',
      navigateTo: undefined,
    },
    {
      icon: Settings,
      title: 'Site Settings',
      description: 'Configure homepage and site-wide settings',
      action: 'settings' as AdminView,
      color: 'indigo',
      navigateTo: undefined,
    },
    {
      icon: Users,
      title: 'Manage Members',
      description: 'View and manage member accounts and roles',
      action: 'users' as AdminView,
      color: 'blue',
      navigateTo: '/admin/members',
    },
    {
      icon: DollarSign,
      title: 'Memberships',
      description: 'Manage membership purchases and renewals',
      action: 'memberships' as AdminView,
      color: 'green',
      navigateTo: '/admin/membership-types',
    },
    {
      icon: CalendarCheck,
      title: 'Season Management',
      description: 'Manage competition seasons and dates',
      action: 'seasons' as AdminView,
      color: 'teal',
      navigateTo: '/admin/seasons',
    },
    {
      icon: Award,
      title: 'Classes Management',
      description: 'Manage competition classes and formats',
      action: 'classes' as AdminView,
      color: 'cyan',
      navigateTo: '/admin/classes',
    },
    {
      icon: Link2,
      title: 'Class Mappings',
      description: 'Map imported class names to official classes',
      action: 'class-mappings' as AdminView,
      color: 'amber',
      navigateTo: undefined,
    },
    {
      icon: Tags,
      title: 'Format Management',
      description: 'Manage competition format types',
      action: 'formats' as AdminView,
      color: 'violet',
      navigateTo: '/admin/formats',
    },
    {
      icon: Mail,
      title: 'Hosting Requests',
      description: 'Manage event hosting requests and inquiries',
      action: 'hosting-requests' as AdminView,
      color: 'rose',
      navigateTo: undefined,
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: string } = {
      orange: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
      yellow: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
      blue: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      green: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
      purple: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
      pink: 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20',
      indigo: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20',
      teal: 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20',
      cyan: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20',
      violet: 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20',
      rose: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20',
      amber: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20',
    };
    return colors[color] || colors.orange;
  };

  const renderView = () => {
    switch (currentView) {
      case 'events':
        return <EventManagement
          onViewResults={(eventId: string) => {
            setSelectedEventId(eventId);
            setCurrentView('results');
          }}
        />;
      case 'results':
        return <ResultsEntry />;
      case 'rulebooks':
        return <RulebookManagement />;
      case 'media':
        return <MediaLibrary />;
      case 'settings':
        return <SiteSettings />;
      case 'hosting-requests':
        return <EventHostingRequestsManagement />;
      case 'class-mappings':
        return <ClassNameMappingManagement />;
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
                    onClick={() => {
                      if (action.navigateTo) {
                        navigate(action.navigateTo);
                      } else {
                        setCurrentView(action.action);
                      }
                    }}
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
            <h1 className="text-4xl font-bold text-white mb-2">
              {currentView === 'hosting-requests' ? 'Event Request Admin' : 'Admin Dashboard'}
            </h1>
            <p className="text-gray-400">
              {currentView === 'hosting-requests'
                ? 'Manage and approve event hosting requests'
                : 'Complete system management and oversight'}
            </p>
          </div>
          {currentView !== 'overview' && (
            <button
              onClick={() => setCurrentView('overview')}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              ← Back to Dashboard
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
