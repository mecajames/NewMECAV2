import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  Trophy,
  MessageSquare,
  Image as ImageIcon,
  Users as UsersIcon,
  Settings,
  ArrowLeft,
  Send,
  ChevronDown,
  Plus,
  Check,
  X,
  Clock,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { profilesApi } from '../../api-client/profiles.api-client';
import { competitionResultsApi, CompetitionResult } from '../../api-client/competition-results.api-client';
import { membershipsApi, Membership } from '../../api-client/memberships.api-client';
import { membershipTypeConfigsApi, MembershipTypeConfig } from '../../api-client/membership-type-configs.api-client';
import { teamsApi, Team } from '../../api-client/teams.api-client';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '../../utils/countries';

type TabType =
  | 'overview'
  | 'personal'
  | 'media'
  | 'teams'
  | 'memberships'
  | 'orders'
  | 'events'
  | 'results'
  | 'communications'
  | 'permissions';

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { hasPermission, loading: permLoading } = usePermissions();
  const [member, setMember] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (memberId && !permLoading) {
      fetchMember();
    }
  }, [memberId, permLoading]);

  const fetchMember = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) throw error;

      // Add computed full_name
      if (data) {
        data.full_name = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      }

      setMember(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching member:', error);
      setLoading(false);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageBody.trim()) {
      alert('Please enter both title and message');
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: memberId,
          from_user_id: user?.id,
          title: messageTitle,
          message: messageBody,
          type: 'message',
          link: 'dashboard', // Could link to messages page when implemented
        });

      if (error) throw error;

      setMessageTitle('');
      setMessageBody('');
      setShowMessageModal(false);
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const tabGroups = [
    {
      id: 'overview',
      label: 'Overview',
      icon: User,
      tabs: [{ id: 'overview', label: 'Overview' }]
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      tabs: [
        { id: 'personal', label: 'Personal Information' },
        { id: 'media', label: 'Media & Gallery' },
        { id: 'permissions', label: 'Permissions' },
      ]
    },
    {
      id: 'membership',
      label: 'Membership',
      icon: CreditCard,
      tabs: [
        { id: 'teams', label: 'Teams' },
        { id: 'memberships', label: 'Memberships & Subscriptions' },
        { id: 'orders', label: 'Orders & Invoices' },
      ]
    },
    {
      id: 'competition',
      label: 'Competition',
      icon: Trophy,
      tabs: [
        { id: 'events', label: 'Event Registrations' },
        { id: 'results', label: 'Competition Results' },
        { id: 'communications', label: 'Communications' },
      ]
    },
  ];

  if (permLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading member...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission('view_users')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to view member details.</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Member Not Found</h2>
          <p className="text-gray-400 mb-4">The member you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/members')}
            className="text-orange-500 hover:text-orange-400 font-medium"
          >
            Back to Members
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/admin/members')}
          className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Members
        </button>

        {/* Member Header Card */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                {(member.profile_picture_url || (member.profile_images && member.profile_images.length > 0)) ? (
                  <img
                    src={member.profile_picture_url || member.profile_images?.[0]}
                    alt={member.full_name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-orange-500 flex items-center justify-center text-white text-3xl font-semibold">
                    {getInitials(member.first_name, member.last_name)}
                  </div>
                )}
              </div>

              {/* Member Info */}
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {member.first_name} {member.last_name}
                </h1>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="h-4 w-4" />
                      {member.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="font-semibold">MECA ID:</span>
                    <span className="font-mono">{member.meca_id || 'N/A'}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      member.role === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : member.role === 'event_director'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {member.role.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      member.membership_status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : member.membership_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {member.membership_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {hasPermission('send_emails') && (
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send Message
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation - Grouped Dropdowns */}
        <div className="bg-slate-800 rounded-lg shadow-sm mb-6">
          <div className="border-b border-slate-700">
            <nav className="flex gap-2 px-4 py-2">
              {tabGroups.map((group) => {
                const Icon = group.icon;
                const isActive = group.tabs.some(tab => tab.id === activeTab);
                const isSingleTab = group.tabs.length === 1;

                if (isSingleTab) {
                  // For Overview - single tab, no dropdown
                  return (
                    <button
                      key={group.id}
                      onClick={() => setActiveTab(group.tabs[0].id as TabType)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                        activeTab === group.tabs[0].id
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {group.label}
                    </button>
                  );
                }

                // For grouped tabs with dropdown
                return (
                  <div key={group.id} className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === group.id ? null : group.id)}
                      onMouseEnter={() => setOpenDropdown(group.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                        isActive
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {group.label}
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {openDropdown === group.id && (
                      <div
                        className="absolute top-full left-0 mt-1 w-64 z-10"
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        <div className="bg-slate-700 rounded-lg shadow-xl border border-slate-600 py-2">
                          {group.tabs.map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => {
                                setActiveTab(tab.id as TabType);
                                setOpenDropdown(null);
                              }}
                              className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                                activeTab === tab.id
                                  ? 'bg-orange-500 text-white'
                                  : 'text-gray-300 hover:bg-slate-600'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-6">
          {activeTab === 'overview' && <OverviewTab member={member} />}
          {activeTab === 'personal' && <PersonalInfoTab member={member} onUpdate={fetchMember} />}
          {activeTab === 'media' && <MediaGalleryTab member={member} />}
          {activeTab === 'teams' && <TeamsTab member={member} />}
          {activeTab === 'memberships' && <MembershipsTab member={member} />}
          {activeTab === 'orders' && <OrdersInvoicesTab member={member} />}
          {activeTab === 'events' && <EventRegistrationsTab member={member} />}
          {activeTab === 'results' && <CompetitionResultsTab member={member} />}
          {activeTab === 'communications' && <CommunicationsTab member={member} />}
          {activeTab === 'permissions' && <PermissionsTab member={member} />}
        </div>

        {/* Send Message Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-4">
                Send Message to {member.first_name} {member.last_name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    placeholder="Message subject..."
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowMessageModal(false);
                      setMessageTitle('');
                      setMessageBody('');
                    }}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                    disabled={sending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={sending}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tab Components (Placeholders - will be built in separate files)
function OverviewTab({ member }: { member: Profile }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    eventsAttended: 0,
    trophiesWon: 0,
    totalSpent: 0,
    teamName: null as string | null,
    lastLogin: null as string | null,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchOverviewData();
  }, [member.id]);

  const fetchOverviewData = async () => {
    // TODO: Replace with backend API calls once endpoints are created
    // Currently commented out to prevent architectural violations

    setStats({
      totalOrders: 0, // TODO: Implement via backend API
      eventsAttended: 0, // TODO: Implement via backend API
      trophiesWon: 0, // TODO: Implement via backend API
      totalSpent: 0, // TODO: Implement via backend API
      teamName: null, // TODO: Implement via backend API
      lastLogin: member.updated_at,
    });

    // TODO: Fetch recent activity via backend API
    const activity: any[] = [];
    setRecentActivity(activity);

    // TODO: Fetch upcoming events via backend API
    setUpcomingEvents([]);
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const getMembershipColor = () => {
    switch (member.membership_status) {
      case 'active': return 'bg-green-600';
      case 'pending': return 'bg-yellow-600';
      case 'expired': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getMembershipExpiry = () => {
    if (!member.membership_expiry) return null;
    const expiry = new Date(member.membership_expiry);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { text: 'Expired', warning: true };
    if (daysUntilExpiry < 30) return { text: `Expires in ${daysUntilExpiry} days`, warning: true };
    return { text: `Expires ${expiry.toLocaleDateString()}`, warning: false };
  };

  const expiryInfo = getMembershipExpiry();

  return (
    <div>
      {/* Membership Status Banner */}
      {member.membership_status !== 'none' && (
        <div className={`${getMembershipColor()} rounded-lg p-4 mb-6 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <CreditCard className="h-8 w-8 text-white" />
            <div>
              <h3 className="text-white font-bold text-lg">
                {member.membership_status.charAt(0).toUpperCase() + member.membership_status.slice(1)} Member
              </h3>
              {expiryInfo && (
                <p className={`text-sm ${expiryInfo.warning ? 'text-yellow-200' : 'text-white'}`}>
                  {expiryInfo.text}
                </p>
              )}
            </div>
          </div>
          {expiryInfo?.warning && (
            <button className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium">
              Renew Now
            </button>
          )}
        </div>
      )}

      <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Member Since</div>
          <div className="text-xl font-bold text-white">
            {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Orders</div>
          <div className="text-xl font-bold text-white">{stats.totalOrders}</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Events Attended</div>
          <div className="text-xl font-bold text-white">{stats.eventsAttended}</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Trophies Won</div>
          <div className="text-xl font-bold text-white">{stats.trophiesWon}</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Lifetime Value</div>
          <div className="text-xl font-bold text-white">${stats.totalSpent.toFixed(2)}</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-slate-700 rounded-lg">
                No recent activity
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.description}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(activity.date).toLocaleDateString()} at {new Date(activity.date).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-slate-700 rounded-lg">
                No upcoming events
              </div>
            ) : (
              upcomingEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{event.events?.title || 'Event'}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {event.events?.event_date ? new Date(event.events.event_date).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Team Information */}
      {stats.teamName && (
        <div className="bg-slate-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-orange-500" />
            Team Membership
          </h3>
          <p className="text-gray-300">Member of: <span className="text-white font-semibold">{stats.teamName}</span></p>
        </div>
      )}
    </div>
  );
}

function PersonalInfoTab({ member, onUpdate }: { member: Profile; onUpdate: () => void }) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_user');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: member.first_name,
    last_name: member.last_name,
    phone: member.phone || '',
    meca_id: member.meca_id || '',
    role: member.role,
    membership_status: member.membership_status,
    address: member.address || '',
    city: member.city || '',
    state: member.state || '',
    postal_code: member.postal_code || '',
    country: member.country || 'US',
    billing_street: member.billing_street || '',
    billing_city: member.billing_city || '',
    billing_state: member.billing_state || '',
    billing_zip: member.billing_zip || '',
    billing_country: member.billing_country || '',
    shipping_street: member.shipping_street || '',
    shipping_city: member.shipping_city || '',
    shipping_state: member.shipping_state || '',
    shipping_zip: member.shipping_zip || '',
    shipping_country: member.shipping_country || '',
    use_billing_for_shipping: member.use_billing_for_shipping || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!canEdit) return;

    setSaving(true);
    try {
      await profilesApi.update(member.id, formData);

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to update member information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone || '',
      meca_id: member.meca_id || '',
      role: member.role,
      membership_status: member.membership_status,
      address: member.address || '',
      city: member.city || '',
      state: member.state || '',
      postal_code: member.postal_code || '',
      country: member.country || 'US',
      billing_street: member.billing_street || '',
      billing_city: member.billing_city || '',
      billing_state: member.billing_state || '',
      billing_zip: member.billing_zip || '',
      billing_country: member.billing_country || '',
      shipping_street: member.shipping_street || '',
      shipping_city: member.shipping_city || '',
      shipping_state: member.shipping_state || '',
      shipping_zip: member.shipping_zip || '',
      shipping_country: member.shipping_country || '',
      use_billing_for_shipping: member.use_billing_for_shipping || false,
    });
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Personal Information</h2>
        {canEdit && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white">{member.first_name}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white">{member.last_name}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <div className="px-4 py-2 bg-slate-700 rounded-lg text-gray-400">{member.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">MECA ID</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.meca_id}
                onChange={(e) => setFormData({ ...formData, meca_id: e.target.value })}
                placeholder="e.g., 700800 or 202401"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 font-mono"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white font-mono">{member.meca_id || 'Not assigned'}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white">{member.phone || 'Not provided'}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            {isEditing ? (
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="user">User</option>
                <option value="event_director">Event Director</option>
                <option value="retailer">Retailer</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white">{member.role}</div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Primary Address</h3>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value, state: '' })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getStateLabel(formData.country)}
                </label>
                {getStatesForCountry(formData.country).length > 0 ? (
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select {getStateLabel(formData.country)}</option>
                    {getStatesForCountry(formData.country).map((state) => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder={getStateLabel(formData.country)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getPostalCodeLabel(formData.country)}
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ) : member.address ? (
            <div className="space-y-2 text-gray-300">
              <div>{member.address}</div>
              <div>
                {member.city}, {member.state} {member.postal_code}
              </div>
              <div>{countries.find(c => c.code === member.country)?.name || member.country}</div>
            </div>
          ) : (
            <div className="text-gray-400">No primary address on file</div>
          )}
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Billing Address</h3>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.billing_street}
                  onChange={(e) => setFormData({ ...formData, billing_street: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={formData.billing_city}
                  onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <select
                  value={formData.billing_country}
                  onChange={(e) => setFormData({ ...formData, billing_country: e.target.value, billing_state: '' })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.billing_country ? getStateLabel(formData.billing_country) : 'State'}
                </label>
                {formData.billing_country && getStatesForCountry(formData.billing_country).length > 0 ? (
                  <select
                    value={formData.billing_state}
                    onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select {getStateLabel(formData.billing_country)}</option>
                    {getStatesForCountry(formData.billing_country).map((state) => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.billing_state}
                    onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                    placeholder={formData.billing_country ? getStateLabel(formData.billing_country) : 'State'}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.billing_country ? getPostalCodeLabel(formData.billing_country) : 'ZIP Code'}
                </label>
                <input
                  type="text"
                  value={formData.billing_zip}
                  onChange={(e) => setFormData({ ...formData, billing_zip: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ) : member.billing_street ? (
            <div className="space-y-2 text-gray-300">
              <div>{member.billing_street}</div>
              <div>
                {member.billing_city}, {member.billing_state} {member.billing_zip}
              </div>
              <div>{countries.find(c => c.code === member.billing_country)?.name || member.billing_country}</div>
            </div>
          ) : (
            <div className="text-gray-400">No billing address on file</div>
          )}
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Shipping Address</h3>
          {isEditing && (
            <label className="flex items-center gap-2 mb-4 text-gray-300">
              <input
                type="checkbox"
                checked={formData.use_billing_for_shipping}
                onChange={(e) => setFormData({ ...formData, use_billing_for_shipping: e.target.checked })}
                className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500"
              />
              Same as billing address
            </label>
          )}
          {isEditing && !formData.use_billing_for_shipping ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.shipping_street}
                  onChange={(e) => setFormData({ ...formData, shipping_street: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={formData.shipping_city}
                  onChange={(e) => setFormData({ ...formData, shipping_city: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <select
                  value={formData.shipping_country}
                  onChange={(e) => setFormData({ ...formData, shipping_country: e.target.value, shipping_state: '' })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.shipping_country ? getStateLabel(formData.shipping_country) : 'State'}
                </label>
                {formData.shipping_country && getStatesForCountry(formData.shipping_country).length > 0 ? (
                  <select
                    value={formData.shipping_state}
                    onChange={(e) => setFormData({ ...formData, shipping_state: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select {getStateLabel(formData.shipping_country)}</option>
                    {getStatesForCountry(formData.shipping_country).map((state) => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.shipping_state}
                    onChange={(e) => setFormData({ ...formData, shipping_state: e.target.value })}
                    placeholder={formData.shipping_country ? getStateLabel(formData.shipping_country) : 'State'}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.shipping_country ? getPostalCodeLabel(formData.shipping_country) : 'ZIP Code'}
                </label>
                <input
                  type="text"
                  value={formData.shipping_zip}
                  onChange={(e) => setFormData({ ...formData, shipping_zip: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ) : !isEditing && member.use_billing_for_shipping ? (
            <div className="text-gray-400">Same as billing address</div>
          ) : !isEditing && member.shipping_street ? (
            <div className="space-y-2 text-gray-300">
              <div>{member.shipping_street}</div>
              <div>
                {member.shipping_city}, {member.shipping_state} {member.shipping_zip}
              </div>
              <div>{countries.find(c => c.code === member.shipping_country)?.name || member.shipping_country}</div>
            </div>
          ) : !isEditing ? (
            <div className="text-gray-400">No shipping address on file</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Image Violation Reasons
const IMAGE_VIOLATION_REASONS = [
  { value: 'warning', label: 'Warning', description: 'General warning about image content' },
  { value: 'offensive', label: 'Offensive', description: 'Content is offensive or harmful' },
  { value: 'inappropriate', label: 'Inappropriate', description: 'Content is not appropriate for the platform' },
  { value: 'not_within_guidelines', label: 'Not within MECA guidelines', description: 'Content violates MECA community guidelines' },
  { value: 'against_policy', label: 'Against Policy', description: 'Content violates MECA policies' },
];

interface ImageItem {
  url: string;
  type: 'profile' | 'team';
  index: number;
  teamId?: string;
  teamName?: string;
  isHidden?: boolean;
}

function MediaGalleryTab({ member }: { member: Profile }) {
  const { hasPermission } = usePermissions();
  const canModerate = hasPermission('edit_user');

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [hiddenImages, setHiddenImages] = useState<Set<string>>(new Set());
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
    fetchHiddenImages();
  }, [member.id]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const teamData = await teamsApi.getTeamByUserId(member.id);
      setTeam(teamData);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHiddenImages = async () => {
    // Fetch hidden images from a table that tracks moderation status
    try {
      const { data } = await supabase
        .from('moderated_images')
        .select('image_url')
        .eq('user_id', member.id)
        .eq('is_hidden', true);

      if (data) {
        setHiddenImages(new Set(data.map(d => d.image_url)));
      }
    } catch (error) {
      // Table might not exist yet, that's okay
      console.log('Moderated images table not available');
    }
  };

  const profileImages: ImageItem[] = (member.profile_images || []).map((url, index) => ({
    url,
    type: 'profile' as const,
    index,
    isHidden: hiddenImages.has(url),
  }));

  const teamImages: ImageItem[] = team?.galleryImages?.map((url, index) => ({
    url,
    type: 'team' as const,
    index,
    teamId: team.id,
    teamName: team.name,
    isHidden: hiddenImages.has(url),
  })) || [];

  const allImages = [...profileImages, ...teamImages];

  const handleToggleVisibility = async (image: ImageItem) => {
    if (!canModerate) return;

    setTogglingVisibility(image.url);
    try {
      const newHiddenState = !image.isHidden;

      // Upsert the moderation record
      const { error } = await supabase
        .from('moderated_images')
        .upsert({
          user_id: member.id,
          image_url: image.url,
          image_type: image.type,
          is_hidden: newHiddenState,
          moderated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,image_url' });

      if (error) throw error;

      // Update local state
      setHiddenImages(prev => {
        const newSet = new Set(prev);
        if (newHiddenState) {
          newSet.add(image.url);
        } else {
          newSet.delete(image.url);
        }
        return newSet;
      });

      // Send notification to user if hiding
      if (newHiddenState) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('notifications').insert({
          user_id: member.id,
          from_user_id: user?.id,
          title: 'Image Hidden from Public View',
          message: `One of your ${image.type === 'profile' ? 'profile' : 'team gallery'} images has been hidden from public view by an administrator. Please review your images and ensure they comply with MECA guidelines.`,
          type: 'alert',
          link: image.type === 'profile' ? '/public-profile' : `/teams/${image.teamId}`,
        });
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to update image visibility');
    } finally {
      setTogglingVisibility(null);
    }
  };

  const handleDeleteClick = (image: ImageItem) => {
    setSelectedImage(image);
    setDeleteReason('');
    setCustomMessage('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedImage) {
      return;
    }

    setDeleting(true);
    try {
      // Determine what type of image we're deleting
      const isLogo = selectedImage.type === 'team' && selectedImage.index === -1;

      // Delete from profile_images, team logo, or team gallery_images
      if (selectedImage.type === 'profile') {
        const updatedImages = (member.profile_images || []).filter((_, i) => i !== selectedImage.index);
        await profilesApi.update(member.id, { profile_images: updatedImages });
      } else if (isLogo && selectedImage.teamId) {
        // Delete team logo
        await teamsApi.updateTeam(selectedImage.teamId, { logo_url: null });
      } else if (selectedImage.type === 'team' && selectedImage.teamId) {
        // Delete from team gallery
        const updatedImages = (team?.galleryImages || []).filter((_, i) => i !== selectedImage.index);
        await teamsApi.updateTeam(selectedImage.teamId, { gallery_images: updatedImages });
      }

      // Get the reason label if provided
      const reasonLabel = deleteReason
        ? IMAGE_VIOLATION_REASONS.find(r => r.value === deleteReason)?.label || deleteReason
        : null;

      // Send notification to user
      const { data: { user } } = await supabase.auth.getUser();

      // Build notification message based on what was provided
      const imageTypeLabel = selectedImage.type === 'profile'
        ? 'profile'
        : isLogo
          ? 'team logo'
          : 'team gallery';

      let notificationTitle = 'Image Removed by MECA Admin';
      let notificationMessage = `Your ${imageTypeLabel} image has been removed by a MECA administrator.`;

      if (reasonLabel) {
        notificationTitle = `Image Removed - ${reasonLabel}`;
        notificationMessage = `Your ${imageTypeLabel} image has been removed.\n\nReason: ${reasonLabel}`;
        if (customMessage) {
          notificationMessage += `\n\nAdditional message: ${customMessage}`;
        }
      } else if (customMessage) {
        notificationMessage = `Your ${imageTypeLabel} image has been removed by a MECA administrator.\n\nMessage: ${customMessage}`;
      }

      await supabase.from('notifications').insert({
        user_id: member.id,
        from_user_id: user?.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'alert',
        link: selectedImage.type === 'profile' ? '/public-profile' : `/teams/${selectedImage.teamId}`,
      });

      // Log the moderation action
      await supabase.from('moderation_log').insert({
        user_id: member.id,
        moderator_id: user?.id,
        action: 'image_deleted',
        reason: deleteReason,
        details: {
          image_url: selectedImage.url,
          image_type: selectedImage.type,
          custom_message: customMessage,
        },
      }).catch(() => {
        // Log table might not exist
      });

      // Refresh data
      if (selectedImage.type === 'team') {
        await fetchTeamData();
      }

      setShowDeleteModal(false);
      setSelectedImage(null);
      alert('Image deleted and user notified');

      // Force refresh the page to get updated profile_images
      window.location.reload();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Media & Gallery</h2>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading media...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Media & Gallery</h2>
        {canModerate && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Shield className="h-4 w-4" />
            <span>Moderation Mode</span>
          </div>
        )}
      </div>

      {allImages.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-slate-700 rounded-lg">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <p>No images uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Profile Images Section */}
          {profileImages.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" />
                Profile Images ({profileImages.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {profileImages.map((image) => (
                  <ImageCard
                    key={`profile-${image.index}`}
                    image={image}
                    canModerate={canModerate}
                    isHidden={hiddenImages.has(image.url)}
                    togglingVisibility={togglingVisibility === image.url}
                    onToggleVisibility={() => handleToggleVisibility(image)}
                    onDelete={() => handleDeleteClick(image)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Team Images Section */}
          {teamImages.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-orange-500" />
                Team Gallery: {team?.name} ({teamImages.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {teamImages.map((image) => (
                  <ImageCard
                    key={`team-${image.index}`}
                    image={image}
                    canModerate={canModerate}
                    isHidden={hiddenImages.has(image.url)}
                    togglingVisibility={togglingVisibility === image.url}
                    onToggleVisibility={() => handleToggleVisibility(image)}
                    onDelete={() => handleDeleteClick(image)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Team Logo if available */}
          {team?.logoUrl && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-orange-500" />
                Team Logo
              </h3>
              <div className="w-48">
                <ImageCard
                  image={{
                    url: team.logoUrl,
                    type: 'team',
                    index: -1, // Special index for logo
                    teamId: team.id,
                    teamName: team.name,
                    isHidden: hiddenImages.has(team.logoUrl),
                  }}
                  canModerate={canModerate}
                  isHidden={hiddenImages.has(team.logoUrl)}
                  togglingVisibility={togglingVisibility === team.logoUrl}
                  onToggleVisibility={() => handleToggleVisibility({
                    url: team.logoUrl!,
                    type: 'team',
                    index: -1,
                    teamId: team.id,
                    teamName: team.name,
                    isHidden: hiddenImages.has(team.logoUrl!),
                  })}
                  onDelete={() => handleDeleteClick({
                    url: team.logoUrl!,
                    type: 'team',
                    index: -1, // Special index for logo
                    teamId: team.id,
                    teamName: team.name,
                    isHidden: hiddenImages.has(team.logoUrl!),
                  })}
                  isLogo={true}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Image & Send Warning</h2>
            </div>

            {/* Image Preview */}
            <div className="mb-4 flex justify-center">
              <img
                src={selectedImage.url}
                alt="Image to delete"
                className="max-h-40 rounded-lg object-contain"
              />
            </div>

            <p className="text-gray-300 mb-4">
              This will permanently delete the image and send a notification to the user. You can optionally provide a reason and message.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for Deletion (Optional)
                </label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">No specific reason</option>
                  {IMAGE_VIOLATION_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                {deleteReason && (
                  <p className="mt-1 text-sm text-gray-400">
                    {IMAGE_VIOLATION_REASONS.find(r => r.value === deleteReason)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add any additional context or instructions for the user..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="bg-slate-700 rounded-lg p-3 text-sm">
                <p className="text-gray-300">
                  <strong className="text-white">The user will receive:</strong>
                </p>
                <ul className="list-disc list-inside mt-2 text-gray-400 space-y-1">
                  <li>A notification in their notification bell</li>
                  <li>{deleteReason ? `Reason: ${IMAGE_VIOLATION_REASONS.find(r => r.value === deleteReason)?.label}` : 'Simple "Image Removed by MECA Admin" message'}</li>
                  {customMessage && <li>Your additional message</li>}
                  <li>An email notification (when mail system is active)</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedImage(null);
                    setDeleteReason('');
                    setCustomMessage('');
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Deleting...' : 'Delete & Notify User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Image Card Component for the gallery
function ImageCard({
  image,
  canModerate,
  isHidden,
  togglingVisibility,
  onToggleVisibility,
  onDelete,
  isLogo = false,
}: {
  image: ImageItem;
  canModerate: boolean;
  isHidden: boolean;
  togglingVisibility: boolean;
  onToggleVisibility: () => void;
  onDelete: () => void;
  isLogo?: boolean;
}) {
  const getTypeBadge = () => {
    if (isLogo) return 'Logo';
    if (image.type === 'profile') return 'Profile';
    return 'Team';
  };

  return (
    <div className={`relative group aspect-square rounded-lg overflow-hidden bg-slate-700 ${isHidden ? 'ring-2 ring-yellow-500' : ''}`}>
      <img
        src={image.url}
        alt={isLogo ? 'Team logo' : `${image.type} image ${image.index + 1}`}
        className={`w-full h-full object-cover transition-opacity ${isHidden ? 'opacity-50' : ''}`}
      />

      {/* Hidden Badge */}
      {isHidden && (
        <div className="absolute top-2 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
          <EyeOff className="h-3 w-3" />
          Hidden
        </div>
      )}

      {/* Type Badge */}
      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs ${isLogo ? 'bg-orange-500 text-white' : 'bg-black/60 text-white'}`}>
        {getTypeBadge()}
      </div>

      {/* Hover Actions */}
      {canModerate && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => window.open(image.url, '_blank')}
            className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            title="View full size"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
          <button
            onClick={onToggleVisibility}
            disabled={togglingVisibility}
            className={`p-2 rounded-lg transition-colors ${
              isHidden
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            } disabled:opacity-50`}
            title={isHidden ? 'Make visible' : 'Hide from public'}
          >
            {togglingVisibility ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isHidden ? (
              <Eye className="h-5 w-5" />
            ) : (
              <EyeOff className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Delete with warning"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function TeamsTab({ member }: { member: Profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Teams</h2>
      <div className="text-center py-12 text-gray-400">
        <UsersIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No team memberships</p>
      </div>
    </div>
  );
}

function MembershipsTab({ member }: { member: Profile }) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_user');
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [durationMonths, setDurationMonths] = useState(12);
  const [notes, setNotes] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberships();
    fetchMembershipTypes();
  }, [member.id]);

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const data = await membershipsApi.getAllByUserId(member.id);
      setMemberships(data);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembershipTypes = async () => {
    try {
      const data = await membershipTypeConfigsApi.getAll(true);
      setMembershipTypes(data);
    } catch (error) {
      console.error('Error fetching membership types:', error);
    }
  };

  const handleAssignMembership = async () => {
    if (!selectedTypeId) {
      alert('Please select a membership type');
      return;
    }

    setAssigning(true);
    try {
      await membershipsApi.adminAssign({
        userId: member.id,
        membershipTypeConfigId: selectedTypeId,
        durationMonths,
        notes: notes || undefined,
      });

      setShowAssignModal(false);
      setSelectedTypeId('');
      setDurationMonths(12);
      setNotes('');
      fetchMemberships();
      alert('Membership assigned successfully!');
    } catch (error) {
      console.error('Error assigning membership:', error);
      alert('Failed to assign membership');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteMembership = async (membershipId: string) => {
    if (!confirm('Are you sure you want to delete this membership? This action cannot be undone.')) {
      return;
    }

    setDeletingId(membershipId);
    try {
      await membershipsApi.delete(membershipId);
      fetchMemberships();
      alert('Membership deleted successfully!');
    } catch (error) {
      console.error('Error deleting membership:', error);
      alert('Failed to delete membership');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const getStatusBadge = (membership: Membership) => {
    if (isExpired(membership.endDate || '')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <X className="h-3 w-3" /> Expired
        </span>
      );
    }
    if (membership.paymentStatus === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Check className="h-3 w-3" /> Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3" /> {membership.paymentStatus}
      </span>
    );
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Memberships & Subscriptions</h2>
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4">Loading memberships...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Memberships & Subscriptions</h2>
        {canEdit && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Assign Membership
          </button>
        )}
      </div>

      {memberships.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-slate-700 rounded-lg">
          <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <p>No memberships found</p>
          {canEdit && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Assign First Membership
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {memberships.map((membership) => (
            <div
              key={membership.id}
              className={`bg-slate-700 rounded-lg p-4 border-l-4 ${
                isExpired(membership.endDate || '') ? 'border-red-500' : 'border-green-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {membership.membershipTypeConfig?.name || membership.membershipType}
                    </h3>
                    {getStatusBadge(membership)}
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">Category: </span>
                      <span className="text-gray-200">
                        {membership.membershipTypeConfig?.category || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Amount Paid: </span>
                      <span className="text-gray-200">
                        ${membership.amountPaid?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Start Date: </span>
                      <span className="text-gray-200">
                        {membership.startDate ? formatDate(membership.startDate) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">End Date: </span>
                      <span className={`${isExpired(membership.endDate || '') ? 'text-red-400' : 'text-gray-200'}`}>
                        {membership.endDate ? formatDate(membership.endDate) : 'N/A'}
                      </span>
                    </div>
                    {membership.transactionId && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Transaction ID: </span>
                        <span className="text-gray-200 font-mono text-xs">
                          {membership.transactionId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDeleteMembership(membership.id)}
                      disabled={deletingId === membership.id}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete membership"
                    >
                      {deletingId === membership.id ? (
                        <div className="animate-spin h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Membership Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              Assign Membership to {member.first_name} {member.last_name}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Membership Type *
                </label>
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select a membership type</option>
                  {membershipTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} - ${type.price} ({type.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (months)
                </label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value={1}>1 month</option>
                  <option value={3}>3 months</option>
                  <option value={6}>6 months</option>
                  <option value={12}>12 months (1 year)</option>
                  <option value={24}>24 months (2 years)</option>
                  <option value={36}>36 months (3 years)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Comp membership for event director"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-slate-700 rounded-lg p-3 text-sm text-gray-300">
                <p className="font-medium text-white mb-1">Note:</p>
                <p>This will create a paid membership for this user without requiring payment. The transaction will be marked as an admin assignment.</p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedTypeId('');
                    setDurationMonths(12);
                    setNotes('');
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  disabled={assigning}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignMembership}
                  disabled={assigning || !selectedTypeId}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {assigning ? 'Assigning...' : 'Assign Membership'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersInvoicesTab({ member }: { member: Profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Orders & Invoices</h2>
      <div className="text-center py-12 text-gray-400">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No orders or invoices</p>
      </div>
    </div>
  );
}

function EventRegistrationsTab({ member }: { member: Profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Event Registrations</h2>
      <div className="text-center py-12 text-gray-400">
        <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No event registrations</p>
      </div>
    </div>
  );
}

function CompetitionResultsTab({ member }: { member: Profile }) {
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [eventMap, setEventMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!member.meca_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await competitionResultsApi.getByMecaId(member.meca_id);
        setResults(data);

        // Fetch events to get event names for lookup
        // Get unique event IDs from results
        const eventIds = [...new Set(data.map(r => r.eventId || r.event_id).filter(Boolean))];
        if (eventIds.length > 0) {
          try {
            const eventsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/events`);
            if (eventsResponse.ok) {
              const events = await eventsResponse.json();
              const map: Record<string, string> = {};
              events.forEach((event: any) => {
                map[event.id] = event.title || event.name;
              });
              setEventMap(map);
            }
          } catch (eventErr) {
            console.error('Error fetching events for names:', eventErr);
          }
        }
      } catch (err) {
        console.error('Error fetching competition results:', err);
        setError('Failed to load competition results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [member.meca_id]);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>
        <div className="text-center py-12 text-red-400">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!member.meca_id) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>
        <div className="text-center py-12 text-gray-400">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <p>No MECA ID assigned - cannot look up competition results</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>
        <div className="text-center py-12 text-gray-400">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <p>No competition results found for MECA ID: {member.meca_id}</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalPoints = results.reduce((sum, r) => sum + (r.pointsEarned || r.points_earned || 0), 0);
  const totalEvents = new Set(results.map(r => r.eventId || r.event_id)).size;
  const firstPlaceCount = results.filter(r => r.placement === 1).length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Results</p>
          <p className="text-2xl font-bold text-white">{results.length}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Events Competed</p>
          <p className="text-2xl font-bold text-white">{totalEvents}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Points</p>
          <p className="text-2xl font-bold text-orange-500">{totalPoints}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">1st Place Finishes</p>
          <p className="text-2xl font-bold text-yellow-500">{firstPlaceCount}</p>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-slate-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-600">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Event</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Class</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Format</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Score</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Place</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Points</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600">
            {results.map((result) => (
              <tr key={result.id} className="hover:bg-slate-600/50">
                <td className="px-4 py-3 text-white">
                  {result.event?.name || result.event?.title || eventMap[result.eventId || result.event_id || ''] || 'Unknown Event'}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {result.competitionClass || result.competition_class}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {result.format || '-'}
                </td>
                <td className="px-4 py-3 text-center text-white font-medium">
                  {result.score?.toFixed(2) || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                    result.placement === 1 ? 'bg-yellow-500 text-black' :
                    result.placement === 2 ? 'bg-gray-300 text-black' :
                    result.placement === 3 ? 'bg-amber-600 text-white' :
                    'bg-slate-500 text-white'
                  }`}>
                    {result.placement}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-orange-400 font-medium">
                  {result.pointsEarned || result.points_earned || 0}
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">
                  {result.createdAt || result.created_at
                    ? new Date(result.createdAt || result.created_at!).toLocaleDateString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommunicationsTab({ member }: { member: Profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Communications</h2>
      <div className="text-center py-12 text-gray-400">
        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No communication history</p>
      </div>
    </div>
  );
}

function PermissionsTab({ member }: { member: Profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Permissions</h2>
      <div className="text-center py-12 text-gray-400">
        <Settings className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>Permission management coming soon</p>
      </div>
    </div>
  );
}
