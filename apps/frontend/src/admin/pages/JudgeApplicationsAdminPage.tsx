import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search, Loader2 } from 'lucide-react';
import { getAllJudgeApplications, adminQuickCreateJudgeApplication, AdminQuickCreateJudgeApplicationDto } from '@/judges';
import type { JudgeApplication } from '@newmeca/shared';
import { supabase } from '@/lib/supabase';
import CountrySelect from '@/shared/fields/CountrySelect';
import StateProvinceSelect from '@/shared/fields/StateProvinceSelect';

type StatusFilter = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected';

interface UserSearchResult {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export default function JudgeApplicationsAdminPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<JudgeApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // User search state
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    country: 'US',
    state: '',
    city: '',
    specialty: 'both' as 'sql' | 'spl' | 'both',
    years_in_industry: 0,
    travel_radius: '100 miles',
    admin_notes: '',
  });

  useEffect(() => {
    loadApplications();
  }, [statusFilter, specialtyFilter]);

  // Search users by email or name
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch) {
        searchUsers(userSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setFormData(prev => ({
      ...prev,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    }));
    setUserSearch('');
    setUserSearchResults([]);
  };

  const handleCreateSubmit = async () => {
    if (!selectedUser) {
      setCreateError('Please select a user');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const dto: AdminQuickCreateJudgeApplicationDto = {
        user_id: selectedUser.id,
        ...formData,
      };

      await adminQuickCreateJudgeApplication(dto);
      setShowCreateModal(false);
      resetForm();
      loadApplications();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create application');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setUserSearch('');
    setFormData({
      full_name: '',
      phone: '',
      country: 'US',
      state: '',
      city: '',
      specialty: 'both',
      years_in_industry: 0,
      travel_radius: '100 miles',
      admin_notes: '',
    });
    setCreateError(null);
  };

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (specialtyFilter !== 'all') {
        filters.specialty = specialtyFilter;
      }
      const data = await getAllJudgeApplications(filters);
      setApplications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      under_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs border ${styles[status] || 'bg-gray-500/20'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getSpecialtyBadge = (specialty: string) => {
    const styles: Record<string, string> = {
      sql: 'bg-purple-500/20 text-purple-400',
      spl: 'bg-orange-500/20 text-orange-400',
      both: 'bg-teal-500/20 text-teal-400',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[specialty] || 'bg-gray-500/20'}`}>
        {specialty.toUpperCase()}
      </span>
    );
  };

  // Count applications by status
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Judge Applications</h1>
            <p className="text-slate-400">Review and manage judge applications</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Application
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{statusCounts.pending || 0}</div>
            <div className="text-slate-400 text-sm">Pending</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{statusCounts.under_review || 0}</div>
            <div className="text-slate-400 text-sm">Under Review</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{statusCounts.approved || 0}</div>
            <div className="text-slate-400 text-sm">Approved</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{statusCounts.rejected || 0}</div>
            <div className="text-slate-400 text-sm">Rejected</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Specialty</label>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
              >
                <option value="all">All Specialties</option>
                <option value="sql">SQL</option>
                <option value="spl">SPL</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Applications Table */}
        {loading ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
            <div className="text-slate-400 mt-4">Loading applications...</div>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <div className="text-slate-400">No applications found</div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Applicant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Specialty</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Experience</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Applied</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-4">
                        <div className="text-white font-medium">
                          {app.full_name || 'Unknown'}
                        </div>
                        {app.preferred_name && app.preferred_name !== app.full_name && (
                          <div className="text-slate-400 text-sm">({app.preferred_name})</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-slate-300">{app.city}, {app.state}</div>
                        <div className="text-slate-500 text-sm">{app.country}</div>
                      </td>
                      <td className="px-4 py-4">
                        {getSpecialtyBadge(app.specialty)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-slate-300">{app.years_in_industry} years</div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-slate-400 text-sm">
                          {new Date(app.application_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          to={`/admin/judge-applications/${app.id}`}
                          className="text-orange-500 hover:text-orange-400 text-sm font-medium"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Application Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Add Judge Application</h2>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {createError && (
                <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                  {createError}
                </div>
              )}

              {/* User Search */}
              <div>
                <label className="block text-slate-300 text-sm mb-2">Select User *</label>
                {selectedUser ? (
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div>
                      <div className="text-white font-medium">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </div>
                      <div className="text-slate-400 text-sm">{selectedUser.email}</div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by email or name..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                    {searchingUsers && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                    )}
                    {userSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-slate-700 rounded-lg border border-slate-600 shadow-lg max-h-48 overflow-y-auto">
                        {userSearchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleSelectUser(user)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-600 text-white"
                          >
                            <div className="font-medium">{user.first_name} {user.last_name}</div>
                            <div className="text-slate-400 text-sm">{user.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CountrySelect
                  value={formData.country}
                  onChange={(code) => setFormData(prev => ({ ...prev, country: code, state: '' }))}
                  label="Country"
                  required
                  showIcon={false}
                />
                <StateProvinceSelect
                  value={formData.state}
                  onChange={(code) => setFormData(prev => ({ ...prev, state: code }))}
                  country={formData.country}
                  label="State"
                  required
                  showIcon={false}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Specialty *</label>
                  <select
                    value={formData.specialty}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value as 'sql' | 'spl' | 'both' }))}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="both">Both SQL & SPL</option>
                    <option value="sql">SQL (Sound Quality)</option>
                    <option value="spl">SPL (Sound Pressure)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Years in Industry *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.years_in_industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, years_in_industry: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Travel Radius *</label>
                  <select
                    value={formData.travel_radius}
                    onChange={(e) => setFormData(prev => ({ ...prev, travel_radius: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="50 miles">Within 50 miles</option>
                    <option value="100 miles">Within 100 miles</option>
                    <option value="250 miles">Within 250 miles</option>
                    <option value="500 miles">Within 500 miles</option>
                    <option value="nationwide">Nationwide</option>
                    <option value="international">International</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Admin Notes</label>
                <textarea
                  value={formData.admin_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-20"
                  placeholder="Optional notes about this application..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={creating || !selectedUser}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
