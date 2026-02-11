import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserCheck, UserX, ChevronRight, Star, Briefcase, ArrowLeft, Plus, X } from 'lucide-react';
import { getAllEventDirectors, createEventDirectorDirectly, AdminDirectCreateEventDirectorDto } from '@/event-directors/event-directors.api-client';
import { profilesApi } from '@/profiles';

export default function EventDirectorsAdminPage() {
  const navigate = useNavigate();
  const [eventDirectors, setEventDirectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    isActive: undefined as boolean | undefined,
    search: '',
  });

  // Create ED Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [createForm, setCreateForm] = useState({
    state: '',
    city: '',
    admin_notes: '',
    enable_permission: false,
  });

  useEffect(() => {
    fetchEventDirectors();
  }, [filters.isActive]);

  // Member search for create modal
  const searchMembers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await profilesApi.searchProfiles(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching members:', err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchMembers(memberSearch);
    }, 300);
    return () => clearTimeout(debounce);
  }, [memberSearch]);

  const handleCreateEventDirector = async () => {
    if (!selectedMember) {
      setCreateError('Please select a member');
      return;
    }
    if (!createForm.state || !createForm.city) {
      setCreateError('State and City are required');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const dto: AdminDirectCreateEventDirectorDto = {
        user_id: selectedMember.id,
        state: createForm.state,
        city: createForm.city,
        admin_notes: createForm.admin_notes || undefined,
        enable_permission: createForm.enable_permission,
      };
      await createEventDirectorDirectly(dto);
      setShowCreateModal(false);
      setSelectedMember(null);
      setMemberSearch('');
      setCreateForm({
        state: '',
        city: '',
        admin_notes: '',
        enable_permission: false,
      });
      fetchEventDirectors(); // Refresh list
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create event director');
    } finally {
      setCreating(false);
    }
  };

  const fetchEventDirectors = async () => {
    try {
      setLoading(true);
      const data = await getAllEventDirectors({
        isActive: filters.isActive,
      });
      setEventDirectors(data);
    } catch (err) {
      setError('Failed to fetch event directors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEDs = eventDirectors.filter((ed) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    const name = `${ed.user?.first_name || ''} ${ed.user?.last_name || ''}`.toLowerCase();
    const email = (ed.user?.email || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Manage Event Directors</h1>
            <p className="text-gray-400 mt-2">View and manage all approved event directors</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Event Director
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

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <select
              value={filters.isActive === undefined ? '' : filters.isActive.toString()}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value === '' ? undefined : e.target.value === 'true' })}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{eventDirectors.length}</div>
            <div className="text-gray-400 text-sm">Total Event Directors</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">{eventDirectors.filter(ed => ed.is_active).length}</div>
            <div className="text-gray-400 text-sm">Active</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-400">
              {eventDirectors.reduce((sum, ed) => sum + (ed.total_events_directed || 0), 0)}
            </div>
            <div className="text-gray-400 text-sm">Total Events Directed</div>
          </div>
        </div>

        {/* Event Directors List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchEventDirectors}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : filteredEDs.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Briefcase className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Event Directors Found</h3>
            <p className="text-gray-400">No event directors match your current filters.</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Event Director</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Events Directed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredEDs.map((ed) => (
                  <tr key={ed.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold">
                          {(ed.user?.first_name?.[0] || ed.user?.email?.[0] || 'E').toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-white font-medium">
                            {ed.user?.first_name} {ed.user?.last_name}
                          </div>
                          <div className="text-gray-400 text-sm">{ed.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {ed.city}, {ed.state}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {ed.total_events_directed || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="text-white">{ed.average_rating?.toFixed(1) || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {ed.is_active ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <UserCheck className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <UserX className="h-4 w-4" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/event-directors/${ed.id}`}
                        className="text-orange-500 hover:text-orange-400 flex items-center gap-1"
                      >
                        View <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Event Director Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Create Event Director</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{createError}</p>
                </div>
              )}

              {/* Member Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Member
                </label>
                {selectedMember ? (
                  <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                    <div>
                      <p className="text-white font-medium">
                        {selectedMember.first_name} {selectedMember.last_name}
                      </p>
                      <p className="text-gray-400 text-sm">{selectedMember.email}</p>
                    </div>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search by name, email, or MECA ID..."
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="absolute w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                        {searchResults.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              setSelectedMember(member);
                              setMemberSearch('');
                              setSearchResults([]);
                              // Pre-fill location from profile if available
                              if (member.state) setCreateForm(f => ({ ...f, state: member.state }));
                              if (member.city) setCreateForm(f => ({ ...f, city: member.city }));
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-600"
                          >
                            <p className="text-white">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-gray-400 text-sm">{member.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={createForm.state}
                    onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                    placeholder="TX"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    placeholder="Austin"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={createForm.admin_notes}
                  onChange={(e) => setCreateForm({ ...createForm, admin_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder="Any notes about this event director..."
                />
              </div>

              {/* Enable Permission Checkbox */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.enable_permission}
                    onChange={(e) => setCreateForm({ ...createForm, enable_permission: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-600 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-white font-medium">Enable dashboard permission</span>
                    <p className="text-gray-400 text-sm mt-1">
                      If checked, the member will see "My Event Directing" in their dashboard and can be assigned to events.
                      If unchecked, you'll need to enable the permission later in their member profile.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEventDirector}
                disabled={creating || !selectedMember}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Event Director'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
