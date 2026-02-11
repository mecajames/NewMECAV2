import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Trophy, CreditCard, DollarSign, BookOpen, Image as ImageIcon,
  Settings, CalendarCheck, Award, Tags, Mail, Link2, Ticket, ClipboardList, QrCode,
  Store, Gavel, UserCheck, FileCheck, Briefcase, ChevronDown, ChevronUp, Star, Bell,
  ShoppingCart, Package, Megaphone, Building2, BarChart3
} from 'lucide-react';
import EventManagement from '@/events/components/EventManagement';
import ResultsEntry from '@/competition-results/components/ResultsEntryNew';
import RulebookManagement from '@/rulebooks/components/RulebookManagement';
import MediaLibrary from '@/media-files/components/MediaLibrary';
import SiteSettings from '@/site-settings/components/SiteSettings';
import EventHostingRequestsManagement from '@/event-hosting-requests/components/EventHostingRequestsManagement';
import ClassNameMappingManagement from '@/class-name-mappings/components/ClassNameMappingManagement';
import { profilesApi } from '@/profiles';
import { eventsApi } from '@/events';
import { eventRegistrationsApi } from '@/event-registrations';

type AdminView = 'overview' | 'events' | 'results' | 'users' | 'memberships' | 'rulebooks' | 'media' | 'settings' | 'hosting-requests' | 'class-mappings';

interface AdminAction {
  icon: any;
  title: string;
  description: string;
  action: string;
  color: string;
  navigateTo?: string;
}

