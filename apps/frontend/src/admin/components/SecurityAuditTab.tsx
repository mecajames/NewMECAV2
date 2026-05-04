import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, AlertTriangle, UserCheck, UserX, KeyRound, Lock, Unlock, Loader2,
  RefreshCw, UserPlus, EyeOff, ShieldAlert, ExternalLink, Ban, Trash2, CreditCard,
} from 'lucide-react';
import {
  securityApi, ProfileAuditRow, AuthOrphanRow, SecuritySummary,
  ProvisionMode, StaffRoleAssignment,
} from '@/api-client/security.api-client';
import {
  membershipTypeConfigsApi, MembershipTypeConfig,
} from '@/membership-type-configs/membership-type-configs.api-client';
import { useAuth } from '@/auth';

type FilterChip = 'all' | 'no_membership' | 'invisible_login' | 'staff' | 'banned' | 'login_disabled' | 'billing_restricted';

const FILTER_LABELS: Record<FilterChip, string> = {
  all: 'All Profiles',
  no_membership: 'No Membership',
  invisible_login: 'Invisible Login (back door)',
  staff: 'Staff / Admin',
  banned: 'Banned',
  login_disabled: 'Login Disabled',
  billing_restricted: 'Billing-Only',
};

// MECA IDs allowed to assign staff/admin via this page. Mirrored from the
// backend isProtectedAccount check — UI-only gate; the server enforces too.
const PROTECTED_MECA_IDS = ['202401', '700947'];

