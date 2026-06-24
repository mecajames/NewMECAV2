import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, UserCheck, ExternalLink } from 'lucide-react';
import { profilesApi } from '@/profiles/profiles.api-client';

type Mismatch = Awaited<ReturnType<typeof profilesApi.getNameMismatches>>[number];

export default function NameMismatchReportPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Mismatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await profilesApi.getNameMismatches();
      setRows(data);
      setError(null);
    } catch (err) {
      console.error('Error loading name-mismatch report:', err);
      setError('Failed to load the report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.currentName.toLowerCase().includes(q) ||
      r.orderName.toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.mecaId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/admin/members')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Members
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
              Name Mismatches
            </h1>
            <p className="text-gray-400 mt-1 max-w-3xl">
              Members whose current account name doesn&apos;t match the name on their original membership
              order (the name that should match their credit card). These are likely members who changed
              their name after registering. Review each one, correct the name on their profile, and use
              &ldquo;Also update all competition results&rdquo; to fix their results &amp; standings.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or MECA ID…"
            className="w-full max-w-md px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length} flagged</span>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-700 rounded-lg p-4 mb-6 text-red-300 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-green-950/40 border border-green-700/50 rounded-xl p-8 flex items-center gap-3">
            <UserCheck className="h-6 w-6 text-green-400" />
            <p className="text-green-300">
              No mismatches found — every member&apos;s current name matches the name on their original order.
            </p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl shadow-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700 text-sm">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Current Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Original Order Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">MECA ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((r) => (
                  <tr key={r.profileId} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{r.currentName || '—'}</td>
                    <td className="px-4 py-3 text-amber-300 whitespace-nowrap">{r.orderName}</td>
                    <td className="px-4 py-3 text-orange-400 font-mono whitespace-nowrap">{r.mecaId ? `#${r.mecaId}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{r.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {r.orderNumber} · {formatDate(r.orderDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/admin/members/${r.profileId}`)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open & fix
                      </button>
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
