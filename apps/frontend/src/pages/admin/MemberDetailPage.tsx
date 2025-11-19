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
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { profilesApi } from '../../api-client/profiles.api-client';
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
                {member.profile_picture_url ? (
                  <img
                    src={member.profile_picture_url}
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Membership Status</label>
            {isEditing ? (
              <select
                value={formData.membership_status}
                onChange={(e) => setFormData({ ...formData, membership_status: e.target.value as any })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="none">None</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white">{member.membership_status}</div>
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

// Placeholder tab components
function MediaGalleryTab({ member }: { member: Profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Media & Gallery</h2>
      <div className="text-center py-12 text-gray-400">
        <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No images uploaded yet</p>
      </div>
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
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Memberships & Subscriptions</h2>
      <div className="text-center py-12 text-gray-400">
        <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No active memberships</p>
      </div>
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
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>
      <div className="text-center py-12 text-gray-400">
        <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No competition results</p>
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
