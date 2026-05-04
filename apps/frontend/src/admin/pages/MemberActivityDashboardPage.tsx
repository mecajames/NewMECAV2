import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Users, Eye, Clock } from 'lucide-react';
import axios from '@/lib/axios';

interface DashboardData {
  windowDays: number;
  summary: {
    totalViews: number;
    distinctMembers: number;
    distinctSessions: number;
    avgDurationMs: number;
  };
  topPages: Array<{ pagePath: string; views: number; members: number }>;
  topMembers: Array<{
    userId: string; name: string; email: string; mecaId: string | null;
    views: number; sessions: number;
  }>;
  browserBreakdown: Array<{ browser: string; views: number }>;
  osBreakdown: Array<{ os: string; views: number }>;
  deviceBreakdown: Array<{ device: string; views: number }>;
}

function formatDuration(ms: number): string {
  if (!ms) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * Cross-member activity dashboard. Aggregates first-party page-view data so
 * admins can see top pages, top active members, and OS/browser/device split
 * for a configurable date window. Data here mirrors what the per-member
 * Activity tab shows but rolled up across the whole member base.
 */
export default function MemberActivityDashboardPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get<DashboardData>(`/api/admin/member-activity/dashboard?days=${days}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [days]);

  const presetDays = [1, 7, 30, 90];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/dashboard/admin')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin Dashboard
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="h-8 w-8 text-orange-500" />
              Member Activity
            </h1>
            <p className="text-slate-400 mt-1">First-party tracking of page-by-page navigation by logged-in members.</p>
          </div>
          <div className="flex gap-2">
            {presetDays.map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${days === d
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {d === 1 ? '24h' : `${d}d`}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="text-slate-400 text-sm py-12 text-center">Loading…</div>}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-xl p-6 text-red-300">{error}</div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Tile icon={<Eye className="h-5 w-5 text-orange-500" />} label="Total page views" value={data.summary.totalViews.toLocaleString()} />
              <Tile icon={<Users className="h-5 w-5 text-orange-500" />} label="Distinct members" value={data.summary.distinctMembers.toLocaleString()} />
              <Tile icon={<Activity className="h-5 w-5 text-orange-500" />} label="Distinct sessions" value={data.summary.distinctSessions.toLocaleString()} />
              <Tile icon={<Clock className="h-5 w-5 text-orange-500" />} label="Avg time per page" value={formatDuration(data.summary.avgDurationMs)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Panel title="Top pages">
                <Table
                  columns={['Page', 'Views', 'Members']}
                  rows={data.topPages.map(p => [
                    <code key="p" className="text-orange-400 text-xs">{p.pagePath}</code>,
                    p.views.toLocaleString(),
                    p.members.toLocaleString(),
                  ])}
                />
              </Panel>

              <Panel title="Most active members">
                <Table
                  columns={['Member', 'Views', 'Sessions']}
                  rows={data.topMembers.map(m => [
                    <button
                      key="m"
                      onClick={() => navigate(`/admin/members/${m.userId}`)}
                      className="text-orange-400 hover:underline text-left"
                    >
                      {m.name}
                      {m.mecaId && <span className="text-slate-500 text-xs ml-1.5">#{m.mecaId}</span>}
                    </button>,
                    m.views.toLocaleString(),
                    m.sessions.toLocaleString(),
                  ])}
                />
              </Panel>

              <Panel title="Operating system">
                <Bars items={data.osBreakdown.map(r => ({ label: r.os, value: r.views }))} />
              </Panel>

              <Panel title="Browser">
                <Bars items={data.browserBreakdown.map(r => ({ label: r.browser, value: r.views }))} />
              </Panel>

              <Panel title="Device type">
                <Bars items={data.deviceBreakdown.map(r => ({ label: r.device, value: r.views }))} />
              </Panel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-2">{icon}<span className="text-slate-400 text-xs uppercase tracking-wider">{label}</span></div>
      <div className="text-white text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <h3 className="text-white font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm py-2">No data in this window.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700/60">
            {columns.map((c, i) => (
              <th key={i} className={`text-left py-2 px-2 font-medium text-xs uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-700/30 hover:bg-slate-700/20">
              {row.map((cell, ci) => (
                <td key={ci} className={`py-2 px-2 ${ci > 0 ? 'text-right text-slate-300' : 'text-white'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bars({ items }: { items: Array<{ label: string; value: number }> }) {
  if (items.length === 0) return <p className="text-slate-500 text-sm py-2">No data in this window.</p>;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((i, idx) => (
        <div key={idx} className="text-sm">
          <div className="flex justify-between text-slate-300 mb-1">
            <span>{i.label}</span>
            <span className="text-slate-400">{i.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded"
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
