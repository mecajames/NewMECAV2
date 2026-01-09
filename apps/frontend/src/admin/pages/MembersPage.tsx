import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, UserPlus, Mail, Phone, ArrowLeft, Eye, UserCog, Trash2, AlertTriangle, Loader2, ChevronDown, ChevronRight, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { usePermissions } from '@/auth';
import AdminUserWizard from '../components/AdminUserWizard';

// Secondary membership info for nested display
interface SecondaryMembershipInfo {
  id: string;
  competitorName: string;
  mecaId?: number;
  category: string;
  hasTeamAddon: boolean;
  paymentStatus: string;
  endDate?: string;
  createdAt: string;
  masterMembershipId: string;
  hasOwnLogin: boolean;
  userId: string; // Profile ID - either their own (if hasOwnLogin) or master's
}

interface MembershipInfo {
  id: string;
  category: string;
  hasTeamAddon: boolean;
  paymentStatus: string;
  endDate?: string;
  accountType?: string;
  // Secondary memberships attached to this master
  secondaries: SecondaryMembershipInfo[];
}

interface MemberWithMembership extends Profile {
  membershipInfo?: MembershipInfo;
  masterProfileName?: string; // For secondary profiles, the name of their master
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function MembersPage() {
  const navigate = useNavigate();
  const { hasPermission, loading: permLoading } = usePermissions();
  const [members, setMembers] = useState<MemberWithMembership[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'meca_id' | 'created_at'>('name');
  const [showUserWizard, setShowUserWizard] = useState(false);

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<MemberWithMembership | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Impersonation state
  const [impersonateLoading, setImpersonateLoading] = useState<string | null>(null);

  // Expanded rows state for hierarchical view (tracks which members have their secondaries expanded)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // Total count including secondaries
  const [totalMembershipCount, setTotalMembershipCount] = useState(0);

  const toggleMemberExpanded = (memberId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (!permLoading) {
      fetchMembers();
    }
  }, [permLoading]);

  useEffect(() => {
    filterAndSortMembers();
  }, [members, searchTerm, roleFilter, membershipTypeFilter, statusFilter, sortBy]);

  const fetchMembers = async () => {
    try {
      // Fetch profiles EXCLUDING secondary profiles
      // Secondary profiles are shown nested under their masters in the hierarchical view
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          masterProfile:master_profile_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .or('is_secondary_account.is.null,is_secondary_account.eq.false')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch ALL memberships with their type configs
      // This includes master, independent, AND secondary memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          meca_id,
          competitor_name,
          has_team_addon,
          payment_status,
          end_date,
          account_type,
          master_membership_id,
          has_own_login,
          created_at,
          membership_type_configs (
            category
          )
        `)
        .in('payment_status', ['paid', 'pending'])
        .order('created_at', { ascending: false });

      if (membershipsError) throw membershipsError;

      // Build a map of user_id -> best membership info
      // Each profile gets their own membership info (including secondaries)
      const membershipMap = new Map<string, MembershipInfo & { priority: number }>();

      // Also build a map of master membership IDs to their secondaries for the tree view
      const secondariesByMaster = new Map<string, SecondaryMembershipInfo[]>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (membershipsData || []).forEach((m: any) => {
        const config = Array.isArray(m.membership_type_configs)
          ? m.membership_type_configs[0]
          : m.membership_type_configs;
        if (!config) return;

        const isPaid = m.payment_status === 'paid';
        const isSecondary = m.account_type === 'secondary';
        const priority = isPaid ? 0 : 1;

        // Map membership to its profile (user_id)
        const existing = membershipMap.get(m.user_id);
        if (!existing || priority < existing.priority) {
          membershipMap.set(m.user_id, {
            id: m.id,
            category: config.category,
            hasTeamAddon: m.has_team_addon,
            paymentStatus: m.payment_status,
            endDate: m.end_date || undefined,
            accountType: m.account_type,
            secondaries: [], // Will be populated below for masters
            priority,
          });
        }

        // Also track secondaries by their master for the tree view
        if (isSecondary && m.master_membership_id) {
          const secondary: SecondaryMembershipInfo = {
            id: m.id,
            competitorName: m.competitor_name || 'Unknown',
            mecaId: m.meca_id,
            category: config.category,
            hasTeamAddon: m.has_team_addon,
            paymentStatus: m.payment_status,
            endDate: m.end_date || undefined,
            createdAt: m.created_at,
            masterMembershipId: m.master_membership_id,
            hasOwnLogin: m.has_own_login || false,
            userId: m.user_id,
          };
          const existingSecondaries = secondariesByMaster.get(m.master_membership_id) || [];
          existingSecondaries.push(secondary);
          secondariesByMaster.set(m.master_membership_id, existingSecondaries);
        }
      });

      // Attach secondaries to their master membership info
      membershipMap.forEach((info) => {
        if (info.accountType === 'master' || info.accountType === 'independent') {
          const secondaries = secondariesByMaster.get(info.id) || [];
          info.secondaries = secondaries;
        }
      });

      // Merge profiles with membership info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const membersWithData: MemberWithMembership[] = (profilesData || []).map((member: any) => ({
        ...member,
        full_name: member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
        membershipInfo: membershipMap.get(member.id),
        // Add master profile info for display
        masterProfileName: member.masterProfile
          ? `${member.masterProfile.first_name || ''} ${member.masterProfile.last_name || ''}`.trim()
          : undefined,
      }));

      setMembers(membersWithData);
      setTotalMembershipCount(membershipsData?.length || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching members:', error);
      setLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteClick = (member: MemberWithMembership, e: React.MouseEvent) => {
    e.stopPropagation();
    setMemberToDelete(member);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profiles/admin/delete-user/${memberToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Refresh the members list
      fetchMembers();
      setDeleteModalOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle impersonate user
  const handleImpersonate = async (member: MemberWithMembership, e: React.MouseEvent) => {
    e.stopPropagation();
    setImpersonateLoading(member.id);

    try {
      // Store admin session info before impersonating (use sessionStorage for security - clears on tab close)
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (adminSession) {
        sessionStorage.setItem('adminSession', JSON.stringify({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
          user: adminSession.user,
        }));
        sessionStorage.setItem('isImpersonating', 'true');
        sessionStorage.setItem('impersonatedUserId', member.id);
        sessionStorage.setItem('impersonatedUserName', `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email);
      }

      // Get impersonation link from backend
      const response = await fetch(`${API_BASE_URL}/api/profiles/admin/impersonate/${member.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectTo: `${window.location.origin}/dashboard`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate impersonation link');
      }

      const data = await response.json();

      if (data.success && data.link) {
        // Navigate to the impersonation link
        window.location.href = data.link;
      } else {
        throw new Error(data.error || 'Failed to generate impersonation link');
      }
    } catch (error) {
      console.error('Error impersonating user:', error);
      alert('Failed to impersonate user. Please try again.');
      // Clean up stored session if impersonation failed
      localStorage.removeItem('adminSession');
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('impersonatedUserId');
      localStorage.removeItem('impersonatedUserName');
    } finally {
      setImpersonateLoading(null);
    }
  };

  const filterAndSortMembers = () => {
    let filtered = [...members];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.first_name?.toLowerCase().includes(term) ||
          member.last_name?.toLowerCase().includes(term) ||
          member.email.toLowerCase().includes(term) ||
          member.meca_id?.toString().includes(term)
      );
    }

    // Apply role filter (for staff roles)
    if (roleFilter !== 'all') {
      filtered = filtered.filter((member) => member.role === roleFilter);
    }

    // Apply membership type filter
    if (membershipTypeFilter !== 'all') {
      if (membershipTypeFilter === 'none') {
        filtered = filtered.filter((member) => !member.membershipInfo);
      } else if (membershipTypeFilter === 'competitor_team') {
        filtered = filtered.filter(
          (member) => member.membershipInfo?.category === 'competitor' && member.membershipInfo?.hasTeamAddon
        );
      } else {
        filtered = filtered.filter((member) => member.membershipInfo?.category === membershipTypeFilter);
      }
    }

    // Apply status filter (use derived status from membership info)
    if (statusFilter !== 'all') {
      filtered = filtered.filter((member) => getDerivedMembershipStatus(member.membershipInfo) === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.first_name || '').localeCompare(b.first_name || '');
        case 'meca_id':
          return (parseInt(a.meca_id || '0', 10)) - (parseInt(b.meca_id || '0', 10));
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredMembers(filtered);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'event_director':
        return 'bg-blue-100 text-blue-800';
      case 'retailer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMembershipTypeDisplay = (membershipInfo?: MembershipInfo): string => {
    if (!membershipInfo) return 'None';

    const categoryMap: Record<string, string> = {
      competitor: 'Competitor',
      retail: 'Retailer',
      manufacturer: 'Manufacturer',
      team: 'Team',
    };

    const category = categoryMap[membershipInfo.category] || membershipInfo.category;

    if (membershipInfo.category === 'competitor' && membershipInfo.hasTeamAddon) {
      return `${category} + Team`;
    }

    return category;
  };

  const getMembershipTypeBadgeColor = (membershipInfo?: MembershipInfo): string => {
    if (!membershipInfo) return 'bg-gray-100 text-gray-800';

    switch (membershipInfo.category) {
      case 'competitor':
        if (membershipInfo.hasTeamAddon) {
          return 'bg-indigo-100 text-indigo-800';
        }
        return 'bg-blue-100 text-blue-800';
      case 'retail':
        return 'bg-purple-100 text-purple-800';
      case 'manufacturer':
        return 'bg-amber-100 text-amber-800';
      case 'team':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Derive actual membership status from membership info
  const getDerivedMembershipStatus = (membershipInfo?: MembershipInfo): string => {
    if (!membershipInfo) return 'none';

    // Check payment status first
    if (membershipInfo.paymentStatus === 'pending') {
      return 'pending';
    }

    // Check if expired based on end_date
    if (membershipInfo.endDate) {
      const endDate = new Date(membershipInfo.endDate);
      const now = new Date();
      if (endDate < now) {
        return 'expired';
      }
    }

    // If paid and not expired, it's active
    if (membershipInfo.paymentStatus === 'paid') {
      return 'active';
    }

    return 'none';
  };

  if (permLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading members...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission('view_users')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to view members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Members Management</h1>
            <p className="text-gray-400">
              Manage member accounts, permissions, and information
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Add Member Button */}
        {hasPermission('create_user') && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setShowUserWizard(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              Add User
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Members
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or MECA ID..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Membership Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Membership Type
              </label>
              <select
                value={membershipTypeFilter}
                onChange={(e) => setMembershipTypeFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="competitor">Competitor</option>
                <option value="competitor_team">Competitor + Team</option>
                <option value="retail">Retailer</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="none">No Membership</option>
              </select>
            </div>

            {/* Staff Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Staff Role
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="event_director">Event Director</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          {/* Sort Options */}
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-300">Sort by:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sortBy === 'name'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                Name
              </button>
              <button
                onClick={() => setSortBy('meca_id')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sortBy === 'meca_id'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                MECA ID
              </button>
              <button
                onClick={() => setSortBy('created_at')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sortBy === 'created_at'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                Newest
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-400">
          Showing {filteredMembers.length} of {members.length} members
          {totalMembershipCount > members.filter(m => m.membershipInfo).length && (
            <span className="ml-2 text-orange-400">
              ({totalMembershipCount} total memberships including sub-accounts)
            </span>
          )}
        </div>

        {/* Members Table */}
        <div className="bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-hidden">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="w-10 px-2 py-3"></th>{/* Expand/collapse column */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    MECA ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Membership Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Staff Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                      No members found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const hasSecondaries = member.membershipInfo?.secondaries && member.membershipInfo.secondaries.length > 0;
                    const isExpanded = expandedMembers.has(member.id);

                    return (
                      <React.Fragment key={member.id}>
                        {/* Master/Primary Member Row */}
                        <tr
                          className="hover:bg-slate-700 transition-colors cursor-pointer"
                          onClick={() => navigate(`/admin/members/${member.id}`)}
                        >
                          {/* Expand/Collapse Button */}
                          <td className="px-2 py-4 whitespace-nowrap">
                            {hasSecondaries ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMemberExpanded(member.id);
                                }}
                                className="p-1 text-gray-400 hover:text-orange-400 hover:bg-slate-600 rounded transition-colors"
                                title={isExpanded ? 'Collapse sub-accounts' : `Show ${member.membershipInfo?.secondaries.length} sub-account(s)`}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5" />
                                ) : (
                                  <ChevronRight className="h-5 w-5" />
                                )}
                              </button>
                            ) : (
                              <span className="w-7 inline-block"></span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {member.profile_picture_url ? (
                                  <img
                                    src={member.profile_picture_url}
                                    alt={member.full_name}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                                    {getInitials(member.first_name, member.last_name)}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-white flex items-center gap-2">
                                  {member.first_name} {member.last_name}
                                  {(member as any).is_secondary_account && (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-purple-900 text-purple-300 rounded">
                                      Secondary
                                    </span>
                                  )}
                                </div>
                                {member.masterProfileName && (
                                  <div className="text-xs text-purple-400">
                                    Managed by {member.masterProfileName}
                                  </div>
                                )}
                                {hasSecondaries && (
                                  <div className="text-xs text-orange-400">
                                    {member.membershipInfo?.secondaries.length} sub-account{member.membershipInfo?.secondaries.length !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-white">
                              {member.meca_id || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-white flex items-center gap-1">
                              <Mail className="h-4 w-4 text-gray-400" />
                              {member.email}
                            </div>
                            {member.phone && (
                              <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                                <Phone className="h-4 w-4 text-gray-500" />
                                {member.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getMembershipTypeBadgeColor(
                                member.membershipInfo
                              )}`}
                            >
                              {getMembershipTypeDisplay(member.membershipInfo)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {member.role !== 'user' ? (
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                                  member.role
                                )}`}
                              >
                                {member.role.replace('_', ' ')}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                                getDerivedMembershipStatus(member.membershipInfo)
                              )}`}
                            >
                              {getDerivedMembershipStatus(member.membershipInfo)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* View Details */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/members/${member.id}`);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-5 w-5" />
                              </button>

                              {/* Impersonate */}
                              {hasPermission('manage_users') && (
                                <button
                                  onClick={(e) => handleImpersonate(member, e)}
                                  disabled={impersonateLoading === member.id}
                                  className="p-2 text-gray-400 hover:text-purple-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                  title={`View as ${member.first_name || member.email}`}
                                >
                                  {impersonateLoading === member.id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <UserCog className="h-5 w-5" />
                                  )}
                                </button>
                              )}

                              {/* Delete */}
                              {hasPermission('manage_users') && (
                                <button
                                  onClick={(e) => handleDeleteClick(member, e)}
                                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Secondary/Sub-account Rows (shown when expanded) */}
                        {isExpanded && member.membershipInfo?.secondaries.map((secondary) => (
                          <tr
                            key={secondary.id}
                            className="bg-slate-850 hover:bg-slate-750 transition-colors"
                            style={{ backgroundColor: 'rgb(30, 41, 59)' }}
                          >
                            {/* Indentation column */}
                            <td className="px-2 py-3"></td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center pl-6">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                                    secondary.hasOwnLogin
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-slate-600 text-gray-300'
                                  }`}>
                                    <UserMinus className="h-4 w-4" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-200 flex items-center gap-2">
                                    {secondary.competitorName}
                                    {secondary.hasOwnLogin && (
                                      <span className="px-1.5 py-0.5 text-[10px] bg-purple-900 text-purple-300 rounded">
                                        Has Login
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Secondary of {member.first_name} {member.last_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm font-mono text-gray-300">
                                {secondary.mecaId || <span className="text-yellow-500 text-xs">Pending</span>}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-gray-400 text-sm">
                              —
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                {secondary.category === 'competitor' ? 'Competitor' : secondary.category}
                                {secondary.hasTeamAddon && ' + Team'}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-500">—</span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  secondary.paymentStatus === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {secondary.paymentStatus === 'paid' ? 'active' : 'pending'}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-400">
                              {new Date(secondary.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // All secondaries have their own profile - navigate to it
                                    navigate(`/admin/members/${secondary.userId}`);
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-400 hover:bg-slate-600 rounded-lg transition-colors"
                                  title={`View ${secondary.competitorName}'s Profile`}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Admin User Wizard Modal */}
      <AdminUserWizard
        isOpen={showUserWizard}
        onClose={() => setShowUserWizard(false)}
        onSuccess={(result) => {
          setShowUserWizard(false);
          fetchMembers();
          // Navigate to the new user's detail page
          navigate(`/admin/members/${result.user.id}`);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && memberToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete User</h3>
            </div>

            <p className="text-gray-300 mb-2">
              Are you sure you want to delete this user?
            </p>

            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <p className="text-white font-medium">
                {memberToDelete.first_name} {memberToDelete.last_name}
              </p>
              <p className="text-gray-400 text-sm">{memberToDelete.email}</p>
              {memberToDelete.meca_id && (
                <p className="text-gray-400 text-sm">MECA ID: {memberToDelete.meca_id}</p>
              )}
            </div>

            <p className="text-red-400 text-sm mb-6">
              This will permanently delete the user's profile, all memberships, and their authentication account. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setMemberToDelete(null);
                }}
                disabled={deleteLoading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete User
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