interface AdminSection {
  id: string;
  icon: any;
  title: string;
  actions: AdminAction[];
}

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
  // Load expanded sections from localStorage, default to all collapsed
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('adminDashboardExpandedSections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    fetchStats();
  }, []);

  // Save expanded sections to localStorage when they change
  useEffect(() => {
    localStorage.setItem('adminDashboardExpandedSections', JSON.stringify(expandedSections));
  }, [expandedSections]);

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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleActionClick = (action: AdminAction) => {
    if (action.navigateTo) {
      // Open static HTML files in a new tab
      if (action.navigateTo.endsWith('.html')) {
        window.open(action.navigateTo, '_blank');
      } else {
        navigate(action.navigateTo);
      }
    } else {
      setCurrentView(action.action as AdminView);
    }
  };

  // Define admin sections with grouped actions
  const adminSections: AdminSection[] = [
    {
      id: 'events',
      icon: Calendar,
      title: 'Event Management',
      actions: [
        {
          icon: Calendar,
          title: 'Manage Events',
          description: 'Create, edit, and manage competition events',
          action: 'events',
          color: 'orange',
        },
        {
          icon: Trophy,
          title: 'Enter Results',
          description: 'Add and manage competition results',
          action: 'results',
          color: 'yellow',
        },
        {
          icon: ClipboardList,
          title: 'Event Registrations',
          description: 'Manage event registrations and check-ins',
          action: 'event-registrations',
          color: 'emerald',
          navigateTo: '/admin/event-registrations',
        },
        {
          icon: QrCode,
          title: 'QR Check-In',
          description: 'Scan competitor QR codes at events',
          action: 'qr-checkin',
          color: 'cyan',
          navigateTo: '/admin/check-in',
        },
      ],
    },
    {
      id: 'members',
      icon: Users,
      title: 'User & Member Management',
      actions: [
        {
          icon: Users,
          title: 'Manage Members',
          description: 'View and manage member accounts and roles',
          action: 'users',
          color: 'blue',
          navigateTo: '/admin/members',
        },
        {
          icon: CreditCard,
          title: 'Memberships',
          description: 'Manage membership purchases and renewals',
          action: 'memberships',
          color: 'green',
          navigateTo: '/admin/membership-types',
        },
        {
          icon: DollarSign,
          title: 'Billing',
          description: 'Manage orders, invoices, and revenue',
          action: 'billing',
          color: 'lime',
          navigateTo: '/admin/billing',
        },
      ],
    },
    {
      id: 'competition',
      icon: Trophy,
      title: 'Competition Setup',
      actions: [
        {
          icon: Award,
          title: 'Classes Management',
          description: 'Manage competition classes and formats',
          action: 'classes',
          color: 'cyan',
          navigateTo: '/admin/classes',
        },
        {
          icon: Tags,
          title: 'Format Management',
          description: 'Manage competition format types',
          action: 'formats',
          color: 'violet',
          navigateTo: '/admin/formats',
        },
        {
          icon: Link2,
          title: 'Class Mappings',
          description: 'Map imported class names to official classes',
          action: 'class-mappings',
          color: 'amber',
        },
        {
          icon: BookOpen,
          title: 'Manage Rulebooks',
          description: 'Upload and manage rulebook PDFs',
          action: 'rulebooks',
          color: 'purple',
        },
        {
          icon: CalendarCheck,
          title: 'Season Management',
          description: 'Manage competition seasons and dates',
          action: 'seasons',
          color: 'teal',
          navigateTo: '/admin/seasons',
        },
        {
          icon: Trophy,
          title: 'World Finals',
          description: 'Manage qualified competitors and invitations',
          action: 'world-finals',
          color: 'yellow',
          navigateTo: '/admin/world-finals',
        },
        {
          icon: Award,
          title: 'Achievements',
          description: 'Manage dB clubs and achievement badges',
          action: 'achievements',
          color: 'orange',
          navigateTo: '/admin/achievements',
        },
        {
          icon: BarChart3,
          title: 'Points Configuration',
          description: 'Configure point values for competition placements',
          action: 'points-config',
          color: 'rose',
          navigateTo: '/admin/points-configuration',
        },
      ],
    },
    {
      id: 'applications',
      icon: FileCheck,
      title: 'Applications & Approvals',
      actions: [
        {
          icon: Gavel,
          title: 'Judge Applications',
          description: 'Review and approve judge applications',
          action: 'judge-applications',
          color: 'indigo',
          navigateTo: '/admin/judge-applications',
        },
        {
          icon: UserCheck,
          title: 'Manage Judges',
          description: 'Manage approved judges and assignments',
          action: 'judges',
          color: 'violet',
          navigateTo: '/admin/judges',
        },
        {
          icon: FileCheck,
          title: 'Event Director Applications',
          description: 'Review and approve ED applications',
          action: 'ed-applications',
          color: 'fuchsia',
          navigateTo: '/admin/event-director-applications',
        },
        {
          icon: Briefcase,
          title: 'Manage Event Directors',
          description: 'Manage approved EDs and assignments',
          action: 'event-directors',
          color: 'purple',
          navigateTo: '/admin/event-directors',
        },
        {
          icon: Star,
          title: 'Ratings Analytics',
          description: 'View ratings for judges and event directors',
          action: 'ratings',
          color: 'yellow',
          navigateTo: '/admin/ratings',
        },
        {
          icon: Mail,
          title: 'Hosting Requests',
          description: 'Manage event hosting requests and inquiries',
          action: 'hosting-requests',
          color: 'rose',
        },
      ],
    },
    {
      id: 'tools',
      icon: Settings,
      title: 'Tools & Support',
      actions: [
        {
          icon: Ticket,
          title: 'Support Tickets',
          description: 'Manage member support tickets and inquiries',
          action: 'tickets',
          color: 'sky',
          navigateTo: '/admin/tickets',
        },
        {
          icon: Bell,
          title: 'Notifications Center',
          description: 'View all member notifications and messages',
          action: 'notifications',
          color: 'amber',
          navigateTo: '/admin/notifications',
        },
        {
          icon: ImageIcon,
          title: 'Media Library',
          description: 'Manage images, videos, and documents',
          action: 'media',
          color: 'pink',
        },
        {
          icon: Settings,
          title: 'Site Settings',
          description: 'Configure homepage and site-wide settings',
          action: 'settings',
          color: 'slate',
        },
        {
          icon: BookOpen,
          title: 'Documentation',
          description: 'View system documentation and guides',
          action: 'documentation',
          color: 'emerald',
          navigateTo: '/docs/index.html',
        },
      ],
    },
    {
      id: 'business',
      icon: Store,
      title: 'Business Directory',
      actions: [
        {
          icon: Store,
          title: 'Business Listings',
          description: 'Manage retailer and manufacturer listings',
          action: 'business-listings',
          color: 'orange',
          navigateTo: '/admin/business-listings',
        },
      ],
    },
    {
      id: 'shop',
      icon: ShoppingCart,
      title: 'MECA Shop',
      actions: [
        {
          icon: Package,
          title: 'Manage Products',
          description: 'Add, edit, and manage shop products',
          action: 'shop-products',
          color: 'emerald',
          navigateTo: '/admin/shop/products',
        },
        {
          icon: ShoppingCart,
          title: 'Shop Orders',
          description: 'View and manage customer orders',
          action: 'shop-orders',
          color: 'blue',
          navigateTo: '/admin/shop/orders',
        },
      ],
    },
    {
      id: 'advertising',
      icon: Megaphone,
      title: 'Advertising',
      actions: [
        {
          icon: Building2,
          title: 'Advertisers',
          description: 'Manage advertiser contacts and details',
          action: 'advertisers',
          color: 'orange',
          navigateTo: '/admin/advertisers',
        },
        {
          icon: ImageIcon,
          title: 'Banner Ads',
          description: 'Create and manage banner advertisements',
          action: 'banners',
          color: 'purple',
          navigateTo: '/admin/banners',
        },
        {
          icon: BarChart3,
          title: 'Banner Analytics',
          description: 'View banner impressions and click rates',
          action: 'banner-analytics',
          color: 'cyan',
          navigateTo: '/admin/banners/analytics',
        },
      ],
    },
  ];

  const getIconColorClass = (color: string) => {
    const colors: Record<string, string> = {
      orange: 'text-orange-500',
      yellow: 'text-yellow-500',
      blue: 'text-blue-500',
      green: 'text-green-500',
      purple: 'text-purple-500',
      pink: 'text-pink-500',
      indigo: 'text-indigo-500',
      teal: 'text-teal-500',
      cyan: 'text-cyan-500',
      violet: 'text-violet-500',
      rose: 'text-rose-500',
      amber: 'text-amber-500',
      sky: 'text-sky-500',
      emerald: 'text-emerald-500',
      lime: 'text-lime-500',
      fuchsia: 'text-fuchsia-500',
      slate: 'text-slate-400',
    };
    return colors[color] || 'text-slate-400';
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
        return <ResultsEntry initialEventId={selectedEventId || undefined} />;
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
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Events</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalEvents}</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Registrations</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalRegistrations}</p>
            </div>
            <Trophy className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Members</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalMembers}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Management Sections */}
      <h2 className="text-xl font-bold text-white mb-4">Management Sections</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {adminSections.map((section) => {
          const isExpanded = expandedSections[section.id];
          const SectionIcon = section.icon;

          return (
            <div key={section.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <SectionIcon className="h-5 w-5 text-slate-400" />
                  <div className="text-left">
                    <h3 className="text-white font-semibold">{section.title}</h3>
                    <p className="text-slate-400 text-sm">{section.actions.length} actions</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="border-t border-slate-700 bg-slate-800/50">
                  {section.actions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <button
                        key={action.action}
                        onClick={() => handleActionClick(action)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-slate-700/50 transition-colors text-left border-b border-slate-700/50 last:border-b-0"
                      >
                        <ActionIcon className={`h-5 w-5 ${getIconColorClass(action.color)} flex-shrink-0`} />
                        <div>
                          <p className="text-white font-medium">{action.title}</p>
                          <p className="text-slate-400 text-sm">{action.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              {currentView === 'hosting-requests' ? 'Event Request Admin' : 'Admin Dashboard'}
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              {currentView === 'hosting-requests'
                ? 'Manage and approve event hosting requests'
                : 'Complete system management and oversight'}
            </p>
          </div>
          {currentView !== 'overview' && (
            <button
              onClick={() => setCurrentView('overview')}
              className="px-4 sm:px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
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
