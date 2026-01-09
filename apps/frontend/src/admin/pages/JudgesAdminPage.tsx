import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserCheck, UserX, ChevronRight, Star, ArrowLeft } from 'lucide-react';
import { getAllJudges } from '@/judges/judges.api-client';
import { JudgeLevel } from '@newmeca/shared';

export default function JudgesAdminPage() {
  const navigate = useNavigate();
  const [judges, setJudges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    isActive: undefined as boolean | undefined,
    level: '' as string,
    specialty: '' as string,
    search: '',
  });

  useEffect(() => {
    fetchJudges();
  }, [filters.isActive, filters.level, filters.specialty]);

  const fetchJudges = async () => {
    try {
      setLoading(true);
      const data = await getAllJudges({
        isActive: filters.isActive,
        level: filters.level as JudgeLevel || undefined,
        specialty: filters.specialty || undefined,
      });
      setJudges(data);
    } catch (err) {
      setError('Failed to fetch judges');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJudges = judges.filter((judge) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    const name = `${judge.user?.first_name || ''} ${judge.user?.last_name || ''}`.toLowerCase();
    const email = (judge.user?.email || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'head':
        return 'bg-purple-500/20 text-purple-400';
      case 'senior':
        return 'bg-blue-500/20 text-blue-400';
      case 'standard':
        return 'bg-green-500/20 text-green-400';
      case 'apprentice':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Manage Judges</h1>
            <p className="text-gray-400 mt-2">View and manage all approved judges</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Levels</option>
              <option value="head">Head Judge</option>
              <option value="senior">Senior Judge</option>
              <option value="standard">Standard Judge</option>
              <option value="apprentice">Apprentice</option>
            </select>

            <select
              value={filters.specialty}
              onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Specialties</option>
              <option value="sound_quality">Sound Quality</option>
              <option value="spl">SPL</option>
              <option value="install_quality">Install Quality</option>
              <option value="all">All Categories</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{judges.length}</div>
            <div className="text-gray-400 text-sm">Total Judges</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">{judges.filter(j => j.is_active).length}</div>
            <div className="text-gray-400 text-sm">Active</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-400">{judges.filter(j => j.level === 'head').length}</div>
            <div className="text-gray-400 text-sm">Head Judges</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">{judges.filter(j => j.level === 'senior').length}</div>
            <div className="text-gray-400 text-sm">Senior Judges</div>
          </div>
        </div>

        {/* Judges List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchJudges}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : filteredJudges.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <UserCheck className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Judges Found</h3>
            <p className="text-gray-400">No judges match your current filters.</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Judge</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Specialty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredJudges.map((judge) => (
                  <tr key={judge.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold">
                          {(judge.user?.first_name?.[0] || judge.user?.email?.[0] || 'J').toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-white font-medium">
                            {judge.user?.first_name} {judge.user?.last_name}
                          </div>
                          <div className="text-gray-400 text-sm">{judge.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(judge.level)}`}>
                        {judge.level?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {judge.specialty?.replace('_', ' ') || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {judge.city}, {judge.state}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="text-white">{judge.average_rating?.toFixed(1) || '-'}</span>
                        <span className="text-gray-400 text-sm">({judge.total_events_judged || 0} events)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {judge.is_active ? (
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
                        to={`/admin/judges/${judge.id}`}
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
