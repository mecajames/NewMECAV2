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
  Key,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { profilesApi } from '../../api-client/profiles.api-client';
import { notificationsApi } from '../../api-client/notifications.api-client';
import { Profile } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';

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
  const { user } = useAuth();
  const [member, setMember] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (memberId && memberId !== 'new' && !permLoading) {
      fetchMember();
    } else if (memberId === 'new') {
      setLoading(false);
    }
  }, [memberId, permLoading]);

  const fetchMember = async () => {
    try {
      // Check if memberId is a number (MECA ID) or UUID
      const isNumeric = /^\d+$/.test(memberId!);

      let data: any = null;

      if (isNumeric) {
        // MECA ID lookup - TODO: Backend should support getProfileByMecaId endpoint
        // For now, fetch all profiles and filter (inefficient - needs backend support)
        const allProfiles = await profilesApi.getProfiles(1, 1000); // Fetch large batch
        data = allProfiles.find((p: any) => p.meca_id === parseInt(memberId!));

        if (!data) {
          throw new Error('Member not found');
        }
      } else {
        // UUID lookup
        data = await profilesApi.getProfile(memberId!);
      }

      // Add computed full_name
      if (data) {
        data.full_name = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      }

      setMember(data);
    } catch (error) {
      console.error('Error fetching member:', error);
      alert('Error fetching member. Please try again.');
    } finally {
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

    if (!user) {
      alert('You must be logged in to send messages');
      return;
    }

    setSending(true);
    try {
      await notificationsApi.create({
        user_id: member!.id,
        from_user_id: user.id,
        title: messageTitle,
        message: messageBody,
        type: 'message',
        link: 'dashboard', // Could link to messages page when implemented
      });

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

  const handleResetPassword = async () => {
    /* MIGRATION TODO: Requires backend auth admin API
     * This feature needs a backend endpoint for admins to reset user passwords
     * Original Supabase code used: supabase.auth.admin.updateUserById(userId, { password })
     *
     * Suggested backend endpoint: POST /api/auth/admin/reset-password/:userId
     * Requires admin authentication and permissions check
     */
    alert('Password reset feature requires backend implementation. Please use "Send Password Reset Email" instead.');
    return;

    /* Original implementation preserved for reference:
    if (!newPassword.trim()) {
      alert('Please enter a new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setResettingPassword(true);
    try {
      // TODO: Replace with authApi.adminResetPassword(member.id, newPassword)

      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordResetModal(false);
      alert('Password reset successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password. This feature requires admin privileges.');
    } finally {
      setResettingPassword(false);
    }
    */
  };

  const handleSendPasswordResetEmail = async () => {
    /* MIGRATION TODO: Requires backend auth admin API
     * This feature needs a backend endpoint for admins to send password reset emails
     * Original Supabase code used: supabase.auth.resetPasswordForEmail(email, options)
     *
     * Suggested backend endpoint: POST /api/auth/admin/send-reset-email/:userId
     * Should trigger password reset email to the user
     */
    setResettingPassword(true);
    try {
      // TODO: Replace with authApi.adminSendResetEmail(member.email)
      alert('Password reset email feature requires backend implementation. Please contact support.');
      setShowPasswordResetModal(false);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      alert('Failed to send password reset email');
    } finally {
      setResettingPassword(false);
    }

    /* Original implementation preserved for reference:
    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(member!.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setShowPasswordResetModal(false);
      alert(`Password reset email sent to ${member!.email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      alert('Failed to send password reset email');
    } finally {
      setResettingPassword(false);
    }
    */
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
              {hasPermission('edit_user') && (
                <button
                  onClick={() => setShowPasswordResetModal(true)}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors inline-flex items-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  Reset Password
                </button>
              )}
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

        {/* Reset Password Modal */}
        {showPasswordResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-4">
                Reset Password for {member.first_name} {member.last_name}
              </h2>

              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-300">
                    You can either set a new password directly or send a password reset email to the user.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm text-gray-400 mb-3">Or send a password reset email:</p>
                  <button
                    onClick={handleSendPasswordResetEmail}
                    disabled={resettingPassword}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send Password Reset Email to {member.email}
                  </button>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowPasswordResetModal(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                    disabled={resettingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resettingPassword || !newPassword || !confirmPassword}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <Key className="h-4 w-4" />
                    {resettingPassword ? 'Resetting...' : 'Reset Password'}
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
    /* MIGRATION TODO: Requires multiple backend APIs
     * This overview tab needs the following backend API endpoints:
     * 1. Orders API - GET /api/orders/by-member/:memberId (with total_amount)
     * 2. Events API - GET /api/event-registrations/by-user/:userId
     * 3. Results API - GET /api/competition-results/by-competitor/:competitorId
     * 4. Teams API - GET /api/teams/by-member/:memberId
     *
     * For now, the stats will show zeros and placeholders
     */

    // TODO: Replace with actual API calls once endpoints are created
    const orders = { count: 0, data: [] };
    const events = { count: 0, data: [] };
    const results = { count: 0, data: [] };
    const team = { data: [] };

    /* Original Supabase queries preserved for reference:
    const [orders, events, results, team] = await Promise.all([
      supabase.from('orders').select('id, total_amount', { count: 'exact' }).eq('member_id', member.id),
      supabase.from('event_registrations').select('id', { count: 'exact' }).eq('user_id', member.id),
      supabase.from('competition_results').select('id', { count: 'exact' }).eq('competitor_id', member.id).eq('placement', 1),
      supabase.from('team_members').select('team:teams(name)').eq('member_id', member.id).limit(1),
    ]);
    */

    const totalSpent = orders.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    setStats({
      totalOrders: orders.count || 0,
      eventsAttended: events.count || 0,
      trophiesWon: results.count || 0,
      totalSpent,
      teamName: team.data?.[0]?.team?.name || null,
      lastLogin: member.updated_at,
    });

    // Fetch recent activity (last 5 items)
    const activity: any[] = [];

    // TODO: Implement when backend APIs are available
    /* Original Supabase queries for recent activity:

    // Recent orders
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(2);

    recentOrders?.forEach(order => {
      activity.push({
        type: 'order',
        date: order.created_at,
        description: `Placed order ${order.order_number}`,
        icon: '🛒',
      });
    });

    // Recent event registrations
    const { data: recentRegs } = await supabase
      .from('event_registrations')
      .select('*, events!event_registrations_event_id_fkey(title)')
      .eq('user_id', member.id)
      .order('registration_date', { ascending: false })
      .limit(2);

    recentRegs?.forEach(reg => {
      activity.push({
        type: 'registration',
        date: reg.registration_date,
        description: `Registered for ${reg.events?.title || 'event'}`,
        icon: '📅',
      });
    });

    // Recent results
    const { data: recentResults } = await supabase
      .from('competition_results')
      .select('*, events!competition_results_event_id_fkey(title)')
      .eq('competitor_id', member.id)
      .order('created_at', { ascending: false })
      .limit(2);

    recentResults?.forEach(result => {
      activity.push({
        type: 'result',
        date: result.created_at,
        description: `Placed ${result.placement}${getOrdinalSuffix(result.placement)} in ${result.events?.title || 'event'}`,
        icon: result.placement === 1 ? '🏆' : '🎯',
      });
    });
    */

    // Sort by date and take top 5
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecentActivity(activity.slice(0, 5));

    // Fetch upcoming events
    // TODO: Implement when backend event registration API is available
    const upcoming: any[] = [];

    /* Original Supabase query for upcoming events:
    const { data: allRegistrations } = await supabase
      .from('event_registrations')
      .select('*, events!event_registrations_event_id_fkey(title, event_date)')
      .eq('user_id', member.id);

    // Filter and sort in JavaScript since Supabase doesn't support filtering/ordering by foreign table fields
    const now = new Date();
    const upcoming = (allRegistrations || [])
      .filter(reg => {
        if (!reg.events?.event_date) return false;
        const eventDate = new Date(reg.events.event_date);
        return eventDate > now;
      })
      .sort((a, b) => {
        const dateA = new Date(a.events?.event_date || 0);
        const dateB = new Date(b.events?.event_date || 0);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 3);
    */

    setUpcomingEvents(upcoming);
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
    role: member.role,
    membership_status: member.membership_status,
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
      await profilesApi.updateProfile(member.id, formData);

      setIsEditing(false);
      onUpdate();
      alert('Member information updated successfully!');
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
      role: member.role,
      membership_status: member.membership_status,
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
          <h3 className="text-lg font-semibold text-white mb-4">Billing Address</h3>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Street Address"
                  value={formData.billing_street}
                  onChange={(e) => setFormData({ ...formData, billing_street: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <input
                type="text"
                placeholder="City"
                value={formData.billing_city}
                onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="State"
                value={formData.billing_state}
                onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="ZIP Code"
                value={formData.billing_zip}
                onChange={(e) => setFormData({ ...formData, billing_zip: e.target.value })}
                className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="Country"
                value={formData.billing_country}
                onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          ) : member.billing_street ? (
            <div className="space-y-2 text-gray-300">
              <div>{member.billing_street}</div>
              <div>
                {member.billing_city}, {member.billing_state} {member.billing_zip}
              </div>
              <div>{member.billing_country}</div>
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
                <input
                  type="text"
                  placeholder="Street Address"
                  value={formData.shipping_street}
                  onChange={(e) => setFormData({ ...formData, shipping_street: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <input
                type="text"
                placeholder="City"
                value={formData.shipping_city}
                onChange={(e) => setFormData({ ...formData, shipping_city: e.target.value })}
                className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="State"
                value={formData.shipping_state}
                onChange={(e) => setFormData({ ...formData, shipping_state: e.target.value })}
                className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="ZIP Code"
                value={formData.shipping_zip}
                onChange={(e) => setFormData({ ...formData, shipping_zip: e.target.value })}
                className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="Country"
                value={formData.shipping_country}
                onChange={(e) => setFormData({ ...formData, shipping_country: e.target.value })}
                className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          ) : !isEditing && member.use_billing_for_shipping ? (
            <div className="text-gray-400">Same as billing address</div>
          ) : !isEditing && member.shipping_street ? (
            <div className="space-y-2 text-gray-300">
              <div>{member.shipping_street}</div>
              <div>
                {member.shipping_city}, {member.shipping_state} {member.shipping_zip}
              </div>
              <div>{member.shipping_country}</div>
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
