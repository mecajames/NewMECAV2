import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserCheck, UserX, ChevronRight, Star, Briefcase, ArrowLeft } from 'lucide-react';
import { getAllEventDirectors } from '@/event-directors/event-directors.api-client';

export default function EventDirectorsAdminPage() {
  const navigate = useNavigate();
  const [eventDirectors, setEventDirectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    isActive: undefined as boolean | undefined,
    search: '',
  });

  useEffect(() => {
    fetchEventDirectors();
  }, [filters.isActive]);

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
            <h1 className="text-3xl font-bold text-white">Manage Event Directors</h1>
            <p className="text-gray-400 mt-2">View and manage all approved event directors</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
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
    </div>
  );
}
