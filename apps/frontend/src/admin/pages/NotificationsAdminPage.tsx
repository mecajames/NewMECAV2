import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ArrowLeft, Mail, AlertTriangle, Info, MessageSquare,
  Check, X, Trash2, User, Calendar, Eye, EyeOff, Filter,
  Send, Search, Plus, Users, Loader2
} from 'lucide-react';
import axios from '@/lib/axios';
import { profilesApi } from '@/profiles';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'system' | 'alert' | 'info';
  read: boolean;
  createdAt: string;
  readAt?: string;
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface Analytics {
  totalNotifications: number;
  unreadNotifications: number;
  readNotifications: number;
  notificationsByType: Record<string, number>;
  notificationsThisMonth: number;
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function NotificationsAdminPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterRead, setFilterRead] = useState<string>('');

  // Send notification modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    title: '',
    message: '',
    type: 'message' as 'message' | 'system' | 'alert' | 'info',
    link: '',
  });
  const [recipientMode, setRecipientMode] = useState<'single' | 'multiple' | 'allActive' | 'allUsers'>('single');
  const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<MemberOption[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [activeMemberCount, setActiveMemberCount] = useState<number | null>(null);
  const [allUserCount, setAllUserCount] = useState<number | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterType, filterRead]);

  // Fetch counts when mode changes to allActive or allUsers
  useEffect(() => {
    if ((recipientMode === 'allActive' || recipientMode === 'allUsers') && (activeMemberCount === null || allUserCount === null)) {
      fetchCounts();
    }
  }, [recipientMode]);

  const fetchCounts = async () => {
    setLoadingCounts(true);
    try {
      const [activeResponse, allResponse] = await Promise.all([
        axios.get('/api/notifications/admin/active-member-count'),
        axios.get('/api/notifications/admin/all-user-count'),
      ]);
      setActiveMemberCount(activeResponse.data.count);
      setAllUserCount(allResponse.data.count);
    } catch (err) {
      console.error('Failed to fetch counts:', err);
      setActiveMemberCount(0);
      setAllUserCount(0);
    } finally {
      setLoadingCounts(false);
    }
  };

  // Debounced member search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (memberSearch.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const results = await profilesApi.searchProfiles(memberSearch);
        const mapped = results.map((p: any) => ({
          id: p.id,
          firstName: p.first_name || '',
          lastName: p.last_name || '',
          email: p.email || '',
        }));
        // Filter out already selected members
        const filtered = mapped.filter(
          (m: MemberOption) => !selectedMembers.some(s => s.id === m.id)
        );
        setMemberSearchResults(filtered);
      } catch (err) {
        console.error('Failed to search members:', err);
      } finally {
        setSearchingMembers(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [memberSearch, selectedMembers]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterRead) params.append('read', filterRead);
      params.append('limit', '100');

      const [notifResponse, analyticsResponse] = await Promise.all([
        axios.get(`/api/notifications/admin/all?${params.toString()}`),
        axios.get('/api/notifications/admin/analytics'),
      ]);

      setNotifications(notifResponse.data.notifications);
      setTotal(notifResponse.data.total);
      setAnalytics(analyticsResponse.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    setDeleting(id);
    try {
      await axios.delete(`/api/notifications/admin/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(prev => prev - 1);
    } catch (err: any) {
      alert(err.message || 'Failed to delete notification');
    } finally {
      setDeleting(null);
    }
  };

  const handleAddMember = (member: MemberOption) => {
    if (recipientMode === 'single') {
      // Single mode: replace the selected member
      setSelectedMembers([member]);
    } else {
      // Multiple mode: add to the list
      setSelectedMembers(prev => [...prev, member]);
    }
    setMemberSearch('');
    setMemberSearchResults([]);
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleSendNotification = async () => {
    // Validate based on recipient mode
    if ((recipientMode === 'single' || recipientMode === 'multiple') && selectedMembers.length === 0) {
      alert('Please select at least one recipient');
      return;
    }
    if (recipientMode === 'allActive' && !confirm(`Are you sure you want to send this notification to ALL ${activeMemberCount} active members?`)) {
      return;
    }
    if (recipientMode === 'allUsers' && !confirm(`Are you sure you want to send this notification to ALL ${allUserCount} users in the system?`)) {
      return;
    }
    if (!sendForm.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!sendForm.message.trim()) {
      alert('Please enter a message');
      return;
    }

    setSendingNotification(true);
    try {
      const payload: any = {
        title: sendForm.title,
        message: sendForm.message,
        type: sendForm.type,
        link: sendForm.link || undefined,
      };

      if (recipientMode === 'allUsers') {
        payload.sendToAllUsers = true;
      } else if (recipientMode === 'allActive') {
        payload.sendToAllActive = true;
      } else {
        payload.recipientIds = selectedMembers.map(m => m.id);
      }

      const response = await axios.post('/api/notifications/admin/send', payload);

      alert(response.data.message || 'Notification(s) sent successfully!');
      setShowSendModal(false);
      setSendForm({ title: '', message: '', type: 'message', link: '' });
      setSelectedMembers([]);
      setRecipientMode('single');
      fetchData(); // Refresh the list
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to send notification');
    } finally {
      setSendingNotification(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <Mail className="h-4 w-4 text-blue-400" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'system':
        return <Bell className="h-4 w-4 text-purple-400" />;
      case 'info':
        return <Info className="h-4 w-4 text-green-400" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-500/20 text-blue-400';
      case 'alert':
        return 'bg-red-500/20 text-red-400';
      case 'system':
        return 'bg-purple-500/20 text-purple-400';
      case 'info':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Bell className="h-8 w-8 text-orange-400" />
              Notifications Center
            </h1>
            <p className="text-gray-400 mt-2">View and manage all member notifications</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSendModal(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Notification
            </button>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Bell className="h-6 w-6 text-orange-400" />
                <span className="text-2xl font-bold text-white">{analytics.totalNotifications}</span>
              </div>
              <p className="text-gray-400 text-sm">Total Notifications</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <EyeOff className="h-6 w-6 text-red-400" />
                <span className="text-2xl font-bold text-white">{analytics.unreadNotifications}</span>
              </div>
              <p className="text-gray-400 text-sm">Unread</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Eye className="h-6 w-6 text-green-400" />
                <span className="text-2xl font-bold text-white">{analytics.readNotifications}</span>
              </div>
              <p className="text-gray-400 text-sm">Read</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-6 w-6 text-blue-400" />
                <span className="text-2xl font-bold text-white">{analytics.notificationsThisMonth}</span>
              </div>
              <p className="text-gray-400 text-sm">This Month</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="h-6 w-6 text-purple-400" />
                <span className="text-2xl font-bold text-white">{analytics.notificationsByType['message'] || 0}</span>
              </div>
              <p className="text-gray-400 text-sm">Messages</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400 text-sm">Filters:</span>
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Types</option>
              <option value="message">Messages</option>
              <option value="alert">Alerts</option>
              <option value="system">System</option>
              <option value="info">Info</option>
            </select>

            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Status</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>

            <span className="text-gray-400 text-sm ml-auto">
              Showing {notifications.length} of {total} notifications
            </span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Bell className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No notifications found</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Title / Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Sender</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-4 text-gray-300 text-sm whitespace-nowrap">
                      {formatDate(notification.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(notification.type)}`}>
                        {getTypeIcon(notification.type)}
                        {notification.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {notification.recipient ? (
                        <div>
                          <p className="text-white text-sm font-medium">
                            {notification.recipient.firstName} {notification.recipient.lastName}
                          </p>
                          <p className="text-gray-400 text-xs">{notification.recipient.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white text-sm font-medium">{notification.title}</p>
                      <p className="text-gray-400 text-xs mt-1 max-w-xs truncate" title={notification.message}>
                        {notification.message}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {notification.sender ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-300 text-sm">
                            {notification.sender.firstName} {notification.sender.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">System</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {notification.read ? (
                        <div className="flex items-center gap-1">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-green-400 text-sm">Read</span>
                          {notification.readAt && (
                            <span className="text-gray-500 text-xs ml-1">
                              ({formatDate(notification.readAt)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <X className="h-4 w-4 text-red-500" />
                          <span className="text-red-400 text-sm">Unread</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleting === notification.id}
                        className="text-red-500 hover:text-red-400 disabled:opacity-50"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send Notification Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-orange-400" />
                  Send Notification
                </h2>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Recipients Section */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Users className="h-4 w-4 inline mr-2" />
                  Recipients
                </label>

                {/* Recipient Mode Selector */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientMode('single');
                      setSelectedMembers([]);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      recipientMode === 'single'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    Single Member
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientMode('multiple');
                      setSelectedMembers([]);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      recipientMode === 'multiple'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    Multiple
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientMode('allActive');
                      setSelectedMembers([]);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      recipientMode === 'allActive'
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    All Active Members
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientMode('allUsers');
                      setSelectedMembers([]);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      recipientMode === 'allUsers'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    All Users
                  </button>
                </div>

                {/* All Active Members Info */}
                {recipientMode === 'allActive' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Send to All Active Members</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-2">
                      {loadingCounts ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading member count...
                        </span>
                      ) : (
                        <>This will send a notification to <strong className="text-white">{activeMemberCount}</strong> member(s) with active paid memberships.</>
                      )}
                    </p>
                  </div>
                )}

                {/* All Users Info */}
                {recipientMode === 'allUsers' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Send to All Users</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-2">
                      {loadingCounts ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading user count...
                        </span>
                      ) : (
                        <>This will send a notification to <strong className="text-white">{allUserCount}</strong> user(s) in the system (regardless of membership status).</>
                      )}
                    </p>
                  </div>
                )}

                {/* Selected Members (for single/multiple mode) */}
                {(recipientMode === 'single' || recipientMode === 'multiple') && selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedMembers.map(member => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm"
                      >
                        {member.firstName} {member.lastName}
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="hover:text-orange-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Member Search (for single/multiple mode) */}
                {(recipientMode === 'single' || recipientMode === 'multiple') && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {searchingMembers ? (
                          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder={recipientMode === 'single' ? "Search for a member..." : "Search members by name or email..."}
                        className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />

                      {/* Search Results Dropdown */}
                      {memberSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {memberSearchResults.map(member => (
                            <button
                              key={member.id}
                              onClick={() => handleAddMember(member)}
                              className="w-full px-4 py-2 text-left hover:bg-slate-600 flex items-center gap-3"
                            >
                              <Plus className="h-4 w-4 text-green-400" />
                              <div>
                                <p className="text-white text-sm">
                                  {member.firstName} {member.lastName}
                                </p>
                                <p className="text-gray-400 text-xs">{member.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-gray-500 text-xs mt-2">
                      {recipientMode === 'single'
                        ? 'Type at least 2 characters to search for a member'
                        : `Type at least 2 characters to search. Selected: ${selectedMembers.length} member(s)`
                      }
                    </p>
                  </>
                )}
              </div>

              {/* Notification Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notification Type
                </label>
                <select
                  value={sendForm.type}
                  onChange={(e) => setSendForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="message">Message</option>
                  <option value="info">Info</option>
                  <option value="alert">Alert</option>
                  <option value="system">System</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={sendForm.title}
                  onChange={(e) => setSendForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Notification title..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={sendForm.message}
                  onChange={(e) => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Notification message..."
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Link (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Link (Optional)
                </label>
                <input
                  type="text"
                  value={sendForm.link}
                  onChange={(e) => setSendForm(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="/path/to/page or https://..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Add a link that users can click to navigate to relevant content
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                disabled={
                  sendingNotification ||
                  ((recipientMode === 'single' || recipientMode === 'multiple') && selectedMembers.length === 0) ||
                  ((recipientMode === 'allActive' || recipientMode === 'allUsers') && loadingCounts)
                }
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  recipientMode === 'allUsers' ? 'bg-amber-500 hover:bg-amber-600'
                    : recipientMode === 'allActive' ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {sendingNotification ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : recipientMode === 'allUsers' ? (
                  <>
                    <Send className="h-4 w-4" />
                    Send to All {allUserCount} Users
                  </>
                ) : recipientMode === 'allActive' ? (
                  <>
                    <Send className="h-4 w-4" />
                    Send to All {activeMemberCount} Active Members
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send to {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
