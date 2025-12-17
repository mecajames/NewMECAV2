import { useState, useEffect } from 'react';
import { Users, Search, Filter, UserPlus, Mail, Phone, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

export default function MembersPage() {
  const navigate = useNavigate();
  const { hasPermission, loading: permLoading } = usePermissions();
  const [members, setMembers] = useState<Profile[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'meca_id' | 'created_at'>('name');

  useEffect(() => {
    if (!permLoading) {
      fetchMembers();
    }
  }, [permLoading]);

  useEffect(() => {
    filterAndSortMembers();
  }, [members, searchTerm, roleFilter, statusFilter, sortBy]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add computed full_name
      const membersWithFullName = (data || []).map(member => ({
        ...member,
        full_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
      }));

      setMembers(membersWithFullName);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching members:', error);
      setLoading(false);
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

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((member) => member.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((member) => member.membership_status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.first_name || '').localeCompare(b.first_name || '');
        case 'meca_id':
          return (a.meca_id || 0) - (b.meca_id || 0);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              onClick={() => navigate('/admin/members/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              Add Member
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role
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
                  <option value="retailer">Retailer</option>
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
        </div>

        {/* Members Table */}
        <div className="bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
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
                    Role
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
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      No members found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-700 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/members/${member.id}`)}
                    >
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
                            <div className="text-sm font-medium text-white">
                              {member.first_name} {member.last_name}
                            </div>
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
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                            member.role
                          )}`}
                        >
                          {member.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                            member.membership_status
                          )}`}
                        >
                          {member.membership_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/members/${member.id}`);
                          }}
                          className="text-orange-500 hover:text-orange-400"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
