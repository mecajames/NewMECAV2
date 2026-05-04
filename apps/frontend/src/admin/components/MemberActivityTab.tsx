import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { Activity, Monitor, Smartphone, Clock, ExternalLink, EyeOff } from 'lucide-react';

interface PageVisit {
  id: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  viewedAt: string;
  durationMs?: number;
}

interface SessionGroup {
  sessionId: string | null;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  pageCount: number;
  osFamily?: string;
  browserFamily?: string;
  deviceType?: string;
  ipCountry?: string;
  pages: PageVisit[];
}

interface ActivityResponse {
  totalViews: number;
  sessionCount: number;
  sessions: SessionGroup[];
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remSeconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function DeviceIcon({ type }: { type?: string }) {
  const cls = 'h-4 w-4 text-slate-400';
  if (type === 'mobile' || type === 'tablet') return <Smartphone className={cls} />;
  return <Monitor className={cls} />;
}

interface Props {
  member: { id: string; analytics_opt_out?: boolean };
}

/**
 * Site Activity tab on the admin member detail page. Pulls per-member
 * page-view history grouped by session. Honors the member's opt-out
 * preference by displaying a notice instead of fetching when set.
 */
export default function MemberActivityTab({ member }: Props) {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!member.id) return;
    if (member.analytics_opt_out) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    axios.get<ActivityResponse>(`/api/admin/member-activity/${member.id}?limit=200`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || err.message || 'Failed to load activity'))
      .finally(() => setLoading(false));
  }, [member.id, member.analytics_opt_out]);

  // Auto-expand the most recent session so admins see something useful immediately
  useEffect(() => {
    if (data && data.sessions.length > 0) {
      const first = data.sessions[0].sessionId ?? 'no-session';
      setExpandedSessions(new Set([first]));
    }
  }, [data]);

  const toggleSession = (key: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (member.analytics_opt_out) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 text-center">
        <EyeOff className="h-12 w-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-2">This member has opted out of activity tracking</h3>
        <p className="text-slate-400 text-sm">
          Their page views are not recorded. They can re-enable tracking from their account
          Privacy panel at any time.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
        Loading activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-xl p-6 text-red-300">
        {error}
      </div>
    );
  }

  if (!data || data.sessions.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 text-center">
        <Activity className="h-12 w-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-1">No activity recorded yet</h3>
        <p className="text-slate-400 text-sm">
          Page views are tracked from the moment a member signs in. Once they navigate the
          site you'll see their sessions here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Total page views</div>
          <div className="text-white text-2xl font-bold mt-1">{data.totalViews.toLocaleString()}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Sessions</div>
          <div className="text-white text-2xl font-bold mt-1">{data.sessionCount}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Window</div>
          <div className="text-white text-sm font-medium mt-2">Last 200 page views</div>
        </div>
      </div>

      <div className="space-y-3">
        {data.sessions.map((session) => {
          const key = session.sessionId ?? 'no-session';
          const expanded = expandedSessions.has(key);
          return (
            <div key={key} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <button
                onClick={() => toggleSession(key)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <DeviceIcon type={session.deviceType} />
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium">
                      {formatTimestamp(session.startedAt)}
                      <span className="text-slate-500 font-normal mx-2">·</span>
                      <span className="text-slate-300">{session.pageCount} pages</span>
                      <span className="text-slate-500 font-normal mx-2">·</span>
                      <span className="text-slate-300">{formatDuration(session.durationMs)}</span>
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5 truncate">
                      {session.osFamily || 'Unknown OS'}
                      {session.osFamily && session.browserFamily && <span className="mx-1.5">·</span>}
                      {session.browserFamily || ''}
                      {session.ipCountry && <><span className="mx-1.5">·</span>{session.ipCountry}</>}
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 text-xs">{expanded ? 'Hide' : 'Show'} pages</span>
              </button>
              {expanded && (
                <div className="border-t border-slate-700/60 divide-y divide-slate-700/40">
                  {session.pages.map((p) => (
                    <div key={p.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-slate-700/20">
                      <Clock className="h-3.5 w-3.5 text-slate-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm flex items-center gap-2">
                          <code className="text-orange-400 text-xs bg-slate-900/60 px-1.5 py-0.5 rounded">{p.pagePath}</code>
                          {p.pageTitle && <span className="text-slate-300 text-xs truncate">— {p.pageTitle}</span>}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>{formatTimestamp(p.viewedAt)}</span>
                          <span>spent {formatDuration(p.durationMs)}</span>
                          {p.referrer && (
                            <span className="flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              from <code className="text-slate-400">{p.referrer}</code>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
