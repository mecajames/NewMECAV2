import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '@/lib/axios';
import { useAuth, isSuperAdmin } from '@/auth';
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Search,
  User,
  Lock,
  Loader2,
} from 'lucide-react';

/**
 * Super-admin-only MECA ID reassignment tool. James and Mick are the only
 * accounts authorized to perform this action.
 *
 * Workflow:
 *   1. Admin searches by member name, email, or MECA ID number.
 *   2. Match results show each member with all their memberships (active
 *      and expired) and the MECA ID stored on each.
 *   3. Admin picks the SOURCE membership (whose MECA ID will be reassigned)
 *      and the DESTINATION membership (which will receive that MECA ID).
 *      Both pickers can search independently — they may be on the same
 *      profile (the common case: returning member after admin window) or
 *      on different profiles (manual data-merge).
 *   4. Admin enters a required reason and submits. The action is logged to
 *      meca_id_history with the admin's user ID.
 */

interface MembershipRow {
  id: string;
  mecaId: number | null;
  typeName: string;
  category: string | null;
  startDate: string | null;
  endDate: string | null;
  paymentStatus: string;
  isActive: boolean;
}

interface SearchResult {
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  currentMecaId: string | null;
  membershipStatus: string | null;
  memberships: MembershipRow[];
}

function MemberSearchPanel({
  label,
  selected,
  onSelect,
  pickHint,
  filter,
}: {
  label: string;
  selected: { profile: SearchResult; membership: MembershipRow } | null;
  onSelect: (profile: SearchResult, membership: MembershipRow) => void;
  pickHint: string;
  /** Optional row-level filter (e.g. only show memberships that have a MECA ID). */
  filter?: (m: MembershipRow) => boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setSearching(true);
      setError(null);
      axios
        .get('/api/memberships/admin/meca-id/search', { params: { q: query.trim() } })
        .then((r) => setResults(r.data ?? []))
        .catch((e) => setError(e?.response?.data?.message || 'Search failed'))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  if (selected) {
    const m = selected.membership;
    return (
      <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-orange-400 mb-1">{label}</p>
            <p className="text-white font-semibold">
              {selected.profile.fullName ||
                [selected.profile.firstName, selected.profile.lastName].filter(Boolean).join(' ') ||
                'Unnamed member'}
            </p>
            <p className="text-sm text-gray-400">{selected.profile.email ?? '—'}</p>
            <div className="mt-3 text-sm">
              <p className="text-gray-300">
                <span className="text-gray-500">Membership:</span>{' '}
                <span className="text-white">{m.typeName}</span>
                <span
                  className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs ${
                    m.isActive
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {m.isActive ? 'Active' : 'Expired'}
                </span>
              </p>
              <p className="text-gray-300 mt-1">
                <span className="text-gray-500">MECA ID:</span>{' '}
                <span className="text-white font-mono">{m.mecaId ?? '—'}</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {m.startDate ? `Started ${new Date(m.startDate).toLocaleDateString()}` : ''}
                {m.endDate ? ` · Ends ${new Date(m.endDate).toLocaleDateString()}` : ''}
              </p>
              <p className="text-gray-500 text-[10px] mt-2 font-mono break-all">
                membership id: {m.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null as any, null as any);
            }}
            className="text-gray-400 hover:text-white text-xs underline"
          >
            change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-orange-400 mb-2">{label}</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or MECA ID number…"
          className="w-full bg-slate-900 border border-slate-700 rounded pl-10 pr-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/60"
          autoComplete="off"
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{pickHint}</p>

      {error && (
        <div className="mt-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
          {error}
        </div>
      )}

      {searching && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Searching…
        </p>
      )}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">No matches.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 space-y-2 max-h-96 overflow-y-auto pr-1">
          {results.map((p) => {
            const membershipsToShow = (filter ? p.memberships.filter(filter) : p.memberships);
            return (
              <li key={p.profileId} className="bg-slate-900/60 border border-slate-700/60 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <p className="text-white text-sm font-medium">
                    {p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unnamed'}
                  </p>
                  <span className="text-xs text-gray-500">·</span>
                  <p className="text-xs text-gray-400">{p.email ?? '—'}</p>
                  {p.currentMecaId && (
                    <span className="ml-auto text-xs font-mono text-orange-300/70">
                      #{p.currentMecaId}
                    </span>
                  )}
                </div>
                {membershipsToShow.length === 0 ? (
                  <p className="text-xs text-gray-500 pl-6">
                    No matching memberships for this profile.
                  </p>
                ) : (
                  <ul className="space-y-1 pl-6">
                    {membershipsToShow.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(p, m)}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                                m.isActive
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {m.isActive ? 'Active' : 'Expired'}
                            </span>
                            <span className="text-sm text-white truncate">{m.typeName}</span>
                            <span className="text-xs text-gray-500 font-mono">
                              #{m.mecaId ?? '—'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {m.endDate ? new Date(m.endDate).toLocaleDateString() : 'no end date'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function MecaIdReassignPage() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const allowed = !loading && isSuperAdmin(profile as any);

  const [source, setSource] = useState<{
    profile: SearchResult;
    membership: MembershipRow;
  } | null>(null);
  // Free-form MECA ID override — for cases where the source isn't reachable
  // through search (data missing, partial migration, etc.). When set, this
  // takes priority over the source picker.
  const [manualMecaId, setManualMecaId] = useState('');
  const [destination, setDestination] = useState<{
    profile: SearchResult;
    membership: MembershipRow;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          <div className="bg-slate-800/80 border border-red-700/40 rounded-xl p-8 text-center">
            <Lock className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white mb-2">Restricted</h1>
            <p className="text-gray-300 text-sm">
              This tool is restricted to James Ryan and Mick Makhool. If you believe you should have
              access, contact a super-admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const trimmedManual = manualMecaId.trim();
  const manualMecaIdNumeric = /^\d+$/.test(trimmedManual) ? parseInt(trimmedManual, 10) : null;
  const sourceMecaId = manualMecaIdNumeric ?? source?.membership.mecaId ?? null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (sourceMecaId == null) {
      setError('Pick a source membership OR type a MECA ID number to reassign.');
      return;
    }
    if (!destination) {
      setError('Pick the membership that should receive the MECA ID (destination).');
      return;
    }
    if (source && source.membership.id === destination.membership.id) {
      setError('Source and destination cannot be the same membership.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError('A reason of at least 5 characters is required.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/memberships/admin/meca-id/reassign', {
        mecaId: sourceMecaId,
        membershipId: destination.membership.id,
        reason: reason.trim(),
      });
      setSuccess(
        `MECA ID #${sourceMecaId} reassigned to ${destination.profile.fullName ?? destination.profile.email} (${destination.membership.typeName}).`,
      );
      setSource(null);
      setManualMecaId('');
      setDestination(null);
      setReason('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reassignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button
          onClick={() => navigate('/dashboard/admin')}
          className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Dashboard
        </button>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">MECA ID Reassignment</h1>
          </div>
          <p className="text-gray-400 text-sm mb-2">
            Move a MECA ID from one membership to another. The most common case is a returning
            member whose old MECA ID lapsed past the auto-reclaim window (day 38+).
          </p>
          <p className="text-amber-300/80 text-xs mb-6">
            Restricted to super-admins (James Ryan, Mick Makhool). All reassignments are logged.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <MemberSearchPanel
                  label="Source — MECA ID to move FROM"
                  selected={source}
                  onSelect={(p, m) => {
                    setSource(p && m ? { profile: p, membership: m } : null);
                    if (p && m) setManualMecaId(''); // picking a row clears manual override
                  }}
                  pickHint="Pick the older membership that currently holds the MECA ID you want to transfer."
                  filter={(m) => m.mecaId != null}
                />
                {/* Manual override — admin can type any MECA ID number, even
                    if the search can't locate the source membership (data
                    migration gaps, historical IDs detached from any
                    membership, etc.). Takes priority over the picker if set. */}
                <div className="bg-slate-900/40 border border-dashed border-slate-700/60 rounded p-3">
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                    …or enter a MECA ID manually
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={manualMecaId}
                    onChange={(e) => {
                      setManualMecaId(e.target.value);
                      if (e.target.value.trim()) setSource(null);
                    }}
                    placeholder="e.g. 700123"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500/60"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use when the source can't be found via search. Typed value overrides the picker.
                  </p>
                  {manualMecaId && manualMecaIdNumeric == null && (
                    <p className="text-xs text-red-300 mt-1">Must be a numeric MECA ID.</p>
                  )}
                </div>
              </div>
              <MemberSearchPanel
                label="Destination — membership to assign it TO"
                selected={destination}
                onSelect={(p, m) =>
                  setDestination(p && m ? { profile: p, membership: m } : null)
                }
                pickHint="Pick the renewing member's current membership that should receive the old MECA ID."
              />
            </div>

            {source && destination && source.profile.profileId !== destination.profile.profileId && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  These are two different profiles. This is a cross-account reassignment — verify
                  with the source profile owner before proceeding.
                </span>
              </div>
            )}

            <label className="block">
              <span className="text-sm text-gray-300">Reason (required, logged to history)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Member renewed on day 41 — confirmed via support email 2026-05-14."
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/60"
                required
                minLength={5}
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded p-3">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSource(null);
                  setManualMecaId('');
                  setDestination(null);
                  setReason('');
                  setError(null);
                  setSuccess(null);
                }}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={submitting || sourceMecaId == null || !destination}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {submitting ? 'Reassigning…' : sourceMecaId != null && destination
                  ? `Reassign MECA ID #${sourceMecaId} → ${destination.profile.fullName ?? destination.profile.email}`
                  : 'Pick or enter a source, then pick a destination'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Documentation: <Link to="#" onClick={(e) => e.preventDefault()} className="text-orange-400/70">docs/features/MEMBERSHIP_LIFECYCLE.md §3</Link>
        </p>
      </div>
    </div>
  );
}