function classBadge(c: string): { label: string; className: string } {
  switch (c) {
    case 'no_membership':
      return { label: 'No Membership', className: 'bg-amber-900/40 text-amber-300 border-amber-700/50' };
    case 'invisible_login':
      return { label: 'INVISIBLE LOGIN', className: 'bg-red-900/40 text-red-300 border-red-700/50' };
    case 'staff':
      return { label: 'Staff', className: 'bg-purple-900/40 text-purple-300 border-purple-700/50' };
    case 'banned':
      return { label: 'Banned', className: 'bg-rose-900/40 text-rose-300 border-rose-700/50' };
    case 'login_disabled':
      return { label: 'Login Disabled', className: 'bg-slate-700/40 text-slate-300 border-slate-600/50' };
    case 'billing_restricted':
      return { label: 'Billing-Only', className: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50' };
    default:
      return { label: c, className: 'bg-slate-700/40 text-slate-300 border-slate-600/50' };
  }
}

export default function SecurityAuditTab() {
  const navigate = useNavigate();
  const { profile: actingProfile } = useAuth();
  const isProtectedAdmin = !!actingProfile?.meca_id && PROTECTED_MECA_IDS.includes(String(actingProfile.meca_id));

  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [profiles, setProfiles] = useState<ProfileAuditRow[]>([]);
  const [orphans, setOrphans] = useState<AuthOrphanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterChip>('invisible_login');
  const [searchTerm, setSearchTerm] = useState('');
  const [enforceLoading, setEnforceLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Provision modal
  const [provisionTarget, setProvisionTarget] = useState<ProfileAuditRow | null>(null);
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeConfig[]>([]);
  const [mode, setMode] = useState<ProvisionMode>('active');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [durationMonths, setDurationMonths] = useState(12);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [staffRole, setStaffRole] = useState<StaffRoleAssignment>(null);
  const [provisionNote, setProvisionNote] = useState('');
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionResult, setProvisionResult] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([
        securityApi.getSummary(),
        securityApi.getProfilesAudit(),
      ]);
      setSummary(s);
      setProfiles(p);
      try {
        const o = await securityApi.getAuthOrphans();
        setOrphans(o);
      } catch (orphanErr: any) {
        console.warn('Auth orphan query failed:', orphanErr);
        setOrphans([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return profiles.filter(p => {
      if (filter !== 'all' && !p.classifications.includes(filter)) return false;
      if (term) {
        const hay = `${p.email ?? ''} ${p.full_name ?? ''} ${p.first_name ?? ''} ${p.last_name ?? ''} ${p.meca_id ?? ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [profiles, filter, searchTerm]);

  const toggleEnforcement = async () => {
    if (!summary) return;
    const next = !summary.enforce_membership_for_login;
    if (next && summary.profiles_without_membership > 0) {
      const ok = window.confirm(
        `${summary.profiles_without_membership} profile(s) currently have no membership. ` +
        `Turning enforcement on will block them from logging in until you provision a membership for each one. Continue?`,
      );
      if (!ok) return;
    }
    setEnforceLoading(true);
    try {
      await securityApi.setEnforcement(next);
      await loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update enforcement');
    } finally {
      setEnforceLoading(false);
    }
  };

  const openProvision = async (profile: ProfileAuditRow) => {
    setProvisionTarget(profile);
    setProvisionError(null);
    setProvisionResult(null);
    setMode('active');
    setSelectedTypeId('');
    setDurationMonths(12);
    setForcePasswordChange(false);
    setStaffRole(null);
    setProvisionNote('');
    if (membershipTypes.length === 0) {
      try {
        const types = await membershipTypeConfigsApi.getAll(false);
        setMembershipTypes(types);
      } catch (err: any) {
        setProvisionError(err?.message || 'Failed to load membership types');
      }
    }
  };

  const submitProvision = async () => {
    if (!provisionTarget || !selectedTypeId) return;
    setProvisionBusy(true);
    setProvisionError(null);
    setProvisionResult(null);
    try {
      const res = await securityApi.provisionMembership(provisionTarget.id, {
        mode,
        membershipTypeConfigId: selectedTypeId,
        durationMonths,
        forcePasswordChange,
        staffRole: staffRole || undefined,
        note: provisionNote.trim() || undefined,
      });
      setProvisionResult(res.message);
      await loadAll();
    } catch (err: any) {
      setProvisionError(err?.response?.data?.message || err?.message || 'Provision failed');
    } finally {
      setProvisionBusy(false);
    }
  };

  const handleToggleLogin = async (profile: ProfileAuditRow) => {
    const next = !profile.can_login;
    const verb = next ? 'Enable' : 'Disable';
    const ok = window.confirm(
      next
        ? `Re-enable login for ${profile.email}? They will be able to sign in immediately.`
        : `Disable login for ${profile.email}? They will be blocked at login (softer than ban — no banned reason recorded).`,
    );
    if (!ok) return;
    setActionBusy(`login-${profile.id}`);
    try {
      await securityApi.setCanLogin(profile.id, next);
      await loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || `${verb} login failed`);
    } finally {
      setActionBusy(null);
    }
  };

  const handleBan = async (profile: ProfileAuditRow) => {
    if (profile.login_banned) {
      if (!window.confirm(`Unban ${profile.email}?`)) return;
      setActionBusy(`unban-${profile.id}`);
      try {
        await securityApi.unbanProfile(profile.id);
        await loadAll();
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Unban failed');
      } finally {
        setActionBusy(null);
      }
      return;
    }
    const reason = window.prompt(`Ban ${profile.email}? Optional reason:`, '');
    if (reason === null) return;
    setActionBusy(`ban-${profile.id}`);
    try {
      await securityApi.banProfile(profile.id, reason || undefined);
      await loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Ban failed');
    } finally {
      setActionBusy(null);
    }
  };

  const handleDelete = async (profile: ProfileAuditRow) => {
    const ok = window.confirm(
      `Permanently delete ${profile.email}? This removes their profile, all memberships, ` +
      `and Supabase auth account. This cannot be undone.`,
    );
    if (!ok) return;
    setActionBusy(`delete-${profile.id}`);
    try {
      const res = await securityApi.deleteProfile(profile.id);
      alert(res.message || 'Deleted');
      await loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    } finally {
      setActionBusy(null);
    }
  };

  if (loading && !summary) {
    return (
      <div className="text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
        <p className="text-gray-400 mt-3">Loading security audit…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-6 text-red-300">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <strong>Failed to load audit</strong>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard icon={<UserCheck className="h-4 w-4 text-blue-400" />} label="Total Profiles" value={summary.total_profiles} />
          <SummaryCard icon={<KeyRound className="h-4 w-4 text-emerald-400" />} label="Can Login" value={summary.profiles_can_login} />
          <SummaryCard
            icon={<EyeOff className="h-4 w-4 text-amber-400" />}
            label="No Membership"
            value={summary.profiles_without_membership}
            highlight={summary.profiles_without_membership > 0}
          />
          <SummaryCard
            icon={<ShieldAlert className="h-4 w-4 text-purple-400" />}
            label="Staff/Admin"
            value={summary.staff_or_admin}
            sub={summary.staff_without_membership > 0 ? `${summary.staff_without_membership} w/o membership` : undefined}
          />
          <SummaryCard icon={<UserX className="h-4 w-4 text-rose-400" />} label="Banned" value={summary.banned} />
          <SummaryCard
            icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
            label="Auth Orphans"
            value={summary.auth_orphans}
            highlight={summary.auth_orphans > 0}
          />
        </div>
      )}

      {/* Enforcement toggle */}
      {summary && (
        <div className={`rounded-xl border p-5 ${summary.enforce_membership_for_login ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-slate-800 border-slate-700'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Lock className={`h-6 w-6 mt-0.5 ${summary.enforce_membership_for_login ? 'text-emerald-400' : 'text-slate-400'}`} />
              <div>
                <h3 className="text-white font-semibold">Membership-required login enforcement</h3>
                <p className="text-sm text-gray-400 mt-1">
                  When enabled, any profile with zero memberships is blocked at login. Closes the back-door
                  where a profile is added directly via SQL but never granted a membership.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Protected super-admin accounts (hard-coded MECA IDs) bypass this check so you cannot lock yourself out.
                </p>
              </div>
            </div>
            <button
              onClick={toggleEnforcement}
              disabled={enforceLoading}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                summary.enforce_membership_for_login
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-600 hover:bg-slate-500 text-white'
              } disabled:opacity-50`}
            >
              {enforceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {summary.enforce_membership_for_login ? 'Enforcement: ON' : 'Enforcement: OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Filter chips + search */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.keys(FILTER_LABELS) as FilterChip[]).map(key => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === key ? 'bg-orange-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
          <button
            onClick={loadAll}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-gray-300"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        <input
          type="text"
          placeholder="Search by email, name, or MECA ID…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-sm text-gray-400 mt-3">
          {filtered.length} profile{filtered.length !== 1 ? 's' : ''} matching filters (of {profiles.length} total)
        </p>
      </div>

      {/* Profiles table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">MECA ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Mbrships</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Flags</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No profiles match the current filter.
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">
                      {p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—'}
                    </div>
                    <div className="text-xs text-gray-400">{p.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 font-mono">{p.meca_id || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={p.membership_count === 0 ? 'text-amber-400 font-semibold' : 'text-gray-300'}>
                      {p.membership_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.classifications.map(c => {
                        const b = classBadge(c);
                        return (
                          <span
                            key={c}
                            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${b.className}`}
                          >
                            {b.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {p.last_login_at ? new Date(p.last_login_at).toLocaleString() : <span className="text-gray-600">never</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => navigate(`/admin/members/${p.id}`)}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-gray-200 rounded"
                        title="Open member detail"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      {p.membership_count === 0 && (
                        <button
                          onClick={() => openProvision(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded"
                          title="Provision membership"
                        >
                          <UserPlus className="h-3 w-3" /> Provision
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleLogin(p)}
                        disabled={actionBusy === `login-${p.id}`}
                        className={`p-1.5 rounded text-white disabled:opacity-50 ${
                          p.can_login ? 'bg-slate-600 hover:bg-slate-500' : 'bg-amber-700 hover:bg-amber-600'
                        }`}
                        title={p.can_login ? 'Disable login (softer than ban)' : 'Re-enable login'}
                      >
                        {p.can_login ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleBan(p)}
                        disabled={actionBusy === `ban-${p.id}` || actionBusy === `unban-${p.id}`}
                        className={`p-1.5 rounded text-white disabled:opacity-50 ${
                          p.login_banned ? 'bg-amber-700 hover:bg-amber-600' : 'bg-rose-700 hover:bg-rose-600'
                        }`}
                        title={p.login_banned ? 'Unban' : 'Ban'}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={actionBusy === `delete-${p.id}`}
                        className="p-1.5 bg-red-700 hover:bg-red-600 text-white rounded disabled:opacity-50"
                        title="Delete profile permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auth orphans section */}
      {orphans.length > 0 && (
        <div className="bg-red-900/15 border border-red-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-white font-semibold">{orphans.length} Auth Orphan{orphans.length === 1 ? '' : 's'}</h3>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Supabase auth users with no matching <code className="text-amber-300">profiles</code> row.
          </p>
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-gray-400 uppercase">
              <tr>
                <th className="px-2 py-2">Auth User ID</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Created</th>
                <th className="px-2 py-2">Last Sign In</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {orphans.map(o => (
                <tr key={o.auth_user_id} className="border-t border-red-700/30">
                  <td className="px-2 py-2 font-mono text-xs">{o.auth_user_id}</td>
                  <td className="px-2 py-2">{o.email || '—'}</td>
                  <td className="px-2 py-2">{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</td>
                  <td className="px-2 py-2">{o.last_sign_in_at ? new Date(o.last_sign_in_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Provision modal */}
      {provisionTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-white mb-1">Provision Membership</h3>
            <p className="text-sm text-gray-400 mb-5">
              For <span className="text-white">{provisionTarget.full_name || provisionTarget.email}</span>
              {provisionTarget.email && provisionTarget.full_name && (
                <span className="text-gray-500"> ({provisionTarget.email})</span>
              )}
            </p>

            {/* Mode picker */}
            <div className="mb-5">
              <label className="block text-sm text-gray-300 mb-2 font-semibold">Provisioning Mode</label>
              <div className="space-y-2">
                <ModeOption
                  selected={mode === 'active'} onClick={() => setMode('active')}
                  icon={<UserCheck className="h-5 w-5 text-emerald-400" />}
                  title="Active" subtitle="Membership PAID, MECA ID issued, full access. Use for comp/admin grants."
                />
                <ModeOption
                  selected={mode === 'pay_to_activate'} onClick={() => setMode('pay_to_activate')}
                  icon={<CreditCard className="h-5 w-5 text-cyan-400" />}
                  title="Pay-to-Activate" subtitle="Creates invoice. User can log in but only sees /billing until they pay."
                />
                <ModeOption
                  selected={mode === 'inactive'} onClick={() => setMode('inactive')}
                  icon={<Lock className="h-5 w-5 text-slate-400" />}
                  title="Inactive (data-only)" subtitle="Account on file, can_login disabled. MECA ID assigned later on real purchase."
                />
              </div>
            </div>

            {/* Membership type */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Membership Type</label>
                <select
                  value={selectedTypeId}
                  onChange={e => setSelectedTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="">Select…</option>
                  {membershipTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Duration (months)</label>
                <input
                  type="number" min={1} max={120}
                  value={durationMonths}
                  onChange={e => setDurationMonths(parseInt(e.target.value, 10) || 12)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>

            {/* Force password change */}
            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={forcePasswordChange}
                onChange={e => setForcePasswordChange(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm text-white">Force password change at next login</div>
                <div className="text-xs text-gray-400">User will be redirected to /change-password until they set a new password.</div>
              </div>
            </label>

            {/* Staff role (protected admins only) */}
            {isProtectedAdmin && (
              <div className="mb-4 p-3 rounded-lg bg-purple-900/15 border border-purple-700/40">
                <label className="block text-sm text-purple-200 mb-2 font-semibold">
                  Grant Staff Role <span className="text-xs font-normal text-purple-300/80">(super-admin only)</span>
                </label>
                <div className="flex gap-2">
                  {([null, 'event_director', 'admin'] as StaffRoleAssignment[]).map(r => (
                    <button
                      key={r ?? 'none'}
                      onClick={() => setStaffRole(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        staffRole === r ? 'bg-purple-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {r === null ? 'None' : r === 'admin' ? 'Admin' : 'Event Director'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">Note (optional)</label>
              <input
                type="text"
                placeholder="e.g. Comp membership granted for board service"
                value={provisionNote}
                onChange={e => setProvisionNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>

            {provisionError && (
              <div className="bg-red-900/40 border border-red-700/50 text-red-300 text-sm rounded p-2 mb-3">
                {provisionError}
              </div>
            )}
            {provisionResult && (
              <div className="bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-sm rounded p-2 mb-3">
                {provisionResult}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-700">
              <button
                onClick={() => setProvisionTarget(null)}
                disabled={provisionBusy}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
              >
                {provisionResult ? 'Close' : 'Cancel'}
              </button>
              {!provisionResult && (
                <button
                  onClick={submitProvision}
                  disabled={provisionBusy || !selectedTypeId}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm inline-flex items-center gap-1.5"
                >
                  {provisionBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Provision
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeOption({ selected, onClick, icon, title, subtitle }: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-3 ${
        selected ? 'border-orange-500 bg-orange-500/10' : 'border-slate-600 bg-slate-700/40 hover:bg-slate-700'
      }`}
    >
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-sm text-white font-medium">{title}</div>
        <div className="text-xs text-gray-400">{subtitle}</div>
      </div>
    </button>
  );
}

function SummaryCard({
  icon, label, value, sub, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'bg-amber-900/15 border-amber-700/40' : 'bg-slate-800 border-slate-700'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[11px] text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      {sub && <p className="text-[11px] text-amber-300 mt-0.5">{sub}</p>}
    </div>
  );
}
